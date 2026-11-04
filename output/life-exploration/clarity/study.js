/* Isolated scripted design comparison. No network, storage, model or personal records. */
(() => {
'use strict';
const by=id=>document.getElementById(id),h=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,cls='')=>`<button type="button" class="btn-ghost ${cls}" data-action="${action}">${label}</button>`;
const sample='I was excited about a pottery class, but I keep putting off the studio email.';
const take='Interest and finding a workable time may be different questions. Timing is one possibility, not an established explanation.';
let view='conversation',mode='proposal',entered='',answer='',draft='',correction='',excluded=false,withdrawn=false,forgot=false,showStep=false,linked=false,confirmForget=false,followups=[];
const stepAction='Ask the studio which class times are available, without committing to a class.';
const message=text=>{by('studyStatus').textContent=text;};
function show(next){view=next;mode='proposal';by('studyPanel').hidden=false;render();by('studyPanel').scrollIntoView({block:'start'});by('viewTitle')?.focus({preventScroll:true});}
function reset(){view='conversation';mode='proposal';entered='';answer='';draft='';correction='';excluded=false;withdrawn=false;forgot=false;showStep=false;linked=false;confirmForget=false;followups=[];by('studyPanel').hidden=false;render();message('Empty proposal. No example or personal record has been loaded.');}
function send(){const value=by('reply')?.value.trim();if(!value)return;if(entered){followups.push(value);draft='';render();by('reply')?.focus({preventScroll:true});message('The scripted study ends here; no reply was generated. Both your turns remain.');return;}entered=value;draft='';forgot=false;answer=value===sample?take:'';if(!answer)message('Your words stay in this page only. No AI analysis was performed. Use “load example” to inspect the scripted response.');render();by('reply')?.focus({preventScroll:true});}
function render(){
 by('clarityView').classList.toggle('proposal',mode==='proposal');
 by('sheetTitle').parentElement.hidden=mode==='before';
 by('studyPanel').setAttribute('aria-labelledby',mode==='before'?'exTitle':'sheetTitle');
 by('sheetTitle').textContent=mode==='before'?'✦︎ Current layout':'✦︎ Explore';
 by('back').textContent=mode==='before'||view==='conversation'?'back to Today':view==='document'||view==='privacy'||view==='raw'?'back to note':'back to conversation';
 document.querySelectorAll('.study-actions [aria-pressed]').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.action===mode)));
 if(mode==='before'){by('clarityView').innerHTML=`<section id="explorationRoot">${window.clarityBaseline}</section>`;return;}
 const topic=entered===sample?'Making room for pottery':entered.split('\n')[0].slice(0,80);
 let html='';
 if(view==='conversation'){
  html=`<h3 id="viewTitle" tabindex="-1">${entered?h(topic):'Start with an experience'}</h3>`;
  if(!entered)html+=`<p>You don’t need a finished question. Bring something that happened, or something you’re unsure about.</p>`;
  if(entered)html+=`<div class="turn you"><span class="meta">You</span><p>${h(entered)}</p></div>`;
  if(answer&&!withdrawn)html+=`<div class="turn"><span class="meta">TODAY · a possibility</span><p>${h(correction||answer)}</p><div class="links"><span class="meta">Drew on your words and one task</span>${button('sources','see sources')}${button('correct','correct this')}</div></div>`;
  if(withdrawn&&answer)html+='<p>The earlier reading is withheld after a source was left out. Your words remain.</p>';
  if(withdrawn&&correction)html+=`<div class="turn you"><span class="meta">Your wording about the earlier reading · support changed</span><p>${h(correction)}</p></div>`;
  if(followups.length)html+=followups.map(text=>`<div class="turn you"><span class="meta">You</span><p>${h(text)}</p></div>`).join('')+'<p class="meta">The scripted study ends here; no reply was generated.</p>';
  if(forgot)html+='<p>The example was forgotten. The task list stays.</p>';
  html+=`<div class="composer"><label for="reply">${answer&&!withdrawn?'What happened the last time you thought about booking?':'Something that happened, or something you’re unsure about'}</label><textarea id="reply" rows="3" maxlength="8000" enterkeyhint="send">${h(draft)}</textarea><div class="compose-actions"><span class="meta">Uses relevant TODAY records</span>${button('send','send','primary')}</div></div>`;
  if(entered)html+=`<div class="links">${button('note','living note')}${button('history','earlier conversation')}</div>`;
 }else if(view==='note'){
  html=`<h3 id="viewTitle" tabindex="-1">Living note</h3><div class="note-section"><h4>Your account</h4><p>${h(entered)}</p>${followups.map(text=>`<p>${h(text)}</p>`).join('')}${followups.length?'<p class="meta">Additional words kept; no new interpretation generated.</p>':''}</div><div class="note-section"><h4>A possibility</h4><p>${withdrawn?'The earlier interpretation is withheld because a source was left out.':h(correction||answer||'No AI interpretation has been made in this preview.')}</p>${withdrawn&&correction?`<p class="meta">Your wording about the earlier reading · support changed</p><p>${h(correction)}</p>`:''}<div class="links">${button('correct','correct this')}${button('sources','see sources')}</div></div><div class="note-section"><h4>Still open</h4><p>${answer?'Whether arranging a time, uncertainty about the class, or something else is the difficult part.':'Your words can lead; a useful question has not been framed yet.'}</p></div><div class="links">${!withdrawn&&answer?button('step','something to try'):''}${button('document','your document')}</div>`;
 }else if(view==='sources'){
  if(!answer){html=`<h3 id="viewTitle" tabindex="-1">Sources</h3><p>${h(entered)}</p><p class="meta">No AI request has been made and no TODAY record was used.</p>`;}else html=`<h3 id="viewTitle" tabindex="-1">Sources</h3><p>What supported the latest reply. You can leave a source out of future replies.</p><div class="source"><span class="meta">Your words · this conversation</span><p>${h(entered)}</p></div><div class="source"><span class="meta">Today task · ${excluded?'left out':withdrawn?'available for the next reply':'used'}</span><p>Email pottery studio about times</p><div class="links">${button('toggle-source',excluded?'include again':'leave out')}<span class="meta">Completion does not tell us how it felt.</span></div></div><p class="meta">Including a source again does not revive an earlier reading. A fresh reply is needed.</p>`;
 }else if(view==='correct'){
  html=`<h3 id="viewTitle" tabindex="-1">Your wording</h3><label for="wording">What would you change?</label><textarea id="wording" rows="5">${h(correction||answer)}</textarea><p class="meta">Your correction is kept alongside the earlier version. It does not verify an explanation.</p><div class="links">${button('save-correction','keep correction','primary')}${button('note','cancel')}</div>`;
 }else if(view==='history'){
  html=`<h3 id="viewTitle" tabindex="-1">Earlier conversation</h3><div class="turn you"><span class="meta">You</span><p>${h(entered)}</p></div>${!withdrawn&&answer?`<div class="turn"><span class="meta">TODAY · a possibility</span><p>${h(answer)}</p></div>`:'<p>The earlier interpretation is withheld.</p>'}${followups.map(text=>`<div class="turn you"><span class="meta">You · awaiting a reply</span><p>${h(text)}</p></div>`).join('')}`;
 }else if(view==='step'){
  html=`<h3 id="viewTitle" tabindex="-1">Something to try</h3><p>A possible next step, only if you want it. Understanding or leaving this open can also be useful.</p>${showStep?`<p>${h(stepAction)}</p><dl class="bounds"><div><dt>Question</dt><dd>Does knowing the options make the decision clearer?</dd></div><div><dt>Notice</dt><dd>Whether the practical uncertainty changes.</dd></div><div><dt>Limit</dt><dd>One short message. No booking commitment.</dd></div><div><dt>Review</dt><dd>When you return to this conversation.</dd></div><div><dt>Stop</dt><dd>If it creates pressure rather than clarity.</dd></div></dl>${linked?'<p>Added to Today. What it helps remains open.</p>':button('link-task','add to Today','primary')}`:button('suggest','suggest something','primary')}`;
 }else if(view==='document'){
  html=`<h3 id="viewTitle" tabindex="-1">Your document</h3><p>Your words, corrections and readings belong together in one portable document.</p><div class="links">${button('raw','read markdown')}${button('export','export document')}${button('privacy','privacy &amp; forget')}</div><p class="meta">The real app keeps this in your Dropbox. This design study saves nothing.</p>`;
 }else if(view==='raw'){
  html=`<h3 id="viewTitle" tabindex="-1">Markdown</h3><pre>${h(markdown())}</pre>${button('export','export document')}`;
 }else if(view==='privacy'){
  html=`<h3 id="viewTitle" tabindex="-1">Privacy &amp; forget</h3><p>In the real app, each reply uses your supplied notes, the current thread and a bounded selection of relevant TODAY records.</p><p>Other chats and private checkpoints are not automatically available. The installed Life skill is not running inside TODAY. No exploration happens between visits, and no reminder has been scheduled.</p><p>Feelings and dreams stay in their own spaces unless you deliberately bring material here. Forgetting the exploration leaves daily tasks in place.</p>${confirmForget?`<p>Forget the example conversation and its notes?</p><div class="links">${button('forget','yes, forget','danger')}${button('cancel-forget','keep it')}</div>`:button('confirm-forget','forget exploration','danger')}`;
 }
 by('clarityView').innerHTML=html;
}
function markdown(){return '# Fictional design example\n\n## Your words\n'+entered+'\n'+followups.map(text=>'\n'+text).join('')+'\n\n## Tentative reading\n'+(withdrawn?'Withheld after source withdrawal.':correction||answer)+'\n\n## Still open\n'+(answer?'What makes arranging the class difficult?':'Not framed in this preview.')+'\n';}
document.addEventListener('click',event=>{
 const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;
 if(mode==='before'&&event.target.closest('#clarityView'))return;
 if(action==='reset')return reset();
 if(action==='before'){mode='before';by('studyPanel').hidden=false;render();message('Actual captured native Notes layout, using fictional records. Controls here are for visual comparison; the proposal is interactive.');return;}
 if(action==='proposal'){mode='proposal';by('studyPanel').hidden=false;render();return;}
 if(action==='example'){entered=sample;answer=take;draft='';excluded=false;withdrawn=false;correction='';forgot=false;showStep=false;linked=false;followups=[];confirmForget=false;show('conversation');message('Scripted fictional example loaded. This is not your personal record.');return;}
 if(action==='open')return show('conversation');
 if(action==='back'){if(mode==='before'||view==='conversation'){by('studyPanel').hidden=true;document.querySelector('.entry').focus();}else show(['privacy','document','raw','step','correct'].includes(view)?'note':'conversation');return;}
 if(action==='send')return send();
 if(action==='toggle-source'){excluded=!excluded;if(excluded)withdrawn=true;render();message(excluded?'Source left out; dependent interpretations withheld.':'Source included; earlier interpretations stay withheld.');return;}
 if(action==='save-correction'){correction=by('wording').value.trim();show('note');return;}
 if(action==='suggest'){showStep=true;render();message('Scripted example suggestion, not generated analysis.');return;}
 if(action==='link-task'){if(![...by('taskList').children].some(node=>node.textContent===stepAction)){const li=document.createElement('li');li.textContent=stepAction;by('taskList').append(li);}linked=true;render();message('Added the chosen step to Today; no benefit verdict. Identical wording is not duplicated.');return;}
 if(action==='confirm-forget'){confirmForget=true;render();return;}
 if(action==='cancel-forget'){confirmForget=false;render();return;}
 if(action==='forget'){entered='';answer='';draft='';correction='';excluded=false;forgot=true;confirmForget=false;followups=[];showStep=false;linked=false;withdrawn=false;show('conversation');return;}
 if(action==='export'){const url=URL.createObjectURL(new Blob([markdown()],{type:'text/markdown'}));const a=document.createElement('a');a.href=url;a.download='fictional-design-example.md';a.click();URL.revokeObjectURL(url);return;}
 show(action);
});
document.addEventListener('input',event=>{if(event.target.id==='reply')draft=event.target.value;});
document.addEventListener('keydown',event=>{
 if(event.target.id==='reply'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229&&!event.repeat){event.preventDefault();send();}
 if(event.target.id==='capture'&&event.key==='Enter'&&!event.isComposing){event.preventDefault();const text=event.target.value.trim();if(text){const li=document.createElement('li');li.textContent=text;by('taskList').append(li);event.target.value='';message('Added only to the preview task list. The exploration is unchanged.');}}
});
reset();
})();
