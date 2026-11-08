// Actual component and canonical Markdown/CAS boundaries; fictional accounts only.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {waitForFonts,installFixtureClock} from './browser-fixture.mjs';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
let core;vm.runInNewContext(await readFile(join(ROOT,'assets/exploration-core.js'),'utf8'),{Today:{define:(_name,api)=>core=api},TextEncoder});
const plain=value=>JSON.parse(JSON.stringify(value));
const stamp='2026-11-03T10:00:00Z';
let doc=core.create('What makes room for a fictional activity?','Original words\n> and delimiters <!-- today-exploration-entry {} -->','workspace-fiction',stamp);
doc.extra={retained:true};
const entry=(kind,id,text,extra={})=>({kind,id,text,at:stamp,...extra});
doc=core.append(doc,entry('observation','OBS-fiction','A first account\n<!-- /today-exploration-entry -->'));
assert.deepEqual(plain(core.parse(core.stringify(doc))),plain(doc));
assert.throws(()=>core.append(doc,entry('observation','OBS-fiction','collision')));
assert.throws(()=>core.append(doc,entry('reading','READ-bad','invented',{summary:'s',next_question:'q',evidence_ids:['missing']})));
doc=core.append(doc,entry('reading','READ-fiction','Tentative reading',{summary:'Still uncertain',next_question:'What happened?',evidence_ids:['OBS-fiction']}));
doc=core.append(doc,entry('source','EXCLUDE','',{target:'OBS-fiction',include:false}));
doc=core.append(doc,entry('source','INCLUDE','',{target:'OBS-fiction',include:true}));
assert.equal(core.current(doc),null,'Including source again cannot revive a prior reading');
assert.throws(()=>core.parse(core.stringify(doc).replace(/"schema_version":\d+/, '"schema_version":99')));
assert.ok(core.stringify(doc).includes('Original words'));assert.equal(core.parse(core.stringify({...doc,schema_version:1})).schema_version,1,'Original native exports remain readable');
let chain=core.create('Fictional lineage','','workspace-chain',stamp);
chain=core.append(chain,entry('observation','OBS-chain','Original context'));
chain=core.append(chain,entry('reading','READ-chain','A tentative reading',{summary:'s',next_question:'q',evidence_ids:[],source_ids:['OBS-chain']}));
chain=core.append(chain,entry('source','WITHDRAW-chain','',{target:'OBS-chain',include:false}));
assert.equal(core.current(chain),null,'All actual input dependencies retire a reading even if the model omits its evidence citation');


const stale=core.append(core.create('Linked source','','linked',stamp),entry('reading','READ-linked','A linked reading',{summary:'s',next_question:'q',evidence_ids:['task:one'],today_sources:[{id:'task:one',signature:'a'.repeat(64)}],today_epoch:'grant-one'}));
stale.today_context={enabled:true,epoch:'grant-one',excluded:[]};
assert.equal(core.current(stale),null);assert.equal(core.current(stale,[{id:'task:one',signature:'a'.repeat(64)}]).id,'READ-linked');
stale.today_context.epoch='grant-two';assert.equal(core.current(stale,[{id:'task:one',signature:'a'.repeat(64)}]),null);
let selector;vm.runInNewContext(await readFile(join(ROOT,'assets/exploration-context.js'),'utf8'),{Today:{define:(_name,api)=>selector=api},TextEncoder});
assert.equal(selector.select([{id:'no-match',text:'unrelated inventory',evidence_kind:'task record'}],'Sketching by a window').length,0);
const candidates=Array.from({length:20},(_,i)=>({id:'candidate-'+i,text:'sketching example '+i,evidence_kind:i<8?'AI interpretation':'task record'}));
const selection=selector.select(candidates,'sketching');assert.ok(selection.length<=8);assert.ok(selection.filter(row=>row.evidence_kind==='AI interpretation').length<=2);
// Existing dependencies are checked against their stores, independently of display/selection windows.
{
 const modules={},storage=new Map(),memory={returningTasks:{kept:{text:'Fictional sketching project',focusSessions:1,dayCount:1}}};
 const state={Today:{define:(name,api)=>modules[name]=api,use:name=>name==='memory'?{records:ids=>modules['memory-view'].records(ids)}:name==='nudge'?{memoryReady:()=>!state.unready}:modules[name]},TextEncoder,crypto:webcrypto,appMemory:memory,
  manualTasks:[{id:'kept',text:'Fictional sketching project'}],doneIds:new Set(),soonTasks:[],safeJSON:()=>[],
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},_localISO:date=>(date||new Date()).toISOString().slice(0,10)};
 const scope=vm.createContext(state);
 for(const file of ['memory-view','exploration-context'])vm.runInContext(await readFile(join(ROOT,'assets/'+file+'.js'),'utf8'),scope);
 modules['memory-view'].configure({outcomes:()=>[],inferences:()=>[],computed:()=>{},live:()=>true});
 const project=modules['exploration-context'];
 let live=await project.collect();const known=live.find(row=>row.id==='known:rt:kept'),task=live.find(row=>row.id==='task:kept');
 const linkedReading=source=>{const d=core.append(core.create('Sketching','','retained-fiction',stamp),entry('reading','retained-reading','A possibility',{summary:'Open',next_question:'What happened?',evidence_ids:[source.id],today_sources:[{id:source.id,signature:source.signature}],today_epoch:'permission'}));d.today_context={enabled:true,epoch:'permission',excluded:[]};return d;};
 const knownDoc=linkedReading(known),taskDoc=linkedReading(task);
 for(let i=0;i<5;i++)memory.returningTasks['new'+i]={text:'Unrelated task '+i,focusSessions:2,dayCount:2};
 state.manualTasks.unshift(...Array.from({length:100},(_,i)=>({id:'new'+i,text:'Unrelated task '+i})));
 live=await project.collect([...core.supportIds(knownDoc),...core.supportIds(taskDoc)]);
 assert.ok(core.current(knownDoc,live),'An unchanged record below five visible returns still supports its reading');
 assert.ok(core.current(taskDoc,live),'An unchanged task below 100 candidates still supports its reading');
 assert.equal(modules['memory-view'].records().filter(row=>row.id.startsWith('known:rt:')).length,5,'Memory keeps its existing display window');
 assert.equal(project.select(live,'sketching',[],[known.id,task.id]).length,0,'Support-only lookups do not enlarge writer selection, even when previously pinned');
 memory.returningTasks.kept.text='Edited fictional wording';
 assert.equal(core.readingStatus(knownDoc,core.latest(knownDoc),await project.collect(core.supportIds(knownDoc))).reason,'source-changed');
 memory.returningTasks.kept.text='Fictional sketching project';memory.revokedKnownItems={'rt:kept':stamp};
 assert.equal(core.current(knownDoc,await project.collect(core.supportIds(knownDoc))),null,'A revoked record is never restored by support lookup');
 delete memory.revokedKnownItems;memory.clearedAt=stamp;
 assert.equal(core.current(taskDoc,await project.collect(core.supportIds(taskDoc))),null,'Memory clear still invalidates support');
 delete memory.clearedAt;state.manualTasks=state.manualTasks.filter(row=>row.id!=='kept');
 assert.equal(core.readingStatus(taskDoc,core.latest(taskDoc),await project.collect(core.supportIds(taskDoc))).reason,'source-unavailable','Real deletion stays unavailable');
 storage.set('dropbox_token','fictional');state.unready=true;
 assert.equal((await project.collect(core.supportIds(knownDoc))).length,0,'Support lookup never bypasses initial source readiness');
 assert.equal(core.readingStatus(stale,core.latest(stale),[{id:'task:one',signature:'a'.repeat(64)}]).reason,'context-changed');
 console.log('  ✓ source windows retain unchanged dependencies without broadening selection or bypassing withdrawal, clear or readiness');
}
// One accepted record supplies reply and cumulative note; steps and corrections retain actual dependencies.
{
 let d=core.append(core.create('Fictional continuity','','continuity',stamp),entry('observation','own-1','A difficult start.'));
 const experiment={question:'Does the starting condition matter?',action:'Try one small shape',signal:'Whether starting feels different',effort:'Five minutes',review:'If returning',stop:'If unwelcome'};
 d=core.append(d,entry('reading','understanding-1','A conversation reply.',{synthesis_version:1,summary:'The first experience leaves time and expectations unresolved.',next_question:'What happened on another day?',evidence_ids:['own-1'],source_ids:['own-1'],experiment}));
 d=core.append(d,entry('step','keep-1','',{target:'understanding-1',decision:'kept'}));
 d=core.append(d,entry('amendment','edit-1','The expectation mattered, rather than company.',{target:'understanding-1'}));
 const projected=core.context(d);
 assert.equal(projected.prior_hypothesis.text,d.entries[1].summary);
 assert.equal(projected.prior_hypothesis.retained_step.status,'kept');
 assert.equal(projected.prior_hypothesis.corrections[0].id,'edit-1');
 assert.ok(!projected.records.some(row=>row.kind==='amendment'),'Corrections keep their separate bounded input role');
 d=core.append(d,entry('observation','own-2','A free afternoon was a counterexample.'));
 d=core.append(d,entry('reading','understanding-2','A later reply.',{synthesis_version:1,summary:'The counterexample makes time an incomplete explanation; expectations remain possible.',next_question:'',evidence_ids:['own-2'],source_ids:['own-1','own-2'],amendment_ids:['edit-1'],step_origin:'understanding-1',experiment:null}));
 assert.equal(core.activeStep(d).reading.id,'understanding-1','Ordinary replies do not displace an eligible kept step');
 assert.ok(core.context(d).prior_hypothesis.corrections.some(row=>row.id==='edit-1'),'Inherited corrections remain usable');
 assert.equal(core.parse(core.stringify(d)).entries.at(-1).summary,d.entries.at(-1).summary);
 const large=structuredClone(d);large.entries.at(-1).summary='x'.repeat(1200);large.entries[1].experiment=Object.fromEntries(Object.keys(experiment).map(key=>[key,'y'.repeat(500)]));
 const bounded=core.context(large).prior_hypothesis;
 assert.ok(bounded.text.length+JSON.stringify(bounded.retained_step).length<=2400,'Summary and retained-step input fit the former prior-reading allocation');
 d=core.append(d,entry('step','decline-1','',{target:'understanding-1',decision:'declined'}));
 assert.equal(core.activeStep(d),null);assert.deepEqual(plain(core.context(d).prior_hypothesis.retained_step),{status:'declined'});
 d=core.append(d,entry('source','leave-edit','',{target:'edit-1',include:false}));
 assert.equal(core.current(d),null,'Withdrawing a consumed correction hides the dependent summary and reply');
 d=core.append(d,entry('source','include-edit','',{target:'edit-1',include:true}));
 assert.equal(core.current(d),null,'Re-inclusion does not revive dependent understanding');
 assert.throws(()=>core.validate({...d,schema_version:2}),'Older schema cannot claim new step/source semantics');
 const legacy=core.create('Old document','','legacy',stamp);legacy.schema_version=2;
 assert.equal(core.parse(core.stringify(legacy)).schema_version,2);assert.equal(core.append(legacy,entry('observation','upgrade','Deliberate write')).schema_version,3);
 assert.throws(()=>core.response({reply:'Reply',summary:'',next_question:'',evidence_ids:[],experiment:null},[]));
 console.log('  ✓ single-result synthesis, inherited correction withdrawal, retained/declined steps, schema compatibility and bounded prior context');
}
// Meaning changes and eligibility are independent of freshness/display metadata.
{
 const modules={},storage=new Map(),inference={id:'stable',type:'semantic',text:'Fictional pottery needs room for an unfinished result',source:'ai_abstract',status:'confirmed',addedAt:'2026-10-01',lastSeen:'2026-11-05',seenWeeks:['2026-10-26','2026-11-02'],isNew:true};
 const m={memory:{semantic:[inference]},patterns:{taskLifespanSamples:[1,1,1,1,1]}};
 const env={Today:{define:(name,api)=>modules[name]=api,use:name=>name==='memory'?{records:ids=>modules['memory-view'].records(ids)}:name==='nudge'?{memoryReady:()=>true}:modules[name]},TextEncoder,crypto:webcrypto,appMemory:m,manualTasks:[],doneIds:new Set(),soonTasks:[],safeJSON:()=>[],localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},_localISO:date=>(date||new Date()).toISOString().slice(0,10)};
 const scope=vm.createContext(env);
 for(const file of ['memory-view','exploration-context'])vm.runInContext(await readFile(join(ROOT,'assets/'+file+'.js'),'utf8'),scope);
 const owner=await readFile(join(ROOT,'assets/memory-panel.js'),'utf8');
 vm.runInContext('const HYPO_FADE_DAYS=28,HYPO_EPISODIC_DAYS=7;function _daysSince(date){return (Date.parse("2026-11-06")-Date.parse(date))/86400000;}'+owner.slice(owner.indexOf('function _hypoLive('),owner.indexOf('function _hypoTombstone(')),scope);
 modules['memory-view'].configure({outcomes:()=>[],inferences:()=>m.memory.semantic.filter(item=>scope._hypoLive(item)),computed:()=>{},live:item=>scope._hypoLive(item)});
 const projection=modules['exploration-context'],initial=await projection.collect(),source=initial.find(row=>row.id==='memory:semantic:stable');
 const make=ref=>{const doc=core.append(core.create('Pottery','','freshness',stamp),entry('reading','freshness-reading','A reply',{summary:'A continuing note',next_question:'What differed?',evidence_ids:[ref.id],today_sources:[ref],today_epoch:'allowed'}));doc.today_context={enabled:true,epoch:'allowed',excluded:[]};return doc;};
 const semantic=make(projection.reference(source)),legacy=make({id:source.id,signature:source.signature});
 inference.lastSeen='2026-11-06';inference.isNew=false;inference.seenWeeks.reverse();
 let live=await projection.collect();assert.ok(core.current(semantic,live),'Freshness and display/order changes preserve new semantic references');assert.equal(core.current(legacy,live),null,'Legacy hashes are not silently reinterpreted');
 inference.seenWeeks.push('2026-11-09');assert.equal(core.current(semantic,await projection.collect()),null,'Changed actual supporting weeks still invalidate');inference.seenWeeks.pop();
 inference.evidence_ids=['different-evidence'];assert.equal(core.current(semantic,await projection.collect()),null,'Same wording with changed stored evidence invalidates');delete inference.evidence_ids;
 inference.lastSeen='2026-01-01';assert.equal(core.current(semantic,await projection.collect()),null,'Meaning identity cannot bypass real expiry');inference.lastSeen='2026-11-06';
 m.clearedAt=stamp;assert.equal(core.current(semantic,await projection.collect()),null,'Clear watermark remains meaningful');delete m.clearedAt;
 const fact=initial.find(row=>row.id==='fact:lifespan'),factDoc=make(projection.reference(fact));m.patterns.taskLifespanSamples=[1,1,1,1,1.1];
 assert.equal((await projection.collect()).find(row=>row.id===fact.id).text,fact.text);assert.equal(core.current(factDoc,await projection.collect()),null,'Rounded identical fact wording does not conceal changed numerical evidence');
 m.memory.semantic=[];assert.equal(core.current(semantic,await projection.collect()),null,'Removal/remote withdrawal stays unavailable');
 console.log('  ✓ semantic freshness/order controls, changed underlying evidence, legacy conservatism, expiry, deletion and clear');
}

