import { waitForFonts, installFixtureClock } from './browser-fixture.mjs';
// TODAY — focus mode module regression test
//
// Tests: mobile guard, desktop exports, task click opens timer, session persist,
//        space-to-pause, escape-to-close, _focusOnCheck (no-session + active-session),
//        session restore, _focusReanchor no-throw, Document PiP lifecycle, static wiring.
//
// Run from repo root:
//   node scripts/focus-test.mjs --pre-extraction
//   node scripts/focus-test.mjs

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

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
const ok   = msg => console.log('  ✓ ' + msg);
const fail = async (label, detail) => {
  console.error('✗ FAIL — ' + label);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};
const expectAll = async (label, result) => {
  const failed = Object.entries(result).filter(([, v]) => !v);
  if (failed.length) await fail(label, result);
};

// Hardware media predicates need the same explicit input model in JS and CSS.
// Launch flags and CDP media emulation do not reliably override native hover.
browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

// openPage — emulates a desktop (hover:hover) or mobile (no hover) environment.
// Seeds localStorage with a single manual task so the task list renders.
async function openPage({ hoverHover = true, extraSeed = {}, pip = false, nativeTouch = false, clock } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, hasTouch: nativeTouch });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  if (clock !== undefined) await installFixtureClock(page, clock);
  await page.evaluateOnNewDocument(({ seed, hoverHover, pip }) => {
    // Stub matchMedia so the hover:hover guard is deterministic in headless Chrome.
    const _orig = window.matchMedia.bind(window);
    window.__focusNativeHover = _orig('(hover: hover)').matches;
    window.matchMedia = (query) => {
      const hardware={'(hover: hover)':hoverHover,'(hover: none)':!hoverHover,'(pointer: fine)':hoverHover,'(pointer: coarse)':!hoverHover,'(pointer: none)':false};
      if (Object.hasOwn(hardware,query)) {
        return { matches: hardware[query], media: query,
          addEventListener: () => {}, removeEventListener: () => {},
          addListener: () => {}, removeListener: () => {},
          dispatchEvent: () => false, onchange: null };
      }
      return _orig(query);
    };
    if (pip) {
      const state = window.__focusPipTest = {
        requests: [],
        windows: [],
        openerFocusCalls: 0,
      };
      let visibility = 'visible';
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibility,
      });
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => visibility === 'hidden',
      });
      state.setVisibility = value => {
        visibility = value;
        document.dispatchEvent(new Event('visibilitychange'));
      };
      window.focus = () => { state.openerFocusCalls++; };
      Object.defineProperty(window, 'documentPictureInPicture', {
        configurable: true,
        value: {
          requestWindow: async options => {
            state.requests.push(options);
            const listeners = {};
            const pipDocument = document.implementation.createHTMLDocument('TODAY');
            const pipWindow = {
              document: pipDocument,
              closed: false,
              addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
              requestAnimationFrame(fn) { return window.requestAnimationFrame(fn); },
              cancelAnimationFrame(id) { window.cancelAnimationFrame(id); },
              close() {
                if (this.closed) return;
                this.closed = true;
                (listeners.pagehide || []).forEach(fn => fn());
              },
            };
            state.windows.push(pipWindow);
            return pipWindow;
          },
        },
      });
    }
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_manual', JSON.stringify([
      { id: 'manual_t1', text: 'Write the tests', addedAt: '' }
    ]));
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
  }, { seed: extraSeed, hoverHover, pip });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForFonts(page);
  // Change only hardware predicates in this test page's real stylesheet rules.
  // Width, motion, selectors and declarations remain production CSS.
  const input = await page.evaluate(hoverHover=>{
    const probe=document.createElement('style');
    probe.textContent='@media (hover: hover) and (pointer: fine) {:root {--focus-fixture-desktop: 1}} @media (hover: none) {:root {--focus-fixture-touch: 1}}';
    document.head.append(probe);
    let mapped=0;const before=[],after=[];
    function visit(rules){for(const rule of rules){
      if(rule.type===CSSRule.STYLE_RULE)before.push(rule.cssText);
      if(rule.type===CSSRule.MEDIA_RULE)rule.media.mediaText=rule.conditionText.replace(/\((hover|pointer):\s*(hover|none|fine|coarse)\)/g,(_,kind,value)=>{
        mapped++;const matches=kind==='hover'?(value==='hover'?hoverHover:!hoverHover):(value==='fine'?hoverHover:value==='coarse'?!hoverHover:false);
        return matches?'(min-width: 0px)':'(max-width: 0px)';
      });
      if(rule.cssRules)visit(rule.cssRules);
      if(rule.type===CSSRule.STYLE_RULE)after.push(rule.cssText);
    }}
    for(const sheet of document.styleSheets)visit(sheet.cssRules);
    const style=getComputedStyle(document.documentElement);
    return {mapped:mapped>2,intact:JSON.stringify(before)===JSON.stringify(after),
      desktop:style.getPropertyValue('--focus-fixture-desktop').trim()===(hoverHover?'1':''),
      touch:style.getPropertyValue('--focus-fixture-touch').trim()===(hoverHover?'':'1')};
  },hoverHover);
  await expectAll('JS/CSS input fixture agrees without changing declarations',input);
  if (hoverHover) {
    await page.waitForFunction(
      () => typeof window._focusOnCheck === 'function' &&
            typeof window._tryRestoreFocusSession === 'function' &&
            typeof window._focusReanchor === 'function' &&
            !!document.getElementById('addTaskBar'),
      { timeout: 15000 }
    );
  } else {
    await page.waitForFunction(
      () => !!document.getElementById('addTaskBar'),
      { timeout: 15000 }
    );
  }
  await page.evaluate(() => {
    window.dropboxBackup          = () => {};
    window.dropboxAutoSave        = () => {};
    window._haptic                = () => {};
    window.playStartSound         = () => {};
    window.playResumeSound        = () => {};
    window.playChime              = () => {};
    window._primeAudio            = () => {};
    window._saveManual            = () => {};
    window._saveHabits            = () => {};
    window._memoryOnFocusComplete = () => {};
    window.updateStats            = () => {};
    window._markTrelloActive      = () => {};
  });
  return { page, errors };
}

