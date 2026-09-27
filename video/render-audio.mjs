// TODAY — video audio, rendered from the app's own sound language
// No third-party music: the bed is synthesised from the same sine palette as
// assets/sound.js, and the SFX are the app's real functions (playCompleteSound,
// playStartSound, playChime) run unmodified against an OfflineAudioContext.
//
// Usage (from video/):
//   node render-audio.mjs              — writes audio/*.wav
//   node render-audio.mjs --length 32  — bed length in seconds (default 32)
//   node render-audio.mjs --length 80 --bed bed-80.wav   — another length, own file
//
// Output (committed — ours by construction, no licence question):
//   audio/bed.wav            ambient pad, slow, warm, resolves downward
//   audio/sfx-complete.wav   task checked
//   audio/sfx-start.wav      focus session starts
//   audio/sfx-chime.wav      session end / closing sting
//   audio/sfx-habit.wav      habit checked

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname }              from 'node:path';
import { fileURLToPath }              from 'node:url';
import puppeteer                      from 'puppeteer-core';

const DIR    = dirname(fileURLToPath(import.meta.url));
const OUT    = join(DIR, 'audio');
const LENGTH = Number(process.argv.find((_, i) => process.argv[i - 1] === '--length') || 32);
const BED    = process.argv.find((_, i) => process.argv[i - 1] === '--bed') || 'bed.wav';
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RATE   = 48000;

const soundJs = await readFile(join(DIR, '..', 'assets', 'sound.js'), 'utf8');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run'] });
const page    = await browser.newPage();
await page.setContent('<!doctype html><body></body>');
await page.addScriptTag({ content: soundJs });

// ── In-page helpers: WAV encoder + a render wrapper that points the app's
//    _getAudioCtx at an OfflineAudioContext for the duration of one call.
await page.evaluate(RATE => {
  window.__wav = buffer => {
    const ch = buffer.numberOfChannels, len = buffer.length;
    const view = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const str = (o, s) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); view.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, ch, true); view.setUint32(24, RATE, true);
    view.setUint32(28, RATE * ch * 2, true); view.setUint16(32, ch * 2, true);
    view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, len * ch * 2, true);
    const data = [...Array(ch)].map((_, c) => buffer.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++, o += 2) {
      view.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 0x7fff, true);
    }
    let bin = ''; const bytes = new Uint8Array(view.buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  window.__renderSfx = async (fnName, seconds) => {
    const ctx = new OfflineAudioContext(2, Math.ceil(RATE * seconds), RATE);
    const real = window._getAudioCtx;
    window._getAudioCtx = () => ctx;
    try { window[fnName](); } finally { window._getAudioCtx = real; }
    return window.__wav(await ctx.startRendering());
  };
}, RATE);

// ── The bed ──────────────────────────────────────────────────────────────────
// Sine only, like the app. Four slow chords in A, each a stack of detuned sines
// under a soft low-pass; a sparse bell line that falls the way `complete` falls
// (a step, then a larger step down). No percussion, no build.
const bed = await page.evaluate(async (RATE, LENGTH) => {
  const ctx = new OfflineAudioContext(2, RATE * LENGTH, RATE);
  const hz = n => 440 * 2 ** ((n - 69) / 12); // MIDI → Hz

  // Room: a short, dark, generated impulse — soft space, not a hall.
  const verb = ctx.createConvolver();
  const ir = ctx.createBuffer(2, RATE * 2.8, RATE);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3.2;
  }
  verb.buffer = ir;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 0.3;
  const dry = ctx.createGain(); dry.gain.value = 0.72;
  const wet = ctx.createGain(); wet.gain.value = 0.38;
  const master = ctx.createGain();
  lp.connect(dry).connect(master); lp.connect(verb).connect(wet).connect(master);
  master.connect(ctx.destination);
  // Whole-bed envelope: 2s fade in, 3s fade out.
  master.gain.setValueAtTime(0.0001, 0);
  master.gain.exponentialRampToValueAtTime(0.9, 2);
  master.gain.setValueAtTime(0.9, LENGTH - 3);
  master.gain.exponentialRampToValueAtTime(0.0001, LENGTH - 0.05);

  function voice(freq, t0, t1, vol, pan) {
    const g = ctx.createGain(), p = ctx.createStereoPanner();
    p.pan.value = pan; g.connect(p).connect(lp);
    for (const cents of [-4, 4]) { // gentle chorus from two detuned sines
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.value = freq; o.detune.value = cents;
      o.connect(g); o.start(t0); o.stop(t1 + 0.1);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 1.8);          // slow swell
    g.gain.setValueAtTime(vol, Math.max(t0 + 1.8, t1 - 1.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t1);              // long release
  }

  // A — F#m — D — E(sus) → A: warm, open voicings; each chord overlaps the next.
  const chords = [
    [45, 57, 64, 68, 71],  // Aadd9
    [42, 54, 61, 64, 69],  // F#m7
    [38, 50, 57, 62, 66],  // Dmaj
    [40, 52, 59, 64, 69],  // Esus4
  ];
  const span = (LENGTH - 4) / chords.length;
  chords.forEach((notes, i) => {
    const t0 = i * span, t1 = Math.min(LENGTH, t0 + span + 1.6);
    notes.forEach((n, j) => voice(hz(n), t0, t1, j === 0 ? 0.06 : 0.035, (j % 2 ? 0.25 : -0.25) * (j / notes.length)));
  });
  // Final resolve to A under the closing card.
  [33, 45, 57, 64, 69].forEach((n, j) => voice(hz(n), LENGTH - 4, LENGTH, j < 2 ? 0.05 : 0.03, 0));

  // Bell line — the `complete` gesture (step down, larger step down), sparse.
  function bell(freq, t, vol = 0.05) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq; o.connect(g).connect(lp);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.start(t); o.stop(t + 2.5);
  }
  const phrases = [[76, 73, 69], [73, 69, 66], [74, 71, 69], [76, 71, 69]];
  phrases.forEach((ph, i) => ph.forEach((n, k) => bell(hz(n), i * span + 2.2 + k * 1.1)));

  return window.__wav(await ctx.startRendering());
}, RATE, LENGTH);

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, BED), Buffer.from(bed, 'base64'));
console.log(`  ✓ ${BED} (${LENGTH}s)`);

for (const [file, fn, secs] of [
  ['sfx-complete.wav', 'playCompleteSound', 0.4],
  ['sfx-start.wav',    'playStartSound',    0.3],
  ['sfx-chime.wav',    'playChime',         1.3],
  ['sfx-habit.wav',    'playHabitDoneSound', 0.45],
]) {
  await writeFile(join(OUT, file), Buffer.from(await page.evaluate((f, s) => window.__renderSfx(f, s), fn, secs), 'base64'));
  console.log(`  ✓ ${file}`);
}
await browser.close();
