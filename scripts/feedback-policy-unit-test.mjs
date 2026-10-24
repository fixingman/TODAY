import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {createHash,randomBytes} from 'node:crypto';
const require = createRequire(import.meta.url);
const p = require('../assets/feedback-policy.js');
for(const text of ['', 'abc', 'calm — İstanbul', 'x'.repeat(55),'x'.repeat(56),'x'.repeat(64),'x'.repeat(10000),
  ...Array.from({length:100},(_,i)=>randomBytes(i*3).toString('base64'))]){
  assert.equal(p.fingerprint(text),createHash('sha256').update(text).digest('hex'),'Source digests match platform SHA-256');
}
const today = '2026-10-24', now = today+'T10:00:00.000Z';
const line = (date,text,reaction='missed',extra={}) => ({date,text,reaction,surface:'morning nudge',...extra});
const ledger = [line('2026-10-23','new miss'),line('2026-10-22','second miss'),line('2026-10-21','third miss'),
  line('2026-10-23','new success','landed',{reactionReason:'PRIVATE_CANARY'}),line('2026-10-10','boundary success','landed'),
  line('2026-10-09','old success','landed'),line(today,'today success','landed'),line('2026-10-25','future miss'),
  line('2026-02-30','invalid date'),line('2026-10-23','pool miss','missed',{kind:'return-finished'}),
  line('2026-10-23','Sunday miss','missed',{surface:'Sunday reflection'}),line('2026-10-23','unvoted',null)];
assert.deepEqual(p.taskReadingFeedback(ledger,today),{landed:['new success','boundary success'],missed:['new miss','second miss']});
assert.ok(!p.feedbackText(p.taskReadingFeedback(ledger,today)).includes('PRIVATE_CANARY'));
assert.deepEqual(p.taskReadingFeedback([],today),{landed:[],missed:[]});
assert.deepEqual(p.taskReadingFeedback(ledger,'bad'),{landed:[],missed:[]});
assert.equal(p.taskReadingFeedback([line('2026-10-23','x'.repeat(300),'landed')],today).landed[0].length,200);
assert.equal(p.taskReadingFeedback([line('2026-03-08','spring')],'2026-03-09').missed.length,1);
assert.equal(p.taskReadingFeedback([line('2026-11-01','fall')],'2026-11-02').missed.length,1);
const revised = structuredClone(ledger); revised[0].reaction=null;
assert.deepEqual(p.taskReadingFeedback(revised,today).missed,['second miss','third miss']);
const c = {kind:'feeling-vs-revive',feeling:'calm',more_context:'when you brought a task back from Past',
  less_context:'when you finished tasks without bringing one back',more_dates:['2026-10-20','2026-10-19','2026-10-18','2026-10-17'],
  less_dates:['2026-10-16','2026-10-15','2026-10-14','2026-10-13']};
const versions = Object.fromEntries([...c.more_dates,...c.less_dates].map(d=>[d,p.fingerprint('observed-'+d)]));
const r = await p.makeReading(c,versions,'A fictional sentence.','generation',now);
assert.match(r.id,/^[a-f0-9]{64}$/);
assert.equal((await p.makeReading(c,versions,r.text,'generation',today+'T11:00:00.000Z')).id,r.id);
assert.notEqual((await p.makeReading(c,versions,'Changed sentence.','generation',now)).id,r.id);
const options = {today,generation:'generation',versions};
const miss = {...r,reaction:'missed',reactedAt:today+'T10:01:00.000Z'};
const clear = {...r,reaction:null,reactedAt:today+'T10:02:00.000Z'};
assert.ok(p.suppressed(c,[miss]));
assert.ok(!p.suppressed(c,[miss,clear]));
assert.deepEqual(p.mergeRecords([miss],[clear],options),p.mergeRecords([clear],[miss],options));
assert.equal(p.mergeRecords([miss],[clear],options)[0].reaction,null);
assert.equal(p.mergeRecords([miss],[{...clear,reactedAt:miss.reactedAt}],options)[0].reaction,null);
assert.equal(p.mergeRecords([miss],[r],options)[0].reaction,'missed');
assert.deepEqual(p.mergeRecords([miss],[miss],options),[miss]);
assert.equal(p.canonicalReading(c,versions,[miss]).id,r.id);
assert.equal(p.canonicalReading(c,{...versions,'2026-10-20':'changed'},[miss]),null);
assert.equal(p.mergeRecords([miss],[],{...options,generation:'new-consent'}).length,0);
assert.equal(p.mergeRecords([miss],[],{...options,clearedAt:today+'T10:03:00.000Z'}).length,0);
assert.equal(p.mergeRecords([miss],[],{...options,versions:{...versions,'2026-10-20':'edited'}}).length,0);
const sameDay = {...c,more_dates:[...c.more_dates,'2026-10-20'],less_dates:c.less_dates};
assert.ok(p.suppressed(sameDay,[miss]),'Recounting/editing an old evening is not new support');
assert.ok(p.suppressed({...c,more_dates:[...c.more_dates,'2026-10-21']},[miss]));
assert.ok(!p.suppressed({...c,more_dates:[...c.more_dates,'2026-10-21'],less_dates:[...c.less_dates,'2026-10-22']},[miss]));
assert.ok(!p.suppressed({...c,feeling:'present'},[miss]));
// Natural source expiry strips the sentence and every per-evening source value,
// while bounded user feedback still prevents a date-only resurrection.
const later = '2026-11-12';
const retainedVersions = Object.fromEntries(Object.entries(versions).filter(([d])=>d>='2026-10-14'));
const expired = p.mergeRecords([miss],[],{...options,today:later,versions:retainedVersions});
assert.equal(expired.length,1); assert.ok(expired[0].expired);
assert.ok(!('text' in expired[0])&&!('support' in expired[0]));
assert.ok(p.suppressed(c,expired));
assert.equal(p.mergeRecords(expired,[miss],{...options,today:later,versions:retainedVersions})[0].expired,true);
assert.equal(p.mergeRecords(expired,[],{...options,today:'2026-11-24',versions:{}}).length,0);
assert.ok(!JSON.stringify(expired).includes('observed-'));
assert.equal(p.mergeRecords([{...miss,id:'bad'}],[],options).length,0);
console.log('Feedback policy: bounded same-surface examples, date boundaries, revision/clear, identity, merge convergence, new support, consent/deletion and source expiry passed.');
