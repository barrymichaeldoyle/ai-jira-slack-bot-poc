import { startApp } from './app/start'; // Start the app
import './config/env'; // Ensure environment variables are loaded
import { logger } from './utils';

// Start the application
startApp().catch((error: Error) => {
  logger('❌ Application failed to start:', 'error', error);
  process.exit(1); // Exit with a non-zero status code to indicate failure
});
