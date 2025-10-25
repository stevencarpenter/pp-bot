# Comprehensive Evaluation and Public Release Plan

## Project Overview

- **Purpose**: Slack bot that maintains a karma-style leaderboard via mentions and two slash commands.
- **Architecture**: Built with Slack Bolt (Socket Mode), PostgreSQL persistence, TypeScript runtime, Jest-based tests, Dockerfile/docker-compose for containerisation, and a Railway deployment configuration.
- **Current Documentation**: Rich set of guides including `README.md`, `DEPLOYMENT.md`, `EXAMPLES.md`, `CONTRIBUTING.md`, `MIGRATION.md`, `ROADMAP.md`, and `TECH_DECISION.md`.
- **Security Posture**: All external integration credentials (Slack tokens, database URL) are supplied through environment variables (`src/index.ts`, `src/storage/pool.ts`). No secrets are committed. Runtime validates Slack variables before boot. Database access flows through `getPool()` with `DATABASE_URL` configuration and optional Railway port mapping.

## Verification of Environment Variable Usage

| Integration       | Location                                         | Notes                                                                                                            |
| ----------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Slack credentials | `src/index.ts`                                   | Validates `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `SLACK_APP_TOKEN`; supplied to Bolt Socket Mode client. |
| PostgreSQL        | `src/storage/pool.ts`, `src/storage/database.ts` | Pool initialised from `DATABASE_URL`; helper functions (`getTopUsers`, `recordVote`, etc.) rely on the pool.     |
| Runtime port      | `src/index.ts`                                   | Uses `PORT` or `RAILWAY_PORT` for compatibility with Railway and generic containers.                             |

Conclusion: Environment variable handling meets expectations—no hard-coded secrets or credentials exist in the repository.

## Release Milestones and Issues

The following milestones organise the remaining work needed for a polished public launch. Each issue contains acceptance criteria and recommended labels (e.g., `type:bug`, `type:enhancement`, `type:docs`, `type:infra`, `security`). Ordering implies dependency priority within a milestone.

### Milestone A – Public Release Readiness (Core Hygiene)

1. **Audit and lock down environment variables**
   - Ensure `getPool()` reads `DATABASE_URL`, configures SSL when required, and warns in production if missing.
   - Introduce runtime env validation (e.g., `zod`, `envalid`) for `LOG_LEVEL`, `NODE_ENV`, Slack tokens, and `DATABASE_URL`.
   - _Acceptance_: Startup fails clearly when required env vars are absent; documentation reflects the canonical list.
2. **Database schema and migrations hardening**
   - Supply migration files for `leaderboard` and `vote_history`; include timestamps and UPSERT compatibility.
   - Add indexes on `leaderboard.user_id` and `vote_history` (`voted_user_id`, `created_at DESC`, optional `channel_id`, `message_ts`).
   - Document `npm run migrate` in `DEPLOYMENT.md`.
   - _Acceptance_: Fresh database bootstrap succeeds; indexes support query patterns.
3. **Idempotency and duplicate-delivery handling**
   - Protect against double-processing Slack events/messages (Socket Mode replay protection).
   - Add DB unique constraint or app-level guard on `recordVote` for duplicates.
   - _Acceptance_: Replayed messages do not double-apply score changes; automated tests capture behaviour.
4. **Error handling and logging consistency**
   - Centralise logging (e.g., dedicated logger module with Pino) and avoid `console.log` in production code paths.
   - Normalise Slack responses to prevent leaking internals.
   - _Acceptance_: Logs are structured and respect `LOG_LEVEL`; handlers emit user-friendly errors.
5. **`parseVote` edge cases and UX polish**
   - Handle multiple mentions, punctuation, repeated targets, and ensure single vote per target per message if desired.
   - Document and test all scenarios.
   - _Acceptance_: Expanded unit tests cover tricky inputs; README details behaviour.
6. **Security policy and community standards**
   - Add `SECURITY.md` with reporting instructions.
   - Add `CODE_OF_CONDUCT.md` (Contributor Covenant recommended) and link from README.
   - _Acceptance_: Policies exist and are discoverable.
7. **Repository metadata and templates**
   - Provide `.github/ISSUE_TEMPLATE/*`, `PULL_REQUEST_TEMPLATE.md`, and `CODEOWNERS`.
   - _Acceptance_: Templates function on GitHub; CODEOWNERS enforces review ownership.

### Milestone B – CI/CD and Quality Gates

8. **Node.js CI workflow**
   - GitHub Actions pipeline running lint, type-check, test (with coverage threshold), and build on push/PR for Node 18/20.
   - Cache dependencies and upload coverage artifacts.
   - _Acceptance_: Workflow required on `main`; failing checks block merges.
9. **Dependency and security automation**
   - Enable Dependabot (npm + GitHub Actions) and CodeQL scanning.
   - _Acceptance_: Automated PRs and CodeQL baseline in place.
10. **Container build and vulnerability scan**

- CI job building Docker image; integrate Trivy (or similar) for scans.
- _Acceptance_: Reproducible image build with surfaced vulnerability report.

11. **Conventional commits and release notes**

- Enforce commit conventions (commitlint via Husky) and automate releases via `release-please` or `semantic-release`.
- _Acceptance_: Tags produce changelog entries automatically; contributing guide updated.

### Milestone C – Documentation and Onboarding Excellence

12. **README launch upgrade**

- Add quick start, table of contents, architecture diagram, FAQ, limitations, support channels, and a Railway deploy badge.
- _Acceptance_: New user can deploy within 15 minutes using README alone.

13. **Slack App setup deep guide**

- Expand `DEPLOYMENT.md` with detailed scope listings, Socket Mode requirements, slash command setup, and visuals.
- _Acceptance_: Slack configuration steps are unambiguous.

14. **Examples expansion and help command**

- Extend `EXAMPLES.md` with DM/channel/thread scenarios; implement `/help` (or `/ppbot`) command.
- _Acceptance_: Users can discover features in-product; docs match behaviour.

15. **Configuration reference**

- Create `CONFIGURATION.md` enumerating every environment variable, default, and effect.
- _Acceptance_: Linked from README.

### Milestone D – One-Click Deploy (Railway Baseline)

16. **Finalize `railway.json` template**

- Define app service, managed Postgres plugin, required variables, and post-deploy `npm run migrate` hook.
- _Acceptance_: Railway template provisions app + DB automatically.

17. **“Deploy on Railway” badge**

- Insert badge linking to Railway template in README.
- _Acceptance_: Badge leads to provisioning flow with prompts for Slack secrets.

18. **Health and readiness documentation**

- Optional `/health` endpoint or documentation clarifying Socket Mode expectations.
- _Acceptance_: Railway indicates healthy service; logs show successful Slack connection.

### Milestone E – Multi-Platform Deployment Options (Optional but Valuable)

19. **Render blueprint**

- Add `render.yaml` (app + managed Postgres) with migration hook and env variables.
- _Acceptance_: “Deploy to Render” works end-to-end.

20. **Fly.io app definition**

- Provide `fly.toml` and instructions for migrations & secrets.
- _Acceptance_: `fly deploy` launches bot with configured Postgres.

21. **Docker Compose quickstart enhancement**

- Wire local Postgres via `DATABASE_URL`, add healthchecks and migration step.
- _Acceptance_: `docker compose up` yields a ready bot locally.

### Milestone F – Database Integrity, Performance, and Retention

22. **Data retention and pruning**

- Configurable retention for `vote_history` (e.g., 6–12 months) with scheduled cleanup.
- _Acceptance_: Optional job documented and test-covered.

23. **Statement timeouts and pool tuning**

- Configure PostgreSQL `statement_timeout`, keepalive, and pool size defaults appropriate for small instances.
- _Acceptance_: Prevents runaway queries; documented defaults.

24. **Backfill and repair scripts**

- Provide script to recompute leaderboard from `vote_history` for consistency checks.
- _Acceptance_: Script documented and validated on sample data.

### Milestone G – Observability and Operations

25. **Structured logging and correlation IDs**

- Include contextual metadata (user, channel, timestamp) with redacted tokens.
- _Acceptance_: Logs support targeted triage of Slack events.

26. **Error reporting integration (optional)**

- Integrate Sentry (or equivalent) via DSN environment variable.
- _Acceptance_: Critical errors captured when enabled.

27. **Metrics instrumentation (optional)**

- Count processed messages, recorded votes, and errors (export via logs or `/metrics`).
- _Acceptance_: Operators can gauge activity levels.

### Milestone H – UX Polish and Guardrails

28. **Channel and user guardrails**

- Optional configuration to restrict or exclude channels/users.
- _Acceptance_: Behaviour respects configuration and provides user feedback.

29. **Ephemeral and threaded responses**

- Default to thread replies and ephemeral errors to reduce channel noise.
- _Acceptance_: Improved UX in busy channels.

30. **Internationalisation groundwork**

- Centralise user-facing strings and prepare for localisation.
- _Acceptance_: English default maintained; i18n strategy documented.

## Exploratory RFC: One-Click Deploy for PP Bot

**Title**: RFC – One-Click Deploy for PP Bot (Railway baseline, optional multi-platform support)

1. **Background & Goals**
   - Deliver a deployment experience where users click a button, supply Slack credentials, and receive a running bot with PostgreSQL.
   - Socket Mode removes public ingress requirements; focus on provisioning Postgres and running migrations.

2. **Platform Evaluation**
   - **Railway**: Native templates via `railway.json`, managed Postgres plugin, excellent fit.
   - **Render**: Blueprint YAML with managed Postgres; Socket Mode compatible.
   - **Fly.io**: `fly.toml` plus secrets; optional Fly Postgres.
   - **AWS & generic VPS**: More complex; deprioritised for initial release.

3. **Railway Baseline Proposal**
   - `railway.json` defines app + Postgres services, required vars (`SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `LOG_LEVEL`, `NODE_ENV`), automatic `DATABASE_URL` injection, and post-deploy `npm run migrate`.
   - User flow: Click badge → create Railway project → provide secrets → build runs → migrations execute → bot connects via Socket Mode.
   - Security: Encourage token rotation and least privilege scopes as documented.

4. **Implementation Notes**
   - Dockerfile must produce production build (`npm ci`, `npm run build`, `node dist/index.js`).
   - Migrations must be idempotent and safe on re-run.
   - Optional `/health` endpoint for platform health checks.
   - Default logging at `info`, with `debug` opt-in.

5. **Alternative Platform Adaptations**
   - Render blueprint with migration hook and env definitions.
   - Fly.io config plus instructions for secrets and migrations.
   - Docker Compose quickstart for local or VPS environments.

6. **Open Questions**
   - Best strategy for deduplication of Slack events (DB constraint vs. in-memory cache).
   - Slash command handling under Socket Mode (currently supported; emphasise in docs).
   - Multi-tenant support (out of scope for initial release).

7. **Documentation Rollout**
   - README: Quickstart + deploy badge + architecture snapshot.
   - DEPLOYMENT.md: Platform-specific guides with screenshots or references.
   - CONFIGURATION.md: Exhaustive env var reference.
   - SECURITY.md / CODE_OF_CONDUCT.md: Policies and triage.
   - CONTRIBUTING.md: Reference commit conventions, CI expectations, and migration workflow.

## Next Steps

- Prioritise Milestone A items to stabilise the core experience.
- Follow with Milestone B to establish automation and release hygiene.
- Progressively deliver documentation and deployment enhancements to support a public launch.
