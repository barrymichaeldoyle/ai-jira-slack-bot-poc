import OpenAI from 'openai';
import { generateAIResponse } from '../ai';
import { intentsDocumentation } from './intents';

interface DetectedIntent {
  name: string;
  parameters: {
    name: string;
    value: string;
  }[];
  confidence: number;
}

export async function detectIntents(
  summary: string,
  openaiClient: OpenAI
): Promise<DetectedIntent[]> {
  const systemPrompt = `You are an intent detection system. Given a conversation summary, identify which intents are being requested.
Available intents:
${JSON.stringify(intentsDocumentation.intents, null, 2)}

Respond with a JSON array of detected intents, including parameter values and confidence scores.
Format:
[{
  "name": "intentName",
  "parameters": [{ "name": "parameterName", "value": "extractedValue" }],
  "confidence": 0.9
}]

Only return valid JSON. Only include intents that are actually being requested. Confidence should be between 0 and 1.`;

  try {
    const jsonResponse = await generateAIResponse({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Summary: ${summary}` },
      ],
      responseFormat: { type: 'json_object' },
    });

    const result = JSON.parse(jsonResponse);

    if (!result.intents || !Array.isArray(result.intents)) {
      return [];
    }

    return result.intents.filter(
      (intent: DetectedIntent) =>
        // Filter out unknown intents and those with low confidence
        intent.name !== 'unknown' &&
        intent.confidence > 0.7 &&
        intentsDocumentation.intents.some((validIntent) => validIntent.name === intent.name)
    );
  } catch (error) {
    console.error('Error detecting intents:', error);
    return [];
  }
}
