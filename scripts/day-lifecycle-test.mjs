// TODAY — day-lifecycle module regression test
//
// Tests: applyNewDayCleanup (first-open guard, same-day guard, done→PAST graduation,
//        BUG-055 cross-device timestamp, BUG-063 midnight focus snapshot, streak+,
//        streak break, tombstone purge, SOON→PAST aging, delayed backup), static wiring.
//
// Run from repo root:
//   node scripts/day-lifecycle-test.mjs --pre-extraction
//   node scripts/day-lifecycle-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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

const DAY_MS = 24 * 60 * 60 * 1000;
// Matches app's _localISO() — YYYY-MM-DD in local time
const localISO = d => {
  if (!d) d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const TODAY_ISO        = localISO();
const TODAY_DS         = new Date().toDateString();  // _getAppDay() format for stat_last_visit
const YESTERDAY        = new Date(Date.now() - DAY_MS);
const YESTERDAY_ISO    = localISO(YESTERDAY);
const YESTERDAY_DS     = YESTERDAY.toDateString();
const TWODAYS_DS       = new Date(Date.now() - 2 * DAY_MS).toDateString();
const DAYS_8_AGO_ISO   = new Date(Date.now() -  8 * DAY_MS).toISOString();
const DAYS_31_AGO_ISO  = new Date(Date.now() - 31 * DAY_MS).toISOString();
const NOW_ISO          = new Date().toISOString();

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
  if (Object.values(result).some(v => !v)) await fail(label, result);
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

// Seed stat_last_visit=today so checkNewDay() in the 7s sync ticker exits early on page load.
// Each test sets stat_last_visit inside page.evaluate() before calling applyNewDayCleanup(),
// so the JS state vars (manualTasks, doneIds, etc.) are already loaded from the seeded data.
async function openPage({ extraSeed = {} } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.evaluateOnNewDocument(
    ({ todayDs, extra }) => {
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      localStorage.setItem('stat_last_visit', todayDs);
      Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v));
    },
    { todayDs: TODAY_DS, extra: extraSeed }
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof applyNewDayCleanup === 'function' && !!document.getElementById('addTaskBar'),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.dropboxBackup         = () => {};
    window.dropboxAutoSave       = () => {};
    window._haptic               = () => {};
    window.renderManual          = () => {};
    window.loadTrello            = () => {};
    window.updateStats           = () => {};
    window.renderHabits          = () => {};
    window._saveMemory           = () => {};
    window._memoryOnStreakUpdate = () => {};
    window._memoryOnDaySummary   = () => {};
  });
  return { page, errors };
}

