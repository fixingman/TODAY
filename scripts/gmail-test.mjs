// Gmail classification/query and focus-enrichment regression tests.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// The focus Gmail block is desktop-only. CI's headless Linux Chrome otherwise
// reports no hover-capable pointer, so focus mode never creates the block.
const DESKTOP_INPUT = '--blink-settings=availableHoverTypes=2,primaryHoverType=2,availablePointerTypes=4,primaryPointerType=4';

try {
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
      && classifiedQuery === '"three proposals" in:sent',
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
  assert(degraded.query === '"three proposals" in:sent' && degraded.cached === null,
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
        return { ok: true, status: 200, json: async () => ({ threads: query === '{from:gaia to:gaia} reservation' ? [{ id: 'gaia-thread' }] : [] }) };
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
  assert(gaiaRetry.queries.join('|') === 'subject:too-narrow|{from:gaia to:gaia} reservation'
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
  assert(gaiaDeclined.queries.join('|') === '{from:gaia to:gaia} reservation'
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
  assert(invalidQuery.queries.join('|') === '{from:gaia to:gaia} reservation'
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
        return { ok: true, status: 200, json: async () => ({ threads: query === '{from:gaia to:gaia} reservation' ? [{ id: 'focus-gaia' }] : [] }) };
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
      && new URL(cache[1]).searchParams.get('q') === 'subject:renewal',
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
    localStorage.setItem('gmail_enrichment_gmail_indicator', JSON.stringify({ fetchedAt: Date.now(), subject: 'Test' }));
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
