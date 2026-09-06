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
  _observationEligibleFor,
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
// ── letgo-return ────────────────────────────────────────────────────────────
// A let-go and a revive of the same task share an id; that link is the evidence.
const cycle = (id, lgDays, rvDays) => [
  out({ id, outcome: 'letgo', reason: 'no_energy', date: ago(lgDays) }),
  out({ id, outcome: 'revive', date: ago(rvDays) }),
];
const twoLoops = cycle('a', 20, 10).concat(cycle('b', 30, 5));

test('letgo-return fires when 2 revives link back to earlier let-gos', () =>
  !!find(_buildOutcomeCandidates(twoLoops, TODAY), 'letgo-return'));

test('letgo-return ignores revives with no matching let-go — counting side by side was the bug', () =>
  !find(_buildOutcomeCandidates([
    out({ id: 'x', outcome: 'letgo', reason: 'no_energy' }), out({ id: 'y', outcome: 'letgo', reason: 'no_energy' }),
    out({ id: 'p', outcome: 'revive' }), out({ id: 'q', outcome: 'revive' }),
  ], TODAY), 'letgo-return'));

test('letgo-return requires the let-go to precede the revive', () =>
  !find(_buildOutcomeCandidates(cycle('a', 5, 20).concat(cycle('b', 5, 20)), TODAY), 'letgo-return'));

test('letgo-return cannot link backfilled rows — synthetic ids never match', () =>
  !find(_buildOutcomeCandidates([
    out({ id: 'bf_letgo_no_energy_2026-07-20_0',  outcome: 'letgo',  reason: 'no_energy', date: ago(20) }),
    out({ id: 'bf_revive_no_energy_2026-07-30_0', outcome: 'revive', date: ago(10) }),
    out({ id: 'bf_letgo_no_energy_2026-07-20_1',  outcome: 'letgo',  reason: 'no_energy', date: ago(20) }),
    out({ id: 'bf_revive_no_energy_2026-07-30_1', outcome: 'revive', date: ago(10) }),
  ].map(e => ({ ...e, backfilled: true })), TODAY), 'letgo-return'));

test('letgo-return links a release from before the window — only the return must be recent', () =>
  !!find(_buildOutcomeCandidates(cycle('a', 70, 10).concat(cycle('b', 80, 5)), TODAY), 'letgo-return'));

test('letgo-return ignores returns older than 45 days', () =>
  !find(_buildOutcomeCandidates(cycle('a', 70, 46).concat(cycle('b', 80, 50)), TODAY), 'letgo-return'));

test('letgo-return is silent on a single linked return — an event, not a pattern', () =>
  !find(_buildOutcomeCandidates(cycle('a', 20, 10), TODAY), 'letgo-return'));

test('letgo-return names the tasks when the live lists still hold them', () => {
  const c = find(_buildOutcomeCandidates(twoLoops, TODAY, { a: 'call the dentist', b: 'renew passport' }), 'letgo-return');
  return c && c.evidence.includes('"call the dentist"') && c.evidence.includes('"renew passport"');
});

test('letgo-return falls back to counts once the tasks are gone from every list', () => {
  const c = find(_buildOutcomeCandidates(twoLoops, TODAY), 'letgo-return');
  return c && /\b2 things you had let go came back\./.test(c.evidence) && !/of them|of the/i.test(c.evidence);
});

test('letgo-return names one task cycling twice as the loop it is', () => {
  const c = find(_buildOutcomeCandidates(cycle('a', 40, 30).concat(cycle('a', 20, 10)), TODAY, { a: 'call the dentist' }), 'letgo-return');
  return c && /"call the dentist" has gone out and come back 2 times\./.test(c.evidence) && c.contrast === 'Let go, and back again.';
});

test('letgo-return truncates a long task name to 40 characters', () => {
  const long = 'x'.repeat(60);
  const c = find(_buildOutcomeCandidates(twoLoops, TODAY, { a: long, b: 'b' }), 'letgo-return');
  return c && c.evidence.includes('"' + 'x'.repeat(40) + '"') && !c.evidence.includes('x'.repeat(41));
});

test('letgo-return evidence names its window and never "this month"', () => {
  const c = find(_buildOutcomeCandidates(twoLoops, TODAY), 'letgo-return');
  return c && /45 days/.test(c.evidence) && !/this month/i.test(c.evidence);
});

