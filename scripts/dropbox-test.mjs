// TODAY — Dropbox module regression test
//
// Tests: state-helper round-trips, doneTodayCount, setLastLocalChange,
// dropboxAutoSave no-op, dropboxBackup without token, mergeRemoteData task
// merge and renderManual call, module wiring.
//
// Run from repo root:
//   node scripts/dropbox-test.mjs --pre-extraction
//   node scripts/dropbox-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

async function openPage(extraSeed) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(
    ({ extra }) => {
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      localStorage.setItem('today_manual', JSON.stringify([
        { id: 'task_1', text: 'First task' },
        { id: 'task_2', text: 'Second task' },
      ]));
      localStorage.setItem('today_done', JSON.stringify([]));
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v));
      }
    },
    { extra: extraSeed || null }
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof dropboxBackup === 'function' && typeof mergeRemoteData === 'function' && typeof _doneTodayCount === 'function',
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.loadTrelloBoards   = () => {};
    window._aiRenderConfig    = () => {};
    window.renderMeetingNames = () => {};
  });
  return { page, errors };
}

try {
  // 1. _addDeletedId + _getDeletedIds: adds tombstone with correct id.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      _addDeletedId('task_99');
      const deleted = _getDeletedIds();
      return { hasEntry: deleted.some(d => d.id === 'task_99') };
    });
    await expectAll('_addDeletedId + _getDeletedIds', { ...result, noErrors: errors.length === 0 });
    ok('_addDeletedId + _getDeletedIds: tombstone written and read back');
    await page.close();
  }

  // 2. _doneTodayCount: 0 when no checks.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      return { isZero: _doneTodayCount() === 0 };
    });
    await expectAll('_doneTodayCount zero', { ...result, noErrors: errors.length === 0 });
    ok('_doneTodayCount: 0 when today_checked_ids is empty');
    await page.close();
  }

  // 3. _doneTodayCount: counts today's checks.
  {
    const nowISO = new Date().toISOString();
    const { page, errors } = await openPage({
      today_checked_ids: JSON.stringify([{ id: 'task_1', at: nowISO }]),
    });
    const result = await page.evaluate(() => {
      return { isOne: _doneTodayCount() === 1 };
    });
    await expectAll('_doneTodayCount counts checks', { ...result, noErrors: errors.length === 0 });
    ok('_doneTodayCount: returns 1 for one check seeded today');
    await page.close();
  }

  // 4. _setLastLocalChange: writes ISO timestamp to localStorage.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      _setLastLocalChange();
      const val = localStorage.getItem('last_local_change') || '';
      return { hasTimestamp: val.length > 0 && !isNaN(Date.parse(val)) };
    });
    await expectAll('_setLastLocalChange writes timestamp', { ...result, noErrors: errors.length === 0 });
    ok('_setLastLocalChange: writes valid ISO timestamp to last_local_change');
    await page.close();
  }

  // 5. _addCheckedId + _removeCheckedId: round-trip clean.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      _addCheckedId('task_1');
      const afterAdd = _getCheckedIds().some(c => c.id === 'task_1');
      _removeCheckedId('task_1');
      const afterRemove = _getCheckedIds().some(c => c.id === 'task_1');
      return { addedOk: afterAdd, removedOk: !afterRemove };
    });
    await expectAll('_addCheckedId + _removeCheckedId', { ...result, noErrors: errors.length === 0 });
    ok('_addCheckedId + _removeCheckedId: round-trip clean');
    await page.close();
  }

  // 6. _addUncheckedId + _removeUncheckedId: round-trip clean.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      _addUncheckedId('task_2');
      const afterAdd = _getUncheckedIds().some(u => u.id === 'task_2');
      _removeUncheckedId('task_2');
      const afterRemove = _getUncheckedIds().some(u => u.id === 'task_2');
      return { addedOk: afterAdd, removedOk: !afterRemove };
    });
    await expectAll('_addUncheckedId + _removeUncheckedId', { ...result, noErrors: errors.length === 0 });
    ok('_addUncheckedId + _removeUncheckedId: round-trip clean');
    await page.close();
  }

  // 7. dropboxAutoSave: no-op when no token — no backup side effects.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      localStorage.removeItem('dropbox_token');
      const before = localStorage.getItem('last_successful_backup');
      dropboxAutoSave();
      await new Promise(r => setTimeout(r, 1100));
      const after = localStorage.getItem('last_successful_backup');
      return { noBackup: before === after };
    });
    await expectAll('dropboxAutoSave no-op without token', { ...result, noErrors: errors.length === 0 });
    ok('dropboxAutoSave: no-op when dropbox_token absent — last_successful_backup unchanged');
    await page.close();
  }

  // 8. dropboxBackup: returns false without token (silent mode).
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      localStorage.removeItem('dropbox_token');
      const ret = await dropboxBackup(true);
      return { returnedFalse: ret === false };
    });
    await expectAll('dropboxBackup false without token', { ...result, noErrors: errors.length === 0 });
    ok('dropboxBackup(true): returns false when no token');
    await page.close();
  }

  // 9. mergeRemoteData: remote-only task added to manualTasks.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      mergeRemoteData({
        manual_tasks: [{ id: 'remote_1', text: 'Remote task' }],
        done_ids: [],
        deleted_ids: [],
        unchecked_ids: [],
        checked_ids: [],
        soon_tasks: [],
        past_tasks: [],
        habits: [],
      });
      return { hasRemoteTask: manualTasks.some(t => t.id === 'remote_1') };
    });
    await expectAll('mergeRemoteData adds remote task', { ...result, noErrors: errors.length === 0 });
    ok('mergeRemoteData: remote-only task appears in manualTasks after merge');
    await page.close();
  }

  // 10. mergeRemoteData: calls renderManual when tasks change.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      let called = 0;
      const real = window.renderManual;
      window.renderManual = () => { called++; real && real(); };
      mergeRemoteData({
        manual_tasks: [{ id: 'remote_2', text: 'Another remote task' }],
        done_ids: [],
        deleted_ids: [],
        unchecked_ids: [],
        checked_ids: [],
        soon_tasks: [],
        past_tasks: [],
        habits: [],
      });
      window.renderManual = real;
      return { renderCalled: called > 0 };
    });
    await expectAll('mergeRemoteData calls renderManual', { ...result, noErrors: errors.length === 0 });
    ok('mergeRemoteData: calls renderManual when task list changes');
    await page.close();
  }

  // 11. Static wiring checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline dropbox baseline', {
        inlineBackupPresent:  indexSrc.includes('async function dropboxBackup('),
        inlineMergePresent:   indexSrc.includes('function mergeRemoteData('),
        noModuleLoad:         !indexSrc.includes('<script src="assets/dropbox.js"></script>'),
        noPrecache:           !swSrc.includes("'/assets/dropbox.js'"),
      });
      ok('inline dropbox baseline: dropboxBackup/mergeRemoteData present inline, no module tag yet');
    } else {
      const dropboxSrc = await readFile(join(ROOT, 'assets/dropbox.js'), 'utf8');
      const requiredExports = [
        '_setLastLocalChange', '_getTrelloFocus', '_setTrelloFocus',
        '_getTrelloFocusTotal', '_setTrelloFocusTotal',
        '_getTrelloFirstSeen', '_setTrelloFirstSeen',
        '_getTrelloLastActive', '_setTrelloLastActive',
        '_markTrelloActive', '_trelloAgeBasis',
        '_getDeletedIds', '_addDeletedId', '_cleanupDeletedIds', '_cleanupHabitEvents',
        '_getUncheckedIds', '_addUncheckedId', '_removeUncheckedId',
        '_getCheckedIds', '_addCheckedId', '_removeCheckedId',
        '_doneTodayCount',
        'dropboxAutoSave', 'dropboxBackup', 'dropboxRestore', 'dropboxAuth',
        'mergeRemoteData',
      ];
      const startupIdx    = indexSrc.indexOf('window._startDropbox();');
      const connectionsIdx = indexSrc.indexOf('window._startConnections();');
      const initIdx       = indexSrc.indexOf('\ninit();');
      await expectAll('extracted dropbox module wiring', {
        moduleLoad:         indexSrc.includes('<script src="assets/dropbox.js"></script>'),
        beforeTrello:       indexSrc.indexOf("assets/dropbox.js") < indexSrc.indexOf("assets/trello.js"),
        startDropboxFirst:  startupIdx !== -1 && startupIdx < connectionsIdx,
        beforeInit:         startupIdx !== -1 && startupIdx < initIdx,
        sectionRemoved:     !indexSrc.includes('async function dropboxBackup('),
        mergeRemoved:       !indexSrc.includes('function mergeRemoteData('),
        moduleInit:         dropboxSrc.includes('window._startDropbox = function()'),
        allExports:         requiredExports.every(n => dropboxSrc.includes(`window.${n} = ${n};`)),
        precached:          swSrc.includes("'/assets/dropbox.js'"),
      });
      ok('extracted dropbox module: 27 exports correct, load order and init order correct');
    }
  }

  console.log(`\nDropbox tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
