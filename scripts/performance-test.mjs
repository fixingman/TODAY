// TODAY performance evidence: deterministic payload guard plus repeatable browser timings.
//
//   node scripts/performance-test.mjs              # five-run local gate
//   node scripts/performance-test.mjs --write      # refresh tracked JSON + audit block
//   node scripts/performance-test.mjs --target URL # measure a deployed build
//
// Timings run under a mobile-like 4x CPU / 1.6 Mbps profile. Payload budgets are
// byte-exact and deterministic; timing gates use the worst of five runs so a fast
// median cannot conceal a bad outlier.

import { createServer } from 'node:http';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, '..');
const BUDGET_PATH = join(SCRIPT_DIR, 'performance-budgets.json');
const BASELINE_PATH = join(ROOT, 'memory', 'performance-baseline.json');
const AUDIT_PATH = join(ROOT, 'memory', 'Performance-audit.md');
const START_MARKER = '<!-- GENERATED:PERFORMANCE:START -->';
const END_MARKER = '<!-- GENERATED:PERFORMANCE:END -->';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DESKTOP_INPUT = '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };

const args = process.argv.slice(2);
const valueAfter = flag => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
};
const WRITE = args.includes('--write');
const SKIP_AUDIT_CHECK = args.includes('--no-audit-check');
const TARGET = valueAfter('--target') || process.env.PERF_TARGET_URL || null;
const OUTPUT = valueAfter('--output');
const OUTPUT_PATH = OUTPUT ? (isAbsolute(OUTPUT) ? OUTPUT : join(ROOT, OUTPUT)) : null;
const budgetConfig = JSON.parse(await readFile(BUDGET_PATH, 'utf8'));
const ITERATIONS = Number(valueAfter('--iterations') || budgetConfig.iterations || 5);

if (!Number.isInteger(ITERATIONS) || ITERATIONS < 1 || ITERATIONS > 20) {
  throw new Error('--iterations must be an integer between 1 and 20');
}

