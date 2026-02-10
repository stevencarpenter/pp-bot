# Railway.com Deployment Guide for pp-bot

**Last Updated:** October 23, 2025  
**Target Platform:** Railway.com  
**Application:** pp-bot Slack Bot  
**Tech Stack:** Node.js (TypeScript), PostgreSQL, Socket Mode

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Railway.com Setup](#railwaycom-setup)
3. [PostgreSQL Database Setup](#postgresql-database-setup)
4. [Environment Variables](#environment-variables)
5. [Deployment](#deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Slack App Setup](#slack-app-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)
10. [Cost Optimization](#cost-optimization)
11. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Accounts

- GitHub account with access to stevencarpenter/pp-bot repository
- Railway.com account (sign up at https://railway.app)
- Slack workspace with admin access
- Slack App created and configured (see Issue #1)

### Required Tokens/Credentials

- `SLACK_BOT_TOKEN` (starts with `xoxb-`)
- `SLACK_APP_TOKEN` (starts with `xapp-`)
- `SLACK_SIGNING_SECRET` (32-character hex string)
- Railway.com API token (for CLI deployment)

### Local Setup

```bash
# Clone repository
git clone https://github.com/stevencarpenter/pp-bot.git
cd pp-bot

# Install dependencies
npm install

# Install Railway CLI (optional, for manual deployments)
npm install -g @railway/cli

# Login to Railway
railway login
```

---

## Railway.com Setup

### Step 1: Create New Project

1. **Navigate to Railway Dashboard**
   - Go to https://railway.app
   - Click "New Project"

2. **Connect GitHub Repository**
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub
   - Select `stevencarpenter/pp-bot` repository

3. **Configure Initial Settings**
   - Project name: `<your-project-name>`
   - Environment: `production`
   - Branch: `main`

### Step 2: Configure Build Settings

Railway will auto-detect Node.js. Verify settings:

**Build Command:**

```bash
npm ci && npm run build
```

**Start Command:**

```bash
npm start
```

**Node Version:**

```
20.x
```

### Step 3: Environment configuration

Set required environment variables in Railway (see [Environment Variables](#environment-variables)).

---

## Slack App Setup

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name your app and select your workspace

### Step 2: Enable Socket Mode

1. Open **Socket Mode**
2. Toggle **Enable Socket Mode**
3. Create an **App-Level Token** with `connections:write`
4. Save the token as `SLACK_APP_TOKEN`

### Step 3: OAuth Scopes

In **OAuth & Permissions**, add these bot token scopes:

- `app_mentions:read`
- `chat:write`
- `channels:history`
- `channels:read`
- `groups:history`
- `groups:read`
- `im:history`
- `mpim:history`
- `commands`

Install the app to your workspace and save the bot token as `SLACK_BOT_TOKEN`.

### Step 4: Slash Commands

Create the following commands in **Slash Commands**:

- `/leaderboard` - Show the leaderboard
- `/score` - Show your score
- `/help` - Show help

### Step 5: Event Subscriptions

Enable **Event Subscriptions** and subscribe to:

- `message.channels`
- `message.groups`
- `message.im`
- `message.mpim`

### Step 6: Signing Secret

Copy the **Signing Secret** from **Basic Information** and set it as `SLACK_SIGNING_SECRET`.

---

## PostgreSQL Database Setup

### Step 1: Add PostgreSQL Service

1. In Railway Dashboard, open your project
2. Click "+ New" → "Database" → "PostgreSQL"
3. Railway provisions database instantly
4. Copy the `DATABASE_URL` from Variables tab

### Step 2: Create Database Schema

```sql
CREATE TABLE IF NOT EXISTS leaderboard
(
    user_id    VARCHAR(20) PRIMARY KEY,
    score      INTEGER   DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard (user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC);

CREATE TABLE IF NOT EXISTS thing_leaderboard
(
    thing_name VARCHAR(64) PRIMARY KEY,
    score      INTEGER   DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_thing_leaderboard_score ON thing_leaderboard (score DESC);

CREATE TABLE IF NOT EXISTS vote_history
(
    id            SERIAL PRIMARY KEY,
    voter_id      VARCHAR(20) NOT NULL,
    voted_user_id VARCHAR(20) NOT NULL,
    vote_type     VARCHAR(2)  NOT NULL CHECK (vote_type IN ('++', '--')),
    channel_id    VARCHAR(20),
    message_ts    VARCHAR(20),
    created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vote_history_user ON vote_history (voted_user_id);
CREATE INDEX IF NOT EXISTS idx_vote_history_created ON vote_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vote_history_channel_message ON vote_history (channel_id, message_ts);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vote_history_dedupe
    ON vote_history (voter_id, voted_user_id, channel_id, message_ts)
    WHERE channel_id IS NOT NULL AND message_ts IS NOT NULL;

CREATE TABLE IF NOT EXISTS message_dedupe
(
    id         SERIAL PRIMARY KEY,
    channel_id VARCHAR(20) NOT NULL,
    message_ts VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (channel_id, message_ts)
);
```

Alternatively, you can rely on the built-in migration runner:

```bash
npm run migrate
```

The application also runs migrations automatically on startup when `DATABASE_URL` is set.

---

## Environment Variables

Configure in Railway Dashboard → Variables:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=your-bot-token-here
SLACK_APP_TOKEN=your-app-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgres://user:pass@host:5432/dbname
PORT=3000
```

Notes:

- Railway provides `RAILWAY_PORT`; the app uses `PORT` or `RAILWAY_PORT`.
- The app runs migrations automatically on startup when `DATABASE_URL` is set.
- When using the Railway template, you'll be prompted for the Slack tokens during provisioning.
- Railway config uses a pre-deploy migration hook; startup also runs migrations as a safety net.

---

## Deployment

### Automatic Deployment (Recommended)

Railway automatically deploys when you push to `main`:

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

### Manual Deployment via CLI

```bash
railway link
railway up
railway logs
```

---

## Post-Deployment Verification

### Test Bot in Slack

```
@user ++
/leaderboard
/score me
```

---

## Health and Readiness

pp-bot runs in Slack Socket Mode and does not expose an HTTP health endpoint by default.
Use Railway's deployment status and logs to verify readiness, or add a lightweight HTTP
endpoint if you need external health checks.

## Monitoring & Logging

### View Logs

```bash
railway logs
railway logs --follow
railway logs | grep ERROR
```

### Set Up Uptime Monitoring

Use services like:

- UptimeRobot (free)
- Better Uptime
- Pingdom

Monitor via the Railway deployment status page or add a lightweight health check if you expose one.

---

## Troubleshooting

### Common Issues

**Database Connection Failed:**

```bash
# Verify DATABASE_URL
railway variables | grep DATABASE_URL

# Test connection
railway run psql $DATABASE_URL -c "SELECT 1"
```

**Bot Not Responding:**

- Verify Slack tokens are correct
- Check bot has required permissions
- Verify Socket Mode is enabled
- Check logs: `railway logs`

---

## Cost Optimization

### Railway Free Tier

- $5 credit per month
- ~500 MB RAM
- Keep pool sizing modest for small instances

### Monitor Usage

```bash
railway stats
```

Or check Dashboard → Billing → Usage

---

## Rollback Procedures

### Via Dashboard

1. Go to Deployments tab
2. Select previous deployment
3. Click "Rollback"

### Via CLI

```bash
railway deployments
railway rollback <deployment-id>
```

---

## Security Best Practices

- Never commit `.env` files
- Rotate secrets every 90 days
- Use Railway's variable management
- Enable SSL for database
- Keep dependencies updated

---

## Support

- Railway Discord: https://discord.gg/railway
- Documentation: https://docs.railway.app
- GitHub Issues: https://github.com/stevencarpenter/pp-bot/issues

---

**Deployment Checklist:**

- [ ] Railway project created
- [ ] GitHub repository connected
- [ ] PostgreSQL database provisioned
- [ ] Database schema created
- [ ] Environment variables configured
- [ ] Automatic deployments enabled
- [ ] Deployments healthy in Railway
- [ ] Bot responding in Slack
- [ ] Monitoring set up
- [ ] Backups configured

**Congratulations! Your pp-bot is now deployed! 🚀**
