// Causal controls for missing fonts, day boundaries and effective browser state.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import puppeteer from 'puppeteer-core';
import { waitForFonts, installFixtureClock, browserState } from './browser-fixture.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const index=await readFile(join(root,'index.html'),'utf8');
const faces=[...index.matchAll(/@font-face\s*\{[^}]+\}/g)].map(match=>match[0]).join('\n');
const server=createServer(async(req,res)=>{
  try {
    const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    res.setHeader('Content-Type',path==='/'?'text/html':extname(path)==='.woff2'?'font/woff2':'application/octet-stream');
    res.end(path==='/'?`<!doctype html><style>${faces} body{font-family:'DM Mono'} @media(hover:hover){:root{--native-hover:yes}}</style><body>Fictional fixture</body>`:await readFile(join(root,path)));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'new',args:['--no-first-run','--disable-extensions']});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  let missing=true;
  page.on('request',request=>missing&&request.url().endsWith('.woff2')?request.abort():request.continue());
  const url=`http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);
  // document.fonts.ready resolves even after every font has failed: the old
  // readiness check therefore silently measured fallback fonts.
  assert.equal(await page.evaluate(async()=>{await document.fonts.ready;return true;}),true);
  await assert.rejects(waitForFonts(page),/Fixture fonts failed to load/);
  missing=false;await page.reload();
  assert.ok((await waitForFonts(page)).every(face=>face.loaded));
  console.log('  ✓ missing-font control fails; all six real font faces must load before layout checks');

  const epoch=Date.UTC(2026,9,28,12);
  const evidence=[];
  for(const timezone of ['UTC','Pacific/Kiritimati','America/Los_Angeles']) {
    const fixture=await browser.newPage();await fixture.emulateTimezone(timezone);
    await installFixtureClock(fixture,epoch);await fixture.goto(url);await waitForFonts(fixture);
    const started=await fixture.evaluate(()=>Date.now());
    await fixture.waitForFunction(at=>Date.now()>at+25,{},started);
    const state=await browserState(fixture);evidence.push(state);
    assert.ok(Math.abs(Date.parse(state.now)-epoch)<15000,'the fixture clock does not depend on the host date');
    const dates=await fixture.evaluate(()=>({constructed:+new Date(),now:Date.now(),explicit:+new Date('2020-01-01T00:00:00Z'),called:Date()}));
    assert.ok(Math.abs(dates.constructed-dates.now)<10);assert.equal(dates.explicit,Date.UTC(2020,0,1));assert.equal(typeof dates.called,'string');
    const cssHover=await fixture.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--native-hover').trim()==='yes');
    assert.equal(cssHover,state.input['(hover: hover)'],'record native CSS/JS input agreement');
    await fixture.close();
  }
  await mkdir(join(root,'.context/ci-test-results'),{recursive:true});
  await writeFile(join(root,'.context/ci-test-results/browser-environment.json'),JSON.stringify({
    browser:await browser.version(),node:process.version,platform:process.platform,timezone:process.env.TZ||'host default',
    policy:'Native input recorded here; Focus explicitly maps JS and CSS hardware predicates per page. Functional clocks may be fictional; benchmark clocks remain real.',
    pages:evidence,
  },null,2)+'\n');
  console.log('  ✓ advancing fictional clock across three timezones; native input/font/viewport evidence retained');
} finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
