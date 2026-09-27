// TODAY — real-app footage for the promo and onboarding videos
// Drives the actual app (same static server + seeded localStorage as
// scripts/visual-test.mjs) and records each scene as an MP4 clip plus a
// closing still. Unlike the visual test, motion stays ON and the clock runs:
// it starts at a fixed date/hour and can be fast-forwarded (idle creatures).
//
// Usage (from video/):
//   node capture.mjs                  — all scenes, desktop 1440×900
//   node capture.mjs --mobile         — all scenes, phone 390×844 @3x
//   node capture.mjs --scene triage   — one scene
//   node capture.mjs --rate 0.3       — slow-motion factor (default 0.15)
//
// Slow motion: headless Chrome can't paint the focus blur or the ember drift at
// 30fps in real time, so the page runs on a dilated clock (timers, rAF,
// Date/performance.now, and CSS/WAAPI via Animation.setPlaybackRate) at a slow
// rate, the recorder gets 1/rate more real time per second, and the encode
// restores real speed. Every app timing stays true; only the capture gets
// smoother. Scenes whose pacing comes from real input (typing) or that never
// lagged (the splash) opt out with `rate: 1`.
//
// Output: video/captures/<desktop|mobile>/<scene>.mp4 + <scene>.png (gitignored).

import { createServer }          from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir }                from 'node:os';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath }         from 'node:url';
import { execFileSync }          from 'node:child_process';
import puppeteer                 from 'puppeteer-core';

const DIR    = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(DIR, '..');
const MOBILE = process.argv.includes('--mobile');
const ONLY   = process.argv.find((_, i) => process.argv[i - 1] === '--scene');
const RATE   = Number(process.argv.find((_, i) => process.argv[i - 1] === '--rate') || 0.15);
const OUT    = join(DIR, 'captures', MOBILE ? 'mobile' : 'desktop');
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const VIEWPORT = MOBILE
  ? { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { width: 1440, height: 900, deviceScaleFactor: 1 }; // the video shows the column ~1:1; 2× paints too slowly for the focus blur

// Same fixed Monday as the visual test, so dates on screen are stable.
const DAY = [2026, 8, 14];
const at   = (hour, min = 0) => new Date(...DAY, hour, min, 0, 0).getTime();
const DAYS = 24 * 60 * 60 * 1000;

// ── Static server (same pattern as visual-test) ─────────────────────────────
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

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  // Native scale too: screencast frames come back at the compositor's scale,
  // not the emulated deviceScaleFactor.
  args: ['--no-first-run', '--disable-extensions', '--autoplay-policy=no-user-gesture-required',
    `--force-device-scale-factor=${VIEWPORT.deviceScaleFactor}`,
    ...(MOBILE ? [] : ['--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4'])],
});

// Scene waits are in app time; the page runs at `rate`, so real waits stretch.
let rate = RATE;
const sleep = ms => new Promise(r => setTimeout(r, ms / rate));

// ── Fixtures ─────────────────────────────────────────────────────────────────
// Ids carry their creation time (connections._getCreatedFromId), which drives
// the age fade on the list and the "34 days" meta in evening review.
// A per-task minute offset keeps same-day ids unique.
let seq = 0;
const task = (text, daysOld = 0) => ({ id: `manual_${at(8, seq++) - daysOld * DAYS}`, text });

const DAY_TASKS = [
  task('call mum back'),
  task('work: finish the design proposal'),
  task('reply to Sam about Saturday'),
  task('book the dentist', 3),
  task('read: two chapters, no phone'),
];
const HAUNTING = task('sort out the garage', 34);
const EVENING_TASKS = [
  task('work: send the status update'),
  HAUNTING,
  task('renew the domain name', 2),
];

