import dotenv from 'dotenv';

import { initializeJiraProjects } from './jira';
import { startSlackApp } from './slack';

dotenv.config();

initializeJiraProjects();
startSlackApp();
