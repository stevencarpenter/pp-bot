# Migrate to TypeScript

**Milestone:** Phase 1: Foundation
**Labels:** enhancement, typescript, refactoring

---

## 📋 Context

The pp-bot is currently implemented in JavaScript. To improve type safety, developer experience, and maintainability, we need to migrate the codebase to TypeScript. This will help catch errors at compile-time and make the codebase more robust for production deployment.

**Current State:**
- JavaScript implementation (`index.js`, `index.test.js`)
- No type definitions
- No build step
- Runtime type errors possible
- 479 npm dependencies (some with TypeScript types already)

**Target State:**
- Full TypeScript implementation with strict type checking
- Type definitions for all functions and interfaces
- Compiled JavaScript output in `dist/` directory
- Type-safe Slack SDK usage
- Proper TypeScript testing setup with Jest
- Source maps for debugging

---

## 🎯 Objective

Convert the entire JavaScript codebase to TypeScript with proper type definitions, maintaining all existing functionality while adding type safety and better IDE support.

---

## 🔧 Technical Specifications

### TypeScript Configuration

Create `tsconfig.json` with strict settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Required Dependencies

Add TypeScript and type definitions:

```bash
npm install --save-dev typescript ts-node @types/node @types/jest
npm install --save-dev ts-jest @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

Note: `@slack/bolt` already includes TypeScript definitions.

### Directory Structure

```
pp-bot/
├── src/
│   ├── index.ts              # Main bot implementation
│   ├── types.ts              # Type definitions
│   ├── storage.ts            # Storage layer (for future database)
│   ├── commands/             # Slash command handlers
│   │   ├── leaderboard.ts
│   │   └── score.ts
│   ├── handlers/             # Message handlers
│   │   └── vote.ts
│   └── utils/                # Utility functions
│       ├── parser.ts
│       └── leaderboard.ts
├── tests/
│   ├── parser.test.ts
│   ├── leaderboard.test.ts
│   └── integration.test.ts
├── dist/                     # Compiled JavaScript (gitignored)
├── tsconfig.json
├── jest.config.js
└── package.json
```

---

## 📝 Implementation Steps

### Step 1: Install TypeScript Dependencies

```bash
npm install --save-dev typescript @types/node @types/jest ts-node ts-jest
```

### Step 2: Create TypeScript Configuration

Create `tsconfig.json` with the configuration shown above.

### Step 3: Create Type Definitions

Create `src/types.ts`:

```typescript
/**
 * Slack user ID (e.g., "U12345678")
 */
export type UserId = string;

/**
 * Vote action: increment (++) or decrement (--)
 */
export type VoteAction = '++' | '--';

/**
 * Parsed vote from a message
 */
export interface Vote {
  userId: UserId;
  action: VoteAction;
}

/**
 * Leaderboard data structure
 * Maps user IDs to their scores
 */
export interface Leaderboard {
  [userId: UserId]: number;
}

/**
 * Leaderboard entry with user info
 */
export interface LeaderboardEntry {
  userId: UserId;
  score: number;
  rank: number;
}

/**
 * Environment variables configuration
 */
export interface EnvConfig {
  SLACK_BOT_TOKEN: string;
  SLACK_APP_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  NODE_ENV?: 'development' | 'production' | 'test';
}
```

### Step 4: Convert Vote Parser

Convert parser logic to `src/utils/parser.ts`:

```typescript
import { Vote, VoteAction } from '../types';

/**
 * Parse message text for @user ++ or @user -- patterns
 * 
 * @param text - Message text from Slack
 * @returns Array of parsed votes
 * 
 * @example
 * parseVote("<@U12345678> ++")
 * // Returns: [{ userId: "U12345678", action: "++" }]
 * 
 * @example
 * parseVote("<@U123> ++ great work! <@U456> --")
 * // Returns: [
 * //   { userId: "U123", action: "++" },
 * //   { userId: "U456", action: "--" }
 * // ]
 */
export function parseVote(text: string): Vote[] {
  const regex = /<@([A-Z0-9]+)>\s*(\+\+|--)/g;
  const matches: Vote[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      userId: match[1],
      action: match[2] as VoteAction,
    });
  }
  
  return matches;
}
```

### Step 5: Convert Leaderboard Logic

Convert leaderboard logic to `src/utils/leaderboard.ts`:

```typescript
import { Leaderboard, UserId, VoteAction, LeaderboardEntry } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

const LEADERBOARD_PATH = path.join(process.cwd(), 'leaderboard.json');

/**
 * Load leaderboard from disk
 * Returns empty leaderboard if file doesn't exist
 */
