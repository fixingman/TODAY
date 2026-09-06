// Diagnostic, not a test: prints what the headless browser on THIS machine reports,
// so CI-vs-Mac differences are read from the log instead of guessed. Always exits 0.
// Registered in test-all so it runs in CI; grep the log for "[ci-env]".
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const say = (k, v) => console.log(`[ci-env] ${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`);

const srv = http.createServer((req, res) => {
  const f = path.join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(f, (e, d) => {
    if (e) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.end(d);
  });
}).listen(0);

let browser;
try {
  say('os', `${os.platform()} ${os.release()} node ${process.version}`);
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--disable-extensions'] });
  say('chrome', await browser.version());
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_manual', JSON.stringify([{ id: 'task_1', text: 'work: probe task' }]));
    localStorage.setItem('today_done', '[]');
  });
  await page.goto('http://localhost:' + srv.address().port + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#manualList .task'), { timeout: 8000 }).catch(() => say('task_rendered', false));

  say('media', await page.evaluate(() => ({
    hover: matchMedia('(hover: hover)').matches, pointerFine: matchMedia('(pointer: fine)').matches,
    pointerCoarse: matchMedia('(pointer: coarse)').matches, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    dark: matchMedia('(prefers-color-scheme: dark)').matches, dpr: devicePixelRatio, hasFocus: document.hasFocus(),
    visibility: document.visibilityState, ua: navigator.userAgent.slice(0, 80),
  })));
  say('copy_button', await page.evaluate(() => {
    const c = document.querySelector('#manualList .task .task-copy');
    return c ? { display: getComputedStyle(c).display, visibility: getComputedStyle(c).visibility, opacity: getComputedStyle(c).opacity } : '(not in DOM)';
  }));
  say('clipboard', await page.evaluate(async () => {
    const out = { hasClipboard: !!navigator.clipboard, hasWriteText: !!(navigator.clipboard && navigator.clipboard.writeText) };
    try { out.permission = (await navigator.permissions.query({ name: 'clipboard-write' })).state; } catch (e) { out.permission = 'query threw: ' + e.name; }
    try { await navigator.clipboard.writeText('probe'); out.writeText = 'resolved'; } catch (e) { out.writeText = 'rejected: ' + e.name + ' — ' + e.message; }
    try { out.execCommand = document.execCommand('copy'); } catch (e) { out.execCommand = 'threw: ' + e.name; }
    return out;
  }));
  // Reproduce the failing task-actions path exactly: click the copy control, read feedback.
  say('copy_flow', await page.evaluate(async () => {
    const c = document.querySelector('#manualList .task .task-copy');
    if (!c) return '(no .task-copy to click)';
    c.click();
    await new Promise(r => setTimeout(r, 400));
    return { text: c.textContent, copiedClass: c.classList.contains('copied'), timer: !!c._copyFeedbackTimer };
  }));
  say('colour', await page.evaluate(() => {
    const p = document.createElement('span'); p.style.color = 'var(--accent)'; document.body.appendChild(p);
    const col = getComputedStyle(p).color; p.remove();
    const tag = document.querySelector('#manualList .task .task-tag');
    return { accent: col, tagGradient: tag ? getComputedStyle(tag).backgroundImage.slice(0, 120) : '(no tag)' };
  }));
  say('page_errors', errors);
  // Second launch WITH the desktop-input flag the harnesses use — does Blink honour
  // it on this platform? On macOS it flips hover/pointer in both directions.
  await page.close();
  const flagged = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-first-run', '--disable-extensions', '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4'] });
  try {
    const fp = await flagged.newPage(); await fp.setViewport({ width: 1200, height: 900 });
    await fp.evaluateOnNewDocument(() => { localStorage.setItem('splash_shown_at', String(Date.now())); localStorage.setItem('today_manual', JSON.stringify([{ id: 'task_1', text: 'probe task' }])); });
    await fp.goto('http://localhost:' + srv.address().port + '/', { waitUntil: 'load' });
    await fp.waitForFunction(() => document.querySelector('#manualList .task'), { timeout: 8000 }).catch(() => {});
    say('media_flagged', await fp.evaluate(() => ({ hover: matchMedia('(hover: hover)').matches, pointerFine: matchMedia('(pointer: fine)').matches,
      copyDisplay: (() => { const c = document.querySelector('#manualList .task .task-copy'); return c ? getComputedStyle(c).display : '(none)'; })() })));
  } finally { await flagged.close().catch(() => {}); }
} catch (e) {
  say('probe_error', e.message.split('\n')[0]);
} finally {
  if (browser) await browser.close().catch(() => {});
  srv.close();
  console.log('ci-env-probe done (diagnostic only)');
  process.exit(0);
}
