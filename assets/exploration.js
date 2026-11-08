// Explicitly opened exploration session. Dropbox is canonical; page-held drafts are never backed up.
(function () {
  'use strict';
  const core = Today.use('exploration-core');
  const files = Today.use('exploration-files');
  const h = value => esc(String(value == null ? '' : value));
  const byId = id => document.getElementById(id);
  const action = (name, label, data = '', className = 'memory-item-btn') => `<button type="button" class="${className}" data-today-click="exploration.action" data-ex-action="${name}" ${data}>${label}</button>`;
  const now = () => new Date().toISOString();
  const id = () => crypto.randomUUID();
  const grant = () => localStorage.getItem('dropbox_refresh_token') || localStorage.getItem('dropbox_token') || '';
  const connection = () => Today.use('connections');
  let doc = null, revision = null, draft = '', draftWorkspace = null, imported = '', incoming = null, includeIncoming = false;
  let host = null, root = null, origin = null, view = 'conversation', trail = [], busy = false, message = '', epoch = 0;
  let controller = null, aiController = null, pendingReading = false, activeGrant = '', retryId = null;
  let snapshot = null, forgot = false, opened = false, loaded = false, confirmForget = false;
  let suggestionMessage = '', correctionTarget = null, correctionText = '', setupQuestion = '', historyWindow = 24, navigation = 0;
  let taskPending = null, liveSources = [], sourceGeneration = 0, pendingSources = [];
  let recovery = '', retryReading = false, stylesLoading = null, arrivalMotion = null;
  const dataContext=()=>Today.use('exploration-context');
  let visitStart = 0, sourceWindow = 50, shownPrompt = '', turnCount = 0;
  let pendingObservation = null, awaitingReply = false, thinkingMotion = [];
  const wide = matchMedia('(min-width: 601px)'), phone = matchMedia('(max-width: 600px)');
  const status = (text, nextAction = '') => { message = text; recovery = nextAction; render(); };
  const sidebar = () => Today.use('sidebar');
  // CSS loader only — root is set in mount() when sidebar activates Explore.
  function ensureRoot() {
    stylesLoading ||= new Promise((resolve,reject)=>{
      const style = document.createElement('link'); style.id = 'explorationStyles'; style.rel = 'stylesheet'; style.href = '/assets/exploration.css';
      style.onload=resolve;style.onerror=()=>{style.remove();stylesLoading=null;reject(new Error('exploration-styles'));};document.head.append(style);
    });
    return stylesLoading;
  }
  document.addEventListener('today:sidebar-unmount',event=>{if(root&&event.detail===root){opened=false;epoch++;controller?.abort();abortAI();}});
  const validSession = token => opened && token === epoch && activeGrant === grant();
  function abortAI() { if(pendingReading&&retryId)retryReading=true;aiController?.abort(); aiController = null; pendingReading = false;if(suggestionMessage==='Thinking…')suggestionMessage='The context changed. You can ask again.'; }
  function wipe() {
    liveSources=[];sourceGeneration++;pendingSources=[];
    epoch++; controller?.abort(); abortAI(); doc = null; revision = null; draft = ''; imported = ''; incoming = null;
    snapshot = null; retryId = null; taskPending = null; activeGrant = ''; busy = false; forgot = false; loaded = false;
    setupQuestion = ''; draftWorkspace = null; view = 'conversation'; trail = []; correctionTarget = null; correctionText = ''; confirmForget = false; retryReading = false;
    recovery = '';suggestionMessage='';
    if (root) root.replaceChildren(); decorate();
  }
  function hide() {
    arrivalMotion?.cancel();
    opened = false; pendingObservation = null; awaitingReply = false; thinkingMotion.forEach(a=>a.cancel()); thinkingMotion=[]; epoch++; controller?.abort(); abortAI(); busy = false; dictation()?.stop();
    if (root) { root.replaceChildren(); root.removeAttribute('aria-busy'); }
    root = null;
  }
  function modality(){sidebar().modality();}
  function close() {
    if (!opened) return;
    sidebar().close();
  }
  const scroller = () => root?.querySelector('.ex-sheet-scroll');
  function enterView(next) {
    if(next==='step'&&view!==next&&!pendingReading)suggestionMessage='';
    view=next;
  }
  function go(next, trigger = document.activeElement) {
    navigation++;trail.push({view, scroll:scroller()?.scrollTop||0, action:trigger?.dataset.exAction, id:trigger?.id});
    enterView(next); confirmForget=false; render();
    byId('exViewTitle')?.focus({preventScroll:true});
    const box=scroller(); if(box)box.scrollTop=0;
  }
  function leave() {
    if (trail.length) {
      navigation++;const previous=trail.pop();enterView(previous.view);confirmForget=false;render();
      const target=(previous.id&&byId(previous.id)) || [...root.querySelectorAll('[data-ex-action]')].find(node=>node.dataset.exAction===previous.action);
      (target||byId('exViewTitle')||byId('exTitle'))?.focus({preventScroll:true});
      const box=scroller(); if(box)box.scrollTop=previous.scroll;return;
    }
    close();
  }
  async function open(hooks, place, context) {
    await ensureRoot();
    sidebar().open('explore', { hooks, place, context });
  }
  function _mount(container, ctx) {
    const { hooks, place, context } = ctx || {};
    root = container;root.classList.add('ex-content');
    const token=++epoch; host = hooks; origin = place; opened = true; view = 'conversation'; trail = []; forgot = false; message = '';
    incoming = context || null; includeIncoming = false; correctionTarget = null; correctionText = '';suggestionMessage='';
    shownPrompt = ''; turnCount = 0;
    load();
  }
  async function load() {
    arrivalMotion?.cancel();
    const token = ++epoch; controller?.abort(); abortAI(); controller = new AbortController(); activeGrant = grant();
    busy = true; loaded = false; recovery = ''; message = ''; doc=null; liveSources=[]; retryReading=false; render();
    const result = await files.read(controller.signal);
    if (!validSession(token)) return;
    busy = false; loaded = !!(result.ok || result.notFound);
    if (result.ok) {
      try { doc = core.parse(result.text); revision = result.rev; imported = ''; visitStart = doc.entries.length;
        retryId=doc.entries.at(-1)?.kind==='observation'?doc.entries.at(-1).id:null;
        retryReading=!!retryId;
      }
      catch (error) {
        doc=null;revision=result.rev;
        if(error.message==='document-version'){loaded=false;imported='';message='This exploration needs a newer version of TODAY. Its document has not been changed.';}
        else{imported=result.text;message='This Markdown needs importing before TODAY can update it. Its contents will be preserved.';}
      }
    } else if (result.notFound) { doc = null; revision = null; }
    else { message = 'Connect Dropbox or come back online to open your exploration.'; recovery = 'reload'; }
    await refreshSources(false);if(!validSession(token))return;
    render(); decorate(); root.removeAttribute('aria-busy');
    if(!_motionReduced()) arrivalMotion=root.querySelector('.ex-body')?.animate([{opacity:0},{opacity:1}],{duration:_motionDuration('--dur-base'),easing:_motionEasing('--ease-out')});
    byId('exTitle')?.focus({preventScroll:true});
  }
  async function commit(next) {
    next={...next,schema_version:3};
    const body = core.stringify(next);
    const token = epoch, account = activeGrant;
    busy = true; render();
    let result = await files.write(body, revision, controller?.signal);
    if (result.uncertain || (result.ok && !result.rev)) {
      const recovered = await files.read(controller?.signal);
      if (recovered.ok && recovered.text === body) result = recovered;
    }
    if (!validSession(token) || account !== grant()) return false;
    busy = false;
    if (!result.ok || !result.rev) {
      message = result.reason === 'conflict' ? 'The Dropbox document changed. Reload it before trying again. Your unsent text stays here.' : 'Dropbox has not confirmed this update. Your text stays here; retry or export it before leaving.';
      recovery = result.reason === 'conflict' ? 'reload' : '';
      render(); return false;
    }
    doc = next; revision = result.rev; message = 'Kept in your Dropbox'; recovery = ''; decorate(); return true;
  }
  function row(kind, text, extra = {}) { return {id:id(),kind,text,at:now(),...extra}; }
  function chosenReading() { return doc ? core.current(doc,liveSources) : null; }
  function selectedSources(){return doc?.today_context?.enabled ? dataContext().select(liveSources,doc.question+' '+(doc.entries.filter(row=>row.kind==='observation').at(-1)?.text||''),doc.today_context.excluded,doc.today_context.included||[]) : [];}
  async function refreshSources(update=true){
    if(!opened||!doc)return;
    const token=epoch,generation=++sourceGeneration,prior=chosenReading();
    let next;try{next=await host.sources(core.supportIds(doc));}catch(_){if(validSession(token)&&generation===sourceGeneration){abortAI();liveSources=[];message='TODAY context is unavailable. Your notes stay; reopen to retry.';if(update)render();}return;}
    if(!validSession(token)||generation!==sourceGeneration)return;
    const changed=JSON.stringify(next.map(row=>[row.id,row.signature]))!==JSON.stringify(liveSources.map(row=>[row.id,row.signature]));
    liveSources=next;
    if(changed&&pendingReading&&!dataContext().supports(pendingSources,next)){abortAI();retryReading=!!retryId;message='TODAY’s sources changed. Your words are kept; ask again with the current context.';}
    if(prior&&!chosenReading())message='';
    if(changed&&update)render();
  }
  function todayHTML(disabled){
    const policy=doc.today_context;
    if(!policy?.enabled)return `<div class="ex-today" id="exTodayContext"><p class="ex-muted">TODAY context is off. Connect it to let relevant tasks and Memory support your replies. Feelings, dreams, mail and Calendar stay separate.</p>${action('today-toggle','connect TODAY data',disabled)}</div>`;
    const chosen=selectedSources();
    const other=liveSources.filter(row=>row.selectable!==false&&!chosen.some(source=>source.id===row.id)&&!policy.excluded.includes(row.id));
    const browse=other.length?`<details id="exOtherRecords"><summary>choose other TODAY records · ${other.length}</summary>${other.map(source=>`<div class="memory-item"><span class="memory-item-text"><span class="ex-source">${h(source.source_type)}</span>${h(source.text)}</span>${action('today-pin','include',`data-today-source-id="${h(source.id)}" ${busy?'disabled':''}`)}</div>`).join('')}</details>`:'';
    const omitted=liveSources.filter(row=>policy.excluded.includes(row.id));
    return `<details class="ex-today" id="exTodayContext"><summary>TODAY context · ${chosen.length} records</summary><p class="ex-muted">Selected for the next reply from your question and latest words. Connections remain tentative. Replies may quote this context and stay in your document’s history until you forget it.</p>${[...chosen,...omitted].map(source=>`<div class="memory-item"><span class="memory-item-text"><span class="ex-source">${h(source.source_type)}${policy.excluded.includes(source.id)?' · left out':''}</span>${h(source.text)}<span class="ex-source">${h(source.selection_reason||'left out of this exploration')}</span></span>${action('today-source',policy.excluded.includes(source.id)?'include':'leave out',`data-today-source-id="${h(source.id)}" ${busy?'disabled':''}`)}</div>`).join('')||'<p>No close wording match is available yet. Your notes can still lead.</p>'}${browse}${action('today-toggle','use only my notes',disabled)}</details>`;
  }

  // The header control only ever hides Explore; sub-pages carry their own way back.
  const chevron = d => `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="${d}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  function controls() {
    const label = origin?.kind==='memory' ? 'Hide Explore, back to Memory' : 'Hide Explore';
    const chatIcon=`<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false"><path d="M4 2h6a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6l-4 2V4a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    const calendarIcon='<svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false"><path d="M4 1v3m6-3v3M2 5h10M3 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>';
    const pages=[['conversation',chatIcon,'Chat'],['history',calendarIcon,'Earlier'],['notes','Living note'],['sources','Sources']];
    const nav=doc?`<nav class="ex-nav" aria-label="Explore pages">${pages.map(([page,label,ariaL])=>action(page,label,`data-ex-nav="true" ${ariaL?`aria-label="${ariaL}" title="${ariaL}" `:''}${page==='notes'?'id="exNotes" ':''}${view===page||(page==='history'&&view==='original-history')?'aria-current="page"':''}`,'ex-nav-item')).join('')}</nav>`:'';
    return `<h2 class="config-title" id="exTitle" tabindex="-1">✦︎ Explore</h2>${action('hide',chevron(phone.matches?'M5 8l5 5 5-5':'M8 5l5 5-5 5'),`aria-label="${label}"`,'ex-hide')}${nav}`;
  }
  function backLink() {
    const parent=trail.at(-1)?.view;
    const label=parent==='notes'?'living note':parent==='document'?'your document':parent==='history'?'earlier conversation':'conversation';
    return action('back',`<span aria-hidden="true">‹ </span>${label}`,`aria-label="Back to ${label}"`,'memory-item-btn ex-subnav');
  }
  function notice() {
    const text = message === 'Kept in your Dropbox' ? '' : message || (!doc && busy ? 'Opening your exploration…' : '');
    return `<div class="ex-notice"><p class="ex-status" role="status">${h(text)}</p>${text && !busy && !pendingReading ? (recovery ? action(recovery,recovery === 'connections' ? 'connect your AI' : 'reload latest') : '') + (draft||(!doc&&setupQuestion) ? action('draft-export','export unsent text') : '') : ''}</div>`;
  }
  function turnsHTML(entries,reading,saved=false) {
    return entries.map(entry=>entry.kind === 'observation' ? `<div class="ex-turn ex-you"><span class="ex-source ex-speaker-you">You</span><p>${h(entry.text)}</p></div>` : entry.kind === 'reading' && (saved||core.supportedReading(doc,entry,liveSources)) ? `<div class="ex-turn" ${saved?'data-ex-saved-reading':'data-ex-reading'}="${h(entry.id)}"><span class="ex-source ex-speaker-logo">TO<span>DAY</span></span><p>${h(entry.synthesis_version===1?entry.text:core.amendments(doc,entry.id).at(-1)?.text || entry.text)}</p></div>` : '').join('');
  }
  function readingExplanation() {
    const state=core.readingStatus(doc,core.latest(doc),liveSources);
    const source=state.sourceId?.startsWith('task:')?'A task':'A Memory record';
    const explanations={
      'opening-changed':'You added earlier notes after this interpretation. Continue the conversation to read them together.',
      'context-off':'TODAY context is off, so its earlier interpretation is hidden. Your notes are still saved.',
      'context-changed':'You changed which TODAY records this exploration can use. Continue the conversation for a new interpretation.',
      'source-left-out':'You left out a record used in the earlier interpretation, so it is hidden. Your notes are still saved.',
      'note-left-out':'You changed which notes this exploration can use, so its earlier interpretation is hidden. Your notes are still saved.',
      'source-changed':source+' used in the earlier interpretation has changed. Continue the conversation for a new interpretation.',
      'source-unavailable':'Some context behind an earlier reply is unavailable. Your conversation is still saved.'
    };
    return explanations[state.reason]||'';
  }
  function readingNotice(reading) {
    const text=!reading&&readingExplanation();
    return text?`<p class="ex-muted" id="exReadingNotice">${h(text)}</p><div class="ex-links">${action('original-history','read saved conversation')}</div>`:'';
  }
  const title=(text,id='exViewTitle')=>`<h3 id="${id}" tabindex="-1">${h(text)}</h3>`;
  function conversationHTML(reading,disabled) {
    const sessionEntries=doc.entries.slice(visitStart);
    const latestUser=sessionEntries.some(entry=>entry.kind==='observation');
    const currentReply=reading&&sessionEntries.some(entry=>entry.id===reading.id);
    let html=title(doc.question);
    if(!latestUser&&!currentReply&&doc.entries.some(entry=>entry.kind==='observation'))html+=`<div class="ex-resume"><span class="ex-source">${reading?'Where we left off':'Your words'}</span><p>${h(reading?(core.amendments(doc,reading.id).filter(row=>core.included(doc,row.id)).at(-1)?.text||reading.summary):doc.entries.findLast(entry=>entry.kind==='observation'&&core.included(doc,entry.id))?.text||doc.question)}</p></div>`;
    html+=turnsHTML(pendingObservation && !sessionEntries.some(entry=>entry.id===pendingObservation.id)?[...sessionEntries,pendingObservation]:sessionEntries,reading);
    if(pendingReading||awaitingReply)html+=thinkingHTML();
    html+=readingNotice(reading);
    if(draftWorkspace&&draftWorkspace!==doc.workspace_id)html+=`<p>Your draft belongs to a different document. ${action('draft-export','export unsent text')}${action('draft-clear','clear unsent text',disabled)}</p>`;
    html+=incomingHTML(disabled);
    if(retryReading&&retryId&&!busy&&!pendingReading)html+=`<p class="ex-muted">Your last reply is kept. ${action('retry-ai','try reply again',disabled)}</p>`;
    const step=core.activeStep(doc,liveSources);
    if(step)html+=`<div class="ex-links">${action('step',step.decision==='kept'?'the step you kept':'something to try')}</div>`;
    return html;
  }
  function notesHTML(reading,disabled) {
    const own=reading&&core.amendments(doc,reading.id).filter(row=>core.included(doc,row.id)).at(-1);
    const withheldEdit=!reading&&doc.entries.filter(entry=>entry.kind==='amendment').at(-1);
    const observations=doc.entries.filter(entry=>entry.kind==='observation'&&core.included(doc,entry.id));
    return title('Living note','exNotesTitle')+readingNotice(reading)+
      (reading?`<div class="ex-note-section"><h4>So far</h4><p>${h(own?.text||reading.summary)}</p><p class="ex-muted">${own?'Your wording · does not verify the interpretation':'AI summary · possibilities remain unconfirmed'}</p><div class="ex-links">${action('correct','correct this',disabled)}</div></div>`:`<div class="ex-note-section"><h4>Your words</h4>${observations.slice(-3).map(entry=>`<p>${h(entry.text)}</p>`).join('')||'<p>No included observation recorded yet.</p>'}</div>`)+
      `${withheldEdit?`<div class="ex-note-section"><span class="ex-source">Your wording about an earlier reading · support changed</span><p>${h(withheldEdit.text)}</p></div>`:''}${(reading?reading.next_question:doc.question)?`<div class="ex-note-section"><h4>Still open</h4><p>${h(reading?reading.next_question:doc.question)}</p></div>`:''}
      <div class="ex-links">${action('step','something to try')}${action('document','your document')}</div>`;
  }
  function sourcesHTML(reading,disabled) {
    let html=title('Sources')+'<p>What supports this exploration. Leave out anything you don’t want used in future replies.</p>';
    html+=`<div class="ex-note-section"><h4>Your notes</h4>${core.sources(doc).slice(-sourceWindow).map(entry=>`<div class="memory-item"><span class="memory-item-text"><span class="ex-source">${entry.kind==='observation'?'Your words':entry.kind==='amendment'?'Your correction':h(entry.source_type)}${core.included(doc,entry.id)?'':' · left out'}</span>${h(entry.text)}</span>${action('source',core.included(doc,entry.id)?'leave out':'include',`data-entry-id="${h(entry.id)}" ${busy?'disabled':''}`)}</div>`).join('')||'<p>No observations recorded yet.</p>'}${core.sources(doc).length>sourceWindow?action('more-sources','show earlier sources'):''}</div>`;
    if(reading?.today_sources?.length)html+=`<details id="exReadingSources" open><summary>TODAY records used in this reading · ${reading.today_sources.length}</summary>${reading.today_sources.map(ref=>{const source=liveSources.find(row=>row.id===ref.id&&dataContext().matches(ref,row));return `<div class="memory-item"><span class="memory-item-text"><span class="ex-source">${h(source?.source_type||'source unavailable')}</span>${h(source?.text||'This source is no longer available here.')}</span></div>`;}).join('')}</details>`;
    return html+todayHTML(disabled)+'<p class="ex-muted">Including a source again does not revive a reading withheld after you left it out. Feelings, dreams, email and Calendar stay separate.</p>';
  }
  function stepHTML(reading,disabled) {
    const retained=core.stepState(doc,liveSources),step=retained?.decision!=='declined'&&retained?.reading.experiment;
    const target=retained?`data-step-id="${h(retained.reading.id)}" ${disabled}`:disabled;
    return title('Something to try')+`<p>A possible next step, only if you want it. Understanding or leaving this open can also be useful.</p>${action('experiment','suggest something',disabled)}<p class="ex-status" id="exSuggestionStatus" role="status">${h(suggestionMessage)}</p>${retained?.decision==='declined'?'<p>You left the earlier step there. Nothing is waiting to be completed.</p>':''}${step?`<div class="ex-note-section"><p>${h(step.action)}</p><dl class="ex-bounds">${[['Question',step.question],['Notice',step.signal],['Limit',step.effort],['Review',step.review],['Stop',step.stop]].map(([key,value])=>`<div><dt>${key}</dt><dd>${h(value)}</dd></div>`).join('')}</dl><p class="ex-muted">${retained.decision==='kept'?'You kept this step. No reminder is scheduled.':'A suggestion, not a commitment.'}</p><div class="ex-links">${retained.decision!=='kept'?action('step-keep','keep this step',target):''}${action('step-revise','change it',target)}${action('step-decline','leave it',target)}</div>${doc.entries.some(entry=>entry.kind==='task'&&entry.target===retained.reading.id)?'<p>Added to Today. What it helps remains open.</p>':action('task','add to Today',target)}</div>`:''}`;
  }
  function documentHTML(disabled) {
    return title('Your document')+`<p>Your words, corrections and readings stay together in your Dropbox.</p><div class="ex-links">${action('record','read Markdown')}${action('export','export document')}${action('privacy','privacy &amp; forget')}${action('import','bring in earlier notes')}</div>${draft?`<div class="ex-links">${action('draft-export','export unsent text')}${action('draft-clear','clear unsent text',disabled)}</div>`:''}`;
  }
  function privacyHTML(disabled) {
    return title('Privacy & forget')+`<div class="ex-privacy"><p>This document lives in your Dropbox at ${h(files.path)}. It is held in this page while open, outside TODAY’s task backup. Updates need a connection. Reloading an unsent draft can lose it; export it first.</p><p>Each reply uses your supplied notes, the current thread and a bounded selection of relevant TODAY records. Other chats and private checkpoints are not automatically available. The installed Life skill does not run inside TODAY. No exploration happens between visits, and no reminder has been scheduled.</p><p>Clearing Memory withholds dependent readings; this separate document and its reply history stay. Forget removes this document and page-held records. Dropbox may retain recoverable versions under your account policy. Your tasks stay.</p>${action('forget','forget exploration',disabled)}${confirmForget?`<p>Remove this exploration document from Dropbox?</p>${action('forget-confirm','yes, forget',disabled)}${action('forget-cancel','keep it')}`:''}</div>`;
  }
  function secondaryHTML(reading,disabled) { return backLink()+secondaryBody(reading,disabled); }
  function secondaryBody(reading,disabled) {
    if(view==='notes')return notesHTML(reading,disabled);
    if(view==='sources')return sourcesHTML(reading,disabled);
    if(view==='step')return stepHTML(reading,disabled);
    if(view==='document')return documentHTML(disabled);
    if(view==='privacy')return privacyHTML(disabled);
    if(view==='record')return title('Markdown')+`<pre>${h(core.stringify(doc))}</pre>${action('export','export document')}`;
    if(view==='import')return title('Earlier notes')+`<p>Add a Markdown journal or checkpoint to this exploration. Your existing notes stay. Nothing is sent to AI by importing.</p><label class="memory-item-btn ex-file">choose a document<input type="file" accept=".md,.txt,text/plain,text/markdown" data-today-change="exploration.checkpoint" ${disabled}></label>`;
    if(view==='history'||view==='original-history') {
      const all=doc.entries.filter(entry=>['observation','reading'].includes(entry.kind)),saved=view==='original-history';
      const hidden=all.some(entry=>entry.kind==='reading'&&!core.supportedReading(doc,entry,liveSources));
      const explanation=saved?'<p class="ex-muted" id="exHistoryNotice">Saved history only. Replies may rely on information that has changed or been removed; reading them here does not restore them as current understanding.</p>':hidden?`<p class="ex-muted">Some saved AI replies cannot support the current conversation.</p><div class="ex-links">${action('original-history','read saved conversation')}</div>`:'';
      return title(saved?'Saved conversation':'Earlier conversation')+explanation+turnsHTML(all.slice(-historyWindow),reading,saved)+(all.length>historyWindow?action('more-history','show earlier conversation'):'');
    }
    if(view==='correct')return title('Your wording')+`<label for="exCorrection">How would you put it?</label><textarea id="exCorrection" rows="5" maxlength="8000" data-today-input="exploration.correction">${h(correctionText)}</textarea><p class="ex-muted">Your correction stays alongside the earlier version. It does not verify an explanation.</p>${reading?.id===correctionTarget?action('amend','keep correction',disabled):'<p>The supporting reading changed. Your wording is still here; return to the note to review it.</p>'}${action('cancel-correction','cancel')}`;
    return '';
  }
  function incomingHTML(disabled) {
    return incoming?`<div class="ex-context"><span class="ex-source">${incoming.source_type==='task'?'From your task':'AI reading · not your statement'}</span><p>${h(incoming.text)}</p>${action('include',includeIncoming?'leave out':'include in reply',disabled)}</div>`:'';
  }
  // Pinned composer, built like the daily add bar. TODAY's next question rises in with a new
  // reply and folds away once you start answering; it stays the field's description.
  function composerHTML() {
    if(forgot) return '';
    let id, field, value, prompt, locked = busy || pendingReading || awaitingReply, promptKey;
    if(!doc){
      if(!grant()||!loaded) return '';
      id='exQuestion'; value=setupQuestion;
      field=(lock,text)=>`<textarea id="exQuestion" class="ex-input" rows="1" maxlength="8000" placeholder="In your own words…" enterkeyhint="send" aria-describedby="exPrompt" data-today-input="exploration.question" data-today-keydown="exploration.start-key" ${lock?'readonly aria-busy="true"':''}>${h(text)}</textarea>`;
      prompt='What happened, or what feels unresolved?'; promptKey='start';
    } else {
      if(view!=='conversation') return '';
      const reading=chosenReading();
      id='exThought'; value=pendingObservation?'':draft;
      field=(lock,text)=>`<textarea id="exThought" class="ex-input" rows="1" maxlength="8000" placeholder="In your own words…" enterkeyhint="send" aria-describedby="exPrompt" data-today-input="exploration.draft" data-today-keydown="exploration.reply-key" ${lock?'readonly aria-busy="true"':''}>${h(text)}</textarea>`;
      prompt=reading?.next_question || (doc.entries.some(entry=>entry.kind==='observation')?'What has stayed with you, or happened since then?':'What brought this question to mind?');
      promptKey=reading?.id || 'open';
    }
    const show = !value.trim() && !pendingReading && !awaitingReply, fresh = show && promptKey !== shownPrompt;
    if(show) shownPrompt = promptKey;
    const voice = dictation(), live = !!voice?.active();
    const mic = voice?.available() ? `<button type="button" class="add-mic-btn ex-mic${live?' live':''}" data-today-click="exploration.action" data-ex-action="dictate" aria-label="${live?'Stop dictating':'Dictate your reply'}" aria-pressed="${live}" ${locked?'disabled':''}><svg width="15" height="20" viewBox="0 0 15 20" fill="none" aria-hidden="true" focusable="false"><rect x="4.75" y="1" width="5.5" height="10.5" rx="2.75" stroke="currentColor" stroke-width="1.5"/><path d="M1.5 8.5v1a6 6 0 0 0 12 0v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7.5 15.5V19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>` : '';
    return `<div class="ex-prompt${show?' show':''}${fresh&&!_motionReduced()?' arriving':''}" id="exPromptWrap"><p id="exPrompt">${h(prompt)}</p></div>
      <div class="ex-input-row"><label class="visually-hidden" for="${id}">Your reply</label>${field(locked,value)}${mic}</div>`;
  }
  function dictation() { try { return Today.use('voice-dictation'); } catch (_) { return null; } }
  // Words land in the field unsent, so they can be read and edited before Enter.
  function dictate(button) {
    const voice = dictation(); if (!voice) return;
    if (voice.active()) { voice.stop(); return; }
    const field = byId('exThought') || byId('exQuestion'); if (!field || field.readOnly) return;
    const token = epoch, workspace = doc?.workspace_id;
    const started = voice.start((text, outcome) => {
      const mic = root?.querySelector('[data-ex-action="dictate"]');
      mic?.classList.remove('live'); mic?.setAttribute('aria-pressed','false'); mic?.setAttribute('aria-label','Dictate your reply');
      if (!validSession(token) || doc?.workspace_id !== workspace) return;
      const input = byId('exThought') || byId('exQuestion'); if (!input || input.readOnly) return;
      if (text) {
        input.value = (input.value.trim() ? input.value.replace(/\s*$/,' ') : '') + text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus({ preventScroll: true });
      }
      window._a11yAnnounce?.(text ? 'Dictation added. Press Enter to send.' : outcome === 'unavailable' ? 'Dictation is unavailable here.' : 'Nothing was heard.');
    });
    if (started) { button.classList.add('live'); button.setAttribute('aria-pressed','true'); button.setAttribute('aria-label','Stop dictating'); promptFor('listening'); }
  }
  function fitInput(input) { if(!input)return; input.style.height=''; input.style.height=Math.min(input.scrollHeight+2, innerHeight*0.4)+'px'; }
  function promptFor(value) { byId('exPromptWrap')?.classList.toggle('show', !value.trim() && !pendingReading); }
  function thinkingHTML() {
    return '<div class="ex-turn ex-thinking" role="status" aria-label="TODAY is thinking"><span class="ex-source ex-speaker-logo">TO<span>DAY</span></span><span class="ex-thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>';
  }
  function animateThinking() {
    thinkingMotion.forEach(animation=>animation.cancel());thinkingMotion=[];
    root.querySelectorAll('.ex-thinking-dots i').forEach((dot,index)=>{
      const animation=_loopPulse(dot,[{opacity:0.35,transform:'scale(0.8)'},{opacity:1,transform:'scale(1)'},{opacity:0.35,transform:'scale(0.8)'}],_motionDuration('--dur-emphasis')*2);
      if(animation){animation.currentTime=index*_motionDuration('--dur-base');thinkingMotion.push(animation);}
    });
  }
  function render() {
    if (!opened || !root) return;
    const editing=root.contains(document.activeElement)&&document.activeElement.matches('textarea,input:not([type=file]):not([type=checkbox])')?{id:document.activeElement.id,start:document.activeElement.selectionStart,end:document.activeElement.selectionEnd}:null;
    const detailState=[...root.querySelectorAll('details')].map(node=>({key:node.id,open:node.open}));
    const focused=root.contains(document.activeElement)?document.activeElement:null;
    const focusData=focused?JSON.stringify({...focused.dataset}):'';
    const focusId=focused?.id;
    const disabled = busy || pendingReading ? 'disabled' : '';
    const reading=chosenReading();
    const box=scroller(), keep=box?box.scrollTop:0, turns=doc?doc.entries.length:0, newer=turns!==turnCount||pendingReading||!!pendingObservation;
    turnCount=turns;
    let html='<div class="ex-body">'+notice();
    if(forgot)html+=title('Exploration forgotten')+'<p>The document was removed from Dropbox. Your daily tasks stay.</p>';
    else if(!doc){
      html+=title(loaded?'Start with an experience':'Open your exploration');
      if(pendingObservation)html+=turnsHTML([pendingObservation],null)+thinkingHTML();
      else if(!grant())html+=action('connections','connect Dropbox');
      else if(!busy&&loaded)html+=`<p>You don’t need a finished question. Bring something that happened, or something you’re unsure about.</p><div class="ex-setup">${incomingHTML(disabled)}<details id="exSetupSources"><summary>Uses relevant tasks &amp; Memory</summary><p class="ex-muted">Your words and relevant TODAY records support this reply, kept in Dropbox. You can review or change sources before the next reply. Feelings and dreams stay separate.</p></details>${imported?`<div class="ex-send">${action('create','continue with this document',disabled)}</div>`:''}</div>`;
    }else html+=view==='conversation'?conversationHTML(reading,disabled):secondaryHTML(reading,disabled);
    root.innerHTML=`<div class="ex-sheet-head">${controls()}</div><div class="ex-sheet-scroll">${html}</div></div><div class="ex-sheet-foot">${composerHTML()}</div>`;
    if(view==='conversation'&&turns>visitStart&&!pendingReading)scroller()?.querySelector('.ex-turn:last-of-type')?.classList.add('ex-turn-in');
    modality();animateThinking();
    const nextBox=scroller(); if(nextBox) nextBox.scrollTop = view==='conversation'&&newer ? nextBox.scrollHeight : keep;
    fitInput(byId('exThought')||byId('exQuestion'));
    root.querySelectorAll('details[id]').forEach(node=>{const saved=detailState.find(state=>state.key===node.id);if(saved)node.open=saved.open;});
    if(editing){const input=byId(editing.id);if(input&&!input.disabled&&(!input.readOnly||(!phone.matches&&!matchMedia('(pointer: coarse)').matches))){input.focus({preventScroll:true});input.setSelectionRange(editing.start,editing.end);}}
    else if(focused){const target=focusId?byId(focusId):[...root.querySelectorAll('[data-ex-action]')].find(node=>JSON.stringify({...node.dataset})===focusData);(target&&!target.disabled?target:byId('exViewTitle')||byId('exNotesTitle'))?.focus({preventScroll:true});}
  }
  async function createDocument() {
    if(busy||pendingReading||doc)return;
    setupQuestion=byId('exQuestion')?.value.trim()||'';
    if(!setupQuestion&&!imported)return status('Bring an experience or something you’re unsure about.');
    const createToken=epoch;
    try {
      // A descriptive title comes from the person's own words, never an invented interpretation.
      let next=imported.startsWith('<!-- today-exploration ')?core.parse(imported):core.create((setupQuestion.split('\n').find(line=>line.trim())||'Earlier notes').slice(0,120),imported,id(),now());
      next={...next,schema_version:3,today_context:next.today_context||{enabled:true,epoch:id(),excluded:[]}};
      visitStart=next.entries.length;
      const observation=setupQuestion?row('observation',setupQuestion):null;
      if(includeIncoming&&incoming)next=core.append(next,row('context',incoming.text,{source_type:incoming.source_type,source_id:incoming.source_id||null}));
      if(observation)next=core.append(next,observation);
      pendingObservation=observation;awaitingReply=!!observation;
      if(await commit(next)){
        pendingObservation=null;
        draftWorkspace=null;imported='';setupQuestion='';incoming=null;includeIncoming=false;retryId=observation?.id||null;
        await refreshSources(false);render();byId('exThought')?.focus({preventScroll:true});
        if(observation)await ask(false);
      }
    } catch (_) { busy=false;status('This document could not be imported or updated. Your words stay here.'); }
    finally {if(validSession(createToken)){pendingObservation=null;awaitingReply=false;render();}}
  }
  async function send() {
    if (!doc || busy || pendingReading || !draft.trim() || (draftWorkspace && draftWorkspace !== doc.workspace_id)) return;
    let next = doc;const sendToken=epoch;
    try {
      if (includeIncoming && incoming) next = core.append(next,row('context',incoming.text,{source_type:incoming.source_type,source_id:incoming.source_id || null}));
      const observation = row('observation',draft.trim());
      next = core.append(next,observation);
      pendingObservation=observation;awaitingReply=true;
      if (!await commit(next)) return;
      pendingObservation=null;
      draft = ''; draftWorkspace = null; incoming = null; includeIncoming = false; retryId = observation.id;
      await ask(false);
    } catch (_) { busy = false; status('This document is too large or cannot accept the update. Export it before continuing.'); }
    finally {if(validSession(sendToken)){pendingObservation=null;awaitingReply=false;render();}}
  }
  async function ask(wantExperiment) {
    if (!doc || busy || pendingReading) return;
    retryReading=false;
    if (!connection()._aiIsConfigured()) { if(wantExperiment)suggestionMessage='Connect your AI to suggest a step.';status('Connect your AI to continue. Your words are kept.','connections'); return; }
    await refreshSources(false);if(!opened||!doc||busy||pendingReading)return;
    const token = epoch, baseRevision = revision, workspace = doc.workspace_id;
    const provider = connection()._aiGetProvider(), key = connection()._aiGetKey();
    const selectedLive=selectedSources();
    const selected = core.context(doc,liveSources,selectedLive); snapshot = selected;
    const previous = chosenReading();
    const retained=core.stepState(doc,liveSources),inputs=[previous,retained?.reading].filter(Boolean);
    const sourceIds = [...new Set([...selected.records.filter(entry=>!selectedLive.some(source=>source.id===entry.id)).map(entry=>entry.id), ...inputs.flatMap(input=>(input.source_ids||input.evidence_ids).filter(id=>doc.entries.some(entry=>entry.id===id)))])];
    const amendmentIds=[...new Set([...inputs.flatMap(input=>input.amendment_ids||[]),...(selected.prior_hypothesis?.corrections||[]).map(edit=>edit.id)])];
    // Legacy dependencies may adopt current semantic identity only during this
    // new generation, after their original fingerprints have been validated.
    pendingSources=[...new Map([...inputs.flatMap(input=>input.today_sources||[]).map(ref=>dataContext().reference(liveSources.find(source=>source.id===ref.id))),...selectedLive.map(source=>dataContext().reference(source))].map(ref=>[ref.id,ref])).values()];
    if(pendingSources.length>96){retryReading=!!retryId;status('This thread uses too many TODAY records. Use only your notes or narrow its sources before replying.');return;}
    pendingReading = true; awaitingReply=false; message='';recovery='';suggestionMessage=wantExperiment?'Thinking…':'';const requestController = new AbortController(); aiController = requestController; render();
    const timeout = setTimeout(()=>requestController.abort(),25000);
    try {
      const result = await fetch('/.netlify/functions/ai-assist',{method:'POST',headers:{'Content-Type':'application/json'},signal:aiController.signal,
        body:JSON.stringify({provider,apiKey:key,surface:'exploration',systemPrompt:core.systemPrompt,messages:[{role:'user',content:JSON.stringify({context:selected,request:wantExperiment ? 'Suggest one small reversible experiment, with all six bounds.' : 'Continue the exploration from the latest observation. No experiment unless asked.'})}]})});
      const data = await result.json();
      const freshSources=await host.sources(pendingSources.map(ref=>ref.id));
      if (!validSession(token) || aiController !== requestController || doc.workspace_id !== workspace || revision !== baseRevision || provider !== connection()._aiGetProvider() || key !== connection()._aiGetKey()) return;
      if(requestController.signal.aborted)throw new Error('reply-expired');
      if(!dataContext().supports(pendingSources,freshSources)){liveSources=freshSources;throw new Error('sources-changed');}
      if (!result.ok || data.error) throw new Error(data.code==='exploration-incomplete'?'exploration-incomplete':result.status===401||result.status===403?'ai-credentials':result.status===429?'ai-limit':'reply-unavailable');
      const reply = core.response(typeof data.reply==='string'?data:data.content || data.message,selected.records.map(entry=>entry.id));
      if(wantExperiment&&!reply.experiment)throw new Error('suggestion-empty');
      pendingReading = false;
      const entry = row('reading',reply.reply,{synthesis_version:1,next_question:reply.next_question,summary:reply.summary,evidence_ids:reply.evidence_ids,source_ids:sourceIds,amendment_ids:amendmentIds,today_sources:pendingSources,today_epoch:doc.today_context?.epoch||'',opening_revision:doc.source_revision||'',
        ...(retained?{step_origin:retained.reading.id}:{}),experiment:reply.experiment||null});
      if (await commit(core.append(doc,entry))) { retryId = null;retryReading=false;suggestionMessage=''; }
      else if(wantExperiment)suggestionMessage='Dropbox has not confirmed this suggestion. Your earlier notes stay.';
      else retryReading=recovery!=='reload'&&!!retryId;
    } catch (error) { if (validSession(token) && aiController===requestController) {
      if(wantExperiment){suggestionMessage=core.failureMessage(error);render();}
      else {retryReading=true;status('TODAY could not reply. Your words are kept.');}
    } }
    finally { clearTimeout(timeout); if (aiController === requestController) {pendingReading = false; aiController = null; if (validSession(token)) render();} }
  }
  function download(name, content) {
    const url = URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  function decorate() { host?.changed?.(doc); }
  const actions = {
    async 'today-toggle'(){abortAI();const policy=doc.today_context||{enabled:false,excluded:[]};const next={...doc,schema_version:3,revision:doc.revision+1,updated_at:now(),today_context:{enabled:!policy.enabled,epoch:id(),excluded:policy.excluded,included:policy.included||[]}};if(await commit(next)){await refreshSources(false);render();}},
    async 'today-pin'(button){abortAI();const source=liveSources.find(row=>row.id===button.dataset.todaySourceId&&row.selectable!==false),policy=doc.today_context;if(!source||!policy)return;const ids=[...new Set([...(policy.included||[]).filter(id=>liveSources.some(row=>row.id===id&&row.selectable!==false)),source.id])];if(ids.length>8||ids.filter(id=>liveSources.find(row=>row.id===id)?.evidence_kind==='AI interpretation').length>2)return status('Choose up to eight records, including at most two AI readings. Leave one out to make room.');if(await commit({...doc,revision:doc.revision+1,updated_at:now(),today_context:{...policy,epoch:id(),included:ids,excluded:policy.excluded.filter(id=>id!==source.id)}}))render();},
    async 'today-source'(button){abortAI();const target=button.dataset.todaySourceId,policy=doc.today_context;if(!policy||!liveSources.some(source=>source.id===target))return;const excluded=policy.excluded.includes(target)?policy.excluded.filter(value=>value!==target):[...policy.excluded,target];if(excluded.length>96)return status('Disconnect TODAY context to clear all its influence.');if(await commit({...doc,revision:doc.revision+1,updated_at:now(),today_context:{...policy,epoch:id(),excluded,included:(policy.included||[]).filter(id=>id!==target)}}))render();},
    back:leave, hide:close, dictate(button){return dictate(button);}, notes(){go('notes');byId('exNotesTitle')?.focus({preventScroll:true});}, changes(){go('notes');}, sources(){go('sources');}, step(){go('step');}, document(){go('document');}, import(){go('import');}, history(){go('history');}, 'original-history'(){go('original-history');}, 'more-history'(){historyWindow+=24;render();},
    'more-sources'(){sourceWindow+=50;render();},
    connections(){hide();host.connections();}, reload:load, create:createDocument, send,
    include(){includeIncoming=!includeIncoming;render();},
    'retry-ai'(){return ask(false);}, experiment(){return ask(true);},
    correct(){const reading=chosenReading();if(!reading)return;if(correctionTarget!==reading.id){correctionTarget=reading.id;correctionText=core.amendments(doc,reading.id).filter(row=>core.included(doc,row.id)).at(-1)?.text||reading.summary;}go('correct');byId('exCorrection')?.focus({preventScroll:true});}, 'cancel-correction'(){correctionTarget=null;correctionText='';leave();},
    async amend(){const value=byId('exCorrection')?.value.trim(),visit=navigation,target=correctionTarget;const reading=chosenReading();if(value&&reading&&reading.id===target&&await commit(core.append(doc,row('amendment',value,{target:reading.id})))){if(correctionTarget===target){correctionTarget=null;correctionText='';}if(view==='correct'&&navigation===visit)leave();else render();}},
    async source(button){abortAI();const target=button.dataset.entryId;if(doc&&await commit(core.append(doc,row('source','',{target,include:!core.included(doc,target)})))){message='Source choice kept; earlier dependent readings stay withheld.';render();}},
    async 'step-keep'(button){return chooseStep(button,'kept');},
    async 'step-decline'(button){return chooseStep(button,'declined');},
    'step-revise'(button){
      const retained=core.activeStep(doc,liveSources);if(!retained||retained.reading.id!==button.dataset.stepId)return;
      draft='I’d like to change the step: ';draftWorkspace=doc.workspace_id;view='conversation';trail=[];render();byId('exThought')?.focus();
    },
    async task(button){
      const reading=core.activeStep(doc,liveSources)?.reading;if(!reading?.experiment||busy||reading.id!==button.dataset.stepId)return;
      let taskId=taskPending?.target===reading.id ? taskPending.task_id : null;
      if(!taskId){taskId=host.addTask(reading.experiment.action);taskPending={target:reading.id,task_id:taskId};}
      if(taskId&&await commit(core.append(doc,row('task',reading.experiment.action,{target:reading.id,task_id:taskId})))) taskPending=null;
      render();
    },
    record(){go('record');}, privacy(){go('privacy');},
    forget(){confirmForget=true;render();root.querySelector('[data-ex-action="forget-cancel"]')?.focus();},
    'forget-cancel'(){confirmForget=false;render();root.querySelector('[data-ex-action="forget"]')?.focus();},
    async 'forget-confirm'(){
      if(!doc||busy)return;abortAI();busy=true;render();const token=epoch;
      let result=await files.remove(revision,controller?.signal);
      if(result.uncertain){const check=await files.read(controller?.signal);if(check.notFound)result={ok:true};}
      if(!validSession(token))return;busy=false;
      if(!result.ok)return status('The document changed or Dropbox could not confirm deletion. Reload before trying again.');
      doc=null;revision=null;draft='';imported='';incoming=null;snapshot=null;retryId=null;draftWorkspace=null;forgot=true;view='conversation';trail=[];confirmForget=false;taskPending=null;setupQuestion='';retryReading=false;suggestionMessage='';
      decorate();render();byId('exTitle')?.focus();
    },
    export(){if(doc)download('life-exploration.md',core.stringify(doc));},
    'draft-export'(){download('exploration-unsent.md',draft||(!doc?setupQuestion:''));},'draft-clear'(){draft='';draftWorkspace=null;render();}
  };
  async function chooseStep(button,decision){
    const retained=core.activeStep(doc,liveSources);
    if(!retained||busy||pendingReading||retained.reading.id!==button.dataset.stepId)return;
    if(await commit(core.append(doc,row('step','',{target:retained.reading.id,decision}))))render();
  }
  Today.ui.register('click','exploration.action',(event,button)=>{event.stopPropagation();if(button.dataset.exNav){navigation++;view=button.dataset.exAction;trail=view==='conversation'?[]:[{view:'conversation',scroll:0}];confirmForget=false;render();root?.querySelector('.ex-sheet-scroll')?.classList.add('ex-view-in');byId('exViewTitle')?.focus({preventScroll:true});return;}if(!button.disabled)Promise.resolve(actions[button.dataset.exAction]?.(button)).catch(()=>{busy=false;status('The update could not be completed. Your document has not been replaced.');});});
  Today.ui.register('input','exploration.draft',(_event,input)=>{fitInput(input);promptFor(input.value);draft=input.value;draftWorkspace=doc?.workspace_id||null;const send=byId('exSend');if(send)send.disabled=!draft.trim()||busy||pendingReading;root.querySelectorAll('[data-ex-action="draft-export"],[data-ex-action="draft-clear"]').forEach(button=>{button.hidden=!draft;});});
  Today.ui.register('input','exploration.correction',(_event,input)=>{correctionText=input.value;});
  Today.ui.register('input','exploration.question',(_event,input)=>{fitInput(input);promptFor(input.value);setupQuestion=input.value;});
  const submits=event=>event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229&&!event.repeat;
  Today.ui.register('keydown','exploration.start-key',event=>{if(submits(event)){event.preventDefault();if(!busy)createDocument();}});
  Today.ui.register('keydown','exploration.reply-key',event=>{if(submits(event)){event.preventDefault();send();}});
  Today.ui.register('change','exploration.checkpoint',async(_event,input)=>{
    const file=input.files?.[0];if(!file||!doc||busy||pendingReading)return;
    if(file.size>core.limit)return status('Choose a Markdown document smaller than 500 KB.');
    const token=epoch,workspace=doc.workspace_id,text=await file.text();if(!validSession(token)||doc.workspace_id!==workspace)return;
    try{const next={...doc,schema_version:3,revision:doc.revision+1,updated_at:now(),source_revision:id(),source_md:doc.source_md+'\n\n## Checkpoint added '+now()+'\n'+text};if(await commit(next)){retryId=null;status('Earlier notes added. Previous readings are withheld until you reply with this new context.');}}
    catch(_){busy=false;status('This checkpoint would exceed the document limit. Your existing document stays.');}
  });
  document.addEventListener('keydown',event=>{
    if(!opened||!root||root.hidden)return;
    const inside=root.contains(document.activeElement);
    if(event.key==='Escape'&&(inside||phone.matches)&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();if(trail.length)leave();return;}
  },true);
  [wide,phone].forEach(query=>query.addEventListener('change',()=>{modality();sidebar().fitViewport();render();}));
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{if(root)animateThinking();});
  document.addEventListener('today:memory-change',()=>refreshSources());
  document.addEventListener('today:memory-ready',()=>refreshSources());
  window.addEventListener('storage',event=>{if(event.key==='today_memory')refreshSources();});
  document.addEventListener('today:dropbox-disconnected',()=>{wipe();if(opened)status('Connect Dropbox to reopen your exploration.');});
  window.addEventListener('storage',event=>{if(['dropbox_refresh_token','dropbox_token'].includes(event.key)&&grant()!==activeGrant){wipe();if(opened)status('The Dropbox connection changed. Reopen the document.');}});
  Today.use('sidebar').register('explore', {
    mount: _mount,
    unmount() { const place = origin; hide(); host?.restore?.(place); },
    label: 'Explore', icon: '✦︎', order: 1,
  });
  Today.define('exploration',{open,hide:()=>sidebar().close(true),close,isOpen:()=>opened,refreshSources,clearInfluence(){if(sidebar().isOpen('explore'))sidebar().close(true);wipe();},document:()=>doc,decorate});
})();
