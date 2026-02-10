import type { VoteAction, VoteTargetType } from '../types';

export type AbuseEnforcementMode = 'monitor' | 'enforce';

export type AbuseReasonCode =
  | 'CHANNEL_NOT_ALLOWED'
  | 'MESSAGE_TARGET_LIMIT_EXCEEDED'
  | 'USER_RATE_LIMIT_EXCEEDED'
  | 'CHANNEL_RATE_LIMIT_EXCEEDED'
  | 'PAIR_COOLDOWN_ACTIVE'
  | 'DAILY_DOWNVOTE_LIMIT_EXCEEDED';

export interface AbuseControlsConfig {
  maxTargetsPerMessage: number;
  userRatePerMinute: number;
  channelRatePerMinute: number;
  pairCooldownSeconds: number;
  dailyDownvoteLimit: number;
  allowedChannelIds: Set<string> | null;
  enforcementMode: AbuseEnforcementMode;
}

export interface AbuseMessageContext {
  voterId: string;
  channelId?: string;
  targetsInMessage: number;
  now?: Date;
}

export interface AbuseVoteContext {
  voterId: string;
  channelId?: string;
  targetId: string;
  targetType: VoteTargetType;
  action: VoteAction;
  now?: Date;
}

export interface AbuseDecision {
  allowed: boolean;
  wouldBlock: boolean;
  reasonCode?: AbuseReasonCode;
  reasonMessage?: string;
  details?: Record<string, unknown>;
}

export interface AbuseVoteReservation {
  voterId: string;
  channelId?: string;
  eventAtMs: number;
  pairKey?: string;
  previousPairLastSeen?: number;
  dayKey?: string;
}

export interface AbuseDecisionWithReservation extends AbuseDecision {
  reservation?: AbuseVoteReservation;
}

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60_000;

function parseIntEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue: number,
  minimum = 0
): number {
  const rawValue = env[name];
  if (!rawValue || rawValue.trim() === '') {
    return defaultValue;
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < minimum) {
    throw new Error(`Invalid ${name} value "${rawValue}". Expected an integer >= ${minimum}.`);
  }
  return parsed;
}

function parseEnforcementMode(env: NodeJS.ProcessEnv): AbuseEnforcementMode {
  const rawValue = env.ABUSE_ENFORCEMENT_MODE;
  if (!rawValue || rawValue.trim() === '') {
    return 'enforce';
  }
  const normalized = rawValue.toLowerCase();
  if (normalized === 'monitor' || normalized === 'enforce') {
    return normalized;
  }
  throw new Error('Invalid ABUSE_ENFORCEMENT_MODE. Expected one of: monitor, enforce.');
}

function parseAllowedChannels(env: NodeJS.ProcessEnv): Set<string> | null {
  const rawValue = env.VOTE_ALLOWED_CHANNEL_IDS;
  if (!rawValue || rawValue.trim() === '') {
    return null;
  }
  const channels = rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return channels.length > 0 ? new Set(channels) : null;
}

