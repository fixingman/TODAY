// Actual shared panel lifecycle; fictional local state, no account or AI calls.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {PNG} from 'pngjs';
import {waitForFonts,openSidebar} from './browser-fixture.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(path==='/')path='/index.html';res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(join(root,path)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:'new',args:['--no-first-run','--disable-extensions']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1280,height:900});
 await page.evaluateOnNewDocument(()=>{const native=matchMedia.bind(window),hardware={'(hover: hover)':true,'(hover: none)':false,'(pointer: fine)':true,'(pointer: coarse)':false};window.matchMedia=query=>Object.hasOwn(hardware,query)?{matches:hardware[query],media:query,addEventListener(){},removeEventListener(){}}:native(query);localStorage.clear();localStorage.setItem('splash_shown_at',String(Date.now()));localStorage.setItem('today_manual',JSON.stringify([{id:'manual_sidebar',text:'Fictional focus task'}]));localStorage.setItem('today_habits',JSON.stringify([{id:'habit_fixture',name:'Fictional habit'}]));});
 await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load'});await waitForFonts(page);
 await mkdir(join(root,'.context/ci-test-results/sidebar'),{recursive:true});
 for(const width of [1280,736,390,320]){
  await page.setViewport({width,height:900});
  for(const id of ['habits','about','memory']){
   await openSidebar(page,id);
   await page.waitForFunction(()=>document.getElementById('sidebarRoot').getAnimations({subtree:true}).every(a=>!Number.isFinite(a.effect.getTiming().iterations)||a.playState!=='running'));
   const state=await page.evaluate(()=>{
    const panel=document.getElementById('sidebarRoot'),nav=panel.querySelector('.sb-panel-nav'),close=panel.querySelector('[data-sidebar-close]'),r=close.getBoundingClientRect();
    return {nav:getComputedStyle(nav).display,role:panel.getAttribute('role'),named:!!panel.getAttribute('aria-label'),inert:document.getElementById('main-app').inert,visible:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===close,overflow:panel.scrollWidth>panel.clientWidth+1,buttons:nav.querySelectorAll('button').length};
   });
   assert.equal(state.nav,width>600?'none':'flex');assert.equal(state.role,width>600?'complementary':'dialog');assert.ok(state.named&&state.visible&&!state.overflow);assert.equal(state.inert,width<=600);assert.equal(state.buttons,4);
   await page.screenshot({path:join(root,`.context/ci-test-results/sidebar/${id}-${width}.png`)});
  }
 }
 await page.setViewport({width:1280,height:900});
 await page.evaluate(()=>{const sb=Today.use('sidebar');sb.open('habits');window.__oldClose=sb.close();sb.open('about');});
 await page.evaluate(()=>__oldClose);assert.equal(await page.evaluate(()=>Today.use('sidebar').isOpen('about')),true,'An old close must not unmount a new panel');
 await page.evaluate(()=>Today.use('sidebar').close(true));
 await page.click('#habitsBtn');await page.click('[data-sidebar-close]');await page.waitForFunction(()=>document.getElementById('sidebarRoot').hidden);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'habitsBtn','Close returns focus to the opener');
 // A cold Explore entry replaces content inside the existing frame. Observe the
 // whole transition: a settled screenshot cannot detect a replayed entrance.
 await openSidebar(page,'about');
 await page.waitForFunction(()=>!document.getElementById('sidebarRoot').getAnimations().some(a=>a.playState==='running'));
 await page.evaluate(()=>{const root=document.getElementById('sidebarRoot');window.__switchClasses=[];window.__switchObserver=new MutationObserver(records=>{for(const record of records)__switchClasses.push(record.oldValue||'',root.className);});__switchObserver.observe(root,{attributes:true,attributeFilter:['class'],attributeOldValue:true});window.__frame=root;});
 await page.click('#trelloBtn');
 await page.waitForFunction(()=>{try{return Today.use('exploration').isOpen();}catch{return false;}});
 await page.mouse.move(80,220);assert.equal(await page.evaluate(()=>document.body.classList.contains('ex-task-active')),false,'Opening Explore does not follow a pointer that stayed outside');
 assert.ok(await page.evaluate(()=>__frame===document.getElementById('sidebarRoot')&&!__switchClasses.some(value=>/\b(entering|leaving)\b/.test(value))),'Cold Explore switches content without replaying shell motion');
 await page.click('#trelloBtn');await page.waitForFunction(()=>document.getElementById('sidebarRoot').hidden);
 assert.equal(await page.$eval('#trelloBtn',node=>node.getAttribute('aria-expanded')),'false','Explore repeats the same toggle-close contract as other header buttons');
 for(const id of ['habits','about','memory']){
  await openSidebar(page,id);await page.waitForFunction(()=>!document.getElementById('sidebarRoot').getAnimations().some(a=>a.playState==='running'));
  await page.evaluate(()=>__switchClasses=[]);await page.click('#trelloBtn');await page.waitForFunction(()=>Today.use('sidebar').isOpen('explore'));
  assert.ok(await page.evaluate(()=>__frame===document.getElementById('sidebarRoot')&&!__switchClasses.some(value=>/\b(entering|leaving)\b/.test(value))),'Warm '+id+' → Explore preserves the frame');
 }
 await page.evaluate(()=>__switchObserver.disconnect());await page.click('#trelloBtn');await page.waitForFunction(()=>document.getElementById('sidebarRoot').hidden);
 await page.setViewport({width:390,height:900});await openSidebar(page,'about');
 await page.focus('.sb-panel-btn');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
 assert.ok(await page.evaluate(()=>document.getElementById('sidebarRoot').contains(document.activeElement)),'Phone focus wraps inside the whole sidebar');
 await page.evaluate(()=>Today.use('sidebar').close(true));
 assert.deepEqual(await page.evaluate(()=>['main-app','sticky-header','addTaskBar'].map(id=>document.getElementById(id).inert)),[false,false,false]);
 // The visual viewport may shrink before/during keyboard display. Its composer
 // stays fitted while the same surface paints through the layout viewport bottom.
 for(const width of [320,390]){
  await page.setViewport({width,height:900});
  for(const id of ['habits','about','memory','explore']){
   await openSidebar(page,id);
   // Sample settled paint: a partial view fade can round premultiplied surface
   // channels down by one on Linux. Keep exact color/alpha assertions below.
   await page.evaluate(()=>Promise.all(document.getElementById('sidebarRoot').getAnimations({subtree:true}).filter(a=>/^(ex|fadeInPlain)/.test(a.animationName||'')&&Number.isFinite(a.effect.getTiming().iterations)).map(a=>a.finished.catch(()=>{}))));
   for(const height of [710,900]){
    await page.evaluate(height=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:height});visualViewport.dispatchEvent(new Event('resize'));},height);
    await page.waitForFunction(height=>Math.abs(document.getElementById('sidebarRoot').getBoundingClientRect().height-height)<1,{},height);
    const bg=await page.$eval('#sidebarRoot',node=>getComputedStyle(node).backgroundColor.match(/\d+/g).slice(0,3).map(Number));
    const bytes=await page.screenshot({fullPage:false}),image=PNG.sync.read(bytes);
    await writeFile(join(root,`.context/ci-test-results/sidebar/${id}-${width}-${height}-bottom.png`),bytes);
    for(let y=892;y<900;y++)for(let x=8;x<16;x++){const i=(y*image.width+x)*4;assert.ok(image.data[i+3]===255&&bg.every((channel,n)=>image.data[i+n]===channel),'Mobile '+id+' paints through the bottom edge at '+width+'/'+height);}
   }
  }
  await page.evaluate(()=>Today.use('sidebar').close(true));
 }
 // Desktop Focus recedes every peer panel and remains dim on hover; closing
 // Focus restores ordinary pane dimming. Reduced motion keeps the same state.
 await page.setViewport({width:1280,height:900});
 await page.evaluate(()=>document.addEventListener('click',e=>window.__lastFocusClick={tag:e.target.tagName,cls:e.target.className,id:e.target.id},true));
 for(const reduced of [false,true]){
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]);
  for(const id of ['habits','about','memory','explore']){
   if(id==='explore'){await page.click('#trelloBtn');await page.waitForFunction(()=>Today.use('sidebar').isOpen('explore'));}else await openSidebar(page,id);
   await page.waitForFunction(()=>!document.getElementById('sidebarRoot').classList.contains('entering'));
   await page.click('.task-text');
   assert.ok(await page.evaluate(()=>window._focusUIActive),'Focus click '+id+' '+JSON.stringify(await page.evaluate(()=>window.__lastFocusClick)));
   await page.waitForFunction(()=>document.body.classList.contains('focus-locked')&&parseFloat(getComputedStyle(document.getElementById('sidebarRoot'),'::after').opacity)>.9);
   await page.mouse.move(1260,200);
   assert.ok(await page.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('sidebarRoot'),'::after').opacity)>.9),'Focus keeps '+id+' dim when hovered');
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>!document.body.classList.contains('focus-locked')&&document.querySelector('.focus-timer').hidden&&!document.getElementById('main-app').classList.contains('focus-exiting')&&parseFloat(getComputedStyle(document.getElementById('sidebarRoot'),'::after').opacity)<.5);
  }
 }
 assert.deepEqual(errors,[]);console.log('✓ Sidebar: all panels, phone/desktop layout, native controls, close/reopen races and focus restoration');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
