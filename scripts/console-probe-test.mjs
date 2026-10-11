// Real browser integration: diagnostic failures settle locally; app failures still log.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import puppeteer from 'puppeteer-core';
import { prepareConsoleProbe } from './prepare-console-probe.mjs';

assert.throws(() => prepareConsoleProbe(''), TypeError);
assert.throws(() => prepareConsoleProbe('await ('), SyntaxError);
assert.throws(() => prepareConsoleProbe('42', 'invalid label'), TypeError);
assert.throws(() => prepareConsoleProbe('const x = 42; x'), SyntaxError);

const monitor = readFileSync(new URL('../assets/error-monitor.js', import.meta.url), 'utf8');
const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><button id="errorIndicator" style="display:none">Errors</button>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--no-first-run', '--disable-extensions'],
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addScriptTag({ content: monitor });
  await page.addScriptTag({ content: 'const APP_VERSION = "2.95.1"; window.probeWrites = 0;' });
  const warnings = [];
  page.on('console', message => {
    if (message.type() === 'warn') warnings.push(message.text());
  });
  const failures = [
    '(() => { throw new Error("Deployed memory projection differs"); })()',
    '(async () => { await Promise.resolve(); if (APP_VERSION !== "2.95.0") throw new Error("Production version changed"); window.probeWrites++; })()',
    'Promise.reject(new Error("fictional private task content"))',
    'Promise.reject(null)',
  ];
  for (const expression of failures) {
    await page.addScriptTag({ content: prepareConsoleProbe(expression, 'regression') });
  }
  await page.waitForFunction(() => window.probeWrites === 0);
  // Allow the browser's unhandledrejection reporting turn to run.
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 50)));
  assert.equal(await page.evaluate(() => _errorLog.length), 0);
  assert.equal(await page.$eval('#errorIndicator', el => el.style.display), 'none');
  assert.equal(warnings.length, failures.length);
  assert.ok(warnings.every(message => message.includes('TODAY diagnostic: regression')));
  assert.ok(warnings.every(message => !message.includes('fictional private task content')));
  console.log('  ✓ synchronous/deferred/unknown probe failures are caught; stale-version guard aborts before writes');

  await page.addScriptTag({ content: prepareConsoleProbe('Promise.resolve().then(() => window.probeWrites++)') });
  await page.waitForFunction(() => window.probeWrites === 1);
  assert.equal(await page.evaluate(() => _errorLog.length), 0);
  console.log('  ✓ successful diagnostic runs once without changing the error monitor');

  // Same wording outside a prepared diagnostic must still be treated as an app error.
  for (const message of ['Production version changed', 'Deployed memory projection differs']) {
    await page.addScriptTag({ content: `void Promise.reject(new Error(${JSON.stringify(message)}));` });
  }
  await page.waitForFunction(() => _errorLog.length === 2);
  assert.equal(await page.$eval('#errorIndicator', el => el.style.display), 'block');
  const log = await page.evaluate(() => _errorLog.slice());
  assert.ok(log[0].includes('Production version changed'));
  assert.ok(log[1].includes('Deployed memory projection differs'));
  console.log('  ✓ genuine unhandled app errors still light the red dot, including the same message text');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
