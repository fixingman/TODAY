// Isolated preview checks. Never opens TODAY or imports its runtime.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const directory = dirname(fileURLToPath(import.meta.url));
const workspace = resolve(directory, '../..');
const require = createRequire(resolve(workspace, 'scripts/package.json'));
const { default: puppeteer } = await import(require.resolve('puppeteer-core'));
const path = resolve(directory, 'habit-context.html');
const fragment = await readFile(path, 'utf8');
const source = [...fragment.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
new vm.Script(source);
assert.ok(!/<!doctype|<html[\s>]|<body[\s>]|<head[\s>]/i.test(fragment));
assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|sendBeacon|Today\.use)\b/.test(fragment));
assert.ok(!fragment.includes('document.currentScript'));
assert.ok(!fragment.includes('\\"'));
const renderer = '/Users/can/.codex/plugins/cache/openai-bundled/visualize/1.0.37/skills/visualize/scripts/render.py';
const rendered = spawnSync('python3', [renderer, path], { encoding: 'utf8', maxBuffer: 4_000_000 });
assert.equal(rendered.status, 0, rendered.stderr);
const server = createServer((request, response) => {
  if (request.url !== '/') { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(rendered.stdout);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const screenshots = resolve(workspace, '.context/habit-context');
await mkdir(screenshots, { recursive: true });
let browser;
let groups = 0;
const errors = [], requests = [];
const pass = label => { groups++; console.log(`✓ ${label}`); };
try {
  pass('Literal fragment, valid JavaScript, no live app / API / browser-storage calls');
  browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, pipe: true, args: ['--no-first-run', '--disable-background-networking'] });
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.evaluateOnNewDocument(() => {
    window.__studyControls = [];
    window.Tweak = class {
      constructor(configuration) { this.configuration = configuration; }
      addSelect(object, property, configuration) { window.__studyControls.push({ object, property, configuration, apply: this.configuration.onChange }); }
    };
  });
  await page.setViewport({ width: 1024, height: 1000, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: 'body{padding:0!important}iframe{height:1800px!important}' });
  const frame = await (await page.$('iframe')).contentFrame();
  const root = '#today-habit-context';
  await frame.waitForSelector(`${root} .habit[data-id="read"]`);
  await frame.evaluate(() => document.fonts.ready);
  assert.ok(await frame.evaluate(() => document.fonts.check('13.5px "DM Mono"')), 'Product typeface loaded');
  const click = selector => frame.click(`${root} ${selector}`);
  const text = selector => frame.$eval(`${root} ${selector}`, element => element.textContent.trim());
  const fill = (selector, value) => frame.$eval(`${root} ${selector}`, (element, value) => { element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  const scene = value => click(`[data-act="scene"][data-v="${value}"]`);
  const shot = async name => (await frame.$(root)).screenshot({ path: resolve(screenshots, `${name}.png`) });
  const noOverflow = async label => {
    const overflow = await frame.$eval(root, element => {
      const bounds = element.getBoundingClientRect();
      return [...element.querySelectorAll('*')].filter(item => {
        if (item.closest('.visually-hidden') || item.matches('style,script')) return false;
        const rect = item.getBoundingClientRect();
        return rect.width && rect.height && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
      }).map(item => `${item.tagName}.${item.className}`);
    });
    assert.deepEqual(overflow, [], label);
  };
  assert.equal(await frame.$$eval(`${root} .habit-list .habit`, rows => rows.length), 3);
  assert.equal(await frame.$$eval(`${root} textarea`, inputs => inputs.length), 0);
  await shot('desktop-habits');

  // Compare the component to current index.html CSS without loading any app scripts.
  const index = await readFile(resolve(workspace, 'index.html'), 'utf8');
  let nativeCSS = [...index.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');
  for (const match of [...nativeCSS.matchAll(/url\('(\/fonts\/[^']+)'\)/g)]) {
    const font = await readFile(resolve(workspace, decodeURIComponent(match[1]).slice(1)));
    nativeCSS = nativeCSS.replaceAll(match[0], `url('data:font/woff2;base64,${font.toString('base64')}')`);
  }
  const panelHTML = await frame.$eval(`${root} .config-panel`, panel => {
    const clone = panel.cloneNode(true); clone.classList.add('open');
    clone.querySelectorAll('.habit-name').forEach(button => { const div = document.createElement('div'); div.className = button.className; div.textContent = button.textContent; button.replaceWith(div); });
    return clone.outerHTML;
  });
  const nativePage = await browser.newPage();
  await nativePage.setContent(`<html lang="en"><head><style>${nativeCSS}</style><style>.config-panel.open{animation:none}</style></head><body><main class="app">${panelHTML}</main></body></html>`);
  await nativePage.evaluate(() => document.fonts.ready);
  const componentLayout = (surface, selector) => surface.$eval(selector, panel => {
    const origin = panel.getBoundingClientRect();
    return ['.config-title-row','.config-title','.habit','.habit-check','.habit-name','.habit-week','.habit-streak','.streak-label','.config-actions','.btn-ghost'].map(selector => {
      const element = panel.querySelector(selector), rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      const result={selector, x:+(rect.x-origin.x).toFixed(2),y:+(rect.y-origin.y).toFixed(2),width:+rect.width.toFixed(2),height:+rect.height.toFixed(2),font:style.fontFamily,size:style.fontSize,weight:style.fontWeight,line:style.lineHeight,color:style.color,border:style.borderColor};
      // Preview uses a text checkmark, not the app's inline SVG; keep its native box/border.
      if(selector==='.habit-check')for(const key of ['font','size','weight','line','color'])delete result[key];
      return result;
    });
  });
  for (const width of [1024,390]) {
    await page.setViewport({width,height:1000,deviceScaleFactor:1});
    await nativePage.setViewport({width,height:1000,deviceScaleFactor:1});
    const native = await componentLayout(nativePage,'.config-panel');
    const proposed = await componentLayout(frame,`${root} .config-panel`);
    assert.deepEqual(proposed,native, `${width}px current native component comparison`);
    await (await nativePage.$('.config-panel')).screenshot({path:resolve(screenshots,`native-panel-${width}.png`)});
  }
  await nativePage.close();
  pass('Same-viewport native CSS comparison: component geometry, typography, colours and borders');

  // Exact source tokens and native grid geometry, not just a similar palette.
  for (const width of [1024, 736, 390, 320]) {
    await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
    await noOverflow(`${width}px read overflow`);
    const geometry = await frame.$eval(`${root} .habit-list .habit`, element => {
      const style = getComputedStyle(element);
      const child = selector => getComputedStyle(element.querySelector(selector));
      return {
        columns: style.gridTemplateColumns.split(' '), padding: style.padding, gap: style.columnGap,
        check: child('.habit-check').width, name: child('.habit-name').fontSize,
        strength: child('.habit-streak').width,
        dots: [...element.querySelectorAll('.week-dot')].filter(dot => getComputedStyle(dot).display !== 'none').length,
        dotWidth: child('.week-dot:last-child').width, dotRound: child('.week-dot:last-child').borderRadius
      };
    });
    assert.equal(geometry.columns[0], '18px');
    assert.equal(geometry.columns[2], width <= 480 ? '65px' : '205px');
    assert.equal(geometry.check, '18px'); assert.equal(geometry.name, '13.5px'); assert.equal(geometry.strength, '32px');
    assert.equal(geometry.dotWidth, '5px'); assert.equal(geometry.dotRound, '50%');
    assert.equal(geometry.dots, width <= 480 ? 7 : 21);
    assert.equal(geometry.padding, width <= 480 ? '8px' : '12px 16px');
    if (width === 390) await shot('phone-habits');
    await click('[data-act=edit]');
    assert.equal(await text('[data-act=edit]'), 'Done');
    assert.equal(await frame.evaluate(() => document.activeElement.dataset.act), 'edit', 'Edit does not summon the keyboard');
    assert.equal(await frame.$$eval(`${root} .habit-edit-input`, inputs => inputs.length), 3, 'Only existing name fields');
    assert.ok(await frame.$$eval(`${root} .habit-edit-input`, inputs => inputs.every(input=>input.getBoundingClientRect().right<=input.closest('.habit-body').getBoundingClientRect().right+1)), 'Edit fields stay in the name column');
    if (width <= 480) assert.equal(await frame.$eval(`${root} .habit-edit-input`, input => getComputedStyle(input).fontSize), '16px');
    await noOverflow(`${width}px edit overflow`);
    if (width === 390) await shot('phone-edit');
    await click('[data-act=edit]');
  }
  pass('Native desktop/mobile grid, spacing, dots, separate strength, inline edit and mobile 16px inputs');

  await page.setViewport({ width: 736, height: 1000, deviceScaleFactor: 1 });
  const rowSelector = '.habit-list .habit[data-id="walk"]';
  const top = await frame.$eval(`${root} ${rowSelector}`, row => row.getBoundingClientRect().top);
  await click(`${rowSelector} .habit-check`);
  assert.equal(await frame.$eval(`${root} ${rowSelector} .habit-check`, button => button.getAttribute('aria-pressed')), 'true');
  assert.equal(await frame.$eval(`${root} ${rowSelector}`, row => row.getBoundingClientRect().top), top);
  await click(`${rowSelector} .habit-check`);
  await frame.focus(`${root} ${rowSelector} .habit-name`);
  await page.keyboard.press('Space');
  assert.equal(await frame.$eval(`${root} ${rowSelector} .habit-check`, button => button.getAttribute('aria-pressed')), 'true');
  await page.keyboard.press('Space');
  await page.keyboard.down('Alt'); await page.keyboard.press('ArrowUp'); await page.keyboard.up('Alt');
  assert.equal(await frame.$eval(`${root} .habit-list .habit:nth-child(2)`, row => row.dataset.id), 'walk');
  await page.keyboard.down('Alt'); await page.keyboard.press('ArrowDown'); await page.keyboard.up('Alt');
  pass('Check/uncheck is neutral and position-stable; keyboard check and deliberate reorder');

  await click('.habit-list .habit[data-id="read"] .habit-name');
  assert.equal(await frame.$eval(`${root} .thc-focus`, element => element.hidden), false);
  assert.equal(await text('[data-act=star]'), '✦', 'Focus alone never asks a planning question');
  assert.equal(await frame.$eval(`${root} .config-panel`, element => element.hidden), true);
  await click('[data-act=star]');
  assert.equal(await text('[data-act=star]'), 'What could a few pages follow?');
  assert.equal(await frame.$eval(`${root} .focus-timer-inner`, element => element.getBoundingClientRect().height), 34);
  assert.equal(await frame.$$eval(`${root} .thc-focus input, ${root} .thc-focus textarea`, inputs => inputs.length), 0);
  await shot('desktop-focus-question');
  for (const width of [390, 320]) {
    await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
    await noOverflow(`${width}px focus overflow`);
    const questionFits = await frame.$eval(`${root} [data-act=star]`, button => {const range=document.createRange();range.selectNodeContents(button);const text=range.getBoundingClientRect(),bar=button.closest('.focus-timer-inner').getBoundingClientRect();return text.left>=bar.left&&text.right<=bar.right&&text.top>=bar.top&&text.bottom<=bar.bottom;});
    assert.ok(questionFits, 'Actual question text fits inside timer; invisible touch expansion is not clipping');
    if (width === 390) await shot('phone-focus-question');
  }
  await page.keyboard.press('Escape');
  assert.equal(await frame.evaluate(() => document.activeElement.closest('.habit').dataset.id), 'read');
  await click('[data-act=edit]');
  await fill('.habit[data-id="read"] input', 'Stretch');
  await click('[data-act=edit]');
  await click('.habit-list .habit[data-id="read"] .habit-name'); await click('[data-act=star]');
  assert.equal(await text('[data-act=star]'), 'What familiar routine could this follow?', 'A renamed habit cannot inherit its fixture-specific reading question');
  await page.keyboard.press('Escape');
  await click('[data-act=edit]'); await fill('.habit[data-id="read"] input', 'Read'); await click('[data-act=edit]');
  pass('Opt-in focus question, existing 34px timer placement, no answer field, Escape and renamed-habit guard');

  await click('[data-act=edit]');
  await fill('.habit[data-id="walk"] input', '   '); await click('[data-act=edit]');
  assert.equal(await text('.habit[data-id="walk"] .habit-name'), 'Walk', 'Native empty-name fallback');
  await click('[data-act=edit]'); await click('.habit[data-id="walk"] [data-act=archive]');
  assert.equal(await frame.$(`${root} .habit-list .habit[data-id="walk"]`), null);
  await click('[data-act=undo]');
  assert.equal(await frame.$eval(`${root} .habit-list .habit:last-child`, row => row.dataset.id), 'walk');
  await click('[data-act=edit]');
  await click('[data-act=new]');
  assert.equal(await frame.$$eval(`${root} .habit-add-row input`, inputs => inputs.length), 1);
  const entered = 'Private example <img src=x onerror=alert(1)> ' + 'long name '.repeat(8);
  await fill('.habit-input', entered);
  await frame.$eval(`${root} .habit-input`, input => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })));
  assert.equal(await frame.$$eval(`${root} .habit-list .habit`, rows => rows.length), 3);
  await frame.focus(`${root} .habit-input`); await page.keyboard.press('Enter');
  assert.equal(await frame.$$eval(`${root} .habit-list .habit`, rows => rows.length), 4);
  assert.equal(await text('.habit[data-id="n1"] .habit-name'), entered.slice(0, 100).trim());
  assert.equal(await frame.$(`${root} .habit-list img`), null);
  await noOverflow('Long literal name');
  const saved = await frame.evaluate(() => window.openai.widgetState);
  assert.doesNotMatch(JSON.stringify(saved.modelContent), /Private|bedroom|Read|Walk/);
  assert.ok(saved.privateContent.habits.some(habit => habit.name.startsWith('Private example')));
  assert.ok(JSON.stringify(saved).length < 16_384);
  await frame.evaluate(snapshot => window.dispatchEvent(new CustomEvent('openai:set_globals', { detail: { globals: { widgetState: snapshot } } })), saved);
  assert.equal(await frame.$eval(`${root} .habit-add-row`, row => row.classList.contains('open')), true, 'Own host-state echo must not close the current interaction');
  await click('[data-act=edit]'); await click('.habit[data-id="n1"] [data-act=archive]'); await click('[data-act=edit]');
  pass('Archive/Undo, safe single-field add, IME, long names and private-only entered content');

  await scene('morning');
  const line = await text('.nudge-text');
  assert.match(line, /hallway charger/);
  await click('.thc-task:first-child .habit-check');
  assert.equal(await text('.nudge-text'), line, 'Task completion never rewrites the delivered line');
  assert.equal(await frame.$eval(`${root} .thc-focus`, element => element.hidden), true);
  assert.equal(await frame.$eval(`${root} .config-panel`, element => element.hidden), true, 'Task completion must not open Habits');
  await shot('phone-morning-connection');
  await scene('ordinary');
  assert.doesNotMatch(await text('.thc-nudge'), /walk|charger|habit|missed|call/i);
  await shot('phone-ordinary-morning');
  pass('Fixed pre-authored morning comparisons; no habit insertion on ordinary morning or task completion');

  await scene('habits');
  await frame.evaluate(() => { const c = window.__studyControls.find(control => control.property === 'width'); if (!c) throw new Error('Missing width control'); c.object.width = 'Phone'; c.apply(); });
  assert.equal(await frame.$eval(`${root} .thc-frame`, frame => Math.round(frame.getBoundingClientRect().width)), 320);
  await page.setViewport({ width: 1024, height: 1000, deviceScaleFactor: 1 });
  assert.equal(await frame.$eval(`${root} .thc-frame`, frame => Math.round(frame.getBoundingClientRect().width)), 390);
  await click('[data-act=width][data-v=responsive]');
  await frame.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const audit = async label => {
    const violations = await frame.evaluate(async () => (await axe.run(document.getElementById('today-habit-context'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    assert.deepEqual(violations, [], `${label} accessibility`);
  };
  await audit('Habits'); await click('[data-act=edit]'); await audit('Edit'); await click('[data-act=edit]');
  await scene('morning'); await audit('Morning'); await scene('ordinary'); await audit('Ordinary');
  await scene('habits'); await click('.habit-list .habit[data-id="read"] .habit-name'); await audit('Focus');
  await click('[data-act=star]'); await audit('Focus question'); await click('[data-act=rest]');
  pass('Optional width control and axe audits in read/edit, both mornings, focus and expanded question');

  const touchPage = await browser.newPage();
  touchPage.on('pageerror',error=>errors.push(error.message));
  touchPage.on('request',request=>requests.push(request.url()));
  await touchPage.setViewport({width:390,height:1000,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await touchPage.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
  const touchFrame=await (await touchPage.$('iframe')).contentFrame();
  assert.equal(await touchFrame.evaluate(()=>matchMedia('(hover: hover)').matches),false);
  assert.equal(await touchFrame.$$eval(`${root} .habit-list [data-act=focus]`,buttons=>buttons.length),0,'Touch must not acquire a desktop-only focus entry');
  await touchFrame.click(`${root} .habit[data-id=read] .habit-name`);
  assert.equal(await touchFrame.$eval(`${root} .thc-focus`,element=>element.hidden),true);
  await touchFrame.click(`${root} .habit[data-id=read] .habit-check`);
  assert.equal(await touchFrame.$eval(`${root} .habit[data-id=read] .habit-check`,button=>button.getAttribute('aria-pressed')),'true');
  await touchFrame.click(`${root} [data-act=scene][data-v=morning]`);
  assert.match(await touchFrame.$eval(`${root} .nudge-text`,element=>element.textContent),/hallway charger/);
  await touchPage.close();
  pass('Touch preserves tracking/morning preview without inventing mobile focus-companion support');

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  assert.equal(await frame.$eval(`${root} .habit`, element => getComputedStyle(element).transitionDuration), '0s');
  assert.deepEqual(errors, [], 'No page errors');
  const staticScripts = ['https://unpkg.com/@floating-ui/core@1.7.3/dist/floating-ui.core.umd.min.js','https://unpkg.com/@floating-ui/dom@1.7.4/dist/floating-ui.dom.umd.min.js','https://unpkg.com/lucide@1.17.0/dist/umd/lucide.js'];
  assert.deepEqual(requests.filter(request => { const url = new URL(request); return !['127.0.0.1','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname) && !['data:','about:','blob:'].includes(url.protocol) && !staticScripts.includes(request); }), []);
  pass('Reduced motion, no page errors, no unexpected requests');
  console.log(`\n${groups} isolated check groups passed. Captures: ${screenshots}`);
} finally {
  if (errors.length) console.error('Page errors:', errors);
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
