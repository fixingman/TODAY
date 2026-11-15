// Turn per-session release notes (memory/changes/*.md) into one release commit. The version, the
// About CHANGELOG, the SW cache name, the technical changelog and bug numbers are written here, at
// publish time, so parallel sessions never edit those shared lines by hand.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const NOTES = 'memory/changes';
const BUMPS = ['none', 'patch', 'minor', 'major'];
const STATUSES = ['⏳ Verify', '🔧 Local', '🚫 Rejected', '🔍 Open'];
const FIELDS = { change: ['bump', 'title', 'about'], bug: ['bug', 'status', 'summary'] };
export const HELP = `Usage: npm run release:cut --prefix scripts [-- --dry-run]

Run in your own clean worktree after committing your work and its note in ${NOTES}/.
Fetches dev, drops an earlier unpublished cut of yours, rebases onto dev, then turns
every note into one release commit: version, About CHANGELOG, sw.js, memory/Changelog.md
and new Bugs.md entries. Prints the commit to publish with release:publish.
`;

const fail = message => { throw Error(message); };

// A note is a small front-matter block (key: value) followed by its Markdown body.
export function parseNote(file, text) {
  const slug = file.replace(/\.md$/, '');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) fail(`${file}: name notes in lower-case-with-dashes.md`);
  const match = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) fail(`${file}: start with a --- front-matter block`);
  const fields = {};
  for (const line of match[1].split('\n').filter(l => l.trim())) {
    const pair = line.match(/^([a-z]+):\s*(.*)$/);
    if (!pair) fail(`${file}: unreadable line "${line}"`);
    if (Object.hasOwn(fields, pair[1])) fail(`${file}: duplicate field ${pair[1]}`);
    fields[pair[1]] = pair[2].trim();
  }
  const kind = 'bug' in fields ? 'bug' : 'change';
  const unknown = Object.keys(fields).filter(k => !FIELDS[kind].includes(k));
  if (unknown.length) fail(`${file}: unknown field ${unknown.join(', ')}`);
  const body = match[2].trim();
  if (kind === 'change') {
    if (!BUMPS.includes(fields.bump)) fail(`${file}: bump must be one of ${BUMPS.join(', ')}`);
    if (!fields.title) fail(`${file}: add a title for the technical changelog`);
    if (fields.bump !== 'none') {
      if (!fields.about) fail(`${file}: an app change needs an about line for users`);
      // Rule 31: plain language for users, no codes or code formatting.
      if (/BUG-|`/.test(fields.about)) fail(`${file}: keep bug codes and code out of the about line`);
    } else if (fields.about) fail(`${file}: engineering-only notes have no about line`);
  } else {
    if (!fields.bug) fail(`${file}: add the bug title`);
    if (!STATUSES.includes(fields.status)) fail(`${file}: status must be one of ${STATUSES.join(', ')}`);
    if (!fields.summary) fail(`${file}: add a one-line summary for the status table`);
  }
  if (!body) fail(`${file}: add the detail below the front matter`);
  return { slug, kind, ...fields, body };
}

export function nextVersion(current, bump) {
  const [a, b, c] = current.split('.').map(Number);
  if (bump === 'major') return `${a + 1}.0.0`;
  if (bump === 'minor') return `${a}.${b + 1}.0`;
  if (bump === 'patch') return `${a}.${b}.${c + 1}`;
  return current;
}

export function highestBug(...texts) {
  let max = 0;
  for (const text of texts) for (const m of text.matchAll(/BUG-(\d{3,})/g)) max = Math.max(max, Number(m[1]));
  return max;
}

const CHANGELOG_BLOCK = /^const CHANGELOG = \{\n([\s\S]*?)^\};$/m;
const ENTRY = /^ {2}(['"])(\d+\.\d+\.\d+)\1: .*,$/;
export function currentVersion(index) {
  const block = index.match(CHANGELOG_BLOCK) || fail('index.html: CHANGELOG block not found');
  const first = block[1].split('\n').find(Boolean)?.match(ENTRY) || fail('index.html: unreadable CHANGELOG entry');
  return first[2];
}

// Pure: apply notes to the four shared files.
export function cut({ index, sw, changelog, bugs, notes, maxBug }) {
  if (!notes.length) fail(`Nothing to release: no notes in ${NOTES}/`);
  const changes = notes.filter(n => n.kind === 'change'), newBugs = notes.filter(n => n.kind === 'bug');
  if (!changes.length) fail('Bug notes need a change note that ships them');
  const current = currentVersion(index);
  const bump = changes.map(n => n.bump).reduce((a, b) => BUMPS.indexOf(b) > BUMPS.indexOf(a) ? b : a, 'none');
  const version = nextVersion(current, bump), appChanged = bump !== 'none';
  const assigned = Object.fromEntries(newBugs.map((n, i) => [n.slug, maxBug + 1 + i]));
  const fill = text => text.replace(/BUG-\{([a-z0-9-]+)\}/g, (all, slug) =>
    Object.hasOwn(assigned, slug) ? `BUG-${assigned[slug]}` : fail(`Unknown bug note in ${all}`));

  if (appChanged) {
    const block = index.match(CHANGELOG_BLOCK);
    const kept = block[1].split('\n').filter(Boolean);
    if (!kept.every(line => ENTRY.test(line))) fail('index.html: CHANGELOG has an unreadable entry');
    // Rule 31: exactly three entries. Double quotes cannot be curled by an editor.
    const about = changes.filter(n => n.about).map(n => n.about).join(' ');
    const entries = [`  ${JSON.stringify(version)}: ${JSON.stringify(about)},`, ...kept].slice(0, 3);
    index = index.replace(block[0], `const CHANGELOG = {\n${entries.join('\n')}\n};`);
    const swLine = new RegExp(`^(const CACHE_VERSION\\s*=\\s*['"])today-v${current.replace(/\./g, '\\.')}(['"];)$`, 'm');
    if (!swLine.test(sw)) fail(`sw.js: CACHE_VERSION does not match the current app version ${current}`);
    sw = sw.replace(swLine, `$1today-v${version}$2`);
  }

  const label = appChanged ? `app v${version}` : `engineering, app v${current} unchanged`;
  const sections = changes.map(n => `## ${fill(n.title)} (${label})\n\n${fill(n.body)}\n`).join('\n');
  const firstHeading = changelog.search(/^## /m);
  if (firstHeading < 0) fail('memory/Changelog.md: no release heading to insert above');
  changelog = changelog.slice(0, firstHeading) + sections + '\n' + changelog.slice(firstHeading);

  if (newBugs.length) {
    const ordered = [...newBugs].sort((a, b) => assigned[b.slug] - assigned[a.slug]);
    const reference = n => appChanged && ['⏳ Verify', '🔧 Local'].includes(n.status) ? `v${version}` : '—';
    const rows = ordered.map(n => `| ${assigned[n.slug]} | ${n.status} | ${fill(n.summary)} | ${reference(n)} |\n`).join('');
    const divider = '|---|---|---|---|\n', at = bugs.indexOf(divider);
    if (at < 0) fail('memory/Bugs.md: status table not found');
    bugs = bugs.slice(0, at + divider.length) + rows + bugs.slice(at + divider.length);
    const details = ordered.map(n => `## BUG-${assigned[n.slug]} — ${fill(n.bug)}\n\n${fill(n.body)}\n\n---\n\n`).join('');
    const firstBug = bugs.search(/^## BUG-/m);
    bugs = firstBug < 0 ? bugs.trimEnd() + '\n\n---\n\n' + details : bugs.slice(0, firstBug) + details + bugs.slice(firstBug);
  }
  return { index, sw, changelog, bugs, version, current, appChanged, assigned, titles: changes.map(n => fill(n.title)) };
}

const TRAILER = /^Release-Cut: v\d+\.\d+\.\d+$/m;
export function main(args, root = ROOT, { log = console.log } = {}) {
  if (args[0] === '--help') { log(HELP); return 0; }
  const dry = args[0] === '--dry-run';
  if (args.length > (dry ? 1 : 0)) fail('Unknown option: ' + args.join(' '));
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (git('status', '--porcelain', '--untracked-files=no')) fail('Commit your work first; release:cut needs a clean worktree');
  for (const marker of ['MERGE_HEAD', 'rebase-merge', 'rebase-apply'])
    if (existsSync(resolve(root, git('rev-parse', '--git-path', marker)))) fail('Finish the current merge/rebase first');
  git('fetch', 'origin', 'dev');
  const base = git('rev-parse', 'origin/dev');
  // A cut that dev has moved past is stale: drop it (its notes come back) and cut again.
  // The worktree is clean (checked above), so dropping our own commit loses nothing.
  if (TRAILER.test(git('show', '-s', '--format=%B', 'HEAD'))) {
    if (git('merge-base', 'HEAD', base) === base) { log(`HEAD is already a current cut: ${git('rev-parse', 'HEAD')}`); return 0; }
    git('reset', '--hard', 'HEAD~1');
    log('Dropped an earlier unpublished cut; cutting again on current dev.');
  }
  if (git('merge-base', 'HEAD', base) !== base) {
    try { git('rebase', base); } catch {
      try { git('rebase', '--abort'); } catch { /* nothing to abort */ }
      fail('Your commits conflict with dev. Rebase onto origin/dev by hand, then run release:cut again');
    }
  }
  const dir = join(root, NOTES);
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'README.md').sort() : [];
  const notes = files.map(f => parseNote(f, readFileSync(join(dir, f), 'utf8')));
  const read = p => readFileSync(join(root, p), 'utf8');
  const maxBug = highestBug(read('memory/Bugs.md'), read('memory/archive/Bugs-archive.md'), git('log', base, '-n', '400', '--format=%B'));
  const out = cut({ index: read('index.html'), sw: read('sw.js'), changelog: read('memory/Changelog.md'), bugs: read('memory/Bugs.md'), notes, maxBug });
  const tag = out.appChanged ? `v${out.version}` : `v${out.current} (engineering)`;
  const bugsLine = Object.entries(out.assigned).map(([slug, n]) => `BUG-${n} (${slug})`).join(', ');
  if (dry) { log(`Would release ${tag}: ${out.titles.join('; ')}${bugsLine ? '\nBugs: ' + bugsLine : ''}`); return 0; }
  writeFileSync(join(root, 'index.html'), out.index); writeFileSync(join(root, 'sw.js'), out.sw);
  writeFileSync(join(root, 'memory/Changelog.md'), out.changelog); writeFileSync(join(root, 'memory/Bugs.md'), out.bugs);
  git('add', '--', 'index.html', 'sw.js', 'memory/Changelog.md', 'memory/Bugs.md');
  git('rm', '-q', '--', ...files.map(f => `${NOTES}/${f}`));
  const message = [`release: ${tag} — ${out.titles.join('; ')}`, '',
    ...(bugsLine ? [`Bugs: ${bugsLine}`, ''] : []), `Release-Cut: v${out.version}`].join('\n');
  execFileSync('git', ['commit', '-q', '-F', '-'], { cwd: root, input: message });
  const sha = git('rev-parse', 'HEAD');
  log(`Cut ${tag} as ${sha}\nPublish: npm run release:publish --prefix scripts -- ${sha}`);
  return 0;
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
