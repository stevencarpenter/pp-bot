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
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)
9. [Cost Optimization](#cost-optimization)
10. [Rollback Procedures](#rollback-procedures)

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
   - Project name: `pp-bot-production`
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

### Step 3: Create railway.toml

In your repository root, create `railway.toml`:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 100
healthcheckInterval = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
```

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
    user_id
    VARCHAR
(
    20
) PRIMARY KEY,
    score INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW
(
),
    updated_at TIMESTAMP DEFAULT NOW
(
)
    );

CREATE INDEX idx_leaderboard_score ON leaderboard (score DESC);

CREATE TABLE IF NOT EXISTS vote_history
(
    id
    SERIAL
    PRIMARY
    KEY,
    voter_id
    VARCHAR
(
    20
) NOT NULL,
    voted_user_id VARCHAR
(
    20
) NOT NULL,
    vote_type VARCHAR
(
    2
) NOT NULL CHECK
(
    vote_type
    IN
(
    '++',
    '--'
)),
    channel_id VARCHAR
(
    20
),
    message_ts VARCHAR
(
    20
),
    created_at TIMESTAMP DEFAULT NOW
(
)
    );

CREATE INDEX idx_vote_history_user ON vote_history (voted_user_id);
CREATE INDEX idx_vote_history_created ON vote_history (created_at DESC);
```

---

## Environment Variables

Configure in Railway Dashboard → Variables:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
PORT=${{RAILWAY_STATIC_PORT}}
HEALTH_PORT=3001

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

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

### Check Health Endpoint

```bash
curl https://pp-bot-production.up.railway.app/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2025-10-23T12:00:00.000Z",
  "uptime": "120s"
}
```

### Test Bot in Slack

```
@user ++
/leaderboard
/score me
```

---

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

Monitor: `https://pp-bot-production.up.railway.app/health`

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
- Optimize connection pool: `DATABASE_POOL_SIZE=5`
- Implement caching for leaderboard

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
- [ ] Health checks passing
- [ ] Bot responding in Slack
- [ ] Monitoring set up
- [ ] Backups configured

**Congratulations! Your pp-bot is now deployed! 🚀**
