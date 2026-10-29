// Actual bootstrap under bounded synthetic cold work: coalescing is the before control.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const names=['_startDrag','_startDropbox','_startGmail','_startAccessibility','_startConnections','_startAbout','_startHabits','_startZones','_startReflections','_startTriage','_startMemoryPanel','_startDayLifecycle','_startNudge','_startTaskActions','_startAssistant','_startMeeting','_startVoiceCapture','init','_startSplash','_startFocus','_startPlatform'];
let control=false;
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),file=path==='/'?'index.html':path;let body=await readFile(join(ROOT,file));if(file==='index.html'){
 const probe=`window.__bootOrder=[];for(const name of ${JSON.stringify(names)}){const fn=window[name];window[name]=function(...args){__bootOrder.push(name);if(['_startGmail','_startAbout','_startReflections'].includes(name)){const t=performance.now();while(performance.now()-t<90){}}return fn.apply(this,args);};}`;
 body=Buffer.from(body.toString().replace('// Focus mode moved to assets/focus.js;',probe+'\n// Focus mode moved to assets/focus.js;'));
 }res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.woff2':'font/woff2','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',pipe:true,args:['--no-first-run','--disable-extensions']});
async function sample(coalesced){const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(coalesced=>{localStorage.setItem('splash_shown_at',String(Date.now()));localStorage.setItem('today_manual',JSON.stringify([{id:'manual_boot',text:'Review the draft'}]));window.__blocking=[];new PerformanceObserver(list=>__blocking.push(...list.getEntries().map(e=>Math.max(0,e.duration-50)))).observe({type:'longtask',buffered:true});
 if(coalesced)window.MessageChannel=class{constructor(){this.port1={close(){}};this.port2={close(){},postMessage:()=>queueMicrotask(()=>this.port1.onmessage())};}};
 },coalesced);
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});await page.waitForFunction(()=>performance.getEntriesByName('today:interactive').length&&!document.body.hasAttribute('data-booting'));
 await page.evaluate(()=>new Promise(r=>setTimeout(r,50)));
 const result=await page.evaluate(()=>({order:__bootOrder,blocking:__blocking.reduce((a,b)=>a+b,0),inert:document.body.inert,task:document.querySelector('#manualList .task-text')?.textContent,ready:_appReady}));
 assert.deepEqual(result.order,names);assert.equal(result.inert,false);assert.ok(result.task.includes('Review the draft'));assert.equal(result.ready,true);assert.deepEqual(errors,[]);
 const late=await page.evaluate(async()=>{let load=0,dom=0,boot=0;Today.ready('load',()=>load++);Today.ready('DOMContentLoaded',()=>dom++);Today.ready('boot',()=>boot++);await Promise.resolve();return{load,dom,boot};});assert.deepEqual(late,{load:1,dom:1,boot:1});
 await context.close();return result;
}
try{const before=await sample(true),after=await sample(false);assert.ok(before.blocking>200,JSON.stringify(before));assert.ok(after.blocking<200,JSON.stringify(after));console.log('✓ actual ordered startup under injected work: coalesced blocking '+Math.round(before.blocking)+'ms fails200; yielded '+Math.round(after.blocking)+'ms passes; readiness, late hooks and first rendering survive');}finally{await browser.close();server.close();}
