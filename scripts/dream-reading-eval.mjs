// TODAY — dream reading quality eval.
//
// Scores the dream-reading prompt on how specific and useful its readings are,
// using the app's own ai-assist handler (Claude) both to write each reading and
// to judge it. Three measures per reading:
//   swap        — shown the reading and two dreams (its own and a similar one),
//                 can the judge tell which it was written for? Generic readings fail.
//   specificity — 1–5: grounded in this dream's concrete details vs. stock symbolism.
//   usefulness  — 1–5: leaves something worth reflecting on today, held lightly.
//
// Run:      ANTHROPIC_API_KEY=... node scripts/dream-reading-eval.mjs
// Score:    ... node scripts/dream-reading-eval.mjs --prompt=path/to/candidate.txt
// Head-to-head (current vs candidate, judge picks the better reading per dream):
//            ... node scripts/dream-reading-eval.mjs --versus=scripts/dream-prompts/candidate-1.txt
// Options:  --runs=N (readings per dream, default 1)   --out=results.json
// Not part of the test gate: it spends real tokens (~36 calls per run at runs=1).

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

if (!process.env.ANTHROPIC_API_KEY) {
  console.log('⚠ skipped — set ANTHROPIC_API_KEY to run the dream reading eval');
  process.exit(0);
}
const { handler } = require(join(ROOT, 'netlify/functions/ai-assist.js'));

const meetingSrc = readFileSync(join(ROOT, 'assets/meeting.js'), 'utf8');
const CURRENT = [...meetingSrc.match(/const _DREAM_SYSTEM =([\s\S]*?);\n/)[1].matchAll(/'([^']*)'/g)].map(m => m[1]).join('');
const promptPath = arg('prompt');
const PROMPT = promptPath ? readFileSync(promptPath, 'utf8').trim() : CURRENT;
const RUNS = Math.max(1, parseInt(arg('runs') || '1', 10));
const versusPath = arg('versus');

// Retellings as meeting-extract returns them: first person, faithful, no interpretation.
// Each dream names a distractor on a similar theme, so the swap test can't be passed
// by matching the theme alone — only by using this dream's particulars.
const DREAMS = [
  { id: 'water-kitchen', twin: 'flood-office', text: "I was in my grandmother's kitchen, but the floor was water and I could walk on it. An old school friend was baking bread and didn't recognise me. I wasn't scared, just a bit sad." },
  { id: 'flood-office', twin: 'water-kitchen', text: "My office was flooding slowly and everyone kept working at their desks as if nothing was happening. I kept lifting my laptop higher. Nobody would look at me when I pointed at the water." },
  { id: 'missed-flight', twin: 'late-exam', text: "I missed a flight because the airport kept moving further away. My bag was packed with my father's old coats, not my clothes. I remember feeling relieved when the plane left without me." },
  { id: 'late-exam', twin: 'missed-flight', text: "I was late for a maths exam at my old school, but I'm an adult now and the teacher was my current manager. I had written the answers on my hand and they were in a language I couldn't read." },
  { id: 'teeth', twin: 'hair', text: "My teeth were coming loose one by one while I was giving a presentation. I kept talking and put them in my pocket. My partner was in the front row taking notes and smiling." },
  { id: 'hair', twin: 'teeth', text: "I looked in the mirror and my hair had turned completely white overnight. I liked it. My sister was upset and kept trying to dye it back while I was asleep inside the dream." },
  { id: 'chase-dog', twin: 'chase-stranger', text: "A small friendly dog was chasing me through a market in Izmir. I kept running even though I knew it only wanted to play. I hid in a shop that sold only clocks, all showing different times." },
  { id: 'chase-stranger', twin: 'chase-dog', text: "Someone in a grey coat followed me through the metro for hours. When I finally turned around to face them, it was me, older, holding the keys to a house I don't have yet." },
  { id: 'dead-grandfather', twin: 'ex-partner', text: "My grandfather, who died two years ago, was fixing my bicycle in the garden. He didn't say anything important, just asked if I was eating properly. I woke up feeling calm." },
  { id: 'ex-partner', twin: 'dead-grandfather', text: "My ex was living in my flat and had rearranged all the furniture. We weren't arguing. She showed me where she had put my notebooks and I thanked her." },
  { id: 'tr-stairs', twin: 'tr-sea', text: 'Rüyamda eski evimizdeydim. Merdivenler hiç bitmiyordu ve yukarı çıktıkça ev büyüyordu. Annem bir kapının arkasından bana sesleniyordu ama kapıyı bulamıyordum.' },
  { id: 'tr-sea', twin: 'tr-stairs', text: 'Rüyamda denizin ortasında küçük bir kayıktaydım. Kardeşim kıyıda el sallıyordu ama sesi çok yakından geliyordu. Kürek yoktu ama hiç korkmadım.' },
];

