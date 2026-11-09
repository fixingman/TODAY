// Local developer commands. Fresh checks are scoped preflights, never release proof.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, mkdtempSync, copyFileSync, rmSync, symlinkSync, lstatSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { join, dirname, resolve, sep, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { SUITE } from './ci-policy.mjs';
import { classifyPath } from './ci-plan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (root,args) => execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const json = path => JSON.parse(readFileSync(path,'utf8'));

export function dependenciesReady(root) {
  try {
    const expected=json(join(root,'scripts/package-lock.json')).packages;
    const installed=json(join(root,'scripts/node_modules/.package-lock.json')).packages;
    return Object.entries(expected).every(([path,pkg])=>!path || (pkg.optional&&!installed[path]) ||
      installed[path]?.version===pkg.version && installed[path]?.integrity===pkg.integrity);
  } catch {return false;}
}

export function childEnvironment(env=process.env) {
  // A local preflight must not write GitHub outputs or masquerade as hosted proof.
  const clean=Object.fromEntries(Object.entries(env).filter(([key])=>!key.startsWith('GITHUB_')&&key!=='GH_TOKEN'));
  return {...clean,PATH:dirname(process.execPath)+delimiter+(clean.PATH||'')};
}

export function freshSnapshot(root) {
  const head=git(root,['rev-parse','HEAD']).trim();
  const changed=git(root,['diff','--no-renames','--name-only','-z','HEAD','--']).split('\0').filter(Boolean);
  const untracked=git(root,['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean);
  for(const path of [...changed,...untracked]) {
    if(path.split('/').some(part=>['.context','.git','node_modules'].includes(part))||/(^|\/)\.env(?:\.|$)/.test(path))throw Error('Private/generated path refused: '+path);
    if(untracked.includes(path)&&classifyPath(path).kind==='unknown')throw Error('Classify or ignore this untracked path before checking: '+path);
    if(existsSync(join(root,path))&&!lstatSync(join(root,path)).isFile())throw Error('Changed symlinks/directories are not copied: '+path);
  }
  const directory=mkdtempSync(join(tmpdir(),'today-fresh-')),checkout=join(directory,'checkout');
  try {
    execFileSync('git',['clone','--shared','--no-checkout','--quiet','--',root,checkout],{stdio:'pipe'});
    git(checkout,['checkout','--detach','--quiet',head]);
    for(const path of new Set([...changed,...untracked])) {
      const destination=resolve(checkout,path);
      if(!destination.startsWith(checkout+sep))throw Error('Snapshot path escaped checkout');
      if(existsSync(join(root,path))){mkdirSync(dirname(destination),{recursive:true});copyFileSync(join(root,path),destination);}
      else rmSync(destination,{force:true});
    }
    return {directory,checkout,head,cleanup:()=>rmSync(directory,{recursive:true,force:true})};
  } catch(error){rmSync(directory,{recursive:true,force:true});throw error;}
}

async function pinnedBrowser(root) {
  const [{computeExecutablePath,Browser},{PUPPETEER_REVISIONS}]=await Promise.all([import('@puppeteer/browsers'),import('puppeteer-core')]);
  const browser=process.env.CHROME_PATH||computeExecutablePath({browser:Browser.CHROME,buildId:PUPPETEER_REVISIONS.chrome,cacheDir:join(root,'.context/ci-browser')});
  if(!existsSync(browser))throw Error('Cached test browser missing. Run node scripts/install-ci-browser.mjs once; fresh checks never download it.');
  const version=execFileSync(browser,['--version'],{encoding:'utf8'}).trim();
  if(!version.endsWith(' '+PUPPETEER_REVISIONS.chrome))throw Error('Test browser must match the lockfile: '+PUPPETEER_REVISIONS.chrome);
  return browser;
}

export async function freshCheck(root,suites) {
  const chosen=[...new Set(['ci-invariants',...suites])];
  if(chosen.some(name=>!SUITE.includes(name)))throw Error('Choose registered non-live suites; no full gate is run implicitly.');
  if(!dependenciesReady(root))throw Error('Dependencies differ from the lockfile. Run workspace:setup first.');
  const browser=await pinnedBrowser(root),began=Date.now(),snapshot=freshSnapshot(root);
  let fd,evidence;
  try {
    mkdirSync(join(root,'.context'),{recursive:true});
    evidence=mkdtempSync(join(root,'.context','fresh-'));
    symlinkSync(join(root,'scripts/node_modules'),join(snapshot.checkout,'scripts/node_modules'),'dir');
    fd=openSync(join(evidence,'run.log'),'w');
    const result=spawnSync(process.execPath,['scripts/test-all.mjs','--suites',chosen.join(',')],{
      cwd:snapshot.checkout,env:{...childEnvironment(),CHROME_PATH:browser},stdio:['ignore',fd,fd],
    });
    closeSync(fd);fd=undefined;
    const reportPath=join(snapshot.checkout,'.context/ci-test-results/summary.json');
    const report=existsSync(reportPath)?json(reportPath):null;
    const receipt={scope:'local fresh preflight; not release proof',sourceHead:snapshot.head,suites:chosen,
      durationMs:Date.now()-began,exitCode:result.status,signal:result.signal,report};
    writeFileSync(join(evidence,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
    const {cpSync}=await import('node:fs');
    if(existsSync(dirname(reportPath)))cpSync(dirname(reportPath),join(evidence,'results'),{recursive:true});
    console.log(`Fresh check: ${chosen.join(', ')} · ${(receipt.durationMs/1000).toFixed(1)}s · ${report?JSON.stringify(report.counts):'runner did not complete'}`);
    console.log('Evidence: '+evidence);
    for(const suite of report?.suites||[])if(suite.status!=='passed')console.error(suite.name+': '+(suite.attempts?.[0]?.excerpt||suite.status));
    if(result.error)throw result.error;
    return result.status===0&&report?.status==='passed'?0:1;
  } finally {if(fd!==undefined)closeSync(fd);snapshot.cleanup();}
}

export function setupWorkspace(root,run=spawnSync) {
  if(dependenciesReady(root)){console.log('Workspace dependencies already match the lockfile.');return 0;}
  const result=run('npm',['ci','--prefix','scripts','--prefer-offline','--no-audit','--no-fund'],{cwd:root,env:childEnvironment(),stdio:'inherit'});
  if(result.error)throw result.error;
  return result.status??1;
}

export async function main(args) {
  const [mode,...rest]=args;
  if(mode==='publish')return (await import('./release-publish.mjs')).main(rest,ROOT);
  if(mode==='runtime'&&!rest.length){console.log(process.version);return 0;}
  if(mode==='setup'&&!rest.length)return setupWorkspace(ROOT);
  if(mode==='archive'&&!rest.length){const r=spawnSync(process.execPath,['scripts/ci-invariants.mjs'],{cwd:ROOT,env:childEnvironment(),stdio:'inherit'});if(r.error)throw r.error;return r.status??1;}
  if(mode==='fresh'&&(!rest.length||rest.length===2&&rest[0]==='--suites'&&rest[1])) {
    mkdirSync(join(ROOT,'.context'),{recursive:true});
    return freshCheck(ROOT,rest.length?rest[1].split(','):['smoke-test']);
  }
  throw Error('Usage: bash scripts/dev.sh setup|archive|fresh [--suites name,name] | publish SHA [--master] [--suites name,name] [--run ID]');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code=>{process.exitCode=code;}).catch(error=>{console.error(error.message);process.exitCode=1;});
}
