import dotenv from 'dotenv';

import { startSlackApp } from './slack';
import { initializeJiraProjects } from './jira';

dotenv.config();

initializeJiraProjects();
startSlackApp();
