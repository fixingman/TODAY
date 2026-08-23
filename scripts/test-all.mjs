// Run every local *-test.mjs suite except explicitly credentialed live tests.
// Usage: node scripts/test-all.mjs
import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DIR = dirname(fileURLToPath(import.meta.url));

const SUITE = [
  'smoke-test',
  'accessibility-test',
  'splash-test',
  'platform-test',
  'connections-test',
  'trello-test',
  'dropbox-test',
  'zones-test',
  'task-actions-test',
  'task-bounce-test',
  'assistant-test',
  'nudge-test',
  'habits-test',
  'triage-test',
  'meeting-test',
  'memory-panel-test',
  'week-reflection-unit-test',
  'about-test',
  'reflections-test',
  'day-lifecycle-test',
  'drag-test',
  'focus-test',
  'insights-test',
];

const EXCLUDED = new Set([
  'ai-test', // Requires ANTHROPIC_API_KEY and makes real provider calls.
]);

function verifySuiteInventory() {
  const discovered = readdirSync(DIR)
    .filter(file => file.endsWith('-test.mjs'))
    .map(file => file.slice(0, -'.mjs'.length))
    .filter(name => !EXCLUDED.has(name));
  const configured = new Set(SUITE);
  const duplicates = SUITE.filter((name, index) => SUITE.indexOf(name) !== index);
  const missing = discovered.filter(name => !configured.has(name)).sort();
  const stale = SUITE.filter(name => !discovered.includes(name)).sort();

  if (!duplicates.length && !missing.length && !stale.length) return;

  console.error('\nTest-suite inventory mismatch:');
  if (missing.length) console.error(`  Missing from SUITE: ${missing.join(', ')}`);
  if (stale.length) console.error(`  Listed but not found: ${stale.join(', ')}`);
  if (duplicates.length) console.error(`  Listed more than once: ${[...new Set(duplicates)].join(', ')}`);
  console.error('  Add every local *-test.mjs file or explicitly exclude it with a reason.\n');
  process.exit(1);
}

verifySuiteInventory();

let passed = 0;
let flaky = 0;
let failed = 0;
const flakes = [];
const failures = [];

function runSuite(name) {
  return spawnSync(process.execPath, [join(DIR, `${name}.mjs`)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

function failureDetail(result) {
  return (result.stderr || result.stdout || '')
    .trim()
    .split('\n')
    .slice(-6)
    .join('\n');
}

for (const name of SUITE) {
  const first = runSuite(name);
  if (first.status === 0) {
    console.log(`  ✓ ${name}`);
    passed++;
    continue;
  }

  const retry = runSuite(name);
  if (retry.status === 0) {
    console.log(`  ⚠ ${name} (passed on retry; flaky)`);
    flakes.push({ name, detail: failureDetail(first) });
    flaky++;
  } else {
    console.log(`  ✗ ${name}`);
    failures.push({ name, detail: failureDetail(retry) });
    failed++;
  }
}

console.log(`\n${passed} passed, ${flaky} flaky, ${failed} failed (${SUITE.length} total)\n`);

if (flakes.length) {
  for (const { name, detail } of flakes) {
    console.log(`── ${name}: first attempt failed ──`);
    console.log(detail || '(no diagnostic output)');
    console.log();
  }
}

if (failures.length) {
  for (const { name, detail } of failures) {
    console.log(`── ${name} ──`);
    console.log(detail);
    console.log();
  }
}

// A retry is useful evidence, not a clean pass. Keep the diagnostic rerun but
// fail the gate so intermittent regressions cannot disappear from CI or review.
if (flakes.length || failures.length) process.exit(1);
