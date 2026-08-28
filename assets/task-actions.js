// TODAY — task mutation actions: add, check/uncheck, delete, undo stack, row controls, stats.
// Inert until index.html calls window._startTaskActions() before init().
window._startTaskActions = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

    // ── Closure state ──
    const MAX_TASK_LENGTH = 500;
    let _deletedStack = [];
    let _archivedHabitStack = [];
    let _lastUndoType = 'task';
    let _undoTimeout = null;
    let _undoTimeoutStart = 0;
    let _undoTimeoutRemaining = 5000;
    let _pendingDeleteText = '';
    let _lastFaviconKey = null;

    // ── Functions ──

    function _applyDoneStyles(el, isDone) {
      el.style.opacity = isDone ? '0.25' : '';
      const textEl = el.querySelector('.task-text');
      if (textEl) {
        textEl.style.textDecoration = isDone ? 'line-through' : '';
        textEl.style.textDecorationColor = isDone ? 'var(--done-line)' : '';
        textEl.style.color = '';
      }
      const checkEl = el.querySelector('.task-check');
      if (checkEl) {
        checkEl.style.background  = isDone ? 'var(--accent)' : '';
        checkEl.style.borderColor = isDone ? 'var(--accent)' : '';
        checkEl.setAttribute('aria-pressed', String(isDone));
        const name = el.querySelector('.task-text')?.textContent?.replace(/\s+/g, ' ').trim() || 'task';
        checkEl.setAttribute('aria-label', `${isDone ? 'Mark incomplete' : 'Mark complete'}: ${name}`);
      }
      const svgEl = el.querySelector('.task-check svg');
      if (svgEl) svgEl.style.display = isDone ? 'block' : 'none';
    }

    // One delegated listener owns the task-row controls across manual and Trello
    // renders. Keeping it inside this started-once module prevents duplicate
    // handlers while allowing rows to be replaced without rebinding controls.
    function _bindTaskActionDelegation() {
      document.addEventListener('click', function(e) {
        // Copy task text and briefly show feedback on the originating control.
        const copyEl = e.target.closest('.task-copy');
        if (copyEl) {
          const taskEl = copyEl.closest('.task[data-taskid]');
          if (taskEl) {
            const textEl = taskEl.querySelector('.task-text');
            const clone = textEl.cloneNode(true);
            // Preserve actual link targets in copied text. Remove visual-only task
            // metadata that should not become part of the clipboard payload.
            clone.querySelectorAll('.task-link').forEach(a => {
              a.replaceWith(document.createTextNode(' ' + a.href));
            });
            clone.querySelectorAll('.session-count, .task-tag').forEach(el => el.remove());
            const text = clone.textContent.replace(/\s+/g, ' ').trim();
            const feedbackGeneration = (copyEl._copyFeedbackGeneration || 0) + 1;
            copyEl._copyFeedbackGeneration = feedbackGeneration;

            function _showCopied() {
              if (copyEl._copyFeedbackGeneration !== feedbackGeneration) return;
              clearTimeout(copyEl._copyFeedbackTimer);
              copyEl.textContent = 'copied';
              copyEl.classList.add('copied');
              copyEl._copyFeedbackTimer = setTimeout(() => {
                if (copyEl._copyFeedbackGeneration !== feedbackGeneration) return;
                copyEl.textContent = 'copy';
                copyEl.classList.remove('copied');
                delete copyEl._copyFeedbackTimer;
              }, 1800);
            }

            _copyToClipboard(text, _showCopied);
          }
          return;
        }

        const checkEl = e.target.closest('.task-check');
        if (checkEl) {
          const id = checkEl.dataset.taskid;
          if (id) {
            // Focus mode owns completion teardown before the shared mutation path.
            if (window._focusOnCheck && window._focusOnCheck(id)) return;
            toggleDone(id);
          }
          return;
        }

        const deleteEl = e.target.closest('.task-delete');
        if (deleteEl) {
          const id = deleteEl.dataset.taskid;
          if (id) { _haptic('warning'); deleteManual(id); }
        }
      });
    }

    function toggleDone(taskId) {
      if (doneIds.has(taskId)) {
        doneIds.delete(taskId);
        _addUncheckedId(taskId);  // explicit uncheck — track with timestamp
        _removeCheckedId(taskId); // clear any prior check timestamp
      } else {
        doneIds.add(taskId);
        _addCheckedId(taskId);    // explicit check — track with timestamp
        _removeUncheckedId(taskId); // clear any prior uncheck timestamp
      }

      _saveDone();
      _setLastLocalChange();
      dropboxAutoSave();

      // Done-today count derives from today_checked_ids (set above via _addCheckedId) — no
      // separate counter to increment. See _doneTodayCount.
      if (doneIds.has(taskId)) {
        // Update memory with task completion
        const task = manualTasks.find(t => t.id === taskId) ||
                     (trelloTasks || []).find(t => 'trello_' + t.id === taskId);
        const taskText = task?.text || task?.name || '';
        _memoryOnTaskComplete(taskText, task?.id);
      }

      const el = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
      if (el) {
        const isNowDone = doneIds.has(taskId);
        el.classList.toggle('done', isNowDone);
        _applyDoneStyles(el, isNowDone);

        // Haptic feedback on check — success pattern on both Android and iOS
        if (isNowDone) _haptic('success');

        // Sound + celebration on check only — not on uncheck
        if (isNowDone) playCompleteSound();
        if (isNowDone && typeof fireEmberDrift === 'function') {
          const check = el.querySelector('.task-check');
          if (check) {
            const r = check.getBoundingClientRect();
            fireEmberDrift(r.left + r.width/2, r.top + r.height/2);
          }
        }
        // Checkmark pop-in via Web Animations API — fresh Animation object per call,
        // immune to Chrome's CSS animation restart-drop on rapid back-to-back checks.
        if (isNowDone) {
          const svg = el.querySelector('.task-check svg');
          if (svg && svg.animate) svg.animate(
            [{ opacity: 0, transform: 'scale(0.5)' }, { opacity: 1, transform: 'scale(1)' }],
            { duration: 150, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'none' }
          );
        }
        // Uncheck: brief neutral pulse on the checkbox
        if (!isNowDone) {
          const check = el.querySelector('.task-check');
          if (check) {
            _pulseCheck(check);
          }
        }

        // ── ALL DONE celebration — the reward moment ──
        if (isNowDone) {
          const total = manualTasks.length;
          const doneCount = manualTasks.filter(t => doneIds.has(t.id)).length;
          const justCompletedAll = total > 0 && doneCount === total;

          if (justCompletedAll) {
            // Fire celebration from multiple points
            if (typeof fireEmberDrift === 'function') {
              const rect = el.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              // Extra particles burst
              for (let i = 0; i < 3; i++) {
                setTimeout(() => fireEmberDrift(cx + (Math.random() - 0.5) * 60, cy), i * 80);
              }
            }

            // Accent glow pulse on the whole screen
            _flashAccentGlow();

            // Enhanced haptic
            _haptic('success');
            setTimeout(() => _haptic('success'), 150);
          }
        }
      }
      updateStats();
      updateManualEmptyState(true);
      if (window._a11yAnnounce) {
        const name = el?.querySelector('.task-text')?.textContent?.replace(/\s+/g, ' ').trim() || 'Task';
        _a11yAnnounce(`${name} ${doneIds.has(taskId) ? 'completed' : 'marked incomplete'}.`);
      }
    }

    function addManual() {
      const input = $.newTask;
      if (!input) return;
      let text = input.value.trim();
      if (!text) return;

      // Enforce max length
      if (text.length > MAX_TASK_LENGTH) {
        text = text.slice(0, MAX_TASK_LENGTH);
      }

      // Extract URL from text — keep in task.text for inline rendering,
      // but also store separately in task.url for copy, AI context, and filters.
      const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
      let url = null;
      if (urlMatch) {
        url = urlMatch[1];
        // If user pasted just a URL with no other text, use the domain as display text
        // and don't keep the raw URL in task.text (it would be the entire text)
        const textWithoutUrl = text.replace(urlMatch[1], '').trim();
        if (!textWithoutUrl) {
          try { text = new URL(url).hostname.replace(/^www\./, ''); }
          catch(e) { text = url; }
        }
        // Otherwise: leave URL in task.text — rendered inline at its position
      }

      const task = { id: 'manual_' + Date.now(), text };
      if (url) task.url = url;
      manualTasks.push(task);
      _saveManual();
      _setLastLocalChange();
      dropboxAutoSave();

      // Track reactive (mid-day) additions for emergent vs planned insight
      // Only track additions after the first hour of the day (≥8am) to exclude morning planning
      const addHour = new Date().getHours();
      if (appMemory?.patterns) {
        appMemory.patterns.tasksAddedToday = (appMemory.patterns.tasksAddedToday || 0) + 1;
        if (addHour >= 8) {
          if (!appMemory.patterns.lateAdditions) appMemory.patterns.lateAdditions = [];
          appMemory.patterns.lateAdditions.push({ h: addHour, date: _localISO() });
          if (appMemory.patterns.lateAdditions.length > 50) {
            appMemory.patterns.lateAdditions = appMemory.patterns.lateAdditions.slice(-50);
          }
        }
        _saveMemory();
      }
      input.value = '';
      input.focus();
      toggleClearBtn();

      // Dismiss any existing AI suggestion
      _aiDismissSuggestion();

      // Insert new element directly — no full re-render
      const list  = $.manualList;
      const empty = $.manualEmpty;
      const div   = document.createElement('div');
      div.innerHTML = taskHTML(task, 'manual');
      const el = div.firstElementChild;
      el.classList.add('task-new');
      el.addEventListener('animationend', () => el.classList.remove('task-new'), { once: true });
      list.appendChild(el);
      const tagEl = el.querySelector('.task-tag');
      _queueTagArrivalShimmer(tagEl);
      // Desktop: wire hover shimmer for new task (mobile gets add-shimmer above, skip to avoid conflict).
      if (window.matchMedia('(hover: hover)').matches) _wireManualTagShimmer(el);
      if (empty) empty.style.display = 'none';

      $.manualCount.textContent = manualTasks.length;
      updateStats();
      if (window._a11yAnnounce) _a11yAnnounce(`${task.text} added.`);

      // AI post-add analysis (async, non-blocking)
      _aiAnalyzeTask(task.id, task.text);
      if (window._gmailEnrichTask) _gmailEnrichTask(task.id, task.text);
      if (window._agentEnrichTask) _agentEnrichTask(task.id, task.text);
    }

    // Clean-slate echo (Roadmap #2) — the calm states re-surface the morning's poem,
    // the same one the splash coda showed. Falls back to the plain lines if the corpus
    // is missing.
    function _poemEchoHTML() {
      const poem = (typeof _poemOfTheDay === 'function') ? _poemOfTheDay() : null;
      if (!poem) return null;
      return '<div class="empty-poem">' + _poemHTML(poem.text) + '</div>'
        + '<div class="poem-author">' + esc(poem.author) + '</div>';
    }

    function updateManualEmptyState(animate) {
      const empty = $.manualEmpty || document.getElementById('manualEmpty');
      if (!empty) return;

      const total = manualTasks.length;
      if (total === 0) {
        // First-run (v2.34.0): a blank slate on day one isn't a clean slate — the
        // poem echo rewards an emptied list, but a never-used list needs a pointer
        // at the one action that matters. Gone forever after the first completion
        // (Dropbox restore brings totalTasksCompleted with it, so returning users
        // get the echo once sync lands).
        const neverUsed = typeof appMemory !== 'undefined' && appMemory && !appMemory.totalTasksCompleted;
        if (neverUsed) {
          empty.textContent = 'What matters today? Start below.';
          empty.style.display = 'block';
          return;
        }
        const echo = _poemEchoHTML();
        if (echo) empty.innerHTML = echo;
        else empty.textContent = 'Nothing added yet';
        empty.style.display = 'block';
        return;
      }

      const doneCount = manualTasks.filter(t => doneIds.has(t.id)).length;
      const allDone   = doneCount === total;

      if (allDone) {
        const echo = _poemEchoHTML();
        empty.innerHTML = echo
          ? '<span class="done-star echo-star">✦</span>' + echo
          : '<span class="done-star">✦</span> All done';
        _breathe(empty.querySelector('.done-star'),
          [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0.6, transform: 'scale(0.92)' }, { opacity: 1, transform: 'scale(1)' }], 2400);
        if (animate) {
          empty.style.opacity = '0';
          empty.style.display = 'block';
          requestAnimationFrame(() => {
            empty.classList.add('fading-in');
            empty.style.opacity = '';
            empty.addEventListener('animationend', () => empty.classList.remove('fading-in'), { once: true });
          });
        } else {
          empty.style.display = 'block';
        }
      } else {
        empty.style.display = 'none';
      }
    }

    function _clearAllDone() {
      const done = manualTasks.filter(t => doneIds.has(t.id));
      if (done.length === 0) return;
      done.forEach(t => {
        _addDeletedId(t.id);
        const el = document.querySelector('.task[data-taskid="' + CSS.escape(t.id) + '"]');
        if (el) { el.classList.add('removing'); setTimeout(() => el.remove(), 180); }
      });
      manualTasks = manualTasks.filter(t => !doneIds.has(t.id));
      done.forEach(t => doneIds.delete(t.id));
      _saveManual();
      _saveDone();
      _setLastLocalChange();
      dropboxAutoSave();
      $.manualCount.textContent = manualTasks.length;
      updateManualEmptyState(true);
      updateStats();
    }

    function toggleClearBtn() {
      const input = document.getElementById('newTask');
      const btn   = document.getElementById('clearTaskBtn');
      if (btn) btn.style.display = input.value.length > 0 ? 'block' : 'none';
    }

    function clearTaskInput() {
      const input = document.getElementById('newTask');
      input.value = '';
      input.focus();
      toggleClearBtn();
    }

    function _editFromToast() {
      const text = _pendingDeleteText;
      _hideUndoToast();
      if (!text) return;
      const input = document.getElementById('newTask');
      if (input) { input.value = text; input.focus(); }
    }

    function _recordDeleteReason(reason, btn) {
      if (_pendingDeleteText) {
        _memoryOnTaskLetgo(_pendingDeleteText, reason);
        _pendingDeleteText = '';
      }
      const row = document.getElementById('undoReasonRow');
      if (row) {
        row.querySelectorAll('button').forEach(b => { b.disabled = true; b.style.opacity = '0.3'; });
        if (btn) { btn.style.opacity = '1'; btn.style.background = 'var(--accent-dim)'; btn.style.borderColor = 'var(--accent)'; btn.style.color = 'var(--accent)'; }
      }
      clearTimeout(_undoTimeout);
      _undoTimeout = setTimeout(_hideUndoToast, 800);
    }

    function _showUndoToast(text, stackSize, type = 'task') {
      const toast = document.getElementById('undoToast');
      const msg = document.getElementById('undoMsg');
      if (!toast || !msg) return;
      _lastUndoType = type;
      const displayText = text.length > 25 ? text.slice(0, 25) + '…' : text;
      const countText = stackSize > 1 ? ` (+${stackSize - 1} more)` : '';
      msg.textContent = type === 'habit'
        ? `"${displayText}" archived${countText}`
        : `"${displayText}" removed${countText}`;
      const reasonRow = document.getElementById('undoReasonRow');
      if (type === 'task' && reasonRow) {
        _pendingDeleteText = text;
        const _reasons = [
          ['not_relevant', 'not relevant'], ['no_energy', 'no energy'],
          ['lost_interest', 'lost interest'], ['replaced', 'replaced'],
        ];
        reasonRow.innerHTML = _reasons.map(([k, l]) =>
          `<button class="triage-reason-btn" onclick="_recordDeleteReason('${k}',this)">${l}</button>`
        ).join('');
        reasonRow.style.display = 'flex';
        reasonRow.style.opacity = '1';
      } else if (reasonRow) {
        reasonRow.style.display = 'none';
        reasonRow.innerHTML = '';
        _pendingDeleteText = '';
      }
      const editBtn = document.getElementById('undoEditBtn');
      if (editBtn) editBtn.hidden = (type !== 'task');
      toast.classList.add('show');
      toast.hidden = false;
      toast.setAttribute('aria-hidden', 'false');
      clearTimeout(_undoTimeout);
      _undoTimeoutRemaining = 5000;
      _undoTimeoutStart = Date.now();
      _undoTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toast.hidden = true;
        toast.setAttribute('aria-hidden', 'true');
        _deletedStack = [];
        _archivedHabitStack = [];
        if (_pendingDeleteText && typeof _memoryOnTaskLetgo === 'function') _memoryOnTaskLetgo(_pendingDeleteText, '');
        _pendingDeleteText = '';
      }, 5000);

      if (!toast._hoverWired) {
        toast._hoverWired = true;
        toast.addEventListener('mouseenter', () => {
          if (!_undoTimeout) return;
          clearTimeout(_undoTimeout);
          _undoTimeout = null;
          _undoTimeoutRemaining -= (Date.now() - _undoTimeoutStart);
        });
        toast.addEventListener('mouseleave', () => {
          if (!toast.classList.contains('show')) return;
          _undoTimeoutStart = Date.now();
          _undoTimeout = setTimeout(() => {
            toast.classList.remove('show');
            toast.hidden = true;
            toast.setAttribute('aria-hidden', 'true');
            _deletedStack = [];
            _archivedHabitStack = [];
            if (_pendingDeleteText && typeof _memoryOnTaskLetgo === 'function') _memoryOnTaskLetgo(_pendingDeleteText, '');
            _pendingDeleteText = '';
          }, Math.max(_undoTimeoutRemaining, 600));
        });
      }
    }

    function _hideUndoToast() {
      const toast = document.getElementById('undoToast');
      if (toast) {
        toast.classList.remove('show');
        toast.hidden = true;
        toast.setAttribute('aria-hidden', 'true');
      }
      clearTimeout(_undoTimeout);
      if (_pendingDeleteText && typeof _memoryOnTaskLetgo === 'function') _memoryOnTaskLetgo(_pendingDeleteText, '');
      _pendingDeleteText = '';
      const reasonRow = document.getElementById('undoReasonRow');
      if (reasonRow) { reasonRow.style.display = 'none'; reasonRow.innerHTML = ''; }
    }

    function _undoDelete() {
      if (_deletedStack.length === 0) return;
      _pendingDeleteText = '';
      const task = _deletedStack.pop();

      // Remove from deleted IDs
      const deletedIds = _getDeletedIds().filter(d => d.id !== task.id);
      localStorage.setItem('today_deleted_ids', JSON.stringify(deletedIds));

      // Re-add task
      const pos = (task._idx != null && task._idx <= manualTasks.length) ? task._idx : manualTasks.length;
      manualTasks.splice(pos, 0, task);
      if (task.wasDone) doneIds.add(task.id);

      _saveManual();
      _saveDone();
      _setLastLocalChange();
      dropboxAutoSave();

      renderManual();
      updateStats();
      _haptic('success');
      if (window._a11yAnnounce) _a11yAnnounce(`${task.text || 'Task'} restored.`);

      // Update toast or hide if stack is empty
      if (_deletedStack.length > 0) {
        const lastTask = _deletedStack[_deletedStack.length - 1];
        _showUndoToast(lastTask.text || 'Task', _deletedStack.length);
      } else {
        _hideUndoToast();
      }
    }

    function _undoLast() {
      if (_lastUndoType === 'habit') _undoArchiveHabit();
      else _undoDelete();
    }

    function _archiveHabitUndo(h) {
      _archivedHabitStack.push({ ...h });
      if (_archivedHabitStack.length > 10) _archivedHabitStack.shift();
      _showUndoToast(h.name || 'Habit', _archivedHabitStack.length, 'habit');
    }

    function _undoArchiveHabit() {
      if (_archivedHabitStack.length === 0) return;
      const snapshot = _archivedHabitStack.pop();
      const habit = habitsList.find(h => h.id === snapshot.id);
      if (habit) {
        habit.archived = false;
        _saveHabits();
        renderHabits();
        if (habitEditMode) _enterHabitEditMode();
        _haptic('success');
      }
      if (_archivedHabitStack.length > 0) {
        const last = _archivedHabitStack[_archivedHabitStack.length - 1];
        _showUndoToast(last.name || 'Habit', _archivedHabitStack.length, 'habit');
      } else {
        _hideUndoToast();
      }
    }

    function deleteManual(taskId) {
      // Store task for undo before removing
      const idx  = manualTasks.findIndex(t => t.id === taskId);
      const task = idx !== -1 ? manualTasks[idx] : null;
      if (task) {
        _deletedStack.push({ ...task, wasDone: doneIds.has(taskId), _idx: idx });
        // Keep stack reasonable size (max 10)
        if (_deletedStack.length > 10) _deletedStack.shift();
      }

      _addDeletedId(taskId); // track deletion with timestamp for union merge
      const el = document.querySelector('.task[data-taskid="' + CSS.escape(taskId) + '"]');
      if (!el) return;

      el.classList.add('removing');
      setTimeout(() => {
        el.remove();
        manualTasks = manualTasks.filter(t => t.id !== taskId);
        doneIds.delete(taskId);
        _saveManual();
        _saveDone();
        _setLastLocalChange();
        dropboxAutoSave();
        // Animate in if showing empty state for first time
        const empty = $.manualEmpty;
        if (empty && manualTasks.length === 0) {
          empty.style.opacity = '0';
          empty.style.display = 'block';
          requestAnimationFrame(() => {
            empty.classList.add('fading-in');
            empty.style.opacity = '';
            empty.addEventListener('animationend', () => empty.classList.remove('fading-in'), { once: true });
          });
        } else {
          updateManualEmptyState();
        }
        $.manualCount.textContent = manualTasks.length;
        updateStats();

        // Show undo toast
        if (task) {
          _showUndoToast(task.text || 'Task', _deletedStack.length);
          if (window._a11yAnnounce) _a11yAnnounce(`${task.text || 'Task'} removed. Undo available.`);
        }
      }, 180);
    }

    function drawFavicon(pct, isEmpty) {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;

      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, size, size);

      // Ring track is always visible; the fill reflects aggregate completion.
      const ringR = size * 0.38;
      const lineWidth = size * 0.10;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = COLOR_BORDER;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      if (!isEmpty && pct > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(pct, 1));
        ctx.strokeStyle = COLOR_ACCENT;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.fillStyle = COLOR_ACCENT;
      ctx.font = `${size * 0.48}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦', cx, cy + 2);

      return canvas.toDataURL('image/png');
    }

    function updateStats() {
      const all      = [...trelloTasks, ...manualTasks];
      const pastDone = pastTasks.filter(t => doneIds.has(t.id)).length;
      const total    = all.length + pastDone;
      const done     = all.filter(t => doneIds.has(t.id)).length + pastDone;
      const left     = total - done;
      const pct      = total > 0 ? done / total : 0;
      const s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      s('statTotal', total);
      s('statDone',  done);
      const fill = document.getElementById('progressFill');
      if (fill) fill.style.transform = 'scaleX(' + pct + ')';
      const progress = document.getElementById('progressTrack');
      if (progress) {
        progress.setAttribute('aria-valuemax', String(total));
        progress.setAttribute('aria-valuenow', String(done));
        progress.setAttribute('aria-valuetext', `${done} of ${total} tasks complete`);
      }

      updateFavicon(total > 0 ? done / total : 0, total === 0);

      // Update tab title
      if (left === 0 && total > 0) document.title = '✓ TODAY';
      else document.title = `(${left})TODAY`;

      // Dropbox saves are triggered directly from user actions (toggleDone, addManual, deleteManual)
      // not from updateStats — avoids spurious writes on every render
    }

    function updateFavicon(pct, isEmpty) {
      const key = isEmpty + ':' + Math.round(pct * 20); // only redraw if visually changed
      if (key === _lastFaviconKey) return;
      _lastFaviconKey = key;
      const dataURL = drawFavicon(pct, isEmpty);
      const link = document.getElementById('favicon');
      if (link) link.href = dataURL;
    }

    _bindTaskActionDelegation();

    // ── Exports ──
    window.updateManualEmptyState = updateManualEmptyState;
    window._archiveHabitUndo = _archiveHabitUndo;
    window.addManual = addManual;
    window.deleteManual = deleteManual;
    window.toggleDone = toggleDone;
    window.toggleClearBtn = toggleClearBtn;
    window.clearTaskInput = clearTaskInput;
    window._undoLast = _undoLast;
    window._undoDelete = _undoDelete;
    window._recordDeleteReason = _recordDeleteReason;
    window._clearAllDone = _clearAllDone;
    window.updateStats = updateStats;
    window._applyDoneStyles = _applyDoneStyles;
    window._editFromToast = _editFromToast;
  };
}());
