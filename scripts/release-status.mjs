// Read-only status/promotion preflight. Dispatch is explicit; this tool never pushes.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, realpathSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPOSITORY, WORKFLOW, WORKFLOW_ID, artifactName, requireValue, validSha, sha256, describeCandidate, verifyEvidence, validateSourceRun } from './release-evidence.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const command = (binary, args, options = {}) => execFileSync(binary, args, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024, ...options });
const git = args => command('git', args).trim();
const api = (path, args = [], binary = false) => {
  const result = command('gh', ['api', '--hostname', 'github.com', `repos/${REPOSITORY}${path ? '/' + path : ''}`, ...args], binary ? { encoding: null } : {});
  return binary ? result : result ? JSON.parse(result) : null;
};

export function verifyArchive(bytes, artifact) {
  requireValue(artifact.digest === `sha256:${sha256(bytes)}`, 'Artifact archive digest mismatch');
}

export function promotionPreflight(sha, before, after, ancestor, evidence) {
  requireValue(validSha(sha) && before.dev === sha && after.dev === sha, 'Dev advanced or candidate is not the current dev commit');
  requireValue(before.master === after.master && validSha(after.master), 'Master changed during evidence verification');
  requireValue(ancestor === true, 'Promotion would not be an identical-SHA fast-forward');
  requireValue(evidence?.candidateSha === sha && Number.isSafeInteger(evidence.runId), 'No verified exact-candidate release proof');
  return { ...evidence, dev: after.dev, master: after.master, ready: true };
}

export function validateDispatch(sha, context, event, dev) {
  requireValue(validSha(sha) && context.repository === REPOSITORY && context.ref === 'refs/heads/dev'
    && context.sha === sha && context.workflowSha === sha && dev === sha, 'Release dispatch must execute the recorded current dev SHA and its workflow');
  requireValue(event.inputs?.mode === 'release' && event.inputs?.candidate === sha, 'Release dispatch requires an explicit matching candidate SHA');
}

function remoteRefs() {
  const origin = git(['remote', 'get-url', 'origin']);
  requireValue([`https://github.com/${REPOSITORY}.git`, `https://github.com/${REPOSITORY}`, `git@github.com:${REPOSITORY}.git`].includes(origin), 'Origin is not the trusted repository');
  const rows = git(['ls-remote', '--heads', 'origin', 'dev', 'master']).split('\n').map(row => row.split(/\s+/));
  const result = Object.fromEntries(rows.map(([sha, ref]) => [ref?.replace('refs/heads/', ''), sha]));
  requireValue(validSha(result.dev) && validSha(result.master), 'Missing remote dev/master refs');
  return result;
}

