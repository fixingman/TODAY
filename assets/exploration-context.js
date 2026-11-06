// Deliberate, bounded projection of live TODAY records. No private-store copies or broad AI export.
(function(){
'use strict';
const encoder=new TextEncoder();
const tokens=text=>new Set(String(text).toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]);
const stop=new Set(['the','and','with','this','that','have','what','when','would','could','task','tasks','today','about','into','from','your']);
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value))))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function canonical(value){return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;}
async function collect(supportIds=[]){
 if(localStorage.getItem('dropbox_token')&&!Today.use('nudge').memoryReady())return [];
 const retained=new Set(supportIds.filter(id=>typeof id==='string').slice(0,96));
 const rows=await Today.use('memory').records([...retained]);
 const tasks=manualTasks.flatMap((task,index)=>index<100||retained.has('task:'+task.id)?[{id:'task:'+task.id,text:task.text,source_type:'current task · Today',evidence_kind:'task record',basis:[],selectable:index<100&&!doneIds.has(task.id),cleared_at:appMemory?.clearedAt||''}]:[]);
 const memory=rows.flatMap((row,index)=>index<50||retained.has(row.id)?[{...row,...(index>=50?{selectable:false}:{})}]:[]);
 return Promise.all([...tasks,...memory].map(async row=>({...row,text:String(row.text).slice(0,1200),
  signature:await digest([row.id,row.signature_text||row.text,row.source_type,row.basis,row.cleared_at]),
  semantic_signature:await digest(canonical([2,row.id,row.text,row.semantic_type||row.source_type,row.semantic_basis??row.basis,row.cleared_at]))})));
}
function select(records,query,excluded=[],preferred=[]){
 const words=tokens(query),omit=new Set(excluded);for(const word of stop)words.delete(word);
 const ranked=records.filter(row=>row.selectable!==false&&!omit.has(row.id)).map((row,index)=>({row,index,score:[...tokens(row.text)].filter(word=>words.has(word)).length})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
 const picked=[];let readings=0;
 for(const id of preferred){const row=records.find(row=>row.id===id&&row.selectable!==false&&!omit.has(id));if(!row||picked.length>=8||(row.evidence_kind==='AI interpretation'&&readings>=2))continue;picked.push({row:{...row,chosen:true},score:0,index:records.indexOf(row)});if(row.evidence_kind==='AI interpretation')readings++;}
 for(const item of ranked){if(picked.some(prior=>prior.row.id===item.row.id))continue;if(picked.length>=8)break;if(item.row.evidence_kind==='AI interpretation'&&readings>=2)continue;picked.push(item);if(item.row.evidence_kind==='AI interpretation')readings++;}
 return picked.sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,8).map(item=>({...item.row,selection_reason:item.row.chosen?'chosen by you · connection is open':item.score?'shares wording with your question or latest words':'available context · connection is open'}));
}
function reference(source){return {id:source.id,signature:source.semantic_signature,version:2};}
function matches(ref,source){return !!source&&(ref.version===2?source.semantic_signature:source.signature)===ref.signature;}
function supports(refs,records){const current=new Map(records.map(row=>[row.id,row]));return refs.every(ref=>matches(ref,current.get(ref.id)));}
Today.define('exploration-context',{collect,select,supports,reference,matches});
})();
