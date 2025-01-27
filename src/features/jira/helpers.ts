import type { ChatCompletionMessageParam } from 'openai/resources';
import { config } from '../../config/env';
import { jira, JiraErrorMessages, jiraProjectKeys } from './index';
import { JiraComment, JiraIssueLink, JiraSubtask } from './types';

/**
 * Matches a Jira key pattern in a text string.
 */
export function matchesJiraKeyPattern(text: string, projectKey: string): boolean {
  const jiraKeyRegex = new RegExp(`${projectKey}-\\d+(?:[^\\w-]|$)`, 'i');
  return jiraKeyRegex.test(text);
}

/**
 * Checks if a text string contains any Jira issue keys.
 */
export function isJiraIssueKeyProvided(text: string) {
  return jiraProjectKeys.some((key) => matchesJiraKeyPattern(text, key));
}

/**
 * Extracts Jira issue keys from a text string.
 */
export function extractJiraIssueKeys(text: string): string[] {
  const words = text.split(/[\s,;]+/);
  return Array.from(
    new Set(
      words
        .filter((word) =>
          jiraProjectKeys.some((projectKey) => matchesJiraKeyPattern(word, projectKey))
        )
        .map((key) => {
          const matchedProject = jiraProjectKeys.find((projectKey) =>
            matchesJiraKeyPattern(key, projectKey)
          );
          if (!matchedProject) return key;
          const match = key.match(/\d+/);
          if (!match) return key;
          return `${matchedProject}-${match[0]}`;
        })
    )
  );
}

/**
 * Fetches Jira issues data and formats them for the LLM.
 */
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
              link: `<https://${config.JIRA_HOST}/browse/${subtask.key}|${subtask.key}>`,
            })),
            linkedIssues: issue.fields.issuelinks.map((link: JiraIssueLink) => ({
              key: link.outwardIssue?.key || link.inwardIssue?.key,
              summary:
                link.outwardIssue?.fields.summary ||
                link.inwardIssue?.fields.summary ||
                'No summary',
              link: `<https://${config.JIRA_HOST}/browse/${
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
    content: `Here are the Jira issues data that are relevant to the conversation: ${JSON.stringify(
      jiraIssuesData
    )}`,
  };
}
