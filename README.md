<p align="center">
  <img
    src="docs/assets/ppbot_github_1280x640.png"
    alt="pp-bot logo"
    width="1280"
    height="640"
  />
</p>

# pp-bot

This is a small Slack bot that manages a leaderboard of Slack users in an organization. Users can vote for each other
using `@user ++` or `@user --` to increment or decrement their score on the leaderboard. The bot also keeps a separate
"things" leaderboard so channels can celebrate concepts such as `@broncos ++` for a big win even when no Slack user
with that handle exists.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/pp-bot)

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running the Bot](#running-the-bot)
- [Running Tests](#running-tests)
- [Database & Storage](#database--storage)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Support](#support)
- [FAQ](#faq)
- [Limitations](#limitations)
- [Security Defaults](#security-defaults)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Upvote/Downvote (Users)**: Mention a user with `@username ++` or `@username --` to change their score
- **Celebrate Things**: Vote for non-user targets such as teams, releases, or ideas with `@thing ++` or `@thing --`
- **Flexible Format**: Add any text or emojis after the `++` or `--` (e.g., `@user ++ great job! 🎉`)
- **Leaderboard**: View the top scorers with the `/leaderboard` command
- **Personal Score**: Check your own score with the `/score` command
- **Self-Vote Prevention**: Users cannot vote for themselves
- **Replay Protection**: Duplicate Slack events do not double-apply votes
- **Examples**: See `docs/EXAMPLES.md` for common message patterns
- **Help**: Use `/help` for in-product usage tips

## Quick Start

1. Create and install a Slack app (Socket Mode enabled).
2. Export required environment variables.
3. Install dependencies and run:

```bash
npm install
export SLACK_BOT_TOKEN=your-bot-token
export SLACK_APP_TOKEN=your-app-token
export SLACK_SIGNING_SECRET=your-signing-secret
export DATABASE_URL=postgres://user:pass@localhost:5432/ppbot
npm start
```

If you prefer, set the variables in a `.env` file and run `npm start`.

## Usage

### Voting

To increase someone's score:

```bash
@john ++ for the great presentation!
@jane ++ 🎉
```

To decrease someone's score:

```bash
@bob --
@alice -- not cool
```

You can vote for multiple people in one message:

```bash
@john ++ and @jane ++ for the amazing work!
```

You can also celebrate non-user concepts:

```bash
@broncos ++ for the comeback win!
@release -- needs more QA time
```

### Commands

- `/leaderboard` - Display the top 10 users and top 10 things on their respective leaderboards
- `/score` - Check your current score
- `/help` - Show usage tips and examples

## Setup

### Quick Setup (Local)

If you already have a Slack app:

```bash
cp .env.example .env
# fill in SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET, DATABASE_URL
npm install
npm start
```

### Prerequisites

- Node.js (v18 or higher recommended)
- A Slack workspace with admin access to create apps
- (Optional) PostgreSQL if you want persistent storage locally; tests use an in-memory pg-mem database.

### Installation

1. Clone this repository:

```bash
git clone https://github.com/stevencarpenter/pp-bot.git
cd pp-bot
```

2. Install dependencies:

```bash
npm install
```

3. Create a Slack App:
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name your app (e.g., "PP Bot") and select your workspace

4. Configure your Slack App:
   - **OAuth & Permissions**: Add these Bot Token Scopes:
     - `app_mentions:read`
     - `chat:write`
     - `commands`
     - `channels:history` _(only if using in public channels)_
     - `groups:history` _(only if using in private channels)_
     - `im:history` _(only if using in DMs)_
     - `mpim:history` _(only if using in multi-party DMs)_
   - Remove unused scopes to keep least privilege.
   - Avoid adding `channels:read` / `groups:read` unless your deployment explicitly needs them.
   - **Socket Mode**: Enable Socket Mode and create an App-Level Token with `connections:write` scope
   - **Slash Commands**: Create three commands:
     - `/leaderboard` - Description: "Show the leaderboard"
     - `/score` - Description: "Show your score"
     - `/help` - Description: "Show help"
   - **Event Subscriptions**: Enable only the message events you need:
     - `message.channels` _(public channels only)_
     - `message.groups` _(private channels only)_
     - `message.im` _(DMs only)_
     - `message.mpim` _(group DMs only)_

5. Install the app to your workspace (OAuth & Permissions page)

6. Create a `.env` file with your tokens (copy from `.env.example`):

```bash
cp .env.example .env
```

7. Edit `.env` and add your tokens:
   - `SLACK_BOT_TOKEN`: Bot token (starts with `xoxb-`)
   - `SLACK_APP_TOKEN`: App-level token (starts with `xapp-`)
   - `SLACK_SIGNING_SECRET`: App signing secret
   - (Optional) `DATABASE_URL`: e.g. `postgres://user:pass@localhost:5432/ppbot`

## Configuration

Required:

- `SLACK_BOT_TOKEN` - Slack bot token (starts with `xoxb-`)
- `SLACK_APP_TOKEN` - Slack app token (starts with `xapp-`)
- `SLACK_SIGNING_SECRET` - Slack signing secret

Optional:

- `DATABASE_URL` - PostgreSQL connection string for persistent storage
- `LOG_LEVEL` - `error` | `warn` | `info` | `debug` (defaults to `info` in production, `debug` otherwise)
- `NODE_ENV` - `development` | `production` | `test` (defaults to `development`)
- `PORT` / `RAILWAY_PORT` - Port to bind the Slack Socket Mode listener (defaults to `3000`)
- `DB_SSL_MODE` - `disable` | `require` | `verify-full` (defaults to `verify-full` in production)
- `DB_SSL_CA_PEM_B64` - Base64-encoded CA bundle for PostgreSQL TLS validation
- `ALLOW_INSECURE_DB_SSL` - must be `true` to allow insecure DB SSL modes in production
- `ABUSE_ENFORCEMENT_MODE` - `monitor` | `enforce` (defaults to `enforce`)
- `VOTE_MAX_TARGETS_PER_MESSAGE`, `VOTE_RATE_USER_PER_MIN`, `VOTE_RATE_CHANNEL_PER_MIN`,
  `VOTE_PAIR_COOLDOWN_SECONDS`, `VOTE_DAILY_DOWNVOTE_LIMIT`, `VOTE_ALLOWED_CHANNEL_IDS`
- `MAINTENANCE_ENABLED`, `MAINTENANCE_DEDUPE_RETENTION_DAYS`, `MAINTENANCE_VOTE_HISTORY_RETENTION_DAYS`

Environment variables are validated on startup; missing or invalid values will fail fast with a clear error.
For production deploys, set `NODE_ENV=production` (or keep `LOG_LEVEL=info`) to avoid noisy logs.
For a full reference, see `docs/CONFIGURATION.md`.

## Running the Bot

```bash
npm start
```

If `DATABASE_URL` is not provided, DB-backed features will warn and score persistence won't work; tests always use an
in-memory database.

## Running Tests

```bash
npm test
```

## Database & Storage

The current implementation uses PostgreSQL (or pg-mem in tests) with three tables:

- `leaderboard(user_id PK, score, created_at, updated_at)`
- `thing_leaderboard(thing_name PK, score, created_at, updated_at)`
- `vote_history(id PK, voter_id, voted_user_id, vote_type, channel_id?, message_ts?, created_at)`
- `message_dedupe(id PK, dedupe_key UNIQUE, channel_id?, message_ts?, created_at)` for replay protection

Migrations: `npm run migrate` will create the tables on a real database.
The application also runs migrations on startup when `DATABASE_URL` is set.
For programmatic use, you can pass `migrate(pool, { maxAttempts, delayMs })` to tune retry behavior.

## How It Works

The bot listens to messages. When it detects voting syntax it:

1. Parses the message (`parseVote`) while sanitizing any non-user vote targets
2. Updates the appropriate leaderboard (`updateUserScore` or `updateThingScore`) using an UPSERT
3. Records vote history for user votes (`recordVote`)
4. Emits response messages for each action

The `/leaderboard` command surfaces both leaderboards, and `/score` reports the calling user's score.

## Architecture

```
Slack (Socket Mode)
        |
        v
   Slack Bolt App
        |
        v
 PostgreSQL (leaderboard, thing_leaderboard, vote_history)
```

## Support

Please open a GitHub issue for help or feature requests.

## FAQ

**Does this require a public HTTP endpoint?**  
No. The bot uses Slack Socket Mode, so no inbound HTTP endpoint is required.

**Why do I see "DATABASE_URL not set"?**  
You can run without persistence, but leaderboards reset on restart. Set `DATABASE_URL` for PostgreSQL storage.

**Why are some votes ignored?**  
Duplicate events are deduplicated to prevent double-counting. Repeated targets in the same message are ignored.

## Limitations

- Socket Mode is required (no public HTTP endpoints).
- Votes are deduplicated per message; repeated targets in the same message are ignored.

## Security Defaults

- Production defaults to verified PostgreSQL TLS (`DB_SSL_MODE=verify-full`).
- Insecure DB SSL modes require explicit override (`ALLOW_INSECURE_DB_SSL=true`) in production.
- Replay protection prioritizes Slack `event_id` and falls back to `channel:ts`.
- Abuse controls are on by default (`ABUSE_ENFORCEMENT_MODE=enforce`) with rate limits and cooldowns.
- Maintenance cleanup runs at startup and every 12 hours to limit table growth.
- Slack tokens and PostgreSQL URL credentials are redacted in logs.

See `docs/CONFIGURATION.md`, `docs/SECURITY-HARDENING.md`, and `docs/SECURITY-OPERATIONS.md` for details.

## Development Notes

- Tests use an ephemeral pg-mem backed pool substitute to avoid dangling sockets.
- Integration tests build schema via a shared `ensureSchema` helper.
- Coverage thresholds enforce a baseline to catch regressions early.
- Vote parsing sanitizes user and thing targets with the well-maintained [
  `validator`](https://github.com/validatorjs/validator.js) library before interacting with the database.

## Security

Please report vulnerabilities via GitHub Security Advisories. Do not email maintainers.
See `SECURITY.md` for details.

## Contributing

See `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.

## License

MIT
