// TODAY — Memory Panel regression test
//
// Exercises toggleMemory, confirm/dismiss/forget, clear flow, Connections handoff,
// and AI abstraction with throttle — against the real app DOM with fetch stubbed.
//
// Run from repo root:
//   node scripts/memory-panel-test.mjs --pre-extraction
//   node scripts/memory-panel-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const SEEDED_MEMORY = {
  totalTasksCompleted: 10,
  totalDaysActive: 5,
  firstSeen: '2026-01-01',
  aiName: 'Aria',
  preferences: { peakHour: 9, dragKeywords: [] },
  patterns: {
    completionsByHour: { '9': 5, '10': 3 },
    taskKeywords: {},
    focusMinutesTotal: 60,
    bestStreak: 5,
    taskLifespanSamples: [1, 2, 1, 1.5, 2],
    lateAdditions: [10, 9, 10, 9, 9],
    dayStartCount: 5,
    dayStartDate: null,
    dayShapeState: null,
    letgoReasons: {},
    triageUndos: 0,
    soonPulls: 0,
    reviveReasons: {},
  },
  memory: {
    semantic: [
      { id: '0', text: 'pending semantic item', type: 'semantic', status: 'pending', addedAt: '2026-01-01' },
      { id: '1', text: 'confirmed semantic item', type: 'semantic', status: 'confirmed', addedAt: '2026-01-01' },
    ],
    episodic: [],
    procedural: [],
  },
  recentCompletedTasks: [],
  moments: [],
  suggestionHistory: [],
  recentConversations: [],
  suggestionCooldowns: {},
  meetingAttribution: { mineShown: 0, mineKept: 0, othersShown: 0, othersSelected: 0 },
};

async function openPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(seededMemory => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_ai_key_claude', 'test-claude-key');
    localStorage.setItem('today_memory', JSON.stringify(seededMemory));

    const state = window.__memoryTest = {
      saveCalls: 0,
      abstractRequests: 0,
      abstractResponses: [],
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (url, opts) => {
      if (String(url).includes('/.netlify/functions/ai-assist')) {
        state.abstractRequests++;
        const response = state.abstractResponses.shift();
        if (!response) return { ok: false, status: 500, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => response };
      }
      return originalFetch(url, opts);
    };
  }, SEEDED_MEMORY);

  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => typeof toggleMemory === 'function' && document.getElementById('memoryPanel'),
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    _saveMemory = () => { window.__memoryTest.saveCalls++; };
  });
  return { page, errors };
}

