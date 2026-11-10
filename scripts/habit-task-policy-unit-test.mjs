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
const { key, taskId, config, clean, merge, choose } = context.api;

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

const longActions = Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i, text: 'T' + i, days: [], keywords: '' }));
const c8 = config({ ...rawConfig, actions: longActions });
assert.equal(c8?.actions.length, 8, 'caps at 8 actions');
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

console.log('\n✓ HABIT TASK POLICY UNIT TEST PASSED');
