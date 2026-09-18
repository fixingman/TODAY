// TODAY — visual regression test
// Takes screenshots of 6 canonical UI states and diffs against stored PNG baselines.
// Catches layout, colour, and spacing regressions that DOM assertions cannot.
//
// Usage:
//   node scripts/visual-test.mjs               — compare against baselines
//   node scripts/visual-test.mjs --update      — regenerate all baselines
//   node scripts/visual-test.mjs --scene morning  — run one scene only
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
const ONLY      = process.argv.find((_, i) => process.argv[i - 1] === '--scene');
const CHROME    = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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
  page.on('pageerror', e => errors.push(e.message));

  // Disable all CSS animations/transitions — deterministic screenshots with no
  // in-flight animation state.  The app already respects prefers-reduced-motion.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport(viewport);

  await page.evaluateOnNewDocument((h, seedData) => {
    // Dismiss splash so the main UI is immediately visible
    localStorage.setItem('splash_shown_at', String(Date.now()));

    // Freeze the hour returned by new Date().getHours() without touching Date.now()
    // or ISO-string construction (focus session restore and zone-change timestamps
    // both use Date.now() / new Date().toISOString(), which must stay real).
    const _orig = Date.prototype.getHours;
    Date.prototype.getHours = function () {
      return window.__VT_HOUR__ !== undefined ? window.__VT_HOUR__ : _orig.call(this);
    };
    window.__VT_HOUR__ = h;

    // Seed app state
    for (const [k, v] of Object.entries(seedData)) {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, hour, seed);

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForApp(page);

  if (interact) {
    await interact(page);
    await new Promise(r => setTimeout(r, 80)); // rAF settle after interaction
  }

  const buf = await page.screenshot({ type: 'png' });
  await page.close();

  if (errors.length) {
    console.warn(`  ⚠ page error(s) in "${name}": ${errors.slice(0, 3).join(' | ')}`);
  }
  return buf;
}

async function compareOrSave(name, actual) {
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

  const base = PNG.sync.read(await readFile(path));
  const shot = PNG.sync.read(actual);

  if (base.width !== shot.width || base.height !== shot.height) {
    console.error(
      `  ✗ ${name}: viewport size changed`
      + ` (baseline ${base.width}×${base.height}, got ${shot.width}×${shot.height})`
    );
    return false;
  }

  const diff = pixelmatch(base.data, shot.data, null, base.width, base.height, {
    threshold:  DIFF_THRESHOLD,
    includeAA:  false, // ignore anti-aliasing differences
  });

  if (diff > MAX_DIFF_PX) {
    const pct = ((diff / (base.width * base.height)) * 100).toFixed(2);
    console.error(
      `  ✗ ${name}: ${diff} px differ (${pct}%) — limit is ${MAX_DIFF_PX} px`
    );
    return false;
  }

  const note = diff > 0 ? ` (${diff} px diff, within limit)` : '';
  console.log(`  ✓ ${name}${note}`);
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
        today_focus_session: { taskId: 'vt_focus', rem: 1200, savedAt: Date.now(), paused: true },
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
    const buf = await SCENES[name]();
    const ok  = await compareOrSave(name, buf);
    if (ok) passed++; else failed++;
  }
} finally {
  await browser.close();
  server.close();
}

const verb = UPDATE ? 'saved' : 'passed';
console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} ${verb}, ${failed} failed (${names.length} total)\n`);
if (failed > 0) process.exit(1);