test('letgo-return ranks below soon-pullback', () => {
  const k = kinds(_buildObservationCandidates({
    outcomes: twoLoops.concat(Array.from({ length: 3 }, () => out({ outcome: 'soon_pull' }))),
    todayISO: TODAY,
  }));
  return k.indexOf('soon-pullback') < k.indexOf('letgo-return');
});

test('letgo-return is on a 30-day cross-surface cooldown — one firing per 45-day window', () => {
  const c = { kind: 'letgo-return', evidence: 'x', contrast: 'y' };
  const said = d => ({ spokenLines: [{ surface: 'morning nudge', date: ago(d), kind: 'letgo-return' }], todayISO: TODAY });
  return typeof _observationGateExplain(c, said(29)) === 'string' && _observationGateExplain(c, said(30)) === null;
});

test('pool still returns nothing when the only events are 31–45 days old and unlinked', () =>
  _buildOutcomeCandidates([out({ outcome: 'letgo', reason: 'no_energy', date: ago(40) })], TODAY).length === 0);

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

// ── return-finished ─────────────────────────────────────────────────────────
console.log('\nobservation pool — return-finished\n');

// let-go → revive → done for three distinct tasks. Done rows use the live id but
// carry `key`; let-go/revive rows use the hash as id. Linking must cross that.
const loop = (k, lg, rv, dn) => [
  { id: k, key: k, date: ago(lg), outcome: 'letgo',  obligation: null, focusSessions: 0, reason: 'no_energy' },
  { id: k, key: k, date: ago(rv), outcome: 'revive', obligation: null, focusSessions: 0 },
  ...(dn == null ? [] : [{ id: 'manual_' + k, key: k, date: ago(dn), outcome: 'done', obligation: false, focusSessions: 1 }]),
];
const threeDone = [...loop('h1', 30, 20, 10), ...loop('h2', 28, 18, 8), ...loop('h3', 26, 16, 6)];
const texts = { h1: 'call insurance', h2: 'renew the permit', h3: 'fix the bike' };

test('fires when 3 distinct returned tasks all got done, linking done by key across the id boundary', () => {
  const c = find(_buildOutcomeCandidates(threeDone, TODAY, texts), 'return-finished');
  return !!c && c.evidence.includes('3 things you had let go came back') && c.evidence.includes('All 3 got done')
    && c.evidence.includes('"call insurance"') && c.contrast === 'Let go, brought back, finished.';
});

test('silent at 2 returned tasks — that is letgo-return territory', () =>
  !find(_buildOutcomeCandidates([...loop('h1', 30, 20, 10), ...loop('h2', 28, 18, 8)], TODAY), 'return-finished'));

test('partial: 3 returned, 1 finished → the second reading', () => {
  const c = find(_buildOutcomeCandidates([...loop('h1', 30, 20, 10), ...loop('h2', 28, 18, null), ...loop('h3', 26, 16, null)], TODAY), 'return-finished');
  return !!c && c.evidence.includes('3 things you had let go came back; 1 of them got done') && c.contrast === 'Brought back is not the same as finished.';
});

test('silent when nothing that came back got finished — verdict-shaped', () =>
  !find(_buildOutcomeCandidates([...loop('h1', 30, 20, null), ...loop('h2', 28, 18, null), ...loop('h3', 26, 16, null)], TODAY), 'return-finished'));

test('a done BEFORE the revive does not count as finishing it', () =>
  !find(_buildOutcomeCandidates([...loop('h1', 30, 20, 25), ...loop('h2', 28, 18, 22), ...loop('h3', 26, 16, 19)], TODAY), 'return-finished'));

test('a done for a different key does not count', () => {
  const rows = [...loop('h1', 30, 20, null), ...loop('h2', 28, 18, null), ...loop('h3', 26, 16, null),
    { id: 'manual_x', key: 'hx', date: ago(5), outcome: 'done', obligation: false, focusSessions: 0 }];
  return !find(_buildOutcomeCandidates(rows, TODAY), 'return-finished');
});

test('when it fires, letgo-return is not offered alongside it — same revives', () => {
  const ks = kinds(_buildOutcomeCandidates(threeDone, TODAY));
  return ks.includes('return-finished') && !ks.includes('letgo-return');
});

test('ranks above letgo-return and recurring-day, below letgo-reason', () => {
  const c = find(_buildOutcomeCandidates(threeDone, TODAY), 'return-finished');
  return c.score > 85 && c.score > 90 && c.score < 95;
});

test('aggregate kind: not eligible on the morning, eligible on Sunday', () => {
  const c = find(_buildOutcomeCandidates(threeDone, TODAY), 'return-finished');
  return _observationEligibleFor([c], 'nudge', { hasObligationOnList: true }).length === 0
    && _observationEligibleFor([c], 'sunday').length === 1;
});

