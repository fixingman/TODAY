// Static wiring tests for assets/task-bounce.js and its HTML/CSS surface.
// Tests that the module, mirror element, keyframe, and edge-case guards are wired
// as expected — without a browser runtime.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir  = dirname(fileURLToPath(import.meta.url));
const root   = join(__dir, '..');

const js     = readFileSync(join(root, 'assets', 'task-bounce.js'), 'utf8');
const html   = readFileSync(join(root, 'index.html'), 'utf8');
const sw     = readFileSync(join(root, 'sw.js'), 'utf8');

let pass = 0;
let fail = 0;

function assert(label, ok) {
  if (ok) { console.log(`  ✓ ${label}`); pass++; }
  else     { console.error(`  ✗ FAIL — ${label}`); fail++; }
}

console.log('\ntask-bounce static wiring tests\n');

// ── JS module ───────────────────────────────────────────────────────────────
assert('IIFE wrapper present',
  js.includes('(function ()') && js.includes('}());'));

assert('prefers-reduced-motion guard present',
  js.includes("prefers-reduced-motion: reduce"));

assert('newTask getElementById call',
  js.includes("getElementById('newTask')"));

assert('newTaskMirror getElementById call',
  js.includes("getElementById('newTaskMirror')"));

assert('has-mirror class activated on input',
  js.includes("classList.add('has-mirror')"));

assert('compositionstart handler present',
  js.includes("'compositionstart'"));

assert('compositionend handler present (bulk sync, no animation)',
  js.includes("'compositionend'") && js.includes('_composing = false'));

assert('input event handler present',
  js.includes("'input'"));

assert('paste detection via inputType',
  js.includes("insertFromPaste"));

assert('autofill detection via insertReplacementText',
  js.includes("insertReplacementText"));

assert('drop detection via insertFromDrop',
  js.includes("insertFromDrop"));

assert('bulk detection via delta-count fallback (addedCount > 1)',
  js.includes("addedCount > 1"));

assert('focus sync for programmatic changes',
  js.includes("'focus'") && js.includes("input.value !== _prev"));

assert('Object.defineProperty interceptor for programmatic .value =',
  js.includes("Object.defineProperty(input, 'value'"));

assert('prototype descriptor captured before override',
  js.includes("HTMLInputElement.prototype, 'value'"));

assert('non-breaking space for literal space chars',
  js.includes("' '") || js.includes("&#160;") || js.includes("' '"));

assert('mirror.innerHTML cleared before rebuild',
  js.includes("mirror.innerHTML = ''"));

assert('animateFrom / animateTo logic for insertion-point precision',
  js.includes("animateFrom") && js.includes("animateTo"));

// ── HTML ────────────────────────────────────────────────────────────────────
assert('mirror div present in HTML',
  html.includes('id="newTaskMirror"'));

assert('mirror div is aria-hidden',
  html.includes('aria-hidden="true"'));

assert('mirror div placed inside position:relative wrapper',
  /position:relative[\s\S]{0,600}id="newTaskMirror"/.test(html));

assert('task-bounce.js script tag in HTML',
  html.includes('assets/task-bounce.js'));

assert('has-mirror CSS rule — color: transparent',
  html.includes('.add-task-input.has-mirror') && html.includes('color: transparent'));

assert('has-mirror CSS rule — caret-color set',
  html.includes('caret-color:'));

assert('#newTaskMirror CSS — position: absolute',
  html.includes('#newTaskMirror') && html.includes('position: absolute'));

assert('#newTaskMirror CSS — pointer-events: none',
  html.includes('pointer-events: none'));

assert('#newTaskMirror CSS — display: flex + align-items: center',
  html.includes('align-items: center'));

assert('@keyframes charBounce defined',
  html.includes('@keyframes charBounce'));

assert('.mirror-char-new animation references charBounce',
  html.includes('.mirror-char-new') && html.includes('charBounce'));

assert('prefers-reduced-motion wrapper in CSS',
  html.includes('@media (prefers-reduced-motion: no-preference)'));

// ── SW cache ────────────────────────────────────────────────────────────────
assert('task-bounce.js in sw.js cache list',
  sw.includes('/assets/task-bounce.js'));

assert('sw.js CACHE_VERSION matches index.html CHANGELOG newest key',
  (() => {
    const swVer     = sw.match(/CACHE_VERSION\s*=\s*'today-v([\d.]+)'/)?.[1];
    const changeVer = html.match(/'(\d+\.\d+\.\d+)':/)?.[1];
    if (swVer && changeVer && swVer === changeVer) return true;
    console.error(`    sw=${swVer} html=${changeVer}`);
    return false;
  })());

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${pass + fail} tests — ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
