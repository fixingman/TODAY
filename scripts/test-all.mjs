// Run the full extraction test suite (all *-test.mjs except ai-test).
// Usage: node scripts/test-all.mjs
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DIR = dirname(fileURLToPath(import.meta.url));

const SUITE = [
  'smoke-test',
  'accessibility-test',
  'splash-test',
  'platform-test',
  'connections-test',
  'dropbox-test',
  'zones-test',
  'task-actions-test',
  'assistant-test',
  'nudge-test',
  'habits-test',
  'triage-test',
  'meeting-test',
  'memory-panel-test',
  'about-test',
  'reflections-test',
  'day-lifecycle-test',
  'drag-test',
  'focus-test',
  'insights-test',
];

let passed = 0;
let failed = 0;
const failures = [];

function runSuite(name) {
  return spawnSync(process.execPath, [join(DIR, `${name}.mjs`)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

for (const name of SUITE) {
  let result = runSuite(name);
  const retried = result.status !== 0;
  if (retried) result = runSuite(name);
  const ok = result.status === 0;
  const lastLine = (result.stdout || '').trim().split('\n').at(-1) || '';
  if (ok) {
    console.log(`  ✓ ${name}${retried ? ' (passed on retry)' : ''}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    const detail = (result.stderr || result.stdout || '').trim().split('\n').slice(-6).join('\n');
    failures.push({ name, detail });
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed (${SUITE.length} total)\n`);

if (failures.length) {
  for (const { name, detail } of failures) {
    console.log(`── ${name} ──`);
    console.log(detail);
    console.log();
  }
  process.exit(1);
}