export async function loadLeaderboard(): Promise<Leaderboard> {
  try {
    const data = await fs.readFile(LEADERBOARD_PATH, 'utf8');
    return JSON.parse(data) as Leaderboard;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

/**
 * Save leaderboard to disk
 */
export async function saveLeaderboard(leaderboard: Leaderboard): Promise<void> {
  await fs.writeFile(
    LEADERBOARD_PATH,
    JSON.stringify(leaderboard, null, 2),
    'utf8'
  );
}

/**
 * Update a user's score in the leaderboard
 * 
 * @param leaderboard - Current leaderboard state
 * @param userId - User ID to update
 * @param action - Vote action (++ or --)
 * @returns Updated score for the user
 */
export function updateLeaderboard(
  leaderboard: Leaderboard,
  userId: UserId,
  action: VoteAction
): number {
  if (!leaderboard[userId]) {
    leaderboard[userId] = 0;
  }
  
  if (action === '++') {
    leaderboard[userId]++;
  } else if (action === '--') {
    leaderboard[userId]--;
  }
  
  return leaderboard[userId];
}

/**
 * Get sorted leaderboard entries
 * 
 * @param leaderboard - Current leaderboard state
 * @param limit - Maximum number of entries to return
 * @returns Sorted array of leaderboard entries with ranks
 */
export function getSortedLeaderboard(
  leaderboard: Leaderboard,
  limit?: number
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = Object.entries(leaderboard)
    .map(([userId, score]) => ({
      userId,
      score,
      rank: 0, // Will be set below
    }))
    .sort((a, b) => b.score - a.score);
  
  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  return limit ? entries.slice(0, limit) : entries;
}
```

### Step 6: Convert Main Bot Logic

Convert `index.js` to `src/index.ts`:

```typescript
import { App, LogLevel } from '@slack/bolt';
import * as dotenv from 'dotenv';
import { parseVote } from './utils/parser';
import {
  loadLeaderboard,
  saveLeaderboard,
  updateLeaderboard,
  getSortedLeaderboard,
} from './utils/leaderboard';
import { EnvConfig, Leaderboard } from './types';

// Load environment variables
dotenv.config();

// Validate environment variables
function getEnvConfig(): EnvConfig {
  const config: Partial<EnvConfig> = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
  };

  if (!config.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is required');
  }
  if (!config.SLACK_APP_TOKEN) {
    throw new Error('SLACK_APP_TOKEN is required');
  }
  if (!config.SLACK_SIGNING_SECRET) {
    throw new Error('SLACK_SIGNING_SECRET is required');
  }

  return config as EnvConfig;
}

const config = getEnvConfig();

// Initialize Slack app
const app = new App({
  token: config.SLACK_BOT_TOKEN,
  appToken: config.SLACK_APP_TOKEN,
  socketMode: true,
  logLevel: config.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
});

// Listen for messages containing votes
app.message(/<@[A-Z0-9]+>\s*(\+\+|--)/, async ({ message, say }) => {
  if (message.subtype || !('text' in message) || !('user' in message)) {
    return;
  }

  const votes = parseVote(message.text);
  if (votes.length === 0) {
    return;
  }

  const leaderboard = await loadLeaderboard();
  const results: string[] = [];

  for (const vote of votes) {
    // Prevent self-voting
    if (vote.userId === message.user) {
      results.push(`<@${vote.userId}> cannot vote for themselves!`);
      continue;
    }

    const newScore = updateLeaderboard(leaderboard, vote.userId, vote.action);
    const emoji = vote.action === '++' ? '⬆️' : '⬇️';
    results.push(`${emoji} <@${vote.userId}> now has ${newScore} points`);
  }

  await saveLeaderboard(leaderboard);
  await say(results.join('
'));
});

// Handle /leaderboard command
app.command('/leaderboard', async ({ ack, say }) => {
  await ack();

  const leaderboard = await loadLeaderboard();
  const entries = getSortedLeaderboard(leaderboard, 10);

  if (entries.length === 0) {
    await say('The leaderboard is empty! Start voting with @user ++');
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = entries.map((entry, index) => {
    const medal = index < 3 ? medals[index] + ' ' : `${entry.rank}. `;
    return `${medal}<@${entry.userId}>: ${entry.score}`;
  });

  await say(`*Leaderboard (Top ${entries.length})*
${lines.join('
')}`);
});

// Handle /score command
app.command('/score', async ({ command, ack, say }) => {
  await ack();

  const leaderboard = await loadLeaderboard();
  
  // Check if a user was mentioned
  const mentionMatch = command.text.match(/<@([A-Z0-9]+)>/);
  const targetUserId = mentionMatch ? mentionMatch[1] : command.user_id;
  
  const score = leaderboard[targetUserId] || 0;
  const isOwnScore = targetUserId === command.user_id;
  
  const message = isOwnScore
    ? `Your current score: ${score}`
    : `<@${targetUserId}>'s current score: ${score}`;
  
  await say(message);
});

// Start the app
export async function start(): Promise<void> {
  await app.start();
  console.log('⚡️ PP Bot is running!');
}

// Start if this is the main module
if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start bot:', error);
    process.exit(1);
  });
}

// Export for testing
export { app, parseVote, loadLeaderboard, saveLeaderboard, updateLeaderboard };
```

### Step 7: Update Jest Configuration

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

### Step 8: Convert Tests

Convert tests to `tests/parser.test.ts`:

```typescript
import { parseVote } from '../src/utils/parser';
import { Vote } from '../src/types';

describe('parseVote', () => {
  test('parses simple upvote', () => {
    const text = '<@U12345678> ++';
    const result = parseVote(text);
    
    const expected: Vote[] = [
      { userId: 'U12345678', action: '++' }
    ];
    
    expect(result).toEqual(expected);
  });

  test('parses simple downvote', () => {
    const text = '<@U12345678> --';
    const result = parseVote(text);
    
    const expected: Vote[] = [
      { userId: 'U12345678', action: '--' }
    ];
    
    expect(result).toEqual(expected);
  });

  test('parses vote with text after', () => {
    const text = '<@U12345678> ++ great job!';
    const result = parseVote(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('U12345678');
    expect(result[0].action).toBe('++');
  });

  test('parses vote with emojis after', () => {
    const text = '<@U12345678> ++ 🎉 🎊 great job!';
    const result = parseVote(text);
    
    expect(result).toEqual([
      { userId: 'U12345678', action: '++' }
    ]);
  });

  test('parses multiple votes in one message', () => {
    const text = '<@U12345678> ++ awesome! <@U87654321> ++ nice work!';
    const result = parseVote(text);
    
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ userId: 'U12345678', action: '++' });
    expect(result[1]).toEqual({ userId: 'U87654321', action: '++' });
  });

  test('parses mixed votes', () => {
    const text = '<@U12345678> ++ <@U87654321> --';
    const result = parseVote(text);
    
    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('++');
    expect(result[1].action).toBe('--');
  });

  test('handles votes without space', () => {
    const text = '<@U12345678>++';
    const result = parseVote(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('U12345678');
  });

  test('returns empty array for no votes', () => {
    const text = 'Hello world!';
    const result = parseVote(text);
    
    expect(result).toEqual([]);
  });
});
```

### Step 9: Update package.json Scripts

Update `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint 'src/**/*.ts' 'tests/**/*.ts'",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist",
    "prebuild": "npm run clean"
  }
}
```

### Step 10: Update .gitignore

Add TypeScript build artifacts:

```
# TypeScript
dist/
*.tsbuildinfo

