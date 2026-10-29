// Offline fixtures only: no workflow dispatch, provider call or branch promotion.
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUITE } from './ci-policy.mjs';
import { createEvidence, verifyEvidence, describeCandidate, digest, sha256, REPOSITORY, WORKFLOW, WORKFLOW_ID, artifactName } from './release-evidence.mjs';
import { promotionPreflight, validateDispatch, verifyArchive, decodeArchive } from './release-status.mjs';
import { verifyFinal } from './ci-final.mjs';
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const sha = 'a'.repeat(40), oldMaster = 'b'.repeat(40), now = Date.parse('2026-10-29T12:00:00Z');
const budgets = JSON.parse(readFileSync(join(ROOT, 'scripts/performance-budgets.json')));
const manifest = { 'index.html': 'd'.repeat(64) };
const expected = { sha, suites: SUITE, inputDigest: digest(manifest), policyDigest: 'c'.repeat(64), budgets,
  appVersion: '2.105.6', environment: { node: 'v24.14.0', browser: '152.0.7977.75', platform: 'linux', architecture: 'x64' } };
const context = { repository: REPOSITORY, workflowSha: sha, workflowRef: `${REPOSITORY}/${WORKFLOW}@refs/heads/dev`, ref: 'refs/heads/dev', event: 'push', runId: 41, attempt: 1 };
const summary = { schema: 2, mode: 'full', status: 'passed', candidateSha: sha, checkoutSha: sha, checkoutShaAtEnd: sha,
  environment: { node: expected.environment.node, chrome: `Google Chrome for Testing ${expected.environment.browser}`, platform: 'linux', architecture: 'x64', runnerImage: 'ubuntu24' },
  workflow: { runId: '41', attempt: '1', ref: context.workflowRef, sourceRef: context.ref, event: context.event },
  inputsAtStart: manifest, inputsAtEnd: manifest, inputsChanged: false, inventoryTotal: SUITE.length, executedSuites: SUITE,
  counts: { passed: SUITE.length, flaky: 0, failed: 0, total: SUITE.length },
  suites: SUITE.map(name => ({ name, status: 'passed', attempts: [{ attempt: 'first', exitCode: 0, signal: null, timedOut: false }] })),
};
const performance = { schema: 1, status: 'pass', failures: [], target: 'local-static-server', budgets,
  payload: { appVersion: expected.appVersion, ...Object.fromEntries(Object.keys(budgets.payload).map(key => [key, 1])) },
  environment: { nodeVersion: expected.environment.node, browserVersion: `Chrome/${expected.environment.browser}`, platform: 'linux', architecture: 'x64' },
  profile: { cpuSlowdown: 4, downloadMbps: 1.6, uploadKbps: 750, latencyMs: 150 }, timings: {},
};
for (const [path, max] of Object.entries(budgets.timing)) {
  const [scenario, metric] = path.split('.'); performance.timings[scenario] ||= {};
  performance.timings[scenario][metric] = { worst: max / 2, runs: Array(5).fill(max / 2) };
}
const proof = createEvidence(summary, performance, expected, context);
const run = { id: 41, run_attempt: 1, workflow_id: WORKFLOW_ID, path: WORKFLOW, head_sha: sha, head_branch: 'dev', event: 'push', status: 'completed', conclusion: 'success', repository: { full_name: REPOSITORY }, head_repository: { full_name: REPOSITORY } };
const bytes = Buffer.from('fictional archive; never extracted');
const artifact = { id: 73, name: artifactName(41, 1), expired: false, expires_at: '2026-11-28T12:00:00Z', digest: `sha256:${sha256(bytes)}`, workflow_run: { id: 41, head_sha: sha, head_branch: 'dev' } };
const verify = (p = proof, r = run, a = artifact, e = expected) => verifyEvidence(p, e, r, a, now);
const verified = verify();
assert.equal(verified.candidateSha, sha);
verifyArchive(bytes, artifact);
assert.throws(() => verifyArchive(Buffer.from('tampered'), artifact), /digest mismatch/);
// Frozen minimal ZIP fixture; production uses unzip, not a test parser or downloaded code.
const archive = Buffer.from('UEsDBBQAAAAAAPp8XV2MwfuJDAAAAAwAAAAeAAAALmNvbnRleHQvcmVsZWFzZS1ldmlkZW5jZS5qc29ueyJzY2hlbWEiOjF9UEsBAhQDFAAAAAAA+nxdXYzB+4kMAAAADAAAAB4AAAAAAAAAAAAAAIABAAAAAC5jb250ZXh0L3JlbGVhc2UtZXZpZGVuY2UuanNvblBLBQYAAAAAAQABAEwAAABIAAAAAAA=', 'base64');
assert.deepEqual(decodeArchive(archive, { digest: `sha256:${sha256(archive)}` }), { schema: 1 });
const wrongMember = Buffer.from(archive.toString('latin1').replaceAll('release-evidence.json', 'another-evidence.json'), 'latin1');
assert.throws(() => decodeArchive(wrongMember, { digest: `sha256:${sha256(wrongMember)}` }), /Missing or duplicate/);
assert.equal(verify(createEvidence({ ...summary, mode: 'selected', plan: { mode: 'full' } }, performance, expected, context)).candidateSha, sha, 'automatic full fallback can supply complete release evidence');
console.log('  ✓ full Linux proof and automatic full fallback validate; artifact bytes are bound to the API digest');

