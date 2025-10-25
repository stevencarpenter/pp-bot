declare module './index' {
  export interface Leaderboard { [userId: string]: number; }
  export function parseVote(text: string): { userId: string; action: '++' | '--' }[];
  export function updateLeaderboard(lb: Leaderboard, userId: string, action: '++' | '--'): number;
}

