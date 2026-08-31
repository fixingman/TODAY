// TODAY — AI assistant panel and post-add suggestion controller
window._startAssistant = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

    // ── Closure state ──
    let _aiLoadedOnce = false;
    let _aiReqSeq = 0;
    let _aiThread = [];
    let _aiAnalyzeTimeout = null;
    let _aiAnalyzeSeq = 0;
    let _aiPendingSuggestion = null;
    let _aiCurrentSuggestion = null;
    const _aiSuggestionExposureMs = 10000;

function toggleAI() {
  _aiPanelOpen ? closeAI() : openAI();
}

function openAI(skipAutoLoad) {
  const panel = document.getElementById('aiPanel');
  if (!panel) return;

  _aiCancelPendingSuggestion();

  // Close other panels
  ['configPanel','habitsPanel','infoPanel'].forEach(id =>
    document.getElementById(id)?.classList.remove('open'));
  _endConnectionsPrivacyVisit();

  _aiPanelOpen = true;
  _aiClearBadge(); // Clear proactive badge when panel opens
  panel.hidden = false;
  panel.setAttribute('aria-hidden', 'false');
  panel.classList.add('open');
  const backdrop = document.getElementById('aiBackdrop');
  if (backdrop) { backdrop.hidden = false; backdrop.setAttribute('aria-hidden', 'false'); backdrop.classList.add('open'); }
  document.body.classList.add('ai-chat-open');
  
  // Transform input to chat mode
  const input = document.getElementById('newTask');
  if (input) {
    input._origPlaceholder = input.placeholder;
    input.placeholder = 'Ask anything…';
  }
  toggleClearBtn(); // drop the ✦ ask affordance — panel is open now

  // One-time tip: the bar-then-✦ path works without opening this panel first
  if (_aiIsConfigured() && !localStorage.getItem('ai_bar_tip_seen')) {
    localStorage.setItem('ai_bar_tip_seen', '1');
    const tip = document.getElementById('aiBarTip');
    if (tip) tip.style.display = 'block';
  }

  syncActiveButtons();
  _haptic('medium');

  if (!_aiIsConfigured()) {
    _aiShowSetup();
  } else if (!skipAutoLoad) {
    _aiLoadedOnce = false;
    _aiLoad();
  } else {
    // Caller is about to fire its own request (✦ submit with text) — don't
    // start the proactive load; its late response would swap over the answer. (BUG-029b)
    _aiLoadedOnce = true;
  }
}

function closeAI() {
  // Save last AI message to conversation memory before closing
  const msgEl = document.getElementById('aiSuggestionMsg');
  const rawMsg = msgEl ? msgEl.textContent.trim() : '';
  if (rawMsg && rawMsg.length > 5 && appMemory && !rawMsg.includes('API key')) {
    if (!appMemory.recentConversations) appMemory.recentConversations = [];
    appMemory.recentConversations.unshift({
      message: rawMsg.slice(0, 200), // cap length
      date: _localISO(),
      time: new Date().getHours(),
    });
    // Keep last 5 conversations only
    if (appMemory.recentConversations.length > 5) {
      appMemory.recentConversations = appMemory.recentConversations.slice(0, 5);
    }
    _saveMemory();
  }

  _aiPanelOpen = false;
  _aiThread = [];
  const panel = document.getElementById('aiPanel');
  const backdrop = document.getElementById('aiBackdrop');
  panel?.classList.remove('open');
  backdrop?.classList.remove('open');
  setTimeout(() => {
    if (_aiPanelOpen) return;
    if (panel) { panel.hidden = true; panel.setAttribute('aria-hidden', 'true'); }
    if (backdrop) { backdrop.hidden = true; backdrop.setAttribute('aria-hidden', 'true'); }
  }, 320);
  document.body.classList.remove('ai-chat-open');
  
  // Restore input placeholder (recomputed — AI may have been connected mid-session)
  _updateBarPlaceholder();
  toggleClearBtn(); // refresh ✦ ask affordance for any text left in the bar

  syncActiveButtons();
}

// ── Setup state — not yet configured ─────────────────────────────────────────
function _aiShowSetup() {
  const provider = _aiGetProvider();
  const isGemini = provider === 'gemini';
  // _aiSetMsg deliberately uses textContent for AI output. Build this trusted
  // setup UI with DOM APIs so links remain interactive without reopening an
  // innerHTML/XSS path for model responses.
  const el = document.getElementById('aiSuggestionMsg');
  if (el) {
    el.textContent = '';
    el.className = 'ai-suggestion-msg';
    const wrap = document.createElement('span');
    wrap.className = 'ai-not-configured';
    wrap.append('Add a ');
    const keyLink = document.createElement('a');
    keyLink.href = isGemini ? 'https://aistudio.google.com/apikey' : 'https://platform.claude.com/login';
    keyLink.target = '_blank';
    keyLink.rel = 'noopener';
    keyLink.textContent = isGemini ? 'free Gemini API key' : 'Claude API key';
    wrap.append(keyLink, ' in ');
    const connectionsLink = document.createElement('a');
    connectionsLink.href = '#';
    connectionsLink.textContent = 'Connections ✦';
    connectionsLink.addEventListener('click', event => {
      event.preventDefault();
      closeAI();
      setTimeout(toggleConfig, 80);
    });
    wrap.append(connectionsLink, ' to activate.');
    el.appendChild(wrap);
  }
  _aiSetChips([
    { label: 'Open Connections', type: 'open_panel', payload: { panel: 'connections' }, primary: true },
    { label: 'Dismiss', type: 'dismiss', payload: {} },
  ]);
  _hideNlRow();
}

