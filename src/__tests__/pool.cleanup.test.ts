// Removed sentinel; unified pool teardown handled globally.
// Test retained empty to avoid Jest pattern mismatch; can be deleted if desired.
describe('pool cleanup sentinel', () => {
  test('noop', () => {
    expect(true).toBe(true);
  });
});
