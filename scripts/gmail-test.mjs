// Gmail classification/query and focus-enrichment regression tests.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };

let puppeteer;
try { puppeteer = (await import('puppeteer-core')).default; }
catch { console.error('✗ puppeteer-core not installed — run: cd scripts && npm install'); process.exit(1); }

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const URL_BASE = `http://127.0.0.1:${server.address().port}`;

let browser;
let passed = 0;
const ok = message => { console.log('  ✓ ' + message); passed++; };
const assert = (condition, message, detail) => {
  if (condition) return ok(message);
  console.error('✗ FAIL — ' + message);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  throw new Error(message);
};
const effectiveQuery = query => '(' + query + ') -from:calendar-notification@google.com';

// The focus Gmail block is desktop-only. CI's headless Linux Chrome otherwise
// reports no hover-capable pointer, so focus mode never creates the block.
const DESKTOP_INPUT = '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4';

try {
  assert(createHash('sha256').update(await readFile(join(ROOT, 'assets/vendor/minisearch-7.2.0.js'))).digest('base64')
      === 'A5OzuiU7gJ1eVXB8ewh175tRiilqAGxnObKIduFU7bM=',
    'vendored MiniSearch matches the pinned upstream distribution');
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--disable-extensions', DESKTOP_INPUT] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('gmail_access_token', 'access-test');
    localStorage.setItem('gmail_refresh_token', 'refresh-test');
    localStorage.setItem('gmail_token_expiry', String(Date.now() + 3600000));
    localStorage.setItem('today_ai_provider', 'claude');
    localStorage.setItem('today_ai_key_claude', 'claude-test-key');
  });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._gmailBuildQueryFallback === 'function');
  assert(await page.evaluate(() => matchMedia('(hover: hover)').matches),
    'test browser exposes the desktop hover input required by focus mode');
  assert(await page.evaluate(() => !performance.getEntriesByType('resource').some(r => r.name.includes('minisearch-'))),
    'MiniSearch is not an eager startup resource');

  const ranking = await page.evaluate(async () => {
    const rank = Today.use('gmail').rankCandidates;
    const email = (threadId, subject, from, snippet, date = '2026-10-01') => ({ threadId, subject, from, snippet, date });
    const relevant = email('haircut-confirmation', 'Haircut booking confirmed', 'Salon <hi@salon.se>', 'Your haircut appointment is booked');
    const candidates = [
      email('wrong-service', 'Dentist booking confirmed', 'Dentist <hi@dentist.se>', 'Your appointment is confirmed', '2026-10-06'),
      email('promotion', 'Haircut special offer', 'Offers <offers@example.com>', 'Save on your next haircut', '2026-10-05'),
      relevant,
    ];
    const service = await rank('Book haircut', candidates);
    const provider = await rank('Book haircut at Gaia', [
      email('wrong-salon', 'Haircut booking confirmed', 'Other salon <hi@other.se>', 'Gaia recommended our haircut appointment'),
      email('gaia', 'Haircut booking confirmed', 'Gaia <hi@gaia.se>', 'Your haircut appointment'),
    ]);
    const ambiguous = await rank('Book haircut', [relevant,
      email('another-salon', relevant.subject, 'Another salon <hi@another.se>', relevant.snippet)]);
    const personTopic = await rank('email to gaia for reservation', [
      email('gaia-invoice', 'Invoice', 'Gaia <gaia@example.com>', 'Payment details'),
      email('gaia-reservation', 'Reservation', 'Gaia <gaia@example.com>', 'Your reservation is confirmed'),
      email('someone-else', 'Reservation', 'Someone else <other@example.com>', 'Your reservation'),
    ]);
    const unrelated = await rank('Book haircut', [candidates[0]]);
    const missingIntent = await rank('Book it', [relevant]);
    const lexicalBoundary = await rank('Book haircut', [email('barber', 'Appointment confirmed', 'Barber <hi@barber.se>', 'Your appointment is booked')]);
    const tie = await rank('Reply about the contract', [
      email('one', 'Contract', 'Sam <sam@example.com>', 'The contract is ready'),
      email('two', 'Contract', 'Alex <alex@example.com>', 'The contract is ready'),
    ]);
    return { service, provider, ambiguous, personTopic, unrelated, missingIntent, lexicalBoundary, tie,
      libraryLoads: performance.getEntriesByType('resource').filter(r => r.name.includes('minisearch-')).length };
  });
  assert(ranking.service.result?.threadId === 'haircut-confirmation'
      && ranking.service.result.matchPolicy === 'minisearch-v1'
      && ranking.provider.result?.threadId === 'gaia'
      && ranking.personTopic.result?.threadId === 'gaia-reservation',
    'MiniSearch selects task-grounded booking/contact evidence, not the first hit, a promotion or a passing business mention', ranking);
  assert(ranking.ambiguous.status === 'ambiguous-match' && !ranking.ambiguous.result
      && ranking.tie.status === 'ambiguous-match' && !ranking.tie.result
      && ranking.unrelated.status === 'weak-match' && ranking.missingIntent.status === 'weak-match'
      && ranking.lexicalBoundary.status === 'weak-match' && ranking.libraryLoads === 1,
    'ambiguous, unsupported and lexical-only misses stay silent; the same local library serves subsequent rankings', ranking);

  const fallback = await page.evaluate(() => ({
    topic: _gmailBuildQueryFallback('Follow up on the three proposals we sent last week'),
    topicUnsent: _gmailBuildQueryFallback('Follow up on renewal'),
    person: _gmailBuildQueryFallback('Reply to Maria about the contract'),
    multi: _gmailBuildQueryFallback('Email Ada Lovelace about the draft'),
    gaia: _gmailBuildQueryFallback('email to gaia for reservation'),
    gaiaArticle: _gmailBuildQueryFallback('Email to Gaia for the reservation'),
    plainPerson: _gmailBuildQueryFallback('Email Gaia'),
    organization: _gmailBuildQueryFallback('Email Center for Reproductive Rights'),
    empty: _gmailBuildQueryFallback(''),
  }));
  assert(fallback.topic === '"three proposals" in:sent' && fallback.topicUnsent === 'subject:renewal'
      && !fallback.topic.includes('from:'),
    'topic fallback searches the subject matter in Sent instead of inventing a person', fallback);
  assert(fallback.person === '{from:Maria to:Maria} contract'
      && fallback.multi === '{from:"Ada Lovelace" to:"Ada Lovelace"} draft'
      && fallback.gaia === '{from:gaia to:gaia} reservation'
      && fallback.gaiaArticle === '{from:Gaia to:Gaia} reservation'
      && fallback.plainPerson === 'from:Gaia OR to:Gaia'
      && fallback.organization === 'from:"Center for Reproductive Rights" OR to:"Center for Reproductive Rights"'
      && fallback.empty === '',
    'person fallback separates addressee from about/for topic and handles empty input', fallback);

  const classified = await page.evaluate(async () => {
    const calls = [];
    window.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), body: options.body || '' });
      if (String(url).includes('/ai-assist')) {
        const sent = JSON.parse(options.body || '{}');
        if (sent.provider !== 'claude' || sent.apiKey !== 'claude-test-key') {
          return { ok: false, status: 400, json: async () => ({ error: 'No API key' }) };
        }
        return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: '"three proposals" in:sent' }) };
      }
      return { ok: true, status: 200, json: async () => ({ threads: [] }) };
    };
    await _gmailEnrichTask('gmail_topic_ai', 'Follow up on the three proposals we sent last week');
    const ai = calls.find(c => c.url.includes('/ai-assist'));
    const gmail = calls.find(c => c.url.includes('gmail.googleapis.com'));
    return { prompt: JSON.parse(ai.body).systemPrompt, provider: JSON.parse(ai.body).provider, gmailUrl: gmail.url,
      cached: JSON.parse(localStorage.getItem('gmail_classify_gmail_topic_ai')) };
  });
  assert(classified.provider === 'claude' && classified.cached?.source === 'ai',
    'classifier sends the configured provider and key, and marks AI results in the cache', classified);
  const classifiedQuery = new URL(classified.gmailUrl).searchParams.get('q');
  assert(classified.prompt.includes('Topic-targeted') && classified.prompt.includes('never invent a person')
      && classified.prompt.includes('email to NAME for TOPIC')
      && classifiedQuery === effectiveQuery('"three proposals" in:sent'),
    'AI classifier permits topic/date operators and the resulting Gmail query is preserved', { ...classified, classifiedQuery });

  const degraded = await page.evaluate(async () => {
    const calls = [];
    window.fetch = async (url) => {
      calls.push(String(url));
      if (String(url).includes('/ai-assist')) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ threads: [] }) };
    };
    await _gmailEnrichTask('gmail_topic_fallback', 'Follow up on the three proposals we sent last week');
    const gmail = calls.find(url => url.includes('gmail.googleapis.com'));
    return {
      query: new URL(gmail).searchParams.get('q'),
      cached: localStorage.getItem('gmail_classify_gmail_topic_fallback'),
    };
  });
  assert(degraded.query === effectiveQuery('"three proposals" in:sent') && degraded.cached === null,
    'AI failure falls back to the same topic-safe query without caching it, so the next attempt retries the AI', degraded);

  const gaiaRetry = await page.evaluate(async () => {
    const queries = [];
    window.fetch = async (url) => {
      const request = String(url);
      if (request.includes('/ai-assist'))
        return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: 'subject:too-narrow' }) };
      if (request.includes('/threads?q=')) {
        const query = new URL(request).searchParams.get('q');
        queries.push(query);
        return { ok: true, status: 200, json: async () => ({ threads: query === '({from:gaia to:gaia} reservation) -from:calendar-notification@google.com' ? [{ id: 'gaia-thread' }] : [] }) };
      }
      return { ok: true, status: 200, json: async () => ({ messages: [{ payload: { headers: [
        { name: 'Subject', value: 'Reservation' }, { name: 'From', value: 'Gaia <gaia@example.com>' },
      ] }, snippet: 'Reservation confirmed' }] }) };
    };
    await _gmailEnrichTask('gmail_gaia_ai_retry', 'email to gaia for reservation');
    return {
      queries,
      enrichment: JSON.parse(localStorage.getItem('gmail_enrichment_gmail_gaia_ai_retry')),
      diagnostic: Today.use('gmail').observationAudit().entries.at(-1),
      diagnosticStorage: localStorage.getItem('gmail_diagnostics_v1'),
    };
  });
  assert(gaiaRetry.queries.join('|') === [effectiveQuery('subject:too-narrow'), effectiveQuery('{from:gaia to:gaia} reservation')].join('|')
      && gaiaRetry.enrichment?.threadId === 'gaia-thread'
      && gaiaRetry.enrichment.searchQuery === '{from:gaia to:gaia} reservation'
      && gaiaRetry.diagnostic?.status === 'found'
      && gaiaRetry.diagnostic.attempts.map(a => a.status).join('|') === 'no-thread|found'
      && !/from:gaia|reservation|example\.com|too-narrow|email to gaia/i.test(gaiaRetry.diagnosticStorage),
    'explicit email task retries a no-match AI query with person + topic; diagnostic retains no content', gaiaRetry);

  const gaiaDeclined = await page.evaluate(async () => {
    const queries = [];
    window.fetch = async (url) => {
      const request = String(url);
      if (request.includes('/ai-assist'))
        return { ok: true, status: 200, json: async () => ({ isComm: false, searchQuery: '' }) };
      if (request.includes('/threads?q=')) queries.push(new URL(request).searchParams.get('q'));
      return { ok: true, status: 200, json: async () => ({ threads: [] }) };
    };
    await _gmailEnrichTask('gmail_gaia_declined', 'email to gaia for reservation');
    return { queries, cached: localStorage.getItem('gmail_classify_gmail_gaia_declined'),
      diagnostic: Today.use('gmail').observationAudit().entries.at(-1) };
  });
  assert(gaiaDeclined.queries.join('|') === effectiveQuery('{from:gaia to:gaia} reservation')
      && gaiaDeclined.cached === null && gaiaDeclined.diagnostic?.reason === 'ai-declined-email',
    'an explicit email task still searches when AI declines, without caching the false negative', gaiaDeclined);

  const invalidQuery = await page.evaluate(async () => {
    const queries = [];
    window.fetch = async (url) => {
      const request = String(url);
      if (request.includes('/ai-assist'))
        return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: 'gaia reservation' }) };
      if (request.includes('/threads?q=')) queries.push(new URL(request).searchParams.get('q'));
      return { ok: true, status: 200, json: async () => ({ threads: [] }) };
    };
    await _gmailEnrichTask('gmail_gaia_invalid_query', 'email to gaia for reservation');
    return { queries, cached: localStorage.getItem('gmail_classify_gmail_gaia_invalid_query'),
      reason: Today.use('gmail').observationAudit().entries.at(-1)?.reason };
  });
  assert(invalidQuery.queries.join('|') === effectiveQuery('{from:gaia to:gaia} reservation')
      && invalidQuery.cached === null && invalidQuery.reason === 'ai-invalid-query',
    'an AI query without a Gmail operator cannot match an unrelated broad result', invalidQuery);

  const cachedDecline = await page.evaluate(async () => {
    localStorage.setItem('gmail_classify_gmail_gaia_old_decline', JSON.stringify({ isComm: false, searchQuery: '', source: 'ai' }));
    let aiCalls = 0;
    window.fetch = async (url) => {
      if (String(url).includes('/ai-assist')) {
        aiCalls++;
        return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: 'subject:reservation' }) };
      }
      return { ok: true, status: 200, json: async () => ({ threads: [] }) };
    };
    await _gmailEnrichTask('gmail_gaia_old_decline', 'email to gaia for reservation');
    return { aiCalls, cached: JSON.parse(localStorage.getItem('gmail_classify_gmail_gaia_old_decline')) };
  });
  assert(cachedDecline.aiCalls === 1 && cachedDecline.cached?.isComm === true,
    'an older cached AI false negative is reclassified for explicit email intent', cachedDecline);

  const gmailError = await page.evaluate(async () => {
    let gmailCalls = 0;
    window.fetch = async (url) => {
      if (String(url).includes('/ai-assist'))
        return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: 'subject:reservation' }) };
      gmailCalls++;
      return { ok: false, status: 403 };
    };
    await _gmailEnrichTask('gmail_gaia_403', 'email to gaia for reservation');
    return { gmailCalls, diagnostic: Today.use('gmail').observationAudit().entries.at(-1) };
  });
  assert(gmailError.gmailCalls === 1 && gmailError.diagnostic?.status === 'http-403'
      && gmailError.diagnostic.attempts.length === 1,
    'Gmail API failure is diagnosed and never mistaken for a no-match retry', gmailError);

  const focusRetry = await page.evaluate(() => {
    window.fetch = async (url) => {
      const request = String(url);
      if (request.includes('/ai-assist'))
        return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: 'subject:too-narrow' }) };
      if (request.includes('/threads?q=')) {
        const query = new URL(request).searchParams.get('q');
        return { ok: true, status: 200, json: async () => ({ threads: query === '({from:gaia to:gaia} reservation) -from:calendar-notification@google.com' ? [{ id: 'focus-gaia' }] : [] }) };
      }
      return { ok: true, status: 200, json: async () => ({ messages: [{ payload: { headers: [
        { name: 'Subject', value: 'Reservation' }, { name: 'From', value: 'Gaia <gaia@example.com>' },
      ] }, snippet: 'Reservation confirmed' }] }) };
    };
    _gmailRenderFocusBlock('gmail_gaia_focus', 'email to gaia for reservation');
    return !!document.getElementById('focusGmailBlock');
  });
  assert(focusRetry, 'focus Gmail block exists for an on-demand no-match retry');
  await page.waitForFunction(() => !!document.querySelector('#focusGmailBlock .focus-gmail-thread'));
  const focusResult = await page.evaluate(() => ({
    threadId: JSON.parse(localStorage.getItem('gmail_enrichment_gmail_gaia_focus'))?.threadId,
    diagnostic: Today.use('gmail').observationAudit().entries.at(-1),
  }));
  assert(focusResult.threadId === 'focus-gaia' && focusResult.diagnostic?.status === 'found',
    'focus on-demand enrichment uses the same safe retry path', focusResult);

  const cache = await page.evaluate(async () => {
    localStorage.setItem('gmail_classify_gmail_cached', JSON.stringify({ isComm: true, searchQuery: '"renewal" in:sent', source: 'ai' }));
    const calls = [];
    window.fetch = async (url) => {
      calls.push(String(url));
      return { ok: true, status: 200, json: async () => ({ threads: [] }) };
    };
    await _gmailEnrichTask('gmail_cached', 'Follow up on renewal');
    return calls;
  });
  assert(cache.length === 2 && cache.every(url => url.includes('gmail.googleapis.com'))
      && new URL(cache[1]).searchParams.get('q') === effectiveQuery('subject:renewal'),
    'cached AI classifications remain valid, with a topic-safe no-match retry', cache);

  const legacy = await page.evaluate(async () => {
    // Written before v2.90.52, when the classifier never reached the AI.
    localStorage.setItem('gmail_classify_gmail_legacy', JSON.stringify({ isComm: true, searchQuery: 'from:Maria OR to:Maria' }));
    const calls = [];
    window.fetch = async (url) => {
      calls.push(String(url));
      if (String(url).includes('/ai-assist')) return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: 'from:maria@example.com' }) };
      return { ok: true, status: 200, json: async () => ({ threads: [] }) };
    };
    await _gmailEnrichTask('gmail_legacy', 'Reply to Maria');
    return { reclassified: calls.some(u => u.includes('/ai-assist')), cached: JSON.parse(localStorage.getItem('gmail_classify_gmail_legacy')) };
  });
  assert(legacy.reclassified && legacy.cached.source === 'ai' && legacy.cached.searchQuery === 'from:maria@example.com',
    'unmarked legacy classifications are reclassified once by the AI', legacy);

  const nonCommCalls = await page.evaluate(async () => {
    let calls = 0;
    window.fetch = async () => { calls++; return { ok: false, status: 500 }; };
    await _gmailEnrichTask('gmail_plain', 'Buy milk');
    return calls;
  });
  assert(nonCommCalls === 0, 'non-communication tasks make no AI or Gmail request', nonCommCalls);

  const indicator = await page.evaluate(() => {
    const row = document.createElement('div');
    row.className = 'task'; row.dataset.taskid = 'gmail_indicator';
    row.innerHTML = '<span class="task-text"><span class="task-tail"></span></span>';
    document.body.appendChild(row);
    localStorage.setItem('gmail_enrichment_gmail_indicator', JSON.stringify({ fetchedAt: Date.now(), subject: 'Test', matchPolicy: 'minisearch-v1' }));
    _gmailUpdateIndicator('gmail_indicator', true);
    const el = row.querySelector('.gmail-indicator');
    return el && { label: el.getAttribute('aria-label'), beforeTail: el.nextElementSibling?.classList.contains('task-tail') };
  });
  assert(indicator?.label === 'Email context available — start a focus session' && indicator.beforeTail,
    'email indicator is named and remains attached before the task tail', indicator);

  // Apple Mail: on a desktop Mac the focus block's open link goes to message://<Message-ID>
  // (no browser); without a Message-ID (old cache) or off a Mac it stays the Gmail web link.
  const mailOpen = await page.evaluate(async () => {
    const realPlatform = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform');
    const setPlatform = v => Object.defineProperty(navigator, 'platform', { configurable: true, get: () => v });
    const seenUrls = [];
    window.fetch = async (url) => {
      seenUrls.push(String(url));
      if (String(url).includes('/threads?')) return { ok: true, status: 200, json: async () => ({ threads: [{ id: 't1' }] }) };
      if (String(url).includes('/threads/t1')) return { ok: true, status: 200, json: async () => ({ messages: [{ snippet: 'See you at 3',
        payload: { headers: [{ name: 'Subject', value: 'Haircut' }, { name: 'From', value: 'Salon <hi@salon.se>' },
          { name: 'Date', value: 'Mon, 5 Oct 2026 10:00:00 +0200' }, { name: 'Message-ID', value: '<CAB+x9#1@mail.gmail.com>' }] } }] }) };
      if (String(url).includes('ai-assist')) return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: 'from:salon' }) };
      return { ok: true, status: 200, json: async () => ({}) };
    };
    await _gmailEnrichTask('gmail_mail_1', 'Reply to the salon about the haircut');
    const cached = JSON.parse(localStorage.getItem('gmail_enrichment_gmail_mail_1') || '{}');
    const askedForId = seenUrls.some(u => u.includes('metadataHeaders=Message-ID'));
    const block = document.getElementById('focusGmailBlock');
    const linkFor = () => { _gmailRenderFocusBlock('gmail_mail_1', 'Reply to the salon about the haircut'); return block.querySelector('.focus-gmail-open'); };
    setPlatform('MacIntel');
    const mac = linkFor();
    const macOut = { text: mac?.textContent, href: mac?.getAttribute('href'), target: mac?.getAttribute('target') };
    // The delegated handler (document level) cancels the default and navigates in place.
    // Point the href at a same-page hash so the in-place navigation is harmless here.
    mac.setAttribute('href', '#apple-mail-test');
    const clickEv = new MouseEvent('click', { bubbles: true, cancelable: true });
    mac.dispatchEvent(clickEv);
    const navigated = clickEv.defaultPrevented && location.hash === '#apple-mail-test';
    history.replaceState(null, '', location.pathname + location.search);
    setPlatform('Win32');
    const win = linkFor();
    setPlatform('MacIntel');
    localStorage.setItem('gmail_enrichment_gmail_mail_1', JSON.stringify({ ...cached, messageId: undefined }));
    const old = linkFor();
    if (realPlatform) Object.defineProperty(navigator, 'platform', realPlatform); else delete navigator.platform;
    localStorage.removeItem('gmail_enrichment_gmail_mail_1');
    block.hidden = true; block.innerHTML = '';
    return { askedForId, cachedId: cached.messageId, macOut, defaultPrevented: navigated,
      winText: win?.textContent, winHref: win?.getAttribute('href'), oldText: old?.textContent };
  });
  assert(mailOpen.askedForId && mailOpen.cachedId === 'CAB+x9#1@mail.gmail.com'
      && mailOpen.macOut.text === 'Open in Mail ↗' && mailOpen.macOut.href === 'message://%3CCAB%2Bx9%231%40mail.gmail.com%3E'
      && !mailOpen.macOut.target && mailOpen.defaultPrevented === true
      && mailOpen.winText === 'Open in Gmail ↗' && /^https:\/\/mail\.google\.com\//.test(mailOpen.winHref)
      && mailOpen.oldText === 'Open in Gmail ↗',
    'desktop Mac opens the thread in Apple Mail via message://; other platforms and old caches keep Gmail', mailOpen);

  // BUG-115: Google answers a refresh with 400 invalid_grant once the saved sign-in is gone.
  // The app stops asking, reports once, and Connections offers Reconnect instead of "Connected".
  const expired = await page.evaluate(async () => {
    localStorage.setItem('gmail_token_expiry', '1');
    const errors = [];
    const origLog = window._logSyncError;
    window._logSyncError = (where, message) => errors.push({ where, message });
    let tokenCalls = 0;
    window.fetch = async (url) => {
      if (String(url).includes('gmail-token')) {
        tokenCalls++;
        return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }) };
      }
      if (String(url).includes('ai-assist')) return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: 'from:sam' }) };
      return { ok: true, status: 200, json: async () => ({}) };
    };
    await _gmailEnrichTask('gmail_expired_1', 'Reply to Sam');
    await _gmailEnrichTask('gmail_expired_2', 'Reply to Robin');
    const pulseBeforeOpen = document.getElementById('trelloBtn').classList.contains('btn-icon-attention');
    const panel = document.getElementById('configPanel');
    if (!panel.classList.contains('open')) Today.use('connections').toggleConfig(); // renders Connections
    const pulseStoppedOnOpen = !document.getElementById('trelloBtn').classList.contains('btn-icon-attention');
    const row = [...document.querySelectorAll('.connection-row')].find(r => r.querySelector('.connection-row-title')?.textContent === 'Gmail');
    const out = {
      pulseBeforeOpen, pulseStoppedOnOpen,
      flagged: localStorage.getItem('gmail_token_expired') === '1',
      oneTokenCall: tokenCalls === 1,
      reportedOnce: errors.filter(e => e.where === 'Gmail').length === 1,
      status: row?.querySelector('.connection-row-status')?.textContent,
      reconnect: !!row?.querySelector('[data-today-click="connections.gmail-auth"]'),
    };
    window._logSyncError = origLog;
    Today.use('connections').toggleConfig();
    localStorage.removeItem('gmail_token_expired');
    Object.keys(localStorage).filter(k => k.startsWith('connections_nudge_seen_')).forEach(k => localStorage.removeItem(k));
    localStorage.setItem('gmail_token_expiry', String(Date.now() + 3600e3));
    return out;
  });
  assert(expired.flagged && expired.oneTokenCall && expired.reportedOnce
      && expired.status === 'Sign-in expired' && expired.reconnect
      && expired.pulseBeforeOpen && expired.pulseStoppedOnOpen,
    'an expired Gmail sign-in stops retrying, reports once, pulses ✧ until Connections is opened, and offers Reconnect', expired);

  // Booking a service is looked up like writing to someone: the useful thread is the
  // last booking confirmation, found on this device. It shows without "Draft reply",
  // and the focus Ask button keeps asking about the task instead of drafting.
  const booking = await page.evaluate(async () => {
    const out = {
      fallbackHaircut: _gmailBuildQueryFallback('Book haircut'),
      fallbackTable: _gmailBuildQueryFallback('Reserve a table at Gaia'),
      fallbackDentist: _gmailBuildQueryFallback('Schedule dentist appointment'),
      contactStillPerson: _gmailBuildQueryFallback('Email Gaia about the booking'),
    };
    const calls = [];
    window.fetch = async (url, opts = {}) => {
      const u = String(url); calls.push({ url: u, body: opts.body || '' });
      if (u.includes('ai-assist')) return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: '{subject:booking subject:confirmation} haircut' }) };
      if (u.includes('/threads?q=')) return { ok: true, status: 200, json: async () => ({ threads: [{ id: 'cut-thread' }] }) };
      return { ok: true, status: 200, json: async () => ({ messages: [{ snippet: 'Your haircut is booked for Tue 10:00',
        payload: { headers: [{ name: 'Subject', value: 'Booking confirmed — haircut' }, { name: 'From', value: 'Salon <hi@salon.se>' },
          { name: 'Date', value: 'Tue, 1 Sep 2026 09:00:00 +0200' }] } }] }) };
    };
    await _gmailEnrichTask('gmail_booking_1', 'Book haircut');
    const ai = calls.find(c => c.url.includes('ai-assist'));
    out.reachedClassifier = !!ai;
    out.promptCoversBooking = !!ai && /book, reserve, or schedule a service/.test(JSON.parse(ai.body).systemPrompt);
    out.searched = calls.some(c => c.url.includes('/threads?q='));
    out.cached = !!localStorage.getItem('gmail_enrichment_gmail_booking_1');
    const block = document.getElementById('focusGmailBlock');
    _gmailRenderFocusBlock('gmail_booking_1', 'Book haircut');
    out.threadShown = !block.hidden && block.textContent.includes('haircut is booked');
    out.noDraftButton = !block.querySelector('.focus-gmail-draft-btn');
    out.openLinkShown = !!block.querySelector('.focus-gmail-open');
    out.askNotRelabelled = !/draft reply/i.test(document.querySelector('.focus-ai-timer-btn')?.textContent || '');
    localStorage.removeItem('gmail_enrichment_gmail_booking_1');
    block.hidden = true; block.innerHTML = '';
    calls.length = 0;
    await _gmailEnrichTask('gmail_plain_1', 'Water the plants');
    out.unrelatedStillSkipped = !calls.some(c => c.url.includes('ai-assist'));
    return out;
  });
  assert(booking.fallbackHaircut === '{subject:booking subject:confirmation subject:appointment subject:reservation subject:booked} haircut'
      && booking.fallbackTable === '{subject:booking subject:confirmation subject:appointment subject:reservation subject:booked} "table at Gaia"'
      && booking.fallbackDentist === '{subject:booking subject:confirmation subject:appointment subject:reservation subject:booked} dentist'
      && booking.contactStillPerson === '{from:Gaia to:Gaia} booking'
      && booking.reachedClassifier && booking.promptCoversBooking && booking.searched && booking.cached
      && booking.threadShown && booking.noDraftButton && booking.openLinkShown && booking.askNotRelabelled
      && booking.unrelatedStillSkipped,
    'booking tasks look up the last confirmation on-device and show it without Draft reply; unrelated tasks still skip Gmail', booking);

  const calendarFiltering = await page.evaluate(async () => {
    const notification = (from = 'Google Calendar <calendar-notification@google.com>') => ({
      snippet: 'Calendar-only private fixture', payload: { headers: [
        { name: 'From', value: from }, { name: 'Subject', value: 'Notification: Haircut' },
        { name: 'Message-ID', value: '<calendar-only@example.com>' },
      ] },
    });
    const salon = (from = 'Salon <hi@salon.se>') => ({
      snippet: 'Your haircut booking details', payload: { headers: [
        { name: 'From', value: from }, { name: 'Subject', value: 'Appointment reminder' },
        { name: 'Message-ID', value: '<salon-confirmation@example.com>' },
      ] },
    });
    async function run(id, text, threads) {
      localStorage.setItem('gmail_classify_' + id, JSON.stringify({ isComm: true, searchQuery: 'from:salon OR to:salon', source: 'ai' }));
      const requests = [];
      window.fetch = async (url) => {
        const u = new URL(String(url), location.href);
        requests.push(u.href);
        if (u.pathname.endsWith('/threads')) return { ok: true, json: async () => ({ threads: Object.keys(threads).map(id => ({ id })) }) };
        return { ok: true, json: async () => ({ messages: threads[u.pathname.split('/').at(-1)] }) };
      };
      await _gmailEnrichTask(id, text);
      return { requests, cached: JSON.parse(localStorage.getItem('gmail_enrichment_' + id) || 'null'),
        status: Today.use('gmail').observationAudit().entries.at(-1)?.status };
    }
    const next = await run('calendar_next', 'Book haircut', { calendar: [notification()], salon: [salon()] });
    const mixed = await run('calendar_mixed', 'Email the salon', { mixed: [salon(), notification()] });
    const only = await run('calendar_only', 'Book haircut', { calendar: [notification()] });
    const bounded = await run('calendar_bounded', 'Email the salon', Object.fromEntries(
      Array.from({ length: 6 }, (_, i) => ['calendar' + i, [notification()]])));
    const allowed = [];
    for (const [i, from] of [
      'Calendar team <sam@example.com>',
      '"calendar-notification@google.com" <hi@salon.se>',
      'calendar-notification@google.com.example.org',
    ].entries()) allowed.push((await run('calendar_allowed_' + i, 'Reply about haircut', { human: [salon(from)] })).cached?.from);
    const blocked = [];
    for (const [i, from] of [
      'calendar-notification@google.com',
      'Google Calendar <CALENDAR-NOTIFICATION@GOOGLE.COM>',
    ].entries()) blocked.push((await run('calendar_blocked_' + i, 'Reply about the haircut', { calendar: [notification(from)] })).status);
    return { next, mixed, only, bounded, allowed, blocked,
      diagnostics: localStorage.getItem('gmail_diagnostics_v1') };
  });
  const calendarQuery = new URL(calendarFiltering.next.requests[0]);
  assert(calendarQuery.searchParams.get('q') === effectiveQuery('from:salon OR to:salon')
      && calendarQuery.searchParams.get('maxResults') === '5'
      && calendarFiltering.next.cached?.threadId === 'salon'
      && calendarFiltering.next.requests.length === 3
      && calendarFiltering.next.cached.subject === 'Appointment reminder',
    'all query branches exclude calendar mail, then skip a notification for genuine salon mail—even a reminder', calendarFiltering.next);
  assert(calendarFiltering.mixed.cached?.messageId === 'salon-confirmation@example.com'
      && calendarFiltering.mixed.cached.from === 'Salon <hi@salon.se>'
      && calendarFiltering.only.cached === null && calendarFiltering.only.status === 'excluded-calendar'
      && calendarFiltering.only.requests.length === 2
      && calendarFiltering.bounded.requests.length === 6 && calendarFiltering.bounded.cached === null,
    'mixed threads select a non-calendar message; calendar-only results stay silent without broad retries and inspection is bounded',
    { mixed: calendarFiltering.mixed, only: calendarFiltering.only, bounded: calendarFiltering.bounded });
  assert(calendarFiltering.allowed.every(Boolean)
      && calendarFiltering.blocked.every(status => status === 'excluded-calendar')
      && !/Calendar-only private fixture|salon\.se|salon-confirmation|calendar-only@example|from:salon/i.test(calendarFiltering.diagnostics),
    'actual sender matching handles case without blocking display-name/lookalike matches, and diagnostics remain content-free',
    { allowed: calendarFiltering.allowed, blocked: calendarFiltering.blocked });

  const calendarCache = await page.evaluate(async () => {
    const id = 'calendar_cached';
    const row = document.createElement('div');
    row.className = 'task'; row.dataset.taskid = id;
    row.innerHTML = '<span class="task-text"><span class="gmail-indicator">↩</span><span class="task-tail"></span></span>';
    document.body.appendChild(row);
    localStorage.setItem('gmail_enrichment_' + id, JSON.stringify({
      from: 'Google Calendar <calendar-notification@google.com>', subject: 'Notification: haircut',
      snippet: 'Old private calendar reminder', taskText: 'Book haircut', fetchedAt: Date.now(),
    }));
    localStorage.setItem('gmail_classify_' + id, JSON.stringify({ isComm: true, searchQuery: 'subject:haircut', source: 'ai' }));
    let searches = 0;
    window.fetch = async () => { searches++; return { ok: true, json: async () => ({ threads: [] }) }; };
    _gmailUpdateIndicator(id);
    const removed = !row.querySelector('.gmail-indicator') && localStorage.getItem('gmail_enrichment_' + id) === null;
    _gmailRenderFocusBlock(id, 'Book haircut');
    await new Promise(resolve => setTimeout(resolve, 0));
    const block = document.getElementById('focusGmailBlock');
    const hidden = block.hidden && !block.textContent.includes('Old private calendar reminder');
    await _gmailEnrichTask(id, 'Book haircut');
    row.remove();
    return { removed, hidden, searches };
  });
  assert(calendarCache.removed && calendarCache.hidden && calendarCache.searches > 0,
    'an old cached calendar reminder loses its arrow, stays out of focus, and cannot prevent a new search', calendarCache);

  const rankedSearch = await page.evaluate(async () => {
    const id = 'ranked_search';
    localStorage.setItem('gmail_classify_' + id, JSON.stringify({ isComm: true, searchQuery: 'subject:appointment', source: 'ai' }));
    localStorage.setItem('gmail_enrichment_' + id, JSON.stringify({ taskText: 'Book haircut',
      subject: 'Dentist appointment', from: 'Dentist <hi@dentist.se>', fetchedAt: Date.now() }));
    const requests = [];
    const msg = (subject, from, snippet, messageId) => ({ snippet, payload: { headers: [
      { name: 'Subject', value: subject }, { name: 'From', value: from }, { name: 'Message-ID', value: '<' + messageId + '>' },
    ] } });
    window.fetch = async url => {
      const u = new URL(String(url), location.href); requests.push(u.pathname);
      if (u.pathname.endsWith('/threads')) return { ok: true, json: async () => ({ threads: [{ id: 'dentist' }, { id: 'salon' }] }) };
      return { ok: true, json: async () => ({ messages: u.pathname.endsWith('/dentist')
        ? [msg('Appointment confirmed', 'Dentist <hi@dentist.se>', 'Your dental appointment', 'dentist@example.com')]
        : [msg('Haircut booking confirmed', 'Salon <hi@salon.se>', 'Your haircut appointment is confirmed', 'haircut@example.com'),
          msg('Invoice', 'Salon <hi@salon.se>', 'Payment processed', 'invoice@example.com')] }) };
    };
    await _gmailEnrichTask(id, 'Book haircut');
    const cached = JSON.parse(localStorage.getItem('gmail_enrichment_' + id));
    // A later edit must not reuse the haircut card for a different commitment.
    await _gmailEnrichTask(id, 'Book dentist');
    const edited = JSON.parse(localStorage.getItem('gmail_enrichment_' + id));
    return { cached, edited, requests, diagnostic: Today.use('gmail').observationAudit().entries.at(-1) };
  });
  assert(rankedSearch.cached?.threadId === 'salon' && rankedSearch.cached.messageId === 'haircut@example.com'
      && rankedSearch.cached.matchPolicy === 'minisearch-v1'
      && rankedSearch.edited?.threadId === 'dentist' && rankedSearch.edited.taskText === 'Book dentist'
      && rankedSearch.requests.length === 6,
    'real enrichment ranks multiple threads/messages, replaces unvalidated caches and rechecks a task edit', rankedSearch);

  const focusRace = await page.evaluate(async () => {
    let release;
    let ready;
    const pending = new Promise(resolve => { ready = resolve; });
    localStorage.setItem('gmail_classify_race_a', JSON.stringify({ isComm: true, searchQuery: 'subject:contract', source: 'ai' }));
    localStorage.setItem('gmail_enrichment_race_b', JSON.stringify({ taskText: 'Reply about invoice', matchPolicy: 'minisearch-v1',
      from: 'Pat <pat@example.com>', subject: 'Invoice', snippet: 'Invoice context must stay', fetchedAt: Date.now() }));
    window.fetch = async url => {
      if (String(url).includes('/threads?')) return { ok: true, json: async () => ({ threads: [{ id: 'race-a' }] }) };
      return new Promise(resolve => {
        release = () => resolve({ ok: true, json: async () => ({ messages: [{ snippet: 'Old contract context', payload: { headers: [
          { name: 'Subject', value: 'Contract' }, { name: 'From', value: 'Sam <sam@example.com>' },
        ] } }] }) });
        ready();
      });
    };
    _gmailRenderFocusBlock('race_a', 'Reply about contract');
    await pending;
    _gmailRenderFocusBlock('race_b', 'Reply about invoice');
    release();
    await new Promise(resolve => setTimeout(resolve, 10));
    const block = document.getElementById('focusGmailBlock');
    return { id: block.dataset.focusTaskId, text: block.textContent };
  });
  assert(focusRace.id === 'race_b' && focusRace.text.includes('Invoice context must stay')
      && !focusRace.text.includes('Old contract context'),
    'a slower ranked lookup cannot overwrite the cached context of a newly focused task', focusRace);

  // Isolate this from the first page's HTTP/module/SW caches: a cached library
  // correctly remains usable when the network is blocked.
  const unavailableContext = await browser.createBrowserContext();
  const unavailablePage = await unavailableContext.newPage();
  await unavailablePage.setCacheEnabled(false);
  await unavailablePage.setBypassServiceWorker(true);
  await unavailablePage.setRequestInterception(true);
  unavailablePage.on('request', request => request.url().includes('minisearch-7.2.0.js') ? request.abort() : request.continue());
  await unavailablePage.goto(URL_BASE, { waitUntil: 'domcontentloaded' });
  await unavailablePage.waitForFunction(() => window.Today?.use('gmail')?.rankCandidates);
  const unavailable = await unavailablePage.evaluate(() => Today.use('gmail').rankCandidates('Book haircut', [{
    threadId: 'not-a-fallback', from: 'Salon <hi@salon.se>', subject: 'Haircut booking confirmed', snippet: 'Your haircut appointment',
  }]));
  assert(unavailable.status === 'ranking-unavailable' && !unavailable.result,
    'an unavailable ranking library abstains instead of reverting to an unchecked first hit', unavailable);
  await unavailableContext.close();

  const diagnostics = await page.evaluate(async () => {
    window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ isComm: false, searchQuery: '' }) });
    for (let i = 0; i < 22; i++) await _gmailEnrichTask('gmail_diagnostic_' + i, 'Call aunt');
    const before = Today.use('gmail').observationAudit();
    gmailDisconnect();
    return { schema: before.schema, count: before.entries.length,
      firstTask: before.entries[0]?.taskId, lastTask: before.entries.at(-1)?.taskId,
      cleared: localStorage.getItem('gmail_diagnostics_v1') === null };
  });
  assert(diagnostics.schema === 1 && diagnostics.count === 20
      && diagnostics.lastTask === 'gmail_diagnostic_21' && diagnostics.cleared,
    'local Gmail diagnostic is bounded and cleared with the connection', diagnostics);

  console.log(`\nGmail tests passed (${passed} checks).`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
