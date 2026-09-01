// TODAY — smoke test
// Answers one question before every push: does the app basically work?
// Boots the app in headless Chrome, waits out the splash, adds a task,
// checks it off, and fails on any uncaught page error.
//
// Run from repo root:  node scripts/smoke-test.mjs
// First-time setup:    cd scripts && npm install
//
// ~10s. Not a test suite — the human layer is memory/Test-matrix.md.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── 0. Version-consistency guard (cheap, runs before launching Chrome) ────────
// index.html derives APP_VERSION from the newest CHANGELOG key; sw.js CACHE_VERSION
// is the one value that can't be derived (separate SW context, no build step). Assert
// they match so a forgotten cache bump fails the pre-commit gate instead of shipping
// a stale offline cache. "Derive, don't duplicate — guard what you must hand-sync."
{
  const indexSrc = await readFile(join(ROOT, 'index.html'), 'utf8');
  const swSrc    = await readFile(join(ROOT, 'sw.js'), 'utf8');
  const appVer   = indexSrc.match(/['‘](\d+\.\d+\.\d+)['’]:/)?.[1]; // newest CHANGELOG key (handles both straight and curly apostrophes)
  const cacheVer = swSrc.match(/CACHE_VERSION\s*=\s*'today-v([\d.]+)'/)?.[1];
  if (!appVer)   { console.error('✗ FAIL — could not read newest CHANGELOG version from index.html'); process.exit(1); }
  if (!cacheVer) { console.error('✗ FAIL — could not read CACHE_VERSION from sw.js'); process.exit(1); }
  if (appVer !== cacheVer) {
    console.error(`✗ FAIL — version drift: index.html APP_VERSION=${appVer} but sw.js CACHE_VERSION=today-v${cacheVer}. Bump sw.js to match.`);
    process.exit(1);
  }
  console.log(`  ✓ version consistent (v${appVer})`);

  // CHANGELOG entry-count guard (Rule 31): the About panel renders slice(0, 1 +
  // HISTORY_SHOWN) with HISTORY_SHOWN=2, so anything past 3 entries is never shown
  // and is pure drift. This crept back twice in one session by hand — pin it here.
  const cgBlock = indexSrc.match(/const CHANGELOG = \{[\s\S]*?\n\};/)?.[0] || '';
  const cgCount = (cgBlock.match(/^\s*['‘]\d+\.\d+\.\d+['’]:/gm) || []).length;
  if (cgCount !== 3) {
    console.error(`✗ FAIL — index.html CHANGELOG has ${cgCount} entries, must be exactly 3 (Rule 31: 1 current + 2 history; About renders slice(0,3)). Trim the oldest — full history lives in memory/Changelog.md.`);
    process.exit(1);
  }
  console.log(`  ✓ CHANGELOG entry count (3)`);

  // Focus Companion time-reference guard (BUG-073): a broad period such as
  // "late night" is not enough for the model to produce a concrete question.
  // Keep both halves of the contract present: exact local time in context and
  // an instruction to use that value instead of vague wording.
  // Since focus mode was extracted to assets/focus.js (v2.65.13), search both files.
  const focusSrc = await readFile(join(ROOT, 'assets/focus.js'), 'utf8');
  const combinedSrc = indexSrc + focusSrc;
  const hasFocusLocalTime = /_localTime\s*=\s*_now\.toLocaleTimeString\(\[\],\s*\{\s*hour:\s*'numeric',\s*minute:\s*'2-digit'\s*\}\)/.test(combinedSrc)
    && combinedSrc.includes("_ctx.push('local time ' + _localTime + ' (' + _period + ')')");
  const hasFocusTimeInstruction = combinedSrc.includes('use the supplied exact local time — never a vague phrase like "this late."');
  if (!hasFocusLocalTime || !hasFocusTimeInstruction) {
    console.error('✗ FAIL — Focus Companion must send exact local time and forbid vague time references (BUG-073).');
    process.exit(1);
  }
  console.log('  ✓ Focus Companion exact-time context');

  const privacyCopy = 'Private by design: no account, no analytics. You own your data and choose every connection.';
  if (!indexSrc.includes(privacyCopy)) {
    console.error('✗ FAIL — Connections privacy reassurance copy is missing or changed.');
    process.exit(1);
  }
  const dropboxSrc = await readFile(join(ROOT, 'assets/dropbox.js'), 'utf8').catch(() => '');
  const backupBlock = (indexSrc + dropboxSrc).match(/async function dropboxBackup\(silent\)[\s\S]*?const data = \{[\s\S]*?\n\s+\};/)?.[0] || '';
  const connSrc = await readFile(join(ROOT, 'assets/connections.js'), 'utf8').catch(() => '');
  const privacyKeyOccurrences = (indexSrc + connSrc + dropboxSrc).match(/today_connections_privacy_seen/g)?.length ?? 0;
  if (!backupBlock || backupBlock.includes('today_connections_privacy_seen') || privacyKeyOccurrences !== 1) {
    console.error('✗ FAIL — Connections privacy seen flag must remain local-only, outside Dropbox backup and merge.');
    process.exit(1);
  }
  console.log('  ✓ Connections privacy flag is local-only');
}

