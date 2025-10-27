import { VoteAction, VoteRecord } from '../types';

import logger from '../logger';
import { waitForDatabase } from '../db';
import { getPool } from './pool';

type DatabaseError = {
  code?: string;
  message?: string;
};

const DATABASE_STARTUP_PG_CODE = '57P03';
const DATABASE_STARTUP_MESSAGE_FRAGMENT = 'the database system is starting up';
const DEFAULT_OPERATION_RETRIES = 3;
const RECOVERY_WAIT_MAX_RETRIES = 15;
const RECOVERY_WAIT_INITIAL_DELAY_MS = 2000;

let databaseRecoveryPromise: Promise<void> | null = null;

function isDatabaseStartupError(error: unknown): error is DatabaseError {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as DatabaseError;
  if (code && code.toUpperCase() === DATABASE_STARTUP_PG_CODE) return true;
  if (typeof message === 'string') {
    return message.toLowerCase().includes(DATABASE_STARTUP_MESSAGE_FRAGMENT);
  }
  return false;
}

function formatErrorMessage(error: unknown): string {
  if (!error) return 'Unknown database error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function waitForDatabaseRecovery(): Promise<void> {
  if (!databaseRecoveryPromise) {
    databaseRecoveryPromise = waitForDatabase(
      RECOVERY_WAIT_MAX_RETRIES,
      RECOVERY_WAIT_INITIAL_DELAY_MS
    ).finally(() => {
      databaseRecoveryPromise = null;
    });
  }
  await databaseRecoveryPromise;
}

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  { retries = DEFAULT_OPERATION_RETRIES }: { retries?: number } = {}
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      return await operation();
    } catch (error) {
      const shouldRetry = attempt < retries && isDatabaseStartupError(error);
      if (!shouldRetry) {
        throw error;
      }

      const errorMessage = formatErrorMessage(error);
      logger.warn(
        `Database not ready (attempt ${attempt}/${retries}): ${errorMessage}. Waiting before retry.`
      );
      await waitForDatabaseRecovery();
    }
  }
}

export async function getUserScore(userId: string): Promise<number> {
  return withDatabaseRetry(async () => {
    const pool = getPool();
    const { rows } = await pool.query('SELECT score FROM leaderboard WHERE user_id = $1', [userId]);
    if (rows.length === 0) return 0;
    return rows[0].score as number;
  });
}

export async function updateUserScore(userId: string, delta: number): Promise<number> {
  return withDatabaseRetry(async () => {
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO leaderboard (user_id, score, updated_at)
           VALUES ($1, $2, NOW()) ON CONFLICT (user_id)
       DO
          UPDATE SET score = leaderboard.score + $2, updated_at = NOW()
              RETURNING score`,
      [userId, delta]
    );
    return rows[0].score as number;
  });
}

export async function getTopUsers(limit: number): Promise<{ user_id: string; score: number }[]> {
  return withDatabaseRetry(async () => {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT user_id, score FROM leaderboard ORDER BY score DESC LIMIT $1',
      [limit]
    );
    return rows as { user_id: string; score: number }[];
  });
}

export async function recordVote(
  voterId: string,
  votedUserId: string,
  voteType: VoteAction,
  channelId?: string,
  messageTs?: string
): Promise<void> {
  await withDatabaseRetry(async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO vote_history (voter_id, voted_user_id, vote_type, channel_id, message_ts)
           VALUES ($1, $2, $3, $4, $5)`,
      [voterId, votedUserId, voteType, channelId || null, messageTs || null]
    );
  });
}

export async function getRecentVotes(userId: string, limit = 20): Promise<VoteRecord[]> {
  return withDatabaseRetry(async () => {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT voter_id      as "voterId",
                  voted_user_id as "votedUserId",
                  vote_type     as "voteType",
                  channel_id    as "channelId",
                  message_ts    as "messageTs",
                  created_at    as "createdAt"
           FROM vote_history
           WHERE voted_user_id = $1
           ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows.map((r) => ({
      ...r,
      channelId: r.channelId ?? undefined,
      messageTs: r.messageTs ?? undefined,
      createdAt: new Date(r.createdAt),
    }));
  });
}
