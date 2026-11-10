// TODAY — habit-tasks integration: lazy load, task generation, completion bridge,
// deletion/undo, disable, archive/undo, editor entry and static wiring.
//
// Run from repo root:
//   node scripts/habit-tasks-test.mjs

import { createServer }    from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath }   from 'node:url';

const FIXTURE_NOW = new Date(2026, 10, 10, 10, 0, 0).getTime(); // Mon 2026-11-10 10:00
const ROOT   = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH
  || '/Users/can/conductor/workspaces/today/beirut/.context/ci-browser/chrome/mac_arm-152.0.7977.75/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const MIME   = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
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
const URL_BASE = `http://127.0.0.1:${server.address().port}`;

const SHOTS = join(ROOT, '.context/ci-test-results/habit-tasks');
await mkdir(SHOTS, { recursive: true });

let browser;
const ok     = msg => console.log('  ✓ ' + msg);
const fail   = async (msg, detail) => {
  console.error('✗ FAIL — ' + msg);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};
const expectAll = async (label, result) => {
  const failed = Object.entries(result).filter(([, v]) => !v);
  if (failed.length) await fail(label, result);
};

// 2026-11-10 in local time
const TODAY = (() => {
  const d = new Date(FIXTURE_NOW);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
})();
const TASK_ID = `habit_task_habit_a::${TODAY}`;

