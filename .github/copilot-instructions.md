# GitHub Copilot Instructions for pp-bot

## Project Overview

pp-bot is a Slack bot that manages a leaderboard of users with `++` and `--` voting. The bot is built with TypeScript, uses the Slack Bolt SDK, and stores data in PostgreSQL.

## Technology Stack

- **Language:** TypeScript (Node.js)
- **Framework:** Slack Bolt SDK (@slack/bolt)
- **Database:** PostgreSQL with pg-mem for testing
- **Testing:** Jest
- **Build:** TypeScript Compiler (tsc)
- **Linting:** ESLint with TypeScript support
- **Formatting:** Prettier
- **Deployment:** Railway.com

## Code Style and Standards

### TypeScript Guidelines

- Use TypeScript strict mode (already configured in tsconfig.json)
- Always define explicit types for function parameters and return values
- Use type annotations for variables when types aren't obvious
- Prefer interfaces for object shapes, types for unions/intersections
- Use `readonly` where appropriate for immutability
- Leverage TypeScript's type narrowing with proper type guards

### General Coding Standards

- Use descriptive variable and function names
- Keep functions small and focused on a single responsibility
- Prefer functional programming patterns where appropriate
- Use async/await instead of raw promises
- Always handle errors properly with try/catch blocks
- Use const by default, let only when reassignment is needed, never var

### Import Organization

- Follow the eslint import/order rule: alphabetical with newlines between groups
- Group imports: external packages, then internal modules
- Use absolute paths from src/ directory when available

### Code Comments

- Add JSDoc comments for exported functions and complex logic
- Explain "why" not "what" in comments
- Keep comments up to date with code changes
- Use TODO comments sparingly and with context

## Testing Requirements

### Test Framework

- Use Jest for all tests
- Place tests in `src/__tests__/` directory
- Name test files with `.test.ts` suffix
- Group related tests in describe blocks

### Test Coverage

- Maintain minimum coverage thresholds as defined in jest.config.cjs
- Write unit tests for all new functions
- Include edge cases and error scenarios
- Use pg-mem for database tests (never real database in tests)

### Test Structure

- Follow Arrange-Act-Assert pattern
- Use descriptive test names that explain the scenario and expected outcome
- Mock external dependencies (Slack API, etc.)
- Clean up resources in afterEach/afterAll hooks

### Example Test Pattern

