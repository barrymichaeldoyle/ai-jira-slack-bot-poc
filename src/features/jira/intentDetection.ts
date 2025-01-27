import { logger } from '../../utils';
import { generateAIResponse } from '../ai';
import { intentsDocumentation } from './intents';
import type { DetectedIntent } from './types';

export async function detectIntents(summary: string): Promise<DetectedIntent[]> {
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

    logger('INTENT DETECTION REPSONSE', 'info', result);

    if (!result.intents || !Array.isArray(result.intents)) {
      logger('INTENT DETECTION REPSONSE', 'error', 'No intents detected');
      return [];
    }

    logger('INTENT DETECTION REPSONSE (INTENTS)', 'info', result.intents);

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
