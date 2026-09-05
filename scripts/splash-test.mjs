// TODAY — splash animation timing test
//
// Verifies the staged splash exit animation introduced in v2.56.0:
//   • No-coda path (no poem today): splash dismisses in < 10s, no JS errors
//   • Forced-coda path (poem shows): splash dismisses in < 20s, no JS errors
//   • 30-minute cooldown path: splash skips and the app reveals immediately
//   • Repeated desktop/mobile exits: TO and DAY fade as stable word layers
//   • Extracted-module wiring, word wrappers, and SW precache entry
//
// The key invariant: _doSplashDismiss now stages the exit (TO → DAY → coda lines →
// overlay), adding ~1s exit time. Total wall time must never exceed the 20s ceiling.
// Safety timers in the app cap pre-dismiss time at 17s, keeping the total under 20s.
//
// Run from repo root:  node scripts/splash-test.mjs   (~35s)

import { createServer } from 'node:http';
import { readFile }     from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT   = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.png':'image/png','.woff2':'font/woff2','.css':'text/css' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try {
    const body = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const URL_BASE = `http://localhost:${server.address().port}`;

const ok   = (m) => console.log('  ✓ ' + m);
let browser;
const fail = async (m, detail) => {
  console.error('✗ FAIL — ' + m);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};

browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

// Wait for splash to be fully removed from the DOM
const waitForSplashGone = (page) =>
  page.waitForFunction(() => !document.getElementById('splash'), { timeout: 22000 });

