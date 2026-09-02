// TODAY — nudge module regression test
//
// Tests: checkDayNudge (cached AI, noon hidden, 1s fallback, fallback-upgrade,
//        stale-done invalidation, dismiss, already-dismissed, offline/no-key),
//        checkVersionNudge, checkSundayNudge, checkHabitNudge, static wiring.
//
// Run from repo root:
//   node scripts/nudge-test.mjs --pre-extraction   # pre-extraction baseline
//   node scripts/nudge-test.mjs                    # post-extraction (10 tests)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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

    // 3. 1s fallback: slow AI (2s) → rule-based text shows after ~1s timer fires.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        window._aiGetKey = () => 'test-key';
        window.fetch = () => new Promise(r =>
          setTimeout(() => r({ ok: true, json: async () => ({ content: 'slow AI response' }) }), 2000)
        );
        checkDayNudge();
        await new Promise(r => setTimeout(r, 1200));
        const nudge = document.getElementById('dayNudge');
        return {
          nudgeVisible:    !!(nudge && nudge.classList.contains('visible')),
          hasFallbackText: !!(nudge && nudge.textContent.includes('still here from yesterday')),
        };
      });
      await expectAll('1s fallback', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: 1s fallback fires with rule text when AI is slow');
      await page.close();
    }

    // 4. Fallback upgrade: fallback shows at 1s, second call with cached AI replaces it.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        window._aiGetKey = () => 'test-key';
        window.fetch = () => new Promise(r =>
          setTimeout(() => r({ ok: true, json: async () => ({ content: 'AI upgraded line.' }) }), 1500)
        );
        checkDayNudge(); // race: fallback at 1s, AI cache written at ~1.5s
        await new Promise(r => setTimeout(r, 2200)); // wait for fetch to settle
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

    // 5. Stale-done invalidation: AI cache cleared when doneIds grew since generation.
    {
      const { page, errors } = await openPage({
        extraSeed: {
          ['day_nudge_ai_' + TODAY]:            'stale nudge text',
          ['day_nudge_done_count_' + TODAY]:    '0',
          'today_done':   JSON.stringify(['task_1']),
          'today_manual': JSON.stringify([
            { id: 'task_1', text: 'Write the tests' },
            { id: 'task_2', text: 'Another task' },
          ]),
        },
      });
      const result = await page.evaluate(() => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        checkDayNudge(false); // no-generate: only clears stale cache
        return {
          cacheCleared: !localStorage.getItem('day_nudge_ai_' + _localISO()),
        };
      });
      await expectAll('stale-done invalidation', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: AI cache cleared when doneIds grew since generation');
      await page.close();
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
    //     must carry evidence + contrast and nothing else. A leak of the task list or
    //     the _memoryForAI dump would silently restore the 12b architecture the pool
    //     exists to replace.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        const D = 86400000, now = Date.now();
        const iso = d => new Date(d).toISOString().slice(0, 10);
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        localStorage.removeItem('day_nudge_ai_' + _localISO());
        window._aiGetKey = () => 'test-key';

        // Eligibility: focus-vs-obligation reaches the morning only when an
        // obligation-framed task is on today's list.
        manualTasks.length = 0;
        manualTasks.push({ id: 'manual_' + (now - 9 * D), text: 'should book the dentist', focusSessions: 0 });
        doneIds.clear();
        appMemory.spokenLines = [];
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
        const spoken = appMemory.spokenLines[0] || {};
        return {
          onlyOneCall: calls.length === 1,
          carriesEvidenceAndContrast: body.includes('Evidence:') && body.includes('Contrast:'),
          noTaskListLeak: !body.includes('in the order the user arranged'),
          noMemoryDumpLeak: !body.includes('About you'),
          payloadStaysSmall: body.length < 800,
          kindRecorded: spoken.kind === 'focus-vs-obligation',
        };
      });
      await expectAll('pool track payload', { ...result, noErrors: errors.length === 0 });
      ok('checkDayNudge: pool candidate sends evidence+contrast only, records its kind');
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
        window._aiGetKey = () => 'test-key';
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

    // 8. Offline → _fetchDayNudgeAI returns null immediately, fallback shows quickly.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(async () => {
        localStorage.removeItem('day_nudge_dismissed_' + _localISO());
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window._aiGetKey = () => 'test-key';
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

        // ── Sunday/Monday badge ──
        document.getElementById('infoBtn')?.classList.remove('btn-icon-week');
        localStorage.removeItem('sunday_nudge_seen_' + today);
        Date.prototype.getDay = () => 0; // Sunday
        checkSundayNudge();
        const weekBadge = !!document.getElementById('infoBtn')?.classList.contains('btn-icon-week');

        // ── Habit badge ──
        Date.prototype.getHours = () => 22; // Evening
        checkHabitNudge();
        const habitBadge = !!document.getElementById('habitsBtn')?.classList.contains('btn-icon-habits');

        return { versionBadge, weekBadge, habitBadge };
      });
      await expectAll('badge nudges', { ...result, noErrors: errors.length === 0 });
      ok('checkVersionNudge / checkSundayNudge / checkHabitNudge: all three badges fire');
      await page.close();
    }

    // 10. Static wiring: script tag, startup order, 4 exports, functions removed, precached.
    {
      const indexSrc  = await readFile(join(ROOT, 'index.html'), 'utf8');
      const swSrc     = await readFile(join(ROOT, 'sw.js'), 'utf8');
      const nudgeSrc  = await readFile(join(ROOT, 'assets/nudge.js'), 'utf8');
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
        precached:            swSrc.includes("'/assets/nudge.js'"),
      });
      ok('nudge module: 4 exports, functions removed from index.html, precached in sw.js');
    }

    console.log('\nNudge tests passed (post-extraction, 10 tests).');
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
