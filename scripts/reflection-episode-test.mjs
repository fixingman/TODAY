import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { analyzeEpisodes } from './reflection-episode-experiment.mjs';

const today = '2026-11-30';
const date = n => `2026-11-${String(n).padStart(2, '0')}`;
const ref = (n, feeling) => ({ date: date(n), feeling, updatedAt: date(n) + 'T20:00:00.000Z' });
const event = (n, outcome, key, id = key) => ({ date: date(n), outcome, key, id });
function fixture() {
  return { saved_at: today + 'T12:00:00.000Z', reflection_policy: { choice: 'remember', updatedAt: '2026-10-01T00:00:00.000Z' },
    reflections: [...Array.from({ length: 5 }, (_, i) => ref(i + 1, 'scattered')),
      ...Array.from({ length: 5 }, (_, i) => ref(i + 11, 'present')),
      ...Array.from({ length: 7 }, (_, i) => ref(i + 21, 'calm'))],
    memory: { taskOutcomes: [...Array.from({ length: 5 }, (_, i) => event(i + 1, 'soon_pull', `txt_${i}`)),
      ...Array.from({ length: 5 }, (_, i) => event(i + 11, 'done', `txt_${i}`, `manual_${i}`)),
      ...Array.from({ length: 7 }, (_, i) => event(i + 21, 'done', `txt_baseline${i}`, `manual_baseline${i}`))] } };
}
const run = b => analyzeEpisodes(b, today);
const positive = fixture(), copy = structuredClone(positive), report = run(positive);
assert.deepEqual(positive, copy, 'Analysis cannot mutate the backup');
assert.equal(report.status, 'review_only_signals');
assert.equal(report.signals.length, 1);
assert.equal(report.signals[0].feeling, 'present');
assert.equal(report.signals[0].usefulnessVerdict, 'unverified');
assert.equal(report.signals[0].feedbackReview, 'required');
assert.equal(report.coverage.hypothesesExamined, 44);
assert.deepEqual(run({ ...positive, reflections: [...positive.reflections].reverse(),
  memory: { taskOutcomes: [...positive.memory.taskOutcomes].reverse() } }), report, 'Input order does not change selection');

const shared = fixture();
for (const r of shared.memory.taskOutcomes.filter(r => r.outcome === 'done' && r.date < date(20))) r.date = date(11);
const sharedReport = run(shared);
assert.equal(sharedReport.coverage.linkedEpisodes, 5);
assert.equal(sharedReport.routes[0].disjointDateComponents, 1);
assert.equal(sharedReport.signals.length, 0, 'Five tasks sharing one resolution day are not five observations');
const duplicate = fixture();
duplicate.memory.taskOutcomes.push(...structuredClone(duplicate.memory.taskOutcomes));
assert.deepEqual(run(duplicate), report, 'Duplicate synced events cannot inflate support');
const duplicatePair = fixture();
duplicatePair.memory.taskOutcomes.push(event(1, 'soon_pull', 'txt_extra'), event(11, 'done', 'txt_extra', 'manual_extra'));
assert.equal(run(duplicatePair).coverage.linkedEpisodes, 6);
assert.equal(run(duplicatePair).coverage.distinctDatePairs, 5);
assert.deepEqual(run(duplicatePair).signals, report.signals, 'Task multiplicity does not weight the relationship');

const outlier = fixture();
outlier.reflections.find(r => r.date === date(14)).feeling = 'calm';
outlier.reflections.find(r => r.date === date(15)).feeling = 'calm';
assert.equal(run(outlier).signals.length, 0, 'An apparent gap must survive removing every shared source date');
assert.equal(run(outlier).routes[0].failureCounts.depends_on_shared_date_or_minimum_support, 1);
const ordinary = fixture();
for (const r of ordinary.reflections.filter(r => r.date >= date(21))) r.feeling = 'present';
assert.equal(run(ordinary).signals.length, 0, 'A paired change matching ordinary evenings adds no supported comparison');

const sameDay = fixture(); sameDay.memory.taskOutcomes.push(event(1, 'done', 'txt_0', 'manual_0'));
assert.equal(run(sameDay).exclusions.sameDayOrderUnknown, 1);
assert.equal(run(sameDay).coverage.linkedEpisodes, 4);
const restart = fixture(); restart.reflections.push(ref(6, 'alive'));
restart.memory.taskOutcomes.push(event(6, 'revive', 'txt_0'));
assert.equal(run(restart).exclusions.restartedOrAmbiguousBeforeResolution, 1);
assert.equal(run(restart).routes.find(r => r.start === 'revive' && r.resolution === 'done').linkedEpisodes, 1);
const firstTerminal = fixture(); firstTerminal.memory.taskOutcomes.push(event(8, 'letgo', 'txt_0'));
assert.equal(run(firstTerminal).coverage.linkedEpisodes, 4, 'Do not skip a first resolution just because its feeling is missing');
assert.equal(run(firstTerminal).exclusions.missingEndpointFeeling, 1);
firstTerminal.reflections.push(ref(8, 'alive'));
assert.equal(run(firstTerminal).routes.find(r => r.resolution === 'letgo').linkedEpisodes, 1);
const ambiguousTerminal = fixture(); ambiguousTerminal.memory.taskOutcomes.push(event(11, 'letgo', 'txt_0'));
assert.equal(run(ambiguousTerminal).exclusions.ambiguousResolution, 1);
const collision = fixture(); collision.memory.taskOutcomes.push(event(12, 'done', 'txt_0', 'manual_different'));
assert.equal(run(collision).exclusions.ambiguousTaskKey, 1, 'Different live task ids cannot silently collapse under a text key');