test('has its own cooldown — a fresh firing is dropped for 30 days', () =>
  _observationNoveltyGate([{ kind: 'return-finished', score: 92, evidence: 'x', contrast: 'y' }],
    { spokenLines: [{ surface: 'Sunday reflection', date: ago(20), text: 'said', kind: 'return-finished' }], todayISO: TODAY }).length === 0 &&
  _observationNoveltyGate([{ kind: 'return-finished', score: 92, evidence: 'x', contrast: 'y' }],
    { spokenLines: [{ surface: 'Sunday reflection', date: ago(31), text: 'said', kind: 'return-finished' }], todayISO: TODAY }).length === 1);

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


// ── letgo-reason: base rate and a real second side ─────────────────────────
console.log('\nobservation pool — letgo-reason shape\n');

const letgosWithDones = letgos.concat(Array.from({ length: 6 }, () => out({ outcome: 'done' })));

test('letgo-reason states the let-go count against everything that ended', () => {
  const c = find(_buildOutcomeCandidates(letgosWithDones, TODAY), 'letgo-reason');
  return !!c && c.evidence.includes('4 of the 10 things that ended');
});

test('letgo-reason contrast names the reasons that did NOT dominate', () => {
  const c = find(_buildOutcomeCandidates(letgos, TODAY), 'letgo-reason');
  return !!c && /energy/i.test(c.contrast) && /interest/i.test(c.contrast)
    && /replacement/i.test(c.contrast) && !/relevan/i.test(c.contrast);
});

test('letgo-reason contrast is not a restatement of its evidence', () => {
  const c = find(_buildOutcomeCandidates(letgos, TODAY), 'letgo-reason');
  return !!c && !/one reason|most of what/i.test(c.contrast);
});

test('letgo-reason still fires with no completions in the window', () =>
  !!find(_buildOutcomeCandidates(letgos, TODAY), 'letgo-reason'));

// ── per-surface eligibility ────────────────────────────────────────────────
console.log('\nobservation pool — eligibility\n');

const allKinds = ['focus-vs-obligation', 'obligation-completion', 'letgo-reason',
  'soon-pullback', 'letgo-return', 'focus-leverage', 'habit-alignment',
  'recurring-day', 'bursts'].map(k => cand(k));

test('morning nudge carries only kinds that point at the list now', () => {
  const kept = _observationEligibleFor(allKinds, 'nudge', { hasObligationOnList: true }).map(c => c.kind);
  return kept.length === 3
    && kept.includes('letgo-return') && kept.includes('soon-pullback') && kept.includes('focus-vs-obligation');
});

test('morning nudge rejects the aggregate kinds that read as month insights', () => {
  const kept = new Set(_observationEligibleFor(allKinds, 'nudge', { hasObligationOnList: true }).map(c => c.kind));
  return !kept.has('letgo-reason') && !kept.has('obligation-completion') && !kept.has('focus-leverage')
    && !kept.has('habit-alignment') && !kept.has('recurring-day') && !kept.has('bursts');
});

test('focus-vs-obligation needs an obligation on today\'s list to reach the morning', () => {
  const withHook = _observationEligibleFor([cand('focus-vs-obligation')], 'nudge', { hasObligationOnList: true });
  const without  = _observationEligibleFor([cand('focus-vs-obligation')], 'nudge', { hasObligationOnList: false });
  const noCtx    = _observationEligibleFor([cand('focus-vs-obligation')], 'nudge');
  return withHook.length === 1 && without.length === 0 && noCtx.length === 0;
});

test('Sunday carries every kind', () =>
  _observationEligibleFor(allKinds, 'sunday').length === allKinds.length);

test('an unknown surface is unrestricted rather than silently empty', () =>
  _observationEligibleFor(allKinds, 'noticed').length === allKinds.length);

test('eligibility preserves ranking order', () => {
  const kept = _observationEligibleFor(allKinds, 'sunday');
  return kept.every((c, i, a) => i === 0 || a[i - 1].score >= c.score);
});

test('eligibility tolerates malformed input and never throws', () =>
  _observationEligibleFor(null, 'nudge').length === 0
  && _observationEligibleFor([null, {}], 'nudge').length === 0
  && Array.isArray(_observationEligibleFor(allKinds, undefined)));

console.log('\n' + (failed === 0 ? '✓ ' : '✗ ') + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed === 0 ? 0 : 1);
