import { readFileSync as _rfs095 } from 'node:fs';
// TODAY — smoke test
// Answers one question before every push: does the app basically work?
// Boots the app in headless Chrome, waits out the splash, adds a task,
// checks it off, and fails on any uncaught page error.
//
// Run from repo root:  node scripts/smoke-test.mjs
// First-time setup:    cd scripts && npm install
//
// Broader release coverage and real-device checks: memory/Test-matrix.md.

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

  // BUG-095: every input the user types content into must opt out of browser
  // autofill, or task titles, habit names and AI questions get copied into a store
  // the app cannot clear. This regresses the moment anyone adds a new input.
  {
    const _idx = _rfs095(new URL('../index.html', import.meta.url), 'utf8');
    const _skip = /type="(checkbox|radio|hidden|file|range|number|submit|button)"/;
    const _leaking = [..._idx.matchAll(/<(input|textarea)\b[^>]*>/gs)]
      .map(m => m[0]).filter(t => !_skip.test(t) && !/\bautocomplete=/.test(t))
      .map(t => (t.match(/id="([^"]+)"/) || [, '(no id)'])[1]);
    if (_leaking.length) fail('inputs without autocomplete= (BUG-095): ' + _leaking.join(', '));
    console.log('  ✓ every content input opts out of browser autofill (BUG-095)');
  }

  // Focus Ask no longer receives clock/history context (v2.97.10). The former
  // BUG-073 exact-time assertion is obsolete; focus-test checks the actual
  // name-only request boundary and delivery lifecycle through the browser.

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
    'Traditional Asante (recorded by R. S. Rattray)',
    'Olive Schreiner',
    'Ricardo Jaimes Freyre (trans. Alice Stone Blackwell)',
    'Kahlil Gibran',
    'D. H. Lawrence',
    'John Gould Fletcher',
    'Anton Chekhov (trans. Constance Garnett)',
    'John Shaw Neilson',
    'Joseph S. Cotter, Jr.',
    'Bhartrihari (trans. B. Hale Wortham)',
    'Rabindranath Tagore',
    'Richard Watson Gilder',
    'Friedrich Nietzsche (trans. Thomas Common)',
    'Henry David Thoreau',
    'Friedrich Nietzsche (trans. Alexander Tille)',
    'Thiruvalluvar (trans. V. V. S. Aiyar)',
    'John Muir',
    'Edward Thomas',
    'Ōshikōchi no Mitsune',
    'Anonymous (Japanese, trans. Lafcadio Hearn)',
    'John Burroughs',
    'Chinese proverb (trans. William Scarborough)',
    'Ralph Waldo Emerson',
  ];
  const sixLineVoices = [
    'Traditional Asante (recorded by R. S. Rattray)',
    'Olive Schreiner',
    'Ricardo Jaimes Freyre (trans. Alice Stone Blackwell)',
    'Kahlil Gibran',
    'D. H. Lawrence',
    'John Gould Fletcher',
    'Anton Chekhov (trans. Constance Garnett)',
    'John Shaw Neilson',
    'Bhartrihari (trans. B. Hale Wortham)',
    'Rabindranath Tagore',
    'Richard Watson Gilder',
    'Friedrich Nietzsche (trans. Thomas Common)',
    'Henry David Thoreau',
    'Friedrich Nietzsche (trans. Alexander Tille)',
    'Thiruvalluvar (trans. V. V. S. Aiyar)',
    'John Muir',
    'Edward Thomas',
    'Ōshikōchi no Mitsune',
    'Anonymous (Japanese, trans. Lafcadio Hearn)',
    'John Burroughs',
    'Chinese proverb (trans. William Scarborough)',
    'Ralph Waldo Emerson',
  ];
  const hasAllApprovedVoices = approvedVoices.every(author =>
    poems.some(poem => poem.author === author));
  const hasForeverNows = poems.some(poem =>
    poem.author === 'Emily Dickinson' &&
    poem.text === 'Forever is composed of Nows —\n’Tis not a different time,\nExcept for infiniteness\nAnd latitude of home.');
  const hasBecauseRose = poems.some(poem =>
    poem.author === 'Richard Watson Gilder' &&
    poem.text === 'Ah, yes, because the rose\nFades like the sunset skies;\nBecause rude winter blows\nAll bare, and music dies—\nTherefore, now is to me\nEternity!');
  const hasNietzscheStory = poems.some(poem =>
    poem.author === 'Friedrich Nietzsche (trans. Thomas Common)' &&
    poem.text === 'Meanwhile do I talk to myself as one who hath time.\nNo one telleth me anything new,\nso I tell myself mine own story.');
  const hasThoreauLifePoem = poems.some(poem =>
    poem.author === 'Henry David Thoreau' &&
    poem.text === 'My life has been the poem I would have writ,\nBut I could not both live and utter it.');
  const hasNietzscheLove = poems.some(poem =>
    poem.author === 'Friedrich Nietzsche (trans. Alexander Tille)' &&
    poem.text === 'It is true: we love life,\nnot because we are accustomed to life,\nbut because we are accustomed to love.');
  const hasNietzscheStar = poems.some(poem =>
    poem.author === 'Friedrich Nietzsche (trans. Alexander Tille)' &&
    poem.text === 'Thou great star! What would be thy happiness,\nwere it not for those for whom thou shinest.');
  const hasAiyarSneeze = poems.some(poem =>
    poem.author === 'Thiruvalluvar (trans. V. V. S. Aiyar)' &&
    poem.text === 'I was in the sulks: he then sneezed,\nfor he thought that I would bless him saying,\nLong live my beloved!');
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
    poem.text.includes('Moon, you must shine') ||
    poem.text.includes("The russet suit of camel's hair") ||
    poem.text.includes('sparkling with irised crystals,—flowers of light') ||
    poem.text.includes('Does the ||garraken flower open?') ||
    poem.text.includes('I have made a footprint') ||
    poem.source.includes("'Heat'") && poem.author === 'Archibald Lampman' ||
    poem.source.includes("'Nocturne'") && poem.author.includes('Edward Powys Mathers') ||
    poem.text.includes('The Milky Way lies there') ||
    poem.source.includes("'Autumn'") && poem.author === 'T. E. Hulme' ||
    poem.source.includes("'Snow in the Suburbs'") ||
    poem.source.includes("'June Sunset'") ||
    poem.source.includes("'August'") && poem.author === 'H. Cordelia Ray' ||
    poem.source.includes("'The Indian Corn Planter'") ||
    poem.source.includes("'It Was All for Him'") ||
    poem.text.includes('A stem of grass, whereon in vain') ||
    poem.text.includes('what boots it to repeat') ||
    poem.text.includes("cleave the torrent's thread with steel") ||
    poem.text.includes('The Lady Moon is my lover') ||
    poem.text.includes('Come, Leila, fill the goblet up') ||
    poem.text.includes('The lordly vulture gnaws the corse') ||
    poem.text.includes('This can mine inn give') ||
    poem.text.includes('Dick the shepherd blows his nail') ||
    poem.text.includes('skies of couple-colour as a brinded cow') ||
    poem.text.includes('wins victory for bride') ||
    poem.text.includes('The loveless soul, the very joys of life may know') ||
    poem.text.includes('One day we silent sulked') ||
    // Round 46 final cuts (2026-10-10)
    poem.text.includes('their summer work done') ||
    poem.text.includes('I gathered all my sorrows and buried them') ||
    poem.text.includes('with the sound of rice') ||
    poem.text.includes("In th' autumn sky, Mount Fuji stands") ||
    poem.text.includes('After a still winter night I awoke') ||
    // Round 47 final cuts (2026-10-11)
    poem.text.includes('apparently with no work to do beyond looking beautiful') ||
    poem.text.includes('In silver on the jewel-weeds') ||
    poem.text.includes("The gentians don't mind the first frost") ||
    poem.text.includes('neither does one falling leaf make an autumn') ||
    poem.text.includes('Bid me and I shall gather my fruits') ||
    poem.text.includes("The old man's autumn, who with joy") ||
    poem.text.includes('oh fields that rest after harvest') ||
    poem.text.includes('No tree ever bore fruit') ||
    // Round 48 final cuts (2026-10-14)
    poem.text.includes('there is a strange tremor in the soul') ||
    poem.text.includes('The speculating rooks at their nests cawed') ||
    poem.text.includes('on the first day of sledge-driving') ||
    poem.text.includes('has the winter-plum') ||
    // Round 49 final cuts (2026-10-14)
    poem.text.includes('I set every tree in my June time') ||
    poem.text.includes('I bring no prayers on coloured silk') ||
    poem.text.includes('The villagers are beating cloth') ||
    poem.text.includes('that noiseless noise which lives in the summer air') ||
    poem.text.includes('the prospect looks no different from yesterday') ||
    // Round 50 final cuts (2026-10-14, Miyamori 1932 haiku)
    poem.text.includes('The snow upon my hat') ||
    poem.text.includes('That day, too, is a joy') ||
    poem.text.includes("there's nothing,\\nWhich means") ||
    poem.text.includes('I looked out over the first snow') ||
    poem.text.includes('There is no leaf to be scattered') ||
    poem.text.includes("There's no flower after chrysanthemums") ||
    poem.text.includes('Who is shouting in the snow') ||
    // Round 51 final cuts (2026-10-14)
    poem.text.includes('my thoughts do not ripen well till after there has been a frost') ||
    poem.text.includes('yellow afternoons of October, who ever could clutch it') ||
    poem.text.includes('the pine and the cypress are the last to lose their leaves') ||
    poem.text.includes('I am glad to the brink of fear') ||
    poem.text.includes('the cold warms me') ||
    poem.text.includes('sweep away the snow from before his own door') ||
    poem.text.includes("winter's dreams related at the breakfast table") ||
    poem.text.includes('not ceasing day or night') ||
    poem.text.includes('Time is but the stream I go a-fishing in') ||
    poem.text.includes('Heaven is under our feet as well as over our heads') ||
    poem.text.includes('constant readjustment to our surroundings') ||
    poem.text.includes('yesterday parts from to-morrow') ||
    poem.text.includes('shining in spotless perfection') ||
    // Round 52 final cuts (2026-10-14)
    poem.text.includes('The day, immeasurably long, sleeps over the broad hills') ||
    poem.text.includes('When Autumn comes the hills are covered with beauty') ||
    poem.text.includes('we see the sun wading in snow') ||
    poem.text.includes('canopied with the mellow hum of insects') ||
    poem.text.includes('The tempered light of the woods is like a perpetual morning') ||
    poem.text.includes('Cannot we let the morning be?') ||
    poem.text.includes('the young man’s year is a heap of beginnings') ||
    poem.text.includes('The farmer times himself to Nature') ||
    poem.text.includes('When one breaks camp in the morning') ||
    poem.text.includes('a new window in the Eastern wall of your house') ||
    poem.text.includes('In calmness heaven and earth seem greater') ||
    poem.text.includes('To one full of expectation a moment seems a year') ||
    // Round 53 final cuts (2026-10-14)
    poem.text.includes('under snow, bread') ||
    poem.text.includes('A snow year,\na rich year') ||
    poem.text.includes('Nature is a mutable cloud') ||
    poem.text.includes('a progress,\nand not a station') ||
    poem.text.includes('more kindness\nthan is ever spoken') ||
    poem.text.includes('our safety is in our speed') ||
    poem.text.includes('make the night night') ||
    poem.text.includes('No one shows a child the sky') ||
    poem.text.includes('knock the dew off the grass') ||
    poem.text.includes('Haste is a good thing') ||
    poem.text.includes('Men in the game are blind') ||
    poem.text.includes('A lofty lamp-post lights what is distant') ||
    poem.text.includes('Few desires') ||
    poem.text.includes('better to knit than to blossom') ||
    poem.text.includes('Let your trouble tarry') ||
    poem.text.includes('Our worst misfortunes are those') ||
    poem.text.includes('Waiting is the hoofs of time') ||
    poem.text.includes('a wall between two gardens') ||
    poem.text.includes('imprisoned in expression') ||
    // Round 54 final cuts (2026-10-15)
    poem.text.includes('the root is one') ||
    poem.text.includes('Where are the songs of Spring') ||
    poem.text.includes('tumultuous privacy of storm') ||
    poem.text.includes('Descends the snow') ||
    poem.text.includes('To see the cherry hung with snow') ||
    poem.text.includes('balloon of the mind') ||
    poem.text.includes('Where the mountain hare has lain') ||
    poem.text.includes('my shining palace built upon the sand') ||
    poem.text.includes('A sense of obligation') ||
    poem.text.includes('pursuing the horizon') ||
    poem.text.includes('Flower in the crannied wall') ||
    poem.text.includes('thy free flight into the wordless') ||
    // Round 55 final cuts (2026-10-15)
    poem.text.includes('Their phonograph, the mocking-bird') ||
    poem.text.includes('Then blossom-bald') ||
    poem.text.includes('Perched upon the muzzle of a cannon') ||
    poem.text.includes('Forbidden fruit a flavor has') ||
    poem.text.includes('Not knowing when the dawn will come') ||
    poem.text.includes('He drew a circle that shut me out') ||
    poem.text.includes('So good luck came, and on my roof did light') ||
    poem.text.includes('Even the iris bends') ||
    poem.text.includes('In the upper air the fireflies move more slowly') ||
    poem.text.includes('Forever swallowing the wind') ||
    poem.text.includes('Forgets Utility') ||
    poem.text.includes('A crust of bread and a corner to sleep in') ||
    poem.text.includes('One dream the bird and blossom dreamed'));
  const hasSeason = (sourcePart, season) => poems.some(poem =>
    poem.source.includes(sourcePart) && poem.season === season);
  const seasonTagDrift =
    !hasSeason("'Nothing Gold Can Stay'", 'spring') ||
    !hasSeason('Chamberlain 1902, no. 34', 'summer') ||
    !hasSeason("'Give Me the Splendid Silent Sun'", 'autumn');
  const seasonCounts = poems.reduce((counts, poem) => {
    const key = poem.season || 'year-round';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const seasonCountDrift = seasonCounts.winter !== 18 || seasonCounts.spring !== 18 ||
    seasonCounts.summer !== 15 || seasonCounts.autumn !== 18 || seasonCounts['year-round'] !== 90;
  if (poems.length !== 159 || malformed.length || !hasAllApprovedVoices || !hasForeverNows || !hasBecauseRose || !hasNietzscheStory || !hasThoreauLifePoem || !hasNietzscheLove || !hasNietzscheStar || !hasAiyarSneeze || newLineLimitDrift || hasSkippedVoice || seasonTagDrift || seasonCountDrift) {
    console.error('✗ FAIL — reviewed poem corpus count, schema, line limit, or season tags drifted.');
    process.exit(1);
  }
  console.log('  ✓ 159-poem reviewed corpus shape, approved selections, and audited seasons');

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

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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

// CI's headless Linux Chrome reports no pointing device at all — (hover: hover) false,
// (pointer: fine) false, (pointer: coarse) false — so @media (hover: hover) never matches
// there and the copy button and hover shimmer never render. Media emulation cannot
// change hover/pointer (Puppeteer rejects the names; CDP ignores them), but Blink's
// launch-time input settings can. Declare the desktop these assertions assume:
// hover=2 (hover), pointer=4 (fine). Verified both directions on macOS 2026-09-06.
const DESKTOP_INPUT = '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  // Avoid the flaky discovery of Chrome's WebSocket endpoint from process output.
  pipe: true,
  args: ['--no-first-run', '--disable-extensions', DESKTOP_INPUT],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  // Any uncaught exception in app code is an automatic fail.
  // "Fail on any pageerror" is naive in a React/Next app (recoverable hydration warnings,
  // 3rd-party net noise) — but it's correct HERE: classic-script modules, no hydration, no
  // external scripts, and we listen to `pageerror` (uncaught exceptions) not `console`,
  // so favicon/404/missing-Netlify-function noise can't trip it. The real white-screen
  // net is the `waitForFunction` add-bar wait below — a fatal init error leaves the page
  // blank and trips that timeout, which is more reliable than error-string matching.
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  // Splash timing has its own dedicated suite; keep this broad smoke focused
  // on application startup and interactions rather than today's poem cadence.
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('splash_shown_at', String(Date.now()));
  });

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
      Today.use('connections')._endConnectionsPrivacyVisit();
    };
    const isVisible = () => getComputedStyle(document.getElementById('connectionsPrivacyNote')).display !== 'none';
    const open = async () => {
      Today.use('connections').toggleConfig();
      await new Promise(resolve => setTimeout(resolve, 10));
    };
    const close = () => {
      if (document.getElementById('configPanel').classList.contains('open')) Today.use('connections').toggleConfig();
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
    Today.use('about').toggleInfo();
    const hiddenAfterOtherPanel = !isVisible() && !document.getElementById('configPanel').classList.contains('open');
    if (document.getElementById('infoPanel').classList.contains('open')) Today.use('about').toggleInfo();

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
    Today.use('connections')._aiRenderConfig();
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
    Today.use('connections')._endConnectionsPrivacyVisit();
    Today.use('connections').toggleConfig();
    await new Promise(resolve => setTimeout(resolve, 10));
    const panel = document.getElementById('configPanel').getBoundingClientRect();
    const note = document.getElementById('connectionsPrivacyNote').getBoundingClientRect();
    const bannerEl = document.getElementById('offlineBanner');
    bannerEl.classList.add('visible');
    const banner = bannerEl.getBoundingClientRect();
    const fits = note.left >= panel.left && note.right <= panel.right && note.bottom <= banner.top;
    bannerEl.classList.remove('visible');
    Today.use('connections').toggleConfig();
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
    const tag = row?.querySelector('.task-tag');
    if (!tag) return { missing: true };
    // Call the API directly — mouseenter wiring is gated on (hover:hover) at
    // add-time, which is unreliable in headless Linux even with DESKTOP_INPUT.
    // BUG-075 exclusion (hover cannot interrupt arrival) is already proved by
    // the arrival block above; this confirms the shimmer fires post-arrival.
    Today.use('connections')._playTagInteractionShimmer(tag);
    return {
      missing: false,
      state: tag.dataset.tagShimmer,
      arrival: tag.classList.contains('task-tag-shimmer'),
      interaction: tag.classList.contains('_soon-shimmer'),
    };
  });
  if (tagHover.missing || tagHover.state !== 'interaction' || tagHover.arrival || !tagHover.interaction) {
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
