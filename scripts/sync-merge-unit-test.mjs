import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
context.window.window = context.window;
context.window.Today = {
  define(name, api) { context.apiName = name; context.api = api; },
};
vm.runInNewContext(readFileSync(new URL('../assets/sync-merge.js', import.meta.url), 'utf8'), context);

assert.equal(context.apiName, 'sync-merge');
const { mergeDailyHistory, mergeSuggestionOutcomes, mergeDreamIndex, mergeDreamDismissed } = context.api;

const days = mergeDailyHistory(
  [{ date: '2026-09-01', tasksDone: 2, tasksAdded: 99, focusMins: 10 }],
  [
    { date: '2026-09-01', tasksDone: 3, tasksAdded: 4, tasksAddedFixed: true, focusMins: 5 },
    { date: '2026-09-02', tasksDone: 1, tasksAdded: 2 },
  ],
  value => Math.min(Number(value) || 0, 20),
);
assert.equal(days.length, 2);
assert.deepEqual(JSON.parse(JSON.stringify(days[0])), {
  date: '2026-09-01', tasksDone: 3, tasksAdded: 4, focusMins: 10,
  habitsKept: 0, habitsTotal: 0, tasksAddedFixed: true,
});

const outcomes = mergeSuggestionOutcomes(
  [{ id: 'a', offeredAt: '2026-09-01', appliedAt: '2026-09-02', outcome: 'applied', resultTaskIds: ['one'] }],
  [
    { id: 'a', offeredAt: '2026-09-01', helpedAt: '2026-09-03', updatedAt: '2026-09-03', resultTaskIds: ['two'] },
    { id: 'b', offeredAt: '2026-09-04', ignoredAt: '2026-09-04', outcome: 'ignored' },
  ],
);
assert.equal(outcomes[0].id, 'b');
assert.equal(outcomes[1].outcome, 'helped');
assert.deepEqual([...outcomes[1].resultTaskIds].sort(), ['one', 'two']);

console.log('  ✓ daily history max/fixed-field merge is deterministic');
console.log('  ✓ suggestion outcome merge preserves monotonic evidence');
const dreams = mergeDreamIndex(
  [{ id: 'a', recordedAt: '2026-09-20T07:00:00Z', updatedAt: '2026-09-20T08:00:00Z', images: ['door'] },
   { id: 'old', recordedAt: '2026-09-01T07:00:00Z', updatedAt: '2026-09-01T07:00:00Z' }],
  [{ id: 'a', deleted: true, recordedAt: '2026-09-20T07:00:00Z', updatedAt: '2026-09-21T08:00:00Z' },
   { id: 'b', recordedAt: '2026-09-22T07:00:00Z', updatedAt: '2026-09-22T07:00:00Z', night: '2026-08-01' },
   { id: 'a', recordedAt: '2026-09-20T07:00:00Z', updatedAt: '2026-09-19T08:00:00Z', images: ['stale'] }],
  '2026-09-10T00:00:00Z',
);
assert.deepEqual(JSON.parse(JSON.stringify(dreams.map(r => r.id))), ['a', 'b']);
assert.equal(dreams[0].deleted, true, 'newer tombstone beats the older live copy');
assert.equal(dreams[1].night, '2026-08-01', 'clear compares recordedAt, not the dream night');
console.log('  ✓ dream index merges by id, latest wins, tombstones and clear watermark honoured');

assert.deepEqual(JSON.parse(JSON.stringify(mergeDreamDismissed(
  { stai: '2026-10-05T00:00:00Z', old1: '2026-09-01T00:00:00Z' },
  { stai: '2026-10-07T00:00:00Z', gran: '2026-10-06T00:00:00Z', bad: 3 },
  '2026-09-10T00:00:00Z'))), { stai: '2026-10-07T00:00:00Z', gran: '2026-10-06T00:00:00Z' });
console.log('  ✓ dismissed dream images merge per key, later wins, cleared and malformed entries dropped');

const {poolReadingKey,poolWordingEvent,mergePoolWording}=context.api;
const at='2026-10-20T10:00:00.000Z',later='2026-10-20T10:01:00.000Z',now=Date.parse('2026-10-25T12:00:00.000Z');
const reading={surface:'Sunday reflection',date:'2026-10-20',kind:'week-shape',policy:'earned-v5',text:'You finished more than you let go or brought back from Soon.'};
const wording={policy:1,sourceId:'a'.repeat(64),sourceTag:context.api.poolReadingTag(reading),writer:'pool-sunday-v1',concern:'unclear',at};
const voted={...reading,reaction:'landed',reactedAt:later,wording};
const revised={...reading,wording:{...wording,concern:'formal',at:later}};
const cleared={...reading,wording:{...wording,concern:null,at:later}};
for(const pair of [[voted,revised],[revised,voted]])assert.equal(mergePoolWording(reading,...pair,'',now).concern,'formal');
for(const pair of [[cleared,revised],[revised,cleared]])assert.equal(mergePoolWording(reading,...pair,'',now).concern,null);
assert.equal(mergePoolWording(reading,voted,reading,'',now).concern,'unclear','an older client missing optional metadata is neutral');
const withdrawal=mergePoolWording({...reading,text:'Replacement reading'},voted,revised,'',now);
assert.equal(withdrawal.concern,null);
assert.equal(mergePoolWording(reading,{...reading,wording:withdrawal},revised,'',now).concern,null,'source withdrawal survives a stale original-wording backup');
assert.equal(poolWordingEvent(voted,later,now),null,'exact-time clear also applies to same-day source rows');
for(const extra of [{policy:2},{writer:'ordinary-v1'},{concern:'infer a problem'},{sourceId:['a'.repeat(64)]},{at:'2026-10-25T20:00:00.000Z'}])assert.equal(poolWordingEvent({...voted,wording:{...wording,...extra}},'',now),null);
for(const extra of [{surface:'focus question'},{surface:'morning nudge',kind:null},{kind:'focus-completion'},{date:'2026-02-30'},{text:'x'.repeat(201)}])assert.equal(poolReadingKey({...reading,...extra}),null);
assert.equal(poolWordingEvent({...voted,date:'2026-09-20'},'',now),null,'natural expiry strips metadata even when legacy prose is retained');
const ahead={...reading,date:'2026-10-26'};ahead.wording={...wording,sourceTag:context.api.poolReadingTag(ahead)};
assert.equal(poolWordingEvent(ahead,'',now).concern,'unclear','nearby future source dates survive sync; the writer separately withholds them');
const normalized=poolWordingEvent({...voted,wording:{...wording,privateText:'do not retain'}},'',now);
assert.equal(normalized.privateText,undefined);
assert.ok(Buffer.byteLength(JSON.stringify({wording:normalized}),'utf8')<=256);
assert.ok(120*256+64<=32768,'all existing rows plus the watermark fit the approved aggregate delta');
console.log('  ✓ pool wording merges independently, null-clear wins ties, source/expiry/clear fences hold and added metadata is bounded');

console.log('✓ SYNC MERGE UNIT TEST PASSED');