try {
  if (PRE_EXTRACTION) {
    const src = await readFile(join(ROOT, 'index.html'), 'utf8');
    await expectAll('pre-extraction baseline', {
      applyNewDayCleanupInline: src.includes('function applyNewDayCleanup()'),
      noModule: !existsSync(join(ROOT, 'assets/day-lifecycle.js')),
    });
    ok('pre-extraction: applyNewDayCleanup inline; assets/day-lifecycle.js absent');
    console.log('\nDay-lifecycle tests passed (pre-extraction baseline, 1 check).');
  } else {
    // 1. First-ever open — records today, returns without moving tasks.
    {
      const { page, errors } = await openPage({
        extraSeed: { 'today_manual': JSON.stringify([{ id: 'manual_a', text: 'Task A' }]) },
      });
      const r = await page.evaluate(({ todayDs }) => {
        localStorage.removeItem('stat_last_visit');
        applyNewDayCleanup();
        return {
          lastVisitRecorded: localStorage.getItem('stat_last_visit') === todayDs,
          taskUnmoved: JSON.parse(localStorage.getItem('today_manual') || '[]').length === 1,
        };
      }, { todayDs: TODAY_DS });
      await expectAll('first-ever open', { ...r, noErrors: !errors.length });
      ok('first-ever open: stat_last_visit recorded, no tasks moved');
      await page.close();
    }

    // 2. Same-day guard — no-op when stat_last_visit = today.
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'today_manual': JSON.stringify([{ id: 'manual_b', text: 'Task B' }]),
          'today_done':   JSON.stringify(['manual_b']),
        },
      });
      const r = await page.evaluate(() => {
        applyNewDayCleanup(); // stat_last_visit = today → early return
        return {
          taskStillInManual: JSON.parse(localStorage.getItem('today_manual') || '[]')
            .some(t => t.id === 'manual_b'),
        };
      });
      await expectAll('same-day guard', { ...r, noErrors: !errors.length });
      ok('same-day guard: no-op when stat_last_visit = today');
      await page.close();
    }

    // 3. Done tasks graduate to PAST.
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'today_manual': JSON.stringify([{ id: 'manual_c', text: 'Task C' }]),
          'today_done':   JSON.stringify(['manual_c']),
        },
      });
      const r = await page.evaluate(({ yesterdayDs }) => {
        localStorage.setItem('stat_last_visit', yesterdayDs);
        applyNewDayCleanup();
        const manual = JSON.parse(localStorage.getItem('today_manual') || '[]');
        const past   = JSON.parse(localStorage.getItem('today_past')   || '[]');
        return {
          removedFromManual: !manual.some(t => t.id === 'manual_c'),
          addedToPast:        past.some(t => t.id === 'manual_c' && t.status === 'done'),
        };
      }, { yesterdayDs: YESTERDAY_DS });
      await expectAll('done→PAST graduation', { ...r, noErrors: !errors.length });
      ok('done tasks graduate to PAST with status=done');
      await page.close();
    }

    // 4. BUG-055: post-midnight checked task stays in TODAY.
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'today_manual':      JSON.stringify([{ id: 'manual_d', text: 'Task D' }]),
          'today_done':        JSON.stringify(['manual_d']),
          'today_checked_ids': JSON.stringify([{ id: 'manual_d', at: NOW_ISO }]),
        },
      });
      const r = await page.evaluate(({ yesterdayDs }) => {
        localStorage.setItem('stat_last_visit', yesterdayDs);
        applyNewDayCleanup();
        const manual = JSON.parse(localStorage.getItem('today_manual') || '[]');
        const done   = JSON.parse(localStorage.getItem('today_done')   || '[]');
        return {
          staysInManual: manual.some(t => t.id === 'manual_d'),
          staysInDone:   done.includes('manual_d'),
        };
      }, { yesterdayDs: YESTERDAY_DS });
      await expectAll('BUG-055 cross-device timestamp guard', { ...r, noErrors: !errors.length });
      ok('BUG-055: post-midnight checked task stays in TODAY, not moved to PAST');
      await page.close();
    }

    // 5. BUG-063: midnight focus snapshot used for history, not live counter.
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'stat_focus_mins_date':               TODAY_DS,
          'stat_focus_mins_yesterday_snapshot': '45',
          'stat_focus_mins_today':              '90',
        },
      });
      const r = await page.evaluate(({ yesterdayDs, yesterdayIso }) => {
        localStorage.setItem('stat_last_visit', yesterdayDs);
        applyNewDayCleanup();
        const history = JSON.parse(localStorage.getItem('today_daily_history') || '[]');
        const entry   = history.find(e => e.date === yesterdayIso);
        return {
          hasEntry:        !!entry,
          usesSnapshot:    entry?.focusMins === 45,
          notLiveValue:    entry?.focusMins !== 90,
          snapshotCleared: !localStorage.getItem('stat_focus_mins_yesterday_snapshot'),
        };
      }, { yesterdayDs: YESTERDAY_DS, yesterdayIso: YESTERDAY_ISO });
      await expectAll('BUG-063 midnight focus snapshot', { ...r, noErrors: !errors.length });
      ok('BUG-063: midnight focus snapshot (45) used for history, not live counter (90)');
      await page.close();
    }

    // 6. Streak increment — consecutive-day visit.
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'stat_streak':      '3',
          'stat_streak_date': YESTERDAY_ISO,
        },
      });
      const r = await page.evaluate(({ yesterdayDs, todayIso }) => {
        localStorage.setItem('stat_last_visit', yesterdayDs);
        applyNewDayCleanup();
        return {
          streak4:         localStorage.getItem('stat_streak') === '4',
          streakDateToday: localStorage.getItem('stat_streak_date') === todayIso,
        };
      }, { yesterdayDs: YESTERDAY_DS, todayIso: TODAY_ISO });
      await expectAll('streak increment', { ...r, noErrors: !errors.length });
      ok('streak increment: 3 → 4 on consecutive day');
      await page.close();
    }

    // 7. Streak break — non-consecutive days resets to 1.
    {
      const { page, errors } = await openPage({ extraSeed: { 'stat_streak': '7' } });
      const r = await page.evaluate(({ twodaysDs }) => {
        localStorage.setItem('stat_last_visit', twodaysDs);
        applyNewDayCleanup();
        return { streakReset: localStorage.getItem('stat_streak') === '1' };
      }, { twodaysDs: TWODAYS_DS });
      await expectAll('streak break', { ...r, noErrors: !errors.length });
      ok('streak break: 7 → 1 when last visit was 2 days ago');
      await page.close();
    }

    // 8. Tombstone purge — done task >7 days old removed from PAST and tombstoned.
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'today_past': JSON.stringify([{
            id: 'past_old', text: 'Old done', status: 'done', zone: 'past',
            zoneChangedAt: DAYS_8_AGO_ISO,
          }]),
        },
      });
      const r = await page.evaluate(({ yesterdayDs }) => {
        localStorage.setItem('stat_last_visit', yesterdayDs);
        applyNewDayCleanup();
        const past    = JSON.parse(localStorage.getItem('today_past')        || '[]');
        const deleted = JSON.parse(localStorage.getItem('today_deleted_ids') || '[]');
        return {
          removedFromPast: !past.some(t => t.id === 'past_old'),
          tombstoned:       deleted.some(d => d.id === 'past_old'),
        };
      }, { yesterdayDs: YESTERDAY_DS });
      await expectAll('tombstone purge', { ...r, noErrors: !errors.length });
      ok('tombstone purge: done task >7 days old removed from PAST and tombstoned');
      await page.close();
    }

    // 9. SOON → PAST aging — task >30 days old in SOON moves to PAST with status=aged.
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'today_soon': JSON.stringify([{
            id: 'soon_old', text: 'Old soon', zone: 'soon', zoneChangedAt: DAYS_31_AGO_ISO,
          }]),
        },
      });
      const r = await page.evaluate(({ yesterdayDs }) => {
        localStorage.setItem('stat_last_visit', yesterdayDs);
        applyNewDayCleanup();
        const soon = JSON.parse(localStorage.getItem('today_soon') || '[]');
        const past = JSON.parse(localStorage.getItem('today_past') || '[]');
        return {
          removedFromSoon: !soon.some(t => t.id === 'soon_old'),
          addedToPast:      past.some(t => t.id === 'soon_old' && t.status === 'aged'),
        };
      }, { yesterdayDs: YESTERDAY_DS });
      await expectAll('SOON→PAST aging', { ...r, noErrors: !errors.length });
      ok('SOON→PAST aging: task >30 days old moves to PAST with status=aged');
      await page.close();
    }

    // 10. Delayed backup — dropboxBackup(true) called once after 3s when token present.
    {
      const { page, errors } = await openPage({
        extraSeed: { 'dropbox_token': 'test-token' },
      });
      const count = await page.evaluate(({ yesterdayDs }) => {
        let n = 0;
        window.dropboxBackup = silent => { if (silent) n++; };
        localStorage.setItem('stat_last_visit', yesterdayDs);
        applyNewDayCleanup();
        return new Promise(resolve => setTimeout(() => resolve(n), 3200));
      }, { yesterdayDs: YESTERDAY_DS });
      await expectAll('delayed backup', { calledOnce: count === 1, noErrors: !errors.length });
      ok('delayed backup: dropboxBackup(true) called once after 3s');
      await page.close();
    }

    // 11. Static wiring — file reads only: script tag, startup order, export, precached.
    {
      const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
      const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
      const modSrc   = await readFile(join(ROOT, 'assets/day-lifecycle.js'), 'utf8');
      const dlIdx    = indexSrc.indexOf('window._startDayLifecycle();');
      const nudgeIdx = indexSrc.indexOf('window._startNudge();');
      await expectAll('static wiring', {
        scriptTag:              indexSrc.includes('<script src="/assets/day-lifecycle.js"></script>'),
        startupCall:            dlIdx !== -1,
        beforeNudge:            dlIdx !== -1 && nudgeIdx !== -1 && dlIdx < nudgeIdx,
        fnRemovedFromIndex:     !indexSrc.includes('function applyNewDayCleanup()'),
        moduleInit:             modSrc.includes('window._startDayLifecycle = '),
        exportApplyCleanup:     modSrc.includes('window.applyNewDayCleanup = applyNewDayCleanup;'),
        precached:              swSrc.includes("'/assets/day-lifecycle.js'"),
        pruneRemovedFromIdx:    !indexSrc.includes('function _pruneTrelloMaps()'),
        pruneInModule:          modSrc.includes('function _pruneTrelloMaps()'),
        textureInModule:        modSrc.includes('function _applyTimeTexture()'),
        textureExported:        modSrc.includes('window._applyTimeTexture') && modSrc.includes('= _applyTimeTexture;'),
        textureRemovedFromIdx:  !indexSrc.includes('function _applyTimeTexture()'),
      });
      ok('static wiring: script tag, startup call, exports, functions removed from index.html, precached, _pruneTrelloMaps and _applyTimeTexture in module');
    }

    // 12. BUG-097: the header date follows the day boundary with a crossfade, no reload.
    {
      const { page, errors } = await openPage();
      const r = await page.evaluate(async () => {
        const el = document.getElementById('dateTag');
        const expected = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
        const initial = el.textContent === expected;
        el.textContent = 'STALE DAY';
        window._dateTagRefresh(true);
        const oldTextDuringExit = el.textContent === 'STALE DAY';   // swap waits for the fade-out
        const animating = typeof el.getAnimations === 'function' && el.getAnimations().length === 1;
        await new Promise(r => setTimeout(r, 700));                 // --dur-mid + --dur-slow, with slack
        const after = el.textContent === expected;
        const animsCleared = typeof el.getAnimations === 'function' && el.getAnimations().length === 0;
        window._dateTagRefresh(true);                              // same day → no-op, no animation
        const noopNoAnim = typeof el.getAnimations === 'function' && el.getAnimations().length === 0;
        return { initial, oldTextDuringExit, animating, after, animsCleared, noopNoAnim };
      });
      const dbxSrc = await readFile(join(ROOT, 'assets/dropbox.js'), 'utf8');
      await expectAll('date tag at midnight', {
        ...r,
        wiredIntoCheckNewDay: dbxSrc.includes('window._dateTagRefresh(true)'),
        noErrors: !errors.length,
      });
      ok('BUG-097: header date crossfades to the new day at the boundary, no reload, no-op on same day');
      await page.close();
    }

    // 13. New-day settle (v2.83.0): graduating rows collapse before the re-render,
    //     and a changed age bucket eases over 1.2s instead of snapping.
    {
      const D = 86400000;
      const oldId  = 'manual_' + (Date.now() - 8 * D);   // renders as age bucket "old"
      const doneId = 'manual_' + (Date.now() - 2 * D);
      const { page, errors } = await openPage({
        extraSeed: {
          'today_manual': JSON.stringify([{ id: oldId, text: 'Old task' }, { id: doneId, text: 'Done task' }]),
          'today_done':   JSON.stringify([doneId]),
        },
      });
      const r = await page.evaluate(async ({ yesterdayDs, oldId, doneId }) => {
        const q = id => document.querySelector(`#manualList .task[data-taskid="${id}"]`);
        const snap = window._newDaySnapshot();
        const snapHasBoth = !!(snap[oldId] && snap[doneId]);
        // Pretend the old row was "young" yesterday so the settle has a bucket change to ease.
        snap[oldId].bucket = 'young';
        localStorage.setItem('stat_last_visit', yesterdayDs);
        applyNewDayCleanup();                                   // doneId graduates to PAST
        const doneEl = q(doneId);
        let renderedAt = 0; const t0 = performance.now();
        window._newDayCollapse(snap, () => {
          renderedAt = performance.now() - t0;
          Today.use('connections').renderManual();
          window._newDaySettle(snap);
        });
        const collapsing = doneEl.getAnimations().length === 1 && doneEl.style.overflow === 'hidden';
        await new Promise(r => setTimeout(r, 120));
        const midCollapseH = doneEl.getBoundingClientRect().height;   // shrinking, not yet 0
        await new Promise(r => setTimeout(r, 400));
        const renderedAfterCollapse = renderedAt >= 250 && renderedAt < 600;
        const doneGone = !q(doneId);
        const oldEl = q(oldId);
        const easing = !!oldEl && oldEl.dataset.ageBucket === 'old' && oldEl.getAnimations().length === 1;
        const midOpacity = oldEl ? parseFloat(getComputedStyle(oldEl).opacity) : -1;
        await new Promise(r => setTimeout(r, 1300));
        const settled = oldEl && oldEl.getAnimations().length === 0 && parseFloat(getComputedStyle(oldEl).opacity) === 0.35;
        return {
          snapHasBoth, collapsing,
          collapseInFlight: midCollapseH > 0 && midCollapseH < 40,
          renderedAfterCollapse, doneGone, easing,
          easeInFlight: midOpacity > 0.36 && midOpacity < 0.75,
          settled,
        };
      }, { yesterdayDs: YESTERDAY_DS, oldId, doneId });
      await expectAll('new-day settle', { ...r, noErrors: !errors.length });
      ok('new-day settle: graduating row collapses over --dur-slow, then the re-render; changed age bucket eases over 1.2s to its stylesheet value');
      await page.close();
    }

    console.log('\nDay-lifecycle tests passed (post-extraction, 13 tests).');
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