```typescript
describe('functionName', () => {
  it('should handle expected input correctly', async () => {
    // Arrange
    const input = 'test';

    // Act
    const result = await functionName(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

## Database Guidelines

### Schema

- Two main tables: `leaderboard` and `vote_history`
- Use database transactions for operations that modify multiple tables
- Never expose raw SQL errors to users

### Database Access

- Use the pool from `src/storage/pool.ts`
- All database operations should be in `src/storage/database.ts`
- Use parameterized queries to prevent SQL injection
- Handle connection errors gracefully

### Testing with Database

- Use pg-mem for all database tests (in-memory PostgreSQL)
- Create schema using the helper in `src/__tests__/helpers/schema.ts`
- Never connect to real database in tests
- Clean up test data properly

## Slack Bot Development

### Message Handling

- Parse votes using regex in `src/utils/vote.ts`
- Vote format: `@user ++` or `@user --`
- Support multiple votes in one message
- Prevent self-voting

### Slash Commands

- `/leaderboard` - Display top 10 users
- `/score` - Show user's current score
- Always acknowledge commands immediately with `ack()`

### Error Handling

- Catch all errors in Slack handlers
- Log errors using the logger from `src/logger.ts`
- Send user-friendly error messages to Slack
- Never expose stack traces or sensitive info to users

## File Organization

```
src/
├── index.ts              # Main entry point, bot initialization
├── db.ts                 # Database connection setup
├── logger.ts             # Logging utilities
├── types.ts              # TypeScript type definitions
├── utils/
│   ├── vote.ts          # Vote parsing logic
│   └── leaderboard.ts   # Leaderboard utilities
├── storage/
│   ├── pool.ts          # Database connection pool
│   └── database.ts      # Database operations
├── scripts/
│   └── migrate.ts       # Database migrations
└── __tests__/           # All test files
```

## Development Workflow

### Before Making Changes

1. Run tests: `npm test`
2. Check linting: `npm run lint`
3. Verify formatting: `npm run format`
4. Build the project: `npm run build`

### Making Changes

1. Create focused, small changes
2. Write tests first (TDD approach when feasible)
3. Update documentation if adding features
4. Ensure all tests pass before committing
5. Run linter and fix any issues

### Common Commands

- `npm start` - Build and run the bot
- `npm test` - Run all tests
- `npm run lint` - Check for linting errors
- `npm run lint:fix` - Auto-fix linting errors
- `npm run format` - Check formatting
- `npm run format:fix` - Auto-fix formatting
- `npm run build` - Compile TypeScript
- `npm run migrate` - Run database migrations

## Error Handling Patterns

### Slack Event Handlers

```typescript
app.message(pattern, async ({ message, say }) => {
  try {
    // Handler logic
  } catch (error) {
    logger.error('Error handling message', { error });
    await say('Something went wrong. Please try again.');
  }
});
```

### Database Operations

```typescript
async function databaseOperation() {
  try {
    const result = await pool.query('SELECT ...');
    return result.rows;
  } catch (error) {
    logger.error('Database error', { error });
    throw new Error('Database operation failed');
  }
}
```

## Environment Variables

- `SLACK_BOT_TOKEN` - Bot User OAuth Token (required)
- `SLACK_APP_TOKEN` - App-Level Token for Socket Mode (required)
- `SLACK_SIGNING_SECRET` - Signing secret for request verification (required)
- `DATABASE_URL` - PostgreSQL connection string (optional, required for production)

## Documentation Standards

### README Updates

- Update README.md when adding new features or commands
- Keep setup instructions current
- Add examples for new functionality

### Code Documentation

- Document public APIs with JSDoc
- Keep CONTRIBUTING.md updated with development practices
- Add or update examples in README.md when adding new voting patterns or commands

### Migration Guide

- Document breaking changes in the README.md (or create MIGRATION.md if migration instructions grow)
- Provide upgrade path for existing deployments
- Include database schema changes

## Architecture Principles

### Separation of Concerns

- Keep Slack-specific code in index.ts
- Business logic in utils/
- Data access in storage/
- Database schema in scripts/migrate.ts

### Error Boundaries

- Catch errors at appropriate levels
- Log all errors with context
- Provide meaningful error messages to users

### Testability

- Write testable code with clear inputs and outputs
- Avoid tight coupling to external services
- Use dependency injection where appropriate
- Mock external dependencies in tests

## Security Considerations

- Never commit secrets or tokens to git
- Use environment variables for sensitive data
- Validate all user inputs
- Use parameterized SQL queries
- Handle rate limiting appropriately

## Performance Guidelines

- Use database connection pooling (already configured)
- Avoid N+1 queries
- Use appropriate database indexes (defined in migrations)
- Keep Slack API calls efficient
- Respond to Slack commands within 3 seconds

## Deployment

- Deploy to Railway.com (see the README for deployment instructions)
- Run migrations before deploying new schema changes
- Test in a staging environment when possible
- Monitor logs after deployment

## Troubleshooting Common Issues

### Test Failures

- Check if pg-mem is properly initialized
- Ensure schema is created before running queries
- Verify mocks are set up correctly

### Database Connection Issues

- Verify DATABASE_URL is correctly formatted
- Check PostgreSQL is running and accessible
- Review connection pool settings

### Slack API Issues

- Verify tokens are correct and not expired
- Check Socket Mode is enabled
- Ensure bot has proper scopes

## Additional Resources

- [Slack Bolt SDK Documentation](https://slack.dev/bolt-js/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## When in Doubt

1. Look at existing code patterns in the repository
2. Consult CONTRIBUTING.md for development practices
3. Check TECH_DECISION.md for architectural decisions
4. Run tests frequently to catch issues early
5. Keep changes minimal and focused
