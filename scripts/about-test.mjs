// TODAY — About/Info panel regression test
//
// Flow: toggleInfo opens panel, _poemOfTheDay, renderDailyPoem via toggleInfo,
// _onPoemTap reveal + outside-click collapse, _copyToClipboard callback,
// _shareDailyPoem clipboard path, renderInfoStats week grid, Noticed block,
// Sunday reflection block (day=0), Monday intention block (day=1), module wiring.
//
// Run from repo root:
//   node scripts/about-test.mjs --pre-extraction
//   node scripts/about-test.mjs

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

const localISO = (d = new Date()) => {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
};
const DAY_MS   = 24 * 60 * 60 * 1000;
const TODAY    = localISO(new Date());
const YESTERDAY = localISO(new Date(Date.now() - DAY_MS));

async function openPage() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(
    ({ today, yesterday }) => {
      localStorage.clear();
      localStorage.setItem('splash_shown_at', String(Date.now()));
      // Daily history — needed for week grid and Sunday/Monday block trigger
      localStorage.setItem('today_daily_history', JSON.stringify([
        { date: yesterday, tasksDone: 3, focusMins: 25, habitsKept: 1, habitsTotal: 2 },
      ]));
      // Noticed cache — pre-seeded so renderInfoStats shows the Noticed block
      localStorage.setItem('noticed_lines_' + today, JSON.stringify(['noticed something interesting']));
      // Stub AI key — causes AI fetch to fail gracefully (no real API hit)
      localStorage.setItem('today_ai_key_claude', 'stub');
    },
    { today: TODAY, yesterday: YESTERDAY }
  );
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  // Wait until both functions exist AND $ is populated (init() has run)
  await page.waitForFunction(
    () => typeof toggleInfo === 'function' && typeof renderInfoStats === 'function' && !!$.infoPanel,
    { timeout: 15000 }
  );
  await page.evaluate(() => {
    window.dropboxBackup   = () => {};
    window.dropboxAutoSave = () => {};
    // Stub clipboard so sharing tests don't require real clipboard permission
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.resolve() },
      configurable: true, writable: true,
    });
  });
  return { page, errors };
}

