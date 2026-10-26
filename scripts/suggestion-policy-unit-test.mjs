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
assert.equal(policy.groundedBreakdown('Bake protein bars', ['Mix ingredients', 'Bake protein bars']), false);
assert.equal(policy.groundedBreakdown('Bake protein bars for the picnic on Sunday', ['Buy ingredients', 'Bake bars']), false);
assert.equal(policy.groundedBreakdown('Buy milk and eggs', ['Buy milk', 'Eggs']), false);
assert.equal(policy.groundedBreakdown('Write the draft and add examples', ['Write the draft', 'Add examples']), true);
assert.equal(policy.groundedBreakdown('Write the draft and add examples', ['Write the draft', 'Add invented examples']), false);
assert.equal(policy.groundedBreakdown('Book flights, reserve hotel, and email Gaia', ['Book flights', 'Reserve hotel', 'Email Gaia']), true);
assert.equal(policy.groundedBreakdown('docs: Write the outline and fill in the details', ['Write the outline', 'Fill in the details']), true);

// Confirmed eligibility omissions, plus source-index responses that cannot rewrite tasks.
assert.equal(policy.groundedBreakdown('Install the shelves and paint the wall',['Install the shelves','Paint the wall']),true);
assert.equal(policy.groundedBreakdown('Translate the document and send it',['Translate the document','Send it']),true);
const indexed={action_indices:[0,1]};
assert.deepEqual(Array.from(policy.resolveBreakdown('work: Install  the shelves and paint the wall.',indexed)),['Install  the shelves','paint the wall.']);
assert.deepEqual(Array.from(policy.resolveBreakdown('Scan the contract, sign it, and send it',{action_indices:[0,1,2]})),['Scan the contract','sign it','send it']);
for(const task of ['Bake protein bars','Buy milk and fresh eggs','Prepare the annual exhibition','Call Research and Development','Call Sam and Lee']) {
  assert.equal(policy.resolveBreakdown(task,indexed),null,task);
}
for(const indexes of [[1,0],[0,0],[0],[0,1,2],[-1,0],[0,2],[0,1.1],['0',1],Array(2),null]) {
  assert.equal(policy.resolveBreakdown('Install shelves and paint wall',{action_indices:indexes}),null,JSON.stringify(indexes));
}
assert.equal(policy.resolveBreakdown('Install shelves and paint wall',{...indexed,subtasks:['Buy supplies','Clean brushes']}),null,'Mixed protocols cannot smuggle extra steps');
assert.equal(policy.groundedBreakdown('Write the draft and add examples',Array(2)),false,'Missing text is not source evidence');
assert.equal(policy.resolveBreakdown('Write the draft and add examples',{subtasks:['Compose a draft','Include examples']}),null,'Legacy paraphrases remain untrusted');
assert.deepEqual(Array.from(policy.resolveBreakdown('Write the draft and add examples',{subtasks:['Write the draft','Add examples']})),['Write the draft','add examples']);
const failures = Array.from({ length: 4 }, (_, i) => ({
  id: String(i), reason: 'vague_task', ignoredAt: `2026-09-0${i + 1}`,
}));
assert.equal(policy.stats(failures, 'vague_task').underperforming, true);
const exploration = Array.from({ length: 20 }, (_, i) => policy.shouldOffer(failures, 'vague_task', `task-${i}`));
assert.ok(exploration.some(Boolean) && exploration.some(value => !value));
assert.match(policy.performanceContext(failures), /use rarely/);

console.log('  ✓ suggestion reasons are deterministic');
console.log('  ✓ splits require 2–3 explicit, verb-led actions copied from the task');
console.log('  ✓ repeated failures reduce offers while retaining exploration');
console.log('✓ SUGGESTION POLICY UNIT TEST PASSED');
