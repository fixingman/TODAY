// TODAY — Connections panel regression test
//
// Flow: toggleConfig open/close, _applyOfflinePanel offline/online,
// renderConnections renders, _renderConnectionsPrivacy no-creds/with-creds,
// _endConnectionsPrivacyVisit hides privacy, _getDueStr returns time/empty,
// renderManual renders task rows, module wiring.
//
// Run from repo root:
//   node scripts/connections-test.mjs --pre-extraction
//   node scripts/connections-test.mjs

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
    () => typeof renderConnections === 'function' && typeof renderManual === 'function' && !!$.configPanel,
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.dropboxAutoSave    = () => {};
    window.dropboxBackup      = () => {};
    window.loadTrelloBoards   = () => {};
    window._aiRenderConfig    = () => {};
    window.renderMeetingNames = () => {};
  });
  return { page, errors };
}

try {
  // 1. toggleConfig: opens configPanel.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      toggleConfig();
      return { panelOpen: !!($.configPanel && $.configPanel.classList.contains('open')) };
    });
    await expectAll('toggleConfig opens panel', { ...result, noErrors: errors.length === 0 });
    ok('toggleConfig: configPanel gains "open" class');
    await page.close();
  }

  // 2. toggleConfig: second call closes panel.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      toggleConfig();
      toggleConfig();
      return { panelClosed: !$.configPanel.classList.contains('open') };
    });
    await expectAll('toggleConfig closes panel', { ...result, noErrors: errors.length === 0 });
    ok('toggleConfig: second call removes "open" class');
    await page.close();
  }

  // 3. _applyOfflinePanel: offline — offlineBanner gains 'visible' class.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Object.defineProperty(Object.getPrototypeOf(navigator), 'onLine',
        { get: () => false, configurable: true });
      _applyOfflinePanel();
      const banner = document.getElementById('offlineBanner');
      return { bannerVisible: !!(banner && banner.classList.contains('visible')) };
    });
    await expectAll('_applyOfflinePanel offline', { ...result, noErrors: errors.length === 0 });
    ok('_applyOfflinePanel: offline — offlineBanner gains "visible" class');
    await page.close();
  }

  // 4. _applyOfflinePanel: online — offlineBanner does not have 'visible' class.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Object.defineProperty(Object.getPrototypeOf(navigator), 'onLine',
        { get: () => true, configurable: true });
      _applyOfflinePanel();
      const banner = document.getElementById('offlineBanner');
      return { bannerHidden: !(banner && banner.classList.contains('visible')) };
    });
    await expectAll('_applyOfflinePanel online', { ...result, noErrors: errors.length === 0 });
    ok('_applyOfflinePanel: online — offlineBanner does not have "visible" class');
    await page.close();
  }

  // 5. renderConnections: container has content after toggleConfig opens panel.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      toggleConfig(); // opens panel, calls renderConnections() internally
      const container = document.getElementById('connectionsContainer');
      return { hasContent: !!(container && container.innerHTML.trim().length > 0) };
    });
    await expectAll('renderConnections renders', { ...result, noErrors: errors.length === 0 });
    ok('renderConnections: connectionsContainer has non-empty content after panel opens');
    await page.close();
  }

  // 6. _renderConnectionsPrivacy: no credentials — note visible when panel opens for first time.
  //    _beginConnectionsPrivacyVisit is private, called by toggleConfig on open.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      toggleConfig(); // opens → _beginConnectionsPrivacyVisit() → no creds → note visible
      const note = document.getElementById('connectionsPrivacyNote');
      return { noteVisible: !!(note && note.style.display === 'block') };
    });
    await expectAll('_renderConnectionsPrivacy no credentials', { ...result, noErrors: errors.length === 0 });
    ok('_renderConnectionsPrivacy: note visible on first visit with no credentials');
    await page.close();
  }

  // 7. _renderConnectionsPrivacy: with AI key — note stays hidden when panel opens.
  {
    const { page, errors } = await openPage({ today_ai_key_claude: 'stub' });
    const result = await page.evaluate(() => {
      toggleConfig(); // opens → _beginConnectionsPrivacyVisit() → has creds → note hidden
      const note = document.getElementById('connectionsPrivacyNote');
      return { noteHidden: !(note && note.style.display === 'block') };
    });
    await expectAll('_renderConnectionsPrivacy with credentials', { ...result, noErrors: errors.length === 0 });
    ok('_renderConnectionsPrivacy: note hidden when credentials exist');
    await page.close();
  }

  // 8. _endConnectionsPrivacyVisit: closing panel hides the privacy note.
  //    toggleConfig-close calls _endConnectionsPrivacyVisit internally.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      toggleConfig(); // open → no creds → note visible
      const note = document.getElementById('connectionsPrivacyNote');
      const wasVisible = !!(note && note.style.display === 'block');
      toggleConfig(); // close → _endConnectionsPrivacyVisit() → note hidden
      const isHidden = !(note && note.style.display === 'block');
      return { wasVisible, isHidden };
    });
    await expectAll('_endConnectionsPrivacyVisit hides privacy', { ...result, noErrors: errors.length === 0 });
    ok('_endConnectionsPrivacyVisit: note visible after open, hidden after close');
    await page.close();
  }

  // 9. _getDueStr: returns time string for today task; empty string when no due.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const todayResult = _getDueStr({ due: new Date().toISOString() });
      const emptyResult = _getDueStr({});
      return {
        todayNonEmpty: todayResult.length > 0,
        emptyIsEmpty:  emptyResult === '',
      };
    });
    await expectAll('_getDueStr today/empty', { ...result, noErrors: errors.length === 0 });
    ok('_getDueStr: returns time string for today task, empty for no-due task');
    await page.close();
  }

  // 10. renderManual: renders 2 task rows from seeded today_manual.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      renderManual();
      const list = document.getElementById('manualList');
      const count = list ? list.querySelectorAll('.task').length : 0;
      return { twoTasks: count === 2 };
    });
    await expectAll('renderManual task rows', { ...result, noErrors: errors.length === 0 });
    ok('renderManual: renders 2 task rows from seeded today_manual');
    await page.close();
  }

  // 11. Static wiring checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline connections baseline', {
        inlineFnPresent: indexSrc.includes('function renderConnections()'),
        noModuleLoad:    !indexSrc.includes('<script src="assets/connections.js"></script>'),
        noPrecache:      !swSrc.includes("'/assets/connections.js'"),
      });
      ok('inline connections baseline: renderConnections present inline, no module tag yet');
    } else {
      const connSrc = await readFile(join(ROOT, 'assets/connections.js'), 'utf8');
      const requiredExports = [
        'setTrelloIcon', 'syncActiveButtons', '_renderConnectionsPrivacy',
        '_endConnectionsPrivacyVisit', 'toggleConfig', '_applyOfflinePanel',
        'renderConnections', 'dropboxDisconnect', '_getDueStr',
        '_queueTagArrivalShimmer', 'renderManual', '_wireManualTagShimmer',
        'taskHTML', '_getCreatedFromId', '_getAgeDays',
      ];
      const startupIdx = indexSrc.indexOf('window._startConnections();');
      const aboutIdx   = indexSrc.indexOf('window._startAbout();');
      await expectAll('extracted connections module wiring', {
        moduleLoad:       indexSrc.includes('<script src="assets/connections.js"></script>'),
        beforeTrello:     indexSrc.indexOf("assets/connections.js") < indexSrc.indexOf("assets/trello.js"),
        initializerFirst: startupIdx !== -1 && startupIdx < aboutIdx,
        sectionRemoved:   !indexSrc.includes('function renderConnections()'),
        moduleInit:       connSrc.includes('window._startConnections = function()'),
        allExports:       requiredExports.every(n => connSrc.includes(`window.${n} = ${n};`)),
        precached:        swSrc.includes("'/assets/connections.js'"),
      });
      ok('extracted connections module wiring, 15 exports correct, load order and init order correct');
    }
  }

  console.log(`\nConnections tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
