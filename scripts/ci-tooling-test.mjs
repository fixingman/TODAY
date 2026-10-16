// Exercise the real CI runner and payload CLI with isolated synthetic repositories.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
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
  // Authoring tools run in a fixture with no installed packages of their own.
  writeFileSync(join(scripts, 'gen-splash.mjs'), readFileSync(join(DIR, 'gen-splash.mjs')));
  const generated = run('gen-splash.mjs');
  assert.equal(generated.status, 0, generated.stdout + generated.stderr);
  const shippedDir = join(DIR, '../assets/splash'), generatedDir = join(fixture, 'assets/splash');
  const names = readdirSync(shippedDir).filter(name => name.endsWith('.png')).sort();
  assert.deepEqual(readdirSync(generatedDir).sort(), names);
  for (const name of names) {
    const expected = PNG.sync.read(readFileSync(join(shippedDir, name)));
    const actual = PNG.sync.read(readFileSync(join(generatedDir, name)));
    assert.equal(actual.width, expected.width); assert.equal(actual.height, expected.height);
    assert.deepEqual(actual.data, expected.data, name + ' preserves every pixel');
  }
  console.log('  ✓ splash authoring runs without undeclared packages; shipped dimensions/pixels preserved');

  writeFileSync(join(scripts, 'ai-test.mjs'), readFileSync(join(DIR, 'ai-test.mjs')));
  mkdirSync(join(fixture, 'netlify/functions'), { recursive: true });
  for (const longReply of [false, true]) {
    writeFileSync(join(fixture, 'netlify/functions/ai-assist.js'), `
      let calls = 0;
      exports.handler = async () => {
        const replies = [
          { content: 'pong' },
          { content: ${JSON.stringify(longReply ? Array(41).fill('word').join(' ') : 'A short fictional line.')}, message: 'Short truncated preview.' },
          { content: 'What needs your attention?' }, { hints: [] }, { content: 'A short reflection.' }
        ];
        return { statusCode: 200, body: JSON.stringify(replies[calls++]) };
      };
    `);
    const result = run('ai-test.mjs', ['--key=fictional-offline-key']);
    assert.equal(result.status, longReply ? 1 : 0, result.stdout + result.stderr);
    if (longReply) assert.match(result.stderr, /nudge: 41 words/);
  }
  console.log('  ✓ synthetic provider smoke validates full content, not a truncated message preview');
} finally { rmSync(fixture, { recursive: true, force: true }); }
