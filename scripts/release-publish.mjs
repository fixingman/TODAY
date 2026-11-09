// Publish an already-reviewed commit. Selection, proof and promotion stay with existing guards.
import { execFile, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, renameSync, existsSync, realpathSync, openSync, closeSync, unlinkSync, rmdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUITE } from './ci-policy.mjs';
import { REPOSITORY, WORKFLOW, WORKFLOW_ID, validSha, requireValue } from './release-evidence.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const HELP=`Usage: npm run release:publish --prefix scripts -- SHA [--master] [--suites name,name] [--run ID]

Starts from a clean, reviewed commit on dev. Runs a fresh local check, pushes dev,
waits quietly for that commit's CI, then reports the result. --master additionally
verifies full exact-commit proof, fast-forwards master and waits for its CI.
Use --master only when master publication was authorised. New master candidates
need CI-Validation: full in their commit message. Default local suite: smoke-test.
An existing dev candidate can be resumed; --run selects its recorded dev run.
The command never stages, commits, amends, retries CI or force-pushes.
`;
export function parsePublishArgs(args) {
  if(args.length===1&&args[0]==='--help')return {help:true};
  const [sha,...flags]=args;requireValue(validSha(sha),'Use the reviewed full 40-character commit SHA');
  const options={sha,master:false,suites:['smoke-test']},seen=new Set();
  for(let i=0;i<flags.length;i++) {
    const flag=flags[i];requireValue(!seen.has(flag),'Duplicate publishing option: '+flag);seen.add(flag);
    if(flag==='--master')options.master=true;
    else if(flag==='--suites') {
      const names=flags[++i]?.split(',');
      requireValue(names?.length&&names.every(name=>SUITE.includes(name))&&new Set(names).size===names.length,'Choose registered local suites');
      options.suites=names;
    } else if(flag==='--run') {
      const value=flags[++i];requireValue(/^[1-9]\d*$/.test(value||'')&&Number.isSafeInteger(Number(value)),'Invalid dev run ID');options.runId=Number(value);
    } else throw Error('Unknown publishing option: '+flag);
  }
  return options;
}

export function checkPublishRun(run,branch,sha) {
  requireValue(Number.isSafeInteger(run?.id)&&run.id>0&&run.head_sha===sha&&run.head_branch===branch
    &&run.workflow_id===WORKFLOW_ID&&run.path===WORKFLOW
    &&run.repository?.full_name===REPOSITORY&&run.head_repository?.full_name===REPOSITORY
    &&['push','workflow_dispatch'].includes(run.event),'CI run does not match the trusted branch, workflow and candidate');
  return run;
}

export async function publishCandidate(options,io) {
  const {sha,master,suites,runId}=options;
  requireValue(validSha(sha)&&typeof master==='boolean'&&suites?.length&&suites.every(name=>SUITE.includes(name)),'Invalid reviewed publishing options');
  io.save({candidate:sha,target:master?'master':'dev',phase:'checking'});
  await io.assertClean(sha);await io.assertOrigin();await io.fetch();
  const before=await io.refs();await io.assertAncestor(before.dev,sha);
  if(master&&before.dev!==sha)requireValue(/^CI-Validation:[ \t]*full[ \t]*$/m.test(await io.message(sha)),
    'Master publication needs CI-Validation: full in the reviewed commit; no commit was changed or pushed');
  io.note('Checking the reviewed candidate locally.');await io.validate(suites);io.save({phase:'validated',localSuites:suites});await io.assertClean(sha);await io.assertOrigin();
  const current=await io.refs();requireValue(current.dev===before.dev,'Dev advanced during local validation; no push performed');
  if(current.dev!==sha) {await io.push('dev',sha);io.save({phase:'dev-pushed'});}
  const dev=await io.waitCI('dev',sha,runId);io.save({devRun:dev.id,devUrl:dev.html_url,phase:'dev-ci-passed'});
  if(!master) {
    await io.assertClean(sha);requireValue((await io.refs()).dev===sha,'Dev advanced during CI; candidate was preserved but is no longer current');
    io.save({phase:'complete'});return {sha,dev};
  }
  await io.assertClean(sha);await io.assertOrigin();
  const proof=await io.preflight(sha,dev.id);
  requireValue(proof?.ready===true&&proof.candidateSha===sha&&proof.dev===sha&&proof.runId===dev.id&&validSha(proof.master),'Missing exact-candidate promotion proof');
  await io.assertClean(sha);await io.assertOrigin();
  const fresh=await io.refs();requireValue(fresh.dev===sha&&fresh.master===proof.master,'Dev or master advanced after preflight; promotion refused');
  if(fresh.master!==sha) {await io.push('master',sha);io.save({phase:'master-pushed',proof});}
  const promoted=await io.waitCI('master',sha);await io.assertClean(sha);
  const final=await io.refs();requireValue(final.dev===sha&&final.master===sha,'Branches changed during publication');
  io.save({phase:'complete',masterRun:promoted.id,masterUrl:promoted.html_url,proof});
  return {sha,dev,master:promoted};
}

async function runCommand(binary,args,{cwd,logPath,long=false}) {
  if(long) {
    const fd=openSync(logPath,'w');
    try {return await new Promise((resolve,reject)=>{
      const child=spawn(binary,args,{cwd,stdio:['ignore',fd,fd]});let timedOut=false,killTimer;
      const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');killTimer=setTimeout(()=>child.kill('SIGKILL'),5000);},30*60*1000);
      child.once('error',error=>{clearTimeout(timer);clearTimeout(killTimer);reject(error);});
      child.once('close',(status,signal)=>{clearTimeout(timer);clearTimeout(killTimer);resolve({status,signal,timedOut,stdout:'',stderr:''});});
    });} finally {closeSync(fd);}
  }
  return new Promise(resolve=>execFile(binary,args,{cwd,encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024},(error,stdout,stderr)=>{
    writeFileSync(logPath,(stdout||'')+(stderr||'')+(error?'\n'+error.message+'\n':''));resolve({status:error?(Number.isInteger(error.code)?error.code:1):0,signal:error?.signal||null,stdout:stdout||'',stderr:stderr||''});
  }));
}

export function createPublisherIO(root,{run=runCommand,pause=ms=>new Promise(r=>setTimeout(r,ms)),note=console.log,now=Date.now}={}) {
  const directory=mkdtempSync(join(root,'.context/publish-')),receipt=join(directory,'receipt.json');
  let state={schema:1,startedAt:new Date().toISOString()},sequence=0;
  const save=patch=>{state={...state,...(patch.phase==='stopped'?{stoppedAfter:state.phase}:{}),...patch};const temp=receipt+'.tmp';writeFileSync(temp,JSON.stringify(state,null,2)+'\n');renameSync(temp,receipt);};
  const command=async(binary,args,long=false)=>{
    const logPath=join(directory,String(++sequence).padStart(3,'0')+'-'+(binary==='git'?'git':binary==='gh'?'github':'local')+'.log');
    const result=await run(binary,args,{cwd:root,logPath,long});
    requireValue(result.status===0&&!result.signal&&!result.timedOut,`${binary==='git'?'Git':binary==='gh'?'GitHub':'Local check'} command failed; publication stopped. Log: ${logPath}`);
    return result.stdout||'';
  };
  const git=args=>command('git',args);
  const api=async path=>JSON.parse(await command('gh',['api','--hostname','github.com',`repos/${REPOSITORY}/${path}`]));
  const refs=async()=>{
    const rows=(await git(['ls-remote','--heads','origin','dev','master'])).trim().split('\n').map(row=>row.split(/\s+/));
    const result=Object.fromEntries(rows.map(([sha,ref])=>[ref?.replace('refs/heads/',''),sha]));
    requireValue(validSha(result.dev)&&validSha(result.master),'Missing trusted dev/master refs');return result;
  };
  return {directory,receipt,save,note,
    async assertClean(sha) {
      requireValue((await git(['branch','--show-current'])).trim()==='dev','Publishing starts on dev');
      requireValue((await git(['rev-parse','HEAD'])).trim()===sha,'HEAD changed or does not match the reviewed candidate');
      requireValue(!(await git(['diff','--name-only','HEAD','--'])).trim(),'Commit reviewed working/index changes before publishing; existing changes were preserved');
      const others=(await git(['ls-files','--others','--exclude-standard','-z'])).split('\0').filter(path=>path&&!path.startsWith('.context/'));
      requireValue(!others.length,'Untracked work is present; existing files were preserved');
      for(const marker of ['MERGE_HEAD','rebase-merge','rebase-apply']) {
        const path=(await git(['rev-parse','--git-path',marker])).trim();
        requireValue(!existsSync(resolve(root,path)),'Finish the current merge/rebase before publishing');
      }
    },
    async assertOrigin() {
      const allowed=[`https://github.com/${REPOSITORY}.git`,`https://github.com/${REPOSITORY}`,`git@github.com:${REPOSITORY}.git`];
      for(const args of [['remote','get-url','--all','origin'],['remote','get-url','--push','--all','origin']]) {
        const urls=(await git(args)).trim().split('\n');requireValue(urls.length===1&&allowed.includes(urls[0]),'Origin fetch/push destination is not the single trusted repository');
      }
    },
    fetch:()=>git(['fetch','origin','dev','master']),refs,
    assertAncestor:(base,sha)=>git(['merge-base','--is-ancestor',base,sha]),
    message:sha=>git(['show','-s','--format=%B',sha]),
    validate:suites=>command(process.execPath,[join(root,'scripts/workspace-tools.mjs'),'fresh','--suites',suites.join(',')],true),
    push:(branch,sha)=>git(['push','origin',`${sha}:refs/heads/${branch}`]),
    preflight:async(sha,id)=>JSON.parse(await command(process.execPath,[join(root,'scripts/release-status.mjs'),'preflight',sha,'--run',String(id)])),
    async waitCI(branch,sha,id) {
      const began=now();let selected;
      do {
        if(id)selected=checkPublishRun(await api(`actions/runs/${id}`),branch,sha);
        else {
          const data=await api(`actions/workflows/${WORKFLOW_ID}/runs?head_sha=${sha}&branch=${branch}&per_page=100`);
          requireValue(Array.isArray(data.workflow_runs),'GitHub returned an invalid workflow run list');
          selected=data.workflow_runs?.filter(run=>run.head_sha===sha&&run.head_branch===branch&&['push','workflow_dispatch'].includes(run.event))
            .sort((a,b)=>b.id-a.id)[0];
          if(selected)checkPublishRun(selected,branch,sha);
        }
        if(!selected) {requireValue(now()-began<120000,'CI has not registered; resume this candidate later. No promotion performed');await pause(15000);}
      } while(!selected);
      note(`${branch==='dev'?'Dev':'Master'} CI: ${selected.html_url}`);
      save({[branch+'Run']:selected.id,[branch+'Url']:selected.html_url,phase:branch+'-ci-waiting'});
      if(selected.status!=='completed')await command('gh',['run','watch',String(selected.id),'--interval','60','--exit-status'],true);
      const done=checkPublishRun(await api(`actions/runs/${selected.id}`),branch,sha);
      requireValue(done.status==='completed'&&done.conclusion==='success','CI failed, was cancelled, or remains incomplete; publication stopped');
      note(`${branch==='dev'?'Dev':'Master'} CI passed.`);return done;
    },
  };
}

