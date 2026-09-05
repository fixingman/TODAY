// TODAY — Habits regression test
//
// Full flow invariant suite: 3am rollover, render, toggleHabitDone check/uncheck,
// addHabit, toggleHabitEditMode, archiveHabit+undo, _getHabitStrength,
// focus integration, and module wiring.
//
// Run from repo root:
//   node scripts/habits-test.mjs --pre-extraction
//   node scripts/habits-test.mjs

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

// Compute seed dates in local time (equivalent to _localISO)
const localISO = (d = new Date()) => {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
};
const DAY_MS = 24 * 60 * 60 * 1000;
// Use TWO_DAYS_AGO + YESTERDAY so habit_a shows ≥2 dots regardless of 3am rollover.
// _getHabitDates() 21-day window always includes both; _getHabitStrength uses real
// Date.now() and always sees both in the 90-day lookback.
const TWO_DAYS_AGO = localISO(new Date(Date.now() - 2 * DAY_MS));
const YESTERDAY    = localISO(new Date(Date.now() - DAY_MS));

const HABIT_A = { id: 'habit_a', name: 'Read', archived: false };
const HABIT_B = { id: 'habit_b', name: 'Walk', archived: false };

async function openPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(
    (habitsSeed, completionsSeed) => {
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      localStorage.setItem('today_habits',             JSON.stringify(habitsSeed));
      localStorage.setItem('today_habit_completions',  JSON.stringify(completionsSeed));
      localStorage.setItem('today_habit_events',       JSON.stringify({}));
    },
    [HABIT_A, HABIT_B],
    { habit_a: [TWO_DAYS_AGO, YESTERDAY], habit_b: [] }
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof Today?.use('habits')._saveHabits === 'function' && document.getElementById('habitList'),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.dropboxAutoSave = () => {};
    window.playHabitDoneSound = () => {};
    // Guard: checkHabitNudge may be called when all habits are done
    if (typeof window.checkHabitNudge === 'undefined') window.checkHabitNudge = () => {};
  });
  return { page, errors };
}

