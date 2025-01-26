import dotenv from 'dotenv';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { SYSTEM_MESSAGE } from '../constants';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getAIResponse(
  threadMessages: Array<ChatCompletionMessageParam> = [],
  jiraIssueContextMessage: ChatCompletionMessageParam
): Promise<string> {
  try {
    const messages: ChatCompletionMessageParam[] = [
      SYSTEM_MESSAGE,
      jiraIssueContextMessage,
      ...threadMessages,
    ];

    console.log('Messages passed to LLM', messages);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as ChatCompletionMessageParam[],
      temperature: 0.7,
      max_tokens: 450,
    });

    return (
      response.choices[0]?.message?.content ||
      "Sorry, I'm on my coffee break! (Error generating response)"
    );
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return 'Oops, my AI brain is a bit fried right now. Maybe I need more coffee?';
  }
}
