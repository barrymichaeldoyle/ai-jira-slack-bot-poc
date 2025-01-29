import JiraApi from 'jira-client';

import { config } from './config/env';

export const jira = new JiraApi({
  protocol: 'https',
  host: config.JIRA_HOST,
  username: config.JIRA_USERNAME,
  password: config.JIRA_API_TOKEN,
  apiVersion: '3',
  strictSSL: true,
});

export class JiraProjectManager {
  private static instance: JiraProjectManager;
  private projectKeys: string[] = [];
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): JiraProjectManager {
    if (!JiraProjectManager.instance) {
      JiraProjectManager.instance = new JiraProjectManager();
    }
    return JiraProjectManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      const projects = await jira.listProjects();
      this.projectKeys = projects.map((project) => project.key);
      this.initialized = true;
      console.log(`Jira projects initialized: ${JSON.stringify(this.projectKeys)}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to initialize Jira projects: ${error.message}`);
      }
      throw new Error('Failed to initialize Jira projects: Unknown error');
    }
  }

  getProjectKeys(): string[] {
    if (!this.initialized) {
      throw new Error('Jira projects have not been initialized');
    }
    return [...this.projectKeys]; // Return a copy to prevent external modifications
  }
}

// TODO: see if we can just pass the entire jira.getIssue function as a tool since it has all the details I have
/**
 * Get a Jira issue
 *
 * @param issueIdOrKey - The ID or key of the issue to get
 * @param fields - [optional] The fields to get
 * @param expand - [optional] The expand options
 * @returns The Jira issue
 */
export function getJiraIssue(
  issueIdOrKey: string,
  fields?: string[],
  expand?: string
): Promise<JiraApi.IssueObject> {
  return jira.getIssue(issueIdOrKey, fields, expand);
}
