// Direct unit tests for the 12c observation-pool candidate builders.
// Pure module, no DOM — thresholds are testable without a browser, which is the
// property Phase 1 must preserve.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const {
  _buildOutcomeCandidates,
  _buildObservationCandidates,
  _buildWeekReflectionInsight,
  _observationNoveltyGate,
  _observationGateExplain,
} = require(join(ROOT, 'assets/week-reflection-policy.js'));

let passed = 0, failed = 0;
function test(label, assertion) {
  try {
    if (!assertion()) throw new Error('assertion returned false');
    console.log('  ✓ ' + label);
    passed++;
  } catch (error) {
    console.error('  ✗ ' + label + ' — ' + error.message);
    failed++;
  }
}

const TODAY = '2026-09-01';
const ago = n => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const out = (o) => ({
  id: o.id || ('t' + Math.random()),
  date: o.date || ago(3),
  outcome: o.outcome || 'done',
  obligation: !!o.obligation,
  focusSessions: o.focusSessions || 0,
  ...(o.reason ? { reason: o.reason } : {}),
});
const kinds = list => list.map(c => c.kind);
const find = (list, k) => list.find(c => c.kind === k);

console.log('\nobservation pool — candidate builders\n');

// ── focus-vs-obligation ─────────────────────────────────────────────────────
const focusSplit = [
  out({ focusSessions: 2 }), out({ focusSessions: 2 }), out({ focusSessions: 1 }),
  out({ obligation: true }), out({ obligation: true }),
];
test('focus-vs-obligation fires when all focus went to chosen work', () =>
  !!find(_buildOutcomeCandidates(focusSplit, TODAY), 'focus-vs-obligation'));

test('focus-vs-obligation states both sides in its evidence', () => {
  const c = find(_buildOutcomeCandidates(focusSplit, TODAY), 'focus-vs-obligation');
  return c.evidence.includes('5 focus sessions') && c.evidence.includes('2 framed as');
});

test('focus-vs-obligation is silent when obligations also got focus', () =>
  !find(_buildOutcomeCandidates(
    focusSplit.concat([out({ obligation: true, focusSessions: 1 })]), TODAY), 'focus-vs-obligation'));

test('focus-vs-obligation needs observations on both sides', () =>
  !find(_buildOutcomeCandidates(
    [out({ focusSessions: 3 }), out({ focusSessions: 3 })], TODAY), 'focus-vs-obligation'));

test('focus-vs-obligation ignores outcomes older than 30 days', () =>
  !find(_buildOutcomeCandidates(
    focusSplit.map(o => ({ ...o, date: ago(45) })), TODAY), 'focus-vs-obligation'));

// ── obligation-completion ───────────────────────────────────────────────────
const rateSplit = [
  ...Array.from({ length: 5 }, () => out({ outcome: 'done' })),
  out({ outcome: 'letgo' }),
  ...Array.from({ length: 4 }, () => out({ obligation: true, outcome: 'letgo' })),
  out({ obligation: true, outcome: 'done' }),
];
test('obligation-completion fires on a real rate gap', () =>
  !!find(_buildOutcomeCandidates(rateSplit, TODAY), 'obligation-completion'));

test('obligation-completion reports both counts, not a percentage', () => {
  const c = find(_buildOutcomeCandidates(rateSplit, TODAY), 'obligation-completion');
  return c.evidence.includes('5 of 6') && c.evidence.includes('1 of 5');
});

test('obligation-completion is silent when the rates are close', () =>
  !find(_buildOutcomeCandidates([
    ...Array.from({ length: 4 }, () => out({ outcome: 'done' })),
    ...Array.from({ length: 4 }, () => out({ obligation: true, outcome: 'done' })),
  ], TODAY), 'obligation-completion'));

test('obligation-completion needs 4+ samples per side', () =>
  !find(_buildOutcomeCandidates([
    out({ outcome: 'done' }), out({ outcome: 'done' }), out({ outcome: 'done' }),
    out({ obligation: true, outcome: 'letgo' }), out({ obligation: true, outcome: 'letgo' }),
  ], TODAY), 'obligation-completion'));

