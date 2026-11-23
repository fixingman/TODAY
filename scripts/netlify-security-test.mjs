// Fictional, account-free verification of the policy Netlify will serve after its build command.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { prepareSecurityHeaders } from '../netlify/prepare-security-headers.mjs';
import { installFixtureClock, waitForFonts, openSidebar } from './browser-fixture.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const config=await readFile(join(root,'netlify.toml'),'utf8');
// Run the actual hosting skip command against a real fictional Git history.
const ignore=config.match(/^\s*ignore = (["'])(.*)\1$/m)?.[2];
assert.ok(ignore,'Netlify ignore command exists');
const repository=await mkdtemp(join(tmpdir(),'today-hosting-ignore-'));
try {
 const git=(...args)=>execFileSync('git',args,{cwd:repository,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
 const commit=message=>{git('add','.');git('commit','-qm',message);return git('rev-parse','HEAD');};
 await writeFile(join(repository,'index.html'),'old app');await writeFile(join(repository,'README.md'),'old docs');
 const deployed=commit('deployed app');
 await writeFile(join(repository,'index.html'),'new app');const app=commit('app update');
 await writeFile(join(repository,'README.md'),'validation note');const target=commit('validation metadata');
 const check=(cached,current)=>{
  const environment={...process.env};delete environment.CACHED_COMMIT_REF;delete environment.COMMIT_REF;
  if(cached!==undefined)environment.CACHED_COMMIT_REF=cached;
  if(current!==undefined)environment.COMMIT_REF=current;
  return spawnSync('bash',['-c',ignore],{cwd:repository,env:environment,encoding:'utf8',timeout:5000}).status;
 };
 assert.equal(spawnSync('git',['diff','--quiet','HEAD^','HEAD','--','index.html'],{cwd:repository}).status,0);
 assert.equal(check(deployed,target),1,'metadata-only promotion must build changes since the last deployed app');
 assert.equal(check(app,target),0,'documentation-only updates to an already-built app stay skipped');
 for(const [cached,current] of [[undefined,target],['',target],[target,target],[deployed,undefined],['0'.repeat(40),target]])
  assert.equal(check(cached,current),1,'missing/uncached/unavailable build baselines must build');
 await mkdir(join(repository,'netlify'));await writeFile(join(repository,'netlify','function.js'),'new handler');
 const server=commit('function change');assert.equal(check(target,server),1,'function changes rebuild');
 console.log('✓ Netlify deploy skip: metadata promotion, unchanged app, missing/equal/invalid refs and function changes');
}finally{await rm(repository,{recursive:true,force:true});}
const policy=text=>text.match(/Content-Security-Policy = "([^"]+)"/)[1];
const base=policy(config);
const env={URL:'https://today-here.netlify.app',DEPLOY_PRIME_URL:'https://dev--today-here.netlify.app',DEPLOY_URL:'https://abc123--today-here.netlify.app'};
const generated=prepareSecurityHeaders(config,env),csp=policy(generated);
assert.equal(config.match(/command = "rm -rf video && node netlify\/prepare-security-headers.mjs"/g)?.length,3);
assert.equal(prepareSecurityHeaders(generated,env),generated);
assert.ok(csp.startsWith(base+'; '));
assert.equal(csp.split('; ').at(-1),"script-src-elem 'unsafe-inline' https://today-here.netlify.app/assets/ https://dev--today-here.netlify.app/assets/ https://abc123--today-here.netlify.app/assets/");
for(const invalid of [{},{URL:'http://example.com'},{URL:'https://user:pass@example.com'},{URL:'https://example.com/path'},{URL:'https://example.com/?x=1'}])assert.throws(()=>prepareSecurityHeaders(config,invalid));
const {default:poem}=await import('../netlify/edge-functions/poem.js');
const nativeFetch=globalThis.fetch;
try{
 globalThis.fetch=async()=>new Response('const POEMS = [{author:"Fixture poet",text:"Fictional poem",season:null}];');
 const response=await poem(new Request('https://today-here.netlify.app/poem.html?date=2026-11-15'),{next:async()=>new Response('<html><head><meta property="og:title" content=""></head></html>',{headers:{'content-security-policy':csp}})});
 assert.equal(response.headers.get('content-security-policy'),csp);assert.match(await response.text(),/Fixture poet/);
}finally{globalThis.fetch=nativeFetch;}
let origin,restricted=false,hudRequests=0;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const injection='<script async src="/.netlify/scripts/hud?variant=public"></script>';
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,origin);
 if(url.pathname==='/.netlify/scripts/hud'){
  hudRequests++;res.setHeader('Content-Type','text/javascript');res.end('window.__hudRan=true;const frame=document.createElement("iframe");frame.id="nl-badge-frame";document.body.append(frame);');return;
 }
 const path=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
 let body=await readFile(join(root,path));
 const headers={'Content-Type':mime[extname(path)]||'application/octet-stream'};
 if(path.endsWith('.html')){headers['Content-Security-Policy']=restricted?policy(prepareSecurityHeaders(config,{URL:origin})):base;body=body.toString()+injection;}
 res.writeHead(200,headers);res.end(body);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-first-run','--disable-extensions']});
try{
 for(restricted of [false,true]){
  hudRequests=0;const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1200,height:900});await installFixtureClock(page,new Date(2026,10,15,12).getTime());
  await page.evaluateOnNewDocument(()=>{localStorage.setItem('splash_shown_at',String(Date.now()));window.__violations=[];document.addEventListener('securitypolicyviolation',e=>__violations.push({directive:e.effectiveDirective,blocked:e.blockedURI}));});
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.body.hasAttribute('data-booting')&&performance.getEntriesByName('today:interactive').length,{timeout:15000,polling:50});await waitForFonts(page);
  if(!restricted){await page.waitForSelector('#nl-badge-frame');assert.equal(hudRequests,1);assert.equal(await page.evaluate(()=>__hudRan),true);}
  else{
   await page.waitForFunction(()=>__violations.some(v=>v.directive==='script-src-elem'&&v.blocked.includes('/.netlify/scripts/hud')),{timeout:5000,polling:50});
   assert.equal(hudRequests,0);assert.equal(await page.evaluate(()=>!!window.__hudRan||!!document.getElementById('nl-badge-frame')),false);
   await page.type('#newTask','Fictional policy check');await page.keyboard.press('Enter');
   await page.waitForFunction(()=>[...document.querySelectorAll('.task-text')].some(n=>n.textContent==='Fictional policy check'));
   for(const id of ['habits','about','memory']){await openSidebar(page,id);await page.evaluate(()=>Today.use('sidebar').close(true));}
   await page.click('#trelloBtn');await page.waitForFunction(()=>{try{return Today.use('exploration').isOpen();}catch{return false;}},{timeout:10000});await page.evaluate(()=>Today.use('sidebar').close(true));
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:10000,polling:50});
   await page.waitForFunction(async()=>{const names=await caches.keys();return names.some(n=>n.startsWith('today-v'));},{timeout:10000,polling:50});
   // The completed install has cached every public shell dependency before offline use.
   await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;if(r.installing)await new Promise(resolve=>r.installing.addEventListener('statechange',function(){if(this.state==='activated')resolve();}));});
   await page.setOfflineMode(true);await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.body.hasAttribute('data-booting')&&performance.getEntriesByName('today:interactive').length,{timeout:15000,polling:50});
   assert.equal(await page.evaluate(()=>!!window.__hudRan||!!document.getElementById('nl-badge-frame')),false);
   assert.equal(await page.$eval('#errorIndicator',n=>n.dataset.count),'0');assert.deepEqual(errors,[]);
  }
  await context.close();
 }
 console.log('✓ Netlify script policy: deployment origins, build hooks, control, blocked fetch/execution, lazy panels, poem headers and offline shell');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
