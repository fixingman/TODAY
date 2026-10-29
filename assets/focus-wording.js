// Explicit same-owner wording concerns; earlier answers never enter persistence.
(function(){
'use strict';
function create(panel,hooks){
  const store=Today.use('focus-wording-store'),fp=Today.use('feedback-policy');
  let shown=null,stamp='';
  const hash=value=>fp.fingerprint(JSON.stringify(value));
  const owner=request=>hash([request.habit,request.id]);
  const source=request=>hash([request.habit,request.id,request.source]);
  function row(request){return store.read().rows.find(r=>r.owner===owner(request)&&r.source===source(request)&&r.writer===(request.habit?'focus-habit-v1':'focus-task-v1'))||null;}
  function frame(request){const data=store.read();return JSON.stringify([owner(request),source(request),data.clearedAt,row(request)]);}
  function prepare(request){
    request.wordingFrame=frame(request);const concern=row(request)?.concern;
    if(concern==='unclear')return '\nOptional wording guidance, not task evidence: use direct sentences and explicit references. Preserve unknowns and the named choices; add no fact or advice beyond its supported help.';
    if(concern==='formal')return '\nOptional wording guidance, not task evidence: use natural everyday wording instead of report-like phrasing. Preserve the named choices and uncertainty; add no fact or advice beyond its supported help.';
    return '';
  }
  function live(){return shown&&hooks.current(shown.request)&&store.supports(shown.request)&&!panel.hidden&&panel.isConnected&&panel.dataset.wordingReading===shown.reading;}
  function paint(){
    if(!shown)return;
    const current=row(shown.request),active=current?.reading===shown.reading?current.concern:null;
    const next=JSON.stringify([active,store.read().rows.some(r=>r.concern)]);if(stamp===next)return;stamp=next;
    panel.querySelectorAll('[data-focus-concern]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.focusConcern===active)));
    const clear=panel.querySelector('[data-today-click="focus-wording.clear"]');if(clear)clear.hidden=!store.read().rows.some(r=>r.concern);
  }
  function close(){const details=panel.querySelector('.focus-wording-details'),toggle=panel.querySelector('[data-today-click="focus-wording.toggle"]');if(details)details.hidden=true;toggle?.setAttribute('aria-expanded','false');}
  function offered(request,text){
    request.delivered=true;shown={request,reading:hash([owner(request),source(request),text,crypto.randomUUID()])};stamp='';panel.dataset.wordingReading=shown.reading;
    const toggle=document.createElement('button');toggle.type='button';toggle.className='focus-ask-reaction focus-wording-toggle';toggle.textContent='wording';toggle.dataset.todayClick='focus-wording.toggle';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','focusWordingDetails');toggle.setAttribute('aria-label','Optional wording feedback on this answer');
    panel.querySelector('.focus-ask-feedback-actions').insertBefore(toggle,panel.querySelector('[data-today-click="focus-ask.clear"]'));
    const details=document.createElement('div');details.className='focus-wording-details';details.id='focusWordingDetails';details.hidden=true;details.dataset.todayKeydown='focus-wording.escape';
    const help=document.createElement('p');help.id='focusWordingHelp';help.className='focus-wording-help';help.textContent='Optional. Guides later Ask replies for this unchanged '+(request.habit?'habit':'task')+' on this device for 7 days. Earlier answers stay private.';
    const group=document.createElement('div');group.className='focus-wording-choices';group.setAttribute('role','group');group.setAttribute('aria-label','Wording feedback');group.setAttribute('aria-describedby',help.id);
    for(const [value,label] of Object.entries(fp.wordingLabels)){const b=document.createElement('button');b.type='button';b.className='focus-ask-reaction';b.textContent=label;b.dataset.todayClick='focus-wording.concern';b.dataset.focusConcern=value;b.setAttribute('aria-label',label+' — wording feedback');group.append(b);}
    const clear=document.createElement('button');clear.type='button';clear.className='focus-ask-reaction';clear.textContent='clear all wording';clear.dataset.todayClick='focus-wording.clear';group.append(clear);details.append(help,group);panel.append(details);paint();
  }
  function act(event,button,work){event.stopPropagation();if(!live()||!panel.contains(button))return;try{const focused=document.activeElement===button;work();paint();if(focused&&button.hidden)panel.querySelector('[data-today-click="focus-wording.toggle"]')?.focus();window._focusExpandTimer();}catch(_){window._a11yAnnounce?.('Could not save wording feedback.');}}
  Today.ui.register('click','focus-wording.toggle',(e,b)=>act(e,b,()=>{const d=panel.querySelector('.focus-wording-details');d.hidden=!d.hidden;b.setAttribute('aria-expanded',String(!d.hidden));}));
  Today.ui.register('click','focus-wording.concern',(e,b)=>act(e,b,()=>{
    if(b.closest('[hidden]')||!Object.hasOwn(fp.wordingLabels,b.dataset.focusConcern))return;
    const request=shown.request,data=store.read(),prior=row(request);
    const concern=prior?.reading===shown.reading&&prior.concern===b.dataset.focusConcern?null:b.dataset.focusConcern;
    const now=Math.max(Date.now(),Date.parse(data.clearedAt)||0,(Date.parse(prior?.at)||0)+1)+1;
    const next={owner:owner(request),source:source(request),reading:shown.reading,ownerTag:store.tag(JSON.stringify([request.habit,request.id])),sourceTag:store.tag(JSON.stringify([request.habit,request.id,request.source])),writer:request.habit?'focus-habit-v1':'focus-task-v1',concern,at:new Date(now).toISOString(),expiresAt:new Date(now+7*86400000).toISOString()};
    data.rows=[next,...data.rows.filter(r=>r.owner!==next.owner)].slice(0,20);store.write(data);
    window._a11yAnnounce?.(concern?'Wording feedback saved for later Ask replies on this '+(request.habit?'habit.':'task.'):'Wording choice cleared.');
  }));
  Today.ui.register('click','focus-wording.clear',(e,b)=>act(e,b,()=>{if(b.hidden)return;store.clear();window._a11yAnnounce?.('All Focus wording feedback cleared.');}));
  Today.ui.register('keydown','focus-wording.escape',(e)=>{if(e.key!=='Escape'||!live())return;e.preventDefault();e.stopPropagation();close();panel.querySelector('[data-today-click="focus-wording.toggle"]').focus();window._focusExpandTimer();});
  document.addEventListener('today:focus-wording-change',paint);window.addEventListener('storage',paint);
  return{prepare,offered,close,current:request=>!request.wordingFrame||request.wordingFrame===frame(request)};
}
Today.define('focus-wording-ui',{create});
})();
