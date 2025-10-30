import { Vote, VoteAction } from '../types';
import { sanitizeThingName, sanitizeUserId } from './sanitize';


export function parseVote(text: string): Vote[] {
  const USER_VOTE_REGEX = /<@([A-Za-z0-9]+)>\s*(\+\+|--)/g;
  const THING_VOTE_REGEX = /(^|[\s,.!?()[\]{}"'`])@([A-Za-z0-9][A-Za-z0-9 _\-.']{0,63})\s*(\+\+|--)/g;
  const matches: { index: number; vote: Vote }[] = [];
  let match: RegExpExecArray | null;

  while ((match = USER_VOTE_REGEX.exec(text)) !== null) {
    const userId = sanitizeUserId(match[1]);
    if (!userId) continue;
    matches.push({
      index: match.index,
      vote: { targetId: userId, targetType: 'user', action: match[2] as VoteAction },
    });
  }

  while ((match = THING_VOTE_REGEX.exec(text)) !== null) {
    const thingName = sanitizeThingName(match[2]);
    if (!thingName) continue;
    const leadingLength = match[1] ? match[1].length : 0;
    const index = match.index + leadingLength;
    matches.push({
      index,
      vote: { targetId: thingName, targetType: 'thing', action: match[3] as VoteAction },
    });
  }

  return matches.sort((a, b) => a.index - b.index).map((entry) => entry.vote);
}
