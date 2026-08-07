// TODAY — splash animation timing test
//
// Verifies the staged splash exit animation introduced in v2.56.0:
//   • No-coda path (no poem today): splash dismisses in < 10s, no JS errors
//   • Forced-coda path (poem shows): splash dismisses in < 20s, no JS errors
//
// The key invariant: _doSplashDismiss now stages the exit (TO → DAY → coda lines →
// overlay), adding ~1s exit time. Total wall time must never exceed the 20s ceiling.
// Safety timers in the app cap pre-dismiss time at 18s, making max total ~19.5s.
//
// Run from repo root:  node scripts/splash-test.mjs   (~30s)

import { createServer } from 'node:http';
import { readFile }     from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT   = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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

    // Pre-seed localStorage before navigation (can't do it beforehand without a page)
    // Instead: navigate, then let the fast path or non-poem day handle it.
    // To reliably suppress the coda, we'll inject poem_splash_date = today via
    // page.evaluate in a new tab after first navigate, then reload.
    const t0 = Date.now();
    await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Suppress poem coda for this test by setting poem_splash_date to today
    const today = new Date().toISOString().slice(0, 10);
    await page.evaluate((d) => localStorage.setItem('poem_splash_date', d), today);
    const reloadT0 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
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

    // Prime localStorage via a first load, then reload with coda forced
    await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    await page.evaluate((d) => localStorage.setItem('poem_splash_date', d), yesterday);

    const t0 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });

    // Check whether a poem actually exists for today (the app may skip coda if no poem)
    const hasCoda = await page.evaluate(() => {
      const el = document.getElementById('splash-poem');
      return el && el.querySelector('.splash-poem-text')?.innerHTML.trim().length > 0;
    }).catch(() => false);

    await waitForSplashGone(page);
    const elapsed = Date.now() - t0;

    if (elapsed >= 20000)
      await fail(`coda splash took ${elapsed}ms — exceeded 20s ceiling`);
    if (errors.length)
      await fail('uncaught JS errors on coda path', errors);

    ok(`coda-${hasCoda ? 'active' : 'skipped'} splash dismissed in ${elapsed}ms (< 20s)`);
    await page.close();
  }

  // ── Pass 3: static logo structure (file check) ──────────────────────────
  // The TO/DAY spans are static HTML — verify directly from source so timing
  // of splash dismiss doesn't interfere.
  {
    const html = await readFile(join(ROOT, 'index.html'), 'utf8');
    // Match <span class="l">T</span>, <span class="l">O</span> (non-accent)
    const toCount  = (html.match(/<span class="l">/g) || []).length;
    // Match <span class="l a"> (accent — the DAY letters)
    const dayCount = (html.match(/<span class="l a">/g) || []).length;

    if (toCount !== 2)
      await fail(`expected 2 non-accent .l spans (TO), found ${toCount}`);
    if (dayCount !== 3)
      await fail(`expected 3 accent .l.a spans (DAY), found ${dayCount}`);

    // Also verify _doSplashDismiss uses the correct selectors
    if (!html.includes("querySelectorAll('.l:not(.a)')"))
      await fail('_doSplashDismiss missing TO selector: .l:not(.a)');
    if (!html.includes("querySelectorAll('.l.a')"))
      await fail('_doSplashDismiss missing DAY selector: .l.a');
    if (!html.includes('splash-coda-line'))
      await fail('_doSplashDismiss missing splash-coda-line span wrapping');

    ok(`logo structure verified: ${toCount} TO spans + ${dayCount} DAY spans + coda-line wrapping present`);
  }

  console.log('✓ SPLASH TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
