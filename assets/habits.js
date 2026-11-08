// TODAY — Habit tracking, completions, strength, and archive flow.
// Inert until index.html calls window._startHabits() before init().
(function() {
  'use strict';
  let started = false;
  window._startHabits = function() {
    if (started) return;
    started = true;
    // No state moves into this closure — habitsList, habitCompletions, habitEvents,
    // habitEditMode remain as inline globals (wholesale-reassigned by Dropbox sync/
    // restore; read directly by drag.js, focus module, merge layer).

    const desktopHistory = matchMedia('(min-width: 601px)');
    let historyObserver, historyList, historyFrame = 0;
    function _stopHistoryFit() {
      historyObserver?.disconnect();
      historyList = null;
      cancelAnimationFrame(historyFrame);
    }
    desktopHistory.addEventListener('change', () => _fitHabitHistory());

    function _saveHabits() {
      localStorage.setItem('today_habits',            JSON.stringify(habitsList));
      localStorage.setItem('today_habit_completions', JSON.stringify(habitCompletions));
      localStorage.setItem('today_habit_events',      JSON.stringify(habitEvents));
      dropboxAutoSave();
    }

    // All habit dates share the local 3am boundary; see architecture/Data.md.
    function _getHabitDates() {
      // Last 21 days ending with the current habit-day (3am-shifted, local time)
      const now = _habitNow();
      const days = [];
      for (let i = 20; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push(_localISO(d));
      }
      return days;
    }

    function _getHabitStrength(id) {
      // Build at 0.90, forgive misses at 0.97 over 90 days.
      const completions = new Set(habitCompletions[id] || []);
      const alpha_up   = 0.90;
      const alpha_down = 0.97;
      let score = 0;
      const today = new Date();
      for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const done = completions.has(_localISO(d)) ? 1 : 0;
        const alpha = done === 1 ? alpha_up : alpha_down;
        score = score * alpha + done * (1 - alpha);
      }
      return Math.round(score * 100);
    }

    function renderHabits() {
      const list    = document.getElementById('habitList');
      const empty   = document.getElementById('habitEmpty');
      const editBtn = document.getElementById('habitEditBtn');
      if (!list) return;
      const week = _getHabitDates();
      const todayISO = _habitTodayISO();

      const activeHabits = habitsList.filter(h => !h.archived);

      const allDoneToday = activeHabits.length > 0 && activeHabits.every(h =>
        (habitCompletions[h.id] || []).includes(todayISO)
      );

      if (activeHabits.length === 0) {
        empty.textContent = 'No habits yet';
        empty.classList.add('show');
      } else if (allDoneToday) {
        empty.innerHTML = '<span class="done-star">✦</span> All done';
        _breathe(empty.querySelector('.done-star'),
          [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0.6, transform: 'scale(0.92)' }, { opacity: 1, transform: 'scale(1)' }], 2400);
        empty.classList.add('show');
      } else {
        empty.classList.remove('show');
      }

      if (editBtn) editBtn.style.display = activeHabits.length > 0 ? '' : 'none';

      // Countdown line — shown 10pm–3am when habits are incomplete
      const _countdown = document.getElementById('habitCountdown');
      if (_countdown) {
        const _hour = new Date().getHours();
        const _inWindow = _hour >= 22 || _hour < 3;
        if (_inWindow && activeHabits.length > 0 && !allDoneToday) {
          let _ctText;
          if (_hour < 3) {
            _ctText = 'before 3am';
          } else {
            const _reset = new Date();
            _reset.setDate(_reset.getDate() + 1);
            _reset.setHours(3, 0, 0, 0);
            const _diff = _reset - new Date();
            const _h = Math.floor(_diff / 3600000);
            const _m = Math.floor((_diff % 3600000) / 60000);
            _ctText = _h > 0 ? `${_h}h ${_m}m left today` : `${_m}m left today`;
          }
          _countdown.textContent = _ctText;
          _countdown.style.display = '';
        } else {
          _countdown.style.display = 'none';
        }
      }

      list.innerHTML = '';
      const CHK = `<svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true" focusable="false"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      activeHabits.forEach(h => {
        const ds     = new Set(habitCompletions[h.id] || []);
        const isDone = ds.has(_habitTodayISO());
        const strength = _getHabitStrength(h.id);
        const { dots, completedDays } = _historyDots(h, week.length);
        const strengthTxt = strength > 0 ? `${strength}%` : '—';
        const sessions    = parseInt(h.focusSessions) || 0;
        const sessionBadge = sessions > 0
          ? `<span class="session-count has-sessions">${sessions} 🍅</span>`
          : `<span class="session-count"></span>`;
        const el = document.createElement('div');
        el.className = `habit${isDone ? ' done-today' : ''}`;
        el.dataset.habitId = h.id;
        el.setAttribute('role', 'listitem');
        el.tabIndex = 0;
        el.setAttribute('aria-describedby', `habitSummary-${h.id} reorderHelp`);
        el.innerHTML = `
          <button type="button" class="habit-check" aria-pressed="${isDone}" aria-label="${isDone ? 'Mark incomplete' : 'Mark complete'}: ${esc(h.name)}" data-today-click="habits.toggle-done" data-habit-id="${esc(h.id)}">${CHK}</button>
          <div class="habit-body"><div class="habit-name">${esc(h.name)}${sessionBadge}</div></div>
          <div class="habit-history">
            <div class="habit-week" aria-hidden="true">${dots}</div>
            <div class="habit-streak" title="${strength}% habit strength">
              <span class="streak-label${strength >= 80 ? ' hot' : ''}">${strengthTxt}</span>
            </div>
          </div>
          <span class="visually-hidden" id="habitSummary-${h.id}">${completedDays} of the last ${week.length} days complete. ${strength}% habit strength.</span>`;
        list.appendChild(el);
      });
      if (historyList !== list) {
        _stopHistoryFit();
        historyList = list;
        if (typeof ResizeObserver === 'function') {
          historyObserver ||= new ResizeObserver(() => {
            cancelAnimationFrame(historyFrame);
            historyFrame = requestAnimationFrame(_fitHabitHistory);
          });
          historyObserver.observe(list);
        }
      }
      _fitHabitHistory();
    }

    // History fills the row (Can, November 8): as many days as fit after the strength
    // label, back to the habit's first stored day. The last 7 days stay full; older days
    // fade. A short history shows only the days it has.
    const DOT_STEP = 10; // 5px dot + 5px gap
    function _historyDays(count) {
      const now = _habitNow(), days = [];
      for (let i = count - 1; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate() - i); days.push(_localISO(d)); }
      return days;
    }
    function _availableDays(h) {
      const first = [h.created_at, ...(habitCompletions[h.id] || [])]
        .filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d + 'T12:00:00')))
        .sort()[0];
      if (!first) return 1;
      const span = Math.round((new Date(_habitTodayISO() + 'T12:00:00') - new Date(first + 'T12:00:00')) / 86400000) + 1;
      return Math.max(1, span);
    }
    function _historyDots(h, count) {
      const ds = new Set(habitCompletions[h.id] || []), today = _habitTodayISO(), days = _historyDays(count);
      let completedDays = 0;
      const dots = days.map((d, i) => {
        const done = ds.has(d); if (done) completedDays++;
        const fadeDays = desktopHistory.matches ? count - 7 : 14;
        const opacity = i >= fadeDays ? 1 : 0.12 + (i / Math.max(1, fadeDays)) * 0.70;
        return `<span class="week-dot${done ? ' filled' : ''}${d === today ? ' is-today' : ''}" style="opacity:${opacity.toFixed(2)}"></span>`;
      }).join('');
      return { dots, completedDays };
    }
    function _fitHabitHistory() {
      const list = document.getElementById('habitList');
      const rows = list ? [...list.querySelectorAll('.habit[data-habit-id]')] : [];
      if (!rows.length) return;
      rows.forEach(row => {
        const h = habitsList.find(x => x.id === row.dataset.habitId); if (!h) return;
        const history = row.querySelector('.habit-history'), end = history?.lastElementChild;
        if (!history || !end) return;
        const gap = parseFloat(getComputedStyle(history).columnGap) || 0;
        if (desktopHistory.matches && !history.clientWidth) return;
        const capacity = Math.max(1, Math.floor((history.clientWidth - end.offsetWidth - gap + 5) / DOT_STEP));
        const count = desktopHistory.matches ? Math.min(capacity, _availableDays(h)) : 21;
        const week = row.querySelector('.habit-week');
        week.classList.toggle('short-history', desktopHistory.matches && count < capacity);
        if (Number(row.dataset.visibleDays) === count) return;
        week.innerHTML = _historyDots(h, count).dots;
        row.dataset.visibleDays = String(count);
        _updateHistorySummary(row, _getHabitStrength(h.id));
      });
    }
    function _updateHistorySummary(row, strength) {
      const dots = row.querySelectorAll('.week-dot');
      const summary = row.querySelector('.visually-hidden');
      if (summary) summary.textContent = `${row.querySelectorAll('.week-dot.filled').length} of the last ${dots.length} days complete. ${strength}% habit strength.`;
    }

    function toggleHabits() {
      if (Today.use('sidebar').isOpen('habits')) { Today.use('sidebar').close(); return; }
      Today.use('sidebar').open('habits');
    }
    function _mountHabits(container) {
      container.innerHTML = `<div class="ex-sheet-head"><h2 class="config-title" id="habitsTitle" tabindex="-1">◎&#xFE0E; Habits</h2><button type="button" class="ex-hide" data-sidebar-close aria-label="Hide Habits"></button></div><div class="ex-sheet-scroll" id="habitsContent"><div class="habit-countdown" id="habitCountdown" style="display:none"></div><div class="habit-list" id="habitList" role="list" aria-label="Habits"></div><div class="habit-empty" id="habitEmpty">No habits yet</div><div class="habit-add-row" id="habitAddRow"><label class="visually-hidden" for="habitInput">Habit name</label><input class="habit-input" id="habitInput" type="text" autocomplete="off" maxlength="100" placeholder="Name the habit…" data-today-keydown="habits.input-key"><button class="habit-add-btn" data-today-click="habits.add">Add</button></div><div class="config-actions"><button class="btn-ghost" id="habitNewBtn" data-today-click="habits.new">New habit</button><button class="btn-ghost" id="habitEditBtn" data-today-click="habits.edit" style="display:none">Edit</button></div></div><div class="ex-sheet-foot"></div>`;
      Today.use('sidebar').setCloseIcon(container.querySelector('[data-sidebar-close]'));
      $.configPanel.classList.remove('open');
      Today.use('connections')._endConnectionsPrivacyVisit();
      renderHabits();
      const _hBtn = document.getElementById('habitsBtn');
      if (_hBtn && _hBtn.classList.contains('btn-icon-habits')) {
        _hBtn.classList.remove('btn-icon-habits');
        localStorage.setItem('habit_nudge_opened_' + _habitTodayISO(), '1');
        _pruneLS('habit_nudge_opened_', 'habit_nudge_opened_' + _habitTodayISO());
      }
      document.getElementById('habitsTitle')?.focus({ preventScroll: true });
      Today.use('connections').syncActiveButtons();
    }

    function toggleHabitEditMode() {
      if (habitEditMode) {
        // Exiting edit — save values and swap inputs back to text
        document.querySelectorAll('#habitList .habit[data-habit-id]').forEach(row => {
          const id    = row.dataset.habitId;
          const input = row.querySelector('.habit-edit-input');
          const del   = row.querySelector('.habit-edit-delete');
          if (!input || !del) return;
          const h    = habitsList.find(h => h.id === id);
          const name = input.value.trim();
          if (h && name) h.name = name;
          const nameDiv = document.createElement('div');
          nameDiv.className   = 'habit-name';
          nameDiv.textContent = h ? h.name : name;
          input.replaceWith(nameDiv);
          const strength  = _getHabitStrength(id);
          const streakDiv = document.createElement('div');
          streakDiv.className = 'habit-streak';
          streakDiv.title     = strength + '% habit strength';
          streakDiv.innerHTML = `<span class="streak-label${strength >= 80 ? ' hot' : ''}">${strength > 0 ? strength + '%' : '—'}</span>`;
          del.replaceWith(streakDiv);
          row.classList.remove('editing');
        });
        _saveHabits();
        // iOS: reset any zoom triggered by the input gaining focus
        const vp = document.querySelector('meta[name=viewport]');
        if (vp) { const c = vp.content; vp.content = c + ',maximum-scale=1'; setTimeout(() => { vp.content = c; }, 50); }
      } else {
        _enterHabitEditMode();
      }
      habitEditMode = !habitEditMode;
      const btn = document.getElementById('habitEditBtn');
      btn.textContent = habitEditMode ? 'Done' : 'Edit';
      btn.classList.toggle('active', habitEditMode);
    }

    function _enterHabitEditMode() {
      document.querySelectorAll('#habitList .habit[data-habit-id]').forEach(row => {
        const id      = row.dataset.habitId;
        const h       = habitsList.find(h => h.id === id);
        if (!h) return;
        const nameDiv   = row.querySelector('.habit-name');
        const streakDiv = row.querySelector('.habit-streak');
        if (!nameDiv || !streakDiv) return;
        row.classList.add('editing');
        const input       = document.createElement('input');
        input.className   = 'habit-edit-input';
        input.value       = h.name;
        input.maxLength   = 100;
        input.dataset.id  = id;
        input.placeholder = 'Name the habit…';
        input.addEventListener('keydown', handleHabitEditKey);
        nameDiv.replaceWith(input);
        const del       = document.createElement('button');
        del.className   = 'habit-edit-delete';
        del.textContent = '×';
        del.title       = 'Archive';
        del.addEventListener('click', () => archiveHabit(id));
        streakDiv.replaceWith(del);
      });
      document.getElementById('habitAddRow').classList.remove('open');
      document.getElementById('habitNewBtn').classList.remove('active');
    }

    function handleHabitEditKey(e) {
      if (e.key === 'Escape') toggleHabitEditMode();
      if (e.key === 'Enter')  e.target.blur();
    }

    function toggleHabitInput() {
      const row = document.getElementById('habitAddRow');
      const btn = document.getElementById('habitNewBtn');
      const isOpen = row.classList.contains('open');
      row.classList.toggle('open', !isOpen);
      btn.classList.toggle('active', !isOpen);
      if (!isOpen) {
        // Close edit mode if open — exit cleanly without re-rendering
        if (habitEditMode) toggleHabitEditMode();
        setTimeout(() => document.getElementById('habitInput').focus(), 30);
      }
    }

    function handleHabitKey(e) {
      if (e.key === 'Enter')  addHabit();
      if (e.key === 'Escape') toggleHabitInput();
    }

    function addHabit() {
      const input = document.getElementById('habitInput');
      const name  = input.value.trim();
      if (!name) return;
      const newId = 'habit_' + Date.now();
      habitsList.push({ id: newId, name, created_at: _habitTodayISO() });
      _saveHabits(); renderHabits();
      const newRow = document.querySelector('.habit[data-habit-id="' + newId + '"]');
      _rowEnter(newRow);
      input.value = '';
      document.getElementById('habitAddRow').classList.remove('open');
      document.getElementById('habitNewBtn').classList.remove('active');
    }

    // Brief neutral opacity pulse on a checkbox — the uncheck acknowledgement
    // (Rule 9: uncheck is neutral, no celebration). One-shot, so CSS transition
    // is fine here (Rule 29 applies to looping animations only). Shared by the
    // habit and task uncheck paths.
    function _pulseCheck(check) {
      check.style.transition = 'opacity var(--dur-exit) var(--ease-std)';
      check.style.opacity = '0.4';
      setTimeout(() => { check.style.opacity = ''; check.style.transition = ''; }, _motionDuration('--dur-exit') * 2);
    }

    function toggleHabitDone(id) {
      if (!habitCompletions[id]) habitCompletions[id] = [];
      const today   = _habitTodayISO();
      const i       = habitCompletions[id].indexOf(today);
      const isNowDone = i === -1;
      if (isNowDone) { habitCompletions[id].push(today); playHabitDoneSound(); }
      else           { habitCompletions[id].splice(i, 1); }
      // Record explicit check/uncheck event so sync merge can apply LWW instead of pure union.
      // Without this, a 7s background sync re-checks the habit from stale Dropbox data. (BUG-026)
      habitEvents[id + '::' + today] = { type: isNowDone ? 'check' : 'uncheck', at: new Date().toISOString() };
      _saveHabits();

      // If this habit is currently in focus mode, close the UI cleanly — same
      // transition as checking a task during focus (log session, collapse timer).
      if (isNowDone && window._focusOnCheck) window._focusOnCheck(id);

      // Surgical DOM — never rebuild the list, just patch the affected row
      const el = document.querySelector('.habit[data-habit-id="' + id + '"]');
      if (!el) return;

      el.classList.toggle('done-today', isNowDone);
      const checkButton = el.querySelector('.habit-check');
      const habit = habitsList.find(h => h.id === id);
      if (checkButton) {
        checkButton.setAttribute('aria-pressed', String(isNowDone));
        checkButton.setAttribute('aria-label', `${isNowDone ? 'Mark incomplete' : 'Mark complete'}: ${habit?.name || 'habit'}`);
      }
      if (window._a11yAnnounce) _a11yAnnounce(`${habit?.name || 'Habit'} ${isNowDone ? 'completed' : 'marked incomplete'}.`);

      el.querySelectorAll('.week-dot.is-today').forEach(dot => {
        dot.classList.toggle('filled', isNowDone);
        if (isNowDone && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          dot.animate(
            [{ transform: 'scale(0.4)', opacity: '0.5' }, { transform: 'scale(1.5)', opacity: '1' }, { transform: 'scale(1)', opacity: '1' }],
            { duration: _motionDuration('--dur-base'), easing: _motionEasing('--ease-spring'), fill: 'none' }
          );
        }
      });

      // Update strength and the accessible history count without replacing the row.
      const strength = _getHabitStrength(id);
      _updateHistorySummary(el, strength);
      const strengthCell = el.querySelector('.habit-streak');
      if (strengthCell) strengthCell.title = strength + '% habit strength';
      const streakEl = el.querySelector('.streak-label');
      if (streakEl) {
        const newTxt = strength > 0 ? strength + '%' : '—';
        streakEl.className = 'streak-label' + (strength >= 80 ? ' hot' : '');
        if (newTxt !== streakEl.textContent && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const spring = _motionEasing('--ease-spring');
          const exitAnim = streakEl.animate(
            [{ transform: 'translateY(0)', opacity: '1' }, { transform: 'translateY(-6px)', opacity: '0' }],
            { duration: _motionDuration('--dur-exit'), easing: _motionEasing('--ease-in'), fill: 'forwards' }
          );
          exitAnim.onfinish = function() {
            exitAnim.cancel(); // clear fill:forwards so it can't re-assert after enter finishes
            streakEl.textContent = newTxt;
            streakEl.animate(
              [{ transform: 'translateY(6px)', opacity: '0' }, { transform: 'translateY(0)', opacity: '1' }],
              { duration: _motionDuration('--dur-fast'), easing: spring, fill: 'none' }
            );
          };
        } else {
          streakEl.textContent = newTxt;
        }
      }

      const check = el.querySelector('.habit-check');
      if (isNowDone) {
        _haptic('success');
        if (check && typeof fireEmberDrift === 'function') {
          const r = check.getBoundingClientRect();
          fireEmberDrift(r.left + r.width / 2, r.top + r.height / 2);
        }

        const todayISO = _habitTodayISO();
        const activeHabits = habitsList.filter(h => !h.archived);
        const allDone = activeHabits.length > 0 && activeHabits.every(h =>
          (habitCompletions[h.id] || []).includes(todayISO)
        );

        if (allDone) {
          checkHabitNudge(); // clear button pulse immediately on completion
          _flashAccentGlow();

          setTimeout(() => _haptic('success'), 150);

          if (check && typeof fireEmberDrift === 'function') {
            const r = check.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            for (let i = 0; i < 3; i++) {
              setTimeout(() => fireEmberDrift(cx + (Math.random() - 0.5) * 40, cy), i * 60);
            }
          }
        }

        // Checkmark pop-in via Web Animations API — creates a fresh Animation object
        // each call, so rapid back-to-back checks never share state or drop each other.
        if (check) {
          const svg = check.querySelector('svg');
          if (svg && !_motionReduced()) svg.animate(
            [{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 1, transform: 'scale(1)' }],
            { duration: _motionDuration('--dur-fast'), easing: _motionEasing('--ease-out'), fill: 'none' }
          );
        }

        // Consecutive-run dot cascade — ripple left-to-right across the run
        const completions = new Set(habitCompletions[id]);
        let runLen = 0;
        const runCursor = new Date();
        while (completions.has(_localISO(runCursor))) {
          runLen++;
          runCursor.setDate(runCursor.getDate() - 1);
        }
        if (runLen >= 2) {
          const filledDots = Array.from(el.querySelectorAll('.week-dot.filled'));
          filledDots.slice(-runLen).forEach((dot, i) => {
            setTimeout(() => {
              dot.classList.add('dot-ripple');
              dot.addEventListener('animationend', () => dot.classList.remove('dot-ripple'), { once: true });
            }, i * 40);
          });
        }
      } else {
        // Uncheck: brief neutral pulse on the checkbox
        if (check) {
          _pulseCheck(check);
        }
      }
    }

    function archiveHabit(id) {
      const h = habitsList.find(h => h.id === id);
      if (!h) return;
      h.archived = true;
      _saveHabits();
      renderHabits();
      if (habitEditMode) _enterHabitEditMode();
      _archiveHabitUndo(h);
    }

    if (window.Today) {
      Today.define('habits', {
        _saveHabits,
        _getHabitStrength,
        renderHabits,
        toggleHabits,
        toggleHabitEditMode,
        _enterHabitEditMode,
        handleHabitEditKey,
        toggleHabitInput,
        handleHabitKey,
        addHabit,
        _pulseCheck,
        toggleHabitDone,
        archiveHabit,
      });
      Today.use('sidebar').register('habits', {
        mount: _mountHabits,
        unmount() { _stopHistoryFit(); Today.use('connections').syncActiveButtons(); },
        label: 'Habits', icon: '◎', order: 3,
      });
      Today.ui.register('click', 'habits.toggle', toggleHabits);
      Today.ui.register('click', 'habits.add', addHabit);
      Today.ui.register('click', 'habits.new', toggleHabitInput);
      Today.ui.register('click', 'habits.edit', toggleHabitEditMode);
      Today.ui.register('click', 'habits.toggle-done', (_event, button) => toggleHabitDone(button.dataset.habitId));
      Today.ui.register('keydown', 'habits.input-key', handleHabitKey);
    }

    // _getHabitDates is private (only called by renderHabits inside this module)
  };
})();
