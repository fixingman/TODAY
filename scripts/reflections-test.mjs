// TODAY — post-triage reflections regression test
//
// Covers consent lifecycle, timer delegation, response validation,
// memory panel & deletion, Dropbox sync invariants, relationship thresholds,
// AI reflection privacy, and static wiring.
//
// Run from repo root:
//   node scripts/reflections-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css' };

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
const ok = msg => console.log('  ✓ ' + msg);
const fail = async (label, detail) => {
  console.error('✗ FAIL — ' + label);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};
const expectAll = async (label, result) => {
  const bad = Object.entries(result).filter(([, v]) => !v);
  if (bad.length) await fail(label, result);
};

const TODAY = new Date().getFullYear() + '-' +
  String(new Date().getMonth() + 1).padStart(2, '0') + '-' +
  String(new Date().getDate()).padStart(2, '0');
const _yesterday = new Date(); _yesterday.setDate(_yesterday.getDate() - 1);
const YESTERDAY = _yesterday.getFullYear() + '-' +
  String(_yesterday.getMonth() + 1).padStart(2, '0') + '-' +
  String(_yesterday.getDate()).padStart(2, '0');

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

async function openPage(extraSeed) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(({ extra }) => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_manual', JSON.stringify([{ id: 'task_1', text: 'Test task' }]));
    localStorage.setItem('today_done', JSON.stringify([]));
    if (extra) Object.entries(extra).forEach(([k, v]) => localStorage.setItem(k, v));
  }, { extra: extraSeed || null });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof window._startReflections === 'function' &&
          typeof Today?.use('reflections')._reflectionShowAfterTriage === 'function' &&
          !!document.getElementById('triageReflection'),
    { timeout: 15000 }
  );
  // Stub all side-effects
  await page.evaluate(() => {
    window.dropboxAutoSave = () => {};
    window.dropboxBackup = () => {};
    window._haptic = () => {};
    window._setLastLocalChange = () => {};
    window._triageResetAutoClose = () => {};
    window.renderManual = () => {};
    window.renderMemoryPanel = () => {};
  });
  return { page, errors };
}

