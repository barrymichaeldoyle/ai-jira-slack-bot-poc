import { ChatCompletionMessageParam } from 'openai/resources';
import { WebClient } from '@slack/web-api';
import { THINKING_TEXT, THINKING_TEXT_RAW } from '../../constants';
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
}): Promise<ChatCompletionMessageParam[]> {
  console.log('getConversationHistory', { threadTs, channelId, text });

  // Return empty array if no thread timestamp is provided
  if (!threadTs) {
    console.log('No thread timestamp provided, returning empty history');
    return [];
  }

  let conversationHistory: ChatCompletionMessageParam[] = [];
  try {
    // Get all replies in the thread
    const result = await client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      inclusive: true, // Include the parent message
    });

    if (!result.messages || result.messages.length === 0) {
      console.log('No messages found in thread');
      return [];
    }

    const userNameMap = await getUserIdsNamesMap(result.messages, client);

    // Filter and transform messages before adding to history
    conversationHistory = result.messages
      .sort((a, b) => parseFloat(a.ts || '0') - parseFloat(b.ts || '0'))
      .filter((msg) => {
        const isThinking = msg.text === THINKING_TEXT || msg.text === THINKING_TEXT_RAW;
        if (isThinking) {
          return false;
        }
        if (!msg.text) {
          return false;
        }
        return true;
      })
      .map((msg) => {
        // Get the bot's user ID from the first bot message we find
        const botUserId = result.messages?.find((m) => m.bot_id)?.user;
        const userName = msg.user ? userNameMap[msg.user] : 'Unknown User';

        return {
          role: msg.bot_id ? 'assistant' : 'user',
          content: msg.bot_id
            ? msg.text?.trim() || ''
            : `"${userName}" said: "${
                msg.text
                  ?.replace(/<@([A-Z0-9]+)>/g, (match, userId) => {
                    // Replace any mention of the bot with "@assistant"
                    return botUserId && userId === botUserId ? '@assistant' : match;
                  })
                  .trim() || ''
              }"`,
        };
      });

    console.log('Conversation history:', conversationHistory);
  } catch (error) {
    console.error('Error fetching thread history:', error);
  }

  return conversationHistory;
}

async function getUserIdsNamesMap(
  messages: any[],
  client: WebClient
): Promise<Record<string, string>> {
  const userNameMap: Record<string, string> = {};
  // Get unique user IDs
  const uniqueUserIds = [
    ...new Set(messages.filter((message) => message.user).map((message) => message.user!)),
  ];

  // Fetch all user names in parallel
  const userNames = await Promise.all(uniqueUserIds.map((userId) => getUserName(userId, client)));

  // Build the user name map
  uniqueUserIds.forEach((userId, index) => {
    userNameMap[userId] = userNames[index];
  });

  return userNameMap;
}
