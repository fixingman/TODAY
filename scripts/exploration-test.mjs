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
assert.throws(()=>core.parse(core.stringify(doc).replace('"schema_version":1','"schema_version":99')));
assert.ok(core.stringify(doc).includes('Original words'));
let chain=core.create('Fictional lineage','','workspace-chain',stamp);
chain=core.append(chain,entry('observation','OBS-chain','Original context'));
chain=core.append(chain,entry('reading','READ-chain','A tentative reading',{summary:'s',next_question:'q',evidence_ids:[],source_ids:['OBS-chain']}));
chain=core.append(chain,entry('source','WITHDRAW-chain','',{target:'OBS-chain',include:false}));
assert.equal(core.current(chain),null,'All actual input dependencies retire a reading even if the model omits its evidence citation');

console.log('  ✓ Markdown round trip, immutable IDs, references, version rejection, extensions and source withdrawal');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png'};
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://x').pathname);if(path==='/')path='/index.html';const body=await readFile(join(ROOT,path));res.writeHead(200,{'Content-Type':MIME[extname(path)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
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
  const s=window.__explorationTest={remote:null,rev:0,uploads:[],backup:[],ai:[],conflict:false,malformed:false,hold:false,lost:false};
  const original=window.fetch.bind(window);const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json',...headers}});
  window.fetch=async(url,opts={})=>{
   const target=String(url);let args={};try{args=JSON.parse(opts.headers?.['Dropbox-API-Arg']||opts.body||'{}');}catch{}
   if(target.includes('dropboxapi.com')){
    const path=args.path||'';const exploration=path.includes('/Life Exploration');
    if(target.includes('/files/download'))return exploration&&s.remote!==null?new Response(s.remote,{status:200,headers:{'Dropbox-API-Result':JSON.stringify({rev:String(s.rev).padStart(9,'0')})}}):json({error_summary:'path/not_found/'},409);
    if(target.includes('/files/upload')){
     if(!exploration){s.backup.push(opts.body);return json({rev:'backup-rev'});}
     s.uploads.push({args,body:opts.body});
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
    const context=JSON.parse(body.messages[0].content);return json({content:JSON.stringify({reply:'One fictional account leaves several explanations open.',summary:'Materials and timing remain possibilities.',next_question:'What changed this time?',evidence_ids:context.context.records.map(row=>row.id),experiment:context.request.startsWith('Suggest')?{question:'Does a smaller setup help?',action:'Try a fictional short session',signal:'Whether starting feels easier',effort:'One minute',review:'When returning',stop:'If it becomes burdensome'}:null})});
   }
   if(target.includes('/.netlify/functions/'))return json({});
   if(/^https?:/.test(target)&&!target.startsWith(location.origin))throw new Error('Unexpected external request');
   return original(url,opts);
  };
 });
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.Today&&document.body&&!document.body.hasAttribute('data-booting'),{timeout:20000});await waitForFonts(page);
 const click=async selector=>{await page.$eval(selector,node=>node.scrollIntoView({block:"center"}));await page.click(selector);},wait=fn=>page.waitForFunction(fn,{timeout:10000});
 await click('[data-ex-origin="list"]');await wait(()=>document.getElementById('exQuestion'));
 await page.type('#exQuestion','A fictional exploration');await click('[data-ex-action="create"]');await wait(()=>document.getElementById('exThought'));
 assert.ok(await page.evaluate(()=>__explorationTest.remote.includes('A fictional exploration')));
 await page.evaluate(()=>{localStorage.setItem('today_ai_key_claude','fictional-key');localStorage.setItem('today_ai_provider','claude');});
 await page.type('#exThought','OBS_FICTION: an unplanned experience');await click('#exSend');await wait(()=>document.querySelector('[data-ex-action="changes"]'));
 assert.ok(await page.evaluate(()=>__explorationTest.remote.includes('OBS_FICTION')));assert.equal(await page.evaluate(()=>__explorationTest.uploads.filter(row=>row.args.mode==='add').length),1);
 await click('#exNotes');await click('[data-ex-action="correct"]');await page.$eval('#exCorrection',input=>{input.value='CORRECTION_FICTION: timing may matter.';});await click('[data-ex-action="amend"]');await wait(()=>__explorationTest.remote.includes('CORRECTION_FICTION')&&!document.querySelector('#exCorrection')&&!document.querySelector('[data-ex-action="task-context"]').disabled);
 await click('[data-ex-action="task-context"]');await wait(()=>document.querySelector('.exploration-task-action'));
 await click('[data-ex-action="experiment"]');await wait(()=>document.querySelector('[data-ex-action="task"]'));await click('[data-ex-action="task"]');await wait(()=>document.querySelectorAll('#manualList .task').length===2);
 assert.ok(await page.evaluate(()=>!__explorationTest.remote.includes('"beneficial":true')));
 console.log('  ✓ Real app: create, durable observation before AI, correction history, chosen task context and optional action');
 await click('[data-ex-action="back"]');await click('[data-ex-action="back"]');
 assert.equal(await page.evaluate(()=>['memoryTitleRow','memoryContent','memoryFooter'].every(id=>!document.getElementById(id).hidden)),true,'Leaving restores the native Memory sections');
 await click('#todayLogo');await wait(()=>document.getElementById('memoryPanel').classList.contains('open'));
 assert.ok(await page.$eval('#memoryContent',node=>node.getClientRects().length>0),'Memory is visible after returning');
 await click('#memoryTitleRow [data-today-click="exploration.open"]');await wait(()=>document.getElementById('exThought')&&!document.getElementById('exThought').disabled);
 await page.evaluate(()=>{__explorationTest.conflict=true;});await page.type('#exThought','UNSENT_CONFLICT');await click('#exSend');await wait(()=>document.querySelector('.ex-status').textContent.includes('changed'));
 assert.equal(await page.$eval('#exThought',input=>input.value),'UNSENT_CONFLICT');assert.ok(!(await page.evaluate(()=>__explorationTest.remote)).includes('UNSENT_CONFLICT'));
 await click('[data-ex-action="reload"]');await wait(()=>document.querySelector('#exSend')&&!document.querySelector('#exThought').disabled);await page.evaluate(()=>{__explorationTest.lost=true;__explorationTest.malformed=true;});await click('#exSend');await wait(()=>document.querySelector('[data-ex-action="retry-ai"]'));
 assert.equal((await page.evaluate(()=>__explorationTest.remote)).split('UNSENT_CONFLICT').length-1,1);
 await click('[data-ex-action="retry-ai"]');await wait(()=>!document.querySelector('[data-ex-action="retry-ai"]'));
 console.log('  ✓ CAS conflict retains unsent text, lost write acknowledgement reconciles, failed AI retries without duplicate observation');
 await page.evaluate(()=>{__explorationTest.hold=true;});await page.type('#exThought','PENDING_FICTION');await click('#exSend');await wait(()=>typeof __explorationTest.release==='function');await click('#exNotes');await click('[data-ex-action="source"]');await wait(()=>document.querySelector('.ex-status').textContent.includes('Source choice'));
 const readingsBefore=await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length);await page.evaluate(()=>{__explorationTest.hold=false;__explorationTest.release();});await new Promise(resolve=>setTimeout(resolve,100));assert.equal(await page.evaluate(()=>Today.use('exploration').document().entries.filter(row=>row.kind==='reading').length),readingsBefore);
 await click('[data-ex-action="source"]');assert.ok(await page.evaluate(()=>Today.use('exploration-core').current(Today.use('exploration').document())===null));
 for(const width of [320,390,736,1024]){await page.setViewport({width,height:900});const overflow=await page.$eval('#explorationRoot',root=>[...root.querySelectorAll('*')].filter(node=>{const rect=node.getBoundingClientRect();return rect.width&&rect.right>innerWidth+1;}).length);assert.equal(overflow,0,width+'px notes overflow');}
 await click('[data-ex-action="privacy"]');await click('[data-ex-action="forget"]');await click('[data-ex-action="forget-confirm"]');await wait(()=>document.getElementById('exTitle').textContent==='Exploration forgotten');assert.equal(await page.evaluate(()=>__explorationTest.remote),null);assert.ok(!(await page.$eval('#explorationRoot',root=>root.textContent)).includes('CORRECTION_FICTION'));
 await click('[data-ex-action="back"]');await click('[data-ex-origin="list"]');await wait(()=>document.getElementById('exQuestion'));assert.equal(await page.$eval('#exQuestion',input=>input.value),'','Forget clears the setup question as well as journal content');
 assert.ok(await page.evaluate(()=>Object.keys(localStorage).every(key=>!key.startsWith('today_exploration'))));assert.ok(await page.evaluate(()=>__explorationTest.backup.every(body=>!body.includes('OBS_FICTION')&&!body.includes('CORRECTION_FICTION'))));assert.deepEqual(errors,[]);
 await mkdir(join(ROOT,'.context/exploration-integration'),{recursive:true});await page.screenshot({path:join(ROOT,'.context/exploration-integration/forgotten.png'),fullPage:true});
 console.log('  ✓ Source withdrawal fences delayed AI, re-inclusion cannot revive, widths stay contained, conditional forget clears page and Dropbox; no journal in backup/storage');
}catch(error){console.error('Fixture state',await testPage.evaluate(()=>({root:document.getElementById('explorationRoot')?.innerHTML,announcement:document.querySelector('[role=status]')?.textContent,errors:window.__explorationTest?.uploads?.length,keys:Object.keys(localStorage)})));console.error('Page errors',errors);throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
console.log('✓ EXPLORATION TEST PASSED');
