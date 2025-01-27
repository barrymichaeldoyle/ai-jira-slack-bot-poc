import { config } from '../../config/env';
import { logger } from '../../utils';
import { generateAIResponse } from '../ai';
import { jiraFunctions } from './functions';
import type { DetectedIntent } from './types';

interface HandleIntentsArgs {
  detectedIntents: DetectedIntent[];
  summary: string;
}

export async function handleIntents({
  detectedIntents,
  summary,
}: HandleIntentsArgs): Promise<string> {
  try {
    // Execute all detected intents and gather their results
    const intentResults = await Promise.all(
      detectedIntents.map(async (intent) => {
        try {
          const functionName = intent.name as keyof typeof jiraFunctions;
          const params = intent.parameters[0]?.value; // Currently we only have ticketId parameter

          if (!params) {
            return {
              intent: intent.name,
              error: 'Missing required parameter: ticketId',
            };
          }

          const result = await jiraFunctions[functionName](params);
          return {
            intent: intent.name,
            data: result,
          };
        } catch (error) {
          logger(`Error executing intent ${intent.name}:`, 'error', error);
          return {
            intent: intent.name,
            error: `Failed to execute ${intent.name}`,
          };
        }
      })
    );

    // Generate a response using the results
    const response = await generateAIResponse({
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that provides information about Jira tickets.
          Format your response in a clear, concise way. If there are any errors, explain them politely. You're providing your response in a slack message, so use slack formatting. When doing bold text, use *, not **. Whenever refereing to a Jira ticket, format it as a link like this <https://${config.JIRA_HOST}/browse/JIRA-1234|JIRA-1234 (include the title of the ticket if you have that context)>.`,
        },
        {
          role: 'user',
          content: `User summary: ${summary}\n\nIntent results: ${JSON.stringify(intentResults)}`,
        },
      ],
      temperature: 0.7,
    });

    return response;
  } catch (error) {
    logger('Error handling intents:', 'error', error);
    return 'Sorry, I encountered an error while processing your request.';
  }
}
