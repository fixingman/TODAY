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

    function _saveHabits() {
      localStorage.setItem('today_habits',            JSON.stringify(habitsList));
      localStorage.setItem('today_habit_completions', JSON.stringify(habitCompletions));
      localStorage.setItem('today_habit_events',      JSON.stringify(habitEvents));
      dropboxAutoSave();
    }

    // Habits roll over at 3am, not midnight — a "late but done" check (e.g. 12:30am)
    // still counts toward the day that's ending, because behaviourally the day ends
    // when you sleep, not when the clock flips. Tasks / streak / focus keep the midnight
    // boundary (_getAppDay) — only habits get this grace window. (v2.17.61)
    //
    // BUG-010 safety: we shift a Date object back by the grace hours, then derive the
    // local YYYY-MM-DD via _localISO(). This stays entirely in local time — never UTC.
    //
    // History note (v2.12.74): an *unintended* 1am habit lag was once a bug because the
    // strip refreshed on a different boundary than checking. This is intentional and
    // consistent — every habit-day read (_habitTodayISO + _getHabitDates) goes through
    // _habitNow(), so the strip refreshes at 3am in lockstep with check eligibility.
    // HABIT_ROLLOVER_HOURS + _habitNow() + _habitTodayISO() now live in assets/util.js.

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
      // Asymmetric exponential smoothing:
      // - alpha_up   = 0.90 — building takes time (same as before)
      // - alpha_down = 0.97 — misses are forgiven more gently
      //
      // A perfect day moves the score up at the same rate as before.
      // A missed day barely dents a good streak — life happens.
      // Building feels like work; one slip doesn't feel catastrophic.
      //
      // Drop from 30-day streak: old=10%, new=3%.
      // Perfect streaks reach the same peaks at the same rate.
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

      // Check if all habits are done for today
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
        const completedDays = week.filter(d => ds.has(d));
        const dots = week.map((d, i) => {
          const opacity = i >= 14 ? 1 : (0.12 + (i / 14) * 0.70);
          const style   = `opacity:${opacity.toFixed(2)}`;
          return `<span class="week-dot${ds.has(d) ? ' filled' : ''}${d === _habitTodayISO() ? ' is-today' : ''}" style="${style}"></span>`;
        }).join('');
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
          <button type="button" class="habit-check" aria-pressed="${isDone}" aria-label="${isDone ? 'Mark incomplete' : 'Mark complete'}: ${esc(h.name)}" onclick="toggleHabitDone('${h.id}')">${CHK}</button>
          <div class="habit-body"><div class="habit-name">${esc(h.name)}${sessionBadge}</div></div>
          <div class="habit-week" aria-hidden="true">${dots}</div>
          <div class="habit-streak" title="${strength}% habit strength">
            <span class="streak-label${strength >= 80 ? ' hot' : ''}">${strengthTxt}</span>
          </div>
          <span class="visually-hidden" id="habitSummary-${h.id}">${completedDays.length} of the last 21 days complete. ${strength}% habit strength.</span>`;
        list.appendChild(el);
      });
    }

    function toggleHabits() {
      const scrollY = window.scrollY; // Preserve scroll position
      const panel = document.getElementById('habitsPanel');
      const isOpening = !panel.classList.contains('open');
      if (isOpening) {
        panel.style.animation = ''; // clear repaint suppression so fadeIn plays (BUG-023)
        panel.classList.add('open');
      } else {
        panel.classList.remove('open');
      }
      $.configPanel.classList.remove('open');
      _endConnectionsPrivacyVisit();
      document.getElementById('infoPanel').classList.remove('open');
      $.memoryPanel?.classList.remove('open');
      syncActiveButtons();
      window.scrollTo(0, scrollY); // Restore scroll position
      if (isOpening) {
        renderHabits();
        setTimeout(() => {}, 0); // flush
        const _hBtn = document.getElementById('habitsBtn');
        if (_hBtn && _hBtn.classList.contains('btn-icon-habits')) {
          _hBtn.classList.remove('btn-icon-habits');
          localStorage.setItem('habit_nudge_opened_' + _habitTodayISO(), '1');
          _pruneLS('habit_nudge_opened_', 'habit_nudge_opened_' + _habitTodayISO());
        }
      }
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
          // Swap input → name div
          const nameDiv = document.createElement('div');
          nameDiv.className   = 'habit-name';
          nameDiv.textContent = h ? h.name : name;
          input.replaceWith(nameDiv);
          // Swap delete → streak div
          const strength  = _getHabitStrength(id);
          const streakDiv = document.createElement('div');
          streakDiv.className = 'habit-streak';
          streakDiv.title     = strength + '% habit strength';
          streakDiv.innerHTML = `<span class="streak-label${strength >= 80 ? ' hot' : ''}">${strength > 0 ? strength + '%' : '—'}</span>`;
          del.replaceWith(streakDiv);
          row.classList.remove('editing');
        });
        _saveHabits();
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
        // Set class first — so visibility:hidden on checkbox applies before any repaint
        row.classList.add('editing');
        // Swap name div → input
        const input       = document.createElement('input');
        input.className   = 'habit-edit-input';
        input.value       = h.name;
        input.maxLength   = 100;
        input.dataset.id  = id;
        input.placeholder = 'Name the habit…';
        input.addEventListener('keydown', handleHabitEditKey);
        nameDiv.replaceWith(input);
        // Swap streak div → archive button
        const del       = document.createElement('button');
        del.className   = 'habit-edit-delete';
        del.textContent = '×';
        del.title       = 'Archive';
        del.addEventListener('click', () => archiveHabit(id));
        streakDiv.replaceWith(del);
      });
      // Close new-habit input if open
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
      // Animate only the newly added row — not every row on every renderHabits call
      const newRow = document.querySelector('.habit[data-habit-id="' + newId + '"]');
      if (newRow) newRow.classList.add('habit-new');
      input.value = '';
      document.getElementById('habitAddRow').classList.remove('open');
      document.getElementById('habitNewBtn').classList.remove('active');
    }

    // Brief neutral opacity pulse on a checkbox — the uncheck acknowledgement
    // (Rule 9: uncheck is neutral, no celebration). One-shot, so CSS transition
    // is fine here (Rule 29 applies to looping animations only). Shared by the
    // habit and task uncheck paths.
    function _pulseCheck(check) {
      check.style.transition = 'opacity 80ms ease';
      check.style.opacity = '0.4';
      setTimeout(() => { check.style.opacity = ''; check.style.transition = ''; }, 160);
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

      // Update dot fill for today
      el.querySelectorAll('.week-dot.is-today').forEach(dot => {
        dot.classList.toggle('filled', isNowDone);
      });

      // Update strength label
      const strength = _getHabitStrength(id);
      const streakEl = el.querySelector('.streak-label');
      if (streakEl) {
        streakEl.textContent = strength > 0 ? strength + '%' : '—';
        streakEl.className   = 'streak-label' + (strength >= 80 ? ' hot' : '');
      }

      const check = el.querySelector('.habit-check');
      if (isNowDone) {
        // Haptic + ember burst, matching task check
        _haptic('success');
        if (check && typeof fireEmberDrift === 'function') {
          const r = check.getBoundingClientRect();
          fireEmberDrift(r.left + r.width / 2, r.top + r.height / 2);
        }

        // ── ALL HABITS DONE celebration ──
        const todayISO = _habitTodayISO();
        const activeHabits = habitsList.filter(h => !h.archived);
        const allDone = activeHabits.length > 0 && activeHabits.every(h =>
          (habitCompletions[h.id] || []).includes(todayISO)
        );

        if (allDone) {
          checkHabitNudge(); // clear button pulse immediately on completion
          // Gentle glow
          _flashAccentGlow();

          // Extra haptic
          setTimeout(() => _haptic('success'), 150);

          // Extra ember bursts from the habit row that completed it
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
          if (svg && svg.animate) svg.animate(
            [{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 1, transform: 'scale(1)' }],
            { duration: 150, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'none' }
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

    window._saveHabits = _saveHabits;
    window._getHabitStrength = _getHabitStrength;
    window.renderHabits = renderHabits;
    window.toggleHabits = toggleHabits;
    window.toggleHabitEditMode = toggleHabitEditMode;
    window._enterHabitEditMode = _enterHabitEditMode;
    window.handleHabitEditKey = handleHabitEditKey;
    window.toggleHabitInput = toggleHabitInput;
    window.handleHabitKey = handleHabitKey;
    window.addHabit = addHabit;
    window._pulseCheck = _pulseCheck;
    window.toggleHabitDone = toggleHabitDone;
    window.archiveHabit = archiveHabit;
    // _getHabitDates is private (only called by renderHabits inside this module)
  };
})();
