// Offline publication checks. All remote reads/writes and CI are simulated; Git stays in disposable repos.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { parsePublishArgs, checkPublishRun, publishCandidate, createPublisherIO, main } from './release-publish.mjs';
import { REPOSITORY, WORKFLOW, WORKFLOW_ID } from './release-evidence.mjs';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..'),temporary=mkdtempSync(join(tmpdir(),'today-publish-'));
let serial=0;
function fixture(options={}) {
  const root=join(temporary,String(++serial));mkdirSync(join(root,'.context'),{recursive:true});mkdirSync(join(root,'.github/workflows'),{recursive:true});
  writeFileSync(join(root,'.github/workflows/test.yml'),readFileSync(join(ROOT,'.github/workflows/test.yml')));
  writeFileSync(join(root,'.gitignore'),'.context/\n');writeFileSync(join(root,'candidate.txt'),'before');
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git(['init','--quiet','-b','dev']);git(['config','user.name','Fictional fixture']);git(['config','user.email','fixture@example.invalid']);
  git(['remote','add','origin',`https://github.com/${REPOSITORY}.git`]);git(['add','.']);git(['commit','--quiet','-m','base']);
  const base=git(['rev-parse','HEAD']);writeFileSync(join(root,'candidate.txt'),'reviewed');git(['add','candidate.txt']);
  git(['commit','--quiet','-m','candidate',...(options.noTrailer?[]:['-m','CI-Validation: full'])]);const sha=git(['rev-parse','HEAD']);
  const state={dev:options.resume?sha:base,master:base,clock:0,discoveryMisses:options.discoveryMisses||0,calls:[],notes:[],pushes:[],watches:[]};
  const runData=branch=>({id:branch==='dev'?11:22,run_attempt:1,head_sha:sha,head_branch:branch,workflow_id:WORKFLOW_ID,path:WORKFLOW,
    repository:{full_name:REPOSITORY},head_repository:{full_name:REPOSITORY},event:'push',
    status:state[branch+'Done']||options.completed?'completed':'in_progress',
    conclusion:options.cancelled?'cancelled':options.ciFailure||options.masterCiFailure&&branch==='master'?'failure':'success',html_url:`https://github.com/${REPOSITORY}/actions/runs/${branch==='dev'?11:22}`});
  const backend=async(binary,args,settings)=>{
    state.calls.push([binary,args]);const pass=stdout=>({status:0,stdout,stderr:''});
    if(binary==='git') {
      if(args[0]==='fetch')return pass('');
      if(args[0]==='ls-remote')return pass(`${state.dev}\trefs/heads/dev\n${state.master}\trefs/heads/master\n`);
      if(args[0]==='push') {
        assert.equal(args[1],'origin');assert.equal(args.length,3);assert.ok(!args.some(arg=>arg.includes('force')));
        const [pushed,ref]=args[2].split(':');assert.equal(pushed,sha);assert.ok(['refs/heads/dev','refs/heads/master'].includes(ref));
        const branch=ref.split('/').at(-1);state.pushes.push(branch);state[branch]=sha;return pass('');
      }
      // Only the listed read-only/local Git operations may reach the fixture repository.
      assert.ok(['branch','rev-parse','diff','ls-files','remote','merge-base','show'].includes(args[0]),'Unexpected Git command');
      return pass(git(args));
    }
    if(binary===process.execPath) {
      if(args[0].endsWith('workspace-tools.mjs')) {
        assert.deepEqual(args.slice(1),['fresh','--suites','smoke-test']);options.afterValidate?.({state,root,git});
        return {...pass('local fixture pass'),...(options.localFailure?{status:1}:{}),...(options.handledTimeout?{timedOut:true}:{} )};
      }
      assert.ok(args[0].endsWith('release-status.mjs'));assert.deepEqual(args.slice(1),['preflight',sha,'--run','11']);
      if(options.preflightFailure)return {status:1,stdout:'',stderr:'proof refused'};
      const proof={candidateSha:sha,dev:sha,master:state.master,runId:11,artifactId:73,ready:true,...options.badProof};
      options.afterPreflight?.({state,root,git});return pass(JSON.stringify(proof));
    }
    assert.equal(binary,'gh');
    if(args[0]==='run') {
      assert.deepEqual(args.slice(0,2),['run','watch']);assert.deepEqual(args.slice(3),['--interval','60','--exit-status']);assert.equal(settings.long,true);
      state.watches.push(Number(args[2]));const branch=args[2]==='11'?'dev':'master';state[branch+'Done']=true;
      options.afterWatch?.({state,root,git,branch});return {...pass(''),...(options.ciFailure||options.masterCiFailure&&branch==='master'?{status:1}:{})};
    }
    assert.deepEqual(args.slice(0,3),['api','--hostname','github.com']);const path=args[3];assert.ok(path.startsWith('repos/'+REPOSITORY+'/actions/'));
    if(path.includes('/workflows/')) {
      const branch=new URL('https://fixture.invalid/'+path).searchParams.get('branch');
      if(options.invalidRunList)return pass('{}');
      if(options.noRun||state.discoveryMisses-->0)return pass('{"workflow_runs":[]}');
      return pass(JSON.stringify({workflow_runs:[runData(branch)]}));
    }
    const branch=path.endsWith('/11')?'dev':'master',result=runData(branch);options.alterRun?.(result);
    return pass(JSON.stringify(result));
  };
  const io=createPublisherIO(root,{run:backend,note:message=>state.notes.push(message),now:()=>state.clock,pause:async ms=>{state.clock+=ms;}});
  return {root,sha,base,git,state,io,options};
}
const execute=async f=>publishCandidate(parsePublishArgs([f.sha,...(f.options.master?['--master']:[]),...(f.options.run?['--run',String(f.options.run)]:[])]),f.io);
try {
  const sha='a'.repeat(40);
  assert.equal(parsePublishArgs([sha]).master,false);assert.equal(parsePublishArgs([sha,'--master']).master,true);
  for(const args of [[],['HEAD'],[sha,'--master','--master'],[sha,'--suites','ai-test'],[sha,'--run','0'],[sha,'--unexpected'],[sha,'--master=false']])assert.throws(()=>parsePublishArgs(args));
  assert.equal(parsePublishArgs(['--help']).help,true);
  {
    const f=fixture(),r=await execute(f);assert.equal(r.sha,f.sha);assert.equal(r.master,undefined);
    assert.deepEqual(f.state.pushes,['dev']);assert.deepEqual(f.state.watches,[11]);assert.equal(f.state.master,f.base);
    assert.equal(f.state.notes.length,3);assert.equal(JSON.parse(readFileSync(f.io.receipt)).phase,'complete');
  }
  {
    const f=fixture({master:true,discoveryMisses:1}),r=await execute(f);assert.equal(r.master.id,22);
    assert.deepEqual(f.state.pushes,['dev','master']);assert.deepEqual(f.state.watches,[11,22]);assert.equal(f.state.clock,15000);
    assert.equal(f.state.master,f.sha);assert.equal(f.git(['status','--porcelain']),'');
    const proofIndex=f.state.calls.findIndex(([binary,args])=>binary===process.execPath&&args[0].endsWith('release-status.mjs'));
    const pushIndex=f.state.calls.findIndex(([binary,args])=>binary==='git'&&args[0]==='push'&&args[2].endsWith(':refs/heads/master'));
    assert.ok(proofIndex>=0&&pushIndex>proofIndex);
  }
  {
    const f=fixture({master:true,resume:true,run:11,noTrailer:true,completed:true});await execute(f);
    assert.deepEqual(f.state.pushes,['master']);assert.deepEqual(f.state.watches,[]);
  }
  console.log('  ✓ dev-only cannot promote; authorised promotion verifies exact proof, uses ordinary fast-forwards and one quiet watcher per branch; completed candidates resume without duplicate pushes/runs');

  for(const options of [{localFailure:true},{handledTimeout:true},{master:true,noTrailer:true}]) {
    const f=fixture(options);await assert.rejects(()=>execute(f));assert.deepEqual(f.state.pushes,[]);
  }
  for(const corrupt of [
    f=>writeFileSync(join(f.root,'candidate.txt'),'uncommitted'),
    f=>{writeFileSync(join(f.root,'candidate.txt'),'staged');f.git(['add','candidate.txt']);},
    f=>writeFileSync(join(f.root,'unknown.txt'),'untracked'),
    f=>f.git(['remote','set-url','origin','https://example.invalid/other.git']),
    f=>f.git(['remote','set-url','--push','origin','https://example.invalid/other.git']),
    f=>{f.git(['config','--add','remote.origin.pushurl',`https://github.com/${REPOSITORY}.git`]);f.git(['config','--add','remote.origin.pushurl','https://example.invalid/other.git']);},
    f=>writeFileSync(join(f.root,'.git/MERGE_HEAD'),f.base)
  ]) {
    const f=fixture({master:true});corrupt(f);await assert.rejects(()=>execute(f));assert.deepEqual(f.state.pushes,[]);
  }
  {
    const f=fixture({afterValidate:({state})=>{state.dev='b'.repeat(40);}});await assert.rejects(()=>execute(f),/Dev advanced/);assert.deepEqual(f.state.pushes,[]);
  }
  console.log('  ✓ dirty/index/untracked state, merge state, wrong or multiple push URLs, local failures/timeouts and dev races stop before publication');

  for(const options of [
    {ciFailure:true},{cancelled:true,completed:true},{invalidRunList:true},{preflightFailure:true},{badProof:{ready:false}},{badProof:{runId:99}},
    {badProof:{candidateSha:'b'.repeat(40)}},
    {afterPreflight:({state})=>{state.master='b'.repeat(40);}},
    {afterPreflight:({state})=>{state.dev='b'.repeat(40);}},
    {afterPreflight:({root})=>writeFileSync(join(root,'candidate.txt'),'other session work')},
    {afterWatch:({root,branch})=>{if(branch==='dev')writeFileSync(join(root,'candidate.txt'),'other session work');}},
    {run:11,alterRun:r=>{r.head_sha='b'.repeat(40);}},
    {noRun:true}
  ]) {
    const f=fixture({...options,master:true});await assert.rejects(()=>execute(f));assert.deepEqual(f.state.pushes,['dev']);assert.notEqual(f.state.master,f.sha);
    if(options.afterPreflight||options.afterWatch)assert.ok(readFileSync(join(f.root,'candidate.txt'),'utf8').length);
    assert.ok(f.state.clock<=120000,'run registration is bounded');
  }
  {
    const f=fixture({afterWatch:({state})=>{state.dev='b'.repeat(40);}});await assert.rejects(()=>execute(f),/Dev advanced/);assert.equal(f.state.master,f.base);
  }
  {
    const f=fixture({completed:true});const run={id:11,head_sha:f.sha,head_branch:'dev',workflow_id:WORKFLOW_ID,path:WORKFLOW,
      repository:{full_name:REPOSITORY},head_repository:{full_name:REPOSITORY},event:'push'};
    for(const alter of [r=>r.head_branch='master',r=>r.workflow_id++,r=>r.path='other.yml',r=>r.head_repository.full_name='other/repo',r=>r.event='pull_request']) {
      const bad=structuredClone(run);alter(bad);assert.throws(()=>checkPublishRun(bad,'dev',f.sha));
    }
  }
  {
    const f=fixture({master:true,masterCiFailure:true});await assert.rejects(()=>execute(f));
    assert.deepEqual(f.state.pushes,['dev','master']);assert.equal(f.state.master,f.sha,'failure after promotion does not force an unsafe rollback');
    const receipt=JSON.parse(readFileSync(f.io.receipt));assert.equal(receipt.phase,'master-ci-waiting');assert.equal(receipt.masterRun,22);
  }
  console.log('  ✓ failed/cancelled/missing or mismatched CI, bad proof, changed source and dev/master races prevent promotion and preserve concurrent work');

  const help=spawnSync(process.execPath,[join(ROOT,'scripts/release-publish.mjs'),'--help'],{encoding:'utf8'});assert.equal(help.status,0);assert.match(help.stdout,/--master/);
  const forbidden=spawnSync(process.execPath,[join(ROOT,'scripts/release-publish.mjs'),sha],{encoding:'utf8',env:{...process.env,GITHUB_ACTIONS:'true'}});
  assert.equal(forbidden.status,1);assert.match(forbidden.stderr,/local, explicitly invoked/);
  const f=fixture();mkdirSync(join(f.root,'.context/publish.lock'));
  const previous={GITHUB_ACTIONS:process.env.GITHUB_ACTIONS,GITHUB_EVENT_NAME:process.env.GITHUB_EVENT_NAME};
  try {
    delete process.env.GITHUB_ACTIONS;delete process.env.GITHUB_EVENT_NAME;
    assert.equal(await main([f.sha],f.root),1,'another publisher lock refuses a second operation');
    assert.ok(existsSync(join(f.root,'.context/publish.lock')),'existing publisher lock is preserved');
    const dirty=fixture();writeFileSync(join(dirty.root,'candidate.txt'),'concurrent work');
    assert.equal(await main([dirty.sha],dirty.root),1,'real CLI stops on dirty state before any fetch/push');
    assert.equal(existsSync(join(dirty.root,'.context/publish.lock')),false,'own lock is released after refusal');
    assert.equal(readFileSync(join(dirty.root,'candidate.txt'),'utf8'),'concurrent work');
  } finally {for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;}
  assert.deepEqual(f.state.pushes,[]);
  console.log('  ✓ real CLI help is read-only, CI cannot auto-publish, and a second publisher cannot take the existing lock');
} finally {rmSync(temporary,{recursive:true,force:true});}
console.log('✓ RELEASE PUBLISH TEST PASSED (offline only)');
