import { SayFn } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { getConversationHistory } from '../utils/getConversationHistory';

import OpenAI from 'openai';
import { THINKING_TEXT } from '../../../config/constants';
import { detectIntents } from '../../../features/jira/intentDetection';
import { handleIntents } from '../../../features/jira/intentHandler';
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

    const intents = await detectIntents(summary);

    logger('INTENTS', 'info', intents);

    const finalOutput = await handleIntents({ detectedIntents: intents, summary });

    logger('FINAL OUTPUT', 'info', finalOutput);

    await Promise.all([deleteThinkingMessage(), say({ text: finalOutput, thread_ts: threadTs })]);
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
