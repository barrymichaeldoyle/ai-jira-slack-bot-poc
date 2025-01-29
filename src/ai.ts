import OpenAI from 'openai';
import {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from 'openai/resources';
import { config } from './config/env';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export async function runLLM({
  messages,
  temperature = 0.7,
  responseFormat = { type: 'text' },
  model = 'gpt-4o-mini',
  tools,
}: {
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  responseFormat?: ResponseFormatText | ResponseFormatJSONObject | ResponseFormatJSONSchema;
  model?: string;
  tools?: ChatCompletionTool[];
}): Promise<ChatCompletionMessage> {
  try {
    console.log('Messages passed to LLM:', JSON.stringify(messages, null, 2));

    const response = await openai.chat.completions.create({
      messages,
      model,
      temperature,
      response_format: responseFormat,
      tools,
      tool_choice: tools ? 'auto' : undefined,
      parallel_tool_calls: tools ? false : undefined,
    });

    return response.choices[0]?.message;
  } catch (error) {
    console.error('Error running LLM:', error);
    throw error;
  }
}

// export const jiraTools: ChatCompletionTool[] = [
//   {
//     type: 'function',
//     function: {
//       name: 'get_issue',
//       description: 'Get a Jira issue',
//       parameters: z.object({
//         issueIdOrKey: z.string().describe('The ID or key of the issue to get'),
//       }),
//     },
//   },
// ];