try {
  // Panel toggle: open and close via toggleMemory().
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const panel = document.getElementById('memoryPanel');
      toggleMemory();
      const opened = panel.classList.contains('open');
      toggleMemory();
      const closed = !panel.classList.contains('open');
      return { opened, closed };
    });
    await expectAll('panel toggle', { ...result, noErrors: errors.length === 0 });
    ok('toggleMemory opens and closes the memory panel');
    await page.close();
  }

  // Confirm: pending item becomes confirmed, _saveMemory called.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      window.__memoryTest.saveCalls = 0;
      _memoryConfirm('semantic:0');
      const item = appMemory.memory.semantic.find(i => i.id === '0');
      return {
        confirmed: item?.status === 'confirmed',
        saved: window.__memoryTest.saveCalls === 1,
      };
    });
    await expectAll('confirm', { ...result, noErrors: errors.length === 0 });
    ok('_memoryConfirm marks pending item confirmed and saves');
    await page.close();
  }

  // Dismiss: pending item removed from appMemory.memory, _saveMemory called.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      window.__memoryTest.saveCalls = 0;
      _memoryDismiss('semantic:0');
      const remaining = appMemory.memory.semantic.map(i => i.id);
      return {
        removed: !remaining.includes('0'),
        otherIntact: remaining.includes('1'),
        saved: window.__memoryTest.saveCalls === 1,
      };
    });
    await expectAll('dismiss', { ...result, noErrors: errors.length === 0 });
    ok('_memoryDismiss removes pending item and saves');
    await page.close();
  }

  // Forget: confirmed item removed from appMemory.memory, _saveMemory called.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      window.__memoryTest.saveCalls = 0;
      _memoryForget('semantic:1');
      const remaining = appMemory.memory.semantic.map(i => i.id);
      return {
        removed: !remaining.includes('1'),
        otherIntact: remaining.includes('0'),
        saved: window.__memoryTest.saveCalls === 1,
      };
    });
    await expectAll('forget', { ...result, noErrors: errors.length === 0 });
    ok('_memoryForget removes confirmed item and saves');
    await page.close();
  }

  // Clear request + cancel: footer shows confirm prompt, then reverts.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      _memoryClearRequest();
      const footer = document.getElementById('memoryFooter');
      const confirmShown = footer?.innerHTML.includes('erase everything?');
      _memoryClearCancel();
      const normalRestored = !footer?.innerHTML.includes('erase everything?')
        && footer?.innerHTML.includes('clear all memory');
      return { confirmShown, normalRestored };
    });
    await expectAll('clear request and cancel', { ...result, noErrors: errors.length === 0 });
    ok('_memoryClearRequest shows confirm footer; _memoryClearCancel restores normal footer');
    await page.close();
  }

  // Clear confirm: appMemory.memory wiped, _saveMemory called.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      window.__memoryTest.saveCalls = 0;
      _memoryClearRequest();
      _memoryClearConfirm();
      const mem = appMemory.memory;
      return {
        semanticEmpty: mem.semantic.length === 0,
        episodicEmpty: mem.episodic.length === 0,
        proceduralEmpty: mem.procedural.length === 0,
        saved: window.__memoryTest.saveCalls >= 1,
      };
    });
    await expectAll('clear confirm', { ...result, noErrors: errors.length === 0 });
    ok('_memoryClearConfirm wipes memory and saves');
    await page.close();
  }

  // Connections handoff: memory panel closes, config panel opens.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      toggleMemory();
      const memoryPanel = document.getElementById('memoryPanel');
      const configPanel = document.getElementById('configPanel');
      _memoryGoToConnections();
      return {
        memoryClosed: !memoryPanel.classList.contains('open'),
        configOpen: configPanel.classList.contains('open'),
      };
    });
    await expectAll('connections handoff', { ...result, noErrors: errors.length === 0 });
    ok('_memoryGoToConnections closes memory panel and opens config panel');
    await page.close();
  }

  // Abstraction: items added as pending on first call; second call same day throttled.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      window.__memoryTest.abstractResponses.push({
        content: '[{"type":"semantic","text":"test productivity pattern"}]',
      });
      await _memoryAbstract();
      const afterFirst = appMemory.memory.semantic.length;
      const throttleDateSet = !!appMemory.memory._lastAbstractDate;
      const requestsAfterFirst = window.__memoryTest.abstractRequests;

      // Second call same day — should be throttled (no new request).
      window.__memoryTest.abstractResponses.push({
        content: '[{"type":"semantic","text":"should not appear"}]',
      });
      await _memoryAbstract();
      const requestsAfterSecond = window.__memoryTest.abstractRequests;

      return {
        itemAdded: afterFirst > 2,
        throttleDateSet,
        throttled: requestsAfterSecond === requestsAfterFirst,
      };
    });
    await expectAll('abstraction and throttle', { ...result, noErrors: errors.length === 0 });
    ok('_memoryAbstract adds items and throttles to once per day');
    await page.close();
  }

  // Static ownership checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline Memory Panel baseline wiring', {
        inlineSection: indexSrc.includes('// ── Memory Panel ──'),
        noModuleLoad: !indexSrc.includes('<script src="assets/memory-panel.js"></script>'),
        noPrecache: !swSrc.includes("'/assets/memory-panel.js'"),
      });
      ok('inline Memory Panel baseline');
    } else {
      const moduleSrc = await readFile(join(ROOT, 'assets/memory-panel.js'), 'utf8');
      const requiredExports = [
        'toggleMemory', 'renderMemoryPanel', '_memoryGoToConnections',
        '_memoryClearRequest', '_memoryClearCancel', '_memoryClearConfirm',
        '_memoryForget', '_memoryConfirm', '_memoryDismiss',
        '_memoryAbstract', '_versionBadgeBreathe',
      ];
      await expectAll('extracted Memory Panel module wiring', {
        moduleLoad: indexSrc.includes('<script src="assets/memory-panel.js"></script>'),
        initializer: indexSrc.includes('window._startMemoryPanel();'),
        inlineRemoved: !indexSrc.includes('// ── Memory Panel ──'),
        moduleInitializer: moduleSrc.includes('window._startMemoryPanel = function()'),
        exports: requiredExports.every(name => moduleSrc.includes(`window.${name} = ${name};`)),
        privateState: !indexSrc.includes('let _memoryClearPending') && !indexSrc.includes('let _memoryAbstracting'),
        precached: swSrc.includes("'/assets/memory-panel.js'"),
      });
      ok('extracted Memory Panel wiring, globals, private state, and precache');
    }
  }

  console.log(`\nMemory Panel tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