const round = value => Math.round(value * 100) / 100;
const median = values => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};
const summarize = values => ({ median: round(median(values)), worst: round(Math.max(...values)), runs: values.map(round) });
const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`;
const ms = value => `${Math.round(value)} ms`;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

async function payloadEvidence() {
  const indexBuffer = await readFile(join(ROOT, 'index.html'));
  const indexSource = indexBuffer.toString('utf8');
  const swBuffer = await readFile(join(ROOT, 'sw.js'));
  const scriptSources = [...indexSource.matchAll(/<script\s+src=["']([^"']+)["']/g)]
    .map(match => match[1])
    .filter(source => !/^https?:/i.test(source));
  const scriptFiles = [...new Set(scriptSources.map(source => join(ROOT, source.replace(/^\//, ''))))];
  const runtimeFiles = [join(ROOT, 'index.html'), join(ROOT, 'sw.js'), ...scriptFiles];
  const brotli = buffer => brotliCompressSync(buffer, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 },
  }).byteLength;
  const rows = [];
  for (const path of runtimeFiles) {
    const buffer = await readFile(path);
    rows.push({ file: relative(ROOT, path), raw: buffer.byteLength, brotli: brotli(buffer) });
  }
  const fontFiles = (await walk(join(ROOT, 'fonts'))).filter(path => path.endsWith('.woff2'));
  const fontBytes = (await Promise.all(fontFiles.map(path => stat(path)))).reduce((sum, item) => sum + item.size, 0);
  const total = key => rows.reduce((sum, row) => sum + row[key], 0);
  const appVersion = indexSource.match(/['‘](\d+\.\d+\.\d+)['’]:/)?.[1];
  if (!appVersion) throw new Error('Could not derive APP_VERSION from index.html');
  return {
    appVersion,
    eagerScripts: scriptSources.length,
    runtimeShellRaw: total('raw'),
    runtimeShellBrotli: total('brotli'),
    indexRaw: rows.find(row => row.file === 'index.html').raw,
    indexBrotli: rows.find(row => row.file === 'index.html').brotli,
    fontCount: fontFiles.length,
    fontBytes,
    largest: [...rows].sort((a, b) => b.raw - a.raw).slice(0, 8),
  };
}

function startServer() {
  const server = createServer(async (request, response) => {
    let path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (path === '/') path = '/index.html';
    try {
      const body = await readFile(join(ROOT, path));
      const noCache = path === '/index.html' || path === '/sw.js';
      response.writeHead(200, {
        'Content-Type': MIME[extname(path)] || 'application/octet-stream',
        'Cache-Control': noCache ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600',
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function installObservers(page) {
  await page.evaluateOnNewDocument(() => {
    window.__todayPerformance = { lcp: 0, cls: 0, longTasks: [] };
    const observe = (type, callback) => {
      try {
        new PerformanceObserver(list => callback(list.getEntries())).observe({ type, buffered: true });
      } catch (_) { /* unsupported metrics remain zero */ }
    };
    observe('largest-contentful-paint', entries => {
      const last = entries.at(-1);
      if (last) window.__todayPerformance.lcp = last.startTime;
    });
    observe('layout-shift', entries => {
      for (const entry of entries) if (!entry.hadRecentInput) window.__todayPerformance.cls += entry.value;
    });
    observe('longtask', entries => {
      for (const entry of entries) window.__todayPerformance.longTasks.push({ start: entry.startTime, duration: entry.duration });
    });
  });
}

async function emulateMobile(page) {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const session = await page.createCDPSession();
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 1.6 * 1024 * 1024 / 8,
    uploadThroughput: 750 * 1024 / 8,
    connectionType: 'cellular4g',
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  return session;
}

async function readPageMetrics(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = Object.fromEntries(performance.getEntriesByType('paint').map(entry => [entry.name, entry.startTime]));
    const value = name => performance.getEntriesByName(name, 'mark')[0]?.startTime || 0;
    const observed = window.__todayPerformance || { lcp: 0, cls: 0, longTasks: [] };
    const tbt = observed.longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
    const resources = performance.getEntriesByType('resource');
    return {
      ttfb: navigation?.responseStart || 0,
      fcp: paint['first-contentful-paint'] || 0,
      lcp: observed.lcp || 0,
      cls: observed.cls || 0,
      tbt,
      longTasks: observed.longTasks.length,
      domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
      load: navigation?.loadEventEnd || 0,
      shellVisible: value('today:shell-visible'),
      interactive: value('today:interactive'),
      morningReady: value('today:morning-ready'),
      splashDismissed: value('today:splash-dismissed'),
      transferBytes: (navigation?.transferSize || 0) + resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      encodedBodyBytes: (navigation?.encodedBodySize || 0) + resources.reduce((sum, entry) => sum + (entry.encodedBodySize || 0), 0),
      decodedBodyBytes: (navigation?.decodedBodySize || 0) + resources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0),
      serviceWorkerControlled: !!navigator.serviceWorker?.controller,
    };
  });
}

async function waitForReady(page, includeSplash) {
  await page.waitForFunction(() => performance.getEntriesByName('today:interactive', 'mark').length === 1, { timeout: 30000 });
  if (includeSplash) {
    await page.waitForFunction(() => performance.getEntriesByName('today:splash-dismissed', 'mark').length === 1, { timeout: 30000 });
  }
  await new Promise(resolve => setTimeout(resolve, 250));
}

async function coldAndWarm(browser, url) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await installObservers(page);
  const session = await emulateMobile(page);
  await session.send('Network.clearBrowserCache');
  await session.send('Storage.clearDataForOrigin', { origin: new URL(url).origin, storageTypes: 'all' });
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await waitForReady(page, true);
  const cold = await readPageMetrics(page);
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      await Promise.race([
        navigator.serviceWorker.ready.catch(() => null),
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);
    }
  });
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await waitForReady(page, true);
  const warm = await readPageMetrics(page);
  await context.close();
  return { cold, warm };
}

async function interactionRun(browser, url, run) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.evaluateOnNewDocument(seedRun => {
    localStorage.clear();
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_manual', JSON.stringify([
      { id: `manual_perf_${seedRun}`, text: 'Performance focus task', addedAt: new Date().toISOString() },
    ]));
  }, run);
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await waitForReady(page, true);

  const taskText = `Performance added task ${run}`;
  await page.focus('#newTask');
  await page.type('#newTask', taskText);
  await page.evaluate(text => {
    window.__todayAddLatency = new Promise(resolve => {
      const start = performance.now();
      const observer = new MutationObserver(() => {
        const found = [...document.querySelectorAll('#manualList .task')].some(row => row.textContent.includes(text));
        if (!found) return;
        observer.disconnect();
        requestAnimationFrame(() => resolve(performance.now() - start));
      });
      observer.observe(document.getElementById('manualList'), { childList: true, subtree: true });
    });
  }, taskText);
  await page.keyboard.press('Enter');
  const addTask = await page.evaluate(() => window.__todayAddLatency);

  await page.evaluate(() => {
    window.__todayFocusLatency = new Promise(resolve => {
      const start = performance.now();
      const observer = new MutationObserver(() => {
        if (!document.querySelector('.focus-timer.open') || !document.getElementById('main-app')?.classList.contains('focusing')) return;
        observer.disconnect();
        requestAnimationFrame(() => resolve(performance.now() - start));
      });
      observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['class'] });
    });
  });
  await page.click('#manualList .task .task-text');
  const enterFocus = await page.evaluate(() => window.__todayFocusLatency);
  await context.close();
  return { addTask, enterFocus };
}

function timingSummary(runs) {
  const summary = { cold: {}, warm: {}, interactions: {} };
  for (const scenario of ['cold', 'warm']) {
    for (const metric of ['ttfb', 'fcp', 'lcp', 'cls', 'tbt', 'longTasks', 'domContentLoaded', 'load', 'shellVisible', 'interactive', 'morningReady', 'splashDismissed', 'transferBytes', 'encodedBodyBytes', 'decodedBodyBytes']) {
      summary[scenario][metric] = summarize(runs.map(run => run[scenario][metric]));
    }
    summary[scenario].serviceWorkerControlled = runs.map(run => run[scenario].serviceWorkerControlled);
  }
  for (const metric of ['addTask', 'enterFocus']) {
    summary.interactions[metric] = summarize(runs.map(run => run.interactions[metric]));
  }
  return summary;
}

function lookup(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function budgetFailures(payload, timings) {
  const failures = [];
  for (const [key, max] of Object.entries(budgetConfig.payload)) {
    const actual = payload[key];
    const pass = key === 'eagerScripts' ? actual <= max : actual <= max;
    if (!pass) failures.push(`payload.${key}: ${actual} > ${max}`);
  }
  for (const [path, max] of Object.entries(budgetConfig.timing)) {
    const actual = lookup(timings, `${path}.worst`);
    if (actual > max) failures.push(`${path} worst: ${round(actual)} > ${max}`);
  }
  return failures;
}

function generatedAuditBlock(result) {
  const { payload, timings, budgets } = result;
  const targetRows = Object.entries(budgetConfig.targets).map(([path, target]) => {
    const actual = lookup(timings, `${path}.worst`);
    return `| ${path} | ${path.endsWith('cls') ? actual.toFixed(3) : ms(actual)} | ${path.endsWith('cls') ? target : ms(target)} | ${actual <= target ? 'Pass' : 'Above target'} |`;
  }).join('\n');
  const largestRows = payload.largest.map(row => `| \`${row.file}\` | ${kb(row.raw)} | ${kb(row.brotli)} |`).join('\n');
  return `${START_MARKER}
## Current automated performance baseline

Generated by \`scripts/performance-test.mjs --write\`; do not edit this block by hand.

- App: v${payload.appVersion}
- Captured: ${result.capturedAt.slice(0, 10)}
- Profile: ${budgets.iterations} cold + warm mobile-like runs (4× CPU, 1.6 Mbps, 150 ms RTT), plus ${budgets.iterations} desktop interaction runs
- Gate: worst run must stay within the checked-in budgets; medians are reported for context

| Payload | Current | Budget |
|---|---:|---:|
| Runtime shell, decoded | ${kb(payload.runtimeShellRaw)} | ${kb(budgets.payload.runtimeShellRaw)} |
| Runtime shell, Brotli q5 | ${kb(payload.runtimeShellBrotli)} | ${kb(budgets.payload.runtimeShellBrotli)} |
| \`index.html\`, Brotli q5 | ${kb(payload.indexBrotli)} | ${kb(budgets.payload.indexBrotli)} |
| Self-hosted fonts | ${payload.fontCount} / ${kb(payload.fontBytes)} | ${kb(budgets.payload.fontBytes)} |
| Eager classic scripts | ${payload.eagerScripts} | ${budgets.payload.eagerScripts} (must not increase) |

| Timing | Median | Worst | Gate |
|---|---:|---:|---:|
| Cold TTFB | ${ms(timings.cold.ttfb.median)} | ${ms(timings.cold.ttfb.worst)} | ${ms(budgets.timing['cold.ttfb'])} |
| Cold FCP | ${ms(timings.cold.fcp.median)} | ${ms(timings.cold.fcp.worst)} | ${ms(budgets.timing['cold.fcp'])} |
| Cold LCP | ${ms(timings.cold.lcp.median)} | ${ms(timings.cold.lcp.worst)} | ${ms(budgets.timing['cold.lcp'])} |
| Cold CLS | ${timings.cold.cls.median.toFixed(3)} | ${timings.cold.cls.worst.toFixed(3)} | ${budgets.timing['cold.cls']} |
| Cold total blocking time | ${ms(timings.cold.tbt.median)} | ${ms(timings.cold.tbt.worst)} | ${ms(budgets.timing['cold.tbt'])} |
| TODAY interactive, cold | ${ms(timings.cold.interactive.median)} | ${ms(timings.cold.interactive.worst)} | ${ms(budgets.timing['cold.interactive'])} |
| Splash dismissed, cold | ${ms(timings.cold.splashDismissed.median)} | ${ms(timings.cold.splashDismissed.worst)} | ${ms(budgets.timing['cold.splashDismissed'])} |
| TODAY interactive, warm | ${ms(timings.warm.interactive.median)} | ${ms(timings.warm.interactive.worst)} | ${ms(budgets.timing['warm.interactive'])} |
| Add-task response | ${ms(timings.interactions.addTask.median)} | ${ms(timings.interactions.addTask.worst)} | ${ms(budgets.timing['interactions.addTask'])} |
| Enter-focus response | ${ms(timings.interactions.enterFocus.median)} | ${ms(timings.interactions.enterFocus.worst)} | ${ms(budgets.timing['interactions.enterFocus'])} |

The warm runs were service-worker controlled in ${timings.warm.serviceWorkerControlled.filter(Boolean).length}/${budgets.iterations} runs. Cold LCP includes the intentional daily poem coda; its 2.5s target remains visible below even though the regression ceiling is calibrated separately.

Core Web Vitals targets remain visible even when the regression gate is calibrated to the current app and runner:

| Target | Current worst | Threshold | Status |
|---|---:|---:|---|
${targetRows}

Largest decoded runtime files:

| File | Decoded | Brotli q5 |
|---|---:|---:|
${largestRows}
${END_MARKER}`;
}