try {
  // 1. toggleInfo: opens panel — infoPanel gains 'open' class.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      toggleInfo();
      const panel = document.getElementById('infoPanel');
      return { panelOpen: !!(panel && panel.classList.contains('open')) };
    });
    await expectAll('toggleInfo opens panel', { ...result, noErrors: errors.length === 0 });
    ok('toggleInfo: infoPanel gains "open" class');
    await page.close();
  }

  // 2. _poemOfTheDay: returns object with truthy text and author.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      const poem = _poemOfTheDay();
      return {
        isObject:  typeof poem === 'object' && poem !== null,
        hasText:   !!(poem && poem.text),
        hasAuthor: !!(poem && poem.author),
      };
    });
    await expectAll('_poemOfTheDay', { ...result, noErrors: errors.length === 0 });
    ok('_poemOfTheDay: returns object with text and author');
    await page.close();
  }

  // 3. renderDailyPoem (via toggleInfo): #dailyPoem has non-empty innerHTML.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      toggleInfo(); // internally calls renderDailyPoem()
      const el = document.getElementById('dailyPoem');
      return { hasContent: !!(el && el.innerHTML.length > 0) };
    });
    await expectAll('renderDailyPoem content', { ...result, noErrors: errors.length === 0 });
    ok('renderDailyPoem (via toggleInfo): #dailyPoem has non-empty content');
    await page.close();
  }

  // 4. _onPoemTap: adds "revealed" on first tap; document click outside collapses it.
  //    Headless Chrome reports (hover: hover) = true, so we mock matchMedia to force
  //    the touch path where the first tap reveals rather than immediately shares.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      // Force touch/no-hover mode
      const origMM = window.matchMedia.bind(window);
      window.matchMedia = (q) => {
        if (q === '(hover: hover)') return { matches: false, media: q,
          addEventListener: () => {}, removeEventListener: () => {} };
        return origMM(q);
      };
      // Null share so second tap (share path) uses clipboard, not native sheet
      Object.defineProperty(navigator, 'share', { value: null, configurable: true, writable: true });

      const block = document.getElementById('poemBlock');
      const beforeTap     = !(block && block.classList.contains('revealed'));
      _onPoemTap(); // first tap → adds 'revealed'
      const afterFirstTap = !!(block && block.classList.contains('revealed'));
      // Simulate outside click — dispatch from body so e.target is an Element
      // (other click listeners call e.target.closest(), which Document lacks).
      // Event bubbles: body → document, hitting the collapse listener.
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const afterOutside  = !(block && block.classList.contains('revealed'));

      window.matchMedia = origMM;
      return { beforeTap, afterFirstTap, afterOutside };
    });
    await expectAll('_onPoemTap reveal + collapse', { ...result, noErrors: errors.length === 0 });
    ok('_onPoemTap: adds "revealed" on tap; outside document click collapses it');
    await page.close();
  }

  // 5. _copyToClipboard: onCopied callback is called after writeText resolves.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      let copied = false;
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
        configurable: true, writable: true,
      });
      _copyToClipboard('hello world', () => { copied = true; });
      await new Promise(r => setTimeout(r, 50));
      return { copied };
    });
    await expectAll('_copyToClipboard callback', { ...result, noErrors: errors.length === 0 });
    ok('_copyToClipboard: onCopied callback fired after writeText resolves');
    await page.close();
  }

  // 6. _shareDailyPoem: clipboard receives poem URL when navigator.share is null.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      let clipboardText = '';
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: (t) => { clipboardText = t; return Promise.resolve(); } },
        configurable: true, writable: true,
      });
      Object.defineProperty(navigator, 'share', { value: null, configurable: true, writable: true });
      _shareDailyPoem();
      await new Promise(r => setTimeout(r, 50));
      return {
        clipboardInvoked: clipboardText.length > 0,
        hasPoemUrl:       clipboardText.includes('poem.html'),
      };
    });
    await expectAll('_shareDailyPoem clipboard path', { ...result, noErrors: errors.length === 0 });
    ok('_shareDailyPoem: clipboard receives poem.html URL when navigator.share is null');
    await page.close();
  }

  // 7. renderInfoStats: week grid shows 7 day columns, stats section rendered.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      renderInfoStats();
      const grid  = document.getElementById('weekGrid');
      const cols  = grid ? grid.querySelectorAll('.week-col').length : 0;
      const stats = document.getElementById('infoStats');
      return {
        sevenCols: cols === 7,
        statsHtml: !!(stats && stats.innerHTML.length > 0),
      };
    });
    await expectAll('renderInfoStats week grid', { ...result, noErrors: errors.length === 0 });
    ok('renderInfoStats: week grid shows 7 day columns, stats section rendered');
    await page.close();
  }

  // 8. renderInfoStats: Noticed block renders with pre-seeded content.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      renderInfoStats();
      const el = document.getElementById('noticedBlock');
      return {
        visible: !!(el && el.style.display !== 'none'),
        hasText: !!(el && el.textContent.includes('noticed something interesting')),
      };
    });
    await expectAll('renderInfoStats Noticed block', { ...result, noErrors: errors.length === 0 });
    ok('renderInfoStats: Noticed block visible with seeded content');
    await page.close();
  }

  // 9. Sunday reflection block: visible when getDay() returns 0 and history exists.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      // Pre-cache so block shows without waiting for async AI call
      const today = _localISO();
      localStorage.setItem('week_reflection_' + today, 'A productive week.');
      const orig = Date.prototype.getDay;
      Date.prototype.getDay = () => 0; // Sunday
      renderInfoStats();
      Date.prototype.getDay = orig;
      const el = document.getElementById('sundayBlock');
      return {
        visible:   !!(el && el.style.display !== 'none'),
        hasLabel:  !!(el && el.querySelector('.week-label')),
      };
    });
    await expectAll('Sunday reflection block', { ...result, noErrors: errors.length === 0 });
    ok('Sunday reflection: block visible when getDay()=0 and history exists');
    await page.close();
  }

  // 10. Monday intention block: visible when getDay() returns 1 and history exists.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(() => {
      // Pre-cache so block shows without waiting for async AI call
      const today = _localISO();
      localStorage.setItem('monday_intention_' + today, 'Focus on the important thing.');
      const orig = Date.prototype.getDay;
      Date.prototype.getDay = () => 1; // Monday
      renderInfoStats();
      Date.prototype.getDay = orig;
      const el = document.getElementById('sundayBlock');
      return {
        visible:   !!(el && el.style.display !== 'none'),
        hasLabel:  !!(el && el.querySelector('.week-label')),
      };
    });
    await expectAll('Monday intention block', { ...result, noErrors: errors.length === 0 });
    ok('Monday intention: block visible when getDay()=1 and history exists');
    await page.close();
  }

  // 11. Static wiring checks.
  {
    const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
    const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
    if (PRE_EXTRACTION) {
      await expectAll('inline about baseline', {
        inlineFnPresent: indexSrc.includes('function toggleInfo()'),
        noModuleLoad:    !indexSrc.includes('<script src="assets/about.js"></script>'),
        noPrecache:      !swSrc.includes("'/assets/about.js'"),
      });
      ok('inline about baseline: function toggleInfo present, no module tag yet');
    } else {
      const aboutSrc = await readFile(join(ROOT, 'assets/about.js'), 'utf8');
      const requiredExports = [
        'toggleInfo', '_poemOfTheDay', '_onPoemTap',
        '_shareDailyPoem', '_copyToClipboard', 'renderInfoStats',
      ];
      await expectAll('extracted about module wiring', {
        moduleLoad:     indexSrc.includes('<script src="assets/about.js"></script>'),
        initializer:    indexSrc.includes('window._startAbout();'),
        sectionRemoved: !indexSrc.includes('function toggleInfo()'),
        moduleInit:     aboutSrc.includes('window._startAbout = function()'),
        exports:        requiredExports.every(n => aboutSrc.includes(`window.${n} = ${n};`)),
        precached:      swSrc.includes("'/assets/about.js'"),
      });
      ok('extracted about module wiring, exports correct, precached');
    }
  }

  console.log(`\nAbout tests passed (${PRE_EXTRACTION ? 'inline baseline' : 'extracted module'}).`);
} finally {
  if (browser) await browser.close();
  server.close();
}