// ── letgo-reason ────────────────────────────────────────────────────────────
const letgos = [
  out({ outcome: 'letgo', reason: 'not_relevant' }),
  out({ outcome: 'letgo', reason: 'not_relevant' }),
  out({ outcome: 'letgo', reason: 'not_relevant' }),
  out({ outcome: 'letgo', reason: 'no_energy' }),
];
test('letgo-reason fires on a dominant reason', () =>
  !!find(_buildOutcomeCandidates(letgos, TODAY), 'letgo-reason'));

test('letgo-reason uses the human label, not the storage key', () => {
  const c = find(_buildOutcomeCandidates(letgos, TODAY), 'letgo-reason');
  return c.evidence.includes('not relevant any more') && !c.evidence.includes('not_relevant');
});

test('letgo-reason is silent when reasons are evenly spread', () =>
  !find(_buildOutcomeCandidates([
    out({ outcome: 'letgo', reason: 'not_relevant' }),
    out({ outcome: 'letgo', reason: 'no_energy' }),
    out({ outcome: 'letgo', reason: 'lost_interest' }),
    out({ outcome: 'letgo', reason: 'replaced' }),
  ], TODAY), 'letgo-reason'));

// ── soon-pullback ───────────────────────────────────────────────────────────
test('soon-pullback fires at 3 pull-backs', () =>
  !!find(_buildOutcomeCandidates(
    Array.from({ length: 3 }, () => out({ outcome: 'soon_pull' })), TODAY), 'soon-pullback'));

test('soon-pullback is silent at 2 — a repeat, not a pattern', () =>
  !find(_buildOutcomeCandidates(
    Array.from({ length: 2 }, () => out({ outcome: 'soon_pull' })), TODAY), 'soon-pullback'));

test('soon-pullback makes the person the subject, not Soon', () => {
  const c = find(_buildOutcomeCandidates(
    Array.from({ length: 3 }, () => out({ outcome: 'soon_pull' })), TODAY), 'soon-pullback');
  return c.evidence.startsWith('You have pulled');
});

// ── shape and contract ──────────────────────────────────────────────────────
test('every candidate carries a contrast and no meaning field', () =>
  _buildOutcomeCandidates(focusSplit.concat(letgos), TODAY)
    .every(c => typeof c.contrast === 'string' && c.contrast.length > 0 && !('meaning' in c)));

test('no candidate asserts a cause', () =>
  _buildOutcomeCandidates(focusSplit.concat(letgos, rateSplit), TODAY)
    .every(c => !/\bbecause\b|\bcaused\b|\bmade you\b|\bavoid/i.test(c.contrast + ' ' + c.evidence)));

test('empty and malformed input yields no candidates, never throws', () =>
  _buildOutcomeCandidates([], TODAY).length === 0 &&
  _buildOutcomeCandidates(null, TODAY).length === 0 &&
  _buildOutcomeCandidates([null, {}, { date: 'nonsense' }], TODAY).length === 0);

// ── pool ranking and non-regression ─────────────────────────────────────────
test('pool ranks focus-vs-obligation above soon-pullback', () => {
  const all = _buildObservationCandidates({
    outcomes: focusSplit.concat(Array.from({ length: 3 }, () => out({ outcome: 'soon_pull' }))),
    todayISO: TODAY,
  });
  const k = kinds(all);
  return k.indexOf('focus-vs-obligation') < k.indexOf('soon-pullback');
});

test('pool returns candidates sorted by score descending', () => {
  const all = _buildObservationCandidates({ outcomes: rateSplit.concat(letgos), todayISO: TODAY });
  return all.every((c, i, a) => i === 0 || a[i - 1].score >= c.score);
});

test('pool tolerates no input at all', () =>
  Array.isArray(_buildObservationCandidates()) && _buildObservationCandidates().length === 0);

