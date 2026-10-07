// TODAY — nudge module regression test
//
// Tests: checkDayNudge (cached AI, noon hidden, 5s AI wait + fallback, fallback-upgrade,
//        stale-done keep-until-replaced, dismiss, already-dismissed, offline/no-key),
//        bounded transient recovery, categorical diagnostics, About, midnight,
//        checkVersionNudge, checkSundayNudge, checkHabitNudge, static wiring.
//
// Run from repo root:
//   node scripts/nudge-test.mjs --pre-extraction   # pre-extraction baseline
//   node scripts/nudge-test.mjs                    # current regression checks

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PRE_EXTRACTION = process.argv.includes('--pre-extraction');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, resolve));
const URL_BASE = `http://localhost:${server.address().port}`;

// Today in YYYY-MM-DD local time — must match _localISO() in the page.
const TODAY = new Date().toLocaleDateString('en-CA');

let browser;
const ok = message => console.log('  ✓ ' + message);
const fail = async (message, detail) => {
  console.error('✗ FAIL — ' + message);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};
const expectAll = async (label, result) => {
  const failed = Object.entries(result).filter(([, value]) => !value);
  if (failed.length) await fail(label, result);
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

// Default seed: 1 undone task (so checkDayNudge has content), hour=9 (morning),
// and dismiss flag seeded so init()'s checkDayNudge(false) exits early, keeping
// _nudgeRendered=false. skipDismiss=true lets init() render the nudge (test 6).
async function openPage({ extraSeed, hourOverride = 9, skipDismiss = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(
    ({ today, extra, hour, skipDismiss }) => {
      Date.prototype.getHours = function() { return hour; };
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      localStorage.setItem('today_manual', JSON.stringify([
        { id: 'task_1', text: 'Write the tests' },
      ]));
      localStorage.setItem('today_done', JSON.stringify([]));
      localStorage.setItem('today_habits', JSON.stringify([
        { id: 'habit_a', name: 'Morning pages', archived: false },
      ]));
      if (!skipDismiss) localStorage.setItem('day_nudge_dismissed_' + today, '1');
      if (extra) Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v));
    },
    { today: TODAY, extra: extraSeed || null, hour: hourOverride, skipDismiss }
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof checkDayNudge === 'function' &&
          typeof checkVersionNudge === 'function' &&
          typeof checkSundayNudge === 'function' &&
          typeof checkHabitNudge === 'function' &&
          !!document.getElementById('dayNudge'),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.dropboxAutoSave    = () => {};
    window.dropboxBackup      = () => {};
    window._haptic            = () => {};
    window._breathe           = () => {};
    window._aiAnalyzeTask     = () => {};
    window._saveMemory        = () => {};
    window.playCompleteSound  = () => {};
    window.fireEmberDrift     = () => {};
    window._flashAccentGlow   = () => {};
    window.renderMeetingNames = () => {};
  });
  return { page, errors };
}

