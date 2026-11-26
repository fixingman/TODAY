// TODAY — habit-task-policy: deterministic selection, merge, and config sanitization.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
context.window.window = context.window;
context.window.Today = {
  define(name, api) { context.apiName = name; context.api = api; },
};
vm.runInNewContext(readFileSync(new URL('../assets/habit-task-policy.js', import.meta.url), 'utf8'), context);

assert.equal(context.apiName, 'habit-task-policy');
const { key, taskId, config, clean, merge, choose, basis, signals, load, REASON_LIST } = context.api;

// ── key / taskId ────────────────────────────────────────────────────────────
assert.equal(key('habit_abc', '2026-11-10'), 'habit_abc::2026-11-10');
assert.equal(taskId('habit_abc', '2026-11-10'), 'habit_task_habit_abc::2026-11-10');
console.log('  ✓ key and taskId produce expected identifiers');

// ── config() sanitization ───────────────────────────────────────────────────
const baseAction = { id: 'a1', text: 'Go for a run', days: [], keywords: '', minutes: 0 };
const rawConfig = { enabled: true, calendarTiming: false, calendarTitles: false,
  actions: [baseAction], defaultId: 'a1', updatedAt: '2026-11-10T08:00:00.000Z' };
const c = config(rawConfig);
assert.ok(c, 'valid config returns non-null');
assert.equal(c.enabled, true);
assert.equal(c.actions.length, 1);
assert.equal(c.actions[0].text, 'Go for a run');
assert.equal(c.defaultId, 'a1');

assert.equal(config(null), null, 'null input → null');
assert.equal(config({ ...rawConfig, updatedAt: 'bad' }), null, 'invalid updatedAt → null');
assert.equal(config({ ...rawConfig, actions: [] }), null, 'empty actions → null');
assert.equal(config({ ...rawConfig, actions: [baseAction, baseAction] }), null, 'duplicate action IDs → null');

const longActions = Array.from({ length: 15 }, (_, i) => ({ id: 'x' + i, text: 'T' + i, days: [], keywords: '' }));
const c8 = config({ ...rawConfig, actions: longActions });
assert.equal(c8?.actions.length, 14, 'caps at 14 actions (a varied set)');
assert.equal(c.mode, 'set', 'configs without a mode keep rotating their set');
const cf = config({ ...rawConfig, mode: 'fresh', note: '  short walks  ', avoid: ['x', 7, ''] });
assert.equal(cf.mode, 'fresh'); assert.equal(cf.note, 'short walks'); assert.deepEqual(cf.avoid, ['x']);
console.log('  ✓ config() validates and sanitizes action arrays');

const c2 = config({ ...rawConfig, defaultId: 'nonexistent' });
assert.equal(c2?.defaultId, 'a1', 'invalid defaultId falls back to first action');
console.log('  ✓ config() falls back defaultId to first action');

// ── clean() ─────────────────────────────────────────────────────────────────
const occurrence = { habitId: 'habit_x', day: '2026-11-10', actionId: 'a1', text: 'Run',
  createdAt: '2026-11-10T06:00:00.000Z', updatedAt: '2026-11-10T06:00:00.000Z', state: 'active', edited: false };
const raw = { configs: { habit_x: rawConfig }, occurrences: { 'habit_x::2026-11-10': occurrence } };
const cleaned = clean(raw);
assert.ok(cleaned.configs.habit_x, 'valid config survives clean');
assert.ok(cleaned.occurrences['habit_x::2026-11-10'], 'valid occurrence survives clean');

const badOccurrence = { ...occurrence, state: 'invalid' };
const cleanedBad = clean({ configs: {}, occurrences: { 'habit_x::2026-11-10': badOccurrence } });
assert.equal(Object.keys(cleanedBad.occurrences).length, 0, 'unknown state is dropped');

const wrongKey = { ...occurrence, habitId: 'habit_y' };
const cleanedWrong = clean({ configs: {}, occurrences: { 'habit_x::2026-11-10': wrongKey } });
assert.equal(Object.keys(cleanedWrong.occurrences).length, 0, 'key mismatch is dropped');
console.log('  ✓ clean() drops invalid occurrences and unknown states');

// ── merge() — first-write-wins for automatic, LWW for explicit ──────────────
const at1 = '2026-11-10T06:00:00.000Z', at2 = '2026-11-10T07:00:00.000Z';
const oAuto1 = { ...occurrence, createdAt: at1, updatedAt: at1, edited: false, state: 'active' };
const oAuto2 = { ...occurrence, createdAt: at2, updatedAt: at2, edited: false, state: 'active', text: 'Walk' };

