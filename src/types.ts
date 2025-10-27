/** Slack user ID (e.g., "U12345678") */
export type UserId = string;

/** Vote action: increment (++) or decrement (--) */
export type VoteAction = '++' | '--';

/** Parsed vote from a message */
export interface Vote {
  userId: UserId;
  action: VoteAction;
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