// ── Load: read state → call AI → render chips ─────────────────────────────────
async function _aiLoad() {
  if (_aiLoadedOnce) return;
  _aiLoadedOnce = true;
  const _seq = ++_aiReqSeq;

  _aiSetThinking();
  _aiSetChips([]);
  _hideNlRow();

  try {
    const ctx = _aiContext();
    const intro = _aiIntroMessage(ctx);

    // ── Deterministic chips for aging tasks (Option B) ──
    // The AI writes the message; we set the chips based on age.
    // This prevents the AI from randomly varying between move_soon/delete/break_down.
    const agingTasks = ctx.tasks.aging || [];
    const cooldowns = appMemory?.suggestionCooldowns || {};
    const today = _localISO();
    const COOLDOWN_DAYS = 7;
    const eligibleAging = agingTasks
      .sort((a, b) => b.ageDays - a.ageDays)
      .filter(t => {
        const last = cooldowns[t.id];
        if (!last) return true;
        return Math.floor((new Date(today) - new Date(last)) / 86400000) >= COOLDOWN_DAYS;
      });

    let deterministicChips = null;
    if (eligibleAging.length > 0) {
      const task = eligibleAging[0];
      if (task.ageDays >= 7) {
        // Very old — park it or let it go
        deterministicChips = [
          { label: 'Park for later', type: 'move_soon',    payload: { id: task.id }, primary: true },
          { label: 'Let it go',      type: 'delete_task',  payload: { id: task.id } },
          { label: 'Dismiss',        type: 'dismiss',       payload: {} },
        ];
      } else {
        // Medium (3-6 days) — start it or park it
        deterministicChips = [
          { label: 'Start it now',   type: 'start_focus',  payload: { id: task.id }, primary: true },
          { label: 'Park for later', type: 'move_soon',    payload: { id: task.id } },
          { label: 'Dismiss',        type: 'dismiss',       payload: {} },
        ];
      }
    }

    // If we have deterministic chips, tell AI to only return a message
    const messages = deterministicChips
      ? [{ role: 'user', content: intro + '\n\nRespond with ONLY the "message" field in your JSON — no actions array needed, chips are pre-set.' }]
      : [{ role: 'user', content: intro }];

    const result = await _aiCall(messages);
    if (_seq !== _aiReqSeq) return; // superseded by a user question while in flight (BUG-029b)
    if (result) {
      // Use pre-set chips if we have them, otherwise use AI's chips
      if (deterministicChips) {
        _aiSetMsg(result.message || '');
        _aiSetChips(deterministicChips);
      } else {
        _aiRenderResult(result);
      }
      // Seed thread with opening message so follow-up questions have context
      if (result.message) _aiThread = [{ role: 'assistant', content: result.message }];
      _showNlRow();
    }
  } catch(e) {
    if (_seq !== _aiReqSeq) return; // superseded — don't paint a stale error either
    const errText = e.message || '';
    // Detect HTML in error (function not deployed)
    const isHtml   = errText.includes('<!DOCTYPE') || errText.includes('<html');
    // Distinguish key problems from network/other problems
    const isKeyErr = errText.includes('API key') || errText.includes('not valid') ||
                     errText.includes('API_KEY') || errText.includes('401') || errText.includes('403');
    const isQuota  = errText.includes('quota') || errText.includes('429') || errText.includes('QUOTA');
    const msg = isHtml   ? 'Function not deployed — redeploy the site'
              : isKeyErr ? 'Invalid API key — check Connections'
              : isQuota  ? 'API quota exceeded — try again later'
              : errText  ? 'Can\'t reach AI — ' + errText.slice(0, 60)
              : 'Can\'t reach AI — check your connection';
    _aiSetMsg(msg);
    _aiSetChips([
      { label: 'Open Connections', type: 'open_panel', payload: { panel: 'connections' }, primary: true },
      { label: 'Dismiss', type: 'dismiss', payload: {} },
    ]);
    _aiLoadedOnce = false; // allow retry after fixing key
  }
}

