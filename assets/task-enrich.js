// TODAY — Task agent enrichment (Stage 1: web search via Claude server tools).
// Fires on task add; shows ↗ indicator on task row; expands in focus mode.
(function() {
  'use strict';

  const CACHE_PREFIX = 'agent_enrichment_';
  const TRIGGER_RE   = /https?:\/\/|\b(book|order|where|directions|price|hours|find|look\s+up|compare|research|navigate|reserve|schedule|answer|reply|call|contact|email|message|reach\s+out|follow\s+up|respond|check\s+in)\b/i;
  const _inflight    = new Set();

  // ── Cache helpers ──────────────────────────────────────────────────────────
  function _getCache(taskId) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + taskId);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function _setCache(taskId, entry) {
    try { localStorage.setItem(CACHE_PREFIX + taskId, JSON.stringify(entry)); } catch(e) {}
  }

  // ── Pre-filter ─────────────────────────────────────────────────────────────
  function _enrichShouldTrigger(taskText) {
    return TRIGGER_RE.test(taskText);
  }

  // ── Enrichment ─────────────────────────────────────────────────────────────
  async function _agentEnrichTask(taskId, taskText) {
    if (!_enrichShouldTrigger(taskText)) return;

    const cached = _getCache(taskId);
    if (cached) return; // success or no_result — don't retry

    if (_inflight.has(taskId)) return;
    _inflight.add(taskId);

    try {
      const apiKey = typeof _aiGetKey === 'function' ? _aiGetKey('claude') : '';
      const res = await fetch('/.netlify/functions/task-enrich', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ taskText, apiKey }),
      });

      if (res.status === 429 || res.status >= 500) return; // transient — don't cache
      if (!res.ok) return;

      const data  = await res.json();
      const state = data.card ? 'success' : 'no_result';
      _setCache(taskId, { state, card: data.card || null, taskText, fetchedAt: Date.now() });

      if (data.card) _agentUpdateIndicator(taskId);
    } catch(e) {
      // Network error — don't cache; will retry next load
    } finally {
      _inflight.delete(taskId);
    }
  }

  // ── Task-row indicator ─────────────────────────────────────────────────────
  function _agentUpdateIndicator(taskId) {
    const taskEl = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
    if (!taskEl) return;
    taskEl.querySelector('.agent-indicator')?.remove();

    const cached = _getCache(taskId);
    if (!cached || cached.state !== 'success' || !cached.card) return;

    const span = document.createElement('span');
    span.className = 'agent-indicator';
    span.textContent = '↗';
    span.setAttribute('aria-label', 'Web context available — start a focus session');
    const textEl = taskEl.querySelector('.task-text');
    const tail   = textEl && textEl.querySelector('.task-tail');
    if (tail) textEl.insertBefore(span, tail);
    else if (textEl) textEl.appendChild(span);
  }

  function _agentRestoreAllIndicators() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => _agentUpdateIndicator(k.replace(CACHE_PREFIX, '')));
  }

  // ── Focus block ─────────────────────────────────────────────────────────────
  function _agentRenderFocusBlock(taskId, taskText) {
    const block = document.getElementById('focusAgentBlock');
    if (!block) return;

    const cached = _getCache(taskId);
    if (cached && cached.state === 'success' && cached.card) {
      _doRenderBlock(block, cached.card);
      return;
    }

    block.hidden   = true;
    block.innerHTML = '';

    // Not cached yet — fetch on demand if the task would trigger enrichment
    if (!taskText || !_enrichShouldTrigger(taskText) || cached) return;
    block.dataset.agentTaskId = taskId;
    const requestTaskId = taskId;
    _agentEnrichTask(taskId, taskText).then(function() {
      const c = _getCache(taskId);
      if (!c || !c.card) return;
      const b = document.getElementById('focusAgentBlock');
      if (b && b.dataset.agentTaskId === requestTaskId) _doRenderBlock(b, c.card);
    });
  }

  function _doRenderBlock(block, card) {
    block.innerHTML = '';

    const meta = document.createElement('div');
    meta.className = 'focus-agent-meta';

    const icon = document.createElement('span');
    icon.className   = 'focus-agent-icon';
    icon.textContent = (card.icon || '↗').slice(0, 8);
    meta.appendChild(icon);

    const headline = document.createElement('span');
    headline.className   = 'focus-agent-headline';
    headline.textContent = (card.headline || '').slice(0, 40);
    meta.appendChild(headline);
    block.appendChild(meta);

    if (card.body) {
      const bodyEl = document.createElement('div');
      bodyEl.className   = 'focus-agent-body';
      bodyEl.textContent = card.body.slice(0, 80);
      block.appendChild(bodyEl);
    }

    if (card.cta && typeof card.cta.href === 'string' && card.cta.href.startsWith('https://')) {
      const actions = document.createElement('div');
      actions.className = 'focus-agent-actions';
      const link = document.createElement('a');
      link.className   = 'focus-agent-link';
      link.textContent = ((card.cta.label || 'Open').slice(0, 10)) + ' ↗';
      link.href        = card.cta.href;
      link.target      = '_blank';
      link.rel         = 'noopener';
      actions.appendChild(link);
      block.appendChild(actions);
    }

    block.hidden = false;
    if (window._focusExpandTimer) _focusExpandTimer();
    const _aiBtn = document.querySelector('.focus-ai-timer-btn');
    if (_aiBtn) {
      const _label = (card.cta && card.cta.label) ? card.cta.label.toLowerCase() : 'view';
      _aiBtn.textContent = '✦︎ ' + _label;
    }
  }

  // ── Cache cleanup ─────────────────────────────────────────────────────────
  // Call on day rollover or clear-all to remove keys for deleted tasks.
  function _agentCleanupCache() {
    const liveTasks = typeof manualTasks !== 'undefined'
      ? new Set(manualTasks.map(function(t) { return t.id; }))
      : null;
    if (!liveTasks) return;
    Object.keys(localStorage)
      .filter(function(k) { return k.startsWith(CACHE_PREFIX); })
      .forEach(function(k) {
        if (!liveTasks.has(k.replace(CACHE_PREFIX, ''))) localStorage.removeItem(k);
      });
  }

  // ── Exports ────────────────────────────────────────────────────────────────
  window._agentEnrichTask           = _agentEnrichTask;
  window._agentUpdateIndicator      = _agentUpdateIndicator;
  window._agentRestoreAllIndicators = _agentRestoreAllIndicators;
  window._agentRenderFocusBlock     = _agentRenderFocusBlock;
  window._agentCleanupCache         = _agentCleanupCache;
})();
