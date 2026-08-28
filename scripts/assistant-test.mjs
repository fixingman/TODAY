// TODAY — AI assistant panel and post-add suggestion regression test
//
// Flow: panel open/close, setup screen when not configured, thinking state,
// chips render, add_task action mutates state, post-add analyze + suggest,
// dismissal, breakdown apply, static wiring check.
//
// Run from repo root:
//   node scripts/assistant-test.mjs --pre-extraction   # pre-extraction baseline
//   node scripts/assistant-test.mjs                    # post-extraction (9 tests)

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

async function openPage(extraSeed) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(
    ({ extra }) => {
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      localStorage.setItem('today_manual', JSON.stringify([
        { id: 'task_1', text: 'Write complete documentation with examples' },
        { id: 'task_2', text: 'Second task' },
      ]));
      localStorage.setItem('today_done', JSON.stringify([]));
      if (extra) {
        Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v));
      }
    },
    { extra: extraSeed || null }
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof toggleAI === 'function' &&
          typeof closeAI === 'function' &&
          typeof _aiAnalyzeTask === 'function' &&
          !!document.getElementById('aiPanel'),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.dropboxAutoSave    = () => {};
    window.dropboxBackup      = () => {};
    window.loadTrelloBoards   = () => {};
    window.renderMeetingNames = () => {};
    window._haptic            = () => {};
    window._breathe           = () => {};
  });
  return { page, errors };
}

