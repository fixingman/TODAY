import { installFixtureClock, waitForAppReady } from './browser-fixture.mjs';
// TODAY — day-lifecycle module regression test
//
// Tests: applyNewDayCleanup (first-open guard, same-day guard, done→PAST graduation,
//        BUG-055 cross-device timestamp, BUG-063 midnight focus snapshot, streak+,
//        streak break, tombstone purge, SOON→PAST aging, triage first-open sync,
//        delayed backup), static wiring.
//
// Run from repo root:
//   node scripts/day-lifecycle-test.mjs --pre-extraction
//   node scripts/day-lifecycle-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const FIXTURE_NOW = new Date(2026,9,28,12).getTime();
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
  if (!d) d = new Date(FIXTURE_NOW);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const TODAY_ISO        = localISO();
const TODAY_DS         = new Date(FIXTURE_NOW).toDateString();  // _getAppDay() format for stat_last_visit
const YESTERDAY        = new Date(FIXTURE_NOW - DAY_MS);
const YESTERDAY_ISO    = localISO(YESTERDAY);
const YESTERDAY_DS     = YESTERDAY.toDateString();
const TWODAYS_DS       = new Date(FIXTURE_NOW - 2 * DAY_MS).toDateString();
const DAYS_8_AGO_ISO   = new Date(FIXTURE_NOW -  8 * DAY_MS).toISOString();
const DAYS_31_AGO_ISO  = new Date(FIXTURE_NOW - 31 * DAY_MS).toISOString();
const NOW_ISO          = new Date(FIXTURE_NOW).toISOString();

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
  await installFixtureClock(page,FIXTURE_NOW);
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

    // A real day rollover must clear yesterday's triage dismissal.
    {
      const { page, errors } = await openPage({
        extraSeed: { triage_dismissed: YESTERDAY_DS },
      });
      const r = await page.evaluate(({ yesterdayDs }) => {
        localStorage.setItem('stat_last_visit', yesterdayDs);
        applyNewDayCleanup();
        return {
          oldDismissalCleared: localStorage.getItem('triage_dismissed') === null,
          triageAvailableToday: triageDismissedToday === false,
        };
      }, { yesterdayDs: YESTERDAY_DS });
      await expectAll('yesterday triage dismissal clears', { ...r, noErrors: !errors.length });
      ok('yesterday triage dismissal clears on a genuine day rollover');
      await page.close();
    }

    // Cold start on a second device: pull today's dismissal, run yesterday's
    // local cleanup, then upload. The dismissal must survive every stage.
    {
      const page = await browser.newPage();
  await installFixtureClock(page,FIXTURE_NOW);
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.evaluateOnNewDocument(({ yesterdayDs, todayDs }) => {
        localStorage.clear();
        localStorage.setItem('splash_shown_at', String(Date.now()));
        localStorage.setItem('stat_last_visit', yesterdayDs);
        localStorage.setItem('today_manual', JSON.stringify([{ id: 'manual_triage_sync', text: 'Carryover task' }]));
        localStorage.setItem('dropbox_token', 'mock-token');
        window.__triageSyncUploads = [];
        const realFetch = window.fetch.bind(window);
        window.fetch = (input, options) => {
          const url = String(input);
          if (url.endsWith('/2/files/download')) {
            return Promise.resolve(new Response(JSON.stringify({
              manual_tasks: [{ id: 'manual_triage_sync', text: 'Carryover task' }],
              done_ids: [], deleted_ids: [], unchecked_ids: [], checked_ids: [],
              soon_tasks: [], past_tasks: [], habits: [],
              triage_dismissed: todayDs,
            }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
          }
          if (url.endsWith('/2/files/upload')) {
            window.__triageSyncUploads.push(JSON.parse(options.body));
            return Promise.resolve(new Response(JSON.stringify({ rev: 'mock-rev-2' }), { status: 200 }));
          }
          if (url.endsWith('/2/files/get_metadata')) {
            return Promise.resolve(new Response(JSON.stringify({ rev: 'mock-rev-1' }), { status: 200 }));
          }
          return realFetch(input, options);
        };
        Date.prototype.getHours = function() { return 21; };
      }, { yesterdayDs: YESTERDAY_DS, todayDs: TODAY_DS });
      await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForFunction(() =>
        localStorage.getItem('stat_last_visit') === new Date().toDateString()
        && window.__triageSyncUploads?.length > 0,
      { timeout: 15000 });
      const r = await page.evaluate(async ({ todayDs }) => {
        const triage = Today.use('triage');
        triage.setBarSilent(false);
        triage.checkTriageBar();
        // Reproduce a reveal queued before the incoming dismissal, then delivered
        // after it. A superseded animation frame must not resurrect the prompt.
        const realFrame = window.requestAnimationFrame;
        let queuedReveal;
        window.requestAnimationFrame = callback => { queuedReveal = callback; return 0; };
        try {
          triageDismissedToday = false;
          triage.checkTriageBar();
          triageDismissedToday = true;
          triage.checkTriageBar();
          queuedReveal?.();
        } finally { window.requestAnimationFrame = realFrame; }
        await new Promise(requestAnimationFrame);
        return {
          revealQueued: !!queuedReveal,
          dismissalKept: localStorage.getItem('triage_dismissed') === todayDs,
          inMemoryDismissed: triageDismissedToday === true,
          promptHidden: !document.getElementById('triageBar').classList.contains('visible'),
          allUploadsKeepDismissal: window.__triageSyncUploads.every(data => data.triage_dismissed === todayDs),
        };
      }, { todayDs: TODAY_DS });
      await expectAll('cold-start triage dismissal survives cleanup and backup', { ...r, noErrors: !errors.length });
      ok('second-device first open keeps today’s triage dismissal through cleanup and upload');
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

    // Friday-to-Saturday, two isolated devices: stale synced history must not
    // consume the working device's counter, and replay must not erase the repair.
    {
      const friday='2026-11-20',fridayDs=new Date(2026,10,20,12).toDateString();
      const saturday=new Date(2026,10,21,12).getTime(),saturdayDs=new Date(saturday).toDateString();
      const contexts=[await browser.createBrowserContext(),await browser.createBrowserContext()];
      const devices=[];
      try {
        for(const [index,context] of contexts.entries()){
          const page=await context.newPage(),errors=[];
          page.on('pageerror',error=>errors.push(error.message));
          await installFixtureClock(page,saturday);
          await page.evaluateOnNewDocument(({fridayDs,saturdayDs,minutes})=>{
            localStorage.setItem('stat_last_visit',saturdayDs);
            localStorage.setItem('stat_focus_mins_date',fridayDs);
            localStorage.setItem('stat_focus_mins_today',String(minutes));
            localStorage.setItem('splash_shown_at',String(Date.now()));
          },{fridayDs,saturdayDs,minutes:index===0?90:0});
          await page.goto(URL_BASE,{waitUntil:'domcontentloaded',timeout:15000});
          await waitForAppReady(page,{label:'Friday history device '+index});
          devices.push({page,errors});
        }
        const [working,other]=devices;
        const stale=await other.page.evaluate(({friday,fridayDs})=>{
          localStorage.setItem('stat_last_visit',fridayDs);applyNewDayCleanup();
          const daily=safeJSON('today_daily_history',[]);
          return {daily_history:daily,stat_focus_mins_today:localStorage.getItem('stat_focus_mins_today'),
            stat_focus_mins_date:localStorage.getItem('stat_focus_mins_date')};
        },{friday,fridayDs});
        await expectAll('second device banks the partial Friday row',{
          zeroFriday:stale.daily_history.find(row=>row.date===friday)?.focusMins===0,
          isolated:await working.page.evaluate(()=>safeJSON('today_daily_history',[]).length===0),
        });
        const outgoing=await working.page.evaluate(({stale,friday,fridayDs})=>{
          mergeRemoteData(stale);
          const syncedZero=stale.daily_history.find(row=>row.date===friday)?.focusMins===0;
          localStorage.setItem('stat_last_visit',fridayDs);applyNewDayCleanup();
          const history=safeJSON('today_daily_history',[]),row=history.find(row=>row.date===friday);
          return {syncedZero,retained:row?.focusMins===90,
            reset:localStorage.getItem('stat_focus_mins_today')==='0',history};
        },{stale,friday,fridayDs});
        await expectAll('Friday focus survives real sync then rollover',{
          syncedPartial:outgoing.syncedZero,retained:outgoing.retained,todayReset:outgoing.reset,
        });
        await other.page.evaluate(history=>mergeRemoteData({daily_history:history}),outgoing.history);
        await working.page.evaluate(stale=>mergeRemoteData(stale),stale);
        for(const [index,{page,errors}] of devices.entries()){
          const result=await page.evaluate(({friday})=>{
            applyNewDayCleanup();Today.use('sidebar').open('about');
            const dates=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);dates.push(_localISO(d));}
            const rows=safeJSON('today_daily_history',[]),matches=rows.filter(row=>row.date===friday);
            const col=document.querySelectorAll('#weekGrid .week-col')[dates.indexOf(friday)];
            return {exactMinutes:matches[0]?.focusMins===90,oneRow:matches.length===1,
              aboutShowsFriday:col?.querySelector('.week-col-day')?.textContent==='F'
                &&col.querySelector('.week-col-focus')?.textContent==='1h 30m',
              noCarryover:localStorage.getItem('stat_focus_mins_today')==='0'};
          },{friday});
          await expectAll('Friday history converges and resists stale replay on device '+index,{...result,noErrors:errors.length===0});
        }
        ok('Friday focus survives two-device sync, rollover and stale replay; both About grids show 1h 30m');
      }finally{for(const context of contexts)await context.close();}
    }

    // Shared fictional Dropbox, real focus-session restoration, upload, cold
    // start, rollover, stale replay and reload. No seeded history after boot.
    for (const writerRollsFirst of [false,true]) {
      const contexts=[await browser.createBrowserContext(),await browser.createBrowserContext()];
      let cloud=null,rev=0;
      const friday=new Date(2026,10,27,18).getTime(),saturday=new Date(2026,10,28,12).getTime();
      const pages=[],errors=[];
      const boot=async(context,epoch,writer)=>{
        const page=await context.newPage();pages.push(page);
        page.on('pageerror',e=>errors.push(e.message));
        await page.exposeFunction('__focusCloud',(url,body)=>{
          if(url.endsWith('/2/files/upload')){cloud=JSON.parse(body);return {body:JSON.stringify({rev:'focus-'+ ++rev})};}
          if(url.endsWith('/2/files/get_metadata'))return {body:JSON.stringify({rev:'focus-'+rev})};
          if(url.endsWith('/2/files/download'))return cloud?{body:JSON.stringify(cloud),headers:{'Dropbox-API-Result':JSON.stringify({rev:'focus-'+rev})}}:{status:409,body:'{}'};
          throw new Error('Unexpected fictional focus request');
        });
        await page.evaluateOnNewDocument(({epoch,writer})=>{
          const NativeDate=Date;let origin=Number(localStorage.getItem('__focus_fixture_clock')||epoch)-performance.now();
          class Clock extends NativeDate {
            constructor(...args){super(...(args.length?args:[origin+performance.now()]));}
            static now(){return Math.floor(origin+performance.now());}
          }
          window.Date=Clock;
          window.__focusJump=next=>{origin=next-performance.now();localStorage.setItem('__focus_fixture_clock',String(next));};
          if(!localStorage.getItem('__focus_fixture_seed')){
            localStorage.setItem('__focus_fixture_seed','1');localStorage.setItem('__focus_fixture_clock',String(epoch));
            localStorage.setItem('today_manual',JSON.stringify([{id:'manual_focus_fixture',text:'Read the fictional draft'}]));
            localStorage.setItem('stat_last_visit',new Date().toDateString());
            if(writer)localStorage.setItem('today_focus_session',JSON.stringify({taskId:'manual_focus_fixture',rem:1,savedAt:Date.now()-120000,paused:false}));
            localStorage.setItem('dropbox_token','fictional-focus-fixture-token');
          }
          localStorage.setItem('splash_shown_at',String(Date.now()));
          const nativeFetch=window.fetch;
          window.fetch=async(input,options={})=>{
            if(!String(input).includes('dropboxapi.com'))return nativeFetch(input,options);
            const r=await window.__focusCloud(String(input),options.body);
            if(String(input).endsWith('/2/files/upload'))window.__focusLastUpload=JSON.parse(options.body);
            return new Response(r.body,{status:r.status||200,headers:r.headers});
          };
        },{epoch,writer});
        await page.goto(URL_BASE,{waitUntil:'domcontentloaded',timeout:15000});
        await waitForAppReady(page,{label:'Focus shared-backup fixture'});
        return page;
      };
      try {
        const writer=await boot(contexts[0],friday,true);
        await writer.waitForFunction(()=>localStorage.getItem('stat_focus_mins_today')==='25');
        await writer.waitForFunction(()=>window.__focusLastUpload?.stat_focus_mins_today==='25');
        if(writerRollsFirst){
          await writer.evaluate(now=>{__focusJump(now);applyNewDayCleanup();},saturday);
          await writer.waitForFunction(()=>window.__focusLastUpload?.stat_focus_mins_today==='0');
        }
        if(!cloud||cloud.stat_focus_mins_today!==(writerRollsFirst?'0':'25'))await fail('actual focus backup did not reach cloud');
        const reader=await boot(contexts[1],saturday,false);
        if(!writerRollsFirst)await writer.evaluate(now=>{__focusJump(now);applyNewDayCleanup();},saturday);
        // Reload uses each device's real persisted state; fixture seeding is once only.
        for(const page of [writer,reader]){
          await page.reload({waitUntil:'domcontentloaded'});await waitForAppReady(page,{label:'Focus reload'});
          const result=await page.evaluate(()=>{
            Today.use('sidebar').open('about');
            const rows=safeJSON('today_daily_history',[]).filter(r=>r.date==='2026-11-27');
            return {retained:rows.length===1&&rows[0].focusMins===25,
              todayZero:localStorage.getItem('stat_focus_mins_today')==='0',
              visible:document.getElementById('weekGrid').textContent.includes('25m'),
              once:manualTasks.find(t=>t.id==='manual_focus_fixture')?.focusSessions===1};
          });
          await expectAll('focus upload/rollover/reload '+writerRollsFirst,{...result,noErrors:errors.length===0});
        }
        // Replay through the transport, then publish the actual retained state.
        cloud=JSON.parse(JSON.stringify(cloud));
        cloud.daily_history=[{date:'2026-11-27',focusMins:0}];
        cloud.stat_focus_mins_today='0';cloud.stat_focus_mins_date=new Date(saturday).toDateString();rev++;
        await reader.evaluate(reconnect=>{
          window.__focusLastUpload=null;
          if(reconnect)window.dispatchEvent(new Event('online'));
          else _dbxSyncNow();
        },writerRollsFirst);
        try {
          await reader.waitForFunction(()=>window.__focusLastUpload?.daily_history.some(r=>r.date==='2026-11-27'&&r.focusMins===25),{timeout:5000,polling:50});
        } catch {
          await fail('stale focus backup must be automatically healed',{cloudFocus:cloud.daily_history,local:await reader.evaluate(()=>safeJSON('today_daily_history',[]))});
        }
        await reader.reload({waitUntil:'domcontentloaded'});await waitForAppReady(reader,{label:'Focus stale replay reload'});
        const replay=await reader.evaluate(()=>({history:safeJSON('today_daily_history',[]).filter(r=>r.date==='2026-11-27'),today:localStorage.getItem('stat_focus_mins_today')}));
        await expectAll('shared backup preserves focus after stale transport replay',{
          oneDay:replay.history.length===1,minutes:replay.history[0]?.focusMins===25,todayZero:replay.today==='0',
          cloudHistory:cloud.daily_history.some(r=>r.date==='2026-11-27'&&r.focusMins===25),noErrors:errors.length===0});
        const quiet=await reader.evaluate(data=>mergeRemoteData(data)===false,cloud);
        if(!quiet)await fail('converged focus merge must not request write-back');
        const poorer=JSON.parse(JSON.stringify(cloud));
        poorer.daily_history.find(r=>r.date==='2026-11-27').focusMins=0;
        const repair=await reader.evaluate(data=>mergeRemoteData(data)===true,poorer);
        if(!repair)await fail('write-back detector must reject a poorer snapshot');
        ok('Actual focus restore/upload survives '+(writerRollsFirst?'writer-first reconnect':'receiver-first polling')+' rollover, both reloads and stale transport replay; converged pulls stay quiet');
      } finally {for(const context of contexts)await context.close();}
    }

    // Numbers from different dates cannot compete for one "maximum".
    for (const mode of ['sync','restore']) for (const minutes of [25,90,120]) {
      const {page,errors}=await openPage({extraSeed:{
        stat_focus_mins_date:YESTERDAY_DS,stat_focus_mins_today:'90',
      }});
      const result=await page.evaluate(async({day,date,today,minutes,mode})=>{
        const remote={stat_focus_mins_date:today,stat_focus_mins_today:String(minutes)};
        if(mode==='sync')mergeRemoteData(remote);
        else {
          const nativeFetch=window.fetch;
          localStorage.setItem('dropbox_token','fictional-dated-focus-token');
          window.fetch=async()=>new Response(JSON.stringify(remote),{headers:{'Dropbox-API-Result':'{"rev":"fictional-dated-focus"}'}});
          try {await dropboxRestore(false);} finally {window.fetch=nativeFetch;localStorage.removeItem('dropbox_token');}
        }
        localStorage.setItem('stat_last_visit',day);applyNewDayCleanup();
        return {todayRetained:localStorage.getItem('stat_focus_mins_today')===String(minutes),
          todayDated:localStorage.getItem('stat_focus_mins_date')===today,
          yesterdayRetained:safeJSON('today_daily_history',[]).find(r=>r.date===date)?.focusMins===90};
      },{day:YESTERDAY_DS,date:YESTERDAY_ISO,today:TODAY_DS,minutes,mode});
      await expectAll('different-date counters '+mode+' with remote '+minutes,{...result,noErrors:!errors.length});
      await page.close();
    }

    // A sleeping device's backup can still hold yesterday's live counter, not a
    // history row. Receiving it after local rollover must bank it, not drop it.
    for (const mode of ['sync', 'restore']) {
      const {page,errors}=await openPage({extraSeed:{
        stat_focus_mins_date:TODAY_DS,stat_focus_mins_today:'25',
        today_daily_history:JSON.stringify([{date:YESTERDAY_ISO,focusMins:0,tasksDone:2}]),
      }});
      const result=await page.evaluate(async({mode,day,date})=>{
        const remote={stat_focus_mins_date:day,stat_focus_mins_today:'90',daily_history:[]};
        if(mode==='sync') {
          mergeRemoteData(remote);mergeRemoteData(remote);
        } else {
          const original=window.fetch;
          localStorage.setItem('dropbox_token','fictional-focus-history-token');
          window.fetch=async url=>{
            if(!String(url).includes('dropboxapi.com'))throw new Error('Unexpected fixture destination');
            return new Response(JSON.stringify(remote),{status:200,headers:{'Dropbox-API-Result':'{"rev":"fictional-focus-history"}'}});
          };
          try {await dropboxRestore(false);} finally {window.fetch=original;localStorage.removeItem('dropbox_token');}
        }
        const rows=safeJSON('today_daily_history',[]),row=rows.find(r=>r.date===date);
        return {retained:row?.focusMins===90,oneRow:rows.filter(r=>r.date===date).length===1,
          tasksRetained:row?.tasksDone===2,
          noTodayLeak:localStorage.getItem('stat_focus_mins_today')===(mode==='sync'?'25':'0')};
      },{mode,day:YESTERDAY_DS,date:YESTERDAY_ISO});
      await expectAll('unbanked remote yesterday counter: '+mode,{...result,noErrors:!errors.length});
      ok('Unbanked remote focus survives '+mode+' after local rollover, without duplication or today carryover');
      await page.close();
    }

    {
      const {page,errors}=await openPage();
      const result=await page.evaluate(({day,date,today})=>{
        const reset=history=>{
          localStorage.setItem('today_daily_history',JSON.stringify(history));
          localStorage.setItem('stat_focus_mins_date',today);
          localStorage.setItem('stat_focus_mins_today','25');
        };
        reset([]);
        mergeRemoteData({stat_focus_mins_date:day,stat_focus_mins_today:'90'});
        const absentHistory=safeJSON('today_daily_history',[]).find(r=>r.date===date)?.focusMins===90;
        reset([{date,focusMins:120,tasksDone:4}]);
        mergeRemoteData({daily_history:[{date,focusMins:30}],stat_focus_mins_date:day,stat_focus_mins_today:'90'});
        const richerRow=safeJSON('today_daily_history',[]).find(r=>r.date===date);
        let invalidIgnored=true;
        const future=new Date();future.setDate(future.getDate()+1);
        for(const [stamp,minutes] of [['','90'],['not a date','90'],[future.toDateString(),'90'],
          [day,'bad'],[day,'-10'],[day,'Infinity'],[day,0.5],[day,true],[day,[90]],[today,'90']]){
          reset([]);mergeRemoteData({stat_focus_mins_date:stamp,stat_focus_mins_today:minutes});
          invalidIgnored=invalidIgnored&&safeJSON('today_daily_history',[]).length===0;
        }
        return {absentHistory,richerPreserved:richerRow.focusMins===120&&richerRow.tasksDone===4,invalidIgnored};
      },{day:YESTERDAY_DS,date:YESTERDAY_ISO,today:TODAY_DS});
      await expectAll('historical counter max and date/value boundaries',{...result,noErrors:!errors.length});
      ok('Historical remote focus handles absent history, richer rows and invalid/current/future counters');
      await page.close();
    }

    // A second device may already have saved an incomplete row for yesterday.
    // Its presence must not discard this device's still-unbanked focus counter.
    {
      const {page,errors}=await openPage({extraSeed:{
        stat_focus_mins_date:YESTERDAY_DS,stat_focus_mins_today:'90',
        today_daily_history:JSON.stringify([{date:YESTERDAY_ISO,tasksDone:3,focusMins:0,habitsKept:1,habitsTotal:2}]),
      }});
      const r=await page.evaluate(({day,date})=>{
        localStorage.setItem('stat_last_visit',day);applyNewDayCleanup();
        const row=safeJSON('today_daily_history',[]).find(x=>x.date===date);
        return {minutesRetained:row?.focusMins===90,oneRow:safeJSON('today_daily_history',[]).filter(x=>x.date===date).length===1,
          existingTasksRetained:row?.tasksDone>=3,todayReset:localStorage.getItem('stat_focus_mins_today')==='0'};
      },{day:YESTERDAY_DS,date:YESTERDAY_ISO});
      await expectAll('existing history row retains unbanked focus',{...r,noErrors:!errors.length});
      await waitForAppReady(page,{label:'History About fixture'});
      const display=await page.evaluate(({date})=>{
        Today.use('sidebar').open('about');
        const now=new Date(),dates=[];
        for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);dates.push(_localISO(d));}
        const col=document.querySelectorAll('#weekGrid .week-col')[dates.indexOf(date)];
        return col?.querySelector('.week-col-focus')?.textContent;
      },{date:YESTERDAY_ISO});
      if(display!=='1h 30m')await fail('About retains the banked focus time',{display});
      ok('Existing daily history retains unbanked focus and About displays 1h 30m');await page.close();
    }

    // Bank by per-field max, never by addition or whole-row replacement.
    for(const scenario of [
      {name:'richer remote history',recorded:120,counter:90,expected:120},
      {name:'post-midnight snapshot',recorded:0,counter:90,snapshot:45,expected:45},
    ]){
      const {page,errors}=await openPage({extraSeed:{
        stat_focus_mins_date:scenario.snapshot?TODAY_DS:YESTERDAY_DS,
        stat_focus_mins_today:String(scenario.counter),
        ...(scenario.snapshot?{stat_focus_mins_yesterday_snapshot:String(scenario.snapshot)}:{}),
        today_daily_history:JSON.stringify([{date:YESTERDAY_ISO,tasksDone:8,tasksAdded:4,tasksAddedFixed:true,
          focusMins:scenario.recorded,habitsKept:2,habitsTotal:3}]),
      }});
      const r=await page.evaluate(({day,date,scenario})=>{
        localStorage.setItem('stat_last_visit',day);applyNewDayCleanup();
        const saved=localStorage.getItem('today_daily_history');applyNewDayCleanup();
        const row=JSON.parse(saved).find(x=>x.date===date);
        return {correctFocus:row?.focusMins===scenario.expected,existingCounts:row?.tasksDone===8&&row?.habitsKept===2&&row?.habitsTotal===3,
          correctedAdded:row?.tasksAdded===4&&row?.tasksAddedFixed===true,
          liveCounter:localStorage.getItem('stat_focus_mins_today')===String(scenario.snapshot?scenario.counter:0),
          idempotent:saved===localStorage.getItem('today_daily_history'),
          snapshotConsumed:!localStorage.getItem('stat_focus_mins_yesterday_snapshot')};
      },{day:YESTERDAY_DS,date:YESTERDAY_ISO,scenario});
      await expectAll('existing history '+scenario.name,{...r,noErrors:!errors.length});
      ok('Existing daily history: '+scenario.name+' survives cleanup without double counting');await page.close();
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
        await new Promise(r => setTimeout(r, 700));                 // --dur-base + --dur-slow, with slack
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
      const oldId  = 'manual_' + (FIXTURE_NOW - 8 * D);   // renders as age bucket "old"
      const doneId = 'manual_' + (FIXTURE_NOW - 2 * D);
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

    console.log('\nDay-lifecycle tests passed (post-extraction).');
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
