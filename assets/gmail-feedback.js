// Gmail-only feedback and explicit draft controls; lazy, source-bound and local.
(function(){
'use strict';
function create(hooks){
const _buildQueryFallback=hooks.query, _isBookingTask=hooks.booking, _viewCurrent=hooks.current;
const CONCERNS=['hard_to_follow','too_formal'];
const WORDING_SCOPE='device';
const PREFIX='gmail_enrichment_';
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const eventAt=f=>Math.max(f?.context?.at||0,f?.wording?.at||0);
const record=entry=>hooks.record(entry);
const block=()=>document.getElementById('focusGmailBlock');
const announce=text=>window._a11yAnnounce?.(text);
const stop=event=>{event.preventDefault();event.stopImmediatePropagation();};
function adopt(id,entry){
  const view=hooks.view();
  if(view?.id===id&&view.identity===hooks.identity(entry,id))view.cache=localStorage.getItem(PREFIX+id);
}
function write(id,entry,feedback,notify=true){
  const live=hooks.get(id);
  if(!live||JSON.stringify(live)!==JSON.stringify(entry))return false;
  const next={...live};if(feedback?.context||feedback?.wording)next.feedback=feedback;else delete next.feedback;
  const normalized=hooks.record(next);if(normalized)next.feedback=normalized;else delete next.feedback;
  try{
    const encoded=JSON.stringify(next);localStorage.setItem(PREFIX+id,encoded);
    if(localStorage.getItem(PREFIX+id)!==encoded)return false;
    adopt(id,next);if(notify)hooks.changed();return true;
  }catch(_){return false;}
}
function rows(){return hooks.entries().map(row=>({...row,feedback:record(row.entry)}));}
function trim(){
  let bytes=0;
  rows().sort((a,b)=>eventAt(b.feedback)-eventAt(a.feedback)||a.id.localeCompare(b.id)).forEach((row,index)=>{
    let feedback=row.feedback;
    if(feedback){bytes+=new TextEncoder().encode(row.id+JSON.stringify(feedback)).length;if(index>=20||bytes>16384)feedback=null;}
    if(JSON.stringify(row.entry.feedback||null)!==JSON.stringify(feedback))write(row.id,row.entry,feedback,false);
  });
}
function stamp(){return JSON.stringify(rows().filter(r=>r.feedback?.wording).map(r=>[r.id,hooks.identity(r.entry,r.id),r.feedback]).sort((a,b)=>a[0].localeCompare(b[0])));}
async function prepare(id){
  trim();
  for(const row of rows())if(row.feedback?.wording){
    const expected=await digest(hooks.identity(row.entry,row.id));
    if(expected!==row.feedback.wording.sourceId){const next={...row.feedback};delete next.wording;write(row.id,row.entry,next,false);}
  }
  trim();const current=rows().filter(r=>r.feedback?.wording&&(r.id===id||(WORDING_SCOPE==='device'&&r.feedback.wording.scope==='device')));
  return {stamp:stamp(),concerns:CONCERNS.filter(c=>current.some(r=>r.feedback.wording.concern===c))};
}
function fresh(entry){return record(entry)||{policy:1,expiresAt:entry.fetchedAt+86400000};}
function active(button){
  const view=hooks.view(),entry=view&&hooks.get(view.id);
  return view&&hooks.current(view)&&entry&&hooks.identity(entry,view.id)===view.identity&&block()?.contains(button)
    &&!button.closest('[hidden]')&&button.dataset.context===view.identity?{view,entry}:null;
}
function activeDraft(button){const value=active(button);return value&&value.view.accepted&&button.dataset.draft===value.view.accepted.id?value:null;}
function button(parent,text,action,label){
  const b=document.createElement('button');b.type='button';b.className='focus-ask-reaction';b.textContent=text;
  b.dataset.todayClick=action;b.dataset.context=hooks.view().identity;if(label)b.setAttribute('aria-label',label);
  parent.append(b);return b;
}
function focus(action,concern){
  const buttons=[...block().querySelectorAll('button')];
  (buttons.find(b=>b.dataset.todayClick===action&&!b.closest('[hidden]')&&(!concern||b.dataset.concern===concern))
    ||buttons.find(b=>b.dataset.todayClick==='gmail.wording'&&!b.closest('[hidden]')))?.focus({preventScroll:true});
}
function shortcut(canDraft){
  const timer=document.querySelector('.focus-timer'),ask=document.querySelector('.focus-ai-timer-btn');
  if(ask&&!timer?.classList.contains('ai-active')){
    ask.textContent=canDraft?'✦︎ draft reply':'✦︎ ask';
    ask.setAttribute('aria-label',canDraft?'Draft reply using this email context':'Ask for focus help');
    if(!canDraft)Today.use('task-enrich').refreshShortcut();
  }
}
function controls(entry,view){
  if(!hooks.current(view))return;
  const el=block(),f=record(entry),hidden=!!f?.context?.hidden;
  const context=el.querySelector('.focus-gmail-context');if(!context)return;
  const state=JSON.stringify([f,view.accepted?.id,view.contextUndo,!!view.wordingUndo,view.wordingOpen,
    view.pendingContext,view.contextRetryUsed,view.pendingDraft,view.draftRetryUsed,rows().some(r=>r.feedback?.wording)]);
  if(view.controlsStamp===state)return;view.controlsStamp=state;
  context.hidden=hidden;el.querySelector('.focus-gmail-open').hidden=hidden;
  const main=el.querySelector('.focus-gmail-draft-btn');if(main)main.hidden=hidden;
  el.querySelector('.focus-gmail-draft').hidden=hidden||!view.accepted;
  const actions=el.querySelector('.gmail-context-feedback');actions.replaceChildren();
  const contextButton=button(actions,hidden?(view.contextUndo?'undo':'show email'):'not this thread','gmail.context',hidden?'Restore this email context for this task':'Not this thread for this task');
  contextButton.dataset.mode=hidden?'restore':'reject';
  if(hidden){const retry=button(actions,view.pendingContext?'looking…':'try other email','gmail.context-retry','Try another email for this task');retry.disabled=!!view.contextRetryUsed;}
  const footer=el.querySelector('.gmail-draft-feedback');footer.replaceChildren();footer.hidden=hidden||!view.accepted;
  if(view.accepted){
    const toggle=button(footer,'wording','gmail.wording','Wording feedback on this draft');toggle.dataset.draft=view.accepted.id;
    toggle.setAttribute('aria-expanded',String(!!view.wordingOpen));toggle.setAttribute('aria-controls','gmailWording');
    const retry=button(footer,view.pendingDraft?'drafting…':'try another draft','gmail.draft-retry','Request another draft');retry.dataset.draft=view.accepted.id;retry.disabled=!!view.draftRetryUsed;
    const panel=document.createElement('div');panel.id='gmailWording';panel.className='gmail-wording-panel';panel.hidden=!view.wordingOpen;footer.append(panel);
    const explanation=document.createElement('div');explanation.className='focus-gmail-meta';
    explanation.textContent=WORDING_SCOPE==='device'?'Optional. Guides later Gmail drafts on this device for up to a day. Earlier emails and drafts stay private.':'Optional. Guides later drafts for this task on this device for up to a day. Earlier drafts stay private.';panel.append(explanation);
    const choices=document.createElement('div');choices.className='focus-gmail-actions focus-ask-feedback-actions';choices.setAttribute('role','group');choices.setAttribute('aria-label','Wording feedback on this draft');panel.append(choices);
    for(const concern of CONCERNS){const b=button(choices,concern==='hard_to_follow'?'hard to follow':'too formal','gmail.concern');b.dataset.concern=concern;b.dataset.draft=view.accepted.id;
      const selected=f?.wording?.draftId===view.accepted.id&&f.wording.concern===concern;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('on',selected);}
    const undo=button(choices,'undo','gmail.wording-undo','Undo Gmail wording feedback');undo.dataset.draft=view.accepted.id;undo.hidden=!view.wordingUndo;
    const clear=button(choices,'clear all','gmail.wording-clear','Clear all Gmail wording feedback on this device');clear.dataset.draft=view.accepted.id;clear.hidden=!rows().some(r=>r.feedback?.wording);
  }
  shortcut(!hidden&&!hooks.booking(view.text));window._focusExpandTimer?.();
}
function reconcile(entry,view){
  const active=document.activeElement,action=block()?.contains(active)&&active.dataset.todayClick,concern=active?.dataset.concern;
  controls(entry,view);
  if(!hooks.current(view))return;
  if(action&&!active.isConnected)focus(action,concern);
  hooks.indicator(view.id,false);
}
function cleared(){const view=hooks.view();if(view){view.wordingUndo=null;view.contextUndo=null;} }
function failSave(){announce('Could not save feedback on this device.');}

    function _isDesktopMac() {
      return /Mac/.test(navigator.platform) && !(navigator.maxTouchPoints > 1);
    }
    // Encode message IDs safely inside message:// angle brackets.
    function _appleMailHref(messageId) {
      return 'message://%3C' + encodeURIComponent(messageId) + '%3E';
    }

    function _doRenderBlock(block, taskText, enrichment) {
      const view = hooks.view(); view.expires = enrichment.fetchedAt + 86400000;
      const booking  = _isBookingTask(taskText || enrichment.taskText || '');
      const fromRaw  = enrichment.from || '';
      const fromName = fromRaw.replace(/<[^>]+>/g, '').replace(/"/g, '').trim();
      const _emailM  = fromRaw.match(/<([^>]+@[^>]+)>/);
      block.dataset.fromEmail = _emailM ? _emailM[1] : (fromRaw.includes('@') ? fromRaw.trim() : '');
      block.dataset.subject   = enrichment.subject || '';
      const dateStr  = enrichment.date
        ? (function() {
            try { return new Date(enrichment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
            catch(e) { return ''; }
          })()
        : '';
      const snippet  = (enrichment.snippet || '')
        .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .slice(0, 200);
      const searchQ  = encodeURIComponent(enrichment.searchQuery || _buildQueryFallback(taskText || enrichment.taskText || ''));
      const gmailUrl = 'https://mail.google.com/mail/u/0/#search/' + searchQ;
      // Desktop Mac uses Apple Mail; other platforms/missing IDs use Gmail.
      const appleMail = _isDesktopMac() && enrichment.messageId;
      const openLink = appleMail
        ? '<a class="focus-gmail-open focus-gmail-applemail" href="' + esc(_appleMailHref(enrichment.messageId)) + '" data-today-click="gmail.open-mail">Open in Mail ↗</a>'
        : '<a class="focus-gmail-open" href="' + esc(gmailUrl) + '" target="_blank" rel="noopener">Open in Gmail ↗</a>';

      block.innerHTML =
        '<div class="focus-gmail-thread">' +
          '<div class="focus-gmail-meta">' +
            '<span class="focus-gmail-icon">↩</span>' +
            esc(fromName) + (dateStr ? ' — ' + esc(dateStr) : '') +
          '</div>' +
          '<div class="focus-gmail-snippet">&ldquo;' + esc(snippet) + (snippet.length >= 200 ? '…' : '') + '&rdquo;</div>' +
          '<div class="focus-gmail-actions">' +
            (booking ? '' : '<button class="focus-gmail-draft-btn"><span class="focus-gmail-draft-label">Draft reply</span></button>') +
            openLink +
          '</div>' +
          '<div class="focus-gmail-draft" hidden></div>' +
        '</div>';

      block.querySelector('.focus-gmail-open').addEventListener('click', ev => {
        if (!_viewCurrent(view)) { ev.preventDefault(); ev.stopImmediatePropagation(); if(view===hooks.view())hooks.close(); }
      });
      block.hidden = false;
      if (window._focusExpandTimer) _focusExpandTimer();
      const thread=block.querySelector('.focus-gmail-thread'),context=document.createElement('div');
      context.className='focus-gmail-context';thread.prepend(context);
      context.append(thread.querySelector('.focus-gmail-meta'),thread.querySelector('.focus-gmail-snippet'));
      const feedback=document.createElement('span');feedback.className='gmail-context-feedback focus-gmail-actions';
      block.querySelector('.focus-gmail-actions').append(feedback);
      const footer=document.createElement('div');footer.className='gmail-draft-feedback focus-gmail-actions';thread.append(footer);
      view.snippet=snippet;view.controlsStamp=null;
      const primary=block.querySelector('.focus-gmail-draft-btn');
      if(primary){primary.dataset.todayClick='gmail.draft';primary.dataset.context=view.identity;}
      controls(enrichment,view);
    }

    function _setBtnLabel(btn, text, view) {
      const label = btn.querySelector('.focus-gmail-draft-label');
      if (!label) { btn.textContent = text; return; }
      if (!btn.dataset.minWidthLocked) {
        btn.style.minWidth = btn.getBoundingClientRect().width + 'px';
        btn.dataset.minWidthLocked = '1';
      }
      label.classList.add('changing');
      const ticket=btn.dataset.labelSequence=String(Number(btn.dataset.labelSequence||0)+1);
      setTimeout(() => { if (btn.isConnected && btn.dataset.labelSequence===ticket && (!view || _viewCurrent(view))) { label.textContent = text; label.classList.remove('changing'); } }, 150);
    }

    async function _fetchDraft(taskText,snippet,el,view,replacement=false){
      const btn=el.querySelector('.focus-gmail-draft-btn'),draftEl=el.querySelector('.focus-gmail-draft');
      if(!btn||!draftEl||!hooks.current(view)||record(hooks.get(view.id))?.context?.hidden)return false;
      view.draft?.abort();const controller=view.draft=new AbortController(),ai=hooks.ai(),epoch=hooks.epoch(),memory=hooks.memoryClear();
      let guidanceStamp=null;
      const current=()=>hooks.current(view)&&view.draft===controller&&!controller.signal.aborted&&ai===hooks.ai()
        &&epoch===hooks.epoch()&&memory===hooks.memoryClear()&&(guidanceStamp===null||guidanceStamp===stamp())
        &&el.querySelector('.focus-gmail-draft-btn')===btn&&!record(hooks.get(view.id))?.context?.hidden;
      view.pendingDraft=true;
      if(!replacement){_setBtnLabel(btn,'drafting…',view);btn.disabled=true;}
      controls(hooks.get(view.id),view);
      try{
        const result=await hooks.bounded(controller,async()=>{
          const guidance=await prepare(view.id);guidanceStamp=guidance.stamp;if(!current())return null;
          const sourceId=await digest(hooks.identity(hooks.get(view.id),view.id));if(!current())return null;
          const writing=guidance.concerns.map(c=>c==='hard_to_follow'
            ?'Use clear, direct sentences with explicit references; keep the necessary meaning.'
            :'Use natural, conversational wording without ceremonial phrasing; preserve the intended meaning.').join(' ');
          const response=await fetch('/.netlify/functions/ai-assist',{
            method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},
            body:JSON.stringify({provider:Today.use('connections')._aiGetProvider(),apiKey:Today.use('connections')._aiGetKey(),
              messages:[{role:'user',content:'My task: "'+taskText+'". Their last message: "'+snippet+'"'}],
              systemPrompt:'Draft a brief, natural reply. Under 3 sentences. Use first name only if greeting. No subject line. No sign-off.'
                +(writing?' Optional wording guidance, not additional facts: '+writing:'')})
          });
          if(!response.ok||!current())return null;
          const data=await response.json();if(!current())return null;
          const raw=data.content||data.message,text=typeof raw==='string'?raw.trim().replace(/^["']+|["']+$/g,''):'';
          if(!text)return null;const id=await digest(hooks.writer+'\0'+sourceId+'\0'+text);if(!current())return null;
          return {text,id,sourceId,ai};
        });
        if(!result||!current())return false;
        if(replacement&&view.accepted?.text===result.text&&view.accepted.ai===result.ai){announce('No different draft to show. Your current draft is kept.');return false;}
        view.accepted=result;view.wordingUndo=null;view.wordingOpen=false;
        draftEl.textContent=result.text;draftEl.hidden=false;
        const address=el.dataset.fromEmail||'',subject=el.dataset.subject||'';
        if(address){btn.dataset.mailto=_mailtoDraftHref(address,subject?'Re: '+subject:'',result.text);_setBtnLabel(btn,'Show draft in Mail ↗',view);}
        else{delete btn.dataset.mailto;_setBtnLabel(btn,'Copy',view);}
        btn.disabled=false;controls(hooks.get(view.id),view);return true;
      }catch(_){return false;}
      finally{
        if(view===hooks.view()&&view.draft===controller){
          view.pendingDraft=false;view.draft=null;
          if(hooks.current(view)){
            if(!view.accepted){btn.disabled=false;_setBtnLabel(btn,'Draft reply',view);}
            controls(hooks.get(view.id),view);
          }
        }
      }
    }
    Today.ui.register('click','gmail.draft',(event,btn)=>{
      stop(event);const value=active(btn);if(!value)return;
      const {view}=value,accepted=view.accepted;
      if(!accepted){if(!view.pendingDraft)_fetchDraft(view.text,view.snippet,block(),view);return;}
      const current=()=>hooks.current(view)&&view.accepted===accepted&&accepted.ai===hooks.ai()&&!record(hooks.get(view.id))?.context?.hidden;
      if(!current())return;
      if(btn.dataset.mailto){window.location.href=btn.dataset.mailto;return;}
      navigator.clipboard?.writeText(accepted.text).then(()=>{
        if(!current())return;_setBtnLabel(btn,'Copied ✓',view);
        setTimeout(()=>{if(current())_setBtnLabel(btn,'Copy',view);},2000);
      }).catch(()=>{});
    });
    Today.ui.register('click','gmail.draft-retry',(event,btn)=>{
      stop(event);const value=activeDraft(btn);if(!value||value.view.draftRetryUsed||value.view.pendingDraft)return;
      value.view.draftRetryUsed=true;
      _fetchDraft(value.view.text,value.view.snippet,block(),value.view,true);
    });
    Today.ui.register('click','gmail.context',(event,btn)=>{
      stop(event);const value=active(btn);if(!value)return;const {view,entry}=value,next=fresh(entry),hidden=!!next.context?.hidden;
      if(btn.dataset.mode!==(hidden?'restore':'reject')){controls(entry,view);return;}
      if(hidden){
        const undo=view.contextUndo;
        if(undo&&undo.epoch===hooks.epoch()&&undo.memory===hooks.memoryClear()){
          if(undo.context)next.context=undo.context;else delete next.context;
        }else{
          const ids=(next.context?.rejectedThreads||[]).filter(id=>id!==entry.threadId);
          if(ids.length)next.context={at:Date.now(),hidden:false,rejectedThreads:ids};else delete next.context;
        }
        if(!write(view.id,entry,next))return failSave();view.contextUndo=null;
      }else{
        if(typeof entry.threadId!=='string'||!entry.threadId||entry.threadId.length>128)return;
        const prior=next.context;next.context={at:Date.now(),hidden:true,rejectedThreads:[...(prior?.rejectedThreads||[]).filter(id=>id!==entry.threadId),entry.threadId].slice(-5)};
        if(!write(view.id,entry,next))return failSave();
        view.contextUndo={context:prior,memory:hooks.memoryClear(),epoch:hooks.epoch()};
      }
      trim();controls(hooks.get(view.id),view);hooks.indicator(view.id,false);focus('gmail.context');
      announce(hidden?'Email restored for this task.':'Thread rejected for this task. Undo is available.');
    });
    Today.ui.register('click','gmail.context-retry',(event,btn)=>{
      stop(event);const value=active(btn);if(!value||!record(value.entry)?.context?.hidden||value.view.contextRetryUsed)return;
      const {view}=value;view.contextRetryUsed=true;view.pendingContext=true;controls(value.entry,view);
      hooks.alternative(view).then(entry=>{
        if(view!==hooks.view())return;
        const selected=hooks.get(view.id);
        if(entry&&selected&&hooks.identity(selected,view.id)===hooks.identity(entry,view.id)){
          view.cache=localStorage.getItem(PREFIX+view.id);view.identity=hooks.identity(entry,view.id);view.expires=entry.fetchedAt+86400000;
          if(hooks.current(view)){view.accepted=null;view.contextUndo=null;_doRenderBlock(block(),view.text,entry);announce('Other email context shown.');}
        }else if(hooks.current(view)){controls(hooks.get(view.id),view);announce('No other email to show. The previous email can still be restored.');}
      }).catch(()=>{}).finally(()=>{if(view===hooks.view()&&hooks.current(view)){view.pendingContext=false;controls(hooks.get(view.id),view);focus('gmail.context');}});
    });
    Today.ui.register('click','gmail.wording',(event,btn)=>{
      stop(event);const value=activeDraft(btn);if(!value)return;value.view.wordingOpen=!value.view.wordingOpen;
      controls(value.entry,value.view);focus('gmail.wording');
    });
    Today.ui.register('click','gmail.concern',(event,btn)=>{
      stop(event);const value=activeDraft(btn),concern=btn.dataset.concern;if(!value||!CONCERNS.includes(concern))return;
      const {view,entry}=value,next=fresh(entry),prior=next.wording;
      if(prior?.draftId===view.accepted.id&&prior.concern===concern)delete next.wording;
      else next.wording={at:Date.now(),concern,draftId:view.accepted.id,sourceId:view.accepted.sourceId,writer:hooks.writer,scope:WORDING_SCOPE};
      if(!write(view.id,entry,next))return failSave();trim();
      view.wordingUndo={rows:[{id:view.id,wording:prior,sourceId:view.accepted.sourceId,expiresAt:next.expiresAt}],memory:hooks.memoryClear(),epoch:hooks.epoch()};
      controls(hooks.get(view.id),view);focus('gmail.concern',concern);announce('Gmail wording feedback saved. It guides a later requested draft.');
    });
    Today.ui.register('click','gmail.wording-clear',(event,btn)=>{
      stop(event);const value=activeDraft(btn);if(!value)return;const saved=[];let failed=false;
      for(const row of rows())if(row.feedback?.wording){
        const next={...row.feedback};delete next.wording;
        if(write(row.id,row.entry,next)){saved.push({id:row.id,wording:row.feedback.wording,sourceId:row.feedback.wording.sourceId,expiresAt:row.feedback.expiresAt});}else failed=true;
      }
      value.view.wordingUndo={rows:saved,memory:hooks.memoryClear(),epoch:hooks.epoch()};
      controls(hooks.get(value.view.id),value.view);focus('gmail.wording');
      announce(failed?'Some Gmail wording feedback could not be cleared.':'All Gmail wording feedback cleared.');
    });
    Today.ui.register('click','gmail.wording-undo',(event,btn)=>{
      stop(event);const value=activeDraft(btn),undo=value?.view.wordingUndo;if(!undo)return;
      const {view}=value;
      (async()=>{
        if(undo.memory!==hooks.memoryClear()||undo.epoch!==hooks.epoch())return;
        const eligible=[];
        for(const row of undo.rows){const entry=hooks.get(row.id);if(!entry||row.expiresAt<=Date.now())continue;
          if(await digest(hooks.identity(entry,row.id))===row.sourceId)eligible.push({row,entry});}
        if(!hooks.current(view)||view.wordingUndo!==undo||undo.memory!==hooks.memoryClear()||undo.epoch!==hooks.epoch())return;
        const failures=[];
        for(const {row,entry} of eligible){const next=fresh(entry);
          next.expiresAt=Math.min(next.expiresAt,row.expiresAt);
          if(row.wording&&next.expiresAt>Date.now())next.wording=row.wording;else delete next.wording;
          if(!write(row.id,entry,next))failures.push(row);}
        view.wordingUndo=failures.length?{...undo,rows:failures,epoch:hooks.epoch()}:null;
        trim();controls(hooks.get(view.id),view);focus('gmail.wording');
        announce(failures.length?'Some Gmail wording feedback could not be restored.':'Gmail wording feedback restored where its source is still current.');
      })().catch(failSave);
    });


return {render:_doRenderBlock,reconcile,cleared};
}
Today.define('gmail-feedback',{create});
})();
