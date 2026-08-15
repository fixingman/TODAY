// TODAY — drag/reorder regression test
//
// Exercises the delegated desktop and touch controllers against the real app DOM.
// The pre-fix mode snapshots the known mobile Trello persistence gap so this suite
// can be run before the repair/extraction; the default mode requires the repaired
// contract and the extracted module wiring.
//
// Run from repo root:
//   node scripts/drag-test.mjs --pre-fix   # only before v2.64.27 implementation
//   node scripts/drag-test.mjs             # normal pre-commit gate

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PRE_FIX = process.argv.includes('--pre-fix');

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };
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

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900, isMobile: false, hasTouch: false });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('splash_shown_at', String(Date.now()));
  });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof renderManual === 'function'
    && document.getElementById('manualList')
    && document.getElementById('trelloList')
    && document.getElementById('habitList'), { timeout: 15000 });

  const reset = async () => page.evaluate(() => {
    manualTasks = [
      { id: 'm-a', text: 'manual alpha' },
      { id: 'm-b', text: 'manual beta' },
      { id: 'm-c', text: 'manual gamma' },
    ];
    trelloTasks = [
      { id: 't-a', text: 'trello alpha' },
      { id: 't-b', text: 'trello beta' },
      { id: 't-c', text: 'trello gamma' },
    ];
    habitsList = [
      { id: 'h-a', name: 'habit alpha' },
      { id: 'h-b', name: 'habit beta' },
      { id: 'h-c', name: 'habit gamma' },
    ];
    habitCompletions = {};
    habitEvents = {};

    document.getElementById('manualList').innerHTML = `
      <div class="task" data-taskid="m-a"><span class="task-check"></span><span class="task-text">alpha</span></div>
      <div class="task" data-taskid="m-b"><span class="task-check"></span><span class="task-text">beta</span></div>
      <div class="task" data-taskid="m-c"><span class="task-check"></span><span class="task-text">gamma</span></div>`;
    document.getElementById('trelloList').innerHTML = `
      <div class="task" data-taskid="t-a"><span class="task-check"></span><span class="task-text">alpha</span></div>
      <div class="task" data-taskid="t-b"><span class="task-check"></span><span class="task-text">beta</span></div>
      <div class="task" data-taskid="t-c"><span class="task-check"></span><span class="task-text">gamma</span></div>`;
    document.getElementById('habitList').innerHTML = `
      <div class="habit" data-habit-id="h-a"><span class="habit-check"></span><span class="habit-name">alpha</span></div>
      <div class="habit" data-habit-id="h-b"><span class="habit-check"></span><span class="habit-name">beta</span></div>
      <div class="habit" data-habit-id="h-c"><span class="habit-check"></span><span class="habit-name">gamma</span></div>`;

    for (const key of ['today_manual', 'today_manual_order_at', 'today_trello_order',
      'today_trello_order_at', 'today_habits', 'today_habit_completions',
      'today_habit_events', 'last_local_change']) localStorage.removeItem(key);
    localStorage.setItem('today_trello_cache', JSON.stringify({ marker: 'keep', tasks: [] }));

    window.__dragTest = { autosaves: 0, haptics: [] };
    dropboxAutoSave = () => { window.__dragTest.autosaves++; };
    window._haptic = preset => { window.__dragTest.haptics.push(preset); };
  });

  const desktopDrag = async (listId, attr, sourceId, targetId) => page.evaluate(
    ({ listId, attr, sourceId, targetId }) => {
      const source = document.querySelector(`#${listId} [data-${attr}="${sourceId}"]`);
      const target = document.querySelector(`#${listId} [data-${attr}="${targetId}"]`);
      const dataTransfer = {
        effectAllowed: '', dropEffect: '', value: '',
        setData(type, value) { this.value = `${type}:${value}`; },
      };
      const fire = (el, type, init = {}) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, init);
        el.dispatchEvent(event);
        return event;
      };
      fire(source, 'mousedown');
      const armed = source.getAttribute('draggable') === 'true';
      fire(source, 'dragstart', { dataTransfer });
      const started = source.classList.contains('dragging');
      fire(target, 'dragover', { dataTransfer });
      const highlighted = target.classList.contains('drag-over');
      fire(target, 'drop', { dataTransfer });
      fire(source, 'dragend', { dataTransfer });
      document.dispatchEvent(new Event('mouseup', { bubbles: true }));
      return { armed, started, highlighted, dataTransfer: dataTransfer.value };
    }, { listId, attr, sourceId, targetId });

  const state = async (listId, attr) => page.evaluate(({ listId, attr }) => {
    const dom = [...document.querySelectorAll(`#${listId} [data-${attr}]`)]
      .map(row => row.getAttribute(`data-${attr}`));
    const arrays = {
      manualList: manualTasks.map(item => item.id),
      trelloList: trelloTasks.map(item => item.id),
      habitList: habitsList.map(item => item.id),
    };
    const parsed = key => JSON.parse(localStorage.getItem(key) || 'null');
    return {
      dom,
      memory: arrays[listId],
      manual: parsed('today_manual')?.map(item => item.id) || null,
      trelloOrder: parsed('today_trello_order'),
      trelloCache: parsed('today_trello_cache'),
      habits: parsed('today_habits')?.map(item => item.id) || null,
      manualAt: localStorage.getItem('today_manual_order_at'),
      trelloAt: localStorage.getItem('today_trello_order_at'),
      localAt: localStorage.getItem('last_local_change'),
      calls: window.__dragTest,
      dirty: document.querySelectorAll('.dragging, .drag-over, .touch-drag-ghost').length,
      draggable: document.querySelectorAll('[draggable="true"]').length,
    };
  }, { listId, attr });

  // Desktop: all three collections reorder and persist through their real helpers.
  for (const testCase of [
    { label: 'manual', list: 'manualList', attr: 'taskid', source: 'm-a', target: 'm-c' },
    { label: 'Trello', list: 'trelloList', attr: 'taskid', source: 't-a', target: 't-c' },
    { label: 'habit', list: 'habitList', attr: 'habit-id', source: 'h-a', target: 'h-c' },
  ]) {
    await reset();
    const gesture = await desktopDrag(testCase.list, testCase.attr, testCase.source, testCase.target);
    await new Promise(resolve => setTimeout(resolve, 10));
    const result = await state(testCase.list, testCase.attr);
    const expected = [testCase.source.replace(/-a$/, '-b'), testCase.source.replace(/-a$/, '-c'), testCase.source];
    const common = {
      armed: gesture.armed,
      started: gesture.started,
      highlighted: gesture.highlighted,
      transferNamesListAndRow: gesture.dataTransfer.includes(`${testCase.list}:${testCase.source}`),
      domOrder: JSON.stringify(result.dom) === JSON.stringify(expected),
      memoryOrder: JSON.stringify(result.memory) === JSON.stringify(expected),
      selectionHaptic: result.calls.haptics.includes('selection'),
      cleaned: result.dirty === 0 && result.draggable === 0,
    };
    if (testCase.list === 'manualList') Object.assign(common, {
      persisted: JSON.stringify(result.manual) === JSON.stringify(expected),
      reorderTimestamp: !Number.isNaN(Date.parse(result.manualAt)),
      localChangeTimestamp: !Number.isNaN(Date.parse(result.localAt)),
      autosaved: result.calls.autosaves === 1,
    });
    if (testCase.list === 'trelloList') Object.assign(common, {
      persisted: JSON.stringify(result.trelloOrder) === JSON.stringify(expected),
      cacheUpdated: JSON.stringify(result.trelloCache?.tasks?.map(item => item.id)) === JSON.stringify(expected)
        && result.trelloCache?.marker === 'keep',
      reorderTimestamp: !Number.isNaN(Date.parse(result.trelloAt)),
      localChangeTimestamp: !Number.isNaN(Date.parse(result.localAt)),
      autosaved: result.calls.autosaves === 1,
    });
    if (testCase.list === 'habitList') Object.assign(common, {
      persisted: JSON.stringify(result.habits) === JSON.stringify(expected),
      autosaveBehaviorPreserved: result.calls.autosaves === 2,
    });
    await expectAll(`desktop ${testCase.label} reorder`, common);
    ok(`desktop ${testCase.label} reorder persists and cleans up`);
  }

  // Desktop guards and list ownership.
  await reset();
  const guardResult = await page.evaluate(async () => {
    const fire = (el, type, dataTransfer) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      if (dataTransfer) Object.assign(event, { dataTransfer });
      el.dispatchEvent(event);
    };
    const manual = document.querySelector('[data-taskid="m-a"]');
    const check = manual.querySelector('.task-check');
    fire(check, 'mousedown');
    const interactiveArmed = manual.hasAttribute('draggable');
    manual.classList.add('done');
    fire(manual, 'mousedown');
    const doneArmed = manual.hasAttribute('draggable');
    manual.classList.remove('done');
    const habit = document.querySelector('[data-habit-id="h-a"]');
    habit.classList.add('editing');
    fire(habit, 'mousedown');
    const editingArmed = habit.hasAttribute('draggable');
    habit.classList.remove('editing');

    fire(manual, 'mousedown');
    const dt = { effectAllowed: '', dropEffect: '', setData() {} };
    fire(manual, 'dragstart', dt);
    fire(document.querySelector('[data-taskid="t-c"]'), 'drop', dt);
    fire(manual, 'dragend', dt);
    document.dispatchEvent(new Event('mouseup', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
      interactiveBlocked: !interactiveArmed,
      doneBlocked: !doneArmed,
      editingBlocked: !editingArmed,
      crossListIgnored: [...document.querySelectorAll('#manualList [data-taskid]')]
        .map(row => row.dataset.taskid).join(',') === 'm-a,m-b,m-c',
      cleaned: document.querySelectorAll('.dragging, .drag-over, [draggable="true"]').length === 0,
    };
  });
  await expectAll('desktop drag guards', guardResult);
  ok('desktop guards block controls, done/editing rows, and cross-list drops');

  const touchDrag = async (listId, attr, sourceId, targetId, finish = 'touchend') => page.evaluate(
    async ({ listId, attr, sourceId, targetId, finish }) => {
      const source = document.querySelector(`#${listId} [data-${attr}="${sourceId}"]`);
      const target = document.querySelector(`#${listId} [data-${attr}="${targetId}"]`);
      const rect = source.getBoundingClientRect();
      const touch = { clientX: rect.left + 8, clientY: rect.top + 8 };
      const fire = (el, type, touches) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'touches', { value: touches, configurable: true });
        el.dispatchEvent(event);
        return event;
      };
      fire(source, 'touchstart', [touch]);
      await new Promise(resolve => setTimeout(resolve, 430));
      const activated = source.classList.contains('dragging')
        && !!document.querySelector('.touch-drag-ghost');
      const originalElementFromPoint = document.elementFromPoint.bind(document);
      document.elementFromPoint = () => target;
      const move = fire(source, 'touchmove', [touch]);
      document.elementFromPoint = originalElementFromPoint;
      const highlighted = target.classList.contains('drag-over');
      fire(source, finish, []);
      await new Promise(resolve => setTimeout(resolve, 10));
      return { activated, highlighted, movePrevented: move.defaultPrevented };
    }, { listId, attr, sourceId, targetId, finish });

  // Touch: long-press, ghost movement, persistence, haptics, and cleanup.
  for (const testCase of [
    { label: 'manual', list: 'manualList', attr: 'taskid', source: 'm-a', target: 'm-c' },
    { label: 'Trello', list: 'trelloList', attr: 'taskid', source: 't-a', target: 't-c' },
    { label: 'habit', list: 'habitList', attr: 'habit-id', source: 'h-a', target: 'h-c' },
  ]) {
    await reset();
    const gesture = await touchDrag(testCase.list, testCase.attr, testCase.source, testCase.target);
    const result = await state(testCase.list, testCase.attr);
    const expected = [testCase.source.replace(/-a$/, '-b'), testCase.source.replace(/-a$/, '-c'), testCase.source];
    const common = {
      activated: gesture.activated,
      highlighted: gesture.highlighted,
      movePrevented: gesture.movePrevented,
      domOrder: JSON.stringify(result.dom) === JSON.stringify(expected),
      memoryOrder: JSON.stringify(result.memory) === JSON.stringify(expected),
      activationHaptic: result.calls.haptics.includes('heavy'),
      dropHaptic: result.calls.haptics.includes('selection'),
      cleaned: result.dirty === 0,
    };
    if (testCase.list === 'manualList') Object.assign(common, {
      persisted: JSON.stringify(result.manual) === JSON.stringify(expected),
      reorderTimestamp: !Number.isNaN(Date.parse(result.manualAt)),
      localChangeTimestamp: !Number.isNaN(Date.parse(result.localAt)),
      autosaved: result.calls.autosaves === 1,
    });
    if (testCase.list === 'trelloList') {
      const fixed = JSON.stringify(result.trelloOrder) === JSON.stringify(expected)
        && !Number.isNaN(Date.parse(result.trelloAt))
        && !Number.isNaN(Date.parse(result.localAt))
        && result.calls.autosaves === 1;
      Object.assign(common, {
        cacheUpdated: JSON.stringify(result.trelloCache?.tasks?.map(item => item.id)) === JSON.stringify(expected),
        persistenceContract: PRE_FIX ? !fixed : fixed,
      });
    }
    if (testCase.list === 'habitList') Object.assign(common, {
      persisted: JSON.stringify(result.habits) === JSON.stringify(expected),
      autosaved: result.calls.autosaves === 1,
    });
    await expectAll(`touch ${testCase.label} reorder`, common);
    ok(`touch ${testCase.label} reorder ${PRE_FIX && testCase.list === 'trelloList' ? 'records known persistence gap' : 'persists and cleans up'}`);
  }

  // Any pre-activation movement cancels the timer; touchcancel removes live state.
  await reset();
  const cancelResult = await page.evaluate(async () => {
    const source = document.querySelector('[data-taskid="m-a"]');
    const event = (type, touches) => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'touches', { value: touches, configurable: true });
      source.dispatchEvent(e);
    };
    const touch = { clientX: 10, clientY: 10 };
    event('touchstart', [touch]);
    event('touchmove', [{ clientX: 20, clientY: 20 }]);
    await new Promise(resolve => setTimeout(resolve, 430));
    const earlyMoveCancelled = !source.classList.contains('dragging')
      && !document.querySelector('.touch-drag-ghost');

    event('touchstart', [touch]);
    await new Promise(resolve => setTimeout(resolve, 430));
    const activated = source.classList.contains('dragging')
      && !!document.querySelector('.touch-drag-ghost');
    event('touchcancel', []);
    return {
      earlyMoveCancelled,
      activated,
      cancelCleaned: !source.classList.contains('dragging')
        && !document.querySelector('.touch-drag-ghost')
        && !document.querySelector('.drag-over'),
      orderUnchanged: [...document.querySelectorAll('#manualList [data-taskid]')]
        .map(row => row.dataset.taskid).join(',') === 'm-a,m-b,m-c',
    };
  });
  await expectAll('touch cancellation paths', cancelResult);
  ok('movement cancels pending long-press and touchcancel removes live drag state');

  // Touch guards mirror the delegated desktop safety checks, and a target from a
  // different list must never become a reorder destination.
  await reset();
  const touchGuardResult = await page.evaluate(async () => {
    const fire = (el, type, touches) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', { value: touches, configurable: true });
      el.dispatchEvent(event);
    };
    const touch = { clientX: 12, clientY: 12 };
    const manual = document.querySelector('[data-taskid="m-a"]');
    fire(manual.querySelector('.task-check'), 'touchstart', [touch]);
    await new Promise(resolve => setTimeout(resolve, 430));
    const interactiveBlocked = !document.querySelector('.touch-drag-ghost');

    const habit = document.querySelector('[data-habit-id="h-a"]');
    habit.classList.add('editing');
    fire(habit, 'touchstart', [touch]);
    await new Promise(resolve => setTimeout(resolve, 430));
    const editingBlocked = !document.querySelector('.touch-drag-ghost');
    habit.classList.remove('editing');

    fire(manual, 'touchstart', [touch]);
    await new Promise(resolve => setTimeout(resolve, 430));
    const activated = !!document.querySelector('.touch-drag-ghost');
    const originalElementFromPoint = document.elementFromPoint.bind(document);
    document.elementFromPoint = () => document.querySelector('[data-taskid="t-c"]');
    fire(manual, 'touchmove', [touch]);
    document.elementFromPoint = originalElementFromPoint;
    const crossListUnmarked = !document.querySelector('#trelloList .drag-over');
    fire(manual, 'touchend', []);
    return {
      interactiveBlocked,
      editingBlocked,
      activated,
      crossListUnmarked,
      orderUnchanged: [...document.querySelectorAll('#manualList [data-taskid]')]
        .map(row => row.dataset.taskid).join(',') === 'm-a,m-b,m-c',
      cleaned: !document.querySelector('.touch-drag-ghost, .dragging, .drag-over'),
    };
  });
  await expectAll('touch drag guards', touchGuardResult);
  ok('touch guards block controls/editing rows and reject cross-list targets');

  if (!PRE_FIX) {
    const [indexSource, dragSource, swSource] = await Promise.all([
      readFile(join(ROOT, 'index.html'), 'utf8'),
      readFile(join(ROOT, 'assets/drag.js'), 'utf8'),
      readFile(join(ROOT, 'sw.js'), 'utf8'),
    ]);
    const staticResult = {
      scriptLoadedOnce: (indexSource.match(/<script src="assets\/drag\.js"><\/script>/g) || []).length === 1,
      startedOnce: (indexSource.match(/window\._startDrag\(\);/g) || []).length === 1,
      publicEntrypoint: dragSource.includes('window._startDrag = function()'),
      idempotent: /let started\s*=\s*false/.test(dragSource) && /if \(started\) return/.test(dragSource),
      desktopMoved: dragSource.includes('Drag-to-reorder — manual tasks, trello tasks, habits'),
      touchMoved: dragSource.includes('Touch drag-to-reorder (mobile long-press)'),
      inlineRemoved: !indexSource.includes('Drag-to-reorder — manual tasks, trello tasks, habits')
        && !indexSource.includes('Touch drag-to-reorder (mobile long-press)'),
      precached: swSource.includes("'/assets/drag.js'"),
    };
    await expectAll('extracted drag module wiring', staticResult);
    ok('module loads, starts once, owns both controllers, and is SW-precached');
  }

  if (pageErrors.length) await fail('uncaught browser errors', pageErrors);
  ok('no uncaught browser errors');
} finally {
  if (browser) await browser.close();
  server.close();
}
