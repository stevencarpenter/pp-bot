import dotenv from 'dotenv';
import { App, LogLevel } from '@slack/bolt';
import { parseVote } from './utils/vote';
import { getTopUsers, getUserScore, recordVote, updateUserScore } from './storage/database';

dotenv.config();

function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
  switch (level) {
    case 'error':
      return LogLevel.ERROR;
    case 'warn':
      return LogLevel.WARN;
    case 'info':
      return LogLevel.INFO;
    case 'debug':
      return LogLevel.DEBUG;
    default:
      return LogLevel.INFO;
  }
}

export function createApp() {
  if (
    !process.env.SLACK_BOT_TOKEN ||
    !process.env.SLACK_SIGNING_SECRET ||
    !process.env.SLACK_APP_TOKEN
  ) {
    throw new Error('Missing required Slack environment variables');
  }
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    logLevel: getLogLevel(),
  });

  // Message handler
  app.message(async ({ message, say }) => {
    try {
      if ((message as any).subtype === 'bot_message' || (message as any).bot_id) return;
      if (!('text' in message) || !('user' in message)) return;
      const text = (message as any).text || '';
      const votes = parseVote(text);
      if (votes.length === 0) return;
      const results: string[] = [];
      for (const vote of votes) {
        if (vote.userId === (message as any).user) {
          results.push(`<@${vote.userId}> cannot vote for themselves!`);
          continue;
        }
        const delta = vote.action === '++' ? 1 : -1;
        const newScore = await updateUserScore(vote.userId, delta);
        await recordVote(
          (message as any).user,
          vote.userId,
          vote.action,
          (message as any).channel,
          (message as any).ts
        );
        const actionWord = vote.action === '++' ? 'increased' : 'decreased';
        results.push(`<@${vote.userId}>'s score ${actionWord} to ${newScore}`);
      }
      if (results.length) await say(results.join('\n'));
    } catch (err) {
      console.error('Error processing message event:', err);
    }
  });

  // /leaderboard command
  app.command('/leaderboard', async ({ ack, say }) => {
    await ack();
    try {
      const entries = await getTopUsers(10);
      if (entries.length === 0) {
        await say('The leaderboard is empty. Start voting with @user ++ or @user --');
        return;
      }
      let response = '*🏆 Leaderboard 🏆*\n\n';
      entries.forEach(({ user_id, score }, index) => {
        const medal =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        response += `${medal} <@${user_id}>: ${score}\n`;
      });
      await say(response);
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
      await say('Failed to load leaderboard.');
    }
  });

  // /score command
  app.command('/score', async ({ command, ack, say }) => {
    await ack();
    try {
      const score = await getUserScore(command.user_id);
      await say(`<@${command.user_id}>'s current score is ${score}`);
    } catch (e) {
      console.error('Failed to fetch score:', e);
      await say('Failed to load your score.');
    }
  });

  return app;
}

export async function start() {
  try {
    const app = createApp();
    const port = process.env.PORT || process.env.RAILWAY_PORT || 3000;
    await app.start(port);
    console.log(`⚡️ Slack bot is running on port ${port}`);
  } catch (e) {
    console.error('Failed to start app:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}
