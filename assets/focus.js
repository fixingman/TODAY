// TODAY — focus mode: Pomodoro timer, PiP session, AI focus companion.
window._startFocus = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

  const wordingKey='today_focus_wording_v1', wordingLife=7*86400000;
  let wordingExpiry;
  const wordTag=value=>{let n=2166136261;for(let i=0;i<value.length;i++)n=Math.imul(n^value.charCodeAt(i),16777619);return(n>>>0).toString(16).padStart(8,'0');};
  function wordingOwners(){
    const list=value=>Array.isArray(value)?value:[];
    const tasks=[...list(safeJSON('today_manual',[])),...list(safeJSON('today_trello_cache',{})?.tasks)],storedDone=new Set(list(safeJSON('today_done',[]))),storedHabits=safeJSON('today_habit_completions',{})||{};
    return [...tasks.filter(r=>!doneIds.has(r.id)&&!storedDone.has(r.id)).map(r=>({id:r.id,source:r.text,habit:false})),
      ...list(safeJSON('today_habits',[])).filter(r=>!r.archived&&!(habitCompletions[r.id]||[]).includes(_habitTodayISO())&&!(storedHabits[r.id]||[]).includes(_habitTodayISO())).map(r=>({id:r.id,source:r.name,habit:true}))]
      .filter(r=>typeof r.id==='string'&&typeof r.source==='string');
  }
  const wordTime=value=>typeof value==='string'&&value.length===24&&Number.isFinite(Date.parse(value))&&new Date(Date.parse(value)).toISOString()===value?Date.parse(value):0;
  function wordingRead(input){
    const raw=input===undefined?localStorage.getItem(wordingKey):input;let data;
    try{data=raw&&raw.length<=16384?JSON.parse(raw):null;}catch(_){data=null;}
    const now=Date.now(),clearedAt=wordTime(data?.clearedAt)>0&&wordTime(data?.clearedAt)<=now+60000?data.clearedAt:'';
    const live=wordingOwners().map(r=>[wordTag(JSON.stringify([r.habit,r.id])),wordTag(JSON.stringify([r.habit,r.id,r.source]))]);
    const byOwner=new Map();
    for(const row of Array.isArray(data?.rows)?data.rows:[]){
      if(data.policy!==1||!row||!['owner','source','reading'].every(k=>/^[a-f0-9]{64}$/.test(row[k]||''))||!['ownerTag','sourceTag'].every(k=>/^[a-f0-9]{8}$/.test(row[k]||''))||!['focus-task-v1','focus-habit-v1'].includes(row.writer)||![null,'unclear','formal'].includes(row.concern))continue;
      const at=wordTime(row.at),end=wordTime(row.expiresAt);
      if(!at||at>now+60000||at<=wordTime(clearedAt)||end<=now||end>at+wordingLife||end<=at)continue;
      const clean={owner:row.owner,source:row.source,reading:row.reading,ownerTag:row.ownerTag,sourceTag:row.sourceTag,writer:row.writer,concern:live.some(([id,source])=>id===row.ownerTag&&source===row.sourceTag)?row.concern:null,at:row.at,expiresAt:row.expiresAt};
      const old=byOwner.get(clean.owner);if(!old||clean.at>old.at||clean.at===old.at&&clean.concern===null)byOwner.set(clean.owner,clean);
    }
    return{policy:1,clearedAt,rows:[...byOwner.values()].sort((a,b)=>b.at.localeCompare(a.at)||a.owner.localeCompare(b.owner)).slice(0,20)};
  }
  function wordingWrite(data){
    const text=JSON.stringify(wordingRead(JSON.stringify(data)));if(new TextEncoder().encode(text).length>16384)throw new Error('Focus wording limit');
    localStorage.setItem(wordingKey,text);if(localStorage.getItem(wordingKey)!==text)throw new Error('Focus wording was not saved');
    document.dispatchEvent(new Event('today:focus-wording-change'));
  }
  const wordingStore=Today.define('focus-wording-store',{key:wordingKey,read:wordingRead,write:wordingWrite,owners:wordingOwners,tag:wordTag,supports:request=>wordingOwners().some(r=>r.habit===request.habit&&r.id===request.id&&r.source===request.source),
    clear(){const current=wordingRead();wordingWrite({policy:1,clearedAt:new Date(Math.max(Date.now(),wordTime(current.clearedAt),...current.rows.map(r=>wordTime(r.at)))).toISOString(),rows:[]});}});
  function pruneWording(){
    clearTimeout(wordingExpiry);if(!localStorage.getItem(wordingKey))return;
    const data=wordingRead(),text=JSON.stringify(data);if(localStorage.getItem(wordingKey)!==text)wordingWrite(data);
    if(data.rows.length)wordingExpiry=setTimeout(pruneWording,Math.min(2147483647,Math.max(1,Math.min(...data.rows.map(r=>wordTime(r.expiresAt)))-Date.now())));
  }
  pruneWording();window.addEventListener('storage',pruneWording);document.addEventListener('visibilitychange',pruneWording);
  new MutationObserver(pruneWording).observe(document.getElementById('main-app'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});




  if (!window.matchMedia('(hover: hover)').matches) return;

  const TOTAL  = 25 * 60;
  const FocusSession = Today.use('focus-session');
  const appEl  = document.getElementById('main-app');

  function _parseAIText(data) {
    if (data.error) return null;
    return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
  }





  window._focusOnCheck = function(taskId) {

    if (taskId !== uiTaskId && (!taskStates[taskId] || taskStates[taskId].rem >= TOTAL)) return false;
    if (taskId !== uiTaskId && !taskStates[taskId]) return false;

    const st = getState(taskId);
    const sessionStarted = st.rem < TOTAL;


    clearTimeout(tickHandle);
    st.running   = false;
    st.paused    = false;
    st.wallStart = null;


    if (sessionStarted) _logSession(taskId);



    const isUiEl = uiTaskEl && (
      uiTaskEl.dataset.taskid  === taskId ||
      uiTaskEl.dataset.habitId === taskId
    );
    if (isUiEl) {
      closeUI(true);
    } else {

      _trackFocusTime(taskId);
      clearState(taskId);
      appEl.classList.remove('focusing');
      document.body.style.overflow = '';
    }


    return false;
  };






  window._tryRestoreFocusSession = function() {



    // next render silently re-opens focus mode on it. (BUG-065)
    if (_restoreAttempted) return;
    if (uiTaskId) { _restoreAttempted = true; return; }
    const saved = safeJSON('today_focus_session', null);
    if (!saved || !saved.taskId) { _restoreAttempted = true; return; }

    const { taskId, rem, savedAt, paused } = saved;
    const taskEl = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
    if (!taskEl) return;
    _restoreAttempted = true;

    if (taskEl.classList.contains('done')) {
      localStorage.removeItem('today_focus_session');
      return;
    }

    const restored = FocusSession.restore({ taskId, rem, savedAt, paused });
    if (!restored) {
      localStorage.removeItem('today_focus_session');
      return;
    }
    const adjustedRem = restored.rem;

    if (!paused && adjustedRem <= 0) {

      _recordFocusComplete(taskId);
      return;
    }


    const st = getState(taskId);
    Object.assign(st, restored);

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



    const timerDetached = timerEl.previousElementSibling !== newTaskEl;

    if (newTaskEl !== uiTaskEl || timerDetached) {
      newTaskEl.classList.add('focused');
      newTaskEl.after(timerEl);
      timerEl.after(kbdHint);
      uiTaskEl = newTaskEl;
      syncDisplay(uiTaskId, newTaskEl);
    }
  };





  const taskStates = {};

  function getState(taskId) {
    if (!taskStates[taskId]) taskStates[taskId] = FocusSession.create(TOTAL);
    return taskStates[taskId];
  }
  function clearState(taskId) { delete taskStates[taskId]; _focusHelp?.forget(taskId); }


  const kbdHint = document.createElement('div');
  kbdHint.className = 'focus-kbd-hint';
  kbdHint.setAttribute('role', 'listitem');
  kbdHint.hidden = true;
  kbdHint.setAttribute('aria-hidden', 'true');
  kbdHint.innerHTML = '<span class="focus-kbd-hints"><kbd>space</kbd> breathe &nbsp;&nbsp; <kbd>esc</kbd> rest</span>';
  let focusAIBtn;
  let _thinkAnim = null;
  let _focusAIRequest = null;
  let _focusHelp = null, _focusHelpLoading = null;

  function _focusResetAI(clearHistory = false) {
    _focusHelp?.reset(clearHistory);
    timeEl.inert = false; timeEl.removeAttribute('aria-hidden');
    if (_focusAIRequest) {
      const request = _focusAIRequest;
      _focusAIRequest = null;
      clearTimeout(request.timeout);
      clearTimeout(request.thinkDelay);
      request.controller.abort();
    }
    if (_thinkAnim) { _thinkAnim.cancel(); _thinkAnim = null; }
    timerEl.classList.remove('ai-active');
    if (focusAIBtn) {
      focusAIBtn.classList.remove('loading', 'question-scroll');
      focusAIBtn.textContent = '\u2726\ufe0e ask';
      focusAIBtn.setAttribute('aria-label', 'Ask for focus help');

      focusAIBtn.style.pointerEvents = 'none';
      requestAnimationFrame(() => { if (focusAIBtn) focusAIBtn.style.pointerEvents = ''; });
    }
  }

  function _focusFailAI(request) {
    const current = _focusRequestCurrent(request);
    if (_focusAIRequest !== request) return;
    _focusResetAI();
    if (current && !request.habit && focusAIBtn) {
      focusAIBtn.textContent = 'No reply to show. Try again.';
      focusAIBtn.setAttribute('aria-label', focusAIBtn.textContent);
    }
  }

  function _focusRequestCurrent(request) {
    if (_focusAIRequest !== request || request.controller.signal.aborted ||
        uiTaskId !== request.id || !uiTaskEl?.isConnected ||
        !uiTaskEl.classList.contains('focused') || !timerEl.classList.contains('ai-active')) return false;
    return _focusSourceCurrent(request);
  }

  function _focusTaskDisplay() {
    const text = uiTaskEl?.querySelector('.task-text')?.cloneNode(true);
    text?.querySelectorAll('.task-tail, .task-link, .gmail-indicator, .agent-indicator').forEach(el => el.remove());
    return text ? text.textContent.trim() : null;
  }

  function _focusSourceCurrent(request) {
    if (request.wordingFrame && !request.delivered && !_focusHelp?.wordingCurrent(request)) return false;
    if (uiTaskId !== request.id || !uiTaskEl?.isConnected || !uiTaskEl.classList.contains('focused') || timerEl.classList.contains('complete') ||
        request.date !== _localISO() || request.day !== (request.habit ? _habitTodayISO() : _localISO())) return false;
    if (Today.use('connections')._aiGetProvider() !== request.provider ||
        Today.use('connections')._aiGetKey() !== request.key) return false;
    if (!request.habit) {
      const task = manualTasks.find(t => t.id === request.id) || trelloTasks.find(t => t.id === request.id);
      return task?.text === request.source && !uiTaskEl.classList.contains('done') && !doneIds.has(request.id) &&
        _focusTaskDisplay() === request.display;
    }
    const habit = habitsList.find(h => h.id === request.id && !h.archived);
    return habit?.name === request.source && habit.name.trim() === request.name && request.day === _habitTodayISO() &&
      !(habitCompletions[request.id] || []).includes(request.day);
  }

  async function _focusAskAI() {
    if (timerEl.classList.contains('ai-active')) { _focusResetAI(); return; }


    const _gmailBlock = document.getElementById('focusGmailBlock');
    if (_gmailBlock && !_gmailBlock.hidden) {
      const _draftBtn = _gmailBlock.querySelector('.focus-gmail-draft-btn:not([hidden])');

      if (_draftBtn) { _draftBtn.click(); return; }
    }
    const _agentBlock = document.getElementById('focusAgentBlock');
    if (_agentBlock && !_agentBlock.hidden) {
      const _ctaLink = _agentBlock.querySelector('.focus-agent-link');
      if (_ctaLink) { window.open(_ctaLink.href, '_blank', 'noopener'); return; }
    }

    if (!Today.use('connections')._aiIsConfigured()) return;

    const habitId = uiTaskEl?.dataset.habitId;
    const habit = habitId ? habitsList.find(h => h.id === habitId && !h.archived) : null;
    if (habitId && !habit) return;
    const source = habit ? habit.name : (manualTasks.find(t => t.id === uiTaskId) || trelloTasks.find(t => t.id === uiTaskId))?.text;
    if (typeof source !== 'string' || !source.trim()) return;
    const taskText = source.trim();

    const request = { id: uiTaskId, name: taskText, source, display:habit ? null : _focusTaskDisplay(), habit: !!habit,
      provider: Today.use('connections')._aiGetProvider(), key: Today.use('connections')._aiGetKey(),
      date: _localISO(), day: habit ? _habitTodayISO() : _localISO(), controller: new AbortController() };
    _focusAIRequest = request;
    timerEl.classList.add('ai-active');
    if (!_focusRequestCurrent(request)) { _focusResetAI(); return; }
    timeEl.inert = true; timeEl.setAttribute('aria-hidden','true');
    focusAIBtn.textContent = 'thinking…';
    focusAIBtn.classList.add('loading');

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      request.thinkDelay = setTimeout(function() {
        if (!_focusRequestCurrent(request) || !focusAIBtn.classList.contains('loading')) return;
        _thinkAnim = focusAIBtn.animate([{ opacity: 0.25 }, { opacity: 0.65 }, { opacity: 0.25 }], { duration: 2400, easing: 'ease-in-out', iterations: Infinity });
      }, 150);
    }
    request.timeout = setTimeout(() => {
      _focusFailAI(request);
    }, 25000);
    try {
      _focusHelpLoading ||= Promise.all([import('/assets/focus-ask.js'),Promise.race([Promise.all([import('/assets/feedback-policy.js'),import('/assets/focus-wording.js')]).catch(()=>null),new Promise(resolve=>setTimeout(resolve,300))])]).then(() => {
        _focusHelp = Today.use('focus-ask').create(timerEl,focusAIBtn,{
          current:_focusRequestCurrent, sourceCurrent:_focusSourceCurrent,
          invalidate:() => { if (uiTaskEl && !uiTaskEl.isConnected) closeUI(true); else _focusResetAI(true); }
        });
        return _focusHelp;
      }).catch(error => { _focusHelpLoading = null; throw error; });
      const help = await _focusHelpLoading;
      if (!_focusRequestCurrent(request)) return;
      const {messages,systemPrompt} = help.build(request);
      const key      = request.key;
      const provider = request.provider;
      const res = await fetch('/.netlify/functions/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: request.controller.signal,
        body: JSON.stringify({
          provider,
          apiKey: key,
          messages,
          systemPrompt
        })
      });
      if (!_focusRequestCurrent(request)) {
        if (_focusAIRequest === request) _focusResetAI();
        return;
      }
      if (!res.ok) {
        if (!habit) res.json().then(e => console.warn('[focus ask]', res.status, e?.error)).catch(() => {});
        _focusFailAI(request); return;
      }
      const data = await res.json();
      if (!_focusRequestCurrent(request)) {
        if (_focusAIRequest === request) _focusResetAI();
        return;
      }
      const q = _parseAIText(data)?.trim();
      const questions = (q?.match(/\?/g) || []).length;
      const valid = q && q.split(/\s+/u).length < 20 && !/[!\r\n]/.test(q) &&
        (questions === 1 ? /\?$/.test(q) : !habit && questions === 0);
      if (valid) {
        clearTimeout(request.thinkDelay);
        if (_thinkAnim) { _thinkAnim.cancel(); _thinkAnim = null; }
        focusAIBtn.classList.remove('loading', 'question-scroll');
        focusAIBtn.textContent = q;
        focusAIBtn.setAttribute('aria-label', q);
        if (typeof _memoryRecordSpokenLine === 'function') _memoryRecordSpokenLine('focus question', q);
        _focusHelp.offered(request,q);

      } else {
        _focusFailAI(request);
      }
    } catch (_) {
      _focusFailAI(request);
    } finally {
      clearTimeout(request.timeout);
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
      '<button class="focus-ai-timer-btn" aria-label="Ask for focus help" aria-live="polite" aria-atomic="true">✦ ask</button>' +
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




  function _pulseComplete(el, on) {
    if (!el) return;
    if (el._pulseAnim) {
      if (!on) {

        const cur = parseFloat(getComputedStyle(el).opacity);
        el._pulseAnim.cancel();
        el._pulseAnim = null;
        if (isFinite(cur) && cur < 0.98) {
          el.animate([{ opacity: cur }, { opacity: 1 }], { duration: 120, easing: 'ease-out' });
        }
        return;
      }
      el._pulseAnim.cancel();
      el._pulseAnim = null;
    }
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


  timerEl.addEventListener('click', function(e) {
    if (!uiTaskId) return;
    const st = getState(uiTaskId);
    if (st.rem <= 0) {

      e.stopPropagation();
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



      tickFor(uiTaskId);
    }
  });


  let uiTaskEl = null;
  let uiTaskId = null;
  let tickHandle = null;


  // stale teardown must not rip the timer out from under it. (BUG-065)
  let focusGen = 0;

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
    setPaused(st.paused);
    if (window._pipSync) window._pipSync(st.rem, TOTAL);

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
    const selectors = '.task,.habit,.section-header,.empty,.config-panel,.morning-nudge,#dayNudgeReact,#triageBar';
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


  }

  function _clearFocusWave() {
    document.querySelectorAll('.task,.habit').forEach(row =>
      row.style.removeProperty('--focus-wave-delay'));
  }

  function _stageFocusWave(activeRow) {
    _clearFocusWave();
    if (!activeRow || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const activeRect = activeRow.getBoundingClientRect();
    const activeY = activeRect.top + activeRect.height / 2;
    const rows = [...document.querySelectorAll('.task,.habit')]
      .filter(row => row !== activeRow && row.isConnected && !row.hidden)
      .map(row => {
        const rect = row.getBoundingClientRect();
        if (!rect.width && !rect.height) return null;
        return { row, distance: Math.abs(rect.top + rect.height / 2 - activeY) };
      })
      .filter(Boolean);
    if (!rows.length) return;
    const nearest = Math.min(...rows.map(item => item.distance));
    const farthest = Math.max(...rows.map(item => item.distance));
    const span = farthest - nearest;
    const wave = _motionDuration('--dur-fast');
    rows.forEach(item => {
      const delay = span > 0 ? Math.round(((item.distance - nearest) / span) * wave) : 0;
      item.row.style.setProperty('--focus-wave-delay', delay + 'ms');
    });
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


  function openUI(taskEl, taskId) {

    if (uiTaskEl && uiTaskEl !== taskEl) closeUI(false);
    // Supersede the prior close callback before reusing the timer (BUG-065).
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
    // Reopening a completed session starts fresh (BUG-025).
    const _priorSt = getState(taskId);
    if (_priorSt.rem === 0 && !_priorSt.running) clearState(taskId);


    const originalScrollY = window.scrollY;
    const originalTaskTop = taskEl.getBoundingClientRect().top;


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


    _stageFocusWave(taskEl);


    const _hdr = document.getElementById('sticky-header');
    if (_hdr) _hdr.style.transition = '';
    document.body.classList.add('focus-locked');

    appEl.classList.add('focusing');
    taskEl.classList.add('focused');
    _setFocusInert(true, taskEl);
    taskEl.after(timerEl);
    timerEl.after(kbdHint);

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

        document.body.style.transition = 'top 200ms cubic-bezier(0.16, 1, 0.3, 1)';
        document.body.style.top = `-${_targetScrollY}px`;
        setTimeout(() => { document.body.style.transition = ''; }, 210);
      } else if (document.body.style.position === 'fixed') {

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


    document.body.style.position = 'fixed';
    document.body.style.top = `-${originalScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.dataset.scrollY     = originalScrollY;
    document.body.dataset.focusTaskTop = originalTaskTop;
    // Fixed header plus matching body padding prevents nudge drift (BUG-098).
    if (_hdr) {
      document.body.style.paddingTop = _hdr.getBoundingClientRect().height + 'px';
    }
  }


  function _trackFocusTime(taskId) {
    if (!taskId) return;
    const st = taskStates[taskId];
    if (!st) return;


    if (st.tracked) return;


    const timeSpentSecs = TOTAL - st.rem;
    if (timeSpentSecs <= 0) return;

    const timeSpentMins = Math.floor(timeSpentSecs / 60);
    if (timeSpentMins <= 0) return;


    st.tracked = true;




    // yesterday's history, then start fresh for today. (BUG-063)
    const _tfDate = localStorage.getItem('stat_focus_mins_date') || '';
    if (_tfDate && _tfDate !== _getAppDay()) {
      const _preMidnightMins = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
      if (_preMidnightMins > 0) localStorage.setItem('stat_focus_mins_yesterday_snapshot', _preMidnightMins);
    }
    const prevMins = _tfDate === _getAppDay() ? parseInt(localStorage.getItem('stat_focus_mins_today') || '0') : 0;
    localStorage.setItem('stat_focus_mins_today', prevMins + timeSpentMins);
    localStorage.setItem('stat_focus_mins_date', _getAppDay());


    _memoryOnFocusComplete(timeSpentMins);

    updateStats();
  }


  function closeUI(doResetState) {
    clearTimeout(tickHandle);
    _resetCopyFeedback(uiTaskEl);
    timerEl.classList.remove('open');
    timerEl.style.maxHeight = '';
    kbdHint.classList.remove('show');
    _setFocusInert(false, uiTaskEl);
    _focusResetAI(true);
    _updateBreatheOverlay(false);
    _breatheRun(fillEl, false);
    const _gmailBlock = document.getElementById('focusGmailBlock');
    if (_gmailBlock) Today.use('gmail').closeFocus();
    const _agentBlock = document.getElementById('focusAgentBlock');
    if (_agentBlock) Today.use('task-enrich').closeFocus();

    if (window._pipClose) window._pipClose();

    if (doResetState) {
      appEl.classList.remove('focusing');
      _clearFocusWave();
    }


    const scrollY      = parseInt(document.body.dataset.scrollY || '0');
    const lockY        = Math.abs(parseInt(document.body.style.top || '0'));
    const _driftAnchor = uiTaskEl;
    const _savedTaskTop = parseFloat(document.body.dataset.focusTaskTop || '-1');

    function _doUnfix() {
      document.body.style.transition = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.paddingTop = '';
      document.body.classList.remove('focus-locked');
      window.scrollTo(0, lockY);
      if (_savedTaskTop >= 0 && _driftAnchor) {
        const _expectedY = _savedTaskTop - (lockY - scrollY);
        const _drift = _driftAnchor.getBoundingClientRect().top - _expectedY;
        if (Math.abs(_drift) > 2) window.scrollTo(0, lockY + _drift);
      }
      window._focusJustExited = true;
      setTimeout(() => { window._focusJustExited = false; }, 2000);
    }

    _doUnfix();

    // End every session before delayed DOM cleanup (BUG-044/065).
    const closingTask   = uiTaskEl;
    const closingTaskId = uiTaskId;

    if (closingTaskId) {
      const _st      = getState(closingTaskId);
      const _hadTime = _st.rem < TOTAL;
      _trackFocusTime(closingTaskId);
      _st.running   = false;
      _st.paused    = false;
      _st.wallStart = null;
      if (_hadTime && closingTaskId.startsWith('trello_')) {
        const _fm = _getTrelloFocus();
        if (!_fm[closingTaskId]) {
          _fm[closingTaskId] = 1;
          _setTrelloFocus(_fm);
          if (closingTask) delete closingTask.dataset.ageBucket;
        }
        _markTrelloActive(closingTaskId); // persistent un-age (BUG-064)
      } else if (_hadTime && closingTaskId.startsWith('manual_')) {
        const _mIdx = manualTasks.findIndex(t => t.id === closingTaskId);
        if (_mIdx !== -1) {
          manualTasks[_mIdx].lastActive = Date.now();
          _saveManual();
          if (closingTask) delete closingTask.dataset.ageBucket;
        }
      }
      if (_hadTime) {
        _setLastLocalChange();
        dropboxAutoSave();
      }
    }

    localStorage.removeItem('today_focus_session');

    const myGen = ++focusGen;
    setTimeout(() => {
      if (closingTask && closingTask !== uiTaskEl) {
        closingTask.classList.remove('focused');
        if (doResetState) closingTask.style.removeProperty('--progress');
      }
      // A superseded close must not reparent the active timer (BUG-065).
      if (myGen !== focusGen) return;

      if (!doResetState) {
        appEl.classList.remove('focusing');
        _clearFocusWave();
      }
      document.body.appendChild(timerEl);
      timerEl.hidden = true;
      timerEl.setAttribute('aria-hidden', 'true');
      kbdHint.hidden = true;
      kbdHint.setAttribute('aria-hidden', 'true');

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

  }

  window._focusExpandTimer = function() {
    if (!timerEl || !timerEl.classList.contains('open')) return;
    timerEl.style.maxHeight = timerEl.scrollHeight + 'px';







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


  function start(taskEl) {
    const taskId = taskEl.dataset.taskid || taskEl.dataset.habitId;

    // Warm up the shared AudioContext on this user gesture so it stays

    _primeAudio();


    clearTimeout(tickHandle);


    if (uiTaskId && uiTaskId !== taskId) clearState(uiTaskId);

    const st      = getState(taskId);
    st.rem        = TOTAL;
    st.running    = true;
    st.paused     = false;
    st.wallStart  = Date.now();
    st.tracked    = false;
    playStartSound();

    openUI(taskEl, taskId);
    _saveSession(taskId, getState(taskId));
    tickFor(taskId);
  }


  function pause() {
    if (!uiTaskId) return;
    const st = getState(uiTaskId);
    if (!st.running) return;
    clearTimeout(tickHandle);
    st.running   = false;
    st.paused    = true;
    st.wallStart = null;
    _saveSession(uiTaskId, st);
    setPaused(true);
    _updateBreatheOverlay(true);
    if (window._a11yAnnounce) _a11yAnnounce('Focus paused.');
  }


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




  function _saveSession(taskId, st) {
    try {
      localStorage.setItem('today_focus_session', JSON.stringify(FocusSession.serialize(taskId, st)));
    } catch (e) {                    }
  }


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
    _setLastLocalChange();
    dropboxAutoSave();
    updateStats();
  }


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

  // Continue ticking for a background task (UI dismissed, not user-paused)
  function continueTicking(taskId) {
    const st = getState(taskId);
    if (!st.running || st.paused || st.rem <= 0) return;
    tickHandle = setTimeout(() => tickFor(taskId), 1000);
  }

  // Complete
  function completeFor(taskId) {
    if (taskId === uiTaskId) _focusResetAI(true);
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

  // Persist a session for habit or task
  function _logSession(taskId) {
    // Habit
    const habitIdx = habitsList.findIndex(h => h.id === taskId);
    if (habitIdx !== -1) {
      habitsList[habitIdx].focusSessions = (parseInt(habitsList[habitIdx].focusSessions) || 0) + 1;
      Today.use('habits')._saveHabits();
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

  // Tab visibility correction
  // On returning to tab: compute wall-clock elapsed, jump rem forward.
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) return;
    // Find any running task state and correct for elapsed time
    Object.keys(taskStates).forEach(function(taskId) {
      const st = taskStates[taskId];
      if (!st.running || !st.wallStart) return;
      const elapsed = FocusSession.wallElapsed(st);
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

  // Click handler
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

  // Tapping the add bar exits focus mode
  const _addInput = document.getElementById('newTask');
  if (_addInput) {
    _addInput.addEventListener('focus', function() {
      if (uiTaskId) closeUI(false);
    });
  }

  // Keyboard — guarded against accidental input-field triggers
  document.addEventListener('keydown', function(e) {
    if (e.defaultPrevented) return;
    // Allow native OS shortcuts (Cmd+H to hide, Cmd+Q to quit, etc.)
    if (e.metaKey || e.ctrlKey) return;

    if (!uiTaskId) return;
    const active  = document.activeElement;
    const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    const onRow = active?.matches?.('.task[data-taskid],.habit[data-habit-id]');
    const onControl = active?.closest?.('button,a,[role="button"]');
    if (e.code === 'Space' && !inInput && !onRow && !onControl) { e.preventDefault(); toggle(); }
    if (e.code === 'Escape') { closeUI(false); }
  });

  //
  // Picture-in-Picture Focus Widget
  // Always-on-top floating timer using Document PiP API (Chrome 116+, FF 148+)
  // Auto-opens when leaving tab during focus, persists until focus ends
  //
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
        const pip = _pipTokens();

        // Full 300×200 design — big centered timer, full-width progress bar
        pipWindow.document.body.innerHTML = `
          <style>
            :root {
              --pip-bg:               ${pip.bg};
              --pip-accent:           ${pip.accent};
              --pip-text-muted:       ${pip.muted};
              --pip-fill-track:       ${pip.fillTrack};
              --pip-fill-bar:         ${pip.fillBar};
              --pip-overlay:          ${pip.overlay};
              --pip-btn-bg:           ${pip.btnBg};
              --pip-btn-border:       ${pip.btnBorder};
              --pip-btn-hover-bg:     ${pip.btnHoverBg};
              --pip-btn-hover-border: ${pip.btnHoverBorder};
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
