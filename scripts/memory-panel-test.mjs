// TODAY — Memory Panel regression test
//
// Exercises toggleMemory, clear flow, Connections handoff, and AI abstraction
// with throttle — against the real app DOM with fetch stubbed.
//
// Run from repo root:
//   node scripts/memory-panel-test.mjs --pre-extraction
//   node scripts/memory-panel-test.mjs

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

const SEEDED_MEMORY = {
  totalTasksCompleted: 10,
  totalDaysActive: 5,
  firstSeen: '2026-01-01',
  aiName: 'Aria',
  preferences: { peakHour: 9, dragKeywords: [] },
  patterns: {
    completionsByHour: { '9': 5, '10': 3 },
    taskKeywords: {},
    focusMinutesTotal: 60,
    bestStreak: 5,
    taskLifespanSamples: [1, 2, 1, 1.5, 2],
    lateAdditions: [10, 9, 10, 9, 9],
    dayStartCount: 5,
    dayStartDate: null,
    dayShapeState: null,
    letgoReasons: {},
    triageUndos: 0,
    soonPulls: 0,
    reviveReasons: {},
    inlineSuggestions: { offered: 2, applied: 1, dismissed: 1, autoDismissed: 0 },
  },
  memory: {
    semantic: [
      { id: '0', text: 'pending semantic item', type: 'semantic', status: 'pending', addedAt: '2026-01-01' },
      { id: '1', text: 'confirmed semantic item', type: 'semantic', status: 'confirmed', addedAt: '2026-01-01' },
    ],
    episodic: [],
    procedural: [],
  },
  recentCompletedTasks: [
    { text: 'write quarterly report', date: '2026-09-10' },
    { text: 'send project update email', date: '2026-09-11' },
    { text: 'review pull request', date: '2026-09-12' },
    { text: 'prepare meeting agenda', date: '2026-09-13' },
    { text: 'fix login bug', date: '2026-09-14' },
  ],
  obligationHistory: [
    { text: 'need to call dentist', date: '2026-09-01', done: false, letgo: true },
    { text: 'should update resume', date: '2026-09-02', done: false, letgo: true },
    { text: 'must finish taxes', date: '2026-09-03', done: true, letgo: false },
    { text: 'need to reply to landlord', date: '2026-09-05', done: false, letgo: true },
    { text: 'should call mom', date: '2026-09-06', done: true, letgo: false },
  ],
  returningTasks: {
    'rt1': { text: 'reorganize workspace', dayCount: 8, focusSessions: 1 },
    'rt2': { text: 'read design patterns book', dayCount: 12, focusSessions: 0 },
  },
  taskOutcomes: [],
  moments: [],
  suggestionHistory: [{ taskId: 'manual_old', taskText: 'Old', suggested: '2026-08-20', action: 'break_down' }],
  suggestionOutcomes: [{ id: 'inline_old', taskId: 'manual_old', reason: 'multiple_actions', offeredAt: '2026-08-20T09:00:00.000Z' }],
  recentConversations: [],
  suggestionCooldowns: { manual_old: '2026-08-20' },
  meetingAttribution: { mineShown: 0, mineKept: 0, othersShown: 0, othersSelected: 0 },
};

async function openPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(seededMemory => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_ai_key_claude', 'test-claude-key');
    localStorage.setItem('today_memory', JSON.stringify(seededMemory));

    const state = window.__memoryTest = {
      saveCalls: 0,
      abstractRequests: 0,
      abstractResponses: [],
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, opts) => {
      if (String(url).includes('/.netlify/functions/ai-assist')) {
        state.abstractRequests++;
        state.lastBody = opts && opts.body;
        const response = state.abstractResponses.shift();
        if (!response) return { ok: false, status: 500, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => response };
      }
      return originalFetch(url, opts);
    };
  }, SEEDED_MEMORY);

  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof Today?.use('memory').toggle === 'function' && document.getElementById('memoryPanel'),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    _saveMemory = () => { window.__memoryTest.saveCalls++; };
  });
  return { page, errors };
}

