// TODAY — platform behavior regression test
//
// Exercises PWA install events/browser promotion, mobile-keyboard positioning,
// service-worker registration, and bfcache wake handling.
// Run from repo root: node scripts/platform-test.mjs

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { PNG } from 'pngjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT   = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME   = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
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

const ok = message => console.log('  ✓ ' + message);
let browser;
const fail = async (message, detail) => {
  console.error('✗ FAIL — ' + message);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

async function openPage(options = {}) {
  const page = await browser.newPage();
  await page.setViewport(options.viewport || { width: 1200, height: 800 });
  if (options.userAgent) await page.setUserAgent(options.userAgent);
  await page.evaluateOnNewDocument(opts => {
    window.__platformTest = {
      swRegistrations: [], promptCalls: 0, clipboardWrites: [],
      registrationListeners: {}, serviceWorkerListeners: {},
    };

    const originalMatchMedia = window.matchMedia.bind(window);
    const overlay = new EventTarget();
    overlay.matches = !!opts.windowControlsOverlay;
    overlay.media = '(display-mode: window-controls-overlay)';
    window.__setOverlay = visible => { overlay.matches = visible; overlay.dispatchEvent(new Event('change')); };
    window.matchMedia = query => {
      // The synthetic desktop WCO fixture needs desktop input as well as window
      // geometry. Linux headless Chromium otherwise reports hover:none, which
      // correctly prevents the app from registering desktop Focus handlers.
      if (opts.desktop && (query === '(hover: hover)' || query === '(pointer: fine)')) {
        return { matches:true, media:query, onchange:null,
          addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; } };
      }
      if (query === '(pointer: coarse)') {
        return { matches: !!opts.coarse, media: query, onchange: null,
          addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; } };
      }
      if (query === '(display-mode: window-controls-overlay)') {
        return overlay;
      }
      if (query === '(display-mode: standalone)') {
        return { matches: !!opts.standalone, media: query, onchange: null,
          addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; } };
      }
      return originalMatchMedia(query);
    };
    if (opts.suppressInstallPrompt) {
      window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    }

    if (opts.platform !== undefined) {
      Object.defineProperty(navigator, 'platform', { configurable: true, get: () => opts.platform });
    }
    if (opts.maxTouchPoints !== undefined) {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => opts.maxTouchPoints });
    }
    Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => !!opts.standalone });

    const registration = {
      waiting: null,
      installing: null,
      update: () => Promise.resolve(),
      addEventListener: (type, fn) => { window.__platformTest.registrationListeners[type] = fn; },
    };
    const serviceWorker = {
      controller: null,
      register: async path => {
        window.__platformTest.swRegistrations.push(path);
        return registration;
      },
      addEventListener: (type, fn) => { window.__platformTest.serviceWorkerListeners[type] = fn; },
    };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => { window.__platformTest.clipboardWrites.push(text); },
    } });

    if (opts.coarse) {
      const vv = new EventTarget();
      vv.offsetTop = 0;
      vv.height = opts.viewportHeight || 600;
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
      window.__setVisualViewport = (offsetTop, height, type = 'resize') => {
        vv.offsetTop = offsetTop;
        vv.height = height;
        vv.dispatchEvent(new Event(type));
      };
    }

    // Each fictional page owns its storage; Focus/sidebar actions must not seed
    // another profile's startup or keyboard behavior.
    try { localStorage.clear();localStorage.setItem('splash_shown_at', Date.now().toString()); } catch {}
  }, {
    platform: options.platform,
    maxTouchPoints: options.maxTouchPoints,
    coarse: !!options.coarse,
    standalone: !!options.standalone,
    windowControlsOverlay: !!options.windowControlsOverlay,
    desktop: !!options.desktop,
    suppressInstallPrompt: !!options.userAgent || !!options.standalone || !!options.windowControlsOverlay,
    viewportHeight: options.viewport?.height || 600,
  });

  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(URL_BASE, { waitUntil: 'load', timeout: 15000 });
  await page.waitForFunction(() => window.__platformTest.swRegistrations.length === 1, { timeout: 3000 });
  await page.evaluate(()=>Today.use('sidebar').open('about'));
  return { page, errors };
}

const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const FIREFOX    = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0';

// Judge rendered continuity, not the gradient's CSS spelling. An abrupt edge or
// a flat dark patch must fail even when the endpoint colours are correct.
function softTitleBlend(line, from, to) {
  const near=(a,b)=>a.every((channel,i)=>Math.abs(channel-b[i])<=1);
  return near(line[0],from)&&near(line.at(-1),to)
    &&new Set(line.map(rgb=>rgb.join(','))).size>=5
    &&line.slice(1).every((rgb,i)=>rgb.every((channel,c)=>Math.abs(channel-line[i][c])<=2
      &&(to[c]>=from[c]?channel>=line[i][c]-1:channel<=line[i][c]+1)));
}

async function titleBlendPaint(page, profile) {
  const geometry=await page.evaluate(profile=>{
    const pane=document.getElementById('sidebarRoot'),r=pane.getBoundingClientRect();
    const rgb=value=>value.match(/\d+/g).slice(0,3).map(Number);
    const feather=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-6'));
    return {pane:r.left,bg:rgb(getComputedStyle(document.body).backgroundColor),surface:rgb(getComputedStyle(pane).backgroundColor),
      edge:profile.x+profile.free,feather};
  },profile);
  assert.ok(geometry.edge-geometry.feather-2>geometry.pane+2,'blend sample must lie inside the sidebar');
  const bytes=await page.screenshot({fullPage:false}),png=PNG.sync.read(bytes);
  const pixel=(x,y)=>{const offset=(y*png.width+x)*4;return [...png.data.slice(offset,offset+3)];};
  const horizontal=[],vertical=[];
  for(let x=geometry.edge-geometry.feather-2;x<=geometry.edge+2;x++)horizontal.push(pixel(x,4));
  for(let y=profile.height-2;y<=profile.height+geometry.feather+2;y++)vertical.push(pixel(profile.width-4,y));
  return {...geometry,horizontal,vertical,bytes};
}

const blendedTitle=paint=>softTitleBlend(paint.horizontal,paint.surface,paint.bg)
  &&softTitleBlend(paint.vertical,paint.bg,paint.surface);

