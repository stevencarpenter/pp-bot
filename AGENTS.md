# AGENTS.md

This file provides guidance to Codex (claude.ai/code) when working with code in this repository.

## What This Is

A Slack bot (TypeScript + Slack Bolt SDK) that manages `++`/`--` voting leaderboards for users and "things" (non-user targets like teams or concepts). Data lives in PostgreSQL; tests use pg-mem (in-memory). Deployed on Railway via Socket Mode (no public HTTP endpoint needed).

## Commands

```bash
# Install
npm install

# Build
npm run build

# Build + run
npm start

# Run all tests (with coverage)
npm test

# Run a single test file
npx jest src/__tests__/vote.test.ts

# Run tests matching a pattern
npx jest --testPathPattern="storage"

# Format check / fix
npm run format
npm run format:fix

# Database migrations (requires DATABASE_URL)
npm run migrate

# Integration tests (spins up Docker Postgres on port 5433)
npm run test:integration
```

Note: `npm run lint` is a no-op — linting is disabled in this project.

## Architecture

```
Slack (Socket Mode) → Slack Bolt App (src/index.ts) → PostgreSQL
```

### Key Source Layout

- **`src/index.ts`** — App entry point. `createApp()` wires up the message handler and slash commands (`/leaderboard`, `/score`, `/help`). `start()` handles DB readiness, migrations, and maintenance scheduling.
- **`src/utils/vote.ts`** — `parseVote()` regex engine that extracts user/thing votes from message text.
- **`src/utils/dedupe.ts`** — Deduplication key resolution (prefers Slack `event_id`, falls back to `channel:ts`).
- **`src/utils/sanitize.ts`** — Input sanitization for non-user vote targets using the `validator` library.
- **`src/storage/database.ts`** — All SQL operations: score UPSERT, vote recording, leaderboard queries, dedupe tracking.
- **`src/storage/pool.ts`** — Singleton connection pool (`getPool()`).
- **`src/storage/maintenance.ts`** — Scheduled cleanup of old dedupe and vote_history rows.
- **`src/security/abuse-controls.ts`** — Rate limiting, cooldowns, channel allowlists. Configurable via env vars.
- **`src/security/db-ssl.ts`** — TLS policy enforcement for production DB connections.
- **`src/env.ts`** — Startup env validation. Fails fast on missing/invalid config.
- **`src/logger.ts`** — Structured logger with credential redaction.
- **`src/scripts/migrate.ts`** — Creates tables: `leaderboard`, `thing_leaderboard`, `vote_history`, `message_dedupe`.

### Message Processing Flow

1. Message arrives → bot/subtype check → `parseVote()` extracts votes
2. Dedupe key resolved → `recordMessageIfNewByKey()` prevents replay
3. Abuse controls evaluated (message-level, then per-vote)
4. For each unique target: user votes go through `recordVoteAndUpdateUserScore()` (atomic vote+UPSERT), thing votes through `updateThingScore()`
5. On error before any persistent write, the dedupe key is released so the message can be retried

### Database Schema

Four tables: `leaderboard` (user scores), `thing_leaderboard` (thing scores), `vote_history` (audit trail with unique constraint on voter+target+channel+ts), `message_dedupe` (replay protection).

## Testing

- All tests in `src/__tests__/`, named `*.test.ts`
- Tests use `pg-mem` — no real database needed for unit tests
- Schema helper at `src/__tests__/helpers/schema.ts` (`ensureSchema`)
- Coverage thresholds: 70% statements/lines, 55% branches, 80% functions
- Jest config in `jest.config.cjs` with custom setup/teardown files

## CI

GitHub Actions (`.github/workflows/ci.yml`) builds and runs tests with coverage on Node.js 24 and 25. The dependency scan runs `npm audit --omit=dev`.

## Conventions

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`
- 2-space indent, single quotes, Prettier for formatting
- TypeScript strict mode, target ES2024
- Async/await everywhere, no raw promises
- Parameterized SQL queries only (no string interpolation)
