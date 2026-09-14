// TODAY — real service-worker install, upgrade, cache, and offline navigation test.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };
const swSource = await readFile(join(ROOT, 'sw.js'), 'utf8');
const CACHE_VERSION = swSource.match(/CACHE_VERSION\s*=\s*'([^']+)'/)?.[1];
const shellBlock = swSource.match(/const CACHE_APP_SHELL\s*=\s*\[([\s\S]*?)\];/)?.[1] || '';
const SHELL_PATHS = [...shellBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
assert.ok(CACHE_VERSION, 'sw.js must declare CACHE_VERSION');
assert.ok(SHELL_PATHS.length > 10, 'sw.js must declare a non-trivial app shell');

const UPGRADE_VERSION = CACHE_VERSION + '-test-upgrade';
const LEGACY_VERSION = 'today-v-test-legacy';
let serveUpgrade = false;
let failUnknownNetwork = false;

const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pathname === '/__sw-test-seed') {
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    res.end('<!doctype html><title>SW seed</title>');
    return;
  }
  if (pathname === '/never-cached-route' && failUnknownNetwork) {
    req.socket.destroy();
    return;
  }
  let path = pathname === '/' ? '/index.html' : pathname;
  try {
    let body = path === '/sw.js' ? swSource : await readFile(join(ROOT, path));
    if (path === '/sw.js' && serveUpgrade) body = body.replace(CACHE_VERSION, UPGRADE_VERSION);
    const headers = {
      'Content-Type': MIME[extname(path)] || 'application/octet-stream',
      'Cache-Control': path === '/sw.js' ? 'no-store' : 'no-cache',
    };
    if (path === '/sw.js') headers['Service-Worker-Allowed'] = '/';
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;

let browser;
let page;
try {
  const puppeteer = (await import('puppeteer-core')).default;
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-first-run', '--disable-extensions'],
  });
  page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('splash_shown_at', String(Date.now()));
  });

  // Seed a cache that represents the previous deployed worker, then let the real
  // app registration install and activate the current worker.
  await page.goto(BASE + '/__sw-test-seed', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async legacy => {
    const cache = await caches.open(legacy);
    await cache.put('/legacy-marker', new Response('old'));
  }, LEGACY_VERSION);
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('controller timeout')), 10000);
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    }
  });

  const installed = await page.evaluate(async ({ current, legacy, shell }) => {
    const keys = await caches.keys();
    const cache = await caches.open(current);
    const cached = new Set((await cache.keys()).map(request => new URL(request.url).pathname));
    return {
      controlled: !!navigator.serviceWorker.controller,
      currentOnly: keys.length === 1 && keys[0] === current && !keys.includes(legacy),
      shellComplete: shell.every(path => cached.has(new URL(path, location.origin).pathname)),
      offlineFallbackCached: cached.has('/__offline'),
      cachedCount: cached.size,
    };
  }, { current: CACHE_VERSION, legacy: LEGACY_VERSION, shell: SHELL_PATHS });
  assert.equal(installed.controlled, true);
  assert.equal(installed.currentOnly, true);
  assert.equal(installed.shellComplete, true, `only ${installed.cachedCount} cache entries installed`);
  assert.equal(installed.offlineFallbackCached, true);
  console.log(`  ✓ fresh install controls the app and caches all ${SHELL_PATHS.length} shell resources`);
  console.log('  ✓ activation purges a stale cache');

  // Serve a byte-distinct worker with a new cache name. The production update
  // listener must detect it, ask it to skip waiting, and let activation purge the
  // prior cache without a force reload from the test.
  serveUpgrade = true;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/');
    await registration.update();
  });
  await page.waitForFunction(async upgraded => {
    const keys = await caches.keys();
    return keys.length === 1 && keys[0] === upgraded && !!navigator.serviceWorker.controller;
  }, { timeout: 15000 }, UPGRADE_VERSION);
  const upgraded = await page.evaluate(async ({ upgraded, shell }) => {
    const cache = await caches.open(upgraded);
    const cached = new Set((await cache.keys()).map(request => new URL(request.url).pathname));
    return {
      shellComplete: shell.every(path => cached.has(new URL(path, location.origin).pathname)),
      offlineFallbackCached: cached.has('/__offline'),
    };
  }, { upgraded: UPGRADE_VERSION, shell: SHELL_PATHS });
  assert.equal(upgraded.shellComplete, true);
  assert.equal(upgraded.offlineFallbackCached, true);
  console.log('  ✓ an updated worker takes control and replaces the prior cache');

  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  const offlineShell = await page.evaluate(() => ({
    title: document.title,
    app: !!document.getElementById('main-app'),
    addInput: !!document.getElementById('newTask'),
  }));
  assert.equal(offlineShell.title.endsWith('TODAY'), true);
  assert.equal(offlineShell.app, true);
  assert.equal(offlineShell.addInput, true);

  await page.setOfflineMode(false);
  failUnknownNetwork = true;
  await page.goto(BASE + '/never-cached-route', { waitUntil: 'domcontentloaded', timeout: 15000 });
  const fallback = await page.evaluate(() => ({
    title: document.title,
    brandedStar: document.querySelector('span.star')?.textContent === '✦',
    appAbsent: !document.getElementById('main-app'),
  }));
  assert.deepEqual(fallback, { title: 'TODAY', brandedStar: true, appAbsent: true });
  console.log('  ✓ cached app shell and branded fallback both load offline');
  console.log('✓ SERVICE WORKER TEST PASSED');
} finally {
  if (page) await page.setOfflineMode(false).catch(() => {});
  if (browser) await browser.close();
  server.close();
}