const missing = fixture(); missing.memory.taskOutcomes = missing.memory.taskOutcomes.filter(r => r.outcome !== 'done' || r.date >= date(20));
assert.equal(run(missing).exclusions.noLaterRecordedOutcome, 5);
assert.equal(run(missing).signals.length, 0, 'Unknown endings are not unsuccessful episodes');
const backfilled = fixture(); backfilled.memory.taskOutcomes[0].backfilled = true;
assert.equal(run(backfilled).coverage.linkedEpisodes, 4);
const noKey = fixture(); delete noKey.memory.taskOutcomes[0].key;
assert.equal(run(noKey).exclusions.missingLinkKey, 1);
assert.equal(run(noKey).coverage.linkedEpisodes, 4);
const ambiguousReflection = fixture(); ambiguousReflection.reflections.push(ref(11, 'sad'));
assert.equal(run(ambiguousReflection).coverage.ambiguousReflectionDays, 1);
assert.equal(run(ambiguousReflection).coverage.linkedEpisodes, 4);
ambiguousReflection.reflections.push({ ...ref(11, 'present'), updatedAt: date(11) + 'T21:00:00.000Z' });
assert.equal(run(ambiguousReflection).coverage.ambiguousReflectionDays, 0);
assert.equal(run(ambiguousReflection).coverage.linkedEpisodes, 5);

const clear = fixture(); clear.reflections_cleared_at = date(20) + 'T00:00:00.000Z';
assert.equal(run(clear).coverage.linkedEpisodes, 0);
const memoryClear = fixture(); memoryClear.memory.clearedAt = date(10) + 'T00:00:00.000Z';
assert.equal(run(memoryClear).coverage.linkedEpisodes, 0);
const optedOut = fixture(); optedOut.reflection_policy.choice = 'not_for_me';
assert.equal(run(optedOut).status, 'not_opted_in');
assert.equal(run(optedOut).signals.length, 0);
const invalid = fixture(); invalid.reflections.push(ref(31, 'calm'), ref(5, 'NOT_A_FEELING'));
assert.equal(run(invalid).coverage.reflectedDays, 17);
assert.throws(() => analyzeEpisodes(fixture(), '2026-02-30'), /valid/);
assert.throws(() => analyzeEpisodes(fixture(), '2026-11-29'), /newer/);
assert.throws(() => run({}), /Expected a TODAY/);
assert.throws(() => run({ ...fixture(), saved_at: '2026-02-30T12:00:00.000Z' }), /Expected a TODAY/);
assert.throws(() => run({ ...fixture(), reflections_cleared_at: 'bad' }), /watermark/);
const expiry = fixture(); expiry.reflections.push({ date: '2026-10-31', feeling: 'calm', updatedAt: '2026-10-31T21:00:00.000Z' });
assert.equal(run(expiry).coverage.reflectedDays, 17, 'Only thirty calendar days are used');

const privateData = fixture();
privateData.manual_tasks = [{ text: 'PRIVATE_TASK_CANARY' }];
privateData.reflection_feedback = { records: [{ text: 'PRIVATE_READING_CANARY', reactionReason: 'PRIVATE_REASON_CANARY' }] };
for (const r of privateData.memory.taskOutcomes) { r.key = 'PRIVATE_KEY_CANARY' + r.key; r.id = 'PRIVATE_ID_CANARY' + r.id; r.reason = 'PRIVATE_REASON_CANARY'; }
const serialized = JSON.stringify(run(privateData));
assert.ok(!serialized.includes('CANARY'));
assert.ok(!serialized.includes(date(11)), 'No per-episode dates leave the analyzer');

const dir = mkdtempSync(join(tmpdir(), 'today-episodes-'));
try {
  const path = join(dir, 'PRIVATE_PATH_CANARY.json');
  writeFileSync(path, JSON.stringify(privateData));
  const before = readFileSync(path, 'utf8');
  const cli = (...args) => spawnSync(process.execPath, [resolve('scripts/reflection-episode-experiment.mjs'), ...args], { encoding: 'utf8' });
  const success = cli('--backup', path, '--today', today);
  assert.equal(success.status, 0, success.stderr);
  assert.ok(!success.stdout.includes('CANARY'));
  assert.equal(readFileSync(path, 'utf8'), before);
  assert.deepEqual(readdirSync(dir), ['PRIVATE_PATH_CANARY.json'], 'CLI creates no report or output files');
  writeFileSync(path, '{"PRIVATE_JSON_CANARY":');
  const failure = cli('--backup', path, '--today', today);
  assert.equal(failure.status, 1);
  assert.equal(failure.stdout, '');
  assert.ok(!failure.stderr.includes('CANARY'), 'Parser errors cannot leak source fragments or paths');
  const missingFile = cli('--backup', join(dir, 'PRIVATE_MISSING_CANARY'), '--today', today);
  assert.equal(missingFile.status, 1);
  assert.ok(!missingFile.stderr.includes('CANARY'));
  const link = join(dir, 'repo-link.json'); symlinkSync(resolve('scripts/package.json'), link);
  assert.match(cli('--backup', link, '--today', today).stderr, /outside the repository/, 'Symlinks cannot bypass repository input exclusion');
  assert.equal(cli('--backup', path, '--today', today, '--upload').status, 1);
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log('Episode experiment: linkage, shared dates, baseline, sensitivity, source fences, privacy and read-only CLI passed.');
