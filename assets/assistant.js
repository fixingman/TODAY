// TODAY — post-add AI suggestion controller
window._startAssistant = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

    // ── Closure state ──
    let _aiAnalyzeTimeout = null;
    let _aiAnalyzeSeq = 0;
    let _aiPendingSuggestion = null;
    let _aiCurrentSuggestion = null;
    const _aiSuggestionExposureMs = 10000;

// Post-add inline suggestion controller.
function _aiAnalyzeTask(taskId, taskText) {
  _aiCancelPendingSuggestion();
  const analyzeSeq = ++_aiAnalyzeSeq;
  clearTimeout(_aiAnalyzeTimeout);
  _aiAnalyzeTimeout = null;

  // Don't analyze if AI not configured
  if (!Today.use('connections')._aiIsConfigured()) return;
  
  // Don't analyze very short tasks
  if (taskText.length < 10) return;
  
  // Debounce — wait 2s after last task add
  _aiAnalyzeTimeout = setTimeout(() => _aiDoAnalyze(taskId, taskText, analyzeSeq), 2000);
}

async function _aiDoAnalyze(taskId, taskText, analyzeSeq) {
  if (analyzeSeq !== _aiAnalyzeSeq) return;
  // Dismiss any existing suggestion first
  _aiDismissSuggestion();
  _suggestionReconcileOutcomes();

  // Obligation language — client-side, no AI call needed
  if (typeof _aiCheckObligationLanguage === 'function' && _aiCheckObligationLanguage(taskText)) {
    if (typeof _incrementObligationTally === 'function') _incrementObligationTally(taskText);
    if (_suggestionShouldOffer('obligation_language', taskId)) {
      _aiQueueSuggestion(taskId, taskText, {
        type: 'obligation',
        suggest: true,
        reason: 'obligation_language',
        message: 'Have to — or choosing to?',
      });
    }
    return;
  }

  // Build minimal context
  const existingTasks = manualTasks
    .filter(t => t.id !== taskId && !doneIds.has(t.id))
    .map(t => t.text)
    .slice(0, 5); // limit context
  
  const prompt = `Task just added: "${taskText}"
Existing tasks: ${existingTasks.length ? existingTasks.map(t => `"${t}"`).join(', ') : 'none'}

Analyze briefly. Reply ONLY with raw JSON:
{
  "suggest": true/false,
  "type": "break_down" | "clarify" | "none",
  "reason": "multiple_actions" | "long_complex_task" | "vague_task" | "other_complexity",
  "message": "short reason (max 10 words)",
  "subtasks": ["task 1", "task 2", "task 3"] // only if type=break_down
}

Rules:
- suggest:true ONLY if task has multiple distinct steps or is vague
- break_down: task contains "and", multiple verbs, or >8 words with distinct parts
- clarify: task is <4 words and vague (e.g. "do thing", "work stuff")
- reason: choose the single strongest reason the suggestion is being made
- When several reasons fit, prefer a category marked "prefer" in reason performance and avoid one marked "use rarely"
- Most tasks are fine as-is — suggest:false is the default
- subtasks: 2-3 concrete actionable items, not rewording of original`;

  try {
    const _allOutcomeStats = _suggestionOutcomeStats();
    const _acceptRate = _allOutcomeStats.decisions >= 3
      ? Math.round(_allOutcomeStats.applied / _allOutcomeStats.decisions * 100)
      : null;
    const _letgoArr = Object.entries(appMemory?.patterns?.letgoReasons || {});
    const _letgoTotal = _letgoArr.reduce((s, [, v]) => s + _lrCount(v), 0);
    const _letgoDominant = _letgoTotal >= 8
      ? _letgoArr.sort((a, b) => _lrCount(b[1]) - _lrCount(a[1])).find(([, v]) => _lrCount(v) / _letgoTotal >= 0.35)?.[0]
      : null;
    let _behaviorCtx = '';
    if (_acceptRate !== null) _behaviorCtx += ` Acceptance rate for previous breakdown suggestions: ${_acceptRate}% — suggest only when clearly beneficial.`;
    if (_letgoDominant)       _behaviorCtx += ` User's most common reason for letting tasks go: ${_letgoDominant} — factor this into your suggestion.`;
    _behaviorCtx += _suggestionPerformanceContext();

    const res = await fetch('/.netlify/functions/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: Today.use('connections')._aiGetProvider(),
        apiKey: Today.use('connections')._aiGetKey(),
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: `You analyze tasks for a todo app. Be concise. Most tasks need no changes.${_behaviorCtx}`,
      }),
    });
    
    if (!res.ok) return; // fail silently
    
    const data = await res.json();
    if (analyzeSeq !== _aiAnalyzeSeq) return;
    if (data.error || !data.suggest) return;
    if (data.type === 'break_down' && (data.subtasks?.length ?? 0) < 2) return;
    data.reason = _suggestionReason(data, taskText);
    if (!_suggestionShouldOffer(data.reason, taskId)) return;

    _aiQueueSuggestion(taskId, taskText, data);
    
  } catch(e) {
    // Fail silently — this is enhancement, not critical
  }
}

