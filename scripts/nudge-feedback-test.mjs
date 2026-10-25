// Real startup + UI/wake integration. Never calls checkDayNudge, _onWake,
// _setMemoryReady or renderInfoStats to manufacture delivery. Fictional input only.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LINE = 'Choosing a library book leaves the choice of what comes next with you.';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://fixture').pathname);
    res.setHeader('Content-Type', MIME[extname(path)] || 'text/html');
    res.end(await readFile(join(ROOT, path === '/' ? 'index.html' : path)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;

async function fixture(mobile, { hour = 9, seed = {}, expectRequests = 1, feedbackHelper = 'normal' } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  await page.setViewport(mobile
    ? { width:390, height:844, isMobile:true, hasTouch:true }
    : { width:1200, height:900 });
  await page.emulateMediaFeatures([{ name:'prefers-reduced-motion', value:'reduce' }]);
  await page.evaluateOnNewDocument(({ hour, seed }) => {
    const NativeDate = Date;
    let now = Number(sessionStorage.getItem('delivery_fixture_now')) || new NativeDate(2026, 9, 18, hour, 0).getTime();
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    };
    window.__advance = ms => { now += ms; sessionStorage.setItem('delivery_fixture_now', String(now)); };
    // Poem rendering has its own rollover suite; keep this multi-day feedback fixture focused.
    localStorage.setItem('splash_shown_at',String(now));
    // Observe the real post-sync startup hook; never invoke it to manufacture readiness.
    let loadDone;
    Object.defineProperty(window, '_onAppLoadDone', {
      configurable: true,
      get: () => loadDone,
      set: fn => { loadDone = (...args) => { window.__initialSyncSettled = true; return fn(...args); }; },
    });
    // Retain accepted cache/spoken/dismissal state across an actual reload.
    if (!localStorage.getItem('delivery_fixture_seeded')) {
      localStorage.clear();
      localStorage.setItem('delivery_fixture_seeded', '1');
      localStorage.setItem('splash_shown_at', String(now));
      localStorage.setItem('today_manual', JSON.stringify([{ id:'manual_' + (now - 4 * 86400000), text:'Choose a library book' }]));
      localStorage.setItem('today_done', '[]');
      localStorage.setItem('today_ai_provider', 'claude');
      localStorage.setItem('today_ai_key_claude', 'fictional-offline-key');
      for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
    }
    const nativeTimeout = window.setTimeout.bind(window);
    const nativeClear = window.clearTimeout.bind(window);
    const caps = new Map();
    // Control the 5s display deadline, not arbitrary polling/sleeps or request order.
    window.setTimeout = (fn, ms, ...args) => {
      if (ms !== 5000) return nativeTimeout(fn, ms, ...args);
      const id = nativeTimeout(() => {}, 60000);
      caps.set(id, () => fn(...args));
      return id;
    };
    window.clearTimeout = id => { caps.delete(id); nativeClear(id); };
    window.__expireDisplayWait = () => {
      if (!caps.size) throw Error('No display deadline scheduled');
      for (const [id, fn] of [...caps]) { caps.delete(id); nativeClear(id); fn(); }
    };
    window.__dailyRequests = [];
    const realFetch = window.fetch.bind(window);
    window.fetch = (url, options) => {
      if (!String(url).includes('/.netlify/functions/ai-assist')) return realFetch(url, options);
      const body = JSON.parse(options.body);
      if (body.surface !== 'daily-nudge') return Promise.resolve({ ok:true, json:async () => ({ content:'none' }) });
      return new Promise((resolve, reject) => {
        window.__dailyRequests.push({ body, resolve });
        const automatic=sessionStorage.getItem('feedback_fixture_reply');
        if(automatic) resolve({ok:true,json:async()=>({content:automatic})});
        options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once:true });
      });
    };
    window.__reply = text => {
      const request = window.__dailyRequests.at(-1);
      if (!request) throw Error('No real startup request');
      request.resolve({ ok:true, json:async () => ({ content:text }) });
    };
    window.__replyHeaders = () => window.__dailyRequests.at(-1).resolve({ ok:true,
      json:() => new Promise(resolve => { window.__replyBody = text => resolve({ content:text }); }) });
  }, { hour, seed });
  if (feedbackHelper !== 'normal') {
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!request.url().endsWith('/assets/feedback-policy.js')) return void request.continue();
      if (feedbackHelper === 'missing') void request.respond({ status:404,body:'' });
      if (feedbackHelper === 'broken') void request.respond({status:200,contentType:'text/javascript',
        body:"Today.define('feedback-policy',{taskReadingFeedback(){throw Error('Fictional unavailable context');},feedbackText(){return '';}});"});
      // In the hanging case leave the import pending until the isolated context closes.
    });
  }
  await page.goto(base, { waitUntil:'load' });
  await page.waitForFunction(count => _appReady && window.__initialSyncSettled
    && window.__dailyRequests.length === count, { timeout: 5000 }, expectRequests);
  return { context, page, errors };
}

