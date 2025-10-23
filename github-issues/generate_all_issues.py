#!/usr/bin/env python3
"""
Generate ALL 9 comprehensive GitHub issues for pp-bot repository
Each issue is designed to be AI-agent-friendly with complete context and implementation details.
"""

import os
import json

# Load existing issue bodies
with open('/tmp/issue1_body.txt', 'r') as f:
    issue1_body = f.read()

# Load issue 2 body (TypeScript migration)
with open('issue-02.md', 'r') as f:
    issue2_content = f.read()
    issue2_body = issue2_content.split('---\n\n', 1)[1] if '---\n\n' in issue2_content else issue2_content

# Define all issue data - this is the master source
issues = {
    1: {
        'title': 'Slack App Setup & Configuration Guide',
        'body': issue1_body,
        'milestone': 'Phase 1: Foundation',
        'labels': ['documentation', 'setup', 'good-first-issue']
    },
    2: {
        'title': 'Migrate to TypeScript',
        'body': issue2_body,
        'milestone': 'Phase 1: Foundation',
        'labels': ['enhancement', 'typescript', 'refactoring']
    },
    3: {
        'title': 'PostgreSQL Database Integration',
        'milestone': 'Phase 2: Database & Features',
        'labels': ['enhancement', 'database', 'postgresql'],
        'body': open('/home/ubuntu/pp-bot-analysis.md').read().split('### Required for Railway.com + PostgreSQL:', 1)[0] + '''

## 📋 Context

The pp-bot currently uses file-based JSON storage (`leaderboard.json`) which is not suitable for production deployment. File-based storage has several critical issues:
- Data loss on container restart (ephemeral storage)
- Race conditions with concurrent writes
- No horizontal scaling capability
- No backup/recovery mechanism

For production deployment on Railway.com, we need to migrate to PostgreSQL for persistent, scalable data storage.

**Current State:**
- Synchronous file I/O (`fs.readFileSync`, `fs.writeFileSync`)
- JSON file storage in application directory
- Simple key-value structure: `{ "U12345678": 5 }`
- No connection pooling or database abstraction
- Risk of data corruption with concurrent access

**Target State:**
- PostgreSQL database with proper schema
- Connection pooling for efficient database access
- Async/await database operations
- Database migrations for schema versioning
- Environment-based configuration (local/production)
- Proper indexing for performance
- Transaction support for data integrity

---

See issue-03.md for full implementation details including schema, code examples, and step-by-step guide.
'''
    },
    4: {
        'title': 'Implement Leaderboard View Command',
        'milestone': 'Phase 2: Database & Features',
        'labels': ['enhancement', 'feature'],
        'body': '''## 📋 Context

The bot currently has a `/leaderboard` command that shows the top 10 users, but it needs to be improved with better formatting, pagination support, and additional viewing options. This issue focuses on enhancing the leaderboard display functionality.

**Current State:**
- Basic `/leaderboard` command exists
- Shows top 10 users only
- Simple text formatting
- No pagination
- No filtering options

**Target State:**
- Enhanced `/leaderboard` command with rich formatting
- Paginated view for large leaderboards
- Options to filter by score range
- Display user's own rank even if not in top 10
- Statistics summary (total users, votes, etc.)

---

## 🎯 Objective

Enhance the leaderboard command with better formatting, pagination support, statistics, and user rank display functionality.

---

## 🔧 Technical Specifications

### Command Syntax

```
/leaderboard [page] [options]

Examples:
/leaderboard           # Show top 10
/leaderboard 2         # Show next 10 (11-20)
/leaderboard stats     # Show statistics
/leaderboard me        # Show my rank and nearby users
```

### Implementation

```typescript
// Enhanced leaderboard command with pagination
app.command('/leaderboard', async ({ command, ack, say }) => {
  await ack();

  const args = command.text.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase();

  try {
    if (subcommand === 'stats') {
      await showStats(say);
    } else if (subcommand === 'me') {
      await showUserRank(say, command.user_id);
    } else {
      const page = parseInt(args[0]) || 1;
      await showLeaderboard(say, page);
    }
  } catch (error) {
    console.error('Error in /leaderboard command:', error);
    await say('❌ Failed to display leaderboard. Please try again.');
  }
});

async function showLeaderboard(say: any, page: number): Promise<void> {
  const perPage = 10;
  const offset = (page - 1) * perPage;
  
  const entries = await getSortedLeaderboard(perPage, offset);
  
  if (entries.length === 0) {
    if (page === 1) {
      await say('The leaderboard is empty! Start voting with @user ++');
    } else {
      await say(`No users found on page ${page}`);
    }
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = entries.map((entry, index) => {
    const globalRank = offset + index + 1;
    const medal = globalRank <= 3 ? medals[globalRank - 1] + ' ' : `${globalRank}. `;
    return `${medal}<@${entry.userId}>: ${entry.score}`;
  });

  const header = page === 1 
    ? '*🏆 Leaderboard (Top 10)*' 
    : `*🏆 Leaderboard (Page ${page})*`;
  
  const footer = entries.length === perPage 
    ? `\n\n_Type \`/leaderboard ${page + 1}\` to see more_` 
    : '';

  await say(`${header}\n${lines.join('\n')}${footer}`);
}

async function showStats(say: any): Promise<void> {
  const stats = await getStats();
  
  await say(`*📊 Leaderboard Statistics*
  
👥 Total Users: ${stats.totalUsers}
🗳️ Total Votes: ${stats.totalVotes}
⬆️ Highest Score: ${stats.highestScore}
⬇️ Lowest Score: ${stats.lowestScore}`);
}

async function showUserRank(say: any, userId: string): Promise<void> {
  const userRank = await getUserRank(userId);
  
  if (userRank === null) {
    await say('You haven\'t received any votes yet!');
    return;
  }

  // Get nearby users (±2 positions)
  const nearby = await getNearbyUsers(userRank.rank, 2);
  
  const lines = nearby.map(entry => {
    const marker = entry.userId === userId ? '➡️ ' : '   ';
    return `${marker}${entry.rank}. <@${entry.userId}>: ${entry.score}`;
  });

  await say(`*Your Ranking*\n\n${lines.join('\n')}`);
}
```

### Database Functions

Add to `src/storage/database.ts`:

```typescript
/**
 * Get sorted leaderboard with pagination
 */
export async function getSortedLeaderboard(
  limit: number = 10,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  const result = await pool.query(
    `SELECT 
      user_id,
      score,
      ROW_NUMBER() OVER (ORDER BY score DESC) as rank
     FROM leaderboard
     ORDER BY score DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows.map(row => ({
    userId: row.user_id,
    score: row.score,
    rank: row.rank,
  }));
}

/**
 * Get user's rank in the leaderboard
 */
export async function getUserRank(userId: UserId): Promise<LeaderboardEntry | null> {
  const result = await pool.query(
    `SELECT 
      user_id,
      score,
      (SELECT COUNT(*) + 1 FROM leaderboard WHERE score > l.score) as rank
     FROM leaderboard l
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    userId: result.rows[0].user_id,
    score: result.rows[0].score,
    rank: result.rows[0].rank,
  };
}

/**
 * Get users near a specific rank
 */
export async function getNearbyUsers(
  rank: number,
  range: number = 2
): Promise<LeaderboardEntry[]> {
  const result = await pool.query(
    `WITH ranked_users AS (
      SELECT 
        user_id,
        score,
        ROW_NUMBER() OVER (ORDER BY score DESC) as rank
      FROM leaderboard
    )
    SELECT user_id, score, rank
    FROM ranked_users
    WHERE rank BETWEEN $1 AND $2
    ORDER BY rank`,
    [Math.max(1, rank - range), rank + range]
  );

  return result.rows.map(row => ({
    userId: row.user_id,
    score: row.score,
    rank: row.rank,
  }));
}
```

---

## ✅ Acceptance Criteria

- [ ] `/leaderboard` shows top 10 with rich formatting
- [ ] `/leaderboard [page]` shows paginated results
- [ ] `/leaderboard stats` shows statistics
- [ ] `/leaderboard me` shows user's rank and nearby users
- [ ] Pagination footer shows "see more" when applicable
- [ ] Database functions support pagination and ranking
- [ ] Tests for all leaderboard functions
- [ ] Error handling for invalid page numbers
- [ ] Documentation updated with command examples

---

## 📚 Reference Documentation

- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder/) - for rich formatting
- [Slack Message Formatting](https://api.slack.com/reference/surfaces/formatting)
- [PostgreSQL Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html)

---

## 🔗 Dependencies

**Blocks:** None

**Blocked By:**
- #2 (Migrate to TypeScript) - TypeScript types needed
- #3 (PostgreSQL Database Integration) - Database functions needed

---

## 📅 Estimated Effort

**Time Estimate:** 3-4 hours

- Command handler implementation: 1 hour
- Database functions: 1 hour
- Testing: 1 hour
- Documentation: 0.5 hours
'''
    },
    5: {
        'title': 'Railway.com Deployment Configuration',
        'milestone': 'Phase 3: Deployment & Production',
        'labels': ['deployment', 'infrastructure'],
        'body': '''## 📋 Context

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
'''
    },
    6: {
        'title': 'CI/CD with GitHub Actions',
        'milestone': 'Phase 3: Deployment & Production',
        'labels': ['ci/cd', 'automation', 'github-actions'],
        'body': '''## 📋 Context

To ensure code quality and automate deployment, we need to set up a CI/CD pipeline using GitHub Actions. This will automatically run tests, type checking, linting, and deploy to Railway on every push to the main branch.

**Current State:**
- No automated testing
- No continuous integration
- Manual deployment process
- No code quality checks

**Target State:**
- Automated testing on every PR
- Type checking and linting in CI
- Automatic deployment to Railway on push to main
- Build status badges
- Automated dependency updates

---

## 🎯 Objective

Implement comprehensive CI/CD pipeline using GitHub Actions that runs tests, checks code quality, and automatically deploys to Railway on successful merges to main.

---

## 🔧 Technical Specifications

### GitHub Actions Workflows

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: ppbot
          POSTGRES_PASSWORD: ppbot_test
          POSTGRES_DB: ppbot_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run type-check

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://ppbot:ppbot_test@localhost:5432/ppbot_test
          NODE_ENV: test

      - name: Build project
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: false

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true

      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://ppbot:ppbot_test@localhost:5432/ppbot_test
          NODE_ENV: test

      - name: Build project
        run: npm run build

      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: ${{ secrets.RAILWAY_SERVICE }}

      - name: Notify deployment success
        if: success()
        run: |
          echo "✅ Deployment successful!"
          echo "Check Railway dashboard for details"

      - name: Notify deployment failure
        if: failure()
        run: |
          echo "❌ Deployment failed!"
          echo "Check logs for details"
```

Create `.github/workflows/dependency-updates.yml`:

```yaml
name: Dependency Updates

on:
  schedule:
    - cron: '0 0 * * 1'  # Run every Monday at midnight
  workflow_dispatch:  # Allow manual trigger

jobs:
  update-dependencies:
    name: Update Dependencies
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Update dependencies
        run: |
          npm update
          npm outdated || true

      - name: Run tests
        run: npm test

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: update dependencies'
          title: 'chore: update dependencies'
          body: |
            Automated dependency updates

            Please review and merge if tests pass.
          branch: dependency-updates
          labels: dependencies, automated
```

### Required GitHub Secrets

Add these secrets to GitHub repository settings:

1. `RAILWAY_TOKEN` - Railway API token
2. `RAILWAY_SERVICE` - Railway service ID
3. `SNYK_TOKEN` (optional) - Snyk security scanning token

To get Railway token:
```bash
railway login
railway whoami --token
```

---

## 📝 Implementation Steps

### Step 1: Create GitHub Actions Directory

```bash
mkdir -p .github/workflows
```

### Step 2: Add Workflow Files

Create all three workflow files as shown above:
- `ci.yml` - Continuous Integration
- `deploy.yml` - Deployment
- `dependency-updates.yml` - Dependency management

### Step 3: Add GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each required secret:
   - `RAILWAY_TOKEN`
   - `RAILWAY_SERVICE`
   - `SNYK_TOKEN` (optional)

### Step 4: Add Status Badges to README

Update `README.md`:

```markdown
# PP Bot

[![CI Status](https://i.ytimg.com/vi/GlqQGLz6hfs/sddefault.jpg)
[![Deploy Status](https://i.ytimg.com/vi/jfL6I0VDgGw/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCDIgyqNGN9bFR2zNmXseZOxGqRGw)
[![codecov](https://files.readme.io/d19875a-Screenshot_2024-08-06_at_11.20.59.png)

A Slack bot for managing user leaderboards with ++ and -- voting.
```

### Step 5: Add ESLint Configuration

Create `.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["@typescript-eslint"],
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_"
    }]
  }
}
```

### Step 6: Update package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint 'src/**/*.ts' 'tests/**/*.ts'",
    "lint:fix": "eslint 'src/**/*.ts' 'tests/**/*.ts' --fix",
    "type-check": "tsc --noEmit",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts"
  }
}
```

### Step 7: Test Workflows Locally (Optional)

Install `act` to test GitHub Actions locally:

```bash
# macOS
brew install act

# Test CI workflow
act pull_request

# Test deploy workflow
act push --secret-file .secrets
```

### Step 8: Create First PR

1. Create a feature branch
2. Make a small change
3. Create a pull request
4. Watch CI run automatically
5. Merge to main
6. Watch deployment happen automatically

---

## ✅ Acceptance Criteria

- [ ] CI workflow created (`ci.yml`)
- [ ] Deploy workflow created (`deploy.yml`)
- [ ] Dependency update workflow created (`dependency-updates.yml`)
- [ ] GitHub secrets configured
- [ ] ESLint configuration added
- [ ] Status badges added to README
- [ ] All workflows tested and working
- [ ] CI runs on pull requests
- [ ] Deploy runs on push to main
- [ ] Tests run in CI with PostgreSQL
- [ ] Deployment succeeds automatically
- [ ] Build artifacts are created
- [ ] Coverage reports uploaded
- [ ] Documentation updated

---

## 📚 Reference Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway GitHub Actions](https://docs.railway.app/deploy/github-actions)
- [ESLint TypeScript](https://typescript-eslint.io/)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Codecov GitHub Action](https://github.com/codecov/codecov-action)

---

## 🔗 Dependencies

**Blocks:** None

**Blocked By:**
- #2 (Migrate to TypeScript) - TypeScript build needed
- #3 (PostgreSQL Database Integration) - Database tests needed
- #5 (Railway.com Deployment Configuration) - Deployment target needed
- #8 (Testing Infrastructure) - Tests needed

---

## 💡 Implementation Notes

### Best Practices

1. **Branch Protection**: Enable branch protection on main branch
2. **Required Checks**: Make CI required before merging
3. **Code Review**: Require at least one approval
4. **Secrets Management**: Never commit secrets to repository
5. **Deployment Verification**: Add smoke tests after deployment

### Performance Optimization

1. **Cache Dependencies**: Use `cache: 'npm'` in setup-node action
2. **Parallel Jobs**: Run tests and linting in parallel
3. **Conditional Deployment**: Only deploy if tests pass

### Security

1. **Dependency Scanning**: Use Snyk or Dependabot
2. **Secret Scanning**: Enable GitHub secret scanning
3. **Code Scanning**: Enable GitHub code scanning
4. **Audit Logs**: Monitor GitHub Actions audit logs

---

## 📅 Estimated Effort

**Time Estimate:** 3-4 hours

- Workflow creation: 1.5 hours
- GitHub secrets configuration: 0.5 hours
- ESLint setup: 0.5 hours
- Testing and debugging: 1 hour
- Documentation: 0.5 hours
'''
    },
    7: {
        'title': 'Error Handling & Logging',
        'milestone': 'Phase 1: Foundation',
        'labels': ['enhancement', 'logging', 'error-handling'],
        'body': '''## 📋 Context

The current implementation uses simple `console.log()` and `console.error()` statements which are not suitable for production. We need structured logging, proper error handling, and error tracking for production monitoring.

**Current State:**
- Simple `console.log()` logging
- No structured logging format
- No log levels
- No error tracking
- Try-catch blocks scattered inconsistently
- No centralized error handling

**Target State:**
- Structured logging with Winston
- Log levels (debug, info, warn, error)
- Centralized error handling
- Error tracking with Sentry (optional)
- Request/response logging
- Performance monitoring
- Error context and stack traces

---

## 🎯 Objective

Implement comprehensive error handling and structured logging throughout the application, with optional error tracking integration for production monitoring.

---

## 🔧 Technical Specifications

### Logging with Winston

Install dependencies:

```bash
npm install winston
npm install --save-dev @types/winston
```

Create `src/utils/logger.ts`:

```typescript
import winston from 'winston';

/**
 * Log levels:
 * - error: Error messages
 * - warn: Warning messages
 * - info: Informational messages
 * - debug: Debug messages (not shown in production)
 */

const logLevel = process.env.LOG_LEVEL || (
  process.env.NODE_ENV === 'production' ? 'info' : 'debug'
);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'pp-bot' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ],
});

// Log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

export default logger;
```

### Error Classes

Create `src/errors/index.ts`:

```typescript
/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database operation error
 */
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 500);
    this.name = 'DatabaseError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Slack API error
 */
export class SlackAPIError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode);
    this.name = 'SlackAPIError';
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Configuration error
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, false); // Not operational - requires fix
    this.name = 'ConfigError';
  }
}
```

### Error Handler Middleware

Create `src/middleware/errorHandler.ts`:

```typescript
import { logger } from '../utils/logger';
import { AppError } from '../errors';

/**
 * Centralized error handler
 */
export async function handleError(error: Error, context?: any): Promise<void> {
  if (error instanceof AppError) {
    // Known operational error
    logger.error('Operational error:', {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      context,
    });
  } else {
    // Unknown error - log full details
    logger.error('Unexpected error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  // Optionally send to error tracking service (Sentry)
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(error);
  }
}

/**
 * Wrap async functions with error handling
 */
export function asyncHandler<T>(
  fn: (...args: any[]) => Promise<T>
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error as Error, { function: fn.name, args });
      throw error;
    }
  };
}
```

### Update Bot Logic

Update `src/index.ts`:

```typescript
import { App, LogLevel } from '@slack/bolt';
import { logger } from './utils/logger';
import { handleError } from './middleware/errorHandler';
import { DatabaseError, SlackAPIError } from './errors';

// Replace all console.log with logger
// Before: console.log('⚡️ PP Bot is running!');
// After:  logger.info('PP Bot is running');

// Message handler with error handling
app.message(/<@[A-Z0-9]+>\s*(\+\+|--)/, async ({ message, say }) => {
  try {
    logger.debug('Processing vote message', { 
      user: message.user,
      text: message.text 
    });

    // ... vote processing logic ...

    logger.info('Vote processed successfully', {
      user: message.user,
      votes: votes.length,
    });
  } catch (error) {
    logger.error('Failed to process vote', {
      error: error.message,
      user: message.user,
    });
    
    await handleError(error as Error, { message });
    
    try {
      await say('❌ Sorry, something went wrong processing your vote. Please try again.');
    } catch (sayError) {
      logger.error('Failed to send error message', { error: sayError });
    }
  }
});

// Database operations with error handling
export async function updateUserScore(userId: string, action: string): Promise<number> {
  try {
    logger.debug('Updating user score', { userId, action });
    
    const result = await pool.query(/* ... */);
    
    logger.debug('Score updated', { userId, newScore: result.rows[0].score });
    return result.rows[0].score;
  } catch (error) {
    throw new DatabaseError(
      `Failed to update score for user ${userId}`,
      error as Error
    );
  }
}
```

### Optional: Sentry Integration

Install Sentry:

```bash
npm install @sentry/node
```

Create `src/utils/sentry.ts`:

```typescript
import * as Sentry from '@sentry/node';
import { logger } from './logger';

export function initSentry(): void {
  if (!process.env.SENTRY_DSN) {
    logger.info('Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    
    beforeSend(event, hint) {
      // Log to Winston as well
      logger.error('Sentry event', {
        eventId: event.event_id,
        message: hint.originalException,
      });
      return event;
    },
  });

  logger.info('Sentry initialized');
}
```

### Performance Logging

Create `src/utils/performance.ts`:

```typescript
import { logger } from './logger';

/**
 * Measure function execution time
 */
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return fn().finally(() => {
    const duration = Date.now() - start;
    logger.debug('Performance measurement', { name, duration });
    
    if (duration > 1000) {
      logger.warn('Slow operation detected', { name, duration });
    }
  });
}

/**
 * Performance decorator
 */
export function performance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = async function(...args: any[]) {
    return measurePerformance(
      `${target.constructor.name}.${propertyName}`,
      () => method.apply(this, args)
    );
  };
}
```

---

## ✅ Acceptance Criteria

- [ ] Winston logger configured
- [ ] Log levels properly implemented (debug, info, warn, error)
- [ ] Structured logging format (JSON in production)
- [ ] Custom error classes created
- [ ] Centralized error handler implemented
- [ ] All console.log replaced with logger
- [ ] Database errors wrapped with DatabaseError
- [ ] Slack API errors wrapped with SlackAPIError
- [ ] Unhandled rejections logged
- [ ] Uncaught exceptions logged
- [ ] Error context included in logs
- [ ] Performance logging added for slow operations
- [ ] Optional Sentry integration added
- [ ] Error messages user-friendly in Slack
- [ ] Tests for error handling
- [ ] Documentation updated

---

## 📚 Reference Documentation

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Node.js Error Handling Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

## 🔗 Dependencies

**Blocks:** None

**Blocked By:** None

---

## 💡 Implementation Notes

### Log Levels Usage

- **debug**: Detailed information for debugging
- **info**: General informational messages
- **warn**: Warning messages for recoverable issues
- **error**: Error messages for failures

### Security Considerations

1. **Never log sensitive data**: Passwords, tokens, etc.
2. **Sanitize user input**: Before logging
3. **Rate limit logs**: Prevent log flooding
4. **Secure log storage**: Protect log files

### Performance

1. **Async logging**: Winston handles this automatically
2. **Log sampling**: Sample debug logs in production
3. **Log rotation**: Use winston-daily-rotate-file for log rotation

---

## 📅 Estimated Effort

**Time Estimate:** 3-4 hours

- Winston setup: 1 hour
- Error classes: 0.5 hours
- Update existing code: 1.5 hours
- Testing: 0.5 hours
- Sentry integration (optional): 0.5 hours
- Documentation: 0.5 hours
'''
    },
    8: {
        'title': 'Testing Infrastructure',
        'milestone': 'Phase 2: Database & Features',
        'labels': ['testing', 'quality'],
        'body': '''## 📋 Context

The current test coverage is minimal (~40%), covering only basic parsing and leaderboard logic. We need comprehensive testing including unit tests, integration tests, and database tests.

**Current State:**
- Basic Jest tests for parser and leaderboard
- No integration tests
- No database tests
- No Slack API mocking
- ~40% code coverage
- No CI test integration

**Target State:**
- 80%+ code coverage
- Unit tests for all modules
- Integration tests for bot functionality
- Database tests with test database
- Slack API properly mocked
- Performance tests
- Tests run in CI/CD pipeline

---

## 🎯 Objective

Implement comprehensive testing infrastructure with unit tests, integration tests, database tests, and achieve 80%+ code coverage.

---

## 🔧 Technical Specifications

### Testing Stack

```bash
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev @slack/bolt-mock
npm install --save-dev supertest @types/supertest
npm install --save-dev testcontainers  # For database tests
```

### Jest Configuration

Update `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/types.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
};
```

### Test Setup

Create `tests/setup.ts`:

```typescript
import { logger } from '../src/utils/logger';

// Suppress logs during tests
logger.silent = true;

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://ppbot:ppbot_test@localhost:5432/ppbot_test';

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
  // Close database connections, etc.
});
```

### Unit Tests

Create `tests/unit/parser.test.ts`:

```typescript
import { parseVote } from '../../src/utils/parser';

describe('parseVote', () => {
  describe('valid inputs', () => {
    test('parses simple upvote', () => {
      const result = parseVote('<@U12345678> ++');
      expect(result).toEqual([
        { userId: 'U12345678', action: '++' }
      ]);
    });

    test('parses simple downvote', () => {
      const result = parseVote('<@U12345678> --');
      expect(result).toEqual([
        { userId: 'U12345678', action: '--' }
      ]);
    });

    test('parses multiple votes', () => {
      const result = parseVote('<@U111> ++ <@U222> --');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ userId: 'U111', action: '++' });
      expect(result[1]).toEqual({ userId: 'U222', action: '--' });
    });

    test('parses vote with text after', () => {
      const result = parseVote('<@U12345678> ++ great job!');
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('U12345678');
    });
  });

  describe('invalid inputs', () => {
    test('returns empty array for no votes', () => {
      expect(parseVote('Hello world!')).toEqual([]);
    });

    test('returns empty array for incomplete pattern', () => {
      expect(parseVote('<@U12345678>')).toEqual([]);
    });

    test('ignores malformed user IDs', () => {
      expect(parseVote('<@invalid> ++')).toEqual([]);
    });
  });

  describe('edge cases', () => {
    test('handles votes without space', () => {
      const result = parseVote('<@U12345678>++');
      expect(result).toHaveLength(1);
    });

    test('handles emojis in text', () => {
      const result = parseVote('<@U12345678> ++ 🎉🎊');
      expect(result).toHaveLength(1);
    });

    test('handles very long text', () => {
      const longText = '<@U12345678> ++ ' + 'a'.repeat(10000);
      const result = parseVote(longText);
      expect(result).toHaveLength(1);
    });
  });
});
```

### Database Tests

Create `tests/integration/database.test.ts`:

```typescript
import { pool } from '../../src/config/database';
import {
  updateUserScore,
  getUserScore,
  getSortedLeaderboard,
  resetLeaderboard,
} from '../../src/storage/database';

describe('Database Integration', () => {
  beforeAll(async () => {
    // Run migrations
    await runMigrations();
  });

  beforeEach(async () => {
    // Clear database before each test
    await resetLeaderboard();
  });

  afterAll(async () => {
    // Close pool
    await pool.end();
  });

  describe('updateUserScore', () => {
    test('creates new user with score 1', async () => {
      const score = await updateUserScore('U12345678', '++');
      expect(score).toBe(1);
    });

    test('increments existing user score', async () => {
      await updateUserScore('U12345678', '++');
      const score = await updateUserScore('U12345678', '++');
      expect(score).toBe(2);
    });

    test('decrements user score', async () => {
      await updateUserScore('U12345678', '++');
      const score = await updateUserScore('U12345678', '--');
      expect(score).toBe(0);
    });

    test('allows negative scores', async () => {
      const score = await updateUserScore('U12345678', '--');
      expect(score).toBe(-1);
    });

    test('handles concurrent updates correctly', async () => {
      const userId = 'U12345678';
      const promises = Array(10).fill(null).map(() =>
        updateUserScore(userId, '++')
      );
      
      await Promise.all(promises);
      
      const finalScore = await getUserScore(userId);
      expect(finalScore).toBe(10);
    });
  });

  describe('getSortedLeaderboard', () => {
    test('returns empty array for empty leaderboard', async () => {
      const result = await getSortedLeaderboard(10);
      expect(result).toEqual([]);
    });

    test('returns users in descending score order', async () => {
      await updateUserScore('U111', '++');
      await updateUserScore('U222', '++');
      await updateUserScore('U222', '++');
      await updateUserScore('U333', '++');
      await updateUserScore('U333', '++');
      await updateUserScore('U333', '++');

      const result = await getSortedLeaderboard(10);
      
      expect(result).toHaveLength(3);
      expect(result[0].userId).toBe('U333');
      expect(result[0].score).toBe(3);
      expect(result[1].userId).toBe('U222');
      expect(result[2].userId).toBe('U111');
    });

    test('respects limit parameter', async () => {
      for (let i = 0; i < 20; i++) {
        await updateUserScore(`U${i}`, '++');
      }

      const result = await getSortedLeaderboard(5);
      expect(result).toHaveLength(5);
    });
  });
});
```

### Slack Bot Integration Tests

Create `tests/integration/bot.test.ts`:

```typescript
import { App } from '@slack/bolt';
import { createMockApp, mockSlackAPI } from '@slack/bolt-mock';

describe('Slack Bot Integration', () => {
  let app: App;

  beforeEach(() => {
    app = createMockApp();
    // Set up your bot handlers here
  });

  describe('vote message handling', () => {
    test('processes upvote correctly', async () => {
      const mockMessage = {
        type: 'message',
        user: 'U111',
        text: '<@U222> ++',
        channel: 'C123',
      };

      const response = await mockSlackAPI.message(mockMessage);
      
      expect(response).toMatchObject({
        text: expect.stringContaining('⬆️'),
        text: expect.stringContaining('<@U222>'),
      });
    });

    test('prevents self-voting', async () => {
      const mockMessage = {
        type: 'message',
        user: 'U111',
        text: '<@U111> ++',
        channel: 'C123',
      };

      const response = await mockSlackAPI.message(mockMessage);
      
      expect(response.text).toContain('cannot vote for themselves');
    });

    test('processes multiple votes in one message', async () => {
      const mockMessage = {
        type: 'message',
        user: 'U111',
        text: '<@U222> ++ <@U333> --',
        channel: 'C123',
      };

      const response = await mockSlackAPI.message(mockMessage);
      
      expect(response.text).toContain('<@U222>');
      expect(response.text).toContain('<@U333>');
    });
  });

  describe('/leaderboard command', () => {
    test('shows top 10 users', async () => {
      // Set up test data
      for (let i = 0; i < 15; i++) {
        await updateUserScore(`U${i}`, '++');
      }

      const response = await mockSlackAPI.command({
        command: '/leaderboard',
        user_id: 'U111',
      });

      expect(response.text).toContain('Leaderboard');
      expect(response.text).toContain('🥇');
    });

    test('handles empty leaderboard', async () => {
      await resetLeaderboard();

      const response = await mockSlackAPI.command({
        command: '/leaderboard',
        user_id: 'U111',
      });

      expect(response.text).toContain('empty');
    });
  });

  describe('/score command', () => {
    test('shows own score', async () => {
      await updateUserScore('U111', '++');

      const response = await mockSlackAPI.command({
        command: '/score',
        user_id: 'U111',
      });

      expect(response.text).toContain('Your current score: 1');
    });

    test('shows other user score', async () => {
      await updateUserScore('U222', '++');

      const response = await mockSlackAPI.command({
        command: '/score <@U222>',
        user_id: 'U111',
      });

      expect(response.text).toContain('<@U222>');
      expect(response.text).toContain('1');
    });
  });
});
```

### Performance Tests

Create `tests/performance/load.test.ts`:

```typescript
describe('Performance Tests', () => {
  test('handles 100 concurrent vote updates', async () => {
    const start = Date.now();
    
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(updateUserScore(`U${i % 10}`, '++'));
    }
    
    await Promise.all(promises);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // Should complete in 5 seconds
  });

  test('leaderboard query is fast', async () => {
    // Insert 1000 users
    for (let i = 0; i < 1000; i++) {
      await updateUserScore(`U${i}`, '++');
    }

    const start = Date.now();
    await getSortedLeaderboard(10);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should be < 100ms
  });
});
```

---

## ✅ Acceptance Criteria

- [ ] Jest configured with ts-jest
- [ ] Test coverage >= 80%
- [ ] Unit tests for all utility functions
- [ ] Integration tests for database operations
- [ ] Integration tests for Slack bot handlers
- [ ] Performance tests added
- [ ] Test database setup automated
- [ ] Tests run in CI/CD pipeline
- [ ] Coverage reports generated
- [ ] Test documentation added
- [ ] Mock data factories created
- [ ] Test helpers created
- [ ] All tests passing

---

## 📚 Reference Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing TypeScript](https://jestjs.io/docs/getting-started#using-typescript)
- [@slack/bolt Testing](https://slack.dev/bolt-js/concepts#testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

---

## 🔗 Dependencies

**Blocks:**
- #6 (CI/CD with GitHub Actions) - tests needed for CI

**Blocked By:**
- #2 (Migrate to TypeScript) - TypeScript needed for ts-jest
- #3 (PostgreSQL Database Integration) - database tests need database

---

## 📅 Estimated Effort

**Time Estimate:** 5-6 hours

- Jest configuration: 0.5 hours
- Unit tests: 2 hours
- Integration tests: 2 hours
- Performance tests: 0.5 hours
- Documentation: 1 hour
'''
    },
    9: {
        'title': 'Documentation',
        'milestone': 'Phase 3: Deployment & Production',
        'labels': ['documentation'],
        'body': '''## 📋 Context

The repository needs comprehensive documentation for users, developers, and contributors. Current documentation is basic and needs expansion.

**Current State:**
- Basic README
- EXAMPLES.md with usage examples
- CONTRIBUTING.md with contribution guidelines
- No architecture documentation
- No deployment guide
- No troubleshooting guide

**Target State:**
- Comprehensive README
- Architecture overview
- Deployment guide
- API documentation
- Troubleshooting guide
- Development setup guide
- Changelog

---

## 🎯 Objective

Create comprehensive documentation covering setup, architecture, deployment, API, troubleshooting, and development for both users and contributors.

---

## 📝 Documentation Structure

### 1. README.md (Enhanced)

```markdown
# PP Bot

[![CI Status](https://i.sstatic.net/6Hbdo.png)
[![Coverage](https://user-images.githubusercontent.com/32522659/89895510-93216380-dbf9-11ea-973f-b5077a9ac49b.PNG)

A production-ready Slack bot for managing user leaderboards through ++ and -- voting.

## Features

- ⬆️ Upvote users with `@user ++`
- ⬇️ Downvote users with `@user --`
- 🏆 View leaderboard with `/leaderboard`
- 📊 Check scores with `/score`
- 🗄️ PostgreSQL database for persistence
- 🚀 Deployed on Railway.com
- 📝 TypeScript for type safety
- ✅ Comprehensive testing

## Quick Start

```bash
# Clone repository
git clone https://github.com/stevencarpenter/pp-bot.git
cd pp-bot

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Slack tokens

# Start local database
docker-compose up -d

# Run migrations
npm run migrate

# Start bot
npm run dev
```

## Documentation

- [Setup Guide](docs/SETUP.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Documentation](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT
```

### 2. docs/SETUP.md

Complete setup guide including:
- Prerequisites
- Slack App configuration
- Local development setup
- Environment variables
- Running tests
- Building for production

### 3. docs/ARCHITECTURE.md

```markdown
# Architecture Overview

## System Architecture

\`\`\`
┌─────────────┐
│   Slack     │
└──────┬──────┘
       │ Socket Mode
       ↓
┌─────────────┐
│   PP Bot    │
│  (Node.js)  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ PostgreSQL  │
│  Database   │
└─────────────┘
\`\`\`

## Components

### 1. Bot Layer (`src/index.ts`)
- Message handlers
- Command handlers
- Slack SDK integration

### 2. Storage Layer (`src/storage/`)
- Database abstraction
- CRUD operations
- Query optimization

### 3. Utility Layer (`src/utils/`)
- Vote parsing
- Logging
- Error handling

### 4. Configuration (`src/config/`)
- Database configuration
- Environment validation
- Logging setup

## Data Flow

1. User sends message in Slack
2. Slack sends event via Socket Mode
3. Bot parses message for votes
4. Database updated
5. Bot responds with result

## Database Schema

See `migrations/001_initial_schema.sql`

## Error Handling

All errors are caught and logged with Winston. User-facing errors show friendly messages.

## Testing

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`
```

### 4. docs/DEPLOYMENT.md

Step-by-step deployment guide:
- Railway.com setup
- Environment variables
- Database provisioning
- Deployment verification
- Rollback procedures
- Monitoring setup

### 5. docs/API.md

API documentation:
- Database functions
- Storage interface
- Type definitions
- Usage examples

### 6. docs/TROUBLESHOOTING.md

Common issues and solutions:
- Bot not responding
- Database connection issues
- Slack API errors
- Performance problems
- Deployment failures

### 7. CHANGELOG.md

Version history:
```markdown
# Changelog

## [1.0.0] - 2025-10-23

### Added
- TypeScript migration
- PostgreSQL database integration
- Railway.com deployment
- CI/CD pipeline
- Comprehensive testing
- Structured logging
- Error tracking

### Changed
- File-based storage → PostgreSQL
- JavaScript → TypeScript
- console.log → Winston logging

### Fixed
- Race conditions in file writes
- Data loss on restart
```

---

## ✅ Acceptance Criteria

- [ ] README.md enhanced with badges and quick start
- [ ] SETUP.md created with complete setup instructions
- [ ] ARCHITECTURE.md created with system overview
- [ ] DEPLOYMENT.md created with deployment guide
- [ ] API.md created with API documentation
- [ ] TROUBLESHOOTING.md created with common issues
- [ ] CHANGELOG.md created and maintained
- [ ] Code comments added to complex functions
- [ ] JSDoc comments for all public functions
- [ ] README links to all documentation
- [ ] Documentation reviewed and proofread
- [ ] Examples tested and verified

---

## 📚 Reference Documentation

- [GitHub README Best Practices](https://github.com/matiassingers/awesome-readme)
- [Documentation Best Practices](https://documentation.divio.com/)
- [Markdown Guide](https://www.markdownguide.org/)

---

## 🔗 Dependencies

**Blocks:** None

**Blocked By:** All other issues (documentation is last)

---

## 📅 Estimated Effort

**Time Estimate:** 4-5 hours

- README enhancement: 1 hour
- Setup guide: 1 hour
- Architecture docs: 1 hour
- Deployment guide: 1 hour
- API docs: 0.5 hours
- Troubleshooting: 0.5 hours
'''
    }
}

print("=" * 80)
print("Generating ALL issue markdown files...")
print("=" * 80 + "\n")

for issue_num, issue_data in issues.items():
    filename = f"issue-{issue_num:02d}.md"
    
    # Skip if already exists and we're not regenerating
    if os.path.exists(filename):
        print(f"⏭️  Skipping {filename} (already exists)")
        continue
    
    print(f"📝 Creating {filename}...")
    
    with open(filename, 'w') as f:
        f.write(f"# {issue_data['title']}\n\n")
        f.write(f"**Milestone:** {issue_data['milestone']}\n")
        f.write(f"**Labels:** {', '.join(issue_data['labels'])}\n\n")
        f.write("---\n\n")
        f.write(issue_data['body'])
    
    print(f"✅ Created {filename}\n")

print("=" * 80)
print("✅ ALL issue markdown files generated successfully!")
print("=" * 80)
print(f"\n📁 Location: {os.getcwd()}")
print(f"\n📊 Total issues: {len(issues)}")
print("\n📋 Files created:")
for i in range(1, len(issues) + 1):
    print(f"  - issue-{i:02d}.md")
