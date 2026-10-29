// Deterministic change selection. The full runner remains the release authority.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, mkdirSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUITE, EXCLUDED, GROUPS, BASE, DOC_BASE } from './ci-policy.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OWNERS = new Map(Object.entries(GROUPS).flatMap(([name, group]) => group.files.map(path => [path, name])));
const suiteOwner = new Map(Object.entries(GROUPS).flatMap(([name, group]) => group.suites.map(suite => [suite, name])));
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 10000,
  maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

export function classifyPath(path) {
  if (OWNERS.has(path)) return { kind: 'group', group: OWNERS.get(path) };
  if (path.startsWith('scripts/') && path.endsWith('-test.mjs')) {
    const suite = path.slice(8, -4);
    if (SUITE.includes(suite)) return { kind: 'test', group: suiteOwner.get(suite), suite };
    if (Object.hasOwn(EXCLUDED, suite)) return { kind: 'tooling', group: 'tooling' };
    return { kind: 'unknown', reason: 'unregistered test' };
  }
  if (path.startsWith('scripts/visual-baselines/')) return { kind: 'group', group: 'accessibility' };
  if (path.startsWith('scripts/') || path.startsWith('.github/') || path.startsWith('.claude/') || path.startsWith('.conductor/') ||
      ['.gitignore','skills-lock.json','TODAY-dev-server.command'].includes(path)) return { kind: 'tooling', group: 'tooling' };
  if (path.startsWith('assets/vendor/') || path.startsWith('fonts/') || path.startsWith('assets/splash/') ||
      /^assets\/[^/]+\.(png|svg|ico)$/.test(path) || ['netlify.toml'].includes(path)) return { kind: 'group', group: 'foundation' };
  if (path === 'memory/performance-baseline.json' || path === 'memory/Performance-audit.md') return { kind: 'performance', group: 'tooling' };
  if (/^output\/habit-(?:context|moments)\//.test(path)) return { kind: 'prototype', reason: 'isolated non-shipping study; no app imports' };
  if (['README.md','Design.md'].includes(path) || /^(docs|memory)\/.+\.md$/.test(path) ||
      path.startsWith('docs/media/') || path.startsWith('video/')) return { kind: 'documentation' };
  if (path === 'memory/validate-files.sh') return { kind: 'tooling', group: 'tooling' };
  return { kind: 'unknown', reason: 'unclassified path' };
}

export function auditPolicy(paths = []) {
  const problems = [];
  const owners = new Map();
  for (const [name, group] of Object.entries(GROUPS)) {
    for (const dependency of group.dependents || []) if (!GROUPS[dependency]) problems.push(`${name}: unknown dependent ${dependency}`);
    for (const suite of group.suites) {
      if (!SUITE.includes(suite)) problems.push(`${name}: unknown suite ${suite}`);
      if (owners.has(suite)) problems.push(`${suite}: multiple owners`);
      owners.set(suite, name);
    }
  }
  for (const suite of SUITE) if (!owners.has(suite)) problems.push(`${suite}: missing owner`);
  for (const suite of BASE) if (!SUITE.includes(suite)) problems.push(`unknown base suite ${suite}`);
  if (new Set(SUITE).size !== SUITE.length) problems.push('duplicate suite');
  const files = Object.values(GROUPS).flatMap(group => group.files);
  if (new Set(files).size !== files.length) problems.push('multiple path owners');
  for (const path of paths) if (classifyPath(path).kind === 'unknown') problems.push(`unclassified path: ${path}`);
  return problems;
}

// Detect newly introduced literal module consumers. This audits the explicit
// dependency policy; it never learns or silently changes the execution plan.
export function auditConsumers(root = ROOT) {
  const modules = new Map(), sources = [], problems = new Set();
  for (const [name,group] of Object.entries(GROUPS)) {
    for (const path of group.files.filter(path=>path.startsWith('assets/')&&path.endsWith('.js'))) {
      let source; try {source=readFileSync(join(root,path),'utf8');}
      catch {problems.add(`missing module: ${path}`);continue;}
      sources.push({name,path,source});
      for (const match of source.matchAll(/Today\.define\(\s*['"]([^'"]+)['"]/g)) modules.set(match[1],{name,path});
    }
  }
  for (const consumer of sources) {
    for (const match of consumer.source.matchAll(/Today\.use\(\s*['"]([^'"]+)['"]/g)) {
      const producer=modules.get(match[1]);
      // Dynamic/inline registry modules live behind the foundation full boundary.
      if (!producer || producer.name===consumer.name) continue;
      const selected=planChanges([{path:producer.path}]).suites;
      for (const suite of GROUPS[consumer.name].suites) if (!selected.includes(suite))
        problems.add(`${producer.path} -> ${consumer.path}: missing ${suite}`);
    }
  }
  return [...problems].sort();
}

// Accept literal declarations only. Everything outside these exact regions must
// remain byte-identical; no evaluation of source text or fuzzy diff exemption.
const LITERAL = String.raw`(?:'(?:[^'\\\r\n]|\\(?:['"\\bfnrtv0]|x[\da-fA-F]{2}|u[\da-fA-F]{4}))*'|"(?:[^"\\\r\n]|\\(?:['"\\bfnrtv0]|x[\da-fA-F]{2}|u[\da-fA-F]{4}))*")`;
export function metadata(source, path) {
  if (typeof source !== 'string') return null;
  if (path === 'sw.js') {
    if ([...source.matchAll(/\b(?:const|let|var)\s+CACHE_VERSION\b/g)].length !== 1) return null;
    const matches = [...source.matchAll(/^const CACHE_VERSION\s*=\s*(['"])today-v(\d+\.\d+\.\d+)\1;$/gm)];
    if (matches.length !== 1) return null;
    return { version: matches[0][2], normalized: source.replace(matches[0][0], 'const CACHE_VERSION = __CI_METADATA__;') };
  }
  if (path !== 'index.html') return null;
  for (const name of ['CHANGELOG','DEV_HOURS']) {
    if ([...source.matchAll(new RegExp('\\b(?:const|let|var)\\s+' + name + '\\b','g'))].length !== 1) return null;
  }
  const matches = [...source.matchAll(/^const CHANGELOG = \{([\s\S]*?)^\};$/gm)];
  const hours = [...source.matchAll(/^const DEV_HOURS\s*=\s*(['"])\d+(?:\.\d+)?h\1;$/gm)];
  if (matches.length !== 1 || hours.length !== 1) return null;
  const row = new RegExp(String.raw`\s*'(\d+\.\d+\.\d+)':\s*${LITERAL}\s*,`, 'g');
  const rows = [...matches[0][1].matchAll(row)];
  if (!rows.length || rows.length > 3 || matches[0][1].replace(row, '').trim() || new Set(rows.map(row => row[1])).size !== rows.length) return null;
  return { version: rows[0][1], normalized: source.replace(matches[0][0], 'const CHANGELOG = __CI_METADATA__;').replace(hours[0][0], 'const DEV_HOURS = __CI_METADATA__;') };
}

export function planChanges(changes, { fallback = [], sources = {}, base = null, head = null, source = 'fixture' } = {}) {
  const reasons = [...fallback], selected = new Set(BASE), groups = new Set(), entries = [];
  let full = reasons.length > 0, performance = full;
  const versions = ['index.html','sw.js'].map(path => metadata(sources[path], path)?.version);
  const metadataAgrees = versions[0] && versions[0] === versions[1];
  function include(name, via) {
    if (groups.has(name)) return;
    if (!GROUPS[name]) { full = true; reasons.push(`missing group: ${name}`); return; }
    groups.add(name);
    reasons.push(`${name}: ${via}`);
    GROUPS[name].suites.forEach(suite => selected.add(suite));
    (GROUPS[name].dependents || []).forEach(dependent => include(dependent, `dependent of ${name}`));
  }
  for (const change of changes) {
    for (const path of new Set([change.oldPath, change.path].filter(Boolean))) {
      if (['index.html','sw.js'].includes(path) && path === change.path && !change.oldPath && metadataAgrees) {
        const before = metadata(change.before, path), after = metadata(change.after, path);
        if (before && after && before.normalized === after.normalized) {
          entries.push({ path, kind: 'release-metadata', reason: 'literal declarations only; runtime unchanged' });
          selected.add('about-test'); selected.add('service-worker-test');
          continue;
        }
      }
      const classification = classifyPath(path);
      entries.push({ path, stage: change.stage || null, ...classification });
      if (['documentation','prototype'].includes(classification.kind)) continue;
      if (classification.kind === 'unknown') { full = true; performance = true; reasons.push(`${path}: ${classification.reason}`); continue; }
      const group = GROUPS[classification.group];
      include(classification.group, path);
      if (classification.suite) selected.add(classification.suite);
      if (group.full || classification.kind === 'performance') { full = true; reasons.push(`${path}: shared ${classification.group} boundary`); }
      if (group.performance || classification.kind === 'performance' || /performance|ci-(?:plan|policy)|workflows/.test(path)) performance = true;
    }
  }
  if (!changes.length && !full) reasons.push('no source changes; invariant checks still run');
  const policyErrors = auditPolicy();
  if (policyErrors.length) { full = true; performance = true; reasons.push(...policyErrors); }
  const docsOnly = !full && changes.length > 0 && entries.every(entry => ['documentation','prototype'].includes(entry.kind));
  if (docsOnly) reasons.push('documentation-only: syntax, release metadata, payload, memory, whitespace and inventory checks');
  const suites = SUITE.filter(suite => full || (docsOnly ? DOC_BASE.includes(suite) : selected.has(suite)));
  return { schema: 1, mode: full ? 'full' : 'selected', base, head, source, suites, totalSuites: SUITE.length,
    performance, docsOnly, groups: [...groups].sort(), reasons: [...new Set(reasons)], changes: entries };
}

export function collectChanges(root = ROOT, env = process.env, baseRef) {
  let base, head, working = !env.GITHUB_EVENT_PATH;
  try {
    head = git(root, ['rev-parse','HEAD']).trim();
    if (!working) {
      const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
      if (env.GITHUB_SHA !== head) throw new Error('checkout does not match event SHA');
      if (env.GITHUB_EVENT_NAME === 'push') {
        if (event.forced) throw new Error('force push requires full validation');
        if (!/^[a-f0-9]{40,64}$/i.test(event.before || '') || /^0+$/.test(event.before)) throw new Error('missing/new-branch push base');
        base = event.before;
        git(root, ['merge-base','--is-ancestor',base,head]);
      } else if (env.GITHUB_EVENT_NAME === 'pull_request') {
        const pr = event.pull_request;
        if (![pr?.base?.sha,pr?.head?.sha].every(sha => /^[a-f0-9]{40,64}$/i.test(sha || ''))) throw new Error('invalid PR base/head');
        base = git(root, ['merge-base',pr.base.sha,pr.head.sha]).trim();
        git(root, ['merge-base','--is-ancestor',base,head]);
      } else throw new Error('event has no safe selection base');
    } else base = git(root, ['rev-parse','--verify','--end-of-options',`${baseRef || 'HEAD'}^{commit}`]).trim();
    const changes = [];
    const ranges = working ? [
      { args: ['--cached',base], stage: 'staged' },
      { args: [], stage: 'unstaged' },
    ] : [{ args: [base,head], stage: 'committed' }];
    for (const range of ranges) {
      const tokens = git(root, ['diff','--no-ext-diff','--no-textconv','--name-status','-z','-M',...range.args,'--']).split('\0');
      for (let i = 0; i < tokens.length && tokens[i];) {
        const status = tokens[i++], first = tokens[i++];
        if (!first) throw new Error('malformed git diff');
        const renamed = /^[RC]/.test(status), path = renamed ? tokens[i++] : first;
        if (!path) throw new Error('malformed rename');
        changes.push({ status, path, stage: range.stage, ...(renamed ? { oldPath: first } : {}) });
      }
    }
    if (working) {
      for (const path of git(root, ['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean)) {
        if (!path.startsWith('.context/') && !changes.some(change => change.path === path)) changes.push({ status: 'A', path });
      }
    }
    const content = (path, revision = null) => {
      try {
        if (revision || !working) return git(root, ['show',`${revision === 'index' ? '' : revision || head}:${path}`]);
        return lstatSync(join(root,path)).isFile() ? readFileSync(join(root,path),'utf8') : null;
      } catch { return null; }
    };
    for (const change of changes) if (['index.html','sw.js'].includes(change.path)) {
      change.before = content(change.oldPath || change.path, change.stage === 'unstaged' ? 'index' : base);
      change.after = content(change.path, change.stage === 'staged' ? 'index' : null);
    }
    return { changes, sources: Object.fromEntries(['index.html','sw.js'].map(path => [path,content(path)])), base, head, source: working ? 'working-tree' : env.GITHUB_EVENT_NAME };
  } catch (error) {
    return { changes: [], base: base || null, head: head || null, source: working ? 'working-tree' : env.GITHUB_EVENT_NAME,
      fallback: [`unavailable/unsafe change base: ${error.message.split('\n')[0].slice(0,180)}`] };
  }
}
export function createRepoPlan(root = ROOT, env = process.env, baseRef) {
  const { changes, ...context } = collectChanges(root, env, baseRef);
  return planChanges(changes, context);
}
export function trackedPaths(root = ROOT) {
  return git(root, ['ls-files','-z']).split('\0').filter(Boolean);
}
if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  for (let i=0;i<args.length;i+=2) {
    if (!['--out','--base'].includes(args[i]) || !args[i+1] || args[i+1].startsWith('--') || args.indexOf(args[i]) !== i)
      throw new Error('Usage: ci-plan.mjs [--out file] [--base ref]');
  }
  const value = flag => args.includes(flag) ? args[args.indexOf(flag)+1] : null;
  const plan = createRepoPlan(ROOT, process.env, value('--base'));
  const out = resolve(value('--out') || join(ROOT,'.context/ci-plan.json'));
  mkdirSync(dirname(out),{recursive:true}); writeFileSync(out,JSON.stringify(plan,null,2)+'\n');
  console.log(`${plan.mode}: ${plan.suites.length}/${plan.totalSuites} suites; performance ${plan.performance ? 'required' : 'release/nightly only'}. Plan: ${out}`);
  for (const reason of plan.reasons) console.log(`  ${reason}`);
}
