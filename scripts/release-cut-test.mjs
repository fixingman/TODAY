// Release cut: notes become one release (version, About CHANGELOG, sw.js, technical changelog,
// bug numbers). Pure checks plus real Git in disposable repositories with a local bare origin.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseNote, nextVersion, highestBug, currentVersion, cut, main, NOTES } from './release-cut.mjs';

const index = (entries = [["3.10.3", "Newest."], ["3.10.2", "Middle."], ["3.10.1", "Oldest."]]) =>
  `<script>\nconst DEV_HOURS     = '501h';\nconst CHANGELOG = {\n${entries.map(([k, v]) => `  "${k}": "${v}",`).join('\n')}\n};\n</script>\n`;
const sw = v => `// header\nconst CACHE_VERSION  = 'today-v${v}';\nconst files = ['/'];\n`;
const changelog = '# TODAY — Changelog\n\n> intro\n\n## Older release (app v3.10.3)\n\nOld body.\n';
const bugs = '# Bugs\n\n| # | Status | Description | Reference |\n|---|---|---|---|\n| 166 | ⏳ Verify | Old. | v3.10.2 |\n\n---\n\n## BUG-166 — Old\n\nOld detail.\n';
const note = (file, head, body = 'Detail.') => parseNote(file, `---\n${head}\n---\n${body}\n`);

// ── Parsing ──────────────────────────────────────────────────────────────────
const fix = note('timer-fix.md', 'bump: patch\ntitle: Habit focus timer survives (BUG-{timer})\nabout: The focus timer no longer disappears.', 'Root cause: BUG-{timer}.');
assert.equal(fix.kind, 'change'); assert.equal(fix.slug, 'timer-fix');
const bug = note('timer.md', 'bug: Habit focus loses its timer\nstatus: ⏳ Verify\nsummary: The timer disappears on re-render.');
assert.equal(bug.kind, 'bug');
for (const [file, head] of [
  ['Bad_Name.md', 'bump: patch\ntitle: t\nabout: a'],
  ['x.md', 'bump: tiny\ntitle: t\nabout: a'],
  ['x.md', 'bump: patch\ntitle: t'],
  ['x.md', 'bump: patch\ntitle: t\nabout: Fixed BUG-12'],
  ['x.md', 'bump: patch\ntitle: t\nabout: Fixed `x`'],
  ['x.md', 'bump: none\ntitle: t\nabout: users never see this'],
  ['x.md', 'bump: patch\ntitle: t\nabout: a\nversion: 9.9.9'],
  ['x.md', 'bug: t\nstatus: fixed\nsummary: s'],
]) assert.throws(() => note(file, head), undefined, file + ' ' + head);
assert.throws(() => parseNote('x.md', 'no front matter'));
assert.throws(() => parseNote('x.md', '---\nbump: patch\ntitle: t\nabout: a\n---\n'), /detail/);
console.log('  ✓ notes: required fields, plain-language about line, known statuses, no stray fields');

