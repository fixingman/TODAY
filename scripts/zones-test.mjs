// TODAY — Zones (Soon/Past) regression test
//
// Full flow invariant suite: save helpers, render, pullFromSoon, moveToSoon,
// moveToPast, reviveFromPast, _ageSoon, _purgePast, and module wiring.
//
// Run from repo root:
//   node scripts/zones-test.mjs --pre-extraction
//   node scripts/zones-test.mjs

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

const DAY_MS = 24 * 60 * 60 * 1000;

const SOON_RECENT = { id: 'sr1', text: 'recent soon task', zone: 'soon', zoneChangedAt: new Date(Date.now() - DAY_MS).toISOString() };
const SOON_OLD    = { id: 'so2', text: 'old soon task',    zone: 'soon', zoneChangedAt: new Date(Date.now() - 35 * DAY_MS).toISOString() };
const PAST_DONE   = { id: 'pd1', text: 'done past task',   zone: 'past', status: 'done',    zoneChangedAt: new Date(Date.now() - DAY_MS).toISOString() };
const PAST_LETGO  = { id: 'pl2', text: 'let go past task', zone: 'past', status: 'let_go',  zoneChangedAt: new Date(Date.now() - 2 * DAY_MS).toISOString() };
const PAST_AGED   = { id: 'pa3', text: 'aged past task',   zone: 'past', status: 'aged',    zoneChangedAt: new Date(Date.now() - 31 * DAY_MS).toISOString() };
const MANUAL_A    = { id: 'ma1', text: 'manual task alpha', createdAt: new Date(Date.now() - 2 * DAY_MS).toISOString() };
const MANUAL_B    = { id: 'mb2', text: 'manual task beta',  createdAt: new Date(Date.now() - 3 * DAY_MS).toISOString() };

async function openPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(
    (soonSeed, pastSeed, manualSeed) => {
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      localStorage.setItem('today_soon',   JSON.stringify(soonSeed));
      localStorage.setItem('today_past',   JSON.stringify(pastSeed));
      localStorage.setItem('today_manual', JSON.stringify(manualSeed));
    },
    [SOON_RECENT, SOON_OLD],
    [PAST_DONE, PAST_LETGO, PAST_AGED],
    [MANUAL_A, MANUAL_B]
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof _saveSoon === 'function' && document.getElementById('soonSection'),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    dropboxBackup = () => {};
  });
  return { page, errors };
}

