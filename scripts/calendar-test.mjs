// Offline contract for 10b: separate consent, bounded reads, transient context.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('assets/calendar.js', root), 'utf8');
const scope = 'https://www.googleapis.com/auth/calendar.events.readonly';
const ok = text => console.log('  ✓ ' + text);
function hub() {
  const listeners = new Map();
  return { addEventListener(name, cb) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(cb); },
    removeEventListener(name, cb) { listeners.get(name)?.delete(cb); },
    async dispatch(name, event = {}) { await Promise.all([...listeners.get(name) || []].map(cb => cb(event))); } };
}
function harness() {
  let now = Date.parse('2026-10-10T09:00:00Z');
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const stored = new Map();
  const localStorage = { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, String(v)), removeItem: k => stored.delete(k) };
  const window = { ...hub(), location: { origin: 'https://today-here.netlify.app' } };
  const document = { ...hub(), hidden: false };
  const navigator = { onLine: true };
  const calls = [], statuses = []; let api, transport;
  const sandbox = { window, document, navigator, localStorage, URL, URLSearchParams, Date: Clock,
    TextEncoder, crypto: webcrypto, btoa, AbortSignal, AbortController,
    setInterval: () => 1, clearInterval: () => {}, setTimeout, clearTimeout,
    showStatus: message => statuses.push(message),
    Today: { define: (_name, value) => api = value, use: () => ({ renderConnections() {} }) },
    fetch: async (url, options = {}) => { calls.push({ url: String(url), options }); return transport(String(url), options); } };
  vm.runInNewContext(source, sandbox);
  const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
  const event = (extra = {}) => ({ start: { dateTime: '2026-10-10T10:00:00Z' }, end: { dateTime: '2026-10-10T11:00:00Z' },
    conferenceData: { entryPoints: [{ entryPointType: 'video', uri: 'https://meet.google.com/abc-defg-hij' }] }, ...extra });
  transport = async url => url.includes('calendar-token') ? response({ client_id: 'calendar-client' }) : response({ items: [event()] });
  return { api, calls, stored, window, document, navigator, response, event, statuses,
    seed() { stored.set('calendar_access_token', 'calendar-test'); stored.set('calendar_refresh_token', 'calendar-refresh-test'); stored.set('calendar_token_expiry', String(now + 3600000)); },
    setTransport(fn) { transport = fn; }, setNow(value) { now = Date.parse(value); } };
}

let h = harness();
assert.equal(h.api.connectionState(), 'disconnected');
assert.equal(await h.api.refresh(), false); assert.equal(h.calls.length, 0);
ok('disconnected Calendar is inert');
h.seed(); h.stored.set('gmail_access_token', 'gmail-untouched');
assert.equal(await h.api.refresh(), true);
const request = h.calls[0]; const query = new URL(request.url);
assert.equal(query.pathname, '/calendar/v3/calendars/primary/events');
assert.equal(query.searchParams.get('singleEvents'), 'true');
assert.equal(query.searchParams.get('maxResults'), '100');
assert.equal(query.searchParams.get('maxAttendees'), '1');
assert.equal(request.options.headers.Authorization, 'Bearer calendar-test');
assert.ok(!query.searchParams.has('access_token'));
assert.ok(!query.searchParams.get('fields').includes('summary'));
assert.equal(h.api.context().length, 1);
assert.ok([...h.stored.keys()].every(k => !/events|context|snapshot/.test(k)));
assert.equal(h.stored.get('gmail_access_token'), 'gmail-untouched');
await h.api.refresh(); assert.equal(h.calls.length, 1);
ok('primary-calendar GET is bounded/minimal, throttled and transient; Gmail is untouched');

const window = h.api.dayWindow(new Date('2026-10-10T09:00:00Z'));
const normalized = h.api.normalize([
  h.event(), h.event({ status: 'cancelled' }), h.event({ transparency: 'transparent' }),
  h.event({ eventType: 'focusTime' }), h.event({ eventType: 'outOfOffice' }),
  h.event({ start: { date: '2026-10-10' }, end: { date: '2026-10-11' } }),
  h.event({ attendees: [{ self: true, responseStatus: 'declined' }] }),
  h.event({ end: { dateTime: 'bad' } }), h.event({ end: { dateTime: '2026-10-10T08:00:00Z' } }),
  h.event({ start: { dateTime: '2026-10-10T10:00:00', timeZone: 'Pacific/Auckland' } }),
  h.event({ conferenceData: { entryPoints: [{ entryPointType: 'video', uri: 'javascript:alert(1)' }] } }),
  h.event({ conferenceData: { entryPoints: [{ entryPointType: 'video', uri: 'https://user:pass@example.com' }] } }),
], window);
assert.equal(normalized.length, 3); assert.equal(normalized[1].joinUrl, null); assert.equal(normalized[2].joinUrl, null);
assert.deepEqual(Object.keys(normalized[0]), ['start', 'end', 'joinUrl']);
ok('cancelled, declined, all-day, non-event and invalid dates are excluded; join links are HTTPS without credentials');

