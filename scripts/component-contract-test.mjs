// Component-boundary regression guard: script ownership, delegated actions, and globals.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const index = readFileSync(join(ROOT, 'index.html'), 'utf8');
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const scriptPaths = [...index.matchAll(/<script\s+src=["']\/?([^"']+)["'][^>]*><\/script>/g)]
  .map(match => match[1])
  .filter(path => path.startsWith('assets/'));
const sources = new Map([
  ['index.html', index],
  ...scriptPaths.map(path => [path, readFileSync(join(ROOT, path), 'utf8')]),
]);

assert.equal(scriptPaths[0], 'assets/runtime.js', 'component runtime must load before owned modules');
assert.match(sw, /['"]\/assets\/runtime\.js['"]/, 'component runtime must be precached');

const inlineHandler = /\son(?:click|change|input|keydown|keyup|pointerdown|pointerup|focus|blur|submit)\s*=/i;
for (const [path, source] of sources) {
  assert.doesNotMatch(source, inlineHandler, `${path} must not contain inline event handlers`);
}

const declaredActions = new Set();
const registeredActions = new Set();
for (const source of sources.values()) {
  for (const match of source.matchAll(/data-today-([a-z]+)=["']([^"']+)["']/g)) {
    declaredActions.add(`${match[1]}:${match[2]}`);
  }
  for (const match of source.matchAll(/Today\.ui\.register\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g)) {
    registeredActions.add(`${match[1]}:${match[2]}`);
  }
}

assert.deepEqual(
  [...declaredActions].filter(action => !registeredActions.has(action)).sort(),
  [],
  'every declared UI action must have a component-owned registration',
);
assert.deepEqual(
  [...registeredActions].filter(action => !declaredActions.has(action)).sort(),
  [],
  'every registered UI action must be reachable from owned markup',
);

const globalAssignments = [];
const globalOwners = new Map();
// Explicit transitional shims: startup/restore can call these before the owning
// component has started. Keep the list finite; remove entries as APIs move to Today.
const duplicateOwnerShims = new Set([
  '_dateTagRefresh',
  '_clearAllDone',
  '_focusReanchor',
  '_nudgeOnNewDay',
  '_getTrelloFocusTotal',
  '_getTrelloFirstSeen',
  '_triageResetAutoClose',
]);
for (const [path, source] of sources) {
  for (const match of source.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) {
    globalAssignments.push(`${path}:${match[1]}`);
    if (!globalOwners.has(match[1])) globalOwners.set(match[1], new Set());
    globalOwners.get(match[1]).add(path);
  }
}
const duplicateOwners = [...globalOwners]
  .filter(([name, owners]) => owners.size > 1 && !duplicateOwnerShims.has(name))
  .map(([name, owners]) => `${name}: ${[...owners].join(', ')}`);

assert.deepEqual(duplicateOwners, [], 'a global compatibility export may have only one owning module');
assert.ok(
  globalAssignments.length <= 123,
  `global compatibility surface grew to ${globalAssignments.length}; migrate through Today.define/use instead`,
);

console.log(`  ✓ ${declaredActions.size} delegated UI actions have one component registration`);
console.log(`  ✓ no inline event handlers across ${sources.size} runtime sources`);
console.log(`  ✓ ${globalAssignments.length} compatibility assignments have single owners`);
console.log('✓ COMPONENT CONTRACT TEST PASSED');
