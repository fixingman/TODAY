import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
context.window.window = context.window;
context.window.Today = { define(_name, api) { context.api = api; } };
vm.runInNewContext(readFileSync(new URL('../assets/suggestion-policy.js', import.meta.url), 'utf8'), context);
const policy = context.api;

assert.equal(policy.reason({ type: 'clarify' }, 'Do this'), 'vague_task');
assert.equal(policy.reason({}, 'Email Sam and book a room'), 'multiple_actions');
assert.equal(policy.normalizeTaskText('work:  Call  the dentist '), 'call the dentist');

const failures = Array.from({ length: 4 }, (_, i) => ({
  id: String(i), reason: 'vague_task', ignoredAt: `2026-09-0${i + 1}`,
}));
assert.equal(policy.stats(failures, 'vague_task').underperforming, true);
const exploration = Array.from({ length: 20 }, (_, i) => policy.shouldOffer(failures, 'vague_task', `task-${i}`));
assert.ok(exploration.some(Boolean) && exploration.some(value => !value));
assert.match(policy.performanceContext(failures), /use rarely/);

console.log('  ✓ suggestion reasons are deterministic');
console.log('  ✓ repeated failures reduce offers while retaining exploration');
console.log('✓ SUGGESTION POLICY UNIT TEST PASSED');