try {
  if (PRE_EXTRACTION) {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    await expectAll('pre-extraction baseline', {
      checkDayNudgeInline:    indexSrc.includes('function checkDayNudge('),
      checkHabitNudgeInline:  indexSrc.includes('function checkHabitNudge('),
      noNudgeModule:          !existsSync(join(ROOT, 'assets/nudge.js')),
    });
    ok('pre-extraction: checkDayNudge/checkHabitNudge inline; assets/nudge.js not yet created');
    console.log('\nNudge tests passed (pre-extraction baseline, 1 check).');
  } else {
    // 1. Cached AI text → shows immediately when cache is valid.
    {
      const { page, errors } = await openPage({
        extraSeed: { ['day_nudge_ai_' + TODAY]: "Today's insight." },
      });
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        checkDayNudge();
        await new Promise(r => setTimeout(r, 100)); // wait for requestAnimationFrame
        const nudge = document.getElementById('dayNudge');
        return {
          nudgeVisible: !!(nudge && nudge.classList.contains('visible')),
          hasAIText:    !!(nudge && nudge.textContent.includes("Today's insight.")),
        };
      });
      await expectAll('cached AI nudge', { ...result, noErrors: errors.length === 0 });
      ok("checkDayNudge: cached AI text shows immediately");
      await page.close();
    }

    // 2. Noon+ → nudge stays hidden (hour gate in checkDayNudge).
    {
      const { page, errors } = await openPage({ hourOverride: 13 });
      const result = await page.evaluate(() => {
        const nudge = document.getElementById('dayNudge');
        return {
          notVisible: !nudge.classList.contains('visible'),
          notShown:   !nudge.classList.contains('show'),
        };
      });
      await expectAll('noon+ nudge hidden', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: nudge stays hidden after noon');
      await page.close();
    }

    // 2b. Cold-start callers cannot generate before Dropbox has merged spokenLines.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key');
        localStorage.setItem('today_ai_provider', 'claude');
        let calls = 0;
        window.fetch = async () => {
          calls++;
          return { ok: true, json: async () => ({ content: 'A synced morning line.' }) };
        };
        checkDayNudge._setMemoryReady(false);
        checkDayNudge();
        await new Promise(r => setTimeout(r, 50));
        const beforeReady = calls;
        checkDayNudge._setMemoryReady();
        checkDayNudge();
        await new Promise(r => setTimeout(r, 100));
        return { heldBeforeMerge: beforeReady === 0, generatedAfterMerge: calls === 1 };
      });
      await expectAll('nudge memory readiness', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: generation waits until synced spokenLines are ready');
      await page.close();
    }

    // 3. Slow AI (2s): nothing shows while waiting, then the AI line is the first and only
    //    text — the plain count never appears (it used to win a 1s race every new day).
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        const nudge = document.getElementById('dayNudge');
        const seen = [];
        new MutationObserver(() => seen.push(nudge.textContent)).observe(nudge, { childList: true, subtree: true, characterData: true });
        window.fetch = () => new Promise(r =>
          setTimeout(() => r({ ok: true, json: async () => ({ content: 'slow AI response' }) }), 2000)
        );
        checkDayNudge();
        await new Promise(r => setTimeout(r, 1200));
        const hiddenWhileWaiting = !nudge.classList.contains('show') && !nudge.textContent.includes('still here from yesterday');
        await new Promise(r => setTimeout(r, 1100));
        return {
          hiddenWhileWaiting,
          aiShown: nudge.classList.contains('visible') && nudge.textContent.includes('slow AI response'),
          fallbackNeverRendered: !seen.some(t => t.includes('still here from yesterday')),
        };
      });
      await expectAll('slow AI waits instead of showing the fallback', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: a 2s AI line is shown first; the fallback never renders');
      await page.close();
    }

    // 3b. AI past the wait cap → fallback at the cap; AI failure → fallback right away.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        const nudge = document.getElementById('dayNudge');
        window.fetch = () => new Promise(r =>
          setTimeout(() => r({ ok: true, json: async () => ({ content: 'too late' }) }), 8000)
        );
        checkDayNudge();
        await new Promise(r => setTimeout(r, 4500));
        const stillWaitingAt4500 = !nudge.classList.contains('show');
        await new Promise(r => setTimeout(r, 1000));
        return {
          stillWaitingAt4500,
          fallbackAtCap: nudge.classList.contains('show') && nudge.textContent.includes('still here from yesterday'),
        };
      });
      const failed = await (await openPage()).page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        window.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
        checkDayNudge();
        await new Promise(r => setTimeout(r, 300));
        const nudge = document.getElementById('dayNudge');
        return { failureFallsBackImmediately: nudge.classList.contains('show') && nudge.textContent.includes('still here from yesterday') };
      });
      await expectAll('wait cap and failure', { ...result, ...failed, noErrors: errors.length === 0 });
      ok('checkDayNudge: fallback at the 5s cap when AI is slower; immediately when AI fails');
      await page.close();
    }

    // 3c. Task-reading feedback is not a pool-kind verdict, and a miss does not
    //     silence the morning: recent "not really" lines steer the next one instead.
    //     The model sees only its own earlier wording, never the private reason.
    //     A bare count/age recap falls back to the rule-based line; a real choice survives.
    //     These are synthetic lines: personal voted prose stays out of the repo.
    {
      const steered = await openPage();
      const steeredResult = await steered.page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        const ago = days => { const d = new Date(); d.setDate(d.getDate() - days); return _localISO(d); };
        appMemory.spokenLines = [
          { surface: 'morning nudge', date: ago(1), text: 'Synthetic miss one about waiting.', reaction: 'missed', reactionReason: 'already_knew' },
          { surface: 'morning nudge', date: ago(2), text: 'Synthetic miss two about the list.', reaction: 'missed' },
          { surface: 'morning nudge', date: ago(3), text: 'Synthetic miss three about Soon.', reaction: 'missed' },
          { surface: 'morning nudge', date: ago(4), text: 'Synthetic miss four, too old to send.', reaction: 'missed' },
          { surface: 'morning nudge', date: ago(5), text: 'Synthetic landed line.', reaction: 'landed' },
          { surface: 'morning nudge', date: ago(1), kind: 'letgo-reason', text: 'Synthetic pool miss.', reaction: 'missed' },
        ];
        const bodies = [];
        window.fetch = async (url, opts) => { bodies.push(opts && opts.body ? JSON.parse(opts.body) : {});
          return { ok: true, json: async () => ({ content: 'The appointment has a morning window; check it before other tasks.' }) }; };
        checkDayNudge();
        await new Promise(r => setTimeout(r, 300));
        // Only the task-reading request; the pool request carries its own line history.
        const taskReq = bodies.map(b => (b.messages || []).map(m => m.content).join('\n'))
          .find(t => t.includes('Morning check-in')) || '';
        const missBlock = (taskReq.split('marked "not really":\n')[1] || '').split('\n\n')[0];
        const sent = taskReq;
        return {
          stillSpeaks: document.getElementById('dayNudge').textContent.includes('morning window'),
          missesSent: ['one', 'two', 'three'].every(n => missBlock.includes('Synthetic miss ' + n)),
          onlyThreeRecent: !missBlock.includes('too old to send'),
          landedNotSentAsMiss: !missBlock.includes('Synthetic landed line'),
          poolMissNotMixedIn: !missBlock.includes('Synthetic pool miss'),
          reasonNeverSent: !/already_knew|already knew/.test(sent),
          principleSent: sent.includes('do not repeat their angle'),
        };
      });
      await expectAll('misses steer the next morning line', { ...steeredResult, noErrors: steered.errors.length === 0 });
      await steered.page.close();

      const bare = await openPage();
      const bareResult = await bare.page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        window.fetch = async () => ({ ok: true, json: async () => ({ content: 'You have 5 tasks today, including "Plan the trip" which has been waiting for 4 days.' }) });
        checkDayNudge();
        await new Promise(r => setTimeout(r, 250));
        const nudge = document.getElementById('dayNudge');
        return {
          bareLineFallsBack: nudge.classList.contains('show') && nudge.textContent.includes('still here from yesterday'),
          bareLineNotCached: !localStorage.getItem('day_nudge_ai_' + _localISO()),
          bareLineNotSpoken: !(appMemory.spokenLines || []).some(l => l.surface === 'morning nudge' && l.date === _localISO()),
        };
      });
      await expectAll('bare inventory falls back to the count line', { ...bareResult, noErrors: bare.errors.length === 0 });
      await bare.page.close();

      const contrasted = await openPage();
      const contrastedResult = await contrasted.page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        window.fetch = async () => ({ ok: true, json: async () => ({ content: 'The appointment has waited 4 days, but this morning is its last booking window.' }) });
        checkDayNudge();
        await new Promise(r => setTimeout(r, 250));
        return { ageWithUsefulTurnKept: document.getElementById('dayNudge').textContent.includes('booking window') };
      });
      await expectAll('age with a meaningful turn survives', { ...contrastedResult, noErrors: contrasted.errors.length === 0 });
      await contrasted.page.close();
      ok('task-reading: "not really" lines steer the next line (wording only, never the reason); bare recaps fall back to the count line');
    }

    // Recovery is a lifecycle, not just an immediate offline fallback. No real
    // credentials or personal lines: the clock advances only in the test page.
    for (const failure of ['network', 'timeout', '503', '429', '408', '401', 'unreadable', 'empty', 'length', 'grounding', 'recap']) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async failure => {
        const audit = () => Today.use('nudge').generationAudit();
        const expected = { network: 'network-error', timeout: 'request-timeout',
          '503': 'http-error', '429': 'http-error', '408': 'http-error', '401': 'http-error',
          unreadable: 'unreadable-response', empty: 'empty-response', length: 'rejected-length',
          grounding: 'rejected-grounding', recap: 'rejected-recap' }[failure];
        const retryable = ['network', 'timeout', '503', '429', '408'].includes(failure);
        const wait = ms => new Promise(r => setTimeout(r, ms));
        let now = Date.now();
        Date.now = () => now;
        // Exercise AbortSignal cleanup without spending 12 real seconds.
        const realTimeout = window.setTimeout;
        window.setTimeout = (fn, ms, ...args) => realTimeout(fn, ms === 12000 ? 30 : ms, ...args);
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'SECRET_TEST_KEY');
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        appMemory.taskOutcomes = [];
        let calls = 0;
        let recover = false;
        const good = 'The appointment has a morning window; check it before other tasks.';
        window.fetch = async (url, opts) => {
          calls++;
          if (recover) return { ok: true, json: async () => ({ content: good }) };
          if (failure === 'network') throw new TypeError('Private error detail: SECRET_ERROR');
          if (failure === 'timeout') return new Promise((resolve, reject) =>
            opts.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }));
          if (/^\d+$/.test(failure)) return { ok: false, status: Number(failure) };
          return { ok: true, json: async () => {
            if (failure === 'unreadable') throw new SyntaxError('SECRET_BAD_RESPONSE');
            return { content: failure === 'empty' ? '' : failure === 'length' ? Array(31).fill('word').join(' ')
              : failure === 'grounding' ? "You're the kind of person who avoids obligations."
              : 'You have 5 tasks waiting for 4 days.' };
          } };
        };
        checkDayNudge._setMemoryReady();
        checkDayNudge();
        checkDayNudge(); // no parallel request
        await wait(90);
        const first = audit();
        const initialFallback = document.getElementById('dayNudge').textContent;
        Today.use('about').renderInfoStats();
        const aboutEmpty = document.getElementById('todayNudgeBlock').style.display === 'none';
        recover = true;
        checkDayNudge();
        await wait(40);
        const noImmediateRetry = calls === 1;
        now += 30001;
        window.dispatchEvent(new Event('online'));
        await wait(90);
        const final = audit();
        const beforeNaturalCheck = document.getElementById('dayNudge').textContent;
        Today.use('about').renderInfoStats();
        const aboutRecovered = document.getElementById('todayNudgeBlock').textContent.includes(good);
        checkDayNudge(); // a genuinely later natural check may upgrade the fallback
        const raw = localStorage.getItem('today_nudge_generation_v1');
        const detached = audit();
        detached.events.length = 0;
        return {
          distinguished: first.status === expected,
          httpStatusRecorded: !/^\d+$/.test(failure) || first.events.some(e => e.httpStatus === Number(failure)),
          onlyOneInitialRequest: first.attempts === 1,
          noImmediateRetry,
          emptyAboutExplained: aboutEmpty,
          recoveryPolicy: retryable ? calls === 2 && final.status === 'accepted' && aboutRecovered
            && localStorage.getItem('day_nudge_ai_' + _localISO()) === good : calls === 1 && final.status === expected && final.attempts === 1,
          noMidReadReplacement: beforeNaturalCheck === initialFallback,
          laterUpgrade: !retryable || document.getElementById('dayNudge').textContent.includes(good),
          diagnosticsDetached: audit().events.length > 0,
          diagnosticsPrivate: ![good, 'SECRET_TEST_KEY', 'SECRET_ERROR', 'SECRET_BAD_RESPONSE', 'Write the tests'].some(s => raw.includes(s)),
        };
      }, failure);
      await expectAll('nudge recovery ' + failure, { ...result, noErrors: errors.length === 0 });
      await page.close();
    }
    ok('generation audit distinguishes failures/rejections; only transient failures recover without a mid-read swap');

    // Retry quota/backoff survive reloads; reopening is not a way to spam AI.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'test-key');
        appMemory.taskOutcomes = [];
        let now = Date.now(), calls = 0;
        Date.now = () => now;
        window.fetch = async () => { calls++; throw new TypeError('Failed to fetch'); };
        const audit = () => Today.use('nudge').generationAudit();
        const delays = [];
        for (let i = 0; i < 3; i++) {
          checkDayNudge();
          await new Promise(r => setTimeout(r, 50));
          delays.push(audit().retryAt - now);
          now = audit().retryAt + 1;
        }
        checkDayNudge();
        window.dispatchEvent(new Event('online'));
        await new Promise(r => setTimeout(r, 50));
        return { budget: calls === 3 && audit().attempts === 3,
          backoff: delays[0] === 30000 && delays[1] === 120000,
          saved: localStorage.getItem('today_nudge_generation_v1') };
      });
      await expectAll('retry quota', { budget: result.budget, backoff: result.backoff, noErrors: errors.length === 0 });
      await page.close();
      const reopened = await openPage({ extraSeed: { today_nudge_generation_v1: result.saved } });
      const persisted = await reopened.page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'test-key');
        let calls = 0;
        window.fetch = async () => { calls++; return { ok: true, json: async () => ({ content: 'Should not fetch.' }) }; };
        checkDayNudge();
        await new Promise(r => setTimeout(r, 50));
        return { staysBounded: calls === 0 && Today.use('nudge').generationAudit().attempts === 3,
          fallbackSurvivesReload: document.getElementById('dayNudge').textContent.includes('still here from yesterday') };
      });
      await expectAll('retry quota after reload', persisted);
      await reopened.page.close();
      ok('generation: 30s/2m backoff and three-attempt device-day cap survive reopening');
    }

    // Recovery must not bypass either a dismissal or the morning cutoff.
    for (const gate of ['dismissed', 'afternoon']) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async gate => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'test-key');
        let calls = 0;
        window.fetch = async () => { calls++; throw new TypeError('Failed to fetch'); };
        checkDayNudge();
        await new Promise(r => setTimeout(r, 50));
        Date.now = () => Today.use('nudge').generationAudit().retryAt + 1;
        if (gate === 'dismissed') document.getElementById('dayNudge').click();
        else Date.prototype.getHours = () => 13;
        window.dispatchEvent(new Event('online'));
        checkDayNudge();
        await new Promise(r => setTimeout(r, 50));
        return { noRetry: calls === 1, staysHidden: !document.getElementById('dayNudge').classList.contains('visible') };
      }, gate);
      await expectAll('recovery respects ' + gate, { ...result, noErrors: errors.length === 0 });
      await page.close();
    }

    // Offline preflight spends no request budget; online recovers normally.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'test-key');
        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
        let calls = 0;
        window.fetch = async () => { calls++; return { ok: true, json: async () => ({ content: 'A grounded line after reconnect.' }) }; };
        checkDayNudge();
        const first = Today.use('nudge').generationAudit();
        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
        window.dispatchEvent(new Event('online'));
        await new Promise(r => setTimeout(r, 50));
        return { offlineVisible: first.status === 'offline', noWastedBudget: first.attempts === 0,
          recovered: calls === 1 && Today.use('nudge').generationAudit().status === 'accepted' };
      });
      await expectAll('offline then online', { ...result, noErrors: errors.length === 0 });
      await page.close();
    }

    // A request spanning midnight cannot write today's prose under yesterday's
    // key, speak for today's tasks, or unlock a new day's in-flight request.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        const RealDate = Date;
        let now = new RealDate(); now.setHours(9, 0, 0, 0); let instant = now.getTime();
        window.Date = class extends RealDate {
          constructor(...args) { super(...(args.length ? args : [instant])); }
          static now() { return instant; }
        };
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'test-key');
        appMemory.taskOutcomes = [];
        const yesterday = _localISO();
        const pending = [];
        window.fetch = () => new Promise(resolve => pending.push(resolve));
        checkDayNudge();
        await new Promise(r => setTimeout(r, 20));
        now.setDate(now.getDate() + 1); instant = now.getTime();
        _nudgeOnNewDay();
        checkDayNudge();
        await new Promise(r => setTimeout(r, 20));
        pending[0]({ ok: true, json: async () => ({ content: 'Yesterday response must be ignored.' }) });
        await new Promise(r => setTimeout(r, 50));
        checkDayNudge();
        const isolated = pending.length === 2 && !localStorage.getItem('day_nudge_ai_' + yesterday)
          && !document.getElementById('dayNudge').textContent.includes('Yesterday response');
        pending[1]({ ok: true, json: async () => ({ content: 'Today has its own grounded line.' }) });
        await new Promise(r => setTimeout(r, 50));
        Today.use('about').renderInfoStats();
        return { isolated, newDayBudget: Today.use('nudge').generationAudit().attempts === 1,
          todaySaved: localStorage.getItem('day_nudge_ai_' + _localISO()) === 'Today has its own grounded line.',
          aboutToday: document.getElementById('todayNudgeBlock').textContent.includes('Today has its own grounded line.'),
          noOldSpoken: !(appMemory.spokenLines || []).some(l => l.text === 'Yesterday response must be ignored.') };
      });
      await expectAll('late request across midnight', { ...result, noErrors: errors.length === 0 });
      await page.close();
    }
    ok('generation: dismissal/noon, offline reconnect, and midnight request isolation remain intact');

    // 4. Fallback upgrade: AI slower than the cap → fallback shows; a later call with the
    //    cached AI line replaces it (the v2.42.3 backstop).
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        window.fetch = () => new Promise(r =>
          setTimeout(() => r({ ok: true, json: async () => ({ content: 'AI upgraded line.' }) }), 5600)
        );
        checkDayNudge(); // fallback at 5s, AI cache written at ~5.6s
        await new Promise(r => setTimeout(r, 6000));
        checkDayNudge(); // _nudgeIsFallback=true + cache available → shows AI
        await new Promise(r => setTimeout(r, 100));
        const nudge = document.getElementById('dayNudge');
        return {
          nudgeVisible:    !!(nudge && nudge.classList.contains('visible')),
          hasUpgradedText: !!(nudge && nudge.textContent.includes('AI upgraded line.')),
        };
      });
      await expectAll('fallback upgrade', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: fallback upgrades to AI text on second call when cache available');
      await page.close();
    }

    // 4b. Day rollover on a live page: yesterday's line leaves at once instead of
    //     staying up for the whole wait while today's line is written.
    {
      const { page, errors } = await openPage({ extraSeed: { ['day_nudge_ai_' + TODAY]: "Yesterday's line." } });
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        checkDayNudge();
        await new Promise(r => setTimeout(r, 100));
        const nudge = document.getElementById('dayNudge');
        const shownBefore = nudge.classList.contains('show');
        window._nudgeOnNewDay();
        return { shownBefore, hiddenOnNewDay: !nudge.classList.contains('show') && !nudge.classList.contains('visible') };
      });
      await expectAll('rollover hides yesterday', { ...result, noErrors: errors.length === 0 });
      ok('_nudgeOnNewDay: yesterday\'s line is hidden while today\'s is written');
      await page.close();
    }

    // 5. Stale-done: a line written before more tasks were done is skipped in the strip
    //    but kept in storage (About + Dropbox read the same key) until a fresh line
    //    actually arrives. A failed retry must not blank it; a successful one replaces it.
    {
      const staleSeed = {
        ['day_nudge_ai_' + TODAY]:            'stale nudge text',
        ['day_nudge_done_count_' + TODAY]:    '0',
        'today_done':   JSON.stringify(['task_1']),
        'today_manual': JSON.stringify([
          { id: 'task_1', text: 'Write the tests' },
          { id: 'task_2', text: 'Another task' },
        ]),
      };
      const { page, errors } = await openPage({ extraSeed: staleSeed });
      const result = await page.evaluate(async () => {
        const key = 'day_nudge_ai_' + _localISO();
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        checkDayNudge(false); // no-generate call site
        const nudge = document.getElementById('dayNudge');
        const keptWithoutGenerate = localStorage.getItem(key) === 'stale nudge text';
        const staleNotShown = !nudge.textContent.includes('stale nudge text');
        localStorage.setItem('today_ai_key_claude', 'test-key');
        localStorage.setItem('today_ai_provider', 'claude');
        window.fetch = async () => ({ ok: false, json: async () => ({}) });
        checkDayNudge(); // retry fails → fallback shows, stored line must survive
        await new Promise(r => setTimeout(r, 150));
        const keptAfterFailedRetry = localStorage.getItem(key) === 'stale nudge text';
        const fallbackShown = nudge.textContent.includes('still here from yesterday');
        Today.use('about').renderInfoStats();
        const block = document.getElementById('todayNudgeBlock');
        const aboutStillShowsLine = block.style.display !== 'none'
          && block.textContent.includes('stale nudge text');
        return { keptWithoutGenerate, staleNotShown, keptAfterFailedRetry, fallbackShown, aboutStillShowsLine };
      });
      await expectAll('stale-done keeps line on failed retry', { ...result, noErrors: errors.length === 0 });
      await page.close();

      const second = await openPage({ extraSeed: staleSeed });
      const replaced = await second.page.evaluate(async () => {
        const key = 'day_nudge_ai_' + _localISO();
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key');
        localStorage.setItem('today_ai_provider', 'claude');
        window.fetch = async () => ({ ok: true, json: async () => ({ content: 'Fresh line.' }) });
        checkDayNudge();
        await new Promise(r => setTimeout(r, 150));
        return {
          replacedOnSuccess: localStorage.getItem(key) === 'Fresh line.',
          restamped: localStorage.getItem('day_nudge_done_count_' + _localISO()) === String(doneIds.size),
          freshShown: document.getElementById('dayNudge').textContent.includes('Fresh line.'),
        };
      });
      await expectAll('stale-done replaced on success', { ...replaced, noErrors: second.errors.length === 0 });
      ok('checkDayNudge: stale line skipped in strip, kept for About until a fresh line replaces it');
      await second.page.close();
    }

    // 6. Dismiss: clicking nudge hides it and writes the dismiss key.
    {
      const { page, errors } = await openPage({
        skipDismiss: true,
        extraSeed: { ['day_nudge_ai_' + TODAY]: 'Tap to dismiss this.' },
      });
      await page.waitForFunction(
        () => document.getElementById('dayNudge')?.classList.contains('visible'),
        { timeout: 5000 }
      );
      await page.click('#dayNudge');
      await new Promise(r => setTimeout(r, 450));
      const result = await page.evaluate(() => {
        const nudge = document.getElementById('dayNudge');
        return {
          dismissed:  !!localStorage.getItem('day_nudge_dismissed_' + _localISO()),
          notVisible: !!(nudge && !nudge.classList.contains('visible')),
        };
      });
      await expectAll('dismiss nudge', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: clicking nudge hides it and writes dismiss key');
      await page.close();
    }

    // 6b. 12e: when today's line was spoken (a spokenLines entry exists), the first
    //     tap reveals the two states instead of dismissing; choosing one records the
    //     reaction on the line and dismisses the strip.
    {
      // No cache at init, so init() renders nothing; the line is recorded through
      // the app's own recorder (a partial today_memory seed would strip the other
      // slots' defaults), then checkDayNudge renders from cache as a spoken line.
      const { page, errors } = await openPage({ skipDismiss: true });
      await page.evaluate(() => {
        localStorage.setItem('day_nudge_ai_' + _localISO(), 'A spoken line.');
        _memoryRecordSpokenLine('morning nudge', 'A spoken line.', 'letgo-return');
        checkDayNudge(false);
      });
      await page.waitForFunction(
        () => document.getElementById('dayNudge')?.classList.contains('visible'),
        { timeout: 5000 }
      );
      await page.click('#dayNudge');
      await new Promise(r => setTimeout(r, 120));
      const afterFirst = await page.evaluate(() => ({
        stillVisible:  document.getElementById('dayNudge').classList.contains('visible'),
        revealed:      document.getElementById('dayNudgeReact').classList.contains('open'),
        notDismissed:  !localStorage.getItem('day_nudge_dismissed_' + _localISO()),
      }));
      await page.click('#dayNudgeReact [data-react="missed"]');
      const afterVote = await page.evaluate(() => ({
        voteSavedImmediately: appMemory.spokenLines.find(l => l.surface === 'morning nudge')?.reaction === 'missed',
        reasonOptional: document.querySelector('#dayNudgeReact .nudge-reason')?.hidden === false
          && !localStorage.getItem('day_nudge_dismissed_' + _localISO()),
      }));
      await page.click('#dayNudgeReact [data-reason="not_useful"]');
      await new Promise(r => setTimeout(r, 450));
      const afterChoice = await page.evaluate(() => ({
        recorded:  appMemory.spokenLines.find(l => l.surface === 'morning nudge')?.reaction === 'missed',
        reasonSaved: appMemory.spokenLines.find(l => l.surface === 'morning nudge')?.reactionReason === 'not_useful',
        dismissed: !!localStorage.getItem('day_nudge_dismissed_' + _localISO()),
        hidden:    !document.getElementById('dayNudge').classList.contains('visible')
                && !document.getElementById('dayNudgeReact').classList.contains('open'),
      }));
      await expectAll('nudge reaction', { ...afterFirst, ...afterVote, ...afterChoice, noErrors: errors.length === 0 });
      ok('checkDayNudge: not really saves immediately, offers an optional reason, then dismisses');
      await page.close();
    }

    // The follow-up is never required: Done closes the strip and keeps the vote.
    {
      const { page, errors } = await openPage({ skipDismiss: true });
      await page.evaluate(() => {
        localStorage.setItem('day_nudge_ai_' + _localISO(), 'Another spoken line.');
        _memoryRecordSpokenLine('morning nudge', 'Another spoken line.', 'soon-pullback');
        checkDayNudge(false);
      });
      await page.waitForFunction(() => document.getElementById('dayNudge')?.classList.contains('visible'));
      await page.click('#dayNudge');
      await page.click('#dayNudgeReact [data-react="missed"]');
      await page.click('#dayNudgeReact .nudge-reason-skip');
      const result = await page.evaluate(() => {
        const line = appMemory.spokenLines.find(l => l.surface === 'morning nudge');
        return {
          voteKeptWithoutReason: line?.reaction === 'missed' && !line.reactionReason,
          dismissed: !!localStorage.getItem('day_nudge_dismissed_' + _localISO()),
        };
      });
      await expectAll('optional reason skip', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: Done skips the optional reason without undoing the vote');
      await page.close();
    }

    // About and the task-list strip can be mounted at once. A vote in About
    // must update the already-rendered strip, which checkDayNudge deliberately
    // does not re-render after showing an AI line.
    {
      const { page, errors } = await openPage({ skipDismiss: true });
      const result = await page.evaluate(() => {
        const date = _localISO();
        const text = 'A shared morning line.';
        localStorage.setItem('day_nudge_ai_' + date, text);
        _memoryRecordSpokenLine('morning nudge', text, 'soon-pullback');
        checkDayNudge(false);
        const strip = document.getElementById('dayNudgeReact');
        const before = strip.querySelector('[data-react="landed"]')?.getAttribute('aria-pressed') === 'false';
        Today.use('about').renderInfoStats();
        const about = document.getElementById('todayNudgeBlock');
        about.querySelector('[data-react="landed"]').click();
        const landedInStrip = strip.querySelector('[data-react="landed"]')?.getAttribute('aria-pressed') === 'true';
        about.querySelector('[data-react="missed"]').click();
        about.querySelector('[data-reason="already_knew"]').click();
        const missedInStrip = strip.querySelector('[data-react="missed"]')?.getAttribute('aria-pressed') === 'true';
        const reasonInStrip = strip.querySelector('[data-reason="already_knew"]')?.getAttribute('aria-pressed') === 'true';
        // Model a later Dropbox merge: it replaces the in-memory record without
        // a local reaction event. Opening the strip must still read that record.
        const line = _memoryLineFor('morning nudge', date);
        line.reaction = 'landed';
        delete line.reactionReason;
        document.getElementById('dayNudge').click();
        const latestOnOpen = strip.querySelector('[data-react="landed"]')?.getAttribute('aria-pressed') === 'true'
          && strip.querySelector('.nudge-reason')?.hidden === true;
        return { before, landedInStrip, missedInStrip, reasonInStrip, latestOnOpen };
      });
      await expectAll('About vote updates task-list nudge', { ...result, noErrors: errors.length === 0 });
      ok('About: changing a daily vote updates the already-rendered task-list controls');
      await page.close();
    }

    // 7. Already dismissed → nudge stays hidden on subsequent checkDayNudge() calls.
    {
      const { page, errors } = await openPage({
        extraSeed: { ['day_nudge_ai_' + TODAY]: 'Should not show.' },
        // dismiss key seeded by default
      });
      const result = await page.evaluate(() => {
        checkDayNudge(); // dismiss flag set → early exit
        const nudge = document.getElementById('dayNudge');
        return {
          notVisible: !!(nudge && !nudge.classList.contains('visible')),
        };
      });
      await expectAll('already dismissed', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: dismissed nudge stays hidden');
      await page.close();
    }

    // 7b. 12c Phase 3 — the pool track. Selection happens in code, so the payload
    //     must carry evidence + the code-owned insight and nothing else. A leak of the task list or
    //     the _memoryForAI dump would silently restore the 12b architecture the pool
    //     exists to replace.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        const D = 86400000, now = Date.now();
        const iso = d => new Date(d).toISOString().slice(0, 10);
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.removeItem('day_nudge_ai_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');

        // Eligibility: focus-vs-obligation reaches the morning only when an
        // obligation-framed task is on today's list.
        manualTasks.length = 0;
        manualTasks.push({ id: 'manual_' + (now - 9 * D), text: 'should book the dentist', focusSessions: 0 });
        doneIds.clear();
        appMemory.spokenLines = [1, 2, 3].map(days => {
          const date = new Date(); date.setDate(date.getDate() - days);
          return { surface: 'morning nudge', date: _localISO(date), text: 'An earlier task-reading line', reaction: 'missed' };
        });
        appMemory.taskOutcomes = [
          { id: 'a', date: iso(now - 4 * D), outcome: 'done', obligation: false, focusSessions: 2 },
          { id: 'b', date: iso(now - 6 * D), outcome: 'done', obligation: false, focusSessions: 2 },
          { id: 'c', date: iso(now - 8 * D), outcome: 'done', obligation: false, focusSessions: 1 },
          { id: 'd', date: iso(now - 5 * D), outcome: 'letgo', obligation: true, focusSessions: 0 },
          { id: 'e', date: iso(now - 7 * D), outcome: 'letgo', obligation: true, focusSessions: 0 },
        ];

        const calls = [];
        const real = window.fetch;
        window.fetch = (u, o) => {
          if (String(u).includes('ai-assist') && o && o.body) {
            calls.push(JSON.parse(o.body));
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'Every focus session this month went to something you chose.' }) });
          }
          return real.apply(window, arguments);
        };

        _nudgeOnNewDay();
        checkDayNudge();
        await new Promise(r => setTimeout(r, 400));
        window.fetch = real;

        const body = calls[0] ? calls[0].messages[0].content : '';
        const spoken = appMemory.spokenLines.find(l => l.date === _localISO() && l.kind) || {};
        return {
          onlyOneCall: calls.length === 1,
          carriesEvidenceAndInsight: body.includes('Evidence:') && body.includes('Supported insight:'),
          noTaskListLeak: !body.includes('in the order the user arranged'),
          noMemoryDumpLeak: !body.includes('About you'),
          payloadStaysSmall: body.length < 800,
          kindRecorded: spoken.kind === 'focus-vs-obligation',
          poolUnaffectedByTaskPathMisses: calls.length === 1,
        };
      });
      await expectAll('pool track payload', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: pool candidate sends evidence+supported insight only, records its kind');
      await page.close();
    }

    // 7c. The three ways the pool declines. Each must fall through to the task-reading
    //     path rather than going silent — the nudge has a job beyond observation, and
    //     the morning is the signature beat.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        const D = 86400000, now = Date.now();
        const iso = d => new Date(d).toISOString().slice(0, 10);
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        // Eligibility: focus-vs-obligation reaches the morning only when an
        // obligation-framed task is on today's list.
        manualTasks.length = 0;
        manualTasks.push({ id: 'manual_' + (now - 9 * D), text: 'should book the dentist', focusSessions: 0 });
        doneIds.clear();
        const outcomes = [
          { id: 'a', date: iso(now - 4 * D), outcome: 'done', obligation: false, focusSessions: 2 },
          { id: 'b', date: iso(now - 6 * D), outcome: 'done', obligation: false, focusSessions: 2 },
          { id: 'c', date: iso(now - 8 * D), outcome: 'done', obligation: false, focusSessions: 1 },
          { id: 'd', date: iso(now - 5 * D), outcome: 'letgo', obligation: true, focusSessions: 0 },
          { id: 'e', date: iso(now - 7 * D), outcome: 'letgo', obligation: true, focusSessions: 0 },
        ];
        const real = window.fetch;

        async function run({ spoken, outs, reply }) {
          localStorage.removeItem('day_nudge_dismissed_' + _localISO());
          localStorage.removeItem('day_nudge_ai_' + _localISO());
          appMemory.spokenLines = spoken;
          appMemory.taskOutcomes = outs;
          const calls = [];
          window.fetch = (u, o) => {
            if (String(u).includes('ai-assist') && o && o.body) {
              calls.push(JSON.parse(o.body));
              return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: reply }) });
            }
            return real.apply(window, arguments);
          };
          _nudgeOnNewDay();
          checkDayNudge();
          await new Promise(r => setTimeout(r, 400));
          return calls;
        }
        const isPool = c => c && c.messages[0].content.startsWith('Evidence:');

        // cooldown: the kind was already said today
        const cooled = await run({
          spoken: [{ surface: 'morning nudge', date: iso(now), text: 'said earlier', kind: 'focus-vs-obligation' }],
          outs: outcomes, reply: 'unused',
        });
        // abstention: nothing to say
        const empty = await run({ spoken: [], outs: [], reply: 'unused' });
        // guard: pool fires but the model returns an identity claim
        const guarded = await run({
          spoken: [], outs: outcomes,
          reply: "You're the kind of person who avoids obligations.",
        });
        window.fetch = real;

        return {
          cooldownSkipsPool: cooled.length >= 1 && !isPool(cooled[0]),
          abstentionFallsThrough: empty.length >= 1 && !isPool(empty[0]),
          guardRejectsIdentityClaim: guarded.length === 2 && isPool(guarded[0]) && !isPool(guarded[1]),
          rejectedLineNotRecorded: !(appMemory.spokenLines || []).some(l => /kind of person/.test(l.text || '')),
        };
      });
      await expectAll('pool declines', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: cooldown, abstention and guard rejection all fall through to the task path');
      await page.close();
    }

    // 7d. Eligibility wiring in the browser. focus-vs-obligation is a 30-day
    //     aggregate; it may reach the morning only when an obligation-framed task is
    //     on today's list. Same outcomes as 7b, but no such task → the task path.
    //     The unit test covers the function; this covers the flag computed from the
    //     real manualTasks, which is what decides whether the morning gets a month
    //     insight again.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        const D = 86400000, now = Date.now();
        const iso = d => new Date(d).toISOString().slice(0, 10);
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.removeItem('day_nudge_ai_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        manualTasks.length = 0;
        manualTasks.push({ id: 'manual_' + (now - 3 * D), text: 'finish the deck', focusSessions: 2 });
        appMemory.spokenLines = [];
        appMemory.taskOutcomes = [
          { id: 'a', date: iso(now - 4 * D), outcome: 'done',  obligation: false, focusSessions: 2 },
          { id: 'b', date: iso(now - 6 * D), outcome: 'done',  obligation: false, focusSessions: 2 },
          { id: 'c', date: iso(now - 8 * D), outcome: 'done',  obligation: false, focusSessions: 1 },
          { id: 'd', date: iso(now - 5 * D), outcome: 'letgo', obligation: true,  focusSessions: 0 },
          { id: 'e', date: iso(now - 7 * D), outcome: 'letgo', obligation: true,  focusSessions: 0 },
        ];
        const calls = [];
        const real = window.fetch;
        window.fetch = (u, o) => {
          if (String(u).includes('ai-assist') && o && o.body) {
            calls.push(JSON.parse(o.body));
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ content: 'a plain morning note' }) });
          }
          return real.apply(window, arguments);
        };
        _nudgeOnNewDay();
        checkDayNudge();
        await new Promise(r => setTimeout(r, 400));
        window.fetch = real;
        const isPool = c => c && c.messages[0].content.startsWith('Evidence:');
        return {
          poolSkipped:    calls.length >= 1 && !isPool(calls[0]),
          noKindRecorded: !(appMemory.spokenLines || []).some(l => l.kind),
        };
      });
      await expectAll('no obligation on list keeps the aggregate off the morning', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: focus-vs-obligation stays off the morning when no obligation-framed task is on the list');
      await page.close();
    }

    // 8. Offline → _fetchDayNudgeAI returns null immediately, fallback shows quickly.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        checkDayNudge();
        await new Promise(r => setTimeout(r, 200));
        const nudge = document.getElementById('dayNudge');
        return {
          nudgeVisible: !!(nudge && nudge.classList.contains('visible')),
        };
      });
      await expectAll('offline fallback', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: offline → rule-based fallback shows immediately');
      await page.close();
    }

    // 9. Version / Sunday / habit badge nudges — all three fire in one page.
    {
      const { page, errors } = await openPage({
        extraSeed: {
          'today_daily_history': JSON.stringify([{ date: '2026-08-16', done: 1 }]),
        },
      });
      const result = await page.evaluate(() => {
        const today = _localISO();

        // ── Version badge ──
        localStorage.setItem('today_seen_version', 'v0.0.0');
        checkVersionNudge();
        const versionBadge = !!document.getElementById('infoBtn')?.classList.contains('btn-icon-version');

        // ── Sunday badge; Monday no longer promises a separate weekly line ──
        document.getElementById('infoBtn')?.classList.remove('btn-icon-week');
        localStorage.removeItem('sunday_nudge_seen_' + today);
        Date.prototype.getDay = () => 0; // Sunday
        checkSundayNudge();
        const weekBadge = !!document.getElementById('infoBtn')?.classList.contains('btn-icon-week');
        const sundayAudit = !!localStorage.getItem('sunday_observation_audit_' + today);
        Date.prototype.getDay = () => 1; // Monday
        checkSundayNudge();
        const noMondayBadge = !document.getElementById('infoBtn')?.classList.contains('btn-icon-week');

        // ── Habit badge ──
        Date.prototype.getHours = () => 22; // Evening
        checkHabitNudge();
        const habitBadge = !!document.getElementById('habitsBtn')?.classList.contains('btn-icon-habits');

        return { versionBadge, weekBadge, sundayAudit, noMondayBadge, habitBadge };
      });
      await expectAll('badge nudges', { ...result, noErrors: errors.length === 0 });
      ok('checkVersionNudge / checkSundayNudge / checkHabitNudge: badges fire and Sunday captures its local audit');
      await page.close();
    }

    // 11. The wake repaint must not replay the strip's open motion. _forceRepaint
    //     toggles #main-app display, which restarts CSS animations from keyframe 0;
    //     the strip's padding/margin regrew on each pass and the list bobbed ~17px
    //     at 0.5 / 1.5 / 3 / 5 / 8 / 12s after every window focus on desktop PWA.
    {
      const { page, errors } = await openPage({ skipDismiss: true, extraSeed: {
        ['day_nudge_ai_' + TODAY]: 'A settled morning line for the repaint test.',
      } });
      const result = await page.evaluate(async () => {
        const el = document.getElementById('dayNudge');
        checkDayNudge(false);
        const shown = el.classList.contains('show');
        const openedWithMotion = el.getAnimations().length > 0;
        await new Promise(r => setTimeout(r, 700));
        const settled = el.offsetHeight;
        const app = document.getElementById('main-app');
        app.style.display = 'none'; void app.offsetHeight; app.style.display = '';
        const afterRepaint = el.offsetHeight;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return {
          shown,
          openedWithMotion,
          heightStableAcrossRepaint: settled > 0 && afterRepaint === settled && el.offsetHeight === settled,
          noCssAnimation: getComputedStyle(el).animationName === 'none',
        };
      });
      await expectAll('nudge survives wake repaint', { ...result, noErrors: errors.length === 0 });
      ok('morning strip opens once; the wake repaint display toggle does not replay it');
      await page.close();
    }

    // 10. Static wiring: script tag, startup order, 4 exports, functions removed, precached.
    {
      const indexSrc  = await readFile(join(ROOT, 'index.html'), 'utf8');
      const swSrc     = await readFile(join(ROOT, 'sw.js'), 'utf8');
      const nudgeSrc  = await readFile(join(ROOT, 'assets/nudge.js'), 'utf8');
      const dropboxSrc = await readFile(join(ROOT, 'assets/dropbox.js'), 'utf8');
      const startNudgeIdx  = indexSrc.indexOf('window._startNudge();');
      const startAssistIdx = indexSrc.indexOf('window._startAssistant();');
      await expectAll('nudge module wiring', {
        moduleLoad:           indexSrc.includes('<script src="/assets/nudge.js"></script>'),
        startupCall:          startNudgeIdx !== -1,
        beforeAssistant:      startNudgeIdx !== -1 && startAssistIdx !== -1 && startNudgeIdx < startAssistIdx,
        checkDayNudgeRemoved: !indexSrc.includes('function checkDayNudge('),
        checkHabitRemoved:    !indexSrc.includes('function checkHabitNudge('),
        moduleInit:           nudgeSrc.includes('window._startNudge = '),
        allExports:           ['checkDayNudge', 'checkVersionNudge', 'checkSundayNudge', 'checkHabitNudge']
                                .every(n => nudgeSrc.includes(`window.${n} = ${n};`)),
        memoryReadyHook:      nudgeSrc.includes('checkDayNudge._setMemoryReady ='),
        readyAfterSync:       dropboxSrc.includes("typeof checkDayNudge._setMemoryReady === 'function'"),
        precached:            swSrc.includes("'/assets/nudge.js'"),
      });
      ok('nudge module: 4 exports, functions removed from index.html, precached in sw.js');
    }

    console.log('\nNudge tests passed (including delivery recovery and diagnostics).');
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
