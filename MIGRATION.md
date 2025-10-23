
# Language Migration Guide for pp-bot

**Last Updated:** October 23, 2025  
**Current:** JavaScript (Node.js)  
**Recommended:** TypeScript  
**Alternatives:** Python, Scala, Rust

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [TypeScript Migration Guide](#typescript-migration-guide)
3. [Python Migration Guide](#python-migration-guide)
4. [Scala Migration Guide](#scala-migration-guide)
5. [Rust Migration Guide](#rust-migration-guide)
6. [Decision Framework](#decision-framework)

---

## Executive Summary

Based on the technology analysis (see `TECH_DECISION.md`), **TypeScript is the recommended migration path** for pp-bot due to:

- ✅ Minimal migration effort (1-2 days)
- ✅ Type safety and better developer experience
- ✅ Same npm ecosystem and Slack SDK
- ✅ Easy team adoption
- ✅ Perfect for I/O-bound Slack bot operations

**Score: 51/55 (Best for this use case)**

However, this guide provides migration paths for all considered languages.

---

## TypeScript Migration Guide

### Why TypeScript?

- **Minimal effort:** Rename files and add types
- **Same ecosystem:** Keep all npm packages
- **Type safety:** Catch errors at compile time
- **Better IDE support:** Autocomplete and IntelliSense
- **Easy hiring:** Large talent pool

### Estimated Effort
- **Time:** 12-16 hours
- **Complexity:** Low
- **Risk:** Low

### Step-by-Step Migration

#### Phase 1: Setup (2-3 hours)

**1. Install TypeScript dependencies:**
```bash
npm install --save-dev typescript @types/node @types/jest
npm install --save-dev ts-node ts-jest
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

**2. Create `tsconfig.json`:**
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

**3. Update package.json:**
```json
{
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.ts"
  }
}
```

**4. Configure Jest for TypeScript:**
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/types.ts',
  ],
};
```

#### Phase 2: Project Structure (1 hour)

**Create directory structure:**
```bash
mkdir -p src
mv index.js src/index.ts
mv index.test.js src/index.test.ts
```

**New structure:**
```
pp-bot/
├── src/
│   ├── index.ts           # Main application
│   ├── types.ts           # Type definitions
│   ├── config/
│   │   └── env.ts         # Environment config
│   ├── storage/
│   │   ├── database.ts    # Database operations
│   │   └── pool.ts        # Connection pool
│   ├── handlers/
│   │   ├── message.ts     # Message handlers
│   │   └── commands.ts    # Slash command handlers
│   └── utils/
│       ├── vote.ts        # Vote parsing
│       └── logger.ts      # Logging utilities
├── dist/                  # Compiled JavaScript (gitignored)
├── tsconfig.json
└── package.json
```

#### Phase 3: Type Definitions (3-4 hours)

**1. Create type definitions (`src/types.ts`):**
```typescript
// src/types.ts

export interface Vote {
  userId: string;
  action: '++' | '--';
}

export interface LeaderboardEntry {
  userId: string;
  score: number;
  rank?: number;
  percentile?: number;
}

export interface SlackMessage {
  user: string;
  text: string;
  channel: string;
  ts: string;
  thread_ts?: string;
}

export interface SlackCommand {
  command: string;
  text: string;
  user_id: string;
  channel_id: string;
  trigger_id: string;
}

export interface CommandContext {
  command: SlackCommand;
  ack: () => Promise<void>;
  say: (message: string | object) => Promise<void>;
  client: any;  // @slack/web-api WebClient
}

export interface MessageContext {
  message: SlackMessage;
  say: (message: string | object) => Promise<void>;
  client: any;
}

export interface DatabaseConfig {
  connectionString: string;
  ssl: boolean;
  max: number;
}

export interface Config {
  nodeEnv: string;
  port: number;
  slack: {
    botToken: string;
    appToken: string;
    signingSecret: string;
  };
  database: DatabaseConfig;
  logging: {
    level: string;
  };
}
```

**2. Update vote parsing with types:**
```typescript
// src/utils/vote.ts

import { Vote } from '../types';

export function parseVote(text: string): Vote[] {
  const regex = /<@([A-Z0-9]+)>\s*(\+\+|--)/g;
  const matches: Vote[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      userId: match[1],
      action: match[2] as '++' | '--',
    });
  }
  
  return matches;
}
```

**3. Update storage functions:**
```typescript
// src/storage/database.ts

import { Pool } from 'pg';
import { LeaderboardEntry } from '../types';

export async function getUserScore(
  pool: Pool, 
  userId: string
): Promise<number> {
  const result = await pool.query<{ score: number }>(
    'SELECT score FROM leaderboard WHERE user_id = $1',
    [userId]
  );
  return result.rows[0]?.score || 0;
}

export async function updateUserScore(
  pool: Pool, 
  userId: string, 
  delta: number
): Promise<number> {
  const result = await pool.query<{ score: number }>(
    `INSERT INTO leaderboard (user_id, score, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) 
     DO UPDATE SET 
       score = leaderboard.score + $2,
       updated_at = NOW()
     RETURNING score`,
    [userId, delta]
  );
  return result.rows[0].score;
}

export async function getTopUsers(
  pool: Pool, 
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const result = await pool.query<LeaderboardEntry>(
    `SELECT user_id, score 
     FROM leaderboard 
     WHERE score != 0
     ORDER BY score DESC 
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
```

#### Phase 4: Main Application Migration (4-6 hours)

**Update main application:**
```typescript
// src/index.ts

import { App } from '@slack/bolt';
import { getConfig } from './config/env';
import { createPool } from './storage/pool';
import { parseVote } from './utils/vote';
import { getUserScore, updateUserScore, getTopUsers } from './storage/database';
import { MessageContext, CommandContext } from './types';

// Load and validate configuration
const config = getConfig();

// Create database connection pool
const pool = createPool(config.database);

// Initialize Slack app
const app = new App({
  token: config.slack.botToken,
  appToken: config.slack.appToken,
  signingSecret: config.slack.signingSecret,
  socketMode: true,
});

// Message handler
app.message(async (context: MessageContext) => {
  const { message, say } = context;
  
  const votes = parseVote(message.text);
  if (votes.length === 0) return;
  
  for (const vote of votes) {
    if (vote.userId === message.user) {
      await say(`<@${vote.userId}> cannot vote for themselves!`);
      continue;
    }
    
    const delta = vote.action === '++' ? 1 : -1;
    const newScore = await updateUserScore(pool, vote.userId, delta);
    
    await say(`<@${vote.userId}> now has ${newScore} points!`);
  }
});

// Leaderboard command
app.command('/leaderboard', async (context: CommandContext) => {
  const { ack, say } = context;
  await ack();
  
  const topUsers = await getTopUsers(pool, 10);
  
  let message = '🏆 *Leaderboard*\n\n';
  topUsers.forEach((entry, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    message += `${medal} <@${entry.userId}>: ${entry.score} points\n`;
  });
  
  await say(message);
});

// Score command
app.command('/score', async (context: CommandContext) => {
  const { command, ack, say } = context;
  await ack();
  
  const userId = command.text ? command.text.match(/<@([A-Z0-9]+)>/)?.[1] || command.user_id : command.user_id;
  const score = await getUserScore(pool, userId);
  
  await say(`<@${userId}> has ${score} points`);
});

// Start application
async function start(): Promise<void> {
  try {
    await app.start(config.port);
    console.log(`⚡️ Bolt app is running on port ${config.port}!`);
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await app.stop();
  await pool.end();
  process.exit(0);
});

if (require.main === module) {
  start();
}

export { app };
```

#### Phase 5: Testing (2-3 hours)

**Update tests for TypeScript:**
```typescript
// src/utils/vote.test.ts

import { parseVote } from './vote';
import { Vote } from '../types';

describe('parseVote', () => {
  test('parses single upvote', () => {
    const text = '<@U12345> ++';
    const result: Vote[] = parseVote(text);
    expect(result).toEqual([{ userId: 'U12345', action: '++' }]);
  });
  
  test('parses multiple votes', () => {
    const text = '<@U12345> ++ <@U67890> --';
    const result: Vote[] = parseVote(text);
    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('++');
    expect(result[1].action).toBe('--');
  });
});
```

#### Phase 6: Build and Deploy (1-2 hours)

**1. Build the project:**
```bash
npm run build
```

**2. Verify output:**
```bash
ls -la dist/
```

**3. Test locally:**
```bash
npm start
```

**4. Update CI/CD:**
```yaml
# .github/workflows/ci.yml
- name: Type check
  run: npm run type-check

- name: Build
  run: npm run build
```

**5. Deploy to Railway:**
```bash
git add .
git commit -m "Migrate to TypeScript"
git push origin main
```

### Migration Checklist

- [ ] TypeScript dependencies installed
- [ ] `tsconfig.json` configured
- [ ] Project structure reorganized
- [ ] All files renamed to `.ts`
- [ ] Type definitions created
- [ ] Type errors fixed
- [ ] Tests updated and passing
- [ ] Build succeeds
- [ ] Application runs locally
- [ ] CI/CD updated
- [ ] Deployed to production
- [ ] Functionality verified

### Common Issues and Solutions

**Issue: "Cannot find module '@slack/bolt'"**
```bash
npm install --save-dev @types/node
```

**Issue: Strict type errors**
```json
// Temporarily disable strict mode in tsconfig.json
{
  "compilerOptions": {
    "strict": false
  }
}
// Enable gradually as you add types
```

**Issue: Tests not working**
```bash
npm install --save-dev @types/jest ts-jest
```

---

## Python Migration Guide

### Why Python?

- Clean, readable syntax
- Excellent for data processing
- Strong ML/AI ecosystem
- Official Slack SDK (`slack-bolt`)

### Estimated Effort
- **Time:** 3-5 days (40-50 hours)
- **Complexity:** Medium
- **Risk:** Medium

### When to Choose Python

Choose Python if:
- Planning to add ML/AI features
- Need complex data analysis
- Team has Python expertise
- Want to integrate with data science tools

### High-Level Migration Steps

**1. Set up Python environment:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install slack-bolt python-dotenv psycopg2-binary
```

**2. Create project structure:**
```
pp-bot/
├── src/
│   ├── __init__.py
│   ├── main.py
│   ├── handlers/
│   ├── storage/
│   └── utils/
├── tests/
├── requirements.txt
└── Procfile
```

**3. Rewrite core logic:**
```python
# src/main.py
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import os
import re
from storage.database import get_user_score, update_user_score

app = App(token=os.environ["SLACK_BOT_TOKEN"])

def parse_vote(text: str) -> list[dict]:
    pattern = r'<@([A-Z0-9]+)>\s*(\+\+|--)'
    matches = re.findall(pattern, text)
    return [{"user_id": m[0], "action": m[1]} for m in matches]

@app.message(re.compile(r"<@([A-Z0-9]+)>\s*(\+\+|--)"))
def handle_vote(message, say):
    votes = parse_vote(message["text"])
    for vote in votes:
        if vote["user_id"] == message["user"]:
            say(f"<@{vote['user_id']}> cannot vote for themselves!")
            continue
        
        delta = 1 if vote["action"] == "++" else -1
        new_score = update_user_score(vote["user_id"], delta)
        say(f"<@{vote['user_id']}> now has {new_score} points!")

@app.command("/leaderboard")
def show_leaderboard(ack, say):
    ack()
    # Leaderboard logic
    pass

if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

**4. Update deployment:**
```python
# Procfile
web: python src/main.py
```

**5. Test and deploy:**
```bash
pytest tests/
railway up
```

### Python Resources
- [slack-bolt Python SDK](https://slack.dev/bolt-python/)
- [psycopg2 Documentation](https://www.psycopg.org/docs/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)

---

## Scala Migration Guide

### Why Scala?

- Strong type system
- Functional programming
- Excellent concurrency (Akka)
- JVM ecosystem

### Estimated Effort
- **Time:** 1-2 weeks
- **Complexity:** High
- **Risk:** High

### When to Choose Scala

Choose Scala if:
- Need complex business logic
- Building enterprise-grade system
- Team has JVM expertise
- Want strong type safety and FP

**⚠️ Not recommended for this use case** - Overkill for a simple Slack bot

### High-Level Migration Steps

1. Set up SBT project
2. Add Slack API client library (no official SDK)
3. Rewrite core logic in Scala
4. Set up Akka for concurrency
5. Configure deployment

**Complexity:** Building Slack client from scratch adds significant effort.

---

## Rust Migration Guide

### Why Rust?

- Memory safe
- Extremely fast
- No garbage collection
- Strong type system

### Estimated Effort
- **Time:** 2-3 weeks
- **Complexity:** Very High
- **Risk:** Very High

### When to Choose Rust

Choose Rust if:
- Performance is absolutely critical
- Building systems-level features
- Team has Rust expertise
- Need memory safety guarantees

**⚠️ Not recommended for this use case** - Overkill for I/O-bound Slack bot

### High-Level Migration Steps

1. Set up Cargo project
2. Find or build Slack API client (no official SDK)
3. Set up async runtime (Tokio)
4. Rewrite core logic in Rust
5. Handle complex borrow checker issues
6. Configure deployment

**Complexity:** Learning curve is steep, no official Slack SDK adds significant effort.

---

## Decision Framework

### Choose TypeScript if:
- ✅ Want minimal migration effort
- ✅ Need type safety
- ✅ Want same ecosystem
- ✅ Team knows JavaScript
- ✅ I/O-bound workload
- ⭐ **RECOMMENDED FOR PP-BOT**

### Choose Python if:
- ✅ Planning ML/AI features
- ✅ Need data processing
- ✅ Team has Python expertise
- ✅ Want to integrate with data tools

### Choose JavaScript (stay) if:
- ✅ Extremely time-constrained
- ✅ Prototype/proof-of-concept only
- ❌ Not recommended long-term

### Choose Scala if:
- ✅ Complex business logic
- ✅ Enterprise requirements
- ✅ JVM ecosystem needed
- ❌ Overkill for this use case

### Choose Rust if:
- ✅ Performance critical
- ✅ Systems programming
- ✅ Team has Rust expertise
- ❌ Overkill for this use case

---

## Next Steps

1. **Review TECH_DECISION.md** for detailed analysis
2. **Make a decision** (TypeScript recommended)
3. **Follow migration guide** for chosen language
4. **Test thoroughly** before deploying
5. **Update documentation** with new language

---

## Questions?

Open an issue or contact the team for guidance on migration decisions.
