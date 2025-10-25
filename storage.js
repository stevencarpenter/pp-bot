// Storage bridge - uses runtime JS db implementation and database functions
const dbPool = require('./db');

async function getUserScore(userId) {
  const { rows } = await dbPool.query('SELECT score FROM leaderboard WHERE user_id = $1', [userId]);
  if (rows.length === 0) return 0;
  return rows[0].score;
}

async function updateUserScore(userId, delta) {
  const { rows } = await dbPool.query(
    `INSERT INTO leaderboard (user_id, score) VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET score = leaderboard.score + $2, updated_at = NOW()
     RETURNING score`,
    [userId, delta]
  );
  return rows[0].score;
}

async function getTopUsers(limit) {
  const { rows } = await dbPool.query('SELECT user_id, score FROM leaderboard ORDER BY score DESC LIMIT $1', [limit]);
  return rows;
}

async function recordVote(voterId, votedUserId, voteType, channelId, messageTs) {
  await dbPool.query(
    `INSERT INTO vote_history (voter_id, voted_user_id, vote_type, channel_id, message_ts)
     VALUES ($1, $2, $3, $4, $5)` ,
    [voterId, votedUserId, voteType, channelId || null, messageTs || null]
  );
}

module.exports = { getUserScore, updateUserScore, getTopUsers, recordVote };
