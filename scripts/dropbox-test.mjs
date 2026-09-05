// TODAY — Dropbox module regression test
//
// Tests: state-helper round-trips, doneTodayCount, setLastLocalChange,
// dropboxAutoSave no-op, dropboxBackup without token, mergeRemoteData task
// merge and renderManual call, module wiring.
//
// Run from repo root:
//   node scripts/dropbox-test.mjs --pre-extraction
//   node scripts/dropbox-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PRE_EXTRACTION = process.argv.includes('--pre-extraction');
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
const ok = message => console.log('  ✓ ' + message);
const fail = async (message, detail) => {
  console.error('✗ FAIL — ' + message);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};
const expectAll = async (label, result) => {
  const failed = Object.entries(result).filter(([, value]) => !value);
  if (failed.length) await fail(label, result);
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

async function openPage(extraSeed) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(
    ({ extra }) => {
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      localStorage.setItem('today_manual', JSON.stringify([
        { id: 'task_1', text: 'First task' },
        { id: 'task_2', text: 'Second task' },
      ]));
      localStorage.setItem('today_done', JSON.stringify([]));
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v));
      }
    },
    { extra: extraSeed || null }
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof dropboxBackup === 'function' && typeof mergeRemoteData === 'function' && typeof _doneTodayCount === 'function',
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.loadTrelloBoards   = () => {};
    window._aiRenderConfig    = () => {};
    window.renderMeetingNames = () => {};
  });
  return { page, errors };
}

