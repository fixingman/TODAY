// TODAY — sound + haptics (Roadmap #3 module extraction)
//
// Self-contained: browser APIs only (AudioContext, navigator.vibrate, the iOS
// switch-element haptic trick) — zero app-state or app-function coupling. Loaded
// as a classic <script> BEFORE the main inline script; its globals (play* sounds,
// _haptic, _primeAudio) are visible everywhere via the shared lexical environment.
// MUST load inside <body>: the haptic IIFE appends its switch element to
// document.body at parse time.
//
// What stays in index.html: nothing visual — _flashAccentGlow moved to assets/celebration.js.

// ─── Sound design language ────────────────────────────────────────────────────
// All sine wave. Family of 5 sounds, each a gesture:
//   start      — snappy rising chirp. Intention. 520→680 Hz, 150ms.
//   resume     — ascending chirp, start's quieter sibling. 500→600 Hz, 120ms.
//   complete   — warm two-step fall. Task done. 600→480→380 Hz, 240ms.
//   habitDone  — heavier three-step fall. Habit done. 520→400→300 Hz, 320ms.
//   chime      — low organic growl + wobble. Session end. Two osc, ~1.4s.

// Persistent AudioContext — created once on first user gesture, kept alive.
// A context created during a user interaction survives background tabs.
// Creating a fresh context when the tab is hidden always fails.
let _sharedAudioCtx = null;

function _getAudioCtx() {
  try {
    if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
      _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _sharedAudioCtx;
  } catch(e) { return null; }
}

// ─── Haptic feedback ─────────────────────────────────────────────────────────
// Unified haptic helper. Works on:
//   Android Chrome  — navigator.vibrate() with differentiated patterns
//   iOS Safari 17.4+ — <input type=checkbox switch> trick (system haptic tap)
//   Desktop / unsupported — silent no-op, zero cost
//
// Presets and their Android vibration patterns (iOS always fires one system tap):
//   success   — [40, 60, 80]   double rising pulse — task/habit check, session end
//   warning   — [30, 40, 30]   sharp double        — delete
//   heavy     — [65]           single firm press   — long-press drag activate
//   selection — [12]           tiny tick           — drag row snaps to new slot
//   medium    — [40]           standard tap        — fallback
//
// Rules (from web-haptics design guide):
//   - Supplement visuals, never replace them. UI works fully without haptics.
//   - Fire at the exact instant the visual change occurs.
//   - Don't overuse — reserve for meaningful moments.
(function() {
  const PATTERNS = {
    success:   [40, 60, 80],
    warning:   [30, 40, 30],
    heavy:     [65],
    selection: [12],
    medium:    [40],
  };

  // iOS: Use <input type=checkbox switch> trick — WebKit fires a system haptic when
  // the switch toggles. MUST be called synchronously within a user gesture handler.
  // _haptic() is always called synchronously from click/touch handlers so this works.
  // The element must be "visible" to the browser (not display:none) — opacity:0 is fine.
  //
  // Android: navigator.vibrate() with differentiated patterns.
  // Desktop: silent no-op.
  const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const _hasVibrate = !_isIOS && typeof navigator.vibrate === 'function';

  // Create switch element eagerly — avoids DOM append cost on the first haptic call,
  // which would otherwise delay svg.animate() on iOS cold start. (BUG-030)
  const _sw = document.createElement('input');
  _sw.type = 'checkbox';
  _sw.setAttribute('switch', '');
  _sw.setAttribute('aria-hidden', 'true');
  _sw.setAttribute('tabindex', '-1');
  // Must not be display:none/visibility:hidden — needs to exist in the render tree
  _sw.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;' +
    'opacity:0;pointer-events:none;margin:0;padding:0;border:none;outline:none;' +
    '-webkit-appearance:none;appearance:none;';
  document.body.appendChild(_sw);

  function _iosHaptic() {
    _sw.click(); // toggle fires system haptic — works because we're in user gesture stack
  }

  window._haptic = function(preset) {
    if (_isIOS) {
      _iosHaptic();
    } else if (_hasVibrate) {
      navigator.vibrate(PATTERNS[preset] || PATTERNS.medium);
    }
  };
})();

// Call this on any user gesture to warm up the context while the tab is active.
function _primeAudio() {
  const ctx = _getAudioCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(function(){});
}

// Pre-warm AudioContext on the very first user interaction with the page —
// before the task list is visible. This avoids a 200-600ms main-thread block
// on mobile when the user first taps a task (cold AudioContext creation).
// We use pointerdown on the splash screen since that's the first touch.
(function _preWarmAudio() {
  function _warm() {
    _getAudioCtx(); // creates context
    _primeAudio();  // calls resume() — hardware init happens now, not on first task tap
    document.removeEventListener('pointerdown', _warm);
    document.removeEventListener('touchstart', _warm);
  }
  document.addEventListener('pointerdown', _warm, { once: true, passive: true });
  document.addEventListener('touchstart', _warm, { once: true, passive: true });
})();

function _withCtx(fn) {
  try {
    const ctx = _getAudioCtx();
    if (!ctx) return;
    // Always resume if suspended — but don't wait for the promise.
    // Playing immediately after resume() in a user gesture works because
    // the browser queues the audio and plays it once resumed (same frame).
    // Waiting for .then() caused noticeable delay after long focus sessions.
    if (ctx.state === 'suspended') ctx.resume().catch(function(){});
    fn(ctx);
  } catch(e) {}
}

// Start — snappy ascending chirp. Plays on fresh session start and reset.
function playStartSound() {
  _withCtx(function(ctx) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.06);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.20, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t); osc.stop(t + 0.15);
  });
}

// Resume — gentle rising nudge. Softer sibling of start.
function playResumeSound() {
  _withCtx(function(ctx) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    const t = ctx.currentTime;
    // Same ascending shape as start (520→680) but shorter rise, lower ceiling.
    // Clearly in the "action" family — not closure territory.
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    osc.start(t); osc.stop(t + 0.12);
  });
}

// Complete — warm descending two-step. Task done.
function playCompleteSound() {
  _withCtx(function(ctx) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.09);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.20);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.10);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.start(t); osc.stop(t + 0.24);
  });
}

// Habit done — heavier sibling of complete. Same descending gesture, more body:
// starts lower (520 Hz vs 600), three steps instead of two (520→400→300 Hz),
// slightly longer tail (320ms vs 240ms), marginally fuller gain (0.16 vs 0.13).
// The extra step and lower floor give it more gravity — a habit earns it.
function playHabitDoneSound() {
  _withCtx(function(ctx) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.10);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.26);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.26, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.13, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    osc.start(t); osc.stop(t + 0.32);
  });
}

// Chime — same sine family as start/resume/complete. Three notes ascending
// then one settling back — done, done, done, rest. Belongs to the same sound package.
function playChime() {
  _withCtx(function(ctx) {
    function note(freq, startT, vol, dur) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, startT);
      g.gain.setValueAtTime(0.001, startT);
      g.gain.exponentialRampToValueAtTime(vol, startT + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, startT + dur);
      o.start(startT); o.stop(startT + dur + 0.05);
    }
    const t = ctx.currentTime;
    note(520, t,        0.17, 0.18); // same as start — familiar
    note(600, t + 0.14, 0.15, 0.18); // step up
    note(680, t + 0.28, 0.15, 0.22); // peak — same ceiling as start
    note(520, t + 0.50, 0.12, 0.55); // settle back down, long fade — done
  });
}
