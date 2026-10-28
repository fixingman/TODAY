// Real app: prepare audio before input, unlock on gesture, retain the existing tones.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const performanceSource=await readFile(join(ROOT,'scripts/performance-test.mjs'),'utf8');
const start=performanceSource.indexOf('async function armInteraction('),end=performanceSource.indexOf('\nasync function ',start+1);
const armInteraction=vm.runInNewContext('('+performanceSource.slice(start,end)+')');
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const file=path==='/'?'index.html':path;res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(await readFile(join(ROOT,file)));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-first-run','--disable-extensions','--no-sandbox','--autoplay-policy=document-user-activation-required','--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4']});
async function fixture(mode='fake'){
 const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.setViewport({width:1280,height:900});
 await page.evaluateOnNewDocument(mode=>{
  localStorage.clear();localStorage.setItem('splash_shown_at',String(Date.now()));localStorage.setItem('today_manual',JSON.stringify([{id:'manual_1700000000000',text:'Check audio readiness',addedAt:new Date().toISOString()}]));
  if(mode==='native')return;
  if(mode==='unsupported'){window.AudioContext=undefined;window.webkitAudioContext=undefined;return;}
  const calls=window.__audio={input:false,constructs:[],resumes:[],notes:[],attempts:0,outputs:[],releases:[],rejects:[]};
  const input=()=>{calls.input=true;};window.addEventListener('pointerdown',input,{capture:true});window.addEventListener('keydown',input,{capture:true});
  class Context{
   constructor(options){
    calls.attempts++;
    if(mode==='staged-unsupported'&&options?.sinkId)throw new Error('Fictional unsupported silent option');
    if(mode==='retry'&&!calls.input)throw new Error('Fictional pre-gesture constructor refusal');
    const at=performance.now();
    if((mode==='fake'&&calls.input)||(mode==='staged'&&options?.sinkId?.type!=='none')){while(performance.now()-at<340){}}
    this.state=calls.input?'running':'suspended';this.currentTime=0;this.destination={};this.id=calls.constructs.length;
    this.sinkId=options?.sinkId||'';
    calls.constructs.push({afterInput:calls.input,duration:performance.now()-at,state:this.state,sink:this.sinkId});
   }
   resume(){calls.resumes.push({input:calls.input});this.state='running';return Promise.resolve();}
   close(){this.state='closed';return Promise.resolve();}
   createOscillator(){const note={context:this.id,frequencies:[],start:null,stop:null};calls.notes.push(note);return {type:'sine',connect(){},frequency:{setValueAtTime(value){note.frequencies.push(value);},exponentialRampToValueAtTime(value){note.frequencies.push(value);}},start(at){note.start=at;},stop(at){note.stop=at;}};}
   createGain(){return {connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}};}
  }
  if(mode.startsWith('staged'))Context.prototype.setSinkId=function(sink){
   calls.outputs.push({context:this.id,sink});
   return new Promise((resolve,reject)=>{
    calls.releases[this.id]=()=>{this.sinkId=sink;resolve();};
    calls.rejects[this.id]=()=>reject(new Error('Fictional output initialization refusal'));
   });
  };
  window.AudioContext=Context;window.webkitAudioContext=Context;
 },mode);
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
 await page.waitForFunction(()=>typeof window._focusOnCheck==='function'&&document.querySelector('#manualList .task-text'));
 return {context,page,errors};
}
try{
 {
  const {context,page,errors}=await fixture('staged');
  const before=await page.evaluate(()=>({constructs:__audio.constructs,outputs:__audio.outputs,notes:__audio.notes.length,resumes:__audio.resumes.length}));
  assert.ok(before.constructs[0].duration<200,'slow default-output initialization must not block startup past the unchanged 200ms ceiling');
  assert.deepEqual(before.constructs[0].sink,{type:'none'});assert.deepEqual(before.outputs,[{context:0,sink:''}]);
  assert.equal(before.notes,0);assert.equal(before.resumes,0,'output preparation must not unlock or play before input');
  await armInteraction(page,'focus');await page.click('#manualList .task-text');
  const timing=await page.evaluate(()=>window.__todayInteraction);
  assert.ok(timing.duration<300,'pending output setup must not block the first Focus gesture');
  assert.equal(await page.evaluate(()=>__audio.notes.length),0,'an early tone waits for the real output instead of being lost to the silent sink');
  await page.evaluate(()=>__audio.releases[0]());await page.waitForFunction(()=>__audio.notes.length===1);
  assert.deepEqual(await page.evaluate(()=>__audio.notes[0].frequencies),[520,680]);
  await page.evaluate(()=>{_sharedAudioCtx.close();playStartSound();_sharedAudioCtx.close();playStartSound();});
  await page.evaluate(()=>__audio.releases[1]());
  assert.equal(await page.evaluate(()=>__audio.notes.length),1,'late output readiness cannot play through a replaced or closed context');
  await page.evaluate(()=>__audio.releases[2]());await page.waitForFunction(()=>__audio.notes.length===2);
  assert.equal(await page.evaluate(()=>__audio.notes.at(-1).context),2);
  await page.evaluate(()=>{_sharedAudioCtx.close();playStartSound();playCompleteSound();__audio.releases[3]();});
  await page.waitForFunction(()=>__audio.notes.length===3);
  assert.deepEqual(await page.evaluate(()=>__audio.notes.at(-1).frequencies),[600,480,380],
    'multiple cues during output initialization retain only the latest rather than playing a burst');
  await page.evaluate(async()=>{
    _sharedAudioCtx.close();
    const now=performance.now.bind(performance);let offset=0;
    Object.defineProperty(performance,'now',{configurable:true,value:()=>now()+offset});
    try{playStartSound();const ready=_audioReady;offset=2000;__audio.releases[4]();await ready;}
    finally{delete performance.now;}
  });
  assert.equal(await page.evaluate(()=>__audio.notes.length),3,'expired initialization cannot play a stale user cue');
  const tones=await page.evaluate(()=>{const start=__audio.notes.length;playResumeSound();playCompleteSound();playHabitDoneSound();playChime();return __audio.notes.slice(start);});
  assert.deepEqual(tones.map(n=>n.frequencies),[[500,600],[600,480,380],[520,400,300],[520],[600],[680],[520]],
    'ready output preserves all tones and intentional overlap');
  assert.deepEqual(errors,[]);await context.close();
  console.log('  ✓ slow output startup/first input, pending tone fidelity and closed-context readiness fencing');
 }
 for(const mode of ['staged-reject','staged-unsupported']){
  const {context,page,errors}=await fixture(mode);
  await page.click('#manualList .task-text');
  if(mode==='staged-reject')await page.evaluate(()=>__audio.rejects[0]());
  await page.waitForFunction(()=>__audio.notes.length===1);
  assert.equal(await page.evaluate(()=>_sharedAudioCtx.sinkId),'','output refusal falls back to the default context');
  assert.deepEqual(await page.evaluate(()=>__audio.notes[0].frequencies),[520,680]);
  assert.deepEqual(errors,[]);await context.close();
 }
 {
  const {context,page,errors}=await fixture();
  const before=await page.evaluate(()=>({created:__audio.constructs.length,notes:__audio.notes.length,resumes:__audio.resumes.length}));
  await armInteraction(page,'focus');await page.click('#manualList .task-text');
  const timing=await page.evaluate(()=>window.__todayInteraction),calls=await page.evaluate(()=>window.__audio);
  console.log('  audio input evidence:',JSON.stringify({before,duration:timing.duration,constructs:calls.constructs}));
  assert.ok(timing.duration<300,'cold audio preparation cannot block first Focus past the unchanged 300ms input ceiling');
  assert.equal(before.created,1,'context is prepared before any gesture');assert.equal(before.notes,0,'preparation does not play a tone');assert.equal(before.resumes,0,'preparation does not unlock playback');
  assert.equal(calls.constructs.length,1,'first Focus reuses the prepared context');assert.equal(calls.constructs[0].afterInput,false,'constructor work is outside input dispatch');
  assert.ok(calls.resumes.length&&calls.resumes.every(row=>row.input),'unlock remains gesture-bound');
  assert.deepEqual(calls.notes[0].frequencies,[520,680],'start chirp is preserved');assert.equal(calls.notes[0].stop,0.15);
  const tones=await page.evaluate(()=>{const start=__audio.notes.length;playResumeSound();playCompleteSound();playHabitDoneSound();playChime();return __audio.notes.slice(start);});
  assert.deepEqual(tones.map(note=>note.frequencies),[[500,600],[600,480,380],[520,400,300],[520],[600],[680],[520]],'resume, completion, habit and chime remain the same sine family');
  await page.evaluate(()=>_sharedAudioCtx.close());await page.evaluate(()=>playStartSound());
  assert.equal(await page.evaluate(()=>__audio.constructs.length),2,'a closed context is replaced');assert.deepEqual(errors,[]);await context.close();
 }
 for(const mode of ['retry','unsupported']){
  const {context,page,errors}=await fixture(mode);await page.click('#manualList .task-text');await page.waitForSelector('.focus-timer.open');
  if(mode==='retry')assert.ok(await page.evaluate(()=>__audio.constructs.length===1&&__audio.attempts===2&&__audio.notes.length===1),'preparation refusal retries on the real gesture and preserves its tone');
  assert.deepEqual(errors,[],'audio refusal or unsupported API cannot break Focus');await context.close();
 }
 {
  const {context,page,errors}=await fixture('native');
  const state=await page.evaluate(async()=>{await _audioReady;window.__nativeAudio=_sharedAudioCtx;return _sharedAudioCtx?.state;});
  assert.equal(state,'suspended','real Chrome autoplay policy keeps prepared audio silent');
  assert.equal(await page.evaluate(()=>_sharedAudioCtx.sinkId),'','native preparation reaches the default audible output');
  await page.click('#manualList .task-text');await page.waitForFunction(()=>_sharedAudioCtx?.state==='running');
  assert.ok(await page.evaluate(()=>_sharedAudioCtx===window.__nativeAudio),'gesture resumes the existing native context');assert.deepEqual(errors,[]);await context.close();
 }
 console.log('  ✓ cold first-input audio regression, gesture unlock, all five sounds, closed/refused/unsupported fallback and real autoplay policy');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
