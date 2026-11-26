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
async function openPage({ htSeed = HT_SEED, extraSeed = {}, ai = null, captureFreshDeadline = false } = {}) {
  const page = await browser.newPage();
  // ai: a reply object for /.netlify/functions/ai-assist; requests are recorded in window.__aiBodies.
  if (ai) {
    await page.setRequestInterception(true);
    page.on('request', async req => {
      if (!req.url().includes('/.netlify/functions/ai-assist')) return req.continue();
      const body = JSON.parse(req.postData() || '{}');
      const reply = typeof ai === 'function' ? await ai(body) : ai;
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(reply) });
    });
  }
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Pin the page clock to the fixture day so the suite does not depend on today's date.
  await page.evaluateOnNewDocument(fixture => {
    const Real = Date, offset = fixture - Real.now();
    class FixtureDate extends Real {
      constructor(...args) { super(...(args.length ? args : [Real.now() + offset + (window.__fixtureTimeShift || 0)])); }
      static now() { return Real.now() + offset + (window.__fixtureTimeShift || 0); }
    }
    window.Date = FixtureDate;
  }, FIXTURE_NOW);
  if (captureFreshDeadline) await page.evaluateOnNewDocument(() => {
    const original = window.setTimeout;
    window.setTimeout = (callback, delay, ...args) => {
      if (delay === 12000) window.__expireFreshRequest = () => callback(...args);
      return original(callback, delay, ...args);
    };
  });
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

  // ── Habit-task reasons: habit labels, stay with the habit, "did it my way" and Undo ──
  {
    const { page } = await openPage();
    await page.waitForFunction(id => manualTasks.some(t => t.id === id), { timeout: 5000 }, TASK_ID);
    await page.evaluate(() => { appMemory.taskOutcomes = []; appMemory.patterns.letgoReasons = {}; });
    const row = id => page.waitForFunction(id => !!document.querySelector('.task[data-taskid="' + CSS.escape(id) + '"]'), { timeout: 5000 }, id);
    await row(TASK_ID);
    await page.evaluate(id => Today.use('task-actions').deleteManual(id), TASK_ID);
    await page.waitForSelector('#undoReasonRow [data-reason]');
    const labels = await page.$$eval('#undoReasonRow [data-reason]', b => b.map(x => x.textContent));
    await page.click('#undoReasonRow [data-reason="my_way"]');
    const occKey = TASK_ID.replace('habit_task_', '');
    const after = await page.evaluate((key, day) => ({ o: Today.use('habit-tasks').read().occurrences[key],
      checked: (habitCompletions.habit_a || []).includes(day), outcomes: appMemory.taskOutcomes.length,
      reasons: Object.keys(appMemory.patterns.letgoReasons || {}).length }), occKey, TODAY);
    await page.evaluate(() => Today.use('task-actions')._undoDelete());
    const undone = await page.evaluate((key, day) => ({ o: Today.use('habit-tasks').read().occurrences[key],
      checked: (habitCompletions.habit_a || []).includes(day) }), occKey, TODAY);
    await expectAll('habit reasons, my-way check and its undo', {
      labels: JSON.stringify(labels) === JSON.stringify(['too hard', 'not useful', 'did it my way']),
      reason: after.o?.dismissReason === 'my_way' && !!after.o.reasonCheckAt,
      checked: after.checked,
      noTaskStats: after.outcomes === 0 && after.reasons === 0,
      undoClears: undone.o?.state === 'active' && !undone.o.dismissReason && !undone.o.reasonCheckAt,
      undoUnchecks: !undone.checked,
    });
    // A check that already existed is never removed by Undo.
    await page.evaluate(day => Today.use('habit-tasks').fromHabit('habit_a', day, true), TODAY);
    await page.evaluate(() => Today.use('connections').renderManual());
    await row(TASK_ID);
    await page.evaluate(id => Today.use('task-actions').deleteManual(id), TASK_ID);
    await page.waitForSelector('#undoReasonRow [data-reason="my_way"]');
    await page.click('#undoReasonRow [data-reason="my_way"]');
    await page.evaluate(() => Today.use('task-actions')._undoDelete());
    await expectAll('undo keeps an independent check', await page.evaluate(day => ({
      stillChecked: (habitCompletions.habit_a || []).includes(day) }), TODAY));
    // Ordinary tasks keep their four reasons.
    await page.evaluate(() => { manualTasks.push({ id: 'manual_plain', text: 'Plain task' }); Today.use('connections').renderManual(); });
    await row('manual_plain');
    await page.evaluate(() => Today.use('task-actions').deleteManual('manual_plain'));
    await page.waitForFunction(() => document.querySelectorAll('#undoReasonRow [data-reason]').length === 4);
    await page.close();
    ok('habit tasks get too hard / not useful / did it my way; reasons stay out of task stats; "did it my way" checks the habit and Undo removes only its own check');
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

  // ── 13. List marks follow each habit's mode; saving a mode updates the mark ──
  {
    const { page } = await openPage();
    await page.evaluate(() => Today.use('sidebar').open('habits'));
    await page.waitForSelector('#habitList .habit');
    await expectAll('mark for a legacy (set) config only', await page.evaluate(() => ({
      setMark: document.querySelector('[data-habit-id="habit_a"] .habit-daily-mark')?.getAttribute('aria-label') === 'Daily task, varied set',
      noMark: !document.querySelector('[data-habit-id="habit_b"] .habit-daily-mark'),
    })));
    await expectAll('marks are matching 14px icons centred on the name line', await page.evaluate(() => {
      // Fresh (✦) and set (list-in) marks: same drawn 14px icon, centred on the name's first line.
      Today.use('habit-tasks').saveConfig('habit_b', { enabled: true, mode: 'fresh', actions: [{ id: 'habit_name', text: 'Walk' }], defaultId: 'habit_name' });
      Today.use('habits').renderHabits();
      const rows = ['habit_a', 'habit_b'].map(id => {
        const mark = document.querySelector(`[data-habit-id="${id}"] .habit-daily-mark`), icon = mark.firstElementChild;
        const name = mark.closest('.habit-name'), lh = parseFloat(getComputedStyle(name).lineHeight), r = icon.getBoundingClientRect();
        return icon.tagName === 'svg' && r.width === 14 && r.height === 14 && Math.abs(r.top + r.height / 2 - (name.getBoundingClientRect().top + lh / 2)) < 1;
      });
      Today.use('habit-tasks').saveConfig('habit_b', { enabled: false, mode: 'set', actions: [{ id: 'habit_name', text: 'Walk' }], defaultId: 'habit_name' });
      Today.use('habits').renderHabits();
      return { setMark: rows[0], freshMark: rows[1] };
    }));
    await page.evaluate(() => Today.use('habits').toggleHabitEditMode());
    await expectAll('edit link names the mode', await page.evaluate(() => ({
      a: document.querySelector('[data-habit-id="habit_a"] .habit-daily-link')?.textContent === 'daily task · varied set',
      b: document.querySelector('[data-habit-id="habit_b"] .habit-daily-link')?.textContent === 'daily task',
    })));
    await page.click('[data-habit-id="habit_a"] .habit-daily-link');
    await page.waitForSelector('.ht-editor');
    await page.click('.ht-mode:has([value="fresh"])');
    await page.type('#htNote', 'Twenty pages at most');
    await page.screenshot({ path: join(SHOTS, 'editor-fresh.png') });
    await page.click('.ht-save');
    await page.waitForSelector('#habitList .habit');
    await expectAll('fresh mode saved and marked', await page.evaluate(() => {
      const c = Today.use('habit-tasks').read().configs.habit_a;
      return { mode: c.mode === 'fresh', note: c.note === 'Twenty pages at most', kept: c.actions[0].text === 'Read for 20 minutes',
        mark: document.querySelector('[data-habit-id="habit_a"] .habit-daily-mark')?.getAttribute('aria-label') === 'Daily task, fresh each day' };
    }));
    await page.close();
    ok('list mark follows the mode (✦ fresh · list-in set); edit link names it; saving updates it');
  }

  // ── 14. Fresh each day: the AI writes today's task once, with bounded same-habit progression ──
  {
    const seed = structuredClone(HT_SEED);
    Object.assign(seed.configs.habit_a, { mode: 'fresh', note: 'Evenings only' });
    const { page } = await openPage({ htSeed: seed, extraSeed: { today_ai_provider: 'claude', today_ai_key_claude: 'test-key' },
      ai: body => (globalThis.__lastAi = body, { text: 'Read one chapter before dinner' }) });
    await page.waitForFunction(id => manualTasks.find(t => t.id === id)?.text === 'Read one chapter before dinner', { timeout: 8000 }, TASK_ID);
    const sent = JSON.parse(globalThis.__lastAi.messages[0].content);
    await expectAll('fresh task written by AI', await page.evaluate((id, key) => ({
      occurrence: Today.use('habit-tasks').read().occurrences[key]?.actionId === 'ai',
      notEdited: Today.use('habit-tasks').read().occurrences[key]?.edited === false,
    }), TASK_ID, TASK_ID.replace('habit_task_', '')));
    await expectAll('fresh request carries bounded guidance without raw history', {
      keys: JSON.stringify(Object.keys(sent).sort()) === '["after","avoid","earlier","goal","habit","heavyDays","lately","note","ownWay","recentPractice","size","today","usually"]',
      habit: sent.habit === 'Morning read', note: sent.note === 'Evenings only',
      sparse: sent.size === 'practice' && sent.lately === 'unknown' && sent.heavyDays === 'unknown' && sent.usually === null && sent.after === null && sent.recentPractice.length === 0,
      loadStored: await page.evaluate(key => ['light', 'normal', 'heavy'].includes(Today.use('habit-tasks').read().occurrences[key]?.load), TASK_ID.replace('habit_task_', '')),
    });
    await page.close();
    ok('fresh mode replaces the fallback with an AI-written task; request adds only bounded same-habit guidance; sparse history stays baseline');
  }

  // Current-source evidence and delayed replies use the real writer, not a mock policy.
  function progressionSeed() {
    const seed = structuredClone(HT_SEED);
    Object.assign(seed.configs.habit_a, { mode: 'fresh', note: 'Learn from reading, twenty minutes at most', updatedAt: '2026-09-01T10:00:00.000Z' });
    const completions = [];
    for (let offset = 1; offset <= 14; offset++) {
      const d = new Date(TODAY + 'T12:00:00'); d.setDate(d.getDate() - offset);
      const day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      completions.push(day);
      seed.occurrences['habit_a::' + day] = { habitId: 'habit_a', day, actionId:'ai', text:'Recall one idea from the chapter',
        createdAt:'2026-09-02T10:00:00.000Z', updatedAt:'2026-09-02T10:00:00.000Z', state:'expired', edited:false,
        basis:JSON.stringify(['Morning read',seed.configs.habit_a.updatedAt]) };
    }
    return { seed, completions };
  }
  {
    const { seed, completions } = progressionSeed(); let request;
    const { page } = await openPage({ htSeed:seed,
      extraSeed:{ today_ai_provider:'claude', today_ai_key_claude:'test-key', today_habit_completions:{habit_a:completions,habit_b:['PRIVATE_DATE']} },
      ai:body => (request=body,{text:'Recall an idea before opening the chapter'}) });
    await page.waitForFunction(id=>manualTasks.find(t=>t.id===id)?.text==='Recall an idea before opening the chapter',{timeout:8000},TASK_ID);
    const payload=JSON.parse(request.messages[0].content);
    await expectAll('same-habit bounded evidence',{
      labelsOnly:['size','today','lately','heavyDays'].every(k=>typeof payload[k]==='string'),
      familiar:payload.recentPractice.length===3,
      noRawHistory:!JSON.stringify(payload).includes('PRIVATE_DATE')&&!JSON.stringify(payload).includes('habit_a')&&!JSON.stringify(payload).includes(completions[0]),
      sourceStored:await page.evaluate(id=>!!Today.use('habit-tasks').read().occurrences[id].basis,'habit_a::'+TODAY),
      principles:request.systemPrompt.includes('outranks every inferred field')&&request.systemPrompt.includes('never a quota')&&!request.systemPrompt.includes('Differ in substance'),
    });
    await page.close(); ok('fresh writer uses bounded same-habit evidence and permits consolidation; source binding survives persistence');
  }
  for (const change of ['setup','rename','archive','disabled','completed','uncheck-history','provider-key','detach','habit-day']) {
    const { seed, completions }=progressionSeed();
    let release, started, calls=0;
    const ready=new Promise(resolve=>started=resolve), delayed=new Promise(resolve=>release=resolve);
    const { page }=await openPage({htSeed:seed,extraSeed:{today_ai_provider:'claude',today_ai_key_claude:'test-key',today_habit_completions:{habit_a:completions}},
      ai:async()=>{calls++;started();await delayed;return {text:'A stale suggestion must never replace this'};}});
    await ready;
    await page.evaluate((change,id,day,previous)=>{
      const api=Today.use('habit-tasks');
      if(change==='setup'){const state=api.read();state.configs.habit_a.note='Maintain only';localStorage.setItem('today_habit_tasks_v1',JSON.stringify(state));}
      if(change==='rename')habitsList[0].name='Renamed habit';
      if(change==='archive')habitsList[0].archived=true;
      if(change==='disabled'){const state=api.read();state.configs.habit_a.enabled=false;localStorage.setItem('today_habit_tasks_v1',JSON.stringify(state));}
      if(change==='habit-day')window.__fixtureTimeShift=24*60*60*1000;
      if(change==='completed')api.fromHabit('habit_a',day,true);
      if(change==='uncheck-history')habitEvents['habit_a::'+previous]={type:'uncheck',at:new Date().toISOString()};
      if(change==='provider-key')localStorage.setItem('today_ai_key_claude','different-test-key');
      if(change==='detach')api.detach(manualTasks.find(t=>t.id===id));
    },change,TASK_ID,TODAY,completions[0]);
    release();
    await page.waitForNetworkIdle({idleTime:100,timeout:5000});
    await expectAll('late '+change+' reply is discarded',await page.evaluate(id=>({
      unchanged:manualTasks.find(t=>t.id===id)?.text==='Read for 20 minutes',
      noAI:Today.use('habit-tasks').read().occurrences[id.replace('habit_task_','')]?.actionId!=='ai',
    }),TASK_ID));
    if(calls!==1)await fail('stale request is not automatically retried',{change,calls});
    await page.close();
  }
  ok('setup/owner/archive/disable/day changes, completion, historical uncheck, AI-key changes and detachment discard late responses without retries');

  // Invalid/overlong prose and an expired request must keep the approved fallback.
  for (const reply of [{text:'x'.repeat(71)}, {text:42}, {content:'not JSON'}, null]) {
    const { seed }=progressionSeed(); let calls=0;
    const { page }=await openPage({htSeed:seed,extraSeed:{today_ai_provider:'claude',today_ai_key_claude:'test-key'},
      ai:()=>{calls++;return reply;}});
    await page.waitForNetworkIdle({idleTime:100,timeout:5000});
    await expectAll('invalid AI result keeps fallback',await page.evaluate(id=>({
      fallback:manualTasks.find(t=>t.id===id)?.text==='Read for 20 minutes',
      noAI:Today.use('habit-tasks').read().occurrences[id.replace('habit_task_','')]?.actionId!=='ai',
    }),TASK_ID));
    await page.evaluate(()=>Today.use('habit-tasks').reconcile());
    if(calls!==1)await fail('invalid result must not trigger automatic retries',{reply,calls});
    await page.close();
  }
  {
    const { seed }=progressionSeed(); let release, started;
    const ready=new Promise(resolve=>started=resolve), delayed=new Promise(resolve=>release=resolve);
    const { page }=await openPage({htSeed:seed,captureFreshDeadline:true,extraSeed:{today_ai_provider:'claude',today_ai_key_claude:'test-key'},
      ai:async()=>{started();await delayed;return {text:'This response arrived after the deadline'};}});
    await ready;
    await page.waitForFunction(()=>typeof window.__expireFreshRequest==='function');
    await page.evaluate(()=>window.__expireFreshRequest());
    release();
    await page.waitForNetworkIdle({idleTime:100,timeout:5000});
    await expectAll('deadline abort keeps fallback',await page.evaluate(id=>({
      fallback:manualTasks.find(t=>t.id===id)?.text==='Read for 20 minutes',
      noAI:Today.use('habit-tasks').read().occurrences[id.replace('habit_task_','')]?.actionId!=='ai',
    }),TASK_ID));
    await page.close();
  }
  ok('nontext, malformed and overlong replies, plus the actual 12-second abort callback, retain the fallback without retries');

  // ── 15. A varied set: prepare, remove, add your own; save keeps the set and the avoid list ──
  {
    const texts = ['Read a poem aloud', 'Ten pages of the novel', 'Read an essay', 'Reread a favourite chapter'];
    const { page } = await openPage({ extraSeed: { today_ai_provider: 'claude', today_ai_key_claude: 'test-key' },
      ai: { actions: texts.map(text => ({ text })) } });
    await page.evaluate(() => Today.use('sidebar').open('habits'));
    await page.evaluate(() => Today.use('habits').toggleHabitEditMode());
    await page.click('[data-habit-id="habit_b"] .habit-daily-link');
    await page.waitForSelector('.ht-editor');
    await page.click('.ht-mode:has([value="set"])');
    await page.waitForFunction(() => document.querySelectorAll('.ht-chip').length === 4, { timeout: 5000 });
    await page.click('.ht-chip-x');
    await page.type('[name="own"]', 'Read on the bus');
    await page.keyboard.press('Enter');
    await page.screenshot({ path: join(SHOTS, 'editor-set.png') });
    const previewRows = await page.evaluate(() => [...document.querySelectorAll('.ht-row .ht-task-text')].map(n => n.textContent));
    await page.click('.ht-save');
    await page.waitForSelector('#habitList .habit');
    await expectAll('set saved', await page.evaluate(() => {
      const c = Today.use('habit-tasks').read().configs.habit_b;
      return { mode: c.mode === 'set', count: c.actions.length === 4, own: c.actions.at(-1).text === 'Read on the bus',
        avoid: c.avoid.includes('Read a poem aloud'), refreshed: !!c.refreshedAt,
        mark: document.querySelector('[data-habit-id="habit_b"] .habit-daily-mark')?.getAttribute('aria-label') === 'Daily task, varied set' };
    }));
    await expectAll('preview shows three different days', { three: previewRows.length === 3, varied: new Set(previewRows).size === 3 });
    await page.close();
    ok('a varied set is prepared, trimmed and extended; preview rotates; removed wording is avoided later');
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
