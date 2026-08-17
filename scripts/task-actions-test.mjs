// TODAY — task-actions module regression test
//
// Tests: addManual, toggleDone check/uncheck, focus interception,
// deleteManual (undo toast), _undoDelete restore, _clearAllDone,
// updateStats, static wiring.
//
// Run from repo root:
//   node scripts/task-actions-test.mjs --pre-extraction   # pre-extraction baseline
//   node scripts/task-actions-test.mjs                    # post-extraction (9 tests)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
        { id: 'task_1', text: 'Write tests for the module' },
        { id: 'task_2', text: 'Second task' },
      ]));
      localStorage.setItem('today_done', JSON.stringify([]));
      localStorage.setItem('today_habits', JSON.stringify([
        { id: 'habit_1', name: 'Exercise', archived: false },
      ]));
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v));
      }
    },
    { extra: extraSeed || null }
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof addManual === 'function' &&
          typeof deleteManual === 'function' &&
          typeof toggleDone === 'function' &&
          typeof _undoDelete === 'function' &&
          !!document.getElementById('undoToast') &&
          document.querySelectorAll('.task').length >= 2,
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.dropboxAutoSave    = () => {};
    window.dropboxBackup      = () => {};
    window._haptic            = () => {};
    window._breathe           = () => {};
    window._aiAnalyzeTask     = () => {};
    window._saveMemory        = () => {};
    window.playCompleteSound  = () => {};
    window.fireEmberDrift     = () => {};
    window._flashAccentGlow   = () => {};
    window.renderMeetingNames = () => {};
  });
  return { page, errors };
}

