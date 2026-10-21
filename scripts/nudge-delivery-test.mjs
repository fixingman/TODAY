// Real startup + UI/wake integration. Never calls checkDayNudge, _onWake,
// _setMemoryReady or renderInfoStats to manufacture delivery. Fictional input only.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LINE = 'Choosing a library book leaves the choice of what comes next with you.';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://fixture').pathname);
    res.setHeader('Content-Type', MIME[extname(path)] || 'text/html');
    res.end(await readFile(join(ROOT, path === '/' ? 'index.html' : path)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;

async function fixture(mobile, { hour = 9, seed = {}, expectRequests = 1 } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  await page.setViewport(mobile
    ? { width:390, height:844, isMobile:true, hasTouch:true }
    : { width:1200, height:900 });
  await page.emulateMediaFeatures([{ name:'prefers-reduced-motion', value:'reduce' }]);
  await page.evaluateOnNewDocument(({ hour, seed }) => {
    const NativeDate = Date;
    let now = Number(sessionStorage.getItem('delivery_fixture_now')) || new NativeDate(2026, 9, 18, hour, 0).getTime();
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    };
    window.__advance = ms => { now += ms; sessionStorage.setItem('delivery_fixture_now', String(now)); };
    // Observe the real post-sync startup hook; never invoke it to manufacture readiness.
    let loadDone;
    Object.defineProperty(window, '_onAppLoadDone', {
      configurable: true,
      get: () => loadDone,
      set: fn => { loadDone = (...args) => { window.__initialSyncSettled = true; return fn(...args); }; },
    });
    // Retain accepted cache/spoken/dismissal state across an actual reload.
    if (!localStorage.getItem('delivery_fixture_seeded')) {
      localStorage.clear();
      localStorage.setItem('delivery_fixture_seeded', '1');
      localStorage.setItem('splash_shown_at', String(now));
      localStorage.setItem('today_manual', JSON.stringify([{ id:'manual_' + (now - 4 * 86400000), text:'Choose a library book' }]));
      localStorage.setItem('today_done', '[]');
      localStorage.setItem('today_ai_provider', 'claude');
      localStorage.setItem('today_ai_key_claude', 'fictional-offline-key');
      for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
    }
    const nativeTimeout = window.setTimeout.bind(window);
    const nativeClear = window.clearTimeout.bind(window);
    const caps = new Map();
    // Control the 5s display deadline, not arbitrary polling/sleeps or request order.
    window.setTimeout = (fn, ms, ...args) => {
      if (ms !== 5000) return nativeTimeout(fn, ms, ...args);
      const id = nativeTimeout(() => {}, 60000);
      caps.set(id, () => fn(...args));
      return id;
    };
    window.clearTimeout = id => { caps.delete(id); nativeClear(id); };
    window.__expireDisplayWait = () => {
      if (!caps.size) throw Error('No display deadline scheduled');
      for (const [id, fn] of [...caps]) { caps.delete(id); nativeClear(id); fn(); }
    };
    window.__dailyRequests = [];
    const realFetch = window.fetch.bind(window);
    window.fetch = (url, options) => {
      if (!String(url).includes('/.netlify/functions/ai-assist')) return realFetch(url, options);
      const body = JSON.parse(options.body);
      if (body.surface !== 'daily-nudge') return Promise.resolve({ ok:true, json:async () => ({ content:'none' }) });
      return new Promise((resolve, reject) => {
        window.__dailyRequests.push({ body, resolve });
        options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once:true });
      });
    };
    window.__reply = text => {
      const request = window.__dailyRequests.at(-1);
      if (!request) throw Error('No real startup request');
      request.resolve({ ok:true, json:async () => ({ content:text }) });
    };
    window.__replyHeaders = () => window.__dailyRequests.at(-1).resolve({ ok:true,
      json:() => new Promise(resolve => { window.__replyBody = text => resolve({ content:text }); }) });
  }, { hour, seed });
  await page.goto(base, { waitUntil:'load' });
  await page.waitForFunction(count => _appReady && window.__initialSyncSettled
    && window.__dailyRequests.length === count, { timeout: 5000 }, expectRequests);
  return { context, page, errors };
}

