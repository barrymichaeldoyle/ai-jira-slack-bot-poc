import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  ResponseFormatJSONObject,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from 'openai/resources';

import { SYSTEM_MESSAGE } from '../../config/constants';
import { config } from '../../config/env';
import { logger } from '../../utils';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

interface GenerateAIResponseArgs {
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ResponseFormatText | ResponseFormatJSONObject | ResponseFormatJSONSchema;
  model?: string;
}

/**
 * Sends a request to the OpenAI API to generate a response.
 *
 * @param args - Configuration object for the AI response
 * @returns Generated response from OpenAI
 */
export async function generateAIResponse({
  messages,
  temperature = 0.7,
  maxTokens = 450,
  responseFormat,
  model = 'gpt-4o-mini-2024-07-18',
}: GenerateAIResponseArgs): Promise<string> {
  try {
    logger('Messages Sent to LLM:', 'info', messages);

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: responseFormat,
    });

    return response.choices[0]?.message?.content || responseFormat?.type === 'json_object'
      ? '{}'
      : 'No response generated.';
  } catch (error) {
    logger('Error communicating with OpenAI:', 'error', error);
    return 'Sorry, I encountered an error while generating a response.';
  }
}

export { SYSTEM_MESSAGE };