// First-write-wins: oAuto1 (earlier createdAt) beats oAuto2
const mergedAuto = merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': oAuto1 } },
                         { configs: {}, occurrences: { 'habit_x::2026-11-10': oAuto2 } });
assert.equal(mergedAuto.occurrences['habit_x::2026-11-10'].text, 'Run', 'first automatic write wins');

const mergedAutoSwapped = merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': oAuto2 } },
                                { configs: {}, occurrences: { 'habit_x::2026-11-10': oAuto1 } });
assert.equal(mergedAutoSwapped.occurrences['habit_x::2026-11-10'].text, 'Run', 'merge(b,a) = merge(a,b) for automatic');
console.log('  ✓ automatic occurrences: first-write-wins, commutativity');

// LWW for explicit edits
const oExplicit1 = { ...occurrence, createdAt: at1, updatedAt: at1, edited: true, state: 'active', text: 'Swim' };
const oExplicit2 = { ...occurrence, createdAt: at1, updatedAt: at2, edited: true, state: 'active', text: 'Bike' };
const mergedExplicit = merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': oExplicit1 } },
                             { configs: {}, occurrences: { 'habit_x::2026-11-10': oExplicit2 } });
assert.equal(mergedExplicit.occurrences['habit_x::2026-11-10'].text, 'Bike', 'later explicit edit wins');

// Explicit beats automatic
const mergedMixed = merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': oExplicit1 } },
                          { configs: {}, occurrences: { 'habit_x::2026-11-10': oAuto1 } });
assert.equal(mergedMixed.occurrences['habit_x::2026-11-10'].edited, true, 'explicit beats automatic');
console.log('  ✓ explicit edits: LWW; explicit beats automatic regardless of timestamps');

// Config LWW
const cfg1 = { ...rawConfig, updatedAt: at1 };
const cfg2 = { ...rawConfig, updatedAt: at2, enabled: false };
const mergedCfg = merge({ configs: { habit_x: cfg1 }, occurrences: {} },
                        { configs: { habit_x: cfg2 }, occurrences: {} });
assert.equal(mergedCfg.configs.habit_x.enabled, false, 'later config update wins');
console.log('  ✓ config merges use last-write-wins by updatedAt');

// ── choose() — deterministic selection ─────────────────────────────────────
const cfg = config({ enabled: true, calendarTiming: false, calendarTitles: false,
  actions: [
    { id: 'weekday', text: 'Morning run', days: [1, 2, 3, 4, 5], keywords: '', minutes: 0 },
    { id: 'weekend', text: 'Long hike', days: [0, 6], keywords: '', minutes: 0 },
  ], defaultId: 'weekday', updatedAt: '2026-11-10T08:00:00.000Z' });

// 2026-11-10 is Monday (day 1) — weekday action should be chosen
const mon = choose(cfg, '2026-11-10', null);
assert.equal(mon.id, 'weekday', 'weekday action chosen on Monday');
// 2026-11-15 is Saturday (day 6) — weekend action should be chosen
const sat = choose(cfg, '2026-11-15', null);
assert.equal(sat.id, 'weekend', 'weekend action chosen on Saturday');
console.log('  ✓ choose() selects by day-of-week');

// Default action fallback when no action fits
const cfgNoMatch = config({ ...rawConfig, actions: [
  { id: 'gym', text: 'Gym session', days: [1, 3, 5], keywords: '', minutes: 0 },
  { id: 'rest', text: 'Rest', days: [], keywords: '', minutes: 0 },
], defaultId: 'rest', updatedAt: '2026-11-10T08:00:00.000Z' });
// 2026-11-15 is Saturday — no days match; 'rest' has no days restriction so it's rank 1
const satFallback = choose(cfgNoMatch, '2026-11-15', null);
assert.equal(satFallback.id, 'rest', 'any-day action used when specific days do not match');
console.log('  ✓ choose() falls back to any-day action when specific days do not match');

// Deterministic: same day always gets same result
const r1 = choose(cfg, '2026-11-10', null);
const r2 = choose(cfg, '2026-11-10', null);
assert.deepEqual(r1, r2, 'choose() is deterministic for same day');
console.log('  ✓ choose() is deterministic for the same day');

// Keyword matching ranks above day-of-week when snapshot matches
const cfgKeyword = config({ enabled: true, calendarTiming: false, calendarTitles: true,
  actions: [
    { id: 'yoga', text: 'Yoga class', days: [], keywords: 'yoga,class', minutes: 0 },
    { id: 'base', text: 'Morning run', days: [], keywords: '', minutes: 0 },
  ], defaultId: 'base', updatedAt: '2026-11-10T08:00:00.000Z' });