test('Sunday behaviour unchanged: too few days still returns null', () =>
  _buildWeekReflectionInsight({ days: [{ iso: '2026-08-31', tasks: 3 }] }) === null);

test('Sunday behaviour unchanged: a focus-leverage week still wins, now with contrast', () => {
  const days = [
    { iso: ago(6), tasks: 4, focus: 30, habitsKept: 0, habitsTotal: 0 },
    { iso: ago(5), tasks: 4, focus: 25, habitsKept: 0, habitsTotal: 0 },
    { iso: ago(4), tasks: 1, focus: 0,  habitsKept: 0, habitsTotal: 0 },
    { iso: ago(3), tasks: 1, focus: 0,  habitsKept: 0, habitsTotal: 0 },
  ];
  const insight = _buildWeekReflectionInsight({ days, history: [] });
  return insight && insight.kind === 'focus-leverage' && typeof insight.contrast === 'string';
});


// ── backfilled and unknown-obligation rows ──────────────────────────────────
console.log('\nobservation pool — backfill safety\n');

const bf = (o) => ({ ...out(o), backfilled: true });

test('backfilled rows cannot produce focus-vs-obligation (focus is unknown, not zero)', () =>
  !find(_buildOutcomeCandidates([
    bf({ focusSessions: 0 }), bf({ focusSessions: 0 }), bf({ focusSessions: 0 }),
    bf({ obligation: true }), bf({ obligation: true }),
  ], TODAY), 'focus-vs-obligation'));

test('a backfilled row cannot pad the observed side into firing', () =>
  !find(_buildOutcomeCandidates([
    out({ focusSessions: 3 }), bf({ focusSessions: 0 }),
    out({ obligation: true }), bf({ obligation: true }),
  ], TODAY), 'focus-vs-obligation'));

test('observed rows still fire normally alongside backfilled ones', () =>
  !!find(_buildOutcomeCandidates(focusSplit.concat([bf({ obligation: true })]), TODAY),
    'focus-vs-obligation'));

test('unknown obligation is not counted as chosen', () => {
  const rows = [
    ...Array.from({ length: 5 }, () => out({ outcome: 'done' })),
    out({ outcome: 'letgo' }),
    ...Array.from({ length: 4 }, () => out({ obligation: true, outcome: 'letgo' })),
    out({ obligation: true, outcome: 'done' }),
    // Eight unknown-obligation let-gos: if treated as chosen they would crush the
    // chosen completion rate and suppress a real, correct observation.
    ...Array.from({ length: 8 }, () => ({ ...out({ outcome: 'letgo' }), obligation: null, backfilled: true })),
  ];
  const c = find(_buildOutcomeCandidates(rows, TODAY), 'obligation-completion');
  return !!c && c.evidence.includes('5 of 6');
});

test('backfilled let-gos still count for letgo-reason — reason and date are real', () =>
  !!find(_buildOutcomeCandidates([
    { ...out({ outcome: 'letgo', reason: 'no_energy' }), obligation: null, backfilled: true },
    { ...out({ outcome: 'letgo', reason: 'no_energy' }), obligation: null, backfilled: true },
    { ...out({ outcome: 'letgo', reason: 'no_energy' }), obligation: null, backfilled: true },
    { ...out({ outcome: 'letgo', reason: 'replaced' }),  obligation: null, backfilled: true },
  ], TODAY), 'letgo-reason'));

test('revive rows are carried without breaking any builder', () =>
  Array.isArray(_buildOutcomeCandidates([
    out({ outcome: 'revive', reason: 'changed_mind' }),
    out({ outcome: 'revive', reason: 'changed_mind' }),
  ], TODAY)));

// ── novelty gate ────────────────────────────────────────────────────────────
console.log('\nobservation pool — novelty gate\n');

const said = (kind, daysAgo, surface = 'morning nudge') =>
  ({ surface, date: ago(daysAgo), text: 'whatever it said', kind });
