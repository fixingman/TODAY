// Parallelize execution, never selection: the existing policy still owns every required check.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, appendFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { SUITE } from './ci-policy.mjs';
import { createRepoPlan } from './ci-plan.mjs';
import { executionPolicy } from './ci-execution.mjs';
import { digest, requireValue } from './release-evidence.mjs';

// Advisory seconds from dev42528361401; changing weights cannot remove a test.
const WEIGHTS = {
  'focus-wording-test':57,'nudge-delivery-test':54,'nudge-test':54,'splash-test':44,
  'focus-test':44,'gmail-feedback-test':35,'pool-wording-test':31,'assistant-test':26,
  'sidebar-test':22,'exploration-test':21,'triage-test':16,'dropbox-test':14,
  'meeting-test':10,'day-lifecycle-test':10,'platform-test':9,
};
const context = env => Object.fromEntries(['GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT',
  'GITHUB_WORKFLOW_REF','GITHUB_EVENT_NAME','GITHUB_REF'].map(key=>[key,env[key]||null]));
const same = (a,b) => digest(a)===digest(b);
const pinnedEnvironment = env => Object.fromEntries(['node','chrome','platform','architecture','runnerOS','runnerImage'].map(key=>[key,env?.[key]||null]));

export function shardPlan(policy, workflow = {}) {
  requireValue(['full','selected','shadow'].includes(policy.mode), 'Invalid execution mode');
  const selected=policy.mode==='selected'?policy.plan?.suites:SUITE;
  requireValue(Array.isArray(selected)&&selected.length>0&&new Set(selected).size===selected.length
    && selected.every(name=>SUITE.includes(name)), 'Invalid planned suite inventory');
  const suites=SUITE.filter(name=>selected.includes(name));
  const count=Math.min(3,Math.ceil(suites.length/12));
  const workers=Array.from({length:count},(_,id)=>({id,suites:[],estimatedSeconds:0}));
  for(const name of [...suites].sort((a,b)=>(WEIGHTS[b]||3)-(WEIGHTS[a]||3)||SUITE.indexOf(a)-SUITE.indexOf(b))) {
    const worker=[...workers].sort((a,b)=>a.estimatedSeconds-b.estimatedSeconds||a.id-b.id)[0];
    worker.suites.push(name);worker.estimatedSeconds+=WEIGHTS[name]||3;
  }
  for(const worker of workers)worker.suites=SUITE.filter(name=>worker.suites.includes(name));
  return {schema:1,policy,workflow,suites,workers};
}

export function mergeShards(plan, shards) {
  requireValue(same(plan,shardPlan(plan.policy,plan.workflow)), 'Shard plan differs from canonical policy');
  requireValue(shards.length===plan.workers.length,'Missing or extra functional shard');
  const reports=[];
  for(const worker of plan.workers) {
    const matches=shards.filter(shard=>shard.id===worker.id);
    requireValue(matches.length===1,'Duplicate or missing shard identity');
    const report=matches[0].report;
    requireValue(report?.schema===2&&report.status==='passed'&&report.mode==='selected', 'Incomplete or failed shard');
    requireValue(report.candidateSha===plan.policy.candidateSha&&report.checkoutSha===plan.policy.candidateSha
      &&report.checkoutShaAtEnd===plan.policy.candidateSha,'Shard candidate mismatch');
    requireValue(report.inventoryTotal===SUITE.length&&same(report.selectedSuites,worker.suites)
      &&same(report.executedSuites,worker.suites)&&same(report.suites?.map(suite=>suite.name),worker.suites),'Shard inventory mismatch');
    requireValue(same(report.counts,{passed:worker.suites.length,flaky:0,failed:0,total:worker.suites.length}), 'Failed/flaky shard counts');
    requireValue(report.inputsChanged===false&&report.inputsAtStart&&same(report.inputsAtStart,report.inputsAtEnd),'Shard inputs changed');
    const env=plan.workflow;
    requireValue(report.workflow?.runId===env.GITHUB_RUN_ID&&report.workflow?.attempt===env.GITHUB_RUN_ATTEMPT
      &&report.workflow?.ref===env.GITHUB_WORKFLOW_REF&&report.workflow?.event===env.GITHUB_EVENT_NAME
      &&report.workflow?.sourceRef===env.GITHUB_REF,'Shard workflow/run-attempt mismatch');
    for(const suite of report.suites)requireValue(suite.status==='passed'&&suite.attempts?.length===1
      &&suite.attempts[0].attempt==='first'&&suite.attempts[0].exitCode===0&&suite.attempts[0].signal===null
      &&suite.attempts[0].timedOut===false,'Missing, retried or failing shard suite: '+suite.name);
    if(reports.length)requireValue(same(report.inputsAtStart,reports[0].inputsAtStart)
      &&same(pinnedEnvironment(report.environment),pinnedEnvironment(reports[0].environment)),'Shards used different inputs or environments');
    reports.push(report);
  }
  const byName=new Map(reports.flatMap(report=>report.suites.map(suite=>[suite.name,suite])));
  requireValue(byName.size===plan.suites.length,'Missing or duplicate combined suite');
  const start=Math.min(...reports.map(report=>Date.parse(report.startedAt)));
  const end=Math.max(...reports.map(report=>Date.parse(report.finishedAt)));
  requireValue(Number.isFinite(start)&&Number.isFinite(end)&&end>=start,'Invalid shard timing');
  return {...reports[0],mode:plan.policy.mode,plan:plan.policy.plan,selectedSuites:plan.suites,
    executedSuites:plan.suites,suites:plan.suites.map(name=>byName.get(name)),
    counts:{passed:plan.suites.length,flaky:0,failed:0,total:plan.suites.length},
    startedAt:new Date(start).toISOString(),finishedAt:new Date(end).toISOString(),durationMs:end-start,
    outputBytes:Object.fromEntries(['child','terminal'].map(key=>[key,reports.reduce((n,report)=>n+(report.outputBytes?.[key]||0),0)])),
    ...(plan.policy.mode==='shadow'?{selectionMisses:[]}:{}),
    shards:reports.map((report,id)=>({id,durationMs:report.durationMs,suites:report.executedSuites,
      environment:report.environment,workflow:report.workflow})),
  };
}

