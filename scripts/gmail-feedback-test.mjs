import { waitForFonts } from './browser-fixture.mjs';
// Actual Gmail feedback -> subsequent selection/draft, privacy and ownership controls.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {extname,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const EVIDENCE=process.env.TODAY_GMAIL_EVIDENCE||join(ROOT,'.context/15e-gmail');
const mime={'.html':'text/html','.js':'text/javascript','.woff2':'font/woff2','.json':'application/json','.png':'image/png'};
const server=createServer(async(req,res)=>{const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);try{const body=await readFile(join(ROOT,path==='/'?'index.html':path));res.writeHead(200,{'Content-Type':mime[extname(path==='/'?'index.html':path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',pipe:true,args:['--no-first-run','--disable-extensions']});
let count=0;const ok=label=>{count++;console.log('  ✓ '+label);};
const key=id=>'gmail_enrichment_'+id;
const A='manual_1700000000001',B='manual_1700000000002';
const grant=createHash('sha256').update(origin+'\0fictional-mail-grant').digest('hex');
async function fixture(context){
 const page=await (context||await browser.createBrowserContext()).newPage();await page.setViewport({width:1280,height:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(({grant,A,B})=>{
  const nativeMedia=window.matchMedia.bind(window);window.matchMedia=query=>{
   const input={'(hover: hover)':true,'(hover: none)':false,'(pointer: fine)':true,'(pointer: coarse)':false};
   return Object.hasOwn(input,query)?{matches:input[query],media:query,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}:nativeMedia(query);
  };
  localStorage.setItem('splash_shown_at',String(Date.now()));localStorage.setItem('gmail_access_token','fictional-access');localStorage.setItem('gmail_refresh_token','fictional-mail-grant');localStorage.setItem('gmail_token_expiry',String(Date.now()+3600000));
  localStorage.setItem('today_ai_provider','claude');localStorage.setItem('today_ai_key_claude','fictional-ai-key');
  localStorage.setItem('today_manual',JSON.stringify([{id:A,text:'Reply about contract'},{id:B,text:'Reply about invoice'}]));
  window.__entry=(text,threadId='first',snippet='The contract is ready to review.')=>({taskText:text,threadId,subject:text.includes('invoice')?'Invoice':'Contract',from:'Sam <sam@example.com>',date:'2026-10-20',messageId:threadId+'@fictional.invalid',snippet,fetchedAt:Date.now(),matchPolicy:'minisearch-v1',ownerPolicy:'owner-v2',connectionKey:grant});
  for(const [id,text]of[[A,'Reply about contract'],[B,'Reply about invoice']]){if(!localStorage.getItem('gmail_enrichment_'+id))localStorage.setItem('gmail_enrichment_'+id,JSON.stringify(__entry(text)));localStorage.setItem('gmail_classify_'+id,JSON.stringify({taskText:text,isComm:true,searchQuery:'subject:'+(text.includes('invoice')?'invoice':'contract'),source:'ai',ownerPolicy:'owner-v2',connectionKey:grant}));}
  window.__draftRequests=[];window.__askRequests=[];window.__mailRequests=[];window.__draftQueue=[];window.__holding=null;window.__mailCandidates=['first','second'];
  const response=data=>({ok:true,status:200,json:async()=>data});const originalFetch=window.fetch.bind(window);
  window.fetch=async(url,options={})=>{
   const address=String(url);
   if(address.includes('/ai-assist')){
    const sent=JSON.parse(options.body||'{}');
    if(String(sent.systemPrompt).startsWith('Draft a brief, natural reply.')){
     const item={sent,signal:options.signal};__draftRequests.push(item);const next=__draftQueue.shift()||{content:'I will review the contract this afternoon.'};
     if(next.hold==='headers')return new Promise(resolve=>{__holding={item,release:()=>resolve(response({content:'Late draft must not appear.'}))};});
     if(next.hold==='body')return{ok:true,status:200,json:()=>new Promise(resolve=>{__holding={item,release:()=>resolve({content:'Late draft must not appear.'})};})};
     return response(next);
    }
    if(String(sent.systemPrompt).startsWith('The person explicitly asked for help with one task')){__askRequests.push(sent);return response({content:'Which contract section needs your draft reply?'});}
    return response({content:'',isComm:true,searchQuery:'subject:contract'});
   }
   if(address.includes('gmail.googleapis.com')){
    __mailRequests.push(address);if(window.__mailError)return{ok:false,status:503,json:async()=>({})};
    if(address.includes('/threads?')){const data={threads:__mailCandidates.map(id=>({id}))};if(window.__holdMail)return{ok:true,status:200,json:()=>new Promise(resolve=>{window.__heldMail={signal:options.signal,release:()=>resolve(data)};})};return response(data);}
    const id=address.match(/\/threads\/([^?]+)/)?.[1];
    return response({messages:[{snippet:'The contract is ready to review.',payload:{headers:[{name:'Subject',value:'Contract'},{name:'From',value:'Sam <sam@example.com>'},{name:'Date',value:id==='first'?'2026-10-20':'2026-10-10'},{name:'Message-ID',value:'<'+id+'@fictional.invalid>'}]}}]});
   }
   if(address.includes('/gmail-token'))return response({access_token:'fictional-renewed',expires_in:3600});
   return originalFetch(url,options);
  };
 },{grant,A,B});
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:15000}).catch(error=>{console.error('Fixture navigation failed:',error.message);throw error;});await page.waitForFunction(()=>typeof window._gmailRenderFocusBlock==='function');
 await waitForFonts(page);
 // The same explicit hardware model must govern JS guards and CSS. Keep selectors,
 // declarations and actual width/motion conditions; Linux has no native pointer.
 await page.evaluate(()=>{function visit(rules){for(const rule of rules){if(rule.type===CSSRule.MEDIA_RULE)rule.media.mediaText=rule.conditionText.replace(/\((hover|pointer):\s*(hover|none|fine|coarse)\)/g,(_,kind,value)=>((kind==='hover'&&value==='hover')||(kind==='pointer'&&value==='fine'))?'(min-width: 0px)':'(max-width: 0px)');if(rule.cssRules)visit(rule.cssRules);}}for(const sheet of document.styleSheets)visit(sheet.cssRules);});
 return{page,errors};
}
async function open(page,id=A){
 await page.evaluate(id=>{document.querySelector('.task[data-taskid="'+id+'"] .task-text').click();},id);
 try{await page.waitForFunction(id=>document.querySelector('.task.focused')?.dataset.taskid===id&&!document.querySelector('#focusGmailBlock').hidden&&document.querySelector('#focusGmailBlock .focus-gmail-thread'),{timeout:5000},id);}catch(error){console.error('Gmail focus fixture state',await page.evaluate(()=>({focused:document.querySelector('.task.focused')?.dataset.taskid,blockHidden:document.querySelector('#focusGmailBlock')?.hidden,sourceCache:!!localStorage.getItem('gmail_enrichment_manual_1700000000001'),owners:manualTasks.map(t=>t.id)})));throw error;}
}
async function click(page,action,concern){
 const selector='#focusGmailBlock [data-today-click="'+action+'"]'+(concern?'[data-concern="'+concern+'"]':'');
 await page.waitForFunction(selector=>{const b=document.querySelector(selector);if(!b||b.closest('[hidden]')||b.disabled)return false;const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));},{},selector);
 await page.click(selector);
}
async function draft(page,text='I will review the contract this afternoon.'){
 await page.evaluate(text=>__draftQueue.push({content:text}),text);await click(page,'gmail.draft');await page.waitForFunction(text=>document.querySelector('.focus-gmail-draft')?.textContent===text,{},text);
}
async function wording(page,concern){await click(page,'gmail.wording');if(concern)await click(page,'gmail.concern',concern);}
async function exit(page){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.task.focused'));}
async function read(page,id=A){return page.evaluate(id=>JSON.parse(localStorage.getItem('gmail_enrichment_'+id)),id);}
try{
 await mkdir(EVIDENCE,{recursive:true});
 {
  const{page,errors}=await fixture();assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>r.name.includes('gmail-feedback.js'))),false);
  await open(page);assert.equal(await page.evaluate(()=>__draftRequests.length),0);
  await click(page,'gmail.context');let entry=await read(page);assert.equal(entry.feedback.context.hidden,true);assert.deepEqual(entry.feedback.context.rejectedThreads,['first']);
  assert.equal(await page.evaluate(()=>__mailRequests.length+__draftRequests.length),0);assert.equal(await page.$eval('.focus-gmail-context',e=>e.hidden),true);
  await click(page,'gmail.context');assert.equal((await read(page)).feedback,undefined);
  await click(page,'gmail.context');await click(page,'gmail.context-retry');await page.waitForFunction(()=>document.querySelector('.focus-gmail-context')?.hidden===false);
  entry=await read(page);assert.equal(entry.threadId,'second');assert.deepEqual(entry.feedback.context.rejectedThreads,['first']);assert.equal(entry.feedback.context.hidden,false);
  const requests=await page.evaluate(()=>__mailRequests);assert.equal(requests.length,3);assert.equal(new URL(requests[0]).searchParams.get('maxResults'),'5');assert.ok(requests.every(url=>!url.includes('apiKey')));
  await click(page,'gmail.context');assert.equal(await page.$eval('[data-today-click="gmail.context-retry"]',b=>b.disabled),true);
  assert.deepEqual(errors,[]);ok('thread rejection persists before hiding, Undo adds no call, one explicit alternative excludes it locally within the existing search');await page.browserContext().close();
 }
 {
  const{page,errors}=await fixture();
  await page.evaluate(id=>localStorage.setItem('agent_enrichment_'+id,JSON.stringify({v:3,taskText:'Reply about contract',boardId:'',state:'success',fetchedAt:Date.now(),card:{icon:'↗',headline:'Contract reference',body:'Reference for this contract.',cta:{label:'Open',href:'https://example.org/contract'}}})),A);
  await open(page);await page.waitForFunction(()=>document.querySelector('#focusAgentBlock .focus-agent-link'));
  await page.waitForFunction(()=>document.querySelector('.focus-ai-timer-btn').textContent==='✦︎ draft reply');
  await click(page,'gmail.context');
  assert.equal(await page.$eval('.focus-ai-timer-btn',e=>e.textContent),'✦︎ open');
  assert.equal(await page.$eval('.focus-ai-timer-btn',e=>e.getAttribute('aria-label')),'Open context source');
  await page.evaluate(()=>{window.__opened=[];window.open=(...args)=>__opened.push(args);});
  await page.click('.focus-ai-timer-btn');assert.equal(await page.evaluate(()=>__opened[0][0]),'https://example.org/contract');
  assert.equal(await page.evaluate(()=>__draftRequests.length+__askRequests.length),0);assert.deepEqual(errors,[]);
  ok('rejecting mail releases the actual Focus shortcut to available web context, with its matching accessible name');await page.browserContext().close();
 }
 {
  const{page,errors}=await fixture();await open(page);await click(page,'gmail.context');
  assert.equal(await page.$eval('.focus-ai-timer-btn',e=>e.textContent),'✦︎ ask');
  assert.equal(await page.$eval('.focus-ai-timer-btn',e=>e.getAttribute('aria-label')),'Ask for focus help');
  await page.click('.focus-ai-timer-btn');const answer='Which contract section needs your draft reply?';
  await page.waitForFunction(answer=>document.querySelector('.focus-ai-timer-btn').textContent===answer,{},answer);
  assert.equal(await page.evaluate(()=>__draftRequests.length),0);assert.equal(await page.evaluate(()=>__askRequests.length),1);
  const sent=await page.evaluate(()=>__askRequests[0]);assert.equal(JSON.stringify(sent).includes('The contract is ready to review.'),false);
  await click(page,'gmail.context');assert.equal(await page.$eval('.focus-ai-timer-btn',e=>e.textContent),answer);
  await page.evaluate(()=>Today.use('gmail').closeFocus());
  assert.equal(await page.$eval('.focus-ai-timer-btn',e=>e.textContent),answer);assert.equal(await page.$eval('.focus-ai-timer-btn',e=>e.getAttribute('aria-label')),answer);
  assert.deepEqual(errors,[]);ok('hidden mail returns to task-only Ask; restoring or closing mail preserves an accepted answer and its accessible name');await page.browserContext().close();
 }
 {
  const{page,errors}=await fixture();await open(page);await page.evaluate(()=>__mailCandidates=['first']);await click(page,'gmail.context');await click(page,'gmail.context-retry');
  await page.waitForFunction(()=>document.querySelector('[data-today-click="gmail.context-retry"]')?.textContent==='try other email');
  assert.equal((await read(page)).threadId,'first');assert.equal((await read(page)).feedback.context.hidden,true);await click(page,'gmail.context');assert.equal(await page.$eval('.focus-gmail-context',e=>e.hidden),false);
  assert.deepEqual(errors,[]);ok('an empty alternative leaves the original hidden and recoverable; no invented difference or automatic extra lookup');await page.browserContext().close();
 }
 {
  const{page,errors}=await fixture();await open(page);const first='I can review the contract after lunch, before I send any comments.';await draft(page,first);
  const baseline=await page.evaluate(()=>__draftRequests[0].sent);assert.equal(baseline.systemPrompt,'Draft a brief, natural reply. Under 3 sentences. Use first name only if greeting. No subject line. No sign-off.');
  assert.equal(await page.$eval('.gmail-draft-feedback',e=>e.hidden),false);await wording(page,'too_formal');
  let entry=await read(page);assert.equal(entry.feedback.wording.concern,'too_formal');assert.match(entry.feedback.wording.draftId,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(entry.feedback).includes(first),false);assert.equal(await page.evaluate(()=>__draftRequests.length),1);
  const second='I will read the contract before sending comments.';await page.evaluate(text=>__draftQueue.push({content:text}),second);await click(page,'gmail.draft-retry');await page.waitForFunction(text=>document.querySelector('.focus-gmail-draft').textContent===text,{},second);
  const guided=await page.evaluate(()=>__draftRequests[1].sent);assert.ok(guided.systemPrompt.includes('natural, conversational wording'));assert.deepEqual(guided.messages,baseline.messages);assert.equal(JSON.stringify(guided).includes(first),false);
  assert.equal(await page.$eval('[data-today-click="gmail.draft-retry"]',b=>b.disabled),true);assert.equal(await page.$eval('[data-concern="too_formal"]',b=>b.getAttribute('aria-pressed')),'false');
  await wording(page,'hard_to_follow');await click(page,'gmail.concern','too_formal');assert.equal((await read(page)).feedback.wording.concern,'too_formal');await click(page,'gmail.concern','too_formal');assert.equal((await read(page)).feedback?.wording,undefined);
  await click(page,'gmail.wording-undo');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('gmail_enrichment_manual_1700000000001')).feedback?.wording?.concern==='too_formal');
  await click(page,'gmail.wording-clear');assert.equal((await read(page)).feedback?.wording,undefined);assert.equal(await page.evaluate(()=>__draftRequests.length),2);
  assert.deepEqual(errors,[]);ok('exact-draft concerns guide only the next explicit request; revision/toggle/Undo/clear work without old prose, inferred facts or automatic calls');
  await page.browserContext().close();
 }
 {
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'hard_to_follow');
  await page.evaluate(()=>{window.__oldConcern=document.querySelector('[data-concern="hard_to_follow"]');});
  await page.evaluate(()=>__draftQueue.push({content:'I will read the contract and return my comments.'}));await click(page,'gmail.draft-retry');await page.waitForFunction(()=>document.querySelector('.focus-gmail-draft').textContent==='I will read the contract and return my comments.');
  const before=JSON.stringify((await read(page)).feedback);await page.evaluate(()=>{document.querySelector('.gmail-draft-feedback').append(__oldConcern);__oldConcern.click();__oldConcern.remove();});assert.equal(JSON.stringify((await read(page)).feedback),before);
  await exit(page);await open(page,B);await draft(page,'I will review the invoice.');const other=await page.evaluate(()=>__draftRequests.at(-1).sent);assert.ok(other.systemPrompt.includes('Use clear, direct sentences'));assert.equal(JSON.stringify(other).includes('I will review the contract'),false);assert.equal((await read(page)).feedback.wording.scope,'device');
  await wording(page,'too_formal');await page.evaluate(()=>__draftQueue.push({content:'I will check the invoice details.'}));await click(page,'gmail.draft-retry');await page.waitForFunction(()=>document.querySelector('.focus-gmail-draft').textContent==='I will check the invoice details.');
  const combined=await page.evaluate(()=>__draftRequests.at(-1).sent.systemPrompt);assert.ok(combined.includes('Use clear, direct sentences'));assert.ok(combined.includes('natural, conversational wording'));
  ok('superseded controls cannot rate a new draft; approved device-local fixed concerns guide another task and combine without prior prose');await page.browserContext().close();
 }

 {
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'hard_to_follow');
  await page.evaluate(id=>{const entry=JSON.parse(localStorage.getItem('gmail_enrichment_'+id));entry.feedback.wording.scope='task';localStorage.setItem('gmail_enrichment_'+id,JSON.stringify(entry));},A);
  await exit(page);await open(page,B);await draft(page,'I will review the invoice.');assert.equal(await page.evaluate(()=>__draftRequests.at(-1).sent.systemPrompt.includes('Optional wording guidance')),false);
  await exit(page);await open(page);await draft(page,'I will read this contract.');assert.ok(await page.evaluate(()=>__draftRequests.at(-1).sent.systemPrompt.includes('Use clear, direct sentences')));
  ok('older task-only concerns retain their disclosed scope after device guidance is enabled');await page.browserContext().close();
 }
 for(const change of ['edit','delete','expiry']){
  const{page}=await fixture();if(change==='expiry')await page.evaluate(id=>{const entry=JSON.parse(localStorage.getItem('gmail_enrichment_'+id));entry.fetchedAt-=82800000;localStorage.setItem('gmail_enrichment_'+id,JSON.stringify(entry));},A);
  await open(page);await draft(page);await wording(page,'hard_to_follow');await exit(page);await open(page,B);
  await page.evaluate(()=>__draftQueue.push({hold:'body'}));await click(page,'gmail.draft');await page.waitForFunction(()=>!!__holding);
  assert.ok(await page.evaluate(()=>__draftRequests.at(-1).sent.systemPrompt.includes('Use clear, direct sentences')));
  await page.evaluate(({change,A})=>{
   if(change==='edit')manualTasks.find(t=>t.id===A).text='Reply about another contract';
   if(change==='delete')manualTasks=manualTasks.filter(t=>t.id!==A);
   if(change==='expiry'){const native=Date.now;Date.now=()=>native()+3600001;}
   __holding.release();
  },{change,A});
  await page.waitForFunction(()=>!document.querySelector('.focus-gmail-draft-btn').disabled);
  assert.equal(await page.$eval('.focus-gmail-draft',e=>e.textContent.includes('Late draft must not appear.')),false);
  await draft(page,'I will check this invoice.');assert.equal(await page.evaluate(()=>__draftRequests.at(-1).sent.systemPrompt.includes('Optional wording guidance')),false);
  ok('cross-task source '+change+' fences an outstanding guided draft and removes its influence from the next request');await page.browserContext().close();
 }

 for(const kind of ['identical','empty']){
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'too_formal');
  await page.evaluate(kind=>__draftQueue.push({content:kind==='identical'?'I will review the contract this afternoon.':''}),kind);
  await click(page,'gmail.draft-retry');await page.waitForFunction(()=>document.querySelector('[data-today-click="gmail.draft-retry"]')?.textContent==='try another draft');
  assert.equal(await page.$eval('.focus-gmail-draft',e=>e.textContent),'I will review the contract this afternoon.');
  assert.equal(await page.$eval('[data-concern="too_formal"]',e=>e.getAttribute('aria-pressed')),'true');
  assert.equal(await page.evaluate(()=>__draftRequests.length),2);assert.equal(await page.$eval('[data-today-click="gmail.draft-retry"]',e=>e.disabled),true);
  ok(kind+' replacement keeps the accepted draft, reaction and Mail action without a rewrite loop');await page.browserContext().close();
 }
 {
  const{page}=await fixture();await open(page);await page.evaluate(()=>window.__mailError=true);await click(page,'gmail.context');await click(page,'gmail.context-retry');
  await page.waitForFunction(()=>document.querySelector('[data-today-click="gmail.context-retry"]')?.textContent==='try other email');
  assert.equal((await read(page)).feedback.context.hidden,true);assert.equal(await page.evaluate(()=>__mailRequests.length),1);
  ok('a failed alternative lookup preserves the hidden original without broadening search or retrying automatically');await page.browserContext().close();
 }
 for(const change of ['clear','feedback-revision','memory-clear','edit','delete','account','ai-key','expiry','source-cache']){
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'hard_to_follow');await page.evaluate(()=>__draftQueue.push({hold:'body'}));await click(page,'gmail.draft-retry');await page.waitForFunction(()=>!!__holding);
  await page.evaluate(({change,A})=>{
   if(change==='clear')Today.use('gmail').clearFeedback(true);
   if(change==='feedback-revision')document.querySelector('[data-concern="too_formal"]').click();
   if(change==='memory-clear')appMemory.clearedAt=new Date(Date.now()+1).toISOString();
   if(change==='edit')manualTasks.find(t=>t.id===A).text='Reply about invoice';
   if(change==='delete')manualTasks=manualTasks.filter(t=>t.id!==A);
   if(change==='account')localStorage.setItem('gmail_refresh_token','other-fictional-grant');
   if(change==='ai-key')localStorage.setItem('today_ai_key_claude','replacement-fictional-key');
   if(change==='expiry'){const native=Date.now;Date.now=()=>native()+86400001;}
   if(change==='source-cache'){const entry=JSON.parse(localStorage.getItem('gmail_enrichment_'+A));entry.snippet='An updated contract message.';localStorage.setItem('gmail_enrichment_'+A,JSON.stringify(entry));}
   __holding.release();
  },{change,A});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.evaluate(()=>document.querySelector('.focus-gmail-draft')?.textContent.includes('Late draft must not appear.')),false);
  ok('late draft body is fenced after '+change);await page.browserContext().close();
 }
 {
  const{page,errors}=await fixture();await open(page);await draft(page);await wording(page,'too_formal');
  await page.evaluate(()=>{const entry=JSON.parse(localStorage.getItem('gmail_enrichment_manual_1700000000001'));entry.snippet='Changed source prose';localStorage.setItem('gmail_enrichment_manual_1700000000001',JSON.stringify(entry));Today.use('gmail').cleanup();});
  await exit(page);await open(page);await draft(page,'I will review this version.');assert.equal(await page.evaluate(()=>__draftRequests.at(-1).sent.systemPrompt.includes('Optional wording guidance')),false);assert.equal((await read(page)).feedback?.wording,undefined);
  assert.deepEqual(errors,[]);ok('source digest verification withdraws wording even when thread/message IDs are unchanged');await page.browserContext().close();
 }
 {
  const{page,errors}=await fixture();await open(page);await draft(page);await wording(page,'too_formal');
  await page.evaluate(()=>{window.__beforeAccess=JSON.parse(localStorage.getItem('gmail_enrichment_manual_1700000000001')).feedback.wording;localStorage.setItem('gmail_access_token','renewed-fictional-access');Today.use('gmail').cleanup();});assert.equal((await read(page)).feedback.wording.concern,'too_formal');
  await page.evaluate(()=>{appMemory.clearedAt=new Date(Date.now()+1).toISOString();Today.use('gmail').cleanup();});assert.equal((await read(page)).feedback,undefined);
  await page.evaluate(()=>{document.querySelector('.focus-gmail-draft-btn').dataset.mailto='#safe-draft';});
  assert.deepEqual(errors,[]);ok('access refresh preserves feedback; incoming memory-clear watermark removes independent feedback sub-events');await page.browserContext().close();
 }

 {
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'too_formal');await exit(page);await open(page);await draft(page,'I will review this contract tomorrow.');
  assert.equal(await page.evaluate(()=>__draftRequests.at(-1).sent.systemPrompt.includes('natural, conversational wording')),true);
  assert.equal(await page.$eval('[data-concern="too_formal"]',e=>e.getAttribute('aria-pressed')),'false');
  ok('ordinary re-entry and the next requested draft close the loop; a new draft starts unrated');await page.browserContext().close();
 }
 {
  const{page}=await fixture();await open(page);await page.evaluate(()=>window.__holdMail=true);await click(page,'gmail.context');await click(page,'gmail.context-retry');await page.waitForFunction(()=>!!window.__heldMail);
  await click(page,'gmail.context');assert.equal(await page.evaluate(()=>__heldMail.signal.aborted),true);
  await page.evaluate(()=>__heldMail.release());await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const entry=await read(page);assert.equal(entry.threadId,'first');assert.equal(entry.feedback?.context,undefined);assert.equal(await page.evaluate(()=>__mailRequests.length),1);
  ok('restoring feedback during a held alternative aborts it and fences its late list body');await page.browserContext().close();
 }
 {
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'hard_to_follow');await page.evaluate(()=>__draftQueue.push({hold:'headers'}));await click(page,'gmail.draft-retry');await page.waitForFunction(()=>!!__holding);
  await click(page,'gmail.wording-clear');assert.equal(await page.evaluate(()=>__holding.item.signal.aborted),true);await page.evaluate(()=>__holding.release());
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.$eval('.focus-gmail-draft',e=>e.textContent),'I will review the contract this afternoon.');
  ok('clear cancels held draft headers while preserving the accepted draft and Mail action');await page.browserContext().close();
 }
 {
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'too_formal');
  await page.evaluate(({A,B})=>{window.__oldOwnerChoice=document.querySelector('[data-concern="hard_to_follow"]');const entry=JSON.parse(localStorage.getItem('gmail_enrichment_'+A));manualTasks.find(t=>t.id===B).text=entry.taskText;localStorage.setItem('gmail_enrichment_'+B,JSON.stringify(entry));delete entry.feedback;localStorage.setItem('gmail_enrichment_'+A,JSON.stringify(entry));Today.use('connections').renderManual();},{A,B});
  await exit(page);await open(page,B);await draft(page);await wording(page);const before=JSON.stringify((await read(page,B)).feedback);
  await page.evaluate(()=>{document.querySelector('.gmail-draft-feedback').append(__oldOwnerChoice);__oldOwnerChoice.click();__oldOwnerChoice.remove();});assert.equal(JSON.stringify((await read(page,B)).feedback),before);
  assert.equal(await page.evaluate(()=>__draftRequests.at(-1).sent.systemPrompt.includes('Optional wording guidance')),false);
  ok('identical text/mail/drafts on distinct tasks keep distinct identities; copied support fails its owner digest');await page.browserContext().close();
 }
 {
  const{page}=await fixture();await open(page);const expiry=(await read(page)).fetchedAt+86400000;await click(page,'gmail.context');
  await page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+2000;});await click(page,'gmail.context-retry');await page.waitForFunction(()=>document.querySelector('.focus-gmail-context')?.hidden===false);
  assert.equal((await read(page)).feedback.expiresAt,expiry);await draft(page);await wording(page,'too_formal');await click(page,'gmail.wording-clear');
  await page.evaluate(expiry=>{Date.now=()=>expiry+1;document.querySelector('[data-today-click="gmail.wording-undo"]').click();},expiry);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal((await read(page)).feedback?.wording,undefined);
  ok('replacement never extends original feedback expiry, and Undo cannot restore expired support');await page.browserContext().close();
 }
 {
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'hard_to_follow');
  await page.evaluate(async({A,grant})=>{
   const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
   for(let i=0;i<25;i++){const id='mail_cap_'+i,text='Reply about contract';manualTasks.push({id,text});const entry=__entry(text);
    const source=JSON.stringify([id,entry.taskText,entry.connectionKey,entry.threadId,entry.messageId,entry.subject,entry.from,entry.date,entry.snippet,entry.fetchedAt]);
    entry.feedback={policy:1,expiresAt:entry.fetchedAt+86400000,context:{at:Date.now()+i,hidden:false,rejectedThreads:Array.from({length:5},(_,j)=>(i+'-'+j+'-').padEnd(128,'x'))},wording:{at:Date.now()+i,concern:'too_formal',draftId:'a'.repeat(64),sourceId:await hash(source),writer:'gmail-draft-v1',scope:'task'}};
    localStorage.setItem('gmail_enrichment_'+id,JSON.stringify(entry));
   }
  },{A,grant});
  await page.evaluate(()=>__draftQueue.push({content:'I will review the contract.'}));await click(page,'gmail.draft-retry');await page.waitForFunction(()=>document.querySelector('.focus-gmail-draft').textContent==='I will review the contract.');
  const caps=await page.evaluate(()=>{const all=Object.keys(localStorage).filter(k=>k.startsWith('gmail_enrichment_')),saved=all.filter(k=>JSON.parse(localStorage.getItem(k)).feedback);return{entries:all.length,records:saved.length,bytes:saved.reduce((n,k)=>n+new TextEncoder().encode(k.slice(17)+JSON.stringify(JSON.parse(localStorage.getItem(k)).feedback)).length,0)};});
  assert.equal(caps.entries,27);assert.ok(caps.records<=20&&caps.bytes<=16384,caps);ok('feedback caps evict metadata only, keeping accepted mail caches and unchanged24h retention');await page.browserContext().close();
 }

 {
  const{page}=await fixture();await open(page);await draft(page);
  const backup=await page.evaluate(async()=>{
   const captures=[],original=window.fetch;window.fetch=async(url,options)=>{
    if(String(url).includes('dropboxapi.com')){captures.push(JSON.parse(options.body));return{ok:true,status:200,json:async()=>({rev:'fictional-revision'})};}
    return original(url,options);
   };
   localStorage.setItem('dropbox_token','fictional-backup-token');await dropboxBackup(true);
   document.querySelector('[data-today-click="gmail.wording"]').click();document.querySelector('[data-concern="too_formal"]').click();await dropboxBackup(true);
   localStorage.removeItem('dropbox_token');window.fetch=original;return captures.map(data=>{delete data.saved_at;return data;});
  });
  assert.equal(backup.length,2);assert.deepEqual(backup[0],backup[1]);assert.equal(JSON.stringify(backup).includes('sam@example.com'),false);assert.equal(JSON.stringify(backup).includes('draftId'),false);
  ok('the actual backup payload gains zero fields/bytes from mail feedback, email metadata or draft identities');await page.browserContext().close();
 }
 {
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'too_formal');
  await page.evaluate(()=>{const entry=JSON.parse(localStorage.getItem('gmail_enrichment_manual_1700000000001'));entry.feedback.wording.concern='too_formal; invent an invoice';localStorage.setItem('gmail_enrichment_manual_1700000000001',JSON.stringify(entry));Today.use('gmail').cleanup();});
  await exit(page);await open(page);await draft(page,'I will review the contract.');const sent=await page.evaluate(()=>__draftRequests.at(-1).sent);assert.equal(sent.systemPrompt.includes('invent an invoice'),false);assert.equal(sent.systemPrompt.includes('Optional wording guidance'),false);
  ok('malformed or instruction-like feedback never becomes wording instructions or current task facts');await page.browserContext().close();
 }
 for(const clear of ['ai-forget','memory-clear','gmail-forget']){
  const{page}=await fixture();await open(page);await draft(page);await wording(page,'too_formal');
  await page.evaluate(clear=>{
   if(clear==='ai-forget')Today.use('connections').clearAIKey('claude');
   if(clear==='gmail-forget')gmailDisconnect();
   if(clear==='memory-clear'){const button=document.createElement('button');button.dataset.todayClick='memory.clear-confirm';document.body.append(button);button.click();button.remove();}
  },clear);
  assert.equal((await read(page))?.feedback?.wording,undefined);if(clear==='gmail-forget')assert.equal(await read(page),null);
  ok('actual '+clear+' path removes its permitted Gmail feedback influence');await page.browserContext().close();
 }
 {
  const context=await browser.createBrowserContext(),one=await fixture(context);await open(one.page);await draft(one.page);await wording(one.page,'too_formal');
  const two=await fixture(context);await open(two.page);await draft(two.page);await wording(two.page);
  await two.page.focus('[data-concern="hard_to_follow"]');
  await one.page.evaluate(()=>Today.use('gmail').clearFeedback(true));await two.page.waitForFunction(()=>!JSON.parse(localStorage.getItem('gmail_enrichment_manual_1700000000001')).feedback?.wording);
  await two.page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await two.page.evaluate(()=>document.activeElement?.dataset.concern),'hard_to_follow');
  await two.page.evaluate(()=>__draftQueue.push({content:'I will review the contract.'}));await click(two.page,'gmail.draft-retry');await two.page.waitForFunction(()=>document.querySelector('.focus-gmail-draft').textContent==='I will review the contract.');
  assert.equal(await two.page.evaluate(()=>__draftRequests.at(-1).sent.systemPrompt.includes('Optional wording guidance')),false);
  ok('cross-tab clear updates guidance and keeps the current card, disclosure and native control focus');await context.close();
 }
 {
  const{page,errors}=await fixture();await open(page);await draft(page);await wording(page,'hard_to_follow');
  await page.setViewport({...page.viewport(),width:320,height:800});await page.waitForFunction(()=>innerWidth===320);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const geometry=await page.evaluate(()=>{const block=document.querySelector('#focusGmailBlock'),buttons=[...block.querySelectorAll('button,a')].filter(e=>!e.closest('[hidden]'));return{fit:buttons.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.height>=24;}),overflow:document.documentElement.scrollWidth<=innerWidth};});assert.deepEqual(geometry,{fit:true,overflow:true});
  const timerBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('today_focus_session')).paused);
  await page.focus('[data-concern="too_formal"]');await page.keyboard.press('Space');assert.equal((await read(page)).feedback.wording.concern,'too_formal');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('today_focus_session')).paused),timerBefore);
  await page.addScriptTag({path:join(ROOT,'scripts/node_modules/axe-core/axe.min.js')});const audit=await page.evaluate(async()=>axe.run(document.querySelector('#focusGmailBlock')));assert.deepEqual(audit.violations,[]);
  await page.screenshot({path:join(EVIDENCE,'gmail-feedback-320.png'),fullPage:true});
  await page.setViewport({...page.viewport(),width:1280,height:900});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const clip=await page.$eval('.task.focused',e=>{const r=e.getBoundingClientRect();return{x:r.x-12,y:r.y-12,width:r.width+24,height:440};});await page.screenshot({path:join(EVIDENCE,'gmail-feedback-desktop.png'),clip});assert.deepEqual(errors,[]);ok('real feedback controls wrap at320px, have24px targets, preserve keyboard/timer state and pass axe');await page.browserContext().close();
 }
 console.log('\nGmail feedback tests passed ('+count+' check groups).');
}catch(error){console.error(error.stack);throw error;}finally{await browser.close();server.close();}
