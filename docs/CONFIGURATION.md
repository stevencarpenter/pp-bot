# Configuration Reference

This document lists supported environment variables for pp-bot. Values are read from the process
environment at startup.

## Required

- `SLACK_BOT_TOKEN` - Slack bot token (must start with `xoxb-`)
- `SLACK_APP_TOKEN` - Slack app-level token (must start with `xapp-`)
- `SLACK_SIGNING_SECRET` - Slack signing secret

## Runtime Basics

- `DATABASE_URL` - PostgreSQL connection string for persistent storage
- `LOG_LEVEL` - `error` | `warn` | `info` | `debug` (defaults to `info` in production, `debug` otherwise)
- `NODE_ENV` - `development` | `production` | `test` (defaults to `development`)
- `PORT` - Port for the Socket Mode listener (defaults to `3000`)
- `RAILWAY_PORT` - Railway-provided port; used if `PORT` is not set

## Database TLS Controls

- `DB_SSL_MODE` - `disable` | `require` | `verify-full`
  - Default: `verify-full` in production, `disable` otherwise
  - `verify-full` is recommended for production
- `DB_SSL_CA_PEM_B64` - Base64-encoded CA certificate chain (optional)
- `ALLOW_INSECURE_DB_SSL` - `true` | `false` (default: `false`)
  - In production, this must be `true` to allow `DB_SSL_MODE=disable` or `DB_SSL_MODE=require`

## Abuse Controls

- `ABUSE_ENFORCEMENT_MODE` - `monitor` | `enforce` (default: `enforce`)
  - `enforce`: violations are blocked.
  - `monitor`: violations are logged as `wouldBlock` but requests still proceed.
- `VOTE_MAX_TARGETS_PER_MESSAGE` - Max unique targets in one message (default: `5`)
- `VOTE_RATE_USER_PER_MIN` - Max accepted votes per user per minute (default: `12`)
- `VOTE_RATE_CHANNEL_PER_MIN` - Max accepted votes per channel per minute (default: `60`)
- `VOTE_PAIR_COOLDOWN_SECONDS` - Cooldown before same voter can vote same target again (default: `300`)
- `VOTE_DAILY_DOWNVOTE_LIMIT` - Max accepted downvotes per user per UTC day (default: `15`)
- `VOTE_ALLOWED_CHANNEL_IDS` - Optional CSV allowlist of channel IDs (unset means all channels)

## Maintenance / Retention

- `MAINTENANCE_ENABLED` - `true` | `false` (default: `true`)
- `MAINTENANCE_DEDUPE_RETENTION_DAYS` - Delete `message_dedupe` rows older than this many days (default: `14`)
- `MAINTENANCE_VOTE_HISTORY_RETENTION_DAYS` - Delete `vote_history` rows older than this many days (default: `365`)

## Notes

- Missing required variables will cause startup to fail with a clear error.
- Placeholder Slack tokens are rejected.
- When `DATABASE_URL` is set, the app runs migrations on startup.
- Socket Mode does not require public HTTP endpoints.
- Maintenance cleanup runs on startup and then every 12 hours.
