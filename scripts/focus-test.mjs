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
// Run from repo root:  node scripts/focus-test.mjs      (~25s)
// Run it when a diff touches the focus IIFE, trello.js, or the renderers.
// If it ever goes flaky, delete it rather than nurse it.
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

  if (pageErrors.length) await fail('uncaught page errors', pageErrors);
  ok('no uncaught page errors');

  console.log('✓ FOCUS TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
