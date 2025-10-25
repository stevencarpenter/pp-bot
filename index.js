// Slack PP Bot - Clean implementation with PostgreSQL persistence
// Runtime uses database; updateLeaderboard utility retained for unit tests (in-memory behavior)

require('dotenv').config();
const { App } = require('@slack/bolt');
const { getUserScore, updateUserScore: dbUpdateUserScore, getTopUsers, recordVote } = require('./storage');
const logger = require('./logger');

// -------- Utility (used by tests) --------
function parseVote(text) {
  const regex = /<@([A-Z0-9]+)>\s*(\+\+|--)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({ userId: match[1], action: match[2] });
  }
  return matches;
}

// Test-only helper (NOT used in runtime DB logic)
function updateLeaderboard(leaderboard, userId, action) {
  if (!leaderboard[userId]) leaderboard[userId] = 0;
  if (action === '++') leaderboard[userId] += 1; else if (action === '--') leaderboard[userId] -= 1;
  return leaderboard[userId];
}

// -------- Handlers --------
function registerHandlers(app) {
  // Message votes
  app.message(async ({ message, say }) => {
    try {
      if (message.subtype === 'bot_message' || message.bot_id) return;
      const text = message.text || '';
      const votes = parseVote(text);
      if (votes.length === 0) return;
      const results = [];
      for (const vote of votes) {
        if (vote.userId === message.user) {
          results.push(`<@${vote.userId}> cannot vote for themselves!`);
          continue;
        }
        const delta = vote.action === '++' ? 1 : -1;
        const newScore = await dbUpdateUserScore(vote.userId, delta);
        await recordVote(message.user, vote.userId, vote.action, message.channel, message.ts);
        const actionWord = vote.action === '++' ? 'increased' : 'decreased';
        results.push(`<@${vote.userId}>'s score ${actionWord} to ${newScore}`);
      }
      if (results.length > 0) await say(results.join('\n'));
    } catch (err) {
      logger.error('Error processing message event:', err);
    }
  });

  // /leaderboard
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
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        response += `${medal} <@${user_id}>: ${score}\n`;
      });
      await say(response);
    } catch (e) {
      logger.error('Failed to fetch leaderboard:', e);
      await say('Failed to load leaderboard.');
    }
  });

  // /score
  app.command('/score', async ({ command, ack, say }) => {
    await ack();
    try {
      const score = await getUserScore(command.user_id);
      await say(`<@${command.user_id}>'s current score is ${score}`);
    } catch (e) {
      logger.error('Failed to fetch score:', e);
      await say('Failed to load your score.');
    }
  });
}

function startBot() {
  logger.info('Checking environment variables...');
  logger.debug('SLACK_BOT_TOKEN present:', !!process.env.SLACK_BOT_TOKEN);
  logger.debug('SLACK_SIGNING_SECRET present:', !!process.env.SLACK_SIGNING_SECRET);
  logger.debug('SLACK_APP_TOKEN present:', !!process.env.SLACK_APP_TOKEN);

  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_APP_TOKEN) {
    logger.error('❌ Missing required environment variables. Please set: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN');
    const exposed = Object.keys(process.env).filter(k => k.startsWith('SLACK_'));
    logger.info('Currently defined SLACK_* vars:', exposed);
    // Do not exit during tests (Jest sets NODE_ENV=test)
    if (process.env.NODE_ENV !== 'test') process.exit(1);
  }

  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    logger: { // minimal adapter to use our logger
      setLevel() {},
      setName() {},
      debug: (...args) => logger.debug(...args),
      info: (...args) => logger.info(...args),
      warn: (...args) => logger.warn(...args),
      error: (...args) => logger.error(...args),
    }
  });

  // Health endpoint (if Express receiver available)
  try {
    if (app.receiver?.app?.get) {
      app.receiver.app.get('/health', (_req, res) => res.status(200).send('ok'));
    }
  } catch (e) {
    logger.warn('Could not register /health endpoint:', e.message);
  }

  // Early auth test (fire and forget)
  (async () => {
    if (!process.env.SLACK_BOT_TOKEN) return; // skip in test without env
    try {
      const auth = await app.client.auth.test();
      logger.info('✅ Slack auth test succeeded:', { team: auth.team, user: auth.user, bot_id: auth.bot_id });
    } catch (e) {
      logger.error('❌ Slack auth test failed. Check tokens & scopes.', e.data || e.message);
    }
  })();

  registerHandlers(app);

  (async () => {
    try {
      const port = process.env.PORT || process.env.RAILWAY_PORT || 3000;
      await app.start(port);
      logger.info(`⚡️ Slack bot is running in Socket Mode with health server on port ${port}`);
    } catch (error) {
      logger.error('Failed to start app:', error);
      process.exit(1);
    }
  })();

  const shutdown = async (signal) => {
    logger.info(`${signal} signal received: closing`);
    try {
      await app.stop();
      try { require('./db').end(); } catch {}
      logger.info('⚡️ Slack bot stopped gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error stopping app:', error);
      process.exit(1);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  startBot();
}

module.exports = { parseVote, updateLeaderboard };
