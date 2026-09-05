// TODAY — platform behavior regression test
//
// Exercises PWA install events/browser promotion, mobile-keyboard positioning,
// service-worker registration, and bfcache wake handling.
// Run from repo root: node scripts/platform-test.mjs

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT   = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME   = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
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

const ok = message => console.log('  ✓ ' + message);
let browser;
const fail = async (message, detail) => {
  console.error('✗ FAIL — ' + message);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  if (browser) await browser.close();
  server.close();
  process.exit(1);
};

browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

async function openPage(options = {}) {
  const page = await browser.newPage();
  await page.setViewport(options.viewport || { width: 1200, height: 800 });
  if (options.userAgent) await page.setUserAgent(options.userAgent);
  await page.evaluateOnNewDocument(opts => {
    window.__platformTest = {
      swRegistrations: [], promptCalls: 0, clipboardWrites: [],
      registrationListeners: {}, serviceWorkerListeners: {},
    };

    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = query => {
      if (query === '(pointer: coarse)') {
        return { matches: !!opts.coarse, media: query, onchange: null,
          addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; } };
      }
      if (query === '(display-mode: standalone)') {
        return { matches: !!opts.standalone, media: query, onchange: null,
          addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; } };
      }
      return originalMatchMedia(query);
    };
    if (opts.suppressInstallPrompt) {
      window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    }

    if (opts.platform !== undefined) {
      Object.defineProperty(navigator, 'platform', { configurable: true, get: () => opts.platform });
    }
    if (opts.maxTouchPoints !== undefined) {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => opts.maxTouchPoints });
    }
    Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => !!opts.standalone });

    const registration = {
      waiting: null,
      installing: null,
      update: () => Promise.resolve(),
      addEventListener: (type, fn) => { window.__platformTest.registrationListeners[type] = fn; },
    };
    const serviceWorker = {
      controller: null,
      register: async path => {
        window.__platformTest.swRegistrations.push(path);
        return registration;
      },
      addEventListener: (type, fn) => { window.__platformTest.serviceWorkerListeners[type] = fn; },
    };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => { window.__platformTest.clipboardWrites.push(text); },
    } });

    if (opts.coarse) {
      const vv = new EventTarget();
      vv.offsetTop = 0;
      vv.height = opts.viewportHeight || 600;
      Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv });
      window.__setVisualViewport = (offsetTop, height, type = 'resize') => {
        vv.offsetTop = offsetTop;
        vv.height = height;
        vv.dispatchEvent(new Event(type));
      };
    }

    try { localStorage.setItem('splash_shown_at', Date.now().toString()); } catch {}
  }, {
    platform: options.platform,
    maxTouchPoints: options.maxTouchPoints,
    coarse: !!options.coarse,
    standalone: !!options.standalone,
    suppressInstallPrompt: !!options.userAgent || !!options.standalone,
    viewportHeight: options.viewport?.height || 600,
  });

  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(URL_BASE, { waitUntil: 'load', timeout: 15000 });
  await page.waitForFunction(() => window.__platformTest.swRegistrations.length === 1, { timeout: 3000 });
  return { page, errors };
}

const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.0.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const FIREFOX    = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0';

