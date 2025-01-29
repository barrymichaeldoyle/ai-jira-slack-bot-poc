import { ChatCompletionTool } from 'openai/resources';

const getIssueTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'getJiraIssue',
    description: 'Get details about a Jira issue',
    parameters: {
      type: 'object',
      properties: {
        issueIdOrKey: {
          type: 'string',
          description: 'The ID or key of the issue to get e.g. "SE-123',
        },
        fields: {
          type: 'string',
          description:
            'The list of fields to return for each issue. By default, all navigable and Agile fields are returned.',
        },
        expand: {
          type: 'string',
          description: 'A comma-separated list of the parameters to expand.',
        },
      },
      required: ['issueIdOrKey'],
    },
  },
};

export const getIssueChangelogTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'getIssueChangelog',
    description: 'List all changes for an issue, sorted by date, starting from the latest',
    parameters: {
      type: 'object',
      properties: {
        issueNumber: {
          type: 'string',
          description: 'The issue number to search for including the project key e.g. "SE-123"',
        },
        startAt: {
          type: 'number',
          description: 'optional starting index number',
        },
      },
    },
  },
};

export const jiraTools: ChatCompletionTool[] = [getIssueTool, getIssueChangelogTool];
