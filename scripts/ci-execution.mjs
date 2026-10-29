// Event policy for phase-2 activation; release proof reuse remains separate.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, realpathSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRepoPlan } from './ci-plan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function executionPolicy(plan, env, event = {}) {
  const dispatch = env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  const requested = event.inputs?.mode || 'release';
  if (dispatch && !['release', 'shadow'].includes(requested)) throw new Error('Unknown dispatched validation mode');
  const routine = env.CI_ROUTINE_SELECTION === 'true' && (
    (env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/dev') ||
    (env.GITHUB_EVENT_NAME === 'pull_request' && event.pull_request?.base?.ref === 'dev')
  );
  const mode = dispatch && requested === 'shadow' ? 'shadow' : routine ? 'selected' : 'full';
  const performance = mode !== 'selected' || plan.performance === true;
  return {
    schema: 1, candidateSha: plan.head, mode, performance,
    runnerArgs: mode === 'selected' ? ['--changed'] : mode === 'shadow' ? ['--shadow'] : [],
    reason: mode === 'selected' ? 'routine dev validation; planner full fallbacks remain active'
      : mode === 'shadow' ? 'explicit full shadow checkpoint'
      : 'master/release/non-routine validation or routine selection disabled',
    plan,
  };
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--run')) throw new Error('Usage: ci-execution.mjs [--run]');
  let event = {};
  try { if (process.env.GITHUB_EVENT_PATH) event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')); }
  catch { /* The planner records an unsafe-base full fallback. */ }
  const policy = executionPolicy(createRepoPlan(ROOT, process.env), process.env, event);
  const evidence = join(ROOT, '.context', 'ci-execution.json');
  mkdirSync(dirname(evidence), { recursive: true });
  writeFileSync(evidence, JSON.stringify(policy, null, 2) + '\n');
  console.log(`Validation: ${policy.mode}; performance ${policy.performance ? 'required' : 'release/nightly only'}. ${policy.reason}.`);
  if (args[0] === '--run') {
    const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'test-all.mjs'), ...policy.runnerArgs], { stdio: 'inherit' });
    if (result.error) console.error(result.error.message);
    process.exit(result.status ?? 1);
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `performance=${policy.performance}\nmode=${policy.mode}\n`);
}
