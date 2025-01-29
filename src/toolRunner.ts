import { ChatCompletionMessageToolCall } from 'openai/resources';
import { jira } from './jira';

export async function runTool(toolCall: ChatCompletionMessageToolCall) {
  const toolArgs = JSON.parse(toolCall.function.arguments);

  switch (toolCall.function.name) {
    case 'getJiraIssue':
      return await getIssue(toolArgs.issueIdOrKey, toolArgs.fields, toolArgs.expand);
    case 'getIssueChangelog':
      return await getIssueChangelog(toolArgs.issueNumber, toolArgs.startAt);
    default:
      throw new Error(`Unknown tool: ${toolCall.function.name}`);
  }
}

function getIssue(issueNumber: string, fields?: string[], expand?: string) {
  try {
    console.log(`Getting issue ${issueNumber}`);
    return jira.getIssue(issueNumber, fields, expand);
  } catch (error: any) {
    console.error(error);
    if (error.statusCode === 404) {
      return `Jira issue ${issueNumber} does not exist or you don't have permission to access it.`;
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      return `Unable to access Jira issue ${issueNumber} due to authentication/authorization issues.`;
    }
    return `Error accessing Jira issue ${issueNumber}: ${error.message}`;
  }
}

function getIssueChangelog(issueNumber: string, startAt?: number) {
  try {
    console.log(`Getting changelog for issue ${issueNumber}`);
    return jira.getIssueChangelog(issueNumber, startAt);
  } catch (error: any) {
    console.error(error);
    if (error.statusCode === 404) {
      return `Jira issue ${issueNumber} does not exist or you don't have permission to access it.`;
    } else if (error.statusCode === 401 || error.statusCode === 403) {
      return `Unable to access changelog for Jira issue ${issueNumber} due to authentication/authorization issues.`;
    }
    return `Error accessing changelog for Jira issue ${issueNumber}: ${error.message}`;
  }
}