export function getAbuseControlsConfig(env: NodeJS.ProcessEnv = process.env): AbuseControlsConfig {
  return {
    maxTargetsPerMessage: parseIntEnv(env, 'VOTE_MAX_TARGETS_PER_MESSAGE', 5, 1),
    userRatePerMinute: parseIntEnv(env, 'VOTE_RATE_USER_PER_MIN', 12, 1),
    channelRatePerMinute: parseIntEnv(env, 'VOTE_RATE_CHANNEL_PER_MIN', 60, 1),
    pairCooldownSeconds: parseIntEnv(env, 'VOTE_PAIR_COOLDOWN_SECONDS', 300, 0),
    dailyDownvoteLimit: parseIntEnv(env, 'VOTE_DAILY_DOWNVOTE_LIMIT', 15, 0),
    allowedChannelIds: parseAllowedChannels(env),
    enforcementMode: parseEnforcementMode(env),
  };
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function takeWindow(
  map: Map<string, number[]>,
  key: string,
  windowMs: number,
  nowMs: number
): number[] {
  const existing = map.get(key);
  if (!existing || existing.length === 0) {
    return [];
  }
  const lowerBound = nowMs - windowMs;
  const filtered = existing.filter((ts) => ts >= lowerBound);
  if (filtered.length === 0) {
    map.delete(key);
    return [];
  }
  if (filtered.length !== existing.length) {
    map.set(key, filtered);
  }
  return filtered;
}

function pushWindow(
  map: Map<string, number[]>,
  key: string,
  nowMs: number,
  windowMs: number
): void {
  const current = takeWindow(map, key, windowMs, nowMs);
  current.push(nowMs);
  map.set(key, current);
}

function removeWindowEvent(map: Map<string, number[]>, key: string, timestampMs: number): void {
  const entries = map.get(key);
  if (!entries || entries.length === 0) {
    return;
  }

  const index = entries.lastIndexOf(timestampMs);
  if (index < 0) {
    return;
  }

  entries.splice(index, 1);
  if (entries.length === 0) {
    map.delete(key);
  } else {
    map.set(key, entries);
  }
}

function pruneWindowMap(map: Map<string, number[]>, windowMs: number, nowMs: number): void {
  for (const key of Array.from(map.keys())) {
    takeWindow(map, key, windowMs, nowMs);
  }
}

export class AbuseController {
  private readonly config: AbuseControlsConfig;
  private readonly userWindow = new Map<string, number[]>();
  private readonly channelWindow = new Map<string, number[]>();
  private readonly pairLastSeen = new Map<string, number>();
  private readonly dailyDownvotes = new Map<string, number>();
  private lastPruneAt = 0;

  constructor(config: AbuseControlsConfig) {
    this.config = config;
  }

  getConfig(): AbuseControlsConfig {
    return this.config;
  }

  evaluateMessage(context: AbuseMessageContext): AbuseDecision {
    const now = context.now ?? new Date();

    if (this.config.allowedChannelIds) {
      const channelId = context.channelId;
      if (!channelId || !this.config.allowedChannelIds.has(channelId)) {
        return this.makeViolation('CHANNEL_NOT_ALLOWED', {
          channelId: channelId ?? null,
          voterId: context.voterId,
          evaluatedAt: now.toISOString(),
        });
      }
    }

    if (context.targetsInMessage > this.config.maxTargetsPerMessage) {
      return this.makeViolation('MESSAGE_TARGET_LIMIT_EXCEEDED', {
        targetsInMessage: context.targetsInMessage,
        maxTargetsPerMessage: this.config.maxTargetsPerMessage,
        voterId: context.voterId,
        channelId: context.channelId ?? null,
        evaluatedAt: now.toISOString(),
      });
    }

    return { allowed: true, wouldBlock: false };
  }

  evaluateVote(context: AbuseVoteContext): AbuseDecision {
    const now = context.now ?? new Date();
    const nowMs = now.getTime();
    this.maybePrune(now);

    const userEvents = takeWindow(this.userWindow, context.voterId, MINUTE_MS, nowMs);
    if (userEvents.length >= this.config.userRatePerMinute) {
      return this.makeViolation('USER_RATE_LIMIT_EXCEEDED', {
        voterId: context.voterId,
        currentRate: userEvents.length,
        userRatePerMinute: this.config.userRatePerMinute,
        evaluatedAt: now.toISOString(),
      });
    }

    if (context.channelId) {
      const channelEvents = takeWindow(this.channelWindow, context.channelId, MINUTE_MS, nowMs);
      if (channelEvents.length >= this.config.channelRatePerMinute) {
        return this.makeViolation('CHANNEL_RATE_LIMIT_EXCEEDED', {
          channelId: context.channelId,
          currentRate: channelEvents.length,
          channelRatePerMinute: this.config.channelRatePerMinute,
          evaluatedAt: now.toISOString(),
        });
      }
    }

    if (this.config.pairCooldownSeconds > 0) {
      const pairKey = `${context.voterId}:${context.targetType}:${context.targetId}`;
      const lastVoteAt = this.pairLastSeen.get(pairKey);
      if (lastVoteAt) {
        const cooldownMs = this.config.pairCooldownSeconds * 1000;
        const elapsedMs = nowMs - lastVoteAt;
        if (elapsedMs < cooldownMs) {
          return this.makeViolation('PAIR_COOLDOWN_ACTIVE', {
            voterId: context.voterId,
            targetId: context.targetId,
            targetType: context.targetType,
            remainingSeconds: Math.ceil((cooldownMs - elapsedMs) / 1000),
            pairCooldownSeconds: this.config.pairCooldownSeconds,
            evaluatedAt: now.toISOString(),
          });
        }
      }
    }

    if (context.action === '--' && this.config.dailyDownvoteLimit >= 0) {
      const dayKey = `${context.voterId}:${toDateKey(now)}`;
      const currentCount = this.dailyDownvotes.get(dayKey) ?? 0;
      if (currentCount >= this.config.dailyDownvoteLimit) {
        return this.makeViolation('DAILY_DOWNVOTE_LIMIT_EXCEEDED', {
          voterId: context.voterId,
          currentCount,
          dailyDownvoteLimit: this.config.dailyDownvoteLimit,
          evaluatedAt: now.toISOString(),
        });
      }
    }

    return { allowed: true, wouldBlock: false };
  }

  reserveVote(context: AbuseVoteContext): AbuseDecisionWithReservation {
    const now = context.now ?? new Date();
    const decision = this.evaluateVote({ ...context, now });
    if (!decision.allowed) {
      return decision;
    }

    const nowMs = now.getTime();
    const reservation: AbuseVoteReservation = {
      voterId: context.voterId,
      channelId: context.channelId,
      eventAtMs: nowMs,
    };

    pushWindow(this.userWindow, context.voterId, nowMs, MINUTE_MS);

    if (context.channelId) {
      pushWindow(this.channelWindow, context.channelId, nowMs, MINUTE_MS);
    }

    if (this.config.pairCooldownSeconds > 0) {
      const pairKey = `${context.voterId}:${context.targetType}:${context.targetId}`;
      reservation.pairKey = pairKey;
      reservation.previousPairLastSeen = this.pairLastSeen.get(pairKey);
      this.pairLastSeen.set(pairKey, nowMs);
    }

    if (context.action === '--') {
      const dayKey = `${context.voterId}:${toDateKey(now)}`;
      reservation.dayKey = dayKey;
      const current = this.dailyDownvotes.get(dayKey) ?? 0;
      this.dailyDownvotes.set(dayKey, current + 1);
    }

    return {
      ...decision,
      reservation,
    };
  }

  releaseReservedVote(reservation: AbuseVoteReservation): void {
    removeWindowEvent(this.userWindow, reservation.voterId, reservation.eventAtMs);

    if (reservation.channelId) {
      removeWindowEvent(this.channelWindow, reservation.channelId, reservation.eventAtMs);
    }

    if (reservation.pairKey) {
      if (reservation.previousPairLastSeen === undefined) {
        this.pairLastSeen.delete(reservation.pairKey);
      } else {
        this.pairLastSeen.set(reservation.pairKey, reservation.previousPairLastSeen);
      }
    }

    if (reservation.dayKey) {
      const current = this.dailyDownvotes.get(reservation.dayKey) ?? 0;
      if (current <= 1) {
        this.dailyDownvotes.delete(reservation.dayKey);
      } else {
        this.dailyDownvotes.set(reservation.dayKey, current - 1);
      }
    }
  }

  registerAcceptedVote(context: AbuseVoteContext): void {
    const now = context.now ?? new Date();
    const nowMs = now.getTime();
    this.maybePrune(now);

    pushWindow(this.userWindow, context.voterId, nowMs, MINUTE_MS);

    if (context.channelId) {
      pushWindow(this.channelWindow, context.channelId, nowMs, MINUTE_MS);
    }

    if (this.config.pairCooldownSeconds > 0) {
      const pairKey = `${context.voterId}:${context.targetType}:${context.targetId}`;
      this.pairLastSeen.set(pairKey, nowMs);
    }

    if (context.action === '--') {
      const dayKey = `${context.voterId}:${toDateKey(now)}`;
      const current = this.dailyDownvotes.get(dayKey) ?? 0;
      this.dailyDownvotes.set(dayKey, current + 1);
    }
  }

  private makeViolation(
    reasonCode: AbuseReasonCode,
    details: Record<string, unknown>
  ): AbuseDecision {
    const reasonMessage = this.getReasonMessage(reasonCode);
    if (this.config.enforcementMode === 'monitor') {
      return {
        allowed: true,
        wouldBlock: true,
        reasonCode,
        reasonMessage,
        details,
      };
    }
    return {
      allowed: false,
      wouldBlock: true,
      reasonCode,
      reasonMessage,
      details,
    };
  }

  private getReasonMessage(reasonCode: AbuseReasonCode): string {
    switch (reasonCode) {
      case 'CHANNEL_NOT_ALLOWED':
        return 'Voting is not enabled in this channel.';
      case 'MESSAGE_TARGET_LIMIT_EXCEEDED':
        return `Too many votes in one message. Max ${this.config.maxTargetsPerMessage}.`;
      case 'USER_RATE_LIMIT_EXCEEDED':
        return 'You are voting too fast. Please wait a minute.';
      case 'CHANNEL_RATE_LIMIT_EXCEEDED':
        return 'This channel is voting too fast right now. Try again shortly.';
      case 'PAIR_COOLDOWN_ACTIVE':
        return 'You recently voted for this target. Please wait before voting again.';
      case 'DAILY_DOWNVOTE_LIMIT_EXCEEDED':
        return 'You reached the daily downvote limit.';
      default:
        return 'Vote blocked by abuse controls.';
    }
  }

  private maybePrune(now: Date): void {
    const nowMs = now.getTime();
    if (
      this.lastPruneAt !== 0 &&
      nowMs >= this.lastPruneAt &&
      nowMs - this.lastPruneAt < PRUNE_INTERVAL_MS
    ) {
      return;
    }

    this.lastPruneAt = nowMs;
    pruneWindowMap(this.userWindow, MINUTE_MS, nowMs);
    pruneWindowMap(this.channelWindow, MINUTE_MS, nowMs);
    this.prunePairState(nowMs);
    this.pruneDailyDownvotes(nowMs);
  }

  private prunePairState(nowMs: number): void {
    if (this.pairLastSeen.size === 0) {
      return;
    }
    if (this.config.pairCooldownSeconds <= 0) {
      this.pairLastSeen.clear();
      return;
    }

    const cutoff = nowMs - this.config.pairCooldownSeconds * 1000;
    for (const [key, lastSeen] of this.pairLastSeen.entries()) {
      if (lastSeen < cutoff) {
        this.pairLastSeen.delete(key);
      }
    }
  }

  private pruneDailyDownvotes(nowMs: number): void {
    if (this.dailyDownvotes.size === 0) {
      return;
    }
    const currentDayStartMs = Math.floor(nowMs / DAY_MS) * DAY_MS;
    for (const key of this.dailyDownvotes.keys()) {
      const separator = key.lastIndexOf(':');
      const datePart = separator >= 0 ? key.slice(separator + 1) : '';
      const dayStartMs = Date.parse(`${datePart}T00:00:00.000Z`);
      if (!Number.isFinite(dayStartMs) || dayStartMs < currentDayStartMs) {
        this.dailyDownvotes.delete(key);
      }
    }
  }
}

export function createAbuseController(env: NodeJS.ProcessEnv = process.env): AbuseController {
  return new AbuseController(getAbuseControlsConfig(env));
}