try {
  if (PRE_EXTRACTION) {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    await expectAll('pre-extraction baseline', {
      addManualInline:       indexSrc.includes('function addManual()'),
      toggleDoneInline:      indexSrc.includes('function toggleDone('),
      deleteManualInline:    indexSrc.includes('function deleteManual('),
      noTaskActionsModule:   !existsSync(join(ROOT, 'assets/task-actions.js')),
    });
    ok('pre-extraction: addManual/toggleDone/deleteManual inline; assets/task-actions.js not yet created');
    console.log('\nTask-actions tests passed (pre-extraction baseline, 1 check).');
  } else {
    // 1. addManual adds a task to manualTasks and the DOM.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(() => {
        const prevCount = manualTasks.length;
        document.getElementById('newTask').value = 'New task from test';
        addManual();
        return {
          taskAdded:   manualTasks.length === prevCount + 1,
          taskPresent: manualTasks.some(t => t.text === 'New task from test'),
          inputCleared: document.getElementById('newTask').value === '',
        };
      });
      await expectAll('addManual adds task', { ...result, noErrors: errors.length === 0 });
      ok('addManual: task added to manualTasks, input cleared');
      await page.close();
    }

    // 2. toggleDone — check: doneIds gains taskId, element gains .done class.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(() => {
        toggleDone('task_1');
        const el = document.querySelector('.task[data-taskid="task_1"]');
        return {
          inDoneIds:   doneIds.has('task_1'),
          hasDoneClass: !!(el && el.classList.contains('done')),
          dimmed:       !!(el && parseFloat(el.style.opacity) < 1),
        };
      });
      await expectAll('toggleDone — check', { ...result, noErrors: errors.length === 0 });
      ok('toggleDone check: task_1 in doneIds, element has .done class');
      await page.close();
    }

    // 3. toggleDone — uncheck: doneIds loses taskId, .done class removed.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(() => {
        toggleDone('task_1'); // check
        toggleDone('task_1'); // uncheck
        const el = document.querySelector('.task[data-taskid="task_1"]');
        return {
          notInDoneIds:    !doneIds.has('task_1'),
          noDoneClass:     !!(el && !el.classList.contains('done')),
          notDimmed:       !!(el && (el.style.opacity === '' || parseFloat(el.style.opacity) >= 1)),
        };
      });
      await expectAll('toggleDone — uncheck', { ...result, noErrors: errors.length === 0 });
      ok('toggleDone uncheck: task_1 removed from doneIds, .done class gone');
      await page.close();
    }

    // 4. Focus interception: _focusOnCheck gate is in the document click delegation.
    //    When _focusOnCheck returns true, toggleDone is NOT called.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(() => {
        window.__focusCheckedId = null;
        window._focusOnCheck = id => { window.__focusCheckedId = id; return true; }; // intercept
        const checkEl = document.querySelector('.task[data-taskid="task_1"] .task-check');
        if (checkEl) checkEl.click();
        return {
          focusHookCalled: window.__focusCheckedId === 'task_1',
          notDone:         !doneIds.has('task_1'), // toggleDone skipped because _focusOnCheck returned true
        };
      });
      await expectAll('focus interception', { ...result, noErrors: errors.length === 0 });
      ok('focus interception: _focusOnCheck called; toggleDone skipped when hook returns true');
      await page.close();
    }

    // 5+6. deleteManual + undo toast + _undoDelete restore.
    //   deleteManual removes task after 180ms setTimeout; toast shows at same time.
    //   _undoDelete restores the task to manualTasks.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        renderManual(); // ensure DOM has .task[data-taskid="task_1"]
        deleteManual('task_1');
        await new Promise(r => setTimeout(r, 280)); // wait for 180ms removal + buffer
        const toastShows  = document.getElementById('undoToast').classList.contains('show');
        const taskGone    = !manualTasks.find(t => t.id === 'task_1');
        _undoDelete();
        await new Promise(r => setTimeout(r, 100));
        const taskRestored = !!manualTasks.find(t => t.id === 'task_1');
        return { toastShows, taskGone, taskRestored };
      });
      await expectAll('deleteManual + undo toast + _undoDelete', { ...result, noErrors: errors.length === 0 });
      ok('deleteManual: task removed from manualTasks, #undoToast shows; _undoDelete: task restored');
      await page.close();
    }

    // 7. _clearAllDone removes done tasks from manualTasks.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(() => {
        toggleDone('task_1'); // mark done
        _clearAllDone();
        return {
          taskRemoved:  !manualTasks.find(t => t.id === 'task_1'),
          notInDoneIds: !doneIds.has('task_1'),
          task2Intact:  !!manualTasks.find(t => t.id === 'task_2'),
        };
      });
      await expectAll('_clearAllDone removes done tasks', { ...result, noErrors: errors.length === 0 });
      ok('_clearAllDone: task_1 (done) removed; task_2 (pending) intact');
      await page.close();
    }

    // 8. updateStats reflects correct counts in the DOM.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(() => {
        toggleDone('task_1'); // 1 done of 2
        updateStats();
        const statTotal = document.getElementById('statTotal');
        const statDone  = document.getElementById('statDone');
        return {
          totalShows2: !!(statTotal && statTotal.textContent === '2'),
          doneShows1:  !!(statDone  && statDone.textContent  === '1'),
        };
      });
      await expectAll('updateStats DOM', { ...result, noErrors: errors.length === 0 });
      ok('updateStats: statTotal=2, statDone=1 after one check');
      await page.close();
    }

    // 9. Static wiring: 10 exports, functions removed from index.html, precached in sw.js.
    {
      const indexSrc      = await readFile(join(ROOT, 'index.html'), 'utf8');
      const swSrc         = await readFile(join(ROOT, 'sw.js'), 'utf8');
      const taskActionsSrc = await readFile(join(ROOT, 'assets/task-actions.js'), 'utf8');
      const requiredExports = [
        'addManual', 'deleteManual', 'toggleDone', 'toggleClearBtn', 'clearTaskInput',
        '_undoLast', '_undoDelete', '_recordDeleteReason', '_clearAllDone', 'updateStats',
        'updateManualEmptyState', '_archiveHabitUndo',
      ];
      const startupIdx     = indexSrc.indexOf('window._startTaskActions();');
      const startAssistIdx = indexSrc.indexOf('window._startAssistant();');
      await expectAll('task-actions module wiring', {
        moduleLoad:         indexSrc.includes('<script src="/assets/task-actions.js"></script>'),
        startupCall:        startupIdx !== -1,
        beforeAssistant:    startupIdx !== -1 && startAssistIdx !== -1 && startupIdx < startAssistIdx,
        addManualRemoved:   !indexSrc.includes('function addManual()'),
        toggleDoneRemoved:  !indexSrc.includes('function toggleDone('),
        deleteManualRemoved:!indexSrc.includes('function deleteManual('),
        moduleInit:         taskActionsSrc.includes('window._startTaskActions = '),
        allExports:         requiredExports.every(n => taskActionsSrc.includes(`window.${n} = ${n};`)),
        precached:          swSrc.includes("'/assets/task-actions.js'"),
      });
      ok('task-actions module: 10 exports, functions removed from index.html, precached in sw.js');
    }

    console.log('\nTask-actions tests passed (post-extraction, 9 tests).');
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
