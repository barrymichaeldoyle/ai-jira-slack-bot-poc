import { jira } from '.';
import { logger } from '../../utils';

export interface JiraTicketStatus {
  status: string;
  statusCategory: string;
}

export interface JiraTicketDetails {
  summary: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  created: string;
  updated: string;
}

export const jiraFunctions = {
  getStatus: async (ticketId: string): Promise<JiraTicketStatus> => {
    try {
      const ticket = await jira.getIssue(ticketId);
      return {
        status: ticket.fields.status.name,
        statusCategory: ticket.fields.status.statusCategory.name,
      };
    } catch (error) {
      logger('Error fetching Jira ticket status:', 'error', error);
      throw new Error(`Unable to fetch status for ticket ${ticketId}`);
    }
  },

  getDetails: async (ticketId: string): Promise<JiraTicketDetails> => {
    try {
      const ticket = await jira.getIssue(ticketId);
      return {
        summary: ticket.fields.summary,
        description: ticket.fields.description,
        status: ticket.fields.status.name,
        priority: ticket.fields.priority.name,
        assignee: ticket.fields.assignee?.displayName || 'Unassigned',
        reporter: ticket.fields.reporter.displayName,
        created: ticket.fields.created,
        updated: ticket.fields.updated,
      };
    } catch (error) {
      logger('Error fetching Jira ticket details:', 'error', error);
      throw new Error(`Unable to fetch details for ticket ${ticketId}`);
    }
  },
};

// Type for function mapping
export type JiraFunctionName = keyof typeof jiraFunctions;

// Function to validate if a function name exists
export function isValidJiraFunction(name: string): name is JiraFunctionName {
  return name in jiraFunctions;
}