async function state(page) {
  return page.evaluate(() => {
    const date = _localISO();
    const strip = document.getElementById('dayNudge');
    const about = document.getElementById('todayNudgeBlock');
    return { text:strip.querySelector('.nudge-text')?.textContent || '',
      shown:strip.classList.contains('show'), visible:strip.classList.contains('visible'),
      about:about.textContent, aboutShown:about.style.display !== 'none',
      cached:localStorage.getItem('day_nudge_ai_' + date),
      spoken:appMemory.spokenLines.filter(line => line.surface === 'morning nudge' && line.date === date).map(line => line.text),
      calls:window.__dailyRequests.length,
      feedback:!!document.querySelector('#dayNudgeReact [data-react="landed"]') };
  });
}
// The two homes of today's line never disagree once nothing is mid-read:
// a visible AI strip line is the About line, and a visible strip under a shown About line matches it.
function agree(st, when) {
  if (st.visible && st.feedback) assert.ok(st.aboutShown && st.about.includes(st.text), `About shows the strip's AI line ${when}`);
  if (st.visible && st.aboutShown) assert.ok(st.about.includes(st.text), `strip and About show the same line ${when}`);
  if (!st.aboutShown && st.visible) assert.equal(st.feedback, false, `no AI strip line without About ${when}`);
}
async function resolve(page) {
  await page.evaluate(line => window.__reply(line), LINE);
  await page.waitForFunction(line => localStorage.getItem('day_nudge_ai_' + _localISO()) === line, {}, LINE);
}
async function wake(page, kind) {
  await page.evaluate(kind => {
    window.__advance(1000); // outside the real wake debounce, not a direct app call
    if (kind === 'focus') window.dispatchEvent(new Event('focus'));
    else {
      Object.defineProperty(document, 'visibilityState', { configurable:true, get:() => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable:true, get:() => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    }
  }, kind);
}

try {
  browser = await puppeteer.launch({ executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'new', args:['--no-first-run', '--disable-extensions'] });
  const QUIET_LINE = 'A library book has waited 4 days. A page might be enough to get you reading.';
  // This useful orientation was rejected solely for lacking a contrast keyword.
  for (const mobile of [false, true]) {
    const { context, page, errors } = await fixture(mobile, { hour: 0 });
    try {
      assert.ok(await page.evaluate(() => window.__dailyRequests[0].body.messages[0].content.includes('4d old')),
        'the reading’s waiting duration is supported by the fictional task facts');
      await page.evaluate(line => window.__reply(line), QUIET_LINE);
      await page.waitForFunction(() => Today.use('nudge').generationAudit().status !== 'started', { timeout: 5000 });
      assert.equal((await state(page)).cached, QUIET_LINE,
        'the old word-pattern veto must not discard this ordinary reading: ' + JSON.stringify(await page.evaluate(() => Today.use('nudge').generationAudit())));
      await page.click('#infoBtn');
      const accepted = await state(page);
      assert.equal(accepted.text, QUIET_LINE);
      assert.deepEqual(accepted.spoken, [QUIET_LINE]);
      assert.equal(accepted.calls, 1, 'ordinary prose needs one request, not another rewrite loop');
      assert.equal(accepted.feedback, true);
      agree(accepted, 'ordinary midnight reading');
      assert.deepEqual(errors, []);
      console.log(`  ✓ ${mobile ? 'mobile' : 'desktop'} midnight: a quiet reading needs no contrast keyword`);
    } finally { await context.close(); }
  }
  for (const mobile of [false, true]) {
    for (const scenario of ['resume', 'last-slot', 'quota', 'grounding', 'noon', 'dismissed-fallback',
      'dismissed-ai', 'cached', 'unsafe-recovery', 'prior-day']) {
      const legacy = { schema: 1, date: scenario === 'prior-day' ? '2026-10-17' : '2026-10-18',
        attempts: scenario === 'quota' ? 3 : scenario === 'last-slot' ? 2 : 1,
        status: scenario === 'grounding' ? 'rejected-grounding' : 'rejected-recap',
        terminal: true, retryAt: 0, lengthRepair: true, events: [] };
      const seed = { today_nudge_generation_v1: JSON.stringify(legacy) };
      const cached = ['cached', 'dismissed-ai'].includes(scenario);
      if (cached) seed['day_nudge_ai_2026-10-18'] = LINE;
      const dismissed = scenario.startsWith('dismissed');
      if (dismissed) seed['day_nudge_dismissed_2026-10-18'] = '1';
      const blocked = ['quota', 'grounding', 'noon'].includes(scenario) || cached;
      const { context, page, errors } = await fixture(mobile,
        { hour: scenario === 'noon' ? 12 : 0, seed, expectRequests: blocked ? 0 : 1 });
      try {
        if (!blocked) {
          const line = scenario === 'unsafe-recovery' ? "You're the kind of person who avoids obligations." : QUIET_LINE;
          await page.evaluate(line => window.__reply(line), line);
          const status = scenario === 'unsafe-recovery' ? 'rejected-grounding' : 'accepted';
          await page.waitForFunction(status => Today.use('nudge').generationAudit().status === status, {}, status);
          const audit = await page.evaluate(() => Today.use('nudge').generationAudit());
          assert.equal(audit.attempts, scenario === 'prior-day' ? 1 : legacy.attempts + 1, 'recovery never resets the daily budget');
          assert.equal(audit.events.filter(e => e.status === 'recap-filter-removed').length,
            scenario === 'prior-day' ? 0 : 1, 'only a same-day legacy recap is reopened');
          if (scenario === 'unsafe-recovery') {
            assert.equal((await state(page)).cached, null, 'grounding still rejects an unsafe recovery');
            assert.deepEqual((await state(page)).spoken, []);
          } else {
            await page.click('#infoBtn');
            const accepted = await state(page);
            assert.equal(accepted.cached, QUIET_LINE);
            assert.deepEqual(accepted.spoken, [QUIET_LINE]);
            assert.equal(accepted.visible, !dismissed, 'fallback dismissal permits About recovery without reopening the strip');
            assert.ok(accepted.about.includes(QUIET_LINE));
            agree(accepted, 'legacy recap recovery');
          }
        } else {
          const audit = await page.evaluate(() => Today.use('nudge').generationAudit());
          assert.equal(audit.attempts, legacy.attempts);
          assert.equal((await state(page)).cached, cached ? LINE : null);
        }
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => _appReady && window.__initialSyncSettled);
        assert.equal((await state(page)).calls, 0, 'reload cannot bypass quota, a hard rejection, accepted text or real dismissal');
        await wake(page, mobile ? 'visibility' : 'focus');
        assert.equal((await state(page)).calls, 0, 'wake never creates another recovery request');
        assert.deepEqual(errors, []);
        console.log(`  ✓ ${mobile ? 'mobile' : 'desktop'} legacy recap / ${scenario}`);
      } finally { await context.close(); }
    }
  }
  // Exercise the real wake/day cleanup path, including a restart after midnight.
  for (const mobile of [false, true]) {
    const { context, page, errors } = await fixture(mobile, { hour: 23, expectRequests: 0 });
    try {
      await page.evaluate(() => window.__advance(3600000));
      await wake(page, 'visibility');
      await page.waitForFunction(() => window.__dailyRequests.length === 1);
      await page.evaluate(line => window.__reply(line), QUIET_LINE);
      await page.waitForFunction(line => localStorage.getItem('day_nudge_ai_2026-10-19') === line, {}, QUIET_LINE);
      await page.click('#infoBtn');
      agree(await state(page), 'natural midnight rollover');
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => _appReady && window.__initialSyncSettled);
      assert.equal((await state(page)).text, QUIET_LINE);
      assert.equal((await state(page)).calls, 0);
      assert.deepEqual(errors, []);
      console.log(`  ✓ ${mobile ? 'mobile' : 'desktop'} natural midnight rollover and restart reuse one daily line`);
    } finally { await context.close(); }
  }
  for (const mobile of [false, true]) {
    const device = mobile ? 'mobile' : 'desktop';
    for (const scenario of ['fast', 'late', 'body-late', 'repair', 'late-touched', 'dismissed', 'noon']) {
      const { context, page, errors } = await fixture(mobile);
      try {
        assert.equal((await state(page)).shown, false, 'startup waits for AI instead of immediately painting counts');
        if (scenario !== 'fast') {
          if (scenario === 'body-late') {
            await page.evaluate(() => window.__replyHeaders());
            await page.waitForFunction(() => typeof window.__replyBody === 'function');
            assert.equal((await state(page)).cached, null, 'headers alone are not an accepted reading');
          }
          if (scenario === 'repair') {
            await page.evaluate(() => window.__reply(Array(31).fill('word').join(' ')));
            await page.waitForFunction(() => window.__dailyRequests.length === 2);
            assert.equal((await state(page)).cached, null, 'overlong draft is never a delivered reading');
            assert.equal((await state(page)).shown, false, 'shortening shares the original display deadline');
          }
          await page.evaluate(() => window.__expireDisplayWait());
          await page.waitForFunction(() => document.getElementById('dayNudge').classList.contains('visible'));
          const fallback = await state(page);
          assert.match(fallback.text, /still here from yesterday/);
          assert.equal(fallback.feedback, false, 'fallback must not acquire AI vote controls');
          if (scenario === 'dismissed') await page.click('#dayNudge');
          // A press on the strip (without dismissing) means the person may be reading it.
          if (scenario === 'late-touched') await page.$eval('#dayNudge', el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles:true })));
          await page.click('#infoBtn');
          if (scenario === 'noon') await page.evaluate(() => window.__advance(3 * 60 * 60 * 1000));
          if (scenario === 'body-late') {
            await page.evaluate(line => window.__replyBody(line), LINE);
            await page.waitForFunction(line => localStorage.getItem('day_nudge_ai_' + _localISO()) === line, {}, LINE);
          } else await resolve(page);
          await page.waitForFunction(line => document.getElementById('todayNudgeBlock').textContent.includes(line), {}, LINE);
          const swaps = ['late', 'body-late', 'repair'].includes(scenario);
          if (swaps) await page.waitForFunction(line => document.querySelector('#dayNudge .nudge-text')?.textContent === line, {}, LINE);
          const late = await state(page);
          if (swaps) {
            // Option B (Oct 19): an untouched default is replaced once by the late answer.
            assert.equal(late.text, LINE, 'a late answer replaces the untouched default once');
            assert.equal(late.feedback, true, 'the swapped line carries AI vote controls');
            agree(late, 'after the gentle swap');
          } else assert.equal(late.text, fallback.text, 'a touched, dismissed or after-noon default is never swapped');
          assert.equal(late.aboutShown, true);
          assert.deepEqual(late.spoken, [LINE]);
          // Delivery readout: a tap on About's "Today" label shows this device's content-free audit.
          await page.click('#todayNudgeBlock .week-label');
          const readout = await page.$eval('#todayNudgeBlock .nudge-audit', el => el.textContent);
          assert.match(readout, /asked/, 'readout names the request');
          assert.match(readout, /default \d+\.\ds/, 'readout times the default');
          if (swaps) assert.match(readout, /swapped/, 'readout records the swap');
          if (scenario === 'late-touched') assert.match(readout, /strip touched/, 'readout records why it kept the default');
          assert.ok(!readout.includes('library book'), 'readout never contains the line');
          await page.click('#todayNudgeBlock .week-label');
          assert.equal(await page.$('#todayNudgeBlock .nudge-audit'), null, 'a second tap hides the readout');
          const canUpgrade = ['late', 'body-late', 'repair', 'late-touched'].includes(scenario);
          if (canUpgrade) {
            await page.click('#infoBtn');
            const returned = await state(page);
            // Closing About hands its line to an undismissed fallback strip (Oct 18 decision).
            assert.equal(returned.text, LINE, 'closing About upgrades the undismissed fallback strip');
            agree(returned, 'after About close');
          }
          await wake(page, mobile ? 'visibility' : 'focus');
          if (canUpgrade) {
            await page.waitForFunction(line => document.querySelector('#dayNudge .nudge-text')?.textContent === line, {}, LINE);
            const upgraded = await state(page);
            assert.equal(upgraded.visible, true);
            assert.equal(upgraded.feedback, true);
            assert.equal(upgraded.calls, scenario === 'repair' ? 2 : 1, 'wake adopts the cache, never regenerates');
            assert.deepEqual(upgraded.spoken, [LINE], 'real wake must not duplicate the spoken record');
            await page.click('#infoBtn');
            await page.click('#todayNudgeBlock .week-summary');
            await page.waitForFunction(() => document.querySelector('#todayNudgeBlock .nudge-react')?.classList.contains('open'));
            await page.$eval('#todayNudgeBlock .nudge-react', async el => {
              await Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {})));
            });
            await page.click('#todayNudgeBlock [data-react="landed"]');
            assert.equal(await page.$eval('#dayNudgeReact [data-react="landed"]', el => el.getAttribute('aria-pressed')), 'true',
              'voting in About must reach the strip after a real wake upgrade');
          } else {
            assert.equal((await state(page)).visible, false, 'dismissal/noon wins even with a valid About line');
          }
        } else {
          await resolve(page);
          await page.waitForFunction(line => document.querySelector('#dayNudge .nudge-text')?.textContent === line, {}, LINE);
          await page.click('#infoBtn');
          const accepted = await state(page);
          assert.equal(accepted.visible, true);
          assert.ok(accepted.about.includes(LINE));
          assert.deepEqual(accepted.spoken, [LINE]);
          assert.equal(accepted.feedback, true);
          await page.reload({ waitUntil:'load' });
          await page.waitForFunction(() => _appReady);
          await page.waitForFunction(line => document.querySelector('#dayNudge .nudge-text')?.textContent === line, {}, LINE);
          await page.click('#infoBtn');
          const reloaded = await state(page);
          assert.equal(reloaded.calls, 0, 'a cached cold open must not make another AI request');
          assert.ok(reloaded.about.includes(LINE));
          assert.deepEqual(reloaded.spoken, [LINE], 'reload must not duplicate the private spoken record');
        }
        assert.deepEqual(errors, []);
        console.log(`  ✓ ${device} real startup / ${scenario}: strip, About, cache and spoken record`);
      } finally { await context.close(); }
    }
  }
  // Agreement after real list/sync events (desktop + touch): one staleness rule for both homes.
  const OTHER = 'The quiet hour suits the plant watering more than the book.';
  for (const mobile of [false, true]) {
    const device = mobile ? 'mobile' : 'desktop';
    for (const scenario of ['complete-named', 'complete-unrelated', 'sync-line', 'sync-done']) {
      const { context, page, errors } = await fixture(mobile);
      try {
        await page.evaluate(() => Today.use('task-actions').addTaskFromText('Water the plants'));
        if (scenario === 'sync-line') {
          await page.evaluate(() => window.__expireDisplayWait());
          await page.waitForFunction(() => document.getElementById('dayNudge').classList.contains('visible'));
          await page.evaluate((line, iso) => mergeRemoteData({ manual_tasks: manualTasks, done_ids: [...doneIds], deleted_ids: [],
            unchecked_ids: [], checked_ids: [], soon_tasks: [], past_tasks: [], habits: [], day_nudge_ai: line, day_nudge_ai_date: iso }), OTHER, '2026-10-18');
          await page.waitForFunction(line => document.querySelector('#dayNudge .nudge-text')?.textContent === line, {}, OTHER);
        } else {
          await resolve(page);
          await page.waitForFunction(line => document.querySelector('#dayNudge .nudge-text')?.textContent === line, {}, LINE);
        }
        const id = await page.evaluate(text => manualTasks.find(t => t.text.startsWith(text))?.id,
          scenario === 'complete-unrelated' ? 'Water' : 'Choose');
        if (scenario === 'complete-named' || scenario === 'complete-unrelated') {
          await page.click(`button.task-check[data-taskid="${id}"]`);
        }
        if (scenario === 'sync-done') {
          await page.evaluate((id, iso) => mergeRemoteData({ manual_tasks: manualTasks, done_ids: [...doneIds, id], deleted_ids: [],
            unchecked_ids: [], checked_ids: [{ id, date: iso }], soon_tasks: [], past_tasks: [], habits: [],
            memory: { recentCompletedTasks: [{ text: 'Choose a library book', date: iso }] } }), id, '2026-10-18');
        }
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        await page.click('#infoBtn');
        const open = await state(page);
        const lineNamesDone = scenario === 'complete-named' || scenario === 'sync-done';
        if (lineNamesDone) {
          assert.ok(!open.text.includes('library book') || !open.visible, `${scenario}: a line naming a completed task leaves the strip`);
          assert.ok(!open.about.includes(LINE), `${scenario}: and leaves About too`);
        } else if (scenario === 'complete-unrelated') {
          assert.equal(open.text, LINE, 'an unrelated completion keeps the strip line');
          assert.ok(open.about.includes(LINE), 'and the About line');
        } else assert.ok(open.about.includes(OTHER), 'a synced line reaches About');
        agree(open, `${scenario} with About open`);
        await page.click('#infoBtn');
        agree(await state(page), `${scenario} after About close`);
        await wake(page, mobile ? 'visibility' : 'focus');
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
        agree(await state(page), `${scenario} after returning to the app`);
        assert.deepEqual(errors, []);
        console.log(`  ✓ ${device} agreement / ${scenario}: strip and About show the same line`);
      } finally { await context.close(); }
    }
  }
  console.log('\nNudge delivery integration passed (46 lifecycle cases; mocked AI, no live data).');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
