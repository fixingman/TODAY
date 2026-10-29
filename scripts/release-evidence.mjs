// Pure release-proof validation plus a dependency-free report writer.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUITE } from './ci-policy.mjs';
import { metadata } from './ci-plan.mjs';

export const REPOSITORY = 'fixingman/TODAY';
export const WORKFLOW = '.github/workflows/test.yml';
export const WORKFLOW_ID = 350935866;
export const artifactName = (run, attempt) => `ci-evidence-${run}-${attempt}`;
export const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const digest = value => sha256(JSON.stringify(canonical(value)));
const same = (a, b) => digest(a) === digest(b);
export const validSha = sha => typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha);
const runtimePath = path => /^(?:assets\/|fonts\/|netlify\/|scripts\/|\.github\/|index\.html$|sw\.js$|manifest\.json$|netlify\.toml$)/.test(path);
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 10000, maxBuffer: 20 * 1024 * 1024 });

export function describeCandidate(root, sha) {
  requireValue(validSha(sha), 'An exact 40-character candidate SHA is required');
  requireValue(git(root, ['rev-parse', 'HEAD']).trim() === sha, 'Check out the exact candidate before inspecting its policy');
  requireValue(!git(root, ['diff', '--name-only', 'HEAD', '--']).trim(), 'Tracked candidate inputs are modified');
  const paths = git(root, ['ls-tree', '-r', '--name-only', '-z', sha]).split('\0').filter(Boolean);
  const read = path => execFileSync('git', ['-C', root, 'show', `${sha}:${path}`], { timeout: 10000, maxBuffer: 20 * 1024 * 1024 });
  const inputs = Object.fromEntries(paths.filter(runtimePath).sort().map(path => [path, sha256(read(path))]));
  const policy = Object.fromEntries(paths.filter(path => path.startsWith('scripts/') || path.startsWith('.github/') || path === 'memory/validate-files.sh').sort().map(path => [path, sha256(read(path))]));
  const budgets = JSON.parse(read('scripts/performance-budgets.json'));
  return { sha, suites: SUITE, inputDigest: digest(inputs), policyDigest: digest(policy), budgets,
    appVersion: metadata(read('index.html').toString(), 'index.html')?.version,
    environment: { node: 'v24.14.0', browser: '152.0.7977.75', platform: 'linux', architecture: 'x64' } };
}

export function validateMeasurements(functional, performance, expected) {
  const names = expected.suites;
  requireValue(functional.schema === 2 && functional.status === 'passed', 'Functional report is incomplete or failed');
  requireValue(functional.candidateSha === expected.sha && functional.checkoutSha === expected.sha && functional.checkoutShaAtEnd === expected.sha, 'Functional candidate/checkout SHA mismatch');
  requireValue(['full', 'shadow'].includes(functional.mode) || (functional.mode === 'selected' && functional.plan?.mode === 'full'), 'Selected-only evidence cannot approve a release');
  requireValue(functional.inventoryTotal === names.length && same(functional.executedSuites, names) && same(functional.suites?.map(suite => suite.name), names), 'Incomplete or changed suite inventory');
  requireValue(same(functional.counts, { passed: names.length, flaky: 0, failed: 0, total: names.length }), 'Failed/flaky or incorrect functional counts');
  requireValue(functional.inputsChanged === false && functional.startInputDigest === expected.inputDigest && functional.endInputDigest === expected.inputDigest, 'Runtime/test/workflow inputs changed or do not match the candidate');
  requireValue(!functional.selectionMisses?.length, 'Shadow selection missed a failure');
  for (const suite of functional.suites) requireValue(suite.status === 'passed' && suite.attempts?.length === 1
    && suite.attempts[0].attempt === 'first' && suite.attempts[0].exitCode === 0 && suite.attempts[0].signal === null
    && suite.attempts[0].timedOut === false, `Missing, retried or failing suite: ${suite.name}`);
  const env = expected.environment;
  requireValue(functional.environment?.node === env.node && functional.environment?.platform === env.platform
    && functional.environment?.architecture === env.architecture && functional.environment?.runnerImage === 'ubuntu24'
    && functional.environment?.chrome === `Google Chrome for Testing ${env.browser}`, 'Functional environment differs from the pinned Linux gate');
  requireValue(performance.schema === 1 && performance.status === 'pass' && Array.isArray(performance.failures) && !performance.failures.length, 'Performance evidence is incomplete or failed');
  requireValue(performance.target === 'local-static-server' && same(performance.budgets, expected.budgets)
    && performance.payload?.appVersion === expected.appVersion, 'Performance source/version/budgets mismatch');
  requireValue(performance.environment?.nodeVersion === env.node && performance.environment?.browserVersion === `Chrome/${env.browser}`
    && performance.environment?.platform === env.platform && performance.environment?.architecture === env.architecture, 'Performance environment differs from the pinned gate');
  requireValue(same(performance.profile, { cpuSlowdown: 4, downloadMbps: 1.6, uploadKbps: 750, latencyMs: 150 }), 'Performance profile changed');
  for (const [key, max] of Object.entries(expected.budgets.payload)) requireValue(Number.isFinite(performance.payload[key]) && performance.payload[key] >= 0 && performance.payload[key] <= max, `Payload budget failed: ${key}`);
  requireValue(expected.budgets.iterations === 5, 'Release requires five performance runs');
  for (const [path, max] of Object.entries(expected.budgets.timing)) {
    const [scenario, metric] = path.split('.'), result = performance.timings?.[scenario]?.[metric];
    requireValue(result?.runs?.length === 5 && result.runs.every(n => Number.isFinite(n) && n >= 0), `Missing five-run timing: ${path}`);
    requireValue(result.worst === Math.max(...result.runs) && result.worst <= max, `Performance budget failed: ${path}`);
  }
}

