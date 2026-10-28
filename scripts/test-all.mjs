// Run design lint and every local *-test.mjs suite except explicitly credentialed live tests.
// Usage: node scripts/test-all.mjs
import { spawnSync } from 'child_process';
import { existsSync, readdirSync, mkdirSync, writeFileSync, appendFileSync, rmSync, readFileSync, openSync, closeSync, statSync, createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'node:crypto';

const DIR = dirname(fileURLToPath(import.meta.url));

import { SUITE as ALL_SUITES, EXCLUDED as EXCLUDED_REASONS, NON_TEST_SUITE } from './ci-policy.mjs';
import { createRepoPlan, auditPolicy } from './ci-plan.mjs';
const EXCLUDED = new Set(Object.keys(EXCLUDED_REASONS));

const args = process.argv.slice(2);
const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : null;
for (let i = 0; i < args.length; i++) {
  if (args.indexOf(args[i]) !== i) throw new Error('Duplicate runner argument: ' + args[i]);
  if (['--shadow','--changed'].includes(args[i])) continue;
  if (['--base','--suites'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) { i++; continue; }
  throw new Error('Usage: test-all.mjs [--shadow | --changed | --suites names] [--base ref]');
}
if (['--shadow','--changed','--suites'].filter(flag => args.includes(flag)).length > 1) throw new Error('Choose one execution mode');
if (args.includes('--base') && !args.some(arg=>['--shadow','--changed'].includes(arg))) throw new Error('--base requires --shadow or --changed');
const requested = value('--suites')?.split(',');
if (requested && requested.some(name => !ALL_SUITES.includes(name))) throw new Error('Unknown or empty suite name');
const mode = args.includes('--shadow') ? 'shadow' : args.includes('--changed') || requested ? 'selected' : 'full';
const plan = mode === 'full' || requested ? null : createRepoPlan(join(DIR, '..'), process.env, value('--base'));
const selected = requested ? ALL_SUITES.filter(name => requested.includes(name)) : plan?.suites || ALL_SUITES;
const SUITE = mode === 'shadow' ? ALL_SUITES : selected;

const SUITE_TIMEOUT_MS = 120000;
const ROOT = join(DIR, '..');
const LOG_DIR = join(ROOT, '.context', 'ci-test-results');
const SUMMARY_PATH = join(LOG_DIR, 'summary.json');
const started = performance.now();
let terminalBytes = 0;
function log(...values) { const line = values.join(' '); terminalBytes += Buffer.byteLength(line+'\n'); console.log(line); }
rmSync(LOG_DIR, { recursive: true, force: true });
mkdirSync(LOG_DIR, { recursive: true });

// This is diagnostic evidence, not release approval or a substitute for full logs.
function command(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', timeout: 5000 });
  return result.status === 0 ? result.stdout.trim() : null;
}
function dirtyCheckout() {
  const status = command('git', ['-C', ROOT, 'status', '--porcelain']);
  return status === null ? null : !!status;
}
const checkoutSha = command('git', ['-C', ROOT, 'rev-parse', 'HEAD']);
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
function fingerprints() {
  const paths = command('git',['-C',ROOT,'ls-files','--cached','--others','--exclude-standard','-z']);
  if (paths === null) return null;
  return Object.fromEntries([...new Set(paths.split('\0'))].filter(path=>
    /^(?:assets\/|fonts\/|netlify\/|scripts\/|\.github\/|index\.html$|sw\.js$|manifest\.json$|netlify\.toml$)/.test(path)
    && !path.includes('/node_modules/')).sort().map(path=> {
      try {return [path,createHash('sha256').update(readFileSync(join(ROOT,path))).digest('hex')];}
      catch {return [path,null];}
    }));
}
const inputsAtStart = fingerprints();
const report = {
  schema: 2, mode, status: 'running', startedAt: new Date().toISOString(),
  candidateSha: process.env.GITHUB_SHA || checkoutSha, checkoutSha,
  dirtyAtStart: dirtyCheckout(),
  environment: {
    node: process.version, chrome: command(chromePath, ['--version']),
    platform: process.platform, architecture: process.arch,
    runnerOS: process.env.RUNNER_OS || null, runnerImage: process.env.ImageOS || null,
    runnerImageVersion: process.env.ImageVersion || null,
  },
  workflow: {
    name: process.env.GITHUB_WORKFLOW || null, ref: process.env.GITHUB_WORKFLOW_REF || null,
    event: process.env.GITHUB_EVENT_NAME || null, runId: process.env.GITHUB_RUN_ID || null,
    attempt: process.env.GITHUB_RUN_ATTEMPT || null, sourceRef: process.env.GITHUB_REF || null,
  },
  inputsAtStart,
  plan, inventoryTotal: ALL_SUITES.length, selectedSuites: selected, executedSuites: [], suites: [],
  counts: { passed: 0, flaky: 0, failed: 0, total: SUITE.length },
  evidenceDirectory: '.context/ci-test-results',
};
function saveReport() {
  report.outputBytes = { child: report.suites.reduce((sum,suite)=>sum+suite.attempts.reduce((n,attempt)=>n+attempt.outputBytes,0),0), terminal: terminalBytes };
  report.durationMs = Math.round(performance.now() - started);
  writeFileSync(SUMMARY_PATH, JSON.stringify(report, null, 2) + '\n');
}
saveReport();

function verifySuiteInventory() {
  const discovered = readdirSync(DIR)
    .filter(file => file.endsWith('-test.mjs'))
    .map(file => file.slice(0, -'.mjs'.length))
    .filter(name => !EXCLUDED.has(name));
  const configuredTests = ALL_SUITES.filter(name => !NON_TEST_SUITE.has(name));
  const configured = new Set(configuredTests);
  const duplicates = ALL_SUITES.filter((name, index) => ALL_SUITES.indexOf(name) !== index);
  const missing = discovered.filter(name => !configured.has(name)).sort();
  const stale = configuredTests.filter(name => !discovered.includes(name)).sort();
  const missingChecks = [...NON_TEST_SUITE]
    .filter(name => !ALL_SUITES.includes(name) || !existsSync(join(DIR, `${name}.mjs`)))
    .sort();

  const policyErrors = auditPolicy();
  if (!duplicates.length && !missing.length && !stale.length && !missingChecks.length && !policyErrors.length) return;

  console.error('\nTest-suite inventory mismatch:');
  if (missing.length) console.error(`  Missing from SUITE: ${missing.join(', ')}`);
  if (stale.length) console.error(`  Listed but not found: ${stale.join(', ')}`);
  if (missingChecks.length) console.error(`  Non-test checks missing or unlisted: ${missingChecks.join(', ')}`);
  if (duplicates.length) console.error(`  Listed more than once: ${[...new Set(duplicates)].join(', ')}`);
  if (policyErrors.length) console.error('  Policy: ' + policyErrors.join('; '));
  console.error('  Add every local *-test.mjs file or explicitly exclude it with a reason.\n');
  report.status = 'failed';
  report.inventoryErrors = { missing, stale, missingChecks, duplicates, policyErrors };
  saveReport();
  process.exit(1);
}

verifySuiteInventory();
if (plan) {
  log(`Selection ${plan.mode}: ${selected.length}/${ALL_SUITES.length}; executing ${SUITE.length} (${mode}).`);
  writeFileSync(join(LOG_DIR,'plan.json'),JSON.stringify(plan,null,2)+'\n');
  for (const reason of plan.reasons.slice(0,8)) log('  '+reason);
  if (plan.reasons.length > 8) log('  Full selection reasons: .context/ci-test-results/plan.json');
}

// Keep output independent of child log size. Each stream keeps its first error
// with nearby context; raw attempts remain intact in their separate log files.
async function excerpt(path) {
  let first='',last='',previous='',error='';
  const pattern=/^\s*(?:[\w.]*Error\b|error\b|✗|FAIL\b|ROOT_CAUSE_|Timed out)/im;
  for await (const chunk of createReadStream(path,{encoding:'utf8'})) {
    if (first.length<600) first=(first+chunk).slice(0,600);
    last=(last+chunk).slice(-600);
    if (error && error.length<600) error=(error+chunk).slice(0,600);
    if (!error) {
      const window=previous+chunk;
      const at=window.search(pattern);
      if (at>=0) error=window.slice(Math.max(0,at-100),at+600).slice(0,600);
      previous=window.slice(-1000);
    }
  }
  const clean=text=>text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').trim();
  if (statSync(path).size<=600) return clean(first);
  return clean(error || first.slice(0,280)+'\n[excerpt]\n'+last.slice(-280))+'\n[excerpt]';
}

async function runSuite(name, attempt, suite) {
  const began = performance.now();
  const log = `.context/ci-test-results/${name}-${attempt}.log`;
  const path = join(ROOT,log), fd=openSync(path,'w');
  let result;
  try {
    // Spool directly to disk: spawnSync's default maxBuffer would truncate a
    // noisy suite and kill it before its real exit/timeout could be observed.
    result = spawnSync(process.execPath, [join(DIR, `${name}.mjs`)], {
      stdio: ['ignore',fd,fd], encoding:'utf8',
      timeout:SUITE_TIMEOUT_MS, killSignal:'SIGTERM',
    });
  } finally {closeSync(fd);}
  const outputBytes=statSync(path).size;
  appendFileSync(path,`\nexit=${result.status} signal=${result.signal||'none'}\n${result.error?.stack||''}\n`);
  const detail = {
    attempt, exitCode: result.status, signal: result.signal || null,
    timedOut: result.error?.code === 'ETIMEDOUT',
    durationMs: Math.round(performance.now() - began), log,
    outputBytes,
  };
  if (result.status !== 0) detail.excerpt = [
    detail.timedOut ? `Timed out after ${SUITE_TIMEOUT_MS / 1000}s` : result.error?.message,
    await excerpt(path),
  ].filter(Boolean).join('\n');
  suite.attempts.push(detail);
  saveReport();
  return result.status === 0;
}

for (const name of SUITE) {
  const suite = { name, status: 'running', attempts: [] };
  report.suites.push(suite);
  report.executedSuites.push(name);
  if (await runSuite(name, 'first', suite)) {
    suite.status = 'passed';
    log(`  ✓ ${name}`);
  } else if (await runSuite(name, 'retry', suite)) {
    suite.status = 'flaky';
    log(`  ⚠ ${name} (passed on diagnostic retry; gate fails)`);
  } else {
    suite.status = 'failed';
    log(`  ✗ ${name}`);
  }
  suite.durationMs = suite.attempts.reduce((sum, attempt) => sum + attempt.durationMs, 0);
  report.counts[suite.status]++;
  saveReport();
}

const { passed, flaky, failed, total } = report.counts;
report.status = flaky || failed ? 'failed' : 'passed';
if (mode === 'shadow') report.selectionMisses = report.suites.filter(suite => suite.status !== 'passed' && !selected.includes(suite.name)).map(suite => suite.name);
report.inputsAtEnd = fingerprints();
report.inputsChanged = JSON.stringify(inputsAtStart) !== JSON.stringify(report.inputsAtEnd);
if (report.inputsChanged) report.status = 'failed';
report.finishedAt = new Date().toISOString();
report.dirtyAtEnd = dirtyCheckout();
report.checkoutShaAtEnd = command('git', ['-C', ROOT, 'rev-parse', 'HEAD']);
saveReport();
log(`\n${passed} passed, ${flaky} flaky, ${failed} failed (${total} total; ${(report.durationMs / 1000).toFixed(1)}s)`);
log('Summary: .context/ci-test-results/summary.json');
if (report.inputsChanged) log('  ✗ Runtime/test/policy inputs changed during validation; result is invalidated.');
if (mode === 'shadow') log(`Shadow misses: ${report.selectionMisses.length}; selected ${selected.length}, executed ${SUITE.length}.`);
const problems = report.suites.filter(suite => suite.status !== 'passed');
for (const suite of problems.slice(0, 5)) {
  log(`\n── ${suite.name}: ${suite.status} ──`);
  for (const attempt of suite.attempts) {
    log(`${attempt.attempt}: ${attempt.log}`);
    if (attempt.excerpt) log(attempt.excerpt);
  }
}
if (problems.length > 5) log(`\n${problems.length - 5} more affected suites; see summary and complete attempt logs.`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const safe = value => String(value ?? 'unavailable').replace(/[&<>`|\r\n]/g, ' ');
  const lines = [
    `### Functional checks — ${mode === 'full' ? 'full suite' : mode === 'shadow' ? 'shadow (full suite)' : 'selected suites; not release approval'}`, '',
    `**${report.status}**: ${passed} passed, ${flaky} flaky, ${failed} failed / ${total}.`,
    `Duration: ${(report.durationMs / 1000).toFixed(1)}s. Candidate: ${safe(report.candidateSha)}.`, '',
    `Node: ${safe(report.environment.node)}; Chrome: ${safe(report.environment.chrome)}; runner: ${safe(report.environment.runnerOS || report.environment.platform)}.`,
    'Full JSON and complete first/retry logs: the ci-evidence artifact under .context/ci-test-results/.', '',
    '| Slowest suites | Seconds |', '|---|---:|',
    ...[...report.suites].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5)
      .map(suite => `| ${suite.name} | ${(suite.durationMs / 1000).toFixed(1)} |`),
  ];
  for (const suite of problems.slice(0, 5)) {
    lines.push('', `**${suite.name}: ${suite.status}**`);
    for (const attempt of suite.attempts) {
      lines.push(`- ${attempt.attempt}: ${safe(attempt.log)}`);
      if (attempt.excerpt) lines.push(`  ${safe(attempt.excerpt).slice(0, 600)}`);
    }
  }
  if (problems.length > 5) lines.push('', `${problems.length - 5} more affected suites; see artifact.`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}
// A retry supplies diagnostic evidence; it never turns a flaky gate green.
saveReport();
if (flaky || failed || report.inputsChanged) process.exit(1);