// Exercise Chromium's real standalone renderer mode in an isolated app window.
// --app creates no installation/OS shortcut and Puppeteer owns the disposable profile.
// This complements the synthetic WCO/native-title geometry tests below.
async function checkDesktopAppHeader() {
  const url=URL_BASE+'/?desktop-header-fixture';
  const appBrowser=await puppeteer.launch({executablePath:CHROME,headless:'new',ignoreDefaultArgs:['about:blank'],
    args:['--no-first-run','--disable-extensions','--app='+url,
      '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4']});
  const evidence=join(ROOT,'.context/ci-test-results/desktop-pwa-header');
  try {
    await mkdir(evidence,{recursive:true});
    const target=await appBrowser.waitForTarget(t=>t.url()===url,{timeout:15000});
    const page=await target.page(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setViewport({width:1280,height:800});
    await page.evaluate(()=>{localStorage.clear();localStorage.setItem('splash_shown_at',String(Date.now()));});
    await page.reload({waitUntil:'load',timeout:15000});
    await page.waitForFunction(()=>!document.body.hasAttribute('data-booting')&&performance.getEntriesByName('today:interactive').length>0,{timeout:15000});
    const modes=await page.evaluate(()=>({standalone:matchMedia('(display-mode: standalone)').matches,
      wco:matchMedia('(display-mode: window-controls-overlay)').matches,browser:matchMedia('(display-mode: browser)').matches,
      hover:matchMedia('(hover: hover)').matches,fine:matchMedia('(pointer: fine)').matches}));
    assert.deepEqual(modes,{standalone:true,wco:false,browser:false,hover:true,fine:true},'fixture must use real non-WCO desktop standalone predicates');
    await page.evaluate(()=>{
      manualTasks=Array.from({length:120},(_,i)=>({id:'manual_app_header_'+i,text:'Fictional app-window task '+i}));
      Today.use('connections').renderManual();
    });
    await page.click('.task[data-taskid="manual_app_header_0"] .task-text');
    await page.waitForSelector('.focus-timer.open',{visible:true,timeout:3000});
    assert.equal(await page.evaluate(()=>document.body.classList.contains('focus-locked')),true,'real desktop Focus must lock the page');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.body.classList.contains('focus-locked')&&!document.querySelector('.focus-timer.open'),{timeout:3000});
    await page.evaluate(()=>{
      const spacer=document.createElement('div');spacer.id='appHeaderSpacer';spacer.style.height='1200px';
      const marker=document.createElement('div');marker.id='appHeaderBackdrop';marker.setAttribute('aria-hidden','true');
      marker.style.cssText='height:1800px;width:100vw;margin-left:calc(50% - 50vw);pointer-events:none';
      document.getElementById('main-app').prepend(spacer,marker);
    });
    const settle=()=>page.evaluate(async()=>{
      const nodes=[document.getElementById('sticky-header'),document.getElementById('main-app'),document.getElementById('sidebarRoot')];
      await Promise.all(nodes.flatMap(n=>n.getAnimations()).filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));
      const marker=document.getElementById('appHeaderBackdrop');scrollTo(0,scrollY+marker.getBoundingClientRect().top-4);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });
    async function paintedPair(name,expectGlass) {
      const samples=[];
      for(const [label,color] of [['red','rgb(255, 0, 0)'],['blue','rgb(0, 0, 255)']]){
        await page.evaluate(color=>document.getElementById('appHeaderBackdrop').style.background=color,color);
        await settle();
        const state=await page.evaluate(()=>{
          const header=document.getElementById('sticky-header'),r=header.getBoundingClientRect(),style=getComputedStyle(header);
          const under=document.getElementById('appHeaderBackdrop').getBoundingClientRect();
          const probe=document.createElement('span');probe.style.background='var(--bg-glass)';document.body.append(probe);
          const expected=getComputedStyle(probe).backgroundColor;probe.remove();
          return {top:r.top,height:r.height,scroll:scrollY,width:innerWidth,background:style.backgroundColor,expected,
            filter:style.backdropFilter||style.webkitBackdropFilter,opacity:Number(style.opacity),visibility:style.visibility,
            under:{x:under.x,y:under.y,right:under.right,bottom:under.bottom},sampleY:Math.floor(r.height/2)};
        });
        assert.ok(state.scroll>900&&Math.abs(state.top)<1,'long-list standalone header must remain pinned: '+JSON.stringify(state));
        assert.ok(state.under.x<=16&&state.under.right>=24&&state.under.y<=5&&state.under.bottom>state.sampleY+8,'backdrop must cover the sampled header patch');
        if(expectGlass){
          assert.equal(state.visibility,'visible','the sampled header must actually be visible');
          assert.equal(state.background,state.expected,'standalone must retain its glass background after resize, sidebar and Focus');
          assert.ok(state.filter.includes('blur(16px)'),'standalone must retain backdrop blur');
        }
        // Sample the current viewport: a document-coordinate clip at y=0 would
        // capture empty space above the sticky header after scrolling.
        const bytes=await page.screenshot({fullPage:false});
        await writeFile(join(evidence,name+'-'+label+'.png'),bytes);
        const png=PNG.sync.read(bytes),rgb=[0,0,0];
        for(let y=state.sampleY;y<state.sampleY+8;y++)for(let x=16;x<24;x++){
          const offset=(y*png.width+x)*4;for(let c=0;c<3;c++)rgb[c]+=png.data[offset+c]/64;
        }
        samples.push({...state,rgb});
      }
      const contrast=Math.max(...samples[0].rgb.map((value,i)=>Math.abs(value-samples[1].rgb[i])));
      await writeFile(join(evidence,name+'.json'),JSON.stringify({modes,samples,contrast},null,2));
      if(expectGlass)assert.ok(contrast>2,'standalone header must visibly transmit the changing backdrop, not paint a solid band: '+JSON.stringify({name,contrast,samples}));
      return {contrast,samples};
    }
    for(const width of [1280,736]){
      await page.setViewport({width,height:800});
      for(const open of [false,true]){
        await page.evaluate(open=>{if(open)Today.use('sidebar').open('about');else Today.use('sidebar').close(true);},open);
        await paintedPair(width+'-'+(open?'sidebar-open':'sidebar-closed'),true);
      }
    }
    await page.setViewport({width:1280,height:800});
    await page.evaluate(()=>Today.use('sidebar').close(true));
    // Causal control: the exact removed rule must erase rendered transmission.
    const oldRule=await page.addStyleTag({content:'@media (min-width:601px) and (display-mode:standalone){.sticky-header{background:var(--bg);backdrop-filter:none;-webkit-backdrop-filter:none;}}'});
    const opaque=await paintedPair('old-opaque-rule-control',false);
    assert.equal(opaque.samples[0].opacity,1,'opaque control requires an undimmed header');
    assert.ok(opaque.contrast<=1,'the old override must eliminate backdrop transmission');
    assert.equal(opaque.samples[0].filter,'none');
    await oldRule.evaluate(node=>node.remove());
    // A wrong-mode title underlay can black out the header while its own
    // computed background/filter still look correct. Pixels must catch that too.
    const blocker=await page.addStyleTag({content:'@media(display-mode:standalone){body::before{content:"";position:fixed;top:0;left:0;right:0;height:200px;background:var(--bg);z-index:calc(var(--z-header) - 1);pointer-events:none;}}'});
    const blocked=await paintedPair('opaque-underlay-control',false);
    assert.equal(blocked.samples[0].background,blocked.samples[0].expected,'underlay control preserves computed header glass');
    assert.ok(blocked.samples[0].filter.includes('blur(16px)'),'underlay control preserves computed backdrop blur');
    assert.ok(blocked.contrast<=1,'a wrong-mode opaque underlay must defeat the pixel guard despite correct computed styles');
    await blocker.evaluate(node=>node.remove());
    await paintedPair('glass-restored-after-control',true);
    assert.deepEqual(errors,[],'desktop app-window lifecycle must not throw');
    ok('real desktop standalone mode: pinned glass survives Focus, resize and sidebar; rendered pixels reject the old opaque rule and an opaque underlay');
  } finally {await appBrowser.close();}
}

