// Isolated design-study checks. No app runtime, credentials, AI or user data.
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
const fragmentPath = resolve(directory, 'habits-with-a-place.html');
const fragment = await readFile(fragmentPath, 'utf8');
const renderer = process.env.VISUALIZE_RENDERER || '/Users/can/.codex/plugins/cache/openai-bundled/visualize/1.0.37/skills/visualize/scripts/render.py';
const rendered = spawnSync('python3', [renderer, fragmentPath], { encoding: 'utf8', maxBuffer: 4_000_000 });
assert.equal(rendered.status, 0, rendered.stderr);
assert.ok(!/<!doctype|<html[\s>]|<body[\s>]|<head[\s>]/i.test(fragment), 'Fragment, not a published page');
assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|sendBeacon|Today\.use)\b/.test(fragment), 'No network/app/storage access');
const source = [...fragment.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
new vm.Script(source);
assert.ok(!fragment.includes('\\"'), 'Literal HTML, not escaped string markup');
console.log('✓ Static isolation and JavaScript syntax');

const server = createServer((request, response) => {
  if (request.url !== '/') { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(rendered.stdout);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const screenshots = resolve(workspace, '.context/habit-moments');
await mkdir(screenshots, { recursive: true });
let browser;
let groups = 1;
const errors = [];
try {
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, pipe: true, args: ['--no-first-run', '--disable-background-networking']
  });
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.setViewport({ width: 1024, height: 1100, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    window.__studyControls = [];
    window.Tweak = class {
      constructor(configuration) { this.configuration = configuration; }
      addSelect(object, property, configuration) {
        window.__studyControls.push({ object, property, configuration, apply: this.configuration.onChange });
      }
    };
  });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.addStyleTag({ content: 'body { padding: 0 !important; } iframe { height: 1800px !important; }' });
  const frame = await (await page.$('iframe')).contentFrame();
  await frame.waitForSelector('#today-habit-moments [data-habit="walk"]');
  await frame.evaluate(() => document.fonts.ready);
  const root = '#today-habit-moments';
  const click = selector => frame.click(`${root} ${selector}`);
  const text = selector => frame.$eval(`${root} ${selector}`, element => element.textContent.trim());
  const fill = async (selector, value) => {
    await frame.$eval(`${root} ${selector}`, (element, value) => {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  };
  const scene = value => frame.select(`${root} [data-scene]`, value);
  const openMoment = async id => {
    if (await frame.$(`${root} [data-action="add-moment"][data-id="${id}"]`)) await click(`[data-action="add-moment"][data-id="${id}"]`);
  };
  const tweak = async (property, value) => frame.evaluate((property, value) => {
    const control = window.__studyControls.find(control => control.property === property);
    if (!control) throw new Error(`Missing design control: ${property}`);
    control.object[property] = value;
    control.apply();
  }, property, value);
  const noOverflow = async label => {
    const overflow = await frame.$eval(root, element => {
      const bounds = element.getBoundingClientRect();
      return [...element.querySelectorAll('*')].filter(item => {
        if (item.closest('.study-sr') || item.matches('option')) return false;
        const rect = item.getBoundingClientRect();
        return rect.width && rect.height && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
      }).map(item => `${item.tagName}.${item.className}`);
    });
    assert.deepEqual(overflow, [], `${label} horizontal overflow`);
  };
  const screenshot = async name => (await frame.$(root)).screenshot({ path: resolve(screenshots, `${name}.png`) });
  const pass = label => { groups++; console.log(`✓ ${label}`); };

  assert.equal(await frame.$$eval(`${root} [data-habit]`, rows => rows.length), 4);
  assert.equal(await frame.$(`${root} [data-habit="walk"] .study-moment`), null);
  await screenshot('desktop-habits');
  await click('[data-action="edit"]');
  assert.equal(await frame.$$eval(`${root} [data-field="moment"]`, fields => fields.length), 2);
  await openMoment('walk');
  await fill('#study-moment-walk', 'After my first client call');
  await screenshot('desktop-edit');
  await click('[data-action="edit"]');
  assert.equal(await text('[data-habit="walk"] .study-moment'), 'After my first client call');
  pass('Existing edit flow adds a moment; established no-cue habits remain unchanged');

  const beforeCheck = await frame.$eval(`${root} [data-habit="walk"]`, element => element.getBoundingClientRect().top);
  await click('[data-action="habit-check"][data-id="walk"]');
  assert.equal(await frame.$eval(`${root} [data-action="habit-check"][data-id="walk"]`, element => element.getAttribute('aria-pressed')), 'true');
  assert.equal(await frame.$eval(`${root} [data-habit="walk"]`, element => element.getBoundingClientRect().top), beforeCheck);
  await click('[data-action="habit-check"][data-id="walk"]');
  assert.equal(await frame.$eval(`${root} [data-action="habit-check"][data-id="walk"]`, element => element.getAttribute('aria-pressed')), 'false');
  pass('Check/uncheck retains row position, moment and focusable control');

  await click('[data-action="edit"]');
  await fill('#study-moment-walk', '');
  await click('[data-action="edit"]');
  assert.equal(await frame.$(`${root} [data-habit="walk"] .study-moment`), null);
  await click('[data-action="new"]');
  assert.equal(await frame.$$eval(`${root} [data-form="habit"] input`, inputs => inputs.length), 1);
  await fill('#study-new-habit', 'Read a poem');
  await click('[data-form="habit"] button');
  assert.equal(await frame.$$eval(`${root} [data-habit]`, rows => rows.length), 5);
  assert.equal(await text('[data-habit="added-4"] .study-habit-name'), 'Read a poem');
  pass('Remove moment without resetting habit; quick add remains one field');

  await click('[data-action="edit"]');
  await fill('#study-name-walk', '   ');
  await click('[data-action="edit"]');
  assert.notEqual(await frame.$(`${root} #study-name-walk`), null, 'Blank name cannot silently save');
  await fill('#study-name-walk', 'Walk');
  await openMoment('walk');
  await fill('#study-moment-walk', 'After my first client call');
  await frame.focus(`${root} #study-moment-walk`);
  await page.keyboard.press('Escape');
  assert.equal(await text('[data-habit="walk"] .study-moment'), 'After my first client call');
  assert.equal(await frame.evaluate(() => document.activeElement.dataset.action), 'edit');
  pass('Blank-name validation and Escape exit retain an explicit keyboard focus target');

  const saved = await frame.evaluate(() => window.openai.widgetState);
  assert.ok(saved.privateContent.habits.some(habit => habit.id === 'walk' && habit.moment === 'After my first client call'));
  assert.doesNotMatch(JSON.stringify(saved.modelContent), /Walk|client call|bedroom|Ada/);
  await fill('#study-new-task', 'Read the sample');
  await frame.$eval(`${root} #study-new-task`, input => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })));
  assert.equal(await frame.$(`${root} [data-task="task-0"]`), null);
  await frame.focus(`${root} #study-new-task`);
  await page.keyboard.press('Enter');
  assert.equal(await text('[data-task="task-0"] .study-task-name'), 'Read the sample');
  pass('Typed content stays out of model-visible study state; task Enter respects IME composition');

  for (const width of [1024, 736, 390, 320]) {
    await page.setViewport({ width, height: 1100, deviceScaleFactor: 1 });
    await noOverflow(`${width}px read`);
    if (width === 390) await screenshot('phone-habits');
    await click('[data-action="edit"]');
    await fill('#study-moment-phone', 'After I finish getting ready for bed, I leave the phone charging outside the bedroom, even when the evening has gone differently than expected.');
    const clippedTextareas = await frame.$$eval(`${root} textarea`, fields => fields.filter(field => field.scrollHeight > field.clientHeight + 2).length);
    assert.equal(clippedTextareas, 0, `${width}px long moment must be fully readable while editing`);
    await noOverflow(`${width}px long edit`);
    const minimumInputSize = await frame.$$eval(`${root} input, ${root} textarea`, inputs => Math.min(...inputs.map(input => parseFloat(getComputedStyle(input).fontSize))));
    assert.ok(minimumInputSize >= 16, `${width}px inputs must not cause iOS text zoom`);
    if (width === 390) await screenshot('phone-edit-long');
    await click('[data-action="edit"]');
    await noOverflow(`${width}px long read`);
    if (width === 390) await screenshot('phone-habits-long');
  }
  pass('320 / 390 / 736 / 1024px read and edit layouts; long moments; 16px inputs');

  await tweak('presentation', 'In the name');
  assert.ok((await text('[data-habit="walk"] .study-habit-name')).includes(' — After my first client call'));
  assert.equal(await frame.$(`${root} [data-habit="walk"] .study-moment`), null);
  await noOverflow('Inline name comparison');
  await tweak('presentation', 'No moment');
  assert.equal(await text('[data-habit="walk"] .study-habit-name'), 'Walk');
  await tweak('presentation', 'Separate moment');
  await tweak('size', 'Phone');
  await noOverflow('Phone design control');
  pass('Name-only / separate / absent reading comparisons and phone width');

  await scene('preparation');
  const delivered = await text('.study-nudge p');
  assert.match(delivered, /spare charger/);
  await click('[data-action="task-check"][data-id="charger"]');
  assert.equal(await text('.study-nudge p'), delivered, 'Do not swap an already visible reading');
  assert.equal(await frame.$(`${root} [data-habit]`), null, 'Completing a task must not open Habits');
  await click('[data-action="vote"][data-vote="landed"]');
  assert.match(await text('[data-status]'), /TODAY votes are unchanged/);
  await screenshot('phone-preparation');
  pass('Illustrative morning relationship, local feedback, no completion offer or mid-read swap');

  await scene('unrelated');
  assert.equal(await frame.$eval(`${root} .study-nudge`, element => element.dataset.nudgeKind), 'ordinary');
  assert.doesNotMatch(await text('.study-nudge'), /walk|call|habit|charger|missed/i);
  await click('[data-action="panel"]');
  assert.equal(await text('[data-habit="walk"] .study-moment'), 'After my first client call');
  await click('[data-action="panel"]');
  await click('[data-action="task-focus"][data-id="samples"]');
  assert.equal(await frame.$(`${root} .study-nudge`), null);
  assert.equal(await frame.$(`${root} [data-action="vote"]`), null);
  assert.equal(await frame.$(`${root} [data-habit]`), null);
  await screenshot('phone-focus');
  await click('[data-action="leave-focus"]');
  await scene('focus');
  assert.equal(await frame.$(`${root} [data-action="vote"]`), null);
  pass('No-call day preserves the cue without a reminder; focus has no nudge controls');

  await scene('habits');
  await frame.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  for (const currentScene of ['habits', 'preparation', 'unrelated', 'focus']) {
    await scene(currentScene);
    const results = await frame.evaluate(async () => {
      const audit = await axe.run(document.getElementById('today-habit-moments'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return audit.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }));
    });
    assert.deepEqual(results, [], `${currentScene} accessibility audit`);
  }
  await scene('habits');
  await click('[data-action="edit"]');
  const editAudit = await frame.evaluate(async () => (await axe.run(document.getElementById('today-habit-moments'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(violation => violation.id));
  assert.deepEqual(editAudit, [], 'Edit accessibility audit');
  await click('[data-action="edit"]');
  pass('Axe checks: read/edit, preparation, ordinary and focus states');

  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  assert.equal(await frame.$eval(`${root} .study-check-mark`, element => getComputedStyle(element).transitionDuration), '0s');
  pass('Reduced motion disables transitions');
  assert.deepEqual(errors, [], 'No page errors');
  const unexpected = requests.filter(request => {
    const parsed = new URL(request);
    const wrapperScripts = [
      'https://unpkg.com/@floating-ui/core@1.7.3/dist/floating-ui.core.umd.min.js',
      'https://unpkg.com/@floating-ui/dom@1.7.4/dist/floating-ui.dom.umd.min.js',
      'https://unpkg.com/lucide@1.17.0/dist/umd/lucide.js'
    ];
    return !['127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(parsed.hostname) && !['data:', 'about:', 'blob:'].includes(parsed.protocol) && !wrapperScripts.includes(request);
  });
  assert.deepEqual(unexpected, [], 'Only local preview, fonts and the renderer’s pinned static utilities');
  pass('No page errors or unexpected account/API requests');
  console.log(`\n${groups} isolated check groups passed. Captures: ${screenshots}`);
} finally {
  if (errors.length) console.error('Page errors:', errors);
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
