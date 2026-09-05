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
  recentCompletedTasks: [],
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

  // Abstraction: items added as pending on first call; second call same day throttled.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      window.__memoryTest.abstractResponses.push({
        content: '[{"type":"semantic","text":"test productivity pattern"}]',
      });
      await Today.use('memory').abstract();
      const afterFirst = appMemory.memory.semantic.length;
      const throttleDateSet = !!appMemory.memory._lastAbstractDate;
      const requestsAfterFirst = window.__memoryTest.abstractRequests;

      // Second call same day — should be throttled (no new request).
      window.__memoryTest.abstractResponses.push({
        content: '[{"type":"semantic","text":"should not appear"}]',
      });
      await Today.use('memory').abstract();
      const requestsAfterSecond = window.__memoryTest.abstractRequests;

      return {
        itemAdded: afterFirst > 2,
        throttleDateSet,
        throttled: requestsAfterSecond === requestsAfterFirst,
      };
    });
    await expectAll('abstraction and throttle', { ...result, noErrors: errors.length === 0 });
    ok('_memoryAbstract adds items and throttles to once per day');
    await page.close();
  }

  // Completion-rate memory ignores an implausible restored day while keeping
  // plausible per-day counts at the shared data-integrity boundary.
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
        correctRate: text.includes('completes 50% of tasks added'),
        correctEvidence: text.includes('5 done of 10 added'),
        corruptDayExcluded: !text.includes('36 done of 41 added'),
      };
    });
    await expectAll('completion-rate daily-count sanitization', { ...result, noErrors: errors.length === 0 });
    ok('renderMemoryPanel excludes implausible restored daily task totals');
    await page.close();
  }

  // 12d Phase A: the KNOWN and SAID blocks show the companion record as plain
  // facts — and only open items, only the window, with the reconstruction caveat.
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
      appMemory.spokenLines = [
        { surface: 'Sunday reflection', date: iso(now - 3 * D), text: 'older line', kind: 'focus-leverage' },
        { surface: 'morning nudge',     date: iso(now - 1 * D), text: 'the newest line', kind: 'letgo-reason' },
      ];
      Today.use('memory').render();
      const text = document.getElementById('memoryContent')?.textContent || '';
      const knownFirst = text.indexOf('KNOWN') >= 0 && text.indexOf('KNOWN') < text.indexOf('SEMANTIC');
      const saidBeforeSemantic = text.indexOf('SAID') < text.indexOf('SEMANTIC');
      const newestFirst = text.indexOf('the newest line') < text.indexOf('older line');

      // empty state
      appMemory.returningTasks = {}; appMemory.obligationHistory = []; appMemory.taskOutcomes = []; appMemory.spokenLines = [];
      Today.use('memory').render();
      const empty = document.getElementById('memoryContent')?.textContent || '';

      return {
        knownBlockFirst: knownFirst,
        saidBlockPresent: saidBeforeSemantic,
        returningNamedWithDays: text.includes('"call insurance" — on the list 9 days, not started'),
        tagStrippedFromReturning: !text.includes('work: call insurance'),
        returningWithSessions: text.includes('"finish the deck" — on the list 6 days, 2 focus sessions'),
        openObligationListed: text.includes('"should call the bank"') && text.includes('still open'),
        doneObligationNotListed: !text.includes('file the receipts'),
        letgoObligationNotListed: !text.includes('renew permit'),
        countsLine: text.includes('30 days · 2 done · 1 let go · 1 to Soon · 1 brought back'),
        outOfWindowExcluded: text.includes('2 done'),
        reconstructionCaveat: text.includes('1 of those reconstructed from older history'),
        saidHasSurfaceAndKind: text.includes('morning nudge · letgo reason — the newest line'),
        saidNewestFirst: newestFirst,
        emptyKnownNote: empty.includes('nothing on record yet'),
        emptySaidNote: empty.includes('nothing said on its own yet'),
      };
    });
    await expectAll('12d KNOWN + SAID blocks', { ...result, noErrors: errors.length === 0 });
    ok('renderMemoryPanel: KNOWN and SAID show the record as plain facts — open items only, 30-day window, reconstruction caveat, newest first');
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