h.document.hidden = true; await h.document.dispatch('visibilitychange'); assert.equal(h.api.context().length, 0);
h.document.hidden = false; await h.document.dispatch('visibilitychange'); await h.api.refresh(); assert.equal(h.api.context().length, 1);
h.navigator.onLine = false; await h.window.dispatch('offline'); assert.equal(h.api.context().length, 0);
h.navigator.onLine = true; await h.window.dispatch('online'); await h.api.refresh(); assert.equal(h.api.context().length, 1);
h.setNow('2026-10-11T09:00:00Z'); assert.equal(h.api.context().length, 0);
ok('hide/offline clear context; foreground recovery and midnight freshness are enforced');
const oldTZ = process.env.TZ;
process.env.TZ = 'America/New_York';
for (const [date, hours] of [['2026-03-08T16:00:00Z', 23], ['2026-11-01T16:00:00Z', 25]]) {
  const bounds = h.api.dayWindow(new Date(date));
  assert.equal((Date.parse(bounds.end) - Date.parse(bounds.start)) / 3600000, hours);
}
if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ;
ok('today window follows local midnight across 23/25-hour DST days');

h = harness(); h.seed(); let pages = 0;
h.setTransport(async url => { pages++; return h.response(pages === 1 ? { items: [], nextPageToken: 'page-two' } : { items: [h.event()] }); });
assert.equal(await h.api.refresh(), true); assert.equal(pages, 2);
assert.equal(new URL(h.calls[1].url).searchParams.get('pageToken'), 'page-two');
h.setTransport(async () => h.response({ items: [], nextPageToken: 'more' }));
const before = h.calls.length;
assert.equal(await h.api.refresh(true), false); assert.equal(h.calls.length - before, 5); assert.equal(h.api.context().length, 0);
assert.equal(h.api.connectionState(), 'unavailable');
ok('recurrences are expanded; pagination completes or fails closed after five pages');

h = harness(); h.seed(); let resolveRead;
h.setTransport(() => new Promise(resolve => { resolveRead = resolve; }));
const pending = h.api.refresh(); await new Promise(resolve => setImmediate(resolve));
assert.equal(h.calls.length, 1);
const second = h.api.refresh(); assert.equal(h.calls.length, 1);
h.api.forget(); resolveRead(h.response({ items: [h.event()] }));
assert.equal(await pending, false); assert.equal(await second, false);
assert.equal(h.api.context().length, 0); assert.equal(h.api.connectionState(), 'disconnected');
ok('single-flight and Forget prevent late reads from restoring context');

h = harness(); h.seed(); let attempts = 0;
h.setTransport(async url => url.includes('calendar-token')
  ? h.response({ access_token: 'fresh-calendar', expires_in: 3600 })
  : (++attempts === 1 ? h.response({}, 401) : h.response({ items: [h.event()] })));
assert.equal(await h.api.refresh(), true); assert.equal(attempts, 2);
assert.equal(h.calls[2].options.headers.Authorization, 'Bearer fresh-calendar');
h.setTransport(async url => url.includes('calendar-token') ? h.response({ error: 'invalid_grant' }, 400) : h.response({}, 401));
assert.equal(await h.api.refresh(true), false); assert.equal(h.api.connectionState(), 'expired');
const stopped = h.calls.length; await h.api.refresh(true); assert.equal(h.calls.length, stopped);
ok('401 retries once; invalid_grant expires the connection without a retry loop');

h = harness(); h.seed(); await h.api.refresh();
h.stored.set('calendar_token_expiry', '0');
h.setTransport(async () => { throw new Error('offline'); });
assert.equal(await h.api.refresh(true), false); assert.equal(h.api.context().length, 0);
assert.equal(h.api.connectionState(), 'unavailable');
assert.notEqual(h.stored.get('calendar_token_expired'), '1');
ok('a transient token failure withholds prior context without falsely expiring consent');

