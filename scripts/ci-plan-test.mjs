import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { SUITE, GROUPS, DOC_BASE } from './ci-policy.mjs';
import { auditPolicy, auditConsumers, trackedPaths, metadata, planChanges, collectChanges, createRepoPlan } from './ci-plan.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
assert.deepEqual(auditPolicy(trackedPaths(ROOT)), [], 'every tracked path and suite has a reviewed classification');
assert.deepEqual(auditPolicy(), []);
assert.deepEqual(auditConsumers(ROOT), [], 'every literal module consumer has reviewed suite coverage');
const change = path => ({ path });
for (const group of Object.values(GROUPS)) for (const path of group.files) {
  const plan = planChanges([change(path)]);
  for (const suite of group.suites) assert.ok(plan.suites.includes(suite), path + ': own suite ' + suite);
  assert.ok(plan.suites.length > 0); assert.equal(new Set(plan.suites).size,plan.suites.length);
  if (group.full) assert.equal(plan.mode,'full',path);
}
for (const path of ['assets/new-module.js','scripts/unregistered-test.mjs','netlify/functions/new.js']) assert.equal(planChanges([change(path)]).mode,'full',path);
for (const path of ['assets/dropbox.js','assets/util.js','assets/runtime.js','sw.js','index.html','scripts/package-lock.json','.github/workflows/test.yml']) assert.deepEqual(planChanges([change(path)]).suites,SUITE,path);
const assistant=planChanges([change('assets/suggestion-policy.js')]);
for(const suite of ['assistant-test','suggestion-outcomes-test','focus-test','dropbox-test','gmail-feedback-test','drag-test']) assert.ok(assistant.suites.includes(suite),suite);
const calendar=planChanges([change('assets/calendar-nudge-policy.js')]);
for(const suite of ['calendar-test','calendar-nudge-policy-unit-test','nudge-test','nudge-feedback-test','nudge-delivery-test','about-test','connections-test']) assert.ok(calendar.suites.includes(suite),suite);
assert.ok(calendar.suites.length < SUITE.length);
assert.ok(planChanges([change('scripts/gmail-test.mjs')]).suites.includes('gmail-feedback-test'));
assert.deepEqual(planChanges([change('docs/ci-efficiency-plan.md')]).suites,DOC_BASE);
assert.equal(planChanges([change('assets/poems.js')]).performance,true);
assert.equal(planChanges([], {fallback:['missing base']}).mode,'full');

const index=version=>`<style>body{color:white}</style>\n<script>\nconst DEV_HOURS     = '377h';\nconst CHANGELOG = {\n  '${version}': 'Safe \\'literal\\' text.',\n};\n</script>\n`;
const sw=version=>`const CACHE_VERSION  = 'today-v${version}';\nconst files = ['/'];\n`;
const before=index('2.104.0'),after=index('2.104.2');
assert.equal(metadata(after,'index.html')?.version,'2.104.2');
const metadataChanges=[{path:'index.html',before,after},{path:'sw.js',before:sw('2.104.0'),after:sw('2.104.2')}];
const sources={'index.html':after,'sw.js':sw('2.104.2')};
let plan=planChanges(metadataChanges,{sources});
assert.equal(plan.mode,'selected'); assert.equal(plan.performance,false);
assert.ok(plan.changes.every(c=>c.kind==='release-metadata'));
assert.ok(plan.suites.includes('about-test')&&plan.suites.includes('service-worker-test'));
for(const bad of [after.replace('color:white','color:red'),after.replace("'Safe \\'literal\\' text.'","window.evil()"),after+"const CHANGELOG = {\n'1.0.0': 'duplicate',\n};\n",after.replace("'Safe \\'literal\\' text.'","`template ${evil()}`")]) {
 assert.equal(planChanges([{path:'index.html',before,after:bad}],{sources:{...sources,'index.html':bad}}).mode,'full');
}
assert.equal(planChanges(metadataChanges,{sources:{...sources,'sw.js':sw('0.0.0')}}).mode,'full','version disagreement cannot use metadata exemption');
assert.equal(planChanges([{path:'sw.js',before:sw('2.104.0'),after:sw('2.104.2').replace("['/']","['/','/evil.js']")}],{sources}).mode,'full');
assert.equal(planChanges([{path:'index.html',before:null,after}],{sources}).mode,'full','new metadata files are not exempt');
for(const bad of [
 after.replace("const CHANGELOG = {", "let CHANGELOG = {"),
 after.replace("'377h'", "calculateHours()"),
 after+"const DEV_HOURS='12h';\n",
 after+"const CHANGELOG={};\n",
 after.replace("'Safe \\'literal\\' text.'", "'text' + execute()"),
 after.replace("'Safe \\'literal\\' text.'", "{text:'nested'}"),
]) assert.equal(planChanges([{path:'index.html',before,after:bad}],{sources:{...sources,'index.html':bad}}).mode,'full');
assert.equal(metadata(sw('2.104.2')+"let CACHE_VERSION='today-v2.104.2';\n",'sw.js'),null);
for(const path of ['scripts/performance-budgets.json','scripts/ci-policy.mjs','.github/workflows/test.yml']) {
 const result=planChanges([change(path)]);assert.equal(result.mode,'full');assert.equal(result.performance,true);
}
const renamed=planChanges([{path:'README.md',oldPath:'assets/gmail.js'}]);
assert.ok(renamed.suites.includes('gmail-test'),'rename cannot disguise a runtime deletion as prose');
for(const [name,group] of Object.entries(GROUPS)) for(const suite of group.suites) {
 const result=planChanges([change('scripts/'+suite+'.mjs')]);
 for(const dependent of group.dependents||[]) for(const dependentSuite of GROUPS[dependent].suites)
   assert.ok(result.suites.includes(dependentSuite),`${suite}: reviewed dependent ${dependentSuite}`);
}
console.log('  ✓ full inventory/dependencies and literal-only metadata guards');

