/** Slack user ID (e.g., "U12345678") */
export type UserId = string;

/** Vote action: increment (++) or decrement (--) */
export type VoteAction = '++' | '--';

/** Parsed vote from a message */
export interface Vote { userId: UserId; action: VoteAction; }

/** Leaderboard data structure mapping user IDs to scores */
export interface Leaderboard { [userId: UserId]: number; }

/** Leaderboard entry with user info */
export interface LeaderboardEntry { userId: UserId; score: number; rank: number; }

/** Environment variables configuration */
export interface EnvConfig {
  SLACK_BOT_TOKEN: string;
  SLACK_APP_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  NODE_ENV?: 'development' | 'production' | 'test';
  LOG_LEVEL?: string;
  DATABASE_URL?: string;
}

export interface VoteRecord {
  voterId: UserId;
  votedUserId: UserId;
  voteType: VoteAction;
  channelId?: string;
  messageTs?: string;
  createdAt?: Date;
}

export { updateLeaderboard } from './utils/leaderboard';