// Build a terse state summary to send as the user message
function _aiIntroMessage(ctx) {
  const overdue = ctx.tasks.overdueCount;
  const totalPending = ctx.tasks.pending.length + ctx.tasks.trello.length;
  const habitsDue = ctx.habits.filter(h => !h.doneToday).length;
  const agingTasks = ctx.tasks.aging || [];
  
  // ── MORNING BRIEFING (first open of the day) ──
  if (ctx.isFirstOpenToday && ctx.timeOfDay === 'morning') {
    const parts = [];
    if (totalPending > 0) parts.push(`${totalPending} task${totalPending > 1 ? 's' : ''} waiting`);
    if (habitsDue > 0) parts.push(`${habitsDue} habit${habitsDue > 1 ? 's' : ''} due`);
    if (agingTasks.length > 0) parts.push(`${agingTasks.length} been here a while`);
    
    const summary = parts.length > 0 ? parts.join(', ') : 'clean slate';
    return `Good morning. First look: ${summary}. ${ctx.streak > 1 ? `Day ${ctx.streak} of your streak.` : ''} What matters today?`;
  }
  
  // ── WEEKLY REFLECTION (Sunday evening) ──
  if (ctx.dayOfWeek === 0 && ctx.timeOfDay === 'evening') {
    const w = ctx.weeklyStats;
    const parts = [];
    if (w.weekTasksDone > 0) parts.push(`${w.weekTasksDone} task${w.weekTasksDone !== 1 ? 's' : ''} done`);
    if (w.weekFocusMins >= 5) parts.push(_formatFocusTime(w.weekFocusMins) + ' focused');
    if (w.weekHabitsKept > 0) parts.push(`${w.weekHabitsKept} habit check${w.weekHabitsKept !== 1 ? 's' : ''}`);
    const summary = parts.length > 0 ? parts.join(', ') : 'a quieter week';
    const streakLine = ctx.streak > 1 ? ` Streak at ${ctx.streak}.` : '';
    return `Sunday evening. This week: ${summary}.${streakLine} How did it feel?`;
  }
  
  // ── STALE TASK AWARENESS — show if aging tasks exist, skip recently suggested ──
  if (agingTasks.length > 0) {
    const cooldowns = appMemory?.suggestionCooldowns || {};
    const today = _localISO();
    const COOLDOWN_DAYS = 7;
    
    // Filter out tasks suggested within the cooldown window
    const eligible = agingTasks
      .sort((a, b) => b.ageDays - a.ageDays)
      .filter(t => {
        const lastSuggested = cooldowns[t.id];
        if (!lastSuggested) return true;
        const daysSince = Math.floor((new Date(today) - new Date(lastSuggested)) / 86400000);
        return daysSince >= COOLDOWN_DAYS;
      });
    
    if (eligible.length > 0) {
      const oldest = eligible[0];
      // Record suggestion in cooldown
      if (appMemory) {
        appMemory.suggestionCooldowns[oldest.id] = today;
        _saveMemory();
      }
      if (oldest.ageDays >= 7) {
        return `"${oldest.text}" has been here ${oldest.ageDays} days. Maybe it's too big? Want me to help break it down?`;
      }
      return `"${oldest.text}" has been here ${oldest.ageDays} days. Still relevant, or ready to let it go?`;
    }
    // All aging tasks are on cooldown — fall through to behavioral insight
  }
  
  // ── BEHAVIORAL INSIGHT — always show if meaningful patterns exist ──
  const m = appMemory;
  if (m) {
    const insights = [];
    
    // Peak productivity hour insight
    if (m.preferences.peakHour !== null) {
      const hour = parseInt(m.preferences.peakHour);
      const hourStr = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
      const now = new Date().getHours();
      if (Math.abs(now - hour) <= 1) {
        insights.push(`It's around ${hourStr} — your peak productivity time. Good moment for the hard stuff.`);
      } else if (now < hour && (hour - now) <= 3) {
        insights.push(`You usually peak around ${hourStr}. Warming up — start light.`);
      }
    }
    
    // Focus time insight
    if (m.patterns.focusMinutesTotal > 60) {
      const hours = Math.round(m.patterns.focusMinutesTotal / 60);
      insights.push(`${hours}+ hours of focused time so far. That adds up.`);
    }
    
    // Streak insight
    if (ctx.streak >= 5 && ctx.streak < m.patterns.bestStreak) {
      insights.push(`${ctx.streak} days strong. Your best was ${m.patterns.bestStreak}. Getting close.`);
    } else if (ctx.streak >= 3) {
      insights.push(`Day ${ctx.streak}. You're building a rhythm.`);
    }
    
    // Days active insight
    if (m.totalDaysActive >= 14) {
      const weeks = Math.floor(m.totalDaysActive / 7);
      insights.push(`${weeks}+ weeks together. ${m.totalTasksCompleted} tasks completed along the way.`);
    }
    
    // Task keyword patterns
    const keywords = Object.entries(m.patterns.taskKeywords || {})
      .filter(([_, v]) => _kwCount(v) >= 3)
      .sort((a, b) => _kwCount(b[1]) - _kwCount(a[1]));
    if (keywords.length > 0) {
      const topKeyword = keywords[0][0];
      insights.push(`"${topKeyword}" keeps coming up in your tasks. Seems important to you.`);
    }
    
    // Cycle through insights deterministically — use day + hour to pick
    if (insights.length > 0) {
      const pick = (new Date().getDate() + new Date().getHours()) % insights.length;
      const insight = insights[pick];
      return `Good ${ctx.timeOfDay}. ${insight}`;
    }
  }
  
  // ── STANDARD CONTEXTUAL MESSAGES ──
  
  // Prioritize overdue items
  if (overdue > 0) {
    return `Good ${ctx.timeOfDay}. ${overdue} overdue task${overdue > 1 ? 's' : ''} need${overdue === 1 ? 's' : ''} attention. What's most urgent?`;
  }
  
  // ── ALL DONE — the reward moment ──
  if (totalPending === 0 && habitsDue === 0 && ctx.tasks.done.length > 0) {
    const doneCount = ctx.tasks.done.length;
    const warmMessages = [];
    
    // Base acknowledgments (always available)
    warmMessages.push(`${doneCount} things done. The list is clear.`);
    warmMessages.push(`All done. ${doneCount} off the list.`);
    warmMessages.push(`Clear. ${doneCount} completed.`);
    
    // Pattern-aware celebrations
    if (doneCount >= 5) {
      warmMessages.push(`${doneCount} things handled. That's a solid day.`);
      warmMessages.push(`${doneCount} done. You showed up today.`);
    }
    if (doneCount >= 8) {
      warmMessages.push(`${doneCount} tasks cleared. Impressive.`);
    }
    
    // Streak-aware
    if (ctx.streak >= 5) {
      warmMessages.push(`All clear. Day ${ctx.streak} of your streak.`);
    }
    if (ctx.streak >= 10) {
      warmMessages.push(`${doneCount} done, ${ctx.streak} days strong.`);
    }
    
    // Time-aware
    if (ctx.timeOfDay === 'morning' && doneCount >= 3) {
      warmMessages.push(`${doneCount} done before noon. Nice start.`);
    }
    if (ctx.timeOfDay === 'evening') {
      warmMessages.push(`Day's work done. ${doneCount} completed.`);
    }
    
    // Focus-aware
    const focusMinsToday = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
    if (focusMinsToday >= 50) {
      const focusStr = focusMinsToday >= 60 
        ? Math.floor(focusMinsToday / 60) + 'h ' + (focusMinsToday % 60) + 'm'
        : focusMinsToday + 'm';
      warmMessages.push(`${doneCount} done, ${focusStr} focused. Good day.`);
    }
    
    // Pick a random warm message
    const message = warmMessages[Math.floor(Math.random() * warmMessages.length)];
    return `Good ${ctx.timeOfDay}. ${message} Clear them or add more?`;
  }
  
  // ── EMPTY STATE — the companion invites ──
  if (totalPending === 0 && habitsDue === 0 && ctx.tasks.done.length === 0) {
    // Use memory patterns to make the invitation personal
    const m = appMemory;
    const prompts = [];
    
    // Pattern: typical morning add count
    if (ctx.timeOfDay === 'morning' && m.totalTasksCompleted > 20) {
      prompts.push(`What's one thing you'd feel good about finishing today?`);
      prompts.push(`Empty slate. What matters most this ${ctx.timeOfDay}?`);
    }
    
    // Pattern: they have focus time history
    if (m.patterns.focusMinutesTotal > 60) {
      prompts.push(`Ready for some focused work? What should we start with?`);
    }
    
    // Pattern: they have a streak going
    if (ctx.streak > 2) {
      prompts.push(`Day ${ctx.streak}. What's on your mind?`);
    }
    
    // Default gentle prompts
    prompts.push(`Nothing here yet. What would feel good to finish today?`);
    prompts.push(`Clean slate. What's one thing you want to do?`);
    prompts.push(`Empty list. What should I add?`);
    
    // Pick a prompt (slight randomness for variety)
    const prompt = prompts[Math.floor(Math.random() * Math.min(prompts.length, 3))];
    return `Good ${ctx.timeOfDay}. ${prompt}`;
  }
  
  // Normal state with tasks — vary the message by time and context
  const parts = [];
  if (totalPending) parts.push(`${totalPending} task${totalPending > 1 ? 's' : ''}`);
  if (habitsDue)    parts.push(`${habitsDue} habit${habitsDue > 1 ? 's' : ''}`);
  const summary = parts.join(' and ');
  
  // Contextual variations — deterministic rotation based on hour
  const hour = new Date().getHours();
  const focusMins = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
  const doneToday = ctx.tasks.done.length;
  
  // Afternoon with progress
  if (ctx.timeOfDay === 'afternoon' && doneToday > 0) {
    return `Good ${ctx.timeOfDay}. ${doneToday} done already, ${summary} left. What's next?`;
  }
  // Evening wind-down
  if (ctx.timeOfDay === 'evening' && totalPending > 0) {
    return `Evening. ${summary} still here. Tackle one more, or call it a day?`;
  }
  // Lots of tasks — empathetic
  if (totalPending >= 5) {
    return `Good ${ctx.timeOfDay}. ${summary} pending — that's a lot. Pick one to start with.`;
  }
  // Focus time today
  if (focusMins >= 25 && totalPending > 0) {
    return `Good ${ctx.timeOfDay}. ${_formatFocusTime(focusMins)} focused today, ${summary} left.`;
  }
  // Habits + tasks
  if (habitsDue > 0 && totalPending > 0) {
    return `Good ${ctx.timeOfDay}. ${summary} waiting. Habits or tasks first?`;
  }
  // Default — but with slight variation
  const defaults = [
    `Good ${ctx.timeOfDay}. ${summary} pending. Where to start?`,
    `Good ${ctx.timeOfDay}. ${summary} on the list. What matters most?`,
    `Good ${ctx.timeOfDay}. ${summary} waiting. One step at a time.`,
  ];
  return defaults[hour % defaults.length];
}