h = harness(); h.seed(); h.stored.set('calendar_token_expiry', '0');
let resolveToken;
h.setTransport(() => new Promise(resolve => { resolveToken = resolve; }));
const refreshing = h.api.refresh(); await new Promise(resolve => setImmediate(resolve));
h.api.forget(); resolveToken(h.response({ access_token: 'late-token', expires_in: 3600 }));
assert.equal(await refreshing, false); assert.ok(!h.stored.has('calendar_access_token'));
ok('Forget also fences a late token refresh, not just a late event read');

h = harness(); const popup = { location: {}, close() {} };
let exchanges = 0;
h.setTransport(async (url, options) => {
  if (!url.includes('calendar-token')) return h.response({ items: [] });
  if (!options.method) return h.response({ client_id: 'calendar-client' });
  exchanges++; const body = JSON.parse(options.body);
  assert.ok(/^[\w-]{64}$/.test(body.code_verifier));
  return h.response({ access_token: 'auth-calendar', refresh_token: 'auth-refresh', expires_in: 3600 });
});
await h.api.auth(popup);
const authUrl = new URL(popup.location.href);
assert.equal(authUrl.searchParams.get('scope'), scope);
assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
const callback = { origin: h.window.location.origin, source: popup,
  data: { type: 'oauth_callback', search: '?code=test&state=' + authUrl.searchParams.get('state') } };
await h.window.dispatch('message', { ...callback, source: {} });
await h.window.dispatch('message', { ...callback, data: { ...callback.data, search: '?code=test&state=wrong' } });
assert.equal(exchanges, 0);
await h.window.dispatch('message', callback);
assert.equal(exchanges, 1); assert.equal(h.api.connectionState(), 'connected');
assert.equal(h.stored.get('calendar_refresh_token'), 'auth-refresh');
ok('separate PKCE consent checks origin, popup source and random state');
h.api.forget();

h = harness(); h.seed(); const otherPopup = { location: {}, close() {} };
h.setTransport(async (_url, options) => h.response(options.method ? { access_token: 'different-account', expires_in: 3600 } : { client_id: 'calendar-client' }));
await h.api.auth(otherPopup);
await h.window.dispatch('message', { origin: h.window.location.origin, source: otherPopup,
  data: { type: 'oauth_callback', search: '?code=test&state=' + new URL(otherPopup.location.href).searchParams.get('state') } });
assert.equal(h.stored.get('calendar_access_token'), 'calendar-test');
assert.equal(h.stored.get('calendar_refresh_token'), 'calendar-refresh-test');
assert.ok(h.statuses.some(s => s.includes('connect Calendar')));
h.api.forget();
ok('new-account consent without a refresh token cannot blend old and new credentials');