try {
  // Extracted-module wiring and ownership boundary.
  {
    const indexSrc    = await readFile(join(ROOT, 'index.html'), 'utf8');
    const platformSrc = await readFile(join(ROOT, 'assets/platform.js'), 'utf8');
    const swSrc       = await readFile(join(ROOT, 'sw.js'), 'utf8');
    const failures = [];
    if (!indexSrc.includes('<script src="assets/platform.js"></script>')) failures.push('module script tag');
    if (!indexSrc.includes('window._startPlatform')) failures.push('initializer call');
    if (indexSrc.includes('// Mobile Keyboard Handling') || indexSrc.includes('// PWA Install Prompt (Android only)')) failures.push('duplicate inline platform block');
    if (!platformSrc.includes('window._startPlatform = function()')) failures.push('module initializer export');
    if (!platformSrc.includes("Today.define('platform'")) failures.push('Today platform API');
    if (!platformSrc.includes("navigator.serviceWorker.register('/sw.js')")) failures.push('service-worker registration');
    if (!platformSrc.includes("window.addEventListener('pageshow'")) failures.push('bfcache handler');
    if (!swSrc.includes("'/assets/platform.js'")) failures.push('service-worker precache');
    if (failures.length) await fail('platform module wiring regression', failures);
    ok('platform module wiring and service-worker precache');
  }

  // A desktop-installed app keeps its entire header at the top of a long list.
  // Only emulate the named native CSS condition; widths remain actual media queries.
  for(const standalone of [false,true]){
    const {page,errors}=await openPage({standalone});
    await page.evaluate(standalone=>{
      Today.use('sidebar').close(true);
      if(standalone)for(const sheet of document.styleSheets)for(const rule of sheet.cssRules)if(rule instanceof CSSMediaRule&&rule.conditionText==='(min-width: 601px) and (display-mode: standalone)')rule.media.mediaText='(min-width: 601px)';
      manualTasks=Array.from({length:120},(_,i)=>({id:'manual_sticky_'+i,text:'Fictional scrolling task '+i}));Today.use('connections').renderManual();
    },standalone);
    for(const width of [1280,736,390]){
      await page.setViewport({width,height:800});await page.evaluate(()=>scrollTo(0,1200));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const state=await page.evaluate(()=>({top:document.getElementById('sticky-header').getBoundingClientRect().top,bottom:document.getElementById('sticky-header').getBoundingClientRect().bottom,scroll:scrollY}));
      if(state.scroll<900||(standalone&&width>600?Math.abs(state.top)>1:state.bottom>0))await fail('installed desktop sticky header',{standalone,width,...state});
      if(width>600){
        const glass=await page.evaluate(()=>{
          const header=getComputedStyle(document.getElementById('sticky-header'));
          const probe=document.createElement('span');probe.style.background='var(--bg-glass)';document.body.append(probe);
          const expected=getComputedStyle(probe).backgroundColor;probe.remove();
          return {background:header.backgroundColor,expected,filter:header.backdropFilter||header.webkitBackdropFilter};
        });
        if(glass.background!==glass.expected||!glass.filter.includes('blur(16px)'))await fail('desktop browser and non-WCO standalone retain header glass',{standalone,width,...glass});
      }
    }
    if(errors.length)await fail('sticky fixture errors',errors);await page.close();
  }
  ok('desktop standalone header stays pinned and keeps glass; ordinary browser glass and phone scrolling remain intact');

  // Chromium can re-show its origin label after a theme-color change. Real
  // sidebar actions must cause zero metadata mutations, including transient ones.
  {
    const {page,errors}=await openPage({windowControlsOverlay:true});
    await page.evaluate(()=>{
      window.__themeWitness=document.querySelector('meta[name="theme-color"]');
      window.__sidebarThemeChanges=[];
      window.__themeObserver=new MutationObserver(records=>{for(const r of records)__sidebarThemeChanges.push({before:r.oldValue,after:__themeWitness.content});});
      __themeObserver.observe(__themeWitness,{attributes:true,attributeFilter:['content'],attributeOldValue:true});
      Today.use('sidebar').close(true);
    });
    for(let pass=0;pass<2;pass++)for(const [id,button]of [['habits','#habitsBtn'],['about','#infoBtn'],['memory','#todayLogo'],['explore','#trelloBtn']]){
      await page.click(button);
      await page.waitForFunction(id=>Today.use('sidebar').isOpen(id)&&!document.getElementById('sidebarRoot').classList.contains('entering'),{},id);
      await page.click('#sidebarRoot [data-sidebar-close],#sidebarRoot [data-ex-action="hide"]');
      await page.waitForFunction(()=>document.getElementById('sidebarRoot').hidden);
    }
    const state=await page.evaluate(()=>({changes:__sidebarThemeChanges,stillSameDocument:__themeWitness===document.querySelector('meta[name="theme-color"]'),theme:__themeWitness.content,base:getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()}));
    if(state.changes.length||!state.stillSameDocument||state.theme!==state.base)await fail('sidebar actions must not retrigger native origin UI through theme changes',state);
    if(errors.length)await fail('sidebar theme fixture errors',errors);
    await page.close();ok('cold/warm native sidebar actions keep theme-color unchanged and preserve the document');
  }

  // Native window chrome cannot be drawn headlessly. Exercise the actual overlay CSS
  // with left/right/compact browser-reported geometry, without changing selectors or
  // non-geometry declarations. Ordinary-tab fallback stays the real native media result.
  {
    const manifest = JSON.parse(await readFile(join(ROOT, 'manifest.json'), 'utf8'));
    if (manifest.display !== 'standalone' || !manifest.display_override?.includes('window-controls-overlay'))
      await fail('desktop overlay manifest or standalone fallback missing');
    const { page, errors } = await openPage({ windowControlsOverlay: true, desktop:true });
    const fallback = await page.$eval('#windowDragRegion', node => getComputedStyle(node).display === 'none' && node.getAttribute('aria-hidden') === 'true' && node.tabIndex < 0);
    if (!fallback) await fail('ordinary browser tab exposed the overlay drag region');
    const installed = await page.evaluate(() => getComputedStyle(document.getElementById('installBtn')).display === 'none'
      && getComputedStyle(document.getElementById('pwaInstallSection')).display === 'none');
    if (!installed) await fail('overlay PWA offered installation again');
    await page.evaluate(() => {
      document.body.classList.add('ex-open');
      const pane = document.getElementById('sidebarRoot');
      pane.hidden = false;
      pane.innerHTML = '<div class="ex-sheet-head"><h2 class="config-title">Explore</h2><button class="ex-hide" type="button">Close</button></div><div class="ex-sheet-scroll">Fictional conversation</div><div class="ex-sheet-foot">A question</div>';
      window.__overlayFixtureRules = [];
      for (const sheet of document.styleSheets) for (const media of sheet.cssRules) {
        if (!(media instanceof CSSMediaRule) || media.conditionText !== '(display-mode: window-controls-overlay)') continue;
        window.__overlayFixtureRules.push({media, original: media.media.mediaText,
          rules: [...media.cssRules].map(rule => ({rule, original: rule.style.cssText}))});
      }
      if (window.__overlayFixtureRules.length !== 1) throw Error('Expected one native overlay CSS block');
    });
    for (const profile of [
      {name:'left controls', width:1280, x:80, free:1200, height:32},
      {name:'Mac controls at both ends', width:1280, x:80, free:1060, height:38},
      {name:'right controls', width:1280, x:0, free:1140, height:32},
      {name:'compact window', width:736, x:0, free:596, height:40},
      {name:'narrow desktop window', width:390, x:80, free:310, height:32},
      {name:'overlay turned off', width:1280, x:0, free:1280, height:0},
      {name:'overlay restored', width:1280, x:80, free:1200, height:32},
    ]) {
      await page.setViewport({width:profile.width,height:800});
      const result = await page.evaluate(async profile => {
        const values = {'titlebar-area-x':profile.x,'titlebar-area-y':0,'titlebar-area-width':profile.free,'titlebar-area-height':profile.height};
        for (const item of window.__overlayFixtureRules) {
          item.media.media.mediaText = 'all';
          for (const saved of item.rules) saved.rule.style.cssText = saved.original.replace(/env\((titlebar-area-[a-z]+), 0px\)/g, (_,name) => values[name]+'px');
        }
        window.__setOverlay(profile.height > 0);
        await Promise.all([document.body,document.getElementById('sidebarRoot')].flatMap(node=>node.getAnimations())
          .filter(animation=>animation.effect.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));
        const drag=document.getElementById('windowDragRegion'), pane=document.getElementById('sidebarRoot');
        const rect=drag.getBoundingClientRect(),close=pane.querySelector('button').getBoundingClientRect();
        const header=document.querySelector('.sticky-header').getBoundingClientRect();
        const probe=document.createElement('span');probe.style.color=document.querySelector('meta[name=theme-color]').content;document.body.append(probe);
        const theme=getComputedStyle(probe).color;probe.style.background='var(--bg-glass)';
        const glass=getComputedStyle(probe).backgroundColor;probe.remove();
        const panelStyle=getComputedStyle(pane).backgroundColor;
        const panelColor=panelStyle==='rgba(0, 0, 0, 0)'?getComputedStyle(pane.querySelector('.ex-sheet-scroll')).backgroundColor:panelStyle;
        const common={drag:rect.x===profile.x&&rect.width===profile.free&&rect.height===profile.height,
          draggable:getComputedStyle(drag).getPropertyValue('-webkit-app-region')==='drag',
          headerBackground:getComputedStyle(document.querySelector('.sticky-header')).backgroundColor===(profile.width>600?glass:getComputedStyle(document.body).backgroundColor),
          headerBlur:profile.width>600?getComputedStyle(document.querySelector('.sticky-header')).backdropFilter.includes('blur(16px)'):getComputedStyle(document.querySelector('.sticky-header')).backdropFilter==='none',
          header:header.top>=profile.height,close:close.top>=profile.height,
          paneToWindowEdge:pane.getBoundingClientRect().top===0,
          paneFits:pane.getBoundingClientRect().bottom===innerHeight,
          controlsMatchToday:getComputedStyle(document.body).backgroundColor===theme,
          transparentDrag:getComputedStyle(drag).backgroundColor==='rgba(0, 0, 0, 0)',
          zeroHeightFallback:profile.height>0||getComputedStyle(drag,'::before').height==='0px',
          softerPane:panelColor!==getComputedStyle(document.body).backgroundColor,
          continuous:panelColor===getComputedStyle(pane.querySelector('.ex-sheet-foot')).backgroundColor,
          separator:getComputedStyle(pane.querySelector('.ex-sheet-foot')).borderTopWidth==='0px'};
        document.body.classList.add('focus-locked');
        common.focusHeader=document.querySelector('.sticky-header').getBoundingClientRect().top>=profile.height;
        document.body.classList.remove('focus-locked');
        return common;
      },profile);
      await mkdir(join(ROOT,'.context/ci-test-results/window-strip'),{recursive:true});
      await writeFile(join(ROOT,'.context/ci-test-results/window-strip',profile.name.replaceAll(' ','-')+'.json'),JSON.stringify(result,null,2));
      await page.screenshot({path:join(ROOT,'.context/ci-test-results/window-strip',profile.name.replaceAll(' ','-')+'.png'),clip:{x:0,y:0,width:profile.width,height:180}});
      if (Object.values(result).some(value=>!value)) await fail('window overlay geometry: '+profile.name,result);
      if(profile.height>0){
        const paintState=await page.evaluate(profile=>{
          const pane=document.getElementById('sidebarRoot').getBoundingClientRect();
          const rgb=token=>{const probe=document.createElement('span');probe.style.color='var('+token+')';document.body.append(probe);const value=getComputedStyle(probe).color.match(/\d+/g).slice(0,3).map(Number);probe.remove();return value;};
          const freeEnd=profile.x+profile.free,points=[];
          // The soft pane must reach the title area inside the browser's free region.
          const freeX=Math.ceil(Math.max(pane.left+32,profile.x+32));
          if(freeX<freeEnd-24)points.push({name:'continuous pane',x:freeX,y:4,expected:rgb('--surface')});
          // The fixed native colour must blend locally, at either occupied end.
          if(profile.x>pane.left+4)points.push({name:'left controls',x:Math.floor((pane.left+profile.x)/2),y:4,expected:rgb('--bg')});
          if(freeEnd<profile.width-4)points.push({name:'right controls',x:Math.floor(Math.max(freeEnd,pane.left)+(profile.width-Math.max(freeEnd,pane.left))/2),y:4,expected:rgb('--bg')});
          return points;
        },profile);
        const painted=async()=>{
          const bytes=await page.screenshot({fullPage:false}),png=PNG.sync.read(bytes);
          return {bytes,points:paintState.map(point=>{const offset=(point.y*png.width+point.x)*4;return {...point,actual:[...png.data.slice(offset,offset+3)]};})};
        };
        const matches=points=>points.every(point=>point.expected.every((channel,i)=>Math.abs(channel-point.actual[i])<=1));
        const paint=await painted();
        await writeFile(join(ROOT,'.context/ci-test-results/window-strip',profile.name.replaceAll(' ','-')+'-paint.json'),JSON.stringify(paint.points,null,2));
        if(!matches(paint.points))await fail('integrated title area or local native-control blend: '+profile.name,paint.points);
        // A transparent drag box alone cannot catch either the strip or native patches.
        if(profile.name==='Mac controls at both ends'){
          const blend=await titleBlendPaint(page,profile);
          await writeFile(join(ROOT,'.context/ci-test-results/window-strip/blend-edges.json'),JSON.stringify({...blend,bytes:undefined},null,2));
          assert.ok(blendedTitle(blend),'native control edges must feather into the pane in both directions');
          for(const [name,content] of [
            ['hard-bottom-edge','#windowDragRegion::before{height:var(--window-titlebar-height)!important}'],
            ['hard-side-edge','#windowDragRegion::before{mask-image:linear-gradient(to right,var(--bg) '+profile.x+'px,transparent '+profile.x+'px,transparent '+(profile.x+profile.free)+'px,var(--bg) '+(profile.x+profile.free)+'px)!important}'],
          ]){
            const broken=await page.addStyleTag({content}),paint=await titleBlendPaint(page,profile);
            await writeFile(join(ROOT,'.context/ci-test-results/window-strip',name+'.png'),paint.bytes);
            assert.ok(!blendedTitle(paint),name+' must fail the blend-edge guard');
            await broken.evaluate(node=>node.remove());
          }
          assert.ok(blendedTitle(await titleBlendPaint(page,profile)),'soft edges recover after both broken controls');
          const oldGap=await page.addStyleTag({content:'.ex-sheet{top:'+profile.height+'px!important}'});
          const gapPaint=await painted();
          await writeFile(join(ROOT,'.context/ci-test-results/window-strip/old-gap-control.png'),gapPaint.bytes);
          assert.ok(!matches(gapPaint.points),'the old sidebar gap must fail the title-area pixel check');
          await oldGap.evaluate(node=>node.remove());
          const missingBlend=await page.addStyleTag({content:'#windowDragRegion::before{display:none!important}'});
          const patchPaint=await painted();
          await writeFile(join(ROOT,'.context/ci-test-results/window-strip/missing-native-blend-control.png'),patchPaint.bytes);
          assert.ok(!matches(patchPaint.points),'a native-control colour patch must fail the title-area pixel check');
          await missingBlend.evaluate(node=>node.remove());
          assert.ok(matches((await painted()).points),'title-area paint must recover after the controls');
        }
      }
      if(profile.height>0&&profile.width>600){
        // Put a contrasting, scrolling document underneath the native title area.
        // Computed drag transparency alone cannot establish what users actually see.
        const bg=await page.evaluate(()=>{
          const marker=document.createElement('div');marker.id='titlebarScrollFixture';marker.textContent='Fictional scrolling task';marker.style.cssText='height:2000px;width:100vw;margin-left:calc(50% - 50vw);background:var(--accent);color:var(--bg)';document.getElementById('main-app').prepend(marker);
          scrollTo(0,scrollY+marker.getBoundingClientRect().top-4);
          return getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0,3).map(Number);
        });
        await page.evaluate(()=>Promise.all(document.getElementById('sticky-header').getAnimations().map(a=>a.finished.catch(()=>{}))));
        for(const open of [true,false]){
          await page.evaluate(open=>{document.body.classList.toggle('ex-open',open);document.getElementById('sidebarRoot').hidden=!open;const marker=document.getElementById('titlebarScrollFixture');scrollTo(0,scrollY+marker.getBoundingClientRect().top-4);},open);
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          const underlay=await page.evaluate(()=>{const marker=document.getElementById('titlebarScrollFixture'),r=marker.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,bottom:r.bottom,scroll:scrollY,opacity:getComputedStyle(document.getElementById('main-app')).opacity,header:document.getElementById('sticky-header').getBoundingClientRect().top};});
          await writeFile(join(ROOT,'.context/ci-test-results/window-strip',profile.name.replaceAll(' ','-')+'-scroll-'+open+'.json'),JSON.stringify(underlay,null,2));
          if(underlay.y>4.5||underlay.bottom<32||underlay.x>profile.x+16||underlay.x+underlay.width<profile.x+24||underlay.opacity!=='1')await fail('title underlay did not reach the sampled area',underlay);
          const bytes=await page.screenshot({fullPage:false}),image=PNG.sync.read(bytes);
          await writeFile(join(ROOT,'.context/ci-test-results/window-strip',profile.name.replaceAll(' ','-')+(open?'-scroll-open.png':'-scroll-closed.png')),bytes);
          const glassAlpha=await page.evaluate(()=>{
            const sample=document.createElement('span');sample.style.background='var(--bg-glass)';document.body.append(sample);
            const alpha=Number(getComputedStyle(sample).backgroundColor.match(/[\d.]+/g)[3]);sample.remove();return alpha;
          });
          // The native title remains opaque. The header transmits only the token's
          // low-opacity, blurred backdrop, rather than raw readable task paint.
          for(const top of [4,profile.height+4])for(let y=top;y<top+8;y++)for(let x=profile.x+16;x<profile.x+24;x++){
            const i=(y*image.width+x)*4,limit=top===4?1:Math.ceil(255*(1-glassAlpha))+1;
            if(bg.some((channel,n)=>Math.abs(image.data[i+n]-channel)>limit)||image.data[i+3]!==255)await fail('unprotected scrolling paint: '+profile.name,{open,top,limit,pixel:[...image.data.slice(i,i+4)],bg});
          }
        }
        await page.evaluate(()=>{document.getElementById('titlebarScrollFixture').remove();scrollTo(0,0);document.body.classList.add('ex-open');document.getElementById('sidebarRoot').hidden=false;});
      }

    }
    // Paint the real mounted panels, not just the simplified geometry shell.
    const realProfile={width:1280,x:80,free:1060,height:38};
    await page.setViewport({width:realProfile.width,height:800});
    await page.evaluate(profile=>{
      const values={'titlebar-area-x':profile.x,'titlebar-area-y':0,'titlebar-area-width':profile.free,'titlebar-area-height':profile.height};
      for(const item of __overlayFixtureRules)for(const saved of item.rules)saved.rule.style.cssText=saved.original.replace(/env\((titlebar-area-[a-z]+), 0px\)/g,(_,name)=>values[name]+'px');
      Today.use('sidebar').close(true);scrollTo(0,0);
    },realProfile);
    for(let pass=0;pass<2;pass++)for(const id of ['about','habits','memory','explore']){
      await page.evaluate(id=>Today.use('sidebar').open(id),id);
      await page.waitForFunction(id=>Today.use('sidebar').isOpen(id)&&!document.getElementById('sidebarRoot').hasAttribute('aria-busy')
        &&!!document.querySelector('#sidebarRoot .ex-sheet-head')&&!document.getElementById('sidebarRoot').classList.contains('entering'),{timeout:5000},id);
      await page.mouse.move(realProfile.width-80,130);
      await page.evaluate(async()=>{
        await Promise.all(document.body.getAnimations({subtree:true}).filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      });
      const state=await page.evaluate(()=>({top:document.getElementById('sidebarRoot').getBoundingClientRect().top,
        close:document.querySelector('#sidebarRoot [data-sidebar-close],#sidebarRoot [data-ex-action="hide"]').getBoundingClientRect().top}));
      assert.ok(state.top===0&&state.close>=realProfile.height,id+' must reach the window edge with safe control clearance');
      const paint=await titleBlendPaint(page,realProfile);
      await writeFile(join(ROOT,'.context/ci-test-results/window-strip',id+'-'+pass+'.png'),paint.bytes);
      assert.ok(blendedTitle(paint),id+' must preserve both soft native-control edges');
      await page.click('#sidebarRoot [data-sidebar-close],#sidebarRoot [data-ex-action="hide"]');
      await page.waitForFunction(()=>document.getElementById('sidebarRoot').hidden,{timeout:3000});
    }
    ok('soft title edges reject hard-edge controls; real About/Habits/Memory/Explore retain integrated paint on cold/warm opens');
    // Exercise the actual Focus lifecycle and sidebar close control with the WCO
    // geometry still applied. The native blend must not steal app input below it.
    await page.evaluate(()=>{
      Today.use('sidebar').close(true);Today.use('sidebar').open('about');
      manualTasks=Array.from({length:120},(_,i)=>({id:'manual_overlay_'+i,text:'Fictional overlay task '+i}));
      Today.use('connections').renderManual();scrollTo(0,0);
    });
    assert.ok(await page.evaluate(()=>matchMedia('(hover: hover)').matches&&matchMedia('(pointer: fine)').matches),'WCO Focus fixture requires desktop input capabilities');
    await page.click('.task[data-taskid="manual_overlay_0"] .task-text');
    await page.waitForSelector('.focus-timer.open',{visible:true,timeout:3000});
    const focused=await page.evaluate(()=>({locked:document.body.classList.contains('focus-locked'),
      pane:document.getElementById('sidebarRoot').getBoundingClientRect().top,
      header:document.getElementById('sticky-header').getBoundingClientRect().top,
      nativeHeight:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--window-titlebar-height'))}));
    assert.ok(focused.locked&&focused.pane===0&&focused.header>=focused.nativeHeight,'WCO Focus must preserve title-area geometry: '+JSON.stringify(focused));
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.body.classList.contains('focus-locked'),{timeout:3000});
    await page.click('#sidebarRoot [data-sidebar-close],#sidebarRoot [data-ex-action="hide"]');
    await page.waitForFunction(()=>document.getElementById('sidebarRoot').hidden,{timeout:3000});
    await page.evaluate(()=>Today.use('sidebar').open('about'));
    const closedTheme = await page.evaluate(async () => {
      document.body.classList.remove('ex-open');
      document.body.classList.add('ex-closing');
      await Promise.resolve();
      const meta=document.querySelector('meta[name=theme-color]');
      const background=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      const leaving=meta.content.trim()===background;
      document.body.classList.remove('ex-closing');
      await Promise.resolve();
      return leaving && meta.content.trim()===background;
    });
    if (!closedTheme) await fail('native controls must keep Today’s dark background through sidebar close');
    await page.evaluate(() => {
      window.__setOverlay(false);
      for (const item of window.__overlayFixtureRules) { item.media.media.mediaText=item.original;for(const saved of item.rules)saved.rule.style.cssText=saved.original; }
      document.body.classList.add('ex-open');
    });
    if (!await page.$eval('#windowDragRegion',node=>getComputedStyle(node).display==='none')) await fail('overlay fallback did not restore');
    if (!await page.$eval('#sidebarRoot',node=>node.getBoundingClientRect().top===0)) await fail('ordinary-tab Explore gained a title-bar gap');
    if(errors.length)await fail('uncaught overlay fixture errors',errors);
    ok('overlay title-area continuity, local control blending, scroll protection, Focus, input and native fallback; old gap/missing blend controls rejected');
    await page.close();
  }

  // Android/Chromium beforeinstallprompt + appinstalled lifecycle.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      const makePrompt = outcome => {
        const event = new Event('beforeinstallprompt', { cancelable: true });
        event.prompt = () => { window.__platformTest.promptCalls++; };
        event.userChoice = Promise.resolve({ outcome });
        window.dispatchEvent(event);
        return event;
      };
      const visible = el => getComputedStyle(el).display !== 'none';
      const first = makePrompt('accepted');
      const shown = visible(document.getElementById('installBtn'))
        && visible(document.getElementById('pwaInstallSection'))
        && document.querySelector('#pwaInstallSection button')?.textContent.trim() === 'Install';
      Today.use('platform').install();
      await new Promise(resolve => setTimeout(resolve, 0));
      const acceptedHidden = !visible(document.getElementById('installBtn'))
        && !visible(document.getElementById('pwaInstallSection'));
      Today.use('platform').install();
      const consumed = window.__platformTest.promptCalls === 1;

      const second = makePrompt('dismissed');
      window.dispatchEvent(new Event('appinstalled'));
      Today.use('platform').install();
      const installedHidden = !visible(document.getElementById('installBtn'))
        && !visible(document.getElementById('pwaInstallSection'))
        && window.__platformTest.promptCalls === 1;
      return { prevented: first.defaultPrevented && second.defaultPrevented, shown, acceptedHidden, consumed, installedHidden };
    });
    if (Object.values(result).some(value => !value)) await fail('Android install lifecycle regression', result);
    if (errors.length) await fail('uncaught errors in Android install lifecycle', errors);
    ok('Android install prompt, acceptance, and appinstalled lifecycle');
    await page.close();
  }

  // Safari instruction rows must reveal in place without changing row height.
  for (const testCase of [
    { label: 'iOS Safari', userAgent: IOS_SAFARI, platform: 'iPhone', maxTouchPoints: 5,
      coarse: true, viewport: { width: 375, height: 812 }, instruction: 'Share ↑ → Add to Home Screen' },
    { label: 'macOS Safari', userAgent: MAC_SAFARI, platform: 'MacIntel', maxTouchPoints: 0,
      coarse: false, viewport: { width: 1200, height: 800 }, instruction: 'File → Add to Dock' },
  ]) {
    const { page, errors } = await openPage(testCase);
    const result = await page.evaluate(expected => {
      if (!document.getElementById('configPanel').classList.contains('open')) Today.use('connections').toggleConfig();
      const row = document.querySelector('#pwaInstallSection .connection-row');
      const button = row?.querySelector('button');
      const before = row?.getBoundingClientRect().height || 0;
      const initialCopy = button?.textContent.trim() === 'How to add ↓';
      button?.click();
      const after = row?.getBoundingClientRect().height || 0;
      return {
        rowVisible: !!row && getComputedStyle(document.getElementById('pwaInstallSection')).display !== 'none',
        initialCopy,
        instructionCopy: button?.textContent.trim() === expected,
        revealed: button?.classList.contains('_pwa-revealed') && button?.disabled,
        fixedHeight: before > 0 && Math.abs(after - before) < 0.01,
      };
    }, testCase.instruction);
    if (Object.values(result).some(value => !value)) await fail(`${testCase.label} install-row regression`, result);
    if (errors.length) await fail(`uncaught errors in ${testCase.label} promotion`, errors);
    ok(`${testCase.label} instruction reveal preserves row height`);
    await page.close();
  }

  // Alternate-browser copy routes.
  for (const testCase of [
    { label: 'iOS non-Safari', userAgent: IOS_CHROME, platform: 'iPhone', maxTouchPoints: 5,
      coarse: true, status: 'Open in Safari to add to your home screen' },
    { label: 'Firefox', userAgent: FIREFOX, platform: 'MacIntel', maxTouchPoints: 0,
      coarse: false, status: 'Open in Chrome or Edge to install' },
  ]) {
    const { page, errors } = await openPage(testCase);
    const result = await page.evaluate(async expected => {
      const section = document.getElementById('pwaInstallSection');
      const button = section.querySelector('button');
      button?.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      return {
        status: section.querySelector('.connection-row-status')?.textContent.trim() === expected,
        copied: window.__platformTest.clipboardWrites[0] === window.location.href,
        feedback: button?.textContent === 'Copied',
      };
    }, testCase.status);
    if (Object.values(result).some(value => !value)) await fail(`${testCase.label} copy-route regression`, result);
    if (errors.length) await fail(`uncaught errors in ${testCase.label} promotion`, errors);
    ok(`${testCase.label} copy-link route`);
    await page.close();
  }

  // Installed/standalone mode suppresses browser-specific promotion.
  {
    const { page, errors } = await openPage({ userAgent: IOS_SAFARI, platform: 'iPhone', maxTouchPoints: 5, coarse: true, standalone: true,
      viewport: { width: 375, height: 812 } });
    const suppressed = await page.evaluate(() =>
      getComputedStyle(document.getElementById('installBtn')).display === 'none'
      && getComputedStyle(document.getElementById('pwaInstallSection')).display === 'none');
    if (!suppressed) await fail('standalone mode did not suppress install promotion');
    // CSS contract only: Chromium cannot reproduce iOS WebKit's native control paint,
    // but these three custom controls must explicitly opt out of it.
    const headerButtons = await page.evaluate(() =>
      ['habitsBtn', 'trelloBtn', 'infoBtn'].map(id => {
        const style = getComputedStyle(document.getElementById(id));
        return { id, appearance: style.appearance, shadow: style.boxShadow };
      }));
    if (headerButtons.some(button => button.appearance !== 'none' || button.shadow !== 'none')) {
      await fail('standalone header buttons retain native appearance or shadow', headerButtons);
    }
    const headerLayer = await page.evaluate(() => {
      const header = getComputedStyle(document.getElementById('sticky-header'));
      return { background: header.backgroundColor, pageBackground: getComputedStyle(document.body).backgroundColor,
        backdrop: header.backdropFilter, webkitBackdrop: header.webkitBackdropFilter };
    });
    if (headerLayer.background !== headerLayer.pageBackground
        || headerLayer.backdrop !== 'none'
        || (headerLayer.webkitBackdrop && headerLayer.webkitBackdrop !== 'none')) {
      await fail('mobile header still uses translucent backdrop compositing', headerLayer);
    }
    if (errors.length) await fail('uncaught errors in standalone mode', errors);
    ok('standalone mode suppresses install promotion and native header-button chrome');
    await page.close();
  }

  // Full-screen sheets retain their own reading position; only mobile Habits
  // resets the page. An obsolete Habits frame must not scroll a closed view.
  for(const width of [390,1024]){
    const {page,errors}=await openPage({coarse:width===390,viewport:{width,height:812}});
    await page.evaluate(()=>{
      Today.use('sidebar').close(true);
      manualTasks=Array.from({length:120},(_,i)=>({id:'manual_panel_scroll_'+i,text:'Fictional panel scroll task '+i}));Today.use('connections').renderManual();
      Today.use('sidebar').register('scroll-fixture',{label:'Fictional scrolling panel',mount(content){
        content.innerHTML='<div class="ex-sheet-head">Fictional panel</div><div class="ex-sheet-scroll"><div style="height:1800px">Fictional long content</div></div>';
        content.querySelector('.ex-sheet-scroll').scrollTop=200;
      }});
      scrollTo(0,480);
    });
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const before=await page.evaluate(()=>scrollY);
    assert.ok(before>400,'fixture must begin down a real long task list');
    await page.evaluate(()=>Today.use('sidebar').open('scroll-fixture'));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const opened=await page.evaluate(()=>({viewport:scrollY,panel:document.querySelector('#sidebarRoot .ex-sheet-scroll').scrollTop}));
    assert.equal(opened.panel,200,'full-screen panels retain their mounted reading position on phone and desktop');
    if(width===390)assert.equal(opened.viewport,0,'full-screen phone panels retain existing page-lock behavior');
    else assert.ok(opened.viewport>400,'desktop opening keeps the task-list viewport position');
    await page.evaluate(()=>document.querySelector('#sidebarRoot .ex-sheet-scroll').scrollTop=160);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.$eval('#sidebarRoot .ex-sheet-scroll',node=>node.scrollTop),160,'later reading is never pinned to the top');
    await page.evaluate(()=>{Today.use('sidebar').close(true);Today.use('sidebar').open('habits');Today.use('sidebar').close(true);scrollTo(0,480);});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.ok(await page.evaluate(()=>scrollY>400),'a closed opening cannot run a stale viewport reset');
    if(width===390)for(let pass=0;pass<2;pass++)for(const [id,button]of [['about','infoBtn'],['habits','habitsBtn'],['memory','todayLogo']]){
      // Dispatch the real button action without Puppeteer's scroll-into-view
      // preparation masking a missing application viewport reset.
      const origin=await page.evaluate(button=>{scrollTo(0,480);const before=scrollY;document.getElementById(button).click();return before;},button);
      assert.ok(origin>400,id+' must open from a genuinely scrolled viewport');
      await page.waitForFunction(id=>Today.use('sidebar').isOpen(id)&&!!document.querySelector('#sidebarRoot .ex-sheet-head')&&!document.getElementById('sidebarRoot').hasAttribute('aria-busy'),{timeout:5000},id);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      if(id==='habits'){
        assert.equal(await page.evaluate(()=>scrollY),0,'only the inline Habits opening requires the mobile viewport at the top');
        assert.equal(await page.$eval('#sidebarRoot .ex-sheet-scroll',node=>node.scrollTop),0,'Habits content starts at the top');
        assert.ok(await page.$eval('#sidebarRoot',node=>node.classList.contains('sb-inline')),'Habits test must exercise its real inline mobile host');
      }else assert.equal(await page.evaluate(()=>document.body.style.position),'fixed',id+' retains full-screen phone modality');
      await page.$eval('#sidebarRoot .ex-sheet-scroll',node=>node.scrollTop=200);
      await page.evaluate(()=>Today.use('sidebar').close(true));
    }
    if(errors.length)await fail('panel opening scroll fixture errors',errors);await page.close();
  }
  ok('only inline mobile Habits resets scroll; full-screen panel reading, stale-close fencing and desktop isolation remain intact');

  // visualViewport keyboard positioning + bfcache wake dispatch + SW registration.
  {
    const { page, errors } = await openPage({
      coarse: true,
      viewport: { width: 375, height: 812 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    await page.evaluate(()=>Today.use('sidebar').close(true));
    const result = await page.evaluate(async () => {
      const input = document.getElementById('newTask');
      const bar = document.getElementById('addTaskBar');
      const longList = document.createElement('div');
      longList.style.height = '1800px';
      document.querySelector('.app').append(longList);
      window.scrollTo(0, 450);
      await new Promise(resolve => requestAnimationFrame(resolve));
      const beforeFocusY = window.scrollY;
      let scrollIntoViewCalls = 0;
      const originalScrollIntoView = input.scrollIntoView.bind(input);
      input.scrollIntoView = (...args) => {
        scrollIntoViewCalls++;
        return originalScrollIntoView(...args);
      };
      input.blur();
      input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      input.focus();
      // Positioning follows a timer and an animation frame; sample its rendered
      // state rather than assuming both have run within 150ms on a busy host.
      await new Promise((resolve, reject) => {
        const deadline = setTimeout(() => reject(new Error('Keyboard bar did not position')), 3000);
        const ready = () => {
          if (bar.style.transform && bar.style.transform !== 'none') { clearTimeout(deadline); resolve(); }
          else requestAnimationFrame(ready);
        };
        ready();
      });
      const firstTransform = bar.style.transform;
      window.__setVisualViewport(10, 500);
      // Model WebKit's native focus scroll during the software-keyboard opening.
      window.scrollTo(0, beforeFocusY + 90);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const resizedTransform = bar.style.transform;
      // Verify bar sits just above the keyboard: its bottom edge should be at
      // the keyboard top (vv.offsetTop + vv.height) within 2px.
      const vvp = window.visualViewport;
      const barAboveKeyboard = Math.abs(bar.getBoundingClientRect().bottom - (vvp.offsetTop + vvp.height)) <= 2;
      const firstCorrectionY = window.scrollY;
      // WebKit can make a second focus adjustment after the first viewport frame.
      window.scrollTo(0, beforeFocusY + 45);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const whileKeyboardY = window.scrollY;
      input.blur();
      await new Promise(resolve => setTimeout(resolve, 400));
      const afterBlurY = window.scrollY;

      window.__setVisualViewport(0, 812);
      input.focus();
      window.__setVisualViewport(10, 500);
      longList.dispatchEvent(new Event('touchstart', { bubbles: true }));
      window.scrollTo(0, beforeFocusY + 120);
      await new Promise(resolve => requestAnimationFrame(resolve));
      const chosenY = window.scrollY;
      input.blur();
      await new Promise(resolve => setTimeout(resolve, 150));
      const afterChosenBlurY = window.scrollY;

      let wakes = 0;
      window._onWake = () => { wakes++; };
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      return {
        opened: !!firstTransform && firstTransform !== 'none',
        resized: !!resizedTransform && resizedTransform !== firstTransform,
        barAboveKeyboard,
        reset: !bar.classList.contains('keyboard-open') && !bar.style.transform && !bar.style.position,
        noForcedScroll: scrollIntoViewCalls === 0,
        firstCorrection: Math.abs(firstCorrectionY - beforeFocusY) <= 2,
        keyboardOpenPositionPreserved: Math.abs(whileKeyboardY - beforeFocusY) <= 2,
        listPositionPreserved: Math.abs(afterBlurY - beforeFocusY) <= 2,
        intentionalScrollKept: Math.abs(afterChosenBlurY - chosenY) <= 2,
        wakes,
        swPath: window.__platformTest.swRegistrations.join(','),
      };
    });
    if (!result.opened || !result.resized || !result.reset || !result.noForcedScroll
      || !result.firstCorrection || !result.keyboardOpenPositionPreserved
      || !result.listPositionPreserved || !result.intentionalScrollKept
      || !result.barAboveKeyboard
      || result.wakes !== 1 || result.swPath !== '/sw.js') {
      await fail('keyboard, bfcache, or service-worker regression', result);
    }
    if (errors.length) await fail('uncaught errors in platform lifecycle', errors);
    ok('keyboard viewport, persisted pageshow, and /sw.js registration');
    await page.close();
  }

  await checkDesktopAppHeader();

  console.log('✓ PLATFORM TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
