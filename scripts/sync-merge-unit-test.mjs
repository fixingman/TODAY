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
const { mergeDailyHistory, mergeSuggestionOutcomes } = context.api;

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
console.log('✓ SYNC MERGE UNIT TEST PASSED');
