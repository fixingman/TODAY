// Opt-in, bounded fictional comparison through the actual enrichment handler.
// Dry run checks transport only; --live requires an explicitly supplied workspace key.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{handler}=require('../netlify/functions/task-enrich.js');
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const live=process.argv.includes('--live');
const key=process.env.ANTHROPIC_API_KEY;
if(live&&!key)throw new Error('Set ANTHROPIC_API_KEY through an approved development credential path; no app/keychain access is used.');
const cases=[
 {id:'hours-clear',concern:'hard_to_follow',task:'Find North Quay Workshop walk-in opening hours',source:'North Quay Workshop — walk-in desk: Tuesday–Friday, 10:00–18:00. Saturday is by appointment only; closed Mondays.',facts:['10:00','18:00']},
 {id:'phone-clear',concern:'hard_to_follow',task:'Find the booking phone for Red Orchard Studio',source:'Red Orchard Studio — booking phone: +44 20 7946 0123. Deliveries only: +44 20 7946 0199. Booking calls: Monday–Friday, 09:00–17:00.',facts:['+44 20 7946 0123']},
 {id:'price-natural',concern:'too_formal',task:'Find the collection price for one litre of Harbor Paint',source:'Harbor Paint — 1 litre: £18. Collection only; no delivery.',facts:['18']},
 {id:'booking-natural',concern:'too_formal',task:'Find Cedar Room booking arrangements for Saturday',source:'Cedar Room — Saturday bookings: reserve before Friday 16:00. Deposit £10 per person.',facts:['16:00','10']},
];
const nativeFetch=global.fetch,oldKey=process.env.ANTHROPIC_API_KEY;
const deadline=Date.now()+180000;let calls=0;const results=[];
try{
 delete process.env.ANTHROPIC_API_KEY; // Handler uses only this explicitly supplied test request key.
 for(const fixture of cases)for(const guided of [false,true]){
  if(Date.now()>=deadline)throw new Error('Three-minute comparison budget exhausted');
  const href='https://trello.com/c/fictional'+fixture.id.replace(/-/g,'')+'/source';let providerTurns=0;
  global.fetch=async(url,options)=>{
   if(String(url).startsWith('https://api.trello.com/'))return {ok:true,json:async()=>({cards:[{name:fixture.source,shortUrl:href}]})};
   assert.equal(String(url),'https://api.anthropic.com/v1/messages');
   const body=JSON.parse(options.body);assert.equal(body.model,'claude-haiku-4-5-20251001');
   providerTurns++;
   if(providerTurns===1)return {ok:true,json:async()=>({stop_reason:'tool_use',content:[{type:'tool_use',id:'fixture-source',name:'search_trello',input:{query:fixture.task}}]})};
   assert.ok(providerTurns<=3,'existing handler turn budget');
   assert.ok(calls<16&&Date.now()<deadline,'fixed comparison budget');calls++;
   if(!live)return {ok:true,json:async()=>({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({headline:fixture.id,body:fixture.source.slice(0,80),cta:{label:'Open',href}})}]})};
   return nativeFetch(url,{...options,signal:AbortSignal.timeout(Math.min(24000,Math.max(1,deadline-Date.now())))});
  };
  const response=await handler({httpMethod:'POST',body:JSON.stringify({taskText:fixture.task,apiKey:live?key:'fictional-key',trelloToken:'fictional-token',trelloBoardId:'fictionalboard',...(guided?{wordingConcerns:[fixture.concern]}:{})})});
  const parsed=JSON.parse(response.body);
  results.push({case:fixture.id,arm:guided?'concern':'original',concern:guided?fixture.concern:null,source:fixture.source,task:fixture.task,allowedHref:href,status:response.statusCode,card:parsed.card??null,
   mechanical:{sourceLink:parsed.card?.cta?.href===href,factsPresent:fixture.facts.every(f=>JSON.stringify(parsed.card||{}).includes(f))}});
 }
}finally{global.fetch=nativeFetch;if(oldKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=oldKey;}
const dir=join(root,'.context/15e-adaptation');await mkdir(dir,{recursive:true});
const file=join(dir,live?'writing-comparison.json':'writing-dry-run.json');
await writeFile(file,JSON.stringify({mode:live?'live-fictional-writing-only':'dry-run-transport-only',maxProviderRequests:16,maxMilliseconds:180000,providerRequests:calls,results},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({mode:live?'live-fictional-writing-only':'dry-run-transport-only',cases:cases.length,outputs:results.length,providerRequests:calls,path:file}));
console.log('Source retrieval is controlled in this writing-only comparison; relevance and real-use usefulness remain separate. Retain originals, blind arm labels for prose review, check unsupported changes and acceptable controls. Mechanical checks do not certify writing quality.');
