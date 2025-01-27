import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_APP_TOKEN: string;
  PORT: number;
  JIRA_HOST: string;
  JIRA_USERNAME: string;
  JIRA_API_TOKEN: string;
  OPENAI_API_KEY: string;
  DISABLE_AI?: boolean;
}

function getEnvVariable(key: string, required = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const config: EnvConfig = {
  SLACK_BOT_TOKEN: getEnvVariable('SLACK_BOT_TOKEN'),
  SLACK_SIGNING_SECRET: getEnvVariable('SLACK_SIGNING_SECRET'),
  SLACK_APP_TOKEN: getEnvVariable('SLACK_APP_TOKEN'),
  PORT: Number(getEnvVariable('PORT', false)) || 3000,
  JIRA_HOST: getEnvVariable('JIRA_HOST'),
  JIRA_USERNAME: getEnvVariable('JIRA_USERNAME'),
  JIRA_API_TOKEN: getEnvVariable('JIRA_API_TOKEN'),
  OPENAI_API_KEY: getEnvVariable('OPENAI_API_KEY'),
  DISABLE_AI: process.env.DISABLE_AI === 'true',
};
