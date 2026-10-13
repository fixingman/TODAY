// Exercise the real CI runner and payload CLI with isolated synthetic repositories.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const DIR = dirname(fileURLToPath(import.meta.url));
const fixture = mkdtempSync(join(tmpdir(), 'today-ci-'));
const scripts = join(fixture, 'scripts');
mkdirSync(scripts); mkdirSync(join(fixture, 'fonts'));
const run = (file, args = []) => spawnSync(process.execPath, [join(scripts, file), ...args], {
  encoding: 'utf8', timeout: 10000, env: { ...process.env, CHROME_PATH: '/nonexistent/test-only-chrome' },
});
try {
  const runner = readFileSync(join(DIR, 'test-all.mjs'), 'utf8')
    .replace(/const SUITE = \[[\s\S]*?\];/, "const SUITE = ['design-lint', 'fixture-test'];");
  writeFileSync(join(scripts, 'test-all.mjs'), runner);
  writeFileSync(join(scripts, 'design-lint.mjs'), '');
  for (const mode of ['pass', 'flaky', 'fail']) {
    writeFileSync(join(scripts, 'fixture-test.mjs'), `
      import { existsSync, writeFileSync } from 'node:fs';
      const marker = ${JSON.stringify(join(fixture, 'attempt'))};
      const retry = existsSync(marker); writeFileSync(marker, '1');
      console.log('stdout-' + (retry ? 'retry' : 'first'));
      console.error('ROOT_CAUSE_' + (retry ? 'RETRY' : 'FIRST'));
      for (let i=0; i<15; i++) console.error('stack detail ' + i);
      process.exit(${JSON.stringify(mode)} === 'pass' || (${JSON.stringify(mode)} === 'flaky' && retry) ? 0 : 1);
    `);
    rmSync(join(fixture, 'attempt'), { force: true });
    const result = run('test-all.mjs');
    assert.equal(result.status, mode === 'pass' ? 0 : 1, result.stdout + result.stderr);
    const first = readFileSync(join(fixture, '.context/ci-test-results/fixture-test-first.log'), 'utf8');
    assert.match(first, /stdout-first/); assert.match(first, /ROOT_CAUSE_FIRST/);
    if (mode !== 'pass') {
      assert.match(result.stdout, /ROOT_CAUSE_FIRST/, 'error message must survive long stacks');
      const retry = readFileSync(join(fixture, '.context/ci-test-results/fixture-test-retry.log'), 'utf8');
      assert.match(retry, /stdout-retry/); assert.match(retry, /ROOT_CAUSE_RETRY/);
      if (mode === 'fail') assert.match(result.stdout, /ROOT_CAUSE_RETRY/);
      else assert.match(result.stdout, /1 flaky/);
    }
  }
  console.log('  ✓ runner retains both complete attempts; failures and flakes still fail');
  writeFileSync(join(scripts, 'performance-test.mjs'), readFileSync(join(DIR, 'performance-test.mjs')));
  writeFileSync(join(fixture, 'index.html'), "<script src='/fixture.js'></script><script>const CHANGELOG = {'1.0.0': 'Fixture'};</script>");
  writeFileSync(join(fixture, 'fixture.js'), 'console.log("fixture");');
  writeFileSync(join(fixture, 'sw.js'), '');
  const original = JSON.parse(readFileSync(join(DIR, 'performance-budgets.json'), 'utf8'));
  for (const key of [null, 'runtimeShellRaw', 'runtimeShellBrotli', 'eagerScripts']) {
    const budgets = structuredClone(original);
    if (key) budgets.payload[key] = 0;
    writeFileSync(join(scripts, 'performance-budgets.json'), JSON.stringify(budgets));
    const result = run('performance-test.mjs', ['--payload-only']);
    assert.equal(result.status, key ? 1 : 0, result.stdout + result.stderr);
    if (key) assert.match(result.stderr, new RegExp('payload\\.' + key));
    else assert.match(result.stdout, /payload budgets passed/);
  }
  console.log('  ✓ payload preflight enforces byte/script limits without Chrome or dependencies');
} finally { rmSync(fixture, { recursive: true, force: true }); }
