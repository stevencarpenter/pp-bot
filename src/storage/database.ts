import { getPool } from './pool';
import { VoteAction, VoteRecord } from '../types';

export async function getUserScore(userId: string): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT score FROM leaderboard WHERE user_id = $1', [userId]);
  if (rows.length === 0) return 0;
  return rows[0].score as number;
}

export async function updateUserScore(userId: string, delta: number): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO leaderboard (user_id, score) VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET score = leaderboard.score + $2, updated_at = NOW()
     RETURNING score`,
    [userId, delta]
  );
  return rows[0].score as number;
}

export async function getTopUsers(limit: number): Promise<{ user_id: string; score: number }[]> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT user_id, score FROM leaderboard ORDER BY score DESC LIMIT $1', [limit]);
  return rows as { user_id: string; score: number }[];
}

export async function recordVote(voterId: string, votedUserId: string, voteType: VoteAction, channelId?: string, messageTs?: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO vote_history (voter_id, voted_user_id, vote_type, channel_id, message_ts)
     VALUES ($1, $2, $3, $4, $5)`,
    [voterId, votedUserId, voteType, channelId || null, messageTs || null]
  );
}

export async function getRecentVotes(userId: string, limit = 20): Promise<VoteRecord[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT voter_id as "voterId", voted_user_id as "votedUserId", vote_type as "voteType", channel_id as "channelId", message_ts as "messageTs", created_at as "createdAt"
     FROM vote_history WHERE voted_user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.map(r => ({ ...r, createdAt: new Date(r.createdAt) }));
}

