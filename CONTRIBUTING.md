# Contributing to pp-bot

Keep changes focused and verify behavior before opening a pull request.

## Development Setup

Use Node.js 24. Fork [pp-bot](https://github.com/stevencarpenter/pp-bot), then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/pp-bot.git
cd pp-bot
npm ci
```

Unit tests use pg-mem and mocked Slack clients, so they do not need Slack credentials or a local database.
For manual testing, use a separate Slack app and the [quick start](README.md#quick-start).

## Checks

```bash
npm run build
npm test
npm run format
```

Tests live in `src/__tests__/`. Run one file with `npx jest src/__tests__/vote.test.ts`.
Coverage thresholds are defined in [jest.config.cjs](jest.config.cjs).
Use `npm run format:fix` to apply Prettier formatting.

## Source Reference

| Change                       | Files                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Slack handlers and commands  | [src/index.ts](src/index.ts)                                                                         |
| Vote syntax and sanitization | [src/utils/vote.ts](src/utils/vote.ts), [src/utils/sanitize.ts](src/utils/sanitize.ts)               |
| Database queries and schema  | [src/storage/database.ts](src/storage/database.ts), [src/scripts/migrate.ts](src/scripts/migrate.ts) |
| Abuse policy                 | [src/security/abuse-controls.ts](src/security/abuse-controls.ts)                                     |
| Environment validation       | [src/env.ts](src/env.ts)                                                                             |

Follow existing TypeScript patterns and Prettier settings (2 spaces, single quotes).
Use parameterized SQL. Preserve existing database data when changing the schema.
Add tests for changed behavior and update the relevant [documentation](docs/README.md).
Register new slash commands in the Slack app as well as in code.

## Pull Requests

Explain the problem, resulting behavior, and verification. Link any related issue.
Use Conventional Commit titles, such as `feat: add a command`, `fix: handle duplicate events`,
or `docs: update configuration`. Mark breaking changes with `!` and describe the migration path.

Contributions are licensed under the [MIT License](LICENSE) and follow the [Code of Conduct](CODE_OF_CONDUCT.md).
