// TODAY — live synthetic test for dream reading (v2.92.0) and DreamBank night/language (v2.93.0).
//
// Speaks scripted clips with macOS `say`, encodes them the way the phone does
// (32 kbps Opus WebM), and runs them through the real meeting-extract and
// ai-assist handlers in-process: Gemini decides whether each clip is a dream,
// then the configured model reads the dreams. v2.93.0: Gemini also names which night
// (night_hint) and language (lang), and Claude extracts grounded images. No deploy needed.
//
// Run:       GEMINI_API_KEY=... ANTHROPIC_API_KEY=... node scripts/dream-live-test.mjs
// One phrase, raw reply printed (diagnose a real miss, BUG-110):
//            GEMINI_API_KEY=... node scripts/dream-live-test.mjs --say="I saw a dream last night..." [--voice=Yelda]
// Exit 0 = pass or skip (missing key or macOS audio tools). Exit 1 = a case failed.
// Excluded from the default gate: it spends real provider tokens.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const GEMINI = process.env.GEMINI_API_KEY || '';
const CLAUDE = process.env.ANTHROPIC_API_KEY || '';

const has = cmd => { try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true; } catch { return false; } };
const SAY = process.argv.find(a => a.startsWith('--say='))?.slice(6);
const VOICE = process.argv.find(a => a.startsWith('--voice='))?.slice(8) || 'Samantha';
if (SAY && GEMINI) {
  if (!has('say') || !has('ffmpeg')) { console.log('⚠ needs macOS `say` and ffmpeg'); process.exit(0); }
  process.env.GEMINI_API_KEY = GEMINI;
  const extract = require(join(ROOT, 'netlify/functions/meeting-extract.js')).handler;
  const dir = mkdtempSync(join(tmpdir(), 'dream-say-'));
  try {
    // m4a/AAC, as the iPhone PWA records it.
    execFileSync('say', ['-v', VOICE, '-o', join(dir, 'a.aiff'), SAY]);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(dir, 'a.aiff'), '-c:a', 'aac', '-b:a', '64k', join(dir, 'a.m4a')]);
    const audioChunk = readFileSync(join(dir, 'a.m4a')).toString('base64');
    const res = await extract({ httpMethod: 'POST', body: JSON.stringify({ audioChunk, mimeType: 'audio/mp4', userName: 'Can' }) });
    console.log(`HTTP ${res.statusCode}\n` + JSON.stringify(JSON.parse(res.body), null, 2));
  } finally { rmSync(dir, { recursive: true, force: true }); }
  process.exit(0);
}
if (!GEMINI || !CLAUDE) {
  console.log('⚠ skipped — set GEMINI_API_KEY and ANTHROPIC_API_KEY to run the live dream test');
  process.exit(0);
}
if (!has('say') || !has('ffmpeg')) {
  console.log('⚠ skipped — needs macOS `say` and ffmpeg to synthesize speech');
  process.exit(0);
}

// The handlers read these as server-side fallbacks; the client never sends keys here.
process.env.GEMINI_API_KEY = GEMINI;
process.env.ANTHROPIC_API_KEY = CLAUDE;
const extract = require(join(ROOT, 'netlify/functions/meeting-extract.js')).handler;
const assist  = require(join(ROOT, 'netlify/functions/ai-assist.js')).handler;
// The prompts and grounding live in assets/dreambank.js; load its pure core as the app does.
const _ctx = { window: {} };
_ctx.window.window = _ctx.window;
_ctx.window.Today = { define: (name, api) => { if (name === 'dream-core') _ctx.core = api; } };
vm.runInNewContext(readFileSync(join(ROOT, 'assets/dreambank.js'), 'utf8'), _ctx);
const { DREAM_SYSTEM, EXTRACT_SYSTEM, groundImages, resolveNight } = _ctx.core;

