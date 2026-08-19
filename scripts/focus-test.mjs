// TODAY — focus mode module regression test
//
// Tests: mobile guard, desktop exports, task click opens timer, session persist,
//        space-to-pause, escape-to-close, _focusOnCheck (no-session + active-session),
//        session restore, _focusReanchor no-throw, static wiring.
//
// Run from repo root:
//   node scripts/focus-test.mjs --pre-extraction
//   node scripts/focus-test.mjs

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

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

// openPage — emulates a desktop (hover:hover) or mobile (no hover) environment.
// Seeds localStorage with a single manual task so the task list renders.
async function openPage({ hoverHover = true, extraSeed = {} } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.evaluateOnNewDocument(({ seed, hoverHover }) => {
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
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_manual', JSON.stringify([
      { id: 'manual_t1', text: 'Write the tests', addedAt: '' }
    ]));
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, { seed: extraSeed, hoverHover });
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

    // 12. Static wiring — file reads only.
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

    console.log('\nFocus tests passed (post-extraction, 12 tests).');
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
