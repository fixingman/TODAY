// Task-bound web/Trello context. Cache and withholding stay on this device.
(function() {
  'use strict';
  const CACHE_PREFIX = 'agent_enrichment_';
  const CACHE_VERSION = 3;
  const MAX_AGE = 30 * 86400000;
  const TRIGGER_RE = /https?:\/\/|\b(book|order|where|directions|price|hours|find|look\s+up|compare|research|navigate|reserve|schedule|answer|reply|call|contact|email|message|reach\s+out|follow\s+up|respond|check\s+in)\b/i;
  const _inflight = new Map();
  let _focusView = null, _feedbackComponent = null, _feedbackLoading = null, _feedbackEpoch = 0;

  const _task = id => (typeof manualTasks !== 'undefined' ? manualTasks : []).find(t => t.id === id);
  const _owner = id => _task(id) || (typeof soonTasks !== 'undefined' ? soonTasks : []).find(t => t.id === id)
    || (typeof pastTasks !== 'undefined' ? pastTasks : []).find(t => t.id === id);
  function _source() {
    const token = localStorage.getItem('trello_token') || '';
    const boardId = token ? (safeJSON('trello_config', {}) || {}).boardId || '' : '';
    return { apiKey:Today.use('connections')._aiGetKey('claude'), trelloToken:token, trelloBoardId:boardId };
  }
  const _sourceKey = () => JSON.stringify(_source()); // transient; never stored
  function _card(value) {
    if (!value || typeof value.headline !== 'string' || !value.headline.trim()) return null;
    let cta = null;
    if (value.cta && typeof value.cta.href === 'string' && value.cta.href.startsWith('https://')) {
      try {
        const href = new URL(value.cta.href.slice(0, 500));
        if (href.protocol === 'https:') cta = { label:String(value.cta.label || 'Open').slice(0, 10), href:href.href };
      } catch (_) {}
    }
    return { icon:String(value.icon || '↗').slice(0, 8), headline:value.headline.slice(0, 40),
      body:typeof value.body === 'string' ? value.body.slice(0, 80) : '', cta };
  }
  function _getCache(taskId) {
    const key = CACHE_PREFIX + taskId;
    try {
      const entry = JSON.parse(localStorage.getItem(key) || 'null');
      if (!entry) return null;
      const task = _owner(taskId);
      if (!task || entry.v !== CACHE_VERSION || entry.taskText !== task.text
          || entry.boardId !== _source().trelloBoardId
          || !Number.isFinite(entry.fetchedAt) || Date.now() - entry.fetchedAt > MAX_AGE
          || entry.fetchedAt > Date.now() + 60000
          || !['success','hidden','no_result'].includes(entry.state)
          || (entry.state !== 'no_result' && !_card(entry.card))) {
        localStorage.removeItem(key);
        return null;
      }
      entry.card = entry.state !== 'no_result' ? _card(entry.card) : null;
      return entry;
    } catch (_) { localStorage.removeItem(key); return null; }
  }
  function _agentCleanupCache() {
    const entries = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
      .map(key => ({ key, entry:_getCache(key.slice(CACHE_PREFIX.length)) }))
      .filter(row => row.entry).sort((a,b) => b.entry.fetchedAt - a.entry.fetchedAt || a.key.localeCompare(b.key));
    let bytes = 0;
    entries.forEach((row, i) => {
      bytes += new TextEncoder().encode(row.key + (localStorage.getItem(row.key) || '')).length;
      if (i >= 60 || bytes > 200000) localStorage.removeItem(row.key);
    });
    for (const [id, request] of _inflight) {
      if (_task(id)?.text !== request.text || _sourceKey() !== request.source) {
        request.controller.abort();
        _inflight.delete(id);
      }
    }
    if (_focusView && (_task(_focusView.id)?.text !== _focusView.text || _focusView.source !== _sourceKey())) {
      _closeFocus();
      _shortcut(null);
    }
  }
  function _setCache(taskId, entry) {
    try {
      localStorage.setItem(CACHE_PREFIX + taskId, JSON.stringify(entry));
      _agentCleanupCache();
      return !!_getCache(taskId);
    } catch (_) { return false; }
  }
  function _entries() {
    return Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX))
      .map(key => ({id:key.slice(CACHE_PREFIX.length),entry:_getCache(key.slice(CACHE_PREFIX.length))})).filter(row => row.entry);
  }
  function _feedbackChanged() {
    _feedbackEpoch++;
    for (const request of _inflight.values()) request.controller.abort();
    _inflight.clear();
  }
  function _clearFeedback() {
    _feedbackChanged();
    _agentCleanupCache();
    for (const {id,entry} of _entries()) if (entry.wording) { delete entry.wording; _setCache(id,entry); }
    if (_focusView) {
      _focusView.wordingUndo = null; _focusView.wordingSequence = (_focusView.wordingSequence || 0) + 1;
      const entry = _getCache(_focusView.id);
      if (entry?.card) _renderFocus(entry,_focusView);
    }
  }
  function _feedback() {
    return _feedbackLoading ||= import('/assets/enrichment-feedback.js').then(() => {
      return _feedbackComponent = Today.use('enrichment-feedback').create({
        entries:_entries,view:() => _focusView,get:_getCache,set:_setCache,current:_viewCurrent,identity:_identity,
        revision:id => localStorage.getItem(CACHE_PREFIX + id),changed:_feedbackChanged,
        clear:_clearFeedback,indicator:_agentUpdateIndicator,retry:(view,entry) => _agentEnrichTask(view.id,view.text,{view,entry}),
      });
    }).catch(error => { _feedbackLoading = null; throw error; });
  }
  const _enrichShouldTrigger = text => typeof text === 'string' && text.length <= 500 && TRIGGER_RE.test(text);

  function _agentEnrichTask(taskId, taskText, retry = null) {
    const existing = _getCache(taskId);
    if (_task(taskId)?.text !== taskText || !_enrichShouldTrigger(taskText) || (!retry && existing)
        || (retry && (!_viewCurrent(retry.view) || existing?.state !== 'hidden'
          || _identity(existing) !== _identity(retry.entry) || doneIds.has(taskId)))) return Promise.resolve('stale');
    const source = _sourceKey();
    const prior = _inflight.get(taskId);
    if (prior && prior.text === taskText && prior.source === source) return prior.promise;
    prior?.controller.abort();
    const request = { text:taskText, source, controller:new AbortController(), view:retry?.view, epoch:_feedbackEpoch };
    const cache = localStorage.getItem(CACHE_PREFIX + taskId);
    _inflight.set(taskId, request);
    const current = () => _inflight.get(taskId) === request && !request.controller.signal.aborted
      && _task(taskId)?.text === taskText && _sourceKey() === source
      && cache === localStorage.getItem(CACHE_PREFIX + taskId) && request.epoch === _feedbackEpoch
      && (!request.support || request.support === _feedbackComponent.snapshot().stamp)
      && (!retry || _viewCurrent(retry.view));
    request.promise = (async () => {
      const timeout = setTimeout(() => request.controller.abort(), 26000);
      try {
        const help = await Promise.race([_feedback(),new Promise((_,reject) => {
          request.controller.signal.addEventListener('abort',() => reject(new DOMException('Aborted','AbortError')),{once:true});
        })]);
        const support = help.snapshot(); request.support = support.stamp;
        if (!current()) return 'stale';
        const res = await fetch('/.netlify/functions/task-enrich', {
          method:'POST', headers:{ 'Content-Type':'application/json' }, signal:request.controller.signal,
          body:JSON.stringify({ taskText, ..._source(), ...(support.concerns.length ? {wordingConcerns:support.concerns} : {}),
            ...(retry ? {avoidSource:help.avoidSource(retry.entry)} : {}) }),
        });
        if (!current()) return 'stale';
        if (!res.ok) return 'failed';
        const data = await res.json();
        if (!current()) return 'stale';
        if (!data || !Object.hasOwn(data,'card')) return 'failed';
        const card = _card(data.card);
        if (data.card !== null && !card) return 'failed';
        if (retry && (!card || JSON.stringify(card) === JSON.stringify(_card(existing.card)))) return 'empty';
        if (_setCache(taskId, { v:CACHE_VERSION, state:card ? 'success' : 'no_result', card,
          taskText, boardId:JSON.parse(source).trelloBoardId, fetchedAt:Date.now(),
          ...(retry && help.wording(existing) ? {wording:help.wording(existing)} : {}) })) {
          if (card) _agentUpdateIndicator(taskId,true);
          return 'updated';
        }
        return 'failed';
      } catch (_) { return current() ? 'failed' : 'stale'; }
      finally {
        clearTimeout(timeout);
        if (_inflight.get(taskId) === request) _inflight.delete(taskId);
      }
    })();
    return request.promise;
  }

  function _agentUpdateIndicator(taskId, fresh) {
    const taskEl = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
    if (!taskEl) return;
    taskEl.querySelector('.agent-indicator')?.remove();
    if (!_task(taskId)) return;
    const cached = _getCache(taskId);
    if (!cached?.card || cached.state === 'hidden') return;
    const span = document.createElement('span');
    span.className = 'agent-indicator';
    span.textContent = '↗';
    span.setAttribute('aria-label', 'Web context available — start a focus session');
    const textEl = taskEl.querySelector('.task-text');
    const tail = textEl?.querySelector('.task-tail');
    if (tail) textEl.insertBefore(span, tail);
    else textEl?.appendChild(span);
    if (fresh) _playEnrichmentArrival(span);
  }
  function _agentRestoreAllIndicators() {
    const focusId = _focusView?.id;
    const active = document.activeElement;
    const focusControl = active?.matches('.focus-agent-feedback') ? {action:active.dataset.todayClick,concern:active.dataset.concern} : null;
    _agentCleanupCache();
    document.querySelectorAll('.agent-indicator').forEach(el => el.remove());
    Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => _agentUpdateIndicator(k.slice(CACHE_PREFIX.length)));
    if (focusId) {
      const entry = _getCache(focusId);
      const button = document.querySelector('#focusAgentBlock .focus-agent-feedback');
      if (_focusView && _viewCurrent(_focusView) && entry?.card
          && button?.dataset.cardId === _identity(entry) && button.dataset.state === entry.state
          && button.dataset.wording === JSON.stringify(entry.wording || null)
          && _focusView.guidanceStamp === _feedbackComponent?.snapshot().stamp) return;
      _agentRenderFocusBlock(focusId, _task(focusId)?.text || '');
      if (focusControl) _feedbackComponent?.focus(focusControl.action,focusControl.concern);
    }
  }
  function _closeFocus() {
    for (const [id,request] of _inflight) if (request.view && request.view === _focusView) {
      request.controller.abort(); _inflight.delete(id);
    }
    _focusView = null;
    const block = document.getElementById('focusAgentBlock');
    if (block) { block.hidden = true; block.innerHTML = ''; }
  }
  function _viewCurrent(view) {
    return _focusView === view && _task(view.id)?.text === view.text && view.source === _sourceKey()
      && !!document.querySelector('.task.focused[data-taskid="' + CSS.escape(view.id) + '"]');
  }
  function _agentRenderFocusBlock(taskId, taskText) {
    const block = document.getElementById('focusAgentBlock');
    if (!block) return;
    const prior = _focusView;
    const retain = prior && _viewCurrent(prior) && prior.id === taskId && prior.text === taskText;
    _closeFocus();
    _shortcut(null);
    const view = _focusView = { id:taskId, text:taskText, source:_sourceKey(),
      wordingOpen:retain && prior.wordingOpen,retryUsed:retain && prior.retryUsed };
    if (!_viewCurrent(view)) return;
    const cached = _getCache(taskId);
    if (cached?.card) { _renderFocus(cached,view); return; }
    if (!cached && _enrichShouldTrigger(taskText)) _agentEnrichTask(taskId, taskText).then(() => {
      const entry = _getCache(taskId);
      if (_viewCurrent(view) && entry?.card) _renderFocus(entry,view);
    });
  }
  const _identity = entry => JSON.stringify([entry.v,entry.taskText,entry.boardId,entry.card,entry.fetchedAt]);
  function _shortcut(cta) { _feedbackComponent?.shortcut(cta); }
  function _renderFocus(entry, view, undo = false) {
    if (_feedbackComponent) _feedbackComponent.render(entry,view,undo);
    else _feedback().then(help => { if (_viewCurrent(view)) help.render(entry,view,undo); }).catch(() => {});
  }

  Today.define('task-enrich', { closeFocus:_closeFocus, clearFeedback:_clearFeedback });
  window.addEventListener('storage', event => {
    if (!event.key || event.key.startsWith(CACHE_PREFIX) || ['trello_config','trello_token','today_ai_key_claude'].includes(event.key)) {
      _feedbackChanged(); _agentRestoreAllIndicators();
    }
  });
  window._agentEnrichTask = _agentEnrichTask;
  window._agentUpdateIndicator = _agentUpdateIndicator;
  window._agentRestoreAllIndicators = _agentRestoreAllIndicators;
  window._agentRenderFocusBlock = _agentRenderFocusBlock;
  window._agentCleanupCache = _agentCleanupCache;
})();