export function decodeArchive(zip, artifact) {
  requireValue(zip.length <= 32 * 1024 * 1024, 'Artifact archive too large');
  verifyArchive(zip, artifact);
  const directory = mkdtempSync(join(tmpdir(), 'today-release-proof-'));
  try {
    const path = join(directory, 'artifact.zip'); writeFileSync(path, zip);
    const member = '.context/release-evidence.json';
    const entries = command('unzip', ['-Z1', path]).trim().split('\n');
    requireValue(entries.filter(name => name === member).length === 1, 'Missing or duplicate release proof in artifact');
    return JSON.parse(command('unzip', ['-p', path, member], { maxBuffer: 4 * 1024 * 1024, timeout: 15000 }));
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

function readProof(run, expected) {
  validateSourceRun(run, expected.sha);
  const artifacts = api(`actions/runs/${run.id}/artifacts?per_page=100`).artifacts;
  const matches = artifacts.filter(item => item.name === artifactName(run.id, run.run_attempt));
  requireValue(matches.length === 1, 'Missing or ambiguous run-attempt artifact; run full release validation');
  const artifact = matches[0];
  requireValue(artifact.expired === false && Date.parse(artifact.expires_at) > Date.now()
    && artifact.size_in_bytes > 0 && artifact.size_in_bytes <= 32 * 1024 * 1024, 'Artifact missing, expired or too large');
  const zip = api(`actions/artifacts/${artifact.id}/zip`, [], true);
  return verifyEvidence(decodeArchive(zip, artifact), expected, run, artifact);
}

function inspect(sha, runId) {
  const expected = describeCandidate(ROOT, sha), before = remoteRefs();
  requireValue(before.dev === sha, 'Candidate is not the current dev SHA; no stale promotion');
  git(['fetch', 'origin', 'dev', 'master']);
  const runs = runId ? [api(`actions/runs/${runId}`)]
    : api(`actions/workflows/${WORKFLOW_ID}/runs?head_sha=${sha}&per_page=100`).workflow_runs;
  const eligible = runs.filter(run => run.head_sha === sha && run.head_branch === 'dev'
    && run.status === 'completed' && run.conclusion === 'success' && ['push', 'workflow_dispatch'].includes(run.event));
  requireValue(eligible.length > 0, 'No completed successful dev release run; full validation is pending/required');
  const errors = [];
  for (const run of eligible) {
    try {
      const proof = readProof(run, expected), after = remoteRefs();
      let ancestor = false;
      try { git(['merge-base', '--is-ancestor', after.master, sha]); ancestor = true; } catch { /* refused below */ }
      return promotionPreflight(sha, before, after, ancestor, proof);
    } catch (error) { errors.push(`run ${run.id}: ${error.message.split('\n')[0]}`); }
  }
  throw new Error('No reusable proof; full validation required. ' + errors.slice(0, 3).join('; '));
}

function dispatch(sha) {
  describeCandidate(ROOT, sha);
  requireValue(remoteRefs().dev === sha, 'Dispatch candidate is no longer current dev');
  const repository = api(''), content = api(`contents/${WORKFLOW}?ref=${encodeURIComponent(repository.default_branch)}`);
  const bootstrapped = Buffer.from(content.content, 'base64');
  requireValue(sha256(bootstrapped) === sha256(readFileSync(join(ROOT, WORKFLOW))), 'Release workflow must first be bootstrapped on the default branch');
  requireValue(remoteRefs().dev === sha, 'Dev advanced before dispatch');
  api(`actions/workflows/${WORKFLOW_ID}/dispatches`, ['-X', 'POST', '-f', 'ref=dev', '-f', 'inputs[mode]=release', '-f', `inputs[candidate]=${sha}`]);
  console.log(`Full release validation dispatched for ${sha}. Hand off; do not poll.`);
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, sha, ...extra] = process.argv.slice(2);
  try {
    requireValue(['status', 'preflight', 'dispatch', 'reuse', 'candidate'].includes(mode) && validSha(sha)
      && (!extra.length || (['status', 'preflight'].includes(mode) && extra.length === 2 && extra[0] === '--run' && /^[1-9]\d*$/.test(extra[1]))), 'Usage: release-status.mjs status|preflight|dispatch|reuse|candidate SHA [--run ID]');
    if (mode === 'candidate') {
      const env = process.env;
      requireValue(env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_SHA === sha && git(['rev-parse', 'HEAD']) === sha, 'Checkout does not match the trusted workflow candidate');
      if (env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
        const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH));
        if (event.inputs?.mode === 'release') validateDispatch(sha, { repository: env.GITHUB_REPOSITORY, ref: env.GITHUB_REF, sha: env.GITHUB_SHA, workflowSha: env.GITHUB_WORKFLOW_SHA }, event, remoteRefs().dev);
      }
    } else if (mode === 'dispatch') dispatch(sha);
    else if (mode === 'reuse') {
      requireValue(process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_REF === 'refs/heads/master' && process.env.CI_RELEASE_REUSE === 'true'
        && process.env.GITHUB_SHA === sha && process.env.GITHUB_WORKFLOW_SHA === sha, 'Reuse is only permitted for an enabled exact-SHA master push');
      let result;
      try { result = { reuse: true, ...inspect(sha) }; }
      catch (error) { result = { reuse: false, reason: error.message.split('\n')[0] }; }
      mkdirSync(join(ROOT, '.context'), { recursive: true });
      writeFileSync(join(ROOT, '.context/release-proof-check.json'), JSON.stringify(result, null, 2) + '\n');
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `reuse=${result.reuse}\n`);
      console.log(result.reuse ? `Verified full dev proof for ${sha}; cheap master invariants remain required.` : `Full master validation required: ${result.reason}`);
    } else console.log(JSON.stringify(inspect(sha, extra[1]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
