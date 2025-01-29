import { config } from './config/env';
import { JiraProjectManager } from './jira';
import { joinAllPublicSlackChannels, slack } from './slack';

async function startApp() {
  try {
    console.log('Initializing Jira projects...');
    await JiraProjectManager.getInstance().initialize();

    console.log(`Starting Slack app on port ${config.PORT}...`);
    await slack.start(config.PORT);
    console.log(`⚡️ Slack app is running on port ${config.PORT}`);

    console.log('Joining all public Slack channels...');
    await joinAllPublicSlackChannels();
  } catch (error) {
    console.error('Detailed startup error:', error);
    throw error;
  }
}

// Start the application
startApp().catch((error: Error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
