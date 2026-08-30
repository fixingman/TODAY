// TODAY — delegated desktop and touch reorder controllers.
// Inert until index.html calls window._startDrag() after app state and persistence
// helpers are defined. Classic script by design: no build step, SW-precached.
(function() {
  'use strict';

  let started = false;

  window._startDrag = function() {
    if (started) return;
    started = true;

    function _saveReorderedList(listId, preserveDesktopHabitAutosave) {
      const sel = listId === 'habitList' ? '.habit[data-habit-id]' : '.task[data-taskid]';
      const list = document.getElementById(listId);
      if (!list) return;
      const rows = [...list.querySelectorAll(sel)];
      if (listId === 'manualList') {
        const ids = rows.map(el => el.dataset.taskid);
        manualTasks.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        _saveManual();
        localStorage.setItem('today_manual_order_at', new Date().toISOString());
        _setLastLocalChange();
        dropboxAutoSave();
      } else if (listId === 'trelloList') {
        const ids = rows.map(el => el.dataset.taskid);
        trelloTasks.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        localStorage.setItem('today_trello_order', JSON.stringify(ids));
        localStorage.setItem('today_trello_order_at', new Date().toISOString());
        try {
          const cached = safeJSON('today_trello_cache', null);
          if (cached) { cached.tasks = trelloTasks; localStorage.setItem('today_trello_cache', JSON.stringify(cached)); }
        } catch(e) {}
        _setLastLocalChange();
        dropboxAutoSave();
      } else if (listId === 'habitList') {
        const ids = rows.map(el => el.dataset.habitId);
        habitsList.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        _saveHabits();
        if (preserveDesktopHabitAutosave) dropboxAutoSave();
      }
      if (window._aiReanchorSuggestion) window._aiReanchorSuggestion();
    }

    window._a11yMoveRow = function(row, delta) {
      const list = row?.parentElement;
      if (!list || !['manualList', 'trelloList', 'habitList'].includes(list.id)) {
        return { moved: false, message: 'This item cannot be reordered.' };
      }
      if (row.classList.contains('done') || row.classList.contains('editing')) {
        return { moved: false, message: 'This item cannot be reordered in its current state.' };
      }
      const selector = list.id === 'habitList' ? '.habit[data-habit-id]' : '.task[data-taskid]';
      const rows = [...list.querySelectorAll(selector)];
      const from = rows.indexOf(row);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= rows.length) {
        return { moved: false, message: delta < 0 ? 'Already first in the list.' : 'Already last in the list.' };
      }
      if (delta < 0) list.insertBefore(row, rows[to]);
      else list.insertBefore(rows[to], row);
      _saveReorderedList(list.id);
      _haptic('selection');
      return { moved: true, position: to + 1, total: rows.length };
    };

    // ── Drag-to-reorder — manual tasks, trello tasks, habits ────────────────
    (function() {
      let dragSrc    = null;
      let dragListId = null; // which list the drag started in

      // Identify which draggable list a row belongs to, and return its config
      function _rowConfig(el) {
        if (!el) return null;
        const row = el.closest('#manualList .task[data-taskid]');
        if (row) return { row, listId: 'manualList', attr: 'taskid' };
        const trow = el.closest('#trelloList .task[data-taskid]');
        if (trow) return { row: trow, listId: 'trelloList', attr: 'taskid' };
        const hrow = el.closest('#habitList .habit[data-habit-id]');
        if (hrow) return { row: hrow, listId: 'habitList', attr: 'habitId' };
        return null;
      }

      document.addEventListener('mousedown', function(e) {
        if (!(e.target instanceof Element)) return;
        const cfg = _rowConfig(e.target);
        if (!cfg) return;
        if (e.target.closest('.task-check') || e.target.closest('.task-delete') ||
            e.target.closest('.habit-check') || e.target.closest('.habit-edit-delete') ||
            e.target.closest('.habit-edit-input') ||
            e.target.tagName === 'A' || e.target.closest('button')) return;
        if (cfg.listId === 'manualList' && cfg.row.classList.contains('done')) return;
        if (cfg.listId === 'habitList' && cfg.row.classList.contains('editing')) return;

        cfg.row.setAttribute('draggable', 'true');
        cfg.row.style.userSelect = 'none';
        const cleanup = () => {
          setTimeout(() => {
            cfg.row.removeAttribute('draggable');
            cfg.row.style.userSelect = '';
          }, 0);
          document.removeEventListener('mouseup', cleanup);
        };
        document.addEventListener('mouseup', cleanup);
      });

      document.addEventListener('dragstart', function(e) {
        if (!(e.target instanceof Element)) return;
        const cfg = _rowConfig(e.target);
        if (!cfg || !cfg.row.getAttribute('draggable')) return;
        dragSrc    = cfg.row;
        dragListId = cfg.listId;
        cfg.row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cfg.listId + ':' + cfg.row.dataset[cfg.attr]);
      });

      document.addEventListener('dragend', function(e) {
        if (!(e.target instanceof Element)) return;
        const cfg = _rowConfig(e.target);
        if (cfg) {
          cfg.row.classList.remove('dragging');
          cfg.row.removeAttribute('draggable');
          cfg.row.style.userSelect = '';
        }
        document.querySelectorAll('.task.drag-over, .habit.drag-over').forEach(el => el.classList.remove('drag-over'));
        dragSrc = null; dragListId = null;
      });

      document.addEventListener('dragover', function(e) {
        if (!(e.target instanceof Element)) return;
        const cfg = _rowConfig(e.target);
        if (!cfg || cfg.row === dragSrc || cfg.listId !== dragListId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.task.drag-over, .habit.drag-over').forEach(el => el.classList.remove('drag-over'));
        cfg.row.classList.add('drag-over');
      });

      document.addEventListener('dragleave', function(e) {
        if (!(e.target instanceof Element)) return;
        const cfg = _rowConfig(e.target);
        if (cfg) cfg.row.classList.remove('drag-over');
      });

      document.addEventListener('drop', function(e) {
        if (!(e.target instanceof Element)) return;
        const cfg = _rowConfig(e.target);
        if (!cfg || !dragSrc || cfg.row === dragSrc || cfg.listId !== dragListId) return;
        e.preventDefault();
        cfg.row.classList.remove('drag-over');

        const list   = document.getElementById(cfg.listId);
        const sel    = cfg.listId === 'habitList' ? '.habit[data-habit-id]' : '.task[data-taskid]';
        const rows   = [...list.querySelectorAll(sel)];
        const srcIdx = rows.indexOf(dragSrc);
        const tgtIdx = rows.indexOf(cfg.row);
        if (srcIdx === -1 || tgtIdx === -1) return;

        if (srcIdx < tgtIdx) list.insertBefore(dragSrc, cfg.row.nextSibling);
        else                  list.insertBefore(dragSrc, cfg.row);
        _haptic('selection');

        _saveReorderedList(cfg.listId, cfg.listId === 'habitList');
      });
    })();

    // ── Touch drag-to-reorder (mobile long-press) ───────────────────────────
    (function() {
      const LONG_PRESS_MS = 380;
      let pressTimer = null, touchSrc = null, touchListId = null;
      let ghost = null, ghostOffX = 0, ghostOffY = 0;
      let lastOver = null;

      function _rowCfgTouch(el) {
        if (!el) return null;
        const row = el.closest('#manualList .task[data-taskid]');
        if (row) return { row, listId: 'manualList', sel: '.task[data-taskid]' };
        const trow = el.closest('#trelloList .task[data-taskid]');
        if (trow) return { row: trow, listId: 'trelloList', sel: '.task[data-taskid]' };
        const hrow = el.closest('#habitList .habit[data-habit-id]');
        if (hrow) return { row: hrow, listId: 'habitList', sel: '.habit[data-habit-id]' };
        return null;
      }

      function _cancelPress() {
        clearTimeout(pressTimer); pressTimer = null;
      }

      function _startGhost(row, touchX, touchY) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) sel.removeAllRanges();
        const rect = row.getBoundingClientRect();
        ghost = row.cloneNode(true);
        ghost.classList.add('touch-drag-ghost');
        ghost.style.width  = rect.width + 'px';
        ghost.style.padding = getComputedStyle(row).padding;
        ghostOffX = touchX - rect.left;
        ghostOffY = touchY - rect.top;
        ghost.style.left = '0px';
        ghost.style.top  = '0px';
        ghost.style.transform = `translate(${touchX - ghostOffX}px, ${touchY - ghostOffY}px) scale(1.03)`;
        document.body.appendChild(ghost);
        row.classList.add('dragging');
      }

      function _moveGhost(touchX, touchY) {
        if (!ghost) return;
        ghost.style.transform = `translate(${touchX - ghostOffX}px, ${touchY - ghostOffY}px) scale(1.03)`;
      }

      function _findRowAt(x, y, listId, sel) {
        if (ghost) ghost.style.display = 'none';
        const el = document.elementFromPoint(x, y);
        if (ghost) ghost.style.display = '';
        if (!el) return null;
        const list = document.getElementById(listId);
        if (!list) return null;
        const row = el.closest(listId === 'habitList' ? '.habit[data-habit-id]' : '.task[data-taskid]');
        if (!row || !list.contains(row) || row === touchSrc) return null;
        return row;
      }

      function _cleanup() {
        _cancelPress();
        if (ghost) { ghost.remove(); ghost = null; }
        if (touchSrc) { touchSrc.classList.remove('dragging'); }
        if (lastOver) { lastOver.classList.remove('drag-over'); lastOver = null; }
        touchSrc = null; touchListId = null;
      }

      document.addEventListener('touchstart', function(e) {
        if (!(e.target instanceof Element)) return;
        const cfg = _rowCfgTouch(e.target);
        if (!cfg) return;
        if (e.target.closest('.task-check') || e.target.closest('.task-delete') ||
            e.target.closest('.habit-check') || e.target.closest('.habit-edit-delete') ||
            e.target.closest('.habit-edit-input') ||
            e.target.tagName === 'A' || e.target.closest('button')) return;
        if (cfg.listId === 'habitList' && cfg.row.classList.contains('editing')) return;

        const t = e.touches[0];
        pressTimer = setTimeout(() => {
          _haptic('heavy');
          touchSrc    = cfg.row;
          touchListId = cfg.listId;
          _startGhost(cfg.row, t.clientX, t.clientY);
        }, LONG_PRESS_MS);
      }, { passive: true });

      document.addEventListener('touchmove', function(e) {
        if (!touchSrc) {
          _cancelPress();
          return;
        }
        e.preventDefault();
        const t  = e.touches[0];
        _moveGhost(t.clientX, t.clientY);

        const over = _findRowAt(t.clientX, t.clientY, touchListId,
          touchListId === 'habitList' ? '.habit[data-habit-id]' : '.task[data-taskid]');
        if (over !== lastOver) {
          if (lastOver) lastOver.classList.remove('drag-over');
          if (over)     over.classList.add('drag-over');
          lastOver = over;
        }
        if (over) {
          const list = document.getElementById(touchListId);
          const sel  = touchListId === 'habitList' ? '.habit[data-habit-id]' : '.task[data-taskid]';
          const rows = [...list.querySelectorAll(sel)];
          const si   = rows.indexOf(touchSrc);
          const ti   = rows.indexOf(over);
          if (si !== -1 && ti !== -1) {
            if (si < ti) list.insertBefore(touchSrc, over.nextSibling);
            else         list.insertBefore(touchSrc, over);
          }
        }
      }, { passive: false });

      document.addEventListener('touchend', function() {
        _cancelPress();
        if (!touchSrc) return;
        _haptic('selection');
        _saveReorderedList(touchListId);
        _cleanup();
      }, { passive: true });

      document.addEventListener('touchcancel', function() {
        _cancelPress();
        if (touchSrc) _cleanup();
      }, { passive: true });
    })();
  };
})();
