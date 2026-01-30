# Configuration Reference

This document lists supported environment variables for pp-bot. Values are read from the process
environment at startup.

## Required

- `SLACK_BOT_TOKEN` - Slack bot token (starts with `xoxb-`)
- `SLACK_APP_TOKEN` - Slack app-level token (starts with `xapp-`)
- `SLACK_SIGNING_SECRET` - Slack signing secret

## Optional

- `DATABASE_URL` - PostgreSQL connection string for persistent storage
- `LOG_LEVEL` - `error` | `warn` | `info` | `debug` (defaults to `info` in production, `debug` otherwise)
- `NODE_ENV` - `development` | `production` | `test` (defaults to `development`)
- `PORT` - Port for the Socket Mode listener (defaults to `3000`)
- `RAILWAY_PORT` - Railway-provided port; used if `PORT` is not set

## Notes

- Missing required variables will cause startup to fail with a clear error.
- When `DATABASE_URL` is set, the app runs migrations on startup.
- Socket Mode does not require public HTTP endpoints.
