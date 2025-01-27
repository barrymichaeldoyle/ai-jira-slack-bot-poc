import type { ConversationsRepliesResponse, WebClient } from '@slack/web-api';

import { THINKING_TEXT, THINKING_TEXT_RAW } from '../../../config/constants';
import { logger } from '../../../utils';
import { ConversationHistoryItem } from '../types';
import { getUserName } from './getUserName';

export async function getConversationHistory({
  threadTs,
  channelId,
  client,
  text,
}: {
  threadTs?: string;
  channelId: string;
  client: WebClient;
  text: string;
}): Promise<ConversationHistoryItem[]> {
  logger('getConversationHistory', 'info', { threadTs, channelId, text });

  if (!threadTs) {
    logger('No thread timestamp provided, returning empty history', 'info');
    return [];
  }

  try {
    const result = await client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      inclusive: true,
    });

    if (!result.messages || result.messages.length === 0) {
      logger('No messages found in thread', 'info');
      return [];
    }

    const userNameMap = await getUserIdsNamesMap(result.messages, client);

    return result.messages
      .sort((a, b) => parseFloat(a.ts || '0') - parseFloat(b.ts || '0'))
      .filter((msg) => {
        const isThinking = msg.text === THINKING_TEXT || msg.text === THINKING_TEXT_RAW;
        return !isThinking && msg.text;
      })
      .map((msg) => ({
        sender: msg.user ? userNameMap[msg.user] : 'Unknown User',
        timestamp: msg.ts || '',
        message: formatMessage(msg.text?.trim() || '', userNameMap),
      }));
  } catch (error) {
    logger('Error fetching thread history:', 'error', error);
    return [];
  }
}

function formatMessage(message: string, userNameMap: Record<string, string>): string {
  // Replace <@U...> mentions with @username format
  return message.replace(/<@(U[A-Z0-9]+)>/g, (match, userId) => {
    if (userNameMap[userId] === 'assistant') {
      return '@assistant';
    }
    return `@${userNameMap[userId] || 'Unknown'}`;
  });
}

async function getUserIdsNamesMap(
  messages: ConversationsRepliesResponse['messages'],
  client: WebClient
): Promise<Record<string, string>> {
  const userNameMap: Record<string, string> = {};

  // Find the bot's user ID from the first bot message
  const botUserId = messages?.find((msg) => msg.bot_id)?.user;

  // Get unique user IDs from both senders and mentions
  const uniqueUserIds = new Set<string>();

  messages?.forEach((message) => {
    // Add message sender
    if (message.user) {
      uniqueUserIds.add(message.user);
    }

    // Add mentioned users
    const mentionMatches = message.text?.match(/<@(U[A-Z0-9]+)>/g) || [];
    mentionMatches.forEach((match) => {
      const userId = match.match(/<@(U[A-Z0-9]+)>/)?.[1];
      if (userId) {
        uniqueUserIds.add(userId);
      }
    });
  });

  // Fetch all user names in parallel
  const userNames = await Promise.all(
    [...uniqueUserIds].map(async (userId) => {
      // If this is the bot's user ID, return 'assistant'
      if (botUserId && userId === botUserId) {
        return 'assistant';
      }
      return await getUserName(userId, client);
    })
  );

  // Build the user name map
  [...uniqueUserIds].forEach((userId, index) => {
    userNameMap[userId] = userNames[index];
  });

  return userNameMap;
}
