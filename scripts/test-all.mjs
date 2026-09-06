// Run design lint and every local *-test.mjs suite except explicitly credentialed live tests.
// Usage: node scripts/test-all.mjs
import { spawnSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DIR = dirname(fileURLToPath(import.meta.url));

const SUITE = [
  'design-lint',
  'token-parity-test',
  'component-contract-test',
  'smoke-test',
  'accessibility-test',
  'splash-test',
  'platform-test',
  'connections-test',
  'trello-test',
  'gmail-test',
  'task-enrich-test',
  'dropbox-test',
  'sync-merge-unit-test',
  'zones-test',
  'task-actions-test',
  'task-bounce-test',
  'assistant-test',
  'suggestion-policy-unit-test',
  'suggestion-outcomes-test',
  'nudge-test',
  'habits-test',
  'triage-test',
  'meeting-test',
  'memory-panel-test',
  'week-reflection-unit-test',
  'observation-pool-test',
  'mailto-test',
  'about-test',
  'reflections-test',
  'day-lifecycle-test',
  'drag-test',
  'focus-test',
  'focus-session-unit-test',
  'insights-test',
  'noticed-model-unit-test',
];

const EXCLUDED = new Set([
  'ai-test', // Requires ANTHROPIC_API_KEY and makes real provider calls.
]);

// Repository checks that belong in the default gate but do not follow the
// *-test.mjs naming convention. Keep this explicit so the test inventory audit
// still catches every newly added test suite.
const NON_TEST_SUITE = new Set([
  'design-lint',
]);

const SUITE_TIMEOUT_MS = 120000;

function verifySuiteInventory() {
  const discovered = readdirSync(DIR)
    .filter(file => file.endsWith('-test.mjs'))
    .map(file => file.slice(0, -'.mjs'.length))
    .filter(name => !EXCLUDED.has(name));
  const configuredTests = SUITE.filter(name => !NON_TEST_SUITE.has(name));
  const configured = new Set(configuredTests);
  const duplicates = SUITE.filter((name, index) => SUITE.indexOf(name) !== index);
  const missing = discovered.filter(name => !configured.has(name)).sort();
  const stale = configuredTests.filter(name => !discovered.includes(name)).sort();
  const missingChecks = [...NON_TEST_SUITE]
    .filter(name => !SUITE.includes(name) || !existsSync(join(DIR, `${name}.mjs`)))
    .sort();

  if (!duplicates.length && !missing.length && !stale.length && !missingChecks.length) return;

  console.error('\nTest-suite inventory mismatch:');
  if (missing.length) console.error(`  Missing from SUITE: ${missing.join(', ')}`);
  if (stale.length) console.error(`  Listed but not found: ${stale.join(', ')}`);
  if (missingChecks.length) console.error(`  Non-test checks missing or unlisted: ${missingChecks.join(', ')}`);
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
    timeout: SUITE_TIMEOUT_MS,
    killSignal: 'SIGTERM',
  });
}

function failureDetail(result) {
  if (result.error?.code === 'ETIMEDOUT') return `Timed out after ${SUITE_TIMEOUT_MS / 1000}s`;
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
