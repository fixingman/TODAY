// TODAY — Trello integration regression suite.
// Covers picker APIs, card filtering/render/cache, failure mapping, post-sync
// reconciliation, disconnect cleanup, popup failure, and static wiring.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
  if (Object.values(result).some(value => !value)) await fail(label, result);
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

async function openPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
  });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() =>
    typeof loadTrello === 'function'
      && typeof loadTrelloBoards === 'function'
      && typeof renderTrello === 'function'
      && typeof clearTrello === 'function'
      && typeof Today?.use('connections').taskHTML === 'function'
      && !!document.getElementById('trelloList'),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window._breathe = () => {};
    window.checkDayNudge = () => {};
    window.checkTriageBar = () => {};
    window.syncActiveButtons = () => {};
    window.renderMeetingNames = () => {};
  });
  return { page, errors };
}

try {
  // 1. Board/list picker uses OAuth headers, restores choices, and escapes names.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      const requests = [];
      window.fetch = async (url, options = {}) => {
        requests.push({ url, auth: options.headers?.Authorization || '' });
        if (url.includes('/members/me/boards')) {
          return { ok:true, json:async () => [
            { id:'board_1', name:'Product <script>bad()</script>' },
            { id:'board_2', name:'Personal' },
          ] };
        }
        if (url.includes('/boards/board_1/lists')) {
          return { ok:true, json:async () => [
            { id:'list_1', name:'Today & Now' }, { id:'list_2', name:'Later' },
          ] };
        }
        throw new Error('unexpected URL ' + url);
      };
      localStorage.setItem('trello_token', 'secret-token');
      document.getElementById('configPanel').classList.add('open');
      Today.use('connections').renderConnections();
      await new Promise(resolve => setTimeout(resolve, 0));
      const board = document.getElementById('boardSelect');
      board.value = 'board_1';
      await onBoardChange();
      const list = document.getElementById('listSelect');
      return {
        boardOptions: board.options.length === 3,
        unsafeMarkupEscaped: !board.querySelector('script') && board.options[1].textContent === 'Product <script>bad()</script>',
        listOptions: list.options.length === 3 && list.options[1].textContent === 'Today & Now',
        listVisible: document.getElementById('listFieldWrap').style.display !== 'none',
        oauthHeader: requests.length === 2 && requests.every(request => request.auth.includes('oauth_token="secret-token"')),
        tokenNotInUrl: requests.every(request => !request.url.includes('secret-token')),
      };
    });
    await expectAll('Trello board/list picker', { ...result, noErrors: errors.length === 0 });
    ok('board/list picker: options escaped, OAuth header used, token absent from URLs');
    await page.close();
  }

  // 2. Card load filters by list/due/done grace, preserves order, metadata, and cache.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      const today = new Date(); today.setHours(12, 0, 0, 0);
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      const oldCheck = new Date(yesterday).toISOString();
      const currentCheck = new Date(today).toISOString();
      doneIds = new Set(['trello_done_old', 'trello_done_today']);
      localStorage.setItem('today_checked_ids', JSON.stringify([
        { id:'trello_done_old', at:oldCheck }, { id:'trello_done_today', at:currentCheck },
      ]));
      localStorage.setItem('today_trello_order', JSON.stringify(['trello_due_today', 'trello_in_list']));
      localStorage.setItem('trello_config', JSON.stringify({
        apiKey:'public-key', apiToken:'private-token', boardId:'board_1', todayList:'Today',
      }));
      const requests = [];
      window.fetch = async (url, options = {}) => {
        requests.push({ url, auth:options.headers?.Authorization || '' });
        if (url.includes('/lists?')) return { ok:true, json:async () => [{ id:'today_list', name:'Today' }] };
        if (url.includes('/cards?')) return { ok:true, json:async () => [
          { id:'in_list', name:'work: Ship release', idList:'today_list', due:null, url:'https://trello.com/c/one', checklists:[{ checkItems:[{state:'complete'},{state:'incomplete'}] }] },
          { id:'due_today', name:'Due outside list', idList:'other', due:today.toISOString(), url:'https://trello.com/c/two', checklists:[] },
          { id:'overdue', name:'Overdue open', idList:'other', due:yesterday.toISOString(), url:'', checklists:[] },
          { id:'future', name:'Future card', idList:'other', due:tomorrow.toISOString(), url:'', checklists:[] },
          { id:'outside', name:'No due outside', idList:'other', due:null, url:'', checklists:[] },
          { id:'blank', name:'---', idList:'today_list', due:null, url:'', checklists:[] },
          { id:'done_old', name:'Done yesterday', idList:'today_list', due:null, url:'', checklists:[] },
          { id:'done_today', name:'Done today', idList:'today_list', due:null, url:'', checklists:[] },
        ] };
        throw new Error('unexpected URL ' + url);
      };
      await loadTrello();
      const rows = [...document.querySelectorAll('#trelloList .task[data-taskid]')];
      const cache = JSON.parse(localStorage.getItem('today_trello_cache'));
      const tagged = document.querySelector('[data-taskid="trello_in_list"]');
      return {
        filteredIds: JSON.stringify(trelloTasks.map(task => task.id)) === JSON.stringify([
          'trello_due_today', 'trello_in_list', 'trello_overdue', 'trello_done_today',
        ]),
        domMatches: JSON.stringify(rows.map(row => row.dataset.taskid)) === JSON.stringify(trelloTasks.map(task => task.id)),
        checklistComputed: trelloTasks.find(task => task.id === 'trello_in_list')?.checklist?.done === 1
          && trelloTasks.find(task => task.id === 'trello_in_list')?.checklist?.total === 2,
        metadataRendered: tagged?.querySelector('.task-tag')?.textContent === 'work'
          && tagged?.querySelector('.badge.checklist')?.textContent.trim() === '1/2 ✓'
          && tagged?.querySelector('.task-link')?.getAttribute('aria-label') === 'Open in Trello',
        doneState: document.querySelector('[data-taskid="trello_done_today"]')?.classList.contains('done') === true,
        cacheMatches: cache.boardId === 'board_1'
          && JSON.stringify(cache.tasks.map(task => task.id)) === JSON.stringify(trelloTasks.map(task => task.id)),
        firstSeenPruned: Object.keys(JSON.parse(localStorage.getItem('today_trello_firstseen') || '{}')).length === 4,
        apiShape: requests.length === 2
          && requests.every(request => request.auth.includes('oauth_token="private-token"'))
          && requests.every(request => !request.url.includes('private-token')),
      };
    });
    await expectAll('Trello load/filter/render/cache', { ...result, noErrors: errors.length === 0 });
    ok('card load: list/due/done filtering, order, metadata, auth, and cache correct');
    await page.close();
  }

  // 3. Manual API failures map to actionable status and reopen Connections.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      localStorage.setItem('trello_config', JSON.stringify({
        apiKey:'key', apiToken:'token', boardId:'missing', todayList:'Today',
      }));
      window.fetch = async () => ({ ok:false, status:404, statusText:'Not Found' });
      await loadTrello(false);
      return {
        panelOpened: document.getElementById('configPanel').classList.contains('open'),
        actionableStatus: document.getElementById('statusMsg').textContent.includes('Board not found (404)'),
        emptyExplains: document.getElementById('trelloEmpty').textContent.includes("Couldn't reach Trello"),
      };
    });
    await expectAll('Trello manual failure mapping', { ...result, noErrors: errors.length === 0 });
    ok('manual failure: 404 maps to board guidance and opens Connections');
    await page.close();
  }

  // 4. Background API failures log diagnostics without interrupting the user.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      localStorage.setItem('trello_config', JSON.stringify({
        apiKey:'key', apiToken:'token', boardId:'board_1', todayList:'Today',
      }));
      window.__syncErrors = [];
      window._logSyncError = (...args) => window.__syncErrors.push(args);
      window.fetch = async () => ({ ok:false, status:429, statusText:'Rate Limited' });
      await loadTrello(true);
      return {
        panelStayedClosed: !document.getElementById('configPanel').classList.contains('open'),
        diagnosticLogged: window.__syncErrors.length === 1
          && window.__syncErrors[0][0] === 'Trello'
          && window.__syncErrors[0][1].includes('429'),
      };
    });
    await expectAll('Trello background failure', { ...result, noErrors: errors.length === 0 });
    ok('background failure: diagnostic logged without opening Connections');
    await page.close();
  }

  // 5. Dropbox reconciliation removes stale completed cards but keeps today's grace.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const now = new Date(); now.setHours(12, 0, 0, 0);
      const old = new Date(now); old.setDate(now.getDate() - 1);
      trelloTasks = [
        { id:'trello_open', text:'Open card' },
        { id:'trello_old', text:'Completed yesterday' },
        { id:'trello_today', text:'Completed today' },
      ];
      doneIds = new Set(['trello_old', 'trello_today']);
      localStorage.setItem('today_checked_ids', JSON.stringify([
        { id:'trello_old', at:old.toISOString() }, { id:'trello_today', at:now.toISOString() },
      ]));
      _reconcileTrelloAfterMerge();
      return {
        staleRemoved: !trelloTasks.some(task => task.id === 'trello_old'),
        openKept: trelloTasks.some(task => task.id === 'trello_open'),
        todayKept: trelloTasks.some(task => task.id === 'trello_today'),
      };
    });
    await expectAll('Trello post-merge reconciliation', { ...result, noErrors: errors.length === 0 });
    ok('post-merge reconciliation: stale completion removed, today grace retained');
    await page.close();
  }

  // 6. Disconnect removes Trello-local credentials/cache/state and hides the section.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      localStorage.setItem('trello_token', 'token');
      localStorage.setItem('trello_config', JSON.stringify({ boardId:'board_1' }));
      localStorage.setItem('today_trello_cache', JSON.stringify({ tasks:[{id:'trello_one'}] }));
      trelloTasks = [{ id:'trello_one', text:'One card' }];
      trelloConnected = true;
      renderTrello();
      clearTrello();
      return {
        tokenCleared: !localStorage.getItem('trello_token'),
        configCleared: !localStorage.getItem('trello_config'),
        cacheCleared: !localStorage.getItem('today_trello_cache'),
        stateCleared: trelloTasks.length === 0 && trelloConnected === false,
        sectionHidden: document.getElementById('trelloSection').style.display === 'none',
        statusShown: document.getElementById('statusMsg').textContent === 'Trello disconnected.',
      };
    });
    await expectAll('Trello disconnect cleanup', { ...result, noErrors: errors.length === 0 });
    ok('disconnect: credentials, config, cache, state, section, and status cleared');
    await page.close();
  }

  // 7. Popup-blocked auth is a handled user-facing failure.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      window.open = () => null;
      trelloAuth();
      return {
        errorStatus: document.getElementById('statusMsg').textContent.includes('Popup blocked'),
        errorClass: document.getElementById('statusMsg').classList.contains('error'),
      };
    });
    await expectAll('Trello popup-blocked auth', { ...result, noErrors: errors.length === 0 });
    ok('auth: blocked popup reports a recoverable error');
    await page.close();
  }

  // 8. Static ownership/load/cache checks.
  {
    const [html, source, sw] = await Promise.all([
      readFile(join(ROOT, 'index.html'), 'utf8'),
      readFile(join(ROOT, 'assets/trello.js'), 'utf8'),
      readFile(join(ROOT, 'sw.js'), 'utf8'),
    ]);
    await expectAll('Trello static wiring', {
      scriptLoaded: html.includes('<script src="assets/trello.js"></script>'),
      precached: sw.includes("'/assets/trello.js'"),
      oauthHeader: source.includes('Authorization: `OAuth oauth_consumer_key="${config.apiKey}", oauth_token="${config.apiToken}"`'),
      checklistRequested: source.includes('&checklists=all'),
      postMergeExport: source.includes('function _reconcileTrelloAfterMerge()'),
      noInlineImplementation: !html.includes('async function loadTrello('),
    });
    ok('static wiring: module loaded/precached, OAuth header and checklist contract retained');
  }

  console.log('\nTrello tests passed (8 scenarios).');
} finally {
  if (browser) await browser.close();
  server.close();
}