export async function main(args,root=ROOT) {
  let io,lock,locked=false;
  try {
    const options=parsePublishArgs(args);if(options.help){console.log(HELP);return 0;}
    requireValue(process.env.GITHUB_ACTIONS!=='true'&&!process.env.GITHUB_EVENT_NAME,'Publishing is a local, explicitly invoked operation');
    const pins=[...new Set([...readFileSync(join(root,'.github/workflows/test.yml'),'utf8').matchAll(/node-version: '([0-9.]+)'/g)].map(m=>m[1]))];
    requireValue(pins.length===1&&process.version==='v'+pins[0],'Run through npm release:publish or bash scripts/dev.sh publish to select the supported Node');
    mkdirSync(join(root,'.context'),{recursive:true});lock=join(root,'.context/publish.lock');
    try {mkdirSync(lock);locked=true;} catch(error) {if(error.code==='EEXIST')throw Error('A publisher is active, or its lock needs review: '+lock);throw error;}
    writeFileSync(join(lock,'owner.json'),JSON.stringify({pid:process.pid,sha:options.sha})+'\n');
    io=createPublisherIO(root);const result=await publishCandidate(options,io);
    console.log(`Published ${result.sha.slice(0,8)} to ${result.master?'dev and master':'dev'}. Receipt: ${io.receipt}`);return 0;
  } catch(error) {
    if(io)io.save({phase:'stopped',error:error.message});
    console.error(error.message);if(io)console.error('Receipt: '+io.receipt);return 1;
  } finally {
    if(locked){try{unlinkSync(join(lock,'owner.json'));rmdirSync(lock);}catch(error){console.error('Review publisher lock cleanup: '+error.message);}}
  }
}
if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await main(process.argv.slice(2));