// ── 0b. Poem Edge Function — real corpus shape + safe fallback (BUG-074) ─────
{
  const edgeSrc  = await readFile(join(ROOT, 'netlify/edge-functions/poem.js'), 'utf8');
  const corpus   = await readFile(join(ROOT, 'assets/poems.js'), 'utf8');
  const poemHtml = await readFile(join(ROOT, 'poem.html'), 'utf8');
  const poems    = new Function(`${corpus}\nreturn POEMS;`)();
  const edgeUrl  = 'data:text/javascript;base64,' + Buffer.from(edgeSrc).toString('base64');
  const edge     = (await import(edgeUrl)).default;
  const realFetch = globalThis.fetch;

  const malformed = poems.filter(poem => {
    const lines = poem.text.split('\n').filter(line => line.trim()).length;
    return !poem.text || !poem.author || !poem.source || lines < 2 || lines > 11 ||
      ![null, 'spring', 'summer', 'autumn', 'winter'].includes(poem.season);
  });
  const approvedVoices = [
    'Traditional !kun (recited by !nanni)',
    "Abu al-Ala al-Ma'arri (trans. Ameen Rihani)",
    'Abu-Yshac (trans. E. Powys Mathers)',
    'Raphael Patkanian (trans. Alice Stone Blackwell)',
    'Claude McKay',
    'Antonio Machado (trans. Thomas Walsh)',
    'Traditional Asante (recorded by R. S. Rattray)',
    'Olive Schreiner',
    'Ricardo Jaimes Freyre (trans. Alice Stone Blackwell)',
    'Kahlil Gibran',
  ];
  const sixLineVoices = [
    'Traditional Asante (recorded by R. S. Rattray)',
    'Olive Schreiner',
    'Ricardo Jaimes Freyre (trans. Alice Stone Blackwell)',
    'Kahlil Gibran',
  ];
  const hasAllApprovedVoices = approvedVoices.every(author =>
    poems.some(poem => poem.author === author));
  const newLineLimitDrift = poems.some(poem =>
    sixLineVoices.includes(poem.author) &&
    poem.text.split('\n').filter(line => line.trim()).length > 6);
  const hasSkippedVoice = poems.some(poem =>
    poem.author === 'José Rizal (trans. Charles Derbyshire)' ||
    poem.author.includes('Manuel José Othón') ||
    poem.source.includes("'A Shaded Spot'") ||
    (poem.source.includes("'Spring'") && poem.author === 'Sarojini Naidu') ||
    poem.source.includes("'Rejoice'") ||
    poem.source.includes("'Yesterday and Today'") ||
    poem.text.includes('The turi tree') ||
    poem.text.includes('Moon, you must shine'));
  if (poems.length !== 123 || malformed.length || !hasAllApprovedVoices || newLineLimitDrift || hasSkippedVoice) {
    console.error('✗ FAIL — reviewed poem corpus count, schema, or line limit drifted.');
    process.exit(1);
  }
  console.log('  ✓ 123-poem reviewed corpus shape and approved geography');

  try {
    globalThis.fetch = async request => {
      if (new URL(request).pathname !== '/assets/poems.js') return new Response('not found', { status: 404 });
      return new Response(corpus, { status: 200, headers: { 'content-type': 'text/javascript' } });
    };
    const response = await edge(
      new Request('https://today.test/poem.html?date=2026-08-12'),
      { next: async () => new Response(poemHtml, { status: 200, headers: { 'content-type': 'text/html', 'content-length': String(Buffer.byteLength(poemHtml)) } }) }
    );
    const html = await response.text();
    const title = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] || '';
    const description = html.match(/<meta property="og:description" content="([^"]*)"/)?.[1] || '';
    if (!response.ok || !title || title === 'Daily poem · TODAY' || !description || response.headers.has('content-length')) {
      console.error('✗ FAIL — poem edge function did not inject valid OG metadata from the real commented corpus.');
      process.exit(1);
    }

    globalThis.fetch = async () => new Response('// corpus unavailable', { status: 200 });
    const fallbackHtml = '<!doctype html><title>Static poem fallback</title>';
    const fallback = await edge(
      new Request('https://today.test/poem.html?date=2026-08-12'),
      { next: async () => new Response(fallbackHtml, { status: 200, headers: { 'content-type': 'text/html' } }) }
    );
    if (!fallback.ok || await fallback.text() !== fallbackHtml) {
      console.error('✗ FAIL — poem edge function did not fall back to the static page for an invalid corpus.');
      process.exit(1);
    }
    console.log('  ✓ poem edge metadata injection and static fallback');
  } finally {
    globalThis.fetch = realFetch;
  }
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('✗ puppeteer-core not installed — run: cd scripts && npm install');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css',
};

