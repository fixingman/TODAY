// TODAY — smoke test
// Answers one question before every push: does the app basically work?
// Boots the app in headless Chrome, waits out the splash, adds a task,
// checks it off, and fails on any uncaught page error.
//
// Run from repo root:  node scripts/smoke-test.mjs
// First-time setup:    cd scripts && npm install
//
// ~10s. Not a test suite — the human layer is memory/Test-matrix.md.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('✗ puppeteer-core not installed — run: cd scripts && npm install');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css',
};

// Tiny static server — no Netlify functions, the app degrades gracefully without them
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise(r => server.listen(0, r));
const URL_BASE = `http://localhost:${server.address().port}`;

const fail = (msg) => { console.error('✗ FAIL — ' + msg); process.exit(1); };
const ok = (msg) => console.log('  ✓ ' + msg);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // Any uncaught exception in app code is an automatic fail
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  // ── 1. App boots ────────────────────────────────────────────────────────
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  ok('page loaded');

  // ── 2. Splash dismisses — add bar fades in at end of init ──────────────
  await page.waitForFunction(
    () => {
      const bar = document.getElementById('addTaskBar');
      return bar && getComputedStyle(bar).opacity === '1' && getComputedStyle(bar).display !== 'none';
    },
    { timeout: 15000 }
  ).catch(() => fail('splash never dismissed / add bar never became visible'));
  ok('splash dismissed, add bar visible');

  // ── 3. Add a task ───────────────────────────────────────────────────────
  await page.click('#newTask');
  await page.type('#newTask', 'smoke test task');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => [...document.querySelectorAll('#manualList .task')]
      .some(t => t.textContent.includes('smoke test task')),
    { timeout: 5000 }
  ).catch(() => fail('task did not appear in the list after Enter'));
  ok('task added');

  // ── 4. Check it off ──────────────────────────────────────────────────────
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('#manualList .task')]
      .find(t => t.textContent.includes('smoke test task'));
    row.querySelector('.task-check').click();
  });
  await page.waitForFunction(
    () => [...document.querySelectorAll('#manualList .task')]
      .some(t => t.textContent.includes('smoke test task') && t.classList.contains('done')),
    { timeout: 5000 }
  ).catch(() => fail('task did not reach done state after checking'));
  ok('task checked off');

  // ── 5. No uncaught errors anywhere along the way ─────────────────────────
  if (pageErrors.length) fail('uncaught page error(s):\n  ' + pageErrors.join('\n  '));
  ok('no uncaught page errors');

  console.log('✓ SMOKE TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
