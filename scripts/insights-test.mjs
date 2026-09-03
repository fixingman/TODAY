// TODAY — insights.js regression test
//
// Tests: fresh-state init, seeded-memory init, _stripTag, _memoryOnTaskComplete,
//        _memoryOnFocusComplete, _memoryOnTaskLetgo, _memoryOnStreakUpdate,
//        _memoryOnDaySummary, _memoryForAI (full + nudge), _getProactiveObservations,
//        _pickObservationToMention (pick + cooldown), hemisphere-aware season
//        moments, static wiring.
//
// Run from repo root:
//   node scripts/insights-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, resolve));
const URL_BASE = `http://localhost:${server.address().port}`;

let browser;
const ok   = msg => console.log('  ✓ ' + msg);
const fail = async (label, detail) => {
  console.error('✗ FAIL — ' + label);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};
const expectAll = async (label, result) => {
  const failed = Object.entries(result).filter(([, v]) => !v);
  if (failed.length) await fail(label, result);
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

// openPage — seeds localStorage before page load, stubs side-effectful calls after.
// memory: parsed object stored as today_memory (null = fresh start).
// extraSeed: additional localStorage entries.
async function openPage({ memory = null, extraSeed = {} } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.evaluateOnNewDocument(({ mem, seed }) => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    if (mem) localStorage.setItem('today_memory', JSON.stringify(mem));
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, { mem: memory, seed: extraSeed });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof window._memoryForAI === 'function' &&
          typeof window._saveMemory === 'function' &&
          !!document.getElementById('addTaskBar'),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.dropboxBackup   = () => {};
    window.dropboxAutoSave = () => {};
    window._haptic         = () => {};
  });
  return { page, errors };
}

// Minimal valid memory skeleton — avoids having to repeat all fields in each test.
function baseMem(overrides = {}) {
  return {
    aiName: 'lu',
    totalTasksCompleted: 0,
    totalDaysActive: 0,
    patterns: {
      completionsByHour: {}, taskKeywords: {}, focusMinutesTotal: 0, bestStreak: 0,
      lateAdditions: [], taskLifespanSamples: [], letgoReasons: {},
      triageUndos: 0, soonPulls: 0, reviveReasons: {},
    },
    moments: [],
    preferences: { peakHour: null, dragKeywords: [] },
    suggestionCooldowns: {},
    suggestionHistory: [],
    recentCompletedTasks: [],
    memory: { semantic: [], episodic: [], procedural: [] },
    meetingAttribution: { mineShown: 0, mineKept: 0, othersShown: 0, othersSelected: 0 },
    firstSeen: '2025-01-01',
    ...overrides,
  };
}

