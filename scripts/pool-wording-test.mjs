// Actual pool feedback -> next qualified writer; fictional data and provider only.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {dirname,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..'),EVIDENCE=process.env.TODAY_POOL_EVIDENCE||join(ROOT,'.context/15c-wording');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://127.0.0.1').pathname,name=path==='/'?'index.html':path;try{const body=await readFile(join(ROOT,name));res.writeHead(200,{'Content-Type':mime[extname(name)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',pipe:true,args:['--no-first-run','--disable-extensions']});
let sundaySource,morningSource;
const initial=Date.parse('2026-11-08T05:00:00.000Z');let groups=0;
const ok=text=>{groups++;console.log('  ✓ '+text);};
async function fixture(offset=0,readings=[]){
 const context=await browser.createBrowserContext(),page=await context.newPage();await page.setViewport({width:1280,height:900});await page.emulateTimezone('Europe/Istanbul');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(({initial,offset})=>{
  const NativeDate=Date;window.__clock=initial+offset;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[__clock]));}static now(){return __clock;}};
  const today=new Date().toLocaleDateString('en-CA');
  localStorage.setItem('splash_shown_at',String(Date.now()));localStorage.setItem('today_seen_version','2.105.0');
  localStorage.setItem('today_manual',JSON.stringify([{id:'manual_1700000000001',text:'I have to reply about the contract'}]));
  localStorage.setItem('day_nudge_ai_'+today,'There is room to choose.');
  localStorage.setItem('today_daily_history',JSON.stringify([{date:'2026-11-07',tasksDone:2,focusMins:0,habitsKept:0,habitsTotal:0}]));
  window.__requests=[];window.__queue=[];window.__held=null;
  const original=window.fetch.bind(window),response=value=>({ok:true,status:200,json:async()=>value});
  window.fetch=async(url,options={})=>{
   if(!String(url).includes('/ai-assist'))return original(url,options);
   const body=JSON.parse(options.body||'{}'),system=String(body.systemPrompt||'');
   const writer=system.startsWith('One or two short sentences. No quotes.')?'sunday':system.startsWith('You are the quiet companion')&&body.messages[0]?.content.startsWith('Evidence:')?'pool-morning':'other';
   const item={writer,body,signal:options.signal};__requests.push(item);
   const next=writer==='other'?{content:'none'}:(__queue.shift()||{content:'Some things you put in Soon keep coming back.'});
   if(next.hold==='headers')return new Promise(resolve=>{__held={item,release:()=>resolve(response({content:'Some things you put in Soon keep coming back.'}))};});
   if(next.hold==='body')return{ok:true,status:200,json:()=>new Promise(resolve=>{__held={item,release:()=>resolve({content:next.content||'Some things you put in Soon keep coming back.'})};})};
   return response(next);
  };
 },{initial,offset});
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof window.checkDayNudge==='function'&&typeof window._memoryReactToLine==='function');
 await page.evaluate(readings=>{localStorage.setItem('today_ai_provider','claude');localStorage.setItem('today_ai_key_claude','fictional-key');appMemory.spokenLines=readings;appMemory.kindVerdicts={};appMemory.taskOutcomes=[];appMemory.clearedAt='';delete appMemory.poolWordingClearedAt;__requests.length=0;},readings);
 return{page,context,errors};
}
async function click(page,selector){
 await page.waitForFunction(selector=>{const b=document.querySelector(selector);if(!b||b.closest('[hidden]')||b.disabled)return false;const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));},{timeout:5000},selector);
 await page.click(selector);
}
async function mount(page,surface='Sunday reflection'){
 await page.evaluate(surface=>{
  const date=_localISO(),text=surface==='Sunday reflection'?'Chosen commitments were more often finished than have-to tasks.':'The things you choose get your focus; the have-to tasks do not.';
  appMemory.spokenLines=[{surface,date,text,kind:surface==='Sunday reflection'?'obligation-completion':'focus-vs-obligation',...(surface==='Sunday reflection'?{policy:_weekReflectionPolicy}:{})}];_saveMemory();
  localStorage.setItem(surface==='Sunday reflection'?'week_reflection_'+date:'day_nudge_ai_'+date,text);localStorage.setItem('week_policy_'+date,_weekReflectionPolicy);Today.use('about').toggleInfo();_saveMemory();
 },surface);
 const block=surface==='Sunday reflection'?'#sundayBlock':'#todayNudgeBlock';await page.waitForFunction(block=>!!document.querySelector(block+' .pool-wording-btn'),{},block);
 await click(page,block+' .week-summary');await click(page,block+' [data-today-click="pool-wording.open"]');try{await page.waitForFunction(block=>!!document.querySelector(block+' .pool-wording-panel:not([hidden])'),{timeout:5000},block);}catch(error){console.error('Pool wording fixture state',await page.evaluate(block=>({block:document.querySelector(block)?.innerHTML,infoOpen:document.getElementById('infoPanel').className,announcements:document.querySelector('[aria-live]')?.textContent}),block));throw error;}return block;
}
async function choose(page,block,concern){await click(page,block+' [data-concern="'+concern+'"]');}
async function memory(page){return page.evaluate(()=>JSON.parse(JSON.stringify(appMemory)));}
async function sunday(page,{hold=null}={}){
 await page.evaluate(hold=>{
  const date=_localISO();localStorage.removeItem('week_reflection_'+date);localStorage.setItem('week_policy_'+date,_weekReflectionPolicy);
  appMemory.taskOutcomes=Array.from({length:3},(_,i)=>({id:'pull-'+i,date,outcome:'soon_pull',obligation:null,focusSessions:0}));if(hold)__queue.push({hold});
  if(!document.getElementById('infoPanel').classList.contains('open'))Today.use('about').toggleInfo();else Today.use('about').renderInfoStats();
 },hold);
 await page.waitForFunction(()=>__requests.some(r=>r.writer==='sunday'));
 if(hold)await page.waitForFunction(()=>!!__held);else await page.waitForFunction(()=>!!localStorage.getItem('week_reflection_'+_localISO()));
 return page.evaluate(()=>__requests.find(r=>r.writer==='sunday').body);
}
async function morning(page,{hold=null}={}){
 await page.evaluate(hold=>{
  const date=_localISO();appMemory.taskOutcomes=Array.from({length:3},(_,i)=>({id:'pull-'+i,date,outcome:'soon_pull',obligation:null,focusSessions:0}));
  localStorage.removeItem('day_nudge_ai_'+date);localStorage.removeItem('day_nudge_dismissed_'+date);localStorage.removeItem('today_nudge_generation_v1');localStorage.setItem('morning_nudge_count','1');
  window._nudgeOnNewDay();checkDayNudge._setMemoryReady();if(hold)__queue.push({hold});checkDayNudge();
 },hold);
 await page.waitForFunction(()=>__requests.some(r=>r.writer==='pool-morning'));
 if(hold)await page.waitForFunction(()=>!!__held);else await page.waitForFunction(()=>!!localStorage.getItem('day_nudge_ai_'+_localISO()));
 return page.evaluate(()=>__requests.find(r=>r.writer==='pool-morning').body);
}
try{
 await mkdir(EVIDENCE,{recursive:true});
 {
  const one=await fixture(),block=await mount(one.page);await choose(one.page,block,'unclear');
  const saved=await memory(one.page),row=saved.spokenLines[0];sundaySource=structuredClone(row);assert.equal(row.reaction,undefined);assert.equal(row.wording.concern,'unclear');assert.match(row.wording.sourceId,/^[a-f0-9]{64}$/);assert.equal(await one.page.evaluate(()=>__requests.length),0);
  assert.equal(await one.page.evaluate(()=>JSON.parse(localStorage.getItem('today_memory')).spokenLines[0].wording.concern),'unclear');
  const two=await fixture(7*86400000,saved.spokenLines),guided=await sunday(two.page);assert.ok(guided.messages[0].content.includes('Use direct sentences'));assert.equal(JSON.stringify(guided).includes(row.text),false);assert.equal(JSON.stringify(guided).includes(row.wording.sourceId),false);
  const plain=await fixture(7*86400000),baseline=await sunday(plain.page);assert.equal(await plain.page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.endsWith('/pool-wording.js'))),false);assert.equal(guided.messages[0].content.split('\n\nOptional wording guidance')[0],baseline.messages[0].content);assert.equal(guided.systemPrompt,baseline.systemPrompt);
  assert.equal((await memory(two.page)).spokenLines.find(r=>r.date==='2026-11-15')?.kind,'soon-pullback');assert.deepEqual([...one.errors,...two.errors,...plain.errors],[]);
  ok('a real optional choice persists without a whole vote/call and reaches the next qualified Sunday with unchanged evidence/base prompt and no earlier prose');await one.context.close();await two.context.close();await plain.context.close();
 }
 {
  const one=await fixture(),block=await mount(one.page,'morning nudge');await choose(one.page,block,'formal');const saved=await memory(one.page);morningSource=structuredClone(saved.spokenLines[0]);
  const two=await fixture(7*86400000,saved.spokenLines),guided=await morning(two.page);assert.ok(guided.messages[0].content.includes('natural, everyday wording'));assert.equal(JSON.stringify(guided).includes(saved.spokenLines[0].text),false);
  const other=await fixture(7*86400000,saved.spokenLines),isolated=await sunday(other.page);assert.equal(isolated.messages[0].content.includes('Optional wording guidance'),false);assert.deepEqual([...one.errors,...two.errors,...other.errors],[]);
  ok('the next real pool morning gets its own fixed concern; Sunday never consumes it');await one.context.close();await two.context.close();await other.context.close();
 }

 {
  const f=await fixture(),block=await mount(f.page);await choose(f.page,block,'unclear');const first=(await memory(f.page)).spokenLines[0].wording.at;
  await choose(f.page,block,'formal');let row=(await memory(f.page)).spokenLines[0];assert.equal(row.wording.concern,'formal');assert.ok(row.wording.at>first);
  await choose(f.page,block,'formal');assert.equal((await memory(f.page)).spokenLines[0].wording.concern,null);
  await click(f.page,block+' [data-today-click="pool-wording.undo"]');assert.equal((await memory(f.page)).spokenLines[0].wording.concern,'formal');
  await click(f.page,block+' [data-today-click="pool-wording.clear"]');let cleared=await memory(f.page);assert.ok(cleared.poolWordingClearedAt);assert.equal(cleared.spokenLines[0].wording,undefined);
  await click(f.page,block+' [data-today-click="pool-wording.undo"]');row=(await memory(f.page)).spokenLines[0];assert.equal(row.wording.concern,'formal');assert.ok(row.wording.at>cleared.poolWordingClearedAt);
  assert.equal(row.reaction,undefined);assert.deepEqual((await memory(f.page)).kindVerdicts,{});assert.equal(await f.page.evaluate(()=>__requests.length),0);
  assert.equal(await f.page.$eval(block+' .week-summary',e=>e.textContent),row.text);assert.deepEqual(f.errors,[]);ok('direct revision, toggle clear, Undo and clear-all/Undo preserve the exact sentence and whole-vote/retirement state with no request');await f.context.close();
 }
 {
  const f=await fixture(),block=await mount(f.page);await choose(f.page,block,'unclear');
  const result=await f.page.evaluate(()=>{
   const old=JSON.parse(JSON.stringify(appMemory.spokenLines[0])),base={manual_tasks:[],done_ids:[],deleted_ids:[],unchecked_ids:[],checked_ids:[],soon_tasks:[],past_tasks:[],habits:[]};
   const row=appMemory.spokenLines[0];row.reaction='landed';row.reactedAt=new Date(Date.now()+20).toISOString();
   const remote={...old,wording:{...old.wording,concern:'formal',at:new Date(Date.now()+1).toISOString()}};
   mergeRemoteData({...base,memory:{spokenLines:[remote]}});
   const keptVote=appMemory.spokenLines[0].reaction==='landed',independent=appMemory.spokenLines[0].wording.concern==='formal';
   mergeRemoteData({...base,memory:{spokenLines:[old]}});const oldCannotWin=appMemory.spokenLines[0].wording.concern==='formal';
   const clear={...remote,wording:{...remote.wording,concern:null,at:new Date(Date.now()+2).toISOString()}};
   mergeRemoteData({...base,memory:{spokenLines:[clear]}});mergeRemoteData({...base,memory:{spokenLines:[old]}});
   return{keptVote,independent,oldCannotWin,cleared:appMemory.spokenLines[0].wording.concern===null};
  });assert.deepEqual(result,{keptVote:true,independent:true,oldCannotWin:true,cleared:true});assert.deepEqual(f.errors,[]);
  ok('the real Dropbox merge independently adopts wording revisions and clears while preserving a newer whole vote and rejecting old backup replay');await f.context.close();
 }
 {
  const f=await fixture(),block=await mount(f.page);await choose(f.page,block,'unclear');
  const result=await f.page.evaluate(()=>{
   const old=JSON.parse(JSON.stringify(appMemory.spokenLines[0])),base={manual_tasks:[],done_ids:[],deleted_ids:[],unchecked_ids:[],checked_ids:[],soon_tasks:[],past_tasks:[],habits:[]};
   _memoryRecordSpokenLine('Sunday reflection','Some things you put in Soon keep coming back.','soon-pullback',_weekReflectionPolicy);
   const withdrawn=appMemory.spokenLines[0].wording?.concern===null;
   mergeRemoteData({...base,memory:{spokenLines:[{...old,reaction:'landed',reactedAt:new Date(Date.now()+1).toISOString()}]}});
   return{withdrawn,stillWithdrawn:appMemory.spokenLines[0].wording?.concern===null};
  });assert.deepEqual(result,{withdrawn:true,stillWithdrawn:true});ok('actual reading replacement withdraws style and a stale original-wording backup cannot restore it');await f.context.close();
 }
 {
  const f=await fixture(),block=await mount(f.page);await choose(f.page,block,'unclear');const old=(await memory(f.page)).spokenLines;
  await click(f.page,block+' [data-today-click="pool-wording.clear"]');
  await f.page.evaluate(old=>{mergeRemoteData({manual_tasks:[],done_ids:[],deleted_ids:[],unchecked_ids:[],checked_ids:[],soon_tasks:[],past_tasks:[],habits:[],memory:{spokenLines:old}});},old);
  assert.equal((await memory(f.page)).spokenLines[0]?.wording,undefined);assert.deepEqual(f.errors,[]);ok('the global wording-clear watermark defeats same-day stale backups without clearing whole-result votes');await f.context.close();
 }
 for(const action of ['ai-forget','memory-clear']){
  const f=await fixture(),block=await mount(f.page);await choose(f.page,block,'unclear');await choose(f.page,block,'formal');const old=(await memory(f.page)).spokenLines;
  await f.page.evaluate(action=>{if(action==='ai-forget')Today.use('connections').clearAIKey('claude');else{const b=document.createElement('button');b.dataset.todayClick='memory.clear-confirm';document.body.append(b);b.click();b.remove();}},action);
  assert.equal((await memory(f.page)).spokenLines.some(r=>r.wording?.concern),false);
  await f.page.evaluate(old=>mergeRemoteData({manual_tasks:[],done_ids:[],deleted_ids:[],unchecked_ids:[],checked_ids:[],soon_tasks:[],past_tasks:[],habits:[],memory:{spokenLines:old}}),old);
  assert.equal((await memory(f.page)).spokenLines.some(r=>r.wording?.concern),false);assert.deepEqual(f.errors,[]);ok('actual '+action+' removes supported wording and old same-day feedback cannot replay');await f.context.close();
 }
 for(const surface of ['Sunday reflection','morning nudge']){
  const f=await fixture(7*86400000,[{...(surface==='Sunday reflection'?sundaySource:morningSource),wording:undefined,reaction:'missed',reactionReason:'not_true'}]);
  const request=surface==='Sunday reflection'?await sunday(f.page):await morning(f.page);assert.equal(request.messages[0].content.includes('Optional wording guidance'),false);assert.equal(JSON.stringify(request).includes('not_true'),false);
  ok(surface+' whole-result votes and private miss reasons never acquire an invented style cause');await f.context.close();
 }
 for(const writer of ['sunday','morning'])for(const change of ['wording-revision','clear','memory-clear','incoming-clear','source-edit','source-delete','expiry','day','key','outcomes','retirement','cache','not-ready']){
  const old=writer==='sunday'?sundaySource:morningSource,f=await fixture(7*86400000,[old]);
  if(writer==='sunday')await sunday(f.page,{hold:'body'});else await morning(f.page,{hold:'body'});
  await f.page.evaluate(({change,writer})=>{
   const row=appMemory.spokenLines.find(r=>r.wording),date=_localISO();
   if(change==='wording-revision'){row.wording.concern=row.wording.concern==='formal'?'unclear':'formal';row.wording.at=new Date(Date.now()+1).toISOString();}
   if(change==='clear')Today.use('pool-wording').clear();
   if(change==='memory-clear')appMemory.clearedAt=new Date(Date.now()+1).toISOString();
   if(change==='incoming-clear')mergeRemoteData({manual_tasks:[],done_ids:[],deleted_ids:[],unchecked_ids:[],checked_ids:[],soon_tasks:[],past_tasks:[],habits:[],memory:{poolWordingClearedAt:new Date(Date.now()+1).toISOString()}});
   if(change==='source-edit')row.text='A revised historical sentence.';
   if(change==='source-delete')appMemory.spokenLines=[];
   if(change==='expiry')__clock+=24*86400000;
   if(change==='day')__clock+=86400000;
   if(change==='key')localStorage.setItem('today_ai_key_claude','another-fictional-key');
   if(change==='not-ready'){if(writer==='sunday')document.dispatchEvent(new CustomEvent('today:memory-ready',{detail:{ready:false}}));else checkDayNudge._setMemoryReady(false);}
   if(change==='outcomes')appMemory.taskOutcomes=[];
   if(change==='retirement')appMemory.kindVerdicts['soon-pullback']={missed:2,landed:0,retired:date,updated:date};
   if(change==='cache')localStorage.setItem((writer==='sunday'?'week_reflection_':'day_nudge_ai_')+date,'A synced line to keep.');
   __held.release();
  },{change,writer});
  await f.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const result=await f.page.evaluate(({writer})=>({cached:localStorage.getItem((writer==='sunday'?'week_reflection_':'day_nudge_ai_')+_localISO()),newReading:appMemory.spokenLines.some(r=>r.date===_localISO()&&r.kind==='soon-pullback')}),{writer});
  assert.equal(result.cached==='Some things you put in Soon keep coming back.',false,writer+' '+change);assert.equal(result.newReading,false,writer+' '+change);
  assert.deepEqual(f.errors,[]);ok(writer+' late body is fenced after '+change);await f.context.close();
 }
 {
  const f=await fixture(),block=await mount(f.page);await choose(f.page,block,'formal');
  await f.page.focus(block+' [data-concern="unclear"]');await f.page.evaluate(()=>Today.use('about').renderInfoStats());
  assert.equal(await f.page.evaluate(()=>document.activeElement?.dataset.concern),'unclear');assert.equal(await f.page.$eval(block+' .pool-wording-panel',e=>e.hidden),false);
  await f.page.keyboard.press('Space');assert.equal((await memory(f.page)).spokenLines[0].wording.concern,'unclear');
  await f.page.keyboard.press('Escape');assert.equal(await f.page.$eval(block+' .pool-wording-panel',e=>e.hidden),true);assert.equal(await f.page.evaluate(()=>document.activeElement?.dataset.todayClick),'pool-wording.open');
  await click(f.page,block+' [data-today-click="pool-wording.open"]');await f.page.setViewport({width:320,height:900});await f.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const geometry=await f.page.$eval(block,e=>({fit:[...e.querySelectorAll('.pool-wording-btn')].filter(b=>!b.closest('[hidden]')).every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.height>=24;}),overflow:document.documentElement.scrollWidth>innerWidth}));assert.deepEqual(geometry,{fit:true,overflow:false});
  await f.page.waitForFunction(()=>document.getElementById('infoPanel').getAnimations({subtree:true}).every(a=>!Number.isFinite(a.effect?.getComputedTiming().endTime)||(!a.pending&&a.playState!=='running')));
  await f.page.addScriptTag({path:join(ROOT,'scripts/node_modules/axe-core/axe.min.js')});assert.deepEqual(await f.page.evaluate(async()=> (await axe.run(document.querySelector('#sundayBlock'))).violations),[]);
  const clip=await f.page.$eval(block,e=>{const r=e.getBoundingClientRect();return{x:Math.max(0,r.x-10),y:r.y-10,width:Math.min(innerWidth,r.width+20),height:r.height+20};});await f.page.screenshot({path:join(EVIDENCE,'pool-wording-320.png'),clip});await f.page.setViewport({width:1280,height:900});const desktopClip=await f.page.$eval(block,e=>{const r=e.getBoundingClientRect();return{x:r.x-10,y:r.y-10,width:r.width+20,height:r.height+20};});await f.page.screenshot({path:join(EVIDENCE,'pool-wording-desktop.png'),clip:desktopClip});
  assert.deepEqual(f.errors,[]);ok('unchanged About redraw retains disclosure/focus; native keyboard, Escape, 24px targets,320px reflow and axe pass');await f.context.close();
 }


 {
  const f=await fixture(),block=await mount(f.page);
  const backups=await f.page.evaluate(async()=>{
   const captures=[],original=window.fetch;window.fetch=async(url,options={})=>{if(String(url).includes('dropboxapi.com')){captures.push(JSON.parse(options.body));return{ok:true,status:200,json:async()=>({rev:'fictional-revision'})};}return original(url,options);};
   localStorage.setItem('dropbox_token','fictional-backup-token');await dropboxBackup(true);
   document.querySelector('#sundayBlock [data-concern="formal"]').click();await dropboxBackup(true);
   localStorage.removeItem('dropbox_token');window.fetch=original;return captures;
  });assert.equal(backups.length,2);assert.equal(backups[0].version,'5.5');assert.equal(backups[1].version,'5.5');
  const before=structuredClone(backups[0]),after=structuredClone(backups[1]);delete before.saved_at;delete after.saved_at;
  const w=after.memory.spokenLines[0].wording;assert.equal(w.concern,'formal');assert.ok(Buffer.byteLength(JSON.stringify({wording:w}),'utf8')<=256);
  const delta=Buffer.byteLength(JSON.stringify(after),'utf8')-Buffer.byteLength(JSON.stringify(before),'utf8');assert.ok(delta>0&&delta<=256,'actual optional metadata delta: '+delta);delete after.memory.spokenLines[0].wording;assert.deepEqual(after,before);
  const sanitized=await f.page.evaluate(()=>{const row=appMemory.spokenLines[0];row.wording.extraPrivateText='x'.repeat(50000);_saveMemory();return JSON.parse(localStorage.getItem('today_memory')).spokenLines[0].wording;});assert.equal(sanitized.extraPrivateText,undefined);assert.ok(Buffer.byteLength(JSON.stringify({wording:sanitized}))<=256);
  assert.deepEqual(f.errors,[]);ok('actual schema5.5 Dropbox payload adds only the approved bounded metadata; persistence strips oversized arbitrary fields');await f.context.close();
 }
 for(const writer of ['sunday','morning']){
  const old=writer==='sunday'?sundaySource:morningSource,f=await fixture(7*86400000,[old]);
  const requests=await f.page.evaluate(async writer=>{
   const date=_localISO();appMemory.kindVerdicts=Object.fromEntries(['focus-vs-obligation','obligation-completion','letgo-reason','return-finished','soon-pullback','letgo-return','week-shape'].map(kind=>[kind,{landed:0,missed:2,retired:date,updated:date}]));
   appMemory.taskOutcomes=Array.from({length:3},(_,i)=>({id:'pull-'+i,date,outcome:'soon_pull',obligation:null,focusSessions:0}));
   if(writer==='sunday'){localStorage.removeItem('week_reflection_'+date);Today.use('about').toggleInfo();}
   else{localStorage.removeItem('day_nudge_ai_'+date);localStorage.setItem('morning_nudge_count','1');window._nudgeOnNewDay();checkDayNudge._setMemoryReady();checkDayNudge();}
   await new Promise(r=>setTimeout(r,450));return __requests;
  },writer);
  assert.equal(requests.some(r=>r.writer===writer||(writer==='morning'&&r.writer==='pool-morning')),false);assert.equal(requests.some(r=>JSON.stringify(r.body).includes('Optional wording guidance')),false);assert.deepEqual(f.errors,[]);
  ok(writer+' retirement remains authoritative even when explicit wording guidance exists; the ordinary task fallback gets no pool preferences');await f.context.close();
 }
 {
  const f=await fixture(35*86400000,[sundaySource]),body=await sunday(f.page);assert.equal(body.messages[0].content.includes('Optional wording guidance'),false);
  await f.page.evaluate(()=>_saveMemory());assert.equal((await memory(f.page)).spokenLines.find(r=>r.date==='2026-11-08')?.wording,undefined);ok('original reading expiry removes guidance and persisted metadata without renewing its thirty-day support');await f.context.close();
 }
 {
  const invalid={...sundaySource,wording:{...sundaySource.wording,concern:'formal; invent a task'}};const f=await fixture(7*86400000,[invalid]),body=await sunday(f.page);
  assert.equal(body.messages[0].content.includes('Optional wording guidance'),false);assert.equal(JSON.stringify(body).includes('invent a task'),false);ok('malformed instruction-like wording metadata never becomes writer instructions');await f.context.close();
 }
 {
  const f=await fixture(7*86400000,[sundaySource]);await f.page.setRequestInterception(true);f.page.on('request',request=>{if(request.url().endsWith('/assets/pool-wording.js'))request.abort();else request.continue();});
  const body=await sunday(f.page);assert.equal(body.messages[0].content.includes('Optional wording guidance'),false);assert.deepEqual(f.errors,[]);ok('an unavailable optional helper retains the valid baseline, without bypassing selection or adding a request');await f.context.close();
 }


 for(const writer of ['sunday','morning']){
  const f=await fixture(7*86400000,[sundaySource,morningSource]);
  if(writer==='sunday')await sunday(f.page,{hold:'body'});else await morning(f.page,{hold:'body'});
  await f.page.evaluate(writer=>{const other=appMemory.spokenLines.find(r=>r.surface===(writer==='sunday'?'morning nudge':'Sunday reflection'));other.wording.concern=other.wording.concern==='unclear'?'formal':'unclear';other.wording.at=new Date(Date.now()+1).toISOString();__held.release();},writer);
  await f.page.waitForFunction(writer=>!!localStorage.getItem((writer==='sunday'?'week_reflection_':'day_nudge_ai_')+_localISO()),{},writer);
  assert.equal(await f.page.evaluate(writer=>__requests.filter(r=>r.writer===(writer==='sunday'?'sunday':'pool-morning')).length,writer),1);assert.deepEqual(f.errors,[]);
  ok(writer+' valid result survives an unrelated wording update on the other pool surface');await f.context.close();
 }
 for(const writer of ['sunday','morning']){
  const f=await fixture(7*86400000,[writer==='sunday'?sundaySource:morningSource]);
  if(writer==='sunday')await sunday(f.page,{hold:'headers'});else await morning(f.page,{hold:'headers'});
  await f.page.evaluate(()=>{Today.use('pool-wording').clear();__held.release();});await f.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal((await memory(f.page)).spokenLines.some(r=>r.date==='2026-11-15'&&r.kind==='soon-pullback'),false);
  if(writer==='morning'){assert.equal(await f.page.$eval('#dayNudge',e=>e.classList.contains('show')),true);assert.equal(await f.page.evaluate(()=>Today.use('nudge').generationAudit().status),'stale-request');}
  assert.deepEqual(f.errors,[]);ok(writer+' held headers are fenced by clear; a stale morning response releases its request and retains the rule fallback');await f.context.close();
 }
 {
  const f=await fixture(),block=await mount(f.page);const result=await f.page.evaluate(()=>{
   const set=localStorage.setItem;localStorage.setItem=function(key,value){if(key==='today_memory')return;return set.call(this,key,value);};
   try{document.querySelector('#sundayBlock [data-concern="unclear"]').click();}finally{localStorage.setItem=set;}
   return{inMemory:appMemory.spokenLines[0].wording??null,stored:JSON.parse(localStorage.getItem('today_memory')).spokenLines[0].wording??null,pressed:document.querySelector('#sundayBlock [data-concern="unclear"]').getAttribute('aria-pressed')};
  });assert.deepEqual(result,{inMemory:null,stored:null,pressed:'false'});assert.deepEqual(f.errors,[]);ok('a refused save leaves the reading unrated instead of acknowledging unpersisted influence');await f.context.close();
 }
 {
  const f=await fixture(0,[sundaySource]);await f.page.emulateTimezone('America/Los_Angeles');
  await f.page.evaluate(()=>_saveMemory());assert.equal((await memory(f.page)).spokenLines[0].wording.concern,'unclear');
  assert.equal(await f.page.evaluate(()=>Today.use('pool-wording').prepare('Sunday reflection')),'');
  await f.page.emulateTimezone('Pacific/Kiritimati');assert.ok((await f.page.evaluate(()=>Today.use('pool-wording').prepare('Sunday reflection'))).includes('Use direct sentences'));
  assert.deepEqual(f.errors,[]);ok('cross-timezone sync retains a nearby future reading but withholds its guidance until the local date arrives');await f.context.close();
 }
 {
  const f=await fixture(),block=await mount(f.page);const result=await f.page.evaluate(()=>{
   const old=document.querySelector('#sundayBlock [data-concern="unclear"]');
   _memoryRecordSpokenLine('Sunday reflection','Some things you put in Soon keep coming back.','soon-pullback',_weekReflectionPolicy);
   old.click();return appMemory.spokenLines[0].wording??null;
  });assert.equal(result,null);assert.deepEqual(f.errors,[]);ok('a stale native control cannot attach a concern to replacement wording');await f.context.close();
 }

 {
  const f=await fixture(7*86400000);await f.page.setViewport({width:320,height:800});await morning(f.page);
  await click(f.page,'#dayNudge');await click(f.page,'#dayNudgeReact [data-react="missed"]');
  await click(f.page,'#dayNudgeReact [data-today-click="pool-wording.open"]');
  await f.page.waitForSelector('#dayNudgeReact .pool-wording-panel:not([hidden])');
  await choose(f.page,'#dayNudgeReact','formal');
  await new Promise(r=>setTimeout(r,8100));
  assert.equal(await f.page.$eval('#dayNudgeReact',e=>e.classList.contains('open')),true);
  assert.equal((await memory(f.page)).spokenLines.find(r=>r.date==='2026-11-15').wording.concern,'formal');
  assert.equal((await memory(f.page)).spokenLines.find(r=>r.date==='2026-11-15').reaction,'missed');
  assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await f.page.evaluate(()=>__requests.filter(r=>r.writer==='pool-morning').length),1);
  await click(f.page,'#dayNudge');assert.equal(await f.page.$eval('#dayNudgeReact',e=>e.classList.contains('open')),false);
  assert.deepEqual(f.errors,[]);ok('the actual 320px morning strip keeps optional wording usable beyond its miss timeout, preserves the vote, and dismisses normally');await f.context.close();
 }
 {
  const f=await fixture(7*86400000,[sundaySource]);let released=false;const held=[];
  await f.page.setRequestInterception(true);f.page.on('request',request=>{if(!released&&request.url().endsWith('/assets/pool-wording.js'))held.push(request);else request.continue();});
  const body=await sunday(f.page);assert.ok(held.length);assert.equal(body.messages[0].content.includes('Optional wording guidance'),false);released=true;await Promise.all(held.map(request=>request.continue()));
  await f.page.waitForFunction(()=>{try{return !!Today.use('pool-wording-ui');}catch{return false;}},{timeout:5000}).catch(async error=>{console.error('Slow helper diagnostics',await f.page.evaluate(()=>({resources:performance.getEntriesByType('resource').filter(r=>/pool-wording|feedback-policy/.test(r.name)).map(r=>({name:r.name,duration:r.duration})),requests:__requests.length})),f.errors);throw error;});
  assert.equal(await f.page.evaluate(()=>__requests.filter(r=>r.writer==='sunday').length),1);
  assert.deepEqual(f.errors,[]);ok('optional helper preparation times out at its bounded baseline and late loading cannot regenerate the accepted reading');await f.context.close();
 }

 console.log('\nPool wording tests passed ('+groups+' groups).');
}finally{await browser.close();server.close();}
