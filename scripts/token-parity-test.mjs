// Token ownership guard for the main document, JS canvas consumers, PiP, poem, and offline shell.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [index, util, focus, meeting, poem, sw] = await Promise.all([
  'index.html',
  'assets/util.js',
  'assets/focus.js',
  'assets/meeting.js',
  'poem.html',
  'sw.js',
].map(path => readFile(join(ROOT, path), 'utf8')));

function token(name) {
  const match = index.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  assert.ok(match, `main :root must define --${name}`);
  return match[1].trim();
}

const required = [
  'color-bg',
  'color-accent',
  'color-text',
  'color-border',
  'color-art-muted',
  'color-pip-muted',
  'color-accent-timer-fill',
  'color-pip-fill-bar',
  'color-pip-overlay',
  'color-pip-btn-bg',
  'color-pip-btn-border',
  'color-pip-btn-hover-bg',
  'color-pip-btn-hover-border',
];
required.forEach(token);

const canvasMappings = {
  COLOR_ACCENT: 'color-accent',
  COLOR_BG: 'color-bg',
  COLOR_MUTED: 'color-art-muted',
  COLOR_BORDER: 'color-border',
};
for (const [constant, cssToken] of Object.entries(canvasMappings)) {
  assert.match(
    util,
    new RegExp(`const\\s+${constant}\\s*=\\s*_cssToken\\(['"]--${cssToken}['"]\\)`),
    `${constant} must derive from --${cssToken}`,
  );
}

for (const [name, source] of [['focus', focus], ['meeting', meeting]]) {
  assert.match(source, /const pip = _pipTokens\(\)/, `${name} PiP must use the shared computed palette`);
  assert.doesNotMatch(
    source,
    /--pip-[a-z-]+\s*:\s*(?:#[0-9a-f]{3,8}|rgba?\()/i,
    `${name} PiP must not duplicate literal colors`,
  );
}

const bg = token('color-bg');
const accent = token('color-accent');
assert.ok(poem.includes(`style="background:${bg}`), 'poem first-paint background must match --color-bg');
assert.ok(poem.includes(`name="theme-color" content="${bg}"`), 'poem theme color must match --color-bg');
assert.ok(poem.includes(`color: ${accent}`), 'poem primary action must match --color-accent');
assert.ok(sw.includes(`name="theme-color" content="${bg}"`), 'offline theme color must match --color-bg');
assert.ok(sw.includes(`background: ${bg}`), 'offline background must match --color-bg');
assert.ok(sw.includes(`color: ${accent}`), 'offline mark must match --color-accent');

console.log(`  ✓ ${required.length} canonical tokens own canvas and PiP colors`);
console.log('  ✓ poem and offline base/accent colors match the main palette');
console.log('✓ TOKEN PARITY TEST PASSED');
