// TODAY — AI tier integration test
// Calls ai-assist.js directly (no Netlify CLI) with realistic payloads for each
// AI surface: ping, morning nudge, focus companion, triage hints, week reflection.
// Asserts format, word-count limits, and structure — the boundary most likely to
// silently break when prompts or the function change.
//
// Run:       node scripts/ai-test.mjs
// With key:  ANTHROPIC_API_KEY=sk-ant-... node scripts/ai-test.mjs
// ~20–30s (5 real API round-trips).
//
// Exit 0 = pass or skip (no key). Exit 1 = assertion failure or API error.

import { createRequire } from 'node:module';
import { dirname, join }  from 'node:path';
import { fileURLToPath }  from 'node:url';

const ROOT    = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// Load handler directly — avoids Netlify CLI dependency.
// CommonJS module, so we need createRequire.
const { handler } = require(join(ROOT, 'netlify/functions/ai-assist.js'));

const API_KEY = process.argv.find(a => a.startsWith('--key='))?.slice(6)
             || process.env.ANTHROPIC_API_KEY
             || '';

if (!API_KEY) {
  console.log('- AI tier test skipped (no ANTHROPIC_API_KEY)');
  process.exit(0);
}

const fail = msg => { console.error(`  ✗ FAIL — ${msg}`); process.exit(1); };
const ok   = msg => console.log(`  ✓ ${msg}`);

// Invoke handler with a synthetic Netlify event, always using Claude.
async function call(payload) {
  const t0     = Date.now();
  const result = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ provider: 'claude', apiKey: API_KEY, ...payload }),
  });
  return { status: result.statusCode, body: JSON.parse(result.body), ms: Date.now() - t0 };
}

function words(s) { return s.trim().split(/\s+/).filter(Boolean).length; }

// ─────────────────────────────────────────────────────────────────────────────

console.log('AI tier integration test (claude)\n');

// ── 1. Ping/pong — validates the key and function are working ────────────────
{
  const { status, body, ms } = await call({
    messages:     [{ role: 'user', content: 'ping' }],
    systemPrompt: 'Reply with only the word: pong',
  });
  if (status !== 200)                      fail(`ping: HTTP ${status} — ${body.error}`);
  if (body.error)                          fail(`ping: API error — ${body.error}`);
  const text = (body.message || body.content || '').toLowerCase();
  if (!text.includes('pong'))              fail(`ping: expected "pong", got "${text}"`);
  if (ms > 9000)                           fail(`ping: ${ms}ms — over 9s Netlify timeout risk`);
  ok(`ping/pong (${ms}ms)`);
}

// ── 2. Morning nudge — 1–2 sentences, ≤30 words, no exclamation marks ───────
{
  const facts =
    "Today's tasks:\n" +
    "- review contract with Acme\n" +
    "- call dentist\n" +
    "- finish slide deck for Thursday\n\n" +
    "Yesterday: 3 tasks done, 20 min focus\n" +
    "Memory: tends to start the day strong, often defers evening tasks";

  const instruction =
    "The person is starting their morning. Find the one thing worth saying " +
    "that they'd miss just by reading the list themselves. Under 30 words.";

  const { status, body, ms } = await call({
    messages:     [{ role: 'user', content: facts + '\n\n' + instruction }],
    systemPrompt: "You are the quiet companion in a minimal daily task app. " +
                  "One or two sentences, under 30 words. No exclamation marks, no emoji. " +
                  "Warm, plain, grounded — a friend noticing, not a coach.",
  });
  if (status !== 200)       fail(`nudge: HTTP ${status}`);
  if (body.error)           fail(`nudge: API error — ${body.error}`);
  const text = (body.message || body.content || '').trim();
  if (!text)                fail('nudge: empty response');
  const wc = words(text);
  if (wc > 40)              fail(`nudge: ${wc} words (limit ~30): "${text}"`);
  if (/[!]/.test(text))     fail(`nudge: contains exclamation mark: "${text}"`);
  ok(`nudge — ${wc} words, ${ms}ms: "${text}"`);
}

// ── 3. Focus companion — single question, ends with ?, ≤18 words ────────────
{
  const { status, body, ms } = await call({
    messages: [{
      role: 'user',
      content: 'Task: "finish slide deck for Thursday"\nContext: 2 focus sessions, 3 days old',
    }],
    systemPrompt:
      "You are the quiet companion in a minimal daily task app. " +
      "The user is about to start a 25-minute focus session. " +
      "Ask one question — the kind a thoughtful friend asks before they disappear into work. " +
      "One question only. Under 18 words. No preamble, no quotation marks, no emoji, " +
      "no exclamation marks. End with a question mark. Just the question.",
  });
  if (status !== 200)       fail(`focus: HTTP ${status}`);
  if (body.error)           fail(`focus: API error — ${body.error}`);
  const text = (body.message || body.content || '').trim();
  if (!text)                fail('focus: empty response');
  if (!text.includes('?'))  fail(`focus: not a question: "${text}"`);
  const wc = words(text);
  if (wc > 22)              fail(`focus: ${wc} words (limit 18, with 4-word slack): "${text}"`);
  ok(`focus companion — ${wc} words, ${ms}ms: "${text}"`);
}

