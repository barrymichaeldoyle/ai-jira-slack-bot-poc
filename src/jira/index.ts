import dotenv from 'dotenv';
import JiraApi from 'jira-client';
import type { ChatCompletionMessageParam } from 'openai/resources';

dotenv.config();

export const jira = new JiraApi({
  protocol: 'https',
  host: process.env.JIRA_HOST as string,
  username: process.env.JIRA_USERNAME,
  password: process.env.JIRA_API_TOKEN,
  apiVersion: '3',
  strictSSL: true,
});

export let jiraProjectKeys: string[] = [];

// Add these interfaces at the top of the file, after the imports
interface JiraSubtask {
  key: string;
  fields: {
    summary: string;
  };
}

interface JiraIssueLink {
  outwardIssue?: {
    key: string;
    fields: {
      summary: string;
    };
  };
  inwardIssue?: {
    key: string;
    fields: {
      summary: string;
    };
  };
}

interface JiraComment {
  author: {
    displayName: string;
  };
  body: {
    content: {
      text: string;
    }[];
  };
  created: string;
}

/**
 * Fetches all Jira projects and sets the project keys.
 */
export async function initializeJiraProjects() {
  const projects = await jira.listProjects();
  jiraProjectKeys = projects.map((project) => project.key);
}

export function matchesJiraKeyPattern(text: string, projectKey: string): boolean {
  // Match the project key followed by numbers, ignoring any trailing punctuation
  const jiraKeyRegex = new RegExp(`${projectKey}-\\d+(?:[^\\w-]|$)`, 'i');
  return jiraKeyRegex.test(text);
}

export function isJiraIssueKeyProvided(text: string) {
  // Check if the text contains a Jira issue key pattern (e.g., JIRA-1234)
  return jiraProjectKeys.some((key) => matchesJiraKeyPattern(text, key));
}

export function extractJiraIssueKeys(text: string): string[] {
  // Split on whitespace and special characters
  const words = text.split(/[\s,;]+/);
  return Array.from(
    new Set(
      words
        .filter((word) =>
          jiraProjectKeys.some((projectKey) => matchesJiraKeyPattern(word, projectKey))
        )
        .map((key) => {
          // Transform to uppercase for consistency
          const matchedProject = jiraProjectKeys.find((projectKey) =>
            matchesJiraKeyPattern(key, projectKey)
          );
          if (!matchedProject) return key;
          // Extract just the numbers, removing any trailing punctuation
          const match = key.match(/\d+/);
          if (!match) return key;
          return `${matchedProject}-${match[0]}`;
        })
    )
  );
}

export enum JiraErrorMessages {
  JIRA_ISSUES_NOT_FOUND = 'No Jira issues found',
}

export async function fetchJiraIssuesDataAndFormatForLLM(
  issueKeys: string[]
): Promise<ChatCompletionMessageParam | JiraErrorMessages> {
  const jiraIssuesResults = await Promise.allSettled(
    issueKeys.map(async (issueKey) => {
      try {
        const issue = await jira.findIssue(issueKey);
        return {
          key: issueKey,
          success: true,
          data: {
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            description:
              issue.fields.description?.content?.[0]?.content?.[0]?.text || 'No description',
            assignee: issue.fields.assignee?.displayName || 'Unassigned',
            priority: issue.fields.priority.name,
            type: issue.fields.issuetype.name,
            reporter: issue.fields.reporter?.displayName || 'Unknown',
            createdDate: issue.fields.created,
            lastUpdatedDate: issue.fields.updated,
            subtasks: issue.fields.subtasks.map((subtask: JiraSubtask) => ({
              key: subtask.key,
              summary: subtask.fields.summary,
              link: `<https://barrymichaeldoyle.atlassian.net/browse/${subtask.key}|${subtask.key}>`,
            })),
            linkedIssues: issue.fields.issuelinks.map((link: JiraIssueLink) => ({
              key: link.outwardIssue?.key || link.inwardIssue?.key,
              summary:
                link.outwardIssue?.fields.summary ||
                link.inwardIssue?.fields.summary ||
                'No summary',
              link: `<https://barrymichaeldoyle.atlassian.net/browse/${
                link.outwardIssue?.key || link.inwardIssue?.key
              }|${link.outwardIssue?.key || link.inwardIssue?.key}>`,
            })),
            recentComments: issue.fields.comment?.comments
              .slice(-1)
              .map((comment: JiraComment) => ({
                author: comment.author.displayName,
                content: comment.body.content.map((c) => c.text).join(' ') || 'No content',
                date: comment.created,
              })),
          },
        };
      } catch (error) {
        console.error('Error fetching Jira issue data:', error);
        return {
          key: issueKey,
          success: false,
          error: `Issue not found or inaccessible`,
        };
      }
    })
  );

  if (jiraIssuesResults.length === 0) {
    return JiraErrorMessages.JIRA_ISSUES_NOT_FOUND;
  }

  const jiraIssuesData = jiraIssuesResults.map((result) =>
    result.status === 'fulfilled'
      ? result.value.success
        ? { ...result.value.data, key: result.value.key }
        : { key: result.value.key, error: result.value.error }
      : { key: 'unknown', error: 'Failed to fetch issue' }
  );

  return {
    role: 'assistant',
    content: `Here are the Jira issues data that are relevant to the conversation: ${JSON.stringify(jiraIssuesData)}`,
  };
}
