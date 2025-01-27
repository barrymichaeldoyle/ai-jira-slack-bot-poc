import { JiraFunctionName } from './functions';
import { intentsDocumentation } from './intents';
import { IntentFunctionMapping } from './types';

// Generate mapping from intentsDocumentation
export const intentFunctionMapping: Record<string, IntentFunctionMapping> = Object.fromEntries(
  intentsDocumentation.intents
    .filter((intent) => intent.name !== 'unknown')
    .map((intent) => [
      intent.name,
      {
        functionName: intent.name as JiraFunctionName,
        description: intent.description,
        parameters: intent.parameters.map((param) => ({
          ...param,
          type: 'string',
        })),
      },
    ])
);
