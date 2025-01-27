import { SayFn } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { getConversationHistory } from '../utils/getConversationHistory';

import OpenAI from 'openai';
import { THINKING_TEXT } from '../../../config/constants';
import { logger } from '../../../utils';
import { getThreadSummaryForIntents } from '../utils/getThreadSummaryForIntents';

interface HandleBotInteractionArgs {
  text: string;
  channelId: string;
  threadTs?: string;
  client: WebClient;
  say: SayFn;
}

export async function handleBotInteraction({
  text,
  channelId,
  threadTs,
  client,
  say,
}: HandleBotInteractionArgs) {
  // Post a "thinking" message to indicate processing
  const thinkingMessage = await client.chat.postMessage({
    channel: channelId,
    text: THINKING_TEXT,
    thread_ts: threadTs,
  });

  // Utility to delete the thinking message
  async function deleteThinkingMessage() {
    if (thinkingMessage.ts) {
      await client.chat.delete({
        channel: channelId,
        ts: thinkingMessage.ts,
      });
    }
  }

  if (!threadTs) {
    logger('No thread timestamp provided, skipping thread processing', 'info');
    return;
  }

  try {
    const conversationHistory = await getConversationHistory({
      threadTs,
      channelId,
      client,
      text,
    });

    logger('CONVERSATION HISTORY', 'info', conversationHistory);

    const summary = await getThreadSummaryForIntents(conversationHistory);

    logger('SUMMARY', 'info', summary);

    // // Extract Jira issue keys from the conversation
    // const issueKeys = extractJiraIssueKeys(conversationHistory.map((msg) => msg.content).join(' '));

    // console.log('Extracted Jira issue keys:', issueKeys);

    // if (issueKeys.length === 0) {
    //   await Promise.all([
    //     deleteThinkingMessage(),
    //     say({
    //       text: 'No Jira issue keys were found in the conversation.',
    //       thread_ts: threadTs,
    //     }),
    //   ]);
    //   return;
    // }

    // // Fetch Jira issue details and format them for the AI
    // const jiraIssueContext = await fetchJiraIssuesDataAndFormatForLLM(issueKeys);

    // if (jiraIssueContext === JiraErrorMessages.JIRA_ISSUES_NOT_FOUND || !jiraIssueContext) {
    //   await Promise.all([
    //     deleteThinkingMessage(),
    //     say({
    //       text: 'No Jira issues could be retrieved. Please ensure the issue keys are correct.',
    //       thread_ts: threadTs,
    //     }),
    //   ]);
    //   return;
    // }

    // // Pass the conversation history and Jira data to the AI
    // const aiResponse = await generateAIResponse([...conversationHistory, jiraIssueContext]);

    // // Delete the thinking message and respond with the AI-generated response
    // await Promise.all([
    //   deleteThinkingMessage(),
    //   say({
    //     text: aiResponse,
    //     thread_ts: threadTs,
    //     blocks: [
    //       {
    //         type: 'section',
    //         text: {
    //           type: 'mrkdwn',
    //           text: aiResponse.replace(/\*\*/g, '*'), // Adjust Markdown formatting for Slack
    //         },
    //       },
    //     ],
    //   }),
    // ]);
  } catch (error) {
    console.error('Error handling bot interaction:', error);

    await Promise.all([
      deleteThinkingMessage(),
      say({
        text: 'Oops! Something went wrong while processing your request. Please try again later.',
        thread_ts: threadTs,
      }),
    ]);
  }
}

let messageBuffer: { role: string; content: string }[] = [];
const MAX_BUFFER_SIZE = 10;

function updateMessageBuffer(role: string, content: string) {
  messageBuffer.push({ role, content });
  if (messageBuffer.length > MAX_BUFFER_SIZE) {
    messageBuffer.shift(); // Remove the oldest message if the buffer exceeds the max size
  }
}

async function getSummarizedContext(
  buffer: { role: string; content: string }[],
  openaiClient: OpenAI
) {
  const prompt = `Summarize the following conversation into concise context for continuing the discussion:\n\n${JSON.stringify(buffer)}`;
  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'system', content: prompt }],
  });
  return response.choices[0].message.content;
}
