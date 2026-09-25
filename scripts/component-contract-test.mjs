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
  for (const match of source.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) {
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
  globalAssignments.length <= 121,
  `global compatibility surface grew to ${globalAssignments.length}; migrate through Today.define/use instead`,
);

// A `typeof _x === 'function'` guard must name something reachable from where it
// runs: declared in the same file (closure-scoped) or published as a property
// (window._x = / root._x =). Guards on names that moved into Today modules are
// always false, so the feature silently does nothing (BUG-105, BUG-106).
const allSources = [...sources.values()].join('\n');
const staleGuards = [];
let guardCount = 0;
for (const [path, source] of sources) {
  for (const match of source.matchAll(/typeof\s+(_[A-Za-z0-9_]+)\s*===\s*['"]function['"]/g)) {
    guardCount++;
    const name = match[1];
    const local = new RegExp(`function\\s+${name}\\b|(?:const|let|var)\\s+${name}\\s*=`).test(source);
    const published = new RegExp(`\\.${name}\\s*=[^=]|^function\\s+${name}\\b`, 'm').test(allSources);
    if (!local && !published) staleGuards.push(`${path}:${source.slice(0, match.index).split('\n').length} ${name}`);
  }
}
assert.deepEqual(staleGuards, [], 'typeof function guards must name a same-file or published function');

console.log(`  ✓ ${declaredActions.size} delegated UI actions have one component registration`);
console.log(`  ✓ no inline event handlers across ${sources.size} runtime sources`);
console.log(`  ✓ ${globalAssignments.length} compatibility assignments have single owners`);
console.log(`  ✓ ${guardCount} typeof-function guards name reachable functions`);
console.log('✓ COMPONENT CONTRACT TEST PASSED');
