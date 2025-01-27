import { generateAIResponse } from '../../../features/ai';
import { ConversationHistoryItem } from '../types';

export async function getThreadSummaryForIntents(conversationHistory: ConversationHistoryItem[]) {
  const systemPrompt = `Summarize the following Slack conversation into concise and actionable context for the next query. Focus on:
    - Key details such as Jira tickets mentioned, their status, and user requests.
    - Avoid unnecessary commentary or unrelated information.

    Example:
    Conversation:
    [
      { sender: 'user', message: "What's the status of CPG-12?" },
      { sender: 'assistant', message: 'CPG-12 is *In Progress*, assigned to Alex Smith.' },
      { sender: 'user', message: 'Are you sure about that?' },
      { sender: 'assistant', message: 'Let me double-check!' }
    ]

    Summary:
    User asked for the status of CPG-12. Assistant stated it was *In Progress* and assigned to Alex Smith but is verifying the information.

    Now, summarize this conversation:
    \n\n${JSON.stringify(conversationHistory)}
    `;

  // Generate the summary using AI
  return await generateAIResponse({
    messages: [{ role: 'system', content: systemPrompt }],
    responseFormat: { type: 'text' },
  });
}
