// error-monitor unit test — window.onerror triage, run against the real file in a VM.
// Pins BUG-119: a source-less cross-origin "Script error." (:0:0) never lights the red dot;
// a real same-origin error still does.
// Run: node scripts/error-monitor-unit-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const store = new Map();
const el = () => ({ classList: { add() {}, remove() {}, toggle() {} }, style: {}, dataset: {}, setAttribute() {}, removeAttribute() {}, hidden: true });
const context = {
  console: { warn() {}, error() {}, log() {} },
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  document: { getElementById: () => el(), addEventListener() {} },
  navigator: { onLine: true },
  location: { hostname: 'today-here.netlify.app' },
  setTimeout: () => 0, clearTimeout() {},
};
context.window = context;
context.addEventListener = () => {};
const ctx = vm.createContext(context);
vm.runInContext(readFileSync(new URL('../assets/error-monitor.js', import.meta.url), 'utf8'), ctx);
// Top-level const/function declarations live in the script scope; read them from inside it.
const log = () => vm.runInContext('_errorLog', ctx);
const before = log().length;
context.window.onerror('Script error.', '', 0, 0, null);
assert.equal(log().length, before, 'source-less cross-origin "Script error." is not logged');
context.window.onerror('Script error', undefined, undefined, undefined, null);
assert.equal(log().length, before, 'variant without a full stop is not logged either');
console.log('  ✓ "Script error." at :0:0 stays off the red dot');

context.window.onerror('TypeError: x is undefined', 'https://today-here.netlify.app/assets/nudge.js', 120, 9, null);
assert.equal(log().length, before + 1, 'a real same-origin error is logged');
assert.match(log().at(-1), /nudge\.js:120:9/);
context.window.onerror('Script error.', 'https://today-here.netlify.app/assets/nudge.js', 5, 1, null);
assert.equal(log().length, before + 2, 'a "Script error." that names a file and line is still logged');
console.log('  ✓ real errors with a source still reach the red dot');

console.log('\nerror-monitor unit tests passed.');
