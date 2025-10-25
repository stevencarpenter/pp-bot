export interface Leaderboard {
    [userId: string]: number
}

export type VoteAction = '++' | '--';

export function updateLeaderboard(leaderboard: Leaderboard, userId: string, action: VoteAction): number {
    if (!leaderboard[userId]) leaderboard[userId] = 0;
    if (action === '++') leaderboard[userId] += 1;
    else if (action === '--') leaderboard[userId] -= 1;
    return leaderboard[userId];
}