// Exercise the real proxy's structured result without any provider/network access.
const structured={reply:'A tentative connection.',summary:'Still open.',next_question:'What changed?',evidence_ids:[],experiment:null};
const proxy={exports:{},process:{env:{}},fetch:async()=>({ok:true,text:async()=>JSON.stringify({content:[{type:'text',text:JSON.stringify(structured)}],stop_reason:'end_turn'})})};
vm.runInNewContext(await readFile(join(ROOT,'netlify/functions/ai-assist.js'),'utf8'),proxy);
const proxyResult=await proxy.exports.handler({httpMethod:'POST',body:JSON.stringify({provider:'claude',apiKey:'fictional-key',messages:[{role:'user',content:'Fictional request'}]})});
assert.equal(proxyResult.statusCode,200);
assert.deepEqual(plain(core.response(JSON.parse(proxyResult.body),[])),structured);
assert.deepEqual(plain(core.response(JSON.stringify(structured),[])),structured);
assert.throws(()=>core.response({...structured,evidence_ids:['invented']},[]));
console.log('  ✓ Markdown round trip, immutable IDs, references, version rejection, extensions and source withdrawal');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
let releaseEntry,releaseStyle,failStyle=true;const entryGate=new Promise(resolve=>{releaseEntry=resolve;}),styleGate=new Promise(resolve=>{releaseStyle=resolve;});
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://x').pathname);if(path==='/assets/exploration-entry.js')await entryGate;if(path==='/assets/exploration.css'){await styleGate;if(failStyle&&req.headers['sec-fetch-dest']==='style'){failStyle=false;res.writeHead(503);res.end();return;}}if(path==='/')path='/index.html';const body=await readFile(join(ROOT,path));res.writeHead(200,{'Content-Type':MIME[extname(path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const {default:puppeteer}=await import('puppeteer-core');
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,pipe:true,args:['--no-first-run','--disable-background-networking']});
const errors=[];let testPage;
try{
 const page=await browser.newPage();testPage=page;page.on('pageerror',error=>errors.push(error.message));await page.setBypassServiceWorker(true);await page.setViewport({width:1024,height:900});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.emulateTimezone('Europe/Amsterdam');await installFixtureClock(page,Date.parse('2026-11-06T08:00:00Z'));
 await page.evaluateOnNewDocument(()=>{
  // Focus is a desktop capability. Pin the fixture's hardware model instead of
  // inheriting macOS/Linux headless hover differences; width/motion remain native.
  const nativeMedia=window.matchMedia.bind(window);
  const hardware={'(hover: hover)':true,'(hover: none)':false,'(pointer: fine)':true,'(pointer: coarse)':false,'(pointer: none)':false};
  window.matchMedia=query=>Object.hasOwn(hardware,query)?{matches:hardware[query],media:query,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){},dispatchEvent(){return false;},onchange:null}:nativeMedia(query);
  localStorage.clear();localStorage.setItem('splash_shown_at',String(Date.now()));
  localStorage.setItem('dropbox_token','fictional-access');localStorage.setItem('dropbox_refresh_token','fictional-grant');localStorage.setItem('dropbox_token_expiry',String(Date.now()+3600000));
  localStorage.setItem('today_manual',JSON.stringify([{id:'manual_'+Date.now(),text:'Fictional project'}]));
  const s=window.__explorationTest={remote:null,rev:0,uploads:[],backup:[],ai:[],downloads:0,conflict:false,malformed:false,hold:false,lost:false};
  const original=window.fetch.bind(window);const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json',...headers}});
  window.fetch=async(url,opts={})=>{
   const target=String(url);let args={};try{args=JSON.parse(opts.headers?.['Dropbox-API-Arg']||opts.body||'{}');}catch{}
   if(target.includes('dropboxapi.com')){
    const path=args.path||'';const exploration=path.includes('/Life Exploration');
    if(target.includes('/files/download')&&exploration){s.downloads++;if(s.holdDownload)await new Promise(resolve=>{s.releaseDownload=resolve;});if(s.unavailable)return json({error:'temporarily unavailable'},503);}
    if(target.includes('/files/download'))return exploration&&s.remote!==null?new Response(s.remote,{status:200,headers:{'Dropbox-API-Result':JSON.stringify({rev:String(s.rev).padStart(9,'0')})}}):json({error_summary:'path/not_found/'},409);
    if(target.includes('/files/upload')){
     if(!exploration){s.backup.push(opts.body);return json({rev:'backup-rev'});}
     s.uploads.push({args,body:opts.body});if(s.holdWrite)await new Promise(resolve=>{s.releaseWrite=resolve;});if(s.rejectNextWrite){s.rejectNextWrite=false;return json({error:'Fictional write failure'},503);}
     if(s.conflict){s.conflict=false;s.rev++;return json({error_summary:'path/conflict/'},409);}
     if((args.mode==='add'&&s.remote!==null)||(args.mode?.['.tag']==='update'&&(s.remote===null||args.mode.update!==String(s.rev).padStart(9,'0'))))return json({error_summary:'path/conflict/'},409);
     s.remote=opts.body;s.rev++;if(s.lost){s.lost=false;throw new TypeError('simulated lost acknowledgement');}return json({rev:String(s.rev).padStart(9,'0')});
    }
    if(target.includes('/files/delete_v2')){if(args.parent_rev!==String(s.rev).padStart(9,'0'))return json({error_summary:'path/conflict/'},409);s.remote=null;return json({metadata:{rev:String(s.rev).padStart(9,'0')}});}
    return json({error_summary:'path/not_found/'},409);
   }
   if(target.includes('/.netlify/functions/ai-assist')){
    const body=JSON.parse(opts.body);if(!body.systemPrompt?.includes('life exploration'))return json({content:''});
    s.ai.push(body);if(s.hold)await new Promise(resolve=>{s.release=resolve;});
    if(s.malformed){s.malformed=false;return json({content:'malformed reply'});}
    if(s.replyFailure)return json(s.replyFailure.body,s.replyFailure.status);
    if(s.failReplyWrite){s.failReplyWrite=false;s.rejectNextWrite=true;}const context=JSON.parse(body.messages[0].content);const reply={reply:'One fictional account leaves several explanations open.',summary:'Materials and timing remain possibilities.',next_question:'What changed this time?',evidence_ids:context.context.records.map(row=>row.id),experiment:(context.request.startsWith('Suggest')||/something (?:small )?to try|change the step/i.test(context.context.records.filter(row=>row.kind==='observation').at(-1)?.text||''))?{question:'Does a smaller setup help?',action:'Try a fictional short session',signal:'Whether starting feels easier',effort:'One minute',review:'When returning',stop:'If it becomes burdensome'}:null};if(s.nextReply){Object.assign(reply,s.nextReply);s.nextReply=null;}if(s.emptySuggestion)reply.experiment=null;if(s.badEvidence)reply.evidence_ids=['invented'];if(s.failSuggestion)return json({error:'Fictional unavailable'},503);return s.wrapped?json({content:JSON.stringify(reply)}):json(reply);
   }
   if(target.includes('/.netlify/functions/'))return json({});
   if(/^https?:/.test(target)&&!target.startsWith(location.origin))throw new Error('Unexpected external request');
   return original(url,opts);
  };
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.Today&&document.body&&!document.body.hasAttribute('data-booting'),{timeout:20000});await waitForFonts(page);
 // Match the established focus-test JS/CSS input fixture. Only hardware
 // predicates change; selectors, declarations, viewport and motion stay native.
 const inputModel=await page.evaluate(()=>{
  const before=[],after=[];let mapped=0;
  const visit=rules=>{for(const rule of rules){
   if(rule.type===CSSRule.STYLE_RULE)before.push(rule.cssText);
   if(rule.type===CSSRule.MEDIA_RULE)rule.media.mediaText=rule.conditionText.replace(/\((hover|pointer):\s*(hover|none|fine|coarse)\)/g,(_all,kind,value)=>{mapped++;return (kind==='hover'?value==='hover':value==='fine')?'(min-width: 0px)':'(max-width: 0px)';});
   if(rule.cssRules)visit(rule.cssRules);
   if(rule.type===CSSRule.STYLE_RULE)after.push(rule.cssText);
  }};
  for(const sheet of document.styleSheets)visit(sheet.cssRules);
  return {mapped:mapped>0,intact:JSON.stringify(before)===JSON.stringify(after),focus:typeof window._focusOnCheck==='function'};
 });
 assert.deepEqual(inputModel,{mapped:true,intact:true,focus:true},'Desktop Focus and CSS use the same explicit input model');
 const toPanel=async()=>{const width=page.viewport().width;if(width<=600)return;await page.mouse.move(width-60,300);await page.waitForFunction(()=>!document.body.classList.contains('ex-task-active'),{timeout:10000});};
 const click=async selector=>{if(/data-ex-|^#ex/.test(selector))await toPanel();for(let attempt=0;;attempt++){try{await page.$eval(selector,node=>node.scrollIntoView({block:"center"}));await page.click(selector);return;}catch(error){if(attempt>=3||!/detached|not clickable/i.test(error.message))throw error;await new Promise(resolve=>setTimeout(resolve,50));}}},wait=fn=>page.waitForFunction(fn,{timeout:10000});
 // Wide screens give input to the side under the cursor, so reach into Explore the way a
 // person does before typing or clicking there.
 {const type=page.type.bind(page);page.type=async(selector,...rest)=>{if(/^#ex/.test(selector)){await toPanel();await page.waitForFunction(selector=>{const input=document.querySelector(selector);return input&&!input.closest('[inert]')&&!input.readOnly&&!input.disabled&&getComputedStyle(input).visibility==='visible';},{timeout:10000},selector);}return type(selector,...rest);};}
 const send=async()=>{await toPanel();await page.focus('#exThought');await page.keyboard.press('Enter');};
 const start=async()=>{await page.mouse.move(page.viewport().width-20,200);await wait(()=>document.activeElement?.id==='exQuestion'||document.getElementById('exQuestion'));await wait(()=>getComputedStyle(document.getElementById('exQuestion')).visibility==='visible');await click('#exQuestion');await page.keyboard.press('Enter');};
 // Sub-pages have their own back link; at the conversation the only way out is the hide control.
 const back=async()=>{const local='#sidebarRoot [data-ex-action="back"]',chat='.ex-nav [data-ex-action="conversation"]:not([aria-current])';await click(await page.$(local)?local:await page.$(chat)?chat:'#sidebarRoot [data-ex-action="hide"]');};
 await page.addScriptTag({content:await readFile(join(ROOT,'scripts/node_modules/axe-core/axe.min.js'),'utf8')});
 const checkLayout=async state=>{for(const width of [320,390,736,1024]){await page.setViewport({width,height:900});assert.equal(await page.$eval('#sidebarRoot',root=>[...root.querySelectorAll('*')].filter(node=>{const rect=node.getBoundingClientRect();return rect.width&&rect.right>innerWidth+1;}).length),0,`${state} at ${width}px`);const result=await page.evaluate(()=>axe.run(document.getElementById('sidebarRoot'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(result.violations.map(row=>row.id),[],`${state} axe at ${width}px`);if([390,1024].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(ROOT,`.context/memory-clarity/after-${state}-${width}.png`),fullPage:true});}}};
 await mkdir(join(ROOT,'.context/exploration-layout-restored'),{recursive:true});await mkdir(join(ROOT,'.context/memory-clarity'),{recursive:true});
 await wait(()=>document.querySelector('#memoryViewStyles')?.sheet);assert.equal(await page.evaluate(()=>Today.use('sidebar').isOpen('memory')),false,'Memory code and styles warm while the sheet is closed');
 assert.equal(await page.evaluate(()=>__explorationTest.downloads),0,'Warming Memory never reads the private Dropbox document');
 await page.evaluate(()=>{__explorationTest.unavailable=true;});await click('[data-ex-origin="list"]');
 assert.equal(await page.$eval('#sidebarRoot',node=>!node.hidden&&node.classList.contains('ex-sheet')),true,'Explore surface opens while entry import is held');
 assert.equal(await page.evaluate(()=>Today.use('sidebar').isOpen('memory')),false,'Opening Explore from the list leaves Memory closed');
 assert.equal(await page.evaluate(()=>__explorationTest.downloads),0,'No preview read before modules load');
 await click('[data-sidebar-close]');releaseEntry();
 await wait(()=>{try{return !!Today.use('exploration-entry');}catch{return false;}});
 assert.equal(await page.$eval('#sidebarRoot',node=>node.hidden),true,'Cancelling held import cannot reopen Explore');
 await click('[data-ex-origin="list"]');await wait(()=>document.getElementById('explorationStyles'));
 assert.equal(await page.$('#exQuestion'),null,'Setup content waits for its stylesheet');releaseStyle();
 await wait(()=>document.querySelector('#sidebarRoot [role=status]')?.textContent.includes('could not open'));
 assert.equal(await page.$eval('#sidebarRoot',node=>node.hasAttribute('aria-busy')),false,'A stylesheet failure ends loading and retains the hide control');
 await click('[data-sidebar-close]');await click('[data-ex-origin="list"]');
 await wait(()=>document.querySelector('.ex-status')?.textContent.includes('come back online'));
 assert.equal(await page.evaluate(()=>__explorationTest.downloads),1,'Explore performs one canonical read without Memory preview');
 assert.equal(await page.$('#exQuestion'),null,'An unreachable document offers recovery without pretending the file is missing');
 await page.evaluate(()=>{__explorationTest.unavailable=false;});await click('[data-ex-action="reload"]');await wait(()=>document.getElementById('exQuestion'));
 await page.screenshot({path:join(ROOT,'.context/exploration-layout-restored/test-fixture-start.png'),fullPage:true});
 assert.equal(await page.$('input[type=file],#exUseToday'),null,'Starting accepts an experience without file import or record assembly');await checkLayout('start');
 assert.equal(await page.$eval('#explorationEntry button',node=>node.textContent.trim()),'✦︎ Explore','Task-list entry has no arrow or tiny saved-question counter');
 assert.ok(await page.$eval('#addTaskBar',node=>node.inert),'Only the active pane offers its composer');
 // Docked width: the list itself stays usable while Explore is open.
 await page.setViewport({width:1440,height:900});await wait(()=>!document.getElementById('main-app').inert);
 await click('#dateTag');await wait(()=>!document.getElementById('addTaskBar').inert);await click('#newTask');await wait(()=>document.activeElement?.id==='newTask');await page.type('#newTask','CAPTURE_WITH_EXPLORE_FICTION');await page.keyboard.press('Enter');
 await wait(()=>manualTasks.some(task=>task.text==='CAPTURE_WITH_EXPLORE_FICTION'));
 assert.equal(await page.evaluate(()=>__explorationTest.remote),null,'Daily capture does not create an exploration or send a reply');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0);
 const captured=await page.evaluate(()=>manualTasks.find(task=>task.text==='CAPTURE_WITH_EXPLORE_FICTION').id);
 await click('.task-delete[data-taskid="'+captured+'"]');await wait(()=>!manualTasks.some(task=>task.text==='CAPTURE_WITH_EXPLORE_FICTION'));
 // Crossing the docking width re-renders the surface; let it settle before typing into it.
 await page.setViewport({width:1024,height:900});await wait(()=>!document.getElementById('main-app').inert);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));

 await start();await wait(()=>document.querySelector('.ex-status').textContent.includes('Bring an experience'));assert.equal(await page.$('[data-ex-action="reload"]'),null,'Empty first message keeps a useful prompt rather than a reload');
 await page.type('#exQuestion','A fictional exploration');
 // The reply row is built like the daily add bar: same type, size, padding and radius; elevated borders match the soft pane.
 await page.evaluate(()=>{document.getElementById('newTask').blur();document.getElementById('exQuestion').blur();});await page.mouse.move(0,0);await new Promise(resolve=>setTimeout(resolve,400));
 assert.deepEqual(await page.evaluate(()=>{const pick=node=>{const c=getComputedStyle(node);return [c.fontSize,c.fontFamily,c.height,c.paddingTop,c.paddingLeft,c.borderTopLeftRadius];};return JSON.stringify(pick(document.getElementById('exQuestion')))===JSON.stringify(pick(document.getElementById('newTask')));}),true,'Explore reply field matches the daily capture input');
 assert.deepEqual(await page.evaluate(()=>{
  const pane=document.getElementById('sidebarRoot'),foot=pane.querySelector('.ex-sheet-foot'),input=document.getElementById('exQuestion');
  const root=getComputedStyle(document.documentElement),sheet=getComputedStyle(pane),footer=getComputedStyle(foot),field=getComputedStyle(input);
  const rgb=value=>{const node=document.createElement('span');node.style.color=value;document.body.append(node);const colour=getComputedStyle(node).color;node.remove();return colour;};
  return [sheet.backgroundColor===footer.backgroundColor,footer.borderTopWidth==='0px',
   field.backgroundColor===rgb(root.getPropertyValue('--bg')),field.borderTopColor===rgb(root.getPropertyValue('--color-control-border-elevated'))];
 }),[true,true,true,true],'Continuous soft conversation/question/composer, darker input and elevated control contrast');
 assert.deepEqual(await page.$eval('#exTitle',node=>{const own=getComputedStyle(node),native=getComputedStyle(document.getElementById('connectionsTitle'));return [own.fontSize===native.fontSize,own.fontWeight===native.fontWeight,own.fontFamily===native.fontFamily];}),[true,true,true],'Explore uses the native sheet-title role exactly');
 assert.equal(await page.$eval('#exViewTitle',node=>getComputedStyle(node).fontSize),await page.$eval(':root',node=>getComputedStyle(node).getPropertyValue('--text-md').trim()));
 assert.ok(await page.$('#exSetupSources'),'Data scope stays visible as a compact disclosure');
 await page.evaluate(()=>{__explorationTest.rejectNextWrite=true;});await start();
 await wait(()=>document.querySelector('.ex-status')?.textContent.includes('not confirmed'));
 assert.equal(await page.$eval('#exQuestion',node=>node.value),'A fictional exploration','A failed first save keeps the complete first message');
 assert.ok(await page.$('[data-ex-action="draft-export"]'),'A failed first save offers export before leaving');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0,'A failed first save never requests AI');
 assert.equal(await page.evaluate(()=>__explorationTest.remote),null,'A rejected first write does not claim persistence');
 await wait(()=>getComputedStyle(document.getElementById('exQuestion')).visibility==='visible');await click('#exQuestion');await page.keyboard.press('Enter');await wait(()=>document.getElementById('exThought'));
 assert.ok(await page.evaluate(()=>__explorationTest.remote.includes('A fictional exploration')));
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().today_context.enabled),true,'New exploration uses explained TODAY context without a separate setup step');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0,'An unconfigured first Send keeps the observation without a model request');
 assert.equal(await page.$('.ex-resume'),null,'A new thread does not invent a resumption');
 assert.equal(await page.$('#exTodayContext,[data-ex-action="reload"],[data-ex-action="export"]'),null,'Conversation keeps administration in Notes');
 await click('[data-ex-action="sources"]');await click('#exTodayContext > summary');await click('[data-ex-action="today-toggle"]');await wait(()=>Today.use('exploration').document().today_context.enabled===false);await back();
 await page.evaluate(()=>{localStorage.setItem('today_ai_key_claude','fictional-key');localStorage.setItem('today_ai_provider','claude');});
 await page.evaluate(()=>{__explorationTest.hold=true;__explorationTest.release=null;});await page.type('#exThought','OBS_FICTION: an unplanned experience');
 await page.keyboard.down('Shift');await page.keyboard.press('Enter');await page.keyboard.up('Shift');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0,'Shift+Enter inserts a line without sending');
 await page.$eval('#exThought',node=>{for(const props of [{isComposing:true},{keyCode:229},{repeat:true}])node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,...props}));});
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0,'IME confirmation and repeated Enter do not submit');
 await page.evaluate(()=>{__explorationTest.holdWrite=true;__explorationTest.releaseWrite=null;});
 await page.keyboard.press('Enter');await wait(()=>typeof __explorationTest.releaseWrite==='function');
 assert.ok(await page.$$eval('.ex-you',nodes=>nodes.some(node=>node.textContent.includes('OBS_FICTION'))),'The sent message renders before Dropbox acknowledges it');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0,'AI waits for the durable observation');
 assert.equal(await page.$$eval('.ex-thinking-dots i',nodes=>nodes.length),3,'A compact thinking state appears inline immediately');
 assert.equal(await page.evaluate(()=>document.querySelector('.ex-thinking-dots i').getAnimations().length),0,'Reduced motion has no looping dots');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 await page.evaluate(()=>{__explorationTest.holdWrite=false;__explorationTest.releaseWrite();});await wait(()=>typeof __explorationTest.release==='function');
 assert.ok(await page.evaluate(()=>document.querySelector('.ex-thinking-dots i').getAnimations().some(a=>a.playState==='running')),'Thinking uses a WAAPI loop with motion enabled');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'exThought','Enter retains focus while the reply is pending');
 assert.equal(await page.$('[data-ex-action="retry-ai"]'),null,'Retry appears only after a real failure');
 await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await wait(()=>document.querySelector('[data-ex-reading]')&&!document.querySelector('#exThought').readOnly);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'exThought','Reply completion retains composer focus');

 // Earlier visits fold into Chat above the current one; there is no Earlier tab.
 const beforeEarlier=await page.evaluate(()=>({record:Today.use('exploration-core').stringify(Today.use('exploration').document()),calls:__explorationTest.ai.length,writes:__explorationTest.uploads.length}));
 await click('.ex-nav [data-ex-action="conversation"]');
 assert.equal(await page.$('.ex-nav [data-ex-action="history"]'),null,'The Earlier tab is gone');
 assert.equal(await page.$('.ex-body .ex-subnav'),null,'Top-level pages use header navigation, without a conversation CTA');
 await mkdir(join(ROOT,'.context/ci-test-results/explore-earlier'),{recursive:true});
 for(const width of [320,390,736,1024,1440]){
  await page.setViewport({width,height:900});
  const nav=await page.evaluate(()=>{
   const root=document.querySelector('.ex-nav'),buttons=[...root.querySelectorAll('button')],rect=root.getBoundingClientRect();
   const [chat,note,sources]=buttons.map(node=>node.getBoundingClientRect());
   return {order:buttons.map(node=>node.dataset.exAction),left:Math.abs(chat.left-rect.left)<1,right:Math.abs(sources.right-rect.right)<1,fit:root.scrollWidth<=root.clientWidth+1,separate:note.left>=chat.right};
  });
  assert.deepEqual(nav,{order:['conversation','notes','sources'],left:true,right:true,fit:true,separate:true},width+'px keeps Chat left and the text tabs right');
  const a11y=await page.evaluate(()=>axe.run(document.getElementById('sidebarRoot'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  assert.deepEqual(a11y.violations.map(row=>row.id),[],width+'px Chat with earlier visits accessibility');
  await page.screenshot({path:join(ROOT,`.context/ci-test-results/explore-earlier/chat-${width}.png`),fullPage:true});
 }
 await page.focus('.ex-nav [data-ex-action="conversation"]');
 for(const expected of ['notes','sources']){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.exAction),expected,'Tab order follows the visible navigation');}
 await click('.ex-nav [data-ex-action="conversation"]');
 assert.deepEqual(await page.evaluate(()=>({record:Today.use('exploration-core').stringify(Today.use('exploration').document()),calls:__explorationTest.ai.length,writes:__explorationTest.uploads.length})),beforeEarlier,'Showing earlier visits never writes or calls AI');
 for(const target of ['notes','sources']){await click('.ex-nav [data-ex-action="'+target+'"]');assert.equal(await page.$('.ex-body .ex-subnav'),null,'Header navigation makes the in-content conversation link redundant');}
 assert.deepEqual(await page.evaluate(()=>({record:Today.use('exploration-core').stringify(Today.use('exploration').document()),calls:__explorationTest.ai.length,writes:__explorationTest.uploads.length})),beforeEarlier,'Reading/navigation does not change the journal or request AI');
 await page.setViewport({width:1024,height:900});await click('.ex-nav [data-ex-action="conversation"]');

 // The phone keyboard must stay dismissed through pending and completed replies.
 await page.setViewport({width:390,height:900});
 await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 await page.evaluate(()=>{
  __explorationTest.hold=true;__explorationTest.release=null;__explorationTest.mobileFocus=[];
  __explorationTest.restoreFocus=HTMLElement.prototype.focus;
  HTMLElement.prototype.focus=function(...args){if(this.id==='exThought')__explorationTest.mobileFocus.push(this.readOnly);return __explorationTest.restoreFocus.apply(this,args);};
 });
 try {
  await page.type('#exThought','MOBILE_FOCUS_FICTION: a small observation.');await send();
  await wait(()=>typeof __explorationTest.release==='function');
  assert.equal(await page.evaluate(()=>document.activeElement.id==='exThought'),false,'Phone Send does not refocus its locked reply field');
  assert.equal(await page.evaluate(()=>__explorationTest.mobileFocus.some(readOnly=>readOnly)),false,'Phone pending renders never focus the readonly reply field');
  const focused=await page.evaluate(()=>__explorationTest.mobileFocus.length);
  await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});
  await wait(()=>!document.getElementById('exThought').readOnly);
  assert.equal(await page.evaluate(()=>__explorationTest.mobileFocus.length),focused,'Phone reply completion does not reopen the dismissed keyboard');
 } finally {await page.evaluate(()=>{HTMLElement.prototype.focus=__explorationTest.restoreFocus;delete __explorationTest.restoreFocus;});}
 await page.setViewport({width:1024,height:900});
 assert.deepEqual(await page.evaluate(()=>{
  const you=document.querySelector('.ex-you .ex-speaker-you'),today=document.querySelector('[data-ex-reading] .ex-speaker-logo'),prompt=document.querySelector('.ex-prompt.show');
  return [you?.textContent==='You',today?.textContent==='TODAY',getComputedStyle(today).fontFamily.includes('Syne'),getComputedStyle(prompt.querySelector('p')).borderLeftWidth==='2px',parseFloat(getComputedStyle(prompt).marginBottom)>0];
 }),[true,true,true,true,true],'Speaker names remain readable and the question has its own inset grouping');
 await checkLayout('speaker-and-question');
 assert.ok(await page.evaluate(()=>__explorationTest.remote.includes('OBS_FICTION')));assert.equal(await page.evaluate(()=>__explorationTest.uploads.filter(row=>row.args.mode==='add').length),2);
 await click('#exNotes');await checkLayout('note');assert.equal(await page.$('#exThought'),null,'The living note replaces the conversation');await click('[data-ex-action="correct"]');await checkLayout('correct');assert.equal(await page.$('#exNotesTitle,#exThought'),null,'Correction replaces its parent');await page.$eval('#exCorrection',input=>{input.value='CORRECTION_FICTION: timing may matter.';});await click('[data-ex-action="amend"]');await wait(()=>__explorationTest.remote.includes('CORRECTION_FICTION')&&!document.querySelector('#exCorrection')&&document.querySelector('[data-ex-action="step"]'));
 assert.equal(await page.$('#exTaskNote,#exDocumentTools,[data-ex-action="task-context"]'),null,'Notes removes duplicate task snapshots and generic tools');
 await click('[data-ex-action="step"]');await checkLayout('step-empty');
 const beforeSuggestion=await page.evaluate(()=>Today.use('exploration').document().entries.length);
 await page.evaluate(()=>{__explorationTest.emptySuggestion=true;});await click('[data-ex-action="experiment"]');await wait(()=>document.querySelector('#exSuggestionStatus')?.textContent.includes('No suggestion came back'));
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.length),beforeSuggestion,'Empty suggestion never commits a replacement reading');
 await page.evaluate(()=>{__explorationTest.emptySuggestion=false;__explorationTest.failSuggestion=true;});await click('[data-ex-action="experiment"]');await wait(()=>document.querySelector('#exSuggestionStatus')?.textContent.includes('could not answer'));
 await page.evaluate(()=>{__explorationTest.failSuggestion=false;});
 for(const failure of [
  {status:502,body:{error:'Exploration response incomplete',code:'exploration-incomplete'},notice:'cut short'},
  {status:401,body:{error:'Fictional credential problem'},notice:'Check your AI connection'},
  {status:429,body:{error:'Fictional request limit'},notice:'request limit'},
  {status:200,body:{content:'{"reply":"Fictional unfinished'},notice:'unreadable'},
  {status:200,body:{reply:'Fictional reply',summary:'Still open.',next_question:'',evidence_ids:[],experiment:{action:'Missing other bounds'}},notice:'missing details'},
  {status:200,body:{reply:'Fictional reply',summary:'Still open.',next_question:'',evidence_ids:['invented'],experiment:null},notice:'could not be checked'}
 ]){
  const beforeFailure=await page.evaluate(failure=>{__explorationTest.replyFailure=failure;return {calls:__explorationTest.ai.length,remote:__explorationTest.remote};},failure);
  await click('[data-ex-action="experiment"]');
  await page.waitForFunction(notice=>document.querySelector('#exSuggestionStatus')?.textContent.includes(notice)&&!document.querySelector('[data-ex-action="experiment"]').disabled,{},failure.notice);
  const afterFailure=await page.evaluate(()=>({calls:__explorationTest.ai.length,remote:__explorationTest.remote,surface:__explorationTest.ai.at(-1).surface}));
  assert.equal(afterFailure.calls,beforeFailure.calls+1,'Suggestion failures never trigger automatic retry');
  assert.equal(afterFailure.remote,beforeFailure.remote,'A failed suggestion never replaces the saved understanding or step');
  assert.equal(afterFailure.surface,'exploration','The completion fence is scoped to Explore');
 }
 const beforeReopen=await page.evaluate(()=>({calls:__explorationTest.ai.length,remote:__explorationTest.remote}));
 await back();await click('[data-ex-action="step"]');
 assert.equal(await page.$eval('#exSuggestionStatus',node=>node.textContent),'','Reopening Something to try must not present an earlier failed attempt as current');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),beforeReopen.calls,'Opening the step page never requests or retries a suggestion');
 assert.equal(await page.evaluate(()=>__explorationTest.remote),beforeReopen.remote,'Clearing a stale view status never writes the journal');
 await page.evaluate(()=>{__explorationTest.replyFailure=null;const native=setTimeout;__explorationTest.restoreTimeout=()=>{window.setTimeout=native;};window.setTimeout=(callback,delay,...args)=>{if(delay===25000)__explorationTest.expire=callback;return native(callback,delay,...args);};__explorationTest.hold=true;__explorationTest.release=null;});
 const beforeSuggestionDeadline=await page.evaluate(()=>({calls:__explorationTest.ai.length,remote:__explorationTest.remote}));
 await click('[data-ex-action="experiment"]');await wait(()=>typeof __explorationTest.release==='function');
 await page.evaluate(()=>{__explorationTest.expire();__explorationTest.hold=false;__explorationTest.release();__explorationTest.restoreTimeout();});
 await wait(()=>document.querySelector('#exSuggestionStatus')?.textContent.includes('took too long')&&!document.querySelector('[data-ex-action="experiment"]').disabled);
 assert.equal(await page.evaluate(()=>__explorationTest.remote),beforeSuggestionDeadline.remote,'A late suggestion cannot replace the saved note');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),beforeSuggestionDeadline.calls+1);
 await page.evaluate(()=>{__explorationTest.failSuggestion=false;__explorationTest.hold=true;__explorationTest.release=null;});await click('[data-ex-action="experiment"]');await wait(()=>typeof __explorationTest.release==='function');
 const whilePending=await page.evaluate(()=>__explorationTest.ai.length);
 await back();await click('[data-ex-action="step"]');
 assert.equal(await page.$eval('#exSuggestionStatus',node=>node.textContent),'Thinking…');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),whilePending,'Returning during an active request retains its status without another request');
 assert.equal(await page.$('[data-ex-action="retry-ai"]'),null,'No duplicate reply retry during a suggestion request');
 await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await wait(()=>document.querySelector('[data-ex-action="task"]'));

 await checkLayout('step');
 await page.evaluate(()=>{__explorationTest.wrapped=true;});await click('[data-ex-action="experiment"]');await wait(()=>!document.querySelector('[data-ex-action="experiment"]').disabled);await click('[data-ex-action="task"]');await wait(()=>document.querySelectorAll('#manualList .task').length===2);
 assert.ok(await page.evaluate(()=>!__explorationTest.remote.includes('"beneficial":true')));

 // The same accepted result updates conversation and cumulative note, without a second writer.
 const chat=async()=>{await click('.ex-nav [data-ex-action="conversation"]');await wait(()=>document.getElementById('exThought'));};
 const callsBeforeKeep=await page.evaluate(()=>__explorationTest.ai.length);
 await click('[data-ex-action="step-keep"]');await wait(()=>Today.use('exploration-core').activeStep(Today.use('exploration').document()).decision==='kept');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),callsBeforeKeep,'Keeping a step makes no model call');
 await chat();
 const paired=await page.evaluate(()=>({calls:__explorationTest.ai.length,summary:Today.use('exploration-core').latest(Today.use('exploration').document()).summary}));
 await page.evaluate(()=>{__explorationTest.nextReply={reply:'That counterexample leaves time as only part of the story.',summary:'You postponed making things on a free afternoon, but enjoyed it on a tired evening without an expected result. Expectations may matter; that remains uncertain.',next_question:'What happens when there is nothing to finish?',experiment:null};});
 await page.type('#exThought','I had a free afternoon and still did not start; a tired evening without an expected result felt different.');await send();await wait(()=>!document.getElementById('exThought').readOnly);
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),paired.calls+1,'One explicit turn makes exactly one model request');
 assert.equal(await page.evaluate(()=>JSON.parse(__explorationTest.ai.at(-1).messages[0].content).context.prior_hypothesis.text),paired.summary);
 assert.equal(await page.evaluate(()=>JSON.parse(__explorationTest.ai.at(-1).messages[0].content).context.prior_hypothesis.retained_step.status),'kept');
 const savedSummary=await page.evaluate(()=>Today.use('exploration-core').latest(Today.use('exploration').document()).summary);
 await click('#exNotes');assert.equal(await page.$eval('.ex-note-section p',node=>node.textContent),savedSummary,'Living note uses the same saved result’s summary, not its reply or last three observations');
 await mkdir(join(ROOT,'.context/ci-test-results/explore-continuity'),{recursive:true});
 for(const width of [390,1024]){await page.setViewport({width,height:900});await page.screenshot({path:join(ROOT,`.context/ci-test-results/explore-continuity/living-note-${width}.png`),fullPage:true});}
 const callsBeforeReturn=await page.evaluate(()=>__explorationTest.ai.length);
 await click('[data-ex-action="hide"]');await wait(()=>document.getElementById('sidebarRoot').hidden);await click('[data-ex-origin="list"]');await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 assert.equal(await page.$eval('.ex-resume p',node=>node.textContent),savedSummary,'A later visit resumes the saved understanding');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),callsBeforeReturn,'Returning makes no model request');
 // Reopened from the list, the cursor's side (the list) owns input; reach into the panel first.
 await page.mouse.move(page.viewport().width-60,300);await wait(()=>!document.body.classList.contains('ex-task-active'));
 await click('[data-ex-action="step"]');assert.ok(await page.$('[data-ex-action="step-decline"]'),'Chosen step survives ordinary reply and reopen');await checkLayout('retained-step');
 await click('[data-ex-action="step-decline"]');await wait(()=>document.querySelector('.ex-note-section')===null&&document.getElementById('exViewTitle')?.textContent==='Something to try');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),callsBeforeReturn,'Declining makes no model call');
 await chat();await page.type('#exThought','I want to leave the step behind for now.');await send();await wait(()=>!document.getElementById('exThought').readOnly);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(__explorationTest.ai.at(-1).messages[0].content).context.prior_hypothesis.retained_step),{status:'declined'});
 assert.equal(await page.$('[data-ex-action="step"]'),null,'A declined step does not remain in conversation guidance');
 await page.type('#exThought','Could you suggest something small to try?');await send();await wait(()=>!document.getElementById('exThought').readOnly);await click('[data-ex-action="step"]');
 assert.ok(await page.$('[data-ex-action="step-keep"]'),'An ordinary conversational request can produce the bounded optional step');
 const beforeRevise=await page.evaluate(()=>__explorationTest.ai.length);await click('[data-ex-action="step-revise"]');await wait(()=>document.getElementById('exThought'));
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),beforeRevise,'Change it prepares words without sending');
 assert.ok(await page.$eval('#exThought',node=>node.value.includes('change the step')));
 await page.type('#exThought','make it shorter.');await send();await wait(()=>!document.getElementById('exThought').readOnly);

 const beforeDeadline=await page.evaluate(()=>({id:Today.use('exploration-core').latest(Today.use('exploration').document()).id,readings:Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length}));
 await page.evaluate(()=>{const native=setTimeout;__explorationTest.restoreTimeout=()=>{window.setTimeout=native;};window.setTimeout=(callback,delay,...args)=>{if(delay===25000)__explorationTest.expire=callback;return native(callback,delay,...args);};__explorationTest.hold=true;__explorationTest.release=null;});
 await page.type('#exThought','A fictional observation before a delayed response.');await send();await wait(()=>typeof __explorationTest.release==='function'&&typeof __explorationTest.expire==='function');
 await page.evaluate(()=>{__explorationTest.expire();__explorationTest.hold=false;__explorationTest.release();__explorationTest.restoreTimeout();});await wait(()=>document.querySelector('[data-ex-action="retry-ai"]'));
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length),beforeDeadline.readings,'Late headers/body after the existing deadline cannot append a reply or summary even if transport ignores abort');
 assert.equal(await page.evaluate(()=>Today.use('exploration-core').latest(Today.use('exploration').document()).id),beforeDeadline.id,'The preceding saved understanding stays intact after timeout');
 await click('[data-ex-action="retry-ai"]');await wait(()=>!document.getElementById('exThought').readOnly);
 await click('#exNotes');await click('[data-ex-action="step"]');
 console.log('  ✓ Real app: one-call cumulative note, matching return without AI, kept/declined steps across turns, natural request and deliberate revision');
 console.log('  ✓ Real app: create, durable observation before AI, correction history, direct/wrapped proxy results, suggestion failure/empty/pending/success and optional action');
 await back();await back();await back();
 // A saved conversation and a linked experiment must not add controls to daily task rows.
 // Check the actual list after closing Explore, including its render/observer path.
 await mkdir(join(ROOT,'.context/ci-test-results/task-row-explore'),{recursive:true});
 for(const width of [390,320,1024]){
  await page.setViewport({width,height:900});
  await page.evaluate(()=>Today.use('connections').renderManual());
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const rows=await page.$$eval('#manualList .task',nodes=>nodes.map(row=>({
   extraActions:[...row.querySelectorAll('button')].filter(button=>!button.matches('.task-check,.task-copy,.task-delete')).map(button=>button.textContent.trim()),
   completion:!!row.querySelector('.task-check'),remove:!!row.querySelector('.task-delete'),
   fits:row.getBoundingClientRect().right<=innerWidth+1&&row.scrollWidth<=row.clientWidth+1
  })));
  await page.screenshot({path:join(ROOT,`.context/ci-test-results/task-row-explore/linked-tasks-${width}.png`),fullPage:true});
  assert.ok(rows.length>=2,'The saved conversation has its original task and linked experiment');
  assert.deepEqual(rows.flatMap(row=>row.extraActions),[],`Linked tasks keep native row controls at ${width}px`);
  assert.ok(rows.every(row=>row.completion&&row.remove&&row.fits),`Native task controls remain present without overflow at ${width}px`);
 }
 await page.setViewport({width:1024,height:900});
 await page.focus('#manualList .task:last-child');await page.keyboard.press('Enter');
 await wait(()=>document.querySelector('.task.focused'));
 const focusedRow=await page.$eval('.task.focused',row=>({
  extraActions:[...row.querySelectorAll(':scope > button')].filter(button=>!button.matches('.task-check,.task-copy,.task-delete')).map(button=>button.textContent.trim()),
  fits:row.getBoundingClientRect().right<=innerWidth+1&&row.querySelector('.task-text').getBoundingClientRect().right<=row.getBoundingClientRect().right+1
 }));
 await page.screenshot({path:join(ROOT,'.context/ci-test-results/task-row-explore/focused-task-1024.png'),fullPage:true});
 assert.deepEqual(focusedRow.extraActions,[],'A linked task keeps native focus-mode controls without Explore CTAs');
 assert.ok(focusedRow.fits,'The focused task text stays within its desktop row');
 await page.keyboard.press('Escape');await wait(()=>!document.querySelector('.focusing,.task.focused')&&!document.body.classList.contains('focus-locked')&&document.querySelector('.focus-timer')?.parentElement===document.body);
 const contextualState=await page.evaluate(()=>{
  const text='A fictional daily reading.';
  _memoryRecordSpokenLine('morning nudge',text,null);
  localStorage.setItem('day_nudge_ai_'+_localISO(),text);
  localStorage.removeItem('day_nudge_dismissed_'+_localISO());checkDayNudge._setMemoryReady();checkDayNudge();
  return {calls:__explorationTest.ai.length,entries:Today.use('exploration').document().entries.length,reaction:_memoryLineFor('morning nudge',_localISO()).reaction||null};
 });
 await wait(()=>document.getElementById('dayNudge').classList.contains('visible'));
 assert.equal(await page.$('#explorationNudge'),null,'There is no permanent Explore CTA below the daily nudge');
 assert.equal(await page.$('[data-ex-origin="task"]'),null,'Linked tasks have no inline Explore button');
 assert.equal(await page.$$eval('#explorationEntry [data-ex-origin="list"]',nodes=>nodes.length),1,'The task list has one deliberate Explore entry');
 assert.equal(await page.$eval('#dayNudgeReact',node=>node.classList.contains('open')),false,'Reading actions start collapsed');
 await click('#dayNudge');await wait(()=>document.getElementById('dayNudgeReact').classList.contains('open'));
 for(const width of [320,390,1024]){
  await page.setViewport({width,height:900});
  assert.ok(await page.$eval('#dayNudgeReact .nudge-react',group=>[...group.querySelectorAll('button')].every(button=>button.getBoundingClientRect().right<=group.getBoundingClientRect().right+1)),`Reading feedback and Explore fit at ${width}px`);
 }
 await page.screenshot({path:join(ROOT,'.context/ci-test-results/task-row-explore/nudge-actions-1024.png'),fullPage:true});
 await click('#dayNudgeReact [data-ex-origin="nudge"]');await wait(()=>document.querySelector('#sidebarRoot .ex-context')).catch(async error=>{console.error('Reading handoff state',await page.evaluate(()=>({rootHidden:document.getElementById('sidebarRoot').hidden,rootText:document.getElementById('sidebarRoot').textContent.slice(0,240),backgroundInert:document.getElementById('main-app').inert,focusLocked:document.body.classList.contains('focus-locked'),context:document.querySelector('#dayNudgeReact [data-ex-origin="nudge"]')?.dataset})));throw error;});
 const assertReadingEntry=async label=>{
  assert.ok(await page.$eval('#sidebarRoot .ex-context',node=>node.textContent.includes('A fictional daily reading.')&&node.textContent.includes('AI reading')),'The exact clicked reading opens as AI context');
  assert.equal(await page.$eval('[data-ex-action="include"]',node=>node.textContent),'include in reply','The reading starts unselected');
  assert.deepEqual(await page.evaluate(()=>({calls:__explorationTest.ai.length,entries:Today.use('exploration').document().entries.length,reaction:_memoryLineFor('morning nudge',_localISO()).reaction||null})),contextualState,label+' neither votes, requests AI nor changes the journal merely by opening');
  await click('[data-ex-action="hide"]');await wait(()=>document.getElementById('sidebarRoot').hidden);
 };
 await assertReadingEntry('Nudge Explore');
 await click('#infoBtn');await wait(()=>document.querySelector('#sidebarRoot #todayNudgeBlock [data-ex-origin="nudge"]'));
 await click('#todayNudgeBlock .week-summary');
 assert.ok(await page.$eval('#todayNudgeBlock .nudge-react',node=>node.classList.contains('open')),'About reveals Explore beside the feedback controls');
 await page.setViewport({width:390,height:900});
 assert.ok(await page.$eval('#todayNudgeBlock .nudge-react',group=>[...group.querySelectorAll('button')].every(button=>button.getBoundingClientRect().right<=group.getBoundingClientRect().right+1)),'About reading actions fit on a phone');
 await page.screenshot({path:join(ROOT,'.context/ci-test-results/task-row-explore/about-reading-actions-390.png'),fullPage:true});
 await click('#todayNudgeBlock [data-ex-origin="nudge"]');await wait(()=>document.querySelector('#sidebarRoot .ex-context'));
 await assertReadingEntry('About Explore');
 await page.evaluate(()=>Today.use('sidebar').open('about'));await wait(()=>document.getElementById('todayNudgeBlock'));
 await click('#todayNudgeBlock .week-summary');await wait(()=>document.querySelector('#todayNudgeBlock .nudge-react')?.classList.contains('open'));
 await page.evaluate(()=>localStorage.setItem('day_nudge_ai_'+_localISO(),'A replacement daily reading.'));
 await page.evaluate(()=>{window.__staleClicks=[];document.addEventListener('click',event=>{__staleClicks.push({action:event.target.closest('[data-today-click]')?.dataset.todayClick,origin:event.target.closest('[data-ex-origin]')?.dataset.exOrigin});},true);});
 await click('#todayNudgeBlock [data-ex-origin="nudge"]');await wait(()=>document.querySelector('#sidebarRoot #exThought')).catch(async error=>{console.error('Stale handoff',await page.evaluate(()=>({clicks:__staleClicks,explore:Today.use('exploration').isOpen(),about:Today.use('sidebar').isOpen('about'),busy:document.getElementById('sidebarRoot').getAttribute('aria-busy')})));throw error;});
 assert.equal(await page.$('#sidebarRoot .ex-context'),null,'A stale reading control cannot supply withdrawn text or silently substitute a new reading');
 await click('[data-ex-action="hide"]');await wait(()=>document.getElementById('sidebarRoot').hidden);
 await page.evaluate(()=>localStorage.setItem('day_nudge_ai_'+_localISO(),'A fictional daily reading.'));
 assert.equal(await page.evaluate(()=>Today.use('sidebar').isOpen('about')),false,'Closing Explore closes its shared panel');
 await page.setViewport({width:1024,height:900});
 assert.equal(await page.$('#memoryContent'),null,'Only the active panel is mounted');
 await click('#todayLogo');await wait(()=>Today.use('sidebar').isOpen('memory'));
 assert.ok(await page.$eval('#memoryContent',node=>node.getClientRects().length>0),'Memory is visible after returning');assert.ok(await page.$eval('#addTaskBar',node=>getComputedStyle(node).display!=='none'),'Memory follows the normal sheet capture-bar behavior');
 await wait(()=>document.getElementById('memoryContinue'));await click('#memoryContinue');await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().today_context.enabled),false,'Returning preserves saved opt-out rather than enabling context');
 assert.equal(await page.$('.ex-nav [data-ex-action="history"]'),null,'No Earlier tab');assert.ok(await page.$('.ex-body .ex-you'),'Your earlier words stay in Chat');assert.ok(await page.$('.ex-earlier .ex-day'),'Earlier visits sit above a date divider in Chat');
 await page.evaluate(()=>{__explorationTest.conflict=true;});await page.type('#exThought','UNSENT_CONFLICT');await send();await wait(()=>document.querySelector('.ex-status').textContent.includes('changed'));
 assert.equal(await page.$eval('#exThought',input=>input.value),'UNSENT_CONFLICT');assert.ok(!(await page.evaluate(()=>__explorationTest.remote)).includes('UNSENT_CONFLICT'));
 await click('[data-ex-action="reload"]');await wait(()=>document.querySelector('#exThought')&&!document.querySelector('#exThought').readOnly);await page.evaluate(()=>{__explorationTest.lost=true;__explorationTest.malformed=true;});await send();await wait(()=>document.querySelector('[data-ex-action="retry-ai"]'));
 assert.equal((await page.evaluate(()=>__explorationTest.remote)).split('UNSENT_CONFLICT').length-1,1);
 await click('[data-ex-action="retry-ai"]');await wait(()=>!document.querySelector('[data-ex-action="retry-ai"]')&&!document.querySelector('#exThought').readOnly);
 await page.type('#exThought','SECOND_TURN_FICTION');await send();await wait(()=>document.querySelectorAll('#sidebarRoot .ex-body > .ex-turn.ex-you').length===2&&document.querySelectorAll('#sidebarRoot .ex-body > [data-ex-reading]').length===2&&!document.getElementById('exThought').readOnly);
 assert.ok((await page.$eval('#sidebarRoot',root=>root.textContent)).includes('UNSENT_CONFLICT'),'The earlier exchange stays visible during this visit');
 assert.equal(await page.$('[data-ex-action="reload"],#exTodayContext'),null,'Healthy conversations do not regain administrative controls');
 await page.type('#exThought','UNSENT_TOOLS_FICTION');await click('#exNotes');await click('[data-ex-action="document"]');await checkLayout('document');await click('[data-ex-action="record"]');await checkLayout('markdown');assert.equal(await page.$('#exNotesTitle,#exThought,[data-ex-action="privacy"]'),null,'Raw document replaces the parent');await back();
 assert.ok(await page.waitForSelector('[data-ex-action="draft-export"]',{timeout:10000}).catch(()=>null),'Unsent text export remains available without Document tools');
 await click('[data-ex-action="draft-clear"]');await back();await back();
 assert.equal(await page.$eval('#exThought',node=>node.value),'');
 await page.evaluate(()=>{__explorationTest.failReplyWrite=true;});await page.type('#exThought','WRITE_RECOVERY_FICTION');await send();
 await wait(()=>document.querySelector('[data-ex-action="retry-ai"]')&&!document.querySelector('#exThought').readOnly);
 assert.equal((await page.evaluate(()=>__explorationTest.remote)).split('WRITE_RECOVERY_FICTION').length-1,1,'Failed reading persistence keeps one durable observation');
 await click('[data-ex-action="retry-ai"]');await wait(()=>!document.querySelector('[data-ex-action="retry-ai"]')&&!document.querySelector('#exThought').readOnly);
 assert.equal((await page.evaluate(()=>__explorationTest.remote)).split('WRITE_RECOVERY_FICTION').length-1,1,'Retry does not duplicate the observation');
 console.log('  ✓ CAS conflict retains unsent text, lost write acknowledgement reconciles, failed AI retries without duplicate observation');
 await page.evaluate(()=>{__explorationTest.hold=true;});await page.type('#exThought','PENDING_FICTION');await send();await wait(()=>typeof __explorationTest.release==='function');await click('[data-ex-action="sources"]');await click('[data-ex-action="source"]');await wait(()=>document.querySelector('.ex-status').textContent.includes('Source choice'));
 const readingsBefore=await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length);await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await new Promise(resolve=>setTimeout(resolve,100));assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length),readingsBefore);
 await click('[data-ex-action="source"]');assert.ok(await page.evaluate(()=>Today.use('exploration-core').current(Today.use('exploration').document())===null));
 for(const width of [320,390,736,1024]){await page.setViewport({width,height:900});const overflow=await page.$eval('#sidebarRoot',root=>[...root.querySelectorAll('*')].filter(node=>{const rect=node.getBoundingClientRect();return rect.width&&rect.right>innerWidth+1;}).length);assert.equal(overflow,0,width+'px notes overflow');}
 await back();await click('#exNotes');await click('[data-ex-action="document"]');await click('[data-ex-action="privacy"]');await checkLayout('privacy');assert.equal(await page.$('#exNotesTitle,#exThought'),null,'Privacy replaces the parent');await click('[data-ex-action="forget"]');await click('[data-ex-action="forget-confirm"]');await wait(()=>document.getElementById('exViewTitle').textContent==='Exploration forgotten');assert.equal(await page.evaluate(()=>__explorationTest.remote),null);assert.ok(!(await page.$eval('#sidebarRoot',root=>root.textContent)).includes('CORRECTION_FICTION'));
 await back();await click('[data-ex-origin="list"]');await wait(()=>document.getElementById('exQuestion')&&!document.getElementById('exQuestion').readOnly);assert.equal(await page.$eval('#exQuestion',input=>input.value),'','Forget clears the setup question as well as journal content');

 // Real-data connection uses live refs, keeps source stores separate, and fences withdrawal.
 await page.evaluate(()=>{
  const task=manualTasks[0];task.text='Fictional project RAW_TASK_FICTION';
  appMemory.dreams={index:[],dismissed:{}};appMemory.spokenLines=[{text:'PRIVATE_DREAM_FEELING_SENTINEL',date:new Date().toISOString()}];
  Today.use('connections').renderManual();_saveMemory();
 });
 const beforeFirstSend=await page.evaluate(()=>__explorationTest.ai.length);
 await page.type('#exQuestion','Fictional project');await start();await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 await wait(()=>Today.use('exploration').document().entries.some(row=>row.kind==='reading')&&!document.querySelector('#exThought').readOnly);
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),beforeFirstSend+1,'One explicit first Send makes exactly one AI request');
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='observation').length),1,'First message is kept as one durable observation');
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().schema_version),3);
 await page.type('#exThought','The fictional project started in a different setting.');await send();await wait(()=>document.querySelector('[data-ex-reading]')&&!document.querySelector('#exThought').readOnly);
 const linked=await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').at(-1));assert.ok(linked.today_sources.length>0&&linked.today_sources.length<=8);
 assert.ok(await page.evaluate(()=>JSON.stringify(__explorationTest.ai.at(-1)).includes('RAW_TASK_FICTION')));
 assert.ok(await page.evaluate(()=>!JSON.stringify(__explorationTest.ai.at(-1)).includes('PRIVATE_DREAM_FEELING_SENTINEL')));
 assert.ok(!(await page.evaluate(()=>__explorationTest.remote)).includes('RAW_TASK_FICTION'),'The journal stores live references, not duplicate raw source text');
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().source_md),'','A connected conversation works before any earlier notes are imported');
 await page.screenshot({path:join(ROOT,'.context/exploration-layout-restored/test-fixture-reply.png'),fullPage:true});await checkLayout('reply');
 // The actual component must retain a reading after unrelated tasks move its source beyond the selection window.
 const beforeWindowShift=await page.evaluate(()=>({calls:__explorationTest.ai.length,reading:Today.use('exploration-core').latest(Today.use('exploration').document()).id}));
 await page.evaluate(()=>{manualTasks.unshift(...Array.from({length:100},(_,i)=>({id:'window-fixture-'+i,text:'Unrelated inventory '+i})));_saveMemory();});
 await click('#exNotes');await wait(()=>document.querySelector('#exNotesTitle'));
 assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.ex-note-section h4')].some(node=>node.textContent==='So far')),'Living note shows its interpretation after an unrelated selection-window change');
 assert.equal(await page.$('#exReadingNotice'),null,'An unchanged retained source does not produce the unavailable notice');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),beforeWindowShift.calls,'Source verification and navigation make no new AI request');
 assert.equal(await page.evaluate(()=>Today.use('exploration-core').latest(Today.use('exploration').document()).id),beforeWindowShift.reading);
 await page.evaluate(()=>{manualTasks=manualTasks.filter(row=>!row.id.startsWith('window-fixture-'));_saveMemory();});await back();
 const openingPath=join(ROOT,'.context/exploration-integration/opening-fiction.md');await mkdir(dirname(openingPath),{recursive:true});await writeFile(openingPath,'Original fictional checkpoint retained.');
 await click('#exNotes');assert.ok(await page.$eval('#addTaskBar',node=>getComputedStyle(node).display!=='none'),'Daily capture stays visible in exploration Notes');assert.equal(await page.$('input[type=file]'),null,'File import is absent from the living note');await click('[data-ex-action="document"]');await click('[data-ex-action="import"]');assert.equal(await page.$('#exThought,#exNotesTitle'),null,'Import replaces its parent view');await checkLayout('import');
 await (await page.$('[data-today-change="exploration.checkpoint"]')).uploadFile(openingPath);await wait(()=>__explorationTest.remote.includes('Original fictional checkpoint retained.'));assert.equal(await page.evaluate(()=>Today.use('exploration').document().today_context.enabled),true,'Adding earlier notes preserves the TODAY connection');await back();await back();await back();

 await page.evaluate(()=>{const today=_localISO();appMemory.memory.semantic=[{id:'MEMORY_FICTION',type:'semantic',text:'NONCE_MEMORY_FICTION: evenings favour unhurried beginnings.',status:'confirmed',lastSeen:today,seenWeeks:['2026-10-12','2026-10-19','2026-10-26']}];_saveMemory();});
 await click('[data-ex-action="sources"]');await wait(()=>document.querySelector('[data-ex-action="today-pin"][data-today-source-id="memory:semantic:MEMORY_FICTION"]'));
 await page.$eval('#exTodayContext',node=>{node.open=true;node.querySelector('details').open=true;});await click('[data-ex-action="today-pin"][data-today-source-id="memory:semantic:MEMORY_FICTION"]');await wait(()=>Today.use('exploration').document().today_context.included?.includes('memory:semantic:MEMORY_FICTION'));
 assert.equal(await page.evaluate(()=>!document.querySelector('#exOtherRecords')||document.querySelector('#exOtherRecords').open),true,'Choosing a source preserves the open picker while other records remain');
 assert.ok(await page.evaluate(()=>document.activeElement.id==='exViewTitle'||document.activeElement.dataset.exAction==='today-pin'),'A source choice keeps meaningful focus');
 await back();await page.type('#exThought','The fictional project has a new possibility.');await send();await wait(()=>document.querySelector('[data-ex-reading]')&&!document.querySelector('#exThought').readOnly);
 assert.ok(await page.evaluate(()=>{const rows=JSON.parse(__explorationTest.ai.at(-1).messages[0].content).context.records;return rows.some(row=>row.id==='memory:semantic:MEMORY_FICTION'&&row.evidence_kind==='AI interpretation'&&row.source_type.includes('unconfirmed'));}),'Chosen Memory interpretations reach the writer with their unconfirmed provenance');

 const beforeFreshness=await page.evaluate(()=>({calls:__explorationTest.ai.length,id:Today.use('exploration-core').latest(Today.use('exploration').document()).id}));
 await page.evaluate(()=>{const item=appMemory.memory.semantic[0];const prior=new Date();prior.setDate(prior.getDate()-1);item.lastSeen=_localISO(prior);item.isNew=!item.isNew;item.seenWeeks.reverse();_saveMemory();});
 await click('#exNotes');await wait(()=>document.getElementById('exNotesTitle'));
 assert.equal(await page.$('#exReadingNotice'),null,'Same-meaning freshness/display/sync-order update keeps the actual living note');
 assert.equal(await page.evaluate(()=>Today.use('exploration-core').latest(Today.use('exploration').document()).id),beforeFreshness.id);
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),beforeFreshness.calls,'Freshness handling does not regenerate prose');
 await back();
 await click('[data-ex-action="sources"]');await checkLayout('sources');assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#sidebarRoot details')].find(node=>node.querySelector('summary')?.textContent.startsWith('TODAY records used')).textContent.includes('NONCE_MEMORY_FICTION')),'Notes exposes the actual live records used by this reading');await back();
 await page.evaluate(()=>{doneIds.add(manualTasks[0].id);Today.use('connections').renderManual();});
 assert.equal(await page.evaluate(async()=>!!Today.use('exploration-core').current(Today.use('exploration').document(),await Today.use('exploration-context').collect())),true,'Completion alone does not invalidate the same task wording');
 await page.evaluate(()=>{doneIds.delete(manualTasks[0].id);Today.use('connections').renderManual();__explorationTest.hold=true;__explorationTest.release=null;});
 await page.type('#exThought','Another fictional project observation.');await send();await wait(()=>typeof __explorationTest.release==='function');
 await click('[data-ex-action="sources"]');await click('#exTodayContext > summary');await click('[data-ex-action="today-source"]');await wait(()=>Today.use('exploration').document().today_context.excluded.length>0&&!document.querySelector('[data-ex-action="today-source"]').disabled);
 const beforeLate=await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length);
 await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await new Promise(resolve=>setTimeout(resolve,100));
 await page.waitForFunction(()=>!document.querySelector('[data-ex-reading]'));
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length),beforeLate);
 await page.$eval('#exTodayContext',node=>{node.open=true;});await page.evaluate(()=>[...document.querySelectorAll('[data-ex-action="today-source"]')].find(button=>button.textContent==='include').click());await wait(()=>Today.use('exploration').document().today_context.excluded.length===0);
 assert.equal(await page.evaluate(async()=>Today.use('exploration-core').current(Today.use('exploration').document(),await Today.use('exploration-context').collect())),null,'Re-inclusion cannot revive an earlier linked reading');
 await back();await click('[data-ex-action="retry-ai"]');await wait(()=>document.querySelector('[data-ex-reading]')&&!document.querySelector('#exThought').readOnly);
 await page.evaluate(()=>{__explorationTest.hold=true;__explorationTest.release=null;});await page.type('#exThought','A fictional project follow-up.');await send();await wait(()=>typeof __explorationTest.release==='function');
 await page.evaluate(()=>{manualTasks[0].text='Edited task after the request';Today.use('connections').renderManual();_saveMemory();});
 await wait(()=>document.querySelector('#exReadingNotice')?.textContent.includes('A task used in the earlier interpretation has changed')&&!document.querySelector('#exThought').readOnly);
 const beforeEdit=await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length);
 await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await new Promise(resolve=>setTimeout(resolve,100));
 await page.waitForFunction(()=>!document.querySelector('[data-ex-reading]'));
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length),beforeEdit);
 await click('#exNotes');
 assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.ex-note-section h4')].some(node=>node.textContent==='So far')),false,'Unavailable status never occupies an interpretation section');
 assert.ok(await page.$eval('#exReadingNotice',node=>node.textContent.includes('A task')&&node.textContent.includes('changed')));
 assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.ex-note-section p')].some(node=>node.textContent===Today.use('exploration').document().question)),'The open question stays meaningful when the interpretation is unavailable');
 await checkLayout('unavailable-note');
 // A missing live dependency must not be presented as a missing saved document.
 const savedReturn=await page.evaluate(()=>{
  const d=Today.use('exploration').document(),core=Today.use('exploration-core');
  const ref=core.latest(d).today_sources.find(row=>row.id.startsWith('task:')&&manualTasks.some(task=>'task:'+task.id===row.id));
  const index=manualTasks.findIndex(task=>'task:'+task.id===ref?.id);if(index<0)throw Error('Missing fictional task fixture');
  __explorationTest.returnTask={index,task:manualTasks.splice(index,1)[0]};Today.use('connections').renderManual();
  return {document:core.stringify(d),reply:core.latest(d).text,ai:__explorationTest.ai.length,writes:__explorationTest.uploads.length};
 });
 await wait(()=>document.querySelector('#exReadingNotice')?.textContent.includes('unavailable'));
 assert.equal(await page.$('[data-ex-action="original-history"]'),null,'No separate saved-conversation page; the withheld notice stands alone');
 assert.equal(await page.evaluate(()=>!!document.querySelector('[data-ex-reading="'+Today.use('exploration-core').latest(Today.use('exploration').document()).id+'"]')),false,'Chat withholds the unsupported reply');
 assert.deepEqual(await page.evaluate(()=>{
  const core=Today.use('exploration-core'),d=Today.use('exploration').document();
  return [core.stringify(d),__explorationTest.ai.length,__explorationTest.uploads.length,core.context(d,[]).prior_hypothesis];
 }),[savedReturn.document,savedReturn.ai,savedReturn.writes,null],'Withholding never writes, calls AI or restores unsupported understanding');
 await checkLayout('withheld-reply');
 await back();await click('#exNotes');
 await page.evaluate(()=>{const {index,task}=__explorationTest.returnTask;manualTasks.splice(index,0,task);Today.use('connections').renderManual();});
 await wait(()=>document.querySelector('#exReadingNotice')?.textContent.includes('changed'));
 await click('[data-ex-action="document"]');await click('[data-ex-action="import"]');
 const checkpointPath=join(ROOT,'.context/exploration-integration/checkpoint-fiction.md');await mkdir(dirname(checkpointPath),{recursive:true});await writeFile(checkpointPath,'Fictional checkpoint appended through the native import.');
 await page.evaluate(()=>{manualTasks[0].text+=' changed again';_saveMemory();});await wait(()=>document.querySelector('[data-today-change="exploration.checkpoint"]'));assert.equal(await page.$('#exThought,#exNotesTitle,#exTodayContext'),null,'Source refresh preserves the focused import view');const file=await page.$('[data-today-change="exploration.checkpoint"]');await file.uploadFile(checkpointPath);await wait(()=>__explorationTest.remote.includes('Fictional checkpoint appended'));
 assert.ok(await page.evaluate(()=>Today.use('exploration').document().source_revision));assert.ok(await page.evaluate(()=>Today.use('exploration').document().source_md.includes('Original fictional checkpoint retained.')));

 await mkdir(join(ROOT,'.context/memory-data'),{recursive:true});
 for(const width of [320,390,736,1024]){
  await page.setViewport({width,height:900});
  const accessibility=await page.evaluate(()=>axe.run(document.getElementById('sidebarRoot'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(accessibility.violations.map(row=>row.id),[],width+'px connected sources axe');
 }
 await back();await back();await click('[data-ex-action="sources"]');
 await page.screenshot({path:join(ROOT,'.context/exploration-layout-restored/test-fixture-connected-notes.png'),fullPage:true});
 await click('[data-ex-action="hide"]');await wait(()=>document.getElementById('sidebarRoot').hidden);
 const downloadsBefore=await page.evaluate(()=>__explorationTest.downloads);
 // Explore opened from Memory leaves Memory open behind it; start a fresh Memory visit.
 if(await page.evaluate(()=>Today.use('sidebar').isOpen('memory')))await click('#todayLogo');
 await click('#todayLogo');
 await page.evaluate(()=>{Today.use('memory').render();Today.use('memory').render();});await wait(()=>document.querySelector('#memoryThreadQuestion'));
 assert.equal((await page.evaluate(()=>__explorationTest.downloads))-downloadsBefore,1,'One canonical read per Memory visit, including concurrent redraws');
 assert.equal(await page.$eval('#memoryThreadQuestion',node=>node.textContent),'Fictional project');
 assert.equal(await page.$('#memoryContent .memory-type-desc'),null,'Memory removes repeated section subtitles');
 assert.ok(await page.$$eval('#memoryContent .memory-source',rows=>rows.every(node=>!node.textContent.includes('counted from')&&!node.textContent.includes('on record'))),'Routine rows omit repetitive provenance while AI labels stay');
 assert.deepEqual(await page.$$eval('#memoryContent > section > .memory-type-header > h3',rows=>rows.map(row=>row.textContent)),['STILL OPEN','WHAT HOLDS','KEPT APART']);
 await page.$eval('#memoryCoverage',node=>{node.open=true;});await page.evaluate(()=>Today.use('memory').render());assert.equal(await page.$eval('#memoryCoverage',node=>node.open),true,'Coverage stays open within a visit');
 await click('#todayLogo');await click('#todayLogo');await wait(()=>document.querySelector('#memoryThreadQuestion'));assert.equal(await page.$eval('#memoryCoverage',node=>node.open),false,'Coverage resets after leaving Memory');
 for(const width of [320,390,736,1024]){
  await page.setViewport({width,height:900});
  assert.equal(await page.$eval('#sidebarRoot',root=>[...root.querySelectorAll('*')].filter(node=>{const rect=node.getBoundingClientRect();return rect.width&&rect.right>innerWidth+1;}).length),0,width+'px real Memory containment');
  const accessibility=await page.evaluate(()=>axe.run(document.getElementById('sidebarRoot'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(accessibility.violations.map(row=>row.id),[],width+'px actual Memory axe');
  if([390,1024].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(ROOT,'.context/memory-clarity/after-memory-'+width+'.png'),fullPage:true});}
 }
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 await page.evaluate(()=>{__explorationTest.holdDownload=true;__explorationTest.releaseDownload=null;});
 await page.evaluate(()=>{window.__bodyFades=0;const animate=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.classList?.contains('ex-body'))window.__bodyFades++;return animate.apply(this,args);};});
 await click('#memoryContinue');await wait(()=>typeof __explorationTest.releaseDownload==='function');
 assert.equal(await page.evaluate(()=>Today.use('sidebar').isOpen('explore')),true);
 assert.ok(await page.$('[role="status"]'),'Remote content has an honest loading state');
 await page.evaluate(()=>{__explorationTest.holdDownload=false;__explorationTest.releaseDownload();});
 await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 assert.ok(await page.evaluate(()=>window.__bodyFades>0),'Loaded content fades in instead of jumping');
 assert.equal(await page.evaluate(()=>Today.use('sidebar').isOpen('memory')),false,'The shared sidebar switches from Memory to Explore');
 await page.screenshot({path:join(ROOT,'.context/memory-clarity/desktop-loaded.png'),fullPage:true});
 await back();await wait(()=>document.activeElement?.id==='todayLogo');
 await click('#todayLogo');await wait(()=>document.getElementById('memoryContinue'));
 await click('#memoryContinue');await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 const sheetAI=await page.evaluate(()=>__explorationTest.ai.length);
 await page.type('#exThought','UNSENT_SHEET_SWITCH_FICTION');
 assert.equal(await page.evaluate(()=>!document.getElementById('main-app').inert&&document.getElementById('addTaskBar').inert),true,'Desktop keeps tasks interactive while the chat composer is active');
 await page.setViewport({width:390,height:844});await wait(()=>document.getElementById('sidebarRoot').getAttribute('aria-modal')==='true');
 assert.equal(await page.evaluate(()=>document.getElementById('addTaskBar').inert&&getComputedStyle(document.getElementById('addTaskBar')).display==='none'),true,'On phones Explore is full screen and daily capture is hidden');
 await page.setViewport({width:1440,height:900});await wait(()=>!document.getElementById('main-app').inert);
 assert.equal(await page.$eval('#sidebarRoot',node=>node.getAttribute('role')),'complementary','Wide screens dock Explore beside the list');
 // Both desktop sizes push logo/navigation and rows, keep the panel persistent, and switch composers.
 await mkdir(join(ROOT,'.context/ci-test-results/explore-dock'),{recursive:true});
 for(const width of [601,736,1024,1440]){
  await page.setViewport({width,height:900});
  await page.mouse.move(width-20,200);
  await wait(()=>{const sheet=document.getElementById('sidebarRoot').getBoundingClientRect();return Math.abs(parseFloat(getComputedStyle(document.body).paddingRight)-sheet.width)<1&&['main-app','sticky-header','todayLogo','infoBtn','memoryPanel'].every(id=>document.getElementById(id).getBoundingClientRect().right<=sheet.left+1);});
  await page.focus('#exThought');await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#sidebarRoot',node=>node.hidden),false,'Escape cannot dismiss the sidebar');
  assert.equal(await page.$$eval('.ex-nav [data-ex-action="sources"]',nodes=>nodes.length),1,'Sources has one navigation entrance');
  assert.equal(await page.$('.ex-turn [data-ex-action="sources"],.ex-turn [data-ex-action="correct"]'),null,'Chat has no repeated source/correction toolbars');
  await page.mouse.move(80,300);
  assert.equal(await page.evaluate(()=>document.activeElement?.id==='exThought'&&!document.querySelector('.ex-sheet-foot').inert&&document.getElementById('addTaskBar').inert),true,'Pointer movement cannot steal the active chat caret or hide its composer');
  await page.click('#dateTag');await wait(()=>!document.getElementById('addTaskBar').inert&&getComputedStyle(document.getElementById('exScrim')).opacity==='0');
  assert.equal(await page.evaluate(()=>document.body.classList.contains('ex-task-active')&&getComputedStyle(document.getElementById('exScrim')).opacity==='0'&&document.querySelector('.ex-sheet-foot').inert),true,'An explicit Today click clears its dim and parks the chat composer');
  await page.click('#dateTag');
  assert.equal(await page.$eval('#sidebarRoot',node=>node.hidden),false,'Clicking Today cannot dismiss Explore');
  await page.evaluate(()=>{const hours=Date.prototype.getHours;Date.prototype.getHours=()=>21;try{Today.use('triage').checkTriageBar();}finally{Date.prototype.getHours=hours;}});
  await wait(()=>document.getElementById('triageBar').classList.contains('visible'));
  const triageLayout=await page.evaluate(()=>{const bar=document.getElementById('triageBar').getBoundingClientRect(),app=document.getElementById('main-app').getBoundingClientRect(),sheet=document.getElementById('sidebarRoot').getBoundingClientRect();return {centre:bar.x+bar.width/2,appCentre:app.x+app.width/2,left:bar.left,right:bar.right,sheetLeft:sheet.left};});
  assert.ok(Math.abs(triageLayout.centre-triageLayout.appCentre)<=1&&triageLayout.left>=0&&triageLayout.right<=triageLayout.sheetLeft,'Evening Review must share Today’s available column');
  await page.evaluate(()=>Today.use('triage').checkTriageBar());await wait(()=>document.getElementById('triageBar').classList.contains('hidden'));
  // Fixed task controls are outside .app: body padding alone cannot re-centre them.
  // Use the actual delete action, not a toast-only fixture or a static screenshot.
  const removedId=await page.evaluate(()=>{
   const id='manual_'+Date.now();manualTasks.push({id,text:'UnbrokenFictionalTaskNameXX for docked undo'});
   Today.use('connections').renderManual();return id;
  });
  await click(`.task[data-taskid="${removedId}"] .task-delete`);
  await wait(()=>document.querySelector('#undoToast.show:not([hidden])')&&document.querySelectorAll('#undoReasonRow button').length===4);
  const undoLayout=await page.evaluate(()=>{
   const toast=document.getElementById('undoToast').getBoundingClientRect(),app=document.getElementById('main-app').getBoundingClientRect(),sheet=document.getElementById('sidebarRoot').getBoundingClientRect();
   const controls=[...document.querySelectorAll('#undoToast button')].filter(node=>!node.hidden).map(node=>{const r=node.getBoundingClientRect();return {label:node.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,hit:node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
   return {toast:{left:toast.left,right:toast.right,top:toast.top,bottom:toast.bottom,centre:toast.x+toast.width/2},appCentre:app.x+app.width/2,sheetLeft:sheet.left,controls};
  });
  await page.screenshot({path:join(ROOT,`.context/ci-test-results/explore-dock/undo-${width}.png`),fullPage:false});
  assert.ok(Math.abs(undoLayout.toast.centre-undoLayout.appCentre)<=1,'Undo/reasons must centre on Today while Explore is docked: '+JSON.stringify({width,...undoLayout}));
  assert.ok(undoLayout.toast.left>=0&&undoLayout.toast.right<=undoLayout.sheetLeft,'Undo/reasons must fit beside the sidebar');
  assert.ok(undoLayout.controls.every(r=>r.left>=undoLayout.toast.left&&r.right<=undoLayout.toast.right+1&&r.top>=undoLayout.toast.top&&r.bottom<=undoLayout.toast.bottom&&r.hit),'Every undo/reason control must remain contained and pointer-accessible');
  await page.focus('#undoToast [data-today-click="tasks.undo"]');await page.keyboard.press('Enter');
  await page.waitForFunction(id=>!!document.querySelector(`.task[data-taskid="${id}"]`)&&document.getElementById('undoToast').hidden,{},removedId);
  assert.equal(await page.$eval('#sidebarRoot',node=>node.hidden),false,'Keyboard Undo must keep Explore open');
  await page.evaluate(id=>{manualTasks=manualTasks.filter(task=>task.id!==id);Today.use('connections').renderManual();},removedId);
  await page.screenshot({path:join(ROOT,`.context/ci-test-results/explore-dock/tasks-active-${width}.png`),fullPage:false});
  await page.focus('#newTask');await page.mouse.move(width-20,200);
  assert.equal(await page.evaluate(()=>document.activeElement?.id==='newTask'&&!document.getElementById('addTaskBar').inert),true,'Pointer movement cannot steal the active task caret');
  await page.click('#exTitle');await wait(()=>document.getElementById('addTaskBar').inert&&!document.querySelector('.ex-sheet-foot').inert&&getComputedStyle(document.getElementById('sidebarRoot'),'::after').opacity==='0');
  assert.equal(await page.$eval('#exThought',node=>node.value),'UNSENT_SHEET_SWITCH_FICTION','Pane switching preserves the unsent chat draft');
  assert.ok(await page.evaluate(()=>getComputedStyle(document.getElementById('sidebarRoot'),'::after').opacity==='0'),'Pointer on Explore clears its dim');
  await page.screenshot({path:join(ROOT,`.context/ci-test-results/explore-dock/chat-active-${width}.png`),fullPage:false});
 }
 await page.setViewport({width:1440,height:900});
 // The list column slides aside (--dur-slow); once settled it never sits under the panel.
 await wait(()=>{const app=document.querySelector('.app').getBoundingClientRect(),sheet=document.getElementById('sidebarRoot').getBoundingClientRect();return app.right<=sheet.left+1;});
 for(const [peer,id] of [['#infoBtn','about'],['#habitsBtn','habits'],['#todayLogo','memory']]){
  await click(peer);await page.waitForFunction(id=>Today.use('sidebar').isOpen(id),{},id);
  assert.equal(await page.$('#exThought'),null,'Changing panels unmounts the previous conversation');
  await click('#trelloBtn');await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
  assert.equal(await page.$eval('#exThought',node=>node.value),'UNSENT_SHEET_SWITCH_FICTION','Returning to Explore preserves its unsent draft');
 }
 await page.setViewport({width:1024,height:900});
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),sheetAI,'Sheet navigation makes no exploration request');
 await page.$eval('#exThought',node=>{node.value='';node.dispatchEvent(new Event('input',{bubbles:true}));});
 await back();await wait(()=>['todayLogo','trelloBtn'].includes(document.activeElement?.id)||document.activeElement?.matches('#explorationEntry button'));
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 console.log('  ✓ Native Memory uses actual records, one Dropbox read per visit, correct return focus, per-visit coverage and 320/390/736/1024px axe/containment');
 console.log('  ✓ Live TODAY records work without importing notes; explained creation and saved opt-out are respected; sensitive stores stay separate; fingerprints/epochs fence edits and exclusion; completion stays valid; checkpoint append preserves history');
 assert.ok(await page.evaluate(()=>Object.keys(localStorage).every(key=>!key.startsWith('today_exploration'))));assert.ok(await page.evaluate(()=>__explorationTest.backup.every(body=>!body.includes('OBS_FICTION')&&!body.includes('CORRECTION_FICTION'))));assert.deepEqual(errors,[]);
 await mkdir(join(ROOT,'.context/exploration-integration'),{recursive:true});await page.screenshot({path:join(ROOT,'.context/exploration-integration/forgotten.png'),fullPage:true});

 const futureBefore=await page.evaluate(()=>{__explorationTest.remote=__explorationTest.remote.replace(/"schema_version":3/, '"schema_version":99');return {remote:__explorationTest.remote,calls:__explorationTest.ai.length,uploads:__explorationTest.uploads.length};});
 await click('[data-ex-origin="list"]');await wait(()=>document.querySelector('.ex-status')?.textContent.includes('newer version'));
 assert.equal(await page.$('#exQuestion,input[type=file]'),null,'Unsupported native versions cannot be re-imported as a downgraded new thread');
 assert.equal(await page.evaluate(()=>__explorationTest.remote),futureBefore.remote);assert.equal(await page.evaluate(()=>__explorationTest.ai.length),futureBefore.calls);assert.equal(await page.evaluate(()=>__explorationTest.uploads.length),futureBefore.uploads);
 console.log('  ✓ Source withdrawal fences delayed AI, re-inclusion cannot revive, widths stay contained, conditional forget clears page and Dropbox; no journal in backup/storage');
}catch(error){console.error('Fixture state',await testPage.evaluate(()=>({focus:document.activeElement?.tagName+'#'+document.activeElement?.id,taskInput:document.getElementById('newTask')?.value,barStyle:getComputedStyle(document.getElementById('addTaskBar')).visibility,tasks:manualTasks.map(t=>t.text),root:document.getElementById('sidebarRoot')?.innerHTML.slice(0,800),announcement:document.querySelector('[role=status]')?.textContent,errors:window.__explorationTest?.uploads?.length,keys:Object.keys(localStorage)})));console.error('Page errors',errors);throw error;}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
console.log('✓ EXPLORATION TEST PASSED');
