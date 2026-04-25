import { Vote, VoteAction } from '../types';
import { sanitizeThingName, sanitizeUserId } from './sanitize';

const DEFAULT_MAX_VOTE_SCORE_DELTA = 5;

function getMaxVoteScoreDelta(): number {
  const configuredValue = process.env.MAX_UPVOTE_SCORE_DELTA;
  if (!configuredValue || configuredValue.trim() === '') {
    return DEFAULT_MAX_VOTE_SCORE_DELTA;
  }

  const parsedValue = Number.parseInt(configuredValue, 10);
  if (!Number.isFinite(parsedValue) || Number.isNaN(parsedValue) || parsedValue < 1) {
    return DEFAULT_MAX_VOTE_SCORE_DELTA;
  }

  return parsedValue;
}

function parseVoteToken(token: string): { action: VoteAction; scoreDelta: number } | null {
  if (/^-{2,}$/.test(token)) {
    return { action: '--', scoreDelta: -Math.min(token.length - 1, getMaxVoteScoreDelta()) };
  }

  if (/^\+{2,}$/.test(token)) {
    return { action: '++', scoreDelta: Math.min(token.length - 1, getMaxVoteScoreDelta()) };
  }

  return null;
}

export function parseVote(text: string): Vote[] {
  const USER_VOTE_REGEX = /<@([A-Za-z0-9]+)>\s*(\+{2,}|-{2,})/g;
  const THING_VOTE_REGEX =
    /(^|[\s,.!?()[\]{}"'`])@([A-Za-z0-9][A-Za-z0-9 _\-.']{0,63}?)\s*(\+{2,}|-{2,})/g;
  const matches: { index: number; vote: Vote }[] = [];
  let match: RegExpExecArray | null;

  while ((match = USER_VOTE_REGEX.exec(text)) !== null) {
    const userId = sanitizeUserId(match[1]);
    const parsedVote = parseVoteToken(match[2]);
    if (!userId) continue;
    if (!parsedVote) continue;
    matches.push({
      index: match.index,
      vote: { targetId: userId, targetType: 'user', ...parsedVote },
    });
  }

  while ((match = THING_VOTE_REGEX.exec(text)) !== null) {
    const thingName = sanitizeThingName(match[2]);
    const parsedVote = parseVoteToken(match[3]);
    if (!thingName) continue;
    if (!parsedVote) continue;
    const leadingLength = match[1] ? match[1].length : 0;
    const index = match.index + leadingLength;
    matches.push({
      index,
      vote: { targetId: thingName, targetType: 'thing', ...parsedVote },
    });
  }

  return matches.sort((a, b) => a.index - b.index).map((entry) => entry.vote);
}