const badProofs = [
  p => { p.schema = 0; }, p => { p.candidateSha = oldMaster; }, p => { p.policyDigest = '0'.repeat(64); },
  p => { p.context.repository = 'fictional/fork'; }, p => { p.context.workflowSha = oldMaster; },
  p => { p.context.workflowRef = `${REPOSITORY}/.github/workflows/other.yml@refs/heads/dev`; },
  p => { p.context.attempt = 2; }, p => { p.context.runId = 42; },
  p => { p.functional.workflow.runId = '42'; }, p => { p.functional.workflow.event = 'pull_request'; },
  p => { p.functional.status = 'running'; }, p => { p.functional.checkoutShaAtEnd = oldMaster; },
  p => { p.functional.counts.flaky = 1; }, p => { p.functional.counts.failed = 1; },
  p => { p.functional.executedSuites.pop(); }, p => { p.functional.executedSuites[1] = p.functional.executedSuites[0]; },
  p => { p.functional.inventoryTotal++; }, p => { p.functional.inputsChanged = true; },
  p => { p.functional.startInputDigest = '0'.repeat(64); }, p => { p.functional.endInputDigest = '0'.repeat(64); },
  p => { p.functional.selectionMisses = ['fictional-test']; },
  p => { p.functional.suites[0].attempts.push({ attempt: 'retry', exitCode: 0 }); },
  p => { p.functional.suites[0].attempts[0].timedOut = true; }, p => { p.functional.suites[0].attempts[0].exitCode = 1; },
  p => { p.functional.mode = 'selected'; p.functional.plan = { mode: 'selected' }; },
  p => { p.functional.environment.node = 'v22.23.4'; }, p => { p.functional.environment.platform = 'darwin'; },
  p => { p.performance.status = 'fail'; }, p => { p.performance.target = 'https://fictional.invalid/'; },
  p => { p.performance.payload.appVersion = '0.0.0'; }, p => { p.performance.budgets.timing['cold.tbt']++; },
  p => { p.performance.profile.cpuSlowdown = 1; }, p => { p.performance.environment.browserVersion = 'Chrome/156.0.0.0'; },
  p => { p.performance.timings.cold.tbt.runs.pop(); }, p => { p.performance.timings.cold.tbt.runs[0] = NaN; },
  p => { p.performance.timings.cold.tbt.worst = 0; },
  p => { p.performance.timings.cold.tbt.runs[0] = 201; p.performance.timings.cold.tbt.worst = 201; },
  p => { p.performance.payload.runtimeShellRaw = budgets.payload.runtimeShellRaw + 1; },
];
for (const mutate of badProofs) { const p = structuredClone(proof); mutate(p); assert.throws(() => verify(p)); }
for (const patch of [{ status: 'in_progress' }, { conclusion: 'failure' }, { conclusion: 'cancelled' }, { workflow_id: 0 }, { head_sha: oldMaster }, { path: '.github/workflows/other.yml' }, { head_branch: 'master' }, { event: 'pull_request' }, { head_repository: { full_name: 'fictional/fork' } }]) assert.throws(() => verify(proof, { ...run, ...patch }));
for (const patch of [{ expired: true }, { expires_at: '2020-01-01T00:00:00Z' }, { name: artifactName(41, 2) }, { digest: null }, { workflow_run: { id: 42, head_sha: sha, head_branch: 'dev' } }]) assert.throws(() => verify(proof, run, { ...artifact, ...patch }));
assert.throws(() => verify(proof, run, artifact, { ...expected, suites: [...SUITE, 'new-test'] }));
assert.throws(() => createEvidence({ ...summary, inputsAtEnd: {} }, performance, expected, context));
console.log('  ✓ wrong SHA/policy/workflow/fork/attempt, partial reports, hidden retries/flakes, expiry and five-run budget violations all refuse reuse');

