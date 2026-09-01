// TODAY — focus mode: Pomodoro timer, PiP session, AI focus companion.
window._startFocus = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

  // ── Desktop-only guard ───────────────────────────────────────────────────
  // matchMedia hover:hover = device has a true pointer (mouse/trackpad).
  // Touch-primary devices (mobile) return false — bail entirely.
  if (!window.matchMedia('(hover: hover)').matches) return;

  const TOTAL  = 25 * 60;
  const appEl  = document.getElementById('main-app');

  function _parseAIText(data) {
    if (data.error) return null;
    return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
  }

  // ── Checkbox intercept hook ───────────────────────────────────────────────
  // Called before toggleDone. Returns true if focus mode handled the check
  // (stops normal toggleDone from firing). Registers partial session,
  // collapses focus UI, then lets the task complete normally.
  window._focusOnCheck = function(taskId) {
    // Only intercept if this task is currently focused
    if (taskId !== uiTaskId && (!taskStates[taskId] || taskStates[taskId].rem >= TOTAL)) return false;
    if (taskId !== uiTaskId && !taskStates[taskId]) return false;

    const st = getState(taskId);
    const sessionStarted = st.rem < TOTAL; // only log if session actually began

    // Stop the timer
    clearTimeout(tickHandle);
    st.running   = false;
    st.paused    = false;
    st.wallStart = null;

    // Log partial session if any time was spent
    if (sessionStarted) _logSession(taskId);

    // Collapse focus UI cleanly — handle both task (taskid) and habit (habitId)
    // Note: closeUI(true) will call _trackFocusTime, so no need to call it here
    const isUiEl = uiTaskEl && (
      uiTaskEl.dataset.taskid  === taskId ||
      uiTaskEl.dataset.habitId === taskId
    );
    if (isUiEl) {
      closeUI(true);
    } else {
      // Not the UI task — track time manually before clearing
      _trackFocusTime(taskId);
      clearState(taskId);
      appEl.classList.remove('focusing');
      document.body.style.overflow = ''; // Unlock scroll
    }

    // Return false — let toggleDone run normally to mark task done
    return false;
  };

  // Re-anchor timer bar after DOM rebuild (e.g. renderManual from sync)
  // Finds the new task element by ID and re-positions timerEl after it.
  // Called by renderManual() and renderTrello() after tasks are in the DOM.
  // If localStorage has a persisted session: re-open the timer with remaining
  // time, or silently record the full 25 min if it would already have completed.
  window._tryRestoreFocusSession = function() {
    // One decision per page load. renderManual()/renderTrello() call this on every
    // render (7s sync tick included) — without this gate, leaving focus by any route
    // that is not "check the task off" leaves a session in localStorage and the very
    // next render silently re-opens focus mode on it. (BUG-065)
    if (_restoreAttempted) return;
    if (uiTaskId) { _restoreAttempted = true; return; } // session already active
    const saved = safeJSON('today_focus_session', null);
    if (!saved || !saved.taskId) { _restoreAttempted = true; return; }

    const { taskId, rem, savedAt, paused } = saved;
    const taskEl = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
    if (!taskEl) return; // task not in DOM yet (Trello may not be loaded) — retry later
    _restoreAttempted = true; // element found: this is the one real attempt

    if (taskEl.classList.contains('done')) {
      localStorage.removeItem('today_focus_session');
      return;
    }

    const elapsed = paused ? 0 : Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
    const adjustedRem = Math.max(0, rem - elapsed);

    if (!paused && adjustedRem <= 0) {
      // Session completed while the app was away — silently record it, no UI
      _recordFocusComplete(taskId);
      return;
    }

    // Restore timer state and re-open UI
    const st = getState(taskId);
    st.rem      = paused ? rem : adjustedRem;
    st.running  = !paused;
    st.paused   = !!paused;
    st.wallStart = paused ? null : Date.now();
    st.tracked  = false;

    openUI(taskEl, taskId);
    syncDisplay(taskId, taskEl);
    if (st.running) {
      tickFor(taskId);
    } else {
      setPaused(true);
      _updateBreatheOverlay(true);
    }
  };

  window._focusReanchor = function() {
    if (!uiTaskId || !uiTaskEl) return;
    const newTaskEl = document.querySelector('.task[data-taskid="' + CSS.escape(uiTaskId) + '"]');
    if (!newTaskEl) return;

    // Re-attach if: element reference changed (full re-render) OR
    // timer is no longer immediately after the task (element was repositioned by patch)
    const timerDetached = timerEl.previousElementSibling !== newTaskEl;

    if (newTaskEl !== uiTaskEl || timerDetached) {
      newTaskEl.classList.add('focused');
      newTaskEl.after(timerEl);
      timerEl.after(kbdHint);
      uiTaskEl = newTaskEl;
      syncDisplay(uiTaskId, newTaskEl);
    }
  };

  // ── Per-task pause state (in-memory, session-scoped) ─────────────────────
  // Stores { rem, running } keyed by taskId.
  // Survives UI dismiss. Cleared when a new task starts.
  // NOT persisted to localStorage — resets on page reload intentionally.
  const taskStates = {};

  function getState(taskId) {
    if (!taskStates[taskId]) taskStates[taskId] = { rem: TOTAL, running: false, paused: false, wallStart: null, tracked: false };
    return taskStates[taskId];
  }
  function clearState(taskId) { delete taskStates[taskId]; }

  // ── DOM: kbd hint + timer block ───────────────────────────────────────────
  const kbdHint = document.createElement('div');
  kbdHint.className = 'focus-kbd-hint';
  kbdHint.setAttribute('role', 'listitem');
  kbdHint.hidden = true;
  kbdHint.setAttribute('aria-hidden', 'true');
  kbdHint.innerHTML = '<span class="focus-kbd-hints"><kbd>space</kbd> breathe &nbsp;&nbsp; <kbd>esc</kbd> rest</span>';
  let focusAIBtn;   // assigned after timerEl is created (button lives in the timer bar)
  let _thinkAnim = null; // WAAPI animation for thinking\u2026 pulse \u2014 stored so it can be cancelled in both paths

  function _focusResetAI() {
    if (_thinkAnim) { _thinkAnim.cancel(); _thinkAnim = null; }
    timerEl.classList.remove('ai-active');
    if (focusAIBtn) {
      focusAIBtn.classList.remove('loading');
      focusAIBtn.textContent = '\u2726\ufe0e ask';
      // Block hover for one frame so dismissing insight doesn't leave btn in hover state
      focusAIBtn.style.pointerEvents = 'none';
      requestAnimationFrame(() => { if (focusAIBtn) focusAIBtn.style.pointerEvents = ''; });
    }
  }

  async function _focusAskAI() {
    if (timerEl.classList.contains('ai-active')) { _focusResetAI(); return; }

    // Enrichment shortcuts — don't require local AI key (ai-assist uses server key fallback)
    const _gmailBlock = document.getElementById('focusGmailBlock');
    if (_gmailBlock && !_gmailBlock.hidden) {
      _gmailBlock.querySelector('.focus-gmail-draft-btn')?.click();
      return;
    }
    const _agentBlock = document.getElementById('focusAgentBlock');
    if (_agentBlock && !_agentBlock.hidden) {
      const _ctaLink = _agentBlock.querySelector('.focus-agent-link');
      if (_ctaLink) { window.open(_ctaLink.href, '_blank', 'noopener'); return; }
    }

    if (!_aiIsConfigured()) return;

    const taskText = (uiTaskEl && uiTaskEl.querySelector('.task-text')?.textContent?.trim()) || '';
    if (!taskText) return;

    // ── Task history signals ──────────────────────────────────────────────────
    const _taskObj = (typeof manualTasks !== 'undefined' && manualTasks.find(t => t.id === uiTaskId)) || null;

    // Total pomodoros on this task (cumulative across all time)
    const _sessions = _taskObj
      ? (parseInt(_taskObj.focusSessions) || 0)
      : (typeof _getTrelloFocusTotal === 'function' ? (_getTrelloFocusTotal()[uiTaskId] || 0) : 0);

    // Age of the task in days (from creation or last-active, whichever is available)
    const _ageDays = _taskObj && typeof _getCreatedFromId === 'function'
      ? Math.floor((Date.now() - (_taskObj.lastActive || _getCreatedFromId(uiTaskId))) / 86400000)
      : 0;

    const _revived  = !!(_taskObj && _taskObj.revived);
    const _deferred = !!(_taskObj && _taskObj.zoneChangedAt);

    // Last-worked recency: was it worked on today, or how many days ago?
    const _lastActive = _taskObj ? (_taskObj.lastActive || null) : null;
    const _todayDateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
    const _lastActiveDateStr = _lastActive ? new Date(_lastActive).toLocaleDateString('en-CA') : null;
    const _workedToday = _lastActiveDateStr === _todayDateStr;
    const _lastWorkedDaysAgo = (!_workedToday && _lastActive)
      ? Math.floor((Date.now() - _lastActive) / 86400000)
      : null;

    // Drag-word match: task words the person historically tends to defer
    const _dragRaw = appMemory?.preferences?.dragKeywords || [];
    const _dragFreq = {};
    _dragRaw.forEach(w => { _dragFreq[w] = (_dragFreq[w] || 0) + 1; });
    const _taskWords = taskText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const _matchedDrag = _taskWords.filter(w => w.length > 3 && (_dragFreq[w] || 0) >= 2);

    // Dominant letgo reason (only if one reason is clearly dominant ≥35% of total ≥8 letgos)
    const _letgoRaw = appMemory?.patterns?.letgoReasons || {};
    const _letgoTotal = Object.values(_letgoRaw).reduce((a, b) => a + b, 0);
    let _dominantLetgo = null;
    if (_letgoTotal >= 8) {
      const _top = Object.entries(_letgoRaw).sort((a, b) => b[1] - a[1])[0];
      if (_top && _top[1] / _letgoTotal >= 0.35) _dominantLetgo = _top[0];
    }

    // ── Build context array ───────────────────────────────────────────────────
    const _ctx = [];

    // Pomodoro history (total sessions + recency)
    if (_sessions > 0) {
      _ctx.push(_sessions + ' total pomodoro' + (_sessions > 1 ? 's' : '') + ' on this task');
      if (_workedToday) {
        _ctx.push('already worked on this task earlier today');
      } else if (_lastWorkedDaysAgo !== null && _lastWorkedDaysAgo >= 2) {
        _ctx.push('last session was ' + _lastWorkedDaysAgo + ' days ago');
      }
    }

    // Age on the list
    if (_ageDays >= 3) _ctx.push(_ageDays + ' days on the list');

    // Status flags
    if (_revived) _ctx.push('revived — person let it go and came back');
    if (_deferred) _ctx.push('deferred to Soon, then returned to today');

    // Procrastination signal: task contains words this person tends to defer
    if (_matchedDrag.length > 0) {
      _ctx.push('task contains words they tend to defer: ' + _matchedDrag.slice(0, 3).join(', '));
    }

    // Energy/pattern: dominant reason they let tasks go
    if (_dominantLetgo) {
      const _letgoLabel = { no_energy: 'no energy', not_relevant: 'not relevant', lost_interest: 'lost interest', replaced: 'replaced' };
      _ctx.push('most common reason they let tasks go: ' + (_letgoLabel[_dominantLetgo] || _dominantLetgo));
    }

    // Time signals
    const _now = new Date();
    const _hour = _now.getHours();
    const _period = _hour < 5 ? 'late night' : _hour < 12 ? 'morning' : _hour < 17 ? 'afternoon' : _hour < 22 ? 'evening' : 'late night';
    const _localTime = _now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    _ctx.push('local time ' + _localTime + ' (' + _period + ')');
    const _peakH = appMemory?.preferences?.peakHour;
    if (_peakH != null && Math.abs(_hour - _peakH) <= 1) _ctx.push('your peak productive hour');
    const _sToday = Math.floor(parseInt(localStorage.getItem('stat_focus_mins_today') || '0') / 25);
    if (_sToday === 1) _ctx.push('1 other focus session today (different tasks)');
    else if (_sToday >= 2) _ctx.push(_sToday + ' focus sessions done today across tasks');

    // Confirmed behavioral inferences (appended to system prompt, not user message)
    const _inferences = ['semantic', 'episodic', 'procedural']
      .flatMap(t => (appMemory?.memory?.[t] || []).filter(i => i.status === 'confirmed').map(i => i.text))
      .slice(0, 4);
    const _inferCtx = _inferences.length ? '\n\nWhat we know about the user: ' + _inferences.join('. ') + '.' : '';

    // ── System prompt ─────────────────────────────────────────────────────────
    const _systemPrompt = `You are a focus catalyst in a minimal task app. The user is about to start a 25-minute session. Ask exactly one question that creates a moment of clarity they wouldn't have reached on their own — not a friendly check-in.

A useful question does one of these things:
— Names what done looks like for this sitting (not the full task — just these 25 minutes)
— Surfaces the likely obstacle before it happens
— Challenges the scope (too much? the right size for one session?)
— Names the very first physical action to take

Never ask: vague check-ins ("how's it going?"), affirmations ("ready to dive in?"), anything they've already decided, yes/no questions with obvious answers.

Use the context to choose the right type:
— No prior sessions, fresh task → define the 25-minute outcome
— 2–3 total sessions → what's actually in the way?
— 4+ total sessions → is there a smaller version that would close it today?
— Last session 2+ days ago → what do you need to pick up before starting?
— Already worked on it today → what shifted since the last session?
— Revived from past → what's different this time that makes it worth doing?
— Deferred from Soon → is this the right moment, or is energy the real issue?
— Contains words they tend to defer → name the avoidance pattern directly
— Dominant letgo reason is "no energy" → ask whether energy fits this task right now
— Peak hour → what's the hardest part to tackle while sharp?
— 3+ sessions today or late evening → is this the right task for where they are now?

If you refer to the time, use the supplied exact local time — never a vague phrase like "this late."
One question only. Under 22 words. No preamble. No quotation marks. No emoji. No exclamation marks.` + _inferCtx;

    // ── Fetch ─────────────────────────────────────────────────────────────────
    timerEl.classList.add('ai-active');
    focusAIBtn.textContent = 'thinking…';
    focusAIBtn.classList.add('loading');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      _thinkAnim = focusAIBtn.animate([{ opacity: 0.25 }, { opacity: 0.65 }, { opacity: 0.25 }], { duration: 2400, easing: 'ease-in-out', iterations: Infinity });
    }

    // Other pending tasks — gives the companion awareness of what else is waiting,
    // so it can ask about prioritisation or energy fit relative to the full list.
    // pastTasks excluded for the same reason nudge.js and about.js do it: a stale
    // sync can return an archived task to manualTasks after doneIds was cleared,
    // and it would then be offered as part of "today's list".
    const _focusPastIds = new Set((typeof pastTasks !== 'undefined' ? pastTasks : []).map(t => t && t.id));
    const _otherTasks = (typeof manualTasks !== 'undefined' ? manualTasks : [])
      .filter(t => t.id !== uiTaskId && !doneIds.has(t.id) && !_focusPastIds.has(t.id))
      .slice(0, 5)
      .map(t => {
        const created = typeof _getCreatedFromId === 'function' ? _getCreatedFromId(t.id) : null;
        const age = created ? Math.floor((Date.now() - created) / 86400000) : 0;
        const s = parseInt(t.focusSessions) || 0;
        const sig = [];
        if (age >= 2) sig.push(age + 'd old');
        if (s > 0) sig.push(s + ' session' + (s > 1 ? 's' : ''));
        return '"' + t.text + '"' + (sig.length ? ' (' + sig.join(', ') + ')' : '');
      });
    const _otherCtx = _otherTasks.length
      ? '\nRest of today\'s list: ' + _otherTasks.join('; ')
      : '';

    const _focusCtrl = new AbortController();
    const _focusAbortTimer = setTimeout(() => _focusCtrl.abort(), 25000);
    try {
      const key      = _aiGetKey();
      const provider = _aiGetProvider();
      const res = await fetch('/.netlify/functions/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: _focusCtrl.signal,
        body: JSON.stringify({
          provider,
          apiKey: key,
          messages: [{
            role: 'user',
            content: 'Task: "' + taskText + '"' + (_ctx.length ? '\nContext: ' + _ctx.join(', ') + '.' : '') + _otherCtx
          }],
          systemPrompt: _systemPrompt
        })
      });
      clearTimeout(_focusAbortTimer);
      if (!res.ok) {
        res.json().then(e => console.warn('[focus ask]', res.status, e?.error)).catch(() => {});
        _focusResetAI(); return;
      }
      const data = await res.json();
      const q = _parseAIText(data)?.trim();
      if (q) {
        if (_thinkAnim) { _thinkAnim.cancel(); _thinkAnim = null; }
        focusAIBtn.classList.remove('loading');
        focusAIBtn.textContent = q;
        if (typeof _memoryRecordSpokenLine === 'function') _memoryRecordSpokenLine('focus question', q);
      } else {
        _focusResetAI();
      }
    } catch (_) {
      _focusResetAI();
    }
  }

  document.body.appendChild(kbdHint);

  const timerEl = document.createElement('div');
  timerEl.className = 'focus-timer';
  timerEl.setAttribute('role', 'listitem');
  timerEl.setAttribute('aria-label', 'Focus timer');
  timerEl.hidden = true;
  timerEl.setAttribute('aria-hidden', 'true');
  timerEl.innerHTML =
    '<div class="focus-timer-inner" role="complementary" aria-label="Focus timer controls">' +
      '<div class="focus-timer-fill" id="focusFill" role="progressbar" aria-label="Focus session progress" aria-valuemin="0" aria-valuemax="1500" aria-valuenow="0"></div>' +
      '<span class="focus-timer-paused" id="focusPaused">paused</span>' +
      '<button class="focus-ai-timer-btn" aria-label="Ask for a focus question">✦ ask</button>' +
      '<button type="button" class="focus-timer-time" id="focusTime" aria-label="Pause focus timer">25:00</button>' +
    '</div>' +
    '<div class="focus-gmail-block" id="focusGmailBlock" hidden></div>' +
    '<div class="focus-agent-block" id="focusAgentBlock" hidden></div>';
  document.body.appendChild(timerEl);
  focusAIBtn = timerEl.querySelector('.focus-ai-timer-btn');
  focusAIBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    _focusAskAI();
  });

  const fillEl   = timerEl.querySelector('#focusFill');
  const timeEl   = timerEl.querySelector('#focusTime');
  const pausedEl = timerEl.querySelector('#focusPaused');

  // Pre-warm WAAPI compositor thread — first el.animate() initializes compositor
  // infrastructure lazily, causing a one-time 50-200ms stall on mobile. Running a
  // no-op animation at idle time moves that cost before the first user tap.
  (function() {
    function _wapiWarm() { fillEl.animate([{opacity:1},{opacity:1}], {duration:100, fill:'none'}); }
    if (window.requestIdleCallback) {
      requestIdleCallback(_wapiWarm, { timeout: 2000 });
    } else {
      setTimeout(_wapiWarm, 300);
    }
  })();

  timeEl.addEventListener('click', function(e) {
    if (!uiTaskId) return;
    e.stopPropagation();
    const st = getState(uiTaskId);
    if (st.rem <= 0) return;
    toggle();
  });

  // BUG-028 (final): the completed-bar pulse is driven by the Web Animations API,
  // not a CSS animation. CSS animations restart from keyframe 0 on every
  // display:none/block repaint pass in _onWake — a visible jump whenever the bar
  // was mid-pulse. A WAAPI timeline is unaffected by display toggles, so the
  // pulse needs no suppress/restore at wake (and cannot flash).
  function _pulseComplete(el, on) {
    if (!el) return;
    if (el._pulseAnim) { el._pulseAnim.cancel(); el._pulseAnim = null; }
    if (on && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el._pulseAnim = el.animate(
        [{ opacity: 1 }, { opacity: 0.65 }, { opacity: 1 }],
        { duration: 1800, easing: 'ease-in-out', iterations: Infinity }
      );
    }
  }

  function _breatheRun(el, on) {
    if (!el) return;
    if (el._breatheAnim) { el._breatheAnim.cancel(); el._breatheAnim = null; }
    if (on && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el._breatheAnim = el.animate(
        [{ opacity: 1 }, { opacity: 0.88 }, { opacity: 1 }],
        { duration: 6000, easing: 'ease-in-out', iterations: Infinity }
      );
    }
  }

  // Click on timer bar to restart when complete
  timerEl.addEventListener('click', function(e) {
    if (!uiTaskId) return;
    const st = getState(uiTaskId);
    if (st.rem <= 0) {
      // Timer complete — restart session
      e.stopPropagation(); // don't bubble to task click handler
      fillEl.classList.remove('complete');
      _pulseComplete(fillEl, false);
      timeEl.classList.remove('complete');
      timerEl.classList.remove('complete');
      st.rem       = TOTAL;
      st.running   = true;
      st.paused    = false;
      st.wallStart = Date.now();
      setPaused(false);
      syncDisplay(uiTaskId, uiTaskEl);
      playStartSound();
      // Don't log session here — session is logged when it completes (completeFor)
      // or when user checks the task mid-session (_focusOnCheck). Logging on start
      // caused the counter to jump to 2 before the second session ran.
      tickFor(uiTaskId);
    }
  });

  // Active UI state — which task is currently showing the timer bar
  let uiTaskEl = null;
  let uiTaskId = null;
  let tickHandle = null;
  // Generation counter — bumped by every openUI and closeUI. closeUI defers its DOM
  // teardown by 200ms (CSS transition); if a newer session opened in that window, the
  // stale teardown must not rip the timer out from under it. (BUG-065)
  let focusGen = 0;
  // Cold-start only: _tryRestoreFocusSession exists for "iOS killed the PWA", not for
  // every render. Without this it re-opens focus on any render after you leave. (BUG-065)
  let _restoreAttempted = false;

  function fmt(sec) {
    return String(Math.floor(sec / 60)).padStart(2,'0') + ':' + String(sec % 60).padStart(2,'0');
  }

  function setProgress(p, taskEl) {
    fillEl.style.transform = 'scaleX(' + p + ')';
    fillEl.setAttribute('aria-valuenow', String(Math.round(p * TOTAL)));
    if (taskEl) taskEl.style.setProperty('--progress', p);
  }

  function syncDisplay(taskId, taskEl) {
    const st = getState(taskId);
    const p  = 1 - st.rem / TOTAL;
    setProgress(p, taskEl);
    setPaused(st.paused);   // show paused only if user explicitly paused
    if (window._pipSync) window._pipSync(st.rem, TOTAL);
    // Session complete — re-apply done state in case DOM was rebuilt by sync/renderManual.
    // Do NOT overwrite "again?" with fmt(0)="00:00" here. (BUG-025 extension)
    if (st.rem === 0 && !st.running) {
      fillEl.classList.add('complete');
      _pulseComplete(fillEl, true);
      timeEl.classList.add('complete');
      timerEl.classList.add('complete');
      timeEl.textContent = 'again?';
    } else {
      timeEl.textContent = fmt(st.rem);
    }
  }

  function setPaused(on) {
    timeEl.classList.toggle('paused', on);
    fillEl.classList.toggle('paused', on);
    pausedEl.classList.toggle('show', on);
    timeEl.setAttribute('aria-label', on ? 'Resume focus timer' : 'Pause focus timer');
    _breatheRun(fillEl, !on);
  }

  function _setFocusInert(on, activeRow) {
    const selectors = '.task,.habit,.section-header,.empty,.config-panel';
    document.querySelectorAll(selectors).forEach(el => {
      if (on && (el === activeRow || el.contains(activeRow))) return;
      if (on) {
        el.dataset.focusA11yHidden = '1';
        el.inert = true;
        el.setAttribute('aria-hidden', 'true');
      } else if (el.dataset.focusA11yHidden === '1') {
        delete el.dataset.focusA11yHidden;
        el.inert = false;
        el.removeAttribute('aria-hidden');
      }
    });
    // sticky-header is intentionally left interactive during focus — its buttons
    // (logo, habits, connections, about) exit focus and open their panel on click.
  }

  function _resetCopyFeedback(taskEl) {
    const copyButton = taskEl?.querySelector('.task-copy');
    if (!copyButton) return;
    clearTimeout(copyButton._copyFeedbackTimer);
    copyButton._copyFeedbackGeneration = (copyButton._copyFeedbackGeneration || 0) + 1;
    delete copyButton._copyFeedbackTimer;
    copyButton.textContent = 'copy';
    copyButton.classList.remove('copied');
  }

  // ── Open UI on a task ─────────────────────────────────────────────────────
  function openUI(taskEl, taskId) {
    // If showing a different task's UI, close it first (no state change)
    if (uiTaskEl && uiTaskEl !== taskEl) closeUI(false);
    // Bump AFTER that close so its pending 200ms teardown sees a newer generation
    // and leaves this session's timer chrome alone. (BUG-065)
    focusGen++;

    uiTaskEl = taskEl;
    uiTaskId = taskId;
    window._focusUIActive = true;
    _resetCopyFeedback(taskEl);

    // Strip complete state — timerEl is reused; prior .complete bleeds into new session (BUG-022)
    fillEl.classList.remove('complete');
    _pulseComplete(fillEl, false);
    _breatheRun(fillEl, false);
    timeEl.classList.remove('complete');
    timerEl.classList.remove('complete');
    // If the previous session completed (rem=0), clear state so syncDisplay shows fresh 25:00.
    // Without this, re-opening a completed task shows a frozen 00:00 until the timer bar is clicked. (BUG-025 sibling)
    const _priorSt = getState(taskId);
    if (_priorSt.rem === 0 && !_priorSt.running) clearState(taskId);

    appEl.classList.add('focusing');
    taskEl.classList.add('focused');
    _setFocusInert(true, taskEl);
    taskEl.after(timerEl);
    timerEl.after(kbdHint); // kbd hint follows timer bar

    syncDisplay(taskId, taskEl);

    const _focusTaskObj  = (typeof manualTasks !== 'undefined' ? manualTasks : []).find(t => t.id === taskId);
    const _focusTaskText = _focusTaskObj ? _focusTaskObj.text : '';
    if (window._gmailRenderFocusBlock) _gmailRenderFocusBlock(taskId, _focusTaskText);
    if (window._agentRenderFocusBlock) _agentRenderFocusBlock(taskId, _focusTaskText);

    timerEl.hidden = false;
    timerEl.setAttribute('aria-hidden', 'false');
    kbdHint.hidden = false;
    kbdHint.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      timerEl.classList.add('open');
      timerEl.style.maxHeight = timerEl.scrollHeight + 'px';
      if (_enterDelta !== 0 && document.body.style.position === 'fixed') {
        // Animate body.top to target — concurrent with the blur-in, matching exit character.
        // Delta already accounts for timerHeight so overflow correction is not needed here.
        document.body.style.transition = 'top 200ms cubic-bezier(0.16, 1, 0.3, 1)';
        document.body.style.top = `-${_targetScrollY}px`;
        setTimeout(() => { document.body.style.transition = ''; }, 210);
      } else if (document.body.style.position === 'fixed') {
        // No nudge — run normal overflow correction for edge cases
        const rect = timerEl.getBoundingClientRect();
        const _addRow = document.querySelector('.add-task-row');
        const _footerH = _addRow ? _addRow.getBoundingClientRect().height : 70;
        const overflow = (rect.top + timerEl.scrollHeight) - (window.innerHeight - _footerH - 8);
        if (overflow > 0) {
          const currentTop = parseInt(document.body.style.top || '0', 10);
          document.body.style.top = (currentTop - overflow) + 'px';
        }
      }
    });
    kbdHint.classList.add('show');
    if (window._a11yAnnounce) {
      const focusName = taskEl.querySelector('.task-text,.habit-name')?.textContent?.trim() || 'item';
      _a11yAnnounce(`Focus started for ${focusName}.`);
    }
    
    // Save original scroll and task position — restore target on close.
    const originalScrollY = window.scrollY;
    const originalTaskTop = taskEl.getBoundingClientRect().top;

    // Compute nudge delta without instant-scrolling — the rAF above animates body.top
    // to the target concurrent with blur-in, so enter and exit feel matched.
    const rect = taskEl.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const timerHeight = 260;
    const footerH = 70;
    const headerH = 80;
    const GUTTER = 12;
    let _enterDelta = 0;
    if (rect.bottom + timerHeight > viewportH - footerH) {
      _enterDelta = (rect.bottom + timerHeight + GUTTER) - (viewportH - footerH);
    } else if (rect.top < headerH) {
      _enterDelta = rect.top - headerH - GUTTER;
    }
    const _targetScrollY = Math.max(0, originalScrollY + _enterDelta);

    // Lock scroll immediately at current position; animation to target fires in the rAF above.
    document.body.style.position = 'fixed';
    document.body.style.top = `-${originalScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.dataset.scrollY     = originalScrollY;
    document.body.dataset.focusTaskTop = originalTaskTop;
  }

  // ── Track actual focus time spent (not just completed sessions) ────────────
  function _trackFocusTime(taskId) {
    if (!taskId) return;
    const st = taskStates[taskId];
    if (!st) return;
    
    // Skip if already tracked (e.g., session completed naturally)
    if (st.tracked) return;
    
    // Calculate actual time spent: TOTAL - remaining time
    const timeSpentSecs = TOTAL - st.rem;
    if (timeSpentSecs <= 0) return;
    
    const timeSpentMins = Math.floor(timeSpentSecs / 60);
    if (timeSpentMins <= 0) return;
    
    // Mark as tracked
    st.tracked = true;
    
    // Add to today's focus minutes.
    // Guard: if stat_focus_mins_date is from a previous day, a day boundary was
    // crossed mid-session. Snapshot the pre-midnight total for cleanup to use as
    // yesterday's history, then start fresh for today. (BUG-063)
    const _tfDate = localStorage.getItem('stat_focus_mins_date') || '';
    if (_tfDate && _tfDate !== _getAppDay()) {
      const _preMidnightMins = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
      if (_preMidnightMins > 0) localStorage.setItem('stat_focus_mins_yesterday_snapshot', _preMidnightMins);
    }
    const prevMins = _tfDate === _getAppDay() ? parseInt(localStorage.getItem('stat_focus_mins_today') || '0') : 0;
    localStorage.setItem('stat_focus_mins_today', prevMins + timeSpentMins);
    localStorage.setItem('stat_focus_mins_date', _getAppDay());
    
    // Update memory with focus time
    _memoryOnFocusComplete(timeSpentMins);
    
    updateStats();
  }

  // ── Close UI — preserves task state unless clearState=true ───────────────
  function closeUI(doResetState) {
    clearTimeout(tickHandle);
    _resetCopyFeedback(uiTaskEl);
    timerEl.classList.remove('open');
    timerEl.style.maxHeight = '';
    kbdHint.classList.remove('show');
    _setFocusInert(false, uiTaskEl);
    _focusResetAI();
    _updateBreatheOverlay(false); // Clear breathe overlay
    _breatheRun(fillEl, false);
    const _gmailBlock = document.getElementById('focusGmailBlock');
    if (_gmailBlock) { _gmailBlock.hidden = true; _gmailBlock.innerHTML = ''; }
    const _agentBlock = document.getElementById('focusAgentBlock');
    if (_agentBlock) { _agentBlock.hidden = true; _agentBlock.innerHTML = ''; }

    // Close PiP widget if open
    if (window._pipClose) window._pipClose();

    // Task-check path: pull the timer out of the task list immediately so the
    // layout is stable before scroll is restored. If the timer collapses in-place
    // for 200ms (the CSS transition), bottom tasks shift upward as the space is
    // freed — visible as an odd jump on the checked task. Moving it to body first
    // means the reflow happens now, not 200ms from now when toggleDone has already
    // run and the user sees the final position.
    if (doResetState) {
      document.body.appendChild(timerEl);
      timerEl.hidden = true;
      timerEl.setAttribute('aria-hidden', 'true');
      kbdHint.hidden = true;
      kbdHint.setAttribute('aria-hidden', 'true');
    }

    // Unlock scroll — slide back to original position if there was a nudge,
    // so enter (instant small nudge) and exit feel matched in character.
    const scrollY      = parseInt(document.body.dataset.scrollY || '0');
    const lockY        = Math.abs(parseInt(document.body.style.top || '0'));
    const _driftAnchor = uiTaskEl; // capture before uiTaskEl is cleared at line 810
    const _savedTaskTop = parseFloat(document.body.dataset.focusTaskTop || '-1');

    function _doUnfix() {
      document.body.style.transition = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      window.scrollTo(0, scrollY);
      // If renderManual reordered tasks during focus, the task's DOM position shifted.
      // Correct by the exact drift so it lands at the same viewport Y as when focus opened.
      if (_savedTaskTop >= 0 && _driftAnchor) {
        const _drift = _driftAnchor.getBoundingClientRect().top - _savedTaskTop;
        if (Math.abs(_drift) > 2) window.scrollTo(0, scrollY + _drift);
      }
    }

    if (Math.abs(lockY - scrollY) > 2) {
      // Animate the fixed body to the original scroll position (ease-out, 200ms —
      // matches focus exit animation). Visual position is correct at end, so the
      // subsequent scrollTo in _doUnfix causes no visible snap.
      document.body.style.transition = 'top 200ms cubic-bezier(0.16, 1, 0.3, 1)';
      document.body.style.top = `-${scrollY}px`;
      setTimeout(_doUnfix, 210);
    } else {
      _doUnfix();
    }

    const closingTask   = uiTaskEl;
    const closingTaskId = uiTaskId;
    
    // Track focus time before clearing state — always, not just on full completion.
    // _trackFocusTime guards against double-counting (st.tracked) and sub-minute sessions.
    if (closingTaskId) {
      const _st      = getState(closingTaskId);
      const _hadTime = _st.rem < TOTAL; // any focus time was spent
      _trackFocusTime(closingTaskId);
      // Stop the session so no "zombie" survives. closeUI tears the timer down
      // (tickHandle cleared, PiP closed) but left st.running=true here; the
      // visibilitychange correction would later "complete" that zombie with a
      // chime even though no focus UI is active. Click-outside stopped it
      // manually; Escape / task-switch / other closeUI(false) paths did not. (BUG-044)
      _st.running   = false;
      _st.paused    = false;
      _st.wallStart = null;
      // BUG-043: partial focus on an aged card never called _logSession, so the
      // activity signal stayed unset and the card stayed dimmed. Fix for both
      // Trello and manual tasks — whichever completes _logSession already set
      // the signal; the guard skips those to avoid double-work.
      if (_hadTime && closingTaskId.startsWith('trello_')) {
        // Trello: today_trello_focus map is the activity signal (no lastActive field)
        const _fm = _getTrelloFocus();
        if (!_fm[closingTaskId]) {
          _fm[closingTaskId] = 1;
          _setTrelloFocus(_fm);
          if (closingTask) delete closingTask.dataset.ageBucket;
        }
        _markTrelloActive(closingTaskId); // persistent un-age (BUG-064)
      } else if (_hadTime && closingTaskId.startsWith('manual_')) {
        // Manual: lastActive is the activity signal — always safe to refresh;
        // _logSession already set it for completed sessions, overwriting is harmless.
        const _mIdx = manualTasks.findIndex(t => t.id === closingTaskId);
        if (_mIdx !== -1) {
          manualTasks[_mIdx].lastActive = Date.now();
          _saveManual();
          if (closingTask) delete closingTask.dataset.ageBucket;
        }
      }
    }

    // The persisted session means "a focus session is in flight". ANY close ends it —
    // this used to be gated behind doResetState, but every user-facing exit (Escape,
    // click-outside, task switch, PiP close) passes false, so the key survived and the
    // next render restored it. Cleared synchronously: the 200ms window below is exactly
    // when a render can fire. (BUG-065)
    localStorage.removeItem('today_focus_session');

    // Let CSS transition play (200ms) then clean up DOM classes
    const myGen = ++focusGen;
    setTimeout(() => {
      // Release the task we closed — but never strip .focused off whatever is active
      // now (A -> B -> A inside 200ms would otherwise unstyle the live task).
      if (closingTask && closingTask !== uiTaskEl) {
        closingTask.classList.remove('focused');
        if (doResetState) closingTask.style.removeProperty('--progress');
      }
      // Superseded by a newer open/close? The shared timer chrome now belongs to that
      // session — leave it alone rather than reparenting it to <body>. (BUG-065)
      if (myGen !== focusGen) return;

      appEl.classList.remove('focusing');
      // Timer already moved to body on task-check; only move it here for other close paths.
      if (!doResetState) {
        document.body.appendChild(timerEl);
        timerEl.hidden = true;
        timerEl.setAttribute('aria-hidden', 'true');
        kbdHint.hidden = true;
        kbdHint.setAttribute('aria-hidden', 'true');
      }

      if (doResetState && closingTaskId) {
        clearState(closingTaskId);
        fillEl.style.transform = 'scaleX(0)';
        fillEl.classList.remove('complete');
        _pulseComplete(fillEl, false);
        timeEl.textContent = fmt(TOTAL);
        timeEl.classList.remove('complete');
        setPaused(false);
      }
    }, 200);

    uiTaskEl = null;
    uiTaskId = null;
    window._focusUIActive = false;
    if (closingTaskId && window._a11yAnnounce) _a11yAnnounce('Focus ended.');

    // Timer was paused before closeUI — nothing to continue
  }

  window._focusExpandTimer = function() {
    if (!timerEl || !timerEl.classList.contains('open')) return;
    timerEl.style.maxHeight = timerEl.scrollHeight + 'px';

    // If scroll is locked (position:fixed during focus), shift the lock offset
    // so the newly-expanded block stays inside the viewport.
    // Use scrollHeight for the final bottom — rect.bottom is mid-transition and wrong.
    // The fixed add-task-row footer sits at the bottom of the viewport (measured live
    // so zoom/resize changes are respected). Without accounting for it the timer can
    // slide 50px behind the footer even after overflow correction.
    if (document.body.style.position === 'fixed') {
      const rect = timerEl.getBoundingClientRect();
      const _addRow = document.querySelector('.add-task-row');
      const _footerH = _addRow ? _addRow.getBoundingClientRect().height : 70;
      const overflow = (rect.top + timerEl.scrollHeight) - (window.innerHeight - _footerH - 8);
      if (overflow > 0) {
        const currentTop = parseInt(document.body.style.top || '0', 10);
        document.body.style.top = (currentTop - overflow) + 'px';
      }
    }
  };

  // ── Start fresh session on a task ─────────────────────────────────────────
  function start(taskEl) {
    const taskId = taskEl.dataset.taskid || taskEl.dataset.habitId;

    // Warm up the shared AudioContext on this user gesture so it stays
    // alive and can play sounds even when the tab loses focus later.
    _primeAudio();

    // Stop any existing tick
    clearTimeout(tickHandle);

    // If switching tasks, reset the previous task's state
    if (uiTaskId && uiTaskId !== taskId) clearState(uiTaskId);

    const st      = getState(taskId);
    st.rem        = TOTAL;
    st.running    = true;
    st.paused     = false;
    st.wallStart  = Date.now();
    st.tracked    = false;  // Reset tracked flag for new session
    playStartSound();

    openUI(taskEl, taskId);
    _saveSession(taskId, getState(taskId));
    tickFor(taskId);
  }

  // ── Pause the active task ─────────────────────────────────────────────────
  function pause() {
    if (!uiTaskId) return;
    const st = getState(uiTaskId);
    if (!st.running) return;
    clearTimeout(tickHandle);
    st.running   = false;
    st.paused    = true;   // explicit user pause — survives UI dismiss
    st.wallStart = null;
    _saveSession(uiTaskId, st);
    setPaused(true);
    _updateBreatheOverlay(true);
    if (window._a11yAnnounce) _a11yAnnounce('Focus paused.');
  }

  // ── Resume the active task ────────────────────────────────────────────────
  function resume() {
    if (!uiTaskId) return;
    const st = getState(uiTaskId);
    if (st.running || st.rem <= 0) return;
    st.running   = true;
    st.paused    = false;
    st.wallStart = Date.now();
    setPaused(false);
    _updateBreatheOverlay(false);
    playResumeSound();
    tickFor(uiTaskId);
    if (window._a11yAnnounce) _a11yAnnounce('Focus resumed.');
  }

  function toggle() {
    if (!uiTaskId) return;
    getState(uiTaskId).running ? pause() : resume();
  }
  
  function _updateBreatheOverlay(paused) {
    const overlay = document.getElementById('breatheOverlay');
    if (overlay) overlay.classList.toggle('active', paused);
  }

  // ── Session persistence — survive iOS PWA reload when backgrounded ─────────
  // Saved to localStorage on every tick and on pause, cleared on complete/close.
  // On reload, _tryRestoreFocusSession re-opens the timer or silently records.
  function _saveSession(taskId, st) {
    try {
      localStorage.setItem('today_focus_session', JSON.stringify({
        taskId, rem: st.rem, savedAt: Date.now(), paused: !!st.paused,
      }));
    } catch (e) { /* quota — skip */ }
  }

  // Shared recording logic used by completeFor() and _tryRestoreFocusSession()
  // (background auto-complete). Handles the BUG-063 day-boundary guard.
  function _recordFocusComplete(taskId) {
    const _rDate = localStorage.getItem('stat_focus_mins_date') || '';
    if (_rDate && _rDate !== _getAppDay()) {
      const _rPre = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
      if (_rPre > 0) localStorage.setItem('stat_focus_mins_yesterday_snapshot', _rPre);
    }
    const _rPrev = _rDate === _getAppDay() ? parseInt(localStorage.getItem('stat_focus_mins_today') || '0') : 0;
    localStorage.setItem('stat_focus_mins_today', _rPrev + 25);
    localStorage.setItem('stat_focus_mins_date', _getAppDay());
    _logSession(taskId);
    _memoryOnFocusComplete(25);
    localStorage.removeItem('today_focus_session');
    updateStats();
  }

  // ── Tick for a specific taskId ────────────────────────────────────────────
  function tickFor(taskId) {
    const st = getState(taskId);
    if (!st.running) return;
    if (st.rem <= 0) { completeFor(taskId); return; }
    st.rem--;
    // Advance wallStart by exactly 1s on each tick.
    // This ensures visibilitychange correction only accounts for the gap
    // since the last tick (throttling gap), not time already counted. (BUG-013)
    if (st.wallStart) st.wallStart += 1000;
    // Reached zero — complete in this same tick. Previously the decrement-to-0
    // tick only drew "00:00" + a full bar and scheduled another tick, so
    // completeFor (which adds .complete + "again?" + pulse) fired ~1s late: the
    // bar sat full and static for a second before it started blinking. (BUG-028)
    if (st.rem <= 0) { completeFor(taskId); return; }
    // Only update DOM if this task is currently showing
    if (taskId === uiTaskId && uiTaskEl) {
      timeEl.textContent = fmt(st.rem);
      setProgress(1 - st.rem / TOTAL, uiTaskEl);
      // Sync PiP widget if open
      if (window._pipSync) window._pipSync(st.rem, TOTAL);
    }
    _saveSession(taskId, st);
    tickHandle = setTimeout(() => tickFor(taskId), 1000);
  }

  // ── Continue ticking for a background task (UI dismissed, not user-paused) ──
  function continueTicking(taskId) {
    const st = getState(taskId);
    if (!st.running || st.paused || st.rem <= 0) return;
    tickHandle = setTimeout(() => tickFor(taskId), 1000);
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  function completeFor(taskId) {
    const st = getState(taskId);
    // Guard against double-call (can happen if PiP RAF and tickFor both hit zero)
    if (!st.running) return;
    st.running   = false;
    st.rem       = 0;
    st.paused    = false;
    st.wallStart = null;
    st.tracked   = true;  // Mark as already tracked to prevent double-counting on closeUI

    // Update DOM if visible — fill turns accent, time shows "again?"
    if (taskId === uiTaskId && uiTaskEl) {
      setProgress(1, uiTaskEl);
      setPaused(false);
      fillEl.classList.add('complete');
      _breatheRun(fillEl, false);
      timeEl.classList.add('complete');
      timerEl.classList.add('complete'); // cursor: pointer
      timeEl.textContent = 'again?';
      // Final exhale: one slow breath resolves the session before the complete pulse begins
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        fillEl.animate(
          [{ opacity: 1 }, { opacity: 0.65 }, { opacity: 1 }],
          { duration: 2500, easing: 'ease-in-out', fill: 'none' }
        ).onfinish = function() { _pulseComplete(fillEl, true); };
      } else {
        _pulseComplete(fillEl, true);
      }
    }

    _recordFocusComplete(taskId);
    if (window._a11yAnnounce) _a11yAnnounce('Focus session complete.');
    playChime();
    _haptic('success');

    // Stays in complete state — click on timer bar restarts the session
  }

  // ── Persist a session for habit or task ───────────────────────────────────
  function _logSession(taskId) {
    // Habit
    const habitIdx = habitsList.findIndex(h => h.id === taskId);
    if (habitIdx !== -1) {
      habitsList[habitIdx].focusSessions = (parseInt(habitsList[habitIdx].focusSessions) || 0) + 1;
      _saveHabits();
      // Update badge if visible
      const habitDom = document.querySelector('.habit[data-habit-id="' + CSS.escape(taskId) + '"]');
      const badge = habitDom ? habitDom.querySelector('.session-count') : null;
      if (badge) { badge.textContent = habitsList[habitIdx].focusSessions + ' 🍅'; badge.classList.add('has-sessions'); }
      return;
    }
    // Manual task
    const manualIdx = manualTasks.findIndex(t => t.id === taskId);
    if (manualIdx !== -1) {
      manualTasks[manualIdx].focusSessions = (parseInt(manualTasks[manualIdx].focusSessions) || 0) + 1;
      manualTasks[manualIdx].lastActive = Date.now(); // Reset age timer
      _saveManual();
      const taskDom = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
      if (taskDom) taskDom.removeAttribute('data-age-bucket'); // Remove visual aging immediately
      const badge = taskDom ? taskDom.querySelector('.session-count') : null;
      if (badge) { badge.textContent = manualTasks[manualIdx].focusSessions + ' 🍅'; badge.classList.add('has-sessions'); }
      return;
    }
    // Trello task — write to daily map (activity/un-dim signal) AND total map (display)
    const focusMap = _getTrelloFocus();
    focusMap[taskId] = (focusMap[taskId] || 0) + 1;
    _setTrelloFocus(focusMap);
    const totalMap = _getTrelloFocusTotal();
    totalMap[taskId] = (totalMap[taskId] || 0) + 1;
    _setTrelloFocusTotal(totalMap);
    _markTrelloActive(taskId); // persistent un-age (BUG-064)
    const taskDom = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
    const badge = taskDom ? taskDom.querySelector('.session-count') : null;
    if (badge) { badge.textContent = totalMap[taskId] + ' 🍅'; badge.classList.add('has-sessions'); }
  }

  // ── Tab visibility correction ─────────────────────────────────────────────
  // On returning to tab: compute wall-clock elapsed, jump rem forward.
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) return;
    // Find any running task state and correct for elapsed time
    Object.keys(taskStates).forEach(function(taskId) {
      const st = taskStates[taskId];
      if (!st.running || !st.wallStart) return;
      const elapsed = Math.floor((Date.now() - st.wallStart) / 1000);
      st.wallStart  = Date.now();
      st.rem        = Math.max(0, st.rem - elapsed);
      clearTimeout(tickHandle);
      if (st.rem <= 0) {
        completeFor(taskId);
      } else {
        // Sync display if this is the visible task
        if (taskId === uiTaskId && uiTaskEl) syncDisplay(taskId, uiTaskEl);
        tickFor(taskId);
      }
    });
    // If timer completed in the background, the fill's pulse animation created
    // a GPU compositor layer while hidden. On restore that layer can render at
    // the wrong position, masking the task list ("blank" UI). Pause/resume the
    // WAAPI pulse to force the compositor to recreate the layer at the correct
    // position. (BUG-004 recurrence; pulse is WAAPI since v2.17.94 — the old
    // animationPlayState toggle targeted the deleted CSS animation, a no-op.)
    const fill = document.getElementById('focusFill');
    if (fill && fill._pulseAnim) {
      fill._pulseAnim.pause();
      requestAnimationFrame(() => { if (fill._pulseAnim) fill._pulseAnim.play(); });
    }
  });

  // ── Click handler ─────────────────────────────────────────────────────────
  document.addEventListener('click', function(e) {
    // Header and recording buttons: button's own onclick already fires the panel toggle
    // (bubbling order: element onclick first, document listener second). We just need to
    // close focus here and bail — the panel is already opening.
    if (uiTaskId && e.target.closest('#todayLogo, #habitsBtn, #trelloBtn, #infoBtn, #voiceNoteBtn, #meetingBtn')) {
      closeUI(false);
      return;
    }
    if (e.target.closest('.task-delete')) return;
    if (e.target.closest('.task-check'))  return;
    if (e.target.closest('.task-copy'))   return;
    if (e.target.closest('.task-copy'))   return;  // copy button — handled by event delegation
    if (e.target.closest('.zone-badge'))  return;  // pull button in SOON/PAST
    if (e.target.closest('.zone-list'))   return;  // don't focus tasks in SOON/PAST zones
    if (e.target.closest('.habit-check')) return;
    if (e.target.closest('.task-link')) return;
    if (e.target.closest('.focus-timer')) return;
    if (e.target.closest('.habit-edit-input')) return;
    if (e.target.closest('.habit-edit-delete')) return;
    if (e.target.closest('#habitAddRow')) return;
    if (e.target.closest('#habitEditBtn')) return;
    if (e.target.closest('#habitNewBtn')) return;

    // Recognise both task rows and habit rows
    const task    = e.target.closest('.task');
    const habitEl = !task ? e.target.closest('.habit[data-habit-id]') : null;
    const focusEl = task || habitEl;
    const focusId = task ? task.dataset.taskid
                  : habitEl ? habitEl.dataset.habitId
                  : null;

    if (!focusEl) {
      // Outside all tasks/habits — dismiss UI and pause timer
      if (uiTaskEl) {
        const st = getState(uiTaskId);
        if (st.running) {
          clearTimeout(tickHandle);
          st.running   = false;
          st.paused    = false;
          st.wallStart = null;
        }
        closeUI(false);
      }
      return;
    }

    if (task && task.classList.contains('done')) return;

    const taskId = focusId;

    if (focusEl === uiTaskEl) {
      // Clicked the currently visible task
      const st = getState(taskId);
      if (st.rem <= 0) {
        // Timer complete — one click restarts the session and logs the new one
        fillEl.classList.remove('complete');
        _pulseComplete(fillEl, false);
        timeEl.classList.remove('complete');
        st.rem       = TOTAL;
        st.running   = true;
        st.paused    = false;
        st.wallStart = Date.now();
        setPaused(false);
        syncDisplay(taskId, uiTaskEl);
        playStartSound();
        tickFor(taskId);
        return;
      }
      // Only resume if user explicitly paused (space) — not just running normally
      if (!st.running && st.paused && st.rem > 0) resume();
      return;
    }

    // Clicked a task/habit that has an in-progress session (UI was dismissed).
    // rem must be > 0: a *completed* session (rem === 0) is not resumable — it must
    // fall through to start() so one click begins a fresh countdown, like any other
    // task. Without the `> 0`, a completed-then-dismissed task re-opened idle at 25:00
    // and needed an extra click to start. (BUG-027)
    if (taskStates[taskId] && taskStates[taskId].rem > 0 && taskStates[taskId].rem < TOTAL) {
      const st = getState(taskId);
      // Stop any background tick for this task — openUI + tickFor will restart it
      clearTimeout(tickHandle);
      st.running = false; // temporarily so tickFor doesn't double-fire
      openUI(focusEl, taskId);
      // openUI's internal close cleared the persisted session; re-assert it here so a
      // re-opened paused task still survives an iOS kill. tickFor overwrites this a
      // moment later in the auto-resume branch, which is harmless. (BUG-065)
      _saveSession(taskId, st);
      if (!st.paused && st.rem > 0) {
        // Was running (or should be) — auto-resume
        st.running   = true;
        st.paused    = false;
        st.wallStart = Date.now();
        setPaused(false);
        playResumeSound();
        tickFor(taskId);
      }
      // If st.paused=true: show paused label, wait for click/space
      return;
    }

    // Fresh start on a new task/habit
    start(focusEl);
  }, false);

  // ── Tapping the add bar exits focus mode ─────────────────────────────────
  const _addInput = document.getElementById('newTask');
  if (_addInput) {
    _addInput.addEventListener('focus', function() {
      if (uiTaskId) closeUI(false);
    });
  }

  // ── Keyboard — guarded against accidental input-field triggers ────────────
  document.addEventListener('keydown', function(e) {
    // Allow native OS shortcuts (Cmd+H to hide, Cmd+Q to quit, etc.)
    if (e.metaKey || e.ctrlKey) return;
    
    if (!uiTaskId) return;
    const active  = document.activeElement;
    const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    const onRow = active?.matches?.('.task[data-taskid],.habit[data-habit-id]');
    if (e.code === 'Space' && !inInput && !onRow) { e.preventDefault(); toggle(); }
    if (e.code === 'Escape') { closeUI(false); }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Picture-in-Picture Focus Widget
  // Always-on-top floating timer using Document PiP API (Chrome 116+, FF 148+)
  // Auto-opens when leaving tab during focus, persists until focus ends
  // ══════════════════════════════════════════════════════════════════════════
  (function initPiP() {
    // Feature detection — bail if not supported
    if (!('documentPictureInPicture' in window)) return;

    let pipWindow = null;
    let pipFillEl = null;
    let pipTimeEl = null;
    let pipBarEl  = null;
    let openPipTimeout = null;
    let _pipRestoredFromButton = false; // PiP "open app" was tapped — don't close PiP on restore
    let _hadPiP  = false; // PiP was open before restore — reopen immediately on next restore
    let _pipDone = false; // PiP is in complete state — pause button shows "Again"

    // Auto-open PiP when leaving tab during focus mode
    // Note: Document PIP API requires a user gesture. Opening PIP on visibilitychange
    // may fail if too much time has passed since the user clicked to start focus.
    // We try immediately first, then with a short delay as fallback.
    document.addEventListener('visibilitychange', function() {
      if (!uiTaskId) return; // Not in focus mode

      clearTimeout(openPipTimeout);

      if (document.hidden) {
        const st = getState(uiTaskId);
        if (st.rem <= 0) return; // Timer complete — no PiP needed for a finished session

        if (pipWindow && !pipWindow.closed) {
          // PiP already open (kept alive from button restore) — sync and let it float up
          if (window._pipSync && uiTaskId) {
            const st2 = getState(uiTaskId);
            window._pipSync(st2.rem, TOTAL);
          }
          // Start a new clock for the current task — old clock stops itself when
          // it sees uiTaskId !== clockTaskId. (BUG-011 ghost chime)
          startPiPClock();
          return;
        }

        // No existing PiP — close any stale references and open fresh
        pipWindow = null;
        pipFillEl = null;
        pipTimeEl = null;
        pipBarEl  = null;

        // Try opening immediately (might work if user gesture is still valid)
        openPiP().catch(() => {});

        // Also try after a short delay (in case immediate failed)
        openPipTimeout = setTimeout(async function() {
          if (!document.hidden) return; // User came back
          if (!uiTaskId) return; // Focus ended
          if (pipWindow && !pipWindow.closed) return; // Already opened
          await openPiP().catch(() => {});
        }, 150);

      } else {
        // Window restored — always sync PiP if open (handles complete state too). (BUG-025 extension)
        _pipRestoredFromButton = false;
        if (pipWindow && !pipWindow.closed && uiTaskId) {
          const st = getState(uiTaskId);
          if (window._pipSync) window._pipSync(st.rem, TOTAL);
        }

        // If PiP was open before restore but browser auto-closed it (manual dock/Alt+Tab restore),
        // reopen PiP — but only for running/paused sessions; complete sessions don't need PiP.
        const stRestore = getState(uiTaskId);
        if (_hadPiP && uiTaskId && (!pipWindow || pipWindow.closed) && stRestore.rem > 0) {
          openPiP().catch(() => {});
        }
      }
    });

    async function openPiP() {
      if (!uiTaskId) return;
      if (!document.hidden) return; // Only open when document is hidden
      if (pipWindow && !pipWindow.closed) return; // Already open

      try {
        pipWindow = await documentPictureInPicture.requestWindow({
          width: 300,
          height: 200,
          disallowReturnToOpener: true
        });

        _pipDone = false; // Fresh PiP — reset complete state
        const taskName = getTaskName(uiTaskId);
        const st = getState(uiTaskId);
        const baseUrl = window.location.origin;

        // Full 300×200 design — big centered timer, full-width progress bar
        pipWindow.document.body.innerHTML = `
          <style>
            :root {
              --pip-bg:               #0e0e10;
              --pip-accent:           #c8f060;
              --pip-text-muted:       rgba(255,255,255,0.50);
              --pip-fill-track:       rgba(200,240,96,0.08);
              --pip-fill-bar:         rgba(200,240,96,0.20);
              --pip-overlay:          rgba(14,14,16,0.85);
              --pip-btn-bg:           rgba(200,240,96,0.15);
              --pip-btn-border:       rgba(200,240,96,0.30);
              --pip-btn-hover-bg:     rgba(200,240,96,0.25);
              --pip-btn-hover-border: rgba(200,240,96,0.50);
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            @font-face {
              font-family: 'Syne';
              src: url('${baseUrl}/fonts/syne/syne-v24-latin_latin-ext-700.woff2') format('woff2');
              font-weight: 700;
            }
            @font-face {
              font-family: 'DM Mono';
              src: url('${baseUrl}/fonts/DM%20Mono/dm-mono-v16-latin-300.woff2') format('woff2');
              font-weight: 300;
            }
            html, body {
              width: 100%;
              height: 100%;
              background: var(--pip-bg);
              overflow: hidden;
            }
            .pip-widget {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              position: relative;
            }
            .pip-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 20px;
            }
            .pip-task {
              font-family: 'DM Mono', 'SF Mono', Monaco, monospace;
              font-size: 13px;
              font-weight: 300;
              color: var(--pip-text-muted);
              letter-spacing: 0.02em;
              margin-bottom: 8px;
              text-align: center;
              max-width: 260px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .pip-time {
              font-family: 'Syne', system-ui, sans-serif;
              font-size: 72px;
              font-weight: 700;
              color: var(--pip-accent);
              letter-spacing: -0.03em;
              font-variant-numeric: tabular-nums;
              line-height: 1;
            }
            .pip-bar {
              width: 100%;
              height: 32px;
              background: var(--pip-fill-track);
              position: relative;
            }
            .pip-fill {
              position: absolute;
              top: 0;
              left: 0;
              bottom: 0;
              background: var(--pip-fill-bar);
              /* No transition — animated by RAF in _pipSync for accuracy */
            }
            .pip-controls {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              opacity: 0;
              background: var(--pip-overlay);
              transition: opacity 0.15s ease;
            }
            .pip-bar:hover .pip-controls,
            .pip-bar:focus-within .pip-controls,
            .pip-bar.complete .pip-controls {
              opacity: 1;
            }
            .pip-btn {
              background: var(--pip-btn-bg);
              border: 1px solid var(--pip-btn-border);
              color: var(--pip-accent);
              padding: 6px 16px;
              border-radius: 5px;
              font-family: 'DM Mono', 'SF Mono', Monaco, monospace;
              font-size: 11px;
              font-weight: 300;
              cursor: pointer;
              letter-spacing: 0.02em;
              transition: background 0.15s ease, border-color 0.15s ease;
            }
            .pip-btn:hover {
              background: var(--pip-btn-hover-bg);
              border-color: var(--pip-btn-hover-border);
            }
            .pip-btn:focus-visible {
              outline: 2px solid var(--pip-accent);
              outline-offset: 2px;
            }
            @media (prefers-reduced-motion: reduce) {
              .pip-controls, .pip-btn { transition: none; }
            }
          </style>
          <div class="pip-widget">
            <div class="pip-content">
              <div class="pip-task" id="pipTask">${esc(taskName)}</div>
              <div class="pip-time" id="pipTime" role="timer" aria-label="Focus time remaining">${fmt(st.rem)}</div>
            </div>
            <div class="pip-bar">
              <div class="pip-fill" id="pipFill" role="progressbar" aria-label="Focus session progress" aria-valuemin="0" aria-valuemax="1500" aria-valuenow="${TOTAL - st.rem}"></div>
              <div class="pip-controls">
                <button class="pip-btn" id="pipOpen" aria-label="Open TODAY">Open</button>
                <button class="pip-btn" id="pipPause" aria-pressed="false" aria-label="Pause focus timer">Breathe</button>
                <button class="pip-btn" id="pipClose" aria-label="End focus session">Rest</button>
              </div>
            </div>
          </div>
        `;

        // Set PIP window title
        pipWindow.document.title = '✦ TODAY';

        pipFillEl = pipWindow.document.getElementById('pipFill');
        pipTimeEl = pipWindow.document.getElementById('pipTime');
        pipBarEl  = pipFillEl ? pipFillEl.parentElement : null;

        // Set initial progress
        const progress = (1 - st.rem / TOTAL) * 100;
        pipFillEl.style.width = progress + '%';

        // Wire up controls
        pipWindow.document.getElementById('pipOpen').addEventListener('click', function() {
          // User tapped "open app" inside PiP — set flag so visibilitychange
          // doesn't close the PiP window on restore. It stays alive, hidden behind
          // the main tab. When user minimizes again, existing PiP comes to front
          // without needing a new requestWindow() call (no user gesture needed).
          _pipRestoredFromButton = true;
          window.focus();
        });

        const pauseBtn = pipWindow.document.getElementById('pipPause');
        pauseBtn.addEventListener('click', function() {
          if (_pipDone) {
            // "Again" — restart the session
            _pipDone = false;
            const st = getState(uiTaskId);
            st.rem       = TOTAL;
            st.running   = true;
            st.paused    = false;
            st.wallStart = Date.now();
            this.textContent = 'Breathe';
            // Clear complete state from main UI — otherwise fill pulsates on restore (BUG-022)
            fillEl.classList.remove('complete');
            _pulseComplete(fillEl, false);
            timeEl.classList.remove('complete');
            timerEl.classList.remove('complete');
            if (pipBarEl) pipBarEl.classList.remove('complete');
            if (uiTaskEl) setProgress(0, uiTaskEl);
            timeEl.textContent = fmt(TOTAL);
            playStartSound();
            startPiPClock();
          } else {
            toggle();
            const newSt = getState(uiTaskId);
            this.textContent = newSt.paused ? 'Resume' : 'Breathe';
            this.setAttribute('aria-pressed', String(newSt.paused));
            this.setAttribute('aria-label', newSt.paused ? 'Resume focus timer' : 'Pause focus timer');
          }
        });

        pipWindow.document.getElementById('pipClose').addEventListener('click', function() {
          _hadPiP = false; // User explicitly closed PiP — don't reopen on next restore
          if (pipWindow) pipWindow.close();
          closeUI(false);
        });

        // Clean up references when PiP is closed (user closed it or focus ended)
        pipWindow.addEventListener('pagehide', function() {
          // _hadPiP stays true if browser closed it (restore) — we want to reopen next time
          // _hadPiP is set to false only on explicit user close (above)
          pipWindow = null;
          pipFillEl = null;
          pipTimeEl = null;
          pipBarEl  = null;
        });

        _hadPiP = true; // Track that PiP was open
        // Start the PiP's own RAF-driven clock — wall-clock accurate
        startPiPClock();

      } catch (err) {
        // Silent fail — user gesture may not be available
      }
    }

    // Get task name from ID
    function getTaskName(taskId) {
      const manual = manualTasks.find(t => t.id === taskId);
      if (manual) return manual.text;
      const habit = habitsList.find(h => h.id === taskId);
      if (habit) return habit.name;
      const taskEl = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
      if (taskEl) {
        const textEl = taskEl.querySelector('.task-text');
        if (textEl) return textEl.textContent;
      }
      return 'Focus';
    }

    // Expose sync function — called on open and on pause/resume.
    // The PiP drives its own display via RAF + wallStart (wall-clock accurate).
    // We no longer depend on the throttled setTimeout ticks from the hidden tab.
    window._pipSync = function(rem, total) {
      if (!pipWindow || pipWindow.closed) return;
      if (!pipFillEl || !pipTimeEl) return;
      const progress = (1 - rem / total) * 100;
      pipFillEl.style.width = progress + '%';
      pipFillEl.setAttribute('aria-valuenow', String(Math.round((progress / 100) * total)));
      pipTimeEl.textContent = fmt(rem);
      if (rem === 0) {
        _pipDone = true;
        const pauseBtn = pipWindow.document.getElementById('pipPause');
        if (pauseBtn) pauseBtn.textContent = 'Again';
        if (pipBarEl) pipBarEl.classList.add('complete');
      }
    };

    // PiP drives its own countdown via RAF with a fixed reference point.
    // Immune to tickFor's setTimeout drift and main tab throttling.
    // refTime + refRem = the anchor: "at refTime, there were refRem seconds left"
    function startPiPClock() {
      if (!pipWindow || pipWindow.closed || !uiTaskId) return;

      // Capture the task ID this clock was started for — by VALUE not reference.
      // If uiTaskId changes (user switches tasks while PiP is alive from BUG-014 path),
      // this clock must not fire completeFor on the new task. (BUG-011 ghost chime)
      const clockTaskId = uiTaskId;

      // Anchor to current wall-clock reality
      const st = getState(clockTaskId);
      const initialElapsed = st.wallStart ? Math.floor((Date.now() - st.wallStart) / 1000) : 0;
      let refRem  = Math.max(0, st.rem - initialElapsed);
      let refTime = Date.now();
      let lastRem = refRem;
      let wasPaused = st.paused || !st.running;
      let rafId = null;

      function pipTick() {
        if (!pipWindow || pipWindow.closed || !pipFillEl || !pipTimeEl) return;
        // If the task this clock was started for is no longer active, stop the RAF
        if (uiTaskId !== clockTaskId) return;

        const cur = getState(clockTaskId);
        const nowPaused = cur.paused || !cur.running;

        if (nowPaused) {
          if (cur.rem === 0 && !cur.paused) {
            // Timer completed (not just paused) — update PiP to done state and stop RAF
            pipTimeEl.textContent = fmt(0);
            pipFillEl.style.width = '100%';
            pipFillEl.setAttribute('aria-valuenow', String(TOTAL));
            _pipDone = true;
            const pauseBtn = pipWindow.document.getElementById('pipPause');
            if (pauseBtn) pauseBtn.textContent = 'Again';
            if (pipBarEl) pipBarEl.classList.add('complete');
            return;
          }
          // Regular pause — show frozen time, keep polling slowly
          pipTimeEl.textContent = fmt(lastRem);
          pipFillEl.style.width = ((1 - lastRem / TOTAL) * 100) + '%';
          pipFillEl.setAttribute('aria-valuenow', String(TOTAL - lastRem));
          wasPaused = true;
          rafId = pipWindow.requestAnimationFrame(pipTick);
          return;
        }

        if (wasPaused) {
          // Just resumed — re-anchor reference point from current state
          const elapsed2 = cur.wallStart ? Math.floor((Date.now() - cur.wallStart) / 1000) : 0;
          refRem  = Math.max(0, cur.rem - elapsed2);
          refTime = Date.now();
          wasPaused = false;
        }

        // True remaining = refRem - time elapsed since refTime
        const elapsed = (Date.now() - refTime) / 1000;
        const currentRem = Math.max(0, refRem - elapsed);
        lastRem = Math.ceil(currentRem); // ceil so display matches main timer

        pipTimeEl.textContent = fmt(lastRem);
        pipFillEl.style.width = ((1 - lastRem / TOTAL) * 100) + '%';
        pipFillEl.setAttribute('aria-valuenow', String(TOTAL - lastRem));

        if (lastRem <= 0) {
          // Timer reached zero — trigger completion immediately from wall clock.
          // Don't wait for the throttled tickFor tick in the hidden main tab.
          completeFor(clockTaskId);
          // completeFor doesn't call _pipSync — update PiP done state here directly.
          // (The paused-branch detection on the next pipTick would handle it, but
          //  this branch returns without scheduling the next RAF.) (BUG-025 extension)
          if (pipWindow && !pipWindow.closed && pipTimeEl) {
            pipTimeEl.textContent = fmt(0);
            if (pipFillEl) pipFillEl.style.width = '100%';
            if (pipFillEl) pipFillEl.setAttribute('aria-valuenow', String(TOTAL));
            _pipDone = true;
            const _pb = pipWindow.document.getElementById('pipPause');
            if (_pb) _pb.textContent = 'Again';
            if (pipBarEl) pipBarEl.classList.add('complete');
          }
          return;
        }

        rafId = pipWindow.requestAnimationFrame(pipTick);
      }

      rafId = pipWindow.requestAnimationFrame(pipTick);

      pipWindow.addEventListener('pagehide', function() {
        if (rafId && pipWindow) pipWindow.cancelAnimationFrame(rafId);
      }, { once: true });
    }

    // Expose close function
    window._pipClose = function() {
      _hadPiP = false; // Focus ended — don't reopen PiP on next restore
      if (pipWindow && !pipWindow.closed) pipWindow.close();
    };
  })();
  };
}());