const own=fileURLToPath(import.meta.url);
if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(process.argv[1])===own) {
  const root=resolve(dirname(own),'..'),dir=join(root,'.context');mkdirSync(dir,{recursive:true});
  const read=path=>JSON.parse(readFileSync(path,'utf8'));
  const currentPolicy=()=>{
    const event=process.env.GITHUB_EVENT_PATH?read(process.env.GITHUB_EVENT_PATH):{};
    return executionPolicy(createRepoPlan(root,process.env),process.env,event);
  };
  const path=join(dir,'ci-shard-plan.json'),[mode,id,...extra]=process.argv.slice(2);
  requireValue(!extra.length,'Unexpected shard argument');
  if(mode==='plan') {
    requireValue(id===undefined,'Unexpected plan argument');
    const policy=read(join(dir,'ci-execution.json'));
    requireValue(same(policy,currentPolicy()),'Execution policy changed before planning');
    const plan=shardPlan(policy,context(process.env));writeFileSync(path,JSON.stringify(plan,null,2)+'\n');
    if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'matrix='+JSON.stringify({include:plan.workers.map(({id})=>({id}))})+'\n');
    console.log(`${plan.suites.length} suites across ${plan.workers.length} isolated runners; estimated loads ${plan.workers.map(w=>w.estimatedSeconds+'s').join(', ')}.`);
  } else {
    const plan=read(path);
    requireValue(same(plan,shardPlan(currentPolicy(),context(process.env))),'Candidate, workflow or selection changed between jobs');
    if(mode==='run') {
      const worker=plan.workers.find(worker=>String(worker.id)===id);
      requireValue(worker,'Unknown shard');
      const result=spawnSync(process.execPath,[join(root,'scripts/test-all.mjs'),'--suites',worker.suites.join(',')],{stdio:'inherit'});
      const output=join(dir,'ci-test-results');mkdirSync(output,{recursive:true});
      writeFileSync(join(output,'shard.json'),JSON.stringify({id:worker.id})+'\n');
      process.exit(result.status??1);
    } else if(mode==='merge') {
      requireValue(id===undefined,'Unexpected merge argument');
      const input=join(dir,'ci-shards'),folders=readdirSync(input).map(name=>join(input,name));
      const shards=folders.map(folder=>({id:read(join(folder,'shard.json')).id,report:read(join(folder,'summary.json'))}));
      const report=mergeShards(plan,shards),output=join(dir,'ci-test-results');mkdirSync(output,{recursive:true});
      for(const folder of folders) {
        const shard=read(join(folder,'shard.json')).id;
        const archive=join(output,'shards',String(shard));mkdirSync(archive,{recursive:true});
        cpSync(join(folder,'summary.json'),join(archive,'summary.json'));
        const original=shards.find(item=>item.id===shard).report;
        for(const suite of original.suites)requireValue(
          suite.attempts[0].log===`.context/ci-test-results/${suite.name}-first.log`
          &&existsSync(join(folder,`${suite.name}-first.log`)), 'Missing original attempt log: '+suite.name);
        for(const item of readdirSync(folder).filter(name=>!['summary.json','shard.json'].includes(name))) {
          requireValue(!existsSync(join(output,item)),'Shard evidence path collision: '+item);
          cpSync(join(folder,item),join(output,item),{recursive:true,errorOnExist:true,force:false});
        }
      }
      writeFileSync(join(output,'summary.json'),JSON.stringify(report,null,2)+'\n');
      const message=`All ${report.counts.total} planned suites passed once across ${shards.length} runners (${(report.durationMs/1000).toFixed(1)}s functional wall time).`;
      console.log(message);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,message+'\n');
    } else throw Error('Usage: ci-shards.mjs plan | run ID | merge');
  }
}