async function updateOrCheckAudit(result) {
  const block = generatedAuditBlock(result);
  let audit = await readFile(AUDIT_PATH, 'utf8');
  const start = audit.indexOf(START_MARKER);
  const end = audit.indexOf(END_MARKER);
  if (start !== -1 && end !== -1 && end > start) {
    audit = audit.slice(0, start) + block + audit.slice(end + END_MARKER.length);
  } else {
    const titleEnd = audit.indexOf('\n', audit.indexOf('\n') + 1);
    audit = audit.slice(0, titleEnd + 1) + '\n' + block + '\n' + audit.slice(titleEnd + 1);
  }
  if (WRITE) {
    await writeFile(AUDIT_PATH, audit);
    return;
  }
  const current = await readFile(AUDIT_PATH, 'utf8');
  if (current !== audit) throw new Error('Performance audit is stale. Run: npm run performance:write --prefix scripts');
}

let server;
let browser;
try {
  const payload = await payloadEvidence();
  let url = TARGET;
  if (!url) {
    server = await startServer();
    url = `http://127.0.0.1:${server.address().port}/`;
  }
  const puppeteer = (await import('puppeteer-core')).default;
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-first-run', '--disable-extensions', '--no-sandbox', DESKTOP_INPUT],
  });
  const runs = [];
  for (let run = 1; run <= ITERATIONS; run++) {
    process.stdout.write(`  performance run ${run}/${ITERATIONS} ... `);
    const load = await coldAndWarm(browser, url);
    const interactions = await interactionRun(browser, url, run);
    runs.push({ ...load, interactions });
    console.log('done');
  }
  const timings = timingSummary(runs);
  const result = {
    schema: 1,
    capturedAt: new Date().toISOString(),
    target: TARGET || 'local-static-server',
    profile: { cpuSlowdown: 4, downloadMbps: 1.6, uploadKbps: 750, latencyMs: 150 },
    payload,
    timings,
    budgets: budgetConfig,
  };
  const failures = budgetFailures(payload, timings);
  result.status = failures.length ? 'fail' : 'pass';
  result.failures = failures;

  if (OUTPUT_PATH) await writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2) + '\n');
  if (WRITE) await writeFile(BASELINE_PATH, JSON.stringify(result, null, 2) + '\n');
  if (!SKIP_AUDIT_CHECK) {
    const auditResult = WRITE ? result : JSON.parse(await readFile(BASELINE_PATH, 'utf8'));
    if (auditResult.payload.appVersion !== payload.appVersion) {
      throw new Error(`Performance baseline is for v${auditResult.payload.appVersion}, current app is v${payload.appVersion}. Run: npm run performance:write --prefix scripts`);
    }
    // Payload evidence in the audit must always be the current source evidence;
    // timings remain the checked-in five-run baseline until explicitly refreshed.
    auditResult.payload = payload;
    auditResult.budgets = budgetConfig;
    await updateOrCheckAudit(auditResult);
  }

  console.log(`\n  payload: ${kb(payload.runtimeShellRaw)} decoded / ${kb(payload.runtimeShellBrotli)} Brotli, ${payload.eagerScripts} scripts`);
  console.log(`  cold: FCP ${ms(timings.cold.fcp.median)} median, LCP ${ms(timings.cold.lcp.median)} median, CLS ${timings.cold.cls.worst.toFixed(3)} worst`);
  console.log(`  interactions: add ${ms(timings.interactions.addTask.median)}, focus ${ms(timings.interactions.enterFocus.median)} median`);
  if (failures.length) {
    console.error('\nPerformance budget failures:\n  ' + failures.join('\n  '));
    process.exitCode = 1;
  } else {
    console.log('  ✓ performance budgets passed');
  }
} catch (error) {
  console.error(`✗ PERFORMANCE TEST FAILED — ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
