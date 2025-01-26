import { App, LogLevel } from '@slack/bolt';
import dotenv from 'dotenv';
import { getAIResponse } from '../openai';
import {
  extractJiraIssueKeys,
  fetchJiraIssuesDataAndFormatForLLM,
  jira,
  JiraErrorMessages,
} from '../jira';
import { WebClient } from '@slack/web-api';
import { SayFn } from '@slack/bolt';
import { ChatCompletionMessageParam } from 'openai/resources';
import { THINKING_TEXT } from '../constants';
import { getConversationHistory } from './utils/getConversationHistory';
import { getUserName } from './utils/getUserName';

dotenv.config();

export const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.WARN,
});

async function joinAllPublicSlackChannels() {
  try {
    const result = await slackApp.client.conversations.list({
      types: 'public_channel',
      exclude_archived: true,
    });

    if (result.channels) {
      for (const channel of result.channels) {
        if (channel.id && !channel.is_member) {
          try {
            await slackApp.client.conversations.join({ channel: channel.id });
            console.log(`Joined channel: ${channel.name}`);
          } catch (error) {
            console.error(`Error joining ${channel.name}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error joining channels:', error);
  }
}

export async function startSlackApp() {
  try {
    await slackApp.start(process.env.PORT || 3000);
    console.log("⚡️ Jeff's Intern is running!");
    joinAllPublicSlackChannels();
  } catch (error) {
    console.error('Error starting app:', error);
    process.exit(1);
  }
}

slackApp.message(/hey intern/i, async ({ message, say }) => {
  if ('user' in message) {
    try {
      await say({
        text: `Hey there <@${message.user}>! I'm Jeff's intern. How can I do nothing for you today?`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Hey there <@${message.user}>! I'm Jeff's intern. How can I do nothing for you today?`,
            },
          },
        ],
      });
    } catch (error) {
      console.error('Error responding to message:', error);
    }
  }
});

async function handleBotInteraction({
  text,
  userId,
  channelId,
  threadTs,
  client,
  say,
}: {
  text: string;
  userId: string;
  channelId: string;
  threadTs?: string;
  client: WebClient;
  say: SayFn;
}) {
  // Only respond to messages if a Jira issue key has been provided.
  function isJiraIssueKeyProvided(text: string) {}

  // Show thinking indicator
  const thinkingMessage = await client.chat.postMessage({
    channel: channelId,
    text: THINKING_TEXT,
    thread_ts: threadTs,
  });
  async function deleteThinkingMessage() {
    if (thinkingMessage.ts) {
      await client.chat.delete({
        channel: channelId,
        ts: thinkingMessage.ts,
      });
    }
  }
  // Fetch thread messages if this is a thread
  const conversationHistory = await getConversationHistory({
    threadTs,
    channelId,
    client,
    text,
  });

  // Add the current message separately

  console.log('messages', conversationHistory);

  // Extract all unique Jira issue keys from the conversation
  const issueKeys = Array.from(
    new Set(
      conversationHistory.flatMap((message) => extractJiraIssueKeys(message.content as string))
    )
  );

  // Fetch Jira issues
  const jiraIssueContextMessage = await fetchJiraIssuesDataAndFormatForLLM(issueKeys);

  console.log('jiraIssueContextMessage', jiraIssueContextMessage);

  if (process.env.DISABLE_AI === 'true') {
    await Promise.all([
      deleteThinkingMessage(),
      say({
        text: 'AI responses are currently disabled.',
        thread_ts: threadTs,
      }),
    ]);
    return;
  }

  if (jiraIssueContextMessage === JiraErrorMessages.JIRA_ISSUES_NOT_FOUND) {
    await Promise.all([
      deleteThinkingMessage(),
      say({
        text: 'No Jira issues provided. Right now, I can only evaluate specific Jira issues that have been provided in this thread.',
        thread_ts: threadTs,
      }),
    ]);
    return;
  }

  // Pass Jira issues to the LLM
  const response = await getAIResponse(conversationHistory, jiraIssueContextMessage);

  deleteThinkingMessage();
  await say({
    text: response,
    thread_ts: threadTs,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: response.replace(/\*\*/g, '*') } }],
  });
}

slackApp.event('app_mention', async ({ event, say, client }) => {
  try {
    if (!event.user) {
      await say({
        text: "I'm sorry, but I couldn't identify who sent this message. This seems to be a technical issue.",
        thread_ts: event.thread_ts,
      });
      return;
    }

    // Remove the bot's mention from the message
    const messageWithoutMention = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

    await handleBotInteraction({
      text: messageWithoutMention,
      userId: event.user,
      channelId: event.channel,
      threadTs: event.thread_ts || event.ts,
      client,
      say,
    });
  } catch (error) {
    console.error('Error responding to mention:', error);
  }
});

slackApp.message(async ({ message, say, client }) => {
  try {
    // Only respond to direct messages (DMs)
    if (!('user' in message) || !message.user || message.channel_type !== 'im') {
      return;
    }

    await handleBotInteraction({
      text: message.text || '',
      userId: message.user,
      channelId: message.channel,
      threadTs: 'thread_ts' in message ? message.thread_ts : message.ts,
      client,
      say,
    });
  } catch (error) {
    console.error('Error responding to direct message:', error);
  }
});

slackApp.message(/^jira\s+([A-Z]+-\d+)/i, async ({ message, say, context }) => {
  const match = context.matches[0];
  if (!('user' in message) || !match) {
    return;
  }

  try {
    const issueKey = match.split(' ')[1].toUpperCase();
    const issue = await jira.findIssue(issueKey);

    await say({
      text: `Here's the information for ${issueKey}:`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `*${issueKey}: ${issue.fields.summary}*\n\n` +
              `*Status:* ${issue.fields.status.name}\n` +
              `*Type:* ${issue.fields.issuetype.name}\n` +
              `*Priority:* ${issue.fields.priority.name}\n` +
              `*Assignee:* ${issue.fields.assignee?.displayName || 'Unassigned'}\n\n` +
              `*Description:*\n${issue.fields.description?.content?.[0]?.content?.[0]?.text || 'No description'}`,
          },
        },
      ],
    });
  } catch (error) {
    console.error('Error fetching Jira issue:', error);
    const errorMessage =
      error instanceof Error
        ? error.message.includes('does not exist')
          ? 'Issue not found or access denied.'
          : error.message
        : 'Unknown error occurred';

    await say({
      text: `Sorry, I couldn't fetch the information for ${match[1]}. ${errorMessage}`,
    });
  }
});
