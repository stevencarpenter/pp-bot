import { pool } from '../db';
import { recordMessageIfNew, recordMessageIfNewByKey } from '../storage/database';
import { resolveMessageDedupeKey } from '../utils/dedupe';
import { ensureSchema } from './helpers/schema';

describe('event-id dedupe behavior', () => {
  beforeAll(async () => {
    await ensureSchema();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM message_dedupe');
  });

  test('same event_id dedupe key is only processed once', async () => {
    const dedupeKey = resolveMessageDedupeKey({
      eventId: 'Ev123',
      channelId: 'C1',
      messageTs: '1.1',
    });
    expect(dedupeKey).toBe('event:Ev123');

    const first = await recordMessageIfNewByKey(dedupeKey!, { channelId: 'C1', messageTs: '1.1' });
    const second = await recordMessageIfNewByKey(dedupeKey!, { channelId: 'C1', messageTs: '1.1' });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  test('missing event_id and channel/ts yields null dedupe key', () => {
    const dedupeKey = resolveMessageDedupeKey({});
    expect(dedupeKey).toBeNull();
  });

  test('falls back to channel:ts dedupe key', async () => {
    const dedupeKey = resolveMessageDedupeKey({ channelId: 'C2', messageTs: '999.000' });
    expect(dedupeKey).toBe('msg:C2:999.000');

    const first = await recordMessageIfNew('C2', '999.000');
    const second = await recordMessageIfNew('C2', '999.000');

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
