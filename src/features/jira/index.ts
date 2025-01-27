import JiraApi from 'jira-client';
import { config } from '../../config/env';

export const jira = new JiraApi({
  protocol: 'https',
  host: config.JIRA_HOST,
  username: config.JIRA_USERNAME,
  password: config.JIRA_API_TOKEN,
  apiVersion: '3',
  strictSSL: true,
});

export let jiraProjectKeys: string[] = [];

/**
 * Fetches all Jira projects and sets the project keys.
 */
export async function initializeJiraProjects() {
  const projects = await jira.listProjects();
  jiraProjectKeys = projects.map((project) => project.key);
}

export enum JiraErrorMessages {
  JIRA_ISSUES_NOT_FOUND = 'No Jira issues found',
}
