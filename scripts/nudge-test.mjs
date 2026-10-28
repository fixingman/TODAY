import { installFixtureClock } from './browser-fixture.mjs';
// TODAY — nudge module regression test
//
// Tests: checkDayNudge (cached AI, noon hidden, 5s AI wait + fallback, fallback-upgrade,
//        stale-done keep-until-replaced, dismiss, already-dismissed, offline/no-key),
//        scheduled bounded recovery, two-device dismissal/votes, diagnostics, About, midnight,
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

const FIXTURE_NOW = new Date(2026,9,28,12).getTime();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PRE_EXTRACTION = process.argv.includes('--pre-extraction');
const FEEDBACK_UNAVAILABLE = process.argv.includes('--missing-feedback-policy');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  if (FEEDBACK_UNAVAILABLE && path === '/assets/feedback-policy.js') { res.writeHead(404);res.end();return; }
  try {
    let body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, resolve));
const URL_BASE = `http://localhost:${server.address().port}`;

// Today in YYYY-MM-DD local time — must match _localISO() in the page.
const TODAY = new Date(FIXTURE_NOW).toLocaleDateString('en-CA');

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
// and dismiss flag seeded so init()'s checkDayNudge(false) cannot render,
// keeping _nudgeRendered=false. skipDismiss=true lets init() render the nudge.
async function openPage({ extraSeed, hourOverride = 9, skipDismiss = false, context = browser } = {}) {
  const page = await context.newPage();
  await installFixtureClock(page,FIXTURE_NOW);
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
    // State waits survive a busy/background renderer; fake Date.now must not move their deadline.
    const timeout = window.setTimeout.bind(window);
    window.__nudgeTestWait = async (predicate, label) => {
      const deadline = performance.now() + 5000;
      while (!predicate()) {
        if (performance.now() > deadline) throw new Error('Nudge fixture did not reach: ' + label
          + ' audit=' + JSON.stringify(Today.use('nudge').generationAudit())
          + ' calls=' + window.__calls + ' timers=' + window.__retries?.size);
        await new Promise(resolve => timeout(resolve, 20));
      }
    };
    window.__nudgeTestBackup  = window.dropboxBackup;
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
  // These injected-response races control their own request timing. Natural cold
  // helper loading and failure are covered by nudge-feedback-test's real startup.
  await page.evaluate(async () => { try { await import('/assets/feedback-policy.js'); } catch (_) {} });
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
        await window.__nudgeTestWait(() => document.getElementById('dayNudge').classList.contains('visible'), 'cached line painted');
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
    //     Ordinary readings do not need a contrast keyword to earn delivery.
    //     These are synthetic lines: personal voted prose stays out of the repo.
    {
      const steered = await openPage();
      const steeredResult = await steered.page.evaluate(async balanced => {
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
        await window.__nudgeTestWait(() => bodies.some(b => b.messages?.some(m => m.content.includes('Morning check-in'))) && document.getElementById('dayNudge').textContent.includes('morning window'), 'feedback-context delivery');
        // Only the task-reading request; the pool request carries its own line history.
        const taskReq = bodies.map(b => (b.messages || []).map(m => m.content).join('\n'))
          .find(t => t.includes('Morning check-in')) || '';
        const missBlock = (taskReq.split('marked "not really":\n')[1] || '').split('\n\n')[0];
        const sent = taskReq;
        return {
          stillSpeaks: document.getElementById('dayNudge').textContent.includes('morning window'),
          missesSent: (balanced ? ['one','two'] : ['one', 'two', 'three']).every(n => missBlock.includes('Synthetic miss ' + n)),
          capRespected: !balanced || !missBlock.includes('Synthetic miss three'),
          positiveLabel: !balanced || sent.includes('Recent morning lines the person marked "landed":\n- Synthetic landed line.'),
          onlyThreeRecent: !missBlock.includes('too old to send'),
          landedNotSentAsMiss: !missBlock.includes('Synthetic landed line'),
          poolMissNotMixedIn: !missBlock.includes('Synthetic pool miss'),
          reasonNeverSent: !/already_knew|already knew/.test(sent),
          principleSent: sent.includes('do not repeat their angle') && !sent.includes('A missed reading does not reject its task'),
        };
      }, !FEEDBACK_UNAVAILABLE);
      await expectAll('misses steer the next morning line', { ...steeredResult, noErrors: steered.errors.length === 0 });
      await steered.page.close();

      const quiet = await openPage();
      const quietResult = await quiet.page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key'); localStorage.setItem('today_ai_provider', 'claude');
        window.fetch = async () => ({ ok: true, json: async () => ({ content: '"Write the tests" has waited 4 days. A single failing case would give it a starting point.' }) });
        checkDayNudge();
        await new Promise(r => setTimeout(r, 250));
        const nudge = document.getElementById('dayNudge');
        return {
          readingDelivered: nudge.classList.contains('show') && nudge.textContent.includes('single failing case'),
          readingCached: localStorage.getItem('day_nudge_ai_' + _localISO())?.includes('single failing case'),
          readingSpoken: (appMemory.spokenLines || []).some(l => l.surface === 'morning nudge' && l.date === _localISO() && l.text.includes('single failing case')),
        };
      });
      await expectAll('ordinary reading survives without a contrast keyword', { ...quietResult, noErrors: quiet.errors.length === 0 });
      await quiet.page.close();

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
      ok('task-reading: "not really" lines steer the next line (wording only, never the reason); ordinary readings survive without a contrast keyword');
    }

    // 3d. Capture the ordinary facts and request boundary with fictional inputs.
    // These data/isolation checks do not assert model quality. No explicitly
    // constrained task is present, so even a connected Calendar remains absent.
    for (const calendarState of ['empty', 'stale', 'populated']) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async calendarState => {
        const date = _localISO(), now = Date.now(), D = 86400000;
        localStorage.removeItem('day_nudge_dismissed_' + date);
        localStorage.setItem('today_ai_key_claude', 'test-key');
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('calendar_refresh_token', 'fictional-calendar');
        manualTasks = [
          { id: 'manual_' + (now - 10 * D), text: 'Prepare snacks for Tuesday', focusSessions: 1 },
          { id: 'manual_' + (now - 11 * D), text: 'Compare rail passes', focusSessions: 0, revived: true },
          { id: 'manual_' + now, text: 'Submit permit before 17:00 today', focusSessions: 0 },
        ];
        trelloTasks = [{ id: 'card_proof', text: 'Review proof', due: date + 'T17:00:00Z' }];
        soonTasks = [{ id: 'manual_' + (now - 2 * D), text: 'Research replacement desk', zoneChangedAt: new Date(now - D).toISOString() }];
        doneIds.clear(); pastTasks = [];
        appMemory.taskOutcomes = [];
        appMemory.spokenLines = [];
        appMemory.preferences.peakHour = 12;
        appMemory.memory.procedural = [{ status: 'confirmed', text: 'Synthetic confirmed practical-task pattern.' }];
        appMemory.recentCompletedTasks = ['Fold blankets', 'Check library hours', 'Mend tote bag'].map(text => ({ text, date }));
        let calendarReads = 0;
        Today.define('calendar', { context() {
          calendarReads++;
          return calendarState === 'populated' ? [{ title: 'PRIVATE_CALENDAR_FIXTURE', start: now, end: now + D }] : [];
        }, connectionState() { calendarReads++; return calendarState === 'stale' ? 'unavailable' : 'connected'; } });
        const calls = [];
        window.fetch = async (url, opts) => {
          calls.push({ url: String(url), body: JSON.parse(opts.body) });
          return { ok: true, json: async () => ({ content: 'You brought this back from Soon; that choice is still yours.' }) };
        };
        checkDayNudge();
        await window.__nudgeTestWait(() => calls.length === 1, 'ordinary request captured');
        const req = calls[0]?.body || {}, body = req.messages?.[0]?.content || '';
        const instruction = body.split('\n\nThe person is starting their morning.')[1] || '';
        const facts = body.split('\n\nThe person is starting their morning.')[0];
        return {
          oneOrdinaryCall: calls.length === 1 && body.startsWith('Morning check-in.'),
          explicitDeadlineKeptWithItsTask: facts.includes('3. "Submit permit before 17:00 today"'),
          plannedDayKeptWithoutInventedDeadline: facts.includes('1. "Prepare snacks for Tuesday" (10d old, 1 focus session)'),
          unrelatedUntimedTaskKept: facts.includes('2. "Compare rail passes" (11d old, revived from past)'),
          cardDeadlineKeptWithItsCard: facts.includes('"Review proof" — due today'),
          personalContextPreserved: facts.includes('Synthetic confirmed practical-task pattern.')
            && facts.includes('around 12pm') && facts.includes('Fold blankets') && facts.includes('Research replacement desk'),
          companionFramePreserved: req.systemPrompt?.includes('a friend noticing, not a coach'),
          usefulnessRetained: instruction.includes('one thing worth saying') && instruction.includes('simple quiet morning note'),
          dailyThinkingRoutePreserved: req.surface === 'daily-nudge' && req.provider === 'claude'
            && !('thinking' in req) && !('model' in req),
          noCalendarIntegration: calendarReads === 0 && !body.includes('PRIVATE_CALENDAR_FIXTURE')
            && calls.every(c => c.url === '/.netlify/functions/ai-assist'),
          noWorkedExamples: !/for example|e\.g\.|example line/i.test(instruction),
        };
      }, calendarState);
      await expectAll('ordinary facts/request isolation with ' + calendarState + ' Calendar', { ...result, noErrors: errors.length === 0 });
      await page.close();
    }
    ok('ordinary request: task/card facts, rich context and daily AI route; unsupported tasks receive no Calendar input (3 states)');

    // 3e. The actual lazy policy feeds the actual daily writer. All data/provider
    // responses are fictional. Compare omitted-input payloads byte-for-byte,
    // then invalidate the task/Calendar while an enriched response is in flight.
    let ordinaryCalendarFixture;
    for (const scenario of ['empty', 'unrelated', 'stale', 'partial', 'disconnected', 'slow-read',
      'qualified', 'ignored', 'removed-during-read', 'edited', 'completed', 'forgotten', 'account-changed',
      'hidden', 'midnight', 'unsafe-text', 'malformed-text']) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async scenario => {
        // Restore real local-hour semantics for the evidence parser while fixing
        // the whole clock, not merely Date.getHours as the older fixtures do.
        const NativeDate = Date, date = _localISO();
        NativeDate.prototype.getHours = function() {
          return Number(this.toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false }));
        };
        let clock = +new NativeDate(date + 'T09:00:00');
        window.Date = class extends NativeDate {
          constructor(...args) { super(...(args.length ? args : [clock])); }
          static now() { return clock; }
        };
        const start = new Date(clock); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        const deadline = new Date(clock); deadline.setHours(15, 0, 0, 0);
        const task = { id: 'manual_' + (clock - 86400000), text: 'Review draft needs 45 uninterrupted minutes; send before 15:00.' };
        manualTasks = [task, { id: 'manual_' + clock, text: 'Choose a library book' }];
        soonTasks = []; pastTasks = []; trelloTasks = []; doneIds.clear();
        appMemory.taskOutcomes = []; appMemory.spokenLines = [];
        localStorage.removeItem('day_nudge_dismissed_' + date);
        localStorage.removeItem('day_nudge_ai_' + date);
        localStorage.setItem('today_ai_key_claude', 'test-key');
        localStorage.setItem('today_ai_provider', 'claude');
        if (scenario !== 'disconnected') localStorage.setItem('calendar_refresh_token', 'fictional-calendar');
        let snapshot = { status: 'complete', calendar: 'primary', connected: true, hidden: false, offline: false,
          epoch: 7, capturedAt: clock, windowStart: +start, windowEnd: +end,
          events: [{ start: clock, end: +deadline, title: 'PRIVATE_EVENT_FIXTURE',
            joinUrl: 'https://private-event.invalid', description: 'PRIVATE_DESCRIPTION_FIXTURE' }] };
        if (scenario === 'empty') snapshot.events = [];
        if (scenario === 'unrelated') snapshot.events = [{ start: +deadline + 60000, end: +deadline + 3600000 }];
        if (scenario === 'stale') snapshot.capturedAt -= 300001;
        if (scenario === 'partial') snapshot.status = 'partial';
        let reads = 0;
        Today.define('calendar', {
          refresh() {
            reads++;
            if (scenario === 'removed-during-read') manualTasks = manualTasks.filter(t => t.id !== task.id);
            return scenario === 'slow-read' ? new Promise(() => {}) : Promise.resolve(true);
          },
          timingSnapshot() { return document.hidden || !navigator.onLine ? null : snapshot; },
        });
        const enriched = 'Review draft asks for continuity against the Calendar’s shorter gaps; how those commitments fit remains yours.';
        const ordinary = 'Choosing a library book leaves the choice of what comes next with you.';
        const calls = [];
        let finish;
        window.fetch = async (url, options) => {
          calls.push({ url: String(url), body: JSON.parse(options.body) });
          if (calls.length === 1 && ['edited', 'completed', 'forgotten', 'account-changed', 'hidden', 'midnight'].includes(scenario))
            return new Promise(resolve => { finish = resolve; });
          const content = calls.length > 1 || scenario === 'ignored' ? ordinary
            : scenario === 'unsafe-text' ? 'Review draft can move later; your Calendar is packed.'
            : scenario === 'malformed-text' ? '' : enriched;
          return { ok: true, json: async () => ({ content }) };
        };
        document.getElementById('infoPanel').classList.add('open');
        checkDayNudge();
        await window.__nudgeTestWait(() => calls.length >= 1, 'Calendar fixture first request');
        if (finish) {
          if (scenario === 'edited') task.text = 'Review updated draft';
          if (scenario === 'completed') doneIds.add(task.id);
          if (scenario === 'forgotten') { snapshot = null; localStorage.removeItem('calendar_refresh_token'); }
          if (scenario === 'account-changed') snapshot.epoch++;
          if (scenario === 'hidden') Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
          if (scenario === 'midnight') { clock = +end; _nudgeOnNewDay(); }
          finish({ ok: true, json: async () => ({ content: enriched }) });
        }
        if (scenario === 'midnight') {
          // Finish the known promise chain without requesting a new-day nudge.
          await new Promise(resolve => setTimeout(resolve, 30));
        } else await window.__nudgeTestWait(() => Today.use('nudge').generationAudit().status === 'accepted', 'Calendar fixture settled');
        const line = localStorage.getItem('day_nudge_ai_' + date);
        if (scenario === 'qualified') _memoryReactToLine('morning nudge', date, 'landed');
        const record = appMemory.spokenLines.find(l => l.surface === 'morning nudge' && l.date === date);
        return { calls, reads, line,
          aboutMatches: scenario === 'midnight' || document.getElementById('todayNudgeBlock').textContent.includes(line),
          noExtraVoteKind: !record?.kind,
          voteKept: scenario !== 'qualified' || record?.reaction === 'landed',
          noPrivateInput: !JSON.stringify(calls).includes('PRIVATE_EVENT_FIXTURE')
            && !JSON.stringify(calls).includes('PRIVATE_DESCRIPTION_FIXTURE') && !JSON.stringify(calls).includes('private-event.invalid')
            && !JSON.stringify(calls).includes('"events"') && !JSON.stringify(calls).includes('"capturedAt"'),
          noRawCalendarPersistence: !JSON.stringify(Object.entries(localStorage)).includes('PRIVATE_EVENT_FIXTURE')
            && !JSON.stringify(appMemory).includes('PRIVATE_EVENT_FIXTURE'),
        };
      }, scenario);
      const omitted = ['empty', 'unrelated', 'stale', 'partial', 'disconnected', 'slow-read', 'removed-during-read'].includes(scenario);
      const fallback = ['edited', 'completed', 'forgotten', 'account-changed', 'hidden', 'unsafe-text', 'malformed-text'].includes(scenario);
      const first = result.calls[0].body.messages[0].content;
      if (scenario === 'empty') ordinaryCalendarFixture = result.calls[0].body;
      await expectAll('Calendar daily integration: ' + scenario, {
        noErrors: errors.length === 0,
        expectedCalls: result.calls.length === (fallback ? 2 : 1),
        supportConditional: first.includes('Optional same-task Calendar evidence') === !omitted,
        ordinaryPayloadUnchanged: !omitted || scenario === 'removed-during-read'
          || JSON.stringify(result.calls[0].body) === JSON.stringify(ordinaryCalendarFixture),
        untouchedRoute: result.calls.every(c => c.url === '/.netlify/functions/ai-assist'
          && c.body.surface === 'daily-nudge' && c.body.provider === 'claude' && !('thinking' in c.body) && !('model' in c.body)),
        disconnectedNoRead: scenario !== 'disconnected' || result.reads === 0,
        fallbackHasNoCalendar: !fallback || !result.calls[1].body.messages[0].content.includes('Optional same-task Calendar evidence'),
        changedTaskFactsFresh: scenario !== 'edited' || result.calls[1].body.messages[0].content.includes('Review updated draft'),
        completedTaskOmitted: scenario !== 'completed' || !result.calls[1].body.messages[0].content.includes('Review draft'),
        removedBeforeRequestOmitted: scenario !== 'removed-during-read' || !first.includes('Review draft'),
        staleNeverSaved: !fallback || result.line === 'Choosing a library book leaves the choice of what comes next with you.',
        midnightNeverSaved: scenario !== 'midnight' || !result.line,
        aboutMatches: result.aboutMatches, noExtraVoteKind: result.noExtraVoteKind, voteKept: result.voteKept,
        noPrivateInput: result.noPrivateInput, noRawCalendarPersistence: result.noRawCalendarPersistence,
      });
      await page.close();
    }
    ok('Calendar supports the daily writer only on a qualified task; 17 omission/delivery/privacy cases preserve ordinary recovery, About and votes');

    // Recovery is a lifecycle, not just an immediate offline fallback. No real
    // credentials or personal lines: the clock advances only in the test page.
    for (const failure of ['network', 'timeout', '503', '429', '408', '401', 'unreadable', 'empty', 'length', 'grounding']) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async failure => {
        const audit = () => Today.use('nudge').generationAudit();
        const expected = { network: 'network-error', timeout: 'request-timeout',
          '503': 'http-error', '429': 'http-error', '408': 'http-error', '401': 'http-error',
          unreadable: 'unreadable-response', empty: 'empty-response', length: 'rejected-length',
          grounding: 'rejected-grounding' }[failure];
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
        let dailyRequests = true;
        const good = 'The appointment has a morning window; check it before other tasks.';
        window.fetch = async (url, opts) => {
          calls++;
          dailyRequests = dailyRequests && JSON.parse(opts.body).surface === 'daily-nudge';
          if (recover) return { ok: true, json: async () => ({ content: good }) };
          if (failure === 'network') throw new TypeError('Private error detail: SECRET_ERROR');
          if (failure === 'timeout') return new Promise((resolve, reject) =>
            opts.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true }));
          if (/^\d+$/.test(failure)) return { ok: false, status: Number(failure) };
          return { ok: true, json: async () => {
            if (failure === 'unreadable') throw new SyntaxError('SECRET_BAD_RESPONSE');
            return { content: failure === 'empty' ? '' : failure === 'length' ? Array(31).fill('word').join(' ')
              : "You're the kind of person who avoids obligations." };
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
        const initialCalls = failure === 'length' ? 2 : 1;
        const noImmediateRetry = calls === initialCalls;
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
          dailyThinkingRequested: dailyRequests,
          noImmediateRetry,
          emptyAboutExplained: aboutEmpty,
          recoveryPolicy: retryable ? calls === 2 && final.status === 'accepted' && aboutRecovered
            && localStorage.getItem('day_nudge_ai_' + _localISO()) === good : calls === initialCalls && final.status === expected && final.attempts === 1,
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

    // Overlong prose gets one shortening pass, within the same generation attempt.
    for (const outcome of ['accepted', 'still-long', 'unsafe', 'unsafe-original', 'dismissed', 'noon']) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async outcome => {
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'SECRET_TEST_KEY');
        if (outcome !== 'dismissed') localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        appMemory.taskOutcomes = [];
        const long = 'You have kept the same task on your list alongside work you have already chosen to move to Soon, leaving two different ways of holding onto a commitment visible this morning.';
        const good = 'You have kept one commitment close while giving another more distance in Soon.';
        const calls = [];
        let release;
        window.fetch = async (url, opts) => {
          const body = JSON.parse(opts.body); calls.push(body);
          if (calls.length === 1) return { ok: true, json: async () => {
            if (outcome === 'noon') Date.prototype.getHours = () => 12;
            return { content: outcome === 'unsafe-original' ? long + " You're the kind of person who avoids obligations." : long };
          } };
          return new Promise(resolve => { release = () => resolve({ ok: true, json: async () => ({ content:
            outcome === 'still-long' ? long : outcome === 'unsafe' ? "You're the kind of person who avoids obligations." : good }) }); });
        };
        checkDayNudge._setMemoryReady(); checkDayNudge();
        await new Promise(r => setTimeout(r, 60));
        const noEarlyCache = !localStorage.getItem('day_nudge_ai_' + _localISO());
        // Force the existing display race to show a fallback while shortening is pending.
        await new Promise(r => setTimeout(r, outcome === 'accepted' ? 5100 : 0));
        const before = document.getElementById('dayNudge').textContent;
        if (release) release();
        await new Promise(r => setTimeout(r, 60));
        const audit = Today.use('nudge').generationAudit();
        Today.use('about').renderInfoStats();
        const accepted = ['accepted', 'dismissed'].includes(outcome);
        const expectedStatus = accepted ? 'accepted' : ['still-long','noon'].includes(outcome) ? 'rejected-length' : 'rejected-grounding';
        const afterRepair = document.getElementById('dayNudge').textContent;
        checkDayNudge(); await new Promise(r => setTimeout(r, 30));
        const repair = calls[1];
        return {
          bounded: calls.length === (['unsafe-original','noon'].includes(outcome) ? 1 : 2) && audit.attempts === 1,
          status: audit.status === expectedStatus,
          sameRoute: calls.every(c => c.surface === 'daily-nudge' && c.provider === 'claude'
            && !('thinking' in c) && !('model' in c)),
          sameMeaningContract: !repair || (repair.systemPrompt === calls[0].systemPrompt
            && JSON.stringify(repair.messages.slice(0,-2)) === JSON.stringify(calls[0].messages)
            && repair.messages.at(-2).role === 'assistant' && repair.messages.at(-2).content === long
            && repair.messages.at(-1).content.includes('same reading')),
          onlyAcceptedSaved: noEarlyCache && (accepted
            ? localStorage.getItem('day_nudge_ai_' + _localISO()) === good
              && document.getElementById('todayNudgeBlock').textContent.includes(good)
            : !localStorage.getItem('day_nudge_ai_' + _localISO())),
          noMidReadSwap: outcome !== 'accepted' || before === afterRepair,
          dismissalFinal: outcome !== 'dismissed' || !document.getElementById('dayNudge').classList.contains('show'),
          privateAudit: ![long, good, 'SECRET_TEST_KEY'].some(text => JSON.stringify(audit).includes(text)),
        };
      }, outcome);
      await expectAll('one length repair ' + outcome, { ...result, noErrors: errors.length === 0 });
      await page.close();
    }
    ok('one grounded shortening pass preserves the strict cap, route, cache/About, dismissal and terminal guards');

    // A pre-fix length rejection can recover naturally once; new-policy failures cannot reset.
    for (const modern of [false, true]) {
      const generation = { schema:1, date:TODAY, attempts:1, status:'rejected-length', retryAt:0, terminal:true, events:[], ...(modern && { lengthRepair:true }) };
      const { page, errors } = await openPage({ extraSeed: { today_nudge_generation_v1: JSON.stringify(generation) } });
      const result = await page.evaluate(async modern => {
        localStorage.setItem('today_ai_provider','claude');localStorage.setItem('today_ai_key_claude','test-key');
        appMemory.taskOutcomes=[];let calls=0;
        const good='You have kept one commitment close while giving another more distance in Soon.';
        window.fetch=async()=>{calls++;return {ok:true,json:async()=>({content:good})};};
        checkDayNudge._setMemoryReady();checkDayNudge();await new Promise(r=>setTimeout(r,60));checkDayNudge();
        const state=JSON.parse(localStorage.getItem('today_nudge_generation_v1'));
        return { recovery: modern ? calls===0 : calls===1 && state.attempts===2 && state.lengthRepair===true,
          cache: modern ? !localStorage.getItem('day_nudge_ai_'+_localISO()) : localStorage.getItem('day_nudge_ai_'+_localISO())===good,
          dismissalKept: !!localStorage.getItem('day_nudge_dismissed_'+_localISO()) };
      },modern);
      await expectAll('old length state modern=' + modern,{...result,noErrors:errors.length===0});await page.close();
    }

    for (const duringRepair of [false, true]) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async duringRepair => {
        const RealDate = Date; let now = new RealDate(); now.setHours(9,0,0,0); let instant = now.getTime();
        window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [instant])); } static now() { return instant; } };
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_provider','claude');localStorage.setItem('today_ai_key_claude','test-key');
        appMemory.taskOutcomes=[]; const oldDay=_localISO();const pending=[];
        const reply = content => ({ok:true,json:async()=>({content})});
        const long=Array(31).fill('word').join(' ');
        window.fetch=()=>new Promise(resolve=>pending.push(resolve));
        checkDayNudge._setMemoryReady();checkDayNudge();await new Promise(r=>setTimeout(r,30));
        if(duringRepair){pending[0](reply(long));await new Promise(r=>setTimeout(r,30));}
        now.setDate(now.getDate()+1);instant=now.getTime();_nudgeOnNewDay();checkDayNudge();await new Promise(r=>setTimeout(r,30));
        pending[duringRepair?1:0](reply(duringRepair?'The old repaired line must be ignored.':long));
        await new Promise(r=>setTimeout(r,30));
        const fenced=pending.length===(duringRepair?3:2)&&!localStorage.getItem('day_nudge_ai_'+oldDay)
          &&!(appMemory.spokenLines||[]).some(l=>l.text==='The old repaired line must be ignored.');
        pending.at(-1)(reply('Today has its own grounded line.'));await new Promise(r=>setTimeout(r,30));
        return {fenced,todaySaved:localStorage.getItem('day_nudge_ai_'+_localISO())==='Today has its own grounded line.',
          separateBudget:Today.use('nudge').generationAudit().attempts===1};
      },duringRepair);
      await expectAll('length repair rollover during=' + duringRepair,{...result,noErrors:errors.length===0});await page.close();
    }

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

    // Dismissing the fallback hides the strip, not the missing About line.
    // Noon still blocks any new request.
    for (const gate of ['dismissed', 'afternoon']) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async gate => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'test-key');
        let calls = 0;
        const good = 'Write the tests could make the next change easier to trust.';
        window.fetch = async () => {
          if (++calls === 1) throw new TypeError('Failed to fetch');
          return { ok: true, json: async () => ({ content: good }) };
        };
        checkDayNudge();
        await new Promise(r => setTimeout(r, 50));
        const readyAt = Today.use('nudge').generationAudit().retryAt + 1;
        Date.now = () => readyAt;
        if (gate === 'dismissed') document.getElementById('dayNudge').click();
        else Date.prototype.getHours = () => 13;
        window.dispatchEvent(new Event('online'));
        checkDayNudge();
        await new Promise(r => setTimeout(r, 50));
        Today.use('about').renderInfoStats();
        return {
          policy: gate === 'afternoon' ? calls === 1 : calls === 2
            && localStorage.getItem('day_nudge_ai_' + _localISO()) === good
            && document.getElementById('todayNudgeBlock').textContent.includes(good),
          staysHidden: !document.getElementById('dayNudge').classList.contains('visible'),
        };
      }, gate);
      await expectAll('recovery respects ' + gate, { ...result, noErrors: errors.length === 0 });
      await page.close();
    }

    // A genuine AI dismissal must never request replacement text, even with a
    // stale completion stamp or a missing cache (the spoken record survives).
    for (const cachePresent of [true, false]) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async cachePresent => {
        const date = _localISO(), good = 'Write the tests before the next change needs them.';
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'test-key');
        if (cachePresent) localStorage.setItem('day_nudge_ai_' + date, good);
        appMemory.spokenLines = [{ surface: 'morning nudge', date, text: good, reaction: 'landed' }];
        doneIds.add('task_1');
        localStorage.setItem('day_nudge_done_count_' + date, '0');
        let calls = 0;
        window.fetch = async () => { calls++; throw new Error('Must not regenerate'); };
        checkDayNudge();
        window.dispatchEvent(new Event('online'));
        await new Promise(r => setTimeout(r, 50));
        return { noRequest: calls === 0,
          hidden: !document.getElementById('dayNudge').classList.contains('visible'),
          votePreserved: _memoryLineFor('morning nudge', date).reaction === 'landed' };
      }, cachePresent);
      await expectAll('accepted dismissal cache=' + cachePresent, { ...result, noErrors: errors.length === 0 });
      await page.close();
    }

    // Drive only the scheduled backoff callbacks, without a wake/check/online
    // event. Keep About open to prove local recovery refreshes it automatically.
    for (const cutoff of ['recover', 'undismissed', 'noon', 'offline', 'new-day']) {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async cutoff => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_provider', 'claude');
        localStorage.setItem('today_ai_key_claude', 'test-key');
        appMemory.taskOutcomes = [];
        const realTimeout = window.setTimeout, realClear = window.clearTimeout;
        const timers = new Map(); let timerId = -1, now = Date.now(), calls = 0, saves = 0;
        Date.now = () => now;
        window.setTimeout = (fn, delay, ...args) => {
          if (delay === 30000 || delay === 120000) { const id = timerId--; timers.set(id, fn); return id; }
          return realTimeout(fn, delay, ...args);
        };
        window.clearTimeout = id => { if (!timers.delete(id)) realClear(id); };
        window.dropboxAutoSave = () => saves++;
        const good = 'Write the tests could leave a little less uncertainty for later.';
        window.fetch = async () => {
          if (++calls <= 2) throw new TypeError('Failed to fetch');
          return { ok: true, json: async () => ({ content: good }) };
        };
        const wait = () => new Promise(r => realTimeout(r, 60));
        const fire = () => {
          now = Today.use('nudge').generationAudit().retryAt + 1;
          const entries = [...timers.values()]; timers.clear(); entries.forEach(fn => fn());
        };
        checkDayNudge(); await wait();
        const scheduled = timers.size === 1;
        const fallback = document.getElementById('dayNudge').textContent;
        const recovering = cutoff === 'recover' || cutoff === 'undismissed';
        if (cutoff !== 'undismissed') document.getElementById('dayNudge').click();
        document.getElementById('infoPanel').classList.add('open');
        Today.use('about').renderInfoStats();
        if (cutoff === 'noon') Date.prototype.getHours = () => 12;
        if (cutoff === 'offline') Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
        if (cutoff === 'new-day') _nudgeOnNewDay();
        fire(); await wait();
        const secondScheduled = timers.size === 1;
        if (recovering) { fire(); await wait(); }
        return { scheduled,
          bounded: recovering ? calls === 3 && secondScheduled && timers.size === 0 : calls === 1 && timers.size === 0,
          stripRespected: cutoff === 'undismissed'
            ? document.getElementById('dayNudge').classList.contains('visible') && document.getElementById('dayNudge').textContent === fallback
            : !document.getElementById('dayNudge').classList.contains('visible'),
          aboutLive: !recovering || document.getElementById('todayNudgeBlock').textContent.includes(good),
          normalAutosave: saves === (cutoff === 'recover' ? 2 : 1),
        };
      }, cutoff);
      await expectAll('scheduled recovery ' + cutoff, { ...result, noErrors: errors.length === 0 });
      await page.close();
    }
    ok('dismissed fallback recovers into open About on bounded timers; real AI dismissals, noon, offline and rollover remain respected');

    // Two isolated device stores, using the real backup serializer and merge.
    // Device B adopts A's fallback dismissal, then a recovered line arrives
    // during B's own request. Its late reply must not reset the synced vote.
    {
      const contexts = await Promise.all([browser.createBrowserContext(), browser.createBrowserContext()]);
      const [a, b] = await Promise.all(contexts.map(context => openPage({ context })));
      const good = 'Write the tests could leave less uncertainty around the next change.';
      for (const { page } of [a, b]) {
        // Let initial sync settle before adding fake connected-account credentials.
        await page.waitForFunction(() => Today.use('nudge').generationAudit().status === 'not-configured', { timeout: 5000 });
        await page.evaluate(() => {
          localStorage.removeItem('day_nudge_dismissed_' + _localISO());
          localStorage.setItem('today_ai_provider', 'claude');
          localStorage.setItem('today_ai_key_claude', 'test-key');
          localStorage.setItem('dropbox_token', 'test-token');
          localStorage.setItem('dropbox_token_expiry', String(Date.now() + 3600000));
          appMemory.taskOutcomes = []; appMemory.spokenLines = [];
          window._saveMemory = () => localStorage.setItem('today_memory', JSON.stringify(appMemory));
          window.__saveSignals = 0;
          window.dropboxAutoSave = () => window.__saveSignals++;
          window.__uploads = [];
          window.__dropboxResponse = (url, options) => {
            if (url.includes('/files/upload')) window.__uploads.push(JSON.parse(options.body));
            return { ok: true, status: 200, json: async () => ({ rev: 'test-rev' }) };
          };
        });
      }
      const failed = await a.page.evaluate(async good => {
        const timeout = window.setTimeout, clear = window.clearTimeout;
        const now = Date.now(); Date.now = () => now;
        window.__retries = new Map(); let nextTimer = -1;
        window.setTimeout = (fn, delay, ...args) => {
          if (delay === 30000 || delay === 120000) {
            const id = nextTimer--; window.__retries.set(id, fn); return id;
          }
          return timeout(fn, delay, ...args);
        };
        window.clearTimeout = id => { if (!window.__retries.delete(id)) clear(id); };
        window.__calls = 0;
        window.fetch = async (url, options) => {
          if (!url.includes('/ai-assist')) return window.__dropboxResponse(url, options);
          // Deliberately exceed the old 60ms sleep, modelling an async rejection.
          await new Promise(r => timeout(r, 150));
          if (++window.__calls === 1) throw new TypeError('Failed to fetch');
          return { ok: true, json: async () => ({ content: good }) };
        };
        checkDayNudge();
        await window.__nudgeTestWait(() => window.__retries.size === 1
          && Today.use('nudge').generationAudit().status === 'network-error', 'scheduled network recovery');
        checkDayNudge(); // Rescheduling cancels the old fake timer, just like the browser.
        const countShown = document.getElementById('dayNudge').textContent.includes('still here from yesterday');
        document.getElementById('dayNudge').click();
        await window.__nudgeTestBackup(true);
        return { countShown, signalled: window.__saveSignals === 1, payload: window.__uploads.at(-1),
          oneActiveTimer: window.__retries.size === 1 };
      }, good);
      await expectAll('device A failed fallback dismissal', {
        countShown: failed.countShown, autosave: failed.signalled,
        oneActiveTimer: failed.oneActiveTimer,
        datedDismissal: failed.payload.per_day_dismiss_date === TODAY && failed.payload.day_nudge_dismissed === '1',
        noPrematureLine: !failed.payload.day_nudge_ai,
      });
      const bStarted = await b.page.evaluate(async payload => {
        window.__calls = 0;
        window.fetch = (url, options) => {
          if (!url.includes('/ai-assist')) return Promise.resolve(window.__dropboxResponse(url, options));
          window.__calls++; return new Promise(resolve => { window.__resolveAI = resolve; });
        };
        mergeRemoteData(payload);
        document.getElementById('infoPanel').classList.add('open');
        Today.use('about').renderInfoStats();
        checkDayNudge();
        await window.__nudgeTestWait(() => window.__calls === 1, 'device B pending request');
        return { retryAllowed: window.__calls === 1,
          hidden: !document.getElementById('dayNudge').classList.contains('visible'),
          dismissalAdopted: localStorage.getItem('day_nudge_dismissed_' + _localISO()) === '1' };
      }, failed.payload);
      await expectAll('device B adopted fallback dismissal', bStarted);
      const recovered = await a.page.evaluate(async () => {
        document.getElementById('infoPanel').classList.add('open');
        Today.use('about').renderInfoStats();
        const readyAt = Today.use('nudge').generationAudit().retryAt + 1;
        Date.now = () => readyAt;
        const [id, retry] = window.__retries.entries().next().value;
        window.__retries.delete(id); retry();
        await window.__nudgeTestWait(() => Today.use('nudge').generationAudit().status === 'accepted', 'device A accepted recovery');
        await window.__nudgeTestBackup(true);
        return { signalled: window.__saveSignals === 2, payload: window.__uploads.at(-1),
          aboutLive: document.getElementById('todayNudgeBlock').textContent.includes(localStorage.getItem('day_nudge_ai_' + _localISO())),
          hidden: !document.getElementById('dayNudge').classList.contains('visible') };
      });
      await expectAll('device A scheduled recovery payload', {
        autosave: recovered.signalled, aboutLive: recovered.aboutLive, hidden: recovered.hidden,
        text: recovered.payload.day_nudge_ai === good,
        dated: recovered.payload.day_nudge_ai_date === TODAY,
        spoken: recovered.payload.memory.spokenLines.filter(l => l.surface === 'morning nudge' && l.date === TODAY).length === 1,
      });
      const voted = await b.page.evaluate(async ({ payload, good }) => {
        mergeRemoteData(payload);
        const aboutLive = document.getElementById('todayNudgeBlock').textContent.includes(good);
        _memoryReactToLine('morning nudge', _localISO(), 'landed');
        window.__resolveAI({ ok: true, json: async () => ({ content: 'A competing local reply must not replace the voted line.' }) });
        await window.__nudgeTestWait(() => Today.use('nudge').generationAudit().status === 'cache-adopted', 'device B settled late reply');
        await window.__nudgeTestBackup(true);
        return { aboutLive, hidden: !document.getElementById('dayNudge').classList.contains('visible'),
          canonical: localStorage.getItem('day_nudge_ai_' + _localISO()) === good,
          adopted: Today.use('nudge').generationAudit().status === 'cache-adopted',
          vote: _memoryLineFor('morning nudge', _localISO()).reaction === 'landed',
          payload: window.__uploads.at(-1) };
      }, { payload: recovered.payload, good });
      await expectAll('device B late reply preserves synced line and vote', {
        aboutLive: voted.aboutLive, hidden: voted.hidden, canonical: voted.canonical, adopted: voted.adopted, vote: voted.vote,
      });
      const converged = await a.page.evaluate(async payload => {
        mergeRemoteData(payload); mergeRemoteData(payload);
        checkDayNudge(); await new Promise(r => setTimeout(r, 40));
        const lines = appMemory.spokenLines.filter(l => l.surface === 'morning nudge' && l.date === _localISO());
        return { oneVote: lines.length === 1 && lines[0].reaction === 'landed',
          noRegeneration: window.__calls === 2,
          hidden: !document.getElementById('dayNudge').classList.contains('visible') };
      }, voted.payload);
      await expectAll('two-device vote convergence', { ...converged, noErrors: !a.errors.length && !b.errors.length });
      await Promise.all(contexts.map(context => context.close()));
      ok('two devices: failed fallback → synced dismissal → timed recovery → live About → vote convergence; late local text cannot overwrite it');
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

    // 5. One staleness rule for strip and About: a saved line retires only when it names
    //    a task completed today. An unrelated completion keeps it in both homes; a named
    //    one retires it in both, the stored key survives a failed retry (Dropbox reads
    //    it), and a successful retry replaces it everywhere.
    {
      const seedFor = line => ({
        ['day_nudge_ai_' + TODAY]: line,
        'today_done':   JSON.stringify(['task_1']),
        'today_manual': JSON.stringify([
          { id: 'task_1', text: 'Buy stamps' },
          { id: 'task_2', text: 'Renew the passport' },
        ]),
      });
      const both = () => {
        Today.use('about').renderInfoStats();
        const block = document.getElementById('todayNudgeBlock');
        return { strip: document.getElementById('dayNudge').textContent,
          about: block.style.display === 'none' ? '' : block.textContent };
      };
      const unrelated = await openPage({ extraSeed: seedFor('The passport renewal has waited longest.') });
      const kept = await unrelated.page.evaluate(async both => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        checkDayNudge(false);
        const v = (new Function('return ' + both))()();
        return { stripKeeps: v.strip.includes('passport renewal'), aboutKeeps: v.about.includes('passport renewal') };
      }, both.toString());
      await expectAll('unrelated completion keeps the line in strip and About', { ...kept, noErrors: unrelated.errors.length === 0 });
      await unrelated.page.close();

      const named = await openPage({ extraSeed: seedFor('Stamps first, then the passport.') });
      const retired = await named.page.evaluate(async both => {
        const key = 'day_nudge_ai_' + _localISO();
        const read = (new Function('return ' + both))();
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        checkDayNudge(false);
        const first = read();
        localStorage.setItem('today_ai_key_claude', 'test-key');
        localStorage.setItem('today_ai_provider', 'claude');
        window.fetch = async () => ({ ok: false, json: async () => ({}) });
        checkDayNudge();
        await new Promise(r => setTimeout(r, 150));
        const failed = read();
        return {
          stripRetired: !first.strip.includes('Stamps first'), aboutRetired: !first.about.includes('Stamps first'),
          keptForSync: localStorage.getItem(key) === 'Stamps first, then the passport.',
          fallbackShown: failed.strip.includes('still here from yesterday'), aboutStillHidden: failed.about === '',
        };
      }, both.toString());
      await expectAll('named completion retires the line in strip and About', { ...retired, noErrors: named.errors.length === 0 });
      await named.page.close();

      const second = await openPage({ extraSeed: seedFor('Stamps first, then the passport.') });
      const replaced = await second.page.evaluate(async both => {
        const read = (new Function('return ' + both))();
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.setItem('today_ai_key_claude', 'test-key');
        localStorage.setItem('today_ai_provider', 'claude');
        window.fetch = async () => ({ ok: true, json: async () => ({ content: 'The passport renewal deserves the quiet hour.' }) });
        checkDayNudge();
        await new Promise(r => setTimeout(r, 150));
        const v = read();
        return { replacedOnSuccess: localStorage.getItem('day_nudge_ai_' + _localISO()) === 'The passport renewal deserves the quiet hour.',
          stripFresh: v.strip.includes('quiet hour'), aboutFresh: v.about.includes('quiet hour') };
      }, both.toString());
      await expectAll('retired line replaced everywhere on success', { ...replaced, noErrors: second.errors.length === 0 });
      ok('checkDayNudge: one staleness rule — unrelated completions keep the line, a named completion retires it in strip and About alike');
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
          dailyThinkingRequested: calls[0]?.surface === 'daily-nudge',
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
