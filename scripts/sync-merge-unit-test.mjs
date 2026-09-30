import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
context.window.window = context.window;
context.window.Today = {
  define(name, api) { context.apiName = name; context.api = api; },
};
vm.runInNewContext(readFileSync(new URL('../assets/sync-merge.js', import.meta.url), 'utf8'), context);

assert.equal(context.apiName, 'sync-merge');
const { mergeDailyHistory, mergeSuggestionOutcomes, mergeDreamIndex } = context.api;

const days = mergeDailyHistory(
  [{ date: '2026-09-01', tasksDone: 2, tasksAdded: 99, focusMins: 10 }],
  [
    { date: '2026-09-01', tasksDone: 3, tasksAdded: 4, tasksAddedFixed: true, focusMins: 5 },
    { date: '2026-09-02', tasksDone: 1, tasksAdded: 2 },
  ],
  value => Math.min(Number(value) || 0, 20),
);
assert.equal(days.length, 2);
assert.deepEqual(JSON.parse(JSON.stringify(days[0])), {
  date: '2026-09-01', tasksDone: 3, tasksAdded: 4, focusMins: 10,
  habitsKept: 0, habitsTotal: 0, tasksAddedFixed: true,
});

const outcomes = mergeSuggestionOutcomes(
  [{ id: 'a', offeredAt: '2026-09-01', appliedAt: '2026-09-02', outcome: 'applied', resultTaskIds: ['one'] }],
  [
    { id: 'a', offeredAt: '2026-09-01', helpedAt: '2026-09-03', updatedAt: '2026-09-03', resultTaskIds: ['two'] },
    { id: 'b', offeredAt: '2026-09-04', ignoredAt: '2026-09-04', outcome: 'ignored' },
  ],
);
assert.equal(outcomes[0].id, 'b');
assert.equal(outcomes[1].outcome, 'helped');
assert.deepEqual([...outcomes[1].resultTaskIds].sort(), ['one', 'two']);

console.log('  ✓ daily history max/fixed-field merge is deterministic');
console.log('  ✓ suggestion outcome merge preserves monotonic evidence');
const dreams = mergeDreamIndex(
  [{ id: 'a', recordedAt: '2026-09-20T07:00:00Z', updatedAt: '2026-09-20T08:00:00Z', images: ['door'] },
   { id: 'old', recordedAt: '2026-09-01T07:00:00Z', updatedAt: '2026-09-01T07:00:00Z' }],
  [{ id: 'a', deleted: true, recordedAt: '2026-09-20T07:00:00Z', updatedAt: '2026-09-21T08:00:00Z' },
   { id: 'b', recordedAt: '2026-09-22T07:00:00Z', updatedAt: '2026-09-22T07:00:00Z', night: '2026-08-01' },
   { id: 'a', recordedAt: '2026-09-20T07:00:00Z', updatedAt: '2026-09-19T08:00:00Z', images: ['stale'] }],
  '2026-09-10T00:00:00Z',
);
assert.deepEqual(JSON.parse(JSON.stringify(dreams.map(r => r.id))), ['a', 'b']);
assert.equal(dreams[0].deleted, true, 'newer tombstone beats the older live copy');
assert.equal(dreams[1].night, '2026-08-01', 'clear compares recordedAt, not the dream night');
console.log('  ✓ dream index merges by id, latest wins, tombstones and clear watermark honoured');

console.log('✓ SYNC MERGE UNIT TEST PASSED');