try {
  // Extracted-module wiring and ownership boundary.
  {
    const indexSrc    = await readFile(join(ROOT, 'index.html'), 'utf8');
    const platformSrc = await readFile(join(ROOT, 'assets/platform.js'), 'utf8');
    const swSrc       = await readFile(join(ROOT, 'sw.js'), 'utf8');
    const failures = [];
    if (!indexSrc.includes('<script src="assets/platform.js"></script>')) failures.push('module script tag');
    if (!indexSrc.includes('window._startPlatform();')) failures.push('initializer call');
    if (indexSrc.includes('// Mobile Keyboard Handling') || indexSrc.includes('// PWA Install Prompt (Android only)')) failures.push('duplicate inline platform block');
    if (!platformSrc.includes('window._startPlatform = function()')) failures.push('module initializer export');
    if (!platformSrc.includes("Today.define('platform'")) failures.push('Today platform API');
    if (!platformSrc.includes("navigator.serviceWorker.register('/sw.js')")) failures.push('service-worker registration');
    if (!platformSrc.includes("window.addEventListener('pageshow'")) failures.push('bfcache handler');
    if (!swSrc.includes("'/assets/platform.js'")) failures.push('service-worker precache');
    if (failures.length) await fail('platform module wiring regression', failures);
    ok('platform module wiring and service-worker precache');
  }

  // Android/Chromium beforeinstallprompt + appinstalled lifecycle.
  {
    const { page, errors } = await openPage();
    const result = await page.evaluate(async () => {
      const makePrompt = outcome => {
        const event = new Event('beforeinstallprompt', { cancelable: true });
        event.prompt = () => { window.__platformTest.promptCalls++; };
        event.userChoice = Promise.resolve({ outcome });
        window.dispatchEvent(event);
        return event;
      };
      const visible = el => getComputedStyle(el).display !== 'none';
      const first = makePrompt('accepted');
      const shown = visible(document.getElementById('installBtn'))
        && visible(document.getElementById('pwaInstallSection'))
        && document.querySelector('#pwaInstallSection button')?.textContent.trim() === 'Install';
      Today.use('platform').install();
      await new Promise(resolve => setTimeout(resolve, 0));
      const acceptedHidden = !visible(document.getElementById('installBtn'))
        && !visible(document.getElementById('pwaInstallSection'));
      Today.use('platform').install();
      const consumed = window.__platformTest.promptCalls === 1;

      const second = makePrompt('dismissed');
      window.dispatchEvent(new Event('appinstalled'));
      Today.use('platform').install();
      const installedHidden = !visible(document.getElementById('installBtn'))
        && !visible(document.getElementById('pwaInstallSection'))
        && window.__platformTest.promptCalls === 1;
      return { prevented: first.defaultPrevented && second.defaultPrevented, shown, acceptedHidden, consumed, installedHidden };
    });
    if (Object.values(result).some(value => !value)) await fail('Android install lifecycle regression', result);
    if (errors.length) await fail('uncaught errors in Android install lifecycle', errors);
    ok('Android install prompt, acceptance, and appinstalled lifecycle');
    await page.close();
  }

  // Safari instruction rows must reveal in place without changing row height.
  for (const testCase of [
    { label: 'iOS Safari', userAgent: IOS_SAFARI, platform: 'iPhone', maxTouchPoints: 5,
      coarse: true, viewport: { width: 375, height: 812 }, instruction: 'Share ↑ → Add to Home Screen' },
    { label: 'macOS Safari', userAgent: MAC_SAFARI, platform: 'MacIntel', maxTouchPoints: 0,
      coarse: false, viewport: { width: 1200, height: 800 }, instruction: 'File → Add to Dock' },
  ]) {
    const { page, errors } = await openPage(testCase);
    const result = await page.evaluate(expected => {
      if (!document.getElementById('configPanel').classList.contains('open')) Today.use('connections').toggleConfig();
      const row = document.querySelector('#pwaInstallSection .connection-row');
      const button = row?.querySelector('button');
      const before = row?.getBoundingClientRect().height || 0;
      const initialCopy = button?.textContent.trim() === 'How to add ↓';
      button?.click();
      const after = row?.getBoundingClientRect().height || 0;
      return {
        rowVisible: !!row && getComputedStyle(document.getElementById('pwaInstallSection')).display !== 'none',
        initialCopy,
        instructionCopy: button?.textContent.trim() === expected,
        revealed: button?.classList.contains('_pwa-revealed') && button?.disabled,
        fixedHeight: before > 0 && Math.abs(after - before) < 0.01,
      };
    }, testCase.instruction);
    if (Object.values(result).some(value => !value)) await fail(`${testCase.label} install-row regression`, result);
    if (errors.length) await fail(`uncaught errors in ${testCase.label} promotion`, errors);
    ok(`${testCase.label} instruction reveal preserves row height`);
    await page.close();
  }

  // Alternate-browser copy routes.
  for (const testCase of [
    { label: 'iOS non-Safari', userAgent: IOS_CHROME, platform: 'iPhone', maxTouchPoints: 5,
      coarse: true, status: 'Open in Safari to add to your home screen' },
    { label: 'Firefox', userAgent: FIREFOX, platform: 'MacIntel', maxTouchPoints: 0,
      coarse: false, status: 'Open in Chrome or Edge to install' },
  ]) {
    const { page, errors } = await openPage(testCase);
    const result = await page.evaluate(async expected => {
      const section = document.getElementById('pwaInstallSection');
      const button = section.querySelector('button');
      button?.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      return {
        status: section.querySelector('.connection-row-status')?.textContent.trim() === expected,
        copied: window.__platformTest.clipboardWrites[0] === window.location.href,
        feedback: button?.textContent === 'Copied',
      };
    }, testCase.status);
    if (Object.values(result).some(value => !value)) await fail(`${testCase.label} copy-route regression`, result);
    if (errors.length) await fail(`uncaught errors in ${testCase.label} promotion`, errors);
    ok(`${testCase.label} copy-link route`);
    await page.close();
  }

  // Installed/standalone mode suppresses browser-specific promotion.
  {
    const { page, errors } = await openPage({ userAgent: IOS_SAFARI, platform: 'iPhone', maxTouchPoints: 5, coarse: true, standalone: true });
    const suppressed = await page.evaluate(() =>
      getComputedStyle(document.getElementById('installBtn')).display === 'none'
      && getComputedStyle(document.getElementById('pwaInstallSection')).display === 'none');
    if (!suppressed) await fail('standalone mode did not suppress install promotion');
    if (errors.length) await fail('uncaught errors in standalone mode', errors);
    ok('standalone mode suppresses install promotion');
    await page.close();
  }

  // visualViewport keyboard positioning + bfcache wake dispatch + SW registration.
  {
    const { page, errors } = await openPage({ coarse: true, viewport: { width: 375, height: 812 } });
    const result = await page.evaluate(async () => {
      const input = document.getElementById('newTask');
      const bar = document.getElementById('addTaskBar');
      input.blur();
      input.focus();
      await new Promise(resolve => setTimeout(resolve, 150));
      const firstTransform = bar.style.transform;
      window.__setVisualViewport(10, 500);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const resizedTransform = bar.style.transform;
      input.blur();

      let wakes = 0;
      window._onWake = () => { wakes++; };
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      return {
        opened: !!firstTransform && firstTransform !== 'none',
        resized: !!resizedTransform && resizedTransform !== firstTransform,
        reset: !bar.classList.contains('keyboard-open') && !bar.style.transform && !bar.style.position,
        wakes,
        swPath: window.__platformTest.swRegistrations.join(','),
      };
    });
    if (!result.opened || !result.resized || !result.reset || result.wakes !== 1 || result.swPath !== '/sw.js') {
      await fail('keyboard, bfcache, or service-worker regression', result);
    }
    if (errors.length) await fail('uncaught errors in platform lifecycle', errors);
    ok('keyboard viewport, persisted pageshow, and /sw.js registration');
    await page.close();
  }

  console.log('✓ PLATFORM TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
