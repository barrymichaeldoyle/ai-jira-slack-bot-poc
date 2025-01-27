import { App } from '@slack/bolt';
import { onAppMention } from './handlers/onAppMention';
import { onMessage } from './handlers/onMessage';

/**
 * Registers all Slack event handlers.
 *
 * @param app - The Slack App instance
 */
export function registerSlackEvents(app: App) {
  app.event('app_mention', onAppMention); // Registers the "app_mention" handler
  app.message(onMessage); // Registers the "message" handler
}
