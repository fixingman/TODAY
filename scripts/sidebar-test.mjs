// Actual shared panel lifecycle; fictional local state, no account or AI calls.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {waitForFonts,openSidebar} from './browser-fixture.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(path==='/')path='/index.html';res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(join(root,path)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:'new',args:['--no-first-run','--disable-extensions']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1280,height:900});
 await page.evaluateOnNewDocument(()=>{localStorage.clear();localStorage.setItem('splash_shown_at',String(Date.now()));localStorage.setItem('today_habits',JSON.stringify([{id:'habit_fixture',name:'Fictional habit'}]));});
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
 await page.setViewport({width:390,height:900});await openSidebar(page,'about');
 await page.focus('.sb-panel-btn');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
 assert.ok(await page.evaluate(()=>document.getElementById('sidebarRoot').contains(document.activeElement)),'Phone focus wraps inside the whole sidebar');
 await page.evaluate(()=>Today.use('sidebar').close(true));
 assert.deepEqual(await page.evaluate(()=>['main-app','sticky-header','addTaskBar'].map(id=>document.getElementById(id).inert)),[false,false,false]);
 assert.deepEqual(errors,[]);console.log('✓ Sidebar: all panels, phone/desktop layout, native controls, close/reopen races and focus restoration');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
