// TODAY — focus mode module regression test
//
// Tests: mobile guard, desktop exports, task click opens timer, session persist,
//        space-to-pause, escape-to-close, _focusOnCheck (no-session + active-session),
//        session restore, _focusReanchor no-throw, Document PiP lifecycle, static wiring.
//
// Run from repo root:
//   node scripts/focus-test.mjs --pre-extraction
//   node scripts/focus-test.mjs

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

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

// CI's headless Linux Chrome reports no pointing device at all — (hover: hover) false,
// (pointer: fine) false, (pointer: coarse) false — so @media (hover: hover) never matches
// there and the copy button and hover shimmer never render. Media emulation cannot
// change hover/pointer (Puppeteer rejects the names; CDP ignores them), but Blink's
// launch-time input settings can. Declare the desktop these assertions assume:
// hover=2 (hover), pointer=4 (fine). Verified both directions on macOS 2026-09-06.
const DESKTOP_INPUT = '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4';
browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions', DESKTOP_INPUT],
});

// openPage — emulates a desktop (hover:hover) or mobile (no hover) environment.
// Seeds localStorage with a single manual task so the task list renders.
async function openPage({ hoverHover = true, extraSeed = {}, pip = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.evaluateOnNewDocument(({ seed, hoverHover, pip }) => {
    // Stub matchMedia so the hover:hover guard is deterministic in headless Chrome.
    const _orig = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      if (query === '(hover: hover)') {
        return { matches: hoverHover, media: query,
          addEventListener: () => {}, removeEventListener: () => {},
          addListener: () => {}, removeListener: () => {},
          dispatchEvent: () => false, onchange: null };
      }
      return _orig(query);
    };
    if (pip) {
      const state = window.__focusPipTest = {
        requests: [],
        windows: [],
        openerFocusCalls: 0,
      };
      let visibility = 'visible';
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibility,
      });
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => visibility === 'hidden',
      });
      state.setVisibility = value => {
        visibility = value;
        document.dispatchEvent(new Event('visibilitychange'));
      };
      window.focus = () => { state.openerFocusCalls++; };
      Object.defineProperty(window, 'documentPictureInPicture', {
        configurable: true,
        value: {
          requestWindow: async options => {
            state.requests.push(options);
            const listeners = {};
            const pipDocument = document.implementation.createHTMLDocument('TODAY');
            const pipWindow = {
              document: pipDocument,
              closed: false,
              addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
              requestAnimationFrame(fn) { return window.requestAnimationFrame(fn); },
              cancelAnimationFrame(id) { window.cancelAnimationFrame(id); },
              close() {
                if (this.closed) return;
                this.closed = true;
                (listeners.pagehide || []).forEach(fn => fn());
              },
            };
            state.windows.push(pipWindow);
            return pipWindow;
          },
        },
      });
    }
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_manual', JSON.stringify([
      { id: 'manual_t1', text: 'Write the tests', addedAt: '' }
    ]));
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, { seed: extraSeed, hoverHover, pip });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  if (hoverHover) {
    await page.waitForFunction(
      () => typeof window._focusOnCheck === 'function' &&
            typeof window._tryRestoreFocusSession === 'function' &&
            typeof window._focusReanchor === 'function' &&
            !!document.getElementById('addTaskBar'),
      { timeout: 15000 }
    );
  } else {
    await page.waitForFunction(
      () => !!document.getElementById('addTaskBar'),
      { timeout: 15000 }
    );
  }
  await page.evaluate(() => {
    window.dropboxBackup          = () => {};
    window.dropboxAutoSave        = () => {};
    window._haptic                = () => {};
    window.playStartSound         = () => {};
    window.playResumeSound        = () => {};
    window.playChime              = () => {};
    window._primeAudio            = () => {};
    window._saveManual            = () => {};
    window._saveHabits            = () => {};
    window._memoryOnFocusComplete = () => {};
    window.updateStats            = () => {};
    window._markTrelloActive      = () => {};
  });
  return { page, errors };
}

