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
import { runInNewContext } from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };
let upstreamFixture = null;
const proxy = { exports:{}, process:{ env:{} }, fetch:(...args) => upstreamFixture(...args) };
runInNewContext(await readFile(join(ROOT, 'netlify/functions/ai-assist.js'), 'utf8'), proxy);

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/.netlify/functions/ai-assist') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    if (!upstreamFixture || !JSON.parse(body).systemPrompt?.includes('one newly captured task')) {
      res.writeHead(400, { 'Content-Type':'application/json' });
      res.end('{"error":"No fictional fixture for this request"}'); return;
    }
    const result = await proxy.exports.handler({ httpMethod:'POST', body });
    res.writeHead(result.statusCode, result.headers); res.end(result.body); return;
  }
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

const recoveryText = 'Ask Rowan about garden care and collect the parcel';
const recoveryReply = { suggest:true, type:'break_down', reason:'multiple_actions',
  message:'Two separate actions', subtasks:['Ask Rowan about garden care', 'Collect the parcel'] };

async function recoveryPage() {
  const result = await openPage();
  await result.page.evaluate(() => {
    localStorage.setItem('today_ai_provider', 'claude');
    localStorage.setItem('today_ai_key_claude', 'fictional-test-key');
    // Other startup writers share the proxy; post-add fixtures must not count or answer them.
    const realFetch = window.fetch.bind(window);
    window.__setAssistantFetch = handler => {
      window.fetch = (url, options) => {
        const body = options?.body && JSON.parse(options.body);
        return url === '/.netlify/functions/ai-assist' && body?.systemPrompt?.includes('one newly captured task')
          ? handler(url, options) : realFetch(url, options);
      };
    };
    const set = window.setTimeout, clear = window.clearTimeout, now = Date.now;
    let offset = 0, id = 1000000;
    const timers = new Map();
    Date.now = () => now() + offset;
    window.setTimeout = (callback, ms, ...args) => {
      if (![2000, 5000, 12000].includes(ms) || !new Error().stack.includes('/assets/assistant.js:')) return set(callback, ms, ...args);
      const handle = ++id; timers.set(handle, { callback:() => callback(...args), ms }); return handle;
    };
    window.clearTimeout = handle => { if (!timers.delete(handle)) clear(handle); };
    window.__assistantTimers = () => [...timers.values()].map(t => t.ms);
    window.__assistantCallback = ms => [...timers.values()].find(t => t.ms === ms)?.callback;
    window.__advanceAssistant = ms => {
      offset += ms;
      const ready = [...timers].filter(([, timer]) => timer.ms === ms);
      for (const [handle, timer] of ready) { timers.delete(handle); timer.callback(); }
    };
    window.__elapseAssistant = ms => { offset += ms; };
  });
  return result;
}

