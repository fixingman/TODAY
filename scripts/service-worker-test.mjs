// TODAY — real service-worker install, upgrade, cache, and offline navigation test.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };
const swSource = await readFile(join(ROOT, 'sw.js'), 'utf8');
const CACHE_VERSION = swSource.match(/CACHE_VERSION\s*=\s*'([^']+)'/)?.[1];
const shellBlock = swSource.match(/const CACHE_APP_SHELL\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
const SHELL_PATHS = [...shellBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
assert.ok(CACHE_VERSION, 'sw.js must declare CACHE_VERSION');
assert.ok(SHELL_PATHS.length > 10, 'sw.js must declare a non-trivial app shell');

const UPGRADE_VERSION = CACHE_VERSION + '-test-upgrade';
const LEGACY_VERSION = 'today-v-test-legacy';
let serveUpgrade = false;
let serveFailure = '';
let failUnknownNetwork = false;
let holdShell = false;
const heldShell = [], requests = new Map();
const releaseShell = () => { holdShell=false;while(heldShell.length)heldShell.shift()(); };

const server = createServer(async (req, res) => {
  const requestURL = new URL(req.url, 'http://x'), pathname = decodeURIComponent(requestURL.pathname);
  requests.set(pathname,(requests.get(pathname)||0)+1);
  if (holdShell && (pathname==='/index.html'||SHELL_PATHS.some(path=>decodeURIComponent(path)===pathname))) {
    await new Promise(resolve=>heldShell.push(resolve));
  }
  if (pathname === '/.netlify/functions/sw-fixture' || req.method === 'POST') {
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({request:requests.get(pathname)}));return;
  }
  if (serveFailure && pathname === '/assets/enrichment-feedback.js') {
    if (serveFailure === 'network') req.socket.destroy();
    else { res.writeHead(404); res.end('missing shell fixture'); }
    return;
  }
  if (pathname === '/__sw-test-seed') {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    res.end('<!doctype html><title>SW seed</title>');
    return;
  }
  if (pathname === '/never-cached-route' && failUnknownNetwork) {
    req.socket.destroy();
    return;
  }
  let path = pathname === '/' ? '/index.html' : pathname;
  try {
    let body = path === '/sw.js' ? swSource : await readFile(join(ROOT, path));
    if (path === '/sw.js' && requestURL.searchParams.has('network-control')) {
      assert.ok(body.includes('if (cached) return cached;'));
      body=body.replace('if (cached) return cached;','if (cached) return fetch(request);');
    }
    if (path === '/sw.js' && (serveFailure || serveUpgrade)) {
      body = body.replace(CACHE_VERSION, serveFailure ? CACHE_VERSION + '-test-' + serveFailure : UPGRADE_VERSION);
    }
    if (path === '/index.html') body = String(body).replace('</head>', '<meta name="sw-fixture-build" content="'+(serveUpgrade?'upgrade':'base')+'"></head>');
    const headers = {
      'Content-Type': MIME[extname(path)] || 'application/octet-stream',
      'Cache-Control': path === '/sw.js' ? 'no-store' : 'no-cache',
    };
    if (path === '/sw.js') headers['Service-Worker-Allowed'] = '/';
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;

let browser;
let page;
let secondPage;
try {
  const puppeteer = (await import('puppeteer-core')).default;
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-first-run', '--disable-extensions'],
  });
  // Real negative control: the old network-first choice waits despite a complete cache.
  const controlContext=await browser.createBrowserContext();
  try {
    const control=await controlContext.newPage();
    await control.goto(BASE+'/__sw-test-seed');
    await control.evaluate(async()=>{
      await navigator.serviceWorker.register('/sw.js?network-control',{scope:'/'});
      await navigator.serviceWorker.ready;
      if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
    });
    holdShell=true;let settled=false;
    const waiting=control.evaluate(async()=>{const response=await fetch('/');return response.text();}).then(value=>{settled=true;return value;});
    const deadline=Date.now()+10000;
    while(!heldShell.length&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
    assert.ok(heldShell.length,'network-first control reaches the held origin');
    assert.equal(settled,false,'original strategy cannot serve the complete cache before the network responds');
    releaseShell();assert.ok((await waiting).includes('main-app'));
    console.log('  ✓ network-first control stalls on the origin despite a complete installed shell');
  } finally { releaseShell();await controlContext.close(); }
  page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('splash_shown_at', String(Date.now()));
  });

  // Seed a cache that represents the previous deployed worker, then let the real
  // app registration install and activate the current worker.
  await page.goto(BASE + '/__sw-test-seed', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async legacy => {
    const cache = await caches.open(legacy);
    await cache.put('/legacy-marker', new Response('old'));
  }, LEGACY_VERSION);
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('controller timeout')), 10000);
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    }
  });

  const installed = await page.evaluate(async ({ current, legacy, shell }) => {
    const keys = await caches.keys();
    const cache = await caches.open(current);
    const cached = new Set((await cache.keys()).map(request => new URL(request.url).pathname));
    return {
      controlled: !!navigator.serviceWorker.controller,
      currentOnly: keys.length === 1 && keys[0] === current && !keys.includes(legacy),
      shellComplete: shell.every(path => cached.has(new URL(path, location.origin).pathname)),
      offlineFallbackCached: cached.has('/__offline'),
      cachedCount: cached.size,
    };
  }, { current: CACHE_VERSION, legacy: LEGACY_VERSION, shell: SHELL_PATHS });
  assert.equal(installed.controlled, true);
  assert.equal(installed.currentOnly, true);
  assert.equal(installed.shellComplete, true, `only ${installed.cachedCount} cache entries installed`);
  assert.equal(installed.offlineFallbackCached, true);
  console.log(`  ✓ fresh install controls the app and caches all ${SHELL_PATHS.length} shell resources`);
  console.log('  ✓ activation purges a stale cache');

  // The installed shell must remain usable while every public origin response is held.
  const beforeShell=new Map(requests);holdShell=true;
  try {
    await page.reload({waitUntil:'load',timeout:15000});
    await page.waitForFunction(()=>performance.getEntriesByName('today:interactive').length===1);
    assert.equal(heldShell.length,0,'a warm app load must not request the origin shell');
    assert.equal(requests.get('/'),beforeShell.get('/'),'warm HTML comes from the installed cache');
    const aliases=await page.evaluate(async current=>{
      const html=await (await fetch('/index.html?code=FICTIONAL_NOT_STORED')).text();
      const keys=await (await caches.open(current)).keys();
      return {app:html.includes('main-app'),queryStored:keys.some(request=>new URL(request.url).search)};
    },CACHE_VERSION);
    assert.deepEqual(aliases,{app:true,queryStored:false},'canonical app aliases do not create query-bearing cache entries');
  } finally { releaseShell(); }
  console.log('  ✓ warm navigation, full runtime and query alias load from the installed version with origin responses held');

  const bypass=await page.evaluate(async current=>{
    const a=await (await fetch('/.netlify/functions/sw-fixture?fictional=1')).json();
    const b=await (await fetch('/.netlify/functions/sw-fixture?fictional=1')).json();
    const post=await (await fetch('/assets/runtime.js',{method:'POST',body:'fictional'})).json();
    const keys=await (await caches.open(current)).keys();
    return {fresh:b.request>a.request,post:post.request>0,privateCached:keys.some(request=>new URL(request.url).pathname.startsWith('/.netlify/'))};
  },CACHE_VERSION);
  assert.deepEqual(bypass,{fresh:true,post:true,privateCached:false});
  const miss=await page.evaluate(async current=>{
    const path='/assets/today-og.png',cache=await caches.open(current),original=await cache.match(path);
    const foreign=await caches.open('unrelated-worker-cache');
    try {
      await foreign.put(path,new Response('foreign',{headers:{'X-Foreign':'yes'}}));await cache.delete(path);
      const response=await fetch(path);
      return {network:response.ok&&!response.headers.has('X-Foreign'),uncached:!await cache.match(path)};
    } finally {await cache.put(path,original);await caches.delete('unrelated-worker-cache');}
  },CACHE_VERSION);
  assert.deepEqual(miss,{network:true,uncached:true},'misses use network without adopting another version or mutating the installed shell');
  console.log('  ✓ API/POST bypass stays fresh and uncached; a shell miss uses network without cross-cache/version pollution');

  for (const failure of ['missing','network']) {
    serveFailure = failure;
    const state = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration('/');
      window.__workerBeforeFailedUpgrade = registration.active;
      const outcome = new Promise((resolve,reject) => {
        const deadline = setTimeout(() => reject(new Error('failed-install state timeout')),10000);
        registration.addEventListener('updatefound',() => {
          const worker = registration.installing;
          const changed = () => {
            if (worker.state === 'redundant' || worker.state === 'installed') {
              clearTimeout(deadline); resolve(worker.state);
            }
          };
          worker.addEventListener('statechange',changed); changed();
        },{once:true});
      });
      await registration.update();
      return outcome;
    });
    assert.equal(state,'redundant','an incomplete update must fail installation rather than replace the complete offline worker');
    const retained = await page.evaluate(async ({current,failed}) => {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const keys = await caches.keys(), cache = await caches.open(current);
      return {sameWorker:registration.active === window.__workerBeforeFailedUpgrade,
        oldShell:!!(await cache.match('/')) && !!(await cache.match('/assets/enrichment-feedback.js')),
        noPartialCache:!keys.includes(failed)};
    },{current:CACHE_VERSION,failed:CACHE_VERSION+'-test-'+failure});
    assert.deepEqual(retained,{sameWorker:true,oldShell:true,noPartialCache:true});
    console.log('  ✓ '+failure+' shell update retains the previous worker/cache and removes its incomplete cache');
  }
  serveFailure = '';

  // A ready update must wait, leaving the document/draft/controller intact.
  // Keep the real postMessage path observable, including legacy takeover requests.
  await page.evaluate(() => {
    window.__updateMessages=[];
    const post=ServiceWorker.prototype.postMessage;
    ServiceWorker.prototype.postMessage=function(message,...rest){
      window.__updateMessages.push(message);return post.call(this,message,...rest);
    };
    window.__sessionMarker='original-session';
    document.getElementById('newTask').value='Fictional unsent draft';
    window.__originalController=navigator.serviceWorker.controller;
  });
  let automaticNavigations=0;
  const countNavigation=frame=>{if(frame===page.mainFrame())automaticNavigations++;};
  page.on('framenavigated',countNavigation);
  serveUpgrade = true;
  await page.evaluate(async () => {
    const registration=await navigator.serviceWorker.getRegistration('/');
    const installed=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('update install timeout')),10000);
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        const changed=()=>{if(['installed','redundant'].includes(worker.state)){clearTimeout(timer);resolve(worker.state);}};
        worker.addEventListener('statechange',changed);changed();
      },{once:true});
    });
    await registration.update();await installed;
  });
  assert.deepEqual(await page.evaluate(()=>__updateMessages),[],'background install must not request immediate takeover');
  await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration('/')).waiting,{timeout:10000});
  const retained=await page.evaluate(async current=>({
    controller:navigator.serviceWorker.controller===__originalController,
    marker:__sessionMarker,
    draft:document.getElementById('newTask').value,
    cache:(await caches.keys()).includes(current),
  }),CACHE_VERSION);
  assert.deepEqual(retained,{controller:true,marker:'original-session',draft:'Fictional unsent draft',cache:true});
  assert.equal(automaticNavigations,0,'installing an update cannot reload the open app');

  // Additional windows keep the active installed version while its update waits.
  secondPage=await browser.newPage();
  let secondNavigations=0;
  secondPage.on('framenavigated',frame=>{if(frame===secondPage.mainFrame())secondNavigations++;});
  await secondPage.goto(BASE+'/',{waitUntil:'load',timeout:15000});
  assert.equal(await secondPage.$eval('meta[name=sw-fixture-build]',node=>node.content),'base');
  await secondPage.evaluate(async()=>{
    await navigator.serviceWorker.ready;
    window.__secondMarker='fresh-session';
    document.getElementById('newTask').value='Second fictional draft';
    // Even an older deployed client must not be able to force this update in.
    const registration=await navigator.serviceWorker.getRegistration('/');
    registration.waiting.postMessage('SKIP_WAITING');
    document.dispatchEvent(new Event('visibilitychange'));
    await registration.update();
  });
  assert.equal(secondNavigations,1,'fresh startup must have only its requested navigation');
  assert.equal(automaticNavigations,0,'another window cannot restart the original session');
  assert.equal(await secondPage.evaluate(()=>__secondMarker),'fresh-session');
  assert.equal(await secondPage.$eval('#newTask',node=>node.value),'Second fictional draft');
  assert.ok(await secondPage.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration('/')).waiting),'legacy takeover messages are ignored');
  console.log('  ✓ background updates, visibility checks and fresh windows preserve open sessions and drafts');

  // A manual refresh keeps the coherent installed shell until every window closes.
  await secondPage.reload({waitUntil:'load',timeout:15000});
  await secondPage.evaluate(async()=>{await navigator.serviceWorker.ready;await (await navigator.serviceWorker.getRegistration('/')).update();});
  assert.equal(secondNavigations,2,'manual refresh cannot trigger another automatic refresh');
  assert.equal(await secondPage.$eval('meta[name=sw-fixture-build]',node=>node.content),'base');
  assert.ok(await secondPage.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration('/')).waiting));
  assert.equal(automaticNavigations,0);
  page.off('framenavigated',countNavigation);
  console.log('  ✓ a manual refresh receives the active installed version exactly once');

  // Observe activation from outside the worker scope. Opening the app immediately
  // after close() can race client removal and keep the old controller alive.
  const observer=await browser.newPage(),workerSession=await observer.createCDPSession();
  let waitingVersion='',sawWaiting,sawActivation,activationDeadline;
  const waiting=new Promise(resolve=>{sawWaiting=resolve;}),activated=new Promise(resolve=>{sawActivation=resolve;});
  workerSession.on('ServiceWorker.workerVersionUpdated',({versions})=>{
    for(const version of versions)if(version.scriptURL===BASE+'/sw.js'&&version.status==='installed'){waitingVersion=version.versionId;sawWaiting();}
    if(versions.some(version=>version.versionId===waitingVersion&&version.status==='activated'))sawActivation();
  });
  try {
    await Promise.race([(async()=>{
      await workerSession.send('ServiceWorker.enable');await waiting;
      await page.close();page=null;
      assert.ok(await secondPage.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration('/')).waiting),'another open window retains the waiting update');
      await secondPage.close();secondPage=null;
      await activated;
    })(),new Promise((_,reject)=>{activationDeadline=setTimeout(()=>reject(new Error('Last-window worker activation exceeded 15000ms')),15000);})]);
  } finally {clearTimeout(activationDeadline);await workerSession.detach();await observer.close();}
  page=await browser.newPage();
  await page.goto(BASE+'/',{waitUntil:'load',timeout:15000});
  await page.waitForFunction(async upgraded=>{
    const keys=await caches.keys();
    return keys.length===1&&keys[0]===upgraded&&!!navigator.serviceWorker.controller;
  },{timeout:15000},UPGRADE_VERSION);
  const upgraded = await page.evaluate(async ({ upgraded, shell }) => {
    const cache = await caches.open(upgraded);
    const cached = new Set((await cache.keys()).map(request => new URL(request.url).pathname));
    return {
      shellComplete: shell.every(path => cached.has(new URL(path, location.origin).pathname)),
      offlineFallbackCached: cached.has('/__offline'),
    };
  }, { upgraded: UPGRADE_VERSION, shell: SHELL_PATHS });
  assert.equal(await page.$eval('meta[name=sw-fixture-build]',node=>node.content),'upgrade','the next session receives the newly activated complete version');
  assert.equal(upgraded.shellComplete, true);
  assert.equal(upgraded.offlineFallbackCached, true);
  console.log('  ✓ closing every app window activates the complete update and retires the old cache');

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  const offlineShell = await page.evaluate(() => ({
    title: document.title,
    app: !!document.getElementById('main-app'),
    addInput: !!document.getElementById('newTask'),
  }));
  assert.equal(offlineShell.title.endsWith('TODAY'), true);
  assert.equal(offlineShell.app, true);
  assert.equal(offlineShell.addInput, true);
  await page.waitForFunction(() => window.Today?.use('gmail')?.rankCandidates);
  const offlineRanking = await page.evaluate(() => Today.use('gmail').rankCandidates('Book haircut', [{
    threadId: 'offline-confirmation', subject: 'Haircut booking confirmed', from: 'Salon <hi@salon.se>',
    snippet: 'Your haircut appointment is confirmed',
  }]));
  assert.equal(offlineRanking.result?.threadId, 'offline-confirmation');
  console.log('  ✓ the lazy local email ranker loads from the service-worker cache offline');

  const offlineCalendarPolicy = await page.evaluate(async () => {
    await import('/assets/calendar-nudge.js');
    await import('/assets/calendar-nudge-policy.js');
    if (typeof Today.use('calendar-nudge').support !== 'function') return null;
    const policy = Today.use('calendar-nudge-policy');
    const now = +new Date('2026-10-14T09:00:00');
    return policy.constraint({ id: 'offline-fixture',
      text: 'Review draft needs 45 uninterrupted minutes; send before 15:00.' }, now)?.durationMinutes;
  });
  assert.equal(offlineCalendarPolicy, 45);
  console.log('  ✓ the lazy Calendar evidence policy loads from the service-worker cache offline');
  assert.equal(await page.evaluate(async()=>{await import('/assets/reflection-wording.js');return typeof Today.use('reflection-wording').render;}),'function');
  console.log('  ✓ optional feeling-wording controls load from the service-worker cache offline');
  assert.equal(await page.evaluate(async()=>{await import('/assets/enrichment-feedback.js');return typeof Today.use('enrichment-feedback').create;}),'function');
  console.log('  ✓ optional web/Trello context feedback loads from the service-worker cache offline');
  assert.equal(await page.evaluate(async()=>{await import('/assets/gmail-feedback.js');return typeof Today.use('gmail-feedback').create;}),'function');
  assert.equal(await page.evaluate(async()=>{await import('/assets/pool-wording.js');return typeof Today.use('pool-wording-ui').create;}),'function');
  assert.equal(await page.evaluate(async()=>{await import('/assets/focus-wording.js');return typeof Today.use('focus-wording-ui').create;}),'function');
  console.log('  ✓ Gmail context/wording controls load from the service-worker cache offline');

  await page.setOfflineMode(false);
  failUnknownNetwork = true;
  await page.goto(BASE + '/never-cached-route', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const fallback = await page.evaluate(() => ({
    title: document.title,
    brandedStar: document.querySelector('span.star')?.textContent === '✦',
    appAbsent: !document.getElementById('main-app'),
  }));
  assert.deepEqual(fallback, { title: 'TODAY', brandedStar: true, appAbsent: true });
  console.log('  ✓ cached app shell and branded fallback both load offline');
  console.log('✓ SERVICE WORKER TEST PASSED');
} finally {
  releaseShell();
  if (page) await page.setOfflineMode(false).catch(() => {});
  if (secondPage) await secondPage.close().catch(() => {});
  if (browser) await browser.close();
  server.close();
}