try {
  if (PRE_EXTRACTION) {
    const src = await readFile(join(ROOT, 'index.html'), 'utf8');
    await expectAll('pre-extraction baseline', {
      focusIIFEInline: src.includes('// FOCUS MODE (Pomodoro)'),
      noModule:        !existsSync(join(ROOT, 'assets/focus.js')),
    });
    ok('pre-extraction: focus IIFE inline; assets/focus.js absent');
    console.log('\nFocus tests passed (pre-extraction baseline, 1 check).');
  } else {
    // 1. Mobile guard — exports absent on hover:none devices.
    {
      const { page, errors } = await openPage({ hoverHover: false });
      const r = await page.evaluate(() => ({
        noFocusOnCheck:        typeof window._focusOnCheck === 'undefined',
        noTryRestore:          typeof window._tryRestoreFocusSession === 'undefined',
        noReanchor:            typeof window._focusReanchor === 'undefined',
      }));
      await expectAll('mobile guard', { ...r, noErrors: !errors.length });
      ok('mobile guard: focus exports absent on hover:none');
      await page.close();
    }

    // 2. Desktop — all three exports defined.
    {
      const { page, errors } = await openPage();
      const r = await page.evaluate(() => ({
        hasFocusOnCheck: typeof window._focusOnCheck === 'function',
        hasTryRestore:   typeof window._tryRestoreFocusSession === 'function',
        hasReanchor:     typeof window._focusReanchor === 'function',
      }));
      await expectAll('desktop exports', { ...r, noErrors: !errors.length });
      ok('desktop exports: _focusOnCheck, _tryRestoreFocusSession, _focusReanchor all defined');
      await page.close();
    }

    // Completed and partial focus progress must queue sync without another task edit.
    {
      // Keep both synthetic sessions on one day; rollover has separate coverage.
      const { page, errors } = await openPage({clock:new Date(2026,9,24,12).getTime()});
      await page.evaluate(() => {
        window.__focusSaves = [];
        localStorage.removeItem('last_local_change');
        window.dropboxAutoSave = () => window.__focusSaves.push({
          sessions:manualTasks[0].focusSessions || 0,
          minutes:Number(localStorage.getItem('stat_focus_mins_today') || 0),
          changed:!!localStorage.getItem('last_local_change'),
        });
      });
      await page.click('.task[data-taskid="manual_t1"] .task-text');
      await page.waitForSelector('.focus-timer.open', { visible:true });
      const completed = await page.evaluate(() => {
        const original = Date.now;
        const now = original();
        Date.now = () => now + 1501000;
        try { document.dispatchEvent(new Event('visibilitychange')); }
        finally { Date.now = original; }
        return window.__focusSaves.some(s => s.sessions === 1 && s.minutes === 25 && s.changed);
      });
      await expectAll('completed focus queues sync', { completed, noErrors:!errors.length });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.focus-timer.open'));
      await page.click('.task[data-taskid="manual_t1"] .task-text');
      await page.waitForSelector('.focus-timer.open', { visible:true });
      await page.evaluate(() => {
        window.__focusSaves = [];
        localStorage.removeItem('last_local_change');
        const original = Date.now;
        const now = original();
        Date.now = () => now + 61000;
        try { document.dispatchEvent(new Event('visibilitychange')); }
        finally { Date.now = original; }
      });
      await page.keyboard.press('Escape');
      const partial = await page.evaluate(() => window.__focusSaves.some(s => s.sessions === 1 && s.minutes === 26 && s.changed));
      if (!partial) console.error('Partial focus fixture state:', await page.evaluate(() => ({
        saves:window.__focusSaves, minutes:localStorage.getItem('stat_focus_mins_today'),
        date:localStorage.getItem('stat_focus_mins_date'), day:_getAppDay(),
        session:localStorage.getItem('today_focus_session'), timer:document.querySelector('.focus-timer')?.textContent,
        active:window._focusUIActive,
      })));
      await expectAll('partial focus queues sync', { partial, noErrors:!errors.length });
      ok('completed and partial sessions queue Dropbox sync and mark an offline change without another edit');
      await page.close();
    }

    // 3. Task click opens timer UI (.focus-timer.open).
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const r = await page.evaluate(() => ({
        timerOpen: !!document.querySelector('.focus-timer.open'),
      }));
      if (errors.length) await fail('task click opens timer — browser errors', errors);
      await expectAll('task click opens timer', { ...r, noErrors: !errors.length });
      ok('task click opens timer: .focus-timer.open present');
      await page.close();
    }

    // 3b. BUG-098: the header is pinned for the lock and released on exit, and the
    //     chrome around the task recedes while the add bar stays crisp.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      // The CSS opacity recede transition takes 120ms; wait for it to settle
      // before sampling — especially important on headless Linux where frame
      // timing differs from macOS.
      await page.waitForFunction(
        () => parseFloat(getComputedStyle(document.getElementById('sticky-header')).opacity) < 0.2,
        { timeout: 500 }
      );
      // Blurred chrome is out of reach: header controls are inert; capture stays usable.
      const reach = await page.evaluate(() => ({
        headerInert: ['#todayLogo','#habitsBtn','#infoBtn'].every(sel => !document.querySelector(sel) || !!document.querySelector(sel).closest('[inert]')),
        captureUsable: !document.getElementById('newTask').closest('[inert]'),
      }));
      await expectAll('Focus keeps blurred chrome out of reach', reach);
      const on = await page.evaluate(() => {
        const hdr = document.getElementById('sticky-header');
        const bar = document.getElementById('addTaskBar');
        return {
          bodyLocked:     document.body.classList.contains('focus-locked'),
          bodyFixed:      document.body.style.position === 'fixed',
          headerPinned:   getComputedStyle(hdr).position === 'fixed',
          headerAtTop:    Math.abs(hdr.getBoundingClientRect().top) < 1,
          bodyPadded:     Math.abs(parseFloat(document.body.style.paddingTop) - hdr.getBoundingClientRect().height) < 1,
          headerReceded:  parseFloat(getComputedStyle(hdr).opacity) < 0.2,
          headerBlurred:  getComputedStyle(hdr).filter.includes('blur'),
          headerClickable: getComputedStyle(hdr).pointerEvents !== 'none',
          addBarCrisp:    getComputedStyle(bar).filter === 'none' && parseFloat(getComputedStyle(bar).opacity) === 1,
        };
      });
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => !document.body.classList.contains('focus-locked') && document.body.style.position === '',
        { timeout: 3000 }
      );
      const off = await page.evaluate(() => {
        const hdr = document.getElementById('sticky-header');
        return {
          bodyUnlocked:   !document.body.classList.contains('focus-locked'),
          bodyUnpadded:   document.body.style.paddingTop === '',
          headerSticky:   getComputedStyle(hdr).position === 'sticky',
        };
      });
      await expectAll('BUG-098 header pin + chrome recede', { ...on, ...off, noErrors: !errors.length });
      ok('BUG-098: header pinned, receded and clickable during focus; add bar crisp; everything released on exit');
      await page.close();
    }

    // BUG-160: focusing a Today task with a sidebar open locks that sidebar too —
    // inert (no clicks or scroll) and blurred — and releases it on exit.
    {
      const { page, errors } = await openPage();
      await page.evaluate(() => Today.use('sidebar').open('habits'));
      await page.waitForFunction(() => !document.getElementById('sidebarRoot').hidden);
      await page.click('#manualList .task-text');
      await page.waitForFunction(() => document.querySelector('.focus-timer.open') !== null, { timeout: 3000 });
      const during = await page.evaluate(() => {
        const root = document.getElementById('sidebarRoot');
        return { sidebarInert: !!root.closest('[inert]'), sidebarBlurred: root.classList.contains('focusing') };
      });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.body.classList.contains('focus-locked'), { timeout: 3000 });
      await page.waitForFunction(() => !document.getElementById('sidebarRoot').closest('[inert]'), { timeout: 3000 });
      const after = await page.evaluate(() => ({ sidebarReleased: !document.getElementById('sidebarRoot').classList.contains('focusing') }));
      await expectAll('BUG-160 sidebar locked during Focus', { ...during, ...after, noErrors: !errors.length });
      ok('BUG-160: an open sidebar is inert and blurred during Focus on a Today task, released on exit');
      await page.close();
    }

    // BUG-151 follow-up: the header must dim before blurring. SVG reference
    // filters snap on instead of interpolating, creating a bright hazy logo.
    {
      const {page,errors}=await openPage();
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
      await page.click('.task-text');
      const transition=await page.evaluate(async()=>{
        const header=document.getElementById('sticky-header');
        const animations=header.getAnimations();
        animations.forEach(a=>a.pause());
        const samples=[];
        for(const time of [0,60,120,150,180]){
          animations.forEach(a=>a.currentTime=time);
          await new Promise(resolve=>requestAnimationFrame(resolve));
          const style=getComputedStyle(header);
          samples.push({time,opacity:Number(style.opacity),filter:style.filter});
        }
        animations.forEach(a=>a.play());
        return {hasBlurTransition:animations.some(a=>a.transitionProperty==='filter'),samples};
      });
      await mkdir(join(ROOT,'.context/ci-test-results/focus-header'),{recursive:true});
      await writeFile(join(ROOT,'.context/ci-test-results/focus-header/blur-sequence.json'),JSON.stringify(transition,null,2));
      const blur=sample=>Number(sample.filter.match(/blur\(([\d.]+)px\)/)?.[1]||0);
      await expectAll('Header dims before its blur grows',{
        animated:transition.hasBlurTransition,
        clearWhileFading:transition.samples.filter(s=>s.time<=120).every(s=>blur(s)<0.01&&!s.filter.includes('url(')),
        dimBeforeBlur:transition.samples.find(s=>s.time===120).opacity<0.1,
        gradualBlur:blur(transition.samples[3])>0&&blur(transition.samples[3])<6,
        settledBlur:Math.abs(blur(transition.samples[4])-6)<0.01,
        noErrors:!errors.length,
      });
      await page.keyboard.press('Escape');
      await page.close();
    }

    // Locking focus may soften the header, but cannot reflow its logo/navigation.
    for(const {docked,width,deep,count=42} of [{docked:false,width:1280},...[736,1024,1440].map(width=>({docked:true,width})),{docked:false,width:1280,deep:true},{docked:true,width:1024,deep:true},... [false,true].map(docked=>({docked,width:1280,deep:true,count:120}))]) {
      const {page,errors}=await openPage(deep?{extraSeed:{today_manual:JSON.stringify(Array.from({length:count},(_,i)=>({id:'manual_motion_'+i,text:'Fictional focus task number '+i})))}}:{});
      await page.setViewport({width,height:900});
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
      if(docked){
        await page.click('#trelloBtn');
        await page.waitForFunction(()=>document.body.classList.contains('ex-open')&&document.getElementById('sidebarRoot')&&!document.getElementById('sidebarRoot').hidden);
        await page.waitForFunction(()=>Math.abs(parseFloat(getComputedStyle(document.body).paddingRight)-document.getElementById('sidebarRoot').getBoundingClientRect().width)<1&&!document.body.getAnimations().some(a=>a.playState==='running'));
      }
      const target=deep?`.task[data-taskid="manual_motion_${count===120?88:28}"] .task-text`:'.task-text';
      if(deep){
        await page.$eval(target,node=>scrollBy(0,node.getBoundingClientRect().top-(innerHeight-180)));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      }
      for(const phase of ['entry','exit']){
        await page.evaluate(phase=>{
          const rects=()=>Object.fromEntries(['sticky-header','todayLogo','infoBtn','habitsBtn','trelloBtn'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{x:r.x,y:r.y,width:r.width,height:r.height}];}));
          // Native click preparation can scroll before dispatch. Compare Focus against
          // the geometry at its actual input event, before application handlers run.
          window.__headerMotion={prepared:rects(),before:null,frames:[],done:false,lockedScroll:0};
          document.addEventListener(phase==='entry'?'click':'keydown',event=>{
            if(phase==='entry')window.__focusInputOrigin={scroll:scrollY,top:event.target.closest('.task,.habit').getBoundingClientRect().top};
            __headerMotion.origin=window.__focusInputOrigin;
            __headerMotion.before=rects();
            __headerMotion.lockedScroll=Math.abs(parseInt(document.body.style.top||'0'));
            const start=performance.now();
            function sample(){__headerMotion.frames.push({ms:performance.now()-start,rects:rects(),paint:Object.fromEntries(['sticky-header','todayLogo','infoBtn','habitsBtn','trelloBtn'].map(id=>[id,getComputedStyle(document.getElementById(id)).visibility])),filter:getComputedStyle(document.getElementById('sticky-header')).filter});if(performance.now()-start<550)requestAnimationFrame(sample);else __headerMotion.done=true;}
            requestAnimationFrame(sample);
          },{once:true,capture:true});
        },phase);
        if(phase==='entry')await page.click(target);else await page.keyboard.press('Escape');
        await page.waitForFunction(()=>window.__headerMotion.done);
        const motion=await page.evaluate(()=>__headerMotion);
        await mkdir(join(ROOT,'.context/ci-test-results/focus-header'),{recursive:true});
        await writeFile(join(ROOT,`.context/ci-test-results/focus-header/${docked?'docked':'closed'}-${width}-${deep?'scrolled-'+count+'-':''}${phase}.json`),JSON.stringify(motion,null,2));
        const drift=motion.frames.flatMap(frame=>Object.entries(frame.rects).flatMap(([id,r])=>Object.entries(r).filter(([axis])=>!(deep&&phase==='exit'&&axis==='y')).map(([axis,value])=>({id,axis,delta:Math.abs(value-motion.before[id][axis]),ms:frame.ms})))).sort((a,b)=>b.delta-a.delta)[0];
        if(drift.delta>1)await fail(`Focus ${phase} keeps header geometry (${docked?'docked':'closed'}, ${width}px${deep?', scrolled list':''})`,drift);
        if(deep){
          if(count===120&&phase==='entry'&&motion.before['sticky-header'].y+motion.before['sticky-header'].height>0)await fail('Long-list fixture requires the whole header offscreen');
          for(const id of ['todayLogo','infoBtn','habitsBtn','trelloBtn']){
            const before=motion.before[id];
            if(before.y+before.height<=0&&motion.frames.some(f=>f.filter!=='none'&&f.paint[id]==='visible'))await fail('Focus cannot paint an offscreen logo/control into its blur layer',{id,width,docked,count,phase});
          }
          const header=motion.before['sticky-header'];
          if(phase==='entry'&&header.y+header.height<=0&&motion.frames.some(f=>f.filter!=='none'))await fail('Fully offscreen header never creates a blur layer',{width,docked,count});
        }
        if(deep&&phase==='exit'){
          // Unlock restores the nudged document scroll position. Offscreen chrome
          // may move farther out of view; it must never flash back into view.
          for(const id of ['todayLogo','infoBtn','habitsBtn','trelloBtn']){
            const before=motion.before[id];
            if(before.y+before.height<=0&&motion.frames.some(f=>f.rects[id].y+f.rects[id].height>0))await fail('Unlock cannot reveal offscreen chrome',{id,width,docked});
          }
          const restored=await page.$eval(target,node=>({scroll:scrollY,bodyTop:document.body.style.top,position:document.body.style.position,taskTop:node.closest('.task,.habit').getBoundingClientRect().top,timerHidden:document.querySelector('.focus-timer')?.hidden}));
          // Focus may correct the scroll offset to preserve the original task anchor.
          // Assert that visible result, not the pre-correction window scroll number.
          const expectedTop=motion.origin.top-(motion.lockedScroll-motion.origin.scroll);
          if(Math.abs(restored.taskTop-expectedTop)>2||restored.position==='fixed'||restored.bodyTop||!restored.timerHidden)await fail('Unlock restores the nudged task position',{width,docked,expectedTop,lockedScroll:motion.lockedScroll,actual:restored});
        }
        if(phase==='exit'&&await page.$('[data-focus-outside]'))await fail('Focus exit restores normal header painting');
        await expectAll('Focus '+phase+' state',{expectedLock:await page.evaluate(phase=>document.body.classList.contains('focus-locked')===(phase==='entry'),phase),noErrors:!errors.length});
        if(docked)await expectAll('Focus keeps Explore open',{stillOpen:await page.$eval('#sidebarRoot',node=>!node.hidden)});
      }
      if(deep&&count===42){
        await page.$eval(target,node=>scrollBy(0,node.getBoundingClientRect().top-(innerHeight-180)));
        await page.click(target);
        await page.keyboard.press('Escape');
        // Where the exit restores the scroll decides whether the logo is off screen at re-entry
        // (1280px: fully above) or partly visible (1024px docked: header 24px above the top). Off-screen
        // chrome must stay unpainted; visible chrome must not move (BUG-151). Both are the real invariant.
        const beforeLogo=await page.evaluate(()=>{window.__closingHeaderPaint=Promise.all(document.getElementById('sticky-header').getAnimations().map(a=>a.finished.catch(()=>{})));return document.getElementById('todayLogo').getBoundingClientRect().bottom;});
        await page.click(target);
        await page.evaluate(async()=>{await __closingHeaderPaint;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
        const reentry=await page.evaluate(()=>{const logo=document.getElementById('todayLogo');return {locked:document.body.classList.contains('focus-locked'),bottom:logo.getBoundingClientRect().bottom,unpainted:getComputedStyle(logo).visibility==='hidden'};});
        await expectAll('An older exit cannot expose the new Focus header',beforeLogo<=0
          ?{locked:reentry.locked,offscreenStaysHidden:reentry.bottom<=0||reentry.unpainted}
          :{locked:reentry.locked,visibleLogoHoldsStill:Math.abs(reentry.bottom-beforeLogo)<1});
        await page.keyboard.press('Escape');
        await page.waitForFunction(()=>!document.querySelector('[data-focus-outside]'));
      }
      await page.close();
    }
    ok('Focus entrance preserves header geometry and excludes offscreen chrome from blur, including long lists and rapid re-entry');

    // 3c. Focus starts as an outward row wave, derived from existing motion tokens.
    {
      const { page, errors } = await openPage();
      await page.evaluate(() => {
        const list = document.getElementById('manualList');
        const first = list.querySelector('.task[data-taskid="manual_t1"]');
        ['manual_t2', 'manual_t3'].forEach((id, index) => {
          const row = first.cloneNode(true);
          row.dataset.taskid = id;
          row.querySelector('.task-text').textContent = index ? 'Third task' : 'Second task';
          list.appendChild(row);
        });
        const hidden = first.cloneNode(true);
        hidden.dataset.taskid = 'manual_hidden';
        hidden.style.display = 'none';
        hidden.querySelector('.task-text').textContent = 'Hidden task';
        list.appendChild(hidden);
      });
      await page.click('.task-text');
      const on = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('#manualList .task:not(.focused)')]
          .filter(row => row.getClientRects().length);
        const delays = rows.map(row => parseFloat(row.style.getPropertyValue('--focus-wave-delay')));
        return {
          twoRecedingRows: delays.length === 2,
          nearestStartsFirst: delays[0] === 0 && delays[1] > delays[0],
          farthestUsesFastToken: delays[1] === _motionDuration('--dur-fast'),
          cssUsesWaveDelay: getComputedStyle(rows[1]).transitionDelay.includes((delays[1] / 1000) + 's'),
          hiddenRowIgnored: !document.querySelector('[data-taskid="manual_hidden"]')
            .style.getPropertyValue('--focus-wave-delay'),
        };
      });
      await page.keyboard.press('Escape');
      await new Promise(resolve => setTimeout(resolve, 600));
      const cleared = await page.evaluate(() => ({
        waveCleared: ![...document.querySelectorAll('.task,.habit')]
          .some(row => row.style.getPropertyValue('--focus-wave-delay')),
      }));
      await expectAll('focus outward wave', { ...on, ...cleared, noErrors: !errors.length });
      ok('focus entry: nearby rows recede before farther rows on the existing fast/out easing clock');
      await page.close();
    }

    // 3d. Reduced motion keeps the focus state change immediate and unstaggered.
    {
      const { page, errors } = await openPage();
      const r = await page.evaluate(() => {
        const list = document.getElementById('manualList');
        const first = list.querySelector('.task[data-taskid="manual_t1"]');
        const second = first.cloneNode(true);
        second.dataset.taskid = 'manual_t2';
        second.querySelector('.task-text').textContent = 'Second task';
        list.appendChild(second);
        const original = window.matchMedia;
        window.matchMedia = query => query === '(prefers-reduced-motion: reduce)'
          ? { matches: true, media: query }
          : original.call(window, query);
        first.querySelector('.task-text').click();
        return {
          focusStarted: document.getElementById('main-app').classList.contains('focusing'),
          noWaveDelay: !second.style.getPropertyValue('--focus-wave-delay'),
        };
      });
      await expectAll('focus wave reduced motion', { ...r, noErrors: !errors.length });
      ok('focus entry: reduced motion skips the outward stagger');
      await page.close();
    }

    // 4. Session persisted to localStorage on timer open.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const r = await page.evaluate(() => {
        const raw = localStorage.getItem('today_focus_session');
        if (!raw) return { sessionSaved: false };
        const s = JSON.parse(raw);
        return { sessionSaved: s.taskId === 'manual_t1' && typeof s.rem === 'number' };
      });
      await expectAll('session saved on open', { ...r, noErrors: !errors.length });
      ok('session saved: today_focus_session written with taskId=manual_t1');
      await page.close();
    }

    // 5. Space to pause — #focusPaused gets class 'show'.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      await page.focus('#focusTime');
      await page.keyboard.press('Space');
      // Allow one frame for setPaused to update the DOM
      await page.waitForFunction(
        () => document.getElementById('focusPaused')?.classList.contains('show'),
        { timeout: 2000 }
      );
      const r = await page.evaluate(() => ({
        pausedLabelVisible: document.getElementById('focusPaused')?.classList.contains('show') === true,
      }));
      await expectAll('space to pause', { ...r, noErrors: !errors.length });
      ok('space to pause: #focusPaused gets class "show"');
      await page.close();
    }

    // 6. Escape closes timer and clears today_focus_session.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      await page.keyboard.press('Escape');
      // Wait for CSS open class to be removed (closeUI runs synchronously, RAF schedules DOM cleanup)
      await page.waitForFunction(
        () => !document.querySelector('.focus-timer.open'),
        { timeout: 2000 }
      );
      // Brief wait for deferred 200ms cleanup to settle
      await new Promise(r => setTimeout(r, 300));
      const r = await page.evaluate(() => ({
        timerClosed:    !document.querySelector('.focus-timer.open'),
        sessionCleared: localStorage.getItem('today_focus_session') === null,
      }));
      await expectAll('escape closes timer', { ...r, noErrors: !errors.length });
      ok('escape closes timer: .focus-timer.open gone, today_focus_session cleared');
      await page.close();
    }

    // 7. Copy feedback is session-scoped and cannot leak through exit/re-entry.
    {
      const { page, errors } = await openPage();
      await page.evaluate(() => { window._copyToClipboard = (_text, done) => done(); });
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      await page.click('.task-copy');
      const copied = await page.evaluate(() => {
        const btn = document.querySelector('.task.focused .task-copy');
        return btn?.textContent === 'copied' && btn.classList.contains('copied');
      });
      await page.keyboard.press('Escape');
      const resetOnExit = await page.evaluate(() => {
        const btn = document.querySelector('.task-copy');
        return btn?.textContent === 'copy' && !btn.classList.contains('copied') && !btn._copyFeedbackTimer;
      });
      await page.waitForFunction(() => document.querySelector('.focus-timer').hidden, { timeout: 2000 });
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const cleanOnReentry = await page.evaluate(() => {
        const btn = document.querySelector('.task.focused .task-copy');
        return btn?.textContent === 'copy' && !btn.classList.contains('copied');
      });
      await page.evaluate(() => {
        window._copyToClipboard = (_text, done) => { window.__delayedCopyDone = done; };
      });
      await page.click('.task-copy');
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.__delayedCopyDone?.());
      const delayedCallbackIgnored = await page.evaluate(() => {
        const btn = document.querySelector('.task-copy');
        return btn?.textContent === 'copy' && !btn.classList.contains('copied');
      });
      await expectAll('copy feedback reset', {
        copied, resetOnExit, cleanOnReentry, delayedCallbackIgnored, noErrors: !errors.length,
      });
      ok('copy feedback resets on exit, stays clean on re-entry, and ignores a late clipboard callback');
      await page.close();
    }

    // 8. _focusOnCheck with no active session returns falsy (no-op path).
    {
      const { page, errors } = await openPage();
      const r = await page.evaluate(() => {
        const ret = window._focusOnCheck('nonexistent');
        return { returnedFalsy: !ret };
      });
      await expectAll('_focusOnCheck no-session', { ...r, noErrors: !errors.length });
      ok('_focusOnCheck: returns falsy when no active session');
      await page.close();
    }

    // 9. _focusOnCheck closes active timer.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      await page.evaluate(() => window._focusOnCheck('manual_t1'));
      await page.waitForFunction(
        () => !document.querySelector('.focus-timer.open'),
        { timeout: 2000 }
      );
      const r = await page.evaluate(() => ({
        timerClosed: !document.querySelector('.focus-timer.open'),
      }));
      await expectAll('_focusOnCheck closes active timer', { ...r, noErrors: !errors.length });
      ok('_focusOnCheck: closes timer when session is active');
      await page.close();
    }

    // 10. Session restore — seed today_focus_session, call _tryRestoreFocusSession().
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'today_focus_session': JSON.stringify({
            taskId: 'manual_t1', rem: 1200, savedAt: Date.now(), paused: false
          }),
        },
      });
      await page.evaluate(() => window._tryRestoreFocusSession());
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const r = await page.evaluate(() => ({
        timerRestored: !!document.querySelector('.focus-timer.open'),
      }));
      await expectAll('session restore', { ...r, noErrors: !errors.length });
      ok('session restore: _tryRestoreFocusSession() opens timer from today_focus_session');
      await page.close();
    }

    // 11. _focusReanchor no-throw with no active session.
    {
      const { page, errors } = await openPage();
      const r = await page.evaluate(() => {
        try { window._focusReanchor(); return { noThrow: true }; }
        catch (e) { return { noThrow: false, error: e.message }; }
      });
      await expectAll('_focusReanchor no-throw', { ...r, noErrors: !errors.length });
      ok('_focusReanchor: no-throw with no active session');
      await page.close();
    }

    // 12. Document PiP: real focus state drives the floating document and all
    //     three controls feed back into the main session lifecycle.
    {
      const { page, errors } = await openPage({ pip: true });
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      const result = await page.evaluate(async () => {
        const state = window.__focusPipTest;
        state.setVisibility('hidden');
        await new Promise(resolve => setTimeout(resolve, 150));
        const pip = state.windows[0];
        const doc = pip?.document;
        const open = doc?.getElementById('pipOpen');
        const pause = doc?.getElementById('pipPause');
        const rest = doc?.getElementById('pipClose');
        const initial = {
          openedOnce: state.requests.length === 1,
          requestedSize: state.requests[0]?.width === 300 && state.requests[0]?.height === 200,
          taskMirrored: doc?.getElementById('pipTask')?.textContent === 'Write the tests',
          timerMirrored: doc?.getElementById('pipTime')?.textContent === '25:00',
          controlsNamed: open?.getAttribute('aria-label') === 'Open TODAY'
            && pause?.getAttribute('aria-label') === 'Pause focus timer'
            && rest?.getAttribute('aria-label') === 'End focus session',
        };

        open.click();
        pause.click();
        const paused = pause.textContent === 'Resume'
          && pause.getAttribute('aria-pressed') === 'true'
          && document.getElementById('focusPaused')?.classList.contains('show');
        pause.click();
        const resumed = pause.textContent === 'Breathe'
          && pause.getAttribute('aria-pressed') === 'false'
          && !document.getElementById('focusPaused')?.classList.contains('show');

        window._pipSync(0, 1500);
        const complete = doc.getElementById('pipTime')?.textContent === '00:00'
          && pause.textContent === 'Again'
          && doc.querySelector('.pip-bar')?.classList.contains('complete')
          && doc.getElementById('pipFill')?.getAttribute('aria-valuenow') === '1500';
        pause.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        const restarted = doc.getElementById('pipTime')?.textContent === '25:00'
          && pause.textContent === 'Breathe'
          && !doc.querySelector('.pip-bar')?.classList.contains('complete');

        rest.click();
        await new Promise(resolve => setTimeout(resolve, 260));
        return {
          ...initial,
          openReturnsToApp: state.openerFocusCalls === 1,
          paused,
          resumed,
          complete,
          restarted,
          pipClosed: pip.closed === true,
          focusClosed: !document.querySelector('.focus-timer.open'),
          sessionCleared: localStorage.getItem('today_focus_session') === null,
        };
      });
      await expectAll('focus Document PiP lifecycle', { ...result, noErrors: !errors.length });
      ok('focus Document PiP mirrors state and Open/Breathe/Again/Rest preserve the session lifecycle');
      await page.close();
    }

    // 13. Static wiring — file reads only.
    {
      const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
      const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
      const modSrc   = await readFile(join(ROOT, 'assets/focus.js'), 'utf8');
      const composition = indexSrc;
      const splashIdx = composition.indexOf('window._startSplash();');
      const focusIdx  = composition.indexOf('window._startFocus();');
      const initIdx   = composition.indexOf('\ninit();');
      await expectAll('static wiring', {
        scriptTag:           indexSrc.includes('<script src="/assets/focus.js"></script>'),
        startupCall:         focusIdx !== -1,
        // _startFocus() must come after _startSplash() (preserves current load order)
        afterSplash:         splashIdx !== -1 && focusIdx !== -1 && focusIdx > splashIdx,
        // _startFocus() must come after init() — matches current inline IIFE position
        afterInit:           initIdx !== -1 && focusIdx !== -1 && focusIdx > initIdx,
        focusIIFERemoved:    !indexSrc.includes('const TOTAL  = 25 * 60;'),
        tombstonePresent:    indexSrc.includes('moved to assets/focus.js'),
        moduleWrapper:       modSrc.includes('window._startFocus = '),
        exportFocusOnCheck:  modSrc.includes('window._focusOnCheck '),
        exportTryRestore:    modSrc.includes('window._tryRestoreFocusSession '),
        exportReanchor:      modSrc.includes('window._focusReanchor '),
        exportPipSync:       modSrc.includes('window._pipSync '),
        exportPipClose:      modSrc.includes('window._pipClose '),
        precached:           swSrc.includes("'/assets/focus.js'"),
      });
      ok('static wiring: script tag, startup call, IIFE removed, all exports present, precached');
    }

    // 14. _focusExpandTimer overflow correction: when the timer's projected bottom
    //     exceeds (viewport - footer - 8px) during scroll-lock, body.top shifts up.
    {
      const { page, errors } = await openPage();
      await page.click('.task-text');
      await page.waitForFunction(
        () => document.querySelector('.focus-timer.open') !== null,
        { timeout: 3000 }
      );
      // Simulate scroll-lock (focus.js sets this during start()) and place the
      // timer so its bottom overflows the footer boundary.
      const r = await page.evaluate(() => {
        const timerEl = document.querySelector('.focus-timer');
        if (!timerEl) return { overflowCorrected: false, reason: 'no timer' };

        // Install a fake fixed-footer so _focusExpandTimer can measure it.
        let fakeFooter = document.querySelector('.add-task-row');
        let createdFakeFooter = false;
        if (!fakeFooter) {
          fakeFooter = document.createElement('div');
          fakeFooter.className = 'add-task-row';
          Object.assign(fakeFooter.style, { position: 'fixed', bottom: '0', height: '70px', width: '100%' });
          document.body.appendChild(fakeFooter);
          createdFakeFooter = true;
        }

        // Apply scroll-lock styling (mirrors what focus.js does in start()).
        const lockScrollY = 200;
        document.body.style.position = 'fixed';
        document.body.style.top      = -lockScrollY + 'px';
        document.body.style.width    = '100%';

        // Force the timer to appear near the bottom of the viewport so it overflows.
        const vh = window.innerHeight;
        Object.assign(timerEl.style, { position: 'fixed', top: (vh - 60) + 'px' });

        // Stub scrollHeight so _focusExpandTimer sees a tall timer (200px).
        Object.defineProperty(timerEl, 'scrollHeight', { get: () => 200, configurable: true });

        const topBefore = parseInt(document.body.style.top || '0', 10);
        window._focusExpandTimer();
        const topAfter = parseInt(document.body.style.top || '0', 10);

        if (createdFakeFooter) fakeFooter.remove();

        return { overflowCorrected: topAfter < topBefore };
      });
      await expectAll('_focusExpandTimer overflow correction', { ...r, noErrors: !errors.length });
      ok('_focusExpandTimer: shifts body.top up when timer overflows footer boundary');
      await page.close();
    }

    // Contextual Ask: one preparation per deliberate visit, then a cached reveal.
    const focusFixture = async ({configured=true,hoverHover=true,reduced=false}={}) => {
      const f=await openPage({hoverHover,extraSeed:{
        today_manual:JSON.stringify([{id:'manual_one',text:'Choose the export format',focusSessions:8,revived:1},{id:'manual_two',text:'Wait for Maya to send the signed contract Friday'}]),
        today_habits:JSON.stringify([{id:'habit_read',name:'Read fiction'},{id:'habit_walk',name:'Walk'}]),
        ...(configured?{today_ai_key_claude:'test-key',today_ai_key_gemini:'test-key'}:{}),
      }});
      if(reduced)await f.page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await f.page.evaluate(()=>{
        window.__asks=[];window.__spoken=[];
        window._memoryRecordSpokenLine=(...args)=>__spoken.push(args);
        const original=window.fetch;
        window.fetch=(url,options)=>{
          if(!String(url).includes('ai-assist'))return original(url,options);
          const body=JSON.parse(options.body);
          if(!body.systemPrompt?.startsWith('Prepare at most one optional focus suggestion'))return original(url,options);
          return new Promise((resolve,reject)=>{
            const request={body,signal:options.signal,reject};
            request.reply=(data,mode)=>resolve({ok:mode!=='http',status:mode==='http'?503:200,json:()=>{
              if(mode==='json')return Promise.reject(new SyntaxError('Synthetic malformed response'));
              if(mode==='body')return new Promise(resolve=>request.finishBody=resolve);
              return Promise.resolve(data);
            }});
            __asks.push(request);
          });
        };
      });
      return f;
    };
    const enter=async(page,id='manual_one')=>{
      const count=await page.evaluate(()=>__asks.length);
      await page.evaluate(id=>{
        if(id.startsWith('habit_')&&!Today.use('sidebar').isOpen('habits'))Today.use('habits').toggleHabits();
        const row=document.querySelector(id.startsWith('habit_')?'[data-habit-id="'+id+'"]':'[data-taskid="'+id+'"]');
        row.querySelector(id.startsWith('habit_')?'.habit-name':'.task-text').click();
      },id);
      try {await page.waitForFunction(count=>__asks.length===count+1&&document.querySelector('.focus-timer.open'),{timeout:5000},count);}
      catch(error){console.error('Suggestion entry state',await page.evaluate(({id,count})=>({id,count,asks:__asks.length,focused:[...document.querySelectorAll('.focused')].map(e=>e.dataset),timer:document.querySelector('.focus-timer')?.className,hidden:document.querySelector('.focus-timer')?.hidden,source:habitsList.map(h=>({id:h.id,name:h.name})),sidebar:document.getElementById('habitsPanel')?.className}),{id,count}));throw error;}
      return count;
    };
    const leave=async page=>{
      await page.keyboard.press('Escape');
      if(await page.$eval('.focus-timer',e=>e.classList.contains('open')))await page.keyboard.press('Escape');
      await page.waitForFunction(()=>!document.querySelector('.focus-timer.open')&&!window._focusJustExited);
    };
    const payload=(text='Which export format does the recipient need?',kind='question')=>({content:JSON.stringify({kind,text})});
    const reply=async(page,index,data=payload(),mode)=>{
      await page.evaluate(({index,data,mode})=>{
        if(mode==='network')__asks[index].reject(new Error('Synthetic offline'));
        else __asks[index].reply(data,mode);
      },{index,data,mode});
    };
    const ready=page=>page.waitForSelector('.focus-timer.ai-ready');
    const quiet=page=>page.waitForFunction(()=>!document.querySelector('.focus-timer').classList.contains('ai-preparing')&&document.querySelector('.focus-ai-timer-btn').hidden);
    const clickControl=async(page,selector)=>{
      await page.waitForFunction(selector=>{const e=document.querySelector(selector);if(!e||e.closest('[hidden]'))return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));},{timeout:5000},selector);
      await page.click(selector);
    };
    const reveal=async(page,index=0,data=payload())=>{
      await reply(page,index,data);await ready(page);await clickControl(page,'.focus-ai-timer-btn');
      await page.waitForSelector('.focus-timer.has-focus-answer');
    };
    {
      const {page,errors}=await focusFixture();
      await page.evaluate(()=>{
        appMemory.preferences={...appMemory.preferences,dragKeywords:['export','export']};
        appMemory.patterns.letgoReasons={no_energy:10};
        appMemory.memory={semantic:[{id:'private',text:'Private confirmed inference marker',status:'confirmed'}],procedural:[],episodic:[]};
      });
      const index=await enter(page);
      await mkdir(join(ROOT,'.context/focus-offer-test'),{recursive:true});
      await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
      await page.screenshot({path:join(ROOT,'.context/focus-offer-test/preparing.png'),fullPage:true});
      const before=await page.evaluate(()=>({session:JSON.parse(localStorage.getItem('today_focus_session')),body:__asks[0].body}));
      await expectAll('pending suggestion earns no attention or timer change',{
        hidden:await page.$eval('.focus-ai-timer-btn',e=>e.hidden&&!e.checkVisibility()),
        accessibleTimer:await page.$eval('#focusTime',e=>!e.inert&&!e.hasAttribute('aria-hidden')),
        notAnswer:await page.$eval('.focus-timer',e=>!e.classList.contains('ai-active')),
        taskOnly:before.body.messages[0].content==='Task: "Choose the export format"',
        noPrivateContext:!JSON.stringify(before.body).includes('Private confirmed')&&!JSON.stringify(before.body).includes('Maya'),
        noRoutingOverride:!Object.hasOwn(before.body,'surface')&&!Object.hasOwn(before.body,'model'),
        abstention:before.body.systemPrompt.includes('otherwise abstain')&&before.body.systemPrompt.includes('already sufficient'),
      });
      await reply(page,index);await ready(page);
      await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
      await page.screenshot({path:join(ROOT,'.context/focus-offer-test/ready.png'),fullPage:true});
      await expectAll('prepared help is private until revealed',{
        cue:await page.$eval('.focus-ai-timer-btn',e=>!e.hidden&&e.getAttribute('aria-label')==='Show focus suggestion'&&e.getAnimations().some(a=>a.effect.getTiming().iterations===Infinity)),
        noSpokenLine:await page.evaluate(()=>__spoken.length===0),
        noFeedback:await page.$eval('.focus-ask-feedback',e=>e.hidden),
        timerAvailable:await page.$eval('#focusTime',e=>!e.inert),
        noSavedCandidate:await page.evaluate(()=>!JSON.stringify(Object.entries(localStorage)).includes('Which export format does the recipient need?')),
      });
      await page.keyboard.press('Space');
      await expectAll('paused cue is absent from keyboard and accessibility navigation',{hidden:await page.$eval('.focus-ai-timer-btn',e=>e.hidden&&!e.checkVisibility())});
      await page.keyboard.press('Space');
      await page.waitForSelector('.focus-ai-timer-btn:not([hidden])');
      await page.focus('.focus-ai-timer-btn');await page.keyboard.press('Enter');
      await page.waitForSelector('.focus-timer.has-focus-answer');
      await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
      await page.screenshot({path:join(ROOT,'.context/focus-offer-test/revealed.png'),fullPage:true});
      await expectAll('keyboard reveals cached help without another request',{
        singleCall:await page.evaluate(()=>__asks.length===1),
        spokenOnce:await page.evaluate(()=>__spoken.length===1),
        answer:await page.$eval('.focus-ai-timer-btn',e=>e.textContent==='Which export format does the recipient need?'&&e.textContent===e.getAttribute('aria-label')&&!e.getAnimations().some(a=>a.effect.getTiming().iterations===Infinity)),
        timerState:await page.evaluate(before=>{const now=JSON.parse(localStorage.getItem('today_focus_session'));return now.taskId===before.taskId&&now.paused===before.paused;},before.session),
        counterInert:await page.$eval('#focusTime',e=>e.inert),
      });
      await clickControl(page,'.focus-ask-feedback');await page.waitForSelector('#focusAskFeedback:not([hidden])');
      const stored=await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([k])=>k!=='today_focus_session').sort()));
      await clickControl(page,'#focusAskFeedback [data-choice="landed"]');
      await expectAll('exact-answer rating neither generates nor persists',{
        pressed:await page.$eval('[data-choice="landed"]',e=>e.getAttribute('aria-pressed')==='true'),
        oneCall:await page.evaluate(()=>__asks.length===1),
        localOnly:stored===await page.evaluate(()=>JSON.stringify(Object.entries(localStorage).filter(([k])=>k!=='today_focus_session').sort())),
      });
      await clickControl(page,'#focusAskFeedback [data-choice="missed"]');
      await clickControl(page,'#focusAskFeedback [data-today-click="focus-ask.clear"]');
      await expectAll('revision and clear affect only the exact rating',{cleared:await page.$eval('[data-choice="missed"]',e=>e.getAttribute('aria-pressed')==='false')});
      await page.focus('.focus-ai-timer-btn');await page.keyboard.press('Enter');await quiet(page);
      await expectAll('dismissal consumes this visit and restores keyboard focus',{
        hiddenFeedback:await page.$eval('.focus-ask-feedback',e=>e.hidden),
        counter:await page.$eval('#focusTime',e=>!e.inert&&document.activeElement===e),
      });
      await page.evaluate(()=>{document.querySelector('.focus-ai-timer-btn').click();_focusReanchor();document.querySelector('.task.focused .task-text').click();});
      await page.keyboard.press('Space');await page.keyboard.press('Space');
      await expectAll('dismiss/re-anchor/pause/resume do not regenerate',{oneCall:await page.evaluate(()=>__asks.length===1)});
      await leave(page);const next=await enter(page);
      await expectAll('a new deliberate visit can prepare once again',{fresh:await page.evaluate(i=>__asks[i].body.messages[0].content==='Task: "Choose the export format"',next),noErrors:!errors.length});
      await page.close();ok('one quiet preparation, ready-only cue, cached keyboard reveal, feedback and consumed dismissal');
    }
    // Only structured, format-valid suggestions can earn a cue. Acknowledgements abstain.
    const invalid=[payload('','none'),payload('The named wait is sufficient.','acknowledgement'),{content:'Which format do you need?'},{content:'```json\n{"kind":"question","text":"Which format?"}\n```'},payload('Which format?\nWhy?'),payload('Which format? Why?'),payload('Which format!'),payload('one '.repeat(20),'action'),{content:'null'},{content:'{"kind":"action","text":"Send the form.","useful":true}'},{content:''}];
    for(const data of invalid){
      const {page,errors}=await focusFixture();const index=await enter(page);await reply(page,index,data);await quiet(page);
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      await expectAll('abstention or invalid output stays hidden without retry',{oneCall:await page.evaluate(()=>__asks.length===1&&__spoken.length===0),timer:await page.$eval('#focusTime',e=>!e.inert),noErrors:!errors.length});await page.close();
    }
    for(const mode of ['network','http','json']){
      const {page,errors}=await focusFixture();const index=await enter(page);await reply(page,index,payload(),mode);await quiet(page);
      await expectAll('transient failure earns no cue or retry',{oneCall:await page.evaluate(()=>__asks.length===1&&__spoken.length===0),noErrors:!errors.length});await page.close();
    }
    ok('abstention, malformed output and network/HTTP/JSON failures stay silent; no automatic retries');
    for(const phase of ['headers','body','ready'])for(const change of ['edit','delete','done','exit','switch','config','day']){
      const {page,errors}=await focusFixture();const index=await enter(page);
      if(phase==='body'){await reply(page,index,payload(),'body');await page.waitForFunction(()=>!!__asks[0].finishBody);}
      if(phase==='ready'){await reply(page,index);await ready(page);}
      await page.evaluate(change=>{
        if(change==='edit'){manualTasks[0].text='Choose the delivery date';document.querySelector('[data-taskid="manual_one"] .task-text').textContent=manualTasks[0].text;}
        if(change==='delete')document.querySelector('[data-taskid="manual_one"]').remove();
        if(change==='done'){doneIds.add('manual_one');document.querySelector('[data-taskid="manual_one"]').classList.add('done');}
        if(change==='switch')document.querySelector('[data-taskid="manual_two"] .task-text').click();
        if(change==='config')localStorage.setItem('today_ai_key_claude','changed-key');
        if(change==='day'){const Native=Date,shift=86400000;window.Date=class extends Native{constructor(...args){super(...(args.length?args:[Native.now()+shift]));}static now(){return Native.now()+shift;}};}
      },change);
      if(change==='exit')await leave(page);
      if(phase==='headers')await reply(page,index);
      if(phase==='body')await page.evaluate(data=>__asks[0].finishBody(data),payload());
      if(change==='switch')await page.waitForFunction(()=>__asks.length===2);
      else await quiet(page);
      // A synthetic click also checks the synchronous source fence before the observer's next poll.
      await page.evaluate(()=>document.querySelector('.focus-ai-timer-btn').click());
      await expectAll('late '+phase+' cannot survive '+change,{
        noOldAnswer:await page.$eval('.focus-ai-timer-btn',e=>e.hidden&&!e.textContent.includes('recipient')),
        unrecorded:await page.evaluate(()=>__spoken.length===0),noErrors:!errors.length,
      });await page.close();
    }
    ok('headers, delayed bodies and ready candidates are fenced after edit/delete/completion/exit/switch/config/day changes');
    for(const phase of ['headers','body']){
      const {page,errors}=await focusFixture();
      await page.evaluate(()=>{const native=setTimeout;window.setTimeout=(fn,ms,...args)=>{if(ms===25000)window.__expireAsk=fn;return native(fn,ms,...args);};});
      const index=await enter(page);
      if(phase==='body'){await reply(page,index,payload(),'body');await page.waitForFunction(()=>!!__asks[0].finishBody);}
      await page.evaluate(()=>__expireAsk());await quiet(page);
      if(phase==='body')await page.evaluate(data=>__asks[0].finishBody(data),payload());else await reply(page,index);
      await expectAll('deadline covers '+phase,{aborted:await page.evaluate(()=>__asks[0].signal.aborted),silent:await page.evaluate(()=>__asks.length===1&&__spoken.length===0),noErrors:!errors.length});await page.close();
    }
    ok('one 25-second deadline covers headers and body; expired responses never gain a cue');
    {
      const {page,errors}=await focusFixture({reduced:true});const index=await enter(page,'habit_read');
      await reply(page,index,payload('Which story would you like to spend time with?'));await ready(page);
      await expectAll('habit context and reduced-motion cue',{nameOnly:await page.evaluate(()=>__asks[0].body.messages[0].content==='Habit: "Read fiction"'),noLoop:await page.$eval('.focus-ai-timer-btn',e=>e.getAnimations().length===0),stillAvailable:await page.$eval('.focus-ai-timer-btn',e=>!e.hidden)});
      await clickControl(page,'.focus-ai-timer-btn');await page.waitForSelector('.focus-timer.has-focus-answer');
      await leave(page);const other=await enter(page,'habit_walk');await reply(page,other,payload('Put on shoes.','action'));await quiet(page);
      await expectAll('habit action output is withheld',{noAction:await page.evaluate(()=>__spoken.length===1),otherNameOnly:await page.evaluate(i=>__asks[i].body.messages[0].content==='Habit: "Walk"',other),noErrors:!errors.length});await page.close();
    }
    for(const change of ['rename','archive','complete','habit-day']){
      const {page,errors}=await focusFixture();const index=await enter(page,'habit_read');await reply(page,index);await ready(page);
      await page.evaluate(change=>{
        if(change==='rename')habitsList[0].name='Read poetry';
        if(change==='archive')habitsList[0].archived=true;
        if(change==='complete')habitCompletions.habit_read=[_habitTodayISO()];
        if(change==='habit-day'){const native=_habitTodayISO;window._habitTodayISO=()=>native()==='1999-01-01'?'1999-01-02':'1999-01-01';}
        document.querySelector('.focus-ai-timer-btn').click();
      },change);
      await quiet(page);await expectAll('habit ready candidate invalidated on '+change,{unrecorded:await page.evaluate(()=>__spoken.length===0),noErrors:!errors.length});await page.close();
    }
    ok('habit-only questions, reduced-motion availability and live habit ownership fences');
    {
      const {page,errors}=await focusFixture();const index=await enter(page);
      const long='Which original input and export settings reproduce the crash before the file is written?';
      await reveal(page,index,payload(long));
      const geometry=()=>page.$eval('.focus-ai-timer-btn',e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
      const before=await geometry();await clickControl(page,'.focus-ask-feedback');await page.waitForSelector('#focusAskFeedback:not([hidden])');
      await clickControl(page,'[data-choice="landed"]');
      await expectAll('feedback preserves answer geometry',{fixed:JSON.stringify(before)===JSON.stringify(await geometry())});
      await page.setViewport({width:320,height:844});await page.waitForFunction(()=>document.querySelector('.focus-ai-timer-btn').classList.contains('question-scroll'));
      await expectAll('narrow answer stays separate from feedback',{
        notOverflowing:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
        distinct:await page.evaluate(()=>{const a=document.querySelector('.focus-ai-timer-btn').getBoundingClientRect(),b=document.querySelector('.focus-ask-feedback').getBoundingClientRect();return a.right<=b.left;}),
      });
      await page.setViewport({width:1280,height:900});await page.waitForFunction(()=>!document.querySelector('.focus-ai-timer-btn').classList.contains('question-scroll'));
      await expectAll('layout and feedback do not regenerate',{oneCall:await page.evaluate(()=>__asks.length===1),noErrors:!errors.length});await page.close();
    }
    {
      const {page,errors}=await focusFixture();const index=await enter(page);await reply(page,index,payload('','none'));await quiet(page);
      const restoredSession=await page.evaluate(()=>localStorage.getItem('today_focus_session'));
      await page.evaluateOnNewDocument(value=>localStorage.setItem('today_focus_session',value),restoredSession);
      let preparationCalls=0;
      await page.setRequestInterception(true);
      page.on('request',request=>{
        if(request.url().includes('ai-assist')&&request.postData()?.includes('Prepare at most one optional focus suggestion')){preparationCalls++;request.respond({status:503,body:'{}'});}
        else request.continue();
      });
      await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.focus-timer.open');
      await expectAll('restoring an existing Focus session makes no preparation request',{none:preparationCalls===0,hidden:await page.$eval('.focus-ai-timer-btn',e=>e.hidden),noErrors:!errors.length});await page.close();
    }
    {
      const {page,errors}=await focusFixture();await page.setBypassServiceWorker(true);await page.setCacheEnabled(false);await page.setRequestInterception(true);
      let failedHelpers=0;
      page.on('request',request=>{if(new URL(request.url()).pathname==='/assets/focus-ask.js'){failedHelpers++;request.respond({status:503,body:''});}else request.continue();});
      await page.evaluate(()=>document.querySelector('.task-text').click());await page.waitForSelector('.focus-timer.open');await quiet(page);
      await expectAll('missing suggestion helper stays silent without a model call',{none:await page.evaluate(()=>__asks.length===0),actuallyUnavailable:failedHelpers===1,noErrors:!errors.length});await page.close();
    }
    for(const options of [{configured:false},{hoverHover:false}]){
      const {page,errors}=await focusFixture(options);await page.evaluate(()=>document.querySelector('.task-text').click());
      if(options.hoverHover!==false)await page.waitForSelector('.focus-timer.open');
      await expectAll('no connection or mobile means no preparation',{none:await page.evaluate(()=>__asks.length===0),hidden:await page.$$eval('.focus-ai-timer-btn',buttons=>buttons.every(e=>e.hidden)),noErrors:!errors.length});await page.close();
    }
    ok('answer/feedback layout remains responsive; mobile and unconfigured Focus never prepare');
    console.log('\nFocus tests passed (timer/PiP and contextual suggestion checks).');

  }
} finally {
  if (browser) await browser.close();
  server.close();
}