// Tiny static server — no Netlify functions, the app degrades gracefully without them
const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise(r => server.listen(0, r));
const URL_BASE = `http://localhost:${server.address().port}`;

const fail = (msg) => { console.error('✗ FAIL — ' + msg); process.exit(1); };
const ok = (msg) => console.log('  ✓ ' + msg);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // Any uncaught exception in app code is an automatic fail.
  // "Fail on any pageerror" is naive in a React/Next app (recoverable hydration warnings,
  // 3rd-party net noise) — but it's correct HERE: single-file app, no hydration, no
  // external scripts, and we listen to `pageerror` (uncaught exceptions) not `console`,
  // so favicon/404/missing-Netlify-function noise can't trip it. The real white-screen
  // net is the `waitForFunction` add-bar wait below — a fatal init error leaves the page
  // blank and trips that timeout, which is more reliable than error-string matching.
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  // ── 1. App boots ────────────────────────────────────────────────────────
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  ok('page loaded');

  // ── 2. Splash dismisses — add bar fades in at end of init ──────────────
  await page.waitForFunction(
    () => {
      const bar = document.getElementById('addTaskBar');
      return bar && getComputedStyle(bar).opacity === '1' && getComputedStyle(bar).display !== 'none';
    },
    { timeout: 15000 }
  ).catch(() => fail('splash never dismissed / add bar never became visible'));
  ok('splash dismissed, add bar visible');

  // ── 3. Connections privacy reassurance — one local visit only ───────────
  const privacyResult = await page.evaluate(async () => {
    const privacyCopy = 'Private by design: no account, no analytics. You own your data and choose every connection.';
    const credentialKeys = [
      'trello_token', 'trello_config', 'dropbox_token', 'dropbox_refresh_token',
      'dropbox_token_expired', 'today_ai_key_gemini', 'today_ai_key_claude'
    ];
    const reset = () => {
      credentialKeys.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('today_connections_privacy_seen');
      document.getElementById('configPanel').classList.remove('open');
      _endConnectionsPrivacyVisit();
    };
    const isVisible = () => getComputedStyle(document.getElementById('connectionsPrivacyNote')).display !== 'none';
    const open = async () => {
      toggleConfig();
      await new Promise(resolve => setTimeout(resolve, 10));
    };
    const close = () => {
      if (document.getElementById('configPanel').classList.contains('open')) toggleConfig();
    };

    reset();
    await open();
    const firstOpen = isVisible();
    const copyMatches = document.getElementById('connectionsPrivacyNote').textContent.trim() === privacyCopy;
    const seenWritten = localStorage.getItem('today_connections_privacy_seen') === '1';
    const panelRect = document.getElementById('configPanel').getBoundingClientRect();
    const noteRect = document.getElementById('connectionsPrivacyNote').getBoundingClientRect();
    const bannerEl = document.getElementById('offlineBanner');
    bannerEl.classList.add('visible');
    const bannerRect = bannerEl.getBoundingClientRect();
    const desktopFits = noteRect.left >= panelRect.left && noteRect.right <= panelRect.right && noteRect.bottom <= bannerRect.top;
    bannerEl.classList.remove('visible');
    close();
    const hiddenAfterClose = !isVisible();
    await open();
    const hiddenOnReopen = !isVisible();
    close();

    reset();
    await open();
    toggleInfo();
    const hiddenAfterOtherPanel = !isVisible() && !document.getElementById('configPanel').classList.contains('open');
    if (document.getElementById('infoPanel').classList.contains('open')) toggleInfo();

    const cases = [
      ['trello token', 'trello_token', 'token'],
      ['trello config credential', 'trello_config', JSON.stringify({ apiToken: 'token' })],
      ['dropbox token', 'dropbox_token', 'token'],
      ['dropbox refresh token', 'dropbox_refresh_token', 'token'],
      ['dropbox expired state', 'dropbox_token_expired', '1'],
      ['Gemini key', 'today_ai_key_gemini', 'key'],
      ['Claude key', 'today_ai_key_claude', 'key'],
    ];
    const suppressionFailures = [];
    for (const [label, key, value] of cases) {
      reset();
      localStorage.setItem(key, value);
      await open();
      if (isVisible() || localStorage.getItem('today_connections_privacy_seen') !== '1') suppressionFailures.push(label);
      close();
    }

    reset();
    localStorage.setItem('today_user_names', JSON.stringify(['Can']));
    localStorage.setItem('today_pwa_installed', '1');
    await open();
    const localStateDoesNotSuppress = isVisible();
    localStorage.setItem('today_ai_key_gemini', 'key');
    _aiRenderConfig();
    const hiddenAfterAIConnect = !isVisible();
    close();

    reset();
    localStorage.removeItem('today_user_names');
    localStorage.removeItem('today_pwa_installed');
    return {
      firstOpen, copyMatches, seenWritten, desktopFits, hiddenAfterClose, hiddenOnReopen, hiddenAfterOtherPanel,
      suppressionFailures, localStateDoesNotSuppress, hiddenAfterAIConnect
    };
  });
  const privacyFailures = Object.entries(privacyResult)
    .filter(([key, value]) => key === 'suppressionFailures' ? value.length : !value)
    .map(([key, value]) => key === 'suppressionFailures' ? `${key}: ${value.join(', ')}` : key);
  if (privacyFailures.length) fail('Connections privacy gate failed: ' + privacyFailures.join('; '));
  ok('Connections privacy reassurance is one-time and credential-gated');

  await page.setViewport({ width: 375, height: 812 });
  const privacyMobile = await page.evaluate(async () => {
    localStorage.removeItem('today_connections_privacy_seen');
    document.getElementById('configPanel').classList.remove('open');
    _endConnectionsPrivacyVisit();
    toggleConfig();
    await new Promise(resolve => setTimeout(resolve, 10));
    const panel = document.getElementById('configPanel').getBoundingClientRect();
    const note = document.getElementById('connectionsPrivacyNote').getBoundingClientRect();
    const bannerEl = document.getElementById('offlineBanner');
    bannerEl.classList.add('visible');
    const banner = bannerEl.getBoundingClientRect();
    const fits = note.left >= panel.left && note.right <= panel.right && note.bottom <= banner.top;
    bannerEl.classList.remove('visible');
    toggleConfig();
    return fits;
  });
  if (!privacyMobile) fail('Connections privacy reassurance does not fit the narrow layout with offline banner');
  ok('Connections privacy reassurance fits narrow layout');

  // Mobile Safari can give the canvas a different CSS size (`100dvh`) from its
  // backing buffer (`innerHeight`). A client-space checkbox point must be mapped
  // through the live canvas rect before particles are spawned.
  const celebrationPoint = await page.evaluate(() => {
    const canvas = document.getElementById('celebCanvas');
    const previousStyle = canvas.getAttribute('style');
    const previousWidth = canvas.width;
    const previousHeight = canvas.height;
    canvas.style.width = '300px';
    canvas.style.height = '400px';
    canvas.style.left = '10px';
    canvas.style.top = '20px';
    canvas.width = 600;
    canvas.height = 800;
    const rect = canvas.getBoundingClientRect();
    const mapped = fireEmberDrift(
      rect.left + rect.width * 0.25,
      rect.top + rect.height * 0.75
    );
    if (previousStyle === null) canvas.removeAttribute('style');
    else canvas.setAttribute('style', previousStyle);
    canvas.width = previousWidth;
    canvas.height = previousHeight;
    return mapped;
  });
  if (Math.abs(celebrationPoint.x - 150) > 0.5 || Math.abs(celebrationPoint.y - 600) > 0.5) {
    fail('mobile celebration point was not converted into canvas coordinates');
  }
  ok('mobile celebration coordinates map into the canvas backing buffer');
  await page.setViewport({ width: 1200, height: 800 });

  // ── 4. Add a task ───────────────────────────────────────────────────────
  await page.click('#newTask');
  await page.type('#newTask', 'work: smoke test task');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => [...document.querySelectorAll('#manualList .task')]
      .some(t => t.textContent.includes('smoke test task')),
    { timeout: 5000 }
  ).catch(() => fail('task did not appear in the list after Enter'));
  ok('task added');

  // BUG-075: the row can land beneath an already-stationary pointer. Simulate
  // that mouseenter while the arrival shimmer is pending/playing and prove the
  // shorter hover shimmer cannot replace it or change its paint midway.
  const tagArrival = await page.evaluate(async () => {
    const row = [...document.querySelectorAll('#manualList .task')]
      .find(task => task.textContent.includes('smoke test task'));
    const tag = row?.querySelector('.task-tag');
    if (!row || !tag) return { missing: true };
    row.dispatchEvent(new MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 150));
    const style = getComputedStyle(tag);
    const accentProbe = document.createElement('span');
    accentProbe.style.color = 'var(--accent)';
    document.body.appendChild(accentProbe);
    const accentChannels = (getComputedStyle(accentProbe).color.match(/[\d.]+/g) || [])
      .slice(0, 3).join(', ');
    accentProbe.remove();
    return {
      missing: false,
      state: tag.dataset.tagShimmer,
      arrival: tag.classList.contains('task-tag-shimmer'),
      interaction: tag.classList.contains('_soon-shimmer'),
      gradient: style.backgroundImage,
      accentChannels,
    };
  });
  if (tagArrival.missing || tagArrival.state !== 'arrival' || !tagArrival.arrival || tagArrival.interaction) {
    fail('tag hover replaced or interrupted the new-task arrival shimmer');
  }
  if (!tagArrival.accentChannels || !tagArrival.gradient.includes(tagArrival.accentChannels)) {
    fail('tag arrival shimmer lost the accent colour');
  }
  await page.waitForFunction(() => {
    const tag = [...document.querySelectorAll('#manualList .task')]
      .find(task => task.textContent.includes('smoke test task'))?.querySelector('.task-tag');
    return tag && !tag.dataset.tagShimmer;
  }, { timeout: 2000 }).catch(() => fail('tag arrival shimmer did not clean up'));
  const tagHover = await page.evaluate(() => {
    const row = [...document.querySelectorAll('#manualList .task')]
      .find(task => task.textContent.includes('smoke test task'));
    const tag = row.querySelector('.task-tag');
    row.dispatchEvent(new MouseEvent('mouseenter'));
    return {
      state: tag.dataset.tagShimmer,
      arrival: tag.classList.contains('task-tag-shimmer'),
      interaction: tag.classList.contains('_soon-shimmer'),
      gradient: getComputedStyle(tag).backgroundImage
    };
  });
  if (tagHover.state !== 'interaction' || tagHover.arrival || !tagHover.interaction || tagHover.gradient !== tagArrival.gradient) {
    fail('tag hover shimmer does not reuse the stable arrival colour treatment');
  }
  ok('tag arrival and hover shimmers stay exclusive and colour-consistent');

  // About's contextual actions intentionally reuse the Focus → Copy visual
  // component. Compare computed component properties so one surface cannot
  // silently drift back to a flat text link (v2.64.10).
  const ctaParity = await page.evaluate(() => {
    const ref = document.querySelector('#manualList .task-copy');
    const targets = [document.getElementById('weekMoreBtn'), document.getElementById('poemShareBtn')];
    if (!ref || targets.some(el => !el)) return { missing: true };
    const props = [
      'backgroundColor', 'borderTopWidth', 'borderTopStyle', 'borderRadius',
      'fontFamily', 'fontSize', 'letterSpacing', 'paddingTop', 'paddingRight',
      'paddingBottom', 'paddingLeft', 'lineHeight', 'whiteSpace'
    ];
    const refStyle = getComputedStyle(ref);
    const mismatches = [];
    for (const target of targets) {
      const style = getComputedStyle(target);
      for (const prop of props) {
        if (style[prop] !== refStyle[prop]) mismatches.push(`${target.id}.${prop}: ${style[prop]} != ${refStyle[prop]}`);
      }
    }
    document.getElementById('weekSection').classList.add('touched');
    document.getElementById('poemBlock').classList.add('revealed');
    const revealedBorders = targets.map(el => getComputedStyle(el).borderTopColor);
    document.getElementById('weekSection').classList.remove('touched');
    document.getElementById('poemBlock').classList.remove('revealed');
    return {
      missing: false,
      mismatches,
      revealBorderMismatch: revealedBorders[0] === 'rgba(0, 0, 0, 0)' || revealedBorders[0] !== revealedBorders[1]
    };
  });
  if (ctaParity.missing || ctaParity.mismatches.length || ctaParity.revealBorderMismatch) {
    fail('About CTAs drifted from Focus Copy styling' + (ctaParity.mismatches?.length ? ':\n  ' + ctaParity.mismatches.join('\n  ') : ''));
  }
  ok('About CTAs match Focus Copy styling');

  // ── 5. Check it off ──────────────────────────────────────────────────────
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('#manualList .task')]
      .find(t => t.textContent.includes('smoke test task'));
    row.querySelector('.task-check').click();
  });
  await page.waitForFunction(
    () => [...document.querySelectorAll('#manualList .task')]
      .some(t => t.textContent.includes('smoke test task') && t.classList.contains('done')),
    { timeout: 5000 }
  ).catch(() => fail('task did not reach done state after checking'));
  ok('task checked off');

  // ── 6. Extraction wiring — showStatus, _applyTimeTexture, changelog renderer ─
  const statusOk = await page.evaluate(() => {
    showStatus('_smoke_', 'success');
    const el = document.getElementById('statusMsg');
    const ok = el && el.textContent === '_smoke_' && el.className.includes('success');
    if (el) { el.textContent = ''; el.className = 'status-msg'; }
    return ok;
  });
  if (!statusOk) fail('showStatus (util.js) did not update #statusMsg text and class');
  ok('showStatus wiring (util.js)');

  const textureOk = await page.evaluate(() => {
    if (typeof window._applyTimeTexture !== 'function') return false;
    window._applyTimeTexture();
    return !!getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  });
  if (!textureOk) fail('_applyTimeTexture (day-lifecycle.js) missing or did not set --accent');
  ok('_applyTimeTexture wiring (day-lifecycle.js)');

  const changelogOk = await page.evaluate(() => {
    const badge = document.querySelector('#changelogPanel .version-badge');
    return badge && badge.textContent.trim() === 'CURRENT';
  });
  if (!changelogOk) fail('changelog renderer (about.js) did not render CURRENT badge in #changelogPanel');
  ok('changelog renderer wiring (about.js)');

  // ── 7. Desktop shortcut Shift+; focuses the add bar ─────────────────────
  // Verifies the shortcut handler survived extraction from inline script to
  // accessibility.js. Only meaningful on hover:hover (non-touch) viewports.
  const isHover = await page.evaluate(() => window.matchMedia('(hover: hover)').matches);
  if (isHover) {
    const focused = await page.evaluate(() => {
      document.activeElement?.blur();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ':', shiftKey: true, bubbles: true, cancelable: true }));
      return document.activeElement?.id;
    });
    if (focused !== 'newTask') fail(`Shift+; did not focus #newTask (active: ${focused})`);
    ok('Shift+; focuses add bar (desktop shortcut)');
  }

  // ── 7. No uncaught errors anywhere along the way ─────────────────────────
  if (pageErrors.length) fail('uncaught page error(s):\n  ' + pageErrors.join('\n  '));
  ok('no uncaught page errors');

  console.log('✓ SMOKE TEST PASSED');
} finally {
  await browser.close();
  server.close();
}
