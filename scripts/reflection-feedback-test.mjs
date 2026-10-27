// Fictional browser stores only; no account, provider or real reflection access.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const server=createServer(async(req,res)=>{
  try {const path=decodeURIComponent(new URL(req.url,'http://test').pathname);
    const body=await readFile(join(root,path==='/'?'index.html':path));
    res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.html':'text/html','.woff2':'font/woff2'})[path==='/'?'.html':extname(path)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
console.log('Reflection feedback fixture: launching browser');
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',pipe:true,args:['--no-first-run','--disable-extensions']});
console.log('Reflection feedback fixture: browser ready');
const stamp=new Date(Date.now()-86400000).toISOString();
const errors=[];
let stage='setup';
const watchdog=setTimeout(()=>{console.error('Reflection feedback fixture timed out at '+stage);browser.process()?.kill('SIGKILL');server.close();process.exitCode=1;},60000);
async function page(){
  const context=await browser.createBrowserContext(), page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:320,height:900});
  await page.evaluateOnNewDocument(stamp=>{
    if(localStorage.getItem('fixture-ready'))return;
    localStorage.clear();localStorage.setItem('fixture-ready','1');
    localStorage.setItem('splash_shown_at',String(Date.now()));
    localStorage.setItem('today_manual',JSON.stringify([{id:'task_1',text:'Fictional task'}]));
    localStorage.setItem('today_reflection_policy',JSON.stringify({choice:'remember',updatedAt:stamp}));
    localStorage.setItem('today_ai_provider','claude');localStorage.setItem('today_ai_key_claude','fictional-test-key');
    const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const list=Array.from({length:8},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return{date:iso(d),feeling:i<4?'calm':['alive','present','tense','drained'][i-4],updatedAt:stamp};});
    localStorage.setItem('today_reflections',JSON.stringify(list));
    localStorage.setItem('fixture-outcomes',JSON.stringify(list.map((r,i)=>({id:'private-fixture-'+i,date:r.date,outcome:i<4?'revive':'done',obligation:null,focusSessions:0,backfilled:false}))));
  },stamp);
  stage='navigate';await page.goto(url,{waitUntil:'domcontentloaded'});
  stage='wait for components';
  await page.waitForFunction(()=>typeof Today?.use('reflections').reflectionReflect==='function');
  await page.evaluate(()=>{
    appMemory.taskOutcomes=JSON.parse(localStorage.getItem('fixture-outcomes'));
    window.dropboxAutoSave=()=>{};window.dropboxBackup=()=>{};
    window.__requests=[];window.__hold=false;window.__releases=[];
    const fetch=window.fetch;
    window.fetch=async(input,options)=>{
      if(!String(input).includes('/.netlify/functions/ai-assist'))return fetch(input,options);
      const body=JSON.parse(options.body), payload=JSON.parse(body.messages[0].content.startsWith('{')?body.messages[0].content:'{}');
      if(!payload.relationship)return{ok:true,json:async()=>({content:'none'})};
      window.__requests.push(body);
      if(window.__hold)await new Promise(resolve=>window.__releases.push(resolve));
      const r=payload.relationship;
      return{ok:true,json:async()=>({content:`In your evening reflections, you marked ${r.feeling} more often ${r.more_context} than ${r.less_context}.`})};
    };
  });
  stage='page ready';
  return page;
}
async function settleMemoryAnimations(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.allSettled(document.getElementById('memoryPanel').getAnimations({subtree:true})
      .filter(animation => Number.isFinite(animation.effect.getTiming().iterations))
      .map(animation => animation.finished));
  });
}
const waitReading=p=>p.waitForSelector('.reflection-reading',{visible:true});
async function open(p){await p.evaluate(()=>Today.use('memory').toggle());}
async function vote(p,choice){
  await p.focus('.reflection-reading');await p.keyboard.press('Enter');
  await p.waitForSelector(`#reflectionReaction [data-reaction="${choice}"]`,{visible:true});
  await p.click(`#reflectionReaction [data-reaction="${choice}"]`);
}
try{
  const a=await page();
  await a.evaluate(()=>checkDayNudge._setMemoryReady(false));
  stage='open first Memory';await open(a);
  assert.equal(await a.$('.reflection-reading'),null);
  assert.equal(await a.evaluate(()=>window.__requests.length),0,'Do not generate against a not-yet-merged consent/deletion state');
  await a.evaluate(()=>checkDayNudge._setMemoryReady(true));
  stage='wait first reading';await waitReading(a);
  stage='keyboard vote';
  assert.equal(await a.evaluate(()=>localStorage.getItem('today_reflection_feedback')),null,'Viewing alone must not enroll an existing user in feedback storage');
  await a.focus('.reflection-reading');await a.keyboard.press('Enter');
  assert.equal(await a.$eval('.reflection-reading',el=>el.getAttribute('aria-expanded')),'true');
  await a.keyboard.press('Tab');
  assert.equal(await a.evaluate(()=>document.activeElement.dataset.reaction),'landed');
  await a.keyboard.press('Enter');
  await a.waitForFunction(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')).records[0]?.reaction==='landed');
  assert.equal(await a.evaluate(()=>window.__requests.length),1,'A vote must not regenerate the accepted reading');
  assert.ok(await a.$('#reflectionReaction [aria-pressed="true"]'));
  await a.$eval('#reflectionFeedbackManage summary',el=>el.scrollIntoView({block:'center'}));
  await a.click('#reflectionFeedbackManage summary');
  await a.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  // Audit the settled panel, including finite color/fade transitions, without disabling motion or contrast checks.
  await settleMemoryAnimations(a);
  const accessibility=await a.evaluate(()=>axe.run({include:[['#reflectionMemoryBlock'],['#reflectionFeedbackManage']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  if(accessibility.violations.length)console.error(JSON.stringify(accessibility.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),null,2));
  assert.deepEqual(accessibility.violations.map(v=>v.id),[]);
  await a.click('#reflectionFeedbackManage summary');
  const privacy=await a.evaluate(()=>({general:JSON.stringify(appMemory),requests:window.__requests}));
  assert.ok(!privacy.general.includes('On evenings you reflected'));
  for(const req of privacy.requests){const text=JSON.stringify(req);assert.ok(!text.includes('private-fixture-'));assert.ok(!/\d{4}-\d\d-\d\d/.test(req.messages[0].content));}
  const writing=JSON.parse(privacy.requests[0].messages[0].content).relationship;
  assert.equal(writing.more_context,'on days you brought a task back from Past');
  assert.equal(writing.less_context,'on days you finished tasks without bringing one back');
  assert.ok(privacy.requests[0].systemPrompt.includes('reflected-days-v2'));
  assert.match(await a.$eval('.reflection-reading',el=>el.textContent),/^In your evening reflections,/);
  const claim=await a.evaluate(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')).records[0].claim);
  assert.ok(claim.includes('when you brought a task back from Past')&&!claim.includes('on days'),'Writing changes do not change claim identity');
  // Native disclosure and reaction rows wrap on a narrow viewport.
  await mkdir(join(root,'.context/feedback-loops'),{recursive:true});
  await a.screenshot({path:join(root,'.context/feedback-loops/feeling-320.png'),fullPage:true});
  await a.$eval('#reflectionMemoryBlock',el=>el.scrollIntoView({block:'center'}));
  await (await a.$('#reflectionMemoryBlock')).screenshot({path:join(root,'.context/feedback-loops/feeling-insight-320.png')});
  assert.ok(await a.evaluate(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')).records.every(r=>
    Object.values(r.support.versions).every(value=>/^[a-f0-9]{64}$/.test(value)))),'Stored support uses digests, not raw source values');
  assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await a.click('#reflectionReaction [data-reaction="missed"]');
  await a.waitForSelector('[data-today-click="reflections.feedback-undo"]',{visible:true});
  assert.equal(await a.evaluate(()=>document.activeElement.dataset.todayClick),'reflections.feedback-undo');
  await a.click('[data-today-click="reflections.feedback-undo"]');await waitReading(a);
  assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')).records[0].reaction),null);
  await a.click('#reflectionReaction [data-reaction="missed"]');
  await open(a);await open(a);
  assert.equal(await a.$('.reflection-reading'),null,'Unchanged missed claim stays withheld after reopen');
  assert.ok(await a.$('#reflectionFeedbackManage summary'),'Feedback remains reachable while the insight is absent');
  assert.equal(await a.evaluate(()=>window.__requests.length),1);
  assert.ok(await a.evaluate(()=>{
    const RealDate=Date, future=Date.now()+86400000;
    window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[future]));}static now(){return future;}};
    document.dispatchEvent(new Event('today:reflection-evidence-change'));
    const hidden=!document.querySelector('.reflection-reading');window.Date=RealDate;return hidden;
  }),'Rollover alone does not revive a missed claim');
  const backup=await a.evaluate(()=>Today.use('reflections')._reflectionBackupFields());
  const b=await page();
  await b.evaluate(data=>Today.use('reflections')._reflectionMergeRemote(data),backup);
  await b.waitForFunction(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')||'{}').records?.some(r=>r.reaction==='missed'));
  await open(b);assert.equal(await b.$('.reflection-reading'),null,'Missed claim converges on another device');
  await b.$eval('#reflectionFeedbackManage summary',el=>el.scrollIntoView({block:'center'}));
  await b.click('#reflectionFeedbackManage summary');
  assert.ok(await b.$eval('#reflectionFeedbackManage',el=>el.open));
  const clearSelector='[data-today-click="reflections.feedback-review"][data-reaction="clear"]';
  await b.$eval(clearSelector,el=>el.scrollIntoView({block:'center'}));
  assert.ok(await b.$eval(clearSelector,el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}),'Clear control must be reachable above the fixed input');
  await b.click(clearSelector);
  await waitReading(b);
  assert.equal(await b.evaluate(()=>window.__requests.length),0,'Clearing a vote reuses its still-valid accepted text');
  const cleared=await b.evaluate(()=>Today.use('reflections')._reflectionBackupFields());
  await a.evaluate(data=>Today.use('reflections')._reflectionMergeRemote(data),cleared);await waitReading(a);
  await a.evaluate(data=>Today.use('reflections')._reflectionMergeRemote(data),backup);
  assert.equal(await a.evaluate(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')).records[0].reaction),null,'An older voted backup must not undo a later clear');
  // Whole-history deletion fences a response already in flight.
  await a.evaluate(()=>{localStorage.removeItem('today_reflection_feedback');window.__hold=true;appMemory.taskOutcomes.push({...appMemory.taskOutcomes[0],id:'additional',outcome:'done'});Today.use('reflections')._reflectionMergeRemote({});});
  await a.waitForFunction(()=>window.__releases.length>0);
  await a.evaluate(()=>{Today.use('reflections')._reflectionClearFromAllMemory();window.__releases.splice(0).forEach(release=>release());});
  await a.waitForFunction(()=>!document.querySelector('.reflection-reading'));
  const deleted=await a.evaluate(()=>Today.use('reflections')._reflectionBackupFields());
  assert.equal(deleted.reflection_feedback.records.length,0);
  await a.evaluate(data=>Today.use('reflections')._reflectionMergeRemote(data),backup);
  assert.equal(await a.evaluate(()=>Today.use('reflections')._reflectionBackupFields().reflection_feedback.records.length),0);
  // BUG-123 regression: missed vote must survive source-readiness false on both storage and backup export paths
  stage='BUG-123 source-readiness guard';
  const c=await page();
  await c.evaluate(()=>checkDayNudge._setMemoryReady(true));
  await open(c);await waitReading(c);
  await vote(c,'missed');
  await c.waitForFunction(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')||'{}').records?.some(r=>r.reaction==='missed'));
  assert.equal(await c.evaluate(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')).records.filter(r=>r.reaction==='missed').length),1,'Precondition: one missed vote stored before readiness false');
  await c.evaluate(()=>{
    window.__savedOutcomes=appMemory.taskOutcomes.slice();
    appMemory.taskOutcomes=[];
    document.dispatchEvent(new CustomEvent('today:memory-ready',{detail:{ready:false}}));
    Today.use('reflections')._reflectionBackupFields();
  });
  assert.equal(await c.evaluate(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')||'{}').records?.filter(r=>r.reaction==='missed').length||0),1,'Missed vote must not be pruned from storage when source readiness is false');
  const notReadyBackup=await c.evaluate(()=>{
    const backup=Today.use('reflections')._reflectionBackupFields();
    appMemory.taskOutcomes=window.__savedOutcomes;
    document.dispatchEvent(new CustomEvent('today:memory-ready',{detail:{ready:true}}));
    return backup;
  });
  assert.ok(notReadyBackup.reflection_feedback.records.some(r=>r.reaction==='missed'),'Backup export must not prune voted records when source is not yet ready');
  await c.waitForFunction(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')||'{}').records?.some(r=>r.reaction==='missed'));
  assert.equal(await c.evaluate(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')).records.filter(r=>r.reaction==='missed').length),1,'Missed vote persists after source readiness is restored');
  stage='BUG-123 incoming merge before source readiness';
  const pendingVote = await c.evaluate(() => Today.use('reflections')._reflectionBackupFields());
  await c.evaluate(data=>{
    checkDayNudge._setMemoryReady(false); appMemory.taskOutcomes=[];
    Today.use('reflections')._reflectionMergeRemote(data);
  },pendingVote);
  assert.ok(await c.evaluate(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')).records.some(r=>r.reaction==='missed')),'Incoming merge must not prune a vote against incomplete outcomes');
  assert.equal(await c.$('.reflection-reading'),null,'Unready evidence cannot display a reading');
  await c.evaluate(()=>{
    appMemory.taskOutcomes=window.__savedOutcomes;
    checkDayNudge._setMemoryReady(true);
  });
  await open(c);await open(c);
  assert.equal(await c.$('.reflection-reading'),null,'Restored missed claim stays withheld after readiness');
  // Actual Dropbox merge and manual Restore both merge memory before source validation.
  const d=await page();
  await d.evaluate(data=>{
    checkDayNudge._setMemoryReady(false);appMemory.taskOutcomes=[];
    window.mergeRemoteData({...data,memory:{taskOutcomes:JSON.parse(localStorage.getItem('fixture-outcomes'))}});
    checkDayNudge._setMemoryReady(true);
  },pendingVote);
  await open(d);
  assert.equal(await d.$('.reflection-reading'),null,'Real sync imports the missed claim without generating');
  assert.ok(await d.evaluate(()=>Today.use('reflections')._reflectionBackupFields().reflection_feedback.records.some(r=>r.reaction==='missed')));
  await d.evaluate(async data=>{
    checkDayNudge._setMemoryReady(false); appMemory.taskOutcomes=[];
    const originalFetch=window.fetch;
    localStorage.setItem('dropbox_token','fictional-sync-token');
    window.fetch=async input=>String(input).includes('/2/files/download')
      ? {ok:true,status:200,headers:new Headers({'Dropbox-API-Result':'{"rev":"fixture"}'}),json:async()=>({...data,memory:{taskOutcomes:JSON.parse(localStorage.getItem('fixture-outcomes'))}})}
      : originalFetch(input);
    await dropboxRestore(false);
    window.fetch=originalFetch;localStorage.removeItem('dropbox_token');checkDayNudge._setMemoryReady(true);
  },pendingVote);
  assert.ok(await d.evaluate(()=>Today.use('reflections')._reflectionBackupFields().reflection_feedback.records.some(r=>r.reaction==='missed')),'Manual Restore retains a supported vote');
  await c.evaluate(()=>{
    checkDayNudge._setMemoryReady(false);
    const rows=JSON.parse(localStorage.getItem('today_reflections'));
    rows[0].feeling='sad';localStorage.setItem('today_reflections',JSON.stringify(rows));
    Today.use('reflections')._reflectionMergeRemote({});
    window.__partialVoteHeld=JSON.parse(localStorage.getItem('today_reflection_feedback')).records.length===1;
    checkDayNudge._setMemoryReady(true);
  });
  assert.ok(await c.evaluate(()=>window.__partialVoteHeld));
  assert.ok(await c.evaluate(id=>!JSON.parse(localStorage.getItem('today_reflection_feedback')).records.some(r=>r.id===id),pendingVote.reflection_feedback.records[0].id),'A genuine edit invalidates the old reading and vote once sources are ready');
  await d.evaluate(data=>{
    checkDayNudge._setMemoryReady(false);
    Today.use('reflections')._reflectionMergeRemote(data);
  },deleted);
  await d.evaluate(data=>Today.use('reflections')._reflectionMergeRemote(data),pendingVote);
  assert.equal(await d.evaluate(()=>Today.use('reflections')._reflectionBackupFields().reflection_feedback.records.length),0,'History deletion/consent withdrawal stays authoritative while sources are unready');
  stage='explicit wording feedback next-use loop';
  const e=await page();await open(e);await waitReading(e);
  await e.click('.reflection-reading');
  await e.waitForSelector('#reflectionReaction .reflection-wording');
  await e.focus('#reflectionReaction .reflection-wording summary');await e.keyboard.press('Enter');
  assert.match(await e.$eval('#reflectionReaction .reflection-wording',el=>el.textContent),/future AI feeling insights/,'First-use copy names the permitted AI input before saving');
  const wordingSelector=(value,scope='#reflectionReaction')=>`${scope} [data-wording="${value}"]`;
  await e.$eval(wordingSelector('formal'),el=>el.scrollIntoView({block:'center'}));
  await e.click(wordingSelector('formal'));
  const firstWording=await e.evaluate(()=>Today.use('reflections')._reflectionBackupFields());
  assert.equal(firstWording.reflection_feedback.records[0].wordingReaction,'formal');
  assert.equal(firstWording.reflection_feedback.records[0].reaction,null,'Wording concern is not a miss on the relationship');
  assert.equal(await e.evaluate(()=>window.__requests.length),1,'Wording feedback never rewrites the accepted insight');
  assert.equal(await e.evaluate(()=>document.activeElement.dataset.wording),'undo');
  await e.click(wordingSelector('undo'));
  assert.equal(await e.evaluate(()=>Today.use('reflections')._reflectionBackupFields().reflection_feedback.records[0].wordingReaction),null);
  await e.click(wordingSelector('formal'));
  // A new eligible evening creates a request; the prior sentence itself never enters it.
  const addEvening=async(p,age)=>p.evaluate(age=>{
    const day=new Date();day.setDate(day.getDate()-age);const date=_localISO(day);
    const rows=JSON.parse(localStorage.getItem('today_reflections'));rows.push({date,feeling:'present',updatedAt:new Date().toISOString()});
    localStorage.setItem('today_reflections',JSON.stringify(rows));
    appMemory.taskOutcomes.push({id:'WORDING_SOURCE_'+age,date,outcome:'done',focusSessions:0,backfilled:false});
    Today.use('reflections')._reflectionMergeRemote({});
  },age);
  await e.evaluate(()=>{window.__hold=true;});await addEvening(e,9);
  await e.waitForFunction(()=>window.__releases.length===1);
  const styleRequest=await e.evaluate(()=>window.__requests.at(-1));
  assert.match(styleRequest.systemPrompt,/explicitly found earlier feeling wording too formal/);
  assert.ok(!JSON.stringify(styleRequest).includes(firstWording.reflection_feedback.records[0].text),'No previous sentence is exported');
  assert.ok(!JSON.stringify(styleRequest).includes('WORDING_SOURCE_'));
  await e.$eval('#reflectionFeedbackManage summary',el=>el.scrollIntoView({block:'center'}));
  await e.click('#reflectionFeedbackManage summary');
  const management='#reflectionFeedbackManage';
  await e.$eval(wordingSelector('clear',management),el=>el.scrollIntoView({block:'center'}));
  await e.click(wordingSelector('clear',management));
  assert.equal(await e.evaluate(()=>document.activeElement.dataset.wording),'undo','Cleared wording-only history keeps Undo reachable and focused');
  await e.evaluate(()=>window.__releases.splice(0).forEach(release=>release()));
  await e.waitForFunction(()=>!document.querySelector('.memory-abstracting'));
  assert.equal(await e.$('.reflection-reading'),null,'Clearing guidance fences the already pending guided answer');
  assert.equal(await e.evaluate(()=>document.activeElement.dataset.wording),'undo','Late response cleanup retains wording Undo focus in the footer fallback');
  await e.evaluate(()=>{window.__hold=false;});await addEvening(e,10);await waitReading(e);
  assert.ok(!await e.evaluate(()=>window.__requests.at(-1).systemPrompt.includes('explicitly found earlier feeling wording')));
  const clearedWording=await e.evaluate(()=>({...Today.use('reflections')._reflectionBackupFields(),memory:{taskOutcomes:appMemory.taskOutcomes}}));
  const f=await page();
  await f.evaluate(data=>window.mergeRemoteData(data),clearedWording);
  await f.waitForFunction(()=>JSON.parse(localStorage.getItem('today_reflection_feedback')||'{}').records?.some(r=>r.wordingAt));
  await f.evaluate(data=>Today.use('reflections')._reflectionMergeRemote(data),firstWording);
  assert.equal(await f.evaluate(()=>Today.use('feedback-policy').wordingGuidance(Today.use('reflections')._reflectionBackupFields().reflection_feedback.records)), '','Older wording votes cannot undo a synced clear');
  if(await e.$eval('.reflection-reading',el=>el.getAttribute('aria-expanded'))==='false')await e.click('.reflection-reading');
  await e.click('#reflectionReaction .reflection-wording summary');
  await e.$eval(wordingSelector('unclear'),el=>el.scrollIntoView({block:'center'}));await e.click(wordingSelector('unclear'));
  await e.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  await settleMemoryAnimations(e);
  const wordingA11y=await e.evaluate(()=>axe.run({include:[['#reflectionMemoryBlock']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  assert.deepEqual(wordingA11y.violations.map(v=>v.id),[]);
  assert.ok(await e.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await e.$eval('#reflectionMemoryBlock',el=>el.scrollIntoView({block:'center'}));
  await mkdir(join(root,'.context/15b-writing-sync'),{recursive:true});
  await (await e.$('#reflectionMemoryBlock')).screenshot({path:join(root,'.context/15b-writing-sync/wording-320.png')});
  await addEvening(e,11);await waitReading(e);
  assert.match(await e.evaluate(()=>window.__requests.at(-1).systemPrompt),/explicitly found earlier feeling wording hard to follow/);
  assert.deepEqual(errors,[]);
  console.log('Reflection feedback: explicit first vote, keyboard/320px, no AI history leakage, no regeneration, Undo, hidden-claim management, two-device revision/clear, late deletion, and source-readiness vote-preservation passed.');
}catch(error){console.error('Reflection feedback failed at '+stage,error);throw error;}
finally{
  const cleanup=setTimeout(()=>browser.process()?.kill('SIGKILL'),3000);
  await browser.close().catch(()=>{});clearTimeout(cleanup);clearTimeout(watchdog);
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