const CASES = [
  { id: 'dream-en', voice: 'Samantha', expect: { dream: true, noItems: true, lang: 'en', hint: 'last_night' },
    text: "I just woke up. I dreamt I was in my grandmother's kitchen, but the floor was water and I could walk on it. An old school friend was baking bread and didn't recognise me. I wasn't scared, just a bit sad." },
  { id: 'dream-tr', voice: 'Yelda', expect: { dream: true, noItems: true, lang: 'tr', hint: 'last_night' },
    text: 'Az önce uyandım. Rüyamda eski evimizdeydim, merdivenler hiç bitmiyordu ve yukarı çıktıkça ev büyüyordu. Annem bir kapının arkasından bana sesleniyordu ama kapıyı bulamıyordum.' },
  { id: 'dream-with-task', voice: 'Samantha', expect: { dream: true, itemMatch: /mum|mom|mother/i, noDreamItems: /flight|airport|plane/i },
    text: "Okay, I dreamt I missed a flight because the airport kept moving further away, and I had to catch a plane I never reached. Anyway, remind me to call mum today about her birthday." },
  // BUG-110: Can's real miss — one plain sentence, no story or feeling, measurements.
  { id: 'plain-en', voice: 'Samantha', expect: { dream: true, noItems: true, lang: 'en', hint: 'last_night' },
    text: 'I saw a dream last night. I saw a girl, she was 180 and 70 kilos.' },
  // Late capture (v2.93.0): the night is named in words; the phone resolves the date.
  { id: 'late-en', voice: 'Samantha', expect: { dream: true, noItems: true, lang: 'en', hint: 'nights_ago:2' },
    text: "The night before last I dreamt I was swimming in a library. The books were dry even under the water, and a librarian kept handing me a key." },
  { id: 'late-tr', voice: 'Yelda', expect: { dream: true, noItems: true, lang: 'tr', hint: 'last_night' },
    text: 'Dün gece rüyamda babamın eski arabasıyla bir köprüden geçiyordum. Köprü bitmiyordu ve radyoda hep aynı şarkı çalıyordu.' },
  { id: 'old-en', voice: 'Samantha', expect: { dream: true, noItems: true, lang: 'en', hint: 'long_ago' },
    text: "Here's a dream I had years ago, when I was a child. A giant white horse stood in our garden and I was allowed to ride it over the roofs." },
  { id: 'planning', voice: 'Samantha', expect: { dream: false, minItems: 1 },
    text: "Quick notes for today. I need to call the bank about the card, send the invoice to Robin by noon, and book a table for Friday dinner." },
  { id: 'figurative', voice: 'Samantha', expect: { dream: false },
    text: "Yesterday at work felt like a bad dream. I was drowning in emails all afternoon and the meeting went on forever. My dream is to take a long holiday one day." },
];

const work = mkdtempSync(join(tmpdir(), 'dream-live-'));
const clip = (c) => {
  const aiff = join(work, c.id + '.aiff'), webm = join(work, c.id + '.webm');
  execFileSync('say', ['-v', c.voice, '-o', aiff, c.text]);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', aiff, '-c:a', 'libopus', '-b:a', '32k', webm]);
  return readFileSync(webm).toString('base64');
};
// Provider overload (503/429) says nothing about the prompt; retry with backoff.
const call = async (handler, body) => {
  let out;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 2000 * 2 ** (attempt - 1)));
    const res = await handler({ httpMethod: 'POST', body: JSON.stringify(body) });
    out = { status: res.statusCode, body: JSON.parse(res.body) };
    if (out.status !== 503 && out.status !== 429) break;
  }
  return out;
};
// A rejected key makes every case fail the same way; stop once with a clear cause.
const keyRejected = (res, provider, envName) => {
  const msg = String(res.body?.error || '');
  if (![400, 401, 403].includes(res.status) || !/key|auth|permission/i.test(msg)) return false;
  console.log(`✗ ${provider} rejected ${envName}: ${msg.slice(0, 120)}`);
  console.log(`  Check the value you passed (no quotes, brackets, or spaces) and rerun. No cases were tested.`);
  return true;
};

// Turkish-specific letters, or at least two Turkish function words as whole
// whitespace-separated tokens (a \b match would find "ve" inside "you've").
const TR_WORDS = new Set(['ve', 'bir', 'bu', 'ama', 'gibi', 'olabilir', 'için', 'daha']);
const looksTurkish = s => /[çğıöşü]/i.test(s)
  || String(s).toLowerCase().split(/\s+/).map(w => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''))
       .filter(w => TR_WORDS.has(w)).length >= 2;