try {
  // Save helpers: mutate soonTasks in page, call _saveSoon, verify localStorage.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const extraTask = { id: 'sx9', text: 'save test task', zone: 'soon', zoneChangedAt: new Date().toISOString() };
      soonTasks.push(extraTask);
      _saveSoon();
      const saved = JSON.parse(localStorage.getItem('today_soon') || '[]');
      const hasSx9 = saved.some(t => t.id === 'sx9');

      // _saveManual / _savePast / _saveDone spot check
      manualTasks.push({ id: 'mx9', text: 'save test manual' });
      _saveManual();
      const savedManual = JSON.parse(localStorage.getItem('today_manual') || '[]');
      const hasMx9 = savedManual.some(t => t.id === 'mx9');

      doneIds.add('test_done_id');
      _saveDone();
      const savedDone = JSON.parse(localStorage.getItem('today_done') || '[]');
      const hasDoneId = savedDone.includes('test_done_id');

      return { hasSx9, hasMx9, hasDoneId };
    });
    await expectAll('save helpers', { ...result, noErrors: errors.length === 0 });
    ok('_saveSoon / _saveManual / _saveDone write correctly to localStorage');
    await page.close();
  }

  // renderSoon — non-empty: section visible, correct task count, pullFromSoon buttons.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      renderSoon();
      const section = document.getElementById('soonSection');
      const rows = document.querySelectorAll('#soonList .task');
      const hasPullBtns = [...rows].every(r => r.querySelector('.pull-btn'));
      return {
        sectionVisible: section.style.display !== 'none',
        rowCount: rows.length === 2,
        hasPullBtns,
      };
    });
    await expectAll('renderSoon non-empty', { ...result, noErrors: errors.length === 0 });
    ok('renderSoon shows section with correct task count and pull buttons');
    await page.close();
  }

  // renderSoon — empty: section hidden.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      soonTasks = [];
      renderSoon();
      const section = document.getElementById('soonSection');
      return { sectionHidden: section.style.display === 'none' };
    });
    await expectAll('renderSoon empty', { ...result, noErrors: errors.length === 0 });
    ok('renderSoon hides section when soonTasks is empty');
    await page.close();
  }

  // renderPast — non-empty: section visible, done task has static badge, non-done has revive button.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      renderPast();
      const section = document.getElementById('pastSection');
      const doneCard  = document.querySelector('#pastList .task[data-id="pd1"]');
      const letgoCard = document.querySelector('#pastList .task[data-id="pl2"]');
      const staticBadge = doneCard?.querySelector('.zone-badge:not(.pull-btn)');
      const reviveBtn   = letgoCard?.querySelector('.pull-btn');
      return {
        sectionVisible: section.style.display !== 'none',
        doneHasStaticBadge: !!staticBadge,
        letgoHasReviveBtn: !!reviveBtn,
      };
    });
    await expectAll('renderPast non-empty', { ...result, noErrors: errors.length === 0 });
    ok('renderPast: section visible, done=static badge, non-done=revive button');
    await page.close();
  }

  // pullFromSoon: task moves to manualTasks with zone/returnedFrom/zoneChangedAt set.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const startSoonLen   = soonTasks.length;
      const startManualLen = manualTasks.length;
      Today.use('zones').pullFromSoon('sr1');
      const inSoon   = soonTasks.some(t => t.id === 'sr1');
      const inManual = manualTasks.find(t => t.id === 'sr1');
      const lsSoon   = JSON.parse(localStorage.getItem('today_soon') || '[]');
      return {
        removedFromSoon:    !inSoon && soonTasks.length === startSoonLen - 1,
        addedToManual:      !!inManual,
        zoneToday:          inManual?.zone === 'today',
        returnedFromSoon:   inManual?.returnedFrom === 'soon',
        zoneChangedAtSet:   !!inManual?.zoneChangedAt,
        lsSoonUpdated:      !lsSoon.some(t => t.id === 'sr1'),
      };
    });
    await expectAll('pullFromSoon', { ...result, noErrors: errors.length === 0 });
    ok('pullFromSoon moves task to manualTasks with correct zone/returnedFrom/zoneChangedAt');
    await page.close();
  }

  // moveToSoon: task moves from manualTasks to soonTasks with zone/zoneChangedAt set.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const startManualLen = manualTasks.length;
      const startSoonLen   = soonTasks.length;
      Today.use('zones').moveToSoon('ma1');
      const inManual = manualTasks.some(t => t.id === 'ma1');
      const inSoon   = soonTasks.find(t => t.id === 'ma1');
      return {
        removedFromManual: !inManual && manualTasks.length === startManualLen - 1,
        addedToSoon:       !!inSoon,
        zoneSoon:          inSoon?.zone === 'soon',
        zoneChangedAtSet:  !!inSoon?.zoneChangedAt,
      };
    });
    await expectAll('moveToSoon', { ...result, noErrors: errors.length === 0 });
    ok('moveToSoon moves task to soonTasks with zone:soon and zoneChangedAt set');
    await page.close();
  }

  // moveToPast: task moves from manualTasks to pastTasks with zone/status/zoneChangedAt set.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const startManualLen = manualTasks.length;
      Today.use('zones').moveToPast('mb2');
      const inManual = manualTasks.some(t => t.id === 'mb2');
      const inPast   = pastTasks.find(t => t.id === 'mb2');
      return {
        removedFromManual: !inManual && manualTasks.length === startManualLen - 1,
        addedToPast:       !!inPast,
        zonePast:          inPast?.zone === 'past',
        statusLetGo:       inPast?.status === 'let_go',
        zoneChangedAtSet:  !!inPast?.zoneChangedAt,
      };
    });
    await expectAll('moveToPast', { ...result, noErrors: errors.length === 0 });
    ok('moveToPast moves task to pastTasks with zone:past, status:let_go, zoneChangedAt set');
    await page.close();
  }

  // reviveFromPast: non-done task moves pastTasks → soonTasks; done task is blocked.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const startPastLen = pastTasks.length;
      // Revive the let_go task (non-done)
      Today.use('zones').reviveFromPast('pl2', 'still_relevant');
      const stillInPast  = pastTasks.some(t => t.id === 'pl2');
      const inSoon       = soonTasks.find(t => t.id === 'pl2');
      const revivedCount = inSoon?.revived;
      const reasonSet    = inSoon?.reviveReason === 'still_relevant';
      const zoneRefreshed = !!inSoon?.zoneChangedAt;

      // Done task must be blocked
      const donePastLen = pastTasks.length;
      Today.use('zones').reviveFromPast('pd1');
      const doneStillInPast = pastTasks.some(t => t.id === 'pd1');

      return {
        removedFromPast:   !stillInPast,
        addedToSoon:       !!inSoon,
        zoneSoon:          inSoon?.zone === 'soon',
        revivedIncrement:  revivedCount === 1,
        reasonStored:      reasonSet,
        zoneChangedAtSet:  zoneRefreshed,
        doneBlocked:       doneStillInPast,
      };
    });
    await expectAll('reviveFromPast', { ...result, noErrors: errors.length === 0 });
    ok('reviveFromPast moves non-done to soonTasks with revived/reason; blocks done tasks');
    await page.close();
  }

  // _ageSoon: 35-day-old SOON task moves to pastTasks with status:'aged'; recent stays.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const startSoonLen = soonTasks.length;
      const startPastLen = pastTasks.length;
      _ageSoon();
      const oldStillInSoon = soonTasks.some(t => t.id === 'so2');
      const agedInPast     = pastTasks.find(t => t.id === 'so2');
      const recentStillIn  = soonTasks.some(t => t.id === 'sr1');
      return {
        oldRemovedFromSoon: !oldStillInSoon,
        agedMovedToPast:    !!agedInPast,
        statusAged:         agedInPast?.status === 'aged',
        recentStaysInSoon:  recentStillIn,
      };
    });
    await expectAll('_ageSoon', { ...result, noErrors: errors.length === 0 });
    ok('_ageSoon moves 35-day-old SOON task to PAST with status:aged; recent task stays');
    await page.close();
  }

  // _purgePast: 31-day-old aged task removed + tombstone returned; recent tasks kept.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const startPastLen = pastTasks.length;
      const tombstones = _purgePast();
      const agedStillIn   = pastTasks.some(t => t.id === 'pa3');
      const doneStillIn   = pastTasks.some(t => t.id === 'pd1');
      const letgoStillIn  = pastTasks.some(t => t.id === 'pl2');
      const hasTombstone  = tombstones.some(e => e.id === 'pa3' && typeof e.at === 'string');
      return {
        agedPurged:     !agedStillIn,
        doneKept:       doneStillIn,
        letgoKept:      letgoStillIn,
        tombstoneReturned: hasTombstone,
        tombstoneCount: tombstones.length === 1,
      };
    });
    await expectAll('_purgePast', { ...result, noErrors: errors.length === 0 });
    ok('_purgePast removes 31-day-old aged task, returns tombstone; recent tasks kept');
    await page.close();
  }

  // Static ownership checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline zones baseline wiring', {
        inlineSection:  indexSrc.includes('// ─── Zones: Soon & Past (prototype)'),
        noModuleLoad:   !indexSrc.includes('<script src="assets/zones.js"></script>'),
        noPrecache:     !swSrc.includes("'/assets/zones.js'"),
      });
      ok('inline zones baseline');
    } else {
      const zonesSrc = await readFile(join(ROOT, 'assets/zones.js'), 'utf8');
      const requiredExports = [
        '_saveSoon', '_savePast', '_saveManual', '_saveDone',
        '_ageSoon', '_purgePast', 'renderSoon', 'renderPast',
      ];
      await expectAll('extracted zones module wiring', {
        moduleLoad:        indexSrc.includes('<script src="assets/zones.js"></script>'),
        initializer:       indexSrc.includes('window._startZones();'),
        sectionRemoved:    !indexSrc.includes('// ─── Zones: Soon & Past (prototype)'),
        moduleInitializer: zonesSrc.includes('window._startZones = function()'),
        exports:           requiredExports.every(name => zonesSrc.includes(`window.${name} = ${name};`)),
        api:               zonesSrc.includes("Today.define('zones'"),
        // state vars stay as inline globals in index.html
        soonTasksInline:   indexSrc.includes('let soonTasks'),
        pastTasksInline:   indexSrc.includes('let pastTasks'),
        // functions NOT defined inline anymore
        saveSoonRemoved:   !indexSrc.includes('function _saveSoon()'),
        renderSoonRemoved: !indexSrc.includes('function renderSoon()'),
        precached:         swSrc.includes("'/assets/zones.js'"),
      });
      ok('extracted zones wiring, exports, inline state vars preserved, functions removed, precache');
    }
  }

  console.log(`\nZones tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