try {
  if (PRE_EXTRACTION) {
    // Pre-extraction baseline: functions are inline in index.html; assistant.js does not yet exist.
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    await expectAll('pre-extraction baseline', {
      toggleAIInline:    indexSrc.includes('function toggleAI()'),
      openAIInline:      indexSrc.includes('function openAI('),
      noAssistantModule: !existsSync(join(ROOT, 'assets/assistant.js')),
    });
    ok('pre-extraction: toggleAI/openAI inline in index.html; assets/assistant.js not yet created');
    console.log('\nAssistant tests passed (pre-extraction baseline, 1 check).');
  } else {
    // 1. Panel open: openAI(skipAutoLoad) → #aiPanel gets .open, body gets ai-chat-open.
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(() => {
        openAI(true); // skipAutoLoad — avoids fetch
        const panel = document.getElementById('aiPanel');
        return {
          panelOpen:  !!(panel && panel.classList.contains('open')),
          bodyClass:  document.body.classList.contains('ai-chat-open'),
        };
      });
      await expectAll('panel open', { ...result, noErrors: errors.length === 0 });
      ok('panel open: #aiPanel gains .open, body gains ai-chat-open');
      await page.close();
    }

    // 2. Panel close: closeAI() removes open state.
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(() => {
        openAI(true);
        closeAI();
        const panel = document.getElementById('aiPanel');
        return {
          panelClosed:   !!(panel && !panel.classList.contains('open')),
          bodyClassGone: !document.body.classList.contains('ai-chat-open'),
        };
      });
      await expectAll('panel close', { ...result, noErrors: errors.length === 0 });
      ok('panel close: #aiPanel loses .open, body loses ai-chat-open');
      await page.close();
    }

    // 3. Setup screen: no AI key → openAI() shows not-configured message with Connections link.
    {
      const { page, errors } = await openPage();
      const result = await page.evaluate(() => {
        localStorage.removeItem('today_ai_key_claude');
        localStorage.removeItem('today_ai_key_gemini');
        openAI();
        const msg = document.getElementById('aiSuggestionMsg');
        return {
          hasNotConfigured:   !!(msg && msg.querySelector('.ai-not-configured')),
          hasConnectionsText: !!(msg && msg.textContent.includes('Connections')),
        };
      });
      await expectAll('setup screen', { ...result, noErrors: errors.length === 0 });
      ok('setup screen: .ai-not-configured with Connections link when no API key');
      await page.close();
    }

    // 4. Thinking state: fetch hangs → #aiSuggestionMsg immediately gets class "thinking".
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(() => {
        window.fetch = () => new Promise(() => {}); // never resolves
        openAI(); // triggers _aiLoad → _aiSetThinking
        const msg = document.getElementById('aiSuggestionMsg');
        return {
          hasThinkingClass: !!(msg && msg.classList.contains('thinking')),
          hasThinkingDots:  !!(msg && msg.querySelector('.ai-thinking-dots')),
        };
      });
      await expectAll('thinking state', { ...result, noErrors: errors.length === 0 });
      ok('thinking state: #aiSuggestionMsg gets class "thinking" while fetch is pending');
      await page.close();
    }

    // 5. Chips render: mocked fetch → openAI() → #aiChips has button children.
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(async () => {
        window.fetch = async () => ({
          ok: true,
          text: async () => JSON.stringify({
            message: 'Two tasks on your list. What matters most?',
            actions: [
              { label: 'Focus', type: 'start_focus', payload: { id: 'task_1' } },
              { label: 'Dismiss', type: 'dismiss', payload: {} },
            ],
          }),
        });
        openAI();
        await new Promise(r => setTimeout(r, 200)); // wait for fetch + render
        const chips = document.getElementById('aiChips');
        return {
          hasChips:  !!(chips && chips.querySelectorAll('button').length >= 2),
          chipCount: chips ? chips.querySelectorAll('button').length : 0,
        };
      });
      await expectAll('chips render', { ...result, noErrors: errors.length === 0 });
      ok(`chips render: #aiChips has ${result.chipCount} button(s) after fetch resolves`);
      await page.close();
    }

    // 6. add_task action: clicking chip adds entry to manualTasks.
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(async () => {
        window.fetch = async () => ({
          ok: true,
          text: async () => JSON.stringify({
            message: 'Add this.',
            actions: [
              { label: 'Add task', type: 'add_task', payload: { text: 'write tests for AI' } },
              { label: 'Dismiss', type: 'dismiss', payload: {} },
            ],
          }),
        });
        const prevCount = manualTasks.length;
        openAI();
        await new Promise(r => setTimeout(r, 200));
        const chips = document.getElementById('aiChips');
        // add_task chip is first (primary)
        const addBtn = chips ? chips.querySelectorAll('button')[0] : null;
        if (addBtn) addBtn.click();
        return {
          taskAdded:   manualTasks.length === prevCount + 1,
          taskPresent: manualTasks.some(t => t.text === 'write tests for AI'),
        };
      });
      await expectAll('add_task action', { ...result, noErrors: errors.length === 0 });
      ok('add_task action: clicking chip adds task to manualTasks');
      await page.close();
    }

    // 7+8. Post-add suggestion waits for viewport delivery, then measures
    // exposure and explicit dismissal.
    //   _aiAnalyzeTask debounces 2s then calls _aiDoAnalyze which calls fetch.
    //   After suggestion appears, _aiDismissSuggestion applies .removing class.
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(async () => {
        const realSetTimeout = window.setTimeout;
        const realIntersectionObserver = window.IntersectionObserver;
        const observers = [];
        let exposureTimersArmed = 0;
        window.IntersectionObserver = class {
          constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
          observe(target) { this.target = target; }
          disconnect() { this.disconnected = true; }
        };
        window.setTimeout = (callback, ms, ...args) => {
          if (ms >= 9999) { exposureTimersArmed++; return 987654; }
          return realSetTimeout(callback, ms, ...args);
        };
        window.fetch = async () => ({
          ok: true,
          json: async () => ({
            suggest: true,
            type: 'break_down',
            reason: 'multiple_actions',
            message: 'Has multiple steps',
            subtasks: ['Write the draft', 'Add examples'],
          }),
        });
        renderManual(); // ensure .task[data-task-id="task_1"] exists in DOM
        _aiAnalyzeTask('task_1', 'Write complete documentation with examples and unit tests');
        await new Promise(r => setTimeout(r, 2400)); // debounce 2s + fetch
        const pendingNotMounted = !document.querySelector('.task-suggestion');
        const pendingNotOffered = appMemory.suggestionOutcomes.length === 0;
        const deliveryObserver = observers[0];
        deliveryObserver?.callback([{ target: deliveryObserver.target, isIntersecting: true }]);
        const suggestionEl = document.querySelector('.task-suggestion');
        const suggestionAppeared = !!suggestionEl;
        const offscreenDoesNotCount = exposureTimersArmed === 0;
        const exposureObserver = observers[1];
        exposureObserver?.callback([{ target: exposureObserver.target, isIntersecting: true }]);
        const visibleExposureArmed = exposureTimersArmed === 1;
        const offered = appMemory.suggestionOutcomes[0];
        _aiDismissSuggestion('user');
        const getsRemoving = !!document.querySelector('.task-suggestion.removing');
        window.setTimeout = realSetTimeout;
        window.IntersectionObserver = realIntersectionObserver;
        return {
          suggestionAppeared,
          getsRemoving,
          pendingNotMounted,
          pendingNotOffered,
          offscreenDoesNotCount,
          visibleExposureArmed,
          deliveryCleanedUp: !!deliveryObserver?.disconnected,
          exposureCleanedUp: !!exposureObserver?.disconnected,
          reasonRecorded: offered?.reason === 'multiple_actions',
          dismissedRecorded: !!offered?.dismissedAt && offered?.outcome === 'dismissed',
        };
      });
      await expectAll('post-add suggest + dismiss', { ...result, noErrors: errors.length === 0 });
      ok('post-add suggest: waits for task viewport entry, then records exposure and dismissal');
      await page.close();
    }

    // 9. Pending delivery follows the newest task, survives a list re-render by
    // task ID, and cancels if that task disappears before viewport entry.
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(async () => {
        const observers = [];
        const prompts = [];
        const realIntersectionObserver = window.IntersectionObserver;
        window.IntersectionObserver = class {
          constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
          observe(target) { this.target = target; }
          disconnect() { this.disconnected = true; }
        };
        window.fetch = async (_url, options) => {
          prompts.push(JSON.parse(options.body).messages[0].content);
          return {
            ok: true,
            json: async () => ({
              suggest: true,
              type: 'break_down',
              reason: 'multiple_actions',
              message: 'Has multiple steps',
              subtasks: ['Draft it', 'Review it'],
            }),
          };
        };

        renderManual();
        _aiAnalyzeTask('task_1', 'First complex task with drafting and review');
        _aiAnalyzeTask('task_2', 'Second complex task with drafting and review');
        await new Promise(r => setTimeout(r, 2400));
        const newestWon = prompts.length === 1 && prompts[0].includes('Second complex task');
        const firstObserver = observers[0];
        const firstTarget = firstObserver?.target;

        renderManual();
        await new Promise(r => setTimeout(r, 30));
        const reanchorObserver = observers[1];
        const reanchored = !!firstObserver?.disconnected &&
          !!reanchorObserver?.target && reanchorObserver.target !== firstTarget;

        manualTasks = manualTasks.filter(task => task.id !== 'task_2');
        renderManual();
        await new Promise(r => setTimeout(r, 30));
        const removedCancelled = !!reanchorObserver?.disconnected &&
          !document.querySelector('.task-suggestion') && appMemory.suggestionOutcomes.length === 0;
        window.IntersectionObserver = realIntersectionObserver;
        return { newestWon, reanchored, removedCancelled };
      });
      await expectAll('pending suggestion lifecycle', { ...result, noErrors: errors.length === 0 });
      ok('pending suggest: newest task wins, re-render re-anchors, removal cancels before offer');
      await page.close();
    }

    // 10. Breakdown apply: _aiApplyBreakdown removes original task, adds subtasks.
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(async () => {
        window.fetch = async () => ({
          ok: true,
          json: async () => ({
            suggest: true,
            type: 'break_down',
            reason: 'long_complex_task',
            message: 'Several distinct steps',
            subtasks: ['Write the draft', 'Add examples', 'Review'],
          }),
        });
        renderManual(); // render task_1 and task_2 into DOM
        const prevCount = manualTasks.length; // 2
        _aiAnalyzeTask('task_1', 'Write complete documentation with examples and unit tests');
        await new Promise(r => setTimeout(r, 2400));
        document.querySelector('.task-suggestion-chip:not(.dismiss)')?.click();
        const outcome = appMemory.suggestionOutcomes[0];
        return {
          taskRemoved:    !manualTasks.find(t => t.id === 'task_1'),
          subtasksAdded:  manualTasks.filter(t =>
            ['Write the draft', 'Add examples', 'Review'].includes(t.text)
          ).length === 3,
          countCorrect:   manualTasks.length === prevCount - 1 + 3,
          appliedRecorded: !!outcome?.appliedAt && outcome?.outcome === 'applied',
          resultIdsRecorded: outcome?.resultTaskIds?.length === 3,
        };
      });
      await expectAll('breakdown apply', { ...result, noErrors: errors.length === 0 });
      ok('breakdown apply: original task removed, 3 subtasks added to manualTasks');
      await page.close();
    }

    // 11. Static wiring: 8 exports in assistant.js, functions removed from index.html, precached.
    {
      const indexSrc  = await readFile(join(ROOT, 'index.html'), 'utf8');
      const swSrc     = await readFile(join(ROOT, 'sw.js'), 'utf8');
      const assistSrc = await readFile(join(ROOT, 'assets/assistant.js'), 'utf8');
      const requiredExports = [
        'toggleAI', 'openAI', 'closeAI', '_aiAskFromPanel',
        '_aiAnalyzeTask', '_aiDismissSuggestion', '_aiSendFromInput', '_aiApplyBreakdown',
      ];
      const startupIdx   = indexSrc.indexOf('window._startAssistant();');
      const startMeetIdx = indexSrc.indexOf('window._startMeeting();');
      await expectAll('assistant module wiring', {
        moduleLoad:       indexSrc.includes('<script src="/assets/assistant.js"></script>'),
        startupCall:      startupIdx !== -1,
        beforeMeeting:    startupIdx !== -1 && startMeetIdx !== -1 && startupIdx < startMeetIdx,
        toggleAIRemoved:  !indexSrc.includes('function toggleAI()'),
        openAIRemoved:    !indexSrc.includes('function openAI('),
        moduleInit:       assistSrc.includes('window._startAssistant = '),
        allExports:       requiredExports.every(n => assistSrc.includes(`window.${n} = ${n};`)),
        precached:        swSrc.includes("'/assets/assistant.js'"),
      });
      ok('assistant module: 8 exports, functions removed from index.html, precached in sw.js');
    }

    console.log('\nAssistant tests passed (post-extraction, 10 behavior groups + wiring).');
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