const sentences = s => s.split(/(?<=[.?])\s+/).filter(x => x.trim()).length;
// A reply that stops mid-sentence was cut by a token or length limit.
const endsWhole = s => /[.?!…"”')\]]\s*$/.test(String(s).trim());
const PREDICTIVE = /\b(will happen|is going to happen|means you will|predicts?|omen|diagnos)/i;

let failed = 0;
console.log('Dream live test — Gemini extraction + model reading\n');
try {
  for (const c of CASES) {
    const audioChunk = clip(c);
    const ex = await call(extract, { audioChunk, mimeType: 'audio/webm;codecs=opus', userName: 'Can' });
    if (keyRejected(ex, 'Gemini', 'GEMINI_API_KEY')) { failed = -1; break; }
    const problems = [];
    if (ex.status !== 200) problems.push(`extract HTTP ${ex.status}: ${JSON.stringify(ex.body).slice(0, 120)}`);
    const dream = String(ex.body.dream || '');
    const items = (ex.body.actionItems || []).map(i => i.text);
    const e = c.expect;
    if (e.dream && !dream) problems.push('dream not detected');
    if (e.dream === false && dream) problems.push('non-dream read as a dream');
    if (e.noItems && items.length) problems.push('tasks from inside the dream: ' + items.join(' | '));
    if (e.minItems && items.length < e.minItems) problems.push('expected tasks, got none');
    if (e.itemMatch && !items.some(t => e.itemMatch.test(t))) problems.push('real commitment lost: ' + JSON.stringify(items));
    if (e.noDreamItems && items.some(t => e.noDreamItems.test(t))) problems.push('dream content became a task: ' + items.join(' | '));
    if (e.lang === 'tr' && dream && !looksTurkish(dream)) problems.push('retelling not in Turkish');
    if (dream && !endsWhole(dream)) problems.push('retelling cut off mid-sentence');
    const hint = String(ex.body.night_hint || '');
    if (e.hint && hint !== e.hint) problems.push(`night_hint ${JSON.stringify(hint)}, expected ${e.hint}`);
    if (e.dream && e.lang && ex.body.lang !== e.lang) problems.push(`lang ${JSON.stringify(ex.body.lang)}, expected ${e.lang}`);
    if (!dream && (hint || ex.body.lang)) problems.push('night_hint/lang set without a dream');

    let reading = '';
    let images = [];
    if (dream) {
      const x = await call(assist, { provider: 'claude', systemPrompt: EXTRACT_SYSTEM, messages: [{ role: 'user', content: dream }] });
      const obj = Array.isArray(x.body.images) ? x.body : (() => { try { return JSON.parse(String(x.body.content || '').match(/\{[\s\S]*\}/)[0]); } catch { return null; } })();
      if (!obj || !Array.isArray(obj.images)) problems.push('extraction returned no JSON images');
      else {
        images = [...groundImages(obj.images, dream, ex.body.lang)];
        if (images.length < 3) problems.push(`only ${images.length} grounded images (raw: ${obj.images.join(' | ')})`);
      }
      const r = await call(assist, { provider: 'claude', systemPrompt: DREAM_SYSTEM, messages: [{ role: 'user', content: dream }] });
      if (keyRejected(r, 'Claude', 'ANTHROPIC_API_KEY')) { failed = -1; break; }
      reading = String(r.body.content || r.body.message || '').trim();
      if (r.status !== 200 || !reading) problems.push(`reading failed (HTTP ${r.status})`);
      else {
        const n = sentences(reading);
        if (n < 2 || n > 6) problems.push(`reading has ${n} sentences`);
        if (!endsWhole(reading)) problems.push('reading cut off mid-sentence');
        if (reading.includes('!')) problems.push('reading uses an exclamation mark');
        if (PREDICTIVE.test(reading)) problems.push('reading predicts or diagnoses');
        if (e.lang === 'tr' && !looksTurkish(reading)) problems.push('reading not in Turkish');
        if (e.lang === 'en' && looksTurkish(reading)) problems.push('reading not in English');
      }
    }

    const mark = problems.length ? '✗' : '✓';
    if (problems.length) failed++;
    console.log(`${mark} ${c.id}`);
    // Printed in full: a display trim would hide a real cut-off.
    console.log(`    dream:   ${dream || '(none)'}`);
    console.log(`    tasks:   ${items.length ? items.join(' | ') : '(none)'}`);
    if (dream) console.log(`    night:   ${hint || '(none)'} → ${resolveNight(hint, Date.now()).night || 'undated'} · lang ${ex.body.lang || '(none)'}`);
    if (images.length) console.log(`    images:  ${images.join(' | ')}`);
    if (reading) console.log(`    reading: ${reading}  [${reading.length} chars]`);
    problems.forEach(p => console.log('    → ' + p));
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failed === -1) process.exit(1);
console.log(failed ? `\n✗ ${failed} of ${CASES.length} cases failed` : `\n✓ all ${CASES.length} cases passed`);
process.exit(failed ? 1 : 0);
