import { App, LogLevel } from '@slack/bolt';

import { config } from '../config/env';
import { registerSlackEvents } from '../services/slack/events';

// Initialize the Slack app
export const slackApp = new App({
  token: config.SLACK_BOT_TOKEN,
  signingSecret: config.SLACK_SIGNING_SECRET,
  appToken: config.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: LogLevel.WARN,
});

// Register all Slack event handlers
registerSlackEvents(slackApp);
0;