// Config: habit_a opted-in, one any-day action, no calendar flags.
const HT_SEED = {
  configs: {
    habit_a: {
      enabled: true, calendarTiming: false, calendarTitles: false,
      actions: [{ id: 'a1', text: 'Read for 20 minutes', days: [], keywords: '', minutes: 0 }],
      defaultId: 'a1', updatedAt: '2026-11-09T20:00:00.000Z',
    },
  },
  occurrences: {},
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

/** Open a fresh page, seed localStorage, wait for boot and lazy modules. */
async function openPage({ htSeed = HT_SEED, extraSeed = {} } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(
    (habits, htRaw, extra) => {
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      localStorage.setItem('today_habits', JSON.stringify(habits));
      localStorage.setItem('today_habit_completions', JSON.stringify({}));
      localStorage.setItem('today_habit_events', JSON.stringify({}));
      if (htRaw) localStorage.setItem('today_habit_tasks_v1', JSON.stringify(htRaw));
      Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
    },
    [
      { id: 'habit_a', name: 'Morning read', archived: false },
      { id: 'habit_b', name: 'Walk', archived: false },
    ],
    htSeed,
    extraSeed,
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  // Wait for app boot.
  await page.waitForFunction(
    () => !document.body.hasAttribute('data-booting') &&
          performance.getEntriesByName('today:interactive').length > 0 &&
          typeof Today?.use('habits')._saveHabits === 'function',
    { timeout: 15000 },
  );
  // Silence side-effects.
  await page.evaluate(() => {
    window.dropboxAutoSave = () => {};
    window.dropboxBackup   = () => {};
    window._haptic         = () => {};
    window._breathe        = () => {};
    window.playCompleteSound = () => {};
    window.fireEmberDrift   = () => {};
    window._flashAccentGlow = () => {};
    window._memoryOnTaskComplete = () => {};
    window.checkHabitNudge  = () => {};
    window.renderMeetingNames = () => {};
  });
  // If there is a habit_tasks config, wait for lazy modules.
  if (htSeed) {
    await page.waitForFunction(() => Today.has('habit-tasks'), { timeout: 8000 });
  }
  return { page, errors };
}

try {
  // ── 1. Lazy modules load when today_habit_tasks_v1 is present ──────────────
  {
    const { page, errors } = await openPage();
    await expectAll('lazy modules registered', await page.evaluate(() => ({
      hasPolicy:     Today.has('habit-task-policy'),
      hasCoordinator: Today.has('habit-tasks'),
      noErrors:      !window.__htLoadError,
    })));
    await page.close();
    ok('lazy habit-task-policy + habit-tasks modules load from today_habit_tasks_v1');
  }

  // ── 2. Lazy modules do NOT load without opted-in data ─────────────────────
  {
    const { page } = await openPage({ htSeed: null });
    // Give time for any erroneous async import.
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
    await expectAll('no lazy load without opted-in data', await page.evaluate(() => ({
      noPolicyWithout:     !Today.has('habit-task-policy'),
      noCoordinatorWithout: !Today.has('habit-tasks'),
    })));
    await page.close();
    ok('habit-tasks modules stay unloaded when no opted-in data exists');
  }

  // ── 3. reconcile() generates a task for today's opted-in habit ─────────────
  {
    const { page, errors } = await openPage();
    // reconcile() runs at boot; wait for the task to appear.
    const taskAppeared = await page.waitForFunction(
      id => manualTasks.some(t => t.id === id),
      { timeout: 5000 }, TASK_ID,
    ).then(() => true).catch(() => false);
    if (!taskAppeared) await fail('generated task not found in manualTasks', { TASK_ID });
    // Wait for render after reconcile.
    await page.waitForFunction(id => !!document.querySelector(`.task[data-taskid="${CSS.escape(id)}"]`), { timeout: 3000 }, TASK_ID).catch(() => {});
    await expectAll('generated task has correct shape', await page.evaluate(id => {
      const task = manualTasks.find(t => t.id === id);
      return {
        found:    !!task,
        text:     task?.text === 'Read for 20 minutes',
        hasHabitTask: !!task?.habitTask,
        habitId:  task?.habitTask?.habitId === 'habit_a',
        day:      task?.habitTask?.day === task?.id.split('::')[1],
        renderedInList: !!document.querySelector(`.task[data-taskid="${CSS.escape(id)}"]`),
      };
    }, TASK_ID));
    await page.close();
    ok('reconcile() creates task for opted-in habit; task rendered in list');
  }

  // ── 4. Checking the generated task checks the habit ───────────────────────
  {
    const { page, errors } = await openPage();
    await page.waitForFunction(id => manualTasks.some(t => t.id === id), { timeout: 5000 }, TASK_ID);
    const before = await page.evaluate(id => ({
      taskDone: doneIds.has(id),
      habitDone: (habitCompletions['habit_a'] || []).includes(_habitTodayISO()),
    }), TASK_ID);
    if (before.taskDone || before.habitDone) await fail('pre-condition: task and habit should both be undone', before);

    await page.evaluate(id => toggleDone(id), TASK_ID);
    await expectAll('checking task checks habit', await page.evaluate((id, today) => ({
      taskDone:  doneIds.has(id),
      habitDone: (habitCompletions['habit_a'] || []).includes(today),
    }), TASK_ID, TODAY));
    await page.close();
    ok('checking generated task records habit completion');
  }

  // ── 5. Unchecking task unchecks habit ──────────────────────────────────────
  {
    const { page } = await openPage();
    await page.waitForFunction(id => manualTasks.some(t => t.id === id), { timeout: 5000 }, TASK_ID);
    await page.evaluate(id => toggleDone(id), TASK_ID);   // check
    await page.evaluate(id => toggleDone(id), TASK_ID);   // uncheck
    await expectAll('unchecking task unchecks habit', await page.evaluate((id, today) => ({
      taskUndone:  !doneIds.has(id),
      habitUndone: !(habitCompletions['habit_a'] || []).includes(today),
    }), TASK_ID, TODAY));
    await page.close();
    ok('unchecking generated task removes habit completion');
  }

  // ── 6. Checking habit checks task ──────────────────────────────────────────
  {
    const { page } = await openPage();
    await page.waitForFunction(id => manualTasks.some(t => t.id === id), { timeout: 5000 }, TASK_ID);
    // Click the habit checkbox in the habits panel (direct API call to avoid UI reliance).
    await page.evaluate(() => Today.use('habits').toggleHabitDone('habit_a'));
    await expectAll('checking habit checks task', await page.evaluate((id, today) => ({
      habitDone: (habitCompletions['habit_a'] || []).includes(today),
      taskDone:  doneIds.has(id),
    }), TASK_ID, TODAY));
    await page.close();
    ok('checking habit checks the generated task');
  }

  // ── 7. Delete generated task → dismisses occurrence; undo restores ─────────
  {
    const { page } = await openPage();
    await page.waitForFunction(id => manualTasks.some(t => t.id === id), { timeout: 5000 }, TASK_ID);
    // deleteManual flags the task for dismissal via habit-tasks bridge.
    await page.evaluate(id => Today.use('task-actions').deleteManual(id), TASK_ID);
    // reconcile() runs async after dismiss; wait for task to leave manualTasks.
    await page.waitForFunction(id => !manualTasks.some(t => t.id === id), { timeout: 3000 }, TASK_ID).catch(() => {});
    await expectAll('delete dismisses occurrence and removes task', await page.evaluate((id) => {
      const state = Today.use('habit-tasks').read();
      const occKey = Object.keys(state.occurrences).find(k => k.startsWith('habit_a::'));
      return {
        taskGone: !manualTasks.some(t => t.id === id),
        dismissed: state.occurrences[occKey]?.state === 'dismissed',
      };
    }, TASK_ID));
    // Undo.
    await page.evaluate(() => Today.use('task-actions')._undoDelete());
    await expectAll('undo restores occurrence and task', await page.evaluate((id) => {
      const state = Today.use('habit-tasks').read();
      const occKey = Object.keys(state.occurrences).find(k => k.startsWith('habit_a::'));
      return {
        taskBack: manualTasks.some(t => t.id === id),
        active: state.occurrences[occKey]?.state === 'active',
      };
    }, TASK_ID));
    await page.close();
    ok('deleting generated task dismisses occurrence; undo restores both');
  }

  // ── 8. Disabling config removes the unfinished task ────────────────────────
  {
    const { page } = await openPage();
    await page.waitForFunction(id => manualTasks.some(t => t.id === id), { timeout: 5000 }, TASK_ID);
    // Save a disabled config.
    const disabled = await page.evaluate(() => {
      const ht = Today.use('habit-tasks');
      const cfg = ht.read().configs['habit_a'];
      return ht.saveConfig('habit_a', { ...cfg, enabled: false });
    });
    if (!disabled) await fail('saveConfig with enabled:false should return true');
    // reconcile to apply.
    await page.evaluate(() => Today.use('habit-tasks').reconcile());
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
    await expectAll('disabled habit: task removed', await page.evaluate(id => ({
      taskGone: !manualTasks.some(t => t.id === id),
    }), TASK_ID));
    await page.close();
    ok('disabling habit config removes unfinished generated task');
  }

  // ── 9. Archiving habit expires occurrence; unarchive undo restores ─────────
  {
    const { page } = await openPage();
    await page.waitForFunction(id => manualTasks.some(t => t.id === id), { timeout: 5000 }, TASK_ID);
    // Archive via habits API (also calls _archiveHabitUndo to push undo stack).
    await page.evaluate(() => Today.use('habits').archiveHabit('habit_a'));
    await page.waitForFunction(id => !manualTasks.some(t => t.id === id), { timeout: 3000 }, TASK_ID).catch(() => {});
    await expectAll('archive expires occurrence and removes task', await page.evaluate(id => {
      const state = Today.use('habit-tasks').read();
      const occKey = Object.keys(state.occurrences).find(k => k.startsWith('habit_a::'));
      return {
        taskGone: !manualTasks.some(t => t.id === id),
        expired: state.occurrences[occKey]?.state === 'expired',
      };
    }, TASK_ID));
    // Undo via _undoLast() which calls _undoArchiveHabit() internally.
    await page.evaluate(() => Today.use('task-actions')._undoLast());
    await page.waitForFunction(id => manualTasks.some(t => t.id === id), { timeout: 3000 }, TASK_ID).catch(() => {});
    await expectAll('unarchive restores occurrence and task', await page.evaluate(id => {
      const state = Today.use('habit-tasks').read();
      const occKey = Object.keys(state.occurrences).find(k => k.startsWith('habit_a::'));
      return {
        taskBack: manualTasks.some(t => t.id === id),
        active: state.occurrences[occKey]?.state === 'active',
      };
    }, TASK_ID));
    await page.close();
    ok('archiving habit expires occurrence; undo-archive restores active occurrence and task');
  }

  // ── 10. Daily task button present in habits edit mode ─────────────────────
  {
    const { page } = await openPage();
    await page.evaluate(() => Today.use('sidebar').open('habits'));
    await page.evaluate(() => Today.use('habits').toggleHabitEditMode());
    await page.waitForFunction(
      () => document.querySelectorAll('.habit-daily-config').length > 0,
      { timeout: 3000 },
    );
    await expectAll('Daily task button in edit mode', await page.evaluate(() => ({
      buttonPresent: document.querySelectorAll('[data-today-click="habits.daily-task"]').length > 0,
      onePerHabit:   document.querySelectorAll('[data-today-click="habits.daily-task"]').length ===
                     document.querySelectorAll('#habitList .habit').length,
    })));
    await page.close();
    ok('each habit row in edit mode has a "Daily task" button');
  }

  // ── 11. Editor opens and renders at desktop width ─────────────────────────
  {
    const { page } = await openPage();
    await page.evaluate(() => Today.use('sidebar').open('habits'));
    await page.evaluate(() => Today.use('habits').toggleHabitEditMode());
    await page.waitForFunction(() => document.querySelectorAll('[data-today-click="habits.daily-task"]').length > 0, { timeout: 3000 });
    // Click the Daily task button for habit_a.
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-today-click="habits.daily-task"]')]
        .find(b => b.dataset.habitId === 'habit_a');
      btn?.click();
    });
    // Wait for editor to load (lazy).
    await page.waitForFunction(() => Today.has('habit-task-editor'), { timeout: 8000 });
    await page.waitForFunction(() => document.querySelector('.ht-editor') !== null, { timeout: 5000 });
    await page.screenshot({ path: join(SHOTS, 'editor-desktop-1200.png') });
    await expectAll('editor desktop layout 1200px', await page.evaluate(() => {
      const editor = document.querySelector('.ht-editor');
      const rect = editor.getBoundingClientRect();
      const title = editor.querySelector('.ht-title');
      return {
        editorVisible: rect.width > 0 && rect.height > 0,
        titlePresent:  !!title && title.textContent.trim().length > 0,
        noOverflow:    editor.scrollWidth <= editor.clientWidth,
        withinSidebar: rect.right <= document.getElementById('sidebarRoot').getBoundingClientRect().right + 2,
      };
    }));
    // Mobile width.
    await page.setViewport({ width: 390, height: 844 });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: join(SHOTS, 'editor-mobile-390.png') });
    await expectAll('editor mobile layout 390px', await page.evaluate(() => {
      const editor = document.querySelector('.ht-editor');
      return {
        visible:    editor.getBoundingClientRect().width > 0,
        noOverflow: editor.scrollWidth <= editor.clientWidth + 1,
        inputsOk:   [...editor.querySelectorAll('input, select, textarea')]
          .every(el => el.getBoundingClientRect().right <= window.innerWidth + 2),
      };
    }));
    await page.close();
    ok('editor opens from Daily task button; no overflow at 1200px or 390px; screenshots saved');
  }

  // ── 12. Static wiring ─────────────────────────────────────────────────────
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
    await expectAll('static wiring', {
      policyNotEager:  !indexSrc.includes('<script src="assets/habit-task-policy.js"'),
      tasksNotEager:   !indexSrc.includes('<script src="assets/habit-tasks.js"'),
      editorNotEager:  !indexSrc.includes('<script src="assets/habit-task-editor.js"'),
      policyPrecached: swSrc.includes("'/assets/habit-task-policy.js'"),
      tasksPrecached:  swSrc.includes("'/assets/habit-tasks.js'"),
      editorPrecached: swSrc.includes("'/assets/habit-task-editor.js'"),
    });
    ok('habit-task files are lazy (not eager) in index.html and precached in sw.js');
  }

  console.log('\n✓ HABIT-TASKS TEST PASSED');
} finally {
  if (browser) await browser.close();
  server.close();
}
