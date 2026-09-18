// TODAY — visual regression test
// Takes repeat screenshots of 6 canonical UI states and diffs against stored PNG baselines.
// Catches layout, colour, and spacing regressions that DOM assertions cannot.
//
// Usage:
//   node scripts/visual-test.mjs               — compare against baselines
//   node scripts/visual-test.mjs --update      — regenerate all baselines
//   node scripts/visual-test.mjs --scene morning  — run one scene only
//   node scripts/visual-test.mjs --repeat 3     — take 3 captures per scene
//   node scripts/visual-test.mjs --probe-page-error --scene morning --repeat 1
//                                               — prove uncaught errors fail the harness
//
// Baselines live in scripts/visual-baselines/ and are committed to git.
// First run: node scripts/visual-test.mjs --update  then commit the PNGs.

import { createServer }              from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync }                 from 'node:fs';
import { extname, join, dirname }     from 'node:path';
import { fileURLToPath }              from 'node:url';

const DIR       = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(DIR, '..');
const BASELINES = join(DIR, 'visual-baselines');
const UPDATE    = process.argv.includes('--update');
const PROBE_PAGE_ERROR = process.argv.includes('--probe-page-error');
const ONLY      = process.argv.find((_, i) => process.argv[i - 1] === '--scene');
const REPEAT_ARG = process.argv.find((_, i) => process.argv[i - 1] === '--repeat');
const REPEAT     = UPDATE ? 1 : Number(REPEAT_ARG || 2);
const CHROME    = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!Number.isInteger(REPEAT) || REPEAT < 1 || REPEAT > 5) {
  console.error('✗ --repeat must be an integer between 1 and 5');
  process.exit(1);
}

// A Monday with no special day-boundary meaning. Constructed in the runner's
// local timezone so the page sees the same date and hour on macOS and Linux.
const FIXED_YEAR = 2026;
const FIXED_MONTH_INDEX = 8; // September
const FIXED_DAY = 14;
const fixedNowForHour = hour => new Date(FIXED_YEAR, FIXED_MONTH_INDEX, FIXED_DAY, hour, 0, 0, 0).getTime();

// Pixel comparison settings
// threshold: per-channel colour tolerance (0–1); 0.1 absorbs font-hinting drift
// maxDiff:   absolute pixel count allowed before a scene is marked failing
const DIFF_THRESHOLD = 0.1;
const MAX_DIFF_PX    = 200;

// ── Deps ────────────────────────────────────────────────────────────────────
let puppeteer, pixelmatch, PNG;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('✗ puppeteer-core not installed — run: cd scripts && npm install');
  process.exit(1);
}
try {
  pixelmatch = (await import('pixelmatch')).default;
  ({ PNG }   = await import('pngjs'));
} catch {
  console.error('✗ pngjs / pixelmatch not installed — run: cd scripts && npm install');
  process.exit(1);
}

// ── Static file server (same pattern as smoke-test) ─────────────────────────
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png':  'image/png',  '.woff2': 'font/woff2',  '.css': 'text/css',
};
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const BASE = `http://localhost:${server.address().port}`;

// ── Browser ──────────────────────────────────────────────────────────────────
// Match smoke-test: declare a desktop hover/pointer input so @media (hover:hover) rules fire
const DESKTOP_INPUT =
  '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions', DESKTOP_INPUT],
});

// ── Helpers ──────────────────────────────────────────────────────────────────
await mkdir(BASELINES, { recursive: true });

async function waitForApp(page) {
  await page.waitForFunction(
    () => {
      const bar = document.getElementById('addTaskBar');
      return bar && getComputedStyle(bar).opacity === '1'
             && getComputedStyle(bar).display !== 'none';
    },
    { timeout: 15000 },
  ).catch(() => { throw new Error('app never became ready (add bar never appeared)'); });
  await page.evaluate(() => document.fonts?.ready || Promise.resolve());
  // Flush any pending microtasks / rAFs (animations already disabled via reduced-motion)
  await new Promise(r => setTimeout(r, 120));
}

