// Cheap checks shared by documentation, selected and full validation.
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { metadata } from './ci-plan.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (binary, args) => {
  const result = spawnSync(binary,args,{cwd:root,encoding:'utf8',timeout:30000});
  if (result.status !== 0) throw new Error(`${binary} ${args.join(' ')}\n${result.error?.message || ''}\n${result.stdout || ''}${result.stderr || ''}`);
  return result.stdout;
};
const index = readFileSync(join(root,'index.html'),'utf8');
const app = metadata(index,'index.html'), sw = metadata(readFileSync(join(root,'sw.js'),'utf8'),'sw.js');
if (!app || !sw || app.version !== sw.version) throw new Error('Invalid or inconsistent app/service-worker release metadata');
// Compile every inline classic script, including all blocks if one is added.
for (const match of index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (!/\bsrc\s*=/.test(match[1]) && !/\btype\s*=\s*["'](?:module|application\/ld\+json)["']/.test(match[1])) new Function(match[2]);
}
const paths = execFileSync('git',['-C',root,'ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0');
let count = 0;
for (const path of new Set(paths)) {
  if (!/^(?:assets|netlify|scripts)\/.+\.(?:js|cjs|mjs)$/.test(path) || path.includes('/node_modules/')) continue;
  // A removed tracked source is handled by the selector; it cannot be compiled.
  let source; try { source = readFileSync(join(root,path),'utf8'); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (/\.js$/.test(path) && !/^(?:netlify\/edge-functions\/|assets\/vendor\/)/.test(path)) new Function(source);
  else run(process.execPath,['--check',path]);
  count++;
}
run(process.execPath,['scripts/performance-test.mjs','--payload-only']);
run('bash',['memory/validate-files.sh']);
run('git',['diff','--check']); run('git',['diff','--cached','--check']);
console.log(`  ✓ ${count} runtime/tooling syntax checks; release metadata, payload, memory inventory and patch whitespace`);
