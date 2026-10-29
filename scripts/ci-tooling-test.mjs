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
const run = (file, args = [], extraEnv = {}) => spawnSync(process.execPath, [join(scripts, file), ...args], {
  encoding: 'utf8', timeout: 10000, env: { ...process.env,
    CHROME_PATH: '/nonexistent/test-only-chrome', GITHUB_SHA: 'a'.repeat(40),
    GITHUB_STEP_SUMMARY: join(fixture, 'step-summary.md'), GITHUB_WORKFLOW: 'fixture',
    ...extraEnv,
  },
});
try {
  const runner = readFileSync(join(DIR, 'test-all.mjs'), 'utf8');
  writeFileSync(join(scripts, 'ci-policy.mjs'), `export const SUITE=['design-lint','fixture-test']; export const EXCLUDED={}; export const NON_TEST_SUITE=new Set(['design-lint']); export const GROUPS={fixture:{files:[],suites:SUITE}}; export const BASE=SUITE; export const DOC_BASE=SUITE;`);
  writeFileSync(join(scripts, 'ci-plan.mjs'), readFileSync(join(DIR, 'ci-plan.mjs')));
  writeFileSync(join(scripts, 'test-all.mjs'), runner);
  writeFileSync(join(scripts, 'design-lint.mjs'), '');
  for (const mode of ['pass', 'flaky', 'fail', 'large-fail']) {
    writeFileSync(join(scripts, 'fixture-test.mjs'), `
      import { existsSync, writeFileSync } from 'node:fs';
      const marker = ${JSON.stringify(join(fixture, 'attempt'))};
      const retry = existsSync(marker); writeFileSync(marker, '1');
      console.log('stdout-' + (retry ? 'retry' : 'first'));
      console.error('ROOT_CAUSE_' + (retry ? 'RETRY' : 'FIRST'));
      for (let i=0; i<${mode === 'large-fail' ? 12000 : 15}; i++) console.error('stack detail ' + i + 'x'.repeat(100));
      process.exit(${JSON.stringify(mode)} === 'pass' || (${JSON.stringify(mode)} === 'flaky' && retry) ? 0 : 1);
    `);
    rmSync(join(fixture, 'attempt'), { force: true });
    rmSync(join(fixture, 'step-summary.md'), { force: true });
    const result = run('test-all.mjs');
    assert.equal(result.status, mode === 'pass' ? 0 : 1, result.stdout + result.stderr);
    const first = readFileSync(join(fixture, '.context/ci-test-results/fixture-test-first.log'), 'utf8');
    assert.match(first, /stdout-first/); assert.match(first, /ROOT_CAUSE_FIRST/);
    const summary = JSON.parse(readFileSync(join(fixture, '.context/ci-test-results/summary.json'), 'utf8'));
    assert.equal(summary.status, mode === 'pass' ? 'passed' : 'failed');
    assert.equal(summary.mode, 'full');
    assert.equal(summary.candidateSha, 'a'.repeat(40));
    assert.equal(summary.environment.node, process.version);
    assert.equal(summary.environment.chrome, null, 'missing Chrome cannot block synthetic checks');
    assert.equal(summary.workflow.name, 'fixture');
    assert.deepEqual(summary.selectedSuites, ['design-lint', 'fixture-test']);
    assert.deepEqual(summary.executedSuites, summary.selectedSuites);
    assert.deepEqual(summary.counts, { passed: mode === 'pass' ? 2 : 1,
      flaky: mode === 'flaky' ? 1 : 0, failed: mode.includes('fail') ? 1 : 0, total: 2 });
    const attempts = summary.suites[1].attempts;
    assert.equal(attempts.length, mode === 'pass' ? 1 : 2);
    assert.ok(summary.durationMs >= 0 && summary.suites.every(suite => suite.durationMs >= 0));
    assert.ok(attempts.every(attempt => attempt.durationMs >= 0 && attempt.outputBytes > 0 && !attempt.timedOut));
    const stepSummary = readFileSync(join(fixture, 'step-summary.md'), 'utf8');
    assert.match(stepSummary, /Functional checks — full suite/);
    assert.ok(Buffer.byteLength(result.stdout) < 8000, 'terminal output is bounded');
    assert.ok(Buffer.byteLength(stepSummary) < 8000, 'GitHub summary is bounded');
    if (mode !== 'pass') {
      assert.match(result.stdout, /ROOT_CAUSE_FIRST/, 'error message must survive long stacks');
      const retry = readFileSync(join(fixture, '.context/ci-test-results/fixture-test-retry.log'), 'utf8');
      assert.match(retry, /stdout-retry/); assert.match(retry, /ROOT_CAUSE_RETRY/);
      if (mode.includes('fail')) assert.match(result.stdout, /ROOT_CAUSE_RETRY/);
      else assert.match(result.stdout, /1 flaky/);
      if (mode === 'large-fail') {
        assert.match(first, /stack detail 11999/); assert.match(retry, /stack detail 11999/);
        const oldDetailBytes = Buffer.byteLength(first + retry), compactBytes = Buffer.byteLength(result.stdout);
        assert.ok(compactBytes < oldDetailBytes / 10, 'large logs remain in artifacts, not the terminal');
        console.log(`  ✓ large failure: ${oldDetailBytes} retained log bytes → ${compactBytes} terminal bytes`);
      }
    }
  }
  console.log('  ✓ full summaries retain counts, timings, environment and both attempts; failures/flakes still fail');

  // Exercise execution modes independently from selector classification.
  writeFileSync(join(scripts,'ci-plan.mjs'), `export const auditPolicy=()=>[]; export const createRepoPlan=()=>({mode:'selected',suites:['design-lint'],reasons:['fixture plan']});`);
  writeFileSync(join(scripts,'fixture-test.mjs'), 'console.error("outside selection");process.exit(1);');
  const shadow=run('test-all.mjs',['--shadow']);
  assert.equal(shadow.status,1);
  const shadowReport=JSON.parse(readFileSync(join(fixture,'.context/ci-test-results/summary.json'),'utf8'));
  assert.equal(shadowReport.mode,'shadow');assert.deepEqual(shadowReport.selectionMisses,['fixture-test']);
  assert.deepEqual(shadowReport.executedSuites,['design-lint','fixture-test']);
  const selected=run('test-all.mjs',['--changed']);assert.equal(selected.status,0,selected.stderr);
  const selectedReport=JSON.parse(readFileSync(join(fixture,'.context/ci-test-results/summary.json'),'utf8'));
  assert.deepEqual(selectedReport.executedSuites,['design-lint']);assert.equal(selectedReport.mode,'selected');
  assert.ok(selectedReport.outputBytes.terminal>0);
  assert.equal(run('test-all.mjs',['--suites','fixture-test']).status,1);
  for(const args of [['--suites','unknown'],['--suites',''],['--changed','--shadow'],['--base','HEAD'],['--changed','--changed']])
    assert.notEqual(run('test-all.mjs',args).status,0,JSON.stringify(args));
  writeFileSync(join(scripts, 'ci-execution.mjs'), readFileSync(join(DIR, 'ci-execution.mjs')));
  const eventPath = join(fixture, 'event.json');
  const routineEnv = { CI_ROUTINE_SELECTION: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/dev', GITHUB_EVENT_PATH: eventPath };
  writeFileSync(eventPath, '{}');
  assert.equal(run('ci-execution.mjs', ['--run'], routineEnv).status, 0, 'routine entry point runs the selection');
  assert.equal(run('ci-execution.mjs', ['--run'], { ...routineEnv, GITHUB_REF: 'refs/heads/master' }).status, 1, 'master cannot skip the failing suite');
  assert.equal(run('ci-execution.mjs', ['--run'], { ...routineEnv, CI_ROUTINE_SELECTION: 'false' }).status, 1, 'rollback restores full execution');
  for (const mode of ['release', 'shadow']) {
    writeFileSync(eventPath, JSON.stringify({ inputs: { mode } }));
    assert.equal(run('ci-execution.mjs', ['--run'], { ...routineEnv, GITHUB_EVENT_NAME: 'workflow_dispatch' }).status, 1, mode + ' retains the original suite failure');
  }
  assert.notEqual(run('ci-execution.mjs', ['--typo']).status, 0);
  rmSync(eventPath);
  console.log('  ✓ actual CI entry point propagates failures; master, release, shadow and rollback execute the full inventory');
  writeFileSync(join(scripts, 'ci-plan.mjs'), readFileSync(join(DIR, 'ci-plan.mjs')));
  console.log('  ✓ selected execution is explicit; shadow executes all and retains failures outside selection; invalid modes fail');

  writeFileSync(join(scripts, 'unlisted-test.mjs'), '');
  let result = run('test-all.mjs');
  assert.equal(result.status, 1);
  let summary = JSON.parse(readFileSync(join(fixture, '.context/ci-test-results/summary.json'), 'utf8'));
  assert.equal(summary.status, 'failed'); assert.deepEqual(summary.executedSuites, []);
  assert.deepEqual(summary.inventoryErrors.missing, ['unlisted-test']);
  rmSync(join(scripts, 'unlisted-test.mjs'));

  writeFileSync(join(scripts, 'test-all.mjs'), runner.replace('const SUITE_TIMEOUT_MS = 120000;', 'const SUITE_TIMEOUT_MS = 150;'));
  writeFileSync(join(scripts, 'fixture-test.mjs'), 'setInterval(() => {}, 100);');
  result = run('test-all.mjs');
  assert.equal(result.status, 1); assert.match(result.stdout, /Timed out after 0.15s/);
  summary = JSON.parse(readFileSync(join(fixture, '.context/ci-test-results/summary.json'), 'utf8'));
  assert.equal(summary.status, 'failed');
  assert.ok(summary.suites[1].attempts.every(attempt => attempt.timedOut && attempt.signal === 'SIGTERM'));
  console.log('  ✓ inventory errors and real child timeouts retain failing summaries');

  const workflow = readFileSync(join(DIR, '../.github/workflows/test.yml'), 'utf8');
  const group = workflow.match(/^  group: (.+)$/m)?.[1];
  const cancellation = workflow.match(/^  cancel-in-progress: \$\{\{ (.+) \}\}$/m)?.[1];
  assert.ok(group && cancellation, 'routine concurrency policy is configured');
  const evaluate = (expression, github) => new Function('github', 'return (' + expression + ')')(github);
  const policy = (event, ref, pr = null) => {
    const github = { workflow: 'test', event_name: event, ref, event: { pull_request: { number: pr } } };
    return { group: group.replace(/\$\{\{ (.+?) \}\}/g, (_, expression) => evaluate(expression, github)),
      cancel: evaluate(cancellation, github) };
  };
  const dev = policy('push', 'refs/heads/dev'), master = policy('push', 'refs/heads/master');
  const pr = policy('pull_request', 'refs/pull/7/merge', 7), otherPR = policy('pull_request', 'refs/pull/8/merge', 8);
  const release = policy('workflow_dispatch', 'refs/heads/dev');
  assert.equal(dev.cancel, true); assert.equal(pr.cancel, true);
  assert.equal(master.cancel, false); assert.equal(release.cancel, false);
  assert.equal(policy('push', 'refs/heads/other').cancel, false);
  assert.equal(new Set([dev.group, master.group, pr.group, otherPR.group, release.group]).size, 5);
  assert.match(workflow, /run: npm run test:policy --prefix scripts/);
  assert.match(workflow, /run: npm run test:ci --prefix scripts/);
  assert.match(workflow, /if: steps\.policy\.outputs\.performance == 'true' && steps\.proof\.outputs\.reuse != 'true'/);
  assert.match(workflow, /CI_RELEASE_REUSE: '(?:true|false)'/);
  assert.match(workflow, /name: Verify required gate dependencies\n\s+if: always\(\)/);
  assert.match(workflow, /CI_ROUTINE_SELECTION: 'true'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /options: \[release, shadow\]/);
  assert.match(workflow, /\.context\/ci-execution\.json/);
  assert.doesNotMatch(workflow, /continue-on-error: true|paths-ignore:|paths:/);
  assert.match(workflow,/fetch-depth: 0/);
  assert.match(workflow,/runs-on: ubuntu-24\.04/);
  assert.match(workflow,/node-version: '24\.14\.0'/);
  assert.match(workflow,/run: node scripts\/install-ci-browser\.mjs/);
  assert.match(workflow, /run: npm run performance --prefix scripts -- --no-audit-check/);
  console.log('  ✓ concurrency isolates branches/PRs/events; master and dispatched release runs are not cancelled');
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
