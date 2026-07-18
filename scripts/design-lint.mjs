// TODAY — design lint
// Answers one question before every push: does the app still follow its own
// design rules? Pure static analysis of index.html — no browser, no build step.
// Checks token hygiene (Rule 19/22), CSS hygiene, voice/vocabulary (Philosophy.md),
// emoji-selector rule (Rule 20), and a soft parity check for Rule 27.
//
// This is NOT the "does it match the product philosophy" review — that needs
// judgment, not regex. Use the /design-review skill for that. This script only
// catches objective, mechanical violations of documented rules.
//
// Run from repo root:  node scripts/design-lint.mjs
// ~1s. No dependencies.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = await readFile(join(ROOT, 'index.html'), 'utf8');

let failures = 0;
let warnings = 0;
const fail = (msg) => { console.error('✗ FAIL — ' + msg); failures++; };
const warn = (msg) => { console.warn('⚠ WARN — ' + msg); warnings++; };
const ok   = (msg) => console.log('  ✓ ' + msg);

const lineOf = (str, index) => str.slice(0, index).split('\n').length;

// Replace matched text with same-length whitespace, preserving newlines (and thus
// line numbers) so later regex offsets against the ORIGINAL src stay accurate.
const blank = (text) => text.replace(/[^\n]/g, ' ');

// Comment-stripped working copy — used wherever a check must ignore text that
// never reaches the user (HTML <!-- --> and CSS/JS /* */ block comments). Line
// comments (//) are deliberately NOT stripped: distinguishing `// comment` from
// `"https://..."` inside a string needs a real tokenizer, and getting it wrong
// risks silently hiding a real violation — safer to accept occasional // noise.
const scanSrc = src
  .replace(/<!--[\s\S]*?-->/g, blank)
  .replace(/\/\*[\s\S]*?\*\//g, blank);

// uiSrc — scanSrc with `//` line comments ALSO stripped. Used only by checks
// whose rule is about *rendered UI text* (voice Rule 3, emoji Rule 20): a "!" or
// a bare emoji glyph inside a dev comment isn't a shipped-text violation. The
// `(?<![:/])` lookbehind leaves `https://` and `///` alone so real URLs in
// strings aren't truncated. scanSrc (comments-in) is still used for banned
// vocabulary, where a phrase in a comment is a deliberate early-warning signal.
const uiSrc = scanSrc.replace(/(?<![:/])\/\/[^\n]*/g, blank);

// ── Extract all <style>...</style> blocks (main doc + PiP-injected) ──────────
// Textual regex extraction against the comment-stripped copy, not DOM parsing —
// this also catches the PiP style block even though it's embedded inside a JS
// template literal (still the literal substring "<style>...</style>" in the
// source), and comment-stripping first prevents a "<style>" mention inside an
// HTML comment from being mistaken for a real opening tag.
const styleBlocks = [...scanSrc.matchAll(/<style>([\s\S]*?)<\/style>/g)]
  .map(m => ({ text: m[1], offset: m.index + '<style>'.length }));

if (!styleBlocks.length) fail('no <style> blocks found — extraction regex may be broken');

// ── Check 1: hardcoded hex/rgba outside :root (Rule 19) ──────────────────────
// Excludes: :root { ... } blocks themselves (both main + PiP — PiP literals are
// a documented, intentional exception since it's an isolated document that can't
// inherit the main page's custom properties). Also excludes url(#...) SVG refs
// and CSS comments, which can contain # without being a color.
{
  let hexHits = [];
  for (const block of styleBlocks) {
    // Strip :root { ... } sub-blocks (non-greedy to first closing brace — custom
    // property declarations never contain braces, so this is safe). Comments
    // are already stripped upstream (scanSrc).
    const stripped = block.text.replace(/:root\s*\{[^}]*\}/g, blank);

    const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
    let m;
    while ((m = hexRe.exec(stripped))) {
      // url(#fragment) refs (SVG filters/gradients) aren't colors.
      const precedingText = stripped.slice(Math.max(0, m.index - 5), m.index);
      if (/url\($/.test(precedingText)) continue;
      hexHits.push({ value: m[0], line: lineOf(src, block.offset + m.index) });
    }
    const rgbaRe = /rgba?\([^)]*\)/g;
    while ((m = rgbaRe.exec(stripped))) {
      hexHits.push({ value: m[0], line: lineOf(src, block.offset + m.index) });
    }
  }
  if (hexHits.length) {
    fail(`${hexHits.length} hardcoded color(s) outside :root (Rule 19 — tokenize instead):`);
    for (const h of hexHits.slice(0, 15)) console.error(`    line ${h.line}: ${h.value}`);
    if (hexHits.length > 15) console.error(`    ...and ${hexHits.length - 15} more`);
  } else {
    ok('no hardcoded hex/rgba outside :root');
  }
}