const call = async (systemPrompt, content) => {
  let out;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 2000 * 2 ** (attempt - 1)));
    const res = await handler({ httpMethod: 'POST', body: JSON.stringify({
      provider: 'claude', apiKey: process.env.ANTHROPIC_API_KEY, systemPrompt,
      messages: [{ role: 'user', content }],
    }) });
    out = { status: res.statusCode, body: JSON.parse(res.body) };
    if (out.status !== 503 && out.status !== 429 && out.status !== 529) break;
  }
  if (out.status !== 200) {
    const msg = String(out.body?.error || '');
    if ([400, 401, 403].includes(out.status) && /key|auth|permission/i.test(msg)) {
      console.log(`✗ Claude rejected ANTHROPIC_API_KEY: ${msg.slice(0, 120)}`);
      process.exit(1);
    }
    throw new Error(`HTTP ${out.status}: ${msg.slice(0, 120)}`);
  }
  return out.body;
};
const text = body => String(body.content || body.message || '').trim();

// Judge prompts state what to measure, never what a good answer looks like.
const SWAP_JUDGE =
  'You will see one dream reading and two dreams, A and B. Decide which dream the reading was written for, ' +
  'using only evidence in the reading that ties it to one dream\'s particular details. ' +
  'Reply ONLY with JSON: {"choice":"A"} or {"choice":"B"}.';
const SCORE_JUDGE =
  'You evaluate a short reading of a dream. Score two things from 1 to 5. ' +
  'specificity: how far the reading works with this dream\'s own concrete details — its particular people, places, ' +
  'objects, actions, and the dreamer\'s stated feelings — rather than general symbol meanings or statements that ' +
  'would fit most dreams or most people. ' +
  'usefulness: whether it leaves the dreamer something worth reflecting on in their waking life today, offered as a ' +
  'possibility rather than a verdict or prediction. ' +
  'Also list up to three phrases from the reading that could appear unchanged in a reading of an unrelated dream. ' +
  'Reply ONLY with JSON: {"specificity":n,"usefulness":n,"generic":["..."]}.';

const PAIR_JUDGE =
  'You will see a dream and two readings of it, 1 and 2, written for someone who has just woken up. ' +
  'Choose the reading that would help them more: the one that finds what is most alive or strange in this ' +
  'particular dream and leaves them a question worth carrying into the day, without padding, stock symbolism, ' +
  'or guesses about their life that the dream does not support. Judge substance, not length. ' +
  'Reply ONLY with JSON: {"better":1} or {"better":2}.';

const byId = Object.fromEntries(DREAMS.map(d => [d.id, d]));
const words = s => s.split(/\s+/).filter(Boolean).length;

