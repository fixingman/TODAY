// Gmail search → judge → grounding, ownership fences and focus/phone card regression tests.
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
  await page.waitForFunction(() => typeof window.Today?.use('gmail')?.contentQuery === 'function');
  assert(await page.evaluate(() => matchMedia('(hover: hover)').matches),
    'test browser exposes the desktop hover input required by focus mode');
  await page.evaluate(async () => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(location.origin + '\0' + localStorage.getItem('gmail_refresh_token')));
    window.__binding = taskText => ({ taskText, ownerPolicy:'owner-v2', connectionKey:Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('') });
    window.__mailOwner = (id, text) => {
      localStorage.removeItem('gmail_daily_v1');
      const task = manualTasks.find(t => t.id === id);
      if (task) task.text = text; else manualTasks.push({ id, text });
    };
    window.__enrich = (id, text) => { __mailOwner(id, text); return _gmailEnrichTask(id, text); };
    // These isolated component fixtures mount a visible timer; native Focus Escape is tested separately.
    window.__mailFocus = (id, text) => { const timer=document.querySelector('.focus-timer');timer.hidden=false;timer.classList.add('open');timer.style.maxHeight='800px';__mailOwner(id, text); Today.use('gmail').closeFocus(); _gmailRenderFocusBlock(id, text); };
  });

  await page.evaluate(() => {
    window.__pick = { index: 0, message: 0, evidence: 'ready', detail: 'Ready' };
    window.__msg = (subject, from, snippet, extra = {}) => ({ id: extra.id || ('msg-' + Math.random().toString(36).slice(2)),
      labelIds: extra.sent ? ['SENT'] : ['INBOX'], snippet, payload: { headers: [
        { name: 'Subject', value: subject }, { name: 'From', value: from }, { name: 'Date', value: extra.date || 'Mon, 5 Oct 2026 10:00:00 +0200' },
        ...(extra.messageId ? [{ name: 'Message-ID', value: '<' + extra.messageId + '>' }] : [])] } });
    // A fictional mailbox: Gmail-like AND / {OR} matching over headers and snippets, in insertion order.
    window.__mailbox = (threads, judge = () => ({ index: null }), hold) => {
      localStorage.removeItem('gmail_daily_v1');
      window.__threads = threads;
      const log = { queries: [], urls: [], judges: [], other: [] };
      window.fetch = async (url, options = {}) => {
        const u = String(url);
        if (u.includes('/ai-assist')) {
          const sent = JSON.parse(options.body || '{}');
          if (sent.surface !== 'gmail-judge') { log.other.push(sent); return { ok: true, status: 200, json: async () => ({ content: '' }) }; }
          const input = JSON.parse(sent.messages[0].content);
          log.judges.push({ sent, input });
          return { ok: true, status: 200, json: async () => judge(input, sent) };
        }
        if (!u.includes('gmail.googleapis.com')) return { ok: true, status: 200, json: async () => ({}) };
        log.urls.push(u);
        const parsed = new URL(u);
        if (hold) await hold(parsed);
        if (parsed.pathname.endsWith('/threads')) {
          const q = parsed.searchParams.get('q');
          log.queries.push(q);
          const core = q.replace(/\) newer_than:90d -from:calendar-notification@google\.com$/, '').replace(/^\(/, '');
          const or = /^\{(.+)\}$/.exec(core), words = (or ? or[1] : core).split(' ').filter(Boolean);
          const hits = Object.entries(__threads).filter(([, messages]) => {
            const text = messages.map(m => m.payload.headers.map(h => h.value).join(' ') + ' ' + m.snippet).join(' ').toLowerCase();
            return or ? words.some(w => text.includes(w)) : words.every(w => text.includes(w));
          }).map(([id]) => ({ id }));
          return { ok: true, status: 200, json: async () => ({ threads: hits.slice(0, Number(parsed.searchParams.get('maxResults')) || 5) }) };
        }
        const id = decodeURIComponent(parsed.pathname.split('/').at(-1));
        return { ok: true, status: 200, json: async () => ({ id, messages: __threads[id] || [] }) };
      };
      return log;
    };
    // Judge stand-in: choose the conversation whose subject has `word`, copying `evidence` from it.
    window.__bySubject = (word, evidence, detail, message) => input => {
      const index = input.conversations.findIndex(c => c.subject.toLowerCase().includes(word));
      if (index < 0) return { index: null };
      const found = input.conversations[index].messages.findIndex(m => m.text.includes(evidence));
      return { index, message: message ?? (found < 0 ? 0 : found), evidence, detail: detail ?? evidence };
    };
    window.__audit = () => Today.use('gmail').observationAudit();
    window.__check = id => JSON.parse(localStorage.getItem('gmail_check_' + id) || 'null');
    window.__until = async (predicate, label) => {
      for (let i = 0; i < 300 && !predicate(); i++) await new Promise(r => setTimeout(r, 10));
      if (!predicate()) throw new Error('Timed out: ' + label);
    };
  });

  const words = await page.evaluate(() => { const q = Today.use('gmail').contentQuery; return {
    rent: q('Pay rent'), mum: q('Call mum'), maria: q('Reply to Maria about the contract'),
    proposals: q('Follow up on the three proposals we sent last week'), number: q('Pay 500 to the landlord'),
    long: q('Prepare apartment board meeting agenda budget renovation'), empty: q('Do it today') }; });
  assert(words.rent === 'rent' && words.mum === 'mum' && words.maria === 'maria contract' && words.proposals === 'three proposals'
      && words.number === 'landlord' && words.long === 'apartment meeting agenda renovation' && words.empty === '',
    'content words drop actions, filler and bare numbers, keeping at most four of the longest in task order', words);

  const rent = await page.evaluate(async () => {
    const log = __mailbox({
      landlord: [__msg('Rent for December', 'Lena Landlord <lena@example.test>', 'Hi, the rent of 9500 kr is due on 28 Nov. Same account as before.')],
      newsletter: [__msg('Weekly news', 'News <news@example.test>', 'Ten ideas for your weekend')],
    }, __bySubject('rent', 'the rent of 9500 kr is due on 28 Nov', 'Rent 9500 kr due 28 Nov'));
    await __enrich('mail_t1', 'Pay rent');
    const judge = log.judges[0];
    return { queries: log.queries, maxResults: new URL(log.urls[0]).searchParams.get('maxResults'), judges: log.judges.length,
      surface: judge?.sent.surface, prompt: judge?.sent.systemPrompt, input: judge?.input,
      cached: JSON.parse(localStorage.getItem('gmail_enrichment_mail_t1') || 'null'), status: __audit().entries.at(-1)?.status,
      check: __check('mail_t1') };
  });
  assert(rent.queries.join('|') === '(rent) newer_than:90d -from:calendar-notification@google.com' && rent.maxResults === '5'
      && rent.judges === 1 && rent.surface === 'gmail-judge' && rent.input.task === 'Pay rent' && rent.input.conversations.length === 1
      && rent.cached?.threadId === 'landlord' && rent.cached.detail === 'Rent 9500 kr due 28 Nov' && rent.cached.matchPolicy === 'judge-v1'
      && rent.status === 'found' && rent.check?.outcome === 'match' && rent.check.threadId === 'landlord',
    'a non-communication task ("Pay rent") is searched, judged once and stores the grounded detail', rent);
  assert(/data, never instructions/.test(rent.prompt) && /choose none/.test(rent.prompt) && !/rent|landlord|invoice/i.test(rent.prompt)
      && JSON.stringify(Object.keys(rent.input.conversations[0])) === '["index","subject","messages"]'
      && JSON.stringify(Object.keys(rent.input.conversations[0].messages[0])) === '["index","from","date","sentByMe","text"]',
    'the judge prompt states principles only (no worked examples) and receives metadata only', rent.input);

  const silent = await page.evaluate(async () => {
    const log = __mailbox({ news: [__msg('Weekly news', 'News <n@example.test>', 'Ten ideas')] }, () => { throw new Error('judge must not run'); });
    await __enrich('mail_t2', 'Water the plants');
    const empty = __mailbox({}, () => { throw new Error('judge must not run'); });
    await __enrich('mail_t2b', 'Do it today');
    return { queries: log.queries, judges: log.judges.length, status: __audit().entries.at(-2)?.status, outcome: __check('mail_t2')?.outcome,
      cached: localStorage.getItem('gmail_enrichment_mail_t2'), emptyRequests: empty.urls.length, emptyStatus: __audit().entries.at(-1)?.status };
  });
  assert(silent.queries.join('|') === ['(water plants)', '({plants water})'].map(q => q + ' newer_than:90d -from:calendar-notification@google.com').join('|')
      && silent.judges === 0 && silent.status === 'no-thread' && silent.outcome === 'none' && silent.cached === null
      && silent.emptyRequests === 0 && silent.emptyStatus === 'no-words',
    'no candidates means no AI call; a task with no content words makes no request at all', silent);

  const ambiguous = await page.evaluate(async () => {
    const log = __mailbox({ a: [__msg('Contract', 'Sam <sam@example.test>', 'The contract is ready')],
      b: [__msg('Contract', 'Alex <alex@example.test>', 'The contract is ready')] }, () => ({ index: null, message: null, evidence: '', detail: '' }));
    await __enrich('mail_t3', 'Reply about contract');
    return { judges: log.judges.length, candidates: log.judges[0]?.input.conversations.length, cached: localStorage.getItem('gmail_enrichment_mail_t3'),
      status: __audit().entries.at(-1)?.status, outcome: __check('mail_t3')?.outcome };
  });
  assert(ambiguous.judges === 1 && ambiguous.candidates === 2 && ambiguous.cached === null && ambiguous.status === 'none' && ambiguous.outcome === 'none',
    'when the judge abstains (unrelated or ambiguous), nothing is shown and the completed check is recorded', ambiguous);

  const widened = await page.evaluate(async () => {
    const log = __mailbox({ board: [__msg('Board meeting moved', 'Housing board <board@example.test>', 'The board meets Thursday 18:00 in the lobby')] },
      __bySubject('board', 'The board meets Thursday 18:00 in the lobby', 'Board meets Thursday 18:00 in the lobby'));
    await __enrich('mail_t4', 'Apartment board meeting');
    const full = __mailbox(Object.fromEntries(Array.from({ length: 6 }, (_, i) => ['acme' + i, [__msg('Acme invoice ' + i, 'Acme <billing@acme.test>', 'Invoice ' + i + ' attached')]])));
    await __enrich('mail_t5', 'Acme invoice');
    return { queries: log.queries, cached: JSON.parse(localStorage.getItem('gmail_enrichment_mail_t4') || 'null'),
      fullQueries: full.queries.length, fullCandidates: full.judges[0]?.input.conversations.length, threadFetches: full.urls.filter(u => !u.includes('/threads?')).length };
  });
  assert(widened.queries.length === 2 && widened.queries[1] === '({apartment meeting}) newer_than:90d -from:calendar-notification@google.com'
      && widened.cached?.threadId === 'board' && widened.cached.searchQuery === '{apartment meeting}'
      && widened.fullQueries === 1 && widened.fullCandidates === 5 && widened.threadFetches === 5,
    'an empty AND search widens once to the OR of the two most distinctive words; five AND results never widen and stay capped at five', widened);

  const calendar = await page.evaluate(async () => {
    const log = __mailbox({
      cal: [__msg('Haircut', 'Google Calendar <calendar-notification@google.com>', 'Reminder haircut 10:00')],
      mixed: [__msg('Haircut booking', 'Salon <hi@salon.test>', 'Your haircut is booked for Tue 10:00'),
        __msg('Haircut', 'CALENDAR-NOTIFICATION@GOOGLE.COM', 'Reminder haircut')],
    }, __bySubject('booking', 'Your haircut is booked for Tue 10:00'));
    await __enrich('mail_t6', 'Book haircut');
    const input = log.judges[0]?.input;
    return { query: log.queries[0], conversations: input?.conversations.length, messages: input?.conversations[0]?.messages.length,
      from: JSON.parse(localStorage.getItem('gmail_enrichment_mail_t6') || 'null')?.from };
  });
  assert(calendar.query.endsWith('-from:calendar-notification@google.com') && calendar.conversations === 1 && calendar.messages === 1
      && calendar.from === 'Salon <hi@salon.test>',
    'calendar notifications are excluded in the query and again inside every conversation', calendar);

  const shape = await page.evaluate(async () => {
    const acme = 'Acme Billing <billing@acme.test>', me = 'Me <me@example.test>';
    const log = __mailbox({ inv: [
      __msg('Invoice 4411', acme, 'Invoice 4411 attached, total 1200 kr due 30 Nov'),
      __msg('Re: Invoice 4411', me, 'Thanks, I will check', { sent: true }),
      __msg('Re: Invoice 4411', acme, 'Just checking you got it'),
      __msg('Re: Invoice 4411', me, 'Yes got it', { sent: true }),
      __msg('Re: Invoice 4411', me, 'Paying today', { sent: true }),
    ] }, __bySubject('invoice', 'Invoice 4411 attached, total 1200 kr due 30 Nov', '1200 kr due 30 Nov, invoice 4411', 0));
    await __enrich('mail_t7', 'Pay Acme invoice');
    const sent = log.judges[0]?.input.conversations[0];
    const cached = JSON.parse(localStorage.getItem('gmail_enrichment_mail_t7') || 'null');
    __mailFocus('mail_t7', 'Pay Acme invoice');
    await __until(() => document.querySelector('#focusGmailBlock .focus-gmail-thread'), 'invoice card');
    const block = document.getElementById('focusGmailBlock');
    const out = { texts: sent?.messages.map(m => m.text), sentByMe: sent?.messages.map(m => m.sentByMe), subject: sent?.subject,
      snippet: cached?.snippet, replyFrom: cached?.replyFrom, from: cached?.from,
      detail: block.querySelector('.focus-gmail-detail')?.textContent, link: block.querySelector('.focus-gmail-open')?.getAttribute('href'),
      fromEmail: block.dataset.fromEmail };
    block.querySelector('.focus-gmail-draft-btn')?.click();
    await __until(() => log.other.length, 'draft request');
    out.draftContext = log.other[0].messages[0].content;
    Today.use('gmail').closeFocus();
    // Every message is Can's own: no reply target, so no Draft reply.
    __mailbox({ slides: [__msg('Slides for Maria', me, 'Hi Maria, slides attached for Friday', { sent: true })] },
      __bySubject('slides', 'slides attached for Friday', 'Slides sent for Friday'));
    await __enrich('mail_t8', 'Send Maria the slides');
    __mailFocus('mail_t8', 'Send Maria the slides');
    await __until(() => document.querySelector('#focusGmailBlock .focus-gmail-thread'), 'slides card');
    out.ownOnlyDraft = !!document.querySelector('#focusGmailBlock .focus-gmail-draft-btn');
    out.ownOnlyOpen = !!document.querySelector('#focusGmailBlock .focus-gmail-open');
    Today.use('gmail').closeFocus();
    return out;
  });
  assert(JSON.stringify(shape.texts) === JSON.stringify(['Invoice 4411 attached, total 1200 kr due 30 Nov', 'Yes got it', 'Paying today'])
      && JSON.stringify(shape.sentByMe) === '[false,true,true]' && shape.subject === 'Invoice 4411',
    'one candidate per conversation: subject once, first message plus the latest two', shape);
  assert(shape.snippet === 'Invoice 4411 attached, total 1200 kr due 30 Nov' && shape.detail === '1200 kr due 30 Nov, invoice 4411'
      && shape.link?.endsWith('#all/inv') && shape.fromEmail === 'billing@acme.test' && shape.draftContext.includes('Just checking you got it')
      && !shape.ownOnlyDraft && shape.ownOnlyOpen,
    'an older evidence message is shown with its detail; replies target the latest message not sent by Can; own-only threads offer no Draft reply', shape);

  const grounding = await page.evaluate(() => {
    const ground = Today.use('gmail').ground;
    const conversation = { threadId: 'bank', subject: 'Your balance', messages: [
      { gid: '1', subject: 'Your balance', from: 'Bank <bank@example.test>', snippet: 'Previous balance 500 kr; current balance 700 kr due 1 Dec' },
      { gid: '2', subject: 'Re: Your balance', from: 'Bank <bank@example.test>', snippet: 'Thanks for your message' }] };
    const pick = (evidence, detail, message = 0, task = 'Pay the bank') => !!ground(task, conversation, { index: 0, message, evidence, detail });
    const out = {
      grounded: pick('current balance 700 kr due 1 Dec', '700 kr due 1 Dec'),
      invented: pick('current balance 900 kr', '900 kr'),
      neighbouringNumber: pick('current balance 700 kr', 'Pay 500 kr'),
      missingDate: pick('current balance 700 kr', '700 kr due Friday'),
      echo: pick('current balance', 'Balance', 0, 'Pay balance'),
      wrongMessage: pick('current balance 700 kr', '700 kr', 1),
      reworded: pick('current balance 700 kr', '700 kr current', 0),
    };
    const rent = { threadId: 'rent', subject: 'Rent', messages: [{ gid: 'r', subject: 'Rent', from: 'Lena <l@example.test>',
      snippet: 'The December rent of 9 500 kr is due on 28 Nov' }] };
    const pay = detail => !!ground('Pay rent', rent, { index: 0, message: 0, evidence: 'The December rent of 9 500 kr is due on 28 Nov', detail });
    out.spaced = pay('December rent 9,500 kr due 28 Nov') && pay('December rent 9500 kr due 28 Nov') && pay('December rent 9 500 kr due 28 Nov');
    out.otherAmount = pay('December rent 9 000 kr due 28 Nov') || pay('December rent 500 kr due 28 Nov');
    const cut = { threadId: 'salon', subject: 'Confirmed', messages: [{ gid: 's', subject: 'Confirmed', from: 'Salon <s@example.test>', snippet: 'Haircut with Jonas, Tue 3 Dec at 10:00.' }] };
    const book = detail => !!ground('Book haircut', cut, { index: 0, message: 0, evidence: 'Haircut with Jonas, Tue 3 Dec at 10:00.', detail });
    out.dayNames = book('Jonas on Tuesday, 3 December at 10:00') && !book('Jonas on Thursday, 3 Dec at 10:00') && !book('Jonas on Tue 3 Jan at 10:00');
    return out;
  });
  assert(grounding.grounded && !grounding.invented && !grounding.neighbouringNumber && !grounding.missingDate && !grounding.echo
      && !grounding.wrongMessage && grounding.reworded && grounding.spaced && !grounding.otherAmount && grounding.dayNames,
    'grounding compares numbers by digits ("9 500" = "9,500", never 500) and day/month names by short form ("Tuesday" = "Tue", never Thursday), and needs an exact quote from the chosen message holding every number and date, and a fact the task did not already say', grounding);

  const fingerprint = await page.evaluate(async () => {
    const log = __mailbox({ landlord: [__msg('Rent for December', 'Lena <lena@example.test>', 'The rent of 9500 kr is due on 28 Nov', { id: 'r1' })] },
      __bySubject('rent', 'The rent of 9500 kr is due on 28 Nov', 'Rent 9500 kr due 28 Nov'));
    await __enrich('mail_fp', 'Pay rent');
    const savedTasks = manualTasks; manualTasks = manualTasks.filter(t => t.id === 'mail_fp');
    const yesterday = () => { const c = __check('mail_fp'); localStorage.setItem('gmail_check_mail_fp', JSON.stringify({ ...c, day: '2000-01-01' })); localStorage.removeItem('gmail_enrichment_mail_fp'); };
    // Expired match, unchanged mailbox: the re-check searches but asks the AI nothing.
    yesterday(); Today.use('gmail').recheck();
    await __until(() => localStorage.getItem('gmail_enrichment_mail_fp'), 'unchanged re-check');
    const unchanged = { judges: log.judges.length, status: __audit().entries.at(-1).status };
    // Checked today (match or no match) is not re-checked.
    const before = log.urls.length; localStorage.removeItem('gmail_enrichment_mail_fp'); Today.use('gmail').recheck();
    await new Promise(r => setTimeout(r, 50));
    const skipped = log.urls.length === before;
    // A new reply changes the fingerprint: the AI is asked again.
    __threads.landlord.push(__msg('Re: Rent for December', 'Lena <lena@example.test>', 'Please use the new account number', { id: 'r2' }));
    yesterday(); Today.use('gmail').recheck();
    await __until(() => localStorage.getItem('gmail_enrichment_mail_fp'), 'changed re-check');
    // Editing the task invalidates reuse even though mail is unchanged.
    __mailOwner('mail_fp', 'Pay December rent'); await __enrich('mail_fp', 'Pay December rent');
    const judgesAfterChange = log.judges.length; manualTasks = [...savedTasks.filter(t => t.id !== 'mail_fp'), ...manualTasks];
    return { unchanged, skipped, judgesAfterChange };
  });
  assert(fingerprint.unchanged.judges === 1 && fingerprint.unchanged.status === 'unchanged-match' && fingerprint.skipped
      && fingerprint.judgesAfterChange === 3,
    'an unchanged mailbox costs no AI call; a new message or an edited task asks again; checked-today tasks are skipped', fingerprint);

  const rejection = await page.evaluate(async () => {
    const log = __mailbox({ draft: [__msg('Contract draft', 'Sam <sam@example.test>', 'The contract draft is ready for comments')],
      signed: [__msg('Contract signed', 'Alex <alex@example.test>', 'The signed contract is attached')] },
      input => { const i = input.conversations.findIndex(c => c.subject === 'Contract draft');
        return i >= 0 ? { index: i, message: 0, evidence: 'The contract draft is ready for comments', detail: 'Draft ready for comments' }
          : { index: input.conversations.findIndex(c => c.subject === 'Contract signed'), message: 0, evidence: 'The signed contract is attached', detail: 'Signed contract attached' }; });
    await __enrich('mail_rej', 'Reply about contract');
    __mailFocus('mail_rej', 'Reply about contract');
    await __until(() => document.querySelector('#focusGmailBlock [data-today-click="gmail.context"]'), 'feedback controls');
    document.querySelector('#focusGmailBlock [data-today-click="gmail.context"]').click();
    await __until(() => __check('mail_rej')?.rejected?.includes('draft'), 'rejection mirrored');
    Today.use('gmail').closeFocus();
    // The 24 h match expires; the rejection outlives it and the next lookup never shows the draft thread.
    localStorage.removeItem('gmail_enrichment_mail_rej');
    const before = log.urls.length;
    await __enrich('mail_rej', 'Reply about contract');
    const later = log.urls.slice(before);
    const cached = JSON.parse(localStorage.getItem('gmail_enrichment_mail_rej') || 'null');
    const today = Object.values(__audit().days).at(-1);
    // Rewording the task forgets its rejections.
    __mailOwner('mail_rej', 'Reply about the signed contract'); Today.use('gmail').cleanup();
    return { cached: cached?.threadId, carried: cached?.feedback?.context?.rejectedThreads, maxResults: new URL(later[0]).searchParams.get('maxResults'),
      fetchedDraft: later.some(u => u.includes('/threads/draft')), rejections: today?.rejections, reworded: __check('mail_rej') };
  });
  assert(rejection.cached === 'signed' && JSON.stringify(rejection.carried) === '["draft"]' && rejection.maxResults === '6'
      && !rejection.fetchedDraft && rejection.rejections === 1 && rejection.reworded === null,
    'a "not this thread" rejection survives the 24 h expiry, is never fetched or shown again, is counted, and clears when the task is reworded', rejection);

  const queue = await page.evaluate(async () => {
    const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const order = []; let release; const gate = new Promise(r => { release = r; });
    let held = false;
    const log = __mailbox({}, undefined, async parsed => {
      if (parsed.pathname.endsWith('/threads')) order.push(parsed.searchParams.get('q').split(')')[0].slice(1));
      if (!held) { held = true; await gate; }
    });
    const savedTasks = manualTasks;
    manualTasks = [['mail_q1', 'Alpha'], ['mail_q2', 'Bravo'], ['mail_q3', 'Charlie']].map(([id, text]) => ({ id, text }));
    Today.use('gmail').recheck();
    await __until(() => held, 'first re-check holds');
    const added = __enrich('mail_q4', 'Delta');
    release();
    await added; await __until(() => order.length >= 4, 'queue drained');
    await new Promise(r => setTimeout(r, 50));
    // Device-wide caps: re-checks stop at 20, everything at 30.
    localStorage.setItem('gmail_daily_v1', JSON.stringify({ day: today(), total: 20, recheck: 20 }));
    for (const id of ['mail_q1', 'mail_q2', 'mail_q3']) localStorage.removeItem('gmail_check_' + id);
    const beforeCap = log.urls.length; Today.use('gmail').recheck(); await new Promise(r => setTimeout(r, 100));
    const recheckCapped = log.urls.length === beforeCap && __audit().entries.at(-1).status === 'daily-cap';
    localStorage.setItem('gmail_daily_v1', JSON.stringify({ day: today(), total: 30, recheck: 20 }));
    await _gmailEnrichTask('mail_q4', 'Delta');
    localStorage.removeItem('gmail_check_mail_q4');
    const totalCapped = log.urls.length === beforeCap;
    manualTasks = savedTasks; localStorage.removeItem('gmail_daily_v1');
    return { order, recheckCapped, totalCapped };
  });
  assert(queue.order[0] === 'charlie' && queue.order.indexOf('delta') < queue.order.indexOf('bravo') && queue.recheckCapped && queue.totalCapped,
    're-checks run newest first, one at a time; a task you add jumps ahead of queued re-checks; 20 re-checks and 30 lookups a day are the device caps', queue);

  const retired = await page.evaluate(async () => {
    const row = document.createElement('div'); row.className = 'task'; row.dataset.taskid = 'mail_policy';
    row.innerHTML = '<span class="task-text"><span class="task-tail"></span></span>'; document.body.append(row);
    __mailOwner('mail_policy', 'Reply about contract');
    localStorage.setItem('gmail_enrichment_mail_policy', JSON.stringify({ ...__binding('Reply about contract'), matchPolicy: 'minisearch-v1', fetchedAt: Date.now(), threadId: 'old' }));
    localStorage.setItem('gmail_classify_mail_policy', JSON.stringify({ ...__binding('Reply about contract'), isComm: true, searchQuery: 'subject:contract', source: 'ai' }));
    _gmailUpdateIndicator('mail_policy');
    const indicator = !!row.querySelector('.gmail-indicator'); row.remove();
    Today.use('gmail').cleanup();
    localStorage.removeItem('today_ai_key_claude');
    const log = __mailbox({ c: [__msg('Contract', 'Sam <sam@example.test>', 'Contract ready')] });
    await __enrich('mail_nokey', 'Reply about contract');
    localStorage.setItem('today_ai_key_claude', 'claude-test-key');
    return { indicator, oldEnrichment: localStorage.getItem('gmail_enrichment_mail_policy'), oldClassifier: localStorage.getItem('gmail_classify_mail_policy'),
      noKeyRequests: log.urls.length, noKeyStatus: __audit().entries.at(-1).status };
  });
  assert(!retired.indicator && retired.oldEnrichment === null && retired.oldClassifier === null && retired.noKeyRequests === 0 && retired.noKeyStatus === 'no-ai-key',
    'old-policy matches and classifier caches are discarded; without an AI key nothing is looked up', retired);

  const indicatorStyle = await page.evaluate(() => {
    const row = document.createElement('div'); row.className = 'task'; row.dataset.taskid = 'mail_visible';
    row.innerHTML = '<span class="task-text">Visible<span class="task-tail"></span></span>'; document.body.append(row);
    __mailOwner('mail_visible', 'Reply about contract');
    localStorage.setItem('gmail_enrichment_mail_visible', JSON.stringify({ ...__binding('Reply about contract'), matchPolicy: 'judge-v1', fetchedAt: Date.now(), threadId: 't' }));
    _gmailUpdateIndicator('mail_visible');
    const el = row.querySelector('.gmail-indicator'), out = { tag: el?.tagName, opacity: el && getComputedStyle(el).opacity };
    row.remove(); return out;
  });
  assert(indicatorStyle.tag === 'SPAN' && Number(indicatorStyle.opacity) > 0,
    'on desktop the ↩ indicator is a quiet, always-visible glyph (no longer hover-only)', indicatorStyle);

  const indicator = await page.evaluate(() => {
    const row = document.createElement('div');
    row.className = 'task'; row.dataset.taskid = 'gmail_indicator';
    row.innerHTML = '<span class="task-text"><span class="task-tail"></span></span>';
    document.body.appendChild(row);
    __mailOwner('gmail_indicator', 'Reply to Test');
    localStorage.setItem('gmail_enrichment_gmail_indicator', JSON.stringify({ ...__binding('Reply to Test'), fetchedAt: Date.now(), subject: 'Test', matchPolicy: 'judge-v1' }));
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
      if (String(url).includes('ai-assist')) return { ok: true, status: 200, json: async () => ({ index: 0, message: 0, evidence: 'See you at 3', detail: 'See you at 3' }) };
      return { ok: true, status: 200, json: async () => ({}) };
    };
    await __enrich('gmail_mail_1', 'Reply to the salon about the haircut');
    const cached = JSON.parse(localStorage.getItem('gmail_enrichment_gmail_mail_1') || '{}');
    const askedForId = seenUrls.some(u => u.includes('metadataHeaders=Message-ID'));
    const block = document.getElementById('focusGmailBlock');
    const linkFor = () => { __mailFocus('gmail_mail_1', 'Reply to the salon about the haircut'); return block.querySelector('.focus-gmail-open'); };
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
    // Mac + draft (Can, Oct 27): the thread's "Open in Mail ↗" and the draft must not become two identical CTAs.
    linkFor();
    const realFetch = window.fetch;
    window.fetch = async () => ({ ok: true, status: 200, json: async () => ({ content: 'Three works for me.' }) });
    block.querySelector('.focus-gmail-draft-btn')?.click();
    for (let i = 0; i < 60 && !block.querySelector('.focus-gmail-draft-btn')?.dataset.mailto; i++) await new Promise(r => setTimeout(r, 10));
    await new Promise(r => setTimeout(r, 200));
    const macDraftLabels = [...block.querySelectorAll('.focus-gmail-actions .focus-gmail-draft-btn, .focus-gmail-actions .focus-gmail-open')].map(el => el.textContent.trim());
    window.fetch = realFetch;
    setPlatform('Win32');
    const win = linkFor();
    setPlatform('MacIntel');
    localStorage.setItem('gmail_enrichment_gmail_mail_1', JSON.stringify({ ...cached, messageId: undefined }));
    const old = linkFor();
    if (realPlatform) Object.defineProperty(navigator, 'platform', realPlatform); else delete navigator.platform;
    localStorage.removeItem('gmail_enrichment_gmail_mail_1');
    block.hidden = true; block.innerHTML = '';
    return { askedForId, cachedId: cached.messageId, macOut, defaultPrevented: navigated, macDraftLabels,
      winText: win?.textContent, winHref: win?.getAttribute('href'), oldText: old?.textContent };
  });
  assert(JSON.stringify(mailOpen.macDraftLabels) === JSON.stringify(['Show draft in Mail ↗', 'Open in Mail ↗']),
    'Mac draft shows one draft action and one thread link, never two identical "Open in Mail" CTAs', mailOpen.macDraftLabels);
  assert(mailOpen.askedForId && mailOpen.cachedId === 'CAB+x9#1@mail.gmail.com'
      && mailOpen.macOut.text === 'Open in Mail ↗' && mailOpen.macOut.href === 'message://%3CCAB%2Bx9%231%40mail.gmail.com%3E'
      && !mailOpen.macOut.target && mailOpen.defaultPrevented === true
      && mailOpen.winText === 'Open in Gmail ↗' && mailOpen.winHref === 'https://mail.google.com/mail/u/0/#all/t1'
      && mailOpen.oldText === 'Open in Gmail ↗',
    'desktop Mac opens the thread in Apple Mail via message://; other platforms and old caches open the matched Gmail conversation, not a search', mailOpen);

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
    await __enrich('gmail_expired_1', 'Reply to Sam');
    await __enrich('gmail_expired_2', 'Reply to Robin');
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
    let searches = 0;
    window.fetch = async () => { searches++; return { ok: true, json: async () => ({ threads: [] }) }; };
    _gmailUpdateIndicator(id);
    const removed = !row.querySelector('.gmail-indicator') && localStorage.getItem('gmail_enrichment_' + id) === null;
    __mailFocus(id, 'Book haircut');
    await new Promise(resolve => setTimeout(resolve, 0));
    const block = document.getElementById('focusGmailBlock');
    const hidden = block.hidden && !block.textContent.includes('Old private calendar reminder');
    await __enrich(id, 'Book haircut');
    row.remove();
    return { removed, hidden, searches };
  });
  assert(calendarCache.removed && calendarCache.hidden && calendarCache.searches > 0,
    'an old cached calendar reminder loses its arrow, stays out of focus, and cannot prevent a new search', calendarCache);

  const focusRace = await page.evaluate(async () => {
    let release;
    let ready;
    const pending = new Promise(resolve => { ready = resolve; });
    localStorage.setItem('gmail_enrichment_race_b', JSON.stringify({ ...__binding('Reply about invoice'), matchPolicy: 'judge-v1',
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
    __mailFocus('race_a', 'Reply about contract');
    await pending;
    __mailFocus('race_b', 'Reply about invoice');
    release();
    await new Promise(resolve => setTimeout(resolve, 10));
    const block = document.getElementById('focusGmailBlock');
    return { id: block.dataset.focusTaskId, text: block.textContent };
  });
  assert(focusRace.id === 'race_b' && focusRace.text.includes('Invoice context must stay')
      && !focusRace.text.includes('Old contract context'),
    'a slower ranked lookup cannot overwrite the cached context of a newly focused task', focusRace);

  // BUG-128: exercise actual ownership through classification, search, view and draft bodies.
  const ownership = await page.evaluate(async () => {
    const cases = [], turn = () => new Promise(resolve => setTimeout(resolve, 0));
    const wait = async predicate => { for (let i=0;i<100&&!predicate();i++) await turn(); if(!predicate()) throw new Error('Held response not reached'); };
    const msg = { messages:[{ snippet:'The contract is ready', payload:{ headers:[
      { name:'Subject', value:'Contract' }, { name:'From', value:'Sam <sam@example.com>' },
    ] } }] };
    const seed = (id, text='Reply about contract') => {
      __mailOwner(id,text); doneIds.delete(id);
            localStorage.removeItem('gmail_enrichment_'+id);
    };
    const mutate = (kind,id) => {
      if (kind==='rename') manualTasks.find(t=>t.id===id).text='Reply about invoice';
      if (kind==='delete'||kind==='move') { const task=manualTasks.find(t=>t.id===id); manualTasks=manualTasks.filter(t=>t.id!==id); if(kind==='move')soonTasks.push(task); }
      if (kind==='complete') doneIds.add(id);
      if (kind==='ai-key') localStorage.setItem('today_ai_key_claude','changed-fictional-key');
      if (kind==='adopt') localStorage.setItem('gmail_enrichment_'+id,JSON.stringify({ ...__binding('Reply about contract'),matchPolicy:'judge-v1',threadId:'adopted',snippet:'New accepted context',fetchedAt:Date.now() }));
      if (kind==='account') localStorage.setItem('gmail_refresh_token','different-fictional-grant');
    };
    for (const stage of ['judge','list','thread']) for (const kind of ['rename','delete','move','complete','ai-key','adopt','account']) {
      const id='owner_'+stage+'_'+kind; seed(id);
            let release;
      window.fetch=async url=>{
        const u=String(url), response=u.includes('ai-assist')?__pick:u.includes('/threads?')?{threads:[{id:'contract'}]}:msg;
        const hold=stage==='judge'?u.includes('ai-assist'):stage==='list'?u.includes('/threads?'):!u.includes('ai-assist')&&!u.includes('/threads?');
        return {ok:true,status:200,json:()=>hold?new Promise(resolve=>{release=()=>resolve(response);}):Promise.resolve(response)};
      };
      const pending=_gmailEnrichTask(id,'Reply about contract'); await wait(()=>!!release); mutate(kind,id);
      const adopted=localStorage.getItem('gmail_enrichment_'+id), classified=localStorage.getItem('gmail_classify_'+id);
      release();await pending;
      cases.push({stage,kind,noOverwrite:localStorage.getItem('gmail_enrichment_'+id)===adopted,
        noClassificationOverwrite:stage!=='judge'||localStorage.getItem('gmail_classify_'+id)===classified});
      localStorage.setItem('gmail_refresh_token','refresh-test');localStorage.setItem('today_ai_key_claude','claude-test-key');
    }
    // Renamed cached classifications and indicators must use the live owner even without supplied text.
    seed('owner_cache');localStorage.setItem('gmail_enrichment_owner_cache',JSON.stringify({ ...__binding('Reply about invoice'),matchPolicy:'judge-v1',fetchedAt:Date.now(),snippet:'Wrong invoice' }));
    const row=document.createElement('div');row.className='task';row.dataset.taskid='owner_cache';row.innerHTML='<span class="task-text"><span class="task-tail"></span></span>';document.body.append(row);
    _gmailUpdateIndicator('owner_cache'); const wrongArrow=!row.querySelector('.gmail-indicator')&&!localStorage.getItem('gmail_enrichment_owner_cache');row.remove();
    for(const kind of ['exit','switch','revisit']) {
      const id='owner_focus_'+kind;seed(id);let release;
      window.fetch=async url=>({ok:true,status:200,json:()=>String(url).includes('/threads?')?Promise.resolve({threads:[{id:'contract'}]}):new Promise(resolve=>{release=()=>resolve(msg);})});
      _gmailRenderFocusBlock(id,'Reply about contract');await wait(()=>!!release);
      Today.use('gmail').closeFocus();
      if(kind==='switch') {seed('other_focus');localStorage.setItem('gmail_enrichment_other_focus',JSON.stringify({...__binding('Reply about contract'),matchPolicy:'judge-v1',fetchedAt:Date.now(),snippet:'New accepted context'}));_gmailRenderFocusBlock('other_focus','Reply about contract');}
      if(kind==='revisit') {localStorage.setItem('gmail_enrichment_'+id,JSON.stringify({...__binding('Reply about contract'),matchPolicy:'judge-v1',fetchedAt:Date.now(),snippet:'New accepted context'}));_gmailRenderFocusBlock(id,'Reply about contract');}
      const before=localStorage.getItem('gmail_enrichment_'+id);release();await turn();await turn();
      const block=document.getElementById('focusGmailBlock');cases.push({stage:'focus',kind,noOverwrite:localStorage.getItem('gmail_enrichment_'+id)===before,noClassificationOverwrite:kind==='exit'?block.hidden:block.textContent.includes('New accepted context')});
    }
    // Access-token renewal belongs to the same grant and must not invalidate the lookup.
    seed('owner_refresh');localStorage.setItem('gmail_token_expiry','1');let refreshes=0;
    window.fetch=async url=>({ok:true,status:200,json:async()=>String(url).includes('gmail-token')?(refreshes++,{access_token:'renewed-fictional-access',expires_in:3600}):String(url).includes('ai-assist')?__pick:String(url).includes('/threads?')?{threads:[{id:'contract'}]}:msg});
    await _gmailEnrichTask('owner_refresh','Reply about contract');
    const refreshSurvives=refreshes===1&&JSON.parse(localStorage.getItem('gmail_enrichment_owner_refresh')||'null')?.threadId==='contract';
    // A refresh begun before Forget must not resurrect a credential or expired flag.
    seed('owner_forget');localStorage.setItem('gmail_token_expiry','1');let finishRefresh;
    window.fetch=async()=>({ok:true,status:200,json:()=>new Promise(resolve=>{finishRefresh=()=>resolve({access_token:'must-not-return',expires_in:3600});})});
    const forgotten=_gmailEnrichTask('owner_forget','Reply about contract');await wait(()=>!!finishRefresh);gmailDisconnect();finishRefresh();await forgotten;
    const forgottenStaysGone=!localStorage.getItem('gmail_access_token')&&!localStorage.getItem('gmail_token_expired')&&!localStorage.getItem('gmail_enrichment_owner_forget');
    localStorage.setItem('gmail_access_token','access-test');localStorage.setItem('gmail_refresh_token','refresh-test');localStorage.setItem('gmail_token_expiry',String(Date.now()+3600000));
    return {cases,wrongArrow,refreshSurvives,forgottenStaysGone};
  });
  assert(ownership.cases.every(c=>c.noOverwrite&&c.noClassificationOverwrite)&&ownership.wrongArrow,
    'BUG-128: list/thread/judge races fence edits, deletion, moves, completion, key/account changes and adopted caches; closed/switched/revisited views stay current',ownership);
  assert(ownership.refreshSurvives&&ownership.forgottenStaysGone,
    'normal access-token refresh preserves ownership; a late refresh after Forget cannot restore credentials',ownership);

  const draftOwnership = await page.evaluate(async () => {
    const turn=()=>new Promise(resolve=>setTimeout(resolve,0)),results=[];
    for(const kind of ['rename','delete','exit','switch','ai-key','account','adopt','control','control-copy']) {
      const id='draft_owner_'+kind;__mailOwner(id,'Reply about contract');
      // Populate through the real lookup to bind the renewed connection.
      window.fetch=async url=>({ok:true,status:200,json:async()=>String(url).includes('ai-assist')?__pick:String(url).includes('/threads?')?{threads:[{id:'contract'}]}:{messages:[{snippet:'Contract ready',payload:{headers:[{name:'Subject',value:'Contract'},{name:'From',value:'Sam <sam@example.com>'}]}}]}});
      await _gmailEnrichTask(id,'Reply about contract');_gmailRenderFocusBlock(id,'Reply about contract');
      let release,calls=0;
      window.fetch=async()=>{calls++;return{ok:true,status:200,json:()=>new Promise(resolve=>{release=()=>resolve({content:'Thanks, I will review the contract.'});})};};
      const button=document.querySelector('#focusGmailBlock .focus-gmail-draft-btn');button.click();
      for(let i=0;i<100&&!release;i++)await turn();if(!release)throw new Error('Draft body not held');
      if(kind==='rename')manualTasks.find(t=>t.id===id).text='Reply about invoice';
      if(kind==='delete')manualTasks=manualTasks.filter(t=>t.id!==id);
      if(kind==='exit'||kind==='switch')Today.use('gmail').closeFocus();
      if(kind==='switch') {__mailOwner('draft_next','Reply about invoice');_gmailRenderFocusBlock('draft_next','Reply about invoice');}
      if(kind==='ai-key')localStorage.setItem('today_ai_key_claude','new-fictional-key');
      if(kind==='account')localStorage.setItem('gmail_refresh_token','another-fictional-grant');
      if(kind==='control-copy')delete document.getElementById('focusGmailBlock').dataset.fromEmail;
      if(kind==='adopt')localStorage.setItem('gmail_enrichment_'+id,JSON.stringify({...__binding('Reply about contract'),matchPolicy:'judge-v1',fetchedAt:Date.now(),snippet:'New cache'}));
      release();await turn();await turn();
      const block=document.getElementById('focusGmailBlock');
      results.push({kind,correct:kind.startsWith('control')?block.textContent.includes('Thanks, I will review'):!block.textContent.includes('Thanks, I will review')});
      if(kind==='control'){
        // With a reply address the draft button becomes the one Mail action (no second link).
        await new Promise(r=>setTimeout(r,200));
        const label=button.querySelector('.focus-gmail-draft-label')?.textContent||button.textContent;
        const ctaLabels=[...block.querySelectorAll('.focus-gmail-actions .focus-gmail-draft-btn, .focus-gmail-actions .focus-gmail-open')].map(el=>el.textContent.trim());
        results.push({kind:'show-draft-in-mail',correct:label==='Show draft in Mail ↗'&&/^mailto:/.test(button.dataset.mailto||'')
          &&decodeURIComponent(button.dataset.mailto).includes('Thanks, I will review the contract.')&&!block.querySelector('.focus-gmail-mailto')
          &&new Set(ctaLabels).size===ctaLabels.length&&ctaLabels.length===2&&calls===1});
      }
      if(kind==='control-copy'){
        // Without a reply address, Copy stays the useful step and stays bound to its task.
        await new Promise(r=>setTimeout(r,200));
        let copied=0;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{copied++;}}});
        button.click();await turn();button.click();await turn();results.push({kind:'copy-without-regeneration',correct:copied===2&&calls===1&&!button.dataset.mailto});
        manualTasks.find(t=>t.id===id).text='Reply about invoice';button.click();await turn();results.push({kind:'stale-copy-blocked',correct:copied===2});
      }
      Today.use('gmail').closeFocus();localStorage.setItem('today_ai_key_claude','claude-test-key');localStorage.setItem('gmail_refresh_token','refresh-test');
    }
    return results;
  });
  assert(draftOwnership.every(c=>c.correct),'draft responses, Show draft in Mail and Copy belong to their current task, visit, connection, cache and AI configuration',draftOwnership);

  const lifecycle = await page.evaluate(async () => {
    const turn=()=>new Promise(resolve=>setTimeout(resolve,0));
    __mailOwner('mail_lifecycle','Reply about contract');
    window.fetch=async url=>({ok:true,status:200,json:async()=>String(url).includes('ai-assist')?__pick:String(url).includes('/threads?')?{threads:[{id:'contract'}]}:{messages:[{snippet:'Contract ready',payload:{headers:[{name:'Subject',value:'Contract'},{name:'From',value:'Sam <sam@example.com>'}]}}]}});
    await _gmailEnrichTask('mail_lifecycle','Reply about contract');
    const original=localStorage.getItem('gmail_enrichment_mail_lifecycle');
    _gmailRenderFocusBlock('mail_lifecycle','Reply about contract');
    const nativeNow=Date.now;Date.now=()=>nativeNow()+86400001;
    _gmailRenderFocusBlock('mail_lifecycle','Reply about contract');
    const viewExpires=document.getElementById('focusGmailBlock').hidden;Date.now=nativeNow;Today.use('gmail').closeFocus();
    await _gmailEnrichTask('mail_lifecycle','Reply about contract');
    const retainedCache=localStorage.getItem('gmail_enrichment_mail_lifecycle');
    const task=manualTasks.find(t=>t.id==='mail_lifecycle');manualTasks=manualTasks.filter(t=>t.id!==task.id);_saveManual();soonTasks.push(task);_saveSoon();await turn();
    const retained=localStorage.getItem('gmail_enrichment_mail_lifecycle')===retainedCache;
    // Real sync merge changes the live owner's text; indicator/cache restoration must validate it.
    soonTasks=soonTasks.filter(t=>t.id!==task.id);manualTasks.push(task);_saveSoon();_saveManual();await turn();
    mergeRemoteData({manual_tasks:[{...task,text:'Reply about invoice',updatedAt:new Date(Date.now()+1000).toISOString()}],soon_tasks:[],past_tasks:[],deleted_ids:[],local_change_at:new Date(Date.now()+1000).toISOString()});
    await turn();Today.use('gmail').cleanup();
    const syncInvalidates=!localStorage.getItem('gmail_enrichment_mail_lifecycle')&&!localStorage.getItem('gmail_classify_mail_lifecycle');
    // Test the real deadline without spending 26 seconds; a late classifier cannot write after it.
    const native=window.setTimeout;let expire,release;
    window.setTimeout=(fn,ms,...args)=>ms===26000?(expire=fn,987654):native(fn,ms,...args);
    __mailOwner('mail_deadline','Reply about contract');
    window.fetch=async()=>({ok:true,status:200,json:()=>new Promise(resolve=>{release=()=>resolve(__pick);})});
    const pending=_gmailEnrichTask('mail_deadline','Reply about contract');
    for(let i=0;i<100&&(!release||!expire);i++)await turn();
    expire();await pending;release();await turn();window.setTimeout=native;
    const deadline=!localStorage.getItem('gmail_classify_mail_deadline')&&!localStorage.getItem('gmail_enrichment_mail_deadline');
    // Restore the selected task for an actual native focus-exit test below.
    const tokensNotDuplicated=Object.keys(localStorage).filter(k=>/^gmail_(?:enrichment|classify)_/.test(k)).every(k=>!localStorage.getItem(k).includes('refresh-test')&&!localStorage.getItem(k).includes('claude-test-key'));
    return {retained,syncInvalidates,deadline,tokensNotDuplicated,viewExpires};
  });
  assert(Object.values(lifecycle).every(Boolean),'zone persistence retains unchanged context; real sync edits invalidate it; deadlines fence late writes and caches contain no credentials',lifecycle);

  await page.evaluate(() => {
    Today.use('gmail').closeFocus();manualTasks=[{id:'mail_native_exit',text:'Reply about contract'}];doneIds.clear();
    localStorage.setItem('splash_shown_at',String(Date.now()));
    Today.use('connections').renderManual();
    window.__nativeRelease=null;
    window.fetch=async url=>({ok:true,status:200,json:()=>String(url).includes('ai-assist')?Promise.resolve(__pick):String(url).includes('/threads?')?Promise.resolve({threads:[{id:'contract'}]}):new Promise(resolve=>{window.__nativeRelease=()=>resolve({messages:[{snippet:'Contract ready',payload:{headers:[{name:'Subject',value:'Contract'},{name:'From',value:'Sam <sam@example.com>'}]}}]});})});
  });
  await page.waitForFunction(()=>!document.getElementById('splash')||!document.getElementById('splash').classList.contains('show'));
  await page.evaluate(()=>document.querySelector('.task[data-taskid="mail_native_exit"] .task-text').click());
  await page.waitForFunction(()=>!!window.__nativeRelease);
  await page.keyboard.press('Escape');
  const nativeExit=await page.evaluate(async()=>{__nativeRelease();await new Promise(resolve=>setTimeout(resolve,0));return !localStorage.getItem('gmail_enrichment_mail_native_exit')&&document.getElementById('focusGmailBlock').hidden;});
  assert(nativeExit,'actual Focus Escape invalidates the Gmail visit synchronously before its held body returns');

  const staleLink=await page.evaluate(async()=>{
    __mailOwner('mail_stale_link','Reply about contract');
    window.fetch=async url=>({ok:true,status:200,json:async()=>String(url).includes('ai-assist')?__pick:String(url).includes('/threads?')?{threads:[{id:'contract'}]}:{messages:[{snippet:'Contract ready',payload:{headers:[{name:'Subject',value:'Contract'},{name:'From',value:'Sam <sam@example.com>'},{name:'Message-ID',value:'<fixture@example.com>'}]}}]}});
    await _gmailEnrichTask('mail_stale_link','Reply about contract');_gmailRenderFocusBlock('mail_stale_link','Reply about contract');
    const link=document.querySelector('#focusGmailBlock .focus-gmail-open');link.href='#must-not-navigate';
    manualTasks.find(t=>t.id==='mail_stale_link').text='Reply about invoice';
    const click=new MouseEvent('click',{bubbles:true,cancelable:true});link.dispatchEvent(click);
    return click.defaultPrevented&&location.hash!=='#must-not-navigate';
  });
  assert(staleLink,'an already-rendered Mail/Gmail link cannot navigate after its task changes');


  const peer=await browser.newPage();
  await peer.goto(URL_BASE,{waitUntil:'domcontentloaded'});
  await peer.waitForFunction(()=>window.Today?.use('gmail'));
  await peer.evaluate(()=>{window.__sawMailCache=false;window.addEventListener('storage',event=>{if(event.key==='gmail_enrichment_mail_peer')window.__sawMailCache=true;});});
  await page.evaluate(async()=>{
    __mailOwner('mail_peer','Reply about contract');
    window.fetch=async url=>({ok:true,status:200,json:async()=>String(url).includes('ai-assist')?__pick:String(url).includes('/threads?')?{threads:[{id:'contract'}]}:{messages:[{snippet:'Contract ready',payload:{headers:[{name:'Subject',value:'Contract'},{name:'From',value:'Sam <sam@example.com>'}]}}]}});
    await _gmailEnrichTask('mail_peer','Reply about contract');_gmailRenderFocusBlock('mail_peer','Reply about contract');
  });
  await peer.waitForFunction(()=>window.__sawMailCache);
  assert(await page.evaluate(()=>!!localStorage.getItem('gmail_enrichment_mail_peer')&&!document.getElementById('focusGmailBlock').hidden),'a tab with an older task snapshot must not delete another tab’s newly accepted mail cache');
  await peer.evaluate(()=>localStorage.setItem('gmail_refresh_token','peer-fictional-sign-in'));
  await page.waitForFunction(()=>document.getElementById('focusGmailBlock').hidden&&!localStorage.getItem('gmail_enrichment_mail_peer'));
  assert(await page.evaluate(()=>!localStorage.getItem('gmail_classify_mail_peer')),'real cross-tab connection changes remove old-sign-in cards/classifications and close the old focus view');
  await peer.evaluate(()=>{localStorage.setItem('gmail_refresh_token','refresh-test');localStorage.setItem('gmail_access_token','access-test');localStorage.setItem('gmail_token_expiry',String(Date.now()+3600000));});
  await peer.close();

  const draftDeadline=await page.evaluate(async()=>{
    const turn=()=>new Promise(resolve=>setTimeout(resolve,0));
    __mailOwner('mail_draft_deadline','Reply about contract');
    window.fetch=async url=>({ok:true,status:200,json:async()=>String(url).includes('ai-assist')?__pick:String(url).includes('/threads?')?{threads:[{id:'contract'}]}:{messages:[{snippet:'Contract ready',payload:{headers:[{name:'Subject',value:'Contract'},{name:'From',value:'Sam <sam@example.com>'}]}}]}});
    await _gmailEnrichTask('mail_draft_deadline','Reply about contract');__mailFocus('mail_draft_deadline','Reply about contract');
    let expire,release;const native=setTimeout;
    window.setTimeout=(fn,ms,...args)=>ms===26000?(expire=fn,987654):native(fn,ms,...args);
    window.fetch=async()=>({ok:true,status:200,json:()=>new Promise(resolve=>{release=()=>resolve({content:'Too late'});})});
    const button=document.querySelector('#focusGmailBlock .focus-gmail-draft-btn');button.click();
    for(let i=0;i<100&&(!release||!expire);i++)await turn();expire();await turn();await turn();
    release();await turn();window.setTimeout=native;
    const result=!button.disabled&&!document.getElementById('focusGmailBlock').textContent.includes('Too late');
    Today.use('gmail').closeFocus();return result;
  });
  assert(draftDeadline,'a stalled draft body reaches its deadline, resets the native button and cannot paint late prose');


  // Real task entry -> independent lookups -> row indicators -> cached Focus delivery.
  // All source responses are fictional; this is not live account/usefulness proof.
  const captureContext = async (taskText, mailExpected) => {
    const context = await browser.createBrowserContext(), capture = await context.newPage(), errors=[];
    capture.on('pageerror',error=>errors.push(error.message));
    try {
      await capture.setViewport({width:1200,height:900});
      await capture.evaluateOnNewDocument(({mailExpected})=>{
        localStorage.clear();
        for(const [key,value]of Object.entries({splash_shown_at:String(Date.now()),today_ai_provider:'claude',today_ai_key_claude:'fictional-key',gmail_access_token:'fictional-access',gmail_refresh_token:'fictional-refresh',gmail_token_expiry:String(Date.now()+3600000)}))localStorage.setItem(key,value);
        window.__delivery={web:0,judge:0,mail:0};const original=window.fetch.bind(window),reply=data=>Promise.resolve({ok:true,status:200,json:async()=>data});
        window.fetch=(url,options={})=>{
          const address=String(url);
          if(address.includes('/task-enrich')){__delivery.web++;return reply({card:{headline:'Flight ticket reference',body:'Fictional supporting context',cta:{label:'Open',href:'https://example.test/tickets'}}});}
          if(address.includes('/ai-assist')){
            const body=JSON.parse(options.body);
            if(body.systemPrompt?.startsWith('Prepare at most'))return reply({content:JSON.stringify({kind:'none',text:''})});
            if(body.surface==='gmail-judge'){__delivery.judge++;return reply(mailExpected?{index:0,message:0,evidence:'Your flight tickets are confirmed.',detail:'Tickets confirmed'}:{index:null});}
            return reply({content:'none',suggest:false,type:'none',reason:'other_complexity'});
          }
          if(address.includes('gmail.googleapis.com')){
            __delivery.mail++;
            if(new URL(address).pathname.endsWith('/threads'))return reply({threads:[{id:'fictional-thread'}]});
            return reply({messages:[{id:'fictional-message',threadId:'fictional-thread',snippet:'Your flight tickets are confirmed.',payload:{headers:[{name:'Subject',value:'Flight tickets'},{name:'From',value:'Airline <travel@example.test>'},{name:'Date',value:new Date().toUTCString()},{name:'Message-ID',value:'<fictional@example.test>'}]}}]});
          }
          return original(url,options);
        };
      },{mailExpected});
      await capture.goto(URL_BASE,{waitUntil:'domcontentloaded'});
      await capture.waitForFunction(()=>!document.body.hasAttribute('data-booting')&&typeof window.addManual==='function');
      await capture.evaluate(()=>{dropboxAutoSave=()=>{};});
      await capture.type('#newTask',taskText);await capture.keyboard.press('Enter');
      await capture.waitForSelector('.agent-indicator',{timeout:5000});
      if(mailExpected)await capture.waitForSelector('.gmail-indicator',{timeout:5000});
      else await capture.waitForFunction(()=>__delivery.judge===1,{timeout:5000});
      const afterAdd=await capture.evaluate(()=>({...__delivery}));
      await capture.click('.task-text');
      await capture.waitForFunction(mail=>!document.getElementById('focusAgentBlock').hidden&&(!mail||!document.getElementById('focusGmailBlock').hidden),{timeout:5000},mailExpected);
      // Join the existing coalesced lookup before asserting a negative; do not rely on elapsed time.
      await capture.evaluate(async()=>{await _gmailEnrichTask(manualTasks[0].id,manualTasks[0].text);});
      const first=await capture.evaluate(()=>({counts:{...__delivery},mailVisible:!document.getElementById('focusGmailBlock').hidden,detail:document.querySelector('#focusGmailBlock .focus-gmail-detail')?.textContent||'',webVisible:!document.getElementById('focusAgentBlock').hidden}));
      assert(first.webVisible&&first.mailVisible===mailExpected&&(!mailExpected||first.detail==='Tickets confirmed')&&first.counts.web===1&&afterAdd.judge===1
          &&first.counts.judge===1&&afterAdd.mail===4&&(mailExpected?first.counts.mail===4:[8,12].includes(first.counts.mail))&&!errors.length,
        'typed '+taskText+' is searched (AND, then widened), judged once; Focus reuses the match, and an unchanged mailbox is not judged again',{afterAdd,first,errors});
    } finally {await context.close();}
  };
  await captureContext('Check my flight tickets',true);
  await captureContext('Buy a headphone case',false);

  // Phones (no hover) have no Focus mode: ↩ is a native button that opens the same card under the task.
  const phone = await (async () => {
    const context = await browser.createBrowserContext(), mobile = await context.newPage(), errors = [];
    mobile.on('pageerror', e => errors.push(e.message));
    const grant = createHash('sha256').update(URL_BASE + '\0fictional-refresh').digest('hex');
    try {
      await mobile.setViewport({ width: 375, height: 760, isMobile: true, hasTouch: true });
      await mobile.evaluateOnNewDocument(grant => {
        const nativeMedia = window.matchMedia.bind(window);
        window.matchMedia = query => {
          const input = { '(hover: hover)': false, '(hover: none)': true, '(pointer: fine)': false, '(pointer: coarse)': true };
          return Object.hasOwn(input, query) ? { matches: input[query], media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : nativeMedia(query);
        };
        localStorage.clear();
        for (const [k, v] of Object.entries({ splash_shown_at: String(Date.now()), today_ai_provider: 'claude', today_ai_key_claude: 'fictional-key',
          gmail_access_token: 'fictional-access', gmail_refresh_token: 'fictional-refresh', gmail_token_expiry: String(Date.now() + 3600000) })) localStorage.setItem(k, v);
        localStorage.setItem('today_manual', JSON.stringify([{ id: 'manual_1700000000001', text: 'Pay rent' }, { id: 'manual_1700000000002', text: 'Water the plants' }]));
        localStorage.setItem('gmail_enrichment_manual_1700000000001', JSON.stringify({ taskText: 'Pay rent', ownerPolicy: 'owner-v2', connectionKey: grant,
          matchPolicy: 'judge-v1', fetchedAt: Date.now(), threadId: 'landlord', subject: 'Rent for December', from: 'Lena <lena@example.test>',
          replyFrom: 'Lena <lena@example.test>', date: 'Mon, 5 Oct 2026 10:00:00 +0200', snippet: 'The rent of 9500 kr is due on 28 Nov', detail: 'Rent 9500 kr due 28 Nov' }));
        const original = window.fetch.bind(window);
        window.fetch = (url, options) => /gmail\.googleapis|\/\.netlify\//.test(String(url))
          ? Promise.resolve({ ok: true, status: 200, json: async () => ({ threads: [] }) }) : original(url, options);
      }, grant);
      await mobile.goto(URL_BASE, { waitUntil: 'domcontentloaded' });
      await mobile.waitForSelector('.task[data-taskid="manual_1700000000001"] button.gmail-indicator', { timeout: 5000 });
      return await mobile.evaluate(async () => {
        const id = 'manual_1700000000001', task = () => document.querySelector('.task[data-taskid="' + id + '"]');
        const turn = () => new Promise(r => setTimeout(r, 10));
        const button = task().querySelector('button.gmail-indicator'), rect = button.getBoundingClientRect();
        const out = { noHover: !matchMedia('(hover: hover)').matches, label: button.getAttribute('aria-label'), expandedBefore: button.getAttribute('aria-expanded'),
          target: rect.width >= 24 && rect.height >= 24, opacity: Number(getComputedStyle(button).opacity) };
        button.click();
        for (let i = 0; i < 100 && !document.querySelector('.gmail-card-row .focus-gmail-thread'); i++) await turn();
        const card = document.querySelector('.gmail-card-row');
        Object.assign(out, { afterTask: card?.previousElementSibling === task(), visible: !!card && !card.hidden,
          detail: card?.querySelector('.focus-gmail-detail')?.textContent, expanded: task().querySelector('.gmail-indicator').getAttribute('aria-expanded'),
          notToggled: !task().classList.contains('done'), draft: !!card?.querySelector('.focus-gmail-draft-btn'),
          reject: !!card?.querySelector('[data-today-click="gmail.context"]'), link: card?.querySelector('.focus-gmail-open')?.getAttribute('href') });
        Today.use('connections').renderManual();
        await turn();
        out.reanchored = document.querySelector('.gmail-card-row')?.previousElementSibling === task() && document.querySelectorAll('.gmail-card-row').length === 1
          && !!document.querySelector('.gmail-card-row .focus-gmail-detail');
        task().querySelector('button.gmail-indicator').click();
        out.closed = !document.querySelector('.gmail-card-row') && task().querySelector('.gmail-indicator').getAttribute('aria-expanded') === 'false';
        task().querySelector('button.gmail-indicator').click();
        for (let i = 0; i < 100 && !document.querySelector('.gmail-card-row .focus-gmail-thread'); i++) await turn();
        Today.use('gmail').closeCard(id);
        out.closedForSuggestion = !document.querySelector('.gmail-card-row');
        out.noMatchNoIcon = !document.querySelector('.task[data-taskid="manual_1700000000002"] .gmail-indicator');
        return out;
      }).then(result => ({ ...result, errors }));
    } finally { await context.close(); }
  })();
  assert(phone.noHover && phone.label === 'Show email context' && phone.expandedBefore === 'false' && phone.target && phone.opacity > 0
      && phone.afterTask && phone.visible && phone.detail === 'Rent 9500 kr due 28 Nov' && phone.expanded === 'true' && phone.notToggled
      && phone.draft && phone.reject && phone.link?.endsWith('#all/landlord') && phone.reanchored && phone.closed && phone.closedForSuggestion
      && phone.noMatchNoIcon && !phone.errors.length,
    'phone: ↩ is a 24px native button; tapping opens the Focus email card under its task (detail, Draft reply, not this thread, thread link), survives re-render, closes on a second tap or a suggestion', phone);

  const diagnostics = await page.evaluate(async () => {
    __mailbox({});
    const old = { taskId: 'old', status: 'found', source: 'add', reason: null, attempts: [], at: Date.now() - 15 * 86400000 };
    localStorage.setItem('gmail_diagnostics_v1', JSON.stringify([old]));
    for (let i = 0; i < 22; i++) await __enrich('gmail_diagnostic_' + i, 'Call aunt');
    const before = Today.use('gmail').observationAudit(), stored = JSON.parse(localStorage.getItem('gmail_diagnostics_v1'));
    localStorage.setItem('gmail_check_fictional', '{}');
    gmailDisconnect();
    return { schema: before.schema, count: before.entries.length, stored: stored.length, pruned: !stored.some(e => e.taskId === 'old'),
      lastTask: before.entries.at(-1)?.taskId, today: Object.values(before.days).at(-1), raw: JSON.stringify(stored),
      cleared: ['gmail_diagnostics_v1', 'gmail_daily_v1', 'gmail_check_fictional'].every(k => localStorage.getItem(k) === null) };
  });
  assert(diagnostics.schema === 2 && diagnostics.count === 20 && diagnostics.stored === 22 && diagnostics.pruned
      && diagnostics.lastTask === 'gmail_diagnostic_21' && diagnostics.today?.lookups === 22 && diagnostics.today.abstains['no-thread'] === 22
      && !/aunt/i.test(diagnostics.raw) && diagnostics.cleared,
    'diagnostics keep 14 days by time with content-free per-day counts; Disconnect clears them with the checks and daily counter', diagnostics);

  console.log(`\nGmail tests passed (${passed} checks).`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
