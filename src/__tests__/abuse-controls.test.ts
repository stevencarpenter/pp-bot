import {
  AbuseController,
  type AbuseControlsConfig,
  getAbuseControlsConfig,
} from '../security/abuse-controls';

function createConfig(overrides: Partial<AbuseControlsConfig> = {}): AbuseControlsConfig {
  return {
    maxTargetsPerMessage: 5,
    userRatePerMinute: 3,
    channelRatePerMinute: 4,
    pairCooldownSeconds: 300,
    dailyDownvoteLimit: 2,
    allowedChannelIds: null,
    enforcementMode: 'enforce',
    ...overrides,
  };
}

describe('abuse controls', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('blocks messages with too many targets', () => {
    const controller = new AbuseController(createConfig({ maxTargetsPerMessage: 2 }));

    const decision = controller.evaluateMessage({
      voterId: 'U1',
      channelId: 'C1',
      targetsInMessage: 3,
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('MESSAGE_TARGET_LIMIT_EXCEEDED');
  });

  test('supports channel allowlist enforcement', () => {
    const controller = new AbuseController(
      createConfig({ allowedChannelIds: new Set(['C_ALLOWED']) })
    );

    const blocked = controller.evaluateMessage({
      voterId: 'U1',
      channelId: 'C_BLOCKED',
      targetsInMessage: 1,
    });
    const allowed = controller.evaluateMessage({
      voterId: 'U1',
      channelId: 'C_ALLOWED',
      targetsInMessage: 1,
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.reasonCode).toBe('CHANNEL_NOT_ALLOWED');
    expect(allowed.allowed).toBe(true);
  });

  test('enforces per-user and per-channel rate limits', () => {
    const controller = new AbuseController(
      createConfig({ userRatePerMinute: 2, channelRatePerMinute: 2 })
    );
    const baseTime = new Date('2026-01-01T00:00:00.000Z');

    controller.registerAcceptedVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U2',
      targetType: 'user',
      action: '++',
      now: baseTime,
    });
    controller.registerAcceptedVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U3',
      targetType: 'user',
      action: '++',
      now: baseTime,
    });

    const userRateDecision = controller.evaluateVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U4',
      targetType: 'user',
      action: '++',
      now: new Date('2026-01-01T00:00:30.000Z'),
    });
    expect(userRateDecision.allowed).toBe(false);
    expect(userRateDecision.reasonCode).toBe('USER_RATE_LIMIT_EXCEEDED');

    const channelController = new AbuseController(
      createConfig({ userRatePerMinute: 99, channelRatePerMinute: 1 })
    );
    channelController.registerAcceptedVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U2',
      targetType: 'user',
      action: '++',
      now: baseTime,
    });

    const channelRateDecision = channelController.evaluateVote({
      voterId: 'U2',
      channelId: 'C1',
      targetId: 'U3',
      targetType: 'user',
      action: '++',
      now: new Date('2026-01-01T00:00:30.000Z'),
    });
    expect(channelRateDecision.allowed).toBe(false);
    expect(channelRateDecision.reasonCode).toBe('CHANNEL_RATE_LIMIT_EXCEEDED');
  });

  test('reserveVote enforces rate limits atomically', () => {
    const controller = new AbuseController(
      createConfig({ userRatePerMinute: 1, channelRatePerMinute: 10 })
    );
    const baseTime = new Date('2026-01-01T00:00:00.000Z');

    const first = controller.reserveVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U2',
      targetType: 'user',
      action: '++',
      now: baseTime,
    });
    const second = controller.reserveVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U3',
      targetType: 'user',
      action: '++',
      now: new Date('2026-01-01T00:00:05.000Z'),
    });

    expect(first.allowed).toBe(true);
    expect(first.reservation).toBeDefined();
    expect(second.allowed).toBe(false);
    expect(second.reasonCode).toBe('USER_RATE_LIMIT_EXCEEDED');
  });

  test('releaseReservedVote rolls back state for failed persistence', () => {
    const controller = new AbuseController(
      createConfig({ userRatePerMinute: 1, channelRatePerMinute: 10 })
    );
    const baseTime = new Date('2026-01-01T00:00:00.000Z');

    const first = controller.reserveVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U2',
      targetType: 'user',
      action: '--',
      now: baseTime,
    });
    expect(first.allowed).toBe(true);
    expect(first.reservation).toBeDefined();

    controller.releaseReservedVote(first.reservation!);

    const second = controller.reserveVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U3',
      targetType: 'user',
      action: '++',
      now: new Date('2026-01-01T00:00:05.000Z'),
    });
    expect(second.allowed).toBe(true);
  });

  test('enforces pair cooldown and downvote daily budget', () => {
    const controller = new AbuseController(
      createConfig({ pairCooldownSeconds: 60, dailyDownvoteLimit: 1 })
    );
    const baseTime = new Date('2026-01-01T00:00:00.000Z');

    controller.registerAcceptedVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U2',
      targetType: 'user',
      action: '--',
      now: baseTime,
    });

    const cooldownDecision = controller.evaluateVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U2',
      targetType: 'user',
      action: '++',
      now: new Date('2026-01-01T00:00:20.000Z'),
    });
    expect(cooldownDecision.allowed).toBe(false);
    expect(cooldownDecision.reasonCode).toBe('PAIR_COOLDOWN_ACTIVE');

    const downvoteLimitDecision = controller.evaluateVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U3',
      targetType: 'user',
      action: '--',
      now: new Date('2026-01-01T01:00:00.000Z'),
    });
    expect(downvoteLimitDecision.allowed).toBe(false);
    expect(downvoteLimitDecision.reasonCode).toBe('DAILY_DOWNVOTE_LIMIT_EXCEEDED');

    const nextDayDecision = controller.evaluateVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U3',
      targetType: 'user',
      action: '--',
      now: new Date('2026-01-02T01:00:00.000Z'),
    });
    expect(nextDayDecision.allowed).toBe(true);
  });

  test('monitor mode reports violations without blocking', () => {
    const controller = new AbuseController(
      createConfig({ enforcementMode: 'monitor', userRatePerMinute: 1 })
    );

    controller.registerAcceptedVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U2',
      targetType: 'user',
      action: '++',
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    const decision = controller.evaluateVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U3',
      targetType: 'user',
      action: '++',
      now: new Date('2026-01-01T00:00:30.000Z'),
    });

    expect(decision.allowed).toBe(true);
    expect(decision.wouldBlock).toBe(true);
    expect(decision.reasonCode).toBe('USER_RATE_LIMIT_EXCEEDED');
  });

  test('prunes stale in-memory state during evaluation', () => {
    const controller = new AbuseController(
      createConfig({
        userRatePerMinute: 100,
        channelRatePerMinute: 100,
        pairCooldownSeconds: 60,
        dailyDownvoteLimit: 5,
      })
    );

    const stale = new Date('2026-01-01T00:00:00.000Z');
    controller.registerAcceptedVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U2',
      targetType: 'user',
      action: '--',
      now: stale,
    });
    controller.registerAcceptedVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U3',
      targetType: 'user',
      action: '++',
      now: stale,
    });

    expect((controller as any).pairLastSeen.size).toBeGreaterThan(0);
    expect((controller as any).dailyDownvotes.size).toBeGreaterThan(0);
    expect((controller as any).userWindow.size).toBeGreaterThan(0);
    expect((controller as any).channelWindow.size).toBeGreaterThan(0);

    const decision = controller.evaluateVote({
      voterId: 'U1',
      channelId: 'C1',
      targetId: 'U4',
      targetType: 'user',
      action: '++',
      now: new Date('2026-01-03T00:00:00.000Z'),
    });
    expect(decision.allowed).toBe(true);
    expect((controller as any).pairLastSeen.size).toBe(0);
    expect((controller as any).dailyDownvotes.size).toBe(0);
    expect((controller as any).userWindow.size).toBe(0);
    expect((controller as any).channelWindow.size).toBe(0);
  });

  test('parses env config and rejects invalid values', () => {
    process.env.ABUSE_ENFORCEMENT_MODE = 'monitor';
    process.env.VOTE_ALLOWED_CHANNEL_IDS = 'C1,C2';
    process.env.VOTE_MAX_TARGETS_PER_MESSAGE = '7';

    const config = getAbuseControlsConfig();
    expect(config.enforcementMode).toBe('monitor');
    expect(config.maxTargetsPerMessage).toBe(7);
    expect(config.allowedChannelIds?.has('C1')).toBe(true);

    process.env.ABUSE_ENFORCEMENT_MODE = 'invalid';
    expect(() => getAbuseControlsConfig()).toThrow('Invalid ABUSE_ENFORCEMENT_MODE');

    process.env.ABUSE_ENFORCEMENT_MODE = 'enforce';
    process.env.VOTE_RATE_USER_PER_MIN = '0';
    expect(() => getAbuseControlsConfig()).toThrow('Invalid VOTE_RATE_USER_PER_MIN');
  });
});
