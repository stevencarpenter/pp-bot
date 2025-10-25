// Ensure all pg / pg-mem pools are closed before Jest checks for open handles.
afterAll(async () => {
    try {
        const g = globalThis;
        const pools = (g.__ALL_POOLS__ || []).slice();
        const closed = new Set();
        for (const p of pools) {
            if (p && typeof p.end === 'function' && !closed.has(p)) {
                closed.add(p);
                try {
                    await p.end();
                } catch { /* ignore */
                }
            }
        }
        if (Array.isArray(g.__ALL_POOLS__)) g.__ALL_POOLS__.length = 0;
        // Allow pending pg internal timers to settle
        await new Promise(r => setImmediate(r));
    } catch (e) {
        // ignore
    }
});