function _aiCancelPendingSuggestion(pending = _aiPendingSuggestion) {
  if (!pending || pending !== _aiPendingSuggestion) return;
  pending.intersectionObserver?.disconnect();
  pending.mutationObserver?.disconnect();
  if (pending.onScroll) window.removeEventListener('scroll', pending.onScroll);
  if (pending.onResize) window.removeEventListener('resize', pending.onResize);
  if (pending.onVisibility) document.removeEventListener('visibilitychange', pending.onVisibility);
  _aiPendingSuggestion = null;
}

function _aiTaskInDeliveryZone(taskEl) {
  if (!taskEl?.isConnected || document.visibilityState !== 'visible') return false;
  const rect = taskEl.getBoundingClientRect();
  const deliveryBottom = Math.max(0, window.innerHeight - 64);
  return rect.bottom > 0 && rect.right > 0 && rect.top < deliveryBottom && rect.left < window.innerWidth;
}

function _aiQueueSuggestion(taskId, analyzedText, data) {
  _aiCancelPendingSuggestion();
  const pending = { taskId, analyzedText, data, taskEl: null };
  _aiPendingSuggestion = pending;

  const show = taskEl => {
    if (_aiPendingSuggestion !== pending) return;
    const task = manualTasks.find(item => item.id === taskId);
    if (!task || task.text !== analyzedText || doneIds.has(taskId) || !taskEl?.isConnected) {
      _aiCancelPendingSuggestion(pending);
      return;
    }
    _aiCancelPendingSuggestion(pending);
    _aiShowSuggestion(taskId, taskEl, data);
  };

  const attach = () => {
    if (_aiPendingSuggestion !== pending) return;
    const task = manualTasks.find(item => item.id === taskId);
    if (!task || task.text !== analyzedText || doneIds.has(taskId)) {
      _aiCancelPendingSuggestion(pending);
      return;
    }
    const taskEl = document.querySelector(`.task[data-taskid="${CSS.escape(taskId)}"]`);
    if (!taskEl) return;
    if (pending.taskEl === taskEl) return;

    pending.intersectionObserver?.disconnect();
    pending.taskEl = taskEl;
    if (typeof IntersectionObserver === 'function') {
      pending.intersectionObserver = new IntersectionObserver(entries => {
        if (_aiPendingSuggestion !== pending) return;
        if (entries.some(entry => entry.target === taskEl && entry.isIntersecting) &&
            document.visibilityState === 'visible') show(taskEl);
      }, { rootMargin: '0px 0px -64px 0px', threshold: 0.25 });
      pending.intersectionObserver.observe(taskEl);
    } else if (_aiTaskInDeliveryZone(taskEl)) {
      show(taskEl);
    }
  };

  const list = $.manualList || document.getElementById('manualList');
  if (list) {
    pending.mutationObserver = new MutationObserver(attach);
    pending.mutationObserver.observe(list, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  pending.onVisibility = () => {
    if (document.visibilityState !== 'visible') return;
    attach();
    if (_aiPendingSuggestion === pending && _aiTaskInDeliveryZone(pending.taskEl)) show(pending.taskEl);
  };
  document.addEventListener('visibilitychange', pending.onVisibility);

  if (typeof IntersectionObserver !== 'function') {
    pending.onScroll = () => {
      attach();
      if (_aiPendingSuggestion === pending && _aiTaskInDeliveryZone(pending.taskEl)) show(pending.taskEl);
    };
    pending.onResize = pending.onScroll;
    window.addEventListener('scroll', pending.onScroll, { passive: true });
    window.addEventListener('resize', pending.onResize, { passive: true });
  }

  attach();
}

function _aiShowSuggestion(taskId, taskEl, data) {
  const row = document.createElement('div');
  row.className = 'task-suggestion';
  row.dataset.forTask = taskId;
  
  const msg = document.createElement('span');
  msg.className = 'task-suggestion-msg';
  msg.textContent = data.message || 'AI suggestion';
  
  const chips = document.createElement('div');
  chips.className = 'task-suggestion-chips';
  
  if (data.type === 'break_down' && data.subtasks?.length >= 2) {
    const breakBtn = document.createElement('button');
    breakBtn.className = 'task-suggestion-chip';
    breakBtn.textContent = `Split into ${data.subtasks.length}`;
    breakBtn.onclick = () => _aiApplyBreakdown(taskId, data.subtasks);
    chips.appendChild(breakBtn);
  }
  
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'task-suggestion-chip dismiss';
  dismissBtn.textContent = '✕';
  dismissBtn.onclick = () => _aiDismissSuggestion('user');
  chips.appendChild(dismissBtn);
  
  row.appendChild(msg);
  row.appendChild(chips);
  
  // Insert after the task
  taskEl.insertAdjacentElement('afterend', row);
  
  const task = manualTasks.find(item => item.id === taskId);

  if (appMemory?.patterns?.inlineSuggestions) {
    appMemory.patterns.inlineSuggestions.offered++;
  }
  const outcomeId = _suggestionOutcomeRecord({
    taskId,
    taskText: task?.text || '',
    type: data.type,
    reason: data.reason,
    message: data.message,
  });
  _aiCurrentSuggestion = { taskId, element: row, outcomeId };
  _aiStartSuggestionExposure(_aiCurrentSuggestion);
}

// The suggestion is a sibling rather than part of the task row so it can span
// the full list width. Reorders move only `.task` elements, and Today.use('connections').renderManual()
// replaces those elements wholesale; always restore the sibling relationship
// from the stable task ID after either operation.
function _aiReanchorSuggestion() {
  const current = _aiCurrentSuggestion;
  if (!current?.element) return false;
  const taskEl = document.querySelector(
    `.task[data-taskid="${CSS.escape(current.taskId)}"]`
  );
  if (!taskEl?.isConnected) return false;
  if (current.element.previousElementSibling !== taskEl) {
    taskEl.insertAdjacentElement('afterend', current.element);
  }
  return true;
}

function _aiStartSuggestionExposure(current) {
  let exposedMs = 0;
  let exposureStartedAt = null;
  let intersecting = false;
  let timer = null;

  const update = () => {
    const now = performance.now();
    if (exposureStartedAt !== null) {
      exposedMs += now - exposureStartedAt;
      exposureStartedAt = null;
    }
    clearTimeout(timer);

    if (_aiCurrentSuggestion !== current) return;
    if (exposedMs >= _aiSuggestionExposureMs) {
      _aiDismissSuggestion('auto');
      return;
    }

    if (document.visibilityState === 'visible' && intersecting) {
      exposureStartedAt = now;
      timer = setTimeout(update, _aiSuggestionExposureMs - exposedMs);
    }
  };

  const onVisibility = () => update();
  document.addEventListener('visibilitychange', onVisibility);

  let observer = null;
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(entries => {
      intersecting = entries.some(entry => entry.target === current.element && entry.isIntersecting);
      update();
    }, { threshold: 0.01 });
    observer.observe(current.element);
  } else {
    const rect = current.element.getBoundingClientRect();
    intersecting = rect.bottom > 0 && rect.right > 0 &&
      rect.top < window.innerHeight && rect.left < window.innerWidth;
    update();
  }

  current.stopExposure = () => {
    if (exposureStartedAt !== null) exposedMs += performance.now() - exposureStartedAt;
    exposureStartedAt = null;
    clearTimeout(timer);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

function _aiDismissSuggestion(source) {
  if (!_aiCurrentSuggestion) {
    if (!source) _aiCancelPendingSuggestion();
    return;
  }

  const current = _aiCurrentSuggestion;
  current.stopExposure?.();
  const el = current.element;
  if (el && el.parentNode) {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
  _aiCurrentSuggestion = null;

  if (appMemory?.patterns?.inlineSuggestions) {
    if (source === 'user') appMemory.patterns.inlineSuggestions.dismissed++;
    else if (source === 'auto') appMemory.patterns.inlineSuggestions.autoDismissed = (appMemory.patterns.inlineSuggestions.autoDismissed || 0) + 1;
    if (source === 'user' || source === 'auto') {
      _suggestionOutcomeDismiss(current.outcomeId, source);
      _saveMemory();
    }
  }
}

function _aiApplyBreakdown(originalTaskId, subtasks) {
  // Find and remove original task
  const idx = manualTasks.findIndex(t => t.id === originalTaskId);
  if (idx === -1) return;
  
  // Remove from DOM
  const oldEl = document.querySelector(`.task[data-taskid="${CSS.escape(originalTaskId)}"]`);
  if (oldEl) {
    oldEl.classList.add('removing');
    oldEl.addEventListener('animationend', () => oldEl.remove(), { once: true });
  }
  
  // Remove from data
  manualTasks.splice(idx, 1);
  
  // Track deletion for sync
  const deleted = safeJSON('today_deleted_ids', []);
  deleted.push({ id: originalTaskId, at: new Date().toISOString() });
  localStorage.setItem('today_deleted_ids', JSON.stringify(deleted));
  
  // Add subtasks
  const list = $.manualList;
  const resultTaskIds = [];
  subtasks.forEach((text, i) => {
    const task = { id: 'manual_' + (Date.now() + i), text };
    manualTasks.push(task);
    resultTaskIds.push(task.id);
    
    // Add to DOM
    if (list) {
      const div = document.createElement('div');
      div.innerHTML = Today.use('connections').taskHTML(task, 'manual');
      const el = div.firstElementChild;
      el.classList.add('task-new');
      el.addEventListener('animationend', () => el.classList.remove('task-new'), { once: true });
      list.appendChild(el);
    }
  });
  
  // Save
  _saveManual();
  _setLastLocalChange();
  dropboxAutoSave();
  
  // Update UI
  $.manualCount.textContent = manualTasks.length;
  if (appMemory?.patterns?.inlineSuggestions) {
    appMemory.patterns.inlineSuggestions.applied++;
    _suggestionOutcomeApply(_aiCurrentSuggestion?.outcomeId, resultTaskIds);
    _saveMemory();
  }
  _aiDismissSuggestion();
  _haptic('success');
}

    if (window.Today) {
      Today.define('assistant', {
        _aiAnalyzeTask,
        _aiDismissSuggestion,
        _aiReanchorSuggestion,
        _aiApplyBreakdown,
      });
    }

  };
}());
