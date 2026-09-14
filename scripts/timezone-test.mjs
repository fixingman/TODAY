// TODAY — pinned local-day and 3am habit-boundary coverage across timezones.
// Each timezone runs in a fresh Node process because TZ is process-global.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UTIL = join(ROOT, 'assets/util.js');

function sample(tz, instants) {
  const source = `
    const { _getAppDay, _localISO, _habitTodayISO } = require(${JSON.stringify(UTIL)});
    const instants = ${JSON.stringify(instants)};
    process.stdout.write(JSON.stringify(instants.map(instant => {
      const date = new Date(instant);
      return {
        instant,
        appDay: _getAppDay(date),
        localISO: _localISO(date),
        habitISO: _habitTodayISO(date),
      };
    })));
  `;
  const child = spawnSync(process.execPath, ['--input-type=commonjs', '--eval', source], {
    encoding: 'utf8',
    env: { ...process.env, TZ: tz },
  });
  assert.equal(child.status, 0, `${tz} child failed: ${child.stderr}`);
  return JSON.parse(child.stdout);
}

const sameInstant = '2026-01-01T12:30:00.000Z';
const la = sample('America/Los_Angeles', [
  sameInstant,
  '2026-03-08T09:59:00.000Z', // 01:59 PST, immediately before spring-forward
  '2026-03-08T10:01:00.000Z', // 03:01 PDT, immediately after spring-forward
  '2026-11-01T08:30:00.000Z', // first 01:30, PDT
  '2026-11-01T09:30:00.000Z', // repeated 01:30, PST
  '2026-11-01T11:01:00.000Z', // 03:01 PST
]);
const kiritimati = sample('Pacific/Kiritimati', [
  sameInstant,
  '2026-01-01T12:59:00.000Z', // 02:59 on Jan 2
  '2026-01-01T13:01:00.000Z', // 03:01 on Jan 2
]);
const kathmandu = sample('Asia/Kathmandu', [
  sameInstant,
  '2026-01-01T21:14:00.000Z', // 02:59 on Jan 2
  '2026-01-01T21:16:00.000Z', // 03:01 on Jan 2
]);

assert.equal(la[0].localISO, '2026-01-01');
assert.equal(kiritimati[0].localISO, '2026-01-02');
assert.equal(kathmandu[0].localISO, '2026-01-01');
assert.equal(kiritimati[0].appDay, 'Fri Jan 02 2026');
console.log('  ✓ one UTC instant resolves to each device\'s local app day');

assert.equal(la[1].habitISO, '2026-03-07');
assert.equal(la[2].habitISO, '2026-03-08');
assert.equal(la[1].localISO, '2026-03-08');
assert.equal(la[2].localISO, '2026-03-08');
console.log('  ✓ spring-forward keeps the habit rollover at local 3am');

assert.equal(la[3].habitISO, '2026-10-31');
assert.equal(la[4].habitISO, '2026-10-31');
assert.equal(la[5].habitISO, '2026-11-01');
assert.equal(la[3].localISO, '2026-11-01');
assert.equal(la[4].localISO, '2026-11-01');
console.log('  ✓ both fall-back 1am hours stay on yesterday until local 3am');

assert.equal(kiritimati[1].habitISO, '2026-01-01');
assert.equal(kiritimati[2].habitISO, '2026-01-02');
assert.equal(kathmandu[1].habitISO, '2026-01-01');
assert.equal(kathmandu[2].habitISO, '2026-01-02');
console.log('  ✓ date-line and fractional-offset zones share the same 3am contract');

console.log('✓ TIMEZONE TEST PASSED');
