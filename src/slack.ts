import { App, LogLevel } from '@slack/bolt';
import type { ConversationsRepliesResponse, WebClient } from '@slack/web-api';
import { runJiraToolAgent } from './agent';
import { runLLM } from './ai';
import { THINKING_TEXT, THINKING_TEXT_RAW } from './config/constants';
import { config } from './config/env';

export const slack = new App({
  token: config.SLACK_BOT_TOKEN,
  signingSecret: config.SLACK_SIGNING_SECRET,
  appToken: config.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.WARN,
});

slack.event('app_mention', async ({ event, say, client }) => {
  const threadTs = event.thread_ts || event.ts;
  const channel = event.channel;
  const thinkingMessage = await client.chat.postMessage({
    channel,
    text: THINKING_TEXT,
    thread_ts: threadTs,
  });
  async function deleteThinkingMessage() {
    if (thinkingMessage.ts) {
      await client.chat.delete({
        channel,
        ts: thinkingMessage.ts,
      });
    }
  }
  async function handleError(error: unknown) {
    console.error('Error in slack app_mention event:', error);
    await Promise.all([
      deleteThinkingMessage(),
      say({
        text: 'AI failed to respond',
        thread_ts: event.ts,
      }),
    ]);
  }

  try {
    const mentioningUserName = await getUserName(event.user, slack.client);
    const summarizedThread = await getSummarizedThreadMessages({
      threadTs,
      channel,
      client: slack.client,
    });
    const agentMessages = await runJiraToolAgent({ summarizedThread });
    const aiResponse = await runLLM({
      messages: [
        {
          role: 'system',
          content: [
            `You are a helpful slack bot assistant that integrates with Jira.`,
            `You have access to Jira data provided by a Jira tool agent in the messages.`,
            `Use this Jira data to answer questions asked by users in slack threads.`,
            `Please format your response as a slack message.`,
            `Whenever referencing Jira issues, please use the issue key and a link like this:`,
            `<https://${config.JIRA_HOST}/browse/KEY-123|KEY-12 (Issue Title - only if it is available, don't make up a title)>.`,
            `The user who mentioned you is: ${mentioningUserName}`,
            `If the user asks about time related information, please include the time in the response, not just the date.`,
            `The ultimate goal is to keep the answer as concise as possible, while being helpful and accurate.`,
          ].join(' '),
        },
        ...agentMessages,
      ],
    });

    await Promise.all([
      deleteThinkingMessage(),
      say({
        text: (aiResponse.content || 'AI failed to respond').replace(/\*\*/g, '*'),
        thread_ts: event.ts,
      }),
    ]);
  } catch (error) {
    await handleError(error);
  }
});

export async function joinAllPublicSlackChannels() {
  try {
    const result = await slack.client.conversations.list({
      types: 'public_channel',
      exclude_archived: true,
    });

    if (result.channels) {
      for (const channel of result.channels) {
        if (channel.id && !channel.is_member) {
          try {
            await slack.client.conversations.join({ channel: channel.id });
            console.log(`Joined channel: ${channel.name}`);
          } catch (error) {
            console.error(`Error joining ${channel.name}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error joining public channels:', error);
  }
}

async function getUserName(userId: string | undefined, client: WebClient): Promise<string> {
  if (!userId) {
    return 'Unknown User';
  }

  try {
    const result = await client.users.info({ user: userId });
    return result.user?.real_name || result.user?.name || userId;
  } catch (error) {
    console.error('Error fetching user info:', error);
    return userId;
  }
}

async function getSummarizedThreadMessages({
  threadTs,
  channel,
  client,
}: {
  threadTs: string;
  channel: string;
  client: WebClient;
}): Promise<string> {
  try {
    // Get all replies in the thread by passing the thread_ts
    const result = await client.conversations.replies({
      channel,
      ts: threadTs,
      limit: 1000, // Set a high limit to get all messages
      inclusive: true, // Include the parent message
    });

    if (!result.messages || result.messages.length === 0) {
      return 'No messages found in thread.';
    }

    const userNameMap = await getUserIdsNamesMap(result.messages, client);

    const summaries = result.messages
      .filter((message) => message.text !== THINKING_TEXT && message.text !== THINKING_TEXT_RAW)
      .map((message) => {
        const timestamp = new Date(Number(message.ts) * 1000).toISOString();
        const userName = message.bot_id ? '@assistant' : userNameMap[message.user || ''];

        const userMentionPattern = /<@([A-Z0-9]+)>/g;
        const text = (message.text || '').replace(
          userMentionPattern,
          (_match, userId: string) => userNameMap[userId] || userId
        );

        return `${timestamp} - ${userName} said: "${text}"`;
      });

    return summaries.join('\n');
  } catch (error) {
    console.error('Error getting thread messages:', error);
    return 'Error retrieving thread messages.';
  }
}

async function getUserIdsNamesMap(
  messages: ConversationsRepliesResponse['messages'],
  client: WebClient
): Promise<Record<string, string>> {
  if (!messages) {
    return {};
  }

  const userNameMap: Record<string, string> = {};
  const uniqueUserIds = new Set<string>();

  // Find the bot's user ID from the first bot message
  const botUserId = messages.find((msg) => msg.bot_id)?.user;

  messages.forEach((message) => {
    if (message.user) {
      uniqueUserIds.add(message.user);
    }

    const mentionMatches = message.text?.match(/<@(U[A-Z0-9]+)>/g) || [];
    mentionMatches.forEach((match) => {
      const userId = match.match(/<@(U[A-Z0-9]+)>/)?.[1];
      if (userId) {
        uniqueUserIds.add(userId);
      }
    });
  });

  const userNames = await Promise.all(
    [...uniqueUserIds].map(async (userId) => {
      if (botUserId && userId === botUserId) {
        return '@assistant';
      }
      return await getUserName(userId, client);
    })
  );

  [...uniqueUserIds].forEach((userId, index) => {
    userNameMap[userId] = userNames[index];
  });

  return userNameMap;
}
