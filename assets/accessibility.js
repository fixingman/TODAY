// TODAY — shared accessibility helpers and keyboard interaction layer.
// Inert until the composition root calls window._startAccessibility().
(function() {
  'use strict';

  let started = false;
  let activeDialog = null;
  let dialogReturnFocus = null;
  let dialogEscape = null;
  const inerted = new Map();

  function _focusable(root) {
    if (!root) return [];
    return [...root.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
      'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )].filter(el => !el.hidden && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden');
  }

  function _setBackgroundInert(dialogRoot, on) {
    if (on) {
      for (const el of document.body.children) {
        if (el === dialogRoot || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.contains(dialogRoot)) continue;
        if (!inerted.has(el)) inerted.set(el, { inert: el.inert, ariaHidden: el.getAttribute('aria-hidden') });
        el.inert = true;
        el.setAttribute('aria-hidden', 'true');
      }
      return;
    }
    for (const [el, previous] of inerted) {
      el.inert = previous.inert;
      if (previous.ariaHidden === null) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', previous.ariaHidden);
    }
    inerted.clear();
  }

  function _a11yAnnounce(message, priority) {
    if (!message) return;
    const id = priority === 'assertive' ? 'a11yAssertive' : 'a11yPolite';
    const region = document.getElementById(id);
    if (!region) return;
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = String(message); });
  }

  function _a11ySetDisclosure(trigger, panel, expanded) {
    if (typeof trigger === 'string') trigger = document.getElementById(trigger);
    if (typeof panel === 'string') panel = document.getElementById(panel);
    const open = !!expanded;
    if (trigger) {
      trigger.setAttribute('aria-expanded', String(open));
      const label = trigger.getAttribute('aria-label') || '';
      if (/^(Open|Close) /.test(label)) trigger.setAttribute('aria-label', label.replace(/^(Open|Close)/, open ? 'Close' : 'Open'));
    }
    if (panel) {
      panel.hidden = !open;
      panel.setAttribute('aria-hidden', String(!open));
    }
  }

  function _a11yOpenDialog(root, options) {
    if (typeof root === 'string') root = document.getElementById(root);
    if (!root) return;
    const opts = options || {};
    if (activeDialog && activeDialog !== root) _a11yCloseDialog(activeDialog, { restoreFocus: false });
    activeDialog = root;
    dialogReturnFocus = opts.returnFocus || document.activeElement;
    dialogEscape = typeof opts.onEscape === 'function' ? opts.onEscape : null;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    _setBackgroundInert(root, opts.modal !== false);
    requestAnimationFrame(() => {
      const initial = opts.initialFocus || _focusable(root)[0];
      if (initial && typeof initial.focus === 'function') initial.focus();
    });
  }

  function _a11yCloseDialog(root, options) {
    if (typeof root === 'string') root = document.getElementById(root);
    const opts = options || {};
    if (!root) return;
    _setBackgroundInert(root, false);
    root.setAttribute('aria-hidden', 'true');
    const restore = opts.restoreFocus === false ? null : dialogReturnFocus;
    if (activeDialog === root) {
      activeDialog = null;
      dialogReturnFocus = null;
      dialogEscape = null;
    }
    if (opts.hide !== false) root.hidden = true;
    if (restore && document.contains(restore) && typeof restore.focus === 'function') restore.focus();
  }

  function _a11yOpenPopover(root, returnFocus) {
    if (typeof root === 'string') root = document.getElementById(root);
    if (!root) return;
    root._a11yReturnFocus = returnFocus || document.activeElement;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
  }

  function _a11yClosePopover(root) {
    if (typeof root === 'string') root = document.getElementById(root);
    if (!root) return;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    const restore = root._a11yReturnFocus;
    root._a11yReturnFocus = null;
    if (restore && document.contains(restore) && typeof restore.focus === 'function') restore.focus();
  }

  function _rowName(row) {
    return row.querySelector('.task-text,.habit-name')?.textContent?.replace(/\s+/g, ' ').trim() || 'Item';
  }

  function _rowKeyboard(e) {
    if (!(e.target instanceof Element)) return;
    const row = e.target.closest('#manualList .task[data-taskid],#trelloList .task[data-taskid],#habitList .habit[data-habit-id]');
    if (!row || e.target !== row) return;

    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      if (typeof window._a11yMoveRow !== 'function') return;
      const result = window._a11yMoveRow(row, e.key === 'ArrowUp' ? -1 : 1);
      if (result && result.moved) {
        row.focus();
        _a11yAnnounce(`${_rowName(row)} moved to position ${result.position} of ${result.total}.`);
      } else {
        _a11yAnnounce(result?.message || 'That item cannot move any further.');
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      row.click();
      return;
    }

    if (e.key === ' ') {
      e.preventDefault();
      const check = row.querySelector('.task-check,.habit-check');
      if (check) check.click();
    }
  }

  function _dialogKeyboard(e) {
    if (!activeDialog) return;
    if (e.key === 'Escape' && dialogEscape) {
      e.preventDefault();
      dialogEscape();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = _focusable(activeDialog);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function _desktopShortcuts(e) {
    if (e.metaKey || e.ctrlKey) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    if (e.shiftKey && e.key === ':') {
      e.preventDefault();
      const input = document.getElementById('newTask');
      if (input) input.focus();
    }
    if (e.shiftKey && e.key === 'D') {
      e.preventDefault();
      if (typeof window._clearAllDone === 'function') window._clearAllDone();
    }
  }

  window._startAccessibility = function() {
    if (started) return;
    started = true;
    document.addEventListener('keydown', _rowKeyboard);
    document.addEventListener('keydown', _dialogKeyboard);
    if (window.matchMedia('(hover: hover)').matches) {
      document.addEventListener('keydown', _desktopShortcuts);
    }

    _a11ySetDisclosure('habitsBtn', 'habitsPanel', false);
    _a11ySetDisclosure('trelloBtn', 'configPanel', false);
    _a11ySetDisclosure('infoBtn', 'infoPanel', false);
    _a11ySetDisclosure('todayLogo', 'memoryPanel', false);
  };

  window._a11yAnnounce = _a11yAnnounce;
  window._a11ySetDisclosure = _a11ySetDisclosure;
  window._a11yOpenDialog = _a11yOpenDialog;
  window._a11yCloseDialog = _a11yCloseDialog;
  window._a11yOpenPopover = _a11yOpenPopover;
  window._a11yClosePopover = _a11yClosePopover;
})();
