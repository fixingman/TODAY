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

try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--disable-extensions'] });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('gmail_access_token', 'access-test');
    localStorage.setItem('gmail_refresh_token', 'refresh-test');
    localStorage.setItem('gmail_token_expiry', String(Date.now() + 3600000));
  });
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._gmailBuildQueryFallback === 'function');

  const fallback = await page.evaluate(() => ({
    topic: _gmailBuildQueryFallback('Follow up on the three proposals we sent last week'),
    topicUnsent: _gmailBuildQueryFallback('Follow up on renewal'),
    person: _gmailBuildQueryFallback('Reply to Maria about the contract'),
    multi: _gmailBuildQueryFallback('Email Ada Lovelace about the draft'),
    empty: _gmailBuildQueryFallback(''),
  }));
  assert(fallback.topic === '"three proposals" in:sent' && fallback.topicUnsent === 'subject:renewal'
      && !fallback.topic.includes('from:'),
    'topic fallback searches the subject matter in Sent instead of inventing a person', fallback);
  assert(fallback.person === 'from:Maria OR to:Maria' && fallback.multi === 'from:"Ada Lovelace" OR to:"Ada Lovelace"' && fallback.empty === '',
    'person fallback keeps explicit addressees and handles empty input', fallback);

  const classified = await page.evaluate(async () => {
    const calls = [];
    window.fetch = async (url, options = {}) => {
      calls.push({ url: String(url), body: options.body || '' });
      if (String(url).includes('/ai-assist')) {
        return { ok: true, status: 200, json: async () => ({ isComm: true, searchQuery: '"three proposals" in:sent' }) };
      }
      return { ok: true, status: 200, json: async () => ({ threads: [] }) };
    };
    await _gmailEnrichTask('gmail_topic_ai', 'Follow up on the three proposals we sent last week');
    const ai = calls.find(c => c.url.includes('/ai-assist'));
    const gmail = calls.find(c => c.url.includes('gmail.googleapis.com'));
    return { prompt: JSON.parse(ai.body).systemPrompt, gmailUrl: gmail.url };
  });
  const classifiedQuery = new URL(classified.gmailUrl).searchParams.get('q');
  assert(classified.prompt.includes('Topic-targeted') && classified.prompt.includes('never invent a person')
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
      cached: JSON.parse(localStorage.getItem('gmail_classify_gmail_topic_fallback')),
    };
  });
  assert(degraded.query === '"three proposals" in:sent' && degraded.cached.searchQuery === degraded.query,
    'AI failure falls back to the same topic-safe query and caches the classification', degraded);

  const cache = await page.evaluate(async () => {
    localStorage.setItem('gmail_classify_gmail_cached', JSON.stringify({ isComm: true, searchQuery: '"renewal" in:sent' }));
    const calls = [];
    window.fetch = async (url) => {
      calls.push(String(url));
      return { ok: true, status: 200, json: async () => ({ threads: [] }) };
    };
    await _gmailEnrichTask('gmail_cached', 'Follow up on renewal');
    return calls;
  });
  assert(cache.length === 1 && cache[0].includes('gmail.googleapis.com') && !cache[0].includes('/ai-assist'),
    'topic-operator classifications remain valid cache entries', cache);

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

  console.log(`\nGmail tests passed (${passed} checks).`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
