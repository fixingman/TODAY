// Explicit wording choices for the two pool writers; prior prose stays private.
(function(){
'use strict';
function create(hooks){
  const sm=Today.use('sync-merge'),fp=Today.use('feedback-policy');
  const panels=new Map();let sequence=0,undo=null;
  const memory=hooks.memory,today=hooks.today;
  const announce=text=>window._a11yAnnounce?.(text);
  const day=date=>Date.parse(date+'T00:00:00Z');
  const source=row=>sm.poolReadingKey(row);
  const hash=row=>fp.fingerprint(source(row));
  const clear=()=>[memory().clearedAt,memory().poolWordingClearedAt].filter(at=>sm.poolWordingTime(at)).sort().at(-1)||'';
  const rows=()=>Array.isArray(memory().spokenLines)?memory().spokenLines.slice(-120):[];
  function current(row){const age=(day(today())-day(row?.date))/86400000;return !!source(row)&&age>=0&&age<30;}
  function event(row){const w=current(row)&&sm.poolWordingEvent(row,clear());return w&&w.sourceId===hash(row)?w:null;}
  function signature(){return JSON.stringify([today(),memory().clearedAt,memory().poolWordingClearedAt,rows().filter(r=>r.wording).map(r=>[source(r),r.wording]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]);}
  function guidance(surface){
    const supported=rows().filter(r=>r.surface===surface).map(event).filter(Boolean);
    const instructions=[];
    if(supported.some(w=>w.concern==='unclear'))instructions.push('Use direct sentences and explicit references so the supplied relationship is immediately understandable. Preserve what is known and unknown.');
    if(supported.some(w=>w.concern==='formal'))instructions.push('Use natural, everyday wording rather than report-like phrasing. Preserve the selected insight and the app’s voice.');
    return instructions.length?'\n\nOptional wording guidance, not additional evidence: '+instructions.join(' ')+' Keep the selected relationship, comparison and literal app actions. Add no fact, advice or cause.':'';
  }
  function lineFor(key){return rows().find(row=>source(row)===key)||null;}
  function live(button){
    if(!button?.isConnected||button.closest('[hidden]'))return null;
    const info=button.closest('#infoPanel'),strip=button.closest('#dayNudgeReact');
    if(info&&!info.classList.contains('open')||strip&&!strip.classList.contains('open'))return null;
    const row=lineFor(button.dataset.poolSource);
    return row?.date===today()&&current(row)?row:null;
  }
  function at(row){return new Date(Math.max(Date.now(),sm.poolWordingTime(row?.wording?.at)+1,sm.poolWordingTime(clear())+1)).toISOString();}
  function record(row,concern){return{policy:1,sourceId:hash(row),sourceTag:sm.poolReadingTag(row),writer:sm.poolWriters[row.surface],concern,at:at(row)};}
  function changed(){document.dispatchEvent(new Event('today:pool-wording-change'));}
  function save(lines){
    const before=memory().spokenLines;memory().spokenLines=lines;
    try{hooks.save();}catch(error){memory().spokenLines=before;throw error;}
  }
  function apply(key,concern){
    const row=lineFor(key);if(!row||!current(row))return false;
    const next=record(row,concern);
    save(rows().map(item=>item===row?{...item,wording:next}:item));return true;
  }
  function remember(key,saved){undo={key,rows:saved,clear:memory().clearedAt,signature:signature()};}
  function eligibleUndo(key){return undo&&undo.key===key&&undo.clear===memory().clearedAt&&undo.signature===signature();}
  function button(parent,text,action,key,label){
    const b=document.createElement('button');b.type='button';b.className='pool-wording-btn';b.textContent=text;b.dataset.todayClick=action;b.dataset.poolSource=key;
    if(label)b.setAttribute('aria-label',label);parent.append(b);return b;
  }
  function paint(state){
    const row=live(state.toggle);if(!row)return;
    const active=document.activeElement,action=state.panel.contains(active)&&active.dataset.todayClick,concern=active?.dataset.concern;
    const w=event(row),stamp=JSON.stringify([w,!!eligibleUndo(state.key),rows().some(r=>event(r)?.concern)]);
    if(state.stamp===stamp)return;state.stamp=stamp;
    state.choices.replaceChildren();
    for(const [value,label]of Object.entries(fp.wordingLabels)){
      const b=button(state.choices,label,'pool-wording.concern',state.key,label+' — wording feedback');b.dataset.concern=value;
      b.setAttribute('aria-pressed',String(w?.concern===value));
    }
    const u=button(state.choices,'undo','pool-wording.undo',state.key,'Undo wording feedback');u.hidden=!eligibleUndo(state.key);
    const c=button(state.choices,'clear all','pool-wording.clear',state.key,'Clear all morning and Sunday wording feedback');c.hidden=!rows().some(r=>event(r)?.concern);
    if(action&&!active.isConnected){const replacement=[...state.choices.querySelectorAll('button')].find(b=>b.dataset.todayClick===action&&!b.hidden&&(!concern||b.dataset.concern===concern));(replacement||state.toggle).focus({preventScroll:true});}
  }
  function close(state,focus=false){state.toggle.setAttribute('aria-expanded','false');state.panel.hidden=true;if(focus)state.toggle.focus({preventScroll:true});}
  function refresh(){
    if(undo&&undo.signature!==signature())undo=null;
    for(const [toggle,state]of panels){
      if(!live(toggle)){toggle.setAttribute('aria-expanded','false');toggle.removeAttribute('aria-controls');state.panel.remove();panels.delete(toggle);undo=null;continue;}
      if(!toggle.closest('.nudge-react')?.classList.contains('open')&&!toggle.closest('.nudge-react')?.contains(document.activeElement))close(state);
      paint(state);
    }
  }
  function open(toggle){
    const row=live(toggle);if(!row)return;
    let state=panels.get(toggle);
    if(!state){
      const key=toggle.dataset.poolSource,panel=document.createElement('div');panel.className='pool-wording-panel';panel.id='poolWording'+(++sequence);panel.hidden=true;
      panel.dataset.todayKeydown='pool-wording.escape';panel.dataset.poolSource=key;
      const explanation=document.createElement('div');explanation.className='pool-wording-help';explanation.id=panel.id+'Help';
      explanation.textContent='Optional. Guides later '+(row.surface==='Sunday reflection'?'Sunday observations':'morning observations')+' for up to 30 days. Saved with your feedback; earlier sentences stay private.';
      const choices=document.createElement('div');choices.className='pool-wording-choices';choices.setAttribute('role','group');choices.setAttribute('aria-label','Wording feedback on this reading');choices.setAttribute('aria-describedby',explanation.id);
      panel.append(explanation,choices);
      const group=toggle.closest('.nudge-react'),reason=group.nextElementSibling;
      (reason?.classList.contains('nudge-reason')?reason:group).after(panel);
      toggle.setAttribute('aria-controls',panel.id);state={toggle,panel,choices,key};panels.set(toggle,state);
    }
    const opening=state.panel.hidden;state.panel.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));paint(state);
  }
  function retain(block,text){
    const state=[...panels.values()].find(s=>block.contains(s.toggle)&&live(s.toggle));
    if(!state||block.querySelector('.week-summary')?.textContent!==text)return false;
    const row=lineFor(state.key),stamp=JSON.stringify([row.reaction,row.reactedAt]);
    block.querySelectorAll('.nudge-react-btn[data-react]').forEach(b=>{const on=b.dataset.react===row.reaction;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
    if(state.reactionStamp!==undefined&&state.reactionStamp!==stamp){const reason=block.querySelector('.nudge-reason');if(reason)reason.hidden=row.reaction!=='missed';}
    state.reactionStamp=stamp;
    block.querySelectorAll('.nudge-reason-btn').forEach(b=>{const on=b.dataset.reason===row.reactionReason;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
    paint(state);return true;
  }
  function stop(event){event.preventDefault();event.stopPropagation();}
  function act(event,b,work){stop(event);const row=live(b);if(!row)return;try{work(row);}catch(_){announce('Could not save wording feedback.');}}
  Today.ui.register('click','pool-wording.concern',(e,b)=>act(e,b,row=>{
    if(!Object.hasOwn(fp.wordingLabels,b.dataset.concern))return;
    const prior=event(row),choice=prior?.concern===b.dataset.concern?null:b.dataset.concern;
    if(!apply(b.dataset.poolSource,choice))return;
    remember(b.dataset.poolSource,[{key:b.dataset.poolSource,wording:prior}]);changed();announce(choice?'Wording feedback saved for a later reading.':'Wording choice cleared.');
  }));
  Today.ui.register('click','pool-wording.clear',(e,b)=>act(e,b,()=>{
    const saved=rows().filter(r=>event(r)?.concern).map(r=>({key:source(r),wording:event(r)}));
    Today.use('pool-wording').clear();remember(b.dataset.poolSource,saved);changed();announce('All morning and Sunday wording feedback cleared.');
  }));
  Today.ui.register('click','pool-wording.undo',(e,b)=>act(e,b,()=>{
    if(!eligibleUndo(b.dataset.poolSource))return;const saved=undo;undo=null;
    const restored=rows().map(row=>{const prior=saved.rows.find(r=>r.key===source(row));return prior&&current(row)?{...row,wording:record(row,prior.wording?.concern||null)}:row;});
    save(restored);changed();announce('Wording feedback restored where its reading is still current.');
  }));
  Today.ui.register('keydown','pool-wording.escape',(e,panel)=>{if(e.key!=='Escape')return;stop(e);const state=[...panels.values()].find(s=>s.panel===panel);if(state)close(state,true);});
  document.addEventListener('today:pool-wording-change',refresh);
  document.addEventListener('today:spoken-reaction-change',refresh);
  window.addEventListener('storage',refresh);
  new MutationObserver(refresh).observe(document.getElementById('main-app'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  return{open,guidance,retain};
}
Today.define('pool-wording-ui',{create});
})();