// ── Recorder ─────────────────────────────────────────────────────────────────
// Raw CDP screencast rather than page.screencast(): Puppeteer's recorder crops
// to CSS pixels, which throws away the 3× phone frames the 9:16 cut needs.
async function startRecording(page) {
  const cdp = await page.createCDPSession();
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ data, t: metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const { width, height, deviceScaleFactor: dpr = 1 } = VIEWPORT;
  await cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: 95, everyNthFrame: 1,
    maxWidth: width * dpr, maxHeight: height * dpr,
  });
  return async function stop(outPath) {
    await cdp.send('Page.stopScreencast').catch(() => {});
    if (!outPath || frames.length < 2) return;
    // Frames arrive only on paint; the concat list holds each one until the next.
    const dir = await mkdtemp(join(tmpdir(), 'today-cap-'));
    const list = [];
    for (const [i, f] of frames.entries()) {
      const file = join(dir, `${String(i).padStart(5, '0')}.jpg`);
      await writeFile(file, Buffer.from(f.data, 'base64'));
      const next = frames[i + 1]?.t ?? f.t + 1 / 30;
      // Real capture time × rate = app time.
      list.push(`file '${file}'`, `duration ${Math.max((next - f.t) * rate, 1 / 120).toFixed(4)}`);
    }
    list.push(`file '${join(dir, `${String(frames.length - 1).padStart(5, '0')}.jpg`)}'`);
    await writeFile(join(dir, 'list.txt'), list.join('\n'));
    // H.264 CFR for HyperFrames' media pipeline; even dimensions for yuv420p.
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0',
      '-i', join(dir, 'list.txt'), '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', outPath]);
    await rm(dir, { recursive: true, force: true });
  };
}

