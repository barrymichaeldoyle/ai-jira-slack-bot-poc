import { WebClient } from '@slack/web-api';

export async function getUserName(userId: string, client: WebClient): Promise<string> {
  try {
    const result = await client.users.info({ user: userId });
    return result.user?.real_name || result.user?.name || userId;
  } catch (error) {
    console.error('Error fetching user info:', error);
    return userId;
  }
}
