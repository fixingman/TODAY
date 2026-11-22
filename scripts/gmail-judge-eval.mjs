// Hand-run evaluation of the Gmail email-context judge (not part of CI).
//
// Drives the real app code (content words → search → candidates → judge prompt →
// grounding) in a headless browser against a fictional mailbox. Only the judge call
// leaves the machine: it goes through TODAY's own netlify/functions/ai-assist.js
// handler to the real Claude model, using a key you supply. No real email is read.
//
//   TODAY_EVAL_CLAUDE_KEY=sk-ant-… node scripts/gmail-judge-eval.mjs
//
// Reports search recall (was the right conversation among the candidates?) separately
// from judge accuracy. Pass bar: zero wrong picks and at least 4 of 5 clear matches.
// Run before the first push and after every change to the judge prompt.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.TODAY_EVAL_CLAUDE_KEY || '';
if (!KEY) { console.error('Set TODAY_EVAL_CLAUDE_KEY to run the judge evaluation.'); process.exit(2); }
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { handler } = createRequire(import.meta.url)(join(ROOT, 'netlify/functions/ai-assist.js'));
const puppeteer = (await import('puppeteer-core')).default;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' };

// Fictional cases. expect: thread ID that is clearly the context, or null (must abstain).
// clear: counts toward the "4 of 5 clear matches" bar.
const m = (subject, from, snippet, sent = false) => ({ subject, from, snippet, sent });
const CASES = [
  { task: 'Pay rent', expect: 'rent-dec', clear: true, mailbox: {
    'rent-dec': [m('Rent for December', 'Lena Berg <lena@landlord.example>', 'Hi, the December rent of 9 500 kr is due on 28 Nov, same account as before.')],
    'rent-car': [m('Parking rent', 'City Parking <noreply@parking.example>', 'Your parking space rent is renewed for 2027.')],
    'news': [m('Weekly news', 'News <news@example.test>', 'Ten ideas for the weekend')] } },
  { task: 'Pay Acme invoice', expect: 'acme-new', clear: true, mailbox: {
    'acme-old': [m('Acme invoice 3901', 'Acme Billing <billing@acme.example>', 'Invoice 3901 for 2025 is paid, thank you.')],
    'acme-new': [m('Acme invoice 4411', 'Acme Billing <billing@acme.example>', 'Invoice 4411 attached, total 1 200 kr, due 30 Nov.'),
      m('Re: Acme invoice 4411', 'Me <me@example.test>', 'Thanks, will pay this week', true)] } },
  { task: 'Apartment board meeting', expect: 'board', clear: true, mailbox: {
    'board': [m('Board meeting moved', 'Housing board <board@brf.example>', 'The apartment board meets Thursday 18:00 in the lobby instead of Wednesday.')],
    'gym': [m('Your meeting room booking', 'Gym <hi@gym.example>', 'Meeting room 2 is booked for Saturday.')] } },
  { task: 'Reply to Maria about the contract', expect: 'maria', clear: true, mailbox: {
    'maria': [m('Contract draft v2', 'Maria Lind <maria@studio.example>', 'Could you confirm clause 4 by Friday? Otherwise we sign as is.')],
    'sam': [m('Contract signed', 'Sam Ek <sam@agency.example>', 'The signed contract is attached for your records.')] } },
  { task: 'Book haircut', expect: 'salon', clear: true, mailbox: {
    'salon': [m('Your appointment is confirmed', 'Studio Klipp <hej@klipp.example>', 'Haircut with Jonas, Tue 3 Dec at 10:00. Reply to change.')],
    'dentist': [m('Appointment confirmed', 'Dentist <hi@dentist.example>', 'Your dental check-up is on 9 Dec at 08:30.')] } },
  // Near-misses and no-match: the judge must abstain.
  { task: 'Pay rent', expect: null, mailbox: {
    'other-landlord': [m('Rent receipt 2024', 'Old Landlord <old@previous.example>', 'Receipt for rent paid in March 2024, archived.')] } },
  { task: 'Pay Acme invoice', expect: null, mailbox: {
    'acme-paid': [m('Acme invoice 3901', 'Acme Billing <billing@acme.example>', 'Invoice 3901 for last year is paid in full, thank you.')] } },
  { task: 'Water the plants', expect: null, mailbox: {
    'plant-shop': [m('Spring sale on plants', 'Plant Shop <offers@plants.example>', '20% off all plants this weekend.')] } },
  { task: 'Call mum', expect: null, mailbox: {
    'mumsnet': [m('Top threads this week', 'Mum forum <digest@forum.example>', 'What parents are discussing this week')] } },
  { task: 'Reply about the contract', expect: null, mailbox: {
    'a': [m('Contract', 'Sam Ek <sam@agency.example>', 'The contract is ready for review.')],
    'b': [m('Contract', 'Alex Ro <alex@firm.example>', 'The contract is ready for review.')] } },
  { task: 'Renew passport', expect: 'police', clear: false, mailbox: {
    'police': [m('Passport appointment booked', 'Passport office <noreply@police.example>', 'Your passport appointment is 12 Dec 09:15, bring your old passport.')] } },
  // Grounding stress: two amounts in one preview.
  { task: 'Pay the bank', expect: 'bank', clear: false, amounts: ['700'], mailbox: {
    'bank': [m('Your card balance', 'Bank <info@bank.example>', 'Previous balance 500 kr. Current balance 700 kr, due 1 Dec.')] } },
];

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  try { const body = await readFile(join(ROOT, path)); res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--disable-extensions'] });
const results = [];
try {
  for (const [n, c] of CASES.entries()) {
    const page = await browser.newPage();
    await page.exposeFunction('__realJudge', async body => {
      const out = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ ...JSON.parse(body), apiKey: KEY }) });
      return { status: out.statusCode, body: out.body };
    });
    await page.evaluateOnNewDocument(mailbox => {
      for (const [k, v] of Object.entries({ splash_shown_at: String(Date.now()), today_ai_provider: 'claude', today_ai_key_claude: 'eval-placeholder',
        gmail_access_token: 'fictional', gmail_refresh_token: 'fictional', gmail_token_expiry: String(Date.now() + 3600000) })) localStorage.setItem(k, v);
      window.__eval = { candidates: [] };
      const original = window.fetch.bind(window);
      window.fetch = async (url, options = {}) => {
        const u = String(url);
        if (u.includes('/ai-assist')) {
          const sent = JSON.parse(options.body || '{}');
          if (sent.surface !== 'gmail-judge') return { ok: true, status: 200, json: async () => ({ content: '' }) };
          __eval.candidates = JSON.parse(sent.messages[0].content).conversations.map(cv => cv.index);
          __eval.threadOrder = __eval.lastIds;
          const r = await window.__realJudge(options.body);
          __eval.reply = r.body;
          return { ok: r.status === 200, status: r.status, json: async () => JSON.parse(r.body) };
        }
        if (!u.includes('gmail.googleapis.com')) return original(url, options);
        const parsed = new URL(u);
        if (parsed.pathname.endsWith('/threads')) {
          const core = parsed.searchParams.get('q').replace(/\) newer_than:90d -from:calendar-notification@google\.com$/, '').replace(/^\(/, '');
          const or = /^\{(.+)\}$/.exec(core), words = (or ? or[1] : core).split(' ');
          const ids = Object.entries(mailbox).filter(([, msgs]) => { const t = msgs.map(x => x.subject + ' ' + x.from + ' ' + x.snippet).join(' ').toLowerCase();
            return or ? words.some(w => t.includes(w)) : words.every(w => t.includes(w)); }).map(([id]) => id);
          __eval.lastIds = [...new Set([...(__eval.lastIds || []), ...ids])].slice(0, 5);
          return { ok: true, status: 200, json: async () => ({ threads: ids.map(id => ({ id })) }) };
        }
        const id = decodeURIComponent(parsed.pathname.split('/').at(-1));
        return { ok: true, status: 200, json: async () => ({ id, messages: (mailbox[id] || []).map((x, i) => ({ id: id + i, labelIds: x.sent ? ['SENT'] : ['INBOX'],
          snippet: x.snippet, payload: { headers: [{ name: 'Subject', value: x.subject }, { name: 'From', value: x.from }, { name: 'Date', value: 'Mon, 18 Nov 2026 10:00:00 +0100' }] } })) }) };
      };
    }, c.mailbox);
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window._gmailEnrichTask === 'function' && window.Today?.use('gmail')?.contentQuery);
    const out = await page.evaluate(async (task, n) => {
      const id = 'eval_' + n; manualTasks.push({ id, text: task });
      await _gmailEnrichTask(id, task);
      const e = JSON.parse(localStorage.getItem('gmail_enrichment_' + id) || 'null');
      return { picked: e?.threadId || null, detail: e?.detail || '', searched: __eval.lastIds || [], reply: __eval.reply || '',
        status: Today.use('gmail').observationAudit().entries.at(-1)?.status };
    }, c.task, n);
    await page.close();
    const recall = c.expect === null || out.searched.includes(c.expect);
    const correct = out.picked === c.expect;
    const wrong = out.picked !== null && out.picked !== c.expect;
    const amountOk = !c.amounts || !out.detail || c.amounts.every(a => out.detail.includes(a)) && !/\b500\b/.test(out.detail);
    results.push({ task: c.task, expect: c.expect, picked: out.picked, detail: out.detail, status: out.status, recall, correct, wrong: wrong || !amountOk, clear: !!c.clear });
    console.log(`${correct && amountOk ? '✓' : wrong || !amountOk ? '✗' : '·'} ${c.task.padEnd(36)} expect ${String(c.expect).padEnd(14)} got ${String(out.picked).padEnd(14)} ${out.status}${out.detail ? ' — ' + out.detail : ''}${recall ? '' : '  [search missed it]'}`);
    // Fictional fixtures only: show what the model returned when a case did not pass.
    if (!(correct && amountOk) && out.reply) console.log('    model reply: ' + out.reply);
  }
} finally { await browser.close(); server.close(); }
const clear = results.filter(r => r.clear), found = clear.filter(r => r.correct).length, wrongPicks = results.filter(r => r.wrong).length;
const recall = results.filter(r => r.expect !== null), recalled = recall.filter(r => r.recall).length;
console.log(`\nSearch recall: ${recalled}/${recall.length} · clear matches found: ${found}/${clear.length} · wrong picks: ${wrongPicks}`);
const pass = wrongPicks === 0 && found >= 4;
console.log(pass ? 'JUDGE EVAL PASSED' : 'JUDGE EVAL FAILED');
process.exit(pass ? 0 : 1);
