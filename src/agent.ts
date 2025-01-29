/**
 * This agent takes in a summary of a slack thread and has Jira tools
 * to get details about projects/issues/etc. We will also pass in the existing
 * Jira project keys as additional context.
 *
 * The goal is to get the agent to to take all the context and run the appropriate tools
 * to get the relevant Jira information requested in the slack thread.
 */

import { ChatCompletionMessageParam, ChatCompletionToolMessageParam } from 'openai/resources';
import { runLLM } from './ai';
import { JiraProjectManager } from './jira';
import { runTool } from './toolRunner';
import { jiraTools } from './tools';

export async function runJiraToolAgent({
  summarizedThread,
}: {
  summarizedThread: string;
}): Promise<ChatCompletionMessageParam[]> {
  const jiraProjectKeys = JiraProjectManager.getInstance().getProjectKeys();

  const response = await runLLM({
    messages: [
      {
        role: 'system',
        content: [
          `You are an ai agent that can analyze a slack thread`,
          `and use Jira tools to get relevant information requested`,
          `in the thread. The more recent the message in the thread,`,
          `the more relevant the information.`,
          `The Jira project keys are: ${jiraProjectKeys.join(', ')} (be aware that users sometimes use incorrect casing e.g. "Jira-6" instead of "JIRA-6")`,
          `The slack thread summary is: ${summarizedThread}`,
        ].join(' '),
      },
    ],
    tools: jiraTools,
  });

  const messages: ChatCompletionMessageParam[] = [response];

  if (response.tool_calls) {
    const toolResponses = await Promise.all(
      response.tool_calls.map(async (toolCall) => {
        try {
          const output = await runTool(toolCall);

          // First convert output to string if it's not already
          const outputStr = typeof output === 'string' ? output : JSON.stringify(output);

          // Now check for error messages
          if (outputStr.includes('does not exist') || outputStr.includes('Unable to access')) {
            return {
              role: 'tool',
              content: outputStr,
              tool_call_id: toolCall.id,
            } as ChatCompletionToolMessageParam;
          }

          return {
            role: 'tool',
            content: typeof output === 'string' ? output : JSON.stringify(output),
            tool_call_id: toolCall.id,
          } as ChatCompletionToolMessageParam;
        } catch (error: any) {
          console.error('Tool execution error:', error);
          const errorMessage = error.message || 'Unknown error occurred';
          return {
            role: 'tool',
            content: `Error: ${errorMessage}`,
            tool_call_id: toolCall.id,
          } as ChatCompletionToolMessageParam;
        }
      })
    );

    messages.push(...toolResponses);
  }

  return messages;
}
