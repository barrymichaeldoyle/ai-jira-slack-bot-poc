import { config } from '../config/env';
import { initializeJiraProjects } from '../features/jira';
import { joinAllPublicSlackChannels } from '../services/slack/handlers/joinAllPublicSlackChannels';
import { logger } from '../utils';
import { slackApp } from './slackApp';

export async function startApp() {
  try {
    // Initialize Jira project keys
    logger('Initializing Jira projects...', 'info');
    await initializeJiraProjects();

    // Start the Slack app
    logger(`Starting Slack app on port ${config.PORT}...`, 'info');
    await slackApp.start(config.PORT);
    logger(`⚡️ Slack app is running on port ${config.PORT}`, 'info');

    // Optionally, join all public Slack channels
    logger('Joining all public Slack channels...', 'info');
    await joinAllPublicSlackChannels();
  } catch (error) {
    logger('Error during app startup:', 'error', error);
    throw error; // Rethrow the error to allow the top-level entry point to handle it
  }
}
