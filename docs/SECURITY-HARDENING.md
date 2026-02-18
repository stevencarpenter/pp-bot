# Security Hardening Baseline

Last reviewed: 2026-02-10

This checklist defines a secure production baseline for pp-bot.

## Runtime Baseline

- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=info` (or stricter)
- [ ] `DB_SSL_MODE=verify-full`
- [ ] `ALLOW_INSECURE_DB_SSL=false`
- [ ] Slack tokens are real values (not placeholders)
- [ ] `DATABASE_URL` is private and rotated when needed

## Abuse Controls Baseline

- [ ] `ABUSE_ENFORCEMENT_MODE=enforce`
- [ ] `VOTE_MAX_TARGETS_PER_MESSAGE=5` (or lower)
- [ ] `VOTE_RATE_USER_PER_MIN=12` (or lower)
- [ ] `VOTE_RATE_CHANNEL_PER_MIN=60` (or lower)
- [ ] `VOTE_PAIR_COOLDOWN_SECONDS=300` (or higher)
- [ ] `VOTE_DAILY_DOWNVOTE_LIMIT=15` (or lower)
- [ ] Optional: set `VOTE_ALLOWED_CHANNEL_IDS` to reduce blast radius

## Data Hygiene Baseline

- [ ] `MAINTENANCE_ENABLED=true`
- [ ] `MAINTENANCE_DEDUPE_RETENTION_DAYS=14`
- [ ] `MAINTENANCE_VOTE_HISTORY_RETENTION_DAYS=365`
- [ ] Verify maintenance job logs at startup and during scheduled runs

## Repository / CI Baseline

- [ ] CodeQL enabled (`.github/workflows/codeql.yml`)
- [ ] Dependency audit enabled (`.github/workflows/ci.yml`)
- [ ] Secret scanning workflow enabled (`.github/workflows/secret-scan.yml`)
- [ ] Dependabot enabled (`.github/dependabot.yml`)
- [ ] GitHub secret scanning + push protection enabled in repo settings

## Slack App Scope Baseline

Use least privilege and only request scopes/events needed for your workspace.

Recommended baseline for this bot:

- Bot scopes:
  - `app_mentions:read`
  - `chat:write`
  - `commands`
  - `channels:history` (if used in public channels)
  - `groups:history` (if used in private channels)
  - `im:history` (if used in DMs)
  - `mpim:history` (if used in multi-party DMs)
- App token scope:
  - `connections:write`
- Event subscriptions:
  - `message.channels` (if used)
  - `message.groups` (if used)
  - `message.im` (if used)
  - `message.mpim` (if used)

Disable any scope/event you do not actively need.