const refs = { dev: sha, master: oldMaster };
assert.equal(promotionPreflight(sha, refs, refs, true, verified).ready, true);
assert.equal(promotionPreflight(sha, { dev: sha, master: sha }, { dev: sha, master: sha }, true, verified).ready, true);
assert.throws(() => promotionPreflight(sha, refs, { ...refs, dev: oldMaster }, true, verified));
assert.throws(() => promotionPreflight(sha, refs, { ...refs, master: sha }, true, verified));
assert.throws(() => promotionPreflight(sha, refs, refs, false, verified));
assert.throws(() => promotionPreflight(sha, refs, refs, true, { ...verified, candidateSha: oldMaster }));
const dispatchContext = { repository: REPOSITORY, ref: 'refs/heads/dev', sha, workflowSha: sha };
validateDispatch(sha, dispatchContext, { inputs: { mode: 'release', candidate: sha } }, sha);
assert.throws(() => validateDispatch(sha, dispatchContext, { inputs: { mode: 'release' } }, sha));
assert.throws(() => validateDispatch(sha, { ...dispatchContext, workflowSha: oldMaster }, { inputs: { mode: 'release', candidate: sha } }, sha));
assert.throws(() => validateDispatch(sha, dispatchContext, { inputs: { mode: 'release', candidate: sha } }, oldMaster));
console.log('  ✓ dev/master race, divergent promotion and dispatched candidate/workflow mismatch block approval; fixtures never push');

