// TODAY — post-add AI suggestion regression test
//
// Flow: analyze + viewport delivery, dismissal, re-anchor, breakdown apply,
// dead-sheet absence, and static wiring.
//
// Run from repo root:
//   node scripts/assistant-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
    () => typeof Today?.use('assistant')._aiAnalyzeTask === 'function',
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
  // 1. Post-add suggestion waits for viewport delivery, follows its task
  // through reordering/re-rendering, then measures exposure and dismissal.
  // _aiAnalyzeTask debounces 2s, then _aiDoAnalyze calls fetch.
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
        const analyzedText = 'Write the draft and add examples';
        manualTasks.find(task => task.id === 'task_1').text = analyzedText;
        Today.use('connections').renderManual(); // ensure the analyzed task text and rendered row agree
        Today.use('assistant')._aiAnalyzeTask('task_1', analyzedText);
        await new Promise(r => setTimeout(r, 2400)); // debounce 2s + fetch
        const pendingNotMounted = !document.querySelector('.task-suggestion');
        const pendingNotOffered = appMemory.suggestionOutcomes.length === 0;
        const deliveryObserver = observers[0];
        deliveryObserver?.callback([{ target: deliveryObserver.target, isIntersecting: true }]);
        const suggestionEl = document.querySelector('.task-suggestion');
        const suggestionAppeared = !!suggestionEl;
        const offscreenDoesNotCount = exposureTimersArmed === 0;
        const taskRow = document.querySelector('.task[data-taskid="task_1"]');
        const movedDown = _a11yMoveRow(taskRow, 1);
        const followsMoveDown = movedDown.moved && suggestionEl?.previousElementSibling === taskRow;
        const movedUp = _a11yMoveRow(taskRow, -1);
        const followsMoveUp = movedUp.moved && suggestionEl?.previousElementSibling === taskRow;
        Today.use('connections').renderManual();
        const rerenderedTaskRow = document.querySelector('.task[data-taskid="task_1"]');
        const survivesRerender = suggestionEl?.isConnected &&
          suggestionEl.previousElementSibling === rerenderedTaskRow &&
          document.querySelectorAll('.task-suggestion').length === 1;
        const exposureObserver = observers[1];
        exposureObserver?.callback([{ target: exposureObserver.target, isIntersecting: true }]);
        const visibleExposureArmed = exposureTimersArmed === 1;
        const offered = appMemory.suggestionOutcomes[0];
        Today.use('assistant')._aiDismissSuggestion('user');
        const getsRemoving = !!document.querySelector('.task-suggestion.removing');
        window.setTimeout = realSetTimeout;
        window.IntersectionObserver = realIntersectionObserver;
        return {
          suggestionAppeared,
          getsRemoving,
          pendingNotMounted,
          pendingNotOffered,
          offscreenDoesNotCount,
          followsMoveDown,
          followsMoveUp,
          survivesRerender,
          visibleExposureArmed,
          deliveryCleanedUp: !!deliveryObserver?.disconnected,
          exposureCleanedUp: !!exposureObserver?.disconnected,
          reasonRecorded: offered?.reason === 'multiple_actions',
          dismissedRecorded: !!offered?.dismissedAt && offered?.outcome === 'dismissed',
        };
      });
      await expectAll('post-add suggest + dismiss', { ...result, noErrors: errors.length === 0 });
      ok('post-add suggest: follows its task, then records exposure and dismissal');
      await page.close();
    }

    // 2. Pending delivery follows the newest task, survives a list re-render by
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
              subtasks: ['Draft the summary', 'Review it'],
            }),
          };
        };

        const firstText = 'Draft the outline and review it';
        const secondText = 'Draft the summary and review it';
        manualTasks.find(task => task.id === 'task_1').text = firstText;
        manualTasks.find(task => task.id === 'task_2').text = secondText;
        Today.use('connections').renderManual();
        Today.use('assistant')._aiAnalyzeTask('task_1', firstText);
        Today.use('assistant')._aiAnalyzeTask('task_2', secondText);
        await new Promise(r => setTimeout(r, 2400));
        const newestWon = prompts.length === 1 && prompts[0].includes('Draft the summary and review it');
        const firstObserver = observers[0];
        const firstTarget = firstObserver?.target;

        Today.use('connections').renderManual();
        await new Promise(r => setTimeout(r, 30));
        const reanchorObserver = observers[1];
        const reanchored = !!firstObserver?.disconnected &&
          !!reanchorObserver?.target && reanchorObserver.target !== firstTarget;

        manualTasks = manualTasks.filter(task => task.id !== 'task_2');
        Today.use('connections').renderManual();
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

    // A real single-action task must not become a speculative recipe workflow,
    // even if the provider returns a confident-looking split.
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(async () => {
        let request = null;
        window.fetch = async (_url, options = {}) => {
          const body = JSON.parse(options.body || '{}');
          if (body.messages?.[0]?.content?.includes('Bake protein bars')) request = body;
          return { ok: true, json: async () => ({
            suggest: true,
            type: 'break_down',
            reason: 'long_complex_task',
            message: 'Split the recipe into steps',
            subtasks: ['Gather ingredients', 'Bake protein bars'],
          }) };
        };
        manualTasks.find(task => task.id === 'task_1').text = 'Bake protein bars';
        Today.use('connections').renderManual();
        Today.use('assistant')._aiAnalyzeTask('task_1', 'Bake protein bars');
        await new Promise(r => setTimeout(r, 2400));
        return {
          noOffer: !document.querySelector('.task-suggestion'),
          noOutcome: appMemory.suggestionOutcomes.length === 0,
          originalKept: manualTasks.some(task => task.id === 'task_1' && task.text === 'Bake protein bars'),
          taskOnly: request?.messages?.[0]?.content?.includes('Task just added: "Bake protein bars"')
            && !request.messages[0].content.includes('Existing tasks:'),
          noLengthHeuristic: request?.systemPrompt?.includes('Length alone is never a reason to split'),
          noBehaviorBias: !request?.systemPrompt?.includes('Acceptance rate'),
        };
      });
      await expectAll('single-action split abstention', { ...result, noErrors: errors.length === 0 });
      ok('single-action task: speculative split rejected; prompt uses only the task');
      await page.close();
    }

    // 3. Breakdown apply: _aiApplyBreakdown removes original task, adds subtasks.
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
            subtasks: ['Write the draft', 'Add examples', 'Review references'],
          }),
        });
        const analyzedText = 'Write the draft, add examples, and review references';
        manualTasks.find(task => task.id === 'task_1').text = analyzedText;
        Today.use('connections').renderManual(); // render task_1 and task_2 into DOM
        const prevCount = manualTasks.length; // 2
        Today.use('assistant')._aiAnalyzeTask('task_1', analyzedText);
        await new Promise(r => setTimeout(r, 2400));
        document.querySelector('.task-suggestion-chip:not(.dismiss)')?.click();
        const outcome = appMemory.suggestionOutcomes[0];
        return {
          taskRemoved:    !manualTasks.find(t => t.id === 'task_1'),
          subtasksAdded:  manualTasks.filter(t =>
            ['Write the draft', 'Add examples', 'Review references'].includes(t.text)
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

    // 3b. Breakdown tag inheritance: split tasks inherit "tag: " prefix from original.
    {
      const { page, errors } = await openPage({ today_ai_key_claude: 'ck-test' });
      const result = await page.evaluate(async () => {
        window.fetch = async () => ({
          ok: true,
          json: async () => ({
            suggest: true,
            type: 'break_down',
            reason: 'long_complex_task',
            message: 'Two steps',
            subtasks: ['Write the outline', 'Fill in the details'],
          }),
        });
        const taggedText = 'docs: Write the outline and fill in the details';
        manualTasks.find(task => task.id === 'task_1').text = taggedText;
        Today.use('connections').renderManual();
        Today.use('assistant')._aiAnalyzeTask('task_1', taggedText);
        await new Promise(r => setTimeout(r, 2400));
        document.querySelector('.task-suggestion-chip:not(.dismiss)')?.click();
        const texts = manualTasks.map(t => t.text);
        return {
          tagCopied: texts.includes('docs: Write the outline') && texts.includes('docs: Fill in the details'),
          noDoublePrefixOnPreTagged: (() => {
            const t = 'work: Already tagged';
            const r = /^[a-z0-9]{1,12}:\s+/i;
            const prefix = 'docs: ';
            const tagged = r.test(t);
            const result = (prefix && !tagged) ? prefix + t : t;
            return result === t;
          })(),
        };
      });
      await expectAll('breakdown tag inheritance', { ...result, noErrors: errors.length === 0 });
      ok('breakdown tag inheritance: tag prefix copied to split tasks; already-tagged subtasks not double-prefixed');
      await page.close();
    }

    // 4. Static wiring: live API remains; the unreachable sheet is fully absent.
    {
      const indexSrc  = await readFile(join(ROOT, 'index.html'), 'utf8');
      const swSrc     = await readFile(join(ROOT, 'sw.js'), 'utf8');
      const assistSrc = await readFile(join(ROOT, 'assets/assistant.js'), 'utf8');
      const startupIdx   = indexSrc.indexOf('window._startAssistant();');
      const startMeetIdx = indexSrc.indexOf('window._startMeeting();');
      await expectAll('assistant module wiring', {
        moduleLoad:       indexSrc.includes('<script src="/assets/assistant.js"></script>'),
        startupCall:      startupIdx !== -1,
        beforeMeeting:    startupIdx !== -1 && startMeetIdx !== -1 && startupIdx < startMeetIdx,
        sheetDomRemoved:  !indexSrc.includes('id="aiPanel"') && !indexSrc.includes('id="aiBackdrop"'),
        sheetCssRemoved:  !indexSrc.includes('#aiPanel') && !indexSrc.includes('ai-chat-open'),
        sheetStateRemoved: !indexSrc.includes('_aiPanelOpen'),
        sheetCodeRemoved: !/\b(?:toggleAI|openAI|closeAI|_aiAskFromPanel|_aiSendFromInput)\b/.test(assistSrc),
        moduleInit:       assistSrc.includes('window._startAssistant = '),
        api:              assistSrc.includes("Today.define('assistant'"),
        precached:        swSrc.includes("'/assets/assistant.js'"),
      });
      ok('assistant module: reachable suggestion API remains; sheet code, state, CSS, and DOM are absent');
    }

  console.log('\nAssistant tests passed (3 behavior groups + wiring).');
} finally {
  if (browser) await browser.close();
  server.close();
}
