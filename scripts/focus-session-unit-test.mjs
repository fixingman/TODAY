import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
context.window.window = context.window;
context.window.Today = { define(_name, api) { context.api = api; } };
vm.runInNewContext(readFileSync(new URL('../assets/focus-session.js', import.meta.url), 'utf8'), context);
const session = context.api;

assert.deepEqual(JSON.parse(JSON.stringify(session.create(1500))), {
  rem: 1500, running: false, paused: false, wallStart: null, tracked: false,
});
assert.equal(session.restore({ taskId: 'one', rem: 120, savedAt: 1000, paused: false }, 31000).rem, 90);
assert.equal(session.restore({ taskId: 'one', rem: 120, savedAt: 1000, paused: true }, 31000).rem, 120);
assert.equal(session.restore({ taskId: 'one', rem: 10, savedAt: 1000, paused: false }, 31000).rem, 0);
assert.equal(session.wallElapsed({ wallStart: 1000 }, 5600), 4);
assert.deepEqual(JSON.parse(JSON.stringify(session.serialize('one', { rem: 75, paused: true }, 9000))), {
  taskId: 'one', rem: 75, savedAt: 9000, paused: true,
});

console.log('  ✓ focus state creation and persistence are deterministic');
console.log('  ✓ reload and wall-clock correction respect pause state');
console.log('✓ FOCUS SESSION UNIT TEST PASSED');
