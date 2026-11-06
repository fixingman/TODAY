/* Scripted fictional journey. No runtime component, storage, transport or AI is invoked. */
'use strict';
const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(action,label,extra='')=>`<button type="button" class="memory-item-btn" data-action="${action}" ${extra}>${label}</button>`;
const root=document.getElementById('explorationRoot');
const title=(text)=>`<h3 id="exViewTitle" tabindex="-1">${h(text)}</h3>`;
const observations=[
  'I keep putting off pottery. At the studio last week I got absorbed, but at home I didn’t start.',
  'I had a free afternoon on Sunday and still avoided it. Then I painted with Maya after an exhausting day and enjoyed it.',
  'I don’t think I need company. With Maya, nobody expected a finished piece. That was the relief.',
  'What could I try without turning this into another thing I have to do?',
  'I might try that on Saturday. I don’t want to decide what I’m making yet.',
  'I tried it. I enjoyed making shapes until I started thinking I should make something useful. I’d rather leave the step there for now.'
];
const notes=[
  {account:'You want to make room for pottery. You became absorbed at the studio, but did not start at home.',possibility:'',open:'What felt different about starting at the studio?'},
  {account:'Time and energy have not explained the difference so far: a free afternoon went unused, while painting after a tiring day felt enjoyable.',possibility:'The conditions around making may matter more than having a clear afternoon. What those conditions are is still uncertain.',open:'What felt different when you painted with Maya?'},
  {account:'You want room to make things without having to produce a finished piece. The relief with Maya was the absence of that expectation, rather than company itself.',possibility:'An expectation to make something worthwhile may make starting harder. That fits what you described with Maya; it does not yet explain the studio or every time you put it off.',open:'Where else, if anywhere, have you felt free to make something without an outcome?'},
  {account:'You enjoyed making shapes until the thought of making something useful arrived. You want to leave the small step there for now.',possibility:'The expectation of a useful result may interrupt enjoyment as well as starting. That is a possibility from these experiences, not an explanation of every difficult start.',open:'Does that expectation show up elsewhere, or does this feel specific to making things?'}
];
const replies=[
  'You wanted to make something in both places, but starting felt different. It is too early to say why. What was the studio like before you became absorbed?',
  'That makes “I need more time or energy” a less complete explanation. What felt different with Maya: the company, what you were making, or something else?',
  'That changes the reading: the relief was not having to deliver a finished piece. It leaves open whether the studio offered a similar freedom.',
  'You could spend five minutes making shapes from one piece of clay, with nothing to finish or keep. It is only worth trying if that feels inviting. You can change it or leave it.',
  'You can leave what you make undecided. The step can stay small, and you can decide on Saturday whether you want it at all.',
  'You did get some enjoyment before the thought of usefulness arrived. That gives the possibility a little more substance, without settling it. We can leave the step there.'
];
const ids=['first','first-note','refined','correction','overnight','return','request','step-return','outcome','task-withdrawn','note-withdrawn'];
let scene=new URLSearchParams(location.search).get('scene');if(!ids.includes(scene))scene='first';
let view=['first-note','overnight'].includes(scene)?'notes':'conversation',trail=[],draft='',correction='',amendment='',customWords=[],chosen=['step-return'].includes(scene),declined=scene==='outcome',taskAdded=false;
let taskWithdrawn=scene==='task-withdrawn',noteExcluded=scene==='note-withdrawn',retired=noteExcluded,contextEnabled=!taskWithdrawn,contextRetired=taskWithdrawn,stepRevising=false;
let status='',forgotten=false;
const stage=()=>scene==='first'||scene==='first-note'?0:scene==='refined'?1:scene==='outcome'?3:2;
const count=()=>scene==='first'||scene==='first-note'?1:scene==='refined'?2:['correction','overnight','return','task-withdrawn','note-withdrawn'].includes(scene)?3:scene==='request'?4:scene==='step-return'?5:6;
const currentNote=()=>retired?null:notes[stage()];
const stepAvailable=()=>!retired&&count()>=4&&!declined;
const nextExample=()=>count()===1?observations[1]:count()===2?observations[2]:count()===3?observations[3]:count()===4?observations[4]:count()===5?observations[5]:'';
const announce=text=>{document.getElementById('announcement').textContent=text;};
function links(){return `<div class="ex-links">${button('notes','living note','id="exNotes"')}${button('history','earlier conversation')}${button('sources','sources')}</div>`;}
function section(label,text,extra=''){return `<div class="ex-note-section"><h4>${label}</h4><p>${h(text)}</p>${extra}</div>`;}
function turns(indices){return indices.map(i=>`<div class="ex-turn ex-you"><span class="ex-source">You</span><p>${h(observations[i])}</p></div>${retired&&i>0?'':`<div class="ex-turn"><span class="ex-source">TODAY</span><p>${h(replies[i])}</p></div>`}`).join('');}
function conversation(){
  const note=currentNote(),returning=['overnight','return','step-return','task-withdrawn','note-withdrawn'].includes(scene);
  let html=title('Making room for pottery');
  if(returning)html+=`<div class="ex-resume"><span class="ex-source">Where we left off</span><p>${h(note?.account||observations[0])}</p></div>`;
  else html+=turns([count()-1]);
  if(note&&amendment)html+=`<p class="ex-muted">Your correction is kept alongside the note.</p>`;
  if(stepAvailable())html+=`<div class="ex-links">${button('step',chosen?'the step you kept':'something to try')}</div>`;
  if(scene==='outcome')html+='<p class="ex-muted">You chose to leave the step there.</p>';
  if(retired)html+='<p class="ex-muted">You left out a note used in the earlier understanding. The remaining words can lead from here.</p>';
  html+=customWords.map(text=>`<div class="ex-turn ex-you"><span class="ex-source">You</span><p>${h(text)}</p></div>`).join('');
  return html+links();
}
function noteView(){
  const note=currentNote();
  let html=title('Living note');
  if(!note)return html+'<p class="ex-muted">The earlier note and step are hidden because you left out supporting words. Including them again will not restore that interpretation.</p>'+section('Your account',observations[0])+`<div class="ex-links">${button('history','earlier conversation')}${button('sources','sources')}</div>`;
  html+=section('Your account',note.account,'<p class="ex-muted">AI summary of your words</p>');
  if(note.possibility)html+=section('A possibility',amendment||note.possibility,`<p class="ex-muted">${amendment?'Your wording · remains unconfirmed':'AI interpretation · unconfirmed'}</p><div class="ex-links">${button('correct','correct this')}${button('sources','see sources')}</div>`);
  html+=section('Still open',note.open);
  if(amendment)html+=`<div class="ex-note-section"><span class="ex-source">Your correction</span><p>${h(amendment)}</p></div>`;
  return html+`<div class="ex-links">${button('step',stepAvailable()&&chosen?'the step you kept':'something to try')}${button('sources','sources')}${button('document','your document')}</div>`;
}
function sources(){
  return title('Sources')+'<p>Your personal note draws on your own words. Relevant TODAY records can also support the conversation.</p>'+`<div class="ex-note-section"><h4>Your notes</h4>${observations.slice(0,count()).map((text,i)=>`<div class="memory-item"><span class="memory-item-text"><span class="ex-source">Your words${i===2&&noteExcluded?' · left out':''}</span>${h(text)}</span>${i===2?button('exclude-note',noteExcluded?'include':'leave out'):''}</div>`).join('')}</div>`+
    `<div class="ex-note-section"><h4>TODAY context</h4><p class="ex-muted">Used only for the conversation, not to write the personal note.</p>${taskWithdrawn?'<p class="ex-muted">The studio task is no longer available. Its earlier task-based reply is hidden. Your personal note uses separate words and remains available.</p>':`<div class="memory-item"><span class="memory-item-text"><span class="ex-source">${scene==='overnight'?'Completed task · now in Past':'Task'}${contextEnabled?'':' · left out'}</span>Reply to the studio</span>${button('exclude-task',contextEnabled?'leave out':'include')}</div>`}${button('context',contextEnabled?'use only my notes':'connect TODAY data')}</div>`+
    `<p class="ex-muted">Leaving out personal words also removes dependent notes and steps. Earlier versions stay in your document until you forget it.</p>`;
}
function step(){
  let html=title('Something to try');
  if(retired)return html+'<p>This step used words you left out. It is hidden.</p>';
  if(declined)return html+'<p>You chose to leave the earlier step there. Nothing is waiting for you to complete.</p>'+button('try-again','ask for another possibility');
  if(!stepAvailable())return html+'<p>There does not need to be a next step. If you want one, ask for something small to try.</p>'+button('suggest','suggest something');
  html+='<p>Make shapes from one piece of clay, with nothing to finish or keep.</p><dl class="ex-bounds">'+[['Question','Does making without an intended result feel different?'],['Notice','Whether the expectation of a result appears, and what happens then.'],['Limit','Five minutes, only if you feel like it.'],['Review','If you want to discuss it when you return.'],['Stop','Leave it if it feels like another obligation.']].map(([label,text])=>`<div><dt>${label}</dt><dd>${text}</dd></div>`).join('')+'</dl>';
  if(stepRevising)return html+`<label for="stepChange">What would you change?</label><textarea id="stepChange" rows="3"></textarea><div class="ex-links">${button('discuss-change','discuss this in conversation')}${button('cancel-change','cancel')}</div>`;
  html+=`<p class="ex-muted">${chosen?'You kept this step. There is no reminder or automatic check-in.':'A suggestion, not a commitment.'}</p><div class="ex-links">${!chosen?button('keep-step','keep this step'):''}${button('revise-step','change it')}${button('decline-step','leave it')}</div>`;
  if(chosen)html+=taskAdded?'<p class="ex-muted">Added to this preview’s Today list. Completion would not tell us whether it helped.</p>':`<div class="ex-links">${button('task','add to Today')}</div>`;
  return html;
}
function historyView(){return title('Earlier conversation')+turns(Array.from({length:count()},(_,i)=>i))+(!taskWithdrawn&&!contextRetired&&!retired&&contextEnabled&&count()>=3&&scene!=='overnight'?'<div class="ex-turn" data-contextual-reply><span class="ex-source">TODAY · from task context</span><p>The studio reply is still on your list. It might offer a practical way back, but having a task there tells us nothing about how making feels.</p></div>':'');}
function documentView(){return title('Your document')+'<p>Your words, corrections and readings stay together in your Dropbox.</p><div class="ex-links">'+button('privacy','privacy &amp; forget')+'</div><p class="ex-muted">This is a fictional preview. It does not read or write Dropbox.</p>';}
function privacy(){return title('Privacy & forget')+'<p>The proposed personal note uses supplied words and eligible corrections. Relevant TODAY records are kept out of that request. Nothing runs between visits.</p><p>Leaving out words hides dependent notes and steps. Forget removes this separate document; Dropbox may retain recoverable versions. Your tasks stay.</p>'+button('forget','forget exploration');}
function correctionView(){return title('Your wording')+`<label for="exCorrection">How would you put it?</label><textarea id="exCorrection" rows="5" maxlength="8000">${h(correction)}</textarea><p class="ex-muted">Your wording stays alongside the earlier version. It does not verify an explanation.</p><div class="ex-links">${button('amend','keep correction')}${button('back','cancel')}</div>`;}
function render(focus=false){
  const phone=matchMedia('(max-width:600px)').matches;
  const path=phone?'M5 8l5 5 5-5':'M12 5l-5 5 5 5';
  const body=forgotten?title('Exploration forgotten')+'<p>The fictional document was removed from this preview. Your tasks stay.</p>':({conversation,notes:noteView,sources,step,history:historyView,document:documentView,privacy,correct:correctionView}[view])();
  const parent=trail.at(-1)?.view||'conversation',back=parent==='notes'?'living note':parent==='document'?'your document':'conversation';
  const prompt=currentNote()?.open||'What has stayed with you, or happened since then?';
  root.innerHTML=`<div class="ex-sheet-head"><h2 class="config-title" id="exTitle" tabindex="-1">✦︎ Explore</h2><button type="button" class="ex-hide" data-action="hide" aria-label="Hide Explore"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="${path}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="ex-sheet-scroll"><div class="ex-body">${view!=='conversation'&&!forgotten?`<button type="button" class="memory-item-btn ex-subnav" data-action="back"><span aria-hidden="true">‹ </span>${back}</button>`:''}${body}${status?`<p class="ex-status" role="status">${h(status)}</p>`:''}</div></div><div class="ex-sheet-foot">${view==='conversation'&&!forgotten?`<div class="ex-prompt${!draft.trim()?' show':''}" id="exPromptWrap"><p id="exPrompt">${h(prompt)}</p></div><div class="ex-input-row"><label class="visually-hidden" for="exThought">Your reply</label><textarea id="exThought" class="ex-input" rows="1" maxlength="8000" placeholder="In your own words…" enterkeyhint="send" aria-describedby="exPrompt">${h(draft)}</textarea></div>`:''}</div>`;
  modality();if(focus)document.getElementById('exViewTitle')?.focus({preventScroll:true});
}
function modality(){const phone=matchMedia('(max-width:600px)').matches,covered=matchMedia('(max-width:1119px)').matches,shown=!root.hidden;document.getElementById('daily').inert=shown&&covered;root.setAttribute('role',phone?'dialog':'complementary');if(phone)root.setAttribute('aria-modal','true');else root.removeAttribute('aria-modal');document.getElementById('exScrim').hidden=!shown||!covered||phone;}
function go(next,trigger){trail.push({view,action:trigger?.dataset.action,scroll:root.querySelector('.ex-sheet-scroll')?.scrollTop||0});view=next;status='';render(true);}
function back(){if(!trail.length){view='conversation';render(true);return;}const previous=trail.pop();view=previous.view;status='';render();const control=[...root.querySelectorAll('[data-action]')].find(node=>node.dataset.action===previous.action);(control||document.getElementById('exViewTitle'))?.focus({preventScroll:true});root.querySelector('.ex-sheet-scroll').scrollTop=previous.scroll;}
function hide(){root.hidden=true;document.body.classList.remove('ex-open');modality();document.getElementById('openExplore').focus();}
function send(){
  const text=draft.trim();if(!text)return;
  if(text===nextExample()){
    scene=({1:'refined',2:'correction',3:'request',4:'step-return',5:'outcome'})[count()]||scene;
    if(scene==='outcome'){declined=true;chosen=false;}
    draft='';render();announce('Scripted example reply shown. No AI request was made.');
  }else{
    customWords.push(text);draft='';render();announce('Words added to this preview only. There is no scripted AI response for them.');
    if(parent!==window)parent.postMessage({type:'unscripted-preview'},location.origin);
  }
  document.getElementById('exThought')?.focus();
}
root.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-action]');if(!trigger)return;
  const action=trigger.dataset.action;
  if(['notes','sources','history','step','document','privacy','correct'].includes(action)){go(action,trigger);return;}
  if(action==='back'){back();return;}if(action==='hide'){hide();return;}
  if(action==='exclude-note'){noteExcluded=!noteExcluded;if(noteExcluded)retired=true;status=noteExcluded?'Dependent notes and steps are hidden.':'Included for a future reply. Earlier interpretations stay hidden.';}
  if(action==='exclude-task'){contextEnabled=!contextEnabled;if(!contextEnabled)contextRetired=true;status=contextEnabled?'Included for a future reply. Earlier task readings stay hidden.':'The task-based reply is hidden. The independent personal note stays.';}
  if(action==='context'){contextEnabled=!contextEnabled;if(!contextEnabled)contextRetired=true;status=contextEnabled?'TODAY context is available for a future reply.':'TODAY context is off. Your personal note stays.';}
  if(action==='suggest'||action==='try-again'){draft=observations[3];view='conversation';trail=[];render();document.getElementById('exThought')?.focus();return;}
  if(action==='keep-step'){chosen=true;status='Step kept in this preview.';}
  if(action==='decline-step'){declined=true;chosen=false;status='Step left behind. There is nothing to complete.';}
  if(action==='revise-step')stepRevising=true;
  if(action==='cancel-change')stepRevising=false;
  if(action==='discuss-change'){const text=document.getElementById('stepChange').value.trim();draft=text;view='conversation';trail=[];stepRevising=false;render();document.getElementById('exThought')?.focus();return;}
  if(action==='task'&&!taskAdded){taskAdded=true;const li=document.createElement('li');li.textContent='Make shapes from one piece of clay';document.querySelector('.fictional-tasks').append(li);status='Added to this preview only.';}
  if(action==='amend'){correction=document.getElementById('exCorrection').value.trim();if(!correction)return;amendment=correction;back();announce('Correction kept in this preview. It does not verify the interpretation.');return;}
  if(action==='forget'){go('privacy',trigger);root.querySelector('.ex-body').innerHTML=title('Forget exploration?')+'<p>Remove the fictional exploration from this preview? The daily tasks stay.</p>'+button('confirm-forget','yes, forget')+button('back','keep it');document.querySelector('[data-action="back"]').focus();return;}
  if(action==='confirm-forget'){forgotten=true;draft='';correction='';amendment='';customWords=[];trail=[];view='conversation';}
  render(true);
});
root.addEventListener('input',event=>{if(event.target.id==='exThought'){draft=event.target.value;document.getElementById('exPromptWrap').classList.toggle('show',!draft.trim());}if(event.target.id==='exCorrection')correction=event.target.value;});
root.addEventListener('keydown',event=>{
  if(event.target.id==='exThought'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!event.repeat){event.preventDefault();send();}
});
document.addEventListener('keydown',event=>{
  if(root.hidden)return;
  if(event.key==='Escape'){event.preventDefault();if(trail.length)back();else hide();}
  if(event.key==='Tab'&&matchMedia('(max-width:1119px)').matches){const all=[...root.querySelectorAll('button:not(:disabled),textarea,a[href],input')].filter(node=>node.getClientRects().length);const first=all[0],last=all.at(-1);if(event.shiftKey&&(document.activeElement===first||!all.includes(document.activeElement))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||!all.includes(document.activeElement))){event.preventDefault();first?.focus();}}
});
document.getElementById('openExplore').addEventListener('click',()=>{root.hidden=false;document.body.classList.add('ex-open');render();document.getElementById('exTitle').focus();});
document.getElementById('exScrim').addEventListener('click',hide);
window.addEventListener('resize',modality);
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='fill-fictional-example'||forgotten)return;view='conversation';trail=[];draft=nextExample();render();document.getElementById('exThought').focus();});
render();
