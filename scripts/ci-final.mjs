// Keep the existing test job required even when full work is legitimately reused.
import { existsSync, realpathSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireValue } from './release-evidence.mjs';

export function verifyFinal(env, receipt) {
  for (const key of ['POLICY', 'PAYLOAD', 'MEMORY', 'WHITESPACE']) requireValue(env[key] === 'success', `Required ${key.toLowerCase()} check did not succeed`);
  if (env.REUSE === 'true') {
    requireValue(env.CI_RELEASE_REUSE === 'true' && env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/master', 'Release proof reuse is not enabled for this event');
    requireValue(env.PROOF === 'success' && env.INVARIANTS === 'success' && receipt?.reuse === true && receipt.ready === true
      && receipt.candidateSha === env.GITHUB_SHA && receipt.dev === env.GITHUB_SHA && receipt.master === env.GITHUB_SHA, 'Missing verified proof or cheap master invariants');
    requireValue(env.FUNCTIONAL === 'skipped' && env.PERFORMANCE === 'skipped', 'Unexpected reused gate state');
  } else {
    requireValue(env.FUNCTIONAL === 'success', 'Functional gate did not succeed');
    requireValue(['true', 'false'].includes(env.PERFORMANCE_REQUIRED), 'Missing performance policy');
    requireValue(env.PERFORMANCE === (env.PERFORMANCE_REQUIRED === 'true' ? 'success' : 'skipped'), 'Required performance gate did not succeed');
  }
  return true;
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let receipt = null;
  if (process.env.REUSE === 'true') receipt = JSON.parse(readFileSync('.context/release-proof-check.json'));
  verifyFinal(process.env, receipt);
  console.log('Required validation dependencies passed.');
}
