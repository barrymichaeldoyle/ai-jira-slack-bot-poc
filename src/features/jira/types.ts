export interface JiraSubtask {
  key: string;
  fields: {
    summary: string;
  };
}

export interface JiraIssueLink {
  outwardIssue?: {
    key: string;
    fields: {
      summary: string;
    };
  };
  inwardIssue?: {
    key: string;
    fields: {
      summary: string;
    };
  };
}

export interface JiraComment {
  author: {
    displayName: string;
  };
  body: {
    content: {
      text: string;
    }[];
  };
  created: string;
}

// Base parameter type
export interface IntentParameter {
  name: string;
  description: string;
  required: boolean;
}

// Intent documentation type
export interface Intent {
  name: string;
  description: string;
  parameters: IntentParameter[];
  examples: string[];
}

export interface IntentsDocumentation {
  intents: Intent[];
}

// Function mapping types
export interface FunctionParameter extends IntentParameter {
  type: string;
}

export interface IntentFunctionMapping {
  functionName: JiraFunctionName;
  description: string;
  parameters: FunctionParameter[];
}

// Valid function names type
export type JiraFunctionName = 'getStatus' | 'getDetails';

// Return types for functions
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