const cand = (kind, extra = {}) =>
  ({ kind, score: 100, evidence: extra.evidence || 'Some grounded evidence.', contrast: extra.contrast || 'A contrast.' });

test('keeps a candidate never said before', () =>
  _observationNoveltyGate([cand('focus-vs-obligation')], { spokenLines: [], todayISO: TODAY }).length === 1);

test('drops a kind said inside its cooldown', () =>
  _observationNoveltyGate([cand('focus-vs-obligation')],
    { spokenLines: [said('focus-vs-obligation', 5)], todayISO: TODAY }).length === 0);

test('keeps a kind said outside its cooldown', () =>
  _observationNoveltyGate([cand('focus-vs-obligation')],
    { spokenLines: [said('focus-vs-obligation', 22)], todayISO: TODAY }).length === 1);

test('cooldown is per kind — a different kind does not block', () =>
  _observationNoveltyGate([cand('focus-vs-obligation')],
    { spokenLines: [said('letgo-reason', 1)], todayISO: TODAY }).length === 1);

test('cooldown is cross-surface — Sunday blocks the nudge', () =>
  _observationNoveltyGate([cand('letgo-reason')],
    { spokenLines: [said('letgo-reason', 3, 'Sunday reflection')], todayISO: TODAY }).length === 0);

test('week kinds get the shorter 7-day cooldown', () =>
  _observationNoveltyGate([cand('focus-leverage')],
    { spokenLines: [said('focus-leverage', 8)], todayISO: TODAY }).length === 1 &&
  _observationNoveltyGate([cand('focus-leverage')],
    { spokenLines: [said('focus-leverage', 3)], todayISO: TODAY }).length === 0);

test('lines with no kind are ignored by the gate', () =>
  _observationNoveltyGate([cand('focus-vs-obligation')],
    { spokenLines: [{ surface: 'morning nudge', date: ago(1), text: 'an old untagged line' }], todayISO: TODAY }).length === 1);

test('drops an age claim even when the kind is fresh', () =>
  _observationNoveltyGate([cand('some-future-kind', { evidence: 'Call insurance has sat here 9 days.' })],
    { spokenLines: [], todayISO: TODAY }).length === 0);

test('a 30-day window statement is not an age claim', () => {
  const real = _buildOutcomeCandidates(focusSplit, TODAY);
  return real.length > 0 &&
    _observationNoveltyGate(real, { spokenLines: [], todayISO: TODAY }).length === real.length;
});

test('explain gives a reason for a cooldown drop, null for a keep', () => {
  const why = _observationGateExplain(cand('letgo-reason'),
    { spokenLines: [said('letgo-reason', 2, 'Sunday reflection')], todayISO: TODAY });
  return typeof why === 'string' && why.includes('2 days ago') && why.includes('Sunday reflection') &&
    _observationGateExplain(cand('letgo-reason'), { spokenLines: [], todayISO: TODAY }) === null;
});

test('explain names the age rule when it fires', () =>
  /triage/.test(_observationGateExplain(
    cand('x', { evidence: 'It has been waiting 12 days.' }), { spokenLines: [], todayISO: TODAY })));

test('gate tolerates malformed input and never throws', () =>
  _observationNoveltyGate(null, {}).length === 0 &&
  _observationNoveltyGate([null, {}], { spokenLines: null, todayISO: TODAY }).length === 0 &&
  _observationNoveltyGate([cand('letgo-reason')], undefined).length === 1);

test('gate preserves ranking order of what survives', () => {
  const all = _buildObservationCandidates({
    outcomes: focusSplit.concat(Array.from({ length: 3 }, () => out({ outcome: 'soon_pull' }))),
    todayISO: TODAY,
  });
  const kept = _observationNoveltyGate(all, { spokenLines: [], todayISO: TODAY });
  return kept.every((c, i, a) => i === 0 || a[i - 1].score >= c.score);
});

console.log('\n' + (failed === 0 ? '✓ ' : '✗ ') + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed === 0 ? 0 : 1);