try {
  // ── Pass 1: no-coda path ─────────────────────────────────────────────────
  // Force poem_splash_date to today so the app skips the poem coda
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // Prime the origin, then clear the cooldown key before reloading. Previously the
    // test left splash_shown_at intact, so both animation passes silently tested only
    // the cooldown shortcut.
    await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => {
      localStorage.setItem('poem_splash_date', _localISO());
      localStorage.removeItem('splash_shown_at');
    });
    const reloadT0 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });

    if (!await page.$('#splash'))
      await fail('no-coda pass took the cooldown shortcut instead of running the splash');
    await waitForSplashGone(page);
    const elapsed = Date.now() - reloadT0;

    if (elapsed >= 10000)
      await fail(`no-coda splash took ${elapsed}ms — expected < 10000ms`);
    if (errors.length)
      await fail('uncaught JS errors on no-coda path', errors);

    ok(`no-coda splash dismissed in ${elapsed}ms (< 10s)`);
    await page.close();
  }

  // ── Pass 2: forced-coda path ─────────────────────────────────────────────
  // Set poem_splash_date to yesterday so the app runs the poem coda today
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // Prime localStorage via a first load, then force a fresh splash with an unseen
    // poem date. The corpus always returns a poem for a valid local day.
    await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => {
      localStorage.setItem('poem_splash_date', '1900-01-01');
      localStorage.removeItem('splash_shown_at');
    });

    const t0 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });

    // Pre-population happens synchronously at splash start, before the delayed fade-in.
    const hasCoda = await page.evaluate(() => {
      const el = document.getElementById('splash-poem');
      return el && el.querySelector('.splash-poem-text')?.innerHTML.trim().length > 0;
    }).catch(() => false);
    if (!hasCoda)
      await fail('forced-coda pass did not populate the poem');

    await waitForSplashGone(page);
    const elapsed = Date.now() - t0;

    if (elapsed >= 20000)
      await fail(`coda splash took ${elapsed}ms — exceeded 20s ceiling`);
    if (errors.length)
      await fail('uncaught JS errors on coda path', errors);

    ok(`coda-active splash dismissed in ${elapsed}ms (< 20s)`);
    await page.close();
  }

  // ── Pass 3: cooldown skip path ──────────────────────────────────────────
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => localStorage.setItem('splash_shown_at', Date.now().toString()));

    const t0 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => {
      const main = document.getElementById('main-app');
      const bar  = document.getElementById('addTaskBar');
      return !document.getElementById('splash')
        && main?.style.opacity === '1'
        && bar?.style.opacity === '1';
    }, { timeout: 3000 });
    const elapsed = Date.now() - t0;

    if (elapsed >= 3000)
      await fail(`cooldown splash skip took ${elapsed}ms — expected < 3000ms`);
    if (errors.length)
      await fail('uncaught JS errors on cooldown path', errors);

    ok(`cooldown path skipped splash and revealed app in ${elapsed}ms (< 3s)`);
    await page.close();
  }

  // ── Pass 4: repeated word-layer exit invariants ─────────────────────────
  // BUG-076 was intermittent in Safari: when five sibling opacity animations
  // were created in two batches, later siblings could retain their fill state
  // incorrectly and leave O / AY visible. Exercise the replacement structure at
  // desktop and phone widths and prove that only the two word wrappers animate.
  for (const [label, viewport] of Object.entries({
    desktop: { width: 1200, height: 900 },
    mobile:  { width: 375, height: 812, isMobile: true, deviceScaleFactor: 3 },
  })) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });

    for (let run = 0; run < 3; run++) {
      await page.evaluate(() => {
        localStorage.setItem('poem_splash_date', _localISO());
        localStorage.removeItem('splash_shown_at');
      });
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForFunction(() => {
        const logo = document.getElementById('splash-logo');
        return logo
          && getComputedStyle(logo).visibility === 'visible'
          && Number(getComputedStyle(logo).opacity) > 0.98;
      }, { timeout: 4000 });

      const state = await page.evaluate(async () => {
        const logo     = document.getElementById('splash-logo');
        const wordTo  = document.getElementById('splash-word-to');
        const wordDay = document.getElementById('splash-word-day');
        const letters = [...document.querySelectorAll('#splash-logo .l')];
        const opacity = el => Number(getComputedStyle(el).opacity);
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const geometry = root => {
          const outer = root.getBoundingClientRect();
          const relativeRect = el => {
            const rect = el.getBoundingClientRect();
            return [rect.x - outer.x, rect.y - outer.y, rect.width, rect.height];
          };
          const starStyle = getComputedStyle(root.querySelector('#splash-star'));
          return [
            outer.width, outer.height,
            ...[...root.querySelectorAll('.l')].flatMap(relativeRect),
            ...['right', 'top', 'width', 'height'].map(prop => parseFloat(starStyle[prop])),
          ];
        };
        // Reconstruct the pre-BUG-076 flat letter structure off-screen and prove
        // that the two wrappers do not move glyphs, resize the logo, or shift the star.
        const flatLogo = logo.cloneNode(true);
        flatLogo.querySelectorAll('.splash-word').forEach(word => word.replaceWith(...word.childNodes));
        flatLogo.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;opacity:1;margin:0';
        document.body.appendChild(flatLogo);
        const currentGeometry = geometry(logo);
        const flatGeometry = geometry(flatLogo);
        const geometryDelta = Math.max(...currentGeometry.map((value, i) => Math.abs(value - flatGeometry[i])));
        flatLogo.remove();
        const sample = () => ({
          to: opacity(wordTo),
          day: opacity(wordDay),
          toAnimations: wordTo.getAnimations().length,
          dayAnimations: wordDay.getAnimations().length,
          letterAnimations: letters.reduce((n, el) => n + el.getAnimations().length, 0),
        });

        window._doSplashDismiss();
        const start = sample();
        await wait(80);
        const at80 = sample();
        await wait(90);
        const at170 = sample();
        await wait(100);
        const at270 = sample();
        await wait(210);
        const final = sample();
        return {
          start, at80, at170, at270, final,
          geometryDelta,
          currentGeometry,
          flatGeometry,
          inlineFinal: [wordTo.style.opacity, wordDay.style.opacity],
        };
      });

      if (state.geometryDelta > 0.01)
        await fail(`${label} run ${run + 1}: TO/DAY wrappers changed logo or star geometry`, state);
      if (state.start.toAnimations !== 1 || state.start.dayAnimations !== 0)
        await fail(`${label} run ${run + 1}: exit did not begin with exactly one TO animation`, state);
      if (!(state.at80.to < 0.98) || state.at80.day < 0.99)
        await fail(`${label} run ${run + 1}: TO/DAY start order changed`, state);
      if (state.at170.toAnimations !== 1 || state.at170.dayAnimations !== 1)
        await fail(`${label} run ${run + 1}: DAY did not begin as one word animation after 150ms`, state);
      if (!(state.at270.day < 0.98))
        await fail(`${label} run ${run + 1}: DAY opacity did not advance after its delayed start`, state);
      if (state.final.to > 0.001 || state.final.day > 0.001)
        await fail(`${label} run ${run + 1}: a word group remained visible after its fade`, state);
      if (state.inlineFinal.some(value => value !== '0'))
        await fail(`${label} run ${run + 1}: final opacity was not persisted beneath WAAPI fill`, state);
      if ([state.start, state.at80, state.at170, state.at270, state.final].some(s => s.letterAnimations !== 0))
        await fail(`${label} run ${run + 1}: individual splash letters own animations`, state);
    }

    if (errors.length)
      await fail(`uncaught JS errors during repeated ${label} exits`, errors);
    ok(`${label}: 3 repeated TO → DAY exits retained word-layer ordering and final opacity`);
    await page.close();
  }

  // ── Pass 5: static structure + extracted-module wiring ──────────────────
  // The TO/DAY spans are static HTML — verify directly from source so timing
  // of splash dismiss doesn't interfere.
  {
    const html      = await readFile(join(ROOT, 'index.html'), 'utf8');
    const splashSrc = await readFile(join(ROOT, 'assets/splash.js'), 'utf8');
    const swSrc     = await readFile(join(ROOT, 'sw.js'), 'utf8');
    // Match <span class="l">T</span>, <span class="l">O</span> (non-accent)
    const toCount  = (html.match(/<span class="l">/g) || []).length;
    // Match <span class="l a"> (accent — the DAY letters)
    const dayCount = (html.match(/<span class="l a">/g) || []).length;

    if (toCount !== 2)
      await fail(`expected 2 non-accent .l spans (TO), found ${toCount}`);
    if (dayCount !== 3)
      await fail(`expected 3 accent .l.a spans (DAY), found ${dayCount}`);

    if (!html.includes('id="splash-word-to" class="splash-word"'))
      await fail('splash markup missing the TO word wrapper');
    if (!html.includes('id="splash-word-day" class="splash-word"'))
      await fail('splash markup missing the DAY word wrapper');

    // Verify _doSplashDismiss targets word layers, persists its final base style,
    // and cannot regress to per-letter opacity animations.
    if (!splashSrc.includes("document.getElementById('splash-word-to')"))
      await fail('_doSplashDismiss missing TO word target');
    if (!splashSrc.includes("document.getElementById('splash-word-day')"))
      await fail('_doSplashDismiss missing DAY word target');
    if (!splashSrc.includes("[{ opacity: '1' }, { opacity: '0' }]"))
      await fail('_fade missing explicit opacity endpoints');
    if (!splashSrc.includes("el.style.opacity = '0'"))
      await fail('_fade does not persist the final opacity beneath WAAPI');
    if (/querySelectorAll\('\.l/.test(splashSrc))
      await fail('_doSplashDismiss still creates per-letter animation batches');
    if (!splashSrc.includes('splash-coda-line'))
      await fail('_doSplashDismiss missing splash-coda-line span wrapping');
    if (!splashSrc.includes('window._startSplash = function()'))
      await fail('assets/splash.js does not expose window._startSplash()');
    if (!html.includes('<script src="assets/splash.js"></script>'))
      await fail('index.html does not load assets/splash.js');
    if (html.indexOf('window._startSplash();') < html.indexOf('init();'))
      await fail('window._startSplash() must run after init()');
    if (!swSrc.includes("'/assets/splash.js'"))
      await fail('sw.js does not precache assets/splash.js');

    ok(`module wiring verified: TO/DAY word layers + ${toCount + dayCount} letters + coda + SW cache`);
  }

  console.log('✓ SPLASH TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