const root=mkdtempSync(join(tmpdir(),'today-ci-plan-'));
const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(path,text)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),text);};
const commit=message=>{git('add','.');git('-c','user.name=CI fixture','-c','user.email=fixture@example.invalid','commit','--no-gpg-sign','-m',message);return git('rev-parse','HEAD');};
try {
 git('init');write('index.html',before);write('sw.js',sw('2.104.0'));write('assets/calendar.js','initial');const base=commit('base');
 write('assets/calendar.js','first commit');commit('one');write('assets/poems.js','second commit');const head=commit('two');
 const eventPath=join(root,'event.json');
 const env={GITHUB_EVENT_PATH:eventPath,GITHUB_EVENT_NAME:'push',GITHUB_SHA:head};
 writeFileSync(eventPath,JSON.stringify({before:base}));
 let changes=collectChanges(root,env);assert.equal(changes.base,base);assert.deepEqual(changes.changes.map(c=>c.path).sort(),['assets/calendar.js','assets/poems.js']);
 assert.equal(createRepoPlan(root,env).mode,'selected','complete multi-commit push is considered');
 writeFileSync(eventPath,JSON.stringify({before:'0'.repeat(40)}));assert.equal(createRepoPlan(root,env).mode,'full');
 writeFileSync(eventPath,JSON.stringify({before:base,forced:true}));assert.equal(createRepoPlan(root,env).mode,'full');
 writeFileSync(eventPath,JSON.stringify({before:'b'.repeat(40)}));assert.equal(createRepoPlan(root,env).mode,'full');
 writeFileSync(eventPath,JSON.stringify({before:base}));assert.equal(createRepoPlan(root,{...env,GITHUB_SHA:base}).mode,'full');
 writeFileSync(eventPath,JSON.stringify({pull_request:{base:{sha:base},head:{sha:head}}}));
 changes=collectChanges(root,{...env,GITHUB_EVENT_NAME:'pull_request'});assert.equal(changes.base,base);assert.equal(changes.source,'pull_request');
 assert.equal(createRepoPlan(root,{...env,GITHUB_EVENT_NAME:'workflow_dispatch'}).mode,'full');
 rmSync(eventPath);
 write('assets/calendar.js','staged');git('add','assets/calendar.js');write('assets/calendar.js','unstaged too');write('assets/unknown-new.js','untracked');write('.context/generated.json','artifact');
 changes=collectChanges(root,{});assert.ok(changes.changes.some(c=>c.path==='assets/calendar.js'));assert.ok(changes.changes.some(c=>c.path==='assets/unknown-new.js'));assert.ok(!changes.changes.some(c=>c.path.startsWith('.context/')));
 assert.equal(createRepoPlan(root,{}).mode,'full','unknown untracked sources broaden local checks');
 rmSync(join(root,'assets/unknown-new.js'));git('reset','--hard','HEAD');
 // Net HEAD/worktree equality must not hide an intermediate staged runtime edit.
 write('assets/calendar.js','staged runtime');git('add','assets/calendar.js');write('assets/calendar.js','first commit');
 changes=collectChanges(root,{});assert.equal(changes.changes.filter(c=>c.path==='assets/calendar.js').length,2);
 assert.ok(createRepoPlan(root,{}).suites.includes('calendar-test'));
 git('reset','--hard','HEAD');
 // Literal-only release metadata may be staged, unstaged, or split between them.
 write('index.html',after);git('add','index.html');write('sw.js',sw('2.104.2'));
 plan=createRepoPlan(root,{});assert.equal(plan.mode,'selected');assert.ok(plan.changes.every(c=>c.kind==='release-metadata'));
 git('reset','--hard','HEAD');

 git('mv','assets/calendar.js','assets/nudge.js');changes=collectChanges(root,{});
 assert.ok(changes.changes.some(c=>c.oldPath==='assets/calendar.js'&&c.path==='assets/nudge.js'));
 plan=createRepoPlan(root,{});assert.ok(plan.groups.includes('calendar')&&plan.groups.includes('nudge'));
 git('reset','--hard','HEAD');git('rm','assets/calendar.js');assert.ok(createRepoPlan(root,{}).groups.includes('calendar'));
 assert.equal(createRepoPlan(root,{},'missing-ref').mode,'full');
 // Divergent history: a PR diff starts at the merge base, not the base tip.
 git('reset','--hard',base);git('checkout','-b','feature');write('assets/calendar.js','feature');const feature=commit('feature');
 git('checkout','-b','base-advanced',base);write('assets/about.js','base-only');const advanced=commit('base advanced');
 git('-c','user.name=CI fixture','-c','user.email=fixture@example.invalid','merge','--no-gpg-sign','--no-edit','feature');const merged=git('rev-parse','HEAD');
 writeFileSync(eventPath,JSON.stringify({pull_request:{base:{sha:advanced},head:{sha:feature}}}));
 changes=collectChanges(root,{...env,GITHUB_SHA:merged,GITHUB_EVENT_NAME:'pull_request'});
 assert.equal(changes.base,base);assert.ok(changes.changes.some(c=>c.path==='assets/calendar.js'));
 console.log('  ✓ real Git ranges: multi-commit/PR merge base, missing/forced bases, rename/delete, staged/unstaged/untracked');
} finally {rmSync(root,{recursive:true,force:true});}
console.log('✓ CI PLAN TEST PASSED');
