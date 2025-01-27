import { slackApp } from '../../../app/slackApp';

export async function joinAllPublicSlackChannels() {
  try {
    const result = await slackApp.client.conversations.list({
      types: 'public_channel',
      exclude_archived: true,
    });

    if (result.channels) {
      for (const channel of result.channels) {
        if (channel.id && !channel.is_member) {
          try {
            await slackApp.client.conversations.join({ channel: channel.id });
            console.log(`Joined channel: ${channel.name}`);
          } catch (error) {
            console.error(`Error joining ${channel.name}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error joining public channels:', error);
  }
}