const full = { POLICY: 'success', PAYLOAD: 'success', MEMORY: 'success', WHITESPACE: 'success', FUNCTIONAL: 'success', PERFORMANCE: 'success', PERFORMANCE_REQUIRED: 'true' };
assert.equal(verifyFinal(full), true);
assert.equal(verifyFinal({ ...full, PERFORMANCE: 'skipped', PERFORMANCE_REQUIRED: 'false' }), true);
const receipt = { ...verified, ready: true, reuse: true, dev: sha, master: sha };
const reuse = { ...full, REUSE: 'true', PROOF: 'success', CI_RELEASE_REUSE: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/master', GITHUB_SHA: sha, INVARIANTS: 'success', FUNCTIONAL: 'skipped', PERFORMANCE: 'skipped' };
assert.equal(verifyFinal(reuse, receipt), true, 'verified reuse avoids the second functional gate and benchmark');
for (const key of ['POLICY', 'PAYLOAD', 'MEMORY', 'WHITESPACE', 'FUNCTIONAL', 'PERFORMANCE']) assert.throws(() => verifyFinal({ ...full, [key]: 'skipped' }));
for (const patch of [{ PROOF: 'failure' }, { CI_RELEASE_REUSE: 'false' }, { GITHUB_EVENT_NAME: 'pull_request' }, { INVARIANTS: 'skipped' }, { FUNCTIONAL: 'success' }]) assert.throws(() => verifyFinal({ ...reuse, ...patch }, receipt));
assert.throws(() => verifyFinal(reuse, null));
assert.throws(() => verifyFinal({ ...full, PERFORMANCE_REQUIRED: '' }));
const workflow = readFileSync(join(ROOT, WORKFLOW), 'utf8');
assert.match(workflow, /CI_RELEASE_REUSE: '(?:true|false)'/);
const proofExpression = workflow.match(/if: (github\.event_name == 'push'[^\n]+)/)[1];
const proofRuns = (event, ref, flag) => new Function('github', 'env', `return (${proofExpression})`)({ event_name: event, ref }, { CI_RELEASE_REUSE: flag });
assert.equal(proofRuns('push', 'refs/heads/master', 'true'), true);
assert.equal(proofRuns('push', 'refs/heads/master', 'false'), false);
assert.equal(proofRuns('push', 'refs/heads/dev', 'true'), false);
assert.equal(proofRuns('pull_request', 'refs/pull/1/merge', 'true'), false);
assert.equal(proofRuns('workflow_dispatch', 'refs/heads/dev', 'true'), false);
for (const name of ['Install test dependencies', 'Install locked Chrome for Testing', 'Allow the test browser to use its sandbox', 'Verify Chrome']) {
  const block = workflow.split(`- name: ${name}\n`)[1]?.split(/\n      - name:/)[0];
  assert.ok(block, name);
  assert.match(block, /if: steps\.proof\.outputs\.reuse != 'true'/, name + ' is unnecessary after verified reuse');
}
assert.match(workflow, /name: Verify required gate dependencies\n\s+if: always\(\)/);
assert.doesNotMatch(workflow, /continue-on-error: true|paths-ignore:/);
const perfExpression = workflow.match(/if: (steps\.policy\.outputs\.performance[^\n]+)/)[1];
const perfRuns = (performance, reuse) => new Function('steps', `return (${perfExpression})`)({ policy: { outputs: { performance } }, proof: { outputs: { reuse } } });
assert.equal(perfRuns('true', 'true'), false); assert.equal(perfRuns('true', 'false'), true); assert.equal(perfRuns('false', 'false'), false);
console.log('  ✓ always-running final gate rejects skipped/failed dependencies; verified same-SHA reuse requires cheap invariants and skips the duplicate benchmark');

const root = mkdtempSync(join(tmpdir(), 'today-release-descriptor-'));
try {
  mkdirSync(join(root, 'scripts')); const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  writeFileSync(join(root, 'index.html'), "const DEV_HOURS = '1h';\nconst CHANGELOG = {\n  '1.0.0': 'Fictional',\n};\n");
  writeFileSync(join(root, 'scripts/performance-budgets.json'), JSON.stringify(budgets));
  writeFileSync(join(root, 'scripts/über tool.mjs'), '');
  git('init'); git('add', '.'); git('-c', 'user.name=CI fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--no-gpg-sign', '-m', 'fictional');
  const candidate = git('rev-parse', 'HEAD'), first = describeCandidate(root, candidate);
  assert.equal(first.appVersion, '1.0.0'); assert.equal(first.sha, candidate);
  assert.equal(first.inputDigest, digest(Object.fromEntries(['index.html', 'scripts/performance-budgets.json', 'scripts/über tool.mjs'].map(path => [path, sha256(readFileSync(join(root, path)))]))), 'NUL-separated Git paths preserve spaces/non-ASCII names');
  writeFileSync(join(root, 'index.html'), 'modified'); assert.throws(() => describeCandidate(root, candidate), /modified/);
  assert.throws(() => describeCandidate(root, sha), /exact candidate/);
  // Execute the real CLI fallback/final-check path in a disposable Git checkout.
  for (const name of ['release-status', 'release-evidence', 'ci-final', 'ci-policy', 'ci-plan'])
    writeFileSync(join(root, `scripts/${name}.mjs`), readFileSync(join(ROOT, `scripts/${name}.mjs`)));
  const wrong = '0'.repeat(40), childEnv = { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/master',
    GITHUB_SHA: wrong, GITHUB_WORKFLOW_SHA: wrong, CI_RELEASE_REUSE: 'true', GITHUB_OUTPUT: join(root, '.context/outputs.txt') };
  const refusal = execFileSync(process.execPath, ['scripts/release-status.mjs', 'reuse', wrong], { cwd: root, env: childEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 });
  assert.match(refusal, /Full master validation required: Check out the exact candidate/);
  assert.equal(JSON.parse(readFileSync(join(root, '.context/release-proof-check.json'))).reuse, false);
  assert.throws(() => execFileSync(process.execPath, ['scripts/ci-final.mjs'], { cwd: root,
    env: { ...childEnv, ...full, REUSE: 'false', FUNCTIONAL: 'skipped', PERFORMANCE: 'skipped' },
    stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 }), error => error.status === 1);
  assert.equal(git('rev-parse', 'HEAD'), candidate, 'CLI probes never promote or rewrite the fixture');
  console.log('  ✓ actual CLI refuses stale checkout, requests full validation and rejects skipped fallback gates');
} finally { rmSync(root, { recursive: true, force: true }); }
console.log('✓ RELEASE EVIDENCE TEST PASSED');
