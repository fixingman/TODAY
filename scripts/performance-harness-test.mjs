// Real-browser checks of the benchmark's input boundary and original-run attribution.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';

const source = await readFile(new URL('./performance-test.mjs', import.meta.url), 'utf8');
const helper = name => {
  const start = source.indexOf('async function ' + name + '(');
  const end = source.indexOf('\nasync function ', start + 1);
  assert.ok(start >= 0 && end > start, name);
  return vm.runInNewContext('(' + source.slice(start, end).trim() + ')');
};
const installObservers = helper('installObservers');
const readPageMetrics = helper('readPageMetrics');
const armInteraction = helper('armInteraction');
const interactionStart = source.indexOf('async function interactionRun(');
const interactionEnd = source.indexOf('\nfunction timingSummary(',interactionStart);
assert.ok(interactionStart>=0 && interactionEnd>interactionStart);
const interactionRun=vm.runInNewContext('('+source.slice(interactionStart,interactionEnd).trim()+')',{
  installObservers,readPageMetrics,armInteraction,
  // The tiny fixture has no TODAY splash/readiness marks; input and observation are real.
  waitForReady:async()=>{},
});
const budgets = JSON.parse(await readFile(new URL('./performance-budgets.json', import.meta.url), 'utf8'));
const html = `<!doctype html><html><body>
  <main id="main-app"><input id="newTask"><ul id="manualList"><li class="task"><span class="task-text">Fictional focus task</span></li></ul></main>
  <div class="focus-timer"></div>
  <script>
    function block(ms) { const until = performance.now() + ms; while (performance.now() < until) {} }
    function startupBlock() { block(280); document.body.appendChild(document.createElement('hr')); window.fixtureReady = true; }
    window.runStartupBlock = () => setTimeout(startupBlock, 0);
    document.getElementById('newTask').addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      const row = document.createElement('li'); row.className = 'task';
      row.textContent = event.target.value; document.getElementById('manualList').appendChild(row);
    });
    // Must remain inside the measured input, even though it precedes the click handler.
    document.addEventListener('pointerdown', function coldAudioWarmup() { block(340); }, { once: true });
    document.querySelector('.task-text').addEventListener('click', () => {
      document.getElementById('main-app').classList.add('focusing');
      document.querySelector('.focus-timer').classList.add('open');
    });
  </script></body></html>`;
const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(html); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-first-run', '--disable-extensions', '--no-sandbox'] });
  for (const unsupported of [false, true]) {
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      if (unsupported) await page.evaluateOnNewDocument(() => {
        Object.defineProperty(PerformanceObserver, 'supportedEntryTypes', {
          value: PerformanceObserver.supportedEntryTypes.filter(type => type !== 'long-animation-frame'),
        });
      });
      await installObservers(page);
      await page.goto('http://127.0.0.1:' + server.address().port + '/fixture.html?not-exported=1');
      // Schedule the deliberate blocker after first paint, matching the retained
      // nightly ordering rather than racing the fixture's initial paint.
      await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);
      await page.evaluate(() => window.runStartupBlock());
      await page.waitForFunction(() => window.fixtureReady);
      await page.waitForFunction(() => window.__todayPerformance.longTasks.some(task => task.duration >= 250), { timeout: 5000 });
      if (!unsupported) await page.waitForFunction(() => window.__todayPerformance.longAnimationFrames
        .some(frame => frame.scripts.some(script => script.sourceFunctionName === 'startupBlock')), { timeout: 5000 });
      const startup = await readPageMetrics(page);
      assert.ok(startup.tbt > budgets.timing['cold.tbt'], 'a real startup block still breaches the original gate: ' + JSON.stringify(startup));
      assert.equal(startup.supportsLongAnimationFrames, !unsupported);
      if (!unsupported) {
        const scripts = startup.longAnimationFrames.flatMap(frame => frame.scripts);
        assert.ok(scripts.some(script => script.sourceFunctionName === 'startupBlock' && script.duration >= 250), 'original blocking callback is attributed');
        assert.ok(scripts.every(script => !script.sourceURL.includes('?')), 'source query values stay out of evidence');
      }

      await page.focus('#newTask'); await page.type('#newTask', 'A fictional added task');
      await armInteraction(page, 'add', 'A fictional added task');
      // Deliberately delay automation; no user input has occurred yet.
      await new Promise(resolve => setTimeout(resolve, 220));
      await page.keyboard.press('Enter');
      const add = await page.evaluate(() => window.__todayInteraction);
      assert.ok(add.automationWait >= 200, 'automation delay is recorded separately');
      assert.ok(add.duration < add.automationWait, 'pre-input waiting is excluded from user response time');

      await armInteraction(page, 'focus');
      await page.click('#manualList .task .task-text');
      const focus = await page.evaluate(() => window.__todayInteraction);
      assert.ok(focus.duration > budgets.timing['interactions.enterFocus'], 'pointerdown warmup remains inside the unchanged focus ceiling');
      if (!unsupported) await page.waitForFunction(() => window.__todayPerformance.longAnimationFrames
        .some(frame => frame.scripts.some(script => script.sourceFunctionName === 'coldAudioWarmup')), { timeout: 5000 });
      const after = await readPageMetrics(page);
      if (!unsupported) assert.ok(after.longAnimationFrames.flatMap(frame => frame.scripts)
        .some(script => script.sourceFunctionName === 'coldAudioWarmup' && script.duration >= 300), 'original input blocking is attributed');
      else assert.deepEqual(after.longAnimationFrames, [], 'unsupported attribution leaves timing guards active');
    } finally { await context.close(); }
  }
  const wired=await interactionRun(browser,'http://127.0.0.1:'+server.address().port+'/fixture.html','wired');
  assert.equal(wired.diagnostics.supportsLongAnimationFrames,true,'the real interaction entry point installs its observers');
  assert.ok(wired.diagnostics.longAnimationFrames.flatMap(frame=>frame.scripts)
    .some(script=>script.sourceFunctionName==='coldAudioWarmup'),'the measured input path retains its own blocking attribution');
  console.log('  ✓ actual input starts timing; pre-input automation delay is separate; pointerdown blocking still fails the existing ceiling');
  console.log('  ✓ original startup/input callbacks are attributed; unsupported attribution preserves timing guards; source queries are excluded');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
