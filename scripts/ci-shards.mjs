// Parallelize execution, never selection: the existing policy still owns every required check.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, appendFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { SUITE } from './ci-policy.mjs';
import { createRepoPlan } from './ci-plan.mjs';
import { executionPolicy } from './ci-execution.mjs';
import { digest, requireValue } from './release-evidence.mjs';

// Advisory seconds measured in full dev42614802326; weights cannot remove a check.
export const MAX_SHARDS = 5;
const WEIGHTS = {
  "ci-invariants": 2.25,
  "design-lint": 0.111,
  "token-parity-test": 0.029,
  "timezone-test": 0.089,
  "component-contract-test": 0.066,
  "smoke-test": 2.339,
  "accessibility-test": 5.511,
  "visual-test": 9.425,
  "splash-test": 42.932,
  "platform-test": 10.183,
  "sidebar-test": 19.364,
  "service-worker-test": 9.67,
  "connections-test": 8.539,
  "trello-test": 3.962,
  "gmail-test": 2.626,
  "gmail-feedback-test": 43.697,
  "pool-wording-test": 31.731,
  "calendar-test": 1.208,
  "calendar-nudge-policy-unit-test": 0.065,
  "task-enrich-test": 6.131,
  "dropbox-test": 12.376,
  "sync-merge-unit-test": 0.042,
  "dreambank-unit-test": 0.049,
  "meeting-extract-unit-test": 0.025,
  "error-monitor-unit-test": 0.025,
  "console-probe-test": 0.617,
  "ci-plan-test": 0.808,
  "release-evidence-test": 0.152,
  "release-publish-test": 3.316,
  "browser-fixture-test": 2.162,
  "ci-tooling-test": 5.023,
  "performance-harness-test": 3.846,
  "sound-test": 2.815,
  "startup-test": 1.973,
  "zones-test": 2.218,
  "task-actions-test": 3.829,
  "task-bounce-test": 0.03,
  "assistant-test": 30.478,
  "ai-assist-unit-test": 0.032,
  "writing-evaluator-test": 0.185,
  "feedback-policy-unit-test": 0.044,
  "suggestion-policy-unit-test": 0.033,
  "suggestion-outcomes-test": 0.908,
  "nudge-test": 62.131,
  "nudge-feedback-test": 5.25,
  "nudge-delivery-test": 52.053,
  "habits-test": 6.706,
  "triage-test": 17.058,
  "meeting-test": 11.438,
  "voice-capture-test": 2.77,
  "memory-panel-test": 5.486,
  "exploration-test": 24.506,
  "observation-pool-test": 0.04,
  "mailto-test": 0.083,
  "about-test": 6.72,
  "reflections-test": 9.371,
  "reflection-feedback-test": 4.634,
  "day-lifecycle-test": 10.2,
  "drag-test": 5.461,
  "focus-test": 43.724,
  "focus-wording-test": 64.02,
  "focus-session-unit-test": 0.023,
  "insights-test": 7.211,
  "noticed-model-unit-test": 0.026
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
  const count=Math.min(MAX_SHARDS,Math.ceil(suites.length/12));
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
      const input=join(dir,'ci-shards'),folders=readdirSync(input,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>join(input,e.name));
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