if (versusPath) {
  const CANDIDATE = readFileSync(versusPath, 'utf8').trim();
  console.log(`Dream reading head-to-head — current vs ${versusPath}, runs=${RUNS}\n`);
  const pairs = [];
  for (let run = 0; run < RUNS; run++) {
    for (const [i, d] of DREAMS.entries()) {
      const current = text(await call(CURRENT, d.text));
      const candidate = text(await call(CANDIDATE, d.text));
      // Alternate which reading is shown first so position bias cancels out.
      const candidateFirst = (i + run) % 2 === 0;
      const [one, two] = candidateFirst ? [candidate, current] : [current, candidate];
      const verdict = await call(PAIR_JUDGE, `Dream:\n${d.text}\n\nReading 1:\n${one}\n\nReading 2:\n${two}`);
      const pick = Number(verdict.better);
      const candidateWins = pick === (candidateFirst ? 1 : 2);
      pairs.push({ id: d.id, run, candidateWins, current, candidate, currentWords: words(current), candidateWords: words(candidate) });
      console.log(`${candidateWins ? 'candidate' : 'current  '}  ${d.id.padEnd(17)} ${words(current)} → ${words(candidate)} words`);
      console.log(`    current:   ${current}`);
      console.log(`    candidate: ${candidate}`);
    }
  }
  const wins = pairs.filter(p => p.candidateWins).length;
  const avg = key => Math.round(pairs.reduce((s, p) => s + p[key], 0) / pairs.length);
  console.log(`\nCandidate preferred in ${wins}/${pairs.length} (${Math.round(wins / pairs.length * 100)}%) · average length ${avg('currentWords')} → ${avg('candidateWords')} words`);
  const out = arg('out');
  if (out) { writeFileSync(out, JSON.stringify({ versus: versusPath, candidate: CANDIDATE, wins, pairs }, null, 2)); console.log(`Saved ${out}`); }
  process.exit(0);
}
const rows = [];
console.log(`Dream reading eval — ${promptPath ? 'candidate prompt ' + promptPath : 'current prompt (assets/meeting.js)'}, runs=${RUNS}\n`);

for (let run = 0; run < RUNS; run++) {
  for (const [i, d] of DREAMS.entries()) {
    const reading = text(await call(PROMPT, d.text));
    const twin = byId[d.twin];
    // Alternate the true dream's position so position bias cancels out.
    const trueIsA = (i + run) % 2 === 0;
    const [a, b] = trueIsA ? [d, twin] : [twin, d];
    const swap = await call(SWAP_JUDGE, `Reading:\n${reading}\n\nDream A:\n${a.text}\n\nDream B:\n${b.text}`);
    const swapCorrect = (swap.choice === 'A') === trueIsA && ['A', 'B'].includes(swap.choice);
    const score = await call(SCORE_JUDGE, `Dream:\n${d.text}\n\nReading:\n${reading}`);
    const row = {
      id: d.id, run, reading, chars: reading.length, swapCorrect,
      specificity: Number(score.specificity) || 0, usefulness: Number(score.usefulness) || 0,
      generic: Array.isArray(score.generic) ? score.generic.slice(0, 3) : [],
    };
    rows.push(row);
    console.log(`${swapCorrect ? '✓' : '✗'} ${d.id.padEnd(17)} spec ${row.specificity}  use ${row.usefulness}  ${row.chars} chars`);
    console.log(`    ${reading}`);
    if (row.generic.length) console.log(`    generic: ${row.generic.map(g => `"${g}"`).join(' · ')}`);
  }
}

const n = rows.length;
const mean = key => (rows.reduce((s, r) => s + r[key], 0) / n).toFixed(2);
const summary = {
  prompt: promptPath || 'current',
  readings: n,
  swapAccuracy: Math.round(rows.filter(r => r.swapCorrect).length / n * 100),
  specificity: Number(mean('specificity')),
  usefulness: Number(mean('usefulness')),
  withGenericPhrases: rows.filter(r => r.generic.length).length,
};
console.log(`\nSwap accuracy ${summary.swapAccuracy}%  ·  specificity ${summary.specificity}/5  ·  usefulness ${summary.usefulness}/5  ·  ${summary.withGenericPhrases}/${n} readings with generic phrases`);
console.log('Swap accuracy near 50% means readings are interchangeable; compare prompts on the same --runs.');
const out = arg('out');
if (out) {
  writeFileSync(out, JSON.stringify({ summary, prompt: PROMPT, rows }, null, 2));
  console.log(`Saved ${out}`);
}
