# CI/CD with GitHub Actions

**Milestone:** Phase 3: Deployment & Production
**Labels:** ci/cd, automation, github-actions

---

## 📋 Context

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