// ── Scene runner ─────────────────────────────────────────────────────────────
async function record(name, { hour, seed = {}, splash = false, run, rate: sceneRate = RATE }) {
  rate = sceneRate;
  // Own context per scene: localStorage must not leak between scenes.
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport(VIEWPORT);

  await page.evaluateOnNewDocument((start, seedData, showSplash, rate) => {
    // Running clock anchored to the fixed date, dilated by `rate`;
    // window.__advance(ms) jumps it.
    const NativeDate = Date;
    const realStart = NativeDate.now();
    let offset = 0;
    const now = () => start + (NativeDate.now() - realStart) * rate + offset;

    // Dilate everything else the app times itself with.
    const perfNow = performance.now.bind(performance);
    const perfStart = perfNow();
    const appPerf = () => perfStart + (perfNow() - perfStart) * rate;
    performance.now = appPerf;
    const nativeRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => nativeRaf(() => cb(appPerf()));
    const nativeTimeout = window.setTimeout.bind(window);
    const nativeInterval = window.setInterval.bind(window);
    window.setTimeout = (fn, ms = 0, ...a) => nativeTimeout(fn, ms / rate, ...a);
    window.setInterval = (fn, ms = 0, ...a) => nativeInterval(fn, ms / rate, ...a);
    function ClockDate(...a) {
      if (!new.target) return new NativeDate(now()).toString();
      return new NativeDate(...(a.length ? a : [now()]));
    }
    Object.setPrototypeOf(ClockDate, NativeDate);
    ClockDate.prototype = NativeDate.prototype;
    ClockDate.now = now;
    window.Date = ClockDate;
    window.__advance = ms => { offset += ms; };

    if (localStorage.getItem('__seeded')) return; // survive in-scene reloads
    localStorage.setItem('__seeded', '1');
    if (!showSplash) localStorage.setItem('splash_shown_at', String(now()));
    // The carry-over nudge ("N tasks still here from yesterday") is real, but it's
    // not what these scenes are about — mark today's as already dismissed.
    const d = new NativeDate(start);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem('day_nudge_dismissed_' + iso, '1');
    for (const [k, v] of Object.entries(seedData)) {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, at(hour), { today_soon: [], today_past: [], today_done: [], ...seed }, splash, rate);

  // CSS transitions/animations and WAAPI follow the page's animation playback rate.
  const anim = await page.createCDPSession();
  await anim.send('Animation.enable');
  await anim.send('Animation.setPlaybackRate', { playbackRate: rate });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await anim.send('Animation.setPlaybackRate', { playbackRate: rate });
  const stop = await startRecording(page);
  try {
    await run(page);
    await page.screenshot({ path: join(OUT, `${name}.png`) });
    await stop(join(OUT, `${name}.mp4`));
  } finally {
    await stop();
    await context.close();
  }
  if (errors.length) console.warn(`  ! ${name}: page errors\n    ${errors.slice(0, 3).join('\n    ')}`);
  console.log(`  ✓ ${name}`);
}

async function ready(page) {
  await page.waitForFunction(() => {
    const bar = document.getElementById('addTaskBar');
    return bar && getComputedStyle(bar).opacity === '1';
  }, { timeout: 20000 / rate });
  await page.evaluate(() => document.fonts?.ready);
}

const row   = (page, t) => page.$(`.task[data-taskid="${t.id}"]`);
async function check(page, t) {
  const el = await row(page, t);
  await (await el.$('.task-check')).click();
}

// ── Scenes ───────────────────────────────────────────────────────────────────
// Each maps to a beat in memory/design/Positioning.md (see today-promo/BRIEF.md).
const SCENES = {
  // First open of the day: splash, then the day's poem.
  poem: () => record('poem', {
    hour: 7, splash: true, rate: 1,
    run: async page => { await ready(page); await sleep(1500); },
  }),

  // Morning, empty list → typing the day in.
  'add-tasks': () => record('add-tasks', {
    hour: 8, rate: 1,
    run: async page => {
      await ready(page); await sleep(1200);
      for (const text of ['call mum back', 'work: finish the design proposal', 'reply to Sam about Saturday']) {
        await page.type('#newTask', text, { delay: 65 / rate });
        await sleep(250); await page.keyboard.press('Enter'); await sleep(700);
      }
      await sleep(1200);
    },
  }),

  // Checking things off — ember drift + completion.
  complete: () => record('complete', {
    hour: 11, seed: { today_manual: DAY_TASKS },
    run: async page => {
      await ready(page); await sleep(1000);
      for (const t of [DAY_TASKS[0], DAY_TASKS[2]]) { await check(page, t); await sleep(1400); }
      await sleep(800);
    },
  }),

  // Tap a task → 25-minute focus.
  focus: () => record('focus', {
    hour: 10, seed: { today_manual: DAY_TASKS },
    run: async page => {
      await ready(page); await sleep(1000);
      await (await (await row(page, DAY_TASKS[1])).$('.task-text')).click();
      await sleep(6000);
    },
  }),

  // The proof moment: evening review, letting go of a 34-day-old task.
  triage: () => record('triage', {
    hour: 21, seed: { today_manual: EVENING_TASKS },
    run: async page => {
      await ready(page);
      await page.waitForFunction(() => document.getElementById('triageBar')?.classList.contains('visible'));
      await sleep(1200);
      await page.click('#triageReviewBtn');
      await page.waitForFunction(() => !document.getElementById('triageOverlay')?.classList.contains('hidden'));
      await sleep(1800);
      const decide = async (t, sel) => {
        const target = `#triageList [data-task-id="${t.id}"]${sel}`;
        await page.waitForSelector(target, { visible: true, timeout: 5000 / rate });
        await page.click(target); await sleep(1300);
      };
      await decide(EVENING_TASKS[0], '[data-decision="kept"]');
      await decide(HAUNTING, '[data-today-click="triage.show-reason"]');
      await decide(HAUNTING, '[data-reason="lost_interest"]');
      await decide(EVENING_TASKS[2], '[data-decision="soon"]');
      await sleep(1500);
    },
  }),

  // Everything done — the empty state is the reward.
  'empty-evening': () => record('empty-evening', {
    hour: 19, seed: { today_manual: DAY_TASKS.slice(0, 2) },
    run: async page => {
      await ready(page); await sleep(900);
      for (const t of DAY_TASKS.slice(0, 2)) { await check(page, t); await sleep(1300); }
      await sleep(3500);
    },
  }),

  // Step away — small creatures wander in.
  idle: () => record('idle', {
    hour: 15, seed: { today_manual: DAY_TASKS.slice(0, 3) },
    run: async page => {
      await ready(page); await sleep(800);
      await page.evaluate(() => window.__advance(50_000));
      await page.waitForSelector('.idle-companion, #idleCompanion', { timeout: 8000 / rate }).catch(() => {});
      await sleep(7000);
    },
  }),
};

// ── Run ──────────────────────────────────────────────────────────────────────
await mkdir(OUT, { recursive: true });
console.log(`\nCapturing ${MOBILE ? 'mobile' : 'desktop'} footage → ${OUT}\n`);
let failed = 0;
for (const name of ONLY ? [ONLY] : Object.keys(SCENES)) {
  try { await SCENES[name](); }
  catch (e) { failed++; console.error(`  ✗ ${name}: ${e.message}`); }
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
