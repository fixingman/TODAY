// Unit tests for _mailtoDraftHref (BUG-089) — pure, Node only, no browser.
// The grapheme-safe truncation crashed on emoji once and nothing caught it.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { _mailtoDraftHref: href } = require(join(ROOT, 'assets/util.js'));

let passed = 0, failed = 0;
function test(label, assertion) {
  try {
    if (!assertion()) throw new Error('assertion returned false');
    console.log('  ✓ ' + label); passed++;
  } catch (error) {
    console.error('  ✗ ' + label + ' — ' + error.message); failed++;
  }
}
const body = u => u.split('&body=')[1] ?? '';
const decodes = u => { try { decodeURIComponent(body(u)); return true; } catch { return false; } };
const hasLoneSurrogate = s => {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) { const d = s.charCodeAt(i + 1); if (!(d >= 0xDC00 && d <= 0xDFFF)) return true; i++; }
    else if (c >= 0xDC00 && c <= 0xDFFF) return true;
  }
  return false;
};

console.log('\nmailto draft href\n');

const plain = href('notifications@kry.se', 'Re: Your appointment is in 24 hours', "Thanks for the reminder! I'll be ready.");
test('address keeps a literal @, never %40', () =>
  plain.startsWith('mailto:notifications@kry.se?') && !plain.includes('%40'));
test('subject is encoded', () => plain.includes('subject=Re%3A%20Your%20appointment'));
test('a short draft is passed through whole', () =>
  decodeURIComponent(body(plain)) === "Thanks for the reminder! I'll be ready.");
test('exact form for the production report case', () =>
  plain === "mailto:notifications@kry.se?subject=Re%3A%20Your%20appointment%20is%20in%2024%20hours&body=Thanks%20for%20the%20reminder!%20I'll%20be%20ready.");

const longAscii = href('a@b.se', 'Re: x', 'word '.repeat(2000));
test('a long draft is capped under 1900', () => longAscii.length <= 1900);
test('the capped body still decodes (no half %XX escape)', () => decodes(longAscii));
test('the capped body is a prefix of the original, nothing reordered', () =>
  'word '.repeat(2000).startsWith(decodeURIComponent(body(longAscii))));

const mixed = href('a@b.se', 'Re: ' + 'S'.repeat(500), 'é🎉'.repeat(800));
test('accents + emoji: does not throw and stays under cap', () => mixed.length <= 1900);
test('accents + emoji: body decodes with no lone surrogate', () =>
  decodes(mixed) && !hasLoneSurrogate(decodeURIComponent(body(mixed))));

const zwj = href('a@b.se', 'Re: t', '👩🏽‍💻 shipping '.repeat(400));
test('ZWJ family sequence: trimmed on a grapheme boundary', () => {
  const d = decodeURIComponent(body(zwj));
  return zwj.length <= 1900 && !hasLoneSurrogate(d) && ('👩🏽‍💻 shipping '.repeat(400)).startsWith(d);
});

test('a lone surrogate already in the draft is dropped, not thrown on', () => {
  let out = null, threw = false;
  try { out = href('a@b.se', 'Re: t', 'ok \uD83D broken \uDE00 too'); } catch { threw = true; }
  return !threw && decodes(out) && decodeURIComponent(body(out)) === 'ok  broken  too';
});

test('a valid pair in the draft survives the lone-surrogate scan', () =>
  decodeURIComponent(body(href('a@b.se', 'Re: t', 'deck 🎉 done'))) === 'deck 🎉 done');

test('empty subject and empty draft still yield a valid href', () =>
  href('a@b.se', '', '') === 'mailto:a@b.se?subject=&body=' && decodes(href('a@b.se', '', '')));

test('null inputs are tolerated', () => {
  let threw = false; try { href(null, null, null); } catch { threw = true; }
  return !threw && href(null, null, null) === 'mailto:?subject=&body=';
});

test('a custom cap is respected', () => href('a@b.se', 'Re: x', 'word '.repeat(2000), 400).length <= 400);

// The floor: a body is never trimmed below 20 graphemes, so a tiny cap yields a
// short body rather than an empty one. Pinned from both sides of the boundary —
// the first version of this test used a 21-grapheme fixture and failed correctly.
test('a draft of exactly 20 graphemes is never trimmed, even over a tiny cap', () =>
  decodeURIComponent(body(href('a@b.se', 'Re: x', 'x'.repeat(20), 10))) === 'x'.repeat(20));
test('a draft of 21 graphemes over a tiny cap IS trimmed', () =>
  decodeURIComponent(body(href('a@b.se', 'Re: x', 'x'.repeat(21), 10))).length < 21);

console.log('\n' + (failed === 0 ? '✓ ' : '✗ ') + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed === 0 ? 0 : 1);