const now = Date.now();
const snapshot = { day: '2026-11-10', capturedAt: now, events: [{ start: now + 3600000, end: now + 7200000, title: 'Hot Yoga Class' }] };
const withKeyword = choose(cfgKeyword, '2026-11-10', snapshot, now);
assert.equal(withKeyword.id, 'yoga', 'keyword match wins over non-keyword candidate');
const noMatch = choose(cfgKeyword, '2026-11-10', null, now);
assert.equal(noMatch.id, 'base', 'falls back to default without matching snapshot');
console.log('  ✓ choose() prefers keyword-matched action when calendar title matches');

// Rotation: with recent ids supplied, the set is used up before anything repeats
const cfgSet = config({ ...rawConfig, actions: ['a', 'b', 'c', 'd'].map(id => ({ id, text: id })) });
const seen = []; let day = new Date('2026-11-10T12:00:00');
for (let i = 0; i < 4; i++) {
  const iso = day.toISOString().slice(0, 10);
  seen.unshift(choose(cfgSet, iso, null, Date.now(), seen).id); day.setDate(day.getDate() + 1);
}
assert.equal(new Set(seen).size, 4, 'four days use four different actions');
console.log('  ✓ choose() rotates through the whole set before repeating');

// A task the AI wrote wins over an offline fallback for the same day
const occ = (actionId, createdAt) => ({ habitId: 'habit_x', day: '2026-11-10', actionId, text: actionId, createdAt, updatedAt: createdAt, state: 'active', edited: false });
const k = key('habit_x', '2026-11-10');
const early = { configs: {}, occurrences: { [k]: occ('a1', '2026-11-10T03:00:00.000Z') } };
const wrote = { configs: {}, occurrences: { [k]: occ('ai', '2026-11-10T03:05:00.000Z') } };
assert.equal(merge(early, wrote).occurrences[k].actionId, 'ai');
assert.equal(merge(wrote, early).occurrences[k].actionId, 'ai');
console.log('  ✓ merge() keeps the AI-written task over a fallback');