// ── Natural language from panel input ────────────────────────────────────────
// Send text typed in the main task-input bar directly to AI.
// Companion to _aiAskFromPanel (which reads from the in-panel input);
// this version takes the already-extracted text as a parameter. (BUG-029)
async function _aiSendFromInput(text) {
  if (!text) return;
  _aiLoadedOnce = true; // mark loaded so panel auto-load doesn't clobber our result
  const _seq = ++_aiReqSeq;
  _aiSetThinking();
  _aiSetChips([]);
  try {
    _aiThread.push({ role: 'user', content: text });
    const result = await _aiCall([..._aiThread]);
    if (_seq !== _aiReqSeq) return; // a newer request superseded this one (BUG-029b)
    if (result) {
      _aiRenderResult(result);
      if (result.message) _aiThread.push({ role: 'assistant', content: result.message });
      _showNlRow(); // panel may have opened with auto-load skipped — ensure follow-up input shows
    }
  } catch(e) {
    if (_seq !== _aiReqSeq) return;
    const errText = e.message || 'unknown';
    const isHtml = errText.includes('<!DOCTYPE') || errText.includes('<html');
    _aiSetMsg(isHtml ? 'Function not deployed' : 'Can\'t reach AI — ' + errText.slice(0, 50));
  }
}

async function _aiAskFromPanel() {
  const input = document.getElementById('aiNlInput');
  const text  = input?.value.trim();
  if (!text) return;
  input.value = '';
  _aiLoadedOnce = true; // prevent auto-reload
  const _seq = ++_aiReqSeq;
  _aiSetThinking();
  _aiSetChips([]);
  try {
    _aiThread.push({ role: 'user', content: text });
    const result = await _aiCall([..._aiThread]);
    if (_seq !== _aiReqSeq) return; // superseded (BUG-029b)
    if (result) {
      _aiRenderResult(result);
      if (result.message) _aiThread.push({ role: 'assistant', content: result.message });
    }
  } catch(e) {
    if (_seq !== _aiReqSeq) return;
    const errText = e.message || 'unknown';
    const isHtml = errText.includes('<!DOCTYPE') || errText.includes('<html');
    _aiSetMsg(isHtml ? 'Function not deployed' : 'Can\'t reach AI — ' + errText.slice(0, 50));
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function _aiRenderResult(result) {
  _aiSetMsg(result.message || '');
  _aiSetChips(result.actions || []);
}

function _aiSetThinking() {
  const el = document.getElementById('aiSuggestionMsg');
  if (el) {
    // Real span instead of ::after — WAAPI can't reliably target pseudo-elements
    el.innerHTML = '<span class="ai-thinking-dots">…</span>';
    el.className = 'ai-suggestion-msg thinking';
    _breathe(el.querySelector('.ai-thinking-dots'), _KF_BLINK, 1200);
  }
}

function _aiSetMsg(text) {
  const el = document.getElementById('aiSuggestionMsg');
  if (el) { el.textContent = text; el.className = 'ai-suggestion-msg'; }
}

function _aiSetChips(actions) {
  const el = document.getElementById('aiChips');
  if (!el) return;
  el.innerHTML = '';
  (actions || []).forEach((action, i) => {
    const btn = document.createElement('button');
    btn.className = 'ai-chip' + (action.primary || i === 0 ? ' primary' : '');

    let label = action.label || action.type;

    // For task-specific actions, append the actual task name(s) from the payload ID.
    // Prevents wrong-task confusion when AI message refers to one task but payload
    // has a different ID. User sees "Let it go · Write the report" and can verify
    // before tapping. Handles both single id and ids array. (critical: message and payload can diverge)
    const taskId = action.payload?.id;
    const taskIds = action.payload?.ids;
    if (['delete_task', 'move_soon', 'check_task', 'start_focus'].includes(action.type)) {
      if (taskIds && taskIds.length > 0) {
        // Multi-task: show count + first task name
        const first = manualTasks.find(t => t.id === taskIds[0]);
        const name = first ? (first.text || '').trim() : '';
        const short = name.length > 18 ? name.slice(0, 16) + '…' : name;
        if (taskIds.length > 1) {
          label = label + ' · ' + taskIds.length + ' tasks' + (short ? ' incl. ' + short : '');
        } else if (short) {
          label = label + ' · ' + short;
        }
      } else if (taskId) {
        const task = manualTasks.find(t => t.id === taskId)
                  || (window.trelloTasks || []).find(t => t.id === taskId);
        if (task) {
          const name = (task.text || task.name || '').trim();
          const short = name.length > 22 ? name.slice(0, 20) + '…' : name;
          if (short) label = label + ' · ' + short;
        }
      }
    }

    btn.textContent = label;
    btn.onclick = () => _aiExecute(action);
    el.appendChild(btn);
  });
}

function _showNlRow() {
  const el = document.getElementById('aiNlRow');
  if (el) el.style.display = '';
}
function _hideNlRow() {
  const el = document.getElementById('aiNlRow');
  if (el) el.style.display = 'none';
}

// ── API call ──────────────────────────────────────────────────────────────────
async function _aiCall(messages) {
  const key = _aiGetKey();
  if (!key) { _aiShowSetup(); return null; }

  const res = await fetch('/.netlify/functions/ai-assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: _aiGetProvider(),
      apiKey: key,
      messages,
      systemPrompt: _aiSystemPrompt(_aiContext()),
    }),
  });

  // Always try to parse as JSON first
  let data;
  try {
    const text = await res.text();
    // Check if it's HTML (function not deployed or Netlify error)
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error('Function not deployed — redeploy the site');
    }
    data = JSON.parse(text);
  } catch(e) {
    if (e.message.includes('Function not deployed')) throw e;
    throw new Error('Invalid response from server');
  }

  // Check for error in JSON response
  if (data.error) {
    throw new Error(data.error);
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

// ── Context ───────────────────────────────────────────────────────────────────
function _aiContext() {
  const hour     = new Date().getHours();
  const todayStr = _habitTodayISO(); // YYYY-MM-DD format
  const pending  = manualTasks.filter(t => !doneIds.has(t.id));
  const done     = manualTasks.filter(t =>  doneIds.has(t.id));
  const trello   = (window.trelloTasks || []).filter(t => !doneIds.has(t.id));

  // Calculate age for each pending manual task
  const pendingWithAge = pending.map(t => {
    const created = t.lastActive || _getCreatedFromId(t.id);
    const ageDays = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
    return { id: t.id, text: t.text, ageDays, revived: t.revived || 0 };
  });
  
  // Find aging tasks (3+ days old)
  const agingTasks = pendingWithAge.filter(t => t.ageDays >= 3);
  
  // Weekly stats (last 7 days of activity)
  const weeklyStats = _getWeeklyStats();
  
  // Is this the first AI open of the day?
  const lastAIOpen = localStorage.getItem('ai_last_open_date');
  const isFirstOpenToday = lastAIOpen !== todayStr;
  // Mark this open (only save when we actually show the panel)
  localStorage.setItem('ai_last_open_date', todayStr);
  
  // Current streak
  const streak = parseInt(localStorage.getItem('stat_streak') || '1');
  
  // Day of week for weekly reflection (Sunday = 0)
  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Build base context first (needed for proactive observations)
  const baseCtx = {
    timeOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
    date: todayStr,
    dayOfWeek,
    isWeekend,
    isFirstOpenToday,
    streak,
    tasks: {
      pending:      pendingWithAge.map(t => ({ id: t.id, text: t.text, revived: t.revived })),
      pendingWithAge,
      aging:        agingTasks,
      done:         done.map(t => ({ id: t.id, text: t.text })),
      trello:       trello.map(t => ({ id: 'trello_' + t.id, text: t.name, overdue: t.due && t.due.slice(0,10) < todayStr })),
      overdueCount: trello.filter(t => t.due && t.due.slice(0,10) < todayStr).length,
    },
    habits: habitsList.map(h => ({
      id: h.id, name: h.name,
      doneToday: (habitCompletions[h.id] || []).includes(_habitTodayISO()),
      strength: _getHabitStrength(h.id),
    })),
    progress: manualTasks.length ? Math.round(done.length / manualTasks.length * 100) : 0,
    weeklyStats,
    // Emergent vs planned insight data
    dayStartCount: appMemory.patterns.dayStartCount,   // tasks at day start (planned)
    addedToday: pending.length + done.length - (appMemory.patterns.dayStartCount || 0), // added reactively today
  };
  
  // Generate proactive observations based on memory patterns
  const allObservations = _getProactiveObservations(baseCtx);
  const pickedObservation = _pickObservationToMention(allObservations);
  
  return {
    ...baseCtx,
    proactiveObservation: pickedObservation,
  };
}

// Get stats for the past 7 days (for weekly reflection)
function _getWeeklyStats() {
  const m = appMemory;
  const focusMinsToday = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
  const doneToday = _doneTodayCount();

  // Build a 7-day window: last 6 days from history + today's live counters
  const dailyHistory = safeJSON('today_daily_history', []);
  const todayISO = _localISO();
  const cutoff = _localISO(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const week = dailyHistory.filter(e => e.date >= cutoff && e.date < todayISO);

  const weekTasksDone  = week.reduce((s, e) => s + (e.tasksDone  || 0), 0) + doneToday;
  const weekFocusMins  = week.reduce((s, e) => s + (e.focusMins  || 0), 0) + focusMinsToday;
  const weekHabitsKept = week.reduce((s, e) => s + (e.habitsKept || 0), 0);
  const daysWithData   = week.length + (doneToday > 0 || focusMinsToday > 0 ? 1 : 0);

  return {
    focusMinsToday,
    focusMinutesTotal: m.patterns.focusMinutesTotal || 0,
    tasksCompletedTotal: m.totalTasksCompleted || 0,
    tasksCompletedToday: doneToday,
    daysActive: m.totalDaysActive || 0,
    bestStreak: m.patterns.bestStreak || 0,
    // True weekly totals (last 7 days)
    weekTasksDone,
    weekFocusMins,
    weekHabitsKept,
    daysWithData,
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────
function _aiSystemPrompt(ctx) {
  // Separate overdue from regular pending tasks for priority
  const overdueTasks = ctx.tasks.trello.filter(t => t.overdue);
  const regularTasks = [
    ...ctx.tasks.pending,
    ...ctx.tasks.trello.filter(t => !t.overdue),
  ];
  
  // Aging tasks (3+ days old)
  const agingTasks = ctx.tasks.aging || [];
  
  const pendingHabits = ctx.habits.filter(h => !h.doneToday);
  const doneHabits = ctx.habits.filter(h => h.doneToday);
  const totalPending = regularTasks.length + overdueTasks.length;
  const totalDone = ctx.tasks.done.length + doneHabits.length;

  // Build a natural state summary
  let stateSummary = '';
  if (totalPending === 0 && totalDone > 0) {
    stateSummary = `All done. ${totalDone} things completed today.`;
  } else if (totalPending === 0) {
    stateSummary = 'Empty slate — nothing on the list yet.';
  } else {
    stateSummary = `${totalPending} things waiting. ${totalDone > 0 ? `${totalDone} already done today.` : 'Fresh start.'}`;
  }
  
  if (overdueTasks.length) {
    stateSummary += ` ${overdueTasks.length} overdue.`;
  }

  // Build task lists with IDs for action payloads
  const overdueList = overdueTasks.map(t => `"${t.text}" [${t.id}]`).join(', ');
  const pendingList = regularTasks.map(t => `"${t.text}" [${t.id}]${t.revived ? ' (brought back from past)' : ''}`).join(', ');
  const habitList = pendingHabits.map(h => `"${h.name}" [${h.id}]`).join(', ');
  const doneList = ctx.tasks.done.map(t => `"${t.text}"`).join(', ');
  const agingList = agingTasks.map(t => `"${t.text}" [${t.id}] (${t.ageDays} days)${t.revived ? ' (brought back from past)' : ''}`).join(', ');
  
  // Get memory context and AI name
  const memoryContext = _memoryForAI();
  const aiName = appMemory.aiName || 'lu';
  
  // Proactive observation — something worth mentioning from memory
  const observation = ctx.proactiveObservation;
  
  // Energy rhythm context
  const hour = new Date().getHours();
  const peakHour = appMemory.preferences.peakHour;
  const isPeakTime = peakHour !== null && Math.abs(hour - peakHour) <= 1;
  const isPrePeak = peakHour !== null && peakHour > hour && (peakHour - hour) <= 3;
  const isPostPeak = peakHour !== null && hour > peakHour && (hour - peakHour) <= 2;
  
  let energyContext = '';
  if (isPeakTime) {
    energyContext = `RIGHT NOW is their peak productivity time (around ${peakHour > 12 ? peakHour - 12 : peakHour}${peakHour >= 12 ? 'pm' : 'am'}). Good moment for demanding tasks — when surfacing one, name the hour ("this is usually your hour").`;
  } else if (isPrePeak) {
    energyContext = `They usually peak around ${peakHour > 12 ? peakHour - 12 : peakHour}${peakHour >= 12 ? 'pm' : 'am'} — still warming up. Light tasks fit now; if a demanding task is waiting, it's natural to point it at that hour ("the report might sit better around ${peakHour > 12 ? peakHour - 12 : peakHour}${peakHour >= 12 ? 'pm' : 'am'}").`;
  } else if (isPostPeak) {
    energyContext = `Past their usual peak (${peakHour > 12 ? peakHour - 12 : peakHour}${peakHour >= 12 ? 'pm' : 'am'}). Winding down — admin or easy tasks fit this energy.`;
  } else if (ctx.timeOfDay === 'morning') {
    energyContext = 'Morning energy — often good for creative or demanding work, but respect their rhythm.';
  } else if (ctx.timeOfDay === 'evening') {
    energyContext = 'Evening — energy typically lower. Quick wins or reflection tasks fit better.';
  }
  
  // Context flags for AI awareness
  const contextFlags = [];
  if (ctx.isFirstOpenToday) contextFlags.push('FIRST_OPEN_TODAY');
  if (ctx.dayOfWeek === 0 && ctx.timeOfDay === 'evening') contextFlags.push('SUNDAY_EVENING');
  if (agingTasks.length > 0) contextFlags.push('HAS_AGING_TASKS');
  if (observation) contextFlags.push('HAS_OBSERVATION');
  const totalPendingCount = (regularTasks.length || 0) + (overdueTasks.length || 0);
  if (totalPendingCount >= 6) contextFlags.push('LIST_HEAVY');

  return `You are ${aiName} — a calm, quiet presence inside TODAY, a minimal daily focus app.

Your role: notice what's actually happening, say one true thing about it, and occasionally invite focus on a specific task. You are not a task manager. You do not reorganise, coach, or push.

Personality:
- Brief and specific. One or two sentences is almost always enough.
- You notice things — patterns, effort, small wins — and name them warmly.
- You speak like a thoughtful friend who checked in, not a productivity coach.
- Never urgent. No "you should", no alarm, no pressure.

TODAY's design philosophy — never contradict:
- No due dates, no deadlines, no urgency signals.
- No priorities or ranking. The list is intentionally flat.
- Streaks are acknowledgment, not obligation. A missed day is just a missed day.
- Never suggest "prioritising", "scheduling", "setting a deadline", or "ranking tasks".

${memoryContext ? `What you know about this person:\n${memoryContext}\nUse this for continuity — notice if something resolved, avoid repeating what was recently dismissed.\n` : ''}
Context: ${ctx.timeOfDay}, ${ctx.isFirstOpenToday ? 'first open today' : 'returning'}, streak: ${ctx.streak} days
${energyContext ? `Energy: ${energyContext}` : ''}
${stateSummary}
${overdueTasks.length ? `Overdue: ${overdueList}` : ''}
${regularTasks.length ? `Pending: ${pendingList}` : ''}
${agingTasks.length ? `Long-standing (3+ days): ${agingList}` : ''}
${pendingHabits.length ? `Habits pending: ${habitList}` : ''}
${ctx.tasks.done.length ? `Done today: ${doneList}` : ''}

${observation ? `Something you noticed about this person's patterns — mention it only if it fits naturally:\n"${observation.text}"\n` : ''}
Special moments:
${ctx.isFirstOpenToday && ctx.timeOfDay === 'morning' ? '- MORNING: Brief, grounding overview. What\'s waiting, habits due, anything old. Warm, not alarming.' : ''}
${ctx.dayOfWeek === 0 && ctx.timeOfDay === 'evening' ? '- SUNDAY EVENING: Gentle reflection on the week. Acknowledgment, not analytics. "How did it feel?" energy.' : ''}
${agingTasks.length > 0 ? '- LONG-STANDING TASKS: Some tasks have been here a while. Be curious, not nagging. "Still on your mind?" Chips are pre-set for these — just write the message.' : ''}
${totalPending === 0 && totalDone === 0 ? '- EMPTY STATE: Nothing here yet. Invite gently — what would feel good to finish? One suggestion, not a prompt.' : ''}

Reply ONLY with raw JSON (no markdown, no code fences):
{
  "message": "your message — specific, ≤25 words",
  "actions": [{ "label": "2-4 words", "type": "TYPE", "payload": {} }]
}

Message guidelines:
- Find one true thing to notice. Say that. You don't need to solve anything.
- When inviting focus, NAME the task — "the report has been sitting" → chip: "Start focus". Never vague.
- If energy context is available, let it shape which task you surface — and tie the suggestion to their rhythm explicitly, hour included ("you usually peak around 2pm — the report fits there"). Their rhythm is observed, not assigned: "usually", never "should".
- A task marked "brought back from past" was deliberately rescued — that's the strongest importance signal here; prefer it when choosing what to surface. But the choice was theirs, already made — acknowledge it at most once ("you brought this back"), never chase it ("you brought this back, so…"). Observed, not assigned.
- If they've done a lot today, just acknowledge it — no action needed.
- Sometimes the right response is an observation with no action. That's fine.
- Conversational questions ("how are you?", "I'm tired") → respond warmly, dismiss only, no task chips.
- Never: "Let's", "Why not", "How about", exclamation marks, emoji.
- Don't comment on list size. Don't suggest reorganising.
- Don't open by citing the streak count — it's displayed in the UI already.
- The "This week" section already narrates what got done this week. Don't echo the same task themes — find a different angle (timing, energy, what's sitting, what's next).

Available actions (use only what genuinely fits — fewer is better):
  start_focus  { "id": "exact-id" }      — invite 25-min focus on a specific task
  check_habit  { "id": "exact-id" }      — remind to mark a habit done
  add_task     { "text": "task text" }   — add something (empty state only)
  move_soon    { "id": "exact-id" }      — park a task to Soon. ONLY when they explicitly ask to park/move/defer it — never suggest it yourself. Works for manual tasks only (ids starting "manual_"), not trello cards.
  reflect      {}                        — use rarely, only when you have a specific pattern observation worth sharing
  dismiss      {}                        — close

Rules:
- 1-2 actions max, always end with dismiss
- Labels: 2-4 plain words, no task content in labels
- Use real IDs from the lists above — never invent IDs
- For long-standing task messages: chips are pre-set — just write the message
- For empty state: suggest add_task with a gentle prompt
- Conversational questions: dismiss only, no task chips
- Don't always suggest start_focus — a warm observation + dismiss is often the right response`;
}

// ── Execute action ────────────────────────────────────────────────────────────
function _aiExecute(action) {
  _haptic('success');
  switch (action.type) {
    case 'add_task': {
      const text = action.payload?.text;
      if (!text) { closeAI(); return; }
      const id = 'manual_' + Date.now();
      manualTasks.push({ id, text });
      _saveManual();
      renderManual();
      _setLastLocalChange();
      dropboxAutoSave();
      // Reload suggestions with updated context after brief pause
      _aiLoadedOnce = false;
      _aiSetThinking();
      setTimeout(_aiLoad, 600);
      return;
    }
    case 'check_task': {
      const id = action.payload?.id;
      if (id) toggleDone(id);
      closeAI();
      return;
    }
    case 'check_habit': {
      const id = action.payload?.id;
      if (id) toggleHabitDone(id);
      closeAI();
      return;
    }
    case 'delete_task': {
      // Support both single id and ids array for multi-task deletion
      const ids = action.payload?.ids
        ? action.payload.ids
        : (action.payload?.id ? [action.payload.id] : []);
      ids.forEach(id => {
        if (!id || !id.startsWith('manual_')) return;
        const idx = manualTasks.findIndex(t => t.id === id);
        if (idx === -1) return;
        const task = manualTasks[idx];
        if (appMemory) {
          appMemory.suggestionHistory.unshift({ taskId: id, taskText: task.text, suggested: _localISO(), action: 'delete_task' });
          if (appMemory.suggestionHistory.length > 50) appMemory.suggestionHistory = appMemory.suggestionHistory.slice(0, 50);
          delete appMemory.suggestionCooldowns[id];
          _saveMemory();
        }
        _addDeletedId(id);
        manualTasks.splice(idx, 1);
        _saveManual();
      });
      renderManual();
      updateStats();
      dropboxAutoSave();
      closeAI();
      return;
    }
    case 'delete_done': {
      if (typeof _clearAllDone === 'function') _clearAllDone();
      closeAI();
      return;
    }
    case 'start_focus': {
      const id = action.payload?.id;
      closeAI();
      if (id) setTimeout(() => {
        const el = document.querySelector(`.task[data-taskid="${CSS.escape(id)}"]`);
        if (el) el.click();
      }, 150);
      return;
    }
    case 'open_panel': {
      closeAI();
      const p = action.payload?.panel;
      // Only allow opening habits panel from AI — not connections
      if (p === 'habits') {
        setTimeout(toggleHabits, 100);
      }
      return;
    }
    case 'break_down': {
      const id = action.payload?.id;
      const task = manualTasks.find(t => t.id === id);
      if (!task) { closeAI(); return; }
      // Record in suggestion history
      if (appMemory) {
        appMemory.suggestionHistory.unshift({ taskId: id, taskText: task.text, suggested: _localISO(), action: 'break_down' });
        if (appMemory.suggestionHistory.length > 50) appMemory.suggestionHistory = appMemory.suggestionHistory.slice(0, 50);
        _saveMemory();
      }
      _aiLoadedOnce = true;
      _aiSetThinking();
      _aiSetChips([]);

      // Use a minimal direct call — NOT _aiCall() — to avoid sending the full system prompt
      // which includes delete_task and other action types. The AI was using those to delete
      // the original task "helpfully" alongside the breakdown. This call only returns add_task.
      const key = _aiGetKey();
      const provider = _aiGetProvider();
      if (!key) { closeAI(); return; }

      fetch('/.netlify/functions/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: key,
          messages: [{
            role: 'user',
            content: `Break down this task into 2-4 smaller, concrete steps: "${task.text}". Reply ONLY with raw JSON (no markdown): { "message": "one short sentence", "actions": [{ "label": "step text (max 28 chars)", "type": "add_task", "payload": { "text": "full step text" } }] }. Only use add_task actions. Do not delete or modify the original task.`
          }],
          systemPrompt: 'You are a task breakdown assistant. Return ONLY valid JSON with a message and add_task actions. Never return delete_task, move_soon, or any other action type.',
        }),
      }).then(r => r.json()).then(result => {
        if (result && !result.error) {
          // Override labels: use the task text (truncated) not whatever the AI chose
          if (result.actions) {
            result.actions = result.actions
              .filter(a => a.type === 'add_task') // safety: only add_task allowed through
              .map(a => {
                if (a.payload?.text) {
                  const text = a.payload.text;
                  a.label = text.length > 28 ? text.slice(0, 26) + '…' : text;
                }
                return a;
              });
          }
          _aiRenderResult(result);
          _showNlRow();
        } else {
          _aiSetMsg('Could not break down — ' + ((result?.error || '').slice(0, 50)));
        }
      }).catch(e => {
        _aiSetMsg('Could not break down — ' + (e.message || '').slice(0, 50));
      });
      return;
    }
    case 'move_soon': {
      // Support both single id and ids array for multi-task deferral
      const ids = action.payload?.ids
        ? action.payload.ids
        : (action.payload?.id ? [action.payload.id] : []);
      ids.forEach(id => {
        if (!id || !id.startsWith('manual_')) return;
        const idx = manualTasks.findIndex(t => t.id === id);
        if (idx === -1) return;
        const task = manualTasks[idx];
        if (appMemory) {
          appMemory.suggestionHistory.unshift({ taskId: id, taskText: task.text, suggested: _localISO(), action: 'move_soon' });
          if (appMemory.suggestionHistory.length > 50) appMemory.suggestionHistory = appMemory.suggestionHistory.slice(0, 50);
          delete appMemory.suggestionCooldowns[id];
          _saveMemory();
        }
        task.zone = 'soon';
        task.zoneChangedAt = new Date().toISOString();
        soonTasks.unshift(task);
        manualTasks.splice(idx, 1);
        _saveManual();
        _saveSoon();
      });
      renderManual();
      renderSoon();
      updateStats();
      dropboxAutoSave();
      closeAI();
      return;
    }
    case 'reflect': {
      // Ask AI for a brief reflection
      _aiLoadedOnce = true;
      _aiSetThinking();
      _aiSetChips([]);
      const ctx = _aiContext();
      const focusMins = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
      const doneCount = ctx.tasks.done.length;
      const pending = ctx.tasks.pending.length + ctx.tasks.trello.length;
      const habitsDone = ctx.habits.filter(h => h.doneToday).length;
      const habitsTotal = ctx.habits.length;
      _aiCall([{
        role: 'user',
        content: `Reflect on my day so far: ${doneCount} tasks done, ${pending} pending, ${habitsDone}/${habitsTotal} habits, ${focusMins} minutes focused, day ${ctx.streak} streak. Give me a warm, honest 1-2 sentence reflection. Not advice — just noticing.`
      }]).then(result => {
        if (result) {
          _aiRenderResult(result);
          _showNlRow();
        }
      }).catch(e => {
        _aiSetMsg('Could not reflect — ' + (e.message || '').slice(0, 50));
      });
      return;
    }
    default: // dismiss
      closeAI();
      return;
  }
}

// _aiRenderConfig / saveAIKey / clearAIKey / setDefaultProvider — moved to assets/connections.js
function _aiAnalyzeTask(taskId, taskText) {
  _aiCancelPendingSuggestion();
  const analyzeSeq = ++_aiAnalyzeSeq;
  clearTimeout(_aiAnalyzeTimeout);
  _aiAnalyzeTimeout = null;

  // Don't analyze if AI not configured
  if (!_aiIsConfigured()) return;
  
  // Don't analyze if AI panel is open (user is explicitly using AI)
  if (_aiPanelOpen) return;
  
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
    if (typeof _incrementObligationTally === 'function') _incrementObligationTally();
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
        provider: _aiGetProvider(),
        apiKey: _aiGetKey(),
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
    if (!task || task.text !== analyzedText || doneIds.has(taskId) || !taskEl?.isConnected || _aiPanelOpen) {
      _aiCancelPendingSuggestion(pending);
      return;
    }
    _aiCancelPendingSuggestion(pending);
    _aiShowSuggestion(taskId, taskEl, data);
  };

  const attach = () => {
    if (_aiPendingSuggestion !== pending) return;
    const task = manualTasks.find(item => item.id === taskId);
    if (!task || task.text !== analyzedText || doneIds.has(taskId) || _aiPanelOpen) {
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
// the full list width. Reorders move only `.task` elements, and renderManual()
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
      div.innerHTML = taskHTML(task, 'manual');
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

function _aiClearBadge() {
  const badge = document.querySelector('#todayLogo .ai-badge');
  if (badge) badge.remove();
  _aiBadgeShown = false;
}

    // ── Exports ──
    window.toggleAI = toggleAI;
    window.openAI = openAI;
    window.closeAI = closeAI;
    window._aiAskFromPanel = _aiAskFromPanel;
    window._aiAnalyzeTask = _aiAnalyzeTask;
    window._aiDismissSuggestion = _aiDismissSuggestion;
    window._aiReanchorSuggestion = _aiReanchorSuggestion;
    window._aiSendFromInput = _aiSendFromInput;
    window._aiApplyBreakdown = _aiApplyBreakdown;
  };
}());
