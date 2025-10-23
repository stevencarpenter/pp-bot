# Railway.com Deployment Configuration

**Milestone:** Phase 3: Deployment & Production
**Labels:** deployment, infrastructure

---

## 📋 Context

The pp-bot needs to be deployed to Railway.com for production use. Railway.com provides easy deployment with PostgreSQL database provisioning, automatic SSL, and environment variable management.

**Current State:**
- Bot runs locally only
- No deployment configuration
- No production environment setup
- No health checks or monitoring

**Target State:**
- Deployed to Railway.com
- PostgreSQL database provisioned
- Environment variables configured
- Health check endpoint
- Automatic deployments on push
- Production logging and monitoring

---

## 🎯 Objective

Configure and deploy the pp-bot to Railway.com with PostgreSQL database, environment variables, health checks, and automatic deployment pipeline.

---

## 🔧 Technical Specifications

### Railway Configuration Files

Create `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Create `nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

### Health Check Endpoint

Add to `src/index.ts`:

```typescript
import express from 'express';

// Create health check server
const healthApp = express();

healthApp.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

healthApp.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Start health check server
const healthPort = process.env.HEALTH_PORT || 3000;
healthApp.listen(healthPort, () => {
  console.log(`Health check server running on port ${healthPort}`);
});
```

### Environment Variables

Required environment variables for Railway:

```bash
# Slack Configuration (from Slack App dashboard)
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

# Database (automatically provided by Railway)
DATABASE_URL=postgresql://...

# Application
NODE_ENV=production
HEALTH_PORT=3000
LOG_LEVEL=info

# Optional: Error Tracking
SENTRY_DSN=...
```

### package.json Updates

Update scripts for production:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "migrate": "ts-node src/migrations/runner.ts",
    "postinstall": "npm run build"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## 📝 Implementation Steps

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub account
3. Connect your GitHub repository

### Step 2: Create New Project

```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init
```

Or use the Railway web interface:
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `stevencarpenter/pp-bot`
4. Click "Deploy Now"

### Step 3: Add PostgreSQL Database

1. In Railway dashboard, click "New"
2. Select "Database" → "PostgreSQL"
3. PostgreSQL will be provisioned automatically
4. `DATABASE_URL` is automatically added to environment variables

### Step 4: Configure Environment Variables

In Railway dashboard:
1. Go to your project
2. Click "Variables" tab
3. Add each environment variable:

```
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_APP_TOKEN=xapp-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
NODE_ENV=production
HEALTH_PORT=3000
```

### Step 5: Add Railway Configuration Files

1. Create `railway.json` (see above)
2. Create `nixpacks.toml` (see above)
3. Commit and push to GitHub

### Step 6: Deploy

Railway will automatically deploy on push to main branch. To deploy manually:

```bash
# Using Railway CLI
railway up

# Or push to GitHub
git push origin main
```

### Step 7: Verify Deployment

1. Check Railway dashboard for deployment status
2. View logs in Railway dashboard
3. Test health check endpoint: `curl https://your-app.railway.app/health`
4. Test bot in Slack

### Step 8: Monitor

1. Check logs: `railway logs`
2. View metrics in Railway dashboard
3. Set up alerts for downtime

---

## ✅ Acceptance Criteria

- [ ] Railway account created and connected to GitHub
- [ ] PostgreSQL database provisioned on Railway
- [ ] All environment variables configured
- [ ] `railway.json` configuration file created
- [ ] Health check endpoint implemented
- [ ] Bot successfully deployed to Railway
- [ ] Database migrations run automatically on deployment
- [ ] Bot responds to Slack messages in production
- [ ] Health check returns 200 OK
- [ ] Logs visible in Railway dashboard
- [ ] Documentation updated with deployment instructions
- [ ] Rollback procedure documented

---

## 📚 Reference Documentation

- [Railway Documentation](https://docs.railway.app/)
- [Railway PostgreSQL](https://docs.railway.app/databases/postgresql)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Nixpacks Documentation](https://nixpacks.com/docs)
- [Railway CLI](https://docs.railway.app/develop/cli)

---

## 🔗 Dependencies

**Blocks:**
- #6 (CI/CD with GitHub Actions) - deployment target needed

**Blocked By:**
- #2 (Migrate to TypeScript) - build step needed
- #3 (PostgreSQL Database Integration) - database connection needed

---

## 💡 Implementation Notes

### Cost Considerations

Railway pricing:
- Hobby Plan: $5/month + usage
- PostgreSQL: ~$5/month
- Estimated total: $10-15/month

### Deployment Best Practices

1. **Test locally first**: Always test changes locally before deploying
2. **Use staging environment**: Consider a staging deployment
3. **Monitor logs**: Watch logs during and after deployment
4. **Database backups**: Railway provides automatic backups
5. **Rollback plan**: Keep previous deployment accessible

### Troubleshooting

**Bot not starting:**
- Check environment variables are set
- Check logs for error messages
- Verify database connection

**Health check failing:**
- Ensure port 3000 is not blocked
- Check database connectivity
- Review health check logs

---

## 📅 Estimated Effort

**Time Estimate:** 2-3 hours

- Railway setup: 0.5 hours
- Configuration files: 0.5 hours
- Health check implementation: 0.5 hours
- Deployment and testing: 1 hour
- Documentation: 0.5 hours