async function state(page) {
  return page.evaluate(() => {
    const date = _localISO();
    const strip = document.getElementById('dayNudge');
    const about = document.getElementById('todayNudgeBlock');
    return { text:strip.querySelector('.nudge-text')?.textContent || '',
      shown:strip.classList.contains('show'), visible:strip.classList.contains('visible'),
      about:about.textContent, aboutShown:about.style.display !== 'none',
      cached:localStorage.getItem('day_nudge_ai_' + date),
      spoken:appMemory.spokenLines.filter(line => line.surface === 'morning nudge' && line.date === date).map(line => line.text),
      calls:window.__dailyRequests.length,
      feedback:!!document.querySelector('#dayNudgeReact [data-react="landed"]') };
  });
}
async function resolve(page) {
  await page.evaluate(line => window.__reply(line), LINE);
  try { await page.waitForFunction(line => localStorage.getItem('day_nudge_ai_' + _localISO()) === line, {timeout:5000}, LINE); }
  catch (_) { throw Error('Feedback fixture response did not settle: '+JSON.stringify(await page.evaluate(()=>({date:_localISO(),audit:Today.use('nudge').generationAudit(),calls:__dailyRequests.length,cached:localStorage.getItem('day_nudge_ai_'+_localISO())})))); }
}

try {
  browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'new',args:['--no-first-run','--disable-extensions'],pipe:true});
  let initialMemory;
  // Natural generation consumes persisted reactions; a vote never rewrites today.
  for (const mobile of [false, true]) {
    const { context, page, errors } = await fixture(mobile);
    try {
      await resolve(page);
      initialMemory=await page.evaluate(()=>JSON.parse(localStorage.getItem('today_memory')));
      await page.waitForFunction(line => document.querySelector('#dayNudge .nudge-text')?.textContent === line, {}, LINE);
      await page.click('#dayNudge');
      await page.click('#dayNudgeReact [data-react="landed"]');
      assert.equal(await page.evaluate(() => __dailyRequests.length), 1, 'voting does not request a replacement');
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('today_memory')).spokenLines.find(r => r.surface === 'morning nudge').reaction), 'landed');
      assert.equal((await state(page)).cached, LINE, 'an accepted sentence survives its vote');
      await page.evaluate(line => {sessionStorage.setItem('feedback_fixture_reply',line);__advance(86400000);},LINE);
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(() => _appReady && __initialSyncSettled && __dailyRequests.length === 1);
      const request = () => page.evaluate(() => __dailyRequests[0].body.messages[0].content);
      let sent = await request();
      assert.ok(sent.includes('Recent morning lines the person marked "landed":\n- '+LINE), 'next morning automatically labels the saved positive');
      assert.ok(sent.includes('do not repeat their angle') && !sent.includes('A missed reading does not reject its task'), 'existing writing instruction stays fixed');
      await resolve(page);
      // A newer revision from another device is adopted through the real merge path.
      await page.evaluate(() => {
        const previous=appMemory.spokenLines.find(r=>r.surface==='morning nudge'&&r.date==='2026-10-18');
        mergeRemoteData({manual_tasks:manualTasks,done_ids:[...doneIds],deleted_ids:[],unchecked_ids:[],checked_ids:[],soon_tasks:[],past_tasks:[],habits:[],
          memory:{spokenLines:[{...previous,reaction:'missed',reactedAt:new Date(Date.now()+1000).toISOString()}]}});
      });
      assert.equal(await page.evaluate(() => __dailyRequests.length), 1, 'synced revision does not regenerate an accepted line');
      await page.evaluate(() => __advance(86400000));
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(() => _appReady && __initialSyncSettled && __dailyRequests.length === 1);
      sent = await request();
      assert.ok(sent.includes('Recent morning lines the person marked "not really":\n- '+LINE), 'a synced revision steers the next generation');
      assert.ok(!sent.includes('Recent morning lines the person marked "landed":'), 'the former positive is not retained as a positive');
      await resolve(page);
      await page.evaluate(() => {
        const previous=appMemory.spokenLines.find(r=>r.surface==='morning nudge'&&r.date==='2026-10-18');
        const cleared={...previous,reactedAt:new Date(Date.now()+1000).toISOString()};delete cleared.reaction;
        mergeRemoteData({manual_tasks:manualTasks,done_ids:[...doneIds],deleted_ids:[],unchecked_ids:[],checked_ids:[],soon_tasks:[],past_tasks:[],habits:[],memory:{spokenLines:[cleared]}});
      });
      assert.equal(await page.evaluate(() => __dailyRequests.length), 1);
      await page.evaluate(() => __advance(86400000));
      await page.reload({waitUntil:'load'});
      await page.waitForFunction(() => _appReady && __initialSyncSettled && __dailyRequests.length === 1);
      sent = await request();
      assert.ok(!sent.includes('Recent morning lines the person marked'), 'a newer cleared vote disappears from both labelled groups');
      await resolve(page);
      assert.deepEqual(errors,[]);
      console.log(`  ✓ ${mobile?'mobile':'desktop'} automatic feedback cycle: vote, next day, synced revision and clear; accepted lines retained`);
    } finally { await context.close(); }
  }
  for (const feedbackHelper of ['missing','hanging','broken']) {
    const memory={...initialMemory,spokenLines:[
      ...['2026-10-17','2026-10-16','2026-10-15'].map((date,i)=>({surface:'morning nudge',date,text:'Fictional miss '+i,reaction:'missed'})),
      {surface:'morning nudge',date:'2026-10-17',text:'Fictional landed reading',reaction:'landed'},
    ]};
    const {context,page,errors}=await fixture(false,{feedbackHelper,seed:{today_memory:JSON.stringify(memory)}});
    try {
      await resolve(page);
      await page.waitForFunction(line=>localStorage.getItem('day_nudge_ai_'+_localISO())===line,{},LINE);
      assert.equal(await page.evaluate(()=>__dailyRequests.length),1,'helper failure does not add an AI call');
      const sent=await page.evaluate(()=>__dailyRequests[0].body.messages[0].content);
      const misses=sent.split('Recent morning lines the person marked "not really":\n')[1]?.split('\n\n')[0] || '';
      for(let i=0;i<3;i++)assert.ok(misses.includes('Fictional miss '+i),'fallback retains the legacy recent misses');
      assert.ok(!sent.includes('Recent morning lines the person marked "landed":'),'unavailable helper uses the legacy context');
      assert.deepEqual(errors,[]);
      console.log(`  ✓ ${feedbackHelper} feedback helper: ordinary generation survives`);
    } finally {await context.close();}
  }
  console.log('Automatic nudge feedback cycle and helper-failure checks passed. Fictional data; no live model calls.');
} finally {
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