# Coverage
coverage/
```

---

## ✅ Acceptance Criteria

- [ ] All JavaScript files converted to TypeScript (`.ts` extension)
- [ ] `tsconfig.json` created with strict type checking
- [ ] Type definitions created in `src/types.ts`
- [ ] All functions have proper type annotations
- [ ] Slack SDK types properly utilized
- [ ] Jest configured for TypeScript with `ts-jest`
- [ ] All tests passing with TypeScript
- [ ] Code compiles without errors (`npm run build`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Source maps generated for debugging
- [ ] `package.json` scripts updated for TypeScript workflow
- [ ] `.gitignore` updated to exclude build artifacts
- [ ] README updated with TypeScript build instructions
- [ ] No `any` types used (except where absolutely necessary)
- [ ] All existing functionality preserved

---

## 📚 Reference Documentation

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [@slack/bolt TypeScript Documentation](https://slack.dev/bolt-js/concepts#typescript)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [DefinitelyTyped (@types packages)](https://github.com/DefinitelyTyped/DefinitelyTyped)
- [TypeScript ESLint](https://typescript-eslint.io/)

---

## 🔗 Dependencies

**Blocks:**
- #4 (Implement Leaderboard View Command) - will benefit from TypeScript types
- #3 (PostgreSQL Database Integration) - needs TypeScript interfaces

**Blocked By:** None

---

## 💡 Implementation Notes

### Migration Strategy

1. **Keep it incremental**: Convert one file at a time
2. **Test after each conversion**: Ensure tests pass after converting each module
3. **Use strict mode**: Enable all strict type checks from the start
4. **Avoid `any`**: Use `unknown` or proper types instead of `any`
5. **Leverage inference**: Don't over-annotate; let TypeScript infer when possible

### Common Pitfalls

1. **Module imports**: Use `import` instead of `require()`
2. **JSON imports**: Enable `resolveJsonModule` in tsconfig
3. **Dynamic requires**: Replace with static imports or dynamic `import()`
4. **Process.env**: Type the environment variables properly

### Testing the Migration

After migration, verify:

```bash
# Type check
npm run type-check

# Build
npm run build

# Run tests
npm test

# Start bot
npm run dev
```

---

## 🏷️ Labels

- `enhancement`
- `typescript`
- `refactoring`
- `priority: high`

---

## 📅 Estimated Effort

**Time Estimate:** 4-6 hours

- TypeScript setup: 1 hour
- Type definitions: 1 hour
- Code conversion: 2-3 hours
- Testing and fixes: 1-2 hours