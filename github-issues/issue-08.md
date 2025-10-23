# Testing Infrastructure

**Milestone:** Phase 2: Database & Features
**Labels:** testing, quality

---

## 📋 Context

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
    '^.+\.ts$': 'ts-jest',
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
