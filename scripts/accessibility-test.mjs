// TODAY — automated accessibility regression audit.
// Covers reachable page states; manual VoiceOver/PiP checks remain in Test-matrix.md.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const AXE = await readFile(join(ROOT, 'scripts/node_modules/axe-core/axe.min.js'), 'utf8');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2' };

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
const BASE = `http://localhost:${server.address().port}`;

// CI's headless Linux Chrome reports no pointing device at all — (hover: hover) false,
// (pointer: fine) false, (pointer: coarse) false — so @media (hover: hover) never matches
// there and the copy button and hover shimmer never render. Media emulation cannot
// change hover/pointer (Puppeteer rejects the names; CDP ignores them), but Blink's
// launch-time input settings can. Declare the desktop these assertions assume:
// hover=2 (hover), pointer=4 (fine). Verified both directions on macOS 2026-09-06.
const DESKTOP_INPUT = '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--disable-extensions', DESKTOP_INPUT] });
const fail = message => { throw new Error(message); };
const ok = message => console.log('  ✓ ' + message);

async function injectAxe(page) {
  await page.addScriptTag({ content: AXE });
}

async function audit(page, label, context = 'body') {
  const violations = await page.evaluate(async selector => {
    const result = await axe.run(document.querySelector(selector), {
      runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] },
    });
    return result.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target.join(' ')) }));
  }, context);
  if (violations.length) {
    fail(`${label}: ${violations.map(v => `${v.id} (${v.targets.slice(0, 3).join(', ')})`).join('; ')}`);
  }
  ok(label);
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('today_manual', JSON.stringify([
      { id:'manual_1001', text:'First accessible task', lastActive: Date.now() },
      { id:'manual_1002', text:'Second accessible task', lastActive: Date.now() }
    ]));
    localStorage.setItem('today_habits', JSON.stringify([
      { id:'habit_1001', name:'Accessible habit' }
    ]));
    localStorage.setItem('today_habit_completions', '{}');
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('main-app')).opacity === '1', { timeout: 10000 });
  await injectAxe(page);

  await audit(page, 'main page has no WCAG A/AA axe violations');

  await page.focus('.skip-link');
  await page.keyboard.press('Enter');
  const skipTarget = await page.evaluate(() => document.activeElement?.id);
  if (skipTarget !== 'main-app') fail('skip navigation did not move focus to the main task surface');
  ok('skip navigation moves focus to the main task surface');

  const names = await page.evaluate(() => ({
    header: ['habitsBtn','trelloBtn','infoBtn','todayLogo'].map(id => document.getElementById(id).getAttribute('aria-label')),
    taskPressed: document.querySelector('.task-check')?.getAttribute('aria-pressed'),
    inactiveHidden: ['undoToast','meetingOverlay','triageOverlay','meetingPill','voicePill']
      .every(id => document.getElementById(id)?.hidden),
  }));
  if (names.header.some(name => !name) || names.taskPressed !== 'false' || !names.inactiveHidden) fail('names, states, or inactive hidden-state contract missing');
  ok('controls expose names/state and inactive UI is hidden');

  for (const [button, panel, label] of [
    ['habitsBtn','habitsPanel','habits disclosure'],
    ['trelloBtn','configPanel','connections disclosure'],
    ['infoBtn','infoPanel','about disclosure'],
    ['todayLogo','memoryPanel','memory disclosure'],
  ]) {
    await page.click('#' + button);
    await new Promise(resolve => setTimeout(resolve, 250));
    const open = await page.evaluate((b, p) => document.getElementById(b).getAttribute('aria-expanded') === 'true' && !document.getElementById(p).hidden, button, panel);
    if (!open) fail(label + ' did not synchronize expanded/hidden state');
    await audit(page, label + ' passes axe');
    await page.click('#' + button);
  }

  await page.click('#todayLogo');
  const memoryTargets = await page.evaluate(() => {
    const clear = document.querySelector('.memory-clear-btn');
    const connections = document.querySelector('.memory-conn-link');
    const metric = el => {
      const rect = el?.getBoundingClientRect();
      const css = el ? getComputedStyle(el) : null;
      return { height: rect?.height || 0, paddingTop: css?.paddingTop || '' };
    };
    return { clear: metric(clear), connections: metric(connections) };
  });
  if (memoryTargets.clear.height < 24 || memoryTargets.connections.height < 24
      || memoryTargets.clear.paddingTop !== '8px' || memoryTargets.connections.paddingTop !== '8px') {
    fail('Memory footer target sizing or spacing regressed: ' + JSON.stringify(memoryTargets));
  }
  ok('Memory footer keeps its visible padding and 24px minimum targets');
  await page.click('#todayLogo');

  await page.focus('#manualList .task');
  await page.keyboard.down('Alt');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.up('Alt');
  await new Promise(resolve => setTimeout(resolve, 50));
  const reordered = await page.evaluate(() => ({
    ids: JSON.parse(localStorage.getItem('today_manual')).map(t => t.id),
    live: document.getElementById('a11yPolite').textContent,
    active: document.activeElement?.dataset?.taskid,
  }));
  if (reordered.ids.join(',') !== 'manual_1002,manual_1001' || reordered.active !== 'manual_1001' || !reordered.live.includes('position 2 of 2')) fail('Option+Arrow reorder did not persist, retain focus, and announce: ' + JSON.stringify(reordered));
  ok('Option+Arrow reorder persists and announces');

  await page.keyboard.press('Enter');
  await page.waitForSelector('.focus-timer:not([hidden])');
  const focusState = await page.evaluate(() => ({
    timer: !document.querySelector('.focus-timer').hidden,
    othersHidden: [...document.querySelectorAll('.task:not(.focused)')].every(el => el.inert && el.getAttribute('aria-hidden') === 'true'),
  }));
  if (!focusState.timer || !focusState.othersHidden) fail('focus mode did not isolate inactive content');
  await audit(page, 'focus mode passes axe');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('.focus-timer').hidden);

  await page.evaluate(() => Today.use('triage').triageExpand());
  await page.waitForFunction(() => {
    const panel = document.getElementById('triagePanel');
    const active = document.activeElement;
    return panel?.getAttribute('aria-modal') === 'true' && active instanceof Element && !!active.closest('#triageOverlay');
  });
  await audit(page, 'triage dialog passes axe', '#triageOverlay');
  const triageModal = await page.evaluate(() => document.getElementById('triagePanel').getAttribute('aria-modal') === 'true' && document.activeElement.closest('#triageOverlay'));
  if (!triageModal) fail('triage dialog did not receive modal focus');
  await page.keyboard.press('Escape');

  await page.setViewport({ width: 320, height: 800 });
  await new Promise(resolve => setTimeout(resolve, 100));
  const reflow = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    viewport: document.querySelector('meta[name="viewport"]').content,
    offenders: [...document.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > document.documentElement.clientWidth + 1 || r.left < -1;
    }).slice(0, 8).map(el => `${el.tagName.toLowerCase()}#${el.id}.${el.className}`),
  }));
  if (reflow.overflow || /maximum-scale|user-scalable/.test(reflow.viewport)) fail('320px reflow or zoom-capable viewport failed: ' + JSON.stringify(reflow));
  ok('320px reflow and browser zoom remain available');

  const contrast = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const rgb = value => {
      value = value.trim();
      if (value.startsWith('#')) return [1,3,5].map(i => parseInt(value.slice(i, i + 2), 16));
      return value.match(/\d+/g).slice(0, 3).map(Number);
    };
    const lum = c => {
      const x = c.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
      return .2126*x[0] + .7152*x[1] + .0722*x[2];
    };
    const ratio = (a,b) => { const x=lum(rgb(a)), y=lum(rgb(b)); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
    return {
      baseMuted: ratio(css.getPropertyValue('--color-muted'), css.getPropertyValue('--color-surface')),
      baseControl: ratio(css.getPropertyValue('--color-control-border'), css.getPropertyValue('--color-surface')),
      elevatedMuted: ratio(css.getPropertyValue('--color-muted-elevated'), css.getPropertyValue('--color-surface2')),
      elevatedControl: ratio(css.getPropertyValue('--color-control-border-elevated'), css.getPropertyValue('--color-surface2')),
      panelUsesElevatedMuted: getComputedStyle(document.getElementById('memoryPanel')).getPropertyValue('--muted').trim()
        === css.getPropertyValue('--color-muted-elevated').trim(),
      panelUsesElevatedControl: getComputedStyle(document.getElementById('memoryPanel')).getPropertyValue('--control-border').trim()
        === css.getPropertyValue('--color-control-border-elevated').trim(),
    };
  });
  if (contrast.baseMuted < 4.5 || contrast.baseControl < 3
      || contrast.elevatedMuted < 4.5 || contrast.elevatedControl < 3
      || !contrast.panelUsesElevatedMuted || !contrast.panelUsesElevatedControl) {
    fail(`contextual token contrast failed (${JSON.stringify(contrast)})`);
  }
  ok('base and elevated muted/control tokens meet their contextual thresholds');

  const poem = await browser.newPage();
  await poem.setViewport({ width: 320, height: 800 });
  await poem.goto(BASE + '/poem.html?date=2026-08-12', { waitUntil: 'domcontentloaded' });
  await injectAxe(poem);
  await audit(poem, 'poem page passes axe');
  const poemSemantics = await poem.evaluate(() => !!document.querySelector('h1') && !!document.querySelector('blockquote') && !!document.querySelector('cite'));
  if (!poemSemantics) fail('poem semantic structure missing');
  ok('poem exposes heading, quotation, and author semantics');

  console.log('✓ ACCESSIBILITY TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
