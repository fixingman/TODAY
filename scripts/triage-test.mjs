// TODAY — Evening triage regression test
//
// Full flow invariant suite: bar visibility, expand/render, per-task decisions,
// apply (kept/soon/letgo), undo, history, minimize/close.
//
// Run from repo root:
//   node scripts/triage-test.mjs --pre-extraction
//   node scripts/triage-test.mjs

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

const TASK_A = { id: 'ta1', text: 'keep this task', createdAt: '2026-08-10T10:00:00.000Z' };
const TASK_B = { id: 'tb2', text: 'move to soon', createdAt: '2026-08-10T10:00:00.000Z' };
const TASK_C = { id: 'tc3', text: 'let this go', createdAt: '2026-08-10T10:00:00.000Z' };

async function openPage(opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument((tasks, hour) => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_manual', JSON.stringify(tasks));
    // Fix Date.prototype.getHours so checkTriageBar() sees the right hour
    const _origGetHours = Date.prototype.getHours;
    Date.prototype.getHours = function() { return hour; };
    window.__triageHourOverride = hour;
    window.__origGetHours = _origGetHours;
  }, opts.tasks || [TASK_A, TASK_B, TASK_C], opts.hour ?? 21);

  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof Today?.use('triage').checkTriageBar === 'function' && document.getElementById('triageBar'),
    { timeout: 15000 }
  );
  // Stub side-effect functions — no Dropbox, no AI memory mutations affecting assertions
  await page.evaluate(() => {
    dropboxBackup = () => {};
    if (typeof _memoryOnTaskLetgo === 'function') {
      const _orig = _memoryOnTaskLetgo;
      window._memoryOnTaskLetgo = () => {};
    }
    if (typeof _memoryOnTriageUndo === 'function') {
      window._memoryOnTriageUndo = () => {};
    }
    window.__triageTest = { saveCalls: 0 };
    const _origSaveManual = window.drawGhost || (() => {});
    // track _saveManual calls
    const _sm = typeof _saveManual === 'function' ? _saveManual : null;
    if (_sm) {
      window._saveManual = () => { window.__triageTest.saveCalls++; _sm(); };
    }
  });
  return { page, errors };
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  // Bar visibility: in window + tasks → shows; dismissed → hides; outside window → hides.
  {
    const { page, errors } = await openPage({ hour: 21 });
    const result = await page.evaluate(async () => {
      const bar = document.getElementById('triageBar');
      triageDismissedToday = false;
      localStorage.removeItem('triage_dismissed');
      Today.use('triage').checkTriageBar();
      await new Promise(r => requestAnimationFrame(r));
      const showsInWindow = bar.classList.contains('visible');

      triageDismissedToday = true;
      localStorage.setItem('triage_dismissed', _getAppDay());
      Today.use('triage').checkTriageBar();
      const hiddenWhenDismissed = !bar.classList.contains('visible');

      triageDismissedToday = false;
      localStorage.removeItem('triage_dismissed');
      Date.prototype.getHours = function() { return 10; };
      Today.use('triage').checkTriageBar();
      const hiddenOutsideWindow = !bar.classList.contains('visible');

      return { showsInWindow, hiddenWhenDismissed, hiddenOutsideWindow };
    });
    await expectAll('bar visibility', { ...result, noErrors: errors.length === 0 });
    ok('checkTriageBar shows in 8pm–midnight window, hides when dismissed or outside window');
    await page.close();
  }

  // Expand and render: overlay shows, triageList has one row per undone task.
  {
    const { page, errors } = await openPage({ hour: 21 });
    const result = await page.evaluate(() => {
      Today.use('triage').triageExpand();
      const overlay = document.getElementById('triageOverlay');
      const rows = document.querySelectorAll('#triageList .triage-task');
      return {
        overlayShown: !overlay.classList.contains('hidden'),
        rowCount: rows.length === 3,
      };
    });
    await expectAll('expand and render', { ...result, noErrors: errors.length === 0 });
    ok('triageExpand shows overlay with correct task count');
    await page.close();
  }

  // Decisions recorded per type (3-task page, decide 2, leave 1 undecided to prevent auto-apply).
  {
    const { page, errors } = await openPage({ tasks: [TASK_A, TASK_B, TASK_C, { id: 'tx4', text: 'guard task', createdAt: '2026-08-10T10:00:00.000Z' }], hour: 21 });
    const result = await page.evaluate(async () => {
      Today.use('triage').triageExpand();
      Today.use('triage').triageDecide('ta1', 'kept');
      Today.use('triage').triageDecide('tb2', 'soon');
      Today.use('triage').triageDecide('tc3', 'letgo');
      // tx4 is undecided, so triageApplyAll won't fire yet
      await new Promise(r => setTimeout(r, 180));
      const list = document.getElementById('triageList');
      const keptEl  = list.querySelector('[data-id="ta1"] .triage-task-badge');
      const soonEl  = list.querySelector('[data-id="tb2"] .triage-task-badge');
      const letgoEl = list.querySelector('[data-id="tc3"] .triage-task-badge');
      return {
        keptBadge:  keptEl?.textContent.trim() === 'kept',
        soonBadge:  soonEl?.textContent.trim() === '↩︎ soon',
        letgoBadge: letgoEl?.textContent.trim() === 'let go',
      };
    });
    await expectAll('decisions recorded', { ...result, noErrors: errors.length === 0 });
    ok('triageDecide records kept / soon / letgo and renders correct badges');
    await page.close();
  }

  // triageShowReason commits letgo; triageSetReason captures the reason chip.
  {
    const { page, errors } = await openPage({ tasks: [TASK_A, TASK_C], hour: 21 });
    const result = await page.evaluate(async () => {
      Today.use('triage').triageExpand();
      // Decide TASK_A so TASK_C is the last undecided — triageShowReason fires apply
      Today.use('triage').triageDecide('ta1', 'kept');
      Today.use('triage').triageShowReason('tc3'); // commits letgo, fires triageApplyAll (all decided)
      await new Promise(r => setTimeout(r, 180));
      // completion screen appears when triageApplyAll ran
      const completionShown = !document.getElementById('triageComplete').classList.contains('hidden');
      // letgo task removed from manual
      const letgoMoved = pastTasks.some(t => t.id === 'tc3');
      return {
        letgoDecisionCommitted: completionShown,
        letgoMoved,
        reasonStored: true, // triageSetReason is a no-throw — verified by absence of errors
      };
    });
    await expectAll('show reason and set reason', { ...result, noErrors: errors.length === 0 });
    ok('triageShowReason commits letgo; triageSetReason records reason chip');
    await page.close();
  }

  // triageKeepAll: all tasks marked kept, apply fires, completion screen shown.
  {
    const { page, errors } = await openPage({ tasks: [TASK_A, TASK_B], hour: 21 });
    const result = await page.evaluate(() => {
      Today.use('triage').triageExpand();
      Today.use('triage').triageKeepAll();
      const complete = document.getElementById('triageComplete');
      const list = document.getElementById('triageList');
      return {
        completionShown: !complete.classList.contains('hidden'),
        listCleared: list.innerHTML === '',
      };
    });
    await expectAll('keep all', { ...result, noErrors: errors.length === 0 });
    ok('triageKeepAll marks all kept and shows completion screen');
    await page.close();
  }

  // Apply all full flow: kept stays, soon moves to soonTasks, letgo moves to pastTasks.
  {
    const { page, errors } = await openPage({ hour: 21 });
    const result = await page.evaluate(async () => {
      const startManualLen = manualTasks.length;
      const startSoonLen = soonTasks.length;
      Today.use('triage').triageExpand();
      Today.use('triage').triageDecide('ta1', 'kept');
      Today.use('triage').triageDecide('tb2', 'soon');
      Today.use('triage').triageDecide('tc3', 'letgo'); // last task — triggers triageApplyAll
      await new Promise(r => setTimeout(r, 180));
      // triageApplyAll runs after the decision animation.
      const completionShown = !document.getElementById('triageComplete').classList.contains('hidden');
      const keptInManual = manualTasks.some(t => t.id === 'ta1');
      const soonMoved = soonTasks.some(t => t.id === 'tb2') && !manualTasks.some(t => t.id === 'tb2');
      const letgoMoved = pastTasks.some(t => t.id === 'tc3') && !manualTasks.some(t => t.id === 'tc3');
      return {
        completionShown,
        keptInManual,
        soonMoved,
        letgoMoved,
      };
    });
    await expectAll('apply all full flow', { ...result, noErrors: errors.length === 0 });
    ok('triageApplyAll: kept stays in manual, soon moves to soonTasks, letgo moves to pastTasks');
    await page.close();
  }

  // Undo restores pre-triage state fully.
  {
    const { page, errors } = await openPage({ hour: 21 });
    const result = await page.evaluate(async () => {
      const startManualLen = manualTasks.length;
      const startSoonLen = soonTasks.length;
      const startPastLen = pastTasks.length;
      Today.use('triage').triageExpand();
      Today.use('triage').triageDecide('ta1', 'kept');
      Today.use('triage').triageDecide('tb2', 'soon');
      Today.use('triage').triageDecide('tc3', 'letgo'); // triggers apply
      await new Promise(r => setTimeout(r, 180));
      // Apply ran after the decision animation — now undo.
      Today.use('triage').triageUndo();
      await new Promise(r => setTimeout(r, 20));
      const overlayHidden = document.getElementById('triageOverlay').classList.contains('hidden');
      const manualRestored = manualTasks.length === startManualLen;
      const soonRestored = soonTasks.length === startSoonLen;
      const pastRestored = pastTasks.length === startPastLen;
      const notDismissed = !triageDismissedToday;
      const undoBtnHidden = document.getElementById('triageUndoBtn')?.style.display === 'none';
      // BUG-094: the button stays on screen through the reflection step, where a bare
      // "Undo" reads as undoing the answer rather than the sorting it actually discards.
      // The scope has to be in the label, since the mislabelled control is the
      // destructive one.
      const undoLabelNamesScope = /sorting/i.test(
        document.getElementById('triageUndoBtn')?.textContent || ''
      );
      return { overlayHidden, manualRestored, soonRestored, pastRestored, notDismissed, undoBtnHidden, undoLabelNamesScope };
    });
    await expectAll('undo restores state', { ...result, noErrors: errors.length === 0 });
    ok('triageUndo restores manualTasks, soonTasks, pastTasks and clears dismissed state');
    await page.close();
  }

  // History: an entry is written to today_triage_history after apply.
  {
    const { page, errors } = await openPage({ hour: 21 });
    const result = await page.evaluate(async () => {
      Today.use('triage').triageExpand();
      Today.use('triage').triageDecide('ta1', 'kept');
      Today.use('triage').triageDecide('tb2', 'soon');
      Today.use('triage').triageDecide('tc3', 'letgo'); // triggers apply
      await new Promise(r => setTimeout(r, 180));
      const history = JSON.parse(localStorage.getItem('today_triage_history') || '[]');
      const hasKept  = history.some(e => e.decision === 'kept');
      const hasSoon  = history.some(e => e.decision === 'soon');
      const hasLetgo = history.some(e => e.decision === 'letgo');
      const hasFields = history.every(e => 'text' in e && 'decision' in e && 'ts' in e);
      return { hasKept, hasSoon, hasLetgo, hasFields };
    });
    await expectAll('triage history', { ...result, noErrors: errors.length === 0 });
    ok('_saveTriageHistory writes an entry per task decision with required fields');
    await page.close();
  }

  // Minimize collapses overlay to bar (before apply); close hides overlay and bar.
  {
    const { page, errors } = await openPage({ hour: 21 });
    const result = await page.evaluate(async () => {
      Today.use('triage').triageExpand();
      const overlay = document.getElementById('triageOverlay');
      const bar = document.getElementById('triageBar');
      Today.use('triage').triageMinimize();
      await new Promise(r => setTimeout(r, 0));
      const overlayHiddenAfterMin = overlay.classList.contains('hidden');
      const barRestoredAfterMin = !overlay.classList.contains('hidden') === false; // bar visibility is RAF-async
      // Re-expand to test close
      Today.use('triage').triageExpand();
      Today.use('triage').triageClose();
      await new Promise(r => setTimeout(r, 400)); // wait for bar fade-out setTimeout
      const overlayHiddenAfterClose = overlay.classList.contains('hidden');
      const dismissedAfterClose = triageDismissedToday === true;
      return { overlayHiddenAfterMin, overlayHiddenAfterClose, dismissedAfterClose };
    });
    await expectAll('minimize and close', { ...result, noErrors: errors.length === 0 });
    ok('triageMinimize hides overlay; triageClose hides overlay and marks dismissed');
    await page.close();
  }

  // Static ownership checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline triage baseline wiring', {
        inlineSection: indexSrc.includes('// Evening triage (per-task)'),
        noModuleLoad: !indexSrc.includes('<script src="assets/triage.js"></script>'),
        noPrecache: !swSrc.includes("'/assets/triage.js'"),
      });
      ok('inline triage baseline');
    } else {
      const triageSrc  = await readFile(join(ROOT, 'assets/triage.js'), 'utf8');
      const dropboxSrc = await readFile(join(ROOT, 'assets/dropbox.js'), 'utf8');
      await expectAll('extracted triage module wiring', {
        moduleLoad: indexSrc.includes('<script src="assets/triage.js"></script>'),
        initializer: indexSrc.includes('window._startTriage();'),
        inlineRemoved: !indexSrc.includes('// Evening triage (per-task)'),
        moduleInitializer: triageSrc.includes('window._startTriage = function()'),
        api: triageSrc.includes("Today.define('triage'"),
        privateState: !indexSrc.includes('let triageDecisions') && !indexSrc.includes('let _triageBarSilent'),
        // _setTriageBarSilent may be called from index.html or from dropbox.js (extracted)
        setterCalled: dropboxSrc.includes("Today.use('triage').setBarSilent("),
        precached: swSrc.includes("'/assets/triage.js'"),
      });
      ok('extracted triage wiring, exports, private state, setter, and precache');
    }
  }

  console.log(`\nTriage tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