export function createEvidence(summary, performance, expected, context) {
  const { inputsAtStart, inputsAtEnd, ...functional } = summary;
  functional.startInputDigest = digest(inputsAtStart); functional.endInputDigest = digest(inputsAtEnd);
  validateMeasurements(functional, performance, expected);
  requireValue(context.repository === REPOSITORY && context.workflowSha === expected.sha && context.ref === 'refs/heads/dev'
    && context.workflowRef === `${REPOSITORY}/${WORKFLOW}@refs/heads/dev` && ['push', 'workflow_dispatch'].includes(context.event)
    && Number.isSafeInteger(context.runId) && context.runId > 0 && Number.isSafeInteger(context.attempt) && context.attempt > 0, 'Untrusted release workflow context');
  requireValue(summary.workflow?.runId === String(context.runId) && summary.workflow?.attempt === String(context.attempt)
    && summary.workflow?.ref === context.workflowRef && summary.workflow?.event === context.event
    && summary.workflow?.sourceRef === context.ref, 'Functional workflow context mismatch');
  // Attribution remains in the original performance artifact; the proof keeps measurements.
  const { diagnostics, ...measurements } = performance;
  return { schema: 1, candidateSha: expected.sha, policyDigest: expected.policyDigest, context, functional, performance: measurements };
}

export function validateSourceRun(run, sha) {
  requireValue(run?.repository?.full_name === REPOSITORY && run?.head_repository?.full_name === REPOSITORY
    && run.workflow_id === WORKFLOW_ID && run.path === WORKFLOW && run.head_sha === sha
    && run.head_branch === 'dev' && ['push', 'workflow_dispatch'].includes(run.event)
    && run.status === 'completed' && run.conclusion === 'success', 'Source run is untrusted, incomplete, cancelled or failed');
}

export function verifyEvidence(proof, expected, run, artifact, now = Date.now()) {
  requireValue(proof?.schema === 1 && proof.candidateSha === expected.sha && proof.policyDigest === expected.policyDigest, 'Wrong candidate, report schema or policy');
  const ctx = proof.context;
  validateSourceRun(run, expected.sha);
  requireValue(ctx?.repository === REPOSITORY && ctx.runId === run.id && ctx.attempt === run.run_attempt
    && ctx.event === run.event && ctx.workflowSha === expected.sha && ctx.ref === 'refs/heads/dev'
    && ctx.workflowRef === `${REPOSITORY}/${WORKFLOW}@refs/heads/dev`, 'Report does not match the executing workflow/run attempt');
  requireValue(artifact?.name === artifactName(run.id, run.run_attempt) && artifact.expired === false
    && Number.isFinite(Date.parse(artifact.expires_at)) && Date.parse(artifact.expires_at) > now
    && artifact.workflow_run?.id === run.id && artifact.workflow_run?.head_sha === expected.sha
    && artifact.workflow_run?.head_branch === 'dev' && /^sha256:[a-f0-9]{64}$/.test(artifact.digest || ''), 'Missing, expired or mismatched artifact');
  requireValue(proof.functional.workflow?.runId === String(run.id) && proof.functional.workflow?.attempt === String(run.run_attempt)
    && proof.functional.workflow?.ref === ctx.workflowRef && proof.functional.workflow?.sourceRef === ctx.ref
    && proof.functional.workflow?.event === run.event, 'Embedded functional workflow mismatch');
  validateMeasurements(proof.functional, proof.performance, expected);
  return { candidateSha: expected.sha, runId: run.id, attempt: run.run_attempt, artifactId: artifact.id, policyDigest: expected.policyDigest };
}

const ownPath = fileURLToPath(import.meta.url);
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === ownPath) {
  requireValue(process.argv.length === 2, 'Usage: release-evidence.mjs');
  const root = dirname(dirname(ownPath)), env = process.env;
  const summaryPath = join(root, '.context/ci-test-results/summary.json'), performancePath = join(root, 'performance-ci.json');
  const summary = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath)) : null;
  if (env.GITHUB_REF !== 'refs/heads/dev' || !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)
      || !summary || summary.executedSuites?.length !== SUITE.length || !existsSync(performancePath)) {
    console.log('No complete dev release proof produced; existing CI evidence remains diagnostic.');
  } else {
    const expected = describeCandidate(root, env.GITHUB_SHA);
    const proof = createEvidence(summary, JSON.parse(readFileSync(performancePath)), expected, {
      repository: env.GITHUB_REPOSITORY, workflowSha: env.GITHUB_WORKFLOW_SHA, workflowRef: env.GITHUB_WORKFLOW_REF,
      ref: env.GITHUB_REF, event: env.GITHUB_EVENT_NAME, runId: Number(env.GITHUB_RUN_ID), attempt: Number(env.GITHUB_RUN_ATTEMPT),
    });
    mkdirSync(join(root, '.context'), { recursive: true });
    writeFileSync(join(root, '.context/release-evidence.json'), JSON.stringify(proof, null, 2) + '\n');
    console.log(`Release proof recorded for ${proof.candidateSha}; ${SUITE.length} suites and five performance runs.`);
  }
}