// ── Versions and bug numbers ─────────────────────────────────────────────────
assert.equal(nextVersion('3.10.3', 'patch'), '3.10.4'); assert.equal(nextVersion('3.10.3', 'minor'), '3.11.0');
assert.equal(nextVersion('3.10.3', 'major'), '4.0.0'); assert.equal(nextVersion('3.10.3', 'none'), '3.10.3');
assert.equal(highestBug('BUG-091 BUG-166', 'fix (BUG-170)', 'nothing'), 170);
assert.equal(currentVersion(index()), '3.10.3');
assert.equal(currentVersion(index([["3.10.3", "a"]]).replace(/"/g, "'")), '3.10.3', 'single-quoted entries still read');
console.log('  ✓ versions follow the Rules table; bug numbers continue after the highest anywhere');

// ── Cut ──────────────────────────────────────────────────────────────────────
{
  const feature = note('daily.md', 'bump: minor\ntitle: Daily tasks\nabout: A new daily task.');
  const out = cut({ index: index(), sw: sw('3.10.3'), changelog, bugs, notes: [feature, fix, bug], maxBug: 166 });
  assert.equal(out.version, '3.11.0', 'the largest bump wins');
  assert.deepEqual(out.assigned, { timer: 167 });
  const rows = out.index.match(/^ {2}".*$/gm);
  assert.equal(rows.length, 3, 'Rule 31: exactly three entries');
  assert.equal(rows[0], '  "3.11.0": "A new daily task. The focus timer no longer disappears.",');
  assert.ok(!out.index.includes('3.10.1'), 'the oldest entry drops');
  assert.ok(!/[‘’]/.test(out.index.match(/const CHANGELOG[\s\S]*?\};/)[0].replace(/"[^"]*"/g, '')), 'no curly delimiters');
  new Function(out.index.match(/<script>([\s\S]*)<\/script>/)[1]);
  assert.match(out.sw, /const CACHE_VERSION {2}= 'today-v3\.11\.0';/);
  assert.match(out.changelog, /> intro\n\n## Daily tasks \(app v3\.11\.0\)\n\nDetail\.\n\n## Habit focus timer survives \(BUG-167\) \(app v3\.11\.0\)\n\nRoot cause: BUG-167\.\n\n## Older release/);
  assert.match(out.bugs, /\|---\|---\|---\|---\|\n\| 167 \| ⏳ Verify \| The timer disappears on re-render\. \| v3\.11\.0 \|\n\| 166 /);
  assert.match(out.bugs, /\n## BUG-167 — Habit focus loses its timer\n\nDetail\.\n\n---\n\n## BUG-166 — Old/);
}
{
  // Engineering-only: no app version, CHANGELOG or SW change.
  const docs = note('ci.md', 'bump: none\ntitle: Faster CI', 'Body.');
  const out = cut({ index: index(), sw: sw('3.10.3'), changelog, bugs, notes: [docs], maxBug: 166 });
  assert.equal(out.appChanged, false); assert.equal(out.index, index()); assert.equal(out.sw, sw('3.10.3'));
  assert.match(out.changelog, /## Faster CI \(engineering, app v3\.10\.3 unchanged\)/);
  // A rejected bug shipped with an engineering note has no version reference.
  const rejected = note('no-fix.md', 'bug: Not fixing\nstatus: 🚫 Rejected\nsummary: Decided against.');
  assert.match(cut({ index: index(), sw: sw('3.10.3'), changelog, bugs, notes: [docs, rejected], maxBug: 166 }).bugs, /\| 167 \| 🚫 Rejected \| Decided against\. \| — \|/);
  // A fix in an engineering cut still records which release carried it.
  const ciFix = note('ci-fix.md', 'bug: CI combiner\nstatus: ⏳ Verify\nsummary: Combiner misses flat downloads.');
  assert.match(cut({ index: index(), sw: sw('3.10.3'), changelog, bugs, notes: [docs, ciFix], maxBug: 166 }).bugs, /\| 167 \| ⏳ Verify \| Combiner misses flat downloads\. \| v3\.10\.3 \(engineering\) \|/);
}
assert.throws(() => cut({ index: index(), sw: sw('3.10.3'), changelog, bugs, notes: [], maxBug: 1 }), /Nothing to release/);
assert.throws(() => cut({ index: index(), sw: sw('3.10.3'), changelog, bugs, notes: [bug], maxBug: 1 }), /change note/);
assert.throws(() => cut({ index: index(), sw: sw('3.10.2'), changelog, bugs, notes: [fix, bug], maxBug: 1 }), /sw\.js/);
assert.throws(() => cut({ index: index(), sw: sw('3.10.3'), changelog, bugs, notes: [note('a.md', 'bump: patch\ntitle: BUG-{missing}\nabout: a')], maxBug: 1 }), /Unknown bug note/);
assert.match(cut({ index: index(), sw: sw('3.10.3'), changelog, bugs, notes: [note('a.md', 'bump: none\ntitle: Docs', 'Write `BUG-{slug}` for a new bug.')], maxBug: 1 }).changelog, /Write `BUG-\{slug\}` for a new bug\./, 'code spans are documentation');
console.log('  ✓ cut writes three double-quoted entries, SW, changelog and bug rows/details; engineering notes leave the app version alone');

// ── Real Git: two sessions cut in parallel; the second re-cuts after dev moves ──
const temp = mkdtempSync(join(tmpdir(), 'today-cut-'));
try {
  const run = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const origin = join(temp, 'origin.git'), seed = join(temp, 'seed');
  run(temp, 'init', '-q', '--bare', '-b', 'dev', origin);
  mkdirSync(join(seed, 'memory/archive'), { recursive: true }); mkdirSync(join(seed, NOTES), { recursive: true });
  writeFileSync(join(seed, 'index.html'), index()); writeFileSync(join(seed, 'sw.js'), sw('3.10.3'));
  writeFileSync(join(seed, 'memory/Changelog.md'), changelog); writeFileSync(join(seed, 'memory/Bugs.md'), bugs);
  writeFileSync(join(seed, 'memory/archive/Bugs-archive.md'), '# Archive\n\n## BUG-120 — x\n');
  writeFileSync(join(seed, `${NOTES}/README.md`), 'How to write notes.\n');
  run(seed, 'init', '-q', '-b', 'dev'); run(seed, 'config', 'user.name', 'Fixture'); run(seed, 'config', 'user.email', 'f@example.invalid');
  run(seed, 'add', '.'); run(seed, 'commit', '-q', '-m', 'base'); run(seed, 'remote', 'add', 'origin', origin); run(seed, 'push', '-q', 'origin', 'dev');
  const session = name => {
    const dir = join(temp, name); run(temp, 'clone', '-q', '-b', 'dev', origin, dir);
    run(dir, 'config', 'user.name', name); run(dir, 'config', 'user.email', `${name}@example.invalid`); run(dir, 'checkout', '-q', '--detach');
    return dir;
  };
  const work = (dir, slug, head, extra = {}) => {
    writeFileSync(join(dir, `${NOTES}/${slug}.md`), `---\n${head}\n---\nDetail for ${slug}.\n`);
    for (const [path, text] of Object.entries(extra)) writeFileSync(join(dir, path), text);
    run(dir, 'add', '-A'); run(dir, 'commit', '-q', '-m', 'work: ' + slug);
  };
  const logs = [], quiet = { log: m => logs.push(m) };
  const a = session('a'), b = session('b');
  work(a, 'poem', 'bump: patch\ntitle: Poem fix\nabout: The poem stays.', { 'poem.js': 'a' });
  work(a, 'poem-bug', 'bug: Poem shows the wrong day\nstatus: ⏳ Verify\nsummary: Wrong poem.');
  work(b, 'keyboard', 'bump: patch\ntitle: Keyboard fix\nabout: The input follows the keyboard.', { 'keyboard.js': 'b' });
  work(b, 'keyboard-bug', 'bug: Input hides behind the keyboard\nstatus: ⏳ Verify\nsummary: Hidden input.');

  // Both cut against the same dev and claim the same number and version.
  assert.equal(main(['--dry-run'], a, quiet), 0); assert.match(logs.at(-1), /Would release v3\.10\.4/);
  assert.equal(run(a, 'status', '--porcelain'), '', 'a dry run writes nothing');
  assert.equal(main([], a, quiet), 0); assert.equal(main([], b, quiet), 0);
  assert.equal(main([], a, quiet), 0); assert.match(logs.at(-1), /already a current cut/);
  run(a, 'push', '-q', 'origin', 'HEAD:dev');
  assert.throws(() => run(b, 'push', '-q', 'origin', 'HEAD:dev'), 'git refuses the second, stale cut');

  // B cuts again: its stale cut is dropped, its work rebased, and it gets the next numbers.
  assert.equal(main([], b, quiet), 0); assert.match(logs.join('\n'), /Dropped an earlier unpublished cut/);
  run(b, 'push', '-q', 'origin', 'HEAD:dev');
  const final = join(temp, 'final'); run(temp, 'clone', '-q', '-b', 'dev', origin, final);
  const read = p => readFileSync(join(final, p), 'utf8');
  assert.deepEqual(read('index.html').match(/^ {2}"[\d.]+"/gm), ['  "3.10.5"', '  "3.10.4"', '  "3.10.3"']);
  assert.match(read('sw.js'), /today-v3\.10\.5/);
  assert.match(read('memory/Bugs.md'), /\| 168 \| ⏳ Verify \| Hidden input\. \| v3\.10\.5 \|\n\| 167 \| ⏳ Verify \| Wrong poem\. \| v3\.10\.4 \|/);
  assert.match(read('memory/Changelog.md'), /## Keyboard fix \(app v3\.10\.5\)[\s\S]*## Poem fix \(app v3\.10\.4\)/);
  assert.ok(existsSync(join(final, 'poem.js')) && existsSync(join(final, 'keyboard.js')), 'both sessions\' work arrives');
  assert.deepEqual(execFileSync('ls', [join(final, NOTES)], { encoding: 'utf8' }).trim().split('\n'), ['README.md'], 'notes are consumed');
  assert.match(run(final, 'log', '-1', '--format=%B'), /^release: v3\.10\.5 — Keyboard fix\n\nBugs: BUG-168 \(keyboard-bug\)\n\nRelease-Cut: v3\.10\.5$/);

  // --full marks the cut for full CI (the master proof); unknown options are refused.
  const c = session('c'); work(c, 'docs', 'bump: none\ntitle: Docs only');
  assert.throws(() => main(['--fast'], c, quiet), /Unknown option/);
  assert.equal(main(['--full'], c, quiet), 0);
  assert.match(run(c, 'log', '-1', '--format=%B'), /\nRelease-Cut: v3\.10\.5\nCI-Validation: full$/);

  // Refusals: dirty worktree, nothing to release.
  writeFileSync(join(final, 'index.html'), 'dirty'); run(final, 'checkout', '-q', '--detach');
  assert.throws(() => main([], final, quiet), /clean worktree/);
  run(final, 'checkout', '-q', '--', 'index.html');
  assert.equal(main([], final, quiet), 0); assert.match(logs.at(-1), /already a current cut/);
  run(final, 'config', 'user.name', 'final'); run(final, 'config', 'user.email', 'final@example.invalid');
  run(final, 'commit', '-q', '--allow-empty', '-m', 'work without a note');
  assert.throws(() => main([], final, quiet), /Nothing to release/);
  console.log('  ✓ real Git: parallel cuts collide only at push; the late session re-cuts on current dev with the next version and bug number');
} finally { rmSync(temp, { recursive: true, force: true }); }

console.log('\n✓ RELEASE CUT TEST PASSED');
