// Task-bound web/Trello context. Cache and withholding stay on this device.
(function() {
  'use strict';
  const CACHE_PREFIX = 'agent_enrichment_';
  const CACHE_VERSION = 3;
  const MAX_AGE = 30 * 86400000;
  const TRIGGER_RE = /https?:\/\/|\b(book|order|where|directions|price|hours|find|look\s+up|compare|research|navigate|reserve|schedule|answer|reply|call|contact|email|message|reach\s+out|follow\s+up|respond|check\s+in)\b/i;
  const _inflight = new Map();
  let _focusView = null;

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
  const _enrichShouldTrigger = text => typeof text === 'string' && text.length <= 500 && TRIGGER_RE.test(text);

  function _agentEnrichTask(taskId, taskText) {
    if (_task(taskId)?.text !== taskText || !_enrichShouldTrigger(taskText) || _getCache(taskId)) return Promise.resolve();
    const source = _sourceKey();
    const prior = _inflight.get(taskId);
    if (prior && prior.text === taskText && prior.source === source) return prior.promise;
    prior?.controller.abort();
    const request = { text:taskText, source, controller:new AbortController() };
    const cache = localStorage.getItem(CACHE_PREFIX + taskId);
    _inflight.set(taskId, request);
    const current = () => _inflight.get(taskId) === request && !request.controller.signal.aborted
      && _task(taskId)?.text === taskText && _sourceKey() === source
      && cache === localStorage.getItem(CACHE_PREFIX + taskId);
    request.promise = (async () => {
      const timeout = setTimeout(() => request.controller.abort(), 26000);
      try {
        const res = await fetch('/.netlify/functions/task-enrich', {
          method:'POST', headers:{ 'Content-Type':'application/json' }, signal:request.controller.signal,
          body:JSON.stringify({ taskText, ..._source() }),
        });
        if (!current() || !res.ok) return;
        const data = await res.json();
        if (!current() || !data || !Object.hasOwn(data, 'card')) return;
        const card = _card(data.card);
        if (data.card !== null && !card) return; // malformed is retryable, not a negative result
        if (_setCache(taskId, { v:CACHE_VERSION, state:card ? 'success' : 'no_result', card,
          taskText, boardId:JSON.parse(source).trelloBoardId, fetchedAt:Date.now() }) && card) _agentUpdateIndicator(taskId, true);
      } catch (_) { /* Transient failures stay retryable. */ }
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
    const focusControl = document.activeElement?.matches('.focus-agent-feedback');
    _agentCleanupCache();
    document.querySelectorAll('.agent-indicator').forEach(el => el.remove());
    Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => _agentUpdateIndicator(k.slice(CACHE_PREFIX.length)));
    if (focusId) {
      const entry = _getCache(focusId);
      const button = document.querySelector('#focusAgentBlock .focus-agent-feedback');
      if (_focusView && _viewCurrent(_focusView) && entry?.card
          && button?.dataset.cardId === _identity(entry) && button.dataset.state === entry.state) return;
      _agentRenderFocusBlock(focusId, _task(focusId)?.text || '');
      if (focusControl) document.querySelector('#focusAgentBlock .focus-agent-feedback')?.focus({preventScroll:true});
    }
  }
  function _closeFocus() {
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
    _closeFocus();
    _shortcut(null);
    const view = _focusView = { id:taskId, text:taskText, source:_sourceKey() };
    if (!_viewCurrent(view)) return;
    const cached = _getCache(taskId);
    if (cached?.card) { _doRenderBlock(block, cached, view); return; }
    if (!cached && _enrichShouldTrigger(taskText)) _agentEnrichTask(taskId, taskText).then(() => {
      const entry = _getCache(taskId);
      if (_viewCurrent(view) && entry?.card) _doRenderBlock(block, entry, view);
    });
  }
  const _identity = entry => JSON.stringify([entry.taskText, entry.boardId, entry.card, entry.fetchedAt]);
  function _shortcut(cta) {
    const ai = document.querySelector('.focus-ai-timer-btn');
    if (!ai || ai.closest('.ai-active')) return;
    if (document.querySelector('#focusGmailBlock:not([hidden]) .focus-gmail-draft-btn')) cta = { label:'Draft reply' };
    ai.textContent = '✦︎ ' + (cta ? cta.label.toLowerCase() : 'ask');
    ai.setAttribute('aria-label', cta ? cta.label + ' context source' : 'Ask for focus help');
  }
  function _feedback(event, button) {
    event.preventDefault();
    event.stopImmediatePropagation(); // Replacement detaches the old target before document focus handlers run.
    const view = _focusView;
    if (!view || !_viewCurrent(view)) return;
    const block = document.getElementById('focusAgentBlock');
    const entry = _getCache(view.id);
    if (!entry?.card || !block?.contains(button) || button.dataset.cardId !== _identity(entry)) return;
    const hide = button.dataset.hide === 'true';
    entry.state = hide ? 'hidden' : 'success';
    delete entry.hiddenAt; // discard obsolete pre-release metadata
    if (!_setCache(view.id, entry)) return;
    _agentUpdateIndicator(view.id, false);
    _doRenderBlock(block, entry, view, hide);
    block.querySelector('.focus-agent-feedback')?.focus();
    if (window._a11yAnnounce) _a11yAnnounce(hide ? 'Context hidden for this task. Undo is available.' : 'Context restored for this task.');
  }
  function _doRenderBlock(block, entry, view, undo) {
    if (!_viewCurrent(view)) return;
    block.innerHTML = '';
    const card = entry.card;
    const hidden = entry.state === 'hidden';
    if (hidden) {
      const status = document.createElement('div');
      status.className = 'focus-agent-body';
      status.textContent = 'Context hidden for this task.';
      block.appendChild(status);
    } else {
      const meta = document.createElement('div');
      meta.className = 'focus-agent-meta';
      const icon = document.createElement('span');
      icon.className = 'focus-agent-icon'; icon.textContent = card.icon;
      meta.appendChild(icon);
      const headline = document.createElement('span');
      headline.className = 'focus-agent-headline'; headline.textContent = card.headline;
      meta.appendChild(headline); block.appendChild(meta);
      if (card.body) {
        const body = document.createElement('div');
        body.className = 'focus-agent-body'; body.textContent = card.body;
        block.appendChild(body);
      }
    }
    const actions = document.createElement('div');
    actions.className = 'focus-agent-actions';
    if (!hidden && card.cta) {
      const link = document.createElement('a');
      link.className = 'focus-agent-link'; link.textContent = card.cta.label + ' ↗';
      link.href = card.cta.href; link.target = '_blank'; link.rel = 'noopener';
      actions.appendChild(link);
    }
    actions.insertAdjacentHTML('beforeend', '<button type="button" class="focus-agent-feedback" data-today-click="enrichment.feedback"></button>');
    const button = actions.lastElementChild;
    button.dataset.cardId = _identity(entry);
    button.dataset.state = entry.state;
    button.dataset.hide = String(!hidden);
    button.textContent = hidden ? undo ? 'undo' : 'show context' : 'not useful';
    button.setAttribute('aria-label', button.textContent + (hidden ? ' — restore context for this task' : ' — hide this context for this task'));
    block.appendChild(actions);
    block.hidden = false;
    _shortcut(hidden ? null : card.cta);
    if (window._focusExpandTimer) _focusExpandTimer();
  }

  Today.define('task-enrich', { closeFocus:_closeFocus });
  Today.ui.register('click', 'enrichment.feedback', _feedback);
  window.addEventListener('storage', event => {
    if (!event.key || event.key.startsWith(CACHE_PREFIX) || ['trello_config','trello_token','today_ai_key_claude'].includes(event.key)) _agentRestoreAllIndicators();
  });
  window._agentEnrichTask = _agentEnrichTask;
  window._agentUpdateIndicator = _agentUpdateIndicator;
  window._agentRestoreAllIndicators = _agentRestoreAllIndicators;
  window._agentRenderFocusBlock = _agentRenderFocusBlock;
  window._agentCleanupCache = _agentCleanupCache;
})();
