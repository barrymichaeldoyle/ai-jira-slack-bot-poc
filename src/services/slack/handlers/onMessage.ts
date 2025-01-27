import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';

import { logger } from '../../../utils';

import { handleBotInteraction } from './handleBotInteraction';

export async function onMessage({
  message,
  say,
  client,
}: SlackEventMiddlewareArgs<'message'> & AllMiddlewareArgs) {
  try {
    // Ignore messages that aren't direct messages
    if (message.channel_type !== 'im' || !('user' in message)) {
      return;
    }

    // Process the message text
    const text = message.text || '';
    const threadTs = 'thread_ts' in message ? message.thread_ts : message.ts;

    await handleBotInteraction({
      text,
      channelId: message.channel,
      threadTs,
      client,
      say,
    });
  } catch (error) {
    logger('Error handling message event:', 'error', error);
  }
}