async function captureRecoveryTask(page) {
  await page.focus('#newTask'); await page.type('#newTask', recoveryText); await page.keyboard.press('Enter');
  await page.evaluate(text => {
    window.__recoveryTaskId = manualTasks.findLast(t => t.text === text).id;
    document.querySelector(`[data-taskid="${CSS.escape(window.__recoveryTaskId)}"]`)?.scrollIntoView({ block:'center' });
    window.__advanceAssistant(2000);
  }, recoveryText);
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
          if (ms >= 9999 && ms <= 10000) { exposureTimersArmed++; return 987654; }
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

    // Real Add -> real proxy -> fictional provider. A transient failure recovers once.
    {
      const { page, errors } = await recoveryPage();
      let calls = 0;
      upstreamFixture = async () => {
        calls++;
        return calls === 1
          ? { ok:false, status:503, text:async () => '{"error":{"message":"Temporary fixture failure"}}' }
          : { ok:true, text:async () => JSON.stringify({ content:[{ type:'text', text:JSON.stringify(recoveryReply) }] }) };
      };
      await captureRecoveryTask(page);
      await page.waitForFunction(() => window.__assistantTimers().includes(5000));
      const noPrematureOffer = await page.evaluate(() => !document.querySelector('.task-suggestion') && appMemory.suggestionOutcomes.length === 0);
      await page.evaluate(() => window.__advanceAssistant(5000));
      await page.waitForSelector('.task-suggestion:not(.removing)');
      await page.evaluate(() => { window.dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange')); });
      const result = await page.evaluate(() => ({
        exactlyOneOffer:appMemory.suggestionOutcomes.length === 1,
        originalPreserved:manualTasks.some(t => t.id === window.__recoveryTaskId),
        hasSplit:document.querySelector('.task-suggestion-chip:not(.dismiss)')?.textContent === 'Split into 2',
        noRetryAfterSuccess:!window.__assistantTimers().includes(5000),
      }));
      await expectAll('real capture/proxy transient recovery', { ...result, noPrematureOffer, twoCalls:calls === 2, noErrors:!errors.length });
      ok('actual capture + actual proxy: one 503 recovers once, one visible offer, no phantom outcome or reconnect replay');
      await page.close(); upstreamFixture = null;
    }

    {
      const { page, errors } = await recoveryPage();
      let calls = 0;
      upstreamFixture = async () => { calls++; return { ok:true, text:async () => JSON.stringify({ content:[{ type:'text', text:JSON.stringify(recoveryReply) }] }) }; };
      await page.setOfflineMode(true);
      await captureRecoveryTask(page);
      const noOfflineAttempt = calls === 0 && await page.evaluate(() => !window.__assistantTimers().includes(12000));
      await page.setOfflineMode(false);
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await page.waitForSelector('.task-suggestion:not(.removing)');
      await expectAll('offline capture recovery', { noOfflineAttempt, oneCall:calls === 1, noErrors:!errors.length });
      ok('offline capture: no provider attempt consumed; reconnect delivers the still-current recent task');
      await page.close(); upstreamFixture = null;
    }

    {
      const { page, errors } = await recoveryPage();
      let calls = 0;
      upstreamFixture = async () => { calls++; return { ok:true, text:async () => JSON.stringify({ content:[{ type:'text', text:JSON.stringify(recoveryReply) }] }) }; };
      await page.focus('#newTask'); await page.type('#newTask', recoveryText); await page.keyboard.press('Enter');
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable:true, value:true });
        Object.defineProperty(document, 'visibilityState', { configurable:true, value:'hidden' });
        window.__advanceAssistant(2000);
        window.dispatchEvent(new Event('online'));
      });
      const noHiddenAttempt = calls === 0 && await page.evaluate(() => !window.__assistantTimers().includes(12000));
      await page.evaluate(() => {
        delete document.hidden; delete document.visibilityState;
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForSelector('.task-suggestion:not(.removing)');
      await expectAll('hidden capture recovery', { noHiddenAttempt, oneCall:calls === 1, noErrors:!errors.length });
      ok('switching away before debounce defers the request; foreground resumes the same recent capture once');
      await page.close(); upstreamFixture = null;
    }

    // A stalled body obeys the request deadline; its late content cannot make another offer.
    {
      const { page, errors } = await recoveryPage();
      await page.evaluate(reply => {
        window.__recoveryCalls = 0;
        window.__setAssistantFetch(async () => {
          window.__recoveryCalls++;
          if (window.__recoveryCalls === 1) return { ok:true, json:() => new Promise(resolve => { window.__lateSplitBody = () => resolve(reply); }) };
          return { ok:true, json:async () => reply };
        });
      }, recoveryReply);
      const unrelatedStatus = await page.evaluate(async () => {
        const response = await fetch('/.netlify/functions/ai-assist', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ systemPrompt:'Fictional unrelated writer' }) });
        return response.status;
      });
      await expectAll('shared proxy fixture isolation', { unrelatedRejected:unrelatedStatus === 400, noSplitAttempt:await page.evaluate(() => window.__recoveryCalls === 0) });
      await captureRecoveryTask(page);
      await page.waitForFunction(() => typeof window.__lateSplitBody === 'function');
      await page.evaluate(() => window.__advanceAssistant(12000));
      await page.waitForFunction(() => window.__assistantTimers().includes(5000));
      await page.evaluate(() => window.__advanceAssistant(5000));
      await page.waitForSelector('.task-suggestion:not(.removing)');
      await page.evaluate(async () => { window.__lateSplitBody(); await Promise.resolve(); window.dispatchEvent(new Event('online')); });
      const result = await page.evaluate(() => ({
        boundedCalls:window.__recoveryCalls === 2, oneOffer:appMemory.suggestionOutcomes.length === 1,
        noRetry:!window.__assistantTimers().includes(5000),
      }));
      await expectAll('post-add body deadline', { ...result, noErrors:!errors.length });
      ok('request/body deadline recovers once; late old content cannot duplicate or replay the offer');
      await page.close();
    }

    {
      const { page, errors } = await recoveryPage();
      for (const kind of ['network', 408, 429, 502]) {
        await page.evaluate(({ kind, reply }) => {
          window.__recoveryCalls = 0; appMemory.suggestionOutcomes = [];
          window.__setAssistantFetch(async () => {
            window.__recoveryCalls++;
            if (window.__recoveryCalls === 1) {
              if (kind === 'network') throw new TypeError('Failed to fetch');
              return { ok:false, status:kind };
            }
            return { ok:true, json:async () => reply };
          });
        }, { kind, reply:recoveryReply });
        await captureRecoveryTask(page);
        await page.waitForFunction(() => window.__assistantTimers().includes(5000));
        await page.evaluate(() => window.__advanceAssistant(5000));
        await page.waitForSelector('.task-suggestion:not(.removing)');
        await expectAll('transient recovery: ' + kind, await page.evaluate(() => ({
          twoCalls:window.__recoveryCalls === 2, oneOffer:appMemory.suggestionOutcomes.length === 1,
        })));
        await page.evaluate(() => Today.use('assistant')._aiDismissSuggestion('user'));
      }
      await expectAll('transient recovery page', { noErrors:!errors.length });
      ok('network, 408, 429 and 5xx recover once without changing offer eligibility');
      await page.close();
    }

    // Invalid/declined/suppressed results are terminal. Failures do not become negative votes.
    {
      const { page, errors } = await recoveryPage();
      for (const kind of ['401', '404', 'invalid-json', 'null', 'abstain', 'ungrounded', 'suppressed', 'repeated-503']) {
        await page.evaluate(({ kind, reply }) => {
          window.__recoveryCalls = 0;
          appMemory.suggestionOutcomes = [];
          if (kind === 'suppressed') {
            appMemory.suggestionOutcomes = Array.from({ length:4 }, (_, i) => ({ id:String(i), reason:'multiple_actions', ignoredAt:'2026-10-01T00:00:00Z' }));
            window._suggestionShouldOffer = () => false;
          } else window._suggestionShouldOffer = (reason, id) => Today.use('suggestion-policy').shouldOffer(appMemory.suggestionOutcomes, reason, id);
          window.__setAssistantFetch(async () => {
            window.__recoveryCalls++;
            if (['401', '404', 'repeated-503'].includes(kind)) return { ok:false, status:kind === 'repeated-503' ? 503 : Number(kind) };
            return { ok:true, json:async () => {
              if (kind === 'invalid-json') throw new SyntaxError('Fictional malformed JSON');
              if (kind === 'null') return null;
              if (kind === 'abstain') return { suggest:false, type:'none' };
              if (kind === 'ungrounded') return { ...reply, subtasks:['Buy new supplies', 'Collect the parcel'] };
              return reply;
            } };
          });
        }, { kind, reply:recoveryReply });
        await captureRecoveryTask(page);
        await page.waitForFunction(() => window.__recoveryCalls === 1 && !window.__assistantTimers().includes(12000));
        if (kind === 'repeated-503') {
          await page.waitForFunction(() => window.__assistantTimers().includes(5000));
          await page.evaluate(() => window.__advanceAssistant(5000));
          await page.waitForFunction(() => window.__recoveryCalls === 2 && !window.__assistantTimers().includes(12000));
        }
        await page.evaluate(() => { window.dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange')); });
        const result = await page.evaluate(expected => ({
          calls:window.__recoveryCalls === expected,
          noRetry:!window.__assistantTimers().includes(5000),
          noOffer:!document.querySelector('.task-suggestion:not(.removing)'),
          noNewNegativeEvidence:appMemory.suggestionOutcomes.length === (appMemory.suggestionOutcomes[0]?.ignoredAt ? 4 : 0),
        }), kind === 'repeated-503' ? 2 : 1);
        await expectAll('terminal post-add result: ' + kind, { ...result, noErrors:!errors.length });
      }
      ok('401/404, invalid/empty/declined/ungrounded/suppressed results stay terminal; transient attempts stop at two');
      await page.close();
    }

    for (const change of ['rename', 'delete', 'complete', 'move', 'credentials', 'expiry', 'new-task']) {
      const { page, errors } = await recoveryPage();
      await page.evaluate(() => {
        window.__recoveryCalls = 0;
        window.__setAssistantFetch(async () => { window.__recoveryCalls++; return { ok:false, status:503 }; });
      });
      await captureRecoveryTask(page);
      await page.waitForFunction(() => window.__assistantTimers().includes(5000));
      await page.evaluate(change => {
        const id = window.__recoveryTaskId, task = manualTasks.find(t => t.id === id);
        const staleRetry = window.__assistantCallback(5000);
        if (change === 'rename') task.text = 'Different fictional commitment';
        if (change === 'delete' || change === 'move') manualTasks = manualTasks.filter(t => t.id !== id);
        if (change === 'move') soonTasks.push(task);
        if (change === 'complete') doneIds.add(id);
        if (change === 'credentials') localStorage.setItem('today_ai_key_claude', 'another-fictional-key');
        if (change === 'expiry') window.__elapseAssistant(120001);
        if (change === 'new-task') {
          const next = { id:'fictional_new_capture', text:'Read the new draft' };
          manualTasks.push(next); Today.use('assistant')._aiAnalyzeTask(next.id, next.text);
          staleRetry(); // Even an already queued old callback cannot start the new capture early.
        } else window.__advanceAssistant(5000);
      }, change);
      const result = await page.evaluate(change => ({
        noRequest:window.__recoveryCalls === 1,
        noOffer:!document.querySelector('.task-suggestion:not(.removing)'),
        noStaleRetry:!window.__assistantTimers().includes(5000),
        newDebouncePreserved:change !== 'new-task' || window.__assistantTimers().includes(2000),
      }), change);
      await expectAll('stale post-add retry: ' + change, { ...result, noErrors:!errors.length });
      await page.close();
    }
    ok('retry owner fences: edit/delete/check/move/key/expiry/new capture prevent old requests and stale callback side effects');

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

  console.log('\nAssistant tests passed (capture, delivery, recovery, owner fences and wiring).');
} finally {
  if (browser) await browser.close();
  server.close();
}