// Real Netlify handler with Google stubbed, never a live sign-in.
const require = createRequire(import.meta.url);
const { handler } = require(new URL('netlify/functions/calendar-token.js', root).pathname);
const previousFetch = globalThis.fetch;
const keys = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'CALENDAR_CLIENT_ID', 'CALENDAR_CLIENT_SECRET'];
const previousEnv = keys.map(k => process.env[k]);
try {
  for (const key of keys) delete process.env[key];
  process.env.GMAIL_CLIENT_ID = 'test-client'; process.env.GMAIL_CLIENT_SECRET = 'server-secret';
  let tokenRequest;
  globalThis.fetch = async (url, options) => {
    tokenRequest = { url, params: new URLSearchParams(options.body) };
    return { ok: true, json: async () => ({ access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600, scope }) };
  };
  assert.deepEqual(JSON.parse((await handler({ httpMethod: 'GET' })).body), { client_id: 'test-client' });
  const payload = { code: 'test-code', code_verifier: 'a'.repeat(64), redirect_uri: 'https://today-here.netlify.app/' };
  let r = await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  assert.equal(r.statusCode, 200); assert.equal(tokenRequest.url, 'https://oauth2.googleapis.com/token');
  assert.equal(tokenRequest.params.get('client_secret'), 'server-secret');
  assert.ok(!r.body.includes('server-secret')); assert.equal(r.headers['Cache-Control'], 'no-store');
  assert.equal((await handler({ httpMethod: 'POST', body: 'broken' })).statusCode, 400);
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify({ ...payload, redirect_uri: 'javascript:bad' }) })).statusCode, 400);
  assert.equal((await handler({ httpMethod: 'DELETE' })).statusCode, 405);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ access_token: 'test', expires_in: 3600, scope: 'gmail.readonly' }) });
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify(payload) })).statusCode, 403);
  globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ error: 'invalid_grant', error_description: 'private details' }) });
  r = await handler({ httpMethod: 'POST', body: JSON.stringify({ refresh_token: 'test-refresh' }) });
  assert.deepEqual(JSON.parse(r.body), { error: 'invalid_grant' });
  process.env.CALENDAR_CLIENT_ID = 'separate-client';
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify(payload) })).statusCode, 503);
  ok('token proxy hides secret/errors, validates scope/requests, and never mixes client credential pairs');
} finally {
  globalThis.fetch = previousFetch;
  keys.forEach((k, i) => { if (previousEnv[i] === undefined) delete process.env[k]; else process.env[k] = previousEnv[i]; });
}
const connections = readFileSync(new URL('assets/connections.js', root), 'utf8');
const index = readFileSync(new URL('index.html', root), 'utf8');
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const netlify = readFileSync(new URL('netlify.toml', root), 'utf8');
const csp = netlify.match(/Content-Security-Policy = "([^"]+)"/)[1];
assert.ok(csp.split(';').find(rule => rule.trim().startsWith('connect-src ')).split(/\s+/).includes('https://www.googleapis.com/calendar/v3/'));
assert.match(connections, /import\('\.\/calendar\.js'\)/);
assert.doesNotMatch(index, /<script[^>]+src=["'][^"']*calendar\.js/);
assert.match(sw, /['"]\/assets\/calendar\.js['"]/);
ok('lazy connection owner is wired and precached, without another eager startup script');

// Verify the actual lazy import and delegated connection controls in the app.
const { createServer } = await import('node:http');
const { extname, join } = await import('node:path');
const { readFile } = await import('node:fs/promises');
const puppeteer = (await import('puppeteer-core')).default;
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const path = pathname === '/' ? '/index.html' : pathname;
  try {
    const body = await readFile(join(root.pathname, path));
    res.writeHead(200, { 'Content-Security-Policy': csp, 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2' }[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new', args: ['--no-first-run', '--disable-extensions'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let calendarReads = 0;
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().startsWith('https://www.googleapis.com/calendar/v3/')) {
      if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: {
        'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'authorization',
      } });
      calendarReads++;
      return request.respond({ status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ items: [{
        summary: 'PRIVATE_TEST_EVENT', description: 'PRIVATE_TEST_DESCRIPTION',
        start: { dateTime: new Date(Date.now() + 600000).toISOString() },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      }] }) });
    }
    return request.url().startsWith('http://127.0.0.1:') || request.url().startsWith('data:') ? request.continue() : request.abort();
  });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('splash_shown_at', String(Date.now()));
    localStorage.setItem('calendar_access_token', 'browser-calendar');
    localStorage.setItem('calendar_refresh_token', 'browser-refresh');
    localStorage.setItem('calendar_token_expiry', String(Date.now() + 3600000));
    localStorage.setItem('gmail_access_token', 'browser-gmail');
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'load' });
  await page.waitForFunction(() => { try { return Today.use('calendar').context().length === 1; } catch { return false; } });
  assert.ok(calendarReads > 0, 'Calendar reads must pass the deployed CSP, not a replaced fetch');
  await page.evaluate(() => Today.use('connections').toggleConfig());
  await page.waitForSelector('[data-today-click="connections.calendar-forget"]', { visible: true });
  const connected = await page.evaluate(() => ({
    text: document.getElementById('connectionsContainer').textContent,
    hasLeak: document.body.innerText.includes('PRIVATE_TEST_EVENT') || JSON.stringify(localStorage).includes('PRIVATE_TEST_'),
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  assert.match(connected.text, /Google Calendar/); assert.match(connected.text, /Primary calendar · read-only/);
  assert.equal(connected.hasLeak, false); assert.equal(connected.overflow, false);
  await page.click('[data-today-click="connections.calendar-forget"]');
  await page.waitForFunction(() => !localStorage.getItem('calendar_refresh_token'));
  assert.equal(await page.evaluate(() => localStorage.getItem('gmail_access_token')), 'browser-gmail');
  assert.equal(await page.evaluate(() => Today.use('calendar').context().length), 0);
  assert.equal(await page.$eval('[data-today-click="connections.calendar-auth"]', el => el.textContent), 'Connect');
  assert.deepEqual(errors, []);
  ok('phone-width app reads Calendar through deployed CSP, keeps events private, and Forget leaves Gmail connected');
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
console.log('✓ CALENDAR FOUNDATION TEST PASSED');
