// TODAY — per-character bounce animation on the task input.
// Technique: real <input> stays as-is for a11y/IME/autofill; its text color
// is set to transparent (caret stays visible). An absolutely-positioned mirror
// <div> overlays it with one <span> per character. New characters animate via
// WAAPI on transform+opacity — compositor-only, zero layout/paint cost.
// Skips entirely when prefers-reduced-motion is set.
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const input  = document.getElementById('newTask');
  const mirror = document.getElementById('newTaskMirror');
  if (!input || !mirror) return;

  // Activate: hide real text so only mirror chars are visible.
  // The browser caret is preserved via caret-color in CSS.
  input.classList.add('has-mirror');

  let _prev      = '';
  let _composing = false;

  // ── Core sync ─────────────────────────────────────────────────────────────
  // Rebuilds the mirror to match val. When skipAnimation is false and chars
  // were added (not deleted/replaced), newly inserted chars get the bounce class.
  function _sync(val, skipAnimation) {
    const addedCount = val.length - _prev.length;
    const isTyping   = addedCount > 0 && !skipAnimation;

    let animateFrom = Infinity;
    let animateTo   = Infinity;

    if (isTyping) {
      // Find the first position where the strings diverge — that's the
      // insertion point. Only animate the newly inserted characters.
      animateFrom = _prev.length;
      for (let i = 0; i < _prev.length; i++) {
        if (val[i] !== _prev[i]) { animateFrom = i; break; }
      }
      animateTo = animateFrom + addedCount;
    }

    // Rebuild the entire mirror (cheap — max 500 spans per input maxlength).
    mirror.innerHTML = '';
    for (let i = 0; i < val.length; i++) {
      const s = document.createElement('span');
      // Spaces must be non-breaking so inline-block spans don't collapse them.
      s.textContent = val[i] === ' ' ? ' ' : val[i];
      if (i >= animateFrom && i < animateTo) s.className = 'mirror-char-new';
      mirror.appendChild(s);
    }

    _prev = val;
  }

  // ── IME (Japanese / Chinese / Korean / etc.) ──────────────────────────────
  // During composition the interim text must not trigger per-char animation.
  // The final composed string arrives in compositionend and is synced as a
  // bulk insert (no bounce — the word appeared as a unit, not char by char).
  input.addEventListener('compositionstart', () => { _composing = true; });
  input.addEventListener('compositionend',   () => {
    _composing = false;
    _sync(input.value, true); // bulk, no animation
  });

  // ── Main input event ──────────────────────────────────────────────────────
  input.addEventListener('input', (e) => {
    if (_composing) return;

    // Paste, autofill, drop, and browser-replacement all inject more than one
    // character in a single event. Animating a flood of chars looks wrong.
    // Use inputType when available; fall back to delta-count for browsers
    // (e.g. iOS Safari autofill) that omit inputType on programmatic fills.
    const addedCount = input.value.length - _prev.length;
    const isBulk =
      addedCount > 1                                    ||
      e.inputType === 'insertFromPaste'                 ||
      e.inputType === 'insertReplacementText'           ||
      e.inputType === 'insertFromDrop'                  ||
      e.inputType === 'insertFromPasteAsQuotation';

    _sync(input.value, isBulk);
  });

  // ── Focus sync ────────────────────────────────────────────────────────────
  // Covers the edge case where input.value was changed while the field was
  // not focused (e.g. voice note placeholder text set/restored by meeting.js).
  input.addEventListener('focus', () => {
    if (input.value !== _prev) _sync(input.value, true);
  });

  // ── Programmatic value assignments ────────────────────────────────────────
  // addManual(), clearTaskInput(), and the AI panel all do `input.value = ''`
  // without triggering the 'input' event. Intercept at the instance level so
  // no other file needs to know about the mirror.
  const _proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(input, 'value', {
    get: () => _proto.get.call(input),
    set: (v) => {
      _proto.set.call(input, v);
      _sync(String(v), true); // programmatic change → no animation
    },
    configurable: true,
  });
}());