async function captureScene(name, {
  viewport  = { width: 1200, height: 800 },
  hour      = 10,
  seed      = {},       // extra localStorage keys → values (strings or objects)
  interact  = null,     // async fn(page) called after the app is ready
} = {}) {
  const page   = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const fixedNow = fixedNowForHour(hour);

  // Disable all CSS animations/transitions — deterministic screenshots with no
  // in-flight animation state.  The app already respects prefers-reduced-motion.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport(viewport);

  await page.evaluateOnNewDocument((now, seedData) => {
    // Freeze the complete clock, not just getHours(). The visible date header,
    // day keys, focus restore math, and seasonal copy must be identical tomorrow
    // and on CI. Explicit Date arguments still construct their requested value.
    const NativeDate = Date;
    function FixedDate(...dateArgs) {
      if (!new.target) return new NativeDate(now).toString();
      return new NativeDate(...(dateArgs.length ? dateArgs : [now]));
    }
    Object.setPrototypeOf(FixedDate, NativeDate);
    FixedDate.prototype = NativeDate.prototype;
    FixedDate.now = () => now;
    window.Date = FixedDate;

    // Dismiss splash so the main UI is immediately visible
    localStorage.setItem('splash_shown_at', String(Date.now()));

    // Seed app state
    for (const [k, v] of Object.entries(seedData)) {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, fixedNow, seed);

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForApp(page);

    const clock = await page.evaluate(expectedNow => {
      const expectedDate = new Date(expectedNow).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
      }).toUpperCase();
      return {
        dateNow: Date.now(),
        constructedNow: new Date().getTime(),
        header: document.getElementById('dateTag')?.textContent || '',
        expectedDate,
      };
    }, fixedNow);
    if (clock.dateNow !== fixedNow || clock.constructedNow !== fixedNow || clock.header !== clock.expectedDate) {
      throw new Error(`visual clock drift in "${name}": ${JSON.stringify(clock)}`);
    }

    if (interact) {
      await interact(page);
      await new Promise(r => setTimeout(r, 80)); // rAF settle after interaction
    }

    if (PROBE_PAGE_ERROR) {
      await page.evaluate(() => setTimeout(() => { throw new Error('visual harness page-error probe'); }, 0));
      await new Promise(r => setTimeout(r, 25));
    }

    const buf = await page.screenshot({ type: 'png' });
    if (errors.length) {
      throw new Error(`uncaught page error(s) in "${name}":\n  ${errors.slice(0, 3).join('\n  ')}`);
    }
    return buf;
  } finally {
    await page.close();
  }
}

function imageDifference(expected, actual, label) {
  const base = PNG.sync.read(expected);
  const shot = PNG.sync.read(actual);

  if (base.width !== shot.width || base.height !== shot.height) {
    throw new Error(
      `${label}: viewport size changed`
      + ` (expected ${base.width}×${base.height}, got ${shot.width}×${shot.height})`
    );
  }

  const diff = pixelmatch(base.data, shot.data, null, base.width, base.height, {
    threshold: DIFF_THRESHOLD,
    includeAA: false, // ignore anti-aliasing differences
  });
  return { diff, pixels: base.width * base.height };
}

async function compareOrSave(name, actual, label = name) {
  const path = join(BASELINES, name + '.png');

  if (UPDATE) {
    await writeFile(path, actual);
    console.log(`  ✓ baseline saved — ${name}`);
    return true;
  }

  if (!existsSync(path)) {
    console.error(`  ✗ ${name}: no baseline — run:  npm run visual:update  (from scripts/)`);
    return false;
  }

  let comparison;
  try { comparison = imageDifference(await readFile(path), actual, label); }
  catch (error) { console.error(`  ✗ ${error.message}`); return false; }
  const { diff, pixels } = comparison;

  if (diff > MAX_DIFF_PX) {
    const pct = ((diff / pixels) * 100).toFixed(2);
    console.error(
      `  ✗ ${label}: ${diff} px differ (${pct}%) — limit is ${MAX_DIFF_PX} px`
    );
    return false;
  }

  const note = diff > 0 ? ` (${diff} px diff, within limit)` : '';
  console.log(`  ✓ ${label}${note}`);
  return true;
}

function compareRepeat(name, first, actual, iteration) {
  let comparison;
  try { comparison = imageDifference(first, actual, `${name} repeat ${iteration}`); }
  catch (error) { console.error(`  ✗ ${error.message}`); return false; }
  if (comparison.diff > MAX_DIFF_PX) {
    const pct = ((comparison.diff / comparison.pixels) * 100).toFixed(2);
    console.error(`  ✗ ${name} repeat ${iteration}: ${comparison.diff} px differ (${pct}%) from repeat 1`);
    return false;
  }
  return true;
}

// ── Scene definitions ────────────────────────────────────────────────────────
// Shared task fixtures used across several scenes
const BASE_TASKS = [
  { id: 'vt_1', text: 'work: finish the design proposal' },
  { id: 'vt_2', text: 'work: review pull requests' },
  { id: 'vt_3', text: 'admin: pay the quarterly taxes' },
  { id: 'vt_4', text: 'home: schedule the dentist' },
  { id: 'vt_5', text: 'read: finish the systems thinking book' },
  { id: 'vt_6', text: 'work: prep for Thursday standup' },
];
const BASE_SEED = {
  today_soon: [],
  today_past: [],
};