// ── signals: learned from behaviour, no note required ─────────────────────────
const DAY = '2026-11-26';
const back = n => { const d = new Date(DAY + 'T12:00:00'); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const at = (d, h, m = 0) => new Date(`${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();
const coffee = { id: 'habit_coffee', name: 'Coffee' }, stretch = { id: 'habit_stretch', name: 'Stretch' };
function world({ days = 20, hour = 9, partnerGap = 10, night = false, aiDays = 0, keptAi = true } = {}) {
  const events = {}, completions = { habit_coffee: [], habit_stretch: [] }, occurrences = {};
  for (let n = 1; n <= days; n++) {
    const d = back(n);
    const when = night ? at(back(n - 1), 1, 30) : at(d, hour, partnerGap);
    events[key('habit_stretch', d)] = { type: 'check', at: when };
    events[key('habit_coffee', d)] = { type: 'check', at: night ? at(back(n - 1), 1, 25) : at(d, hour, 0) };
    completions.habit_stretch.push(d); completions.habit_coffee.push(d);
  }
  for (let n = 1; n <= aiDays; n++) {
    const d = back(n);
    occurrences[key('habit_stretch', d)] = { habitId: 'habit_stretch', day: d, actionId: 'ai', text: 'Stretch ' + n, state: 'expired', createdAt: at(d, 3), updatedAt: at(d, 3), edited: false, basis: '' };
    if (!keptAi) completions.habit_stretch = completions.habit_stretch.filter(x => x !== d);
  }
  return { habit: stretch, habits: [coffee, stretch], day: DAY, completions, events, occurrences };
}
let sig = signals(world());
assert.equal(sig.usually, 'morning', 'usual time from daytime checks, no note needed');
assert.equal(sig.after, 'Coffee', 'a habit checked 0-20 min before on ≥10 days is the stack partner');
assert.equal(signals(world({ partnerGap: 30 })).after, null, 'more than 20 minutes apart is not a stack');
assert.equal(signals(world({ days: 9 })).after, null, 'fewer than 10 shared days is not a stack');
const reversed = world(); for (const k of Object.keys(reversed.events)) if (k.startsWith('habit_coffee')) reversed.events[k] = { type: 'check', at: new Date(Date.parse(reversed.events[k].at) + 20 * 60000).toISOString() };
assert.equal(signals(reversed).after, null, 'a partner checked after this habit is not "after"');
sig = signals(world({ night: true }));
assert.equal(sig.usually, null, 'night-ticked checks (after midnight) are logging, not doing time');
assert.equal(sig.after, null, 'night-ticked pairs are not a stack');
console.log('  ✓ signals: usual time and stack partner from daytime checks; night logging and reversed order ignored');

// lately / size
assert.equal(signals(world({ aiDays: 7, keptAi: true })).lately, 'steady');
assert.equal(signals(world({ aiDays: 7, keptAi: true })).size, 'deepen', 'steady and not heavy → one step deeper');
const slipping = world({ aiDays: 5, keptAi: false });
assert.equal(signals(slipping).lately, 'slipping');
assert.equal(signals(slipping).size, 'return', 'no checks for 3 days after a kept stretch → return');
const slip2 = world({ aiDays: 5, keptAi: false }); slip2.completions.habit_stretch.push(back(1));
assert.equal(signals(slip2).lately, 'mixed', 'a kept day breaks a missed run');
const missedRun = world({ aiDays: 3, keptAi: false }); missedRun.completions.habit_stretch.push(back(2)); 
assert.ok(['practice', 'minimal', 'return'].includes(signals(missedRun).size));
const deepened = world({ aiDays: 7, keptAi: true }); deepened.occurrences[key('habit_stretch', back(1))].size = 'deepen';
assert.equal(signals(deepened).size, 'practice', 'at most one deepen every 3 days');
assert.equal(signals({ ...world({ aiDays: 7, keptAi: true }), today: 'heavy' }).size, 'practice', 'heavy day with unknown record: normal size, never shrink by default');
console.log('  ✓ size: steady deepens (spaced), heavy day alone never shrinks, a gap returns');

// heavy-day record (D3: keep consistency on hard days)
function rated(holds) {
  const w = world({ aiDays: 0 });
  for (let n = 1; n <= 12; n++) {
    const d = back(n), heavy = n % 3 === 0;
    w.occurrences[key('habit_stretch', d)] = { habitId: 'habit_stretch', day: d, actionId: 'ai', text: 'S' + n, state: 'expired', createdAt: at(d, 3), updatedAt: at(d, 3), edited: false, basis: '', load: heavy ? 'heavy' : 'normal', loadSource: 'full' };
    if (heavy && !holds) w.completions.habit_stretch = w.completions.habit_stretch.filter(x => x !== d);
  }
  return w;
}
assert.equal(signals(rated(true)).heavyDays, 'holds');
assert.equal(signals({ ...rated(true), today: 'heavy' }).size === 'minimal', false, 'holds on heavy days → normal size on a heavy day');
assert.equal(signals(rated(false)).heavyDays, 'slips');
assert.equal(signals({ ...rated(false), today: 'heavy' }).size, 'minimal', 'slips on heavy days → smallest version on a heavy day');
console.log('  ✓ heavy days: a habit that holds keeps its size; one that slips gets the smallest version');

// reasons
assert.equal(JSON.stringify(REASON_LIST.map(([, l]) => l)), JSON.stringify(['too hard', 'not useful', 'did it my way']));
const hard = world({ aiDays: 3, keptAi: true }); hard.occurrences[key('habit_stretch', back(1))].dismissReason = 'too_hard';
assert.equal(signals(hard).size, 'minimal', '"too hard" → the next 2 days are the smallest version');
const notUseful = world({ aiDays: 3, keptAi: true }); notUseful.occurrences[key('habit_stretch', back(2))].dismissReason = 'not_useful';
assert.ok(signals(notUseful).avoid.includes('Stretch 2'), '"not useful" text joins avoid');
const missed = world({ aiDays: 3, keptAi: false });
assert.ok(signals(missed).avoid.includes('Stretch 1'), 'an undone suggestion is not repeated');
const mine = world({ aiDays: 6, keptAi: true }); for (const n of [1, 3, 5]) mine.occurrences[key('habit_stretch', back(n))].dismissReason = 'my_way';
assert.equal(signals(mine).ownWay, true, '"did it my way" 3 of 10 → stay close to the usual routine');
console.log('  ✓ reasons: too hard → smaller, not useful/undone → avoided, did it my way → own routine');

// reduction goal, from the name or the note
assert.equal(signals({ ...world(), habit: { id: 'habit_stretch', name: 'Less snus' } }).goal, 'reduce');
assert.equal(signals({ ...world(), habit: { id: 'habit_stretch', name: 'No snus' } }).goal, 'reduce');
assert.equal(signals({ ...world(), note: 'cut down slowly' }).goal, 'reduce');
assert.equal(signals(world()).goal, null);
console.log('  ✓ reduction goal from name or note');

// load (aggregates only; unknown never heavy)
assert.equal(load({ carried: 12, carriedHistory: [4, 5, 6, 5], calendarHours: 1 }).load, 'heavy', 'carry-over well above usual');
assert.equal(load({ carried: 4, carriedHistory: [4, 5, 6, 5], calendarHours: 6 }).load, 'heavy', 'full calendar');
assert.equal(load({ carried: 4, carriedHistory: [4, 5, 6, 5], keptYesterday: 0, habitsYesterday: 6 }).load, 'heavy', 'rough yesterday');
assert.equal(JSON.stringify(load({ carried: 4, carriedHistory: [4, 5, 6, 5], calendarHours: 1, keptYesterday: 5, habitsYesterday: 6 })), JSON.stringify({ load: 'light', source: 'full' }));
assert.equal(JSON.stringify(load({})), JSON.stringify({ load: 'normal', source: 'partial' }), 'nothing known → normal, partial');
console.log('  ✓ load: heavy from carry-over, calendar or yesterday; unknown never heavy');

// merge: expiry never erases explicit feedback; load merges on its own
const mk = (o) => ({ habitId: 'habit_x', day: '2026-11-10', actionId: 'ai', text: 'Run', createdAt: at1, updatedAt: at1, state: 'active', edited: false, basis: '', ...o });
const dismissed = mk({ state: 'dismissed', edited: true, dismissReason: 'too_hard', updatedAt: at1 });
const expiredLater = mk({ state: 'expired', updatedAt: at2 });
for (const [a, b] of [[dismissed, expiredLater], [expiredLater, dismissed]]) {
  const m = merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': a } }, { configs: {}, occurrences: { 'habit_x::2026-11-10': b } }).occurrences['habit_x::2026-11-10'];
  assert.equal(m.dismissReason, 'too_hard', 'a later automatic expiry never erases a reason');
}
const activeA = mk({ load: 'normal', loadSource: 'partial' }), expiredB = mk({ state: 'expired', updatedAt: at2, createdAt: at2, load: 'heavy', loadSource: 'full' });
const ml = merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': activeA } }, { configs: {}, occurrences: { 'habit_x::2026-11-10': expiredB } }).occurrences['habit_x::2026-11-10'];
assert.equal(ml.state, 'expired', 'a closed day stays closed after merge');
assert.equal(ml.load, 'heavy', 'a calendar-informed load beats a partial one');
const ml2 = merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': mk({ load: 'light', loadSource: 'partial' }) } },
  { configs: {}, occurrences: { 'habit_x::2026-11-10': mk({ createdAt: at2, load: 'heavy', loadSource: 'partial' }) } }).occurrences['habit_x::2026-11-10'];
assert.equal(ml2.load, 'light', 'otherwise the first load written wins');
const restored = mk({ state: 'active', updatedAt: at2 }), staleExpired = mk({ state: 'expired', updatedAt: at1 });
for (const [a, b] of [[restored, staleExpired], [staleExpired, restored]])
  assert.equal(merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': a } }, { configs: {}, occurrences: { 'habit_x::2026-11-10': b } }).occurrences['habit_x::2026-11-10'].state, 'active', 'an older expiry never undoes a later restore');
const fullA = mk({ load: 'light', loadSource: 'full' }), fullB = mk({ load: 'heavy', loadSource: 'full' });
const ab = merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': fullA } }, { configs: {}, occurrences: { 'habit_x::2026-11-10': fullB } }).occurrences['habit_x::2026-11-10'].load;
const ba = merge({ configs: {}, occurrences: { 'habit_x::2026-11-10': fullB } }, { configs: {}, occurrences: { 'habit_x::2026-11-10': fullA } }).occurrences['habit_x::2026-11-10'].load;
assert.equal(ab, ba, 'load merge converges regardless of order');
assert.equal(load({ carried: 3, carriedHistory: [] }).load, 'normal', 'no carry-over history → never heavy from carry-over');
const cleanedNew = clean({ occurrences: { 'habit_x::2026-11-10': mk({ load: 'bogus', size: 'huge', dismissReason: 'x', reasonCheckAt: 'no' }) } }).occurrences['habit_x::2026-11-10'];
assert.ok(!('load' in cleanedNew) && !('size' in cleanedNew) && !('dismissReason' in cleanedNew) && !('reasonCheckAt' in cleanedNew), 'clean() drops invalid new fields');
console.log('  ✓ merge: explicit feedback survives expiry; load merges separately; clean() validates new fields');

console.log('\n✓ HABIT TASK POLICY UNIT TEST PASSED');
