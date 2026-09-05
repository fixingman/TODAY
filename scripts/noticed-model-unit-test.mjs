import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
context.window.window = context.window;
context.window.Today = { define(_name, api) { context.api = api; } };
vm.runInNewContext(readFileSync(new URL('../assets/noticed-model.js', import.meta.url), 'utf8'), context);
const model = context.api;

assert.equal(model.seasonMoments.length, 24);
assert.match(model.seasonMomentForDate('2026-06-21', false).term, /Summer Solstice/);
assert.match(model.seasonMomentForDate('2026-06-21', true).term, /Winter Solstice/);
assert.equal(model.seasonMomentForDate('2026-06-20', false), null);
assert.equal(model.habitMilestone(14), 14);
assert.equal(model.habitMilestone(127), 100);
assert.equal(model.focusMilestone(250), 200);
assert.equal(model.formatHour(14), '2pm');

console.log('  ✓ 24 solar terms map to local hemispheres');
console.log('  ✓ habit/focus thresholds and hour labels are deterministic');
console.log('✓ NOTICED MODEL UNIT TEST PASSED');
