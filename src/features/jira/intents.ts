import { IntentsDocumentation } from './types';

export const intentsDocumentation: IntentsDocumentation = {
  intents: [
    {
      name: 'getStatus',
      description: 'Retrieve the current status of a specific Jira ticket.',
      parameters: [
        {
          name: 'ticketId',
          required: true,
          description: "The ID of the Jira ticket (e.g., 'CPG-12').",
        },
      ],
      examples: [
        "What's the status of CPG-12?",
        'Is ticket CPG-12 resolved?',
        'Where did we get with CPG-12?',
      ],
    },
    {
      name: 'getDetails',
      description: 'Retrieve detailed information about a specific Jira ticket.',
      parameters: [
        {
          name: 'ticketId',
          required: true,
          description: "The ID of the Jira ticket (e.g., 'CPG-12').",
        },
      ],
      examples: [
        'Tell me more about CPG-12.',
        "What's the priority of CPG-12?",
        'Can you give me the details of CPG-12?',
      ],
    },
    {
      name: 'unknown',
      description: 'Use when the query does not match any defined intent.',
      parameters: [],
      examples: ['What do you think of the weather?', 'Can you recommend a good book?'],
    },
  ],
};