// ── Check 2: transition: all (CSS Token Health, Performance-audit.md) ────────
{
  let hits = [];
  for (const block of styleBlocks) {
    const re = /transition\s*:\s*all\b/g;
    let m;
    while ((m = re.exec(block.text))) hits.push(lineOf(src, block.offset + m.index));
  }
  if (hits.length) {
    fail(`${hits.length} "transition: all" (use specific properties): lines ${hits.join(', ')}`);
  } else {
    ok('no "transition: all"');
  }
}

// ── Check 3: undefined CSS var(--x) references ────────────────────────────────
{
  const defined = new Set();
  for (const block of styleBlocks) {
    const re = /--([a-zA-Z0-9-]+)\s*:/g;
    let m;
    while ((m = re.exec(block.text))) defined.add(m[1]);
  }
  const used = new Map(); // name -> first line
  for (const block of styleBlocks) {
    const re = /var\(\s*--([a-zA-Z0-9-]+)/g;
    let m;
    while ((m = re.exec(block.text))) {
      if (!used.has(m[1])) used.set(m[1], lineOf(src, block.offset + m.index));
    }
  }
  const undef = [...used.entries()].filter(([name]) => !defined.has(name));
  if (undef.length) {
    fail(`${undef.length} undefined CSS var(s) referenced:`);
    for (const [name, line] of undef) console.error(`    line ${line}: var(--${name})`);
  } else {
    ok(`no undefined CSS vars (${defined.size} tokens defined, all references resolve)`);
  }
}

// ── Check 4: banned vocabulary (Philosophy.md → Vocabulary table) ────────────
// Scans the comment-stripped copy (scanSrc: block comments + HTML comments
// removed, line comments kept) for literal banned strings. Phrases are specific
// enough (multi-word, exact casing) that a stray hit in JS logic or a // comment
// is unlikely — and a banned phrase in a line comment is often about to become a
// real string anyway, so keeping those visible is deliberate.
{
  const banned = [
    'No tasks', 'All tasks done', 'Good job',
    'Clear done tasks', 'Loading…', 'Loading...',
  ];
  let hits = [];
  for (const phrase of banned) {
    let idx = -1;
    while ((idx = scanSrc.indexOf(phrase, idx + 1)) !== -1) {
      hits.push({ phrase, line: lineOf(src, idx) });
    }
  }
  if (hits.length) {
    fail(`${hits.length} banned phrase(s) from Philosophy.md Vocabulary table:`);
    for (const h of hits) console.error(`    line ${h.line}: "${h.phrase}"`);
  } else {
    ok('no banned vocabulary (Philosophy.md table)');
  }
}

// ── Check 5: exclamation marks in user-facing string literals (voice Rule 3) ─
// A letter immediately followed by "!" that isn't "!=" catches sentence-end
// exclamations both before a closing quote ("done!") AND mid-string
// ("Connected! Loading…") — the earlier ["'<]-terminated version silently
// missed the mid-string case (2 of 3 real hits). Negation (!x) and comparison
// (a !== b) put a non-letter or space before the "!", so requiring a letter
// directly before it already excludes them; the (?!=) lookahead drops "a!=b".
{
  const re = /[a-zA-Z]!(?!=)/g;
  let hits = [];
  let m;
  while ((m = re.exec(uiSrc))) {
    // "!important" starts with a non-letter delimiter, so the letter-before-!
    // requirement already excludes it; this guard is belt-and-suspenders.
    const context = uiSrc.slice(Math.max(0, m.index - 20), m.index + 20);
    if (context.includes('!important')) continue;
    hits.push(lineOf(src, m.index));
  }
  if (hits.length) {
    fail(`${hits.length} exclamation mark(s) in string literals (voice Rule: "No exclamation marks"): lines ${hits.join(', ')}`);
  } else {
    ok('no exclamation marks in string literals');
  }
}

// ── Check 6: emoji glyphs missing the U+FE0E text-presentation selector ──────
// Rule 20: any emoji-capable glyph in UI text must carry FE0E or iOS may render
// it full-colour. The signal is Unicode's own `\p{Emoji}` property — true for
// the glyphs that carry an emoji variant (ℹ ⚡ ⏱ ⚠ ↩ ↗ ☕ ⬇ …), false for
// text-only symbols that look emoji-ish but never colorize (✦ U+2726, ◎ U+25CE).
//
// (An earlier version tried to *self-calibrate* — treat any glyph the code had
// paired with FE0E somewhere as "needs it everywhere." One stray `✦︎` on a line
// shared with `⚡︎` poisoned that: it demanded FE0E on 35 correct ✦ and, worse,
// never watched ⚠/↩/↗/☕ at all because they happened to never carry it. The
// standard-library property is both correct and simpler.)
//
// ASCII digits / # / * are `\p{Emoji}` (keycap-sequence bases) but aren't our
// concern. 🍅 (session badges) and ☕ (Buy Me a Coffee CTA) are documented
// intentional emoji exceptions — both rely on full-colour rendering.
{
  const EXEMPT = new Set(['🍅', '☕']);
  const re = /\p{Emoji}/gu;
  let hits = [];
  let m;
  while ((m = re.exec(uiSrc))) {
    const ch = m[0];
    if (EXEMPT.has(ch) || /[0-9#*]/.test(ch)) continue;
    const next = uiSrc.slice(m.index + ch.length, m.index + ch.length + 8);
    if (next.startsWith('\u{FE0E}') || next.startsWith('&#xFE0E;')) continue;
    hits.push({ ch, line: lineOf(src, m.index) });
  }

  if (hits.length) {
    const glyphs = [...new Set(hits.map(h => h.ch))].join(' ');
    fail(`${hits.length} emoji-capable glyph(s) missing U+FE0E (Rule 20 — glyphs: ${glyphs}):`);
    for (const h of hits.slice(0, 15)) console.error(`    line ${h.line}: "${h.ch}"`);
    if (hits.length > 15) console.error(`    ...and ${hits.length - 15} more`);
  } else {
    ok('no emoji-capable glyphs missing the FE0E text-presentation selector');
  }
}

// ── Check 7 (soft): Rule 27 render-path feature parity ───────────────────────
// taskHTML() and the Trello 7s patch path must render the same feature set
// (badges, session count, age bucket). This is a heuristic marker check, not
// real parity verification — WARN, not FAIL, since it can't see intent.
{
  // renderTrello() lives in assets/trello.js since v2.33.5 (Roadmap #3 extraction);
  // taskHTML() stays in index.html — the parity check spans both files.
  const trelloSrc = await readFile(join(ROOT, 'assets', 'trello.js'), 'utf8');
  const taskHTMLMatch = src.match(/function taskHTML\([\s\S]*?\n\}/);
  const renderTrelloMatch = trelloSrc.match(/function renderTrello\([\s\S]*?\n\}/);
  if (!taskHTMLMatch || !renderTrelloMatch) {
    warn('could not locate taskHTML() (index.html) and/or renderTrello() (assets/trello.js) for Rule 27 parity check — functions may have been renamed or moved');
  } else {
    const markers = ['session-count', 'badge due', 'badge checklist', 'age-bucket'];
    const missing = markers.filter(mk =>
      taskHTMLMatch[0].includes(mk) && !renderTrelloMatch[0].includes(mk)
    );
    if (missing.length) {
      warn(`renderTrello() patch path may be missing feature(s) present in taskHTML(): ${missing.join(', ')} (Rule 27 — verify manually, this is a heuristic)`);
    } else {
      ok('taskHTML() / renderTrello() feature markers match (Rule 27, heuristic)');
    }
  }
}

console.log('');
if (failures) {
  console.error(`✗ DESIGN LINT FAILED — ${failures} check(s) failed${warnings ? `, ${warnings} warning(s)` : ''}`);
  process.exit(1);
} else {
  console.log(`✓ DESIGN LINT PASSED${warnings ? ` (${warnings} warning(s) — review manually)` : ''}`);
}
