// Actual component and canonical Markdown/CAS boundaries; fictional accounts only.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {waitForFonts} from './browser-fixture.mjs';
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
 await page.evaluateOnNewDocument(()=>{
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
     s.uploads.push({args,body:opts.body});if(s.rejectNextWrite){s.rejectNextWrite=false;return json({error:'Fictional write failure'},503);}
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
    if(s.failReplyWrite){s.failReplyWrite=false;s.rejectNextWrite=true;}const context=JSON.parse(body.messages[0].content);const reply={reply:'One fictional account leaves several explanations open.',summary:'Materials and timing remain possibilities.',next_question:'What changed this time?',evidence_ids:context.context.records.map(row=>row.id),experiment:context.request.startsWith('Suggest')?{question:'Does a smaller setup help?',action:'Try a fictional short session',signal:'Whether starting feels easier',effort:'One minute',review:'When returning',stop:'If it becomes burdensome'}:null};if(s.emptySuggestion)reply.experiment=null;if(s.badEvidence)reply.evidence_ids=['invented'];if(s.failSuggestion)return json({error:'Fictional unavailable'},503);return s.wrapped?json({content:JSON.stringify(reply)}):json(reply);
   }
   if(target.includes('/.netlify/functions/'))return json({});
   if(/^https?:/.test(target)&&!target.startsWith(location.origin))throw new Error('Unexpected external request');
   return original(url,opts);
  };
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.Today&&document.body&&!document.body.hasAttribute('data-booting'),{timeout:20000});await waitForFonts(page);
 const click=async selector=>{await page.$eval(selector,node=>node.scrollIntoView({block:"center"}));await page.click(selector);},wait=fn=>page.waitForFunction(fn,{timeout:10000});
 await page.addScriptTag({content:await readFile(join(ROOT,'scripts/node_modules/axe-core/axe.min.js'),'utf8')});
 const checkLayout=async state=>{for(const width of [320,390,736,1024]){await page.setViewport({width,height:900});assert.equal(await page.$eval('#explorationRoot',root=>[...root.querySelectorAll('*')].filter(node=>{const rect=node.getBoundingClientRect();return rect.width&&rect.right>innerWidth+1;}).length),0,`${state} at ${width}px`);const result=await page.evaluate(()=>axe.run(document.getElementById('explorationRoot'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(result.violations.map(row=>row.id),[],`${state} axe at ${width}px`);if([390,1024].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(ROOT,`.context/memory-clarity/after-${state}-${width}.png`),fullPage:true});}}};
 await mkdir(join(ROOT,'.context/exploration-layout-restored'),{recursive:true});await mkdir(join(ROOT,'.context/memory-clarity'),{recursive:true});
 await wait(()=>document.querySelector('#memoryViewStyles')?.sheet);assert.equal(await page.$eval('#memoryPanel',node=>node.classList.contains('open')),false,'Memory code and styles warm while the sheet is closed');
 assert.equal(await page.evaluate(()=>__explorationTest.downloads),0,'Warming Memory never reads the private Dropbox document');
 await page.evaluate(()=>{__explorationTest.unavailable=true;});await click('[data-ex-origin="list"]');
 assert.equal(await page.$eval('#memoryPanel',node=>node.classList.contains('open')),true,'Shell opens while entry import is held');
 assert.equal(await page.$eval('#memoryContent',node=>node.hidden),true,'Unrelated Memory view stays hidden');
 assert.equal(await page.evaluate(()=>__explorationTest.downloads),0,'No preview read before modules load');
 await click('[data-today-click="memory.exploration-cancel"]');releaseEntry();
 await wait(()=>{try{return !!Today.use('exploration-entry');}catch{return false;}});
 assert.equal(await page.$eval('#memoryPanel',node=>node.classList.contains('open')),false,'Cancelling held import cannot reopen the drawer');
 await click('[data-ex-origin="list"]');await wait(()=>document.getElementById('explorationStyles'));
 assert.equal(await page.$('#exQuestion'),null,'Setup content waits for its stylesheet');releaseStyle();
 await wait(()=>document.querySelector('#explorationRoot [role=status]')?.textContent.includes('could not open'));
 assert.equal(await page.$eval('#memoryPanel',node=>node.hasAttribute('aria-busy')),false,'A stylesheet failure ends loading and retains the back action');
 await click('[data-today-click="memory.exploration-cancel"]');await click('[data-ex-origin="list"]');
 await wait(()=>document.querySelector('.ex-status')?.textContent.includes('come back online'));
 assert.equal(await page.evaluate(()=>__explorationTest.downloads),1,'Explore performs one canonical read without Memory preview');
 assert.equal(await page.$('#exQuestion,[data-ex-action="create"]'),null,'An unreachable document offers recovery without pretending the file is missing');
 await page.evaluate(()=>{__explorationTest.unavailable=false;});await click('[data-ex-action="reload"]');await wait(()=>document.getElementById('exQuestion'));
 await page.screenshot({path:join(ROOT,'.context/exploration-layout-restored/test-fixture-start.png'),fullPage:true});
 assert.equal(await page.$('input[type=file],#exUseToday'),null,'Starting accepts an experience without file import or record assembly');await checkLayout('start');
 assert.equal(await page.$eval('#explorationEntry button',node=>node.textContent.trim()),'✦︎ Explore','Task-list entry has no arrow or tiny saved-question counter');
 assert.ok(await page.$eval('#addTaskBar',node=>getComputedStyle(node).display!=='none'),'Daily capture stays visible during Explore setup');
 await page.type('#newTask','CAPTURE_WITH_EXPLORE_FICTION');await page.keyboard.press('Enter');
 await wait(()=>manualTasks.some(task=>task.text==='CAPTURE_WITH_EXPLORE_FICTION'));
 assert.equal(await page.evaluate(()=>__explorationTest.remote),null,'Daily capture does not create an exploration or send a reply');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0);
 const captured=await page.evaluate(()=>manualTasks.find(task=>task.text==='CAPTURE_WITH_EXPLORE_FICTION').id);
 await click('.task-delete[data-taskid="'+captured+'"]');await wait(()=>!manualTasks.some(task=>task.text==='CAPTURE_WITH_EXPLORE_FICTION'));

 await click('[data-ex-action="create"]');await wait(()=>document.querySelector('.ex-status').textContent.includes('Bring an experience'));assert.equal(await page.$('[data-ex-action="reload"]'),null,'Empty first message keeps a useful prompt rather than a reload');
 await page.type('#exQuestion','A fictional exploration');
 const border=await page.$eval('[data-ex-action="create"]',node=>getComputedStyle(node).borderColor);await page.hover('[data-ex-action="create"]');
 await page.waitForFunction(before=>getComputedStyle(document.querySelector('[data-ex-action="create"]')).borderColor!==before,{},border);
 assert.deepEqual(await page.$eval('#exTitle',node=>{const own=getComputedStyle(node),native=getComputedStyle(document.getElementById('memoryTitle'));return [own.fontSize===native.fontSize,own.fontWeight===native.fontWeight,own.fontFamily===native.fontFamily];}),[true,true,true],'Explore uses the native sheet-title role exactly');
 assert.equal(await page.$eval('#exViewTitle',node=>getComputedStyle(node).fontSize),await page.$eval(':root',node=>getComputedStyle(node).getPropertyValue('--text-md').trim()));
 assert.ok(await page.$('#exSetupSources'),'Data scope stays visible as a compact disclosure');
 await page.evaluate(()=>{__explorationTest.rejectNextWrite=true;});await click('[data-ex-action="create"]');
 await wait(()=>document.querySelector('.ex-status')?.textContent.includes('not confirmed'));
 assert.equal(await page.$eval('#exQuestion',node=>node.value),'A fictional exploration','A failed first save keeps the complete first message');
 assert.ok(await page.$('[data-ex-action="draft-export"]'),'A failed first save offers export before leaving');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0,'A failed first save never requests AI');
 assert.equal(await page.evaluate(()=>__explorationTest.remote),null,'A rejected first write does not claim persistence');
 await page.focus('#exQuestion');await page.keyboard.press('Enter');await wait(()=>document.getElementById('exThought'));
 assert.ok(await page.evaluate(()=>__explorationTest.remote.includes('A fictional exploration')));
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().today_context.enabled),true,'New exploration uses explained TODAY context without a separate setup step');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0,'An unconfigured first Send keeps the observation without a model request');
 assert.equal(await page.$('.ex-resume'),null,'A new thread does not invent a resumption');
 assert.equal(await page.$('#exTodayContext,[data-ex-action="reload"],[data-ex-action="export"]'),null,'Conversation keeps administration in Notes');
 await click('[data-ex-action="sources"]');await click('#exTodayContext > summary');await click('[data-ex-action="today-toggle"]');await wait(()=>Today.use('exploration').document().today_context.enabled===false);await click('[data-ex-action="back"]');
 await page.evaluate(()=>{localStorage.setItem('today_ai_key_claude','fictional-key');localStorage.setItem('today_ai_provider','claude');});
 await page.evaluate(()=>{__explorationTest.hold=true;__explorationTest.release=null;});await page.type('#exThought','OBS_FICTION: an unplanned experience');
 await page.keyboard.down('Shift');await page.keyboard.press('Enter');await page.keyboard.up('Shift');
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0,'Shift+Enter inserts a line without sending');
 await page.$eval('#exThought',node=>{for(const props of [{isComposing:true},{keyCode:229},{repeat:true}])node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,...props}));});
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),0,'IME confirmation and repeated Enter do not submit');
 await page.keyboard.press('Enter');await wait(()=>typeof __explorationTest.release==='function');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'exThought','Enter retains focus while the reply is pending');
 assert.equal(await page.$('[data-ex-action="retry-ai"]'),null,'Retry appears only after a real failure');
 await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await wait(()=>document.querySelector('[data-ex-reading]')&&!document.querySelector('#exThought').readOnly);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'exThought','Reply completion retains composer focus');
 assert.ok(await page.evaluate(()=>__explorationTest.remote.includes('OBS_FICTION')));assert.equal(await page.evaluate(()=>__explorationTest.uploads.filter(row=>row.args.mode==='add').length),2);
 await click('#exNotes');await checkLayout('note');assert.equal(await page.$('#exThought'),null,'The living note replaces the conversation');await click('[data-ex-action="correct"]');await checkLayout('correct');assert.equal(await page.$('#exNotesTitle,#exThought'),null,'Correction replaces its parent');await page.$eval('#exCorrection',input=>{input.value='CORRECTION_FICTION: timing may matter.';});await click('[data-ex-action="amend"]');await wait(()=>__explorationTest.remote.includes('CORRECTION_FICTION')&&!document.querySelector('#exCorrection')&&document.querySelector('[data-ex-action="step"]'));
 assert.equal(await page.$('#exTaskNote,#exDocumentTools,[data-ex-action="task-context"]'),null,'Notes removes duplicate task snapshots and generic tools');
 await click('[data-ex-action="step"]');await checkLayout('step-empty');
 const beforeSuggestion=await page.evaluate(()=>Today.use('exploration').document().entries.length);
 await page.evaluate(()=>{__explorationTest.emptySuggestion=true;});await click('[data-ex-action="experiment"]');await wait(()=>document.querySelector('#exSuggestionStatus')?.textContent.includes('No suggestion came back'));
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.length),beforeSuggestion,'Empty suggestion never commits a replacement reading');
 await page.evaluate(()=>{__explorationTest.emptySuggestion=false;__explorationTest.failSuggestion=true;});await click('[data-ex-action="experiment"]');await wait(()=>document.querySelector('#exSuggestionStatus')?.textContent.includes('could not be completed'));
 await page.evaluate(()=>{__explorationTest.failSuggestion=false;__explorationTest.hold=true;__explorationTest.release=null;});await click('[data-ex-action="experiment"]');await wait(()=>typeof __explorationTest.release==='function');
 assert.equal(await page.$eval('#exSuggestionStatus',node=>node.textContent),'Thinking…');
 assert.equal(await page.$('[data-ex-action="retry-ai"]'),null,'No duplicate reply retry during a suggestion request');
 await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await wait(()=>document.querySelector('[data-ex-action="task"]'));

 await checkLayout('step');
 await page.evaluate(()=>{__explorationTest.wrapped=true;});await click('[data-ex-action="experiment"]');await wait(()=>!document.querySelector('[data-ex-action="experiment"]').disabled);await click('[data-ex-action="task"]');await wait(()=>document.querySelectorAll('#manualList .task').length===2);
 assert.ok(await page.evaluate(()=>!__explorationTest.remote.includes('"beneficial":true')));
 console.log('  ✓ Real app: create, durable observation before AI, correction history, direct/wrapped proxy results, suggestion failure/empty/pending/success and optional action');
 await click('[data-ex-action="back"]');await click('[data-ex-action="back"]');await click('[data-ex-action="back"]');
 assert.equal(await page.evaluate(()=>['memoryTitleRow','memoryContent','memoryFooter'].every(id=>!document.getElementById(id).hidden)),true,'Leaving restores the native Memory sections');
 await click('#todayLogo');await wait(()=>document.getElementById('memoryPanel').classList.contains('open'));
 assert.ok(await page.$eval('#memoryContent',node=>node.getClientRects().length>0),'Memory is visible after returning');assert.ok(await page.$eval('#addTaskBar',node=>getComputedStyle(node).display!=='none'),'Memory follows the normal sheet capture-bar behavior');
 await wait(()=>document.getElementById('memoryContinue'));await click('#memoryContinue');await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().today_context.enabled),false,'Returning preserves saved opt-out rather than enabling context');
 await click('[data-ex-action="history"]');await checkLayout('history');assert.equal(await page.$('#exThought'),null,'History replaces the conversation');assert.ok(await page.$$eval('[data-ex-reading]',nodes=>nodes.length>0),'Returning keeps both sides of earlier exchanges inspectable');await click('[data-ex-action="back"]');
 await page.evaluate(()=>{__explorationTest.conflict=true;});await page.type('#exThought','UNSENT_CONFLICT');await click('#exSend');await wait(()=>document.querySelector('.ex-status').textContent.includes('changed'));
 assert.equal(await page.$eval('#exThought',input=>input.value),'UNSENT_CONFLICT');assert.ok(!(await page.evaluate(()=>__explorationTest.remote)).includes('UNSENT_CONFLICT'));
 await click('[data-ex-action="reload"]');await wait(()=>document.querySelector('#exSend')&&!document.querySelector('#exThought').readOnly);await page.evaluate(()=>{__explorationTest.lost=true;__explorationTest.malformed=true;});await click('#exSend');await wait(()=>document.querySelector('[data-ex-action="retry-ai"]'));
 assert.equal((await page.evaluate(()=>__explorationTest.remote)).split('UNSENT_CONFLICT').length-1,1);
 await click('[data-ex-action="retry-ai"]');await wait(()=>!document.querySelector('[data-ex-action="retry-ai"]')&&!document.querySelector('#exThought').readOnly);
 await page.type('#exThought','SECOND_TURN_FICTION');await click('#exSend');await wait(()=>document.querySelectorAll('#explorationRoot .ex-body > .ex-turn.ex-you').length===2&&document.querySelectorAll('#explorationRoot .ex-body > .ex-turn:not(.ex-you)').length===2);
 assert.ok((await page.$eval('#explorationRoot',root=>root.textContent)).includes('UNSENT_CONFLICT'),'The earlier exchange stays visible during this visit');
 assert.equal(await page.$('[data-ex-action="reload"],#exTodayContext'),null,'Healthy conversations do not regain administrative controls');
 await page.type('#exThought','UNSENT_TOOLS_FICTION');await click('#exNotes');await click('[data-ex-action="document"]');await checkLayout('document');await click('[data-ex-action="record"]');await checkLayout('markdown');assert.equal(await page.$('#exNotesTitle,#exThought,[data-ex-action="privacy"]'),null,'Raw document replaces the parent');await click('[data-ex-action="back"]');
 assert.ok(await page.$('[data-ex-action="draft-export"]'),'Unsent text export remains available without Document tools');
 await click('[data-ex-action="draft-clear"]');await click('[data-ex-action="back"]');await click('[data-ex-action="back"]');
 assert.equal(await page.$eval('#exThought',node=>node.value),'');
 await page.evaluate(()=>{__explorationTest.failReplyWrite=true;});await page.type('#exThought','WRITE_RECOVERY_FICTION');await click('#exSend');
 await wait(()=>document.querySelector('[data-ex-action="retry-ai"]')&&!document.querySelector('#exThought').readOnly);
 assert.equal((await page.evaluate(()=>__explorationTest.remote)).split('WRITE_RECOVERY_FICTION').length-1,1,'Failed reading persistence keeps one durable observation');
 await click('[data-ex-action="retry-ai"]');await wait(()=>!document.querySelector('[data-ex-action="retry-ai"]')&&!document.querySelector('#exThought').readOnly);
 assert.equal((await page.evaluate(()=>__explorationTest.remote)).split('WRITE_RECOVERY_FICTION').length-1,1,'Retry does not duplicate the observation');
 console.log('  ✓ CAS conflict retains unsent text, lost write acknowledgement reconciles, failed AI retries without duplicate observation');
 await page.evaluate(()=>{__explorationTest.hold=true;});await page.type('#exThought','PENDING_FICTION');await click('#exSend');await wait(()=>typeof __explorationTest.release==='function');await click('[data-ex-action="sources"]');await click('[data-ex-action="source"]');await wait(()=>document.querySelector('.ex-status').textContent.includes('Source choice'));
 const readingsBefore=await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length);await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await new Promise(resolve=>setTimeout(resolve,100));assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length),readingsBefore);
 await click('[data-ex-action="source"]');assert.ok(await page.evaluate(()=>Today.use('exploration-core').current(Today.use('exploration').document())===null));
 for(const width of [320,390,736,1024]){await page.setViewport({width,height:900});const overflow=await page.$eval('#explorationRoot',root=>[...root.querySelectorAll('*')].filter(node=>{const rect=node.getBoundingClientRect();return rect.width&&rect.right>innerWidth+1;}).length);assert.equal(overflow,0,width+'px notes overflow');}
 await click('[data-ex-action="back"]');await click('#exNotes');await click('[data-ex-action="document"]');await click('[data-ex-action="privacy"]');await checkLayout('privacy');assert.equal(await page.$('#exNotesTitle,#exThought'),null,'Privacy replaces the parent');await click('[data-ex-action="forget"]');await click('[data-ex-action="forget-confirm"]');await wait(()=>document.getElementById('exViewTitle').textContent==='Exploration forgotten');assert.equal(await page.evaluate(()=>__explorationTest.remote),null);assert.ok(!(await page.$eval('#explorationRoot',root=>root.textContent)).includes('CORRECTION_FICTION'));
 await click('[data-ex-action="back"]');await click('[data-ex-origin="list"]');await wait(()=>document.getElementById('exQuestion'));assert.equal(await page.$eval('#exQuestion',input=>input.value),'','Forget clears the setup question as well as journal content');

 // Real-data connection uses live refs, keeps source stores separate, and fences withdrawal.
 await page.evaluate(()=>{
  const task=manualTasks[0];task.text='Fictional project RAW_TASK_FICTION';
  appMemory.dreams={index:[],dismissed:{}};appMemory.spokenLines=[{text:'PRIVATE_DREAM_FEELING_SENTINEL',date:new Date().toISOString()}];
  Today.use('connections').renderManual();_saveMemory();
 });
 const beforeFirstSend=await page.evaluate(()=>__explorationTest.ai.length);
 await page.type('#exQuestion','Fictional project');await click('[data-ex-action="create"]');await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 await wait(()=>Today.use('exploration').document().entries.some(row=>row.kind==='reading')&&!document.querySelector('#exThought').readOnly);
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),beforeFirstSend+1,'One explicit first Send makes exactly one AI request');
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='observation').length),1,'First message is kept as one durable observation');
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().schema_version),2);
 await page.type('#exThought','The fictional project started in a different setting.');await click('#exSend');await wait(()=>document.querySelector('[data-ex-reading]')&&!document.querySelector('#exThought').readOnly);
 const linked=await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').at(-1));assert.ok(linked.today_sources.length>0&&linked.today_sources.length<=8);
 assert.ok(await page.evaluate(()=>JSON.stringify(__explorationTest.ai.at(-1)).includes('RAW_TASK_FICTION')));
 assert.ok(await page.evaluate(()=>!JSON.stringify(__explorationTest.ai.at(-1)).includes('PRIVATE_DREAM_FEELING_SENTINEL')));
 assert.ok(!(await page.evaluate(()=>__explorationTest.remote)).includes('RAW_TASK_FICTION'),'The journal stores live references, not duplicate raw source text');
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().source_md),'','A connected conversation works before any earlier notes are imported');
 await page.screenshot({path:join(ROOT,'.context/exploration-layout-restored/test-fixture-reply.png'),fullPage:true});await checkLayout('reply');
 const openingPath=join(ROOT,'.context/exploration-integration/opening-fiction.md');await mkdir(dirname(openingPath),{recursive:true});await writeFile(openingPath,'Original fictional checkpoint retained.');
 await click('#exNotes');assert.ok(await page.$eval('#addTaskBar',node=>getComputedStyle(node).display!=='none'),'Daily capture stays visible in exploration Notes');assert.equal(await page.$('input[type=file]'),null,'File import is absent from the living note');await click('[data-ex-action="document"]');await click('[data-ex-action="import"]');assert.equal(await page.$('#exThought,#exNotesTitle'),null,'Import replaces its parent view');await checkLayout('import');
 await (await page.$('[data-today-change="exploration.checkpoint"]')).uploadFile(openingPath);await wait(()=>__explorationTest.remote.includes('Original fictional checkpoint retained.'));assert.equal(await page.evaluate(()=>Today.use('exploration').document().today_context.enabled),true,'Adding earlier notes preserves the TODAY connection');await click('[data-ex-action="back"]');await click('[data-ex-action="back"]');await click('[data-ex-action="back"]');

 await page.evaluate(()=>{const today=_localISO();appMemory.memory.semantic=[{id:'MEMORY_FICTION',type:'semantic',text:'NONCE_MEMORY_FICTION: evenings favour unhurried beginnings.',status:'confirmed',lastSeen:today,seenWeeks:['2026-10-12','2026-10-19','2026-10-26']}];_saveMemory();});
 await click('[data-ex-action="sources"]');await wait(()=>document.querySelector('[data-ex-action="today-pin"][data-today-source-id="memory:semantic:MEMORY_FICTION"]'));
 await page.$eval('#exTodayContext',node=>{node.open=true;node.querySelector('details').open=true;});await click('[data-ex-action="today-pin"][data-today-source-id="memory:semantic:MEMORY_FICTION"]');await wait(()=>Today.use('exploration').document().today_context.included?.includes('memory:semantic:MEMORY_FICTION'));
 assert.equal(await page.evaluate(()=>!document.querySelector('#exOtherRecords')||document.querySelector('#exOtherRecords').open),true,'Choosing a source preserves the open picker while other records remain');
 assert.ok(await page.evaluate(()=>document.activeElement.id==='exViewTitle'||document.activeElement.dataset.exAction==='today-pin'),'A source choice keeps meaningful focus');
 await click('[data-ex-action="back"]');await page.type('#exThought','The fictional project has a new possibility.');await click('#exSend');await wait(()=>document.querySelector('[data-ex-reading]')&&!document.querySelector('#exThought').readOnly);
 assert.ok(await page.evaluate(()=>{const rows=JSON.parse(__explorationTest.ai.at(-1).messages[0].content).context.records;return rows.some(row=>row.id==='memory:semantic:MEMORY_FICTION'&&row.evidence_kind==='AI interpretation'&&row.source_type.includes('unconfirmed'));}),'Chosen Memory interpretations reach the writer with their unconfirmed provenance');
 await click('[data-ex-action="sources"]');await checkLayout('sources');assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#explorationRoot details')].find(node=>node.querySelector('summary')?.textContent.startsWith('TODAY records used')).textContent.includes('NONCE_MEMORY_FICTION')),'Notes exposes the actual live records used by this reading');await click('[data-ex-action="back"]');
 await page.evaluate(()=>{doneIds.add(manualTasks[0].id);Today.use('connections').renderManual();});
 assert.equal(await page.evaluate(async()=>!!Today.use('exploration-core').current(Today.use('exploration').document(),await Today.use('exploration-context').collect())),true,'Completion alone does not invalidate the same task wording');
 await page.evaluate(()=>{doneIds.delete(manualTasks[0].id);Today.use('connections').renderManual();__explorationTest.hold=true;__explorationTest.release=null;});
 await page.type('#exThought','Another fictional project observation.');await click('#exSend');await wait(()=>typeof __explorationTest.release==='function');
 await click('[data-ex-action="sources"]');await click('#exTodayContext > summary');await click('[data-ex-action="today-source"]');await wait(()=>Today.use('exploration').document().today_context.excluded.length>0&&!document.querySelector('[data-ex-action="today-source"]').disabled);
 const beforeLate=await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length);
 await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await new Promise(resolve=>setTimeout(resolve,100));
 await page.waitForFunction(()=>!document.querySelector('[data-ex-reading]'));
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length),beforeLate);
 await page.$eval('#exTodayContext',node=>{node.open=true;});await page.evaluate(()=>[...document.querySelectorAll('[data-ex-action="today-source"]')].find(button=>button.textContent==='include').click());await wait(()=>Today.use('exploration').document().today_context.excluded.length===0);
 assert.equal(await page.evaluate(async()=>Today.use('exploration-core').current(Today.use('exploration').document(),await Today.use('exploration-context').collect())),null,'Re-inclusion cannot revive an earlier linked reading');
 await click('[data-ex-action="back"]');await click('[data-ex-action="retry-ai"]');await wait(()=>document.querySelector('[data-ex-reading]')&&!document.querySelector('#exThought').readOnly);
 await page.evaluate(()=>{__explorationTest.hold=true;__explorationTest.release=null;});await page.type('#exThought','A fictional project follow-up.');await click('#exSend');await wait(()=>typeof __explorationTest.release==='function');
 await page.evaluate(()=>{manualTasks[0].text='Edited task after the request';Today.use('connections').renderManual();_saveMemory();});
 await wait(()=>document.querySelector('.ex-status').textContent.includes('supporting TODAY record')&&!document.querySelector('#exThought').readOnly);
 const beforeEdit=await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length);
 await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await new Promise(resolve=>setTimeout(resolve,100));
 await page.waitForFunction(()=>!document.querySelector('[data-ex-reading]'));
 assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length),beforeEdit);
 await click('#exNotes');await click('[data-ex-action="document"]');await click('[data-ex-action="import"]');
 const checkpointPath=join(ROOT,'.context/exploration-integration/checkpoint-fiction.md');await mkdir(dirname(checkpointPath),{recursive:true});await writeFile(checkpointPath,'Fictional checkpoint appended through the native import.');
 await page.evaluate(()=>{manualTasks[0].text+=' changed again';_saveMemory();});await wait(()=>document.querySelector('[data-today-change="exploration.checkpoint"]'));assert.equal(await page.$('#exThought,#exNotesTitle,#exTodayContext'),null,'Source refresh preserves the focused import view');const file=await page.$('[data-today-change="exploration.checkpoint"]');await file.uploadFile(checkpointPath);await wait(()=>__explorationTest.remote.includes('Fictional checkpoint appended'));
 assert.ok(await page.evaluate(()=>Today.use('exploration').document().source_revision));assert.ok(await page.evaluate(()=>Today.use('exploration').document().source_md.includes('Original fictional checkpoint retained.')));

 await mkdir(join(ROOT,'.context/memory-data'),{recursive:true});
 for(const width of [320,390,736,1024]){
  await page.setViewport({width,height:900});
  const accessibility=await page.evaluate(()=>axe.run(document.getElementById('explorationRoot'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(accessibility.violations.map(row=>row.id),[],width+'px connected sources axe');
 }
 await click('[data-ex-action="back"]');await click('[data-ex-action="back"]');await click('[data-ex-action="sources"]');
 await page.screenshot({path:join(ROOT,'.context/exploration-layout-restored/test-fixture-connected-notes.png'),fullPage:true});
 await click('[data-ex-action="back"]');await click('[data-ex-action="back"]');await click('[data-ex-action="back"]');
 const downloadsBefore=await page.evaluate(()=>__explorationTest.downloads);
 await click('#todayLogo');await page.evaluate(()=>{Today.use('memory').render();Today.use('memory').render();});await wait(()=>document.querySelector('#memoryThreadQuestion'));
 assert.equal((await page.evaluate(()=>__explorationTest.downloads))-downloadsBefore,1,'One canonical read per Memory visit, including concurrent redraws');
 assert.equal(await page.$eval('#memoryThreadQuestion',node=>node.textContent),'Fictional project');
 assert.equal(await page.$('#memoryContent .memory-type-desc'),null,'Memory removes repeated section subtitles');
 assert.ok(await page.$$eval('#memoryContent .memory-source',rows=>rows.every(node=>!node.textContent.includes('counted from')&&!node.textContent.includes('on record'))),'Routine rows omit repetitive provenance while AI labels stay');
 assert.deepEqual(await page.$$eval('#memoryContent > section > .memory-type-header > h3',rows=>rows.map(row=>row.textContent)),['STILL OPEN','WHAT HOLDS','KEPT APART']);
 await page.$eval('#memoryCoverage',node=>{node.open=true;});await page.evaluate(()=>Today.use('memory').render());assert.equal(await page.$eval('#memoryCoverage',node=>node.open),true,'Coverage stays open within a visit');
 await click('#todayLogo');await click('#todayLogo');await wait(()=>document.querySelector('#memoryThreadQuestion'));assert.equal(await page.$eval('#memoryCoverage',node=>node.open),false,'Coverage resets after leaving Memory');
 for(const width of [320,390,736,1024]){
  await page.setViewport({width,height:900});
  assert.equal(await page.$eval('#memoryPanel',root=>[...root.querySelectorAll('*')].filter(node=>{const rect=node.getBoundingClientRect();return rect.width&&rect.right>innerWidth+1;}).length),0,width+'px real Memory containment');
  const accessibility=await page.evaluate(()=>axe.run(document.getElementById('memoryPanel'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(accessibility.violations.map(row=>row.id),[],width+'px actual Memory axe');
  if([390,1024].includes(width)){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(ROOT,'.context/memory-clarity/after-memory-'+width+'.png'),fullPage:true});}
 }
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 await page.evaluate(()=>{__explorationTest.holdDownload=true;__explorationTest.releaseDownload=null;});
 await click('#memoryContinue');await wait(()=>typeof __explorationTest.releaseDownload==='function');
 assert.equal(await page.$eval('#memoryPanel',node=>node.classList.contains('open')),true);
 assert.ok(await page.$('[role="status"]'),'Remote content has an honest loading state');
 await page.evaluate(()=>{__explorationTest.holdDownload=false;__explorationTest.releaseDownload();});
 await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 assert.ok(await page.evaluate(()=>document.getElementById('memoryPanel').getAnimations().some(animation=>animation.effect.getKeyframes().some(frame=>'height' in frame))),'Loaded content settles height instead of jumping');
 await page.screenshot({path:join(ROOT,'.context/exploration-polish/desktop-loaded.png'),fullPage:true});
 await click('[data-ex-action="back"]');await wait(()=>document.activeElement?.id==='memoryContinue');
 await click('#memoryContinue');await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
 const sheetAI=await page.evaluate(()=>__explorationTest.ai.length);
 await page.type('#exThought','UNSENT_SHEET_SWITCH_FICTION');
 for(const peer of ['#infoBtn','#habitsBtn','#trelloBtn']){
  await click(peer);await wait(()=>document.querySelector('#explorationRoot').hidden&&!document.querySelector('#memoryPanel').classList.contains('open'));
  assert.equal(await page.$eval('#memoryPanel',node=>node.hidden),true,'Opening a peer sheet hides Explore');
  await click('[data-ex-origin="list"]');await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').readOnly);
  assert.equal(await page.$eval('#exThought',node=>node.value),'UNSENT_SHEET_SWITCH_FICTION','Sheet handoff retains the unsent page-held draft');
  assert.equal(await page.$$eval('#configPanel.open,#habitsPanel.open,#infoPanel.open',rows=>rows.length),0,'Returning to Explore replaces peer sheets');
 }
 assert.equal(await page.evaluate(()=>__explorationTest.ai.length),sheetAI,'Sheet navigation makes no exploration request');
 await page.$eval('#exThought',node=>{node.value='';node.dispatchEvent(new Event('input',{bubbles:true}));});
 await click('[data-ex-action="back"]');await wait(()=>document.activeElement?.matches('#explorationEntry button'));
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 console.log('  ✓ Native Memory uses actual records, one Dropbox read per visit, correct return focus, per-visit coverage and 320/390/736/1024px axe/containment');
 console.log('  ✓ Live TODAY records work without importing notes; explained creation and saved opt-out are respected; sensitive stores stay separate; fingerprints/epochs fence edits and exclusion; completion stays valid; checkpoint append preserves history');
 assert.ok(await page.evaluate(()=>Object.keys(localStorage).every(key=>!key.startsWith('today_exploration'))));assert.ok(await page.evaluate(()=>__explorationTest.backup.every(body=>!body.includes('OBS_FICTION')&&!body.includes('CORRECTION_FICTION'))));assert.deepEqual(errors,[]);
 await mkdir(join(ROOT,'.context/exploration-integration'),{recursive:true});await page.screenshot({path:join(ROOT,'.context/exploration-integration/forgotten.png'),fullPage:true});
 console.log('  ✓ Source withdrawal fences delayed AI, re-inclusion cannot revive, widths stay contained, conditional forget clears page and Dropbox; no journal in backup/storage');
}catch(error){console.error('Fixture state',await testPage.evaluate(()=>({root:document.getElementById('explorationRoot')?.innerHTML,announcement:document.querySelector('[role=status]')?.textContent,errors:window.__explorationTest?.uploads?.length,keys:Object.keys(localStorage)})));console.error('Page errors',errors);throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
console.log('✓ EXPLORATION TEST PASSED');
