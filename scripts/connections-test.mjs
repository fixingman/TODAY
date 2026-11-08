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
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { waitForFonts } from './browser-fixture.mjs';
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
    () => !document.body.hasAttribute('data-booting') && performance.getEntriesByName('today:interactive').length > 0 && typeof Today?.use('connections').renderConnections === 'function' &&
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
  // The actual embedded view, including the fully connected rows from Can's report.
  {
    const {page,errors}=await openPage();
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await waitForFonts(page);
    await page.evaluate(()=>{
      window.__configNode=document.getElementById('configPanel');window.__configParent=__configNode.parentNode;
      localStorage.setItem('dropbox_token','fictional-access');localStorage.setItem('dropbox_refresh_token','fictional-grant');localStorage.setItem('dropbox_token_expiry',String(Date.now()+3600000));
      localStorage.setItem('trello_token','fictional-trello');localStorage.setItem('trello_config',JSON.stringify({boardId:'fictional-board',todayList:'A deliberately long fictional review queue'}));
      localStorage.setItem('today_ai_key_gemini','fictional-gemini');localStorage.setItem('today_ai_key_claude','fictional-claude');
      localStorage.setItem('last_successful_backup',new Date().toISOString());
      const native=window.fetch;window.__settingsAI=0;
      window.fetch=async(url,options)=>{
        if(String(url).includes('/.netlify/functions/ai-assist')){__settingsAI++;return new Response('{}',{headers:{'Content-Type':'application/json'}});}
        if(String(url).includes('/files/download')&&window.__settingsDocument)return new Response(__settingsDocument,{headers:{'Dropbox-API-Result':JSON.stringify({rev:'fictional-rev'})}});
        if(String(url).startsWith('http')&&!String(url).startsWith(location.origin))return new Response('{"error_summary":"path/not_found/"}',{status:409});
        return native(url,options);
      };
    });
    const capture=join(ROOT,'.context/ci-test-results/connections-sidebar');await mkdir(capture,{recursive:true});
    await page.setViewport({width:1024,height:900});await page.click('#trelloBtn');
    await page.waitForSelector('#sidebarRoot [data-ex-action="connections"]');
    await page.waitForFunction(()=>!document.getElementById('sidebarRoot').getAttribute('aria-busy'));
    await page.$eval('#exQuestion',node=>{node.value='UNSENT_SETTINGS_FICTION';node.dispatchEvent(new Event('input',{bubbles:true}));});
    const header=await page.evaluate(()=>{
      const root=document.getElementById('sidebarRoot'),hide=root.querySelector('[data-ex-action="hide"]').getBoundingClientRect(),link=root.querySelector('.ex-conn-btn').getBoundingClientRect();
      return {hide:{right:hide.right,left:hide.left,top:hide.top,width:hide.width,height:hide.height},link:{right:link.right,top:link.top,width:link.width,height:link.height},right:root.getBoundingClientRect().right,pad:parseFloat(getComputedStyle(root.querySelector('.ex-sheet-head')).paddingRight)};
    });
    await page.screenshot({path:join(capture,'explore-'+(process.env.CONNECTIONS_UI_CAPTURE_TAG||'after')+'.png')});
    await page.click('.ex-conn-btn');await page.waitForSelector('#exConnectionsMount #configPanel');
    await page.screenshot({path:join(capture,'settings-'+(process.env.CONNECTIONS_UI_CAPTURE_TAG||'after')+'.png')});
    assert.ok(Math.abs(header.hide.right-(header.right-header.pad))<1,'Hide stays at the standard right inset');
    assert.ok(header.link.right<=header.hide.left&&Math.abs(header.link.top-header.hide.top)<1,'Connections precedes Hide in the same header row');
    assert.deepEqual([header.link.width,header.link.height,header.hide.width,header.hide.height],[44,44,44,44],'Header controls share the native44px hit area');
    await page.addScriptTag({content:await readFile(join(ROOT,'scripts/node_modules/axe-core/axe.min.js'),'utf8')});
    for(const width of [320,390,736,1024,1440]){
      await page.setViewport({width,height:900});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const layout=await page.evaluate(()=>{
        const root=document.getElementById('sidebarRoot'),head=root.querySelector('.ex-sheet-head'),box=root.querySelector('.ex-sheet-scroll').getBoundingClientRect();
        const visible=node=>!!node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden';
        const overflow=[...root.querySelectorAll('button,input,select,.connection-row')].filter(visible).filter(node=>{const r=node.getBoundingClientRect();return r.left<box.left-1||r.right>box.right+1;}).map(node=>node.id||node.className);
        const stretched=[...root.querySelectorAll('.connection-row-info')].filter(visible).filter(node=>node.getBoundingClientRect().height>[...node.children].filter(visible).reduce((sum,child)=>sum+child.getBoundingClientRect().height,0)+parseFloat(getComputedStyle(node).rowGap)*Math.max(0,[...node.children].filter(visible).length-1)+2).length;
        return {stretched,titles:[...root.querySelectorAll('.config-title')].filter(visible).filter(node=>node.textContent.includes('Connections')).length,backInBody:!!root.querySelector('.ex-sheet-scroll [data-ex-action="back"]'),hideLast:head.querySelector('[data-ex-action="hide"]')?.getBoundingClientRect().right>=head.getBoundingClientRect().right-parseFloat(getComputedStyle(head).paddingRight)-1,overflow,focus:document.activeElement.id};
      });
      assert.equal(layout.stretched,0,width+'px has no artificial blank space inside service rows');assert.equal(layout.titles,1,width+'px has one Connections title');assert.ok(layout.backInBody&&layout.hideLast,width+'px uses the standard header and content return');assert.deepEqual(layout.overflow,[],width+'px controls fit the sidebar column');
      const axe=await page.evaluate(()=>axe.run(document.getElementById('sidebarRoot'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(axe.violations.map(row=>({id:row.id,nodes:row.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),[],width+'px settings accessibility');
      await page.screenshot({path:join(capture,'settings-'+width+'.png')});
    }
    await page.focus('#meetingNameInput');await page.type('#meetingNameInput','Fictional unsent name');
    await page.evaluate(()=>document.dispatchEvent(new CustomEvent('today:memory-change')));
    await page.setViewport({width:1024,height:900});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.$eval('#meetingNameInput',node=>node.value),'Fictional unsent name','Source/viewport refresh cannot discard a live settings form');
    assert.ok(await page.evaluate(()=>document.getElementById('configPanel')===__configNode),'Keep one live settings node');
    await page.$eval('#sidebarRoot [data-ex-action="back"]',node=>node.scrollIntoView({block:'center',behavior:'instant'}));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await page.$eval('#sidebarRoot [data-ex-action="back"]',node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'The return action is visible and hit-testable');await page.click('#sidebarRoot [data-ex-action="back"]');await page.waitForSelector('#exQuestion');
    assert.equal(await page.$eval('#exQuestion',node=>node.value),'UNSENT_SETTINGS_FICTION','Returning retains the exploration draft');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'exConnections','Return focus to the exact Connections opener');
    assert.ok(await page.evaluate(()=>__configNode.parentNode===__configParent&&__configNode.hidden),'Leaving restores and hides the original panel');
    await page.click('#exConnections');await page.click('#sidebarRoot [data-ex-action="hide"]');await page.waitForFunction(()=>document.getElementById('sidebarRoot').hidden);
    assert.ok(await page.evaluate(()=>__configNode.parentNode===__configParent&&__configNode.hidden),'Hide also restores the live settings node');
    await page.evaluate(()=>{const core=Today.use('exploration-core');window.__settingsDocument=core.stringify(core.create('A fictional saved topic','','settings-workspace',new Date().toISOString()));});
    await page.click('#trelloBtn');await page.waitForSelector('#exThought');
    const savedHeader=await page.evaluate(()=>{const head=document.querySelector('#sidebarRoot .ex-sheet-head'),link=head.querySelector('#exConnections').getBoundingClientRect(),hide=head.querySelector('[data-ex-action="hide"]').getBoundingClientRect(),nav=head.querySelector('.ex-nav').getBoundingClientRect();return {sameRow:Math.abs(link.top-hide.top)<1,navBelow:nav.top>=hide.bottom,last:hide.right>link.right};});
    assert.deepEqual(savedHeader,{sameRow:true,navBelow:true,last:true},'Saved conversations keep one title/action row and one navigation row');
    await page.click('#exConnections');await page.$eval('#meetingNameInput',node=>{node.value='';});await page.focus('#meetingNameInput');await page.type('#meetingNameInput','FORM_SURVIVES_SYNC_FICTION');
    await page.evaluate(async()=>{manualTasks[0].text+=' changed';await Today.use('exploration').refreshSources();});
    assert.equal(await page.$eval('#meetingNameInput',node=>node.value),'FORM_SURVIVES_SYNC_FICTION','A real context redraw preserves the mounted settings form');
    await page.evaluate(()=>{
      for(const key of ['trello_token','trello_config','dropbox_token','dropbox_refresh_token','today_ai_key_gemini','today_ai_key_claude'])localStorage.removeItem(key);
      Today.use('connections').renderConnections();Today.use('connections')._aiRenderConfig();
    });
    for(const width of [320,1024]){
      await page.setViewport({width,height:900});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const forms=await page.evaluate(()=>{const root=document.getElementById('sidebarRoot'),box=root.getBoundingClientRect();return [...root.querySelectorAll('button,input,select')].filter(node=>node.getClientRects().length).every(node=>{const r=node.getBoundingClientRect();return r.left>=box.left-1&&r.right<=box.right+1&&(!node.matches('input')||innerWidth>600||parseFloat(getComputedStyle(node).fontSize)>=16);});});
      assert.ok(forms,width+'px disconnected/key-entry controls fit with mobile-safe input typography');
      await page.screenshot({path:join(capture,'disconnected-'+width+'.png')});
    }
    await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});Today.use('connections')._applyOfflinePanel();});
    assert.ok(await page.$eval('#offlineBanner',node=>node.classList.contains('visible')),'Offline status remains visible inside the sidebar');
    assert.equal(await page.evaluate(()=>document.getElementById('configPanel').getAttribute('aria-hidden')),'false','The embedded panel remains exposed while shown');
    await page.click('#sidebarRoot [data-ex-action="hide"]');await page.waitForFunction(()=>document.getElementById('sidebarRoot').hidden);
    assert.equal(await page.evaluate(()=>__settingsAI),0,'Settings navigation never generates an AI reply');
    assert.deepEqual(errors,[]);await page.close();ok('Embedded Connections uses native header, tokens, contained controls and safe live-form navigation');
  }
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