const SCENES = {

  // 1. Morning — empty list, early-morning accent (hsl(87,85%,66%))
  //    Validates: time-texture colour, "Still early. Good." empty copy
  morning: () => captureScene('morning', {
    hour: 7,
    seed: {
      ...BASE_SEED,
      today_manual: [],
      today_done:   [],
    },
  }),

  // 2. Populated list — mix of done/undone tasks, tag prefixes
  //    Validates: task rows, done styling, tag shimmers, manual count
  populated: () => captureScene('populated', {
    hour: 10,
    seed: {
      ...BASE_SEED,
      today_manual: BASE_TASKS,
      today_done:   ['vt_2', 'vt_4'],
    },
  }),

  // 3. Focus session — active timer bar on a task
  //    Validates: focus-locked layout, timer bar position, task blur wave
  focus: () => {
    const focusTask = { id: 'vt_focus', text: 'work: deep work block — no interruptions' };
    return captureScene('focus', {
      hour: 10,
      seed: {
        ...BASE_SEED,
        today_manual: [focusTask, ...BASE_TASKS.slice(0, 3)],
        today_done:   [],
        // savedAt as numeric ms — restore() uses Date.now() comparison; paused:true makes
        // elapsed=0 so the value doesn't affect the displayed time, but must be a number.
        today_focus_session: { taskId: 'vt_focus', rem: 1200, savedAt: fixedNowForHour(10), paused: true },
      },
      interact: async (page) => {
        // Focus UI is restored during renderManual(); waitForApp() already covers that,
        // but confirm the timer bar is visible before snapping.
        await page.waitForFunction(
          () => document.querySelector('.focus-timer')?.hidden === false,
          { timeout: 5000 },
        ).catch(() => {}); // non-fatal — screenshot will show whatever state we're in
        // openUI() sets body { position: fixed; top: -0px } to lock scroll, and
        // a paused restore activates #breatheOverlay (position:fixed;inset:0;z-index:100)
        // covering the entire viewport. In headless Chrome both combine to render black.
        // Undo both just for the screenshot — we want the visual state, not runtime behavior.
        await page.evaluate(() => {
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          const overlay = document.getElementById('breatheOverlay');
          if (overlay) overlay.classList.remove('active');
        });
      },
    });
  },

  // 4. Triage panel — evening review overlay open over 4 undone tasks
  //    Validates: overlay layout, task cards, keep/let-go/done buttons
  triage: () => captureScene('triage', {
    hour: 21, // triage bar only appears at hour >= 20
    seed: {
      ...BASE_SEED,
      today_manual: [
        { id: 'vt_t1', text: 'work: send the status update' },
        { id: 'vt_t2', text: 'admin: renew the domain name' },
        { id: 'vt_t3', text: 'home: take out the recycling' },
        { id: 'vt_t4', text: 'work: respond to the contractor quote' },
      ],
      today_done: [],
    },
    interact: async (page) => {
      await page.waitForFunction(
        () => document.getElementById('triageBar')?.classList.contains('visible'),
        { timeout: 5000 },
      );
      await page.evaluate(() => document.getElementById('triageReviewBtn')?.click());
      await page.waitForFunction(
        () => !document.getElementById('triageOverlay')?.classList.contains('hidden'),
        { timeout: 5000 },
      );
    },
  }),

  // 5. Memory panel — slide-in open with populated task list in background
  //    Validates: memory panel layout, task list visible beneath overlay
  memory: () => captureScene('memory', {
    hour: 10,
    seed: {
      ...BASE_SEED,
      today_manual: BASE_TASKS,
      today_done:   ['vt_2', 'vt_4'],
    },
    interact: async (page) => {
      await page.evaluate(() => document.getElementById('todayLogo')?.click());
      await page.waitForFunction(
        () => !document.getElementById('memoryPanel')?.hidden,
        { timeout: 5000 },
      );
    },
  }),

  // 6. Mobile 320px — populated list at the narrowest common viewport
  //    Validates: column layout, 7-dot truncation, touch-target sizes
  'mobile-320': () => captureScene('mobile-320', {
    viewport: { width: 320, height: 667 },
    hour: 10,
    seed: {
      ...BASE_SEED,
      today_manual: BASE_TASKS.slice(0, 4),
      today_done:   ['vt_2'],
    },
  }),
};

// ── Run ──────────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const names = ONLY ? [ONLY] : Object.keys(SCENES);

console.log(UPDATE
  ? '\nVisual baselines — update mode\n'
  : '\nVisual regression — compare mode\n');

try {
  for (const name of names) {
    if (!SCENES[name]) {
      console.error(`  ✗ unknown scene: "${name}" (available: ${Object.keys(SCENES).join(', ')})`);
      failed++;
      continue;
    }
    let firstCapture = null;
    let scenePassed = true;
    for (let iteration = 1; iteration <= REPEAT; iteration++) {
      try {
        const buf = await SCENES[name]();
        const label = REPEAT > 1 ? `${name} [${iteration}/${REPEAT}]` : name;
        const baselineOk = await compareOrSave(name, buf, label);
        const repeatOk = firstCapture ? compareRepeat(name, firstCapture, buf, iteration) : true;
        if (!firstCapture) firstCapture = buf;
        if (!baselineOk || !repeatOk) scenePassed = false;
      } catch (error) {
        console.error(`  ✗ ${name}: ${error.message}`);
        scenePassed = false;
      }
    }
    if (scenePassed) passed++; else failed++;
  }
} finally {
  await browser.close();
  server.close();
}

const verb = UPDATE ? 'saved' : 'passed';
const repeatNote = REPEAT > 1 ? `; ${REPEAT} captures per scene` : '';
console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} ${verb}, ${failed} failed (${names.length} scenes${repeatNote})\n`);
if (failed > 0) process.exit(1);
