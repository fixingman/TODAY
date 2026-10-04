// meeting-extract unit test — the handler with Gemini replaced by canned responses.
// Pins BUG-110: a reply the model did not mean as "nothing" (blocked, cut off, prose
// around the JSON) must not come back as a silent empty result.
// Run: node scripts/meeting-extract-unit-test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { handler } = require('../netlify/functions/meeting-extract.js');
const ok = msg => console.log('  ✓ ' + msg);

let sent = null;
const reply = (gemini, status = 200) => {
  globalThis.fetch = async (_url, opts) => {
    sent = JSON.parse(opts.body);
    return { ok: status === 200, status, text: async () => JSON.stringify(gemini) };
  };
};
const text = t => ({ candidates: [{ content: { parts: [{ text: t }] }, finishReason: 'STOP' }] });
const run = async () => {
  const res = await handler({ httpMethod: 'POST', body: JSON.stringify({ audioChunk: 'AAAA', mimeType: 'audio/mp4', userName: 'Can', apiKey: 'k' }) });
  return JSON.parse(res.body);
};

const dream = { actionItems: [], updatedContext: 'one speaker', dream: 'Last night I saw a girl; she was 180 cm and 70 kg.', lang: 'en' };

reply(text(JSON.stringify(dream)));
let out = await run();
assert.equal(out.dream, dream.dream);
assert.ok(!('night_hint' in out), 'no night is asked for or returned');
assert.equal(out.lang, 'en');
assert.equal(out.note, undefined);
assert.equal(sent.generationConfig.responseMimeType, 'application/json');
const prompt = sent.systemInstruction.parts[0].text;
assert.match(prompt, /talking to their phone/);
assert.match(prompt, /single plain sentence/);
assert.doesNotMatch(prompt, /night_hint/);
ok('a plain one-sentence dream passes through; JSON mode and the short-dream principle are sent');

reply(text('Here is the JSON you asked for:\n' + JSON.stringify(dream) + '\nHope that helps.'));
out = await run();
assert.equal(out.dream, dream.dream, 'prose around the JSON still parses');
ok('prose around the JSON no longer turns a dream into "nothing came up"');

reply({ candidates: [{ finishReason: 'SAFETY' }] });
out = await run();
assert.deepEqual([out.dream, out.actionItems.length, out.note], ['', 0, 'empty: safety']);
reply({ promptFeedback: { blockReason: 'OTHER' } });
assert.equal((await run()).note, 'empty: other');
reply(text('{"actionItems": [ unfinished'));
assert.equal((await run()).note, 'unreadable reply');
ok('blocked, empty, and unreadable replies return empty with a note naming why');

reply(text(JSON.stringify({ ...dream, night_hint: 'last_night', lang: 'English' })));
out = await run();
assert.deepEqual([out.night_hint, out.lang], [undefined, '']);
reply(text(JSON.stringify({ actionItems: [], updatedContext: '', dream: '', lang: 'en' })));
out = await run();
assert.equal(out.lang, '');
ok('lang is validated and dropped without a dream; a stray night_hint is not passed on');

console.log('\nmeeting-extract unit tests passed.');
