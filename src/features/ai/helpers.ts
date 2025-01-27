import type { ChatCompletionMessageParam } from 'openai/resources';
import { SYSTEM_MESSAGE } from '../../config/constants';

/**
 * Prepares the conversation messages for the OpenAI API.
 *
 * @param userMessages - Messages from the conversation history
 * @param jiraContext - Context about Jira issues
 * @returns Formatted messages for OpenAI
 */
export function prepareAIInput(
  userMessages: ChatCompletionMessageParam[],
  jiraContext: ChatCompletionMessageParam
): ChatCompletionMessageParam[] {
  return [
    SYSTEM_MESSAGE, // The system-level instruction for the AI
    jiraContext, // Contextual data about Jira issues
    ...userMessages, // User messages from the conversation
  ];
}

/**
 * Parses and cleans up the AI's response for Slack.
 *
 * @param response - Raw AI response
 * @returns Cleaned response ready for Slack
 */
export function parseAIResponse(response: string): string {
  // Replace Markdown formatting or clean up unnecessary text
  return response.replace(/\*\*/g, '*');
}
