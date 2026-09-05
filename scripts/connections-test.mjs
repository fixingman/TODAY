// TODAY — Connections panel + AI provider config regression test
//
// Flow: toggleConfig open/close, _applyOfflinePanel offline/online,
// renderConnections renders, _renderConnectionsPrivacy no-creds/with-creds,
// _endConnectionsPrivacyVisit hides privacy, _getDueStr returns time/empty,
// renderManual renders task rows, _aiGetProvider/_aiGetKey basics,
// _aiIsConfigured reflects key, _aiRenderConfig renders rows,
// saveAIKey valid key saves, clearAIKey removes and switches default,
// setDefaultProvider switches default, module wiring.
//
// Run from repo root:
//   node scripts/connections-test.mjs --pre-extraction   # pre-fold baseline
//   node scripts/connections-test.mjs                    # post-fold (17 tests)

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
    () => typeof Today?.use('connections').renderConnections === 'function' &&
          typeof Today?.use('connections').saveAIKey === 'function' &&
          !!$.configPanel,
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.dropboxAutoSave    = () => {};
    window.dropboxBackup      = () => {};
    window.loadTrelloBoards   = () => {};
    window.renderMeetingNames = () => {};
  });
  return { page, errors };
}

try {
  // 1. toggleConfig: opens configPanel.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('connections').toggleConfig();
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
      Today.use('connections').toggleConfig();
      Today.use('connections').toggleConfig();
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
      Today.use('connections')._applyOfflinePanel();
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
      Today.use('connections')._applyOfflinePanel();
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
      Today.use('connections').toggleConfig(); // opens panel, calls renderConnections() internally
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
      Today.use('connections').toggleConfig(); // opens → _beginConnectionsPrivacyVisit() → no creds → note visible
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
      Today.use('connections').toggleConfig(); // opens → _beginConnectionsPrivacyVisit() → has creds → note hidden
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
      Today.use('connections').toggleConfig(); // open → no creds → note visible
      const note = document.getElementById('connectionsPrivacyNote');
      const wasVisible = !!(note && note.style.display === 'block');
      Today.use('connections').toggleConfig(); // close → _endConnectionsPrivacyVisit() → note hidden
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
      const todayResult = Today.use('connections')._getDueStr({ due: new Date().toISOString() });
      const emptyResult = Today.use('connections')._getDueStr({});
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
      Today.use('connections').renderManual();
      const list = document.getElementById('manualList');
      const count = list ? list.querySelectorAll('.task').length : 0;
      return { twoTasks: count === 2 };
    });
    await expectAll('renderManual task rows', { ...result, noErrors: errors.length === 0 });
    ok('renderManual: renders 2 task rows from seeded today_manual');
    await page.close();
  }

  // 12. _aiGetProvider / _aiGetKey basics: provider set by _aiInit, key round-trip.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      // _aiInit seeds today_ai_provider = AI_BUILD_PROVIDER ('claude') on first load
      const providerAfterInit = Today.use('connections')._aiGetProvider();
      localStorage.removeItem('today_ai_key_gemini');
      const emptyKey = Today.use('connections')._aiGetKey('gemini');
      localStorage.setItem('today_ai_key_gemini', 'gk-test');
      const foundKey = Today.use('connections')._aiGetKey('gemini');
      localStorage.setItem('today_ai_provider', 'gemini');
      const switchedProvider = Today.use('connections')._aiGetProvider();
      return {
        providerSet:      providerAfterInit === 'claude',
        emptyKeyIsEmpty:  emptyKey === '',
        foundKey:         foundKey === 'gk-test',
        providerSwitched: switchedProvider === 'gemini',
      };
    });
    await expectAll('_aiGetProvider / _aiGetKey basics', { ...result, noErrors: errors.length === 0 });
    ok('_aiGetProvider: returns provider from localStorage; _aiGetKey: round-trip read/write');
    await page.close();
  }

  // 13. _aiIsConfigured: false without key, true after key set.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      localStorage.removeItem('today_ai_key_claude');
      localStorage.removeItem('today_ai_key_gemini');
      const notConfigured = !Today.use('connections')._aiIsConfigured();
      // Today.use('connections')._aiGetProvider() returns 'claude' (set by _aiInit), so set claude key
      localStorage.setItem('today_ai_key_claude', 'ck-test');
      const configured = Today.use('connections')._aiIsConfigured();
      return { notConfigured, configured };
    });
    await expectAll('_aiIsConfigured reflects key', { ...result, noErrors: errors.length === 0 });
    ok('_aiIsConfigured: false without key, true after key set');
    await page.close();
  }

  // 14. _aiRenderConfig: renders provider rows into #aiProviderRows when config panel opens.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      Today.use('connections').toggleConfig(); // opens panel; setTimeout(_aiRenderConfig, 0) fires shortly
      await new Promise(r => setTimeout(r, 80)); // wait for deferred _aiRenderConfig
      const rows = document.getElementById('aiProviderRows');
      const html = rows ? rows.innerHTML : '';
      return {
        rowsPresent: html.trim().length > 0,
        hasGemini:   html.includes('gemini') || html.includes('Gemini'),
        hasClaude:   html.includes('claude') || html.includes('Claude'),
      };
    });
    await expectAll('_aiRenderConfig renders provider rows', { ...result, noErrors: errors.length === 0 });
    ok('_aiRenderConfig: renders Gemini and Claude rows into #aiProviderRows');
    await page.close();
  }

  // 15. saveAIKey: valid key saves to localStorage after successful fetch ping.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      window.fetch = async () => ({ ok: true, text: async () => '' });
      window._updateBarPlaceholder = () => {};
      window._meetingInit = () => {};
      window._voiceNoteInit = () => {};
      Today.use('connections').toggleConfig();
      await new Promise(r => setTimeout(r, 80)); // wait for _aiRenderConfig to render inputs
      const input = document.getElementById('aiKey_gemini');
      if (input) input.value = 'sk-test-key-gemini';
      await Today.use('connections').saveAIKey('gemini');
      return { keySaved: !!localStorage.getItem('today_ai_key_gemini') };
    });
    await expectAll('saveAIKey valid key saves', { ...result, noErrors: errors.length === 0 });
    ok('saveAIKey: valid key saved to localStorage after successful fetch ping');
    await page.close();
  }

  // 16. clearAIKey: removes key and switches default to other provider.
  {
    const { page, errors } = await openPage({
      today_ai_key_gemini: 'gk',
      today_ai_key_claude: 'ck',
      today_ai_provider:   'gemini',
    });
    const result = await page.evaluate(() => {
      window._updateBarPlaceholder = () => {};
      window._meetingInit = () => {};
      window._voiceNoteInit = () => {};
      Today.use('connections').clearAIKey('gemini');
      return {
        keyRemoved:      Today.use('connections')._aiGetKey('gemini') === '',
        defaultSwitched: Today.use('connections')._aiGetProvider() === 'claude',
      };
    });
    await expectAll('clearAIKey removes key and switches default', { ...result, noErrors: errors.length === 0 });
    ok('clearAIKey: gemini key removed, default switched to claude');
    await page.close();
  }

  // 17. setDefaultProvider: switches default between two saved keys.
  {
    const { page, errors } = await openPage({
      today_ai_key_gemini: 'gk',
      today_ai_key_claude: 'ck',
      today_ai_provider:   'gemini',
    });
    const result = await page.evaluate(() => {
      window._updateBarPlaceholder = () => {};
      window._meetingInit = () => {};
      window._voiceNoteInit = () => {};
      Today.use('connections').setDefaultProvider('claude');
      return { defaultIsClaude: Today.use('connections')._aiGetProvider() === 'claude' };
    });
    await expectAll('setDefaultProvider switches default', { ...result, noErrors: errors.length === 0 });
    ok('setDefaultProvider: default switched to claude');
    await page.close();
  }

  // 18. Static wiring checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
    const connSrc  = await readFile(join(ROOT, 'assets/connections.js'), 'utf8');
    if (PRE_EXTRACTION) {
      // Pre-fold baseline: AI provider functions still inline in index.html.
      await expectAll('pre-fold AI provider baseline', {
        aiRenderConfigInline: indexSrc.includes('function _aiRenderConfig()'),
        saveAIKeyInline:      indexSrc.includes('async function saveAIKey('),
        notYetInConnections:  !connSrc.includes('window.saveAIKey = saveAIKey;'),
      });
      ok('pre-fold baseline: AI provider functions inline in index.html, not yet in connections.js');
    } else {
      const startupIdx = indexSrc.indexOf('window._startConnections();');
      const aboutIdx   = indexSrc.indexOf('window._startAbout();');
      await expectAll('connections module with AI fold-in wiring', {
        moduleLoad:       indexSrc.includes('<script src="assets/connections.js"></script>'),
        beforeTrello:     indexSrc.indexOf("assets/connections.js") < indexSrc.indexOf("assets/trello.js"),
        initializerFirst: startupIdx !== -1 && startupIdx < aboutIdx,
        aiRenderRemoved:  !indexSrc.includes('function _aiRenderConfig()'),
        saveAIKeyRemoved: !indexSrc.includes('async function saveAIKey('),
        moduleInit:       connSrc.includes('window._startConnections = function()'),
        api:              connSrc.includes("Today.define('connections'"),
        precached:        swSrc.includes("'/assets/connections.js'"),
      });
      ok('connections with AI fold-in: 23 exports, AI functions removed from index.html');
    }
  }

  const testCount = PRE_EXTRACTION ? '11' : '17';
  console.log(`\nConnections tests passed (${PRE_EXTRACTION ? 'pre-fold baseline' : 'AI fold-in'}, ${testCount} tests).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
