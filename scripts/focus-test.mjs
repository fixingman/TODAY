// TODAY — focus lifecycle regression test
// Focus mode is 16 of 59 recorded bugs (27%) — by far the densest area. It carries
// in-memory state (taskStates, uiTaskId), persisted state (today_focus_session), DOM
// state (timerEl parenting, .focused/.focusing) and a 200ms deferred teardown, across
// five closeUI call sites and a restore path invoked from two renderers. That mix is
// what keeps producing the same bug shapes.
//
// Every scenario below is a bug that actually happened. Silent on success (one line
// each); dumps full state only on failure, which is when you want the detail.
//
// Exit-path coverage matters: BUG-065's root cause was that EVERY way out of focus
// leaked the persisted session. Escape, click-outside, task switch and check-off are
// each tested; PiP close is not reachable headless.
//
// Run from repo root:  node scripts/focus-test.mjs      (~40s)
// Run it when a diff touches the focus IIFE, trello.js, or the renderers.
// If it ever goes flaky, delete it rather than nurse it.
//
// Teeth, verified by reverting real fixes: BUG-065's primary fix (clearing the session
// on every close) -> exit 1; BUG-063's day-boundary guard -> exit 1. Reverting ONLY the
// _restoreAttempted latch does NOT fail — it is defence-in-depth behind the primary
// fix, so it has no independent coverage. Worth knowing before trusting a green run.
//
// NOT covered (needs taskStates internals that aren't on window): .complete bleeding
// into the next session (BUG-022/028) and re-opening a completed task at a frozen
// 00:00 (BUG-027). Those stay in memory/Test-matrix.md as human checks.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('✗ puppeteer-core not installed — run: cd scripts && npm install');
  process.exit(1);
}

const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.png':'image/png','.woff2':'font/woff2','.css':'text/css' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try {
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const URL_BASE = `http://localhost:${server.address().port}`;

const ok = (m) => console.log('  ✓ ' + m);
let browser;
const fail = async (m, detail) => {
  console.error('✗ FAIL — ' + m);
  if (detail) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};

browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  const settle = (ms) => new Promise(r => setTimeout(r, ms));
  const boot = async () => {
    await page.waitForFunction(() => {
      const b = document.getElementById('addTaskBar');
      return b && getComputedStyle(b).opacity === '1';
    }, { timeout: 15000 });
  };

  // Probe the three state layers at once — in-memory flag, DOM, localStorage.
  const probe = () => page.evaluate(() => {
    const timer = document.querySelector('.focus-timer');
    const prev  = timer && timer.previousElementSibling;
    return {
      uiActive:  !!window._focusUIActive,
      focusing:  !!document.querySelector('.app')?.classList.contains('focusing'),
      focusedIds: [...document.querySelectorAll('.task.focused')].map(e => e.dataset.taskid),
      timerUnder: prev?.dataset?.taskid ?? (timer?.parentElement === document.body ? '<body>' : null),
      saved: JSON.parse(localStorage.getItem('today_focus_session') || 'null')?.taskId || null,
    };
  });

  // Real DOM click — focus mode sets body{position:fixed}, which shifts layout and
  // makes coordinate-based clicks land on empty space (they hit the click-outside
  // branch and read as "switching is broken" when it isn't).
  const clickTask = (id) => page.evaluate((i) => {
    (document.querySelector(`.task[data-taskid="${CSS.escape(i)}"] .task-text`) ||
     document.querySelector(`.task[data-taskid="${CSS.escape(i)}"]`)).click();
  }, id);

  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await boot();
  for (const t of ['focus test alpha', 'focus test beta']) {
    await page.click('#newTask'); await page.type('#newTask', t);
    await page.keyboard.press('Enter'); await settle(300);
  }
  const [A, B] = await page.$$eval('.task', els => els.map(e => e.dataset.taskid));
  if (!A || !B) await fail('could not create two tasks');

  // ── 1. Cold-start restore still works (the v2.43.0 feature itself) ─────────
  // Guards against a BUG-065-style fix over-correcting and killing restore.
  await page.evaluate((id) => localStorage.setItem('today_focus_session',
    JSON.stringify({ taskId: id, rem: 900, savedAt: Date.now(), paused: false })), A);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await boot(); await settle(600);
  let s = await probe();
  if (!s.uiActive || s.focusedIds[0] !== A) await fail('cold start did not restore a persisted session', s);
  ok('cold start restores a persisted session');

  // ── 2. Escape clears the session; no phantom re-open (BUG-065) ─────────────
  await page.keyboard.press('Escape'); await settle(400);
  s = await probe();
  if (s.saved !== null) await fail('escape left a session in localStorage', s);
  await page.evaluate(() => renderManual()); await settle(400);
  s = await probe();
  if (s.uiActive || s.focusedIds.length) await fail('focus re-opened itself after escape (BUG-065)', s);
  ok('escape clears the session — no phantom re-open');

  // ── 3. Switch A→B keeps the timer anchored past the 200ms teardown (BUG-065)
  await clickTask(A); await settle(500);
  await clickTask(B); await settle(450);   // past closeUI's deferred teardown
  s = await probe();
  if (s.timerUnder !== B) await fail('timer not anchored under the new task after switch (BUG-065)', s);
  if (!s.focusing)        await fail('app lost .focusing after switch teardown (BUG-065)', s);
  if (s.saved !== B)      await fail('persisted session does not point at the new task', s);
  ok('task switch keeps the timer anchored to the new task');

  // ── 4. Rapid A→B→A inside the teardown window (BUG-065) ───────────────────
  await clickTask(A); await settle(40);
  await clickTask(B); await settle(40);
  await clickTask(A); await settle(500);
  s = await probe();
  if (s.focusedIds.length !== 1 || s.focusedIds[0] !== A)
    await fail('rapid A→B→A did not settle on one focused task (BUG-065)', s);
  if (s.timerUnder !== A) await fail('timer not anchored after rapid switching (BUG-065)', s);
  ok('rapid A→B→A settles on a single task');

  // ── 5. A render tick must not disturb a live session (BUG-059 / BUG-065) ───
  const before = await probe();
  await page.evaluate(() => renderManual()); await settle(400);
  const after = await probe();
  if (after.uiActive !== before.uiActive || after.timerUnder !== before.timerUnder ||
      after.focusedIds.join() !== before.focusedIds.join())
    await fail('render tick disturbed a live focus session', { before, after });
  ok('render during a live session leaves it alone');

  // ── 6. Click-outside is a second exit path — it must clear too (BUG-065) ───
  // BUG-065's root cause was that EVERY exit passed doResetState=false. Testing only
  // Escape would leave the other paths free to regress the same way.
  s = await probe();
  if (!s.uiActive) { await clickTask(A); await settle(500); }
  await page.evaluate(() => document.querySelector('.app').click()); await settle(450);
  s = await probe();
  if (s.saved !== null)   await fail('click-outside left a session in localStorage (BUG-065)', s);
  if (s.uiActive)         await fail('click-outside did not close focus', s);
  await page.evaluate(() => renderManual()); await settle(400);
  s = await probe();
  if (s.uiActive) await fail('focus re-opened itself after click-outside (BUG-065)', s);
  ok('click-outside clears the session — no phantom re-open');

  // ── 7. Checking the task off mid-session closes cleanly (_focusOnCheck) ────
  // The one close path that always passed doResetState=true — assert it still ends
  // the session rather than leaving a zombie behind (BUG-044 shape).
  await clickTask(A); await settle(500);
  await page.evaluate((id) => document.querySelector(
    `.task[data-taskid="${CSS.escape(id)}"] .task-check`).click(), A);
  await settle(600);
  s = await probe();
  if (s.uiActive)       await fail('checking the task off left focus mode open', s);
  if (s.saved !== null) await fail('checking the task off left a persisted session', s);
  ok('checking the task off mid-session closes cleanly');

  // ── 7b. A session whose task is now done must be discarded, not restored ──
  // Explicit branch in _tryRestoreFocusSession. Task A was checked off just above.
  const minsBeforeDone = await page.evaluate(() =>
    parseInt(localStorage.getItem('stat_focus_mins_today') || '0'));
  await page.evaluate((id) => localStorage.setItem('today_focus_session',
    JSON.stringify({ taskId: id, rem: 1, savedAt: Date.now() - 60000, paused: false })), A);
  await page.reload({ waitUntil: 'domcontentloaded' }); await boot(); await settle(700);
  s = await probe();
  const minsAfterDone = await page.evaluate(() =>
    parseInt(localStorage.getItem('stat_focus_mins_today') || '0'));
  if (s.saved !== null) await fail('stale session for a done task was not discarded', s);
  if (s.uiActive)       await fail('focus re-opened on a task that is already done', s);
  if (minsAfterDone !== minsBeforeDone)
    await fail('a done task recorded focus minutes on restore',
               { minsBeforeDone, minsAfterDone });
  ok('session for an already-done task is discarded, not restored');

  // ── 8. Background auto-complete records the session (v2.43.0) ──────────────
  // A session that finished while iOS had the PWA killed: restore records it silently,
  // with no UI. Nothing else covers _recordFocusComplete.
  const beforeMins = await page.evaluate(() =>
    parseInt(localStorage.getItem('stat_focus_mins_today') || '0'));
  await page.evaluate((id) => {
    localStorage.setItem('today_focus_session', JSON.stringify(
      { taskId: id, rem: 1, savedAt: Date.now() - 60000, paused: false }));
  }, B);
  await page.reload({ waitUntil: 'domcontentloaded' }); await boot(); await settle(700);
  s = await probe();
  const afterMins = await page.evaluate(() =>
    parseInt(localStorage.getItem('stat_focus_mins_today') || '0'));
  if (afterMins !== beforeMins + 25)
    await fail('background auto-complete did not record 25 focus minutes',
               { beforeMins, afterMins });
  if (s.uiActive)       await fail('background auto-complete opened a UI (should be silent)', s);
  if (s.saved !== null) await fail('background auto-complete left the session key behind', s);
  ok('background auto-complete records silently');

  // ── 9. Post-midnight completion does not eat yesterday's minutes (BUG-063) ─
  // Confirmed fixed on device 2026-07-31; nothing guarded it until now.
  await page.evaluate((id) => {
    localStorage.setItem('stat_focus_mins_today', '40');
    localStorage.setItem('stat_focus_mins_date', new Date(Date.now() - 864e5).toDateString());
    localStorage.removeItem('stat_focus_mins_yesterday_snapshot');
    localStorage.setItem('today_focus_session', JSON.stringify(
      { taskId: id, rem: 1, savedAt: Date.now() - 60000, paused: false }));
  }, B);   // B, not A — A is checked off by now and would be discarded
  await page.reload({ waitUntil: 'domcontentloaded' }); await boot(); await settle(700);
  const boundary = await page.evaluate(() => ({
    today:    localStorage.getItem('stat_focus_mins_today'),
    date:     localStorage.getItem('stat_focus_mins_date'),
    snapshot: localStorage.getItem('stat_focus_mins_yesterday_snapshot'),
    expectDate: new Date().toDateString(),
  }));
  if (boundary.today !== '25')
    await fail('post-midnight session did not start today fresh at 25 (BUG-063)', boundary);
  if (boundary.snapshot !== '40')
    await fail("yesterday's 40 minutes were not snapshotted before reset (BUG-063)", boundary);
  if (boundary.date !== boundary.expectDate)
    await fail('focus-minutes date guard not rolled to today (BUG-063)', boundary);
  ok('post-midnight completion preserves yesterday (BUG-063)');

  if (pageErrors.length) await fail('uncaught page errors', pageErrors);
  ok('no uncaught page errors');

  console.log('✓ FOCUS TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