try {
  if (PRE_EXTRACTION) {
    const src = await readFile(join(ROOT, 'index.html'), 'utf8');
    await expectAll('pre-extraction baseline', {
      focusIIFEInline: src.includes('// FOCUS MODE (Pomodoro)'),
      noModule:        !existsSync(join(ROOT, 'assets/focus.js')),
    });
    ok('pre-extraction: focus IIFE inline; assets/focus.js absent');
    console.log('\nFocus tests passed (pre-extraction baseline, 1 check).');
  } else {
    // 1. Mobile guard — exports absent on hover:none devices.
    {
      const { page, errors } = await openPage({ hoverHover: false });
      const r = await page.evaluate(() => ({
        noFocusOnCheck:        typeof window._focusOnCheck === 'undefined',
        noTryRestore:          typeof window._tryRestoreFocusSession === 'undefined',
        noReanchor:            typeof window._focusReanchor === 'undefined',
      }));
      await expectAll('mobile guard', { ...r, noErrors: !errors.length });
      ok('mobile guard: focus exports absent on hover:none');
      await page.close();
    }

    // 2. Desktop — all three exports defined.
    {
      const { page, errors } = await openPage();
      const r = await page.evaluate(() => ({
        hasFocusOnCheck: typeof window._focusOnCheck === 'function',
        hasTryRestore:   typeof window._tryRestoreFocusSession === 'function',
        hasReanchor:     typeof window._focusReanchor === 'function',
      }));
      await expectAll('desktop exports', { ...r, noErrors: !errors.length });
      ok('desktop exports: _focusOnCheck, _tryRestoreFocusSession, _focusReanchor all defined');
      await page.close();
    }

    // Completed and partial focus progress must queue sync without another task edit.
    {
      const { page, errors } = await openPage();
      await page.evaluate(() => {
        window.__focusSaves = [];
        localStorage.removeItem('last_local_change');
        window.dropboxAutoSave = () => window.__focusSaves.push({
          sessions:manualTasks[0].focusSessions || 0,
          minutes:Number(localStorage.getItem('stat_focus_mins_today') || 0),
          changed:!!localStorage.getItem('last_local_change'),
        });
      });
      await page.click('.task[data-taskid="manual_t1"] .task-text');
      await page.waitForSelector('.focus-timer.open', { visible:true });
      const completed = await page.evaluate(() => {
        const original = Date.now;
        const now = original();
        Date.now = () => now + 1501000;
        try { document.dispatchEvent(new Event('visibilitychange')); }
        finally { Date.now = original; }
        return window.__focusSaves.some(s => s.sessions === 1 && s.minutes === 25 && s.changed);
      });
      await expectAll('completed focus queues sync', { completed, noErrors:!errors.length });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.focus-timer.open'));
      await page.click('.task[data-taskid="manual_t1"] .task-text');
      await page.waitForSelector('.focus-timer.open', { visible:true });
      await page.evaluate(() => {
        window.__focusSaves = [];
        localStorage.removeItem('last_local_change');
        const original = Date.now;
        const now = original();
        Date.now = () => now + 61000;
        try { document.dispatchEvent(new Event('visibilitychange')); }
        finally { Date.now = original; }
      });
      await page.keyboard.press('Escape');
      const partial = await page.evaluate(() => window.__focusSaves.some(s => s.sessions === 1 && s.minutes === 26 && s.changed));
      await expectAll('partial focus queues sync', { partial, noErrors:!errors.length });
      ok('completed and partial sessions queue Dropbox sync and mark an offline change without another edit');
      await page.close();
    }

    // 3. Task click opens timer UI (.focus-timer.open).
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const r = await page.evaluate(() => ({
        timerOpen: !!document.querySelector('.focus-timer.open'),
      }));
      if (errors.length) await fail('task click opens timer — browser errors', errors);
      await expectAll('task click opens timer', { ...r, noErrors: !errors.length });
      ok('task click opens timer: .focus-timer.open present');
      await page.close();
    }

    // 3b. BUG-098: the header is pinned for the lock and released on exit, and the
    //     chrome around the task recedes while the add bar stays crisp.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      // The CSS opacity recede transition takes 120ms; wait for it to settle
      // before sampling — especially important on headless Linux where frame
      // timing differs from macOS.
      await page.waitForFunction(
        () => parseFloat(getComputedStyle(document.getElementById('sticky-header')).opacity) < 0.2,
        { timeout: 500 }
      );
      const on = await page.evaluate(() => {
        const hdr = document.getElementById('sticky-header');
        const bar = document.getElementById('addTaskBar');
        return {
          bodyLocked:     document.body.classList.contains('focus-locked'),
          bodyFixed:      document.body.style.position === 'fixed',
          headerPinned:   getComputedStyle(hdr).position === 'fixed',
          headerAtTop:    Math.abs(hdr.getBoundingClientRect().top) < 1,
          bodyPadded:     Math.abs(parseFloat(document.body.style.paddingTop) - hdr.getBoundingClientRect().height) < 1,
          headerReceded:  parseFloat(getComputedStyle(hdr).opacity) < 0.2,
          headerBlurred:  getComputedStyle(hdr).filter.includes('blur'),
          headerClickable: getComputedStyle(hdr).pointerEvents !== 'none',
          addBarCrisp:    getComputedStyle(bar).filter === 'none' && parseFloat(getComputedStyle(bar).opacity) === 1,
        };
      });
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => !document.body.classList.contains('focus-locked') && document.body.style.position === '',
        { timeout: 3000 }
      );
      const off = await page.evaluate(() => {
        const hdr = document.getElementById('sticky-header');
        return {
          bodyUnlocked:   !document.body.classList.contains('focus-locked'),
          bodyUnpadded:   document.body.style.paddingTop === '',
          headerSticky:   getComputedStyle(hdr).position === 'sticky',
        };
      });
      await expectAll('BUG-098 header pin + chrome recede', { ...on, ...off, noErrors: !errors.length });
      ok('BUG-098: header pinned, receded and clickable during focus; add bar crisp; everything released on exit');
      await page.close();
    }

    // 3c. Focus starts as an outward row wave, derived from existing motion tokens.
    {
      const { page, errors } = await openPage();
      await page.evaluate(() => {
        const list = document.getElementById('manualList');
        const first = list.querySelector('.task[data-taskid="manual_t1"]');
        ['manual_t2', 'manual_t3'].forEach((id, index) => {
          const row = first.cloneNode(true);
          row.dataset.taskid = id;
          row.querySelector('.task-text').textContent = index ? 'Third task' : 'Second task';
          list.appendChild(row);
        });
        const hidden = first.cloneNode(true);
        hidden.dataset.taskid = 'manual_hidden';
        hidden.style.display = 'none';
        hidden.querySelector('.task-text').textContent = 'Hidden task';
        list.appendChild(hidden);
      });
      await page.click('.task-text');
      const on = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('#manualList .task:not(.focused)')]
          .filter(row => row.getClientRects().length);
        const delays = rows.map(row => parseFloat(row.style.getPropertyValue('--focus-wave-delay')));
        return {
          twoRecedingRows: delays.length === 2,
          nearestStartsFirst: delays[0] === 0 && delays[1] > delays[0],
          farthestUsesFastToken: delays[1] === _motionDuration('--dur-fast'),
          cssUsesWaveDelay: getComputedStyle(rows[1]).transitionDelay.includes((delays[1] / 1000) + 's'),
          hiddenRowIgnored: !document.querySelector('[data-taskid="manual_hidden"]')
            .style.getPropertyValue('--focus-wave-delay'),
        };
      });
      await page.keyboard.press('Escape');
      await new Promise(resolve => setTimeout(resolve, 250));
      const cleared = await page.evaluate(() => ({
        waveCleared: ![...document.querySelectorAll('.task,.habit')]
          .some(row => row.style.getPropertyValue('--focus-wave-delay')),
      }));
      await expectAll('focus outward wave', { ...on, ...cleared, noErrors: !errors.length });
      ok('focus entry: nearby rows recede before farther rows on the existing fast/out easing clock');
      await page.close();
    }

    // 3d. Reduced motion keeps the focus state change immediate and unstaggered.
    {
      const { page, errors } = await openPage();
      const r = await page.evaluate(() => {
        const list = document.getElementById('manualList');
        const first = list.querySelector('.task[data-taskid="manual_t1"]');
        const second = first.cloneNode(true);
        second.dataset.taskid = 'manual_t2';
        second.querySelector('.task-text').textContent = 'Second task';
        list.appendChild(second);
        const original = window.matchMedia;
        window.matchMedia = query => query === '(prefers-reduced-motion: reduce)'
          ? { matches: true, media: query }
          : original.call(window, query);
        first.querySelector('.task-text').click();
        return {
          focusStarted: document.getElementById('main-app').classList.contains('focusing'),
          noWaveDelay: !second.style.getPropertyValue('--focus-wave-delay'),
        };
      });
      await expectAll('focus wave reduced motion', { ...r, noErrors: !errors.length });
      ok('focus entry: reduced motion skips the outward stagger');
      await page.close();
    }

    // 4. Session persisted to localStorage on timer open.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const r = await page.evaluate(() => {
        const raw = localStorage.getItem('today_focus_session');
        if (!raw) return { sessionSaved: false };
        const s = JSON.parse(raw);
        return { sessionSaved: s.taskId === 'manual_t1' && typeof s.rem === 'number' };
      });
      await expectAll('session saved on open', { ...r, noErrors: !errors.length });
      ok('session saved: today_focus_session written with taskId=manual_t1');
      await page.close();
    }

    // 5. Space to pause — #focusPaused gets class 'show'.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      await page.focus('#focusTime');
      await page.keyboard.press('Space');
      // Allow one frame for setPaused to update the DOM
      await page.waitForFunction(
        () => document.getElementById('focusPaused')?.classList.contains('show'),
        { timeout: 2000 }
      );
      const r = await page.evaluate(() => ({
        pausedLabelVisible: document.getElementById('focusPaused')?.classList.contains('show') === true,
      }));
      await expectAll('space to pause', { ...r, noErrors: !errors.length });
      ok('space to pause: #focusPaused gets class "show"');
      await page.close();
    }

    // 6. Escape closes timer and clears today_focus_session.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      await page.keyboard.press('Escape');
      // Wait for CSS open class to be removed (closeUI runs synchronously, RAF schedules DOM cleanup)
      await page.waitForFunction(
        () => !document.querySelector('.focus-timer.open'),
        { timeout: 2000 }
      );
      // Brief wait for deferred 200ms cleanup to settle
      await new Promise(r => setTimeout(r, 300));
      const r = await page.evaluate(() => ({
        timerClosed:    !document.querySelector('.focus-timer.open'),
        sessionCleared: localStorage.getItem('today_focus_session') === null,
      }));
      await expectAll('escape closes timer', { ...r, noErrors: !errors.length });
      ok('escape closes timer: .focus-timer.open gone, today_focus_session cleared');
      await page.close();
    }

    // 7. Copy feedback is session-scoped and cannot leak through exit/re-entry.
    {
      const { page, errors } = await openPage();
      await page.evaluate(() => { window._copyToClipboard = (_text, done) => done(); });
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      await page.click('.task-copy');
      const copied = await page.evaluate(() => {
        const btn = document.querySelector('.task.focused .task-copy');
        return btn?.textContent === 'copied' && btn.classList.contains('copied');
      });
      await page.keyboard.press('Escape');
      const resetOnExit = await page.evaluate(() => {
        const btn = document.querySelector('.task-copy');
        return btn?.textContent === 'copy' && !btn.classList.contains('copied') && !btn._copyFeedbackTimer;
      });
      await page.waitForFunction(() => document.querySelector('.focus-timer').hidden, { timeout: 2000 });
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const cleanOnReentry = await page.evaluate(() => {
        const btn = document.querySelector('.task.focused .task-copy');
        return btn?.textContent === 'copy' && !btn.classList.contains('copied');
      });
      await page.evaluate(() => {
        window._copyToClipboard = (_text, done) => { window.__delayedCopyDone = done; };
      });
      await page.click('.task-copy');
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.__delayedCopyDone?.());
      const delayedCallbackIgnored = await page.evaluate(() => {
        const btn = document.querySelector('.task-copy');
        return btn?.textContent === 'copy' && !btn.classList.contains('copied');
      });
      await expectAll('copy feedback reset', {
        copied, resetOnExit, cleanOnReentry, delayedCallbackIgnored, noErrors: !errors.length,
      });
      ok('copy feedback resets on exit, stays clean on re-entry, and ignores a late clipboard callback');
      await page.close();
    }

    // 8. _focusOnCheck with no active session returns falsy (no-op path).
    {
      const { page, errors } = await openPage();
      const r = await page.evaluate(() => {
        const ret = window._focusOnCheck('nonexistent');
        return { returnedFalsy: !ret };
      });
      await expectAll('_focusOnCheck no-session', { ...r, noErrors: !errors.length });
      ok('_focusOnCheck: returns falsy when no active session');
      await page.close();
    }

    // 9. _focusOnCheck closes active timer.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      await page.evaluate(() => window._focusOnCheck('manual_t1'));
      await page.waitForFunction(
        () => !document.querySelector('.focus-timer.open'),
        { timeout: 2000 }
      );
      const r = await page.evaluate(() => ({
        timerClosed: !document.querySelector('.focus-timer.open'),
      }));
      await expectAll('_focusOnCheck closes active timer', { ...r, noErrors: !errors.length });
      ok('_focusOnCheck: closes timer when session is active');
      await page.close();
    }

    // 10. Session restore — seed today_focus_session, call _tryRestoreFocusSession().
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'today_focus_session': JSON.stringify({
            taskId: 'manual_t1', rem: 1200, savedAt: Date.now(), paused: false
          }),
        },
      });
      await page.evaluate(() => window._tryRestoreFocusSession());
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const r = await page.evaluate(() => ({
        timerRestored: !!document.querySelector('.focus-timer.open'),
      }));
      await expectAll('session restore', { ...r, noErrors: !errors.length });
      ok('session restore: _tryRestoreFocusSession() opens timer from today_focus_session');
      await page.close();
    }

    // 11. _focusReanchor no-throw with no active session.
    {
      const { page, errors } = await openPage();
      const r = await page.evaluate(() => {
        try { window._focusReanchor(); return { noThrow: true }; }
        catch (e) { return { noThrow: false, error: e.message }; }
      });
      await expectAll('_focusReanchor no-throw', { ...r, noErrors: !errors.length });
      ok('_focusReanchor: no-throw with no active session');
      await page.close();
    }

    // 12. Document PiP: real focus state drives the floating document and all
    //     three controls feed back into the main session lifecycle.
    {
      const { page, errors } = await openPage({ pip: true });
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const result = await page.evaluate(async () => {
        const state = window.__focusPipTest;
        state.setVisibility('hidden');
        await new Promise(resolve => setTimeout(resolve, 150));
        const pip = state.windows[0];
        const doc = pip?.document;
        const open = doc?.getElementById('pipOpen');
        const pause = doc?.getElementById('pipPause');
        const rest = doc?.getElementById('pipClose');
        const initial = {
          openedOnce: state.requests.length === 1,
          requestedSize: state.requests[0]?.width === 300 && state.requests[0]?.height === 200,
          taskMirrored: doc?.getElementById('pipTask')?.textContent === 'Write the tests',
          timerMirrored: doc?.getElementById('pipTime')?.textContent === '25:00',
          controlsNamed: open?.getAttribute('aria-label') === 'Open TODAY'
            && pause?.getAttribute('aria-label') === 'Pause focus timer'
            && rest?.getAttribute('aria-label') === 'End focus session',
        };

        open.click();
        pause.click();
        const paused = pause.textContent === 'Resume'
          && pause.getAttribute('aria-pressed') === 'true'
          && document.getElementById('focusPaused')?.classList.contains('show');
        pause.click();
        const resumed = pause.textContent === 'Breathe'
          && pause.getAttribute('aria-pressed') === 'false'
          && !document.getElementById('focusPaused')?.classList.contains('show');

        window._pipSync(0, 1500);
        const complete = doc.getElementById('pipTime')?.textContent === '00:00'
          && pause.textContent === 'Again'
          && doc.querySelector('.pip-bar')?.classList.contains('complete')
          && doc.getElementById('pipFill')?.getAttribute('aria-valuenow') === '1500';
        pause.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        const restarted = doc.getElementById('pipTime')?.textContent === '25:00'
          && pause.textContent === 'Breathe'
          && !doc.querySelector('.pip-bar')?.classList.contains('complete');

        rest.click();
        await new Promise(resolve => setTimeout(resolve, 260));
        return {
          ...initial,
          openReturnsToApp: state.openerFocusCalls === 1,
          paused,
          resumed,
          complete,
          restarted,
          pipClosed: pip.closed === true,
          focusClosed: !document.querySelector('.focus-timer.open'),
          sessionCleared: localStorage.getItem('today_focus_session') === null,
        };
      });
      await expectAll('focus Document PiP lifecycle', { ...result, noErrors: !errors.length });
      ok('focus Document PiP mirrors state and Open/Breathe/Again/Rest preserve the session lifecycle');
      await page.close();
    }

    // 13. Static wiring — file reads only.
    {
      const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
      const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
      const modSrc   = await readFile(join(ROOT, 'assets/focus.js'), 'utf8');
      const splashIdx = indexSrc.indexOf('window._startSplash();');
      const focusIdx  = indexSrc.indexOf('window._startFocus();');
      const initIdx   = indexSrc.indexOf('\ninit();');
      await expectAll('static wiring', {
        scriptTag:           indexSrc.includes('<script src="/assets/focus.js"></script>'),
        startupCall:         focusIdx !== -1,
        // _startFocus() must come after _startSplash() (preserves current load order)
        afterSplash:         splashIdx !== -1 && focusIdx !== -1 && focusIdx > splashIdx,
        // _startFocus() must come after init() — matches current inline IIFE position
        afterInit:           initIdx !== -1 && focusIdx !== -1 && focusIdx > initIdx,
        focusIIFERemoved:    !indexSrc.includes('const TOTAL  = 25 * 60;'),
        tombstonePresent:    indexSrc.includes('moved to assets/focus.js'),
        moduleWrapper:       modSrc.includes('window._startFocus = '),
        exportFocusOnCheck:  modSrc.includes('window._focusOnCheck '),
        exportTryRestore:    modSrc.includes('window._tryRestoreFocusSession '),
        exportReanchor:      modSrc.includes('window._focusReanchor '),
        exportPipSync:       modSrc.includes('window._pipSync '),
        exportPipClose:      modSrc.includes('window._pipClose '),
        precached:           swSrc.includes("'/assets/focus.js'"),
      });
      ok('static wiring: script tag, startup call, IIFE removed, all exports present, precached');
    }

    // 14. _focusExpandTimer overflow correction: when the timer's projected bottom
    //     exceeds (viewport - footer - 8px) during scroll-lock, body.top shifts up.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      // Simulate scroll-lock (focus.js sets this during start()) and place the
      // timer so its bottom overflows the footer boundary.
      const r = await page.evaluate(() => {
        const timerEl = document.querySelector('.focus-timer');
        if (!timerEl) return { overflowCorrected: false, reason: 'no timer' };

        // Install a fake fixed-footer so _focusExpandTimer can measure it.
        let fakeFooter = document.querySelector('.add-task-row');
        let createdFakeFooter = false;
        if (!fakeFooter) {
          fakeFooter = document.createElement('div');
          fakeFooter.className = 'add-task-row';
          Object.assign(fakeFooter.style, { position: 'fixed', bottom: '0', height: '70px', width: '100%' });
          document.body.appendChild(fakeFooter);
          createdFakeFooter = true;
        }

        // Apply scroll-lock styling (mirrors what focus.js does in start()).
        const lockScrollY = 200;
        document.body.style.position = 'fixed';
        document.body.style.top      = -lockScrollY + 'px';
        document.body.style.width    = '100%';

        // Force the timer to appear near the bottom of the viewport so it overflows.
        const vh = window.innerHeight;
        Object.assign(timerEl.style, { position: 'fixed', top: (vh - 60) + 'px' });

        // Stub scrollHeight so _focusExpandTimer sees a tall timer (200px).
        Object.defineProperty(timerEl, 'scrollHeight', { get: () => 200, configurable: true });

        const topBefore = parseInt(document.body.style.top || '0', 10);
        window._focusExpandTimer();
        const topAfter = parseInt(document.body.style.top || '0', 10);

        if (createdFakeFooter) fakeFooter.remove();

        return { overflowCorrected: topAfter < topBefore };
      });
      await expectAll('_focusExpandTimer overflow correction', { ...r, noErrors: !errors.length });
      ok('_focusExpandTimer: shifts body.top up when timer overflows footer boundary');
      await page.close();
    }

    // 18. Recorded history cannot earn an attention cue or enter task help.
    {
      const D = 86400000, now = Date.now();
      const seedFor = task => ({today_manual:JSON.stringify([task]),today_ai_key_claude:'test-key'});
      const signalFor = async task => {
        const {page,errors}=await openPage({extraSeed:seedFor(task)});
        await page.click('.task-text');
        await page.waitForFunction(()=>document.querySelector('.focus-timer.open'),{timeout:3000});
        const lit=await page.$eval('.focus-ai-timer-btn',button=>button.classList.contains('high-signal'));
        return {page,errors,lit};
      };
      const routine=await signalFor({id:'manual_'+(now-9*D),text:'Draft the quarterly letter',focusSessions:4,lastActive:now-3*D});
      await routine.page.close();
      const returned=await signalFor({id:'manual_'+(now-9*D),text:'Await Maya "signed" contract; follow up Oct 30',focusSessions:0,revived:1,returnedFrom:'soon'});
      await returned.page.evaluate(()=>{
        manualTasks.push({id:'manual_other',text:'Unrelated private task marker'});
        appMemory.preferences={...appMemory.preferences,peakHour:new Date().getHours(),dragKeywords:['Maya','Maya']};
        appMemory.patterns.letgoReasons={no_energy:10};
        appMemory.memory={semantic:[{id:'private',text:'Private confirmed inference marker',status:'confirmed'}],procedural:[],episodic:[]};
        window.__taskScopeBody=null;const original=window.fetch;
        window.fetch=async(url,options)=>{
          if(!String(url).includes('ai-assist'))return original(url,options);
          const body=JSON.parse(options.body);
          if(!/^The person (?:has )?explicitly asked/.test(body.systemPrompt||''))return original(url,options);
          window.__taskScopeBody=body;return {ok:true,json:async()=>({content:'The agreed follow-up date is enough for this task.'})};
        };
        document.querySelector('.focus-ai-timer-btn').click();
      });
      await returned.page.waitForFunction(()=>window.__taskScopeBody,{timeout:3000});
      const sent=await returned.page.evaluate(()=>window.__taskScopeBody);
      const message=sent?.messages?.[0]?.content||'';
      await expectAll('task Ask scope and neutral availability',{
        routineQuiet:!routine.lit,returnedQuiet:!returned.lit,
        taskQuoted:message==='Task: '+JSON.stringify('Await Maya "signed" contract; follow up Oct 30'),
        noHistory:!message.includes('recorded')&&!message.includes('Soon')&&!message.includes('days')&&!message.includes('never focused'),
        noOtherTask:!JSON.stringify(sent).includes('Unrelated private task marker'),
        noMemory:!JSON.stringify(sent).includes('Private confirmed inference marker')&&!message.includes('no energy')&&!message.includes('local time')&&!message.includes('usually put off'),
        noReasoningOverride:!Object.hasOwn(sent,'surface')&&!Object.hasOwn(sent,'model'),
        noErrors:!routine.errors.length&&!returned.errors.length,
      });
      ok('task Ask: neutral despite age/sessions/returns; JSON-quoted task only');
      await returned.page.close();
    }

    // Habit requests use the real UI on an isolated origin, with deliberately held replies.
    const habitFixture = async ({ configured = true, hoverHover = true } = {}) => {
      const fixture = await openPage({ hoverHover, extraSeed: {
        today_habits: JSON.stringify([{id:'habit_read',name:'Read',focusSessions:7},{id:'habit_walk',name:'Walk'}]),
        ...(configured ? {today_ai_key_claude:'test-key',today_ai_key_gemini:'test-key'} : {}),
      }});
      await fixture.page.evaluate(() => {
        window.__asks = []; window.__spoken = [];
        window._memoryRecordSpokenLine = (...args) => window.__spoken.push(args);
        const original = window.fetch;
        window.fetch = (url, options) => {
          if (!String(url).includes('ai-assist')) return original(url, options);
          const body=JSON.parse(options.body);
          if(!/^The person (?:has )?explicitly asked/.test(body.systemPrompt||''))return original(url,options);
          return new Promise((resolve,reject) => {
            const request = {body,signal:options.signal,reject};
            request.reply = (data,mode) => resolve({ok:mode!=='http',status:mode==='http'?503:200,json:() => {
              if(mode==='json')return Promise.reject(new SyntaxError('Synthetic malformed JSON'));
              if(mode==='body')return new Promise(resolve => {request.finishBody=resolve});
              return Promise.resolve(data);
            }});
            window.__asks.push(request);
          });
        };
      });
      await fixture.page.click('#habitsBtn');
      await fixture.page.waitForSelector('.habit[data-habit-id="habit_read"]',{visible:true});
      return fixture;
    };
    const startHabit = async (page,id='habit_read') => {
      await page.click(`.habit[data-habit-id="${id}"] .habit-name`);
      await page.waitForFunction(id => document.querySelector('.habit.focused')?.dataset.habitId===id&&document.querySelector('.focus-timer.open'),{timeout:3000},id);
    };
    const ask = async page => {
      const count = await page.evaluate(()=>window.__asks.length);
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      try { await page.waitForFunction(count=>window.__asks.length===count+1,{timeout:3000},count); }
      catch(error){
        console.error('Focus request ledger state:',JSON.stringify(await page.evaluate(count=>({before:count,after:__asks.length,
          focused:document.querySelector('.habit.focused,.task.focused')?.dataset.habitId||document.querySelector('.task.focused')?.dataset.taskid,
          open:!!document.querySelector('.focus-timer.open'),active:!!document.querySelector('.focus-timer.ai-active'),
          configured:Today.use('connections')._aiIsConfigured(),aborted:__asks.filter(r=>r.signal.aborted).length}),count)));
        throw error;
      }
      return count;
    };
    const reply = (page,index,data,mode) => page.evaluate(async ({index,data,mode})=>{
      if(mode==='network')window.__asks[index].reject(new Error('Synthetic offline'));
      else window.__asks[index].reply(data,mode);
      await new Promise(requestAnimationFrame);
    },{index,data,mode});
    // Background writers must not enter the held Focus request ledger.
    {
      const {page,errors}=await habitFixture();await startHabit(page);
      await page.evaluate(()=>{
        const original=window.fetch;
        window.fetch=(url,options)=>{
          const result=original(url,options);
          if(!String(url).includes('ai-assist'))return result;
          const body=JSON.parse(options.body||'{}');
          if(/^The person (?:has )?explicitly asked/.test(body.systemPrompt||'')&&!window.__backgroundInjected){
            window.__backgroundInjected=true;
            window.__unrelatedFocusControl=original(url,{...options,body:JSON.stringify({systemPrompt:'Fictional unrelated background writer',messages:[]})}).then(response=>response.status);
          }
          return result;
        };
      });
      const index=await ask(page);
      await expectAll('Focus request ledger excludes unrelated writers',{
        oneFocus:await page.evaluate(()=>__asks.length===1),
        nativeResponse:(await page.evaluate(()=>__unrelatedFocusControl))===404,noErrors:!errors.length,
      });
      await reply(page,index,{content:'What would make reading more inviting?'});
      await page.waitForFunction(()=>document.querySelector('.focus-ai-timer-btn').textContent==='What would make reading more inviting?');
      ok('habit Focus mock isolates an overlapping unrelated writer without suppressing its request');
      await page.close();
    }
    // Task help may be a question, action or acknowledgement; habits remain questions.
    {
      const {page,errors}=await openPage({extraSeed:{today_ai_key_claude:'test-key'}});
      await page.evaluate(()=>{
        window.__asks=[];window.__spoken=[];
        window._memoryRecordSpokenLine=(...args)=>window.__spoken.push(args);
        const original=window.fetch;
        window.fetch=(url,options)=>{
          if(!String(url).includes('ai-assist'))return original(url,options);
          const body=JSON.parse(options.body);
          if(!/^The person (?:has )?explicitly asked/.test(body.systemPrompt||''))return original(url,options);
          return new Promise((resolve,reject)=>window.__asks.push({body,signal:options.signal,reject,
            reply:(data,mode)=>resolve({ok:mode!=='http',status:mode==='http'?503:200,json:()=>mode==='json'?Promise.reject(new SyntaxError('Malformed fixture')):Promise.resolve(data)})}));
        };
      });
      await page.click('.task-text');
      await page.waitForFunction(()=>document.querySelector('.focus-timer.open'));
      const automaticCalls=await page.evaluate(()=>window.__asks.length);
      const firstFailure=await ask(page);await reply(page,firstFailure,{},'http');
      await page.waitForFunction(()=>document.querySelector('.focus-ai-timer-btn').textContent==='No reply to show. Try again.');
      await expectAll('running task retry status is visible',{
        visibleAndFits:await page.$eval('.focus-ai-timer-btn',button=>{
          const style=getComputedStyle(button),rect=button.getBoundingClientRect();
          const clock=document.getElementById('focusTime').getBoundingClientRect();
          return style.display!=='none'&&style.visibility==='visible'&&Number(style.opacity)>0&&rect.right<clock.left;
        }),
        noAutoRetry:await page.evaluate(()=>window.__asks.length===1&&window.__spoken.length===0),
      });
      await page.focus('#focusTime');await page.keyboard.press('Space');
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('today_focus_session')).paused);
      const before=await page.evaluate(()=>({requests:window.__asks.length,session:localStorage.getItem('today_focus_session')}));
      const valid=['Which input reproduces the export crash?', 'Restore a small folder and check the photos before the full restore.', 'The named follow-up date is enough for this task.'];
      for(const text of valid){
        const index=await ask(page);await reply(page,index,{content:text});
        await page.waitForFunction(text=>document.querySelector('.focus-ai-timer-btn').textContent===text,{},text);
        await expectAll('task help accepted',{accessible:await page.$eval('.focus-ai-timer-btn',(button)=>button.textContent===button.getAttribute('aria-label'))});
        await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      }
      const invalid=[[{content:''}],[{content:'Which file? Why that one?'}],[{content:'Which file? Then restore it.'}],[{content:'Try it!'}],
        [{content:'Check one file.\nThen restore.'}],[{content:Array(20).fill('word').join(' ')}],[{content:42}],[{error:'synthetic'}],
        [{},'http'],[{},'json'],[{},'network']];
      for(const [data,mode]of invalid){const index=await ask(page);await reply(page,index,data,mode);await page.waitForFunction(()=>!document.querySelector('.focus-timer').classList.contains('ai-active'));await expectAll('task request failure is retryable',{statusVisible:await page.$eval('.focus-ai-timer-btn',button=>button.textContent==='No reply to show. Try again.'&&button.getAttribute('aria-label')===button.textContent)});}
      await page.evaluate(()=>{const original=window.setTimeout;window.__restoreTimeout=()=>{window.setTimeout=original};window.setTimeout=(callback,ms,...args)=>{if(ms===25000)window.__expireTaskAsk=callback;return original(callback,ms,...args)};});
      const timedOut=await ask(page);
      await page.evaluate(()=>{window.__expireTaskAsk();window.__restoreTimeout();});
      await reply(page,timedOut,{content:valid[0]});
      await expectAll('task timeout preserves retry status',{
        aborted:await page.evaluate(index=>window.__asks[index].signal.aborted,timedOut),
        lateNotRecorded:await page.evaluate(()=>window.__spoken.length===3),
        retryVisible:await page.$eval('.focus-ai-timer-btn',button=>button.textContent==='No reply to show. Try again.'),
      });
      const old=await ask(page);
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      const fresh=await ask(page);await reply(page,fresh,{content:valid[0]});
      await page.waitForFunction(text=>document.querySelector('.focus-ai-timer-btn').textContent===text,{},valid[0]);
      await reply(page,old,{},'network');
      await expectAll('old task failure cannot paint on new help',{freshKept:await page.$eval('.focus-ai-timer-btn',button=>button.textContent)===valid[0]});
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      const stale=await ask(page);
      await page.evaluate(()=>{const row=document.querySelector('.task.focused');row.querySelector('.task-text').textContent='Changed task';manualTasks[0].text='Changed task';});
      await reply(page,stale,{content:valid[0]});
      await page.waitForFunction(()=>!document.querySelector('.focus-timer').classList.contains('ai-active'));
      const retry=await ask(page);await reply(page,retry,{message:valid[1]});
      await page.waitForFunction(text=>document.querySelector('.focus-ai-timer-btn').textContent===text,{},valid[1]);
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      const afterHelp=await page.evaluate(()=>JSON.parse(localStorage.getItem('today_focus_session')));
      const pending=await ask(page);await page.keyboard.press('Escape');await reply(page,pending,{content:valid[0]});
      await expectAll('task help lifecycle',{
        explicitOnly:automaticCalls===0,
        acceptedOnly:await page.evaluate(()=>window.__spoken.length===5&&window.__spoken.every(([type])=>type==='focus question')),
        abortOnExit:await page.evaluate(index=>window.__asks[index].signal.aborted,pending),
        resetAccessible:await page.$eval('.focus-ai-timer-btn',button=>button.getAttribute('aria-label'))==='Ask for focus help',
        noErrors:!errors.length,
      });
      // The accepted help/failures did not advance or reset a paused timer.
      const sessionBeforeExit=JSON.parse(before.session);
      await expectAll('task help preserves session',{
        owner:afterHelp.taskId===sessionBeforeExit.taskId,
        paused:afterHelp.paused===true&&sessionBeforeExit.paused===true,
        remainingUnchanged:afterHelp.rem===sessionBeforeExit.rem,
      });
      ok('task Ask: question/action/restraint, format rejection, rename/exit fencing and retry; no automatic request');
      await page.close();
    }

    // 15D: same-session repetition context
    {
      const {page,errors}=await openPage({extraSeed:{today_ai_key_claude:'test-key'}});
      await page.evaluate(()=>{
        window.__asks=[];
        const original=window.fetch;
        window.fetch=(url,options)=>{
          if(!String(url).includes('ai-assist'))return original(url,options);
          const body=JSON.parse(options.body);
          if(!/^The person (?:has )?explicitly asked/.test(body.systemPrompt||''))return original(url,options);
          return new Promise((resolve,reject)=>window.__asks.push({body,signal:options.signal,reject,
            reply:(data,mode)=>resolve({ok:mode!=='http',status:mode==='http'?503:200,json:()=>Promise.resolve(data)})}));
        };
      });
      await page.click('.task-text');
      await page.waitForFunction(()=>document.querySelector('.focus-timer.open'));
      const taskMsg='Task: "Write the tests"';

      const i0=await ask(page);
      const body0=await page.evaluate(i=>window.__asks[i].body,i0);
      await expectAll('15D first Ask has no prior suffix',{noPrior:body0.messages[0].content===taskMsg});

      const offer0='Which test case should you start with?';
      await reply(page,i0,{content:offer0});
      await page.waitForFunction(q=>document.querySelector('.focus-ai-timer-btn').textContent===q,{},offer0);
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());

      const i1=await ask(page);
      const body1=await page.evaluate(i=>window.__asks[i].body,i1);
      await expectAll('15D second Ask carries first offer as prior',{
        startsWithTask:body1.messages[0].content.startsWith(taskMsg),
        hasPriorLabel:body1.messages[0].content.includes('Already offered this session:'),
        hasOffer0:body1.messages[0].content.includes(JSON.stringify(offer0)),
      });

      const offer1='What environment do you need set up first?';
      await reply(page,i1,{content:offer1});
      await page.waitForFunction(q=>document.querySelector('.focus-ai-timer-btn').textContent===q,{},offer1);
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());

      const i2=await ask(page);
      const body2=await page.evaluate(i=>window.__asks[i].body,i2);
      await expectAll('15D third Ask carries both priors',{
        hasBoth:body2.messages[0].content.includes(JSON.stringify(offer0))&&body2.messages[0].content.includes(JSON.stringify(offer1)),
      });

      // Invalid reply (two question marks — fails format check) must not be stored
      await reply(page,i2,{content:'Which file? And which branch?'});
      await page.waitForFunction(()=>!document.querySelector('.focus-timer').classList.contains('ai-active'));

      const i3=await ask(page);
      const body3=await page.evaluate(i=>window.__asks[i].body,i3);
      await expectAll('15D invalid reply not added to priors',{
        stillBoth:body3.messages[0].content.includes(JSON.stringify(offer0))&&body3.messages[0].content.includes(JSON.stringify(offer1)),
        noInvalid:!body3.messages[0].content.includes('which branch'),
      });
      await page.keyboard.press('Escape');await reply(page,i3,{content:offer0});
      await expectAll('15D no errors throughout',{noErrors:!errors.length});
      ok('15D: same-session repetition context — prior suffix absent on first Ask, present on subsequent Asks, invalid reply not stored');
      await page.close();
    }

    // Exact-answer feedback: real controls, next explicit request, no persistent votes.
    const feedbackFixture = async (owner = 'task') => {
      const fixture = await habitFixture();
      if (owner === 'habit') await startHabit(fixture.page);
      else {
        await fixture.page.evaluate(() => { manualTasks[0].id = 'manual_1700000000000'; manualTasks[0].text = 'Fix the export crash'; Today.use('connections').renderManual(); document.querySelector('.task-text').click(); });
        await fixture.page.waitForSelector('.focus-timer.open');
      }
      await fixture.page.waitForFunction(()=>document.body.style.transition===''&&document.querySelector('.focus-timer.open'));
      await fixture.page.evaluate(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(resolve))));
      await fixture.page.waitForFunction(()=>{const timer=document.querySelector('.focus-timer.open');return timer&&Math.abs(timer.getBoundingClientRect().height-parseFloat(timer.style.maxHeight))<0.1;});
      return fixture;
    };
    const deliver = async (page,text) => {
      const index = await ask(page); await reply(page,index,{content:text});
      await page.waitForFunction(text => document.querySelector('.focus-ai-timer-btn').textContent === text && !document.querySelector('.focus-ask-feedback').hidden,{},text);
      return index;
    };
    const clickFeedbackControl = async (page,selector) => {
      // Wait for clipping/expansion to expose the actual pointer target, not just its layout box.
      await page.waitForFunction(selector=>{const button=document.querySelector(selector);if(!button||button.hidden)return false;const r=button.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===button;},{},selector);
      await page.click(selector);
    };
    const dismiss = async page => {
      await clickFeedbackControl(page,'.focus-ai-timer-btn');
      await page.waitForFunction(() => !document.querySelector('.focus-timer').classList.contains('ai-active'));
    };
    const openFeedback = async page => {
      await clickFeedbackControl(page,'.focus-ask-feedback');
      await page.waitForFunction(() => !document.querySelector('#focusAskFeedback').hidden);
    };
    const rate = async (page,value) => clickFeedbackControl(page,`#focusAskFeedback [data-choice="${value}"]`);
    const waitForAnswerScroll = async page => {
      try { await page.waitForFunction(()=>document.querySelector('.focus-ai-timer-btn').classList.contains('question-scroll')); }
      catch (error) {
        console.error('Focus overflow state:',JSON.stringify(await page.evaluate(()=>{
          const answer=document.querySelector('.focus-ai-timer-btn'),range=document.createRange();range.selectNodeContents(answer);
          return {viewport:innerWidth,client:answer.clientWidth,scroll:answer.scrollWidth,textWidth:range.getBoundingClientRect().width,
            reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,classes:answer.className,timer:document.querySelector('.focus-timer').className};
        })));
        throw error;
      }
    };
    const geometry = page => page.evaluate(() => {
      const answer = document.querySelector('.focus-ai-timer-btn'), line = document.querySelector('.focus-timer-inner');
      const r = answer.getBoundingClientRect();
      return {text:answer.textContent,x:r.x,y:r.y,width:r.width,height:r.height,lineHeight:line.getBoundingClientRect().height};
    });
    {
      const {page,errors} = await feedbackFixture();
      const first = 'Which exact input reliably reproduces the export crash?';
      await deliver(page,first);
      await page.waitForFunction(()=>document.body.style.transition==='');
      await page.evaluate(()=>document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
      const closed = await geometry(page);
      const stored = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([key]) => key !== 'today_focus_session').sort()));
      await expectAll('feedback starts genuinely hidden',{
        collapsed:await page.$eval('#focusAskFeedback',e=>e.hidden),
        counterInert:await page.$eval('#focusTime',e=>e.inert&&e.getAttribute('aria-hidden')==='true'),
      });
      // Keyboard activation is native and cannot invoke the background Space timer shortcut.
      await page.focus('.focus-ask-feedback'); await page.keyboard.press('Space');
      await page.waitForFunction(()=>!document.querySelector('#focusAskFeedback').hidden);
      const opened = await geometry(page);
      await page.focus('#focusAskFeedback [data-choice="landed"]'); await page.keyboard.press('Space');
      const selected = await geometry(page);
      if(JSON.stringify(closed)!==JSON.stringify(opened)||JSON.stringify(opened)!==JSON.stringify(selected)) await fail('feedback moved the answer',{closed,opened,selected});
      await expectAll('landed does not disturb the answer or add a row',{
        sameAnswer:JSON.stringify(closed)===JSON.stringify(opened)&&JSON.stringify(opened)===JSON.stringify(selected),
        selected:await page.$eval('#focusAskFeedback [data-choice="landed"]',e=>e.getAttribute('aria-pressed')==='true'),
        oneActionRow:await page.$eval('#focusAskFeedback',e=>e.children.length===2&&e.querySelectorAll('.focus-ask-feedback-actions').length===1),
        noGeneration:await page.evaluate(()=>window.__asks.length===1),
        notPaused:await page.evaluate(()=>!JSON.parse(localStorage.getItem('today_focus_session')).paused),
        notPersisted:stored===await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([key])=>key!=='today_focus_session').sort())),
      });
      await page.evaluate(()=>{window.__answerNode=document.querySelector('.focus-ai-timer-btn');window.__ratingNode=document.querySelector('#focusAskFeedback [data-choice="landed"]');Today.use('connections').renderManual();});
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      await expectAll('unchanged list refresh preserves the exact answer and reaction controls',{
        answer:await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn')===window.__answerNode),
        controls:await page.evaluate(()=>document.querySelector('#focusAskFeedback [data-choice="landed"]')===window.__ratingNode&&document.activeElement===window.__ratingNode&&window.__ratingNode.getAttribute('aria-pressed')==='true'),
      });
      await mkdir(join(ROOT,'.context/15d-focus-feedback'),{recursive:true});
      const clip = await page.$eval('.task.focused',e=>{const r=e.getBoundingClientRect();return {x:r.x-12,y:r.y-12,width:r.width+24,height:190};});
      await page.screenshot({path:join(ROOT,'.context/15d-focus-feedback/implemented-desktop.png'),clip});
      // A reply that fitted before resize must become scrollable after narrowing, without another Ask.
      await page.setViewport({width:320,height:800});
      await page.waitForFunction(width=>innerWidth===320&&document.querySelector('.focus-ai-timer-btn').clientWidth<width,{},closed.width);
      await waitForAnswerScroll(page);
      await expectAll('existing answer adapts to a narrower viewport',{
        scrolls:await page.$eval('.focus-ai-timer-btn',e=>e.classList.contains('question-scroll')),
        sameReply:await page.$eval('.focus-ai-timer-btn',e=>e.textContent===e.getAttribute('aria-label')),
        ratingKept:await page.$eval('#focusAskFeedback [data-choice="landed"]',e=>e.getAttribute('aria-pressed')==='true'),
      });
      await page.setViewport({width:1280,height:900});
      await page.waitForFunction(()=>document.querySelector('.focus-ai-timer-btn').clientWidth>400);
      await page.waitForFunction(()=>!document.querySelector('.focus-ai-timer-btn').classList.contains('question-scroll'));
      await expectAll('widening stops unnecessary answer motion',{fits:await page.$eval('.focus-ai-timer-btn',e=>!e.classList.contains('question-scroll'))});

      // Native button overflow reporting must not decide whether its clipped text is readable.
      await page.$eval('.focus-ai-timer-btn',e=>Object.defineProperty(e,'scrollWidth',{configurable:true,get(){return this.clientWidth;}}));
      await page.setViewport({width:320,height:800});await waitForAnswerScroll(page);
      await expectAll('text measurement survives incomplete button overflow reporting',{
        reportedClipped:await page.$eval('.focus-ai-timer-btn',e=>e.scrollWidth===e.clientWidth),
        sameReply:await page.$eval('.focus-ai-timer-btn',e=>e.textContent===e.getAttribute('aria-label')),
        ratingKept:await page.$eval('#focusAskFeedback [data-choice="landed"]',e=>e.getAttribute('aria-pressed')==='true'),
      });
      await page.setViewport({width:1280,height:900});
      await page.waitForFunction(()=>!document.querySelector('.focus-ai-timer-btn').classList.contains('question-scroll'));
      await page.$eval('.focus-ai-timer-btn',e=>{delete e.scrollWidth;});

      await dismiss(page);
      await expectAll('clicking the answer restores the whole timer',{
        feedbackHidden:await page.$eval('.focus-ask-feedback',e=>e.hidden),
        rowsHidden:await page.$eval('#focusAskFeedback',e=>e.hidden),
        counterRestored:await page.$eval('#focusTime',e=>!e.inert&&!e.hasAttribute('aria-hidden')&&getComputedStyle(e).pointerEvents==='auto'),
        askRestored:await page.$eval('.focus-ai-timer-btn',e=>e.getAttribute('aria-label')==='Ask for focus help'),
      });
      const next=await ask(page), nextBody=await page.evaluate(i=>window.__asks[i].body,next);
      await expectAll('positive feedback reaches only the next explicit Ask',{
        positive:nextBody.messages[0].content.includes(JSON.stringify({reply:first,rating:'landed'})),
        factsOnly:nextBody.messages[0].content.startsWith('Task: "Fix the export crash"'),
        wholeReply:nextBody.messages[0].content.includes('Do not infer a reason, writing preference'),
        noHabit:!nextBody.messages[0].content.includes('Habit:'),
      });
      const second='Which export format triggers it?';await reply(page,next,{content:second});
      await page.waitForFunction(q=>document.querySelector('.focus-ai-timer-btn').textContent===q,{},second);
      await openFeedback(page);await rate(page,'missed');
      await page.click('#focusAskFeedback [data-today-click="focus-ask.clear"]');
      await page.click('#focusAskFeedback [data-today-click="focus-ask.undo"]');
      await rate(page,'landed');await page.click('#focusAskFeedback [data-today-click="focus-ask.undo"]');
      await page.evaluate(()=>{window.__oldVote=document.querySelector('#focusAskFeedback [data-choice="landed"]');});
      await dismiss(page);const third=await ask(page);
      const message=await page.evaluate(i=>window.__asks[i].body.messages[0].content,third);
      await expectAll('revision clear and Undo stay tied to exact wording',{
        positiveKept:message.includes(JSON.stringify({reply:first,rating:'landed'})),
        revisedMiss:message.includes(JSON.stringify({reply:second,rating:'not landed'})),
      });
      await page.setViewport({width:320,height:800});
      const long='Which input and export format reproduce the crash, and does it happen before or after the file appears?';
      await reply(page,third,{content:long});await page.waitForFunction(q=>document.querySelector('.focus-ai-timer-btn').textContent===q,{},long);
      await openFeedback(page);
      await page.evaluate(()=>{document.querySelector('.focus-ask-feedback-actions').append(window.__oldVote);window.__oldVote.click();window.__oldVote.remove();});
      await expectAll('detached old-result votes cannot rate the current answer',{
        neutral:await page.$eval('#focusAskFeedback [data-choice="landed"]',e=>e.getAttribute('aria-pressed')==='false'),
      });
      await rate(page,'landed');
      await waitForAnswerScroll(page);
      const narrow=await page.evaluate(()=>{
        const text=document.querySelector('.focus-ai-timer-btn').getBoundingClientRect(),toggle=document.querySelector('.focus-ask-feedback').getBoundingClientRect();
        const buttons=[...document.querySelectorAll('#focusAskFeedback button:not([hidden])')].map(e=>e.getBoundingClientRect());
        return {separate:text.right<=toggle.left,fit:buttons.every(r=>r.left>=0&&r.right<=innerWidth&&r.height>=24),noOverflow:document.body.scrollWidth<=innerWidth};
      });
      await expectAll('320px feedback and long-answer marquee',{...narrow});
      const narrowClip=await page.$eval('.task.focused',e=>{const r=e.getBoundingClientRect();return {x:0,y:r.y-12,width:320,height:220};});
      await page.screenshot({path:join(ROOT,'.context/15d-focus-feedback/implemented-320.png'),clip:narrowClip});
      await page.addScriptTag({path:join(ROOT,'scripts/node_modules/axe-core/axe.min.js')});
      const {violations}=await page.evaluate(async()=>axe.run(document.querySelector('.focus-timer')));
      await expectAll('feedback accessibility',{noViolations:!violations.length,noErrors:!errors.length});
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.task.focused'));
      await page.evaluate(()=>document.querySelector('.task-text').click());
      const restarted=await ask(page);
      await expectAll('leaving focus erases session influence',{fresh:await page.evaluate(i=>window.__asks[i].body.messages[0].content==='Task: "Fix the export crash"',restarted)});
      await page.close();ok('15D exact-answer feedback: keyboard, next-use, Undo/clear, neutral dismissal, isolated layout, 320px and exit reset');
    }
    for (const change of ['edit','delete','sync-delete','day','key']) {
      console.log('  · Focus feedback source case: '+change);
      const {page,errors}=await feedbackFixture();
      await deliver(page,'Which input reproduces the export crash?');await openFeedback(page);await rate(page,'landed');
      await page.evaluate(change=>{
        if(change==='edit'){manualTasks[0].text='Check the photo export';document.querySelector('.task.focused .task-text').textContent=manualTasks[0].text;}
        if(change==='delete'){manualTasks=[];document.querySelector('.task.focused').remove();}
        if(change==='sync-delete')mergeRemoteData({deleted_ids:[{id:'manual_1700000000000',at:new Date().toISOString()}],manual_tasks:[],done_ids:[],checked_ids:[],unchecked_ids:[],soon_tasks:[],past_tasks:[],habits:[]});
        if(change==='day'){window.__oldLocalISO=window._localISO;window._localISO=()=> '2099-01-02';}
        if(change==='key'){localStorage.setItem('today_ai_key_claude','replacement-fictional-key');window.dispatchEvent(new StorageEvent('storage',{key:'today_ai_key_claude'}));}
      },change);
      await page.waitForFunction(()=>{const button=document.querySelector('.focus-ask-feedback'),timer=document.querySelector('.focus-timer');return (!button||button.hidden)&&!timer?.classList.contains('ai-active');});
      if(change==='delete'||change==='sync-delete')await page.waitForFunction(()=>!window._focusUIActive&&!localStorage.getItem('today_focus_session')&&document.querySelector('.focus-timer')?.hidden);
      if(change!=='delete'&&change!=='sync-delete'){
        await page.evaluate(()=>{if(!window._focusUIActive)document.querySelector('.task-text').click();});
        const fresh=await ask(page),message=await page.evaluate(i=>window.__asks[i].body.messages[0].content,fresh);
        await expectAll('invalidated feedback stays absent',{noPrior:!message.includes('Already offered'),noRating:!message.includes('rating')});
      }
      await expectAll('source/config/date withdrawal',{noErrors:!errors.length});await page.close();
    }
    {
      const {page,errors}=await feedbackFixture('habit');
      const text='Which book would you like to read?';await deliver(page,text);await openFeedback(page);await rate(page,'landed');await dismiss(page);
      const next=await ask(page),message=await page.evaluate(i=>window.__asks[i].body.messages[0].content,next);
      await expectAll('habit feedback retains the name-only factual boundary',{
        sameHabit:message.startsWith('Habit: "Read"'),positive:message.includes(JSON.stringify({reply:text,rating:'landed'})),
        noTask:!message.includes('Fix the export crash'),
      });
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.habit.focused')&&!window._focusUIActive);await startHabit(page,'habit_walk');
      const switched=await ask(page);
      await expectAll('habit owners never share feedback',{fresh:await page.evaluate(i=>window.__asks[i].body.messages[0].content==='Habit: "Walk"',switched),noErrors:!errors.length});
      await page.close();ok('15D source withdrawal, rollover, key rotation and task/habit feedback separation');
    }

    {
      const {page,errors}=await feedbackFixture();
      const offers=['Which file reproduces it?', 'Which format triggers it?', 'Which input differs?', 'Which export succeeds?'];
      for(const text of offers){await deliver(page,text);await openFeedback(page);await rate(page,'landed');await rate(page,'landed');await dismiss(page);}
      const next=await ask(page),message=await page.evaluate(i=>window.__asks[i].body.messages[0].content,next);
      await expectAll('bounded neutral history after clears',{
        cap:!message.includes(JSON.stringify(offers[0]))&&offers.slice(1).every(text=>message.includes(JSON.stringify(text))),
        noVotes:!message.includes('Feedback on those exact replies:'),
      });
      await page.evaluate(()=>mergeRemoteData({deleted_ids:[{id:'manual_1700000000000',at:new Date().toISOString()}],manual_tasks:[],done_ids:[],checked_ids:[],unchecked_ids:[],soon_tasks:[],past_tasks:[],habits:[]}));
      await reply(page,next,{content:'Which stale input should never appear?'});
      await page.waitForFunction(()=>!window._focusUIActive&&document.querySelector('.focus-timer')?.hidden);
      await expectAll('late answer after sync deletion cannot restore feedback',{
        hidden:await page.$eval('.focus-ask-feedback',e=>e.hidden),
        noStale:await page.$eval('.focus-ai-timer-btn',e=>!e.textContent.includes('stale input')),
        notRecorded:await page.evaluate(()=>window.__spoken.length===4),
        noErrors:!errors.length,
      });
      await page.close();ok('15D cap, cleared reactions, real sync deletion and late response fencing');
    }

    {
      const {page,errors}=await feedbackFixture();
      await deliver(page,'Which input reproduces the export crash?');await openFeedback(page);await rate(page,'landed');
      await page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+26*60*1000;document.dispatchEvent(new Event('visibilitychange'));Date.now=now;});
      await page.waitForFunction(()=>document.querySelector('.focus-timer').classList.contains('complete'));
      await expectAll('completed focus session erases the answer and feedback',{
        hidden:await page.$eval('.focus-ask-feedback',e=>e.hidden),rowsHidden:await page.$eval('#focusAskFeedback',e=>e.hidden),
        timer:await page.$eval('#focusTime',e=>e.textContent==='again?'&&!e.inert),
      });
      await page.evaluate(()=>document.querySelector('.focus-timer-inner').click());const next=await ask(page);
      const restartedMessage=await page.evaluate(i=>window.__asks[i].body.messages[0].content,next);
      if(restartedMessage!=='Task: "Fix the export crash"') await fail('restarted session has no old vote',{message:restartedMessage,state:await page.evaluate(()=>({timer:document.querySelector('.focus-timer').className,asks:window.__asks.length}))});
      await expectAll('restarted session errors',{noErrors:!errors.length});
      await page.close();ok('15D completion and restart reset the feedback session');
    }

    {
      const {page,errors}=await feedbackFixture();
      const source='work: Review https://example.com/export';
      await page.evaluate(source=>{Object.assign(manualTasks[0],{text:source,url:'https://example.com/export',focusSessions:3});Today.use('connections').renderManual();},source);
      const index=await ask(page);
      await expectAll('Ask uses source text without rendered badges or link labels',{
        exactSource:await page.evaluate(({index,source})=>window.__asks[index].body.messages[0].content==='Task: '+JSON.stringify(source),{index,source}),
      });
      await reply(page,index,{content:'Which export format needs reviewing?'});
      await page.waitForFunction(()=>!document.querySelector('.focus-ask-feedback').hidden);
      await page.evaluate(()=>{document.querySelector('.task.focused .task-text').textContent='A different displayed task';});
      await page.waitForFunction(()=>document.querySelector('.focus-ask-feedback').hidden&&!document.querySelector('.focus-timer').classList.contains('ai-active'));
      await expectAll('display-only source withdrawal still clears Ask',{noErrors:!errors.length});
      await page.close();ok('15D source-only payload excludes metadata; displayed task changes still invalidate feedback');
    }

    const question = 'Which book would you like to spend time with?';

    {
      const {page,errors}=await habitFixture();
      await startHabit(page);
      const before=await page.evaluate(()=>({count:window.__asks.length,session:JSON.parse(localStorage.getItem('today_focus_session'))}));
      await page.waitForFunction(()=>document.querySelector('.focus-timer.open'));
      const index=await ask(page);
      const body=await page.evaluate(index=>window.__asks[index].body,index);
      await expectAll('habit request privacy and trigger',{
        noAutomaticCall:before.count===0,
        oneHabitOnly:JSON.stringify(body.messages)===JSON.stringify([{role:'user',content:'Habit: "Read"'}]),
        noTaskOrMemoryContext:!JSON.stringify(body).includes('Write the tests')&&!body.systemPrompt.includes('What we know about the user'),
        notAlwaysScheduling:body.systemPrompt.includes('do not turn every habit into a scheduling or cue-planning question'),
        openChoiceNotMenu:body.systemPrompt.includes('Invite their own preference or a practical arrangement; do not supply a menu'),
        noAssumedEnthusiasm:body.systemPrompt.includes('Do not assume enthusiasm'),
        notTwentyFiveMinutes:body.systemPrompt.includes('Do not assume the action needs 25 minutes'),
        existingRoute:!!body.provider&&body.apiKey==='test-key',
        timerStillOwned:before.session?.taskId==='habit_read',
      });
      await reply(page,index,{content:question,message:'Wrong truncated preview'});
      await page.waitForFunction(question=>document.querySelector('.focus-ai-timer-btn').textContent===question,{},question);
      const accepted=await page.evaluate(()=>({spoken:window.__spoken,owner:JSON.parse(localStorage.getItem('today_focus_session')).taskId}));
      await expectAll('habit question delivery',{
        contentFirst:accepted.spoken[0]?.[1]===question,
        existingPrivateHistory:accepted.spoken.length===1&&accepted.spoken[0][0]==='focus question',
        timerUnchanged:accepted.owner==='habit_read',noErrors:!errors.length,
        accessibleQuestion:await page.$eval('.focus-ai-timer-btn',button=>button.getAttribute('aria-label'))===question,
      });
      await page.$eval('.focus-ai-timer-btn',async button=>{await Promise.all(button.getAnimations().map(animation=>animation.finished.catch(()=>{})))});
      await page.addScriptTag({path:join(ROOT,'scripts/node_modules/axe-core/axe.min.js')});
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.focus-timer'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>v.id));
      await expectAll('accepted habit question accessibility',{noViolations:violations.length===0});
      await page.click('.focus-ai-timer-btn');
      await page.waitForFunction(()=>!document.querySelector('.focus-timer').classList.contains('ai-active'));
      await expectAll('habit question dismissal label',{askLabelRestored:await page.$eval('.focus-ai-timer-btn',button=>button.getAttribute('aria-label'))==='Ask for focus help'});
      ok('habit Ask: explicit, name-only, no forced cue/25-minute framing; existing timer and spoken-line storage');
      await page.close();
    }

    // Closing/dismissing invalidates even a transport that ignores AbortSignal.
    for(const change of ['dismiss','escape','switch','rename','archive','remove','complete','day','connection','rerender','body']){
      const {page,errors}=await habitFixture();
      await startHabit(page);const index=await ask(page);
      if(change==='dismiss')await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      else if(change==='escape'||change==='switch'){
        await page.keyboard.press('Escape');
        await page.waitForFunction(()=>!document.querySelector('.habit.focused'));
        if(change==='switch'){await startHabit(page,'habit_walk');await ask(page);}
      }else if(change==='body'){
        await reply(page,index,{},'body');
        await page.waitForFunction(index=>!!window.__asks[index].finishBody,{},index);
        await page.keyboard.press('Escape');
        await page.evaluate(async ({index,question})=>{window.__asks[index].finishBody({content:question});await new Promise(requestAnimationFrame)},{index,question});
      }else await page.evaluate(change=>{
        const h=habitsList.find(h=>h.id==='habit_read');
        if(change==='rename')h.name='Read a poem';
        if(change==='archive')h.archived=true;
        if(change==='remove')habitsList=habitsList.filter(h=>h.id!=='habit_read');
        if(change==='complete')habitCompletions.habit_read=[_habitTodayISO()];
        if(change==='day')window._habitTodayISO=()=> '2099-01-01';
        if(change==='connection'){localStorage.removeItem('today_ai_key_claude');localStorage.removeItem('today_ai_key_gemini');}
        if(change==='rerender')Today.use('habits').renderHabits();
      },change);
      if(change!=='body')await reply(page,index,{content:question});
      const result=await page.evaluate(index=>({spoken:window.__spoken.length,text:document.querySelector('.focus-ai-timer-btn')?.textContent||'',aborted:window.__asks[index].signal.aborted,active:!!document.querySelector('.focus-timer')?.classList.contains('ai-active')}),index);
      await expectAll(`habit stale reply: ${change}`,{
        notRecorded:result.spoken===0,
        notDisplayed:!result.text.includes(question),
        staleAborted:result.aborted,
        currentUnaffected:change==='switch'?result.active&&result.text==='thinking…':!result.active,
        noErrors:!errors.length,
      });
      ok(`habit stale reply withheld: ${change}`);
      await page.close();
    }
    ok('habit Ask: late headers/body fenced after dismissal, exit/switch, edit/archive/delete/check, day change or DOM replacement');

    for(const first of ['task','habit']){
      const {page,errors}=await habitFixture();
      const startTask=async()=>{await page.evaluate(()=>document.querySelector('.task-text').click());await page.waitForFunction(()=>document.querySelector('.task.focused')?.dataset.taskid==='manual_t1');};
      if(first==='task')await startTask();else await startHabit(page);
      const stale=await ask(page);await page.keyboard.press('Escape');
      await page.waitForFunction(()=>!document.querySelector('.task.focused,.habit.focused'));
      if(first==='task')await startHabit(page);else await startTask();
      const latest=await ask(page);
      await reply(page,stale,{content:'What stale question should never appear?'});
      await expectAll('task/habit request separation',{latestStillLoading:await page.$eval('.focus-ai-timer-btn',button=>button.textContent)==='thinking…'});
      await reply(page,latest,{content:question});
      await expectAll('task/habit response separation',{
        currentShown:await page.$eval('.focus-ai-timer-btn',button=>button.textContent)===question,
        onlyCurrentRecorded:await page.evaluate(()=>window.__spoken.length===1),noErrors:!errors.length,
      });
      await page.close();
    }
    ok('task and habit pending questions cannot cross into one another');

    {
      const {page,errors}=await habitFixture();await startHabit(page);
      const cases=[
        [{content:''}], [{content:'A statement, not a question.'}], [{content:'Which book? Why that one?'}],
        [{content:'Which book!'}], [{content:'Which book?\nPick one.'}],
        [{content:Array(20).fill('word').join(' ')+'?'}], [{content:42}], [{error:'synthetic'}],
        [{content:question},'http'], [{},'json'], [{},'network'],
      ];
      for(const [data,mode]of cases){const index=await ask(page);await reply(page,index,data,mode);await page.waitForFunction(()=>!document.querySelector('.focus-timer').classList.contains('ai-active'));}
      const accepted=await ask(page);await reply(page,accepted,{message:question});
      await page.waitForFunction(question=>document.querySelector('.focus-ai-timer-btn').textContent===question,{},question);
      await expectAll('habit malformed replies and recovery',{onlyValidRecorded:await page.evaluate(()=>window.__spoken.length===1),noErrors:!errors.length});
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      const old=await ask(page);
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      const current=await ask(page);await reply(page,current,{content:question});
      await reply(page,old,{},'network');
      await expectAll('old rejection cannot reset new answer',{
        stillVisible:await page.$eval('.focus-ai-timer-btn',button=>button.textContent)===question,
        recordedOnce:await page.evaluate(()=>window.__spoken.length===2),
      });
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      await page.evaluate(()=>{const original=window.setTimeout;window.setTimeout=(callback,ms,...args)=>{if(ms===25000)window.__expireAsk=callback;return original(callback,ms,...args)};});
      const timedOut=await ask(page);
      await page.evaluate(()=>window.__expireAsk());
      await reply(page,timedOut,{content:question});
      await expectAll('habit deadline and late reply',{
        aborted:await page.evaluate(index=>window.__asks[index].signal.aborted,timedOut),
        reset:await page.$eval('.focus-timer',timer=>!timer.classList.contains('ai-active')),
        notRecorded:await page.evaluate(()=>window.__spoken.length===2),
      });
      ok('habit Ask: invalid/empty/malformed/network/HTTP replies reset quietly; retry and legacy message response work');
      await page.close();
    }

    for(const options of [{configured:false},{hoverHover:false}]){
      const {page,errors}=await habitFixture(options);
      await page.click('.habit[data-habit-id="habit_read"] .habit-name');
      if(options.hoverHover!==false){await page.waitForFunction(()=>document.querySelector('.focus-timer.open'));await page.evaluate(()=>{const button=document.querySelector('.focus-ai-timer-btn');if(button.checkVisibility())button.click()});}
      await expectAll('habit no AI/mobile boundary',{noCall:await page.evaluate(()=>window.__asks.length===0),noErrors:!errors.length});
      await page.close();
    }
    ok('habit Ask: no configured AI or touch device makes no request');

    console.log('\nFocus tests passed (post-extraction, 29 check groups).');
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
