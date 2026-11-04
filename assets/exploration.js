// Explicitly opened exploration session. Dropbox is canonical; page-held drafts are never backed up.
(function () {
  'use strict';
  const core = Today.use('exploration-core');
  const files = Today.use('exploration-files');
  const h = value => esc(String(value == null ? '' : value));
  const byId = id => document.getElementById(id);
  const action = (name, label, data = '') => `<button type="button" class="memory-item-btn" data-today-click="exploration.action" data-ex-action="${name}" ${data}>${label}</button>`;
  const now = () => new Date().toISOString();
  const id = () => crypto.randomUUID();
  const grant = () => localStorage.getItem('dropbox_refresh_token') || localStorage.getItem('dropbox_token') || '';
  const connection = () => Today.use('connections');
  let doc = null, revision = null, draft = '', draftWorkspace = null, imported = '', incoming = null, includeIncoming = false;
  let host = null, root = null, origin = null, notes = false, busy = false, message = '', epoch = 0;
  let controller = null, aiController = null, pendingReading = false, activeGrant = '', retryId = null;
  let snapshot = null, forgot = false, opened = false, loaded = false, confirmForget = false;
  let experiment = false, correction = false, showRecord = false, showPrivacy = false, setupQuestion = '';
  let taskPending = null, liveSources = [], sourceGeneration = 0, pendingSources = [];
  const dataContext=()=>Today.use('exploration-context');
  let visitStart = 0, sourceWindow = 50, offeredTasks = [];
  const status = text => { message = text; render(); };
  function ensureRoot() {
    if (!byId('explorationStyles')) {
      const style = document.createElement('link'); style.id = 'explorationStyles'; style.rel = 'stylesheet'; style.href = '/assets/exploration.css'; document.head.append(style);
    }
    root = byId('explorationRoot');
    if (!root) { root = document.createElement('section'); root.id = 'explorationRoot'; root.hidden = true; byId('memoryPanel').append(root); }
  }
  const validSession = token => opened && token === epoch && activeGrant === grant();
  function abortAI() { aiController?.abort(); aiController = null; pendingReading = false; }
  function wipe() {
    liveSources=[];sourceGeneration++;pendingSources=[];
    epoch++; controller?.abort(); abortAI(); doc = null; revision = null; draft = ''; imported = ''; incoming = null;
    snapshot = null; retryId = null; taskPending = null; activeGrant = ''; busy = false; forgot = false; loaded = false;
    setupQuestion = ''; draftWorkspace = null; notes = false; confirmForget = false; offeredTasks = [];
    if (root) root.replaceChildren(); decorate();
  }
  function hide() {
    opened = false; epoch++; controller?.abort(); abortAI(); busy = false;
    if (root) { root.hidden = true; root.replaceChildren(); }
    ['memoryTitleRow','memoryContent','memoryFooter'].forEach(name=>{const node=byId(name);if(node)node.hidden=false;});
    byId('memoryPanel')?.classList.remove('exploration-active');
    byId('memoryPanel')?.setAttribute('aria-labelledby','memoryTitle');
  }
  function leave() {
    if (notes) { notes = false; correction = false; render(); byId('exNotes')?.focus(); return; }
    const place = origin; hide();
    host.restore(place);
  }
  async function open(hooks, place, context) {
    ensureRoot(); host = hooks; origin = place; opened = true; notes = false; forgot = false; message = '';
    incoming = context || null; includeIncoming = false; correction = false; showRecord = false; showPrivacy = false;
    byId('memoryPanel').classList.add('exploration-active');
    ['memoryTitleRow','memoryContent','memoryFooter'].forEach(name=>{byId(name).hidden=true;});
    byId('memoryPanel').setAttribute('aria-labelledby','exTitle'); root.hidden = false;
    await load();
  }
  async function load() {
    const token = ++epoch; controller?.abort(); abortAI(); controller = new AbortController(); activeGrant = grant();
    busy = true; render();
    const result = await files.read(controller.signal);
    if (!validSession(token)) return;
    busy = false; loaded = true;
    if (result.ok) {
      try { doc = core.parse(result.text); revision = result.rev; imported = ''; visitStart = doc.entries.length; }
      catch (_) { doc = null; revision = result.rev; imported = result.text; message = 'This Markdown needs importing before TODAY can update it. Its contents will be preserved.'; }
    } else if (result.notFound) { doc = null; revision = null; }
    else message = 'Connect Dropbox or come back online to open your exploration.';
    await refreshSources(false);if(!validSession(token))return;
    render(); decorate(); byId('exTitle')?.focus();
  }
  async function commit(next) {
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
      render(); return false;
    }
    doc = next; revision = result.rev; message = 'Kept in your Dropbox'; decorate(); return true;
  }
  function row(kind, text, extra = {}) { return {id:id(),kind,text,at:now(),...extra}; }
  function chosenReading() { return doc ? core.current(doc,liveSources) : null; }
  function selectedSources(){return doc?.today_context?.enabled ? dataContext().select(liveSources,doc.question+' '+(doc.entries.filter(row=>row.kind==='observation').at(-1)?.text||''),doc.today_context.excluded,doc.today_context.included||[]) : [];}
  async function refreshSources(update=true){
    if(!opened||!doc)return;
    const token=epoch,generation=++sourceGeneration,prior=chosenReading();
    let next;try{next=await host.sources();}catch(_){if(validSession(token)&&generation===sourceGeneration){abortAI();liveSources=[];message='TODAY context is unavailable. Your notes stay; reopen to retry.';if(update)render();}return;}
    if(!validSession(token)||generation!==sourceGeneration)return;
    const changed=JSON.stringify(next.map(row=>[row.id,row.signature]))!==JSON.stringify(liveSources.map(row=>[row.id,row.signature]));
    liveSources=next;
    if(changed&&pendingReading&&!dataContext().supports(pendingSources,next)){abortAI();message='TODAY’s sources changed. Your words are kept; ask again with the current context.';}
    if(prior&&!chosenReading())message='A supporting TODAY record changed or is no longer available. Its earlier reading is withheld until the same supported records are available.';
    if(changed&&update)render();
  }
  function todayHTML(disabled){
    const policy=doc.today_context;
    if(!policy?.enabled)return `<div class="ex-today" id="exTodayContext"><p class="ex-muted">Connect relevant tasks, task records and Memory patterns to this question. Your AI receives up to eight selected records when you reply. Feelings, dreams, mail and Calendar stay separate.</p>${action('today-toggle','connect TODAY data',disabled)}</div>`;
    const chosen=selectedSources();
    const other=liveSources.filter(row=>row.selectable!==false&&!chosen.some(source=>source.id===row.id)&&!policy.excluded.includes(row.id));
    const browse=other.length?`<details><summary>choose other TODAY records · ${other.length}</summary>${other.map(source=>`<div class="memory-item"><span class="memory-item-text"><span class="ex-source">${h(source.source_type)}</span>${h(source.text)}</span>${action('today-pin','include',`data-today-source-id="${h(source.id)}" ${busy?'disabled':''}`)}</div>`).join('')}</details>`:'';
    const omitted=liveSources.filter(row=>policy.excluded.includes(row.id));
    return `<details class="ex-today" id="exTodayContext"><summary>TODAY context · ${chosen.length} records</summary><p class="ex-muted">Selected for the next reply from your question and latest words. Connections remain tentative. The original records stay in TODAY; source references and AI replies join this document. Replies may quote context and remain in its history until you forget it.</p>${[...chosen,...omitted].map(source=>`<div class="memory-item"><span class="memory-item-text"><span class="ex-source">${h(source.source_type)}${policy.excluded.includes(source.id)?' · left out':''}</span>${h(source.text)}<span class="ex-source">${h(source.selection_reason||'left out of this exploration')}</span></span>${action('today-source',policy.excluded.includes(source.id)?'include':'leave out',`data-today-source-id="${h(source.id)}" ${busy?'disabled':''}`)}</div>`).join('')||'<p>No close wording match is available yet. Your notes can still lead.</p>'}${browse}${action('today-toggle','disconnect TODAY data',disabled)}</details>`;
  }

  function controls() {
    return `<div class="ex-nav">${action('back', notes ? '← conversation' : h(origin?.label || '← memory'))}
      ${doc && !notes && !forgot ? action('notes','notes &amp; sources','id="exNotes"') : ''}</div>`;
  }
  function notice() { return `<p class="ex-status" role="status">${h(message || (busy ? 'Opening your exploration…' : ''))}</p>`; }
  function render() {
    if (!opened || !root) return;
    const setupChoice=byId('exUseToday')?.checked;
    const editing=root.contains(document.activeElement)&&document.activeElement.matches('textarea,input:not([type=file]):not([type=checkbox])')?{id:document.activeElement.id,value:document.activeElement.value,start:document.activeElement.selectionStart,end:document.activeElement.selectionEnd}:null;
    const todayOpen=!!byId('exTodayContext')?.open;
    const disabled = busy || pendingReading ? 'disabled' : '';
    const reading = chosenReading();
    let html = controls();
    if (forgot) html += '<h2 id="exTitle" tabindex="-1">Exploration forgotten</h2><p>The document was removed from Dropbox. Your daily tasks stay.</p>';
    else if (!doc) {
      html += `<h2 id="exTitle" tabindex="-1">Explore what matters</h2><p>A conversation you can return to, with one living document in your Dropbox.</p>${notice()}`;
      if (!grant()) html += action('connections','connect Dropbox');
      else if (!busy && loaded) html += `<div class="ex-setup"><label for="exQuestion">What would you like to explore?</label><input id="exQuestion" maxlength="500" value="${h(setupQuestion)}" placeholder="A question worth staying with">
        <p class="ex-muted">Your replies, AI readings, corrections and chosen context stay in ${h(files.path)} until you forget the document. Your connected AI receives the opening document and a bounded selection of included records when you reply. Feeling and dream stores are not imported.</p>
        <label class="memory-item-btn ex-file">${imported ? 'starting document selected' : 'import Markdown (optional)'}<input type="file" accept=".md,.txt,text/plain,text/markdown" data-today-change="exploration.import"></label>
        <label class="ex-muted"><input id="exUseToday" type="checkbox"> include relevant tasks and Memory records · up to eight records per reply; feelings and dreams stay separate</label>${action('create', imported ? 'start with this document' : 'start in Dropbox',disabled)}${action('reload','reload')}</div>`;
    } else {
      html += `<h2 id="exTitle" tabindex="-1">${h(doc.question)}</h2>${notice()}`;
      if (notes) html += notesHTML(reading, disabled);
      else {
        const sessionEntries = doc.entries.slice(visitStart);
        const latestUser = sessionEntries.filter(entry => entry.kind === 'observation').at(-1);
        const currentReply = reading && sessionEntries.some(entry=>entry.id === reading.id) ? reading : null;
        const recap = reading?.summary || 'We are keeping this question open. Bring an experience, a contradiction, or something you want to understand.';
        if (!latestUser && !currentReply) html += `<div class="ex-resume"><span class="memory-type-name">Where we left off</span><p>${h(recap)}</p></div>`;
        const earlier = doc.entries.slice(0,visitStart).filter(entry=>entry.kind === 'observation');
        if (earlier.length) html += `<details><summary>earlier words</summary>${earlier.slice(-12).map(entry=>`<p>${h(entry.text)}</p>`).join('')}</details>`;
        if (latestUser) html += `<div class="ex-turn ex-you"><span class="memory-type-name">You</span><p>${h(latestUser.text)}</p></div>`;
        if (currentReply) html += `<div class="ex-turn"><span class="memory-type-name">TODAY · unconfirmed</span><p>${h(currentReply.text)}</p>${action('changes','what changed →')}</div>`;
        else if (!reading && doc.entries.some(entry => entry.kind === 'reading')) html += '<p class="ex-muted">The earlier reading is withheld because its sources changed.</p>';
        if (draftWorkspace && draftWorkspace !== doc.workspace_id) html += '<p>Your draft belongs to a different document. Export or clear it before replying here.</p>';
        html += todayHTML(disabled);
        html += `<div class="ex-composer"><label for="exThought">${h(reading?.next_question || 'What has stayed with you, or happened since then?')}</label>
          <textarea id="exThought" rows="3" maxlength="8000" data-today-input="exploration.draft" data-today-keydown="exploration.reply-key" ${disabled}>${h(draft)}</textarea>
          ${incoming ? `<div class="ex-context"><span class="memory-type-name">${incoming.source_type === 'task' ? 'From your task' : 'AI reading · not your statement'}</span><p>${h(incoming.text)}</p>${action('include',includeIncoming ? 'leave out' : 'include in reply',disabled)}</div>` : ''}
          <div class="ex-send">${action('send',pendingReading ? 'thinking…' : 'reply →',`id="exSend" ${disabled} ${!draft.trim() || (draftWorkspace && draftWorkspace !== doc.workspace_id) ? 'disabled' : ''}`)}</div></div>`;
        if (retryId) html += action('retry-ai','retry reading',disabled);
      }
      html += `<div class="ex-tools">${action('reload','reload latest',disabled)}${action('export','export document')}${action('draft-export','export draft',draft ? '' : 'hidden')}${action('draft-clear','clear draft',draft ? disabled : 'hidden')}</div>`;
    }
    root.innerHTML = html;
    if(setupChoice!=null&&byId('exUseToday'))byId('exUseToday').checked=setupChoice;
    if(todayOpen&&byId('exTodayContext')?.tagName==='DETAILS')byId('exTodayContext').open=true;
    if(editing){const input=byId(editing.id);if(input&&!input.disabled){if(editing.id==='exCorrection')input.value=editing.value;input.focus({preventScroll:true});input.setSelectionRange(editing.start,editing.end);}}
  }
  function notesHTML(reading, disabled) {
    const edits = reading ? core.amendments(doc, reading.id) : [];
    const own = edits.at(-1);
    let html = `<section aria-labelledby="exNotesTitle"><h3 id="exNotesTitle" class="memory-type-name" tabindex="-1">Notes on this exploration</h3>
      <div class="memory-type-block"><h4 class="memory-type-name">Current reading</h4><p>${h(reading ? own?.text || reading.text : 'No current reading. Excluded evidence cannot silently return through an earlier interpretation.')}</p>
      ${reading ? `<p class="ex-muted">${own ? 'Your correction replaces wording; it does not verify the interpretation.' : 'AI interpretation · unconfirmed'}</p>${action('correct','correct this',disabled)}` : ''}
      ${correction ? `<label for="exCorrection">How would you put it?</label><textarea id="exCorrection" rows="3" maxlength="8000">${h(own?.text || reading?.text || '')}</textarea>${action('amend','keep correction',disabled)}${action('cancel-correction','cancel')}` : ''}
      ${edits.length ? `<details><summary>earlier versions</summary><p>${h(reading.text)}</p>${edits.map(entry=>`<p>${h(entry.text)}</p>`).join('')}</details>` : ''}</div>`;
    if (reading) html += `<div class="memory-type-block"><h4 class="memory-type-name">What changed</h4><p>${h(reading.summary)}</p><p class="ex-muted">Supporting records: ${h(reading.evidence_ids.join(', ') || 'opening document only')}. Your wording and earlier readings are preserved.</p></div>`;
    if(reading?.today_sources?.length)html+=`<details><summary>TODAY records used in this reading · ${reading.today_sources.length}</summary>${reading.today_sources.map(ref=>{const source=liveSources.find(row=>row.id===ref.id&&row.signature===ref.signature);return `<div class="memory-item"><span class="memory-item-text"><span class="ex-source">${h(source?.source_type||'source unavailable')} · ${h(ref.id)}</span>${h(source?.text||'This source is no longer available here.')}</span></div>`;}).join('')}</details>`;
    html += `<div class="memory-type-block"><h4 class="memory-type-name">What it draws on</h4><p class="ex-muted">The chosen starting document and up to 12 included observations/context snapshots are used. Long material is bounded; Connected TODAY context uses a bounded selection of tasks and eligible Memory records. Dreams, feelings, email and Calendar stores stay separate.</p>
      ${core.sources(doc).slice(-sourceWindow).map(entry=>`<div class="memory-item"><span class="memory-item-text"><span class="ex-source">${h(entry.id)} · ${entry.kind === 'observation' ? 'your words' : h(entry.source_type)}${core.included(doc,entry.id) ? '' : ' · left out'}</span>${h(entry.text)}</span>${action('source',core.included(doc,entry.id) ? 'leave out' : 'include',`data-entry-id="${h(entry.id)}" ${busy ? 'disabled' : ''}`)}</div>`).join('') || '<p>No observations recorded yet.</p>'}${core.sources(doc).length>sourceWindow?action('more-sources','show earlier sources'):''}</div>`;
    html += `<div class="memory-type-block"><h4 class="memory-type-name">Something to try</h4>${action('experiment','suggest something',disabled)}
      ${experiment && reading?.experiment ? `<p>${h(reading.experiment.question)}</p><p>${h(reading.experiment.action)}</p><p class="ex-muted">Signal: ${h(reading.experiment.signal)} · Effort: ${h(reading.experiment.effort)} · Review: ${h(reading.experiment.review)} · Stop: ${h(reading.experiment.stop)}</p>
        ${doc.entries.some(entry=>entry.kind === 'task' && entry.target === reading.id) ? '<p>Action linked. What it helps remains open.</p>' : action('task','add to Today',disabled)}` : ''}</div>`;
    offeredTasks = host.availableTasks();
    if (offeredTasks.length) html += `<div class="memory-type-block"><h4 class="memory-type-name">Bring a task</h4><p class="ex-muted">Choose a task snapshot to keep as context. It says nothing about how it felt. Nothing is sent to AI until you ask for a reading.</p>${offeredTasks.map((task,index)=>`<div class="memory-item"><span class="memory-item-text">${h(task.text)}</span>${action('task-context','include',`data-task-index="${index}" ${disabled}`)}</div>`).join('')}</div>`;
    html += todayHTML(disabled);
    html += `<div class="memory-type-block"><h4 class="memory-type-name">Add a checkpoint</h4><p class="ex-muted">Choose a Markdown document to append to this exploration’s starting material in Dropbox. Original notes stay. Nothing is sent to AI until you reply.</p><label class="memory-item-btn ex-file">import checkpoint<input type="file" accept=".md,.txt,text/plain,text/markdown" data-today-change="exploration.checkpoint" ${disabled}></label></div>`;
    html += `<div class="ex-tools">${action('record',showRecord ? 'hide document' : 'Markdown record')}${action('privacy',showPrivacy ? 'hide privacy' : 'privacy &amp; forget')}</div>
      ${showRecord ? `<pre>${h(core.stringify(doc))}</pre>` : ''}
      ${showPrivacy ? `<div class="ex-privacy"><p>This document lives in your Dropbox at ${h(files.path)}. It is held in this page while open, outside TODAY’s task backup. Updates need a connection. Reloading an unsent draft can lose it; export it first.</p>
        <p>Clearing Memory clears app links and pending AI work and withholds dependent readings; this separate document and its reply history stay. Replies may quote their sources. Forget the exploration to remove them. Forget removes this document and page-held records; Dropbox may retain recoverable versions under your account policy. Your tasks stay.</p>
        ${action('forget','forget exploration',disabled)}${confirmForget ? `<p>Remove this exploration document from Dropbox?</p>${action('forget-confirm','yes, forget',disabled)}${action('forget-cancel','keep it')}` : ''}</div>` : ''}</section>`;
    return html;
  }
  async function createDocument() {
    setupQuestion = byId('exQuestion')?.value.trim() || '';
    if (!setupQuestion) return status('Give the exploration a question first.');
    try {
      let next = imported.startsWith('<!-- today-exploration ') ? core.parse(imported) : core.create(setupQuestion, imported, id(), now());
      if(byId('exUseToday')?.checked)next={...next,schema_version:2,today_context:{enabled:true,epoch:id(),excluded:[]}};
      visitStart = next.entries.length;
      // Import preserves the workspace/history; destination is still protected by its current Dropbox revision.
      if (await commit(next)) { draftWorkspace = null; imported = ''; await refreshSources(false);render(); }
    } catch (_) { status('This document could not be imported. Use plain Markdown or a supported exploration export.'); }
  }
  async function send() {
    if (!doc || busy || pendingReading || !draft.trim() || (draftWorkspace && draftWorkspace !== doc.workspace_id)) return;
    let next = doc;
    try {
      if (includeIncoming && incoming) next = core.append(next,row('context',incoming.text,{source_type:incoming.source_type,source_id:incoming.source_id || null}));
      const observation = row('observation',draft.trim());
      next = core.append(next,observation);
      if (!await commit(next)) return;
      draft = ''; draftWorkspace = null; incoming = null; includeIncoming = false; retryId = observation.id;
      await ask(false);
    } catch (_) { busy = false; status('This document is too large or cannot accept the update. Export it before continuing.'); }
  }
  async function ask(wantExperiment) {
    if (!doc || busy || pendingReading) return;
    if (!connection()._aiIsConfigured()) { status('Connect your AI to receive a reading. Your observation is kept in Dropbox.'); return; }
    await refreshSources(false);if(!opened||!doc||busy||pendingReading)return;
    const token = epoch, baseRevision = revision, workspace = doc.workspace_id;
    const provider = connection()._aiGetProvider(), key = connection()._aiGetKey();
    const selectedLive=selectedSources();
    const selected = core.context(doc,liveSources,selectedLive); snapshot = selected;
    const previous = chosenReading();
    const sourceIds = [...new Set([...selected.records.filter(entry=>!selectedLive.some(source=>source.id===entry.id)).map(entry=>entry.id), ...(previous?.source_ids || previous?.evidence_ids || []).filter(id=>doc.entries.some(entry=>entry.id===id))])];
    pendingSources=[...new Map([...(previous?.today_sources||[]),...selectedLive.map(source=>({id:source.id,signature:source.signature}))].map(ref=>[ref.id,ref])).values()];
    pendingReading = true; const requestController = new AbortController(); aiController = requestController; render();
    const timeout = setTimeout(()=>requestController.abort(),25000);
    try {
      const result = await fetch('/.netlify/functions/ai-assist',{method:'POST',headers:{'Content-Type':'application/json'},signal:aiController.signal,
        body:JSON.stringify({provider,apiKey:key,systemPrompt:core.systemPrompt,messages:[{role:'user',content:JSON.stringify({context:selected,request:wantExperiment ? 'Suggest one small reversible experiment, with all six bounds.' : 'Continue the exploration from the latest observation. No experiment unless asked.'})}]})});
      const data = await result.json();
      const freshSources=await host.sources();
      if (!validSession(token) || aiController !== requestController || doc.workspace_id !== workspace || revision !== baseRevision || provider !== connection()._aiGetProvider() || key !== connection()._aiGetKey()) return;
      if(!dataContext().supports(pendingSources,freshSources)){liveSources=freshSources;throw new Error('sources-changed');}
      if (!result.ok || data.error) throw new Error('reply-unavailable');
      const reply = core.response(data.content || data.message,selected.records.map(entry=>entry.id));
      pendingReading = false;
      const entry = row('reading',reply.reply,{next_question:reply.next_question,summary:reply.summary,evidence_ids:reply.evidence_ids,source_ids:sourceIds,today_sources:pendingSources,today_epoch:doc.today_context?.epoch||'',opening_revision:doc.source_revision||'',
        experiment:wantExperiment ? reply.experiment : null});
      if (await commit(core.append(doc,entry))) { retryId = null; experiment = wantExperiment; }
    } catch (_) { if (validSession(token)) status('No reading to show yet. Your words are kept; you can retry.'); }
    finally { clearTimeout(timeout); if (aiController === requestController) {pendingReading = false; aiController = null; if (validSession(token)) render();} }
  }
  function download(name, content) {
    const url = URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  function decorate() { host?.changed?.(doc); }
  const actions = {
    async 'today-toggle'(){abortAI();const policy=doc.today_context||{enabled:false,excluded:[]};const next={...doc,schema_version:2,revision:doc.revision+1,updated_at:now(),today_context:{enabled:!policy.enabled,epoch:id(),excluded:policy.excluded,included:policy.included||[]}};if(await commit(next)){await refreshSources(false);render();}},
    async 'today-pin'(button){abortAI();const source=liveSources.find(row=>row.id===button.dataset.todaySourceId&&row.selectable!==false),policy=doc.today_context;if(!source||!policy)return;const ids=[...new Set([...(policy.included||[]).filter(id=>liveSources.some(row=>row.id===id&&row.selectable!==false)),source.id])];if(ids.length>8||ids.filter(id=>liveSources.find(row=>row.id===id)?.evidence_kind==='AI interpretation').length>2)return status('Choose up to eight records, including at most two AI readings. Leave one out to make room.');if(await commit({...doc,revision:doc.revision+1,updated_at:now(),today_context:{...policy,epoch:id(),included:ids,excluded:policy.excluded.filter(id=>id!==source.id)}}))render();},
    async 'today-source'(button){abortAI();const target=button.dataset.todaySourceId,policy=doc.today_context;if(!policy||!liveSources.some(source=>source.id===target))return;const excluded=policy.excluded.includes(target)?policy.excluded.filter(value=>value!==target):[...policy.excluded,target];if(excluded.length>96)return status('Disconnect TODAY context to clear all its influence.');if(await commit({...doc,revision:doc.revision+1,updated_at:now(),today_context:{...policy,epoch:id(),excluded,included:(policy.included||[]).filter(id=>id!==target)}}))render();},
    back:leave, notes(){notes=true;render();byId('exNotesTitle')?.focus();}, changes(){notes=true;render();byId('exNotesTitle')?.focus();},
    'more-sources'(){sourceWindow+=50;render();},
    async 'task-context'(button){const task=offeredTasks[Number(button.dataset.taskIndex)];if(!task||busy||!host.availableTasks().some(current=>current.id===task.id&&current.text===task.text))return;await commit(core.append(doc,row('context',task.text,{source_type:'task',source_id:task.id})));render();},
    connections(){hide();host.connections();}, reload:load, create:createDocument, send,
    include(){includeIncoming=!includeIncoming;render();},
    'retry-ai'(){return ask(false);}, experiment(){experiment=true;return ask(true);},
    correct(){correction=true;render();byId('exCorrection')?.focus();}, 'cancel-correction'(){correction=false;render();},
    async amend(){const value=byId('exCorrection')?.value.trim();const reading=chosenReading();if(value&&reading&&await commit(core.append(doc,row('amendment',value,{target:reading.id})))){correction=false;render();}},
    async source(button){abortAI();const target=button.dataset.entryId;if(doc&&await commit(core.append(doc,row('source','',{target,include:!core.included(doc,target)})))){message='Source choice kept; earlier dependent readings stay withheld.';render();}},
    async task(){
      const reading=chosenReading();if(!reading?.experiment||busy)return;
      let taskId=taskPending?.target===reading.id ? taskPending.task_id : null;
      if(!taskId){taskId=host.addTask(reading.experiment.action);taskPending={target:reading.id,task_id:taskId};}
      if(taskId&&await commit(core.append(doc,row('task',reading.experiment.action,{target:reading.id,task_id:taskId})))) taskPending=null;
      render();
    },
    record(){showRecord=!showRecord;render();}, privacy(){showPrivacy=!showPrivacy;render();},
    forget(){confirmForget=true;render();root.querySelector('[data-ex-action="forget-cancel"]')?.focus();},
    'forget-cancel'(){confirmForget=false;render();root.querySelector('[data-ex-action="forget"]')?.focus();},
    async 'forget-confirm'(){
      if(!doc||busy)return;abortAI();busy=true;render();const token=epoch;
      let result=await files.remove(revision,controller?.signal);
      if(result.uncertain){const check=await files.read(controller?.signal);if(check.notFound)result={ok:true};}
      if(!validSession(token))return;busy=false;
      if(!result.ok)return status('The document changed or Dropbox could not confirm deletion. Reload before trying again.');
      doc=null;revision=null;draft='';imported='';incoming=null;snapshot=null;retryId=null;draftWorkspace=null;forgot=true;notes=false;confirmForget=false;taskPending=null;setupQuestion='';offeredTasks=[];
      decorate();render();byId('exTitle')?.focus();
    },
    export(){if(doc)download('life-exploration.md',core.stringify(doc));},
    'draft-export'(){download('exploration-unsent.md',draft);},'draft-clear'(){draft='';draftWorkspace=null;render();}
  };
  Today.ui.register('click','exploration.action',(event,button)=>{event.stopPropagation();if(!button.disabled)Promise.resolve(actions[button.dataset.exAction]?.(button)).catch(()=>{busy=false;status('The update could not be completed. Your document has not been replaced.');});});
  Today.ui.register('input','exploration.draft',(_event,input)=>{draft=input.value;draftWorkspace=doc?.workspace_id||null;const send=byId('exSend');if(send)send.disabled=!draft.trim()||busy||pendingReading;root.querySelectorAll('[data-ex-action="draft-export"],[data-ex-action="draft-clear"]').forEach(button=>{button.hidden=!draft;});});
  Today.ui.register('keydown','exploration.reply-key',(event)=>{if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)&&!event.isComposing){event.preventDefault();send();}});
  Today.ui.register('change','exploration.import',async(_event,input)=>{const file=input.files?.[0];if(!file)return;if(file.size>core.limit)return status('Choose a Markdown document smaller than 500 KB.');setupQuestion=byId('exQuestion')?.value||setupQuestion;imported=await file.text();render();});
  Today.ui.register('change','exploration.checkpoint',async(_event,input)=>{
    const file=input.files?.[0];if(!file||!doc||busy||pendingReading)return;
    if(file.size>core.limit)return status('Choose a Markdown document smaller than 500 KB.');
    const token=epoch,workspace=doc.workspace_id,text=await file.text();if(!validSession(token)||doc.workspace_id!==workspace)return;
    try{const next={...doc,schema_version:2,revision:doc.revision+1,updated_at:now(),source_revision:id(),source_md:doc.source_md+'\n\n## Checkpoint added '+now()+'\n'+text};if(await commit(next)){retryId=null;render();}}
    catch(_){busy=false;status('This checkpoint would exceed the document limit. Your existing document stays.');}
  });
  document.addEventListener('today:memory-change',()=>refreshSources());
  document.addEventListener('today:memory-ready',()=>refreshSources());
  window.addEventListener('storage',event=>{if(event.key==='today_memory')refreshSources();});
  document.addEventListener('today:dropbox-disconnected',()=>{wipe();if(opened)status('Connect Dropbox to reopen your exploration.');});
  window.addEventListener('storage',event=>{if(['dropbox_refresh_token','dropbox_token'].includes(event.key)&&grant()!==activeGrant){wipe();if(opened)status('The Dropbox connection changed. Reopen the document.');}});
  Today.define('exploration',{open,hide,refreshSources,clearInfluence(){hide();wipe();},document:()=>doc,decorate});
})();
