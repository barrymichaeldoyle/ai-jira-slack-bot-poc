import { AllMiddlewareArgs, SlackEventMiddlewareArgs } from '@slack/bolt';
// import { handleJiraIntent } from '../../../features/jira/helpers';
import { handleBotInteraction } from './handleBotInteraction';

export async function onAppMention({
  event,
  say,
  client,
}: SlackEventMiddlewareArgs<'app_mention'> & AllMiddlewareArgs) {
  handleBotInteraction({
    text: event.text,
    channelId: event.channel,
    threadTs: event.thread_ts,
    client,
    say,
  });
}
