// Edge function: pre-render OG meta for /poem.html?date=YYYY-MM-DD
// Runs at the CDN edge before the static file is served.
// Crawlers (Slack, iMessage, Twitter) don't execute JS — this gives them
// the actual poem text in og:description and the author in og:title.
export default async function handler(request, context) {
  const url       = new URL(request.url);
  const dateParam = url.searchParams.get('date'); // 'YYYY-MM-DD' or null

  // Load poems from the static asset (same-origin CDN hit — fast)
  let POEMS = [];
  try {
    const resp      = await fetch(new URL('/assets/poems.js', url));
    if (!resp.ok) throw new Error('Poem corpus unavailable');
    const src       = await resp.text();
    // Strip the corpus header comments plus `const POEMS =`, then evaluate only
    // the array literal. The old start-anchored replacement missed those comments,
    // turning `return // TODAY...` into an automatic-semicolon return of undefined.
    const arrayText = src.replace(/^[\s\S]*?\bconst\s+POEMS\s*=\s*/, '').replace(/;\s*$/, '');
    const parsed = new Function('return (' + arrayText + ')')();
    if (!Array.isArray(parsed)) throw new Error('Invalid poem corpus');
    POEMS = parsed;
  } catch (_) {
    return context.next(); // poems unavailable — serve static page as-is
  }

  const poem = poemForDate(POEMS, dateParam);
  if (!poem) return context.next();

  // Fetch the base poem.html (our own static file)
  const response = await context.next();
  if (!response.ok) return response;

  const html = await response.text();

  const title = poem.author + ' · TODAY';
  const desc  = truncate(poem.text.replace(/\n/g, ' ') + ' — ' + poem.author, 200);

  // Replace the placeholder OG tags written in poem.html <head>
  const injected = html
    .replace(/(<meta property="og:title" content=")[^"]*(")/,        `$1${ea(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${ea(desc)}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/,       `$1${ea(title)}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/,  `$1${ea(desc)}$2`);

  const headers = new Headers(response.headers);
  // Body changed, so origin byte-length/encoding headers are no longer valid.
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(injected, { status: response.status, headers });
}

// Mirror _poemOfTheDay() — no southern-hemisphere flip (server has no viewer TZ)
function poemForDate(POEMS, dateParam) {
  if (!Array.isArray(POEMS) || !POEMS.length) return null;
  const date   = dateParam ? new Date(dateParam + 'T12:00:00') : new Date();
  const m      = date.getMonth();
  const season = m >= 2 && m <= 4 ? 'spring'
               : m >= 5 && m <= 7 ? 'summer'
               : m >= 8 && m <= 10 ? 'autumn' : 'winter';
  const pool   = POEMS.filter(p => !p.season || p.season === season);
  if (!pool.length) return null;
  const appDay = date.toDateString();
  const days   = Math.floor(new Date(appDay).getTime() / 86400000);
  return pool[days % pool.length];
}

function truncate(s, max) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function ea(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
