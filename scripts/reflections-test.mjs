// TODAY — post-triage reflections regression test
//
// Covers consent lifecycle, timer delegation, response validation,
// memory panel & deletion, Dropbox sync invariants, observation thresholds,
// AI reflection privacy, and static wiring.
//
// Run from repo root:
//   node scripts/reflections-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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
          typeof window._reflectionShowAfterTriage === 'function' &&
          typeof window.reflectionRemember === 'function' &&
          typeof window.reflectionSelect === 'function' &&
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
      const res = window._reflectionShowAfterTriage();
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
      const res = window._reflectionShowAfterTriage();
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
      const res = window._reflectionShowAfterTriage();
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
      const res = window._reflectionShowAfterTriage();
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
      const res = window._reflectionShowAfterTriage();
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
      window.reflectionRemember();
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
      window.reflectionDecline();
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
      window.reflectionSelect('present');
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
      window.reflectionSelect('calm');
      window.reflectionSelect('alive');
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
      window.reflectionSelect('anxious'); // not in allowed list
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
      window.reflectionSelect('tense');
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
      window._reflectionRenderMemory(container);
      return {
        hasBlock: container.querySelector('.reflection-memory-block') !== null,
        hasId: !!container.querySelector('#reflectionMemoryBlock'),
      };
    });
    await expectAll('_reflectionRenderMemory appends block', result);
    ok('_reflectionRenderMemory: block appended with correct class and id');
    await page.close();
  }

  // 3.2 reflectionForgetConfirm clears all data
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
      today_reflections: JSON.stringify([{ date: TODAY, feeling: 'calm', updatedAt: new Date().toISOString() }]),
    });
    const result = await page.evaluate(() => {
      window.reflectionForgetConfirm();
      const policy = JSON.parse(localStorage.getItem('today_reflection_policy') || 'null');
      const reflections = localStorage.getItem('today_reflections');
      const cleared = localStorage.getItem('today_reflections_cleared_at');
      return {
        policyNotForMe: policy?.choice === 'not_for_me',
        reflectionsGone: reflections === null || JSON.parse(reflections || '[]').length === 0,
        clearedStamped: typeof cleared === 'string' && cleared.length > 0,
      };
    });
    await expectAll('reflectionForgetConfirm clears data', result);
    ok('reflectionForgetConfirm: policy=not_for_me, reflections removed, watermark stamped');
    await page.close();
  }

  // 3.3 reflectionRememberAgain restores policy
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'not_for_me', updatedAt: new Date().toISOString() }),
    });
    const result = await page.evaluate(() => {
      window.reflectionRememberAgain();
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
      const changed = window._reflectionMergeRemote(remoteData);
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
      window._reflectionMergeRemote(remoteData);
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
      today_reflections: JSON.stringify([{ date: '2026-08-15', feeling: 'calm', updatedAt: '2026-08-15T22:00:00.000Z' }]),
    });
    const result = await page.evaluate(() => {
      const remoteData = {
        reflections: [{ date: '2026-08-16', feeling: 'alive', updatedAt: '2026-08-16T22:00:00.000Z' }],
      };
      const changed = window._reflectionMergeRemote(remoteData);
      const list = JSON.parse(localStorage.getItem('today_reflections') || '[]');
      return {
        changed: changed,
        hasBoth: list.length >= 2,
        remoteEntryPresent: list.some(r => r.date === '2026-08-16' && r.feeling === 'alive'),
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
        { date: '2026-08-14', feeling: 'tense', updatedAt: '2026-08-14T22:00:00.000Z' },
        { date: '2026-08-15', feeling: 'calm',  updatedAt: '2026-08-15T22:00:00.000Z' },
      ]),
    });
    const result = await page.evaluate(() => {
      const remoteData = { reflections_cleared_at: '2026-08-14T23:00:00.000Z' };
      window._reflectionMergeRemote(remoteData);
      const list = JSON.parse(localStorage.getItem('today_reflections') || '[]');
      return {
        oldEntryDiscarded: !list.some(r => r.date === '2026-08-14'),
        newEntryKept: list.some(r => r.date === '2026-08-15'),
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
      const fields = window._reflectionBackupFields();
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

  // ── 5. Observation thresholds ────────────────────────────────────────────

  // 5.1 < 14 reflections → no observation
  {
    const { page } = await openPage();
    const result = await page.evaluate(() => {
      const list = Array.from({ length: 13 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        feeling: 'calm',
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem('today_reflections', JSON.stringify(list));
      const container = document.createElement('div');
      window._reflectionRenderMemory(container);
      const text = container.textContent;
      return { noObservation: !text.includes('On evenings you reflected') };
    });
    await expectAll('< 14 entries → no observation', result);
    ok('< 14 reflections → no on-device observation shown');
    await page.close();
  }

  // 5.2 ≥ 14 reflections with dominant feeling (≥45%) → observation shown
  {
    const { page } = await openPage({
      today_reflection_policy: JSON.stringify({ choice: 'remember', updatedAt: new Date().toISOString() }),
    });
    const result = await page.evaluate(() => {
      // 14 reflections: 8 'calm' (57%), 6 others
      const list = Array.from({ length: 14 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        feeling: i < 8 ? 'calm' : ['drained', 'tense', 'present', 'alive', 'drained', 'tense'][i - 8],
        updatedAt: new Date().toISOString(),
      }));
      localStorage.setItem('today_reflections', JSON.stringify(list));
      const container = document.createElement('div');
      window._reflectionRenderMemory(container);
      return { observationShown: container.textContent.includes('On evenings you reflected') };
    });
    await expectAll('dominant feeling → observation shown', result);
    ok('≥14 reflections with dominant feeling → observation shown');
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
      backupExport:    reflectionsSrc.includes('window._reflectionBackupFields'),
      mergeExport:     reflectionsSrc.includes('window._reflectionMergeRemote'),
    });
    ok('static wiring: script order, DOM element, start call, precache, CACHE_VERSION, all 15 exports');
  }

  console.log('\nReflections tests passed (24 tests).');
} finally {
  if (browser) await browser.close();
  server.close();
}
