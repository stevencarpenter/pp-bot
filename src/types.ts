/** Vote action direction: upvote (++) or downvote (--) */
export type VoteAction = '++' | '--';

export type VoteTargetType = 'user' | 'thing';

/** Parsed vote from a message */
export interface Vote {
  targetId: string;
  targetType: VoteTargetType;
  action: VoteAction;
  scoreDelta: number;
}
