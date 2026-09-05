// Client and Netlify task-enrichment regression tests. No live provider calls.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
  '.png':'image/png', '.woff2':'font/woff2', '.css':'text/css' };
const require = createRequire(import.meta.url);
const { handler } = require('../netlify/functions/task-enrich.js');

let passed = 0;
const ok = message => { console.log('  ✓ ' + message); passed++; };
const assert = (condition, message, detail) => {
  if (condition) return ok(message);
  console.error('✗ FAIL — ' + message);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  throw new Error(message);
};
const event = (body, method = 'POST') => ({ httpMethod: method, body: typeof body === 'string' ? body : JSON.stringify(body) });

const oldEnvKey = process.env.ANTHROPIC_API_KEY;
const oldFetch = global.fetch;
delete process.env.ANTHROPIC_API_KEY;
try {
  const method = await handler(event({}, 'GET'));
  const invalid = await handler(event('{'));
  const noKey = await handler(event({ taskText: 'Find paint' }));
  assert(method.statusCode === 405 && invalid.statusCode === 400 && noKey.statusCode === 400,
    'function rejects wrong methods, malformed JSON, and missing keys');

  let providerRequest;
  global.fetch = async (_url, options) => {
    providerRequest = options;
    return { ok: true, json: async () => ({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({
        icon: '↗', headline: 'A'.repeat(60), body: 'B'.repeat(100),
        cta: { label: 'Reveal details', href: 'https://example.com/item' },
      }) }],
    }) };
  };
  const success = await handler(event({ taskText: 'Find paint price', apiKey: ' client-key\n' }));
  const card = JSON.parse(success.body).card;
  const sent = JSON.parse(providerRequest.body);
  assert(success.statusCode === 200 && providerRequest.headers['x-api-key'] === 'client-key'
      && sent.model === 'claude-sonnet-5' && sent.tools[0].type === 'web_search_20260209',
    'function forwards the sanitized client key and expected provider contract');
  assert(card.headline.length === 40 && card.body.length === 80 && card.cta.label.length === 10
      && card.cta.href === 'https://example.com/item',
    'provider cards are length-bounded and retain HTTPS actions', card);

  global.fetch = async () => ({ ok: true, json: async () => ({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: '{"headline":"Unsafe","cta":{"href":"http://example.com"}}' }],
  }) });
  const unsafe = JSON.parse((await handler(event({ taskText: 'Find a thing', apiKey: 'key' }))).body).card;
  assert(unsafe.headline === 'Unsafe' && unsafe.cta === null, 'function rejects non-HTTPS actions without discarding useful text', unsafe);

  global.fetch = async () => ({ ok: false, status: 500, text: async () => 'provider down' });
  const degraded = await handler(event({ taskText: 'Find a thing', apiKey: 'key' }));
  assert(degraded.statusCode === 200 && JSON.parse(degraded.body).card === null,
    'provider failure degrades to a null card instead of a function error');
} finally {
  global.fetch = oldFetch;
  if (oldEnvKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = oldEnvKey;
}

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

let browser;
try {
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--disable-extensions'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._agentEnrichTask === 'function');

  const client = await page.evaluate(async () => {
    const calls = [];
    localStorage.setItem('today_ai_key_claude', 'browser-key');
    localStorage.setItem('today_ai_provider', 'claude');
    window.fetch = async (_url, options = {}) => {
      calls.push(JSON.parse(options.body || '{}'));
      return { ok: true, status: 200, json: async () => ({ card: {
        icon: '↗', headline: 'Paint shop', body: 'Open until 18:00',
        cta: { label: 'Visit', href: 'https://example.com/paint' },
      } }) };
    };
    const row = document.createElement('div');
    row.className = 'task'; row.dataset.taskid = 'agent_success';
    row.innerHTML = '<span class="task-text"><span class="task-tail"></span></span>';
    document.body.appendChild(row);
    await _agentEnrichTask('agent_success', 'Find white paint replacement');
    const cached = JSON.parse(localStorage.getItem('agent_enrichment_agent_success'));
    const indicator = row.querySelector('.agent-indicator');
    return { calls, cached, label: indicator?.getAttribute('aria-label') };
  });
  assert(client.calls.length === 1 && client.calls[0].apiKey === 'browser-key'
      && client.cached.state === 'success' && client.label === 'Web context available — start a focus session',
    'client sends its key, caches a successful card, and renders a named indicator', client);

  const noResult = await page.evaluate(async () => {
    let calls = 0;
    window.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ({ card: null }) }; };
    await _agentEnrichTask('agent_none', 'Research paint brands');
    await _agentEnrichTask('agent_none', 'Research paint brands');
    return { calls, cached: JSON.parse(localStorage.getItem('agent_enrichment_agent_none')) };
  });
  assert(noResult.calls === 1 && noResult.cached.state === 'no_result',
    'no-result responses are cached and not requested repeatedly', noResult);

  const transient = await page.evaluate(async () => {
    let calls = 0;
    window.fetch = async () => { calls++; return { ok: false, status: 503, json: async () => ({}) }; };
    await _agentEnrichTask('agent_retry', 'Find paint hours');
    await _agentEnrichTask('agent_retry', 'Find paint hours');
    return { calls, cached: localStorage.getItem('agent_enrichment_agent_retry') };
  });
  assert(transient.calls === 2 && transient.cached === null,
    'transient failures remain retryable and are not cached', transient);

  const plainCalls = await page.evaluate(async () => {
    let calls = 0;
    window.fetch = async () => { calls++; return { ok: true, status: 200, json: async () => ({ card: null }) }; };
    await _agentEnrichTask('agent_plain', 'Buy milk');
    return calls;
  });
  assert(plainCalls === 0, 'plain tasks do not trigger enrichment requests', plainCalls);

  console.log(`\nTask-enrichment tests passed (${passed} checks).`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
