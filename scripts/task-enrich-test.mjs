// Client and Netlify task-enrichment regression tests. No live provider calls.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(join(ROOT, '.context/phase4-15e'), { recursive:true });
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };
const require = createRequire(import.meta.url);
const { handler } = require('../netlify/functions/task-enrich.js');

let passed = 0;
const ok = message => { console.log('  ✓ ' + message); passed++; };
const assert = (condition, message, detail) => {
  if (condition) return ok(message);
  console.error('✗ FAIL — ' + message);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  throw new Error(message);
};
const event = (body, method = 'POST') => ({ httpMethod: method, body: typeof body === 'string' ? body : JSON.stringify(body) });

const oldEnvKey = process.env.ANTHROPIC_API_KEY;
const oldFetch = global.fetch;
delete process.env.ANTHROPIC_API_KEY;
try {
  const method = await handler(event({}, 'GET'));
  const invalid = await handler(event('{'));
  const noKey = await handler(event({ taskText: 'Find paint' }));
  assert(method.statusCode === 405 && invalid.statusCode === 400 && noKey.statusCode === 400,
    'function rejects wrong methods, malformed JSON, and missing keys');

  let providerRequest;
  global.fetch = async (_url, options) => {
    providerRequest = options;
    return { ok: true, json: async () => ({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({
        icon: '↗', headline: 'A'.repeat(60), body: 'B'.repeat(100),
        cta: { label: 'Reveal details', href: 'https://example.com/item' },
      }) }],
    }) };
  };
  const success = await handler(event({ taskText: 'Find paint price', apiKey: ' client-key\n' }));
  const card = JSON.parse(success.body).card;
  const sent = JSON.parse(providerRequest.body);
  assert(success.statusCode === 200 && providerRequest.headers['x-api-key'] === 'client-key'
      && sent.model === 'claude-haiku-4-5-20251001' && sent.tools[0].type === 'web_search_20250305',
    'function forwards the sanitized client key; Haiku 4.5 gets the basic web search variant it supports');
  assert(card.headline.length === 40 && card.body.length === 80 && card.cta.label.length === 10
      && card.cta.href === 'https://example.com/item',
    'provider cards are length-bounded and retain HTTPS actions', card);

  global.fetch = async () => ({ ok: true, json: async () => ({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: '{"headline":"Unsafe","cta":{"href":"http://example.com"}}' }],
  }) });
  const unsafe = JSON.parse((await handler(event({ taskText: 'Find a thing', apiKey: 'key' }))).body).card;
  assert(unsafe.headline === 'Unsafe' && unsafe.cta === null, 'function rejects non-HTTPS actions without discarding useful text', unsafe);

  global.fetch = async () => ({ ok: false, status: 500, text: async () => 'provider down' });
  const degraded = await handler(event({ taskText: 'Find a thing', apiKey: 'key' }));
  assert(degraded.statusCode === 502 && JSON.parse(degraded.body).card === undefined,
    'provider failure is reported as an error, not a "nothing found" card the client would cache', degraded);

  global.fetch = async () => ({ ok: false, status: 400, text: async () => 'tool type not supported for this model' });
  const rejected = await handler(event({ taskText: 'Find a thing', apiKey: 'key' }));
  assert(rejected.statusCode === 502, 'a rejected request (e.g. unsupported tool version) is not reported as no result', rejected);
  for (const [label, response] of [
    ['network failure', () => { throw new Error('network'); }],
    ['missing answer', async () => ({ok:true, json:async () => ({stop_reason:'end_turn',content:[]})})],
    ['malformed answer', async () => ({ok:true, json:async () => ({stop_reason:'end_turn',content:[{type:'text',text:'broken'}]})})],
  ]) {
    global.fetch = response;
    const failed = await handler(event({taskText:'Find paint',apiKey:'key'}));
    assert(failed.statusCode === 502, label + ' is retryable rather than permanently cached as no result', failed);
  }
  global.fetch = async () => ({ok:true,json:async () => ({stop_reason:'end_turn',content:[{type:'text',text:'{"card":null}'}]})});
  const empty = await handler(event({taskText:'Find paint',apiKey:'key'}));
  assert(empty.statusCode === 200 && JSON.parse(empty.body).card === null, 'explicit no-result remains cacheable');
} finally {
  global.fetch = oldFetch;
  if (oldEnvKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = oldEnvKey;
}

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
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

let browser;
try {
  const desktopInput = '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4';
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--disable-extensions', desktopInput] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => localStorage.setItem('splash_shown_at', String(Date.now())));
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._agentEnrichTask === 'function');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('addTaskBar')).opacity === '1');

  await page.evaluate(() => {
    window.__agentSeed = (id, text) => {
      manualTasks = manualTasks.filter(t => t.id !== id);
      manualTasks.push({ id, text });
      doneIds.delete(id);
    };
  });
  const renamedCache = await page.evaluate(async () => {
    __agentSeed('agent_renamed', 'Find blue paint');
    const row = document.createElement('div');
    row.className = 'task focused'; row.dataset.taskid = 'agent_renamed'; document.body.appendChild(row);
    localStorage.setItem('agent_enrichment_agent_renamed', JSON.stringify({
      v:2, state:'success', taskText:'Find white paint', fetchedAt:Date.now(),
      card:{ headline:'Old white paint', body:'Wrong task', cta:null },
    }));
    window.fetch = async () => ({ ok:true, status:200, json:async () => ({card:null}) });
    _agentRenderFocusBlock('agent_renamed', 'Find blue paint');
    const text = document.getElementById('focusAgentBlock').textContent;
    Today.use('task-enrich').closeFocus(); row.remove();
    return text;
  });
  assert(!renamedCache.includes('Old white paint'), 'renamed task does not reuse another task-text card', renamedCache);

  const client = await page.evaluate(async () => {
    const calls = [];
    localStorage.setItem('today_ai_key_claude', 'browser-key');
    localStorage.setItem('today_ai_provider', 'claude');
    window.fetch = async (_url, options = {}) => {
      calls.push(JSON.parse(options.body || '{}'));
      return { ok: true, status: 200, json: async () => ({ card: {
        icon: '↗', headline: 'Paint shop', body: 'Open until 18:00',
        cta: { label: 'Visit', href: 'https://example.com/paint' },
      } }) };
    };
    const row = document.createElement('div');
    row.className = 'task'; row.dataset.taskid = 'agent_success';
    row.innerHTML = '<span class="task-text"><span class="task-tail"></span></span>';
    document.body.appendChild(row);
    __agentSeed('agent_success', 'Find white paint replacement');
    await _agentEnrichTask('agent_success', 'Find white paint replacement');
    const cached = JSON.parse(localStorage.getItem('agent_enrichment_agent_success'));
    const indicator = row.querySelector('.agent-indicator');
    return { calls, cached, label: indicator?.getAttribute('aria-label') };
  });
  assert(client.calls.length === 1 && client.calls[0].apiKey === 'browser-key'
      && client.cached.state === 'success' && client.label === 'Web context available — start a focus session',
    'client sends its key, caches a successful card, and renders a named indicator', client);

  // BUG-116: use both real indicator owners inside the app's repaint boundary.
  // A display toggle while the arrival is playing must not restart it; after
  // completion the same toggle must not announce already-cached context again.
  const arrival = await page.evaluate(async () => {
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const app = document.getElementById('main-app');
    app.style.opacity = '1';
    const row = document.querySelector('[data-taskid="agent_success"]');
    document.getElementById('manualList').appendChild(row);
    localStorage.setItem('gmail_access_token', 'mock-access');
    localStorage.setItem('gmail_refresh_token', 'mock-refresh');
    await _gmailEnrichTask('agent_success', 'Find white paint replacement');
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(location.origin + '\0mock-refresh'));
    const connectionKey = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('gmail_enrichment_agent_success', JSON.stringify({ subject:'Synthetic context', matchPolicy:'minisearch-v1',
      taskText:'Find white paint replacement', ownerPolicy:'owner-v2', connectionKey, fetchedAt:Date.now() }));
    _agentUpdateIndicator('agent_success', true);
    _gmailUpdateIndicator('agent_success', true);
    await frame(); await frame();
    const indicators = [...row.querySelectorAll('.agent-indicator,.gmail-indicator')];
    const animations = indicators.map(el => el.getAnimations()[0]);
    if (animations.some(a => !a)) return { started: false };
    const repaint = () => { app.style.display = 'none'; void app.offsetHeight; app.style.display = ''; };
    animations.forEach(a => { a.currentTime = a.effect.getTiming().duration * 0.4; });
    const bright = indicators.every(el => Number(getComputedStyle(el).opacity) > 0.9);
    repaint(); await frame(); await frame();
    const survived = indicators.every((el, i) => el.getAnimations()[0] === animations[i]
      && animations[i].currentTime >= animations[i].effect.getTiming().duration * 0.4);
    if (!survived) return { started: true, bright, survived, samples: [] };
    await Promise.race([
      Promise.all(animations.map(a => a.finished.catch(() => {}))),
      new Promise((_, reject) => setTimeout(() => reject(new Error('arrival did not finish')), 3000)),
    ]);
    await frame();
    window._onWake();
    const samples = [];
    for (let pass = 0; pass < 3; pass++) {
      repaint(); await new Promise(resolve => setTimeout(resolve, 120));
      samples.push(...indicators.map(el => ({ opacity: Number(getComputedStyle(el).opacity), running: el.getAnimations().length })));
    }
    return { started: true, bright, survived, samples };
  });
  assert(arrival.started && arrival.bright && arrival.survived
      && arrival.samples.every(s => s.opacity === 0 && s.running === 0),
    'both enrichment arrows announce new context once and survive active and completed wake repaints', arrival);

  await page.hover('[data-taskid="agent_success"]');
  await new Promise(resolve => setTimeout(resolve, 200));
  const hover = await page.evaluate(() => [...document.querySelectorAll('[data-taskid="agent_success"] .agent-indicator,[data-taskid="agent_success"] .gmail-indicator')]
    .map(el => ({ opacity: getComputedStyle(el).opacity })));
  assert(hover.length === 2 && hover.every(h => Number(h.opacity) > 0),
    'settled enrichment arrows remain visible on desktop hover', hover);
  await page.mouse.move(0, 0);
  const restored = await page.evaluate(() => {
    _agentRestoreAllIndicators(); _gmailRestoreAllIndicators();
    return [...document.querySelectorAll('[data-taskid="agent_success"] .agent-indicator,[data-taskid="agent_success"] .gmail-indicator')]
      .every(el => el.getAnimations().length === 0);
  });
  assert(restored, 'cache restoration does not announce existing enrichment again');
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const reduced = await page.evaluate(() => {
    _agentUpdateIndicator('agent_success', true);
    _gmailUpdateIndicator('agent_success', true);
    return [...document.querySelectorAll('[data-taskid="agent_success"] .agent-indicator,[data-taskid="agent_success"] .gmail-indicator')]
      .every(el => el.getAnimations().length === 0);
  });
  assert(reduced, 'reduced motion skips enrichment arrival flashes');
  await page.emulateMediaFeatures([]);

  const noResult = await page.evaluate(async () => {
    let calls = 0;
    window.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ({ card: null }) }; };
    __agentSeed('agent_none', 'Research paint brands');
    await _agentEnrichTask('agent_none', 'Research paint brands');
    await _agentEnrichTask('agent_none', 'Research paint brands');
    return { calls, cached: JSON.parse(localStorage.getItem('agent_enrichment_agent_none')) };
  });
  assert(noResult.calls === 1 && noResult.cached.state === 'no_result',
    'no-result responses are cached and not requested repeatedly', noResult);

  const poisoned = await page.evaluate(async () => {
    let calls = 0;
    window.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ({ card: null }) }; };
    localStorage.setItem('agent_enrichment_agent_old', JSON.stringify({ state: 'no_result', card: null, fetchedAt: Date.UTC(2026, 8, 20) }));
    __agentSeed('agent_old', 'Book a table for Friday');
    await _agentEnrichTask('agent_old', 'Book a table for Friday');
    return { calls, refreshed: JSON.parse(localStorage.getItem('agent_enrichment_agent_old')).v === 3 };
  });
  assert(poisoned.calls === 1 && poisoned.refreshed,
    'no-result entries written while every lookup failed (before v2.90.52) are retried once', poisoned);

  const transient = await page.evaluate(async () => {
    let calls = 0;
    window.fetch = async () => { calls++; return { ok: false, status: 503, json: async () => ({}) }; };
    __agentSeed('agent_retry', 'Find paint hours');
    await _agentEnrichTask('agent_retry', 'Find paint hours');
    await _agentEnrichTask('agent_retry', 'Find paint hours');
    return { calls, cached: localStorage.getItem('agent_enrichment_agent_retry') };
  });
  assert(transient.calls === 2 && transient.cached === null,
    'transient failures remain retryable and are not cached', transient);

  const plainCalls = await page.evaluate(async () => {
    let calls = 0;
    window.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ({ card: null }) }; };
    __agentSeed('agent_plain', 'Buy milk');
    await _agentEnrichTask('agent_plain', 'Buy milk');
    return calls;
  });
  assert(plainCalls === 0, 'plain tasks do not trigger enrichment requests', plainCalls);

  const deadline=await page.evaluate(async()=>{
    __agentSeed('agent_deadline','Find paint');
    const native=window.setTimeout; let calls=0;
    window.setTimeout=(fn,ms,...args)=>native(fn,ms===26000?10:ms,...args);
    try {
      window.fetch=async (_url,{signal})=>{
        calls++;
        return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));
      };
      await _agentEnrichTask('agent_deadline','Find paint');
      const absent=!localStorage.getItem('agent_enrichment_agent_deadline');
      window.fetch=async()=>{calls++;return {ok:true,status:200,json:async()=>({card:null})};};
      await _agentEnrichTask('agent_deadline','Find paint');
      return {absent,calls,state:JSON.parse(localStorage.getItem('agent_enrichment_agent_deadline')).state};
    } finally {window.setTimeout=native;}
  });
  assert(deadline.absent && deadline.calls===2 && deadline.state==='no_result',
    'a hanging lookup aborts at its client deadline, leaves no false cache and can be explicitly retried',deadline);

  const ownership = await page.evaluate(async () => {
    const card = { headline:'Current context', body:'Verified fixture', cta:{label:'Visit',href:'https://example.com/current'} };
    const results = [];
    for (const change of ['rename','delete','board','credential','adopted-cache']) {
      const id = 'race_' + change;
      __agentSeed(id, 'Find current paint');
      let release;
      window.fetch = async () => ({ok:true,status:200,json:() => new Promise(resolve => { release = () => resolve({card}); })});
      const request = _agentEnrichTask(id, 'Find current paint');
      await Promise.resolve(); await Promise.resolve();
      if (change === 'rename') __agentSeed(id, 'Find different paint');
      if (change === 'delete') manualTasks = manualTasks.filter(t => t.id !== id);
      if (change === 'board') { localStorage.setItem('trello_token','fictional-token'); localStorage.setItem('trello_config',JSON.stringify({boardId:'new-board'})); }
      if (change === 'credential') localStorage.setItem('today_ai_key_claude','rotated');
      if (change === 'adopted-cache') localStorage.setItem('agent_enrichment_' + id, 'adopted');
      release(); await request;
      results.push({change, cached:localStorage.getItem('agent_enrichment_' + id)});
      localStorage.removeItem('trello_token'); localStorage.removeItem('trello_config');
      localStorage.setItem('today_ai_key_claude','browser-key');
      localStorage.removeItem('agent_enrichment_' + id);
    }
    let calls = 0; const releases = [];
    const id = 'race_replacement'; __agentSeed(id, 'Find first paint');
    window.fetch = async () => { calls++; return {ok:true,status:200,json:() => new Promise(resolve => releases.push(() => resolve({card}))) }; };
    const old = _agentEnrichTask(id, 'Find first paint'); await Promise.resolve(); await Promise.resolve();
    __agentSeed(id, 'Find second paint');
    const next = _agentEnrichTask(id, 'Find second paint'); await Promise.resolve(); await Promise.resolve();
    releases[0](); await old;
    const shared = _agentEnrichTask(id, 'Find second paint');
    releases[1](); await next; await shared;
    return {results,calls,replacement:JSON.parse(localStorage.getItem('agent_enrichment_' + id))};
  });
  assert(ownership.results.every(r => r.cached === (r.change === 'adopted-cache' ? 'adopted' : null)),
    'late bodies cannot save after rename, deletion, board/key change or adopted cache', ownership);
  assert(ownership.calls === 2 && ownership.replacement.taskText === 'Find second paint',
    'replacement requests survive old completion and share only their own matching in-flight work', ownership);

  const cacheRules = await page.evaluate(async () => {
    const id='cache_rules', text='Find paint'; __agentSeed(id,text);
    const key='agent_enrichment_'+id;
    const entry={v:3,state:'success',taskText:text,boardId:'',card:{headline:'Paint shop',body:'Open now',cta:null},fetchedAt:Date.now()};
    const rejected=[];
    for (const [label, value] of [
      ['old policy',{...entry,v:2}], ['different text',{...entry,taskText:'Find old paint'}],
      ['different board',{...entry,boardId:'old-board'}], ['expired',{...entry,fetchedAt:Date.now()-31*86400000}],
    ]) {
      localStorage.setItem(key,JSON.stringify(value)); _agentCleanupCache();
      rejected.push({label,removed:!localStorage.getItem(key)});
    }
    for (let i=0;i<65;i++) {
      __agentSeed('cap_'+i,'Find paint');
      localStorage.setItem('agent_enrichment_cap_'+i,JSON.stringify({...entry,fetchedAt:Date.now()-i}));
    }
    _agentCleanupCache();
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('agent_enrichment_'));
    const bounded=keys.length<=60 && keys.reduce((n,k)=>n+k.length+localStorage.getItem(k).length,0)<=200000;
    return {rejected,bounded,count:keys.length};
  });
  assert(cacheRules.rejected.every(r=>r.removed) && cacheRules.bounded,
    'policy/text/source/expiry invalidate caches and total local retention stays bounded',cacheRules);

  const zoneRetention=await page.evaluate(async()=>{
    const id='agent_zone_owner',text='Find paint';__agentSeed(id,text);
    const key='agent_enrichment_'+id;
    localStorage.setItem(key,JSON.stringify({v:3,state:'hidden',taskText:text,boardId:'',fetchedAt:Date.now(),
      card:{headline:'Hidden card',body:'Fixture',cta:null}}));
    Today.use('connections').renderManual();
    Today.use('zones').moveToSoon(id);
    await Promise.resolve();
    const soon=!!localStorage.getItem(key);
    Today.use('zones').pullFromSoon(id);
    Today.use('zones').moveToPast(id);
    await Promise.resolve();
    const past=!!localStorage.getItem(key);
    Today.use('zones').reviveFromPast(id);
    await Promise.resolve();
    Today.use('zones').pullFromSoon(id);
    await Promise.resolve();
    const returned=JSON.parse(localStorage.getItem(key))?.state==='hidden';
    manualTasks=manualTasks.filter(t=>t.id!==id);_saveManual();
    await Promise.resolve();
    return {soon,past,returned,deleted:!localStorage.getItem(key)};
  });
  assert(Object.values(zoneRetention).every(Boolean),
    'unchanged owner keeps its exact-card hide through Soon/Past/return; true deletion clears it',zoneRetention);

  // Exercise the actual focus component, delegated controls and shortcut after hide.
  await page.evaluate(async () => {
    manualTasks=[]; doneIds.clear(); _agentCleanupCache();
    __agentSeed('manual_agent_focus','Find white paint');
    window.__enrichCalls=0;
    window.fetch=async () => { __enrichCalls++; return {ok:true,status:200,json:async () => ({card:{
      icon:'↗',headline:'Paint shop',body:'Open until 18:00',cta:{label:'Visit',href:'https://example.com/paint'},
    }})}; };
    await _agentEnrichTask('manual_agent_focus','Find white paint');
    Today.use('connections').renderManual();
  });
  await page.click('[data-taskid="manual_agent_focus"] .task-text');
  await page.waitForFunction(()=>!document.getElementById('focusAgentBlock').hidden);
  await new Promise(resolve=>setTimeout(resolve,350));
  await page.screenshot({path:join(ROOT,'.context/phase4-15e/focus-before-hide.png')});
  await (await page.$('#focusAgentBlock')).screenshot({path:join(ROOT,'.context/phase4-15e/enrichment-card.png')});
  await page.addScriptTag({content:await readFile(join(ROOT,'scripts/node_modules/axe-core/axe.min.js'),'utf8')});
  const cardA11y=await page.evaluate(async()=>{
    const result=await axe.run(document.getElementById('focusAgentBlock'),{
      runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']},
    });
    return result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));
  });
  assert(!cardA11y.length,'populated context card and controls pass WCAG A/AA axe checks',cardA11y);

  const hideButton = await page.$('#focusAgentBlock .focus-agent-feedback');
  await hideButton.focus(); await page.keyboard.press('Enter');
  const hidden = await page.evaluate(()=>({
    text:document.getElementById('focusAgentBlock').textContent,
    noLink:!document.querySelector('#focusAgentBlock a'),
    noArrow:!document.querySelector('[data-taskid="manual_agent_focus"] .agent-indicator'),
    stored:JSON.parse(localStorage.getItem('agent_enrichment_manual_agent_focus')).state==='hidden',
    noTimestamp:!Object.hasOwn(JSON.parse(localStorage.getItem('agent_enrichment_manual_agent_focus')),'hiddenAt'),
    state:JSON.parse(localStorage.getItem('agent_enrichment_manual_agent_focus')).state,
    focused:document.activeElement.textContent.slice(0,100), calls:__enrichCalls,
    ask:document.querySelector('.focus-ai-timer-btn').getAttribute('aria-label'),
  }));
  assert(hidden.noLink && hidden.noArrow && hidden.stored && hidden.focused==='undo'
    && hidden.ask==='Ask for focus help' && hidden.calls===1 && hidden.state==='hidden' && hidden.noTimestamp,
    'keyboard hide withholds the exact card, removes source shortcut/arrow, restores Ask and focuses Undo without a call',hidden);
  const interleaved=await page.evaluate(()=>{
    const undo=document.activeElement;
    Today.use('connections').renderManual();
    window.dispatchEvent(new StorageEvent('storage',{key:'agent_enrichment_manual_agent_focus'}));
    return {same:document.activeElement===undo, label:document.activeElement.textContent.slice(0,100),
      name:document.activeElement.getAttribute('aria-label')};
  });
  assert(interleaved.same && interleaved.label==='undo' && interleaved.name.toLowerCase().includes('undo'),
    'background list/storage refresh preserves the live Undo node, keyboard focus and label-in-name',interleaved);
  await page.screenshot({path:join(ROOT,'.context/phase4-15e/focus-hidden.png')});
  await page.keyboard.press('Enter');
  const undo = await page.evaluate(()=>({
    link:!!document.querySelector('#focusAgentBlock a'),hidden:JSON.parse(localStorage.getItem('agent_enrichment_manual_agent_focus')).hiddenAt,
    calls:__enrichCalls, focus:document.activeElement.textContent,
  }));
  assert(undo.link && !undo.hidden && undo.calls===1 && undo.focus==='not useful', 'Undo restores the same card and indicator without a request',undo);
  await page.click('#focusAgentBlock .focus-agent-feedback');
  await page.keyboard.press('Escape');
  await new Promise(resolve=>setTimeout(resolve,250));
  await page.click('[data-taskid="manual_agent_focus"] .task-text');
  const reopened = await page.evaluate(()=>({
    button:document.querySelector('#focusAgentBlock button')?.textContent,
    link:!!document.querySelector('#focusAgentBlock a'),calls:__enrichCalls,
  }));
  assert(reopened.button==='show context' && !reopened.link && reopened.calls===1,
    'a later focus visit keeps the exact card hidden and offers a persistent clear action',reopened);
  const stateOnly=await page.evaluate(()=>{
    const key='agent_enrichment_manual_agent_focus',entry=JSON.parse(localStorage.getItem(key));
    delete entry.hiddenAt; localStorage.setItem(key,JSON.stringify(entry));
    _agentRenderFocusBlock('manual_agent_focus','Find white paint');
    _agentUpdateIndicator('manual_agent_focus');
    return {noLink:!document.querySelector('#focusAgentBlock a'),
      noArrow:!document.querySelector('[data-taskid="manual_agent_focus"] .agent-indicator'),
      button:document.querySelector('#focusAgentBlock button')?.textContent};
  });
  assert(stateOnly.noLink && stateOnly.noArrow && stateOnly.button==='show context',
    'hidden state remains authoritative when optional hiddenAt metadata is absent',stateOnly);
  await page.focus('#focusAgentBlock .focus-agent-feedback');
  await page.keyboard.press('Space');
  const restoredBySpace=await page.evaluate(()=>({
    link:!!document.querySelector('#focusAgentBlock a'),
    hidden:!!JSON.parse(localStorage.getItem('agent_enrichment_manual_agent_focus')).hiddenAt,
    session:JSON.parse(localStorage.getItem('today_focus_session')),
  }));
  assert(restoredBySpace.link && !restoredBySpace.hidden && restoredBySpace.session,
    'Space activates the restore control without toggling or exiting the timer',restoredBySpace);
  // At 320px, test the existing component geometry without changing desktop-only Focus eligibility.
  await page.setViewport({width:320,height:780});
  const narrow = await page.evaluate(()=>{
    const block=document.getElementById('focusAgentBlock'), b=block.getBoundingClientRect();
    return {blockWidth:b.width,overflow:block.scrollWidth>block.clientWidth,
      labels:[...block.querySelectorAll('a,button')].map(el=>el.getAttribute('aria-label')||el.textContent),
      buttonHeight:block.querySelector('button').getBoundingClientRect().height};
  });
  await new Promise(resolve=>setTimeout(resolve,350));
  await page.screenshot({path:join(ROOT,'.context/phase4-15e/focus-320.png')});
  assert(!narrow.overflow && narrow.buttonHeight>=24 && narrow.labels.every(Boolean), 'card controls wrap at 320px with named keyboard targets',narrow);
  const longWrap=await page.evaluate(()=>{
    const key='agent_enrichment_manual_agent_focus', entry=JSON.parse(localStorage.getItem(key));
    entry.card.headline='W'.repeat(40); entry.card.body='W'.repeat(80);
    localStorage.setItem(key,JSON.stringify(entry));
    _agentRenderFocusBlock('manual_agent_focus','Find white paint');
    const block=document.getElementById('focusAgentBlock');
    return block.scrollWidth<=block.clientWidth;
  });
  assert(longWrap,'maximum unbroken card text wraps inside the 320px component');
  const mailPriority=await page.evaluate(()=>{
    const mail=document.getElementById('focusGmailBlock');
    mail.hidden=false; mail.innerHTML='<button class="focus-gmail-draft-btn">Draft reply</button>';
    _agentRenderFocusBlock('manual_agent_focus','Find white paint');
    document.querySelector('#focusAgentBlock .focus-agent-feedback').click();
    const label=document.querySelector('.focus-ai-timer-btn').textContent;
    mail.hidden=true; mail.innerHTML='';
    document.querySelector('#focusAgentBlock .focus-agent-feedback').click();
    return label;
  });
  assert(mailPriority.includes('draft reply'),'card hiding preserves the existing Gmail draft shortcut priority',mailPriority);
  const exactCard=await page.evaluate(()=>{
    const button=document.querySelector('#focusAgentBlock .focus-agent-feedback');
    const key='agent_enrichment_manual_agent_focus',entry=JSON.parse(localStorage.getItem(key));
    entry.card.headline='Newer card';entry.fetchedAt++;
    localStorage.setItem(key,JSON.stringify(entry));
    button.click();
    const untouched=JSON.parse(localStorage.getItem(key)).state==='success';
    window.dispatchEvent(new StorageEvent('storage',{key}));
    return {untouched,shown:document.getElementById('focusAgentBlock').textContent.includes('Newer card')};
  });
  assert(exactCard.untouched && exactCard.shown,'a stale displayed-card action cannot hide a newer cache result',exactCard);
  await page.setViewport({width:800,height:900});
  await page.keyboard.press('Escape'); await new Promise(resolve=>setTimeout(resolve,250));
  const lateView = await page.evaluate(async()=>{
    localStorage.removeItem('agent_enrichment_manual_agent_focus');
    let release;
    window.fetch=async()=>({ok:true,status:200,json:()=>new Promise(resolve=>{release=()=>resolve({card:{headline:'Late context'}});})});
    window.__releaseAgent=()=>release();
  });
  await page.click('[data-taskid="manual_agent_focus"] .task-text');
  await page.waitForFunction(()=>typeof window.__releaseAgent==='function');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>__releaseAgent());
  await new Promise(resolve=>setTimeout(resolve,250));
  const lateHidden=await page.evaluate(()=>{
    const block=document.getElementById('focusAgentBlock');
    return block.hidden && !block.textContent;
  });
  assert(lateHidden,'late focus delivery after Escape cannot repaint or resurrect the closed block');

  console.log(`\nTask-enrichment tests passed (${passed} checks).`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
