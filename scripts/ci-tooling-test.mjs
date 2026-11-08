// Exercise the real CI runner and payload CLI with isolated synthetic repositories.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { existsSync, symlinkSync, cpSync } from 'node:fs';
import { freshSnapshot, dependenciesReady, childEnvironment, setupWorkspace, freshCheck } from './workspace-tools.mjs';
import { PNG } from 'pngjs';
import { shardPlan, mergeShards } from './ci-shards.mjs';
import { SUITE } from './ci-policy.mjs';
import { verifyFinal } from './ci-final.mjs';
const DIR = dirname(fileURLToPath(import.meta.url));
const fixture = mkdtempSync(join(tmpdir(), 'today-ci-'));
const scripts = join(fixture, 'scripts');
mkdirSync(scripts); mkdirSync(join(fixture, 'fonts'));
const run = (file, args = [], extraEnv = {}) => spawnSync(process.execPath, [join(scripts, file), ...args], {
  encoding: 'utf8', timeout: 10000, env: { ...process.env,
    CHROME_PATH: '/nonexistent/test-only-chrome', GITHUB_SHA: 'a'.repeat(40),
    GITHUB_STEP_SUMMARY: join(fixture, 'step-summary.md'), GITHUB_WORKFLOW: 'fixture',
    ...extraEnv,
  },
});
try {
  // Developer preflights preserve the working tree while excluding ignored state.
  {
    const project=join(fixture,'fresh-project');mkdirSync(project);mkdirSync(join(project,'scripts'));mkdirSync(join(project,'assets'));
    const git=(args)=>execFileSync('git',args,{cwd:project,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    git(['init','--quiet']);git(['config','user.email','fixture@example.invalid']);git(['config','user.name','Fixture']);
    writeFileSync(join(project,'.gitignore'),'.context/\n.env\nscripts/node_modules/\n');
    writeFileSync(join(project,'assets/state.js'),'original');writeFileSync(join(project,'scripts/removed.mjs'),'original');
    git(['add','.gitignore','assets/state.js','scripts/removed.mjs']);git(['commit','--quiet','-m','fixture']);
    const head=git(['rev-parse','HEAD']);
    writeFileSync(join(project,'assets/state.js'),'working change');writeFileSync(join(project,'scripts/new.mjs'),'new');
    rmSync(join(project,'scripts/removed.mjs'));mkdirSync(join(project,'.context'));writeFileSync(join(project,'.context','old-output'),'stale');writeFileSync(join(project,'.env'),'fictional-private');
    const status=git(['status','--porcelain']);
    const snapshot=freshSnapshot(project);
    assert.equal(readFileSync(join(snapshot.checkout,'assets/state.js'),'utf8'),'working change');
    assert.equal(readFileSync(join(snapshot.checkout,'scripts/new.mjs'),'utf8'),'new');
    assert.ok(!existsSync(join(snapshot.checkout,'scripts/removed.mjs')));
    assert.ok(!existsSync(join(snapshot.checkout,'.context'))&&!existsSync(join(snapshot.checkout,'.env')));
    assert.equal(git(['rev-parse','HEAD']),head);assert.equal(git(['status','--porcelain']),status);
    snapshot.cleanup();assert.ok(!existsSync(snapshot.directory));
    writeFileSync(join(project,'unclassified.private'),'fictional');assert.throws(()=>freshSnapshot(project),/Classify or ignore/);rmSync(join(project,'unclassified.private'));
    await assert.rejects(()=>freshCheck(project,['ai-test']),/registered non-live/);

    // Setup operates in this workspace, reuses a matching install and propagates failure.
    const packages={'':{name:'fixture'},'node_modules/example':{version:'1.0.0',integrity:'fixture'}};
    writeFileSync(join(project,'scripts/package-lock.json'),JSON.stringify({packages}));
    mkdirSync(join(project,'scripts/node_modules'));writeFileSync(join(project,'scripts/node_modules/.package-lock.json'),JSON.stringify({packages}));
    assert.equal(dependenciesReady(project),true);
    assert.equal(setupWorkspace(project,()=>{throw Error('unneeded install');}),0);
    writeFileSync(join(project,'scripts/node_modules/.package-lock.json'),JSON.stringify({packages:{}}));
    assert.equal(dependenciesReady(project),false);
    assert.equal(setupWorkspace(project,(binary,args,options)=>{assert.equal(binary,'npm');assert.deepEqual(args.slice(0,3),['ci','--prefix','scripts']);assert.equal(options.cwd,project);return {status:7};}),7);
    assert.throws(()=>setupWorkspace(project,()=>({error:Error('fixture failure')})),/fixture failure/);
    const env=childEnvironment({GITHUB_OUTPUT:'fixture',GITHUB_SHA:'fixture',GH_TOKEN:'fictional',KEEP:'yes',PATH:'/fixture'});
    assert.equal(env.KEEP,'yes');assert.ok(!('GITHUB_OUTPUT' in env)&&!('GITHUB_SHA' in env)&&!('GH_TOKEN' in env));

    // Non-interactive hooks can select an already installed CI Node without changing the shell.
    const bin=join(fixture,'old-node-bin'),nvm=join(fixture,'nvm');mkdirSync(bin);
    const {chmodSync}=await import('node:fs');
    writeFileSync(join(bin,'node'),'#!/bin/sh\nif [ "$1" = "--version" ]; then echo v20.0.0; else exit 17; fi\n');chmodSync(join(bin,'node'),0o755);
    const current=join(nvm,'versions/node',process.version,'bin');mkdirSync(current,{recursive:true});symlinkSync(process.execPath,join(current,'node'));
    const runtime=spawnSync('bash',[join(DIR,'dev.sh'),'runtime'],{encoding:'utf8',env:{...process.env,NVM_DIR:nvm,PATH:bin+':'+process.env.PATH}});
    assert.equal(runtime.status,0,runtime.stderr);assert.equal(runtime.stdout.trim(),process.version);
    console.log('  ✓ fresh snapshot includes working changes/deletions, excludes private/generated state, leaves source untouched; setup is scoped, cached and failure-visible; CI runtime selection is local');
  }
  const runner = readFileSync(join(DIR, 'test-all.mjs'), 'utf8');
  writeFileSync(join(scripts, 'ci-policy.mjs'), `export const SUITE=['design-lint','fixture-test']; export const EXCLUDED={}; export const NON_TEST_SUITE=new Set(['design-lint']); export const GROUPS={fixture:{files:[],suites:SUITE}}; export const BASE=SUITE; export const DOC_BASE=SUITE;`);
  writeFileSync(join(scripts, 'ci-plan.mjs'), readFileSync(join(DIR, 'ci-plan.mjs')));
  writeFileSync(join(scripts, 'test-all.mjs'), runner);
  writeFileSync(join(scripts, 'design-lint.mjs'), '');
  for (const mode of ['pass', 'flaky', 'fail', 'large-fail']) {
    writeFileSync(join(scripts, 'fixture-test.mjs'), `
      import { existsSync, writeFileSync } from 'node:fs';
      const marker = ${JSON.stringify(join(fixture, 'attempt'))};
      const retry = existsSync(marker); writeFileSync(marker, '1');
      console.log('stdout-' + (retry ? 'retry' : 'first'));
      console.error('ROOT_CAUSE_' + (retry ? 'RETRY' : 'FIRST'));
      for (let i=0; i<${mode === 'large-fail' ? 12000 : 15}; i++) console.error('stack detail ' + i + 'x'.repeat(100));
      process.exit(${JSON.stringify(mode)} === 'pass' || (${JSON.stringify(mode)} === 'flaky' && retry) ? 0 : 1);
    `);
    rmSync(join(fixture, 'attempt'), { force: true });
    rmSync(join(fixture, 'step-summary.md'), { force: true });
    const result = run('test-all.mjs');
    assert.equal(result.status, mode === 'pass' ? 0 : 1, result.stdout + result.stderr);
    const first = readFileSync(join(fixture, '.context/ci-test-results/fixture-test-first.log'), 'utf8');
    assert.match(first, /stdout-first/); assert.match(first, /ROOT_CAUSE_FIRST/);
    const summary = JSON.parse(readFileSync(join(fixture, '.context/ci-test-results/summary.json'), 'utf8'));
    assert.equal(summary.status, mode === 'pass' ? 'passed' : 'failed');
    assert.equal(summary.mode, 'full');
    assert.equal(summary.candidateSha, 'a'.repeat(40));
    assert.equal(summary.environment.node, process.version);
    assert.equal(summary.environment.chrome, null, 'missing Chrome cannot block synthetic checks');
    assert.equal(summary.workflow.name, 'fixture');
    assert.deepEqual(summary.selectedSuites, ['design-lint', 'fixture-test']);
    assert.deepEqual(summary.executedSuites, summary.selectedSuites);
    assert.deepEqual(summary.counts, { passed: mode === 'pass' ? 2 : 1,
      flaky: mode === 'flaky' ? 1 : 0, failed: mode.includes('fail') ? 1 : 0, total: 2 });
    const attempts = summary.suites[1].attempts;
    assert.equal(attempts.length, mode === 'pass' ? 1 : 2);
    assert.ok(summary.durationMs >= 0 && summary.suites.every(suite => suite.durationMs >= 0));
    assert.ok(attempts.every(attempt => attempt.durationMs >= 0 && attempt.outputBytes > 0 && !attempt.timedOut));
    const stepSummary = readFileSync(join(fixture, 'step-summary.md'), 'utf8');
    assert.match(stepSummary, /Functional checks — full suite/);
    assert.ok(Buffer.byteLength(result.stdout) < 8000, 'terminal output is bounded');
    assert.ok(Buffer.byteLength(stepSummary) < 8000, 'GitHub summary is bounded');
    if (mode !== 'pass') {
      assert.match(result.stdout, /ROOT_CAUSE_FIRST/, 'error message must survive long stacks');
      const retry = readFileSync(join(fixture, '.context/ci-test-results/fixture-test-retry.log'), 'utf8');
      assert.match(retry, /stdout-retry/); assert.match(retry, /ROOT_CAUSE_RETRY/);
      if (mode.includes('fail')) assert.match(result.stdout, /ROOT_CAUSE_RETRY/);
      else assert.match(result.stdout, /1 flaky/);
      if (mode === 'large-fail') {
        assert.match(first, /stack detail 11999/); assert.match(retry, /stack detail 11999/);
        const oldDetailBytes = Buffer.byteLength(first + retry), compactBytes = Buffer.byteLength(result.stdout);
        assert.ok(compactBytes < oldDetailBytes / 10, 'large logs remain in artifacts, not the terminal');
        console.log(`  ✓ large failure: ${oldDetailBytes} retained log bytes → ${compactBytes} terminal bytes`);
      }
    }
  }
  console.log('  ✓ full summaries retain counts, timings, environment and both attempts; failures/flakes still fail');

  // Exercise execution modes independently from selector classification.
  writeFileSync(join(scripts,'ci-plan.mjs'), `export const auditPolicy=()=>[]; export const createRepoPlan=()=>({head:'${'a'.repeat(40)}',mode:'selected',suites:['design-lint'],reasons:['fixture plan']});`);
  writeFileSync(join(scripts,'fixture-test.mjs'), 'console.error("outside selection");process.exit(1);');
  const shadow=run('test-all.mjs',['--shadow']);
  assert.equal(shadow.status,1);
  const shadowReport=JSON.parse(readFileSync(join(fixture,'.context/ci-test-results/summary.json'),'utf8'));
  assert.equal(shadowReport.mode,'shadow');assert.deepEqual(shadowReport.selectionMisses,['fixture-test']);
  assert.deepEqual(shadowReport.executedSuites,['design-lint','fixture-test']);
  const selected=run('test-all.mjs',['--changed']);assert.equal(selected.status,0,selected.stderr);
  const selectedReport=JSON.parse(readFileSync(join(fixture,'.context/ci-test-results/summary.json'),'utf8'));
  assert.deepEqual(selectedReport.executedSuites,['design-lint']);assert.equal(selectedReport.mode,'selected');
  assert.ok(selectedReport.outputBytes.terminal>0);
  assert.equal(run('test-all.mjs',['--suites','fixture-test']).status,1);
  for(const args of [['--suites','unknown'],['--suites',''],['--changed','--shadow'],['--base','HEAD'],['--changed','--changed']])
    assert.notEqual(run('test-all.mjs',args).status,0,JSON.stringify(args));
  writeFileSync(join(scripts, 'ci-execution.mjs'), readFileSync(join(DIR, 'ci-execution.mjs')));
  const eventPath = join(fixture, 'event.json');
  const routineEnv = { CI_ROUTINE_SELECTION: 'true', GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/dev', GITHUB_EVENT_PATH: eventPath };
  writeFileSync(eventPath, '{}');
  assert.equal(run('ci-execution.mjs', ['--run'], routineEnv).status, 0, 'routine entry point runs the selection');
  writeFileSync(eventPath,JSON.stringify({head_commit:{id:'a'.repeat(40),message:'Release fixture\n\nCI-Validation: full'}}));
  assert.equal(run('ci-execution.mjs',['--run'],routineEnv).status,1,'explicit full request retains failure outside the normal selection');
  const fullRequest=JSON.parse(readFileSync(join(fixture,'.context/ci-execution.json'),'utf8'));
  assert.equal(fullRequest.mode,'full');assert.equal(fullRequest.performance,true);assert.deepEqual(fullRequest.runnerArgs,[]);
  writeFileSync(eventPath,JSON.stringify({head_commit:{id:'b'.repeat(40),message:'CI-Validation: full'}}));
  const mismatched=run('ci-execution.mjs',['--run'],routineEnv);
  assert.notEqual(mismatched.status,0);assert.match(mismatched.stderr,/does not match the candidate/);
  writeFileSync(eventPath,'{}');
  assert.equal(run('ci-execution.mjs', ['--run'], { ...routineEnv, GITHUB_REF: 'refs/heads/master' }).status, 1, 'master cannot skip the failing suite');
  assert.equal(run('ci-execution.mjs', ['--run'], { ...routineEnv, CI_ROUTINE_SELECTION: 'false' }).status, 1, 'rollback restores full execution');
  for (const mode of ['release', 'shadow']) {
    writeFileSync(eventPath, JSON.stringify({ inputs: { mode } }));
    assert.equal(run('ci-execution.mjs', ['--run'], { ...routineEnv, GITHUB_EVENT_NAME: 'workflow_dispatch' }).status, 1, mode + ' retains the original suite failure');
  }
  assert.notEqual(run('ci-execution.mjs', ['--typo']).status, 0);
  rmSync(eventPath);
  console.log('  ✓ actual CI entry point propagates failures; master, release, shadow and rollback execute the full inventory');
  writeFileSync(join(scripts, 'ci-plan.mjs'), readFileSync(join(DIR, 'ci-plan.mjs')));
  console.log('  ✓ selected execution is explicit; shadow executes all and retains failures outside selection; invalid modes fail');

  writeFileSync(join(scripts, 'unlisted-test.mjs'), '');
  let result = run('test-all.mjs');
  assert.equal(result.status, 1);
  let summary = JSON.parse(readFileSync(join(fixture, '.context/ci-test-results/summary.json'), 'utf8'));
  assert.equal(summary.status, 'failed'); assert.deepEqual(summary.executedSuites, []);
  assert.deepEqual(summary.inventoryErrors.missing, ['unlisted-test']);
  rmSync(join(scripts, 'unlisted-test.mjs'));

  writeFileSync(join(scripts, 'test-all.mjs'), runner.replace('const SUITE_TIMEOUT_MS = 120000;', 'const SUITE_TIMEOUT_MS = 150;'));
  writeFileSync(join(scripts, 'fixture-test.mjs'), 'setInterval(() => {}, 100);');
  result = run('test-all.mjs');
  assert.equal(result.status, 1); assert.match(result.stdout, /Timed out after 0.15s/);
  summary = JSON.parse(readFileSync(join(fixture, '.context/ci-test-results/summary.json'), 'utf8'));
  assert.equal(summary.status, 'failed');
  assert.ok(summary.suites[1].attempts.every(attempt => attempt.timedOut && attempt.signal === 'SIGTERM'));
  // A browser/child can handle the deadline signal and exit 0. It still timed out.
  writeFileSync(join(scripts,'fixture-test.mjs'),'process.on("SIGTERM",()=>process.exit(0));setInterval(()=>{},100);');
  const fastRunner=runner.replace('const SUITE_TIMEOUT_MS = 120000;','const SUITE_TIMEOUT_MS = 150;');
  writeFileSync(join(scripts,'test-all.mjs'),fastRunner.replace('const passed=result.status===0&&!result.error&&!result.signal;','const passed=result.status===0;'));
  const falseGreen=run('test-all.mjs');assert.equal(falseGreen.status,0,'Original exit-only control falsely accepts the handled timeout');
  const falseReport=JSON.parse(readFileSync(join(fixture,'.context/ci-test-results/summary.json'),'utf8'));assert.ok(falseReport.suites[1].attempts[0].timedOut);
  writeFileSync(join(scripts,'test-all.mjs'),fastRunner);
  result=run('test-all.mjs');assert.equal(result.status,1);
  summary=JSON.parse(readFileSync(join(fixture,'.context/ci-test-results/summary.json'),'utf8'));
  assert.equal(summary.status,'failed');
  assert.ok(summary.suites[1].attempts.every(attempt=>attempt.timedOut&&attempt.exitCode===0),'A handled timeout is never accepted as a passing attempt');
  console.log('  ✓ inventory errors and real child timeouts retain failing summaries');

  const workflow = readFileSync(join(DIR, '../.github/workflows/test.yml'), 'utf8');
  const group = workflow.match(/^  group: (.+)$/m)?.[1];
  const cancellation = workflow.match(/^  cancel-in-progress: \$\{\{ (.+) \}\}$/m)?.[1];
  assert.ok(group && cancellation, 'routine concurrency policy is configured');
  const evaluate = (expression, github) => new Function('github', 'return (' + expression + ')')(github);
  const policy = (event, ref, pr = null) => {
    const github = { workflow: 'test', event_name: event, ref, event: { pull_request: { number: pr } } };
    return { group: group.replace(/\$\{\{ (.+?) \}\}/g, (_, expression) => evaluate(expression, github)),
      cancel: evaluate(cancellation, github) };
  };
  const dev = policy('push', 'refs/heads/dev'), master = policy('push', 'refs/heads/master');
  const pr = policy('pull_request', 'refs/pull/7/merge', 7), otherPR = policy('pull_request', 'refs/pull/8/merge', 8);
  const release = policy('workflow_dispatch', 'refs/heads/dev');
  assert.equal(dev.cancel, true); assert.equal(pr.cancel, true);
  assert.equal(master.cancel, false); assert.equal(release.cancel, false);
  assert.equal(policy('push', 'refs/heads/other').cancel, false);
  assert.equal(new Set([dev.group, master.group, pr.group, otherPR.group, release.group]).size, 5);
  assert.match(workflow, /run: npm run test:policy --prefix scripts/);
  assert.match(workflow, /run: node scripts\/ci-shards\.mjs run/);
  assert.match(workflow, /if: needs\.plan\.outputs\.performance == 'true' && needs\.plan\.outputs\.reuse != 'true'/);
  assert.match(workflow, /CI_RELEASE_REUSE: '(?:true|false)'/);
  assert.match(workflow, /name: Verify required gate dependencies\n\s+if: always\(\)/);
  assert.match(workflow, /CI_ROUTINE_SELECTION: 'true'/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /options: \[release, shadow\]/);
  assert.match(workflow, /\.context\/ci-execution\.json/);
  assert.doesNotMatch(workflow, /continue-on-error: true|paths-ignore:|paths:/);
  assert.match(workflow,/fetch-depth: 0/);
  assert.match(workflow,/runs-on: ubuntu-24\.04/);
  assert.match(workflow,/node-version: '24\.14\.0'/);
  assert.match(workflow,/run: node scripts\/install-ci-browser\.mjs/);
  assert.match(workflow, /run: npm run performance --prefix scripts -- --no-audit-check/);
  console.log('  ✓ concurrency isolates branches/PRs/events; master and dispatched release runs are not cancelled');
  // Sharding may change scheduling, never inventory, provenance or release acceptance.
  {
    const sha='a'.repeat(40),shardWorkflow={GITHUB_SHA:sha,GITHUB_RUN_ID:'41',GITHUB_RUN_ATTEMPT:'1',
      GITHUB_WORKFLOW_REF:'fixingman/TODAY/.github/workflows/test.yml@refs/heads/dev',GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/dev'};
    const policy={candidateSha:sha,mode:'full',performance:true,plan:{mode:'full',suites:SUITE}};
    const plan=shardPlan(policy,shardWorkflow);
    assert.equal(plan.workers.length,3);
    assert.deepEqual(SUITE.filter(name=>plan.workers.some(worker=>worker.suites.includes(name))),SUITE);
    assert.equal(plan.workers.reduce((n,w)=>n+w.suites.length,0),SUITE.length);
    assert.ok(Math.max(...plan.workers.map(w=>w.estimatedSeconds))-Math.min(...plan.workers.map(w=>w.estimatedSeconds))<=3);
    const reports=plan.workers.map(worker=>({id:worker.id,report:{schema:2,mode:'selected',status:'passed',
      candidateSha:sha,checkoutSha:sha,checkoutShaAtEnd:sha,environment:{node:process.version},
      workflow:{runId:'41',attempt:'1',ref:shardWorkflow.GITHUB_WORKFLOW_REF,event:'push',sourceRef:'refs/heads/dev'},
      inputsAtStart:{'index.html':'fixture'},inputsAtEnd:{'index.html':'fixture'},inputsChanged:false,
      inventoryTotal:SUITE.length,selectedSuites:worker.suites,executedSuites:worker.suites,
      startedAt:'2026-11-08T12:00:00Z',finishedAt:'2026-11-08T12:03:00Z',durationMs:180000,
      counts:{passed:worker.suites.length,flaky:0,failed:0,total:worker.suites.length},
      suites:worker.suites.map(name=>({name,status:'passed',attempts:[{attempt:'first',exitCode:0,signal:null,timedOut:false}]}))}}));
    const combined=mergeShards(plan,reports);
    assert.deepEqual(combined.executedSuites,SUITE);assert.equal(combined.mode,'full');assert.equal(combined.durationMs,180000);
    assert.deepEqual(combined.counts,{passed:SUITE.length,flaky:0,failed:0,total:SUITE.length});
    const imageRollout=structuredClone(reports);imageRollout[0].report.environment.runnerImageVersion='new-image';
    assert.equal(mergeShards(plan,imageRollout).counts.passed,SUITE.length,'image rollout metadata is retained; the existing Node/Chrome/Ubuntu/platform pins govern compatibility');
    for(const alter of [r=>r.pop(),r=>r.push(r[0]),r=>r[1].id=0,r=>r[0].report.status='failed',
      r=>r[0].report.counts.flaky++,r=>r[0].report.executedSuites.pop(),r=>r[0].report.checkoutSha='b'.repeat(40),
      r=>r[0].report.workflow.attempt='2',r=>r[0].report.inputsAtEnd={},r=>r[0].report.environment.node='wrong',
      r=>r[0].report.suites[0].attempts.push(r[0].report.suites[0].attempts[0]),
      r=>r[0].report.suites[0].attempts[0].timedOut=true]) {
      const bad=structuredClone(reports);alter(bad);assert.throws(()=>mergeShards(plan,bad));
    }
    const altered=structuredClone(plan);altered.workers[0].suites.pop();assert.throws(()=>mergeShards(altered,reports));
    const selected=shardPlan({...policy,mode:'selected',plan:{mode:'selected',suites:SUITE.slice(0,2)}},shardWorkflow);
    assert.equal(selected.workers.length,1);assert.equal(selected.suites.length,2);
    // Same-SHA reuse still requires the independent final gate; no merge can mask a failed worker.
    const gate={POLICY:'success',PAYLOAD:'success',MEMORY:'success',WHITESPACE:'success',FUNCTIONAL:'success',
      PERFORMANCE_REQUIRED:'false',PERFORMANCE:'skipped',SHARDED:'true',MERGE:'success'};
    assert.equal(verifyFinal(gate),true);
    for(const key of ['MERGE','FUNCTIONAL'])assert.throws(()=>verifyFinal({...gate,[key]:'skipped'}));
    assert.match(workflow,/fail-fast: false/);assert.match(workflow,/needs: \[plan, functional, performance\]/);
    assert.match(workflow,/SHARDED: 'true'/);assert.match(workflow,/MERGE: \$\{\{ steps\.merge\.outcome \}\}/);
    console.log('  ✓ balanced isolated shards preserve canonical coverage; missing, duplicate, wrong-SHA/run/environment/input, flaky and timed-out evidence is rejected');
  }

  // Exercise the real plan -> worker -> downloaded-artifact layout -> merge commands.
  {
    const project=join(fixture,'shard-project');mkdirSync(join(project,'scripts'),{recursive:true});
    for(const name of ['ci-shards','ci-execution','ci-plan','ci-final','ci-policy','release-evidence','test-all'])
      writeFileSync(join(project,'scripts',name+'.mjs'),readFileSync(join(DIR,name+'.mjs')));
    const names=['design-lint',...Array.from({length:35},(_,i)=>'fixture-'+i+'-test')];
    writeFileSync(join(project,'scripts/ci-policy.mjs'),`export const SUITE=${JSON.stringify(names)};export const EXCLUDED={};export const NON_TEST_SUITE=new Set(['design-lint']);export const GROUPS={tooling:{files:[],suites:SUITE,full:true}};export const BASE=SUITE;export const DOC_BASE=SUITE;`);
    for(const name of names)writeFileSync(join(project,'scripts',name+'.mjs'),'');
    writeFileSync(join(project,'.gitignore'),'.context/\n');
    const git=args=>execFileSync('git',args,{cwd:project,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    git(['init','--quiet']);git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','fixture']);
    const sha=git(['rev-parse','HEAD']),event=join(fixture,'shard-event.json');
    writeFileSync(event,JSON.stringify({before:sha,head_commit:{id:sha,message:'fixture\n\nCI-Validation: full'}}));
    const env={...process.env,CI_ROUTINE_SELECTION:'true',GITHUB_SHA:sha,GITHUB_EVENT_PATH:event,
      GITHUB_EVENT_NAME:'push',GITHUB_REF:'refs/heads/dev',GITHUB_RUN_ID:'99',GITHUB_RUN_ATTEMPT:'1',
      GITHUB_WORKFLOW_REF:'fixingman/TODAY/.github/workflows/test.yml@refs/heads/dev',CHROME_PATH:'/missing-fixture-browser'};
    const invoke=(name,args=[])=>spawnSync(process.execPath,['scripts/'+name+'.mjs',...args],{cwd:project,env,encoding:'utf8',timeout:10000});
    for(const [name,args]of [['ci-execution',[]],['ci-shards',['plan']]]) {
      const result=invoke(name,args);assert.equal(result.status,0,result.stdout+result.stderr);
    }
    const plan=JSON.parse(readFileSync(join(project,'.context/ci-shard-plan.json')));assert.equal(plan.workers.length,3);
    for(const worker of plan.workers) {
      const result=invoke('ci-shards',['run',String(worker.id)]);assert.equal(result.status,0,result.stdout+result.stderr);
      cpSync(join(project,'.context/ci-test-results'),join(project,'.context/ci-shards','artifact-'+worker.id),{recursive:true});
    }
    // A final runner starts without another worker's local output.
    rmSync(join(project,'.context/ci-test-results'),{recursive:true});
    const result=invoke('ci-shards',['merge']);assert.equal(result.status,0,result.stdout+result.stderr);
    const report=JSON.parse(readFileSync(join(project,'.context/ci-test-results/summary.json')));
    assert.deepEqual(report.executedSuites,names);assert.equal(report.counts.passed,36);assert.equal(report.mode,'full');
    assert.ok(existsSync(join(project,'.context/ci-test-results/shards/2/summary.json')));
    assert.equal(readdirSync(join(project,'.context/ci-test-results')).filter(name=>name.endsWith('-first.log')).length,36);
    const part=join(project,'.context/ci-shards/artifact-1/summary.json'),bad=JSON.parse(readFileSync(part));
    bad.workflow.attempt='2';writeFileSync(part,JSON.stringify(bad));assert.notEqual(invoke('ci-shards',['merge']).status,0);
    assert.notEqual(invoke('ci-shards',['run','999']).status,0);
    console.log('  ✓ actual shard CLI and artifact transport reconstruct36 first-pass logs; a wrong-attempt shard or unknown worker fails');
  }

  writeFileSync(join(scripts, 'performance-test.mjs'), readFileSync(join(DIR, 'performance-test.mjs')));
  writeFileSync(join(fixture, 'index.html'), "<script src='/fixture.js'></script><script>const CHANGELOG = {'1.0.0': 'Fixture'};</script>");
  writeFileSync(join(fixture, 'fixture.js'), 'console.log("fixture");');
  writeFileSync(join(fixture, 'sw.js'), '');
  const original = JSON.parse(readFileSync(join(DIR, 'performance-budgets.json'), 'utf8'));
  for (const key of [null, 'runtimeShellRaw', 'runtimeShellBrotli', 'eagerScripts']) {
    const budgets = structuredClone(original);
    if (key) budgets.payload[key] = 0;
    writeFileSync(join(scripts, 'performance-budgets.json'), JSON.stringify(budgets));
    const result = run('performance-test.mjs', ['--payload-only']);
    assert.equal(result.status, key ? 1 : 0, result.stdout + result.stderr);
    if (key) assert.match(result.stderr, new RegExp('payload\\.' + key));
    else assert.match(result.stdout, /payload budgets passed/);
  }
  console.log('  ✓ payload preflight enforces byte/script limits without Chrome or dependencies');
  // Authoring tools run in a fixture with no installed packages of their own.
  writeFileSync(join(scripts, 'gen-splash.mjs'), readFileSync(join(DIR, 'gen-splash.mjs')));
  const generated = run('gen-splash.mjs');
  assert.equal(generated.status, 0, generated.stdout + generated.stderr);
  const shippedDir = join(DIR, '../assets/splash'), generatedDir = join(fixture, 'assets/splash');
  const names = readdirSync(shippedDir).filter(name => name.endsWith('.png')).sort();
  assert.deepEqual(readdirSync(generatedDir).sort(), names);
  for (const name of names) {
    const expected = PNG.sync.read(readFileSync(join(shippedDir, name)));
    const actual = PNG.sync.read(readFileSync(join(generatedDir, name)));
    assert.equal(actual.width, expected.width); assert.equal(actual.height, expected.height);
    assert.deepEqual(actual.data, expected.data, name + ' preserves every pixel');
  }
  console.log('  ✓ splash authoring runs without undeclared packages; shipped dimensions/pixels preserved');

  writeFileSync(join(scripts, 'ai-test.mjs'), readFileSync(join(DIR, 'ai-test.mjs')));
  mkdirSync(join(fixture, 'netlify/functions'), { recursive: true });
  for (const longReply of [false, true]) {
    writeFileSync(join(fixture, 'netlify/functions/ai-assist.js'), `
      let calls = 0;
      exports.handler = async () => {
        const replies = [
          { content: 'pong' },
          { content: ${JSON.stringify(longReply ? Array(41).fill('word').join(' ') : 'A short fictional line.')}, message: 'Short truncated preview.' },
          { content: 'What needs your attention?' }, { hints: [] }, { content: 'A short reflection.' }
        ];
        return { statusCode: 200, body: JSON.stringify(replies[calls++]) };
      };
    `);
    const result = run('ai-test.mjs', ['--key=fictional-offline-key']);
    assert.equal(result.status, longReply ? 1 : 0, result.stdout + result.stderr);
    if (longReply) assert.match(result.stderr, /nudge: 41 words/);
  }
  console.log('  ✓ synthetic provider smoke validates full content, not a truncated message preview');
} finally { rmSync(fixture, { recursive: true, force: true }); }
