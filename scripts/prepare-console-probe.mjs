// Dev-only: prepare a console expression without executing it or touching TODAY.
// Usage: node scripts/prepare-console-probe.mjs INPUT.js OUTPUT.js [label]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

export function prepareConsoleProbe(expression, label = 'diagnostic') {
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(label)) throw new TypeError('Invalid diagnostic label');
  const body = expression.trim().replace(/;\s*$/, '');
  if (!body) throw new TypeError('Empty diagnostic expression');
  // Require one expression, usually an async IIFE. Validate before any live paste.
  new Script(`(\n${body}\n)`);
  const source = `void (async () => {
  try {
    await (
${body}
    );
    console.info('[TODAY diagnostic: ${label}]', { status: 'completed' });
  } catch (error) {
    const knownReasons = [
      'Production version changed',
      'Deployed memory projection differs',
      'Deployed nudge source differs from comparison builder'
    ];
    const message = error && typeof error.message === 'string' ? error.message : '';
    console.warn('[TODAY diagnostic: ${label}]', {
      status: 'stopped',
      reason: knownReasons.includes(message) ? message : 'Diagnostic failed'
    });
  }
})();\n`;
  new Script(source);
  return source;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [input, output, label] = process.argv.slice(2);
    if (!input || !output || resolve(input) === resolve(output)) {
      throw new TypeError('Use distinct input and output files');
    }
    const source = prepareConsoleProbe(readFileSync(input, 'utf8'), label);
    writeFileSync(output, source, { flag: 'wx', mode: 0o600 });
    console.info('Prepared console probe; not executed.');
  } catch (error) {
    console.error(error instanceof SyntaxError
      ? 'Invalid diagnostic expression; no output generated.'
      : 'Could not prepare probe. Check input, new output path and label.');
    process.exitCode = 1;
  }
}