try {
  // Panel toggle: open and close via toggleMemory().
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const panel = document.getElementById('memoryPanel');
      Today.use('memory').toggle();
      const opened = panel.classList.contains('open');
      Today.use('memory').toggle();
      const closed = !panel.classList.contains('open');
      return { opened, closed };
    });
    await expectAll('panel toggle', { ...result, noErrors: errors.length === 0 });
    ok('toggleMemory opens and closes the memory panel');
    await page.close();
  }

  // Clear request + cancel: footer shows confirm prompt, then reverts.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('memory').requestClear();
      const footer = document.getElementById('memoryFooter');
      const confirmShown = footer?.innerHTML.includes('erase everything?');
      Today.use('memory').cancelClear();
      const normalRestored = !footer?.innerHTML.includes('erase everything?')
        && footer?.innerHTML.includes('clear all memory');
      return { confirmShown, normalRestored };
    });
    await expectAll('clear request and cancel', { ...result, noErrors: errors.length === 0 });
    ok('_memoryClearRequest shows confirm footer; _memoryClearCancel restores normal footer');
    await page.close();
  }

  // Clear confirm: appMemory.memory wiped, _saveMemory called.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      window.__memoryTest.saveCalls = 0;
      // BUG-096: seed everything "clear all memory" must actually clear — the
      // 12a/12c companion slots were left untouched until v2.82.1.
      const iso = new Date().toISOString().slice(0, 10);
      appMemory.memory.semantic.push({ id: 'h1', text: 'is a morning person', status: 'confirmed' });
      appMemory.memory.procedural.push({ id: 'h2', text: 'breaks things down', status: 'proposed' });
      appMemory.returningTasks = { manual_1: { text: 'call insurance', firstSeen: iso, dayCount: 9, focusSessions: 0 } };
      appMemory.taskAgeBuckets = { d1to3: 1, d4to6: 0, d7to13: 1, d14plus: 0 };
      appMemory.obligationLanguageTally = { week: iso, count: 2, completed: 0, tasks: ['should call'] };
      appMemory.obligationHistory = [{ text: 'should call the bank', date: iso, done: false }];
      appMemory.spokenLines = [{ surface: 'morning nudge', date: iso, text: 'a line', kind: 'letgo-reason' }];
      appMemory.taskOutcomes = [{ id: 'x', date: iso, outcome: 'done', obligation: false, focusSessions: 1 }];
      appMemory.recentConversations = [{ message: 'what should I do first', date: iso, time: 9 }];
      appMemory.taskOutcomesBackfilled = true;
      appMemory.kindVerdicts = { 'letgo-reason': { landed: 0, missed: 2, retired: iso, updated: 'x' } };
      Today.use('memory').requestClear();
      Today.use('memory').confirmClear();
      const mem = appMemory.memory;
      return {
        // BUG-096
        returningEmpty:        Object.keys(appMemory.returningTasks).length === 0,
        bucketsZero:           Object.values(appMemory.taskAgeBuckets).every(n => n === 0),
        tallyReset:            appMemory.obligationLanguageTally.count === 0 && appMemory.obligationLanguageTally.tasks.length === 0,
        obligationHistoryEmpty: appMemory.obligationHistory.length === 0,
        spokenEmpty:           appMemory.spokenLines.length === 0,
        verdictsEmpty:         Object.keys(appMemory.kindVerdicts).length === 0,
        outcomesLogEmpty:      appMemory.taskOutcomes.length === 0,
        conversationsEmpty:    appMemory.recentConversations.length === 0,
        backfillFlagKept:      appMemory.taskOutcomesBackfilled === true,
        tombstonesRecorded:    appMemory.clearedHypothesisIds.includes('h1') && appMemory.clearedHypothesisIds.includes('h2'),
        watermarkSet:          typeof appMemory.clearedAt === 'string' && appMemory.clearedAt.slice(0, 10) === iso,
        semanticEmpty: mem.semantic.length === 0,
        episodicEmpty: mem.episodic.length === 0,
        proceduralEmpty: mem.procedural.length === 0,
        outcomesEmpty: appMemory.suggestionOutcomes.length === 0,
        historyEmpty: appMemory.suggestionHistory.length === 0,
        cooldownsEmpty: Object.keys(appMemory.suggestionCooldowns).length === 0,
        countersReset: appMemory.patterns.inlineSuggestions.offered === 0,
        saved: window.__memoryTest.saveCalls >= 1,
      };
    });
    await expectAll('clear confirm', { ...result, noErrors: errors.length === 0 });
    ok('_memoryClearConfirm wipes memory, the companion slots, tombstones hypotheses, sets the watermark, and saves');
    await page.close();
  }

  // Connections handoff: memory panel closes, config panel opens.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('memory').toggle();
      const memoryPanel = document.getElementById('memoryPanel');
      const configPanel = document.getElementById('configPanel');
      Today.use('memory').openConnections();
      return {
        memoryClosed: !memoryPanel.classList.contains('open'),
        configOpen: configPanel.classList.contains('open'),
      };
    });
    await expectAll('connections handoff', { ...result, noErrors: errors.length === 0 });
    ok('_memoryGoToConnections closes memory panel and opens config panel');
    await page.close();
  }

  // Abstraction: items added as pending; array response parsed directly; second call throttled.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      // Real server response shape: ai-assist.js returns the parsed array directly.
      window.__memoryTest.abstractResponses.push(
        [{ type: 'semantic', text: 'test productivity pattern' }]
      );
      await Today.use('memory').abstract();
      const afterFirst = appMemory.memory.semantic.filter(i => Array.isArray(i.seenWeeks)).length;
      const throttleDateSet = !!appMemory.memory._lastAbstractDate;
      const requestsAfterFirst = window.__memoryTest.abstractRequests;
      const newItem = appMemory.memory.semantic.find(i => i.source === 'ai_abstract');
      const isPending = newItem?.status === 'pending';

      // Second call same day — should be throttled (no new request).
      window.__memoryTest.abstractResponses.push(
        [{ type: 'semantic', text: 'should not appear' }]
      );
      await Today.use('memory').abstract();
      const requestsAfterSecond = window.__memoryTest.abstractRequests;

      return {
        itemAdded: afterFirst === 1,
        isPending,
        throttleDateSet,
        throttled: requestsAfterSecond === requestsAfterFirst,
      };
    });
    await expectAll('abstraction and throttle', { ...result, noErrors: errors.length === 0 });
    ok('_memoryAbstract adds pending items via array response and throttles to once per day');
    await page.close();
  }

  // Abstraction quality: long lines kept whole up to the cap and cut on a word beyond
  // it; a rewording of a current item keeps that item; prompt asks for contrasts, not topics.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      const today = _localISO();
      const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const wk = _localISO(d);
      appMemory.memory.episodic = [{ id: 'x1', text: 'some ui/ux feedback tasks are repeated, indicating persistent issues', type: 'episodic', status: 'pending', seenWeeks: [wk], lastSeen: today }];
      delete appMemory.memory._lastAbstractDate;
      const longText = 'obligation-framed errands stay open for weeks while chosen work on the app closes the same day it is added, even when both are marked today';
      const tooLong = 'word '.repeat(50).trim();
      window.__memoryTest.abstractResponses.push({ still: [], new: [
        { type: 'episodic', text: 'repeated ui/ux feedback tasks indicate persistent issues with suggestions' },
        { type: 'semantic', text: longText },
        { type: 'procedural', text: tooLong },
      ] });
      await Today.use('memory').abstract();
      const all = ['semantic', 'episodic', 'procedural'].flatMap(t => appMemory.memory[t].map(i => i.text));
      const clipped = all.find(t => t.startsWith('word word'));
      const body = JSON.parse(window.__memoryTest.lastBody || '{}');
      const msg = body.messages?.[0]?.content || '';
      return {
        rewordingKeepsOriginal: appMemory.memory.episodic.length === 1 && appMemory.memory.episodic[0].id === 'x1',
        longLineKeptWhole: all.includes(longText),
        overCapCutOnWord: !!clipped && clipped.length <= 161 && clipped.endsWith('…') && !/wor…$/.test(clipped),
        promptAsksForContrast: msg.includes('must contrast outcomes') && !msg.includes('what themes appear'),
      };
    });
    await expectAll('abstraction quality', { ...result, noErrors: errors.length === 0 });
    ok('_memoryAbstract keeps long lines whole, cuts only past the cap on a word, treats rewordings as recurrence, asks for contrasts');
    await page.close();
  }

  // Hypothesis lifecycle: episodic replaced each run; stable items confirm after three
  // separate weeks of support and fade after four weeks without; old-schema records
  // are dropped; "not me" removes, tombstones and teaches the prompt.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      const today = _localISO();
      const back = n => { const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() - n); return _localISO(d); };
      const monday = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return _localISO(d); };
      appMemory.clearedHypothesisIds = [];
      appMemory.rejectedHypotheses = [{ text: 'avoids phone calls until the last possible moment', date: back(3) }];
      appMemory.memory = {
        semantic: [
          { id: 'A', text: 'chosen work closes fast while errands for others linger', type: 'semantic', status: 'pending', seenWeeks: [monday(back(14)), monday(back(7))], lastSeen: back(7) },
          { id: 'OLD', text: 'pre-lifecycle record without weeks', type: 'semantic', status: 'pending' },
        ],
        episodic: [
          { id: 'E1', text: 'this week admin tasks got let go while design work finished', type: 'episodic', status: 'pending', seenWeeks: [monday(back(1))], lastSeen: back(1) },
        ],
        procedural: [
          { id: 'B', text: 'starts focus sessions on tasks already carried several days', type: 'procedural', status: 'confirmed', seenWeeks: [monday(back(40))], lastSeen: back(30) },
        ],
      };
      window.__memoryTest.abstractResponses.push({
        still: ['s0'],
        new: [
          { type: 'episodic', text: 'health errands wait while invoices get paid within a day of arriving' },
          { type: 'semantic', text: 'avoids phone calls until the very last possible moment' },
          { type: 'procedural', text: 'releases obligation tasks at triage but revives chosen ones within a week' },
        ],
      });
      await Today.use('memory').abstract();
      const body = JSON.parse(window.__memoryTest.lastBody || '{}');
      const msg = body.messages?.[0]?.content || '';
      const A = appMemory.memory.semantic.find(i => i.id === 'A');
      const tomb = new Set(appMemory.clearedHypothesisIds);
      const all = ['semantic', 'episodic', 'procedural'].flatMap(t => appMemory.memory[t]);

      Today.use('memory').render();
      const panel = document.getElementById('memoryContent');
      const text = panel.textContent;
      const btn = [...panel.querySelectorAll('[data-today-click="memory.hypothesis-reject"]')]
        .find(b => b.dataset.hypothesis === 'semantic:A');
      const shown = {
        confirmedShown: text.includes('chosen work closes fast'),
        newEpisodicShown: text.includes('health errands wait'),
        pendingStableHidden: !text.includes('releases obligation tasks at triage'),
      };
      btn?.click();
      return {
        stableConfirmedOnThirdWeek: A?.status === 'confirmed' && A.seenWeeks.length === 3 && A.lastSeen === today,
        fadedStableRemoved: !all.some(i => i.id === 'B') && tomb.has('B'),
        oldSchemaRemoved: !all.some(i => i.id === 'OLD') && tomb.has('OLD'),
        episodicReplaced: !all.some(i => i.id === 'E1') && tomb.has('E1') && appMemory.memory.episodic.length === 1,
        rejectedRewordingSkipped: !all.some(i => /phone calls/.test(i.text)),
        newStablePending: appMemory.memory.procedural.some(i => i.status === 'pending' && i.seenWeeks.length === 1),
        promptCarriesStableRefs: msg.includes('"ref":"s0"') && msg.includes('chosen work closes fast'),
        promptCarriesRejections: msg.includes('wrong about them') && msg.includes('avoids phone calls'),
        ...shown,
        rejectButtonPresent: !!btn,
        rejectRemoves: !appMemory.memory.semantic.some(i => i.id === 'A'),
        rejectTombstones: appMemory.clearedHypothesisIds.includes('A'),
        rejectRecorded: appMemory.rejectedHypotheses.some(r => r.text.startsWith('chosen work closes fast')),
        rerendered: !document.getElementById('memoryContent').textContent.includes('chosen work closes fast'),
      };
    });
    await expectAll('hypothesis lifecycle', { ...result, noErrors: errors.length === 0 });
    ok('_memoryAbstract lifecycle: episodic replaced, stable confirm at 3 weeks and fade at 4, old records dropped, "not me" rejects and teaches the prompt');
    await page.close();
  }

  // Memory avoids productivity-score outputs and identity claims. Peak-hour
  // evidence remains available as a neutral observed pattern.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      localStorage.setItem('today_tasksAdded_v2', '1');
      localStorage.setItem('today_daily_history', JSON.stringify([
        { date: '2026-08-20', tasksDone: 1, tasksAdded: 2, tasksAddedFixed: true },
        { date: '2026-08-21', tasksDone: 1, tasksAdded: 2, tasksAddedFixed: true },
        { date: '2026-08-22', tasksDone: 1, tasksAdded: 2, tasksAddedFixed: true },
        { date: '2026-08-23', tasksDone: 1, tasksAdded: 2, tasksAddedFixed: true },
        { date: '2026-08-24', tasksDone: 1, tasksAdded: 2, tasksAddedFixed: true },
        { date: '2026-08-25', tasksDone: 31, tasksAdded: 31, tasksAddedFixed: true },
      ]));
      Today.use('memory').render();
      const text = document.getElementById('memoryContent')?.textContent || '';
      return {
        completionRateRemoved: !text.includes('completes 50% of tasks added')
          && !text.includes('5 done of 10 added'),
        peakEvidenceKept: text.includes('most completions between 9am–10am'),
        identityClaimRemoved: !text.includes('a morning person'),
        semanticFramingUpdated: text.includes('patterns observed over time'),
      };
    });
    await expectAll('Memory output-stat cleanup', { ...result, noErrors: errors.length === 0 });
    ok('renderMemoryPanel keeps neutral evidence without productivity scores or identity claims');
    await page.close();
  }

  // 12d Phase A: the KNOWN block shows the companion record as plain
  // facts — open items only, only the window. No reconstruction caveat (removed v2.90.13).
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const D = 86400000, now = Date.now();
      const iso = d => new Date(d).toISOString().slice(0, 10);
      appMemory.returningTasks = {
        manual_1: { text: 'work: call insurance', firstSeen: iso(now - 9 * D), dayCount: 9, focusSessions: 0 },
        manual_2: { text: 'finish the deck',      firstSeen: iso(now - 6 * D), dayCount: 6, focusSessions: 2 },
      };
      appMemory.obligationHistory = [
        { text: 'should call the bank',   date: iso(now - 3 * D), done: false },
        { text: 'must file the receipts', date: iso(now - 8 * D), done: true },
        { text: 'have to renew permit',   date: iso(now - 5 * D), done: false, letgo: true },
      ];
      appMemory.taskOutcomes = [
        { id: 'a', date: iso(now - 2 * D),  outcome: 'done',      obligation: false, focusSessions: 1 },
        { id: 'b', date: iso(now - 4 * D),  outcome: 'done',      obligation: false, focusSessions: 0, backfilled: true },
        { id: 'c', date: iso(now - 6 * D),  outcome: 'letgo',     obligation: null,  focusSessions: 0, reason: 'no_energy' },
        { id: 'd', date: iso(now - 7 * D),  outcome: 'soon_pull', obligation: false, focusSessions: 0 },
        { id: 'e', date: iso(now - 9 * D),  outcome: 'revive',    obligation: null,  focusSessions: 0 },
        { id: 'z', date: iso(now - 60 * D), outcome: 'done',      obligation: false, focusSessions: 0 },
      ];
      const ago = d => new Date(now - d * D).toISOString();
      soonTasks = [
        { id: 'manual_s1', text: 'home: book blood test', zone: 'soon', zoneChangedAt: ago(12) },
        { id: 'manual_s2', text: 'fresh soon item',       zone: 'soon', zoneChangedAt: ago(3) },
        { id: 'manual_s3', text: 'dismissed soon item',   zone: 'soon', zoneChangedAt: ago(20) },
      ];
      appMemory.revokedKnownItems = { 'sn:manual_s3': new Date().toISOString() };
      Today.use('memory').render();
      const text = document.getElementById('memoryContent')?.textContent || '';
      const knownFirst = text.indexOf('KNOWN') >= 0 && text.indexOf('KNOWN') < text.indexOf('SEMANTIC');

      // empty state
      appMemory.returningTasks = {}; appMemory.obligationHistory = []; appMemory.taskOutcomes = [];
      soonTasks = [];
      Today.use('memory').render();
      const empty = document.getElementById('memoryContent')?.textContent || '';

      return {
        knownBlockFirst: knownFirst,
        saidBlockAbsent: !text.includes('SAID'),
        returningNamedWithDays: text.includes('"call insurance" — on the list 9 days, not started'),
        tagStrippedFromReturning: !text.includes('work: call insurance'),
        returningWithSessions: text.includes('"finish the deck" — on the list 6 days, 2 focus sessions'),
        soonWaitingListed: text.includes('in Soon · "book blood test" — waiting 12 days'),
        freshSoonNotListed: !text.includes('fresh soon item'),
        revokedSoonNotListed: !text.includes('dismissed soon item'),
        openObligationListed: text.includes('"should call the bank"') && text.includes('still open'),
        doneObligationNotListed: !text.includes('file the receipts'),
        letgoObligationNotListed: !text.includes('renew permit'),
        countsLine: text.includes('30 days · 2 done · 1 let go · 1 to Soon · 1 brought back'),
        outOfWindowExcluded: text.includes('2 done'),
        noReconstructionCaveat: !text.includes('reconstructed from older history'),
        emptyKnownNote: empty.includes('nothing on record yet'),
      };
    });
    await expectAll('12d KNOWN block', { ...result, noErrors: errors.length === 0 });
    ok('renderMemoryPanel: KNOWN shows the record as plain facts — open items, Soon waits ≥7 days, 30-day window, no reconstruction caveat');
    await page.close();
  }

  // 12e RETIRED block: a retired kind is listed with its day and a "bring back"
  // action; clicking it un-retires through the registered UI action and re-renders.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      appMemory.kindVerdicts = {
        'letgo-reason':   { landed: 0, missed: 2, retired: '2026-09-07', updated: 'x' },
        'soon-pullback':  { landed: 3, missed: 0, retired: null,         updated: 'x' },
      };
      Today.use('memory').render();
      const content = () => document.getElementById('memoryContent');
      const text = content().textContent;
      const listed = text.includes('RETIRED') && text.includes('letgo reason — retired Sep 7, after 2 "not really"');
      const landedNotListed = !text.includes('soon pullback');
      const btn = content().querySelector('.memory-item-btn[data-kind="letgo-reason"]');
      const hasAction = !!btn && btn.textContent === 'bring back' && btn.dataset.todayClick === 'memory.kind-restore';
      btn.click();
      const restored = appMemory.kindVerdicts['letgo-reason'].retired === null && appMemory.kindVerdicts['letgo-reason'].missed === 0;
      const rerendered = content().textContent.includes('nothing retired');
      return { listed, landedNotListed, hasAction, restored, rerendered };
    });
    await expectAll('12e RETIRED block', { ...result, noErrors: errors.length === 0 });
    ok('renderMemoryPanel: RETIRED lists retired kinds only; "bring back" un-retires through the UI action and re-renders');
    await page.close();
  }

  // Static ownership checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline Memory Panel baseline wiring', {
        inlineSection: indexSrc.includes('// ── Memory Panel ──'),
        noModuleLoad: !indexSrc.includes('<script src="assets/memory-panel.js"></script>'),
        noPrecache: !swSrc.includes("'/assets/memory-panel.js'"),
      });
      ok('inline Memory Panel baseline');
    } else {
      const moduleSrc = await readFile(join(ROOT, 'assets/memory-panel.js'), 'utf8');
      await expectAll('extracted Memory Panel module wiring', {
        moduleLoad: indexSrc.includes('<script src="assets/memory-panel.js"></script>'),
        initializer: indexSrc.includes('window._startMemoryPanel();'),
        inlineRemoved: !indexSrc.includes('// ── Memory Panel ──'),
        moduleInitializer: moduleSrc.includes('window._startMemoryPanel = function()'),
        api: moduleSrc.includes("Today.define('memory'"),
        privateState: !indexSrc.includes('let _memoryClearPending') && !indexSrc.includes('let _memoryAbstracting'),
        precached: swSrc.includes("'/assets/memory-panel.js'"),
      });
      ok('extracted Memory Panel wiring, globals, private state, and precache');
    }
  }

  console.log(`\nMemory Panel tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
