# Implement Leaderboard View Command

**Milestone:** Phase 2: Database & Features
**Labels:** enhancement, feature

---

## 📋 Context

The bot currently has a `/leaderboard` command that shows the top 10 users, but it needs to be improved with better formatting, pagination support, and additional viewing options. This issue focuses on enhancing the leaderboard display functionality.

**Current State:**
- Basic `/leaderboard` command exists
- Shows top 10 users only
- Simple text formatting
- No pagination
- No filtering options

**Target State:**
- Enhanced `/leaderboard` command with rich formatting
- Paginated view for large leaderboards
- Options to filter by score range
- Display user's own rank even if not in top 10
- Statistics summary (total users, votes, etc.)

---

## 🎯 Objective

Enhance the leaderboard command with better formatting, pagination support, statistics, and user rank display functionality.

---

## 🔧 Technical Specifications

### Command Syntax

```
/leaderboard [page] [options]

Examples:
/leaderboard           # Show top 10
/leaderboard 2         # Show next 10 (11-20)
/leaderboard stats     # Show statistics
/leaderboard me        # Show my rank and nearby users
```

### Implementation

```typescript
// Enhanced leaderboard command with pagination
app.command('/leaderboard', async ({ command, ack, say }) => {
  await ack();

  const args = command.text.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase();

  try {
    if (subcommand === 'stats') {
      await showStats(say);
    } else if (subcommand === 'me') {
      await showUserRank(say, command.user_id);
    } else {
      const page = parseInt(args[0]) || 1;
      await showLeaderboard(say, page);
    }
  } catch (error) {
    console.error('Error in /leaderboard command:', error);
    await say('❌ Failed to display leaderboard. Please try again.');
  }
});

async function showLeaderboard(say: any, page: number): Promise<void> {
  const perPage = 10;
  const offset = (page - 1) * perPage;
  
  const entries = await getSortedLeaderboard(perPage, offset);
  
  if (entries.length === 0) {
    if (page === 1) {
      await say('The leaderboard is empty! Start voting with @user ++');
    } else {
      await say(`No users found on page ${page}`);
    }
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = entries.map((entry, index) => {
    const globalRank = offset + index + 1;
    const medal = globalRank <= 3 ? medals[globalRank - 1] + ' ' : `${globalRank}. `;
    return `${medal}<@${entry.userId}>: ${entry.score}`;
  });

  const header = page === 1 
    ? '*🏆 Leaderboard (Top 10)*' 
    : `*🏆 Leaderboard (Page ${page})*`;
  
  const footer = entries.length === perPage 
    ? `

_Type \`/leaderboard ${page + 1}\` to see more_` 
    : '';

  await say(`${header}
${lines.join('
')}${footer}`);
}

async function showStats(say: any): Promise<void> {
  const stats = await getStats();
  
  await say(`*📊 Leaderboard Statistics*
  
👥 Total Users: ${stats.totalUsers}
🗳️ Total Votes: ${stats.totalVotes}
⬆️ Highest Score: ${stats.highestScore}
⬇️ Lowest Score: ${stats.lowestScore}`);
}

async function showUserRank(say: any, userId: string): Promise<void> {
  const userRank = await getUserRank(userId);
  
  if (userRank === null) {
    await say('You haven't received any votes yet!');
    return;
  }

  // Get nearby users (±2 positions)
  const nearby = await getNearbyUsers(userRank.rank, 2);
  
  const lines = nearby.map(entry => {
    const marker = entry.userId === userId ? '➡️ ' : '   ';
    return `${marker}${entry.rank}. <@${entry.userId}>: ${entry.score}`;
  });

  await say(`*Your Ranking*

${lines.join('
')}`);
}
```

### Database Functions

Add to `src/storage/database.ts`:

```typescript
/**
 * Get sorted leaderboard with pagination
 */
export async function getSortedLeaderboard(
  limit: number = 10,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  const result = await pool.query(
    `SELECT 
      user_id,
      score,
      ROW_NUMBER() OVER (ORDER BY score DESC) as rank
     FROM leaderboard
     ORDER BY score DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows.map(row => ({
    userId: row.user_id,
    score: row.score,
    rank: row.rank,
  }));
}

/**
 * Get user's rank in the leaderboard
 */
export async function getUserRank(userId: UserId): Promise<LeaderboardEntry | null> {
  const result = await pool.query(
    `SELECT 
      user_id,
      score,
      (SELECT COUNT(*) + 1 FROM leaderboard WHERE score > l.score) as rank
     FROM leaderboard l
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    userId: result.rows[0].user_id,
    score: result.rows[0].score,
    rank: result.rows[0].rank,
  };
}

/**
 * Get users near a specific rank
 */
export async function getNearbyUsers(
  rank: number,
  range: number = 2
): Promise<LeaderboardEntry[]> {
  const result = await pool.query(
    `WITH ranked_users AS (
      SELECT 
        user_id,
        score,
        ROW_NUMBER() OVER (ORDER BY score DESC) as rank
      FROM leaderboard
    )
    SELECT user_id, score, rank
    FROM ranked_users
    WHERE rank BETWEEN $1 AND $2
    ORDER BY rank`,
    [Math.max(1, rank - range), rank + range]
  );

  return result.rows.map(row => ({
    userId: row.user_id,
    score: row.score,
    rank: row.rank,
  }));
}
```

---

## ✅ Acceptance Criteria

- [ ] `/leaderboard` shows top 10 with rich formatting
- [ ] `/leaderboard [page]` shows paginated results
- [ ] `/leaderboard stats` shows statistics
- [ ] `/leaderboard me` shows user's rank and nearby users
- [ ] Pagination footer shows "see more" when applicable
- [ ] Database functions support pagination and ranking
- [ ] Tests for all leaderboard functions
- [ ] Error handling for invalid page numbers
- [ ] Documentation updated with command examples

---

## 📚 Reference Documentation

- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder/) - for rich formatting
- [Slack Message Formatting](https://api.slack.com/reference/surfaces/formatting)
- [PostgreSQL Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html)

---

## 🔗 Dependencies

**Blocks:** None

**Blocked By:**
- #2 (Migrate to TypeScript) - TypeScript types needed
- #3 (PostgreSQL Database Integration) - Database functions needed

---

## 📅 Estimated Effort

**Time Estimate:** 3-4 hours

- Command handler implementation: 1 hour
- Database functions: 1 hour
- Testing: 1 hour
- Documentation: 0.5 hours
