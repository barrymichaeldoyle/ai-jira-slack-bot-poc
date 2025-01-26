import dotenv from 'dotenv';
import JiraApi from 'jira-client';

dotenv.config();

export const jira = new JiraApi({
  protocol: 'https',
  host: process.env.JIRA_HOST as string,
  username: process.env.JIRA_USERNAME,
  password: process.env.JIRA_API_TOKEN,
  apiVersion: '3',
  strictSSL: true,
});
