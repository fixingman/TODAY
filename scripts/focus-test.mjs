// TODAY — focus lifecycle invariant test
//
// Focus mode is 16 of 59 recorded bugs (27%) — the densest area in the app. It holds
// in-memory state (taskStates, uiTaskId), persisted state (today_focus_session), DOM
// state (timer parenting, .focused/.focusing) and a 200ms deferred teardown, across
// five closeUI call sites and a restore path invoked from two renderers.
//
// ── The whole logic of this file ─────────────────────────────────────────────
// Focus mode has exactly TWO legal states:
//
//   OFF  no .focused task · no .focusing on app · no persisted session
//        · timer parked in <body>
//   ON   exactly ONE .focused task · timer anchored directly under that task
//        · persisted session points at that task · .focusing on app
//
// Anything else is a bug. Every focus bug on record is one of these two being
// violated — BUG-065 was OFF-but-with-a-persisted-session, BUG-013/025 was
// ON-but-with-a-detached-timer, BUG-044 was OFF-but-with-a-live-timer.
//
// So rather than scripting one assertion per known bug, we define the two states
// once and re-check them after EVERY operation. That catches bugs we have not had
// yet, which a list of past-bug scenarios cannot.
//
// Section 1 walks the operation matrix (every way in and out of focus).
// Section 2 re-checks after a reload, because persisted state is where BUG-065 hid.
// Section 3 covers focus-minute accounting — arithmetic, not a state invariant,
//           so it is deliberately kept separate rather than bent into the model.
// Section 4 covers cross-device sync: a value adopted from another device must arrive
//           stamped as today's and survive the cleanup that runs after the restore.
//           mergeRemoteData() takes a plain object, so no Dropbox or network needed.
//
// Run from repo root:  node scripts/focus-test.mjs      (~40s)
// Run when a diff touches the focus IIFE, trello.js, or the renderers.
// Silent on success; prints the offending state only on failure.
// If it ever goes flaky, delete it rather than nurse it.
//
// Teeth, verified by reverting each real fix independently — all four produce exit 1:
//   BUG-065 clear-session-on-every-close · BUG-065 _restoreAttempted latch
//   BUG-065 focusGen teardown guard      · BUG-063 day-boundary guard
//   BUG-066 merge stamps stat_focus_mins_date
//
// Not reachable headless: PiP close (a fifth exit path). Not covered: .complete
// bleed (BUG-022/028) and frozen 00:00 on re-open (BUG-027) — both need taskStates
// internals that are not on window. Those stay human checks in Test-matrix.md.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

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
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
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
  const boot = () => page.waitForFunction(() => {
    const b = document.getElementById('addTaskBar');
    return b && getComputedStyle(b).opacity === '1';
  }, { timeout: 15000 });

  // ── The invariant ─────────────────────────────────────────────────────────
  // Reads all four state layers and reduces them to: 'off', a taskId, or a list of
  // violations. Anything that is neither cleanly off nor cleanly on IS the bug.
  const readState = () => page.evaluate(() => {
    const timer  = document.querySelector('.focus-timer');
    const prev   = timer && timer.previousElementSibling;
    const raw = {
      uiActive:   !!window._focusUIActive,
      focusing:   !!document.querySelector('.app')?.classList.contains('focusing'),
      focusedIds: [...document.querySelectorAll('.task.focused')].map(e => e.dataset.taskid),
      timerUnder: prev?.dataset?.taskid ?? (timer?.parentElement === document.body ? '<body>' : '?'),
      saved:      JSON.parse(localStorage.getItem('today_focus_session') || 'null')?.taskId || null,
    };
    const bad = [];
    if (!raw.uiActive && raw.focusedIds.length === 0) {
      // Expect a clean OFF
      if (raw.saved)                    bad.push('OFF but a session is persisted: ' + raw.saved);
      if (raw.focusing)                 bad.push('OFF but app still has .focusing');
      if (raw.timerUnder !== '<body>')  bad.push('OFF but timer still anchored to ' + raw.timerUnder);
      return { state: bad.length ? 'INVALID' : 'off', bad, raw };
    }
    // Expect a clean ON, owned by exactly one task
    const owner = raw.focusedIds[0];
    if (raw.focusedIds.length !== 1) bad.push('ON but ' + raw.focusedIds.length + ' tasks carry .focused');
    if (!raw.uiActive)               bad.push('ON but _focusUIActive is false');
    if (!raw.focusing)               bad.push('ON but app lacks .focusing');
    if (raw.timerUnder !== owner)    bad.push('ON but timer is under ' + raw.timerUnder + ', not ' + owner);
    if (raw.saved !== owner)         bad.push('ON but persisted session points at ' + raw.saved + ', not ' + owner);
    return { state: bad.length ? 'INVALID' : owner, bad, raw };
  });

  // expect: 'off' | a taskId
  const expectState = async (label, expect) => {
    const s = await readState();
    if (s.state === 'INVALID')
      await fail(`${label}: focus is in an illegal state — ${s.bad.join('; ')}`, s.raw);
    if (s.state !== expect)
      await fail(`${label}: expected ${expect === 'off' ? 'OFF' : 'ON(' + expect + ')'}, got ` +
                 `${s.state === 'off' ? 'OFF' : 'ON(' + s.state + ')'}`, s.raw);
  };

  // Real DOM clicks — focus sets body{position:fixed}, which shifts layout and makes
  // coordinate clicks land on empty space (they hit the click-outside branch and read
  // as "switching is broken" when it is not).
  const clickTask   = (id) => page.evaluate((i) => (
    document.querySelector(`.task[data-taskid="${CSS.escape(i)}"] .task-text`) ||
    document.querySelector(`.task[data-taskid="${CSS.escape(i)}"]`)).click(), id);
  const clickCheck  = (id) => page.evaluate((i) =>
    document.querySelector(`.task[data-taskid="${CSS.escape(i)}"] .task-check`).click(), id);
  const clickOutside = () => page.evaluate(() => document.querySelector('.app').click());
  const render       = () => page.evaluate(() => renderManual());

  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await boot();
  for (const t of ['focus test alpha', 'focus test beta']) {
    await page.click('#newTask'); await page.type('#newTask', t);
    await page.keyboard.press('Enter'); await settle(300);
  }
  const [A, B] = await page.$$eval('.task', els => els.map(e => e.dataset.taskid));
  if (!A || !B) await fail('could not create two tasks');

  // ── 1. Operation matrix — every way in and out of focus ───────────────────
  // Each row: what we do, what state must hold afterwards. Adding a new way in or
  // out of focus is one line here, and it is checked against the full invariant.
  // A render tick is interleaved after every exit because that is what triggered
  // BUG-065 (renderManual/renderTrello call the restore path).
  const settleTeardown = 450;   // past closeUI's 200ms deferred teardown
  const ops = [
    ['open A',                      () => clickTask(A),   A],
    ['escape',                      () => page.keyboard.press('Escape'), 'off'],
    ['render after escape',         render,               'off'],
    ['re-open A',                   () => clickTask(A),   A],
    ['click outside',               clickOutside,         'off'],
    ['render after click-outside',  render,               'off'],
    ['open A again',                () => clickTask(A),   A],
    ['switch A→B',                  () => clickTask(B),   B],
    ['render during live session',  render,               B],
    ['switch back B→A',             () => clickTask(A),   A],
    ['check A off mid-session',     () => clickCheck(A),  'off'],
    ['render after check-off',      render,               'off'],
  ];
  for (const [label, act, expect] of ops) {
    await act();
    await settle(settleTeardown);
    await expectState(label, expect);
  }
  ok(`all ${ops.length} operations hold the invariant (4 exit paths, switch, render)`);

  // Rapid switching inside the 200ms teardown window — the teardown must not tear
  // down the session that replaced it.
  await page.evaluate((id) => document.querySelector(
    `.task[data-taskid="${CSS.escape(id)}"] .task-check`).click(), A); // un-check A
  await settle(400);
  await clickTask(A); await settle(40);
  await clickTask(B); await settle(40);
  await clickTask(A); await settle(600);
  await expectState('rapid A→B→A', A);
  await page.keyboard.press('Escape'); await settle(settleTeardown);
  ok('rapid switching inside the teardown window holds the invariant');

  // ── 2. The invariant must survive a reload ────────────────────────────────
  // Persisted state is where BUG-065 hid: the DOM looked clean, localStorage did not.
  await page.reload({ waitUntil: 'domcontentloaded' }); await boot(); await settle(600);
  await expectState('after reload following a clean exit', 'off');
  await render(); await settle(400);
  await expectState('render after reload', 'off');
  ok('a clean exit stays clean across reload');

  // Restore is a COLD-START mechanism, not a per-render one. Inject a session while
  // the page is live and already OFF: a render must ignore it. Only a reload may act
  // on it (asserted next). This is what the _restoreAttempted latch exists for — the
  // second line of defence if anything ever writes the key while a page is running.
  await page.evaluate((id) => localStorage.setItem('today_focus_session',
    JSON.stringify({ taskId: id, rem: 900, savedAt: Date.now(), paused: false })), A);
  await render(); await settle(400);
  // Narrow assertion on purpose: injecting the key deliberately creates a state the
  // full invariant calls illegal (OFF with a session persisted), so only the question
  // "did a render OPEN focus?" applies here.
  const injected = await readState();
  if (injected.raw.uiActive || injected.raw.focusedIds.length)
    await fail('a render opened focus from a persisted session — restore must be ' +
               'cold-start only (BUG-065)', injected.raw);
  await page.evaluate(() => localStorage.removeItem('today_focus_session'));
  ok('a render never resurrects focus — only a reload may');

  // Cold-start restore — the v2.43.0 feature itself. Guards against a future fix
  // over-correcting and killing restore altogether.
  await page.evaluate((id) => localStorage.setItem('today_focus_session',
    JSON.stringify({ taskId: id, rem: 900, savedAt: Date.now(), paused: false })), A);
  await page.reload({ waitUntil: 'domcontentloaded' }); await boot(); await settle(700);
  await expectState('cold-start restore', A);
  await page.keyboard.press('Escape'); await settle(settleTeardown);
  ok('cold start restores a persisted session');

  // A session whose task is now done must be discarded, not restored.
  await clickCheck(A); await settle(400);
  await page.evaluate((id) => localStorage.setItem('today_focus_session',
    JSON.stringify({ taskId: id, rem: 1, savedAt: Date.now() - 60000, paused: false })), A);
  await page.reload({ waitUntil: 'domcontentloaded' }); await boot(); await settle(700);
  await expectState('restore targeting an already-done task', 'off');
  ok('session for an already-done task is discarded');

  // ── 3. Focus-minute accounting ────────────────────────────────────────────
  // Arithmetic, not a state invariant — kept separate rather than bent into the model.
  const mins = () => page.evaluate(() =>
    parseInt(localStorage.getItem('stat_focus_mins_today') || '0'));

  const before = await mins();
  await page.evaluate((id) => localStorage.setItem('today_focus_session',
    JSON.stringify({ taskId: id, rem: 1, savedAt: Date.now() - 60000, paused: false })), B);
  await page.reload({ waitUntil: 'domcontentloaded' }); await boot(); await settle(700);
  const after = await mins();
  if (after !== before + 25)
    await fail('a session that finished while backgrounded did not record 25 minutes',
               { before, after });
  await expectState('after silent background completion', 'off');
  ok('background auto-complete records 25 minutes silently');

  // BUG-063 — a session completing just after midnight must not absorb yesterday.
  await page.evaluate((id) => {
    localStorage.setItem('stat_focus_mins_today', '40');
    localStorage.setItem('stat_focus_mins_date', new Date(Date.now() - 864e5).toDateString());
    localStorage.removeItem('stat_focus_mins_yesterday_snapshot');
    localStorage.setItem('today_focus_session', JSON.stringify(
      { taskId: id, rem: 1, savedAt: Date.now() - 60000, paused: false }));
  }, B);
  await page.reload({ waitUntil: 'domcontentloaded' }); await boot(); await settle(700);
  const boundary = await page.evaluate(() => ({
    today: localStorage.getItem('stat_focus_mins_today'),
    date:  localStorage.getItem('stat_focus_mins_date'),
    snapshot: localStorage.getItem('stat_focus_mins_yesterday_snapshot'),
    expectDate: new Date().toDateString(),
  }));
  if (boundary.today !== '25')
    await fail("post-midnight session absorbed yesterday's minutes (BUG-063)", boundary);
  if (boundary.snapshot !== '40')
    await fail("yesterday's minutes were not snapshotted before reset (BUG-063)", boundary);
  if (boundary.date !== boundary.expectDate)
    await fail('focus-minutes date guard did not roll to today (BUG-063)', boundary);
  ok('post-midnight completion preserves yesterday (BUG-063)');

  // ── 4. Cross-device sync ──────────────────────────────────────────────────
  // A different axis: everything above is single-device. mergeRemoteData() takes a
  // plain object, so another device can be simulated with no Dropbox and no network.
  //
  // Invariant: a value adopted from another device must arrive STAMPED as today's,
  // and survive applyNewDayCleanup — which by design runs AFTER the restore. Merging
  // a value without its date guard is what made desktop's minutes read 0 on mobile
  // (BUG-066): cleanup saw a stale date, banked them as yesterday's and zeroed today.
  const syncCase = ({ localMins, localDate, remoteMins, remoteDate, runCleanup }) =>
    page.evaluate((o) => {
      const today = new Date().toDateString();
      const yest  = new Date(Date.now() - 864e5).toDateString();
      const d = (k) => k === 'today' ? today : yest;
      localStorage.setItem('stat_focus_mins_today', String(o.localMins));
      localStorage.setItem('stat_focus_mins_date',  d(o.localDate));
      localStorage.setItem('stat_last_visit',       o.runCleanup ? yest : today);
      localStorage.setItem('today_daily_history',   '[]');
      localStorage.removeItem('stat_focus_mins_yesterday_snapshot');
      mergeRemoteData({ version: '5.4', manual_tasks: [], done_ids: [], deleted_ids: [],
        checked_ids: [], unchecked_ids: [], habits: [], habit_completions: {},
        soon_tasks: [], past_tasks: [], stat_streak: '1', stat_streak_date: '',
        stat_focus_mins_today: String(o.remoteMins), stat_focus_mins_date: d(o.remoteDate) });
      if (o.runCleanup) applyNewDayCleanup();
      const hist = JSON.parse(localStorage.getItem('today_daily_history') || '[]');
      return { mins: parseInt(localStorage.getItem('stat_focus_mins_today') || '0'),
               date: localStorage.getItem('stat_focus_mins_date'),
               yesterday: hist.length ? hist[0].focusMins : null,
               today: new Date().toDateString() };
    }, { localMins, localDate, remoteMins, remoteDate, runCleanup });

  // Desktop earned 50 today; mobile opens later the same day (its first open).
  let r = await syncCase({ localMins: 0, localDate: 'yesterday',
                           remoteMins: 50, remoteDate: 'today', runCleanup: true });
  if (r.mins !== 50)
    await fail("another device's focus minutes were wiped by the cleanup that runs " +
               'after restore (BUG-066)', r);
  if (r.date !== r.today)
    await fail('merged focus minutes were not stamped with today (BUG-066)', r);
  ok("another device's focus minutes survive the post-restore cleanup");

  // Same, but this device still holds unbanked minutes from yesterday — stamping
  // today's date must not cost yesterday its history entry.
  r = await syncCase({ localMins: 40, localDate: 'yesterday',
                       remoteMins: 50, remoteDate: 'today', runCleanup: true });
  if (r.mins !== 50)      await fail('merged minutes lost with unbanked local minutes present', r);
  if (r.yesterday !== 40) await fail("yesterday's unbanked minutes lost from history (BUG-066)", r);
  ok('stamping today does not cost yesterday its history');

  // Local ahead of remote — max must still win, no clobber.
  r = await syncCase({ localMins: 60, localDate: 'today',
                       remoteMins: 50, remoteDate: 'today', runCleanup: false });
  if (r.mins !== 60) await fail('a lower remote value clobbered a higher local one', r);
  ok('local minutes are not clobbered by a lower remote value');

  // BUG-024 — remote holding YESTERDAY's total must never restore as today's.
  r = await syncCase({ localMins: 0, localDate: 'today',
                       remoteMins: 45, remoteDate: 'yesterday', runCleanup: false });
  if (r.mins !== 0) await fail("remote's yesterday total restored as today's (BUG-024)", r);
  ok("remote's yesterday total never restores as today (BUG-024)");

  if (pageErrors.length) await fail('uncaught page errors', pageErrors);
  ok('no uncaught page errors');

  console.log('✓ FOCUS TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