try {
  // 1. Default init — fresh localStorage produces a valid appMemory schema.
  {
    const { page, errors } = await openPage();
    const r = await page.evaluate(() => {
      const m = appMemory;
      return {
        isObject:       m !== null && typeof m === 'object',
        hasPatterns:    typeof m.patterns === 'object',
        hasPreferences: typeof m.preferences === 'object',
        hasMoments:     Array.isArray(m.moments),
        hasAiName:      typeof m.aiName === 'string' && m.aiName.length > 0,
        hasMeetingAttr: typeof m.meetingAttribution === 'object',
        hasMemory:      typeof m.memory === 'object',
        zeroCompleted:  m.totalTasksCompleted === 0,
        zeroDays:       m.totalDaysActive === 0,
      };
    });
    await expectAll('default init schema', { ...r, noErrors: !errors.length });
    ok('default init: fresh appMemory has correct top-level schema');
    await page.close();
  }

  // 2. Seeded init — today_memory in localStorage is preserved through migration.
  {
    const { page, errors } = await openPage({
      memory: baseMem({
        aiName: 'kit',
        totalTasksCompleted: 42,
        totalDaysActive: 10,
        patterns: { completionsByHour: {}, taskKeywords: {}, focusMinutesTotal: 0, bestStreak: 3 },
      }),
    });
    const r = await page.evaluate(() => ({
      totalTasksCompleted: appMemory.totalTasksCompleted === 42,
      totalDaysActive:     appMemory.totalDaysActive === 10,
      aiNamePreserved:     appMemory.aiName === 'kit',
      bestStreak:          appMemory.patterns.bestStreak === 3,
    }));
    await expectAll('seeded init', { ...r, noErrors: !errors.length });
    ok('seeded init: today_memory from localStorage applied correctly to appMemory');
    await page.close();
  }

  // 3. _stripTag — removes "tag: " prefix, passes through untagged text.
  {
    const { page, errors } = await openPage();
    const r = await page.evaluate(() => ({
      withTag:   window._stripTag('work: fix the bug') === 'fix the bug',
      noTag:     window._stripTag('fix the bug') === 'fix the bug',
      emptyStr:  window._stripTag('') === '',
      numericTag: window._stripTag('123: some task') === 'some task',
    }));
    await expectAll('_stripTag', { ...r, noErrors: !errors.length });
    ok('_stripTag: removes "tag: " prefix; untagged text unchanged');
    await page.close();
  }

  // 4. _memoryOnTaskComplete — updates counters, keywords, recentCompletedTasks.
  {
    const { page, errors } = await openPage();
    const r = await page.evaluate(() => {
      const before = appMemory.totalTasksCompleted;
      window._memoryOnTaskComplete('work: write the report', 'manual_x1');
      const m = appMemory;
      const hour = new Date().getHours();
      return {
        totalIncremented:   m.totalTasksCompleted === before + 1,
        hourTracked:        typeof m.patterns.completionsByHour[hour] === 'number' &&
                            m.patterns.completionsByHour[hour] >= 1,
        // 'report' (6 chars, not a stop word) must appear in taskKeywords
        keywordReport:      !!(m.patterns.taskKeywords['report']),
        // original text (with tag) stored in recentCompletedTasks
        recentTaskRecorded: m.recentCompletedTasks.some(e => e.text === 'work: write the report'),
        peakHourSet:        m.preferences.peakHour === hour,
        savedToStorage:     !!localStorage.getItem('today_memory'),
      };
    });
    await expectAll('_memoryOnTaskComplete', { ...r, noErrors: !errors.length });
    ok('_memoryOnTaskComplete: totalTasksCompleted++, hour tracked, keyword indexed, recentCompletedTasks updated');
    await page.close();
  }

  // 5. _memoryOnFocusComplete — increments focusMinutesTotal.
  {
    const { page, errors } = await openPage({
      memory: baseMem({ patterns: { completionsByHour: {}, taskKeywords: {}, focusMinutesTotal: 60, bestStreak: 0 } }),
    });
    const r = await page.evaluate(() => {
      window._memoryOnFocusComplete(25);
      return {
        focusTotal:     appMemory.patterns.focusMinutesTotal === 85,
        savedToStorage: !!localStorage.getItem('today_memory'),
      };
    });
    await expectAll('_memoryOnFocusComplete', { ...r, noErrors: !errors.length });
    ok('_memoryOnFocusComplete: focusMinutesTotal 60 + 25 = 85');
    await page.close();
  }

  // 6. _memoryOnTaskLetgo — records reason, appends words to dragKeywords array.
  {
    const { page, errors } = await openPage();
    const r = await page.evaluate(() => {
      window._memoryOnTaskLetgo('work: review this sprint', 'overwhelmed');
      const m = appMemory;
      return {
        reasonCounted:  _lrCount(m.patterns.letgoReasons.overwhelmed) === 1,
        // dragKeywords is a string array; 'review' (6 chars, not a stop word) must be present
        dragHasReview:  Array.isArray(m.preferences.dragKeywords) &&
                        m.preferences.dragKeywords.includes('review'),
        // 'sprint' (6 chars, not a stop word) must also be present
        dragHasSprint:  m.preferences.dragKeywords.includes('sprint'),
        savedToStorage: !!localStorage.getItem('today_memory'),
      };
    });
    await expectAll('_memoryOnTaskLetgo', { ...r, noErrors: !errors.length });
    ok('_memoryOnTaskLetgo: letgoReasons.overwhelmed incremented, dragKeywords contains extracted words');
    await page.close();
  }

  // 6a2. A completed task must not be reported as "waiting". Production report:
  //      a task closed the previous day surfaced next morning as "still waiting
  //      after 56 days", because _updateReturningTasksMemory was the only context
  //      builder that did not filter doneIds.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const old = 'manual_' + (Date.now() - 56 * 86400000);
      const fresh = 'manual_' + (Date.now() - 9 * 86400000);
      manualTasks.length = 0;
      manualTasks.push(
        { id: old,   text: 'Move travel coasts to SEB personal', focusSessions: 0 },
        { id: fresh, text: 'travel insurance to Italy',          focusSessions: 0 },
      );
      if (typeof pastTasks !== 'undefined') pastTasks.length = 0;
      doneIds.clear();

      // Before completion: the 56-day task is legitimately waiting.
      _updateReturningTasksMemory(manualTasks, []);
      const waitingBefore = !!appMemory.returningTasks[old];
      const bucketsBefore = appMemory.taskAgeBuckets.d14plus;

      // Completed yesterday, still present in manualTasks this morning.
      doneIds.add(old);
      _updateReturningTasksMemory(manualTasks, []);
      const ctx = _memoryForAI('nudge');

      // Archived to Past is likewise not waiting.
      doneIds.clear();
      if (typeof pastTasks !== 'undefined') pastTasks.push({ id: old, text: 'Move travel coasts to SEB personal' });
      _updateReturningTasksMemory(manualTasks, []);

      return {
        waitingBeforeCompletion: waitingBefore,
        countedInAgeBucketsBefore: bucketsBefore === 1,
        droppedFromReturningWhenDone: !appMemory.returningTasks[old],
        stillTracksTheOtherTask: !!appMemory.returningTasks[fresh],
        notInAIContext: !ctx.includes('SEB personal'),
        otherTaskStillInAIContext: ctx.includes('travel insurance to Italy'),
        droppedWhenArchivedToPast: !appMemory.returningTasks[old],
        doneNotCountedAsAmbientLoad: appMemory.taskAgeBuckets.d14plus === 0,
      };
    });
    await expectAll('completed tasks are not waiting', { ...result, noErrors: errors.length === 0 });
    ok('_updateReturningTasksMemory: done and past tasks drop out of returningTasks and age buckets');
    await page.close();
  }

  // 6a3. Same stale-premise class as 6a2, different slot: a let-go obligation must
  //      stop being reported as pending, without being counted as a completion.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const today = _localISO();
      appMemory.obligationLanguageTally = { week: today, count: 3, completed: 0, tasks: [] };
      appMemory.obligationHistory = [
        { text: 'have to call the bank', date: today, done: false },
        { text: 'should renew the permit', date: today, done: false },
        { text: 'must file the receipts', date: today, done: false },
      ];

      const before = _memoryForAI();
      _memoryOnTaskLetgo('should renew the permit', 'not_relevant');
      const after = _memoryForAI();

      const entry = appMemory.obligationHistory.find(e => e.text === 'should renew the permit');
      const rateDenominatorIntact = appMemory.obligationHistory.length === 3;
      return {
        pendingBeforeLetgo: before.includes('renew the permit'),
        notPendingAfterLetgo: !after.includes('renew the permit'),
        othersStillPending: after.includes('call the bank') && after.includes('file the receipts'),
        markedLetgoNotDone: entry.letgo === true && entry.done !== true,
        notCountedAsCompletion: !after.includes('3 obligation-framed tasks — 1 completed'),
        rateDenominatorIntact,
      };
    });
    await expectAll('let-go obligations stop being pending', { ...result, noErrors: errors.length === 0 });
    ok('_memoryOnTaskLetgo: obligation marked letgo — drops from "still pending", never counts as completed');
    await page.close();
  }

  // 6a4. _memoryTaskTexts: the map from the pool's hashed ids back to live text.
  //      letgo-return can name a task only through this. If the key derivation ever
  //      drifts from _memoryTextKey, naming silently stops and falls back to counts —
  //      which looks exactly like "that task isn't on the list any more".
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      manualTasks.length = 0;
      manualTasks.push({ id: 'manual_1', text: 'work: call the bank', focusSessions: 0 });
      if (typeof soonTasks !== 'undefined') { soonTasks.length = 0; soonTasks.push({ id: 'manual_2', text: 'learn some rust', focusSessions: 0 }); }
      if (typeof pastTasks !== 'undefined') { pastTasks.length = 0; pastTasks.push({ id: 'manual_3', text: 'renew the permit', focusSessions: 0 }); }
      const map = _memoryTaskTexts();
      const D = 86400000, now = Date.now();
      const iso = d => new Date(d).toISOString().slice(0, 10);
      const id = _memoryTextKey('call the bank');
      const outcomes = [
        { id, date: iso(now - 20 * D), outcome: 'letgo',  obligation: null, focusSessions: 0, reason: 'no_energy' },
        { id, date: iso(now - 10 * D), outcome: 'revive', obligation: null, focusSessions: 0 },
        { id, date: iso(now - 6 * D),  outcome: 'letgo',  obligation: null, focusSessions: 0, reason: 'no_energy' },
        { id, date: iso(now - 2 * D),  outcome: 'revive', obligation: null, focusSessions: 0 },
      ];
      const c = _buildOutcomeCandidates(outcomes, iso(now), map).find(x => x.kind === 'letgo-return');
      return {
        tagStripped:       map[_memoryTextKey('call the bank')] === 'call the bank',
        soonIncluded:      map[_memoryTextKey('learn some rust')] === 'learn some rust',
        pastIncluded:      map[_memoryTextKey('renew the permit')] === 'renew the permit',
        idAlsoKeyed:       map['manual_1'] === 'call the bank',
        letgoReturnNames:  !!c && c.evidence.includes('"call the bank"'),
        letgoReturnCounts: !!c && c.evidence.includes('2 times'),
      };
    });
    await expectAll('_memoryTaskTexts keys match _memoryTextKey', { ...result, noErrors: errors.length === 0 });
    ok('_memoryTaskTexts: hash keys resolve live text across all lists, tag stripped; letgo-return names the task through it');
    await page.close();
  }

  // 6b. taskOutcomes capture (12c Phase 0). Every approved pool candidate is a
  //     windowed contrast, so these dated events are the only thing standing between
  //     the pool and silence. Also pins that no task text is stored.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      appMemory.taskOutcomes = [];
      manualTasks.length = 0;
      manualTasks.push({ id: 'manual_A', text: 'finish the deck', focusSessions: 3 });
      if (typeof soonTasks !== 'undefined') {
        soonTasks.length = 0;
        soonTasks.push({ id: 'manual_C', text: 'have to learn rust', focusSessions: 1 });
      }

      _memoryOnTaskComplete('finish the deck', 'manual_A');      // id path, focus known
      _memoryOnTaskLetgo('should book the dentist', 'no_energy'); // text-fallback path
      _memoryOnSoonPull('have to learn rust');                    // must not also log a letgo
      _memoryOnRevive('call the plumber', 'changed_mind');         // added v2.80.1
      _memoryOnTaskComplete('finish the deck', 'manual_A');        // repeat — must dedupe

      const o = appMemory.taskOutcomes;
      const byOutcome = k => o.filter(e => e.outcome === k);
      const serialized = JSON.stringify(o);
      return {
        fourDistinctEvents: o.length === 4,
        doneRecorded: byOutcome('done').length === 1,
        letgoRecorded: byOutcome('letgo').length === 1,
        soonPullRecorded: byOutcome('soon_pull').length === 1,
        reviveRecorded: byOutcome('revive').length === 1,
        soonPullDidNotAlsoLogLetgo: byOutcome('letgo').length === 1,
        focusResolvedById: byOutcome('done')[0].focusSessions === 3,
        focusResolvedByTextFallback: byOutcome('soon_pull')[0].focusSessions === 1,
        obligationDetectedFromText: byOutcome('letgo')[0].obligation === true,
        obligationFalseForPlainTask: byOutcome('done')[0].obligation === false,
        reasonCaptured: byOutcome('letgo')[0].reason === 'no_energy',
        noTaskTextStored: !/dentist|plumber|deck/.test(serialized),
        persisted: (JSON.parse(localStorage.getItem('today_memory')).taskOutcomes || []).length === 4,
      };
    });
    await expectAll('taskOutcomes capture', { ...result, noErrors: errors.length === 0 });
    ok('_memoryRecordOutcome: done/letgo/soon_pull/revive each once, focus + obligation resolved, no text stored');
    await page.close();
  }

  // 6c. One-time backfill (v2.80.1). The two invariants here are the whole point:
  //     unknown focus and unknown obligation must stay unknown, because writing 0 or
  //     false would manufacture the pool's most confident observation out of a gap.
  {
    const day = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
    const { page, errors } = await openPage({
      memory: {
        recentCompletedTasks: [
          { text: 'finish the deck', date: day(4) },
          { text: 'should book the dentist', date: day(6) },
          { text: 'ancient task', date: day(200) },
        ],
        patterns: {
          letgoReasons:  { no_energy:    { days: { [day(3)]: 2, _legacy: 7 } } },
          reviveReasons: { changed_mind: { days: { [day(5)]: 1 } } },
        },
      },
    });
    const result = await page.evaluate(() => {
      const o = appMemory.taskOutcomes || [];
      const done = o.filter(e => e.outcome === 'done');
      const before = o.length;
      _memoryBackfillOutcomes(); // must be idempotent
      return {
        seeded: before === 5, // 2 completions in window + 2 let-gos + 1 revive
        flagSet: appMemory.taskOutcomesBackfilled === true,
        allMarkedBackfilled: o.every(e => e.backfilled === true),
        completionsPresent: done.length === 2,
        completionsKeepRealObligation: done.length === 2 && done.every(e => typeof e.obligation === 'boolean'),
        obligationTextDetected: done.some(e => e.obligation === true),
        reasonRowsObligationUnknown: o.filter(e => e.outcome !== 'done').length === 3
          && o.filter(e => e.outcome !== 'done').every(e => e.obligation === null),
        focusNeverGuessed: o.length > 0 && o.every(e => e.focusSessions === 0 && e.backfilled === true),
        legacyBucketSkipped: !o.some(e => String(e.id).includes('_legacy')),
        outOfWindowExcluded: !o.some(e => new Date(e.date) < new Date(Date.now() - 90 * 86400000)),
        reviveBackfilled: o.some(e => e.outcome === 'revive'),
        idempotent: appMemory.taskOutcomes.length === before,
      };
    });
    await expectAll('taskOutcomes backfill', { ...result, noErrors: errors.length === 0 });
    ok('_memoryBackfillOutcomes: seeds once, marks backfilled, keeps unknown focus/obligation unknown');
    await page.close();
  }

  // 6d. spokenLines carries the candidate kind — without it the novelty gate can only
  //     string-match prose, and a kind would never actually go on cooldown.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      appMemory.spokenLines = [];
      _memoryRecordSpokenLine('morning nudge', 'a pool line', 'focus-vs-obligation');
      _memoryRecordSpokenLine('focus question', 'an untagged line');
      _memoryRecordSpokenLine('morning nudge', 'regenerated same day', 'letgo-reason');
      const l = appMemory.spokenLines;
      return {
        kindStored: l[0].kind === 'letgo-reason',
        untaggedHasNoKind: !('kind' in l.find(e => e.surface === 'focus question')),
        onePerSurfacePerDay: l.filter(e => e.surface === 'morning nudge').length === 1,
        regeneratedReplaced: l[0].text === 'regenerated same day',
        persisted: (JSON.parse(localStorage.getItem('today_memory')).spokenLines || []).length === 2,
      };
    });
    await expectAll('spokenLines kind', { ...result, noErrors: errors.length === 0 });
    ok('_memoryRecordSpokenLine: stores kind, replaces same surface+day, untagged lines carry none');
    await page.close();
  }

  // 7. _memoryOnStreakUpdate — updates bestStreak and records streak_milestone moment.
  {
    const { page, errors } = await openPage({
      memory: baseMem({ patterns: { completionsByHour: {}, taskKeywords: {}, focusMinutesTotal: 0, bestStreak: 3 } }),
    });
    const r = await page.evaluate(() => {
      window._memoryOnStreakUpdate(7);
      const m = appMemory;
      const milestoneAdded = m.moments.some(e => e.type === 'streak_milestone' && e.value === 7);
      // Calling with a lower value must not overwrite bestStreak
      window._memoryOnStreakUpdate(5);
      return {
        bestStreakUpdated: m.patterns.bestStreak === 7,
        milestoneAdded,
        noDowngrade:      m.patterns.bestStreak === 7,
      };
    });
    await expectAll('_memoryOnStreakUpdate', { ...r, noErrors: !errors.length });
    ok('_memoryOnStreakUpdate: bestStreak set to 7, streak_milestone moment recorded, lower value ignored');
    await page.close();
  }

  // 8. _memoryOnDaySummary — increments totalDaysActive; big_clear moment when ≥5.
  {
    const { page, errors } = await openPage();
    const r = await page.evaluate(() => {
      const daysBefore = appMemory.totalDaysActive;
      window._memoryOnDaySummary(5);
      const m = appMemory;
      const momentsBefore = m.moments.length;
      // Less than 5 tasks — day still counted, no big_clear moment
      window._memoryOnDaySummary(3);
      return {
        totalDaysIncremented: m.totalDaysActive === daysBefore + 2,
        bigClearAdded:        m.moments.some(e => e.type === 'big_clear' && e.count === 5),
        noMomentForUnder5:    m.moments.length === momentsBefore,
      };
    });
    await expectAll('_memoryOnDaySummary', { ...r, noErrors: !errors.length });
    ok('_memoryOnDaySummary: totalDaysActive++, big_clear added when ≥5, skipped when <5');
    await page.close();
  }

  // 9. _memoryForAI — returns non-empty string; nudge scope shorter than full.
  {
    const { page, errors } = await openPage({
      memory: baseMem({
        aiName: 'em',
        totalTasksCompleted: 100,
        totalDaysActive: 50,
        patterns: {
          completionsByHour: { '9': 20, '14': 10 }, taskKeywords: {},
          focusMinutesTotal: 180, bestStreak: 10,
          lateAdditions: [], taskLifespanSamples: [], letgoReasons: {},
          triageUndos: 0, soonPulls: 0, reviveReasons: {},
        },
        moments: [{ type: 'streak_milestone', value: 7, date: '2025-06-01' }],
        preferences: { peakHour: 9, dragKeywords: [] },
      }),
    });
    const r = await page.evaluate(() => {
      const full  = window._memoryForAI('full');
      const nudge = window._memoryForAI('nudge');
      return {
        fullIsString:  typeof full === 'string',
        fullNonEmpty:  full.length > 0,
        // peakHour:9 → "morning" should appear
        fullHasPeak:   full.includes('morning') || full.includes('afternoon') || full.includes('evening'),
        // 'full' scope: bestStreak(10)>3 → "streak" or "days" line; focusMins(180)>60 → "focused"
        fullHasStreak: full.includes('streak') || full.includes('day'),
        nudgeShorter:  nudge.length < full.length,
        nudgeIsString: typeof nudge === 'string',
      };
    });
    await expectAll('_memoryForAI', { ...r, noErrors: !errors.length });
    ok('_memoryForAI: returns non-empty string; nudge scope shorter than full scope');
    await page.close();
  }

  // 10. _getProactiveObservations — returns typed observation objects.
  {
    const { page, errors } = await openPage({
      memory: baseMem({
        totalTasksCompleted: 50,
        totalDaysActive: 20,
        // bestStreak=3 so streak=7 triggers streak_record (7>3 and 7>3)
        patterns: {
          completionsByHour: {}, taskKeywords: {}, focusMinutesTotal: 0, bestStreak: 3,
          lateAdditions: [], taskLifespanSamples: [], letgoReasons: {},
          triageUndos: 0, soonPulls: 0, reviveReasons: {},
        },
      }),
      extraSeed: { stat_streak: '7' },
    });
    const r = await page.evaluate(() => {
      // streak=7 > bestStreak=3 → streak_record (high)
      // totalTasksCompleted=50, 50%25===0 → tasks_milestone (medium)
      const obs = window._getProactiveObservations({ streak: 7 });
      return {
        isArray:      Array.isArray(obs),
        nonEmpty:     obs.length > 0,
        hasType:      obs.every(o => typeof o.type === 'string'),
        hasPriority:  obs.every(o => ['high', 'medium', 'low'].includes(o.priority)),
        hasText:      obs.every(o => typeof o.text === 'string' && o.text.length > 0),
        hasStreakRec: obs.some(o => o.type === 'streak_record'),
      };
    });
    await expectAll('_getProactiveObservations', { ...r, noErrors: !errors.length });
    ok('_getProactiveObservations: returns typed observation array (type/priority/text), streak_record present');
    await page.close();
  }

  // 11. _pickObservationToMention — picks high-priority obs; 24h cooldown gates repeat.
  {
    const { page, errors } = await openPage();
    const r = await page.evaluate(() => {
      const highObs = [{ type: 'peak_hour', priority: 'high', text: "It's 9am — your most productive hour." }];
      const first = window._pickObservationToMention(highObs);
      const cooldownSet     = localStorage.getItem('ai_last_observation') === 'peak_hour';
      const cooldownTimeSet = parseInt(localStorage.getItem('ai_last_observation_time') || '0') > 0;
      // Second call within 24h — same type filtered → null
      const second = window._pickObservationToMention(highObs);
      return {
        firstReturned:  first !== null && first.type === 'peak_hour',
        cooldownSet,
        cooldownTimeSet,
        secondNull:     second === null,
        emptyInputNull: window._pickObservationToMention([]) === null,
        nullInputNull:  window._pickObservationToMention(null) === null,
      };
    });
    await expectAll('_pickObservationToMention', { ...r, noErrors: !errors.length });
    ok('_pickObservationToMention: picks high-priority obs, writes cooldown, blocks repeat type within 24h');
    await page.close();
  }

  // 12. Season moments — same date maps to the locally correct half-year term.

  {
    const { page, errors } = await openPage();
    const r = await page.evaluate(() => {
      const febNorth = _seasonMomentForDate('2026-02-04', false);
      const febSouth = _seasonMomentForDate('2026-02-04', true);
      const junNorth = _seasonMomentForDate('2026-06-21', false);
      const junSouth = _seasonMomentForDate('2026-06-21', true);
      return {
        northSpring: febNorth?.term.includes('Start of Spring'),
        southAutumn: febSouth?.term.includes('Start of Autumn'),
        northSummerSolstice: junNorth?.term.includes('Summer Solstice'),
        southWinterSolstice: junSouth?.term.includes('Winter Solstice'),
        ordinaryDayNull: _seasonMomentForDate('2026-06-22', false) === null,
      };
    });
    await expectAll('_seasonMomentForDate', { ...r, noErrors: !errors.length });
    ok('_seasonMomentForDate: transition copy rotates by half a year in the Southern Hemisphere');
    await page.close();
  }


  // 13. Static wiring — file reads only.
  {
    const modSrc = await readFile(join(ROOT, 'assets/insights.js'), 'utf8');
    const poemUtilsSrc = await readFile(join(ROOT, 'assets/poem-utils.js'), 'utf8');
    const EXPECTED_FNS = [
      '_pickAIName', '_saveMemory', '_stripTag', '_memoryOnMeetingAttribution',
      '_memoryOnTaskComplete', '_memoryOnTaskLetgo', '_memoryOnTriageUndo',
      '_memoryOnSoonPull', '_memoryOnRevive', '_memoryOnFocusComplete',
      '_memoryOnStreakUpdate', '_memoryOnDaySummary', '_memoryForAI',
      '_getProactiveObservations', '_pickObservationToMention',
      '_noticedEligible', '_noticedStamp', '_seasonMomentForDate', '_noticedLines',
    ];
    const wiringResult = {};
    for (const name of EXPECTED_FNS) {
      wiringResult[`fn_${name}`] = modSrc.includes(`function ${name}(`);
    }
    // appMemory is a bare let binding shared in the global lexical scope —
    // it must NOT be assigned to window (callers access it by name across scripts).
    wiringResult.noWindowAppMemory = !modSrc.includes('window.appMemory');
    wiringResult.noticedUsesSeasonHelper = modSrc.includes('const seasonMoment = _seasonMomentForDate(todayISO);');
    wiringResult.sharedHemisphereDetection = poemUtilsSrc.includes('function _isSouthernTimezone()') &&
      poemUtilsSrc.includes('if (_isSouthernTimezone()) m = (m + 6) % 12;');
    await expectAll('static wiring', wiringResult);
    ok(`static wiring: all ${EXPECTED_FNS.length} functions present, appMemory not on window`);
  }

  console.log('\nInsights tests passed (13 tests).');
} finally {
  if (browser) await browser.close();
  server.close();
}
