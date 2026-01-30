// Global teardown to close all pg/pg-mem pools and eliminate open handles
module.exports = async () => {
  try {
    const g = globalThis;
    const pools = (g.__ALL_POOLS__ || []).slice();
    const closed = new Set();
    await Promise.all(
      pools.map(async (p) => {
        if (p && typeof p.end === 'function' && !closed.has(p)) {
          closed.add(p);
          try {
            await p.end();
          } catch (e) {
            /* ignore */
          }
        }
      })
    );
  } catch (e) {
    // swallow teardown errors
  }
};