try {
  // ── 1. Consent lifecycle ─────────────────────────────────────────────────

  // 1.1 No policy, cooldown permits → visible with timeoutMs
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const res = Today.use('reflections')._reflectionShowAfterTriage();
      return { visible: res.visible, hasTimeout: typeof res.timeoutMs === 'number' && res.timeoutMs > 0 };
    });
    await expectAll('no policy → visible with timeoutMs', { ...result, noErrors: !errors.length });
    ok('no policy → _reflectionShowAfterTriage() visible with timeoutMs');
    await page.close();
  }

  // 1.2 No policy, cooldown not elapsed → not visible
  {
    const { page } = await openPage({
      today_reflection_intro_seen_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    });
    const result = await page.evaluate(() => {
      const res = Today.use('reflections')._reflectionShowAfterTriage();
      return { notVisible: !res.visible };
    });
    await expectAll('cooldown not elapsed → not visible', result);
    ok('cooldown not elapsed (2 days ago) → not visible');
    await page.close();
  }

  // 1.3 Policy = not_for_me → not visible
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'not_for_me', updatedAt: new Date().toISOString() }),
    });
    const result = await page.evaluate(() => {
      const res = Today.use('reflections')._reflectionShowAfterTriage();
      return { notVisible: !res.visible };
    });
    await expectAll('not_for_me → not visible', result);
    ok('policy=not_for_me → not visible');
    await page.close();
  }

  // 1.4 Policy = remember, no today response → visible at 6s
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
    });
    const result = await page.evaluate(() => {
      const res = Today.use('reflections')._reflectionShowAfterTriage();
      return { visible: res.visible, time6s: res.timeoutMs === 6000 };
    });
    await expectAll('policy=remember, no response → visible 6s', result);
    ok('policy=remember, no today response → visible with 6s timeout');
    await page.close();
  }

  // 1.5 Policy = remember, today response exists → not visible
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_reflections: JSON.stringify([{ date: TODAY, feeling: 'calm', updatedAt: new Date().toISOString() }]),
    });
    const result = await page.evaluate(() => {
      const res = Today.use('reflections')._reflectionShowAfterTriage();
      return { notVisible: !res.visible };
    });
    await expectAll('policy=remember, today exists → not visible', result);
    ok('policy=remember, today response exists → not visible');
    await page.close();
  }

  // 1.6 reflectionRemember saves policy and shows question
  {
    const { page } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('reflections').reflectionRemember();
      const policy = JSON.parse(localStorage.getItem('today_reflection_policy') || 'null');
      const el = document.getElementById('triageReflection');
      return {
        policyRemember: policy?.choice === 'remember',
        hasButtons: !!(el && el.querySelectorAll('.reflection-feeling-btn').length === 6),
      };
    });
    await expectAll('reflectionRemember saves policy + shows question', result);
    ok('reflectionRemember: policy=remember, six feeling buttons shown');
    await page.close();
  }

  // 1.7 reflectionDecline saves not_for_me
  {
    const { page } = await openPage();
    const result = await page.evaluate(() => {
      Today.use('reflections').reflectionDecline();
      const policy = JSON.parse(localStorage.getItem('today_reflection_policy') || 'null');
      return { policyDeclined: policy?.choice === 'not_for_me' };
    });
    await expectAll('reflectionDecline saves not_for_me', result);
    ok('reflectionDecline: policy=not_for_me');
    await page.close();
  }

  // ── 2. Response validation ───────────────────────────────────────────────

  // 2.1 reflectionSelect stores entry for today
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
    });
    const today = TODAY;
    const result = await page.evaluate(date => {
      Today.use('reflections').reflectionSelect('present');
      const list = JSON.parse(localStorage.getItem('today_reflections') || '[]');
      const entry = list.find(r => r.date === date);
      return {
        entryExists: !!entry,
        feelingCorrect: entry?.feeling === 'present',
        hasUpdatedAt: typeof entry?.updatedAt === 'string',
      };
    }, today);
    await expectAll('reflectionSelect stores entry', result);
    ok('reflectionSelect("present"): entry saved with correct date and feeling');
    await page.close();
  }

  // 2.2 Second reflectionSelect same day replaces entry
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
    });
    const today = TODAY;
    const result = await page.evaluate(date => {
      Today.use('reflections').reflectionSelect('calm');
      Today.use('reflections').reflectionSelect('alive');
      const list = JSON.parse(localStorage.getItem('today_reflections') || '[]');
      const todayEntries = list.filter(r => r.date === date);
      return {
        onlyOne: todayEntries.length === 1,
        isAlive: todayEntries[0]?.feeling === 'alive',
      };
    }, today);
    await expectAll('second select replaces entry', result);
    ok('reflectionSelect x2 same day: only one entry, latest wins');
    await page.close();
  }

  // 2.3 Invalid feeling ignored
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
    });
    const result = await page.evaluate(() => {
      const before = localStorage.getItem('today_reflections');
      Today.use('reflections').reflectionSelect('anxious'); // not in allowed list
      const after = localStorage.getItem('today_reflections');
      return { noWrite: before === after };
    });
    await expectAll('invalid feeling silently ignored', result);
    ok('reflectionSelect("anxious"): silently ignored, no write');
    await page.close();
  }

  // 2.4 Pruning to 30 days
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
    });
    const result = await page.evaluate(() => {
      // Build 31 reflections spanning 31 days
      const list = [];
      for (let i = 30; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const iso = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
        list.push({ date: iso, feeling: 'calm', updatedAt: new Date(Date.now() - i * 86400000).toISOString() });
      }
      localStorage.setItem('today_reflections', JSON.stringify(list));
      // Trigger a selection to force a prune via save path
      Today.use('reflections').reflectionSelect('tense');
      const saved = JSON.parse(localStorage.getItem('today_reflections') || '[]');
      return { maxThirty: saved.length <= 30 };
    });
    await expectAll('pruning to 30 days', result);
    ok('31-entry list pruned to ≤30 entries after select');
    await page.close();
  }

  // ── 3. Memory panel & deletion ───────────────────────────────────────────

  // 3.1 _reflectionRenderMemory appends a block
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
    });
    const result = await page.evaluate(() => {
      const container = document.createElement('div');
      Today.use('reflections')._reflectionRenderMemory(container);
      return {
        hasBlock: container.querySelector('.reflection-memory-block') !== null,
        hasId: !!container.querySelector('#reflectionMemoryBlock'),
      };
    });
    await expectAll('_reflectionRenderMemory appends block', result);
    ok('_reflectionRenderMemory: block appended with correct class and id');
    await page.close();
  }

  // 3.2 removed: the Forget flow itself was removed in v2.77.12 ("reflections panel
  // auto-reflects on open, removes Forget flow"). `reflectionForgetConfirm` no longer
  // exists, and this test had been failing since — a stale test for a deleted feature.
  // The decline path that still exists is covered above by the reflectionDecline case.

  // 3.3 reflectionRememberAgain restores policy
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'not_for_me', updatedAt: new Date().toISOString() }),
    });
    const result = await page.evaluate(() => {
      Today.use('reflections').reflectionRememberAgain();
      const policy = JSON.parse(localStorage.getItem('today_reflection_policy') || 'null');
      return { policyRemember: policy?.choice === 'remember' };
    });
    await expectAll('reflectionRememberAgain restores policy', result);
    ok('reflectionRememberAgain: policy=remember');
    await page.close();
  }

  // ── 4. Dropbox sync invariants ───────────────────────────────────────────

  // 4.1 Policy LWW — remote newer → adopted
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: '2026-08-10T12:00:00.000Z' }),
    });
    const result = await page.evaluate(() => {
      const remoteData = {
        reflection_policy: { choice: 'not_for_me', updatedAt: '2026-08-11T12:00:00.000Z' },
      };
      const changed = Today.use('reflections')._reflectionMergeRemote(remoteData);
      const policy = JSON.parse(localStorage.getItem('today_reflection_policy') || 'null');
      return { changed: changed, policyUpdated: policy?.choice === 'not_for_me' };
    });
    await expectAll('policy LWW — remote newer adopted', result);
    ok('_reflectionMergeRemote: remote policy (newer updatedAt) wins');
    await page.close();
  }

  // 4.2 Policy LWW — local newer → kept
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: '2026-08-12T12:00:00.000Z' }),
    });
    const result = await page.evaluate(() => {
      const remoteData = {
        reflection_policy: { choice: 'not_for_me', updatedAt: '2026-08-10T12:00:00.000Z' },
      };
      Today.use('reflections')._reflectionMergeRemote(remoteData);
      const policy = JSON.parse(localStorage.getItem('today_reflection_policy') || 'null');
      return { localKept: policy?.choice === 'remember' };
    });
    await expectAll('policy LWW — local newer kept', result);
    ok('_reflectionMergeRemote: local policy (newer updatedAt) kept');
    await page.close();
  }

  // 4.3 Response union — remote entry for new date merged in
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_reflections: JSON.stringify([{ date: YESTERDAY, feeling: 'calm', updatedAt: '2026-08-15T22:00:00.000Z' }]),
    });
    const result = await page.evaluate(() => {
      const remoteData = {
        reflections: [{ date: _localISO(), feeling: 'alive', updatedAt: '2026-08-16T22:00:00.000Z' }],
      };
      const changed = Today.use('reflections')._reflectionMergeRemote(remoteData);
      const list = JSON.parse(localStorage.getItem('today_reflections') || '[]');
      return {
        changed: changed,
        hasBoth: list.length >= 2,
        remoteEntryPresent: list.some(r => r.feeling === 'alive'),
      };
    });
    await expectAll('response union — remote entry merged', result);
    ok('_reflectionMergeRemote: remote-only date merged into local list');
    await page.close();
  }

  // 4.4 Clear watermark — entries ≤ watermark discarded
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: '2026-08-10T12:00:00.000Z' }),
      today_reflections: JSON.stringify([
        { date: YESTERDAY, feeling: 'tense', updatedAt: '2026-08-14T22:00:00.000Z' },
        { date: TODAY,     feeling: 'calm',  updatedAt: '2026-08-15T22:00:00.000Z' },
      ]),
    });
    const result = await page.evaluate(() => {
      const remoteData = { reflections_cleared_at: '2026-08-14T23:00:00.000Z' };
      Today.use('reflections')._reflectionMergeRemote(remoteData);
      const list = JSON.parse(localStorage.getItem('today_reflections') || '[]');
      return {
        oldEntryDiscarded: !list.some(r => r.feeling === 'tense'),
        newEntryKept: list.some(r => r.feeling === 'calm'),
      };
    });
    await expectAll('watermark discards old entries', result);
    ok('_reflectionMergeRemote: entries ≤ watermark discarded, newer entries kept');
    await page.close();
  }

  // 4.5 Backup fields present / intro key absent
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_reflections: JSON.stringify([{ date: TODAY, feeling: 'alive', updatedAt: new Date().toISOString() }]),
      today_reflection_intro_seen_at: new Date().toISOString(),
    });
    const result = await page.evaluate(() => {
      const fields = Today.use('reflections')._reflectionBackupFields();
      return {
        hasPolicyField: 'reflection_policy' in fields,
        hasReflections: 'reflections' in fields,
        hasClearedAt: 'reflections_cleared_at' in fields,
        introAbsent: !('today_reflection_intro_seen_at' in fields),
      };
    });
    await expectAll('backup fields — intro key excluded', result);
    ok('_reflectionBackupFields: 3 fields present; today_reflection_intro_seen_at absent');
    await page.close();
  }

  // ── 5. Relationship thresholds ───────────────────────────────────────────

  // 5.1 A small reflection record stays a record, without faux insight
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
    });
    const result = await page.evaluate(() => {
      const list = Array.from({ length: 13 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        feeling: 'calm',
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem('today_reflections', JSON.stringify(list));
      const container = document.createElement('div');
      Today.use('reflections')._reflectionRenderMemory(container);
      const text = container.textContent;
      return { countOnly: text.includes('13 evenings') && !text.includes('On evenings you reflected') };
    });
    await expectAll('small reflection record → count only', result);
    ok('small reflection record → count only');
    await page.close();
  }

  // 5.2 A dominant feeling alone is still a frequency table, so stay silent
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_ai_provider: 'claude',
      today_ai_key_claude: 'test-key',
    });
    const result = await page.evaluate(async () => {
      // 14 reflections: 8 'calm' (57%), 6 others
      const list = Array.from({ length: 14 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        feeling: i < 8 ? 'calm' : ['drained', 'tense', 'present', 'alive', 'drained', 'tense'][i - 8],
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem('today_reflections', JSON.stringify(list));
      let fetches = 0;
      window.fetch = async () => { fetches++; return { ok: true, json: async () => ({ message: 'unused' }) }; };
      const container = document.createElement('div');
      Today.use('reflections')._reflectionRenderMemory(container);
      await new Promise(resolve => setTimeout(resolve, 20));
      return {
        countShown: container.textContent.includes('14 evenings'),
        noFrequencyInference: !container.textContent.includes('On evenings you reflected'),
        noAIRequest: fetches === 0,
      };
    });
    await expectAll('dominant feeling without commitment contrast → silence', result);
    ok('dominant feeling alone → count remains, no frequency-table inference');
    await page.close();
  }

  // 5.3 Configured AI + a code-qualified commitment relationship → one line
  {
    const { page, errors } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_ai_provider: 'claude',
      today_ai_key_claude: 'test-key',
    });
    const result = await page.evaluate(async () => {
      const list = Array.from({ length: 16 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const chosenFeelings = ['drained', 'present', 'off', 'calm', 'alive', 'tense', 'present', 'off'];
        return {
          date,
          feeling: i < 8 ? (i < 6 ? 'drained' : 'calm') : chosenFeelings[i - 8],
          updatedAt: new Date().toISOString(),
        };
      });
      localStorage.setItem('today_reflections', JSON.stringify(list));
      appMemory.taskOutcomes = list.map((r, i) => ({
        id: 'outcome_' + i,
        date: r.date,
        outcome: 'done',
        obligation: i < 8,
        focusSessions: 0,
      }));

      let request = null;
      window.fetch = async (_url, options) => {
        request = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            message: 'On evenings you reflected, drained appeared more often after finishing a “have to” than after finishing something you chose.',
          }),
        };
      };

      const container = document.createElement('div');
      document.body.appendChild(container);
      Today.use('reflections')._reflectionRenderMemory(container);
      const started = container.textContent.includes('reflecting…');

      await new Promise(resolve => setTimeout(resolve, 50));
      const text = document.getElementById('reflectionMemoryBlock')?.textContent || '';
      return {
        started,
        resultShown: text.includes('drained appeared more often'),
        requestSent: request?.provider === 'claude' && request?.apiKey === 'test-key',
        aggregateOnly: request?.messages?.[0]?.content?.includes('"reflected_evenings_count":16') &&
          request.messages[0].content.includes('"kind":"feeling-vs-obligation"') &&
          !request.messages[0].content.includes('outcome_') &&
          !request.messages[0].content.includes(list[0].date) &&
          !request.messages[0].content.includes('feeling_counts'),
        insightPrompt: request?.systemPrompt?.includes('exactly one complete sentence under 24 words') &&
          request.systemPrompt.includes('Phrase only that relationship') &&
          request.systemPrompt.includes('Copy more_context and less_context verbatim') &&
          request.systemPrompt.includes('Reply only as valid JSON'),
      };
    });
    await expectAll('configured AI + 16 reflections → reflection shown', {
      ...result,
      noErrors: !errors.length,
    });
    ok('qualified commitment relationship → selected aggregate is phrased, raw records stay local');
    await page.close();
  }

  // 5.4 Letting go vs finishing is the second commitment-shaped candidate
  {
    const { page, errors } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_ai_provider: 'claude',
      today_ai_key_claude: 'test-key',
    });
    const result = await page.evaluate(async () => {
      const list = Array.from({ length: 8 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        return {
          date,
          feeling: i < 4 ? (i < 3 ? 'calm' : 'drained') : ['present', 'off', 'alive', 'tense'][i - 4],
          updatedAt: new Date().toISOString(),
        };
      });
      localStorage.setItem('today_reflections', JSON.stringify(list));
      appMemory.taskOutcomes = list.map((r, i) => ({
        id: 'release_' + i,
        date: r.date,
        outcome: i < 4 ? 'letgo' : 'done',
        obligation: false,
        focusSessions: 0,
      }));
      let request = null;
      window.fetch = async (_url, options) => {
        request = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            message: 'On evenings you reflected, calm appeared more often after letting something go than after finishing without letting anything go.',
          }),
        };
      };

      const container = document.createElement('div');
      document.body.appendChild(container);
      Today.use('reflections')._reflectionRenderMemory(container);
      await new Promise(resolve => setTimeout(resolve, 50));
      const text = document.getElementById('reflectionMemoryBlock')?.textContent || '';
      return {
        releaseSelected: request?.messages?.[0]?.content?.includes('"kind":"feeling-vs-release"'),
        resultShown: text.includes('calm appeared more often after letting something go'),
      };
    });
    await expectAll('letting go vs finishing → relationship shown', { ...result, noErrors: !errors.length });
    ok('letting go vs finishing → second commitment relationship is selected and phrased');
    await page.close();
  }

  // 5.4b Focus sessions vs no-focus evenings is a third commitment axis
  {
    const { page, errors } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_ai_provider: 'claude',
      today_ai_key_claude: 'test-key',
    });
    const result = await page.evaluate(async () => {
      const list = Array.from({ length: 8 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        return {
          date,
          feeling: i < 4 ? (i < 3 ? 'alive' : 'off') : ['tense', 'present', 'calm', 'drained'][i - 4],
          updatedAt: new Date().toISOString(),
        };
      });
      localStorage.setItem('today_reflections', JSON.stringify(list));
      appMemory.taskOutcomes = list.map((r, i) => ({
        id: 'focus_' + i,
        date: r.date,
        outcome: 'done',
        obligation: false,
        focusSessions: i < 4 ? 2 : 0,
        backfilled: false,
      }));
      let request = null;
      window.fetch = async (_url, options) => {
        request = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            message: 'On evenings you reflected, alive appeared more often after a focused day than after a day without focus.',
          }),
        };
      };
      const container = document.createElement('div');
      document.body.appendChild(container);
      Today.use('reflections')._reflectionRenderMemory(container);
      await new Promise(resolve => setTimeout(resolve, 50));
      const text = document.getElementById('reflectionMemoryBlock')?.textContent || '';
      return {
        focusSelected: request?.messages?.[0]?.content?.includes('"kind":"feeling-vs-focus"'),
        resultShown: text.includes('alive appeared more often after a focused day'),
      };
    });
    await expectAll('focus sessions vs no-focus → relationship shown', { ...result, noErrors: !errors.length });
    ok('focus vs no-focus → third commitment relationship is selected and phrased');
    await page.close();
  }

  // 5.4b-backfill Backfilled rows are excluded from focus partitions
  {
    const { page, errors } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_ai_provider: 'claude',
      today_ai_key_claude: 'test-key',
    });
    const result = await page.evaluate(async () => {
      const list = Array.from({ length: 8 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        return { date, feeling: i < 4 ? 'alive' : 'tense', updatedAt: new Date().toISOString() };
      });
      localStorage.setItem('today_reflections', JSON.stringify(list));
      // All rows backfilled — focusSessions: 0 is unknown, so no focus candidate
      appMemory.taskOutcomes = list.map((r, i) => ({
        id: 'bf_' + i,
        date: r.date,
        outcome: 'done',
        obligation: false,
        focusSessions: 0,
        backfilled: true,
      }));
      let request = null;
      window.fetch = async (_url, options) => { request = JSON.parse(options.body); return { ok: true, json: async () => ({ message: '' }) }; };
      const container = document.createElement('div');
      document.body.appendChild(container);
      Today.use('reflections')._reflectionRenderMemory(container);
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        focusNotSelected: !request?.messages?.[0]?.content?.includes('"kind":"feeling-vs-focus"'),
      };
    });
    await expectAll('backfilled rows excluded from focus partition', { ...result, noErrors: !errors.length });
    ok('backfilled focusSessions: 0 → focus axis is silent');
    await page.close();
  }

  // 5.4c Reviving a task vs finishing-only is a fourth commitment axis
  {
    const { page, errors } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_ai_provider: 'claude',
      today_ai_key_claude: 'test-key',
    });
    const result = await page.evaluate(async () => {
      const list = Array.from({ length: 8 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        return {
          date,
          feeling: i < 4 ? (i < 3 ? 'present' : 'off') : ['tense', 'drained', 'alive', 'calm'][i - 4],
          updatedAt: new Date().toISOString(),
        };
      });
      localStorage.setItem('today_reflections', JSON.stringify(list));
      appMemory.taskOutcomes = list.map((r, i) => ({
        id: 'revive_' + i,
        date: r.date,
        outcome: i < 4 ? 'revive' : 'done',
        obligation: null,
        focusSessions: 0,
        backfilled: true,
      }));
      let request = null;
      window.fetch = async (_url, options) => {
        request = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            message: 'On evenings you reflected, present appeared more often after reviving something than after finishing without reviving anything.',
          }),
        };
      };
      const container = document.createElement('div');
      document.body.appendChild(container);
      Today.use('reflections')._reflectionRenderMemory(container);
      await new Promise(resolve => setTimeout(resolve, 50));
      const text = document.getElementById('reflectionMemoryBlock')?.textContent || '';
      return {
        reviveSelected: request?.messages?.[0]?.content?.includes('"kind":"feeling-vs-revive"'),
        resultShown: text.includes('present appeared more often after reviving something'),
      };
    });
    await expectAll('reviving vs finishing-only → relationship shown', { ...result, noErrors: !errors.length });
    ok('revive vs finish-only → fourth commitment relationship is selected and phrased');
    await page.close();
  }

  // 5.5 A truncated response is withheld instead of shown mid-sentence
  {
    const { page, errors } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_ai_provider: 'claude',
      today_ai_key_claude: 'test-key',
    });
    const result = await page.evaluate(async () => {
      const list = Array.from({ length: 16 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i);
        const date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        return {
          date,
          feeling: i < 8 ? (i < 6 ? 'drained' : 'calm') : ['drained', 'present', 'off', 'calm', 'alive', 'tense', 'present', 'off'][i - 8],
          updatedAt: new Date().toISOString(),
        };
      });
      localStorage.setItem('today_reflections', JSON.stringify(list));
      appMemory.taskOutcomes = list.map((r, i) => ({
        id: 'outcome_' + i,
        date: r.date,
        outcome: 'done',
        obligation: i < 8,
        focusSessions: 0,
      }));
      window.fetch = async () => ({
        ok: true,
        json: async () => ({ message: 'Looking at evenings you reflected, drained and present appear most often, followed by calm and' }),
      });

      const container = document.createElement('div');
      document.body.appendChild(container);
      Today.use('reflections')._reflectionRenderMemory(container);
      await new Promise(resolve => setTimeout(resolve, 50));
      const text = document.getElementById('reflectionMemoryBlock')?.textContent || '';
      return {
        partialHidden: !text.includes('followed by calm and'),
        pendingCleared: !text.includes('reflecting…'),
        countKept: text.includes('16 evenings'),
      };
    });
    await expectAll('truncated reflection → withheld', { ...result, noErrors: !errors.length });
    ok('truncated reflection → incomplete sentence withheld, count retained');
    await page.close();
  }

  // ── 6. Static wiring ────────────────────────────────────────────────────

  {
    const indexSrc      = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc         = await readFile(join(ROOT, 'sw.js'), 'utf8');
    const reflectionsSrc = await readFile(join(ROOT, 'assets/reflections.js'), 'utf8');

    const reflIdx = indexSrc.indexOf("assets/reflections.js");
    const dropIdx = indexSrc.indexOf("assets/dropbox.js");
    const triaIdx = indexSrc.indexOf("assets/triage.js");
    const appVerMatch = indexSrc.match(/const CHANGELOG\s*=\s*\{\s*'([^']+)'/);
    const appVer = appVerMatch?.[1];

    await expectAll('static wiring', {
      modulePresent:   reflIdx !== -1,
      afterDropbox:    dropIdx !== -1 && reflIdx > dropIdx,
      beforeTriage:    triaIdx !== -1 && reflIdx < triaIdx,
      startCall:       indexSrc.includes('window._startReflections();'),
      domElement:      indexSrc.includes('id="triageReflection"'),
      precached:       swSrc.includes("'/assets/reflections.js'"),
      cacheVersion:    !!appVer && swSrc.includes(`'today-v${appVer}'`),
      iife:            reflectionsSrc.includes('window._startReflections = function()'),
      componentApi:    reflectionsSrc.includes("Today.define('reflections'"),
    });
    ok('static wiring: script order, DOM element, start call, precache, CACHE_VERSION, component API');
  }

  console.log('\nReflections tests passed (27 tests).');
} finally {
  if (browser) await browser.close();
  server.close();
}
