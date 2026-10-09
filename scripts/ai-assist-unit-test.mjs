// TODAY — ai-assist handler contract, offline (provider fetch stubbed).
// Plain-text replies must reach clients whole: every prose surface reads
// data.content || data.message, and message is capped at 200 characters.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { handler } = require(join(ROOT, 'netlify/functions/ai-assist.js'));

const LONG = 'The water under your feet may reflect something familiar that feels less certain right now. '
  + 'The friend who does not know you might point to a past self that feels far away. '
  + 'The quiet sadness could be worth noticing, gently, over the next few days.';
assert.ok(LONG.length > 200, 'fixture must exceed the old cap');

const realFetch = globalThis.fetch;
let lastRequest = null;
const stub = (reply) => {
  globalThis.fetch = async (url, options) => {
    lastRequest = { url: String(url), body: JSON.parse(options.body) };
    return { ok: true, status: 200, text: async () => JSON.stringify(reply) };
  };
};
const run = async (provider, surface, extra = {}) => {
  const res = await handler({ httpMethod: 'POST', body: JSON.stringify({
    provider, apiKey: 'test-key', systemPrompt: 'Be brief.', surface,
    messages: [{ role: 'user', content: 'hi' }], ...extra,
  }) });
  return { status: res.statusCode, body: JSON.parse(res.body) };
};
const ok = message => console.log('  ✓ ' + message);

try {
  stub({ content: [{ type: 'text', text: LONG }] });
  let r = await run('claude');
  assert.equal(r.status, 200);
  assert.equal(r.body.content, LONG, 'Claude plain text must arrive whole in content');
  assert.equal(r.body.message.length, 200, 'message keeps its 200-char shape for the suggestion chip');
  assert.deepEqual(lastRequest.body.thinking, { type: 'disabled' }, 'unmarked callers retain their current thinking policy');
  assert.equal(lastRequest.body.max_tokens, 512);
  ok('Claude plain-text reply arrives whole; unmarked callers stay unchanged');

  stub({ content: [{ type: 'thinking', thinking: 'PRIVATE_THINKING' },
    { type: 'redacted_thinking', data: 'PRIVATE_REDACTED' },
    { type: 'text', text: 'An appointment needs a morning window.' }], stop_reason: 'end_turn' });
  r = await run('claude', 'daily-nudge', { max_tokens: 999999, thinking: { type: 'disabled' }, model: 'override' });
  assert.equal(r.status, 200);
  assert.deepEqual(lastRequest.body.thinking, { type: 'adaptive' });
  assert.equal(lastRequest.body.max_tokens, 2048, 'daily policy reserves room for reasoning and text, with a fixed ceiling');
  assert.equal(lastRequest.body.model, 'claude-sonnet-5', 'surface does not change the model');
  assert.equal(r.body.content, 'An appointment needs a morning window.');
  assert.ok(!JSON.stringify(r.body).includes('PRIVATE_'), 'thinking must never reach the client');
  assert.ok(!('surface' in lastRequest.body), 'routing marker is not sent to Claude');
  ok('daily nudges use adaptive thinking; only the final text reaches the client');

  for (const surface of ['focus', 'sunday', 'DAILY-NUDGE', null, { type: 'daily-nudge' }]) {
    await run('claude', surface);
    assert.deepEqual(lastRequest.body.thinking, { type: 'disabled' });
    assert.equal(lastRequest.body.max_tokens, 512);
  }
  ok('only the exact daily-nudge marker changes thinking and budget');

  for (const content of [[{ type: 'thinking', thinking: 'PRIVATE_THINKING' }],
    [{ type: 'text', text: 'An unfinished sentence' }]]) {
    stub({ content, stop_reason: 'max_tokens' });
    r = await run('claude', 'daily-nudge');
    assert.equal(r.status, 502, 'a capped daily reply must use the existing bounded failure recovery, not cache partial prose');
    assert.deepEqual(r.body, { error: 'Daily nudge response incomplete' });
  }
  ok('thinking-only and partial replies at the token ceiling are not accepted');

  stub({ content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'First part. ' }, { type: 'text', text: 'Second part.' }] });
  r = await run('claude');
  assert.equal(r.body.content, 'First part. Second part.', 'text is read from every text block, not content[0]');
  ok('text is joined from all text blocks, skipping non-text blocks');

  stub({ content: [{ type: 'text', text: '{"suggest":true,"type":"break_down","message":"Two steps"}' }] });
  r = await run('claude');
  assert.equal(r.body.suggest, true);
  assert.equal(r.body.message, 'Two steps', 'structured JSON replies are still passed through as-is');
  ok('structured JSON replies are unchanged');

  stub({ candidates: [{ content: { parts: [{ text: LONG }] } }] });
  r = await run('gemini');
  assert.equal(r.body.content, LONG, 'Gemini plain text must arrive whole too');
  r = await run('gemini', 'daily-nudge');
  assert.equal(r.body.content, LONG);
  assert.equal(lastRequest.body.generationConfig.maxOutputTokens, 512);
  assert.deepEqual(lastRequest.body.generationConfig.thinkingConfig, { thinkingBudget: 0 });
  ok('Gemini plain-text reply arrives whole');
} finally {
  globalThis.fetch = realFetch;
}
console.log('✓ AI-ASSIST UNIT TEST PASSED');