// ── 4. Triage hints — returns JSON {hints:[{id,hint}]}, hint ≤10 words ──────
{
  const tasks = [
    { id: 'manual_001', text: 'review contract with Acme', ageDays: 5,  sessions: 2 },
    { id: 'manual_002', text: 'call dentist',              ageDays: 1,  sessions: 0 },
    { id: 'manual_003', text: 'research new laptops',      ageDays: 12, sessions: 0 },
  ];

  const prompt =
    `Evening triage: the user has ${tasks.length} undone tasks. ` +
    `For each, provide a SHORT contextual hint (or null if no hint needed).\n\n` +
    `Current time: 21:00, Wednesday\n\n` +
    `Tasks:\n` +
    tasks.map(t =>
      `- "${t.text}" [id: ${t.id}] — ` +
      `${t.sessions > 0 ? t.sessions + ' focus sessions, ' : ''}${t.ageDays} days old`
    ).join('\n') +
    `\n\nReply ONLY with raw JSON (no markdown):\n` +
    `{\n  "hints": [\n` +
    `    { "id": "task_id", "hint": "short hint under 10 words" },\n` +
    `    { "id": "task_id", "hint": null }\n` +
    `  ]\n}`;

  const { status, body, ms } = await call({
    messages:     [{ role: 'user', content: prompt }],
    systemPrompt: 'You are a gentle assistant helping with evening task triage. ' +
                  'Be warm, brief, never preachy.',
  });
  if (status !== 200) fail(`triage: HTTP ${status}`);
  if (body.error)     fail(`triage: API error — ${body.error}`);

  // The function parses AI's text as JSON; on success body IS the hints object.
  // On JSON parse failure it wraps as {message:raw,actions:[...]}. Either way
  // we scan every string field for a hints array — handles preamble/postamble too.
  let hints = body.hints;
  if (!hints) {
    const raw = typeof body.message === 'string' ? body.message
              : typeof body.content === 'string' ? body.content : '';
    // Try direct parse of the message text
    try { hints = JSON.parse(raw).hints; } catch { /* fall through */ }
    // Try to extract a JSON block embedded anywhere in the text
    if (!hints) {
      const m = raw.match(/\{[\s\S]*?"hints"[\s\S]*?\}/);
      if (m) try { hints = JSON.parse(m[0]).hints; } catch { /* fall through */ }
    }
  }
  if (!Array.isArray(hints))
    fail(`triage: no "hints" array. Got: ${JSON.stringify(body).slice(0, 300)}`);

  const validIds = new Set(tasks.map(t => t.id));
  for (const h of hints) {
    if (!validIds.has(h.id))
      fail(`triage: unknown id "${h.id}" in hints`);
    if (h.hint !== null && typeof h.hint !== 'string')
      fail(`triage: hint for "${h.id}" is neither string nor null`);
    if (typeof h.hint === 'string' && words(h.hint) > 15)
      fail(`triage: hint for "${h.id}" too long (${words(h.hint)} words): "${h.hint}"`);
  }
  ok(`triage hints — ${hints.length} hints, ${ms}ms`);
}

// ── 5. Week reflection — 1 sentence, ≤20 words, no quotes ──────────────────
{
  const userContent =
    "Week summary: 18 tasks done, 95 min focus across 5 days. " +
    "Habits: 4/5 days all completed.\n" +
    "Memory: completes tasks faster in mornings, tends to defer complex tasks to SOON.";

  const { status, body, ms } = await call({
    messages:     [{ role: 'user', content: userContent }],
    systemPrompt: 'One sentence only. No quotes. Under 20 words. ' +
                  'Plain, warm, grounded. Use what you know about the person ' +
                  'to make it specific, not generic.',
  });
  if (status !== 200)     fail(`reflection: HTTP ${status}`);
  if (body.error)         fail(`reflection: API error — ${body.error}`);
  const text = (body.message || body.content || '').trim();
  if (!text)              fail('reflection: empty response');
  const wc = words(text);
  if (wc > 25)            fail(`reflection: ${wc} words (limit 20, with 5-word slack): "${text}"`);
  if (/^["']|["']$/.test(text)) fail(`reflection: response is wrapped in quotes: "${text}"`);
  ok(`week reflection — ${wc} words, ${ms}ms: "${text}"`);
}

console.log('\n✓ AI TIER TESTS PASSED');