try {
  // 1. 3am rollover: _habitTodayISO() returns yesterday at 2:59am, today at 3:01am.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const origNow = Date.now.bind(Date);

      const d259 = new Date();
      d259.setHours(2, 59, 0, 0);
      Date.now = () => d259.getTime();
      const result259 = _habitTodayISO();
      const yesterday = new Date(d259);
      yesterday.setDate(yesterday.getDate() - 1);
      const yISO = yesterday.getFullYear() + '-' +
        String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
        String(yesterday.getDate()).padStart(2, '0');

      const d301 = new Date();
      d301.setHours(3, 1, 0, 0);
      Date.now = () => d301.getTime();
      const result301 = _habitTodayISO();
      const todayISO = d301.getFullYear() + '-' +
        String(d301.getMonth() + 1).padStart(2, '0') + '-' +
        String(d301.getDate()).padStart(2, '0');

      Date.now = origNow;
      return {
        at259am_is_yesterday: result259 === yISO,
        at301am_is_today:     result301 === todayISO,
        debug: { result259, yISO, result301, todayISO },
      };
    });
    if (!result.at259am_is_yesterday || !result.at301am_is_today) {
      await fail('3am rollover', result);
    }
    ok('3am rollover: _habitTodayISO() returns yesterday at 2:59am, today at 3:01am');
    await page.close();
  }

  // 2. renderHabits: empty state — shows "No habits" text.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      habitsList = [];
      Today.use('habits').renderHabits();
      const empty = document.getElementById('habitEmpty');
      return {
        showsEmpty: !!(empty && empty.classList.contains('show')),
        emptyText:  !!(empty && empty.textContent.includes('No habits')),
      };
    });
    await expectAll('renderHabits empty', { ...result, noErrors: errors.length === 0 });
    ok('renderHabits: empty state shows "No habits" message');
    await page.close();
  }

  // 3. renderHabits: with habits — 2 rows, habit_a has ≥2 filled dots.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      const rows        = document.querySelectorAll('#habitList .habit');
      const habitARow   = document.querySelector('.habit[data-habit-id="habit_a"]');
      const filledDots  = habitARow ? habitARow.querySelectorAll('.week-dot.filled').length : 0;
      const hasCheckEl  = !!(habitARow && habitARow.querySelector('.habit-check'));
      return {
        rowCount:            rows.length === 2,
        habitARendered:      !!habitARow,
        filledDotsAtLeastTwo: filledDots >= 2,
        hasCheckEl,
      };
    });
    await expectAll('renderHabits with habits', { ...result, noErrors: errors.length === 0 });
    ok('renderHabits: 2 rows rendered, habit_a has ≥2 filled dots');
    await page.close();
  }

  // 4. toggleHabitDone: check — adds today's date to completions, saves, records event.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      Today.use('habits').toggleHabitDone('habit_b');
      const today  = _habitTodayISO();
      const comps  = habitCompletions['habit_b'] || [];
      const ls     = JSON.parse(localStorage.getItem('today_habit_completions') || '{}');
      const row    = document.querySelector('.habit[data-habit-id="habit_b"]');
      const event  = habitEvents['habit_b::' + today] || {};
      return {
        dateAdded:      comps.includes(today),
        lsSaved:        (ls['habit_b'] || []).includes(today),
        rowDone:        !!(row && row.classList.contains('done-today')),
        eventRecorded:  typeof event === 'object' && event !== null,
        eventTypeCheck: event.type === 'check',
      };
    });
    await expectAll('toggleHabitDone check', { ...result, noErrors: errors.length === 0 });
    ok('toggleHabitDone (check): date added, localStorage saved, DOM updated, event recorded');
    await page.close();
  }

  // 5. toggleHabitDone: uncheck — removes date from completions, records uncheck event.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      Today.use('habits').toggleHabitDone('habit_b'); // check
      Today.use('habits').toggleHabitDone('habit_b'); // uncheck
      const today   = _habitTodayISO();
      const comps   = habitCompletions['habit_b'] || [];
      const ls      = JSON.parse(localStorage.getItem('today_habit_completions') || '{}');
      const row     = document.querySelector('.habit[data-habit-id="habit_b"]');
      const event   = habitEvents['habit_b::' + today] || {};
      return {
        dateRemoved:    !comps.includes(today),
        lsUpdated:      !(ls['habit_b'] || []).includes(today),
        rowNotDone:     !!(row && !row.classList.contains('done-today')),
        eventTypeUncheck: event.type === 'uncheck',
      };
    });
    await expectAll('toggleHabitDone uncheck', { ...result, noErrors: errors.length === 0 });
    ok('toggleHabitDone (uncheck): date removed, localStorage updated, DOM reflects uncheck');
    await page.close();
  }

  // 6. addHabit — new habit in habitsList, saved to localStorage, rendered in DOM.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const input     = document.getElementById('habitInput');
      if (input) input.value = 'Meditate';
      const beforeLen = habitsList.length;
      Today.use('habits').addHabit();
      const newHabit  = habitsList.find(h => h.name === 'Meditate');
      const ls        = JSON.parse(localStorage.getItem('today_habits') || '[]');
      const lsHabit   = ls.find(h => h.name === 'Meditate');
      const rendered  = newHabit ? !!document.querySelector('.habit[data-habit-id="' + newHabit.id + '"]') : false;
      return {
        addedToList:  !!newHabit,
        hasId:        !!(newHabit && newHabit.id.startsWith('habit_')),
        lsSaved:      !!lsHabit,
        rendered,
        inputCleared: !!(input && input.value === ''),
        listGrew:     habitsList.length === beforeLen + 1,
      };
    });
    await expectAll('addHabit', { ...result, noErrors: errors.length === 0 });
    ok('addHabit: new habit in habitsList, saved to localStorage, rendered in DOM');
    await page.close();
  }

  // 7. toggleHabitEditMode — enters edit mode (inputs), saves name change on exit.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      Today.use('habits').toggleHabitEditMode();
      const modeEntered = habitEditMode === true;
      const inputs      = document.querySelectorAll('#habitList .habit-edit-input');
      const editBtn     = document.getElementById('habitEditBtn');
      // Rename habit_b via its input
      const inputB = document.querySelector('.habit-edit-input[data-id="habit_b"]');
      if (inputB) inputB.value = 'Run';
      Today.use('habits').toggleHabitEditMode();
      const modeExited   = habitEditMode === false;
      const savedHabit   = habitsList.find(h => h.id === 'habit_b');
      const ls           = JSON.parse(localStorage.getItem('today_habits') || '[]');
      const lsHabit      = ls.find(h => h.id === 'habit_b');
      return {
        modeEntered,
        inputsAppeared: inputs.length === 2,
        modeExited,
        nameSaved:   savedHabit ? savedHabit.name === 'Run' : false,
        lsNameSaved: lsHabit   ? lsHabit.name   === 'Run' : false,
        btnText:     editBtn   ? editBtn.textContent === 'Edit' : true,
      };
    });
    await expectAll('toggleHabitEditMode', { ...result, noErrors: errors.length === 0 });
    ok('toggleHabitEditMode: enters edit (inputs), saves name change on exit');
    await page.close();
  }

  // 8. archiveHabit + undo — habit archived, toast shown, _undoLast restores it.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      Today.use('habits').archiveHabit('habit_a');
      // Capture booleans immediately — habitA is a live reference; undo will mutate it.
      const habitA       = habitsList.find(h => h.id === 'habit_a');
      const habitArchived = !!(habitA && habitA.archived === true);
      const toast        = document.getElementById('undoToast');
      const toastShown   = !!(toast && toast.classList.contains('show'));
      const ls1          = JSON.parse(localStorage.getItem('today_habits') || '[]');
      const lsArchivedA  = ls1.find(h => h.id === 'habit_a');

      Today.use('task-actions')._undoLast();
      const habitAAfter    = habitsList.find(h => h.id === 'habit_a');
      const ls2            = JSON.parse(localStorage.getItem('today_habits') || '[]');
      const lsUnarchivedA  = ls2.find(h => h.id === 'habit_a');
      return {
        habitArchived,
        lsArchived:     !!(lsArchivedA && lsArchivedA.archived === true),
        toastShown,
        undoRestored:   !!(habitAAfter && habitAAfter.archived === false),
        lsRestored:     !!(lsUnarchivedA && lsUnarchivedA.archived === false),
      };
    });
    await expectAll('archiveHabit + undo', { ...result, noErrors: errors.length === 0 });
    ok('archiveHabit: archived + toast shown; _undoLast restores it');
    await page.close();
  }

  // 9. _getHabitStrength — > 0 for habit_a (has completions), 0 for habit_b (none).
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const strengthA = Today.use('habits')._getHabitStrength('habit_a');
      const strengthB = Today.use('habits')._getHabitStrength('habit_b');
      return {
        habitAPositive:  strengthA > 0,
        habitBZero:      strengthB === 0,
        habitAInRange:   strengthA >= 0 && strengthA <= 100,
        strengthANumber: typeof strengthA === 'number',
      };
    });
    await expectAll('_getHabitStrength', { ...result, noErrors: errors.length === 0 });
    ok('_getHabitStrength: > 0 for habit_a (completions), 0 for habit_b (none)');
    await page.close();
  }

  // 10. Focus integration — window._focusOnCheck is called with habit ID on check.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('habits').renderHabits();
      let focusCalledWith = null;
      window._focusOnCheck = id => { focusCalledWith = id; };
      Today.use('habits').toggleHabitDone('habit_b'); // habit_b has no completions → isNowDone = true
      window._focusOnCheck = null;
      return { focusCalled: focusCalledWith === 'habit_b' };
    });
    await expectAll('focus integration', { ...result, noErrors: errors.length === 0 });
    ok('focus integration: window._focusOnCheck called with habit ID on check');
    await page.close();
  }

  // 11. Static ownership checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline habits baseline wiring', {
        inlineSection: indexSrc.includes('// ─── Habits ───'),
        noModuleLoad:  !indexSrc.includes('<script src="assets/habits.js"></script>'),
        noPrecache:    !swSrc.includes("'/assets/habits.js'"),
      });
      ok('inline habits baseline');
    } else {
      const habitsSrc = await readFile(join(ROOT, 'assets/habits.js'), 'utf8');
      await expectAll('extracted habits module wiring', {
        moduleLoad:              indexSrc.includes('<script src="assets/habits.js"></script>'),
        initializer:             indexSrc.includes('window._startHabits();'),
        sectionRemoved:          !indexSrc.includes('function _saveHabits()'),
        moduleInitializer:       habitsSrc.includes('window._startHabits = function()'),
        api:                     habitsSrc.includes("Today.define('habits'"),
        habitsListInline:        indexSrc.includes('let habitsList'),
        habitCompletionsInline:  indexSrc.includes('let habitCompletions'),
        habitEventsInline:       indexSrc.includes('let habitEvents'),
        habitEditModeInline:     indexSrc.includes('let habitEditMode'),
        getHabitDatesNotExported: !habitsSrc.includes('window._getHabitDates'),
        precached:               swSrc.includes("'/assets/habits.js'"),
      });
      ok('extracted habits module wiring, exports, inline state vars preserved, precache');
    }
  }

  console.log(`\nHabits tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