try {
  // 1. _addDeletedId + _getDeletedIds: adds tombstone with correct id.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      _addDeletedId('task_99');
      const deleted = _getDeletedIds();
      return { hasEntry: deleted.some(d => d.id === 'task_99') };
    });
    await expectAll('_addDeletedId + _getDeletedIds', { ...result, noErrors: errors.length === 0 });
    ok('_addDeletedId + _getDeletedIds: tombstone written and read back');
    await page.close();
  }

  // 2. _doneTodayCount: 0 when no checks.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      return { isZero: _doneTodayCount() === 0 };
    });
    await expectAll('_doneTodayCount zero', { ...result, noErrors: errors.length === 0 });
    ok('_doneTodayCount: 0 when today_checked_ids is empty');
    await page.close();
  }

  // 3. _doneTodayCount: counts today's checks.
  {
    const nowISO = new Date().toISOString();
    const { page, errors } = await openPage({
      today_checked_ids: JSON.stringify([{ id: 'task_1', at: nowISO }]),
    });
    const result = await page.evaluate(() => {
      return { isOne: _doneTodayCount() === 1 };
    });
    await expectAll('_doneTodayCount counts checks', { ...result, noErrors: errors.length === 0 });
    ok('_doneTodayCount: returns 1 for one check seeded today');
    await page.close();
  }

  // 4. _setLastLocalChange: writes ISO timestamp to localStorage.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      _setLastLocalChange();
      const val = localStorage.getItem('last_local_change') || '';
      return { hasTimestamp: val.length > 0 && !isNaN(Date.parse(val)) };
    });
    await expectAll('_setLastLocalChange writes timestamp', { ...result, noErrors: errors.length === 0 });
    ok('_setLastLocalChange: writes valid ISO timestamp to last_local_change');
    await page.close();
  }

  // 5. _addCheckedId + _removeCheckedId: round-trip clean.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      _addCheckedId('task_1');
      const afterAdd = _getCheckedIds().some(c => c.id === 'task_1');
      _removeCheckedId('task_1');
      const afterRemove = _getCheckedIds().some(c => c.id === 'task_1');
      return { addedOk: afterAdd, removedOk: !afterRemove };
    });
    await expectAll('_addCheckedId + _removeCheckedId', { ...result, noErrors: errors.length === 0 });
    ok('_addCheckedId + _removeCheckedId: round-trip clean');
    await page.close();
  }

  // 6. _addUncheckedId + _removeUncheckedId: round-trip clean.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      _addUncheckedId('task_2');
      const afterAdd = _getUncheckedIds().some(u => u.id === 'task_2');
      _removeUncheckedId('task_2');
      const afterRemove = _getUncheckedIds().some(u => u.id === 'task_2');
      return { addedOk: afterAdd, removedOk: !afterRemove };
    });
    await expectAll('_addUncheckedId + _removeUncheckedId', { ...result, noErrors: errors.length === 0 });
    ok('_addUncheckedId + _removeUncheckedId: round-trip clean');
    await page.close();
  }

  // 7. dropboxAutoSave: no-op when no token — no backup side effects.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      localStorage.removeItem('dropbox_token');
      const before = localStorage.getItem('last_successful_backup');
      dropboxAutoSave();
      await new Promise(r => setTimeout(r, 1100));
      const after = localStorage.getItem('last_successful_backup');
      return { noBackup: before === after };
    });
    await expectAll('dropboxAutoSave no-op without token', { ...result, noErrors: errors.length === 0 });
    ok('dropboxAutoSave: no-op when dropbox_token absent — last_successful_backup unchanged');
    await page.close();
  }

  // 8. dropboxBackup: returns false without token (silent mode).
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      localStorage.removeItem('dropbox_token');
      const ret = await dropboxBackup(true);
      return { returnedFalse: ret === false };
    });
    await expectAll('dropboxBackup false without token', { ...result, noErrors: errors.length === 0 });
    ok('dropboxBackup(true): returns false when no token');
    await page.close();
  }

  // 9. mergeRemoteData: remote-only task added to manualTasks.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      mergeRemoteData({
        manual_tasks: [{ id: 'remote_1', text: 'Remote task' }],
        done_ids: [],
        deleted_ids: [],
        unchecked_ids: [],
        checked_ids: [],
        soon_tasks: [],
        past_tasks: [],
        habits: [],
      });
      return { hasRemoteTask: manualTasks.some(t => t.id === 'remote_1') };
    });
    await expectAll('mergeRemoteData adds remote task', { ...result, noErrors: errors.length === 0 });
    ok('mergeRemoteData: remote-only task appears in manualTasks after merge');
    await page.close();
  }

  // 10. mergeRemoteData: renders the merged task when tasks change.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      mergeRemoteData({
        manual_tasks: [{ id: 'remote_2', text: 'Another remote task' }],
        done_ids: [],
        deleted_ids: [],
        unchecked_ids: [],
        checked_ids: [],
        soon_tasks: [],
        past_tasks: [],
        habits: [],
      });
      return { rendered: !!document.querySelector('.task[data-taskid="remote_2"]') };
    });
    await expectAll('mergeRemoteData renders merged task', { ...result, noErrors: errors.length === 0 });
    ok('mergeRemoteData: renders merged task when task list changes');
    await page.close();
  }

  // 11. Daily-history merge keeps plausible per-day counts at the boundary and
  //     sanitizes corrupt local, duplicate-date, and remote-only values.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      localStorage.setItem('today_daily_history', JSON.stringify([
        { date: '2026-08-20', tasksDone: 10, tasksAdded: 30, tasksAddedFixed: true },
        { date: '2026-08-21', tasksDone: 2, tasksAdded: 42, tasksAddedFixed: true },
      ]));
      mergeRemoteData({
        manual_tasks: [], done_ids: [], deleted_ids: [], unchecked_ids: [], checked_ids: [],
        soon_tasks: [], past_tasks: [], habits: [],
        daily_history: [
          { date: '2026-08-20', tasksDone: 11, tasksAdded: 31, tasksAddedFixed: true },
          { date: '2026-08-22', tasksDone: 4, tasksAdded: 12, tasksAddedFixed: true },
          { date: '2026-08-23', tasksDone: 3, tasksAdded: 70, tasksAddedFixed: true },
        ],
      });
      const byDate = Object.fromEntries(
        safeJSON('today_daily_history', []).map(entry => [entry.date, entry])
      );
      return {
        boundaryKept: byDate['2026-08-20']?.tasksAdded === 30,
        duplicateCorruptionIgnored: byDate['2026-08-20']?.tasksDone === 11,
        localOnlyCorruptionCleared: byDate['2026-08-21']?.tasksAdded === 0,
        remoteOnlyValidKept: byDate['2026-08-22']?.tasksAdded === 12,
        remoteOnlyCorruptionCleared: byDate['2026-08-23']?.tasksAdded === 0,
      };
    });
    await expectAll('daily-history tasksAdded sanitization', { ...result, noErrors: errors.length === 0 });
    ok('mergeRemoteData: daily tasksAdded ceiling covers boundary, duplicates, and one-sided dates');
    await page.close();
  }

  // 11b. appMemory relational-slot merges (12a/12c). These exist because
  //      obligationHistory shipped in v2.78.0 without a merge entry and was silently
  //      per-device for a week — _mergeAppMemory is hand-plumbed field by field, so an
  //      omitted slot fails invisibly rather than loudly. Every accumulated slot needs
  //      a test here; unlike returningTasks or taskAgeBuckets these cannot self-heal
  //      from current state.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const D = 86400000, now = Date.now();
      const iso = d => new Date(d).toISOString().slice(0, 10);
      const base = {
        manual_tasks: [], done_ids: [], deleted_ids: [], unchecked_ids: [], checked_ids: [],
        soon_tasks: [], past_tasks: [], habits: [],
      };

      appMemory.taskOutcomes = [
        { id: 'local_1', date: iso(now), outcome: 'done', obligation: false, focusSessions: 2 },
      ];
      appMemory.spokenLines = [
        { surface: 'morning nudge', date: iso(now), text: 'local line', kind: 'letgo-reason' },
      ];
      appMemory.obligationHistory = [
        { text: 'call insurance', date: iso(now - 3 * D), done: false },
      ];

      mergeRemoteData({
        ...base,
        memory: {
          taskOutcomes: [
            // exact duplicate of the local row — must not double
            { id: 'local_1', date: iso(now), outcome: 'done', obligation: false, focusSessions: 2 },
            // genuinely remote-only
            { id: 'remote_1', date: iso(now - 5 * D), outcome: 'letgo', obligation: null, focusSessions: 0, reason: 'no_energy' },
            // same task and day, different outcome — a distinct event, must survive
            { id: 'local_1', date: iso(now), outcome: 'revive', obligation: false, focusSessions: 0 },
            // outside the 90-day window
            { id: 'ancient', date: iso(now - 200 * D), outcome: 'done', obligation: false, focusSessions: 0 },
          ],
          spokenLines: [
            // same surface+day as local — one entry per surface per day
            { surface: 'morning nudge', date: iso(now), text: 'remote line', kind: 'focus-vs-obligation' },
            { surface: 'Sunday reflection', date: iso(now - 1 * D), text: 'sunday line', kind: 'habit-alignment' },
          ],
          obligationHistory: [
            // same entry, but the other device saw it completed — done must win
            { text: 'call insurance', date: iso(now - 3 * D), done: true },
            { text: 'should email landlord', date: iso(now - 6 * D), done: false },
          ],
        },
      });

      const o = appMemory.taskOutcomes;
      const ids = o.map(e => e.id + '|' + e.outcome);
      const oblig = appMemory.obligationHistory;
      const insurance = oblig.find(e => e.text === 'call insurance');
      return {
        outcomeDuplicateNotDoubled: ids.filter(k => k === 'local_1|done').length === 1,
        outcomeRemoteMerged: ids.includes('remote_1|letgo'),
        outcomeSameDayDifferentOutcomeKept: ids.includes('local_1|revive'),
        outcomeOldPruned: !o.some(e => e.id === 'ancient'),
        outcomeSortedAscending: o.every((e, i, a) => i === 0 || a[i - 1].date <= e.date),
        outcomeUnknownObligationPreserved: o.find(e => e.id === 'remote_1').obligation === null,
        spokenOnePerSurfacePerDay:
          appMemory.spokenLines.filter(l => l.surface === 'morning nudge' && l.date === iso(now)).length === 1,
        spokenRemoteSurfaceMerged: appMemory.spokenLines.some(l => l.surface === 'Sunday reflection'),
        spokenKindPreserved: appMemory.spokenLines.every(l => typeof l.kind === 'string'),
        obligationDoneFlagOred: insurance && insurance.done === true,
        obligationRemoteOnlyMerged: oblig.some(e => e.text === 'should email landlord'),
        obligationNotDoubled: oblig.filter(e => e.text === 'call insurance').length === 1,
      };
    });
    await expectAll('appMemory relational slot merges', { ...result, noErrors: errors.length === 0 });
    ok('mergeRemoteData: taskOutcomes / spokenLines / obligationHistory union, dedup, prune, done-flag OR');
    await page.close();
  }

  // 11c. Clear watermark + hypothesis tombstones (BUG-096). "Clear all memory"
  //      must survive sync in both directions: remote rows from before a local
  //      clear must not union back, and a clear made on the other device must
  //      apply here. Hypothesis items have no date and use id tombstones.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const D = 86400000, now = Date.now();
      const iso = d => new Date(d).toISOString().slice(0, 10);
      const base = {
        manual_tasks: [], done_ids: [], deleted_ids: [], unchecked_ids: [], checked_ids: [],
        soon_tasks: [], past_tasks: [], habits: [],
      };

      // A. Local cleared yesterday. Remote still holds old rows plus one written today.
      const clearedAt = new Date(now - 1 * D).toISOString();
      appMemory.clearedAt = clearedAt;
      appMemory.clearedHypothesisIds = ['h_old'];
      appMemory.taskOutcomes = []; appMemory.spokenLines = []; appMemory.obligationHistory = [];
      appMemory.recentConversations = []; appMemory.moments = []; appMemory.recentCompletedTasks = [];
      appMemory.memory = { semantic: [], episodic: [], procedural: [] };
      mergeRemoteData({ ...base, memory: {
        taskOutcomes: [
          { id: 'old',     date: iso(now - 10 * D), outcome: 'done', obligation: false, focusSessions: 0 },
          { id: 'sameday', date: iso(now - 1 * D),  outcome: 'done', obligation: false, focusSessions: 0 },
          { id: 'new',     date: iso(now),          outcome: 'done', obligation: false, focusSessions: 0 },
        ],
        spokenLines: [
          { surface: 'morning nudge',     date: iso(now - 5 * D), text: 'old line', kind: 'letgo-reason' },
          { surface: 'Sunday reflection', date: iso(now),         text: 'new line', kind: 'bursts' },
        ],
        obligationHistory: [
          { text: 'should call the bank', date: iso(now - 20 * D), done: false },
          { text: 'must file receipts',   date: iso(now),          done: false },
        ],
        recentConversations:  [{ message: 'old question here', date: iso(now - 3 * D), time: 9 }],
        moments:              [{ type: 'big_clear', count: 6, date: iso(now - 4 * D) }],
        recentCompletedTasks: [{ text: 'old done task', date: iso(now - 2 * D) }],
        memory: { semantic: [
          { id: 'h_old', text: 'is a morning person', status: 'confirmed' },
          { id: 'h_new', text: 'prefers short tasks', status: 'confirmed' },
        ] },
      }});
      const A = {
        oldOutcomeDropped:      !appMemory.taskOutcomes.some(e => e.id === 'old'),
        newOutcomeKept:          appMemory.taskOutcomes.some(e => e.id === 'new'),
        // Rows carry a date only, so the compare is by day and a row from the clear's
        // own day is accepted. Pinned so a future "tighten to >" cannot silently start
        // dropping fresh rows written after the clear.
        sameDayRowAccepted:      appMemory.taskOutcomes.some(e => e.id === 'sameday'),
        oldSpokenDropped:       !appMemory.spokenLines.some(l => l.text === 'old line'),
        newSpokenKept:           appMemory.spokenLines.some(l => l.text === 'new line'),
        oldObligationDropped:   !appMemory.obligationHistory.some(e => e.text === 'should call the bank'),
        newObligationKept:       appMemory.obligationHistory.some(e => e.text === 'must file receipts'),
        oldConversationDropped:  appMemory.recentConversations.length === 0,
        oldMomentDropped:        appMemory.moments.length === 0,
        oldCompletedDropped:     appMemory.recentCompletedTasks.length === 0,
        tombstonedBlocked:      !appMemory.memory.semantic.some(i => i.id === 'h_old'),
        freshHypothesisMerged:   appMemory.memory.semantic.some(i => i.id === 'h_new'),
        watermarkUnchanged:      appMemory.clearedAt === clearedAt,
      };

      // B. The OTHER device cleared, after our rows were written. Its watermark must
      //    propagate and wipe our pre-clear rows; its tombstones must apply here.
      appMemory.clearedAt = '';
      appMemory.clearedHypothesisIds = [];
      appMemory.taskOutcomes = [{ id: 'mine_old', date: iso(now - 6 * D), outcome: 'letgo', obligation: null, focusSessions: 0 }];
      appMemory.spokenLines  = [{ surface: 'morning nudge', date: iso(now - 6 * D), text: 'mine', kind: 'soon-pullback' }];
      appMemory.memory = { semantic: [{ id: 'h_mine', text: 'works in bursts', status: 'confirmed' }], episodic: [], procedural: [] };
      const remoteClear = new Date(now - 2 * D).toISOString();
      mergeRemoteData({ ...base, memory: {
        clearedAt: remoteClear, clearedHypothesisIds: ['h_mine'],
        taskOutcomes: [], spokenLines: [], memory: { semantic: [] },
      }});
      const B = {
        remoteWatermarkAdopted:    appMemory.clearedAt === remoteClear,
        localPreClearOutcomeWiped: appMemory.taskOutcomes.length === 0,
        localPreClearSpokenWiped:  appMemory.spokenLines.length === 0,
        localHypothesisTombstoned: appMemory.memory.semantic.length === 0,
        tombstonesMerged:          appMemory.clearedHypothesisIds.includes('h_mine'),
      };
      return { ...A, ...B };
    });
    await expectAll('clear watermark survives sync', { ...result, noErrors: errors.length === 0 });
    ok('mergeRemoteData: clear watermark drops pre-clear rows both ways; hypothesis tombstones honoured');
    await page.close();
  }

  // 12. Weekly reflection sync accepts only text generated under the current
  //     evidence policy, so an older backup cannot resurrect biography drift.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const today = _localISO();
      const base = {
        manual_tasks: [], done_ids: [], deleted_ids: [], unchecked_ids: [], checked_ids: [],
        soon_tasks: [], past_tasks: [], habits: [],
      };
      mergeRemoteData({ ...base, week_reflection: "202 days in — that's just who you are now." });
      const rejectedOld = !localStorage.getItem('week_reflection_' + today);
      mergeRemoteData({
        ...base,
        week_reflection: 'Tuesday is becoming your unofficial cleanup crew.',
        week_reflection_policy: _weekReflectionPolicy,
      });
      return {
        rejectedOld,
        acceptedCurrent: localStorage.getItem('week_reflection_' + today) === 'Tuesday is becoming your unofficial cleanup crew.',
        policySynced: localStorage.getItem('week_policy_' + today) === _weekReflectionPolicy,
      };
    });
    await expectAll('weekly reflection policy sync', { ...result, noErrors: errors.length === 0 });
    ok('mergeRemoteData: stale weekly copy rejected; current evidence policy syncs');
    await page.close();
  }

  // 13. Suggestion outcome merge preserves monotonic evidence by offer ID.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const offeredAt = '2026-08-20T09:00:00.000Z';
      appMemory.suggestionOutcomes = [{
        id: 'inline_shared', taskId: 'task_1', taskText: 'First task',
        pattern: 'break_down', reason: 'multiple_actions', offeredAt,
        appliedAt: '2026-08-20T09:01:00.000Z', updatedAt: '2026-08-20T09:01:00.000Z',
        outcome: 'applied', resultTaskIds: ['manual_step_1'],
      }];
      mergeRemoteData({
        manual_tasks: [], done_ids: [], deleted_ids: [], unchecked_ids: [], checked_ids: [],
        soon_tasks: [], past_tasks: [], habits: [],
        memory: {
          suggestionOutcomes: [
            {
              id: 'inline_shared', taskId: 'task_1', taskText: 'First task',
              pattern: 'break_down', reason: 'multiple_actions', offeredAt,
              helpedAt: '2026-08-20T10:00:00.000Z', updatedAt: '2026-08-20T10:00:00.000Z',
              outcome: 'helped', resultTaskIds: ['manual_step_2'],
            },
            {
              id: 'inline_remote', taskId: 'task_2', taskText: 'Second task',
              pattern: 'break_down', reason: 'long_complex_task',
              offeredAt: '2026-08-21T09:00:00.000Z', updatedAt: '2026-08-21T09:00:00.000Z',
            },
          ],
        },
      });
      const shared = appMemory.suggestionOutcomes.find(entry => entry.id === 'inline_shared');
      return {
        unionById: appMemory.suggestionOutcomes.length === 2,
        appliedPreserved: !!shared?.appliedAt,
        helpedPreserved: !!shared?.helpedAt && shared?.outcome === 'helped',
        resultIdsUnited: shared?.resultTaskIds?.length === 2,
      };
    });
    await expectAll('suggestion outcome sync merge', { ...result, noErrors: errors.length === 0 });
    ok('mergeRemoteData: suggestion outcomes union by ID without losing later evidence');
    await page.close();
  }

  // 14. Static wiring checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline dropbox baseline', {
        inlineBackupPresent:  indexSrc.includes('async function dropboxBackup('),
        inlineMergePresent:   indexSrc.includes('function mergeRemoteData('),
        noModuleLoad:         !indexSrc.includes('<script src="assets/dropbox.js"></script>'),
        noPrecache:           !swSrc.includes("'/assets/dropbox.js'"),
      });
      ok('inline dropbox baseline: dropboxBackup/mergeRemoteData present inline, no module tag yet');
    } else {
      const dropboxSrc = await readFile(join(ROOT, 'assets/dropbox.js'), 'utf8');
      const requiredExports = [
        '_setLastLocalChange', '_getTrelloFocus', '_setTrelloFocus',
        '_getTrelloFocusTotal', '_setTrelloFocusTotal',
        '_getTrelloFirstSeen', '_setTrelloFirstSeen',
        '_getTrelloLastActive', '_setTrelloLastActive',
        '_markTrelloActive', '_trelloAgeBasis',
        '_getDeletedIds', '_addDeletedId', '_cleanupDeletedIds', '_cleanupHabitEvents',
        '_getUncheckedIds', '_addUncheckedId', '_removeUncheckedId',
        '_getCheckedIds', '_addCheckedId', '_removeCheckedId',
        '_doneTodayCount',
        'dropboxAutoSave', 'dropboxBackup', 'dropboxRestore', 'dropboxAuth',
        'mergeRemoteData',
      ];
      const startupIdx    = indexSrc.indexOf('window._startDropbox();');
      const connectionsIdx = indexSrc.indexOf('window._startConnections();');
      const initIdx       = indexSrc.indexOf('\ninit();');
      await expectAll('extracted dropbox module wiring', {
        moduleLoad:         indexSrc.includes('<script src="assets/dropbox.js"></script>'),
        beforeTrello:       indexSrc.indexOf("assets/dropbox.js") < indexSrc.indexOf("assets/trello.js"),
        startDropboxFirst:  startupIdx !== -1 && startupIdx < connectionsIdx,
        beforeInit:         startupIdx !== -1 && startupIdx < initIdx,
        sectionRemoved:     !indexSrc.includes('async function dropboxBackup('),
        mergeRemoved:       !indexSrc.includes('function mergeRemoteData('),
        moduleInit:         dropboxSrc.includes('window._startDropbox = function()'),
        allExports:         requiredExports.every(n => dropboxSrc.includes(`window.${n} = ${n};`)),
        weekPolicySynced:   dropboxSrc.includes('week_reflection_policy:'),
        precached:          swSrc.includes("'/assets/dropbox.js'"),
      });
      ok('extracted dropbox module: 27 exports correct, load order and init order correct');
    }
  }

  console.log(`\nDropbox tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
