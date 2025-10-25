const fs = require('fs');
const path = require('path');

// Path to leaderboard storage
const leaderboardPath = path.join(__dirname, 'leaderboard.json');

// Load or initialize leaderboard
function loadLeaderboard() {
  try {
    if (fs.existsSync(leaderboardPath)) {
      const data = fs.readFileSync(leaderboardPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
  return {};
}

// Save leaderboard to disk
function saveLeaderboard(leaderboard) {
  try {
    fs.writeFileSync(leaderboardPath, JSON.stringify(leaderboard, null, 2));
  } catch (error) {
    console.error('Error saving leaderboard:', error);
  }
}

// Parse message for @user ++ or @user --
function parseVote(text) {
  // Match @user ++ or @user -- with optional text/emojis after
  // The pattern should match user mentions followed immediately by ++ or --
  const regex = /<@([A-Z0-9]+)>\s*(\+\+|--)/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      userId: match[1],
      action: match[2],
    });
  }
  
  return matches;
}

// Update leaderboard based on votes
function updateLeaderboard(leaderboard, userId, action) {
  if (!leaderboard[userId]) {
    leaderboard[userId] = 0;
  }
  
  if (action === '++') {
    leaderboard[userId]++;
  } else if (action === '--') {
    leaderboard[userId]--;
  }
  
  return leaderboard[userId];
}

// Initialize and start the Slack app
function startBot() {
  const { App } = require('@slack/bolt');
  require('dotenv').config();
  
  // Log environment variable status
  console.log('Checking environment variables...');
  console.log('SLACK_BOT_TOKEN present:', !!process.env.SLACK_BOT_TOKEN);
  console.log('SLACK_SIGNING_SECRET present:', !!process.env.SLACK_SIGNING_SECRET);
  console.log('SLACK_APP_TOKEN present:', !!process.env.SLACK_APP_TOKEN);

  if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_APP_TOKEN) {
    console.error('❌ Missing required environment variables. Please set: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN');
    // Provide a short dump of current env keys (filtered)
    const exposed = Object.keys(process.env).filter(k => k.startsWith('SLACK_'));
    console.log('Currently defined SLACK_* vars:', exposed);
    process.exit(1);
  }

  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
  });

  // Add a simple health endpoint (even in Socket Mode) so the hosting platform sees a listening port
  try {
    if (app.receiver && app.receiver.app && app.receiver.app.get) {
      app.receiver.app.get('/health', (_req, res) => {
        res.status(200).send('ok');
      });
    }
  } catch (e) {
    console.warn('Could not register /health endpoint:', e.message);
  }

  // Verify tokens with Slack immediately for early failure visibility
  (async () => {
    try {
      const auth = await app.client.auth.test();
      console.log('✅ Slack auth test succeeded:', { team: auth.team, user: auth.user, bot_id: auth.bot_id });
    } catch (e) {
      console.error('❌ Slack auth test failed. Check tokens & scopes.', e.data || e.message);
    }
  })();

  // Listen for messages
  app.message(async ({ message, say }) => {
    try {
      // Skip bot messages
      if (message.subtype === 'bot_message' || message.bot_id) return;
      const text = message.text || '';
      const votes = parseVote(text);
      if (votes.length === 0) return; // fast exit
      const leaderboard = loadLeaderboard();
      const results = [];
      for (const vote of votes) {
        if (vote.userId === message.user) {
          results.push(`<@${vote.userId}> cannot vote for themselves!`);
          continue;
        }
        const newScore = updateLeaderboard(leaderboard, vote.userId, vote.action);
        const actionWord = vote.action === '++' ? 'increased' : 'decreased';
        results.push(`<@${vote.userId}>'s score ${actionWord} to ${newScore}`);
      }
      saveLeaderboard(leaderboard);
      if (results.length > 0) await say(results.join('\n'));
    } catch (err) {
      console.error('Error processing message event:', err);
    }
  });

  // Handle leaderboard command
  app.command('/leaderboard', async ({ command, ack, say }) => {
    await ack();
    
    const leaderboard = loadLeaderboard();
    const entries = Object.entries(leaderboard)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (entries.length === 0) {
      await say('The leaderboard is empty. Start voting with @user ++ or @user --');
      return;
    }
    
    let response = '*🏆 Leaderboard 🏆*\n\n';
    entries.forEach(([userId, score], index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      response += `${medal} <@${userId}>: ${score}\n`;
    });
    
    await say(response);
  });

  // Handle score command
  app.command('/score', async ({ command, ack, say }) => {
    await ack();
    
    const leaderboard = loadLeaderboard();
    const userId = command.user_id;
    const score = leaderboard[userId] || 0;
    
    await say(`<@${userId}>'s current score is ${score}`);
  });

  // Start the app (bind explicit port so platform considers service healthy)
  (async () => {
    try {
      const port = process.env.PORT || process.env.RAILWAY_PORT || 3000;
      await app.start(port); // Even in Socket Mode this will spin up Express
      console.log(`⚡️ Slack bot is running in Socket Mode with health server on port ${port}`);
    } catch (error) {
      console.error('Failed to start app:', error);
      process.exit(1);
    }
  })();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    try {
      await app.stop();
      console.log('⚡️ Slack bot stopped gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error stopping app:', error);
      process.exit(1);
    }
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    try {
      await app.stop();
      console.log('⚡️ Slack bot stopped gracefully');
      process.exit(0);
    } catch (error) {
      console.error('Error stopping app:', error);
      process.exit(1);
    }
  });
}

// Only start the bot if this file is run directly
if (require.main === module) {
  startBot();
}

module.exports = { parseVote, updateLeaderboard, loadLeaderboard, saveLeaderboard };
