// TODAY — per-character bounce animation on the task input.
// Technique: real <input> stays as-is for a11y/IME/autofill; its text color
// is set to transparent (caret stays visible). An absolutely-positioned mirror
// <div> overlays it with one <span> per grapheme. New graphemes animate via
// WAAPI on transform+opacity — compositor-only, zero layout/paint cost.
// Skips entirely when prefers-reduced-motion is set.
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const input  = document.getElementById('newTask');
  const mirror = document.getElementById('newTaskMirror');
  if (!input || !mirror) return;

  // Inner wrapper: spans go here so we can translateX it to track input.scrollLeft.
  // The mirror itself stays as the overflow:hidden clipping frame.
  const mirrorContent = document.createElement('div');
  mirrorContent.id = 'newTaskMirrorContent';
  mirror.appendChild(mirrorContent);

  // Activate: hide real text so only mirror chars are visible.
  // The browser caret is preserved via caret-color in CSS.
  input.classList.add('has-mirror');

  let _prev      = '';
  let _composing = false;

  // JavaScript string indexes address UTF-16 code units, not visible
  // characters. Splitting on those indexes separates emoji surrogate pairs
  // (and can also separate skin tones, flags, or ZWJ sequences) across spans,
  // which prevents the browser from shaping them as one glyph. Segment the
  // mirror and its insertion math by grapheme cluster instead.
  const _segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

  function _graphemes(value) {
    const text = String(value || '');
    return _segmenter
      ? Array.from(_segmenter.segment(text), part => part.segment)
      : Array.from(text); // code-point fallback keeps surrogate pairs intact
  }

  // Canvas used to measure text width on iOS Safari, which always reports
  // input.scrollLeft = 0 regardless of actual scroll position.
  const _canvas = document.createElement('canvas');
  const _ctx    = _canvas.getContext('2d');

  // Translate mirrorContent to match the input's horizontal scroll offset so
  // the visible mirror window stays aligned with the caret position.
  // Desktop: native scrollLeft (fast). iOS: canvas measurement fallback.
  function _syncScroll() {
    let offset = input.scrollLeft;
    if (!offset) {
      _ctx.font  = getComputedStyle(input).font;
      const cursor   = input.selectionEnd ?? input.value.length;
      const textW    = _ctx.measureText(input.value.substring(0, cursor)).width;
      const visibleW = input.clientWidth - 54; // 14px left-pad + 40px right-pad
      offset = Math.max(0, textW - visibleW);
    }
    mirrorContent.style.transform = 'translateX(-' + offset + 'px)';
  }

  // ── Core sync ─────────────────────────────────────────────────────────────
  // Rebuilds the mirror to match val. When skipAnimation is false and chars
  // were added (not deleted/replaced), newly inserted chars get the bounce class.
  function _sync(val, skipAnimation) {
    const prevGraphemes = _graphemes(_prev);
    const nextGraphemes = _graphemes(val);
    const addedCount = nextGraphemes.length - prevGraphemes.length;
    const isTyping   = addedCount > 0 && !skipAnimation;

    let animateFrom = Infinity;
    let animateTo   = Infinity;

    if (isTyping) {
      // Find the first position where the strings diverge — that's the
      // insertion point. Only animate the newly inserted characters.
      animateFrom = prevGraphemes.length;
      for (let i = 0; i < prevGraphemes.length; i++) {
        if (nextGraphemes[i] !== prevGraphemes[i]) { animateFrom = i; break; }
      }
      animateTo = animateFrom + addedCount;
    }

    // Rebuild the entire mirror (cheap — max 500 spans per input maxlength).
    mirrorContent.innerHTML = '';
    for (let i = 0; i < nextGraphemes.length; i++) {
      const s = document.createElement('span');
      // Spaces must be non-breaking so inline-block spans don't collapse them.
      s.textContent = nextGraphemes[i] === ' ' ? ' ' : nextGraphemes[i];
      if (i >= animateFrom && i < animateTo) s.className = 'mirror-char-new';
      mirrorContent.appendChild(s);
    }

    _prev = val;
    // Sync immediately then defer one frame — browsers may update scrollLeft
    // asynchronously after the value change settles.
    _syncScroll();
    requestAnimationFrame(_syncScroll);
  }

  // Keep mirror tracking when the user scrolls inside the input (arrow keys,
  // click-to-reposition, home/end) without changing the value.
  input.addEventListener('scroll', _syncScroll);

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
    const addedCount = _graphemes(input.value).length - _graphemes(_prev).length;
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
    else _syncScroll();
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
