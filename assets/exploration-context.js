// Deliberate, bounded projection of live TODAY records. No private-store copies or broad AI export.
(function(){
'use strict';
const encoder=new TextEncoder();
const tokens=text=>new Set(String(text).toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]);
const stop=new Set(['the','and','with','this','that','have','what','when','would','could','task','tasks','today','about','into','from','your']);
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value))))].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function collect(){
 if(localStorage.getItem('dropbox_token')&&!Today.use('nudge').memoryReady())return [];
 const rows=await Today.use('memory').records();
 const tasks=manualTasks.slice(0,100).map((task,index)=>({id:'task:'+task.id,text:task.text,source_type:'current task · Today',evidence_kind:'task record',basis:[],selectable:!doneIds.has(task.id),cleared_at:appMemory?.clearedAt||''}));
 return Promise.all([...tasks,...rows.slice(0,50)].map(async row=>({...row,text:String(row.text).slice(0,1200),signature:await digest([row.id,row.signature_text||row.text,row.source_type,row.basis,row.cleared_at])})));
}
function select(records,query,excluded=[],preferred=[]){
 const words=tokens(query),omit=new Set(excluded);for(const word of stop)words.delete(word);
 const ranked=records.filter(row=>row.selectable!==false&&!omit.has(row.id)).map((row,index)=>({row,index,score:[...tokens(row.text)].filter(word=>words.has(word)).length})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.index-b.index);
 const picked=[];let readings=0;
 for(const id of preferred){const row=records.find(row=>row.id===id&&row.selectable!==false&&!omit.has(id));if(!row||picked.length>=8||(row.evidence_kind==='AI interpretation'&&readings>=2))continue;picked.push({row:{...row,chosen:true},score:0,index:records.indexOf(row)});if(row.evidence_kind==='AI interpretation')readings++;}
 for(const item of ranked){if(picked.some(prior=>prior.row.id===item.row.id))continue;if(picked.length>=8)break;if(item.row.evidence_kind==='AI interpretation'&&readings>=2)continue;picked.push(item);if(item.row.evidence_kind==='AI interpretation')readings++;}
 return picked.sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,8).map(item=>({...item.row,selection_reason:item.row.chosen?'chosen by you · connection is open':item.score?'shares wording with your question or latest words':'available context · connection is open'}));
}
function supports(refs,records){const current=new Map(records.map(row=>[row.id,row.signature]));return refs.every(ref=>current.get(ref.id)===ref.signature);}
Today.define('exploration-context',{collect,select,supports});
})();
