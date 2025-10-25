import { Vote, VoteAction } from '../types';

export function parseVote(text: string): Vote[] {
  const regex = /<@([A-Za-z0-9]+)>\s*(\+\+|--)/g;
  const matches: Vote[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push({ userId: match[1], action: match[2] as VoteAction });
  }
  return matches;
}
