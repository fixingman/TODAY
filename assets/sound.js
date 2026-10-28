// TODAY — sound + haptics (Roadmap #3 module extraction)


// Prepare a silent sink first; attach the system default asynchronously when supported.
// Legacy browsers retain the original suspended-context preparation.
let _sharedAudioCtx = null, _audioReady = null, _audioLegacy = false, _audioTone = 0;

function _getAudioCtx() {
  try {
    if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
      const Audio = window.AudioContext || window.webkitAudioContext;
      const staged = !_audioLegacy && typeof Audio?.prototype.setSinkId === 'function';
      try { _sharedAudioCtx = new Audio(staged ? { sinkId:{ type:'none' } } : undefined); }
      catch (error) {
        if (!staged) throw error;
        _audioLegacy = true; _sharedAudioCtx = new Audio();
      }
      _audioReady = null;
      const ctx = _sharedAudioCtx;
      if (staged && ctx.sinkId?.type === 'none') {
        const fallback = () => {
          if (ctx !== _sharedAudioCtx || ctx.state === 'closed') return null;
          try { Promise.resolve(ctx.close()).catch(function(){}); } catch (_) {}
          _sharedAudioCtx = null; _audioLegacy = true;
          return _getAudioCtx();
        };
        try { _audioReady = Promise.resolve(ctx.setSinkId('')).then(() => {
          if (ctx === _sharedAudioCtx) _audioReady = null;
          return ctx;
        }, fallback); }
        catch (_) { _audioReady = Promise.resolve().then(fallback); }
      }
    }
    return _sharedAudioCtx;
  } catch(e) { return null; }
}

_getAudioCtx();

(function() {
  const PATTERNS = {
    success:   [40, 60, 80],
    warning:   [30, 40, 30],
    heavy:     [65],
    selection: [12],
    medium:    [40],
  };

  const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const _hasVibrate = !_isIOS && typeof navigator.vibrate === 'function';

  const _sw = document.createElement('input');
  _sw.type = 'checkbox';
  _sw.setAttribute('switch', '');
  _sw.setAttribute('aria-hidden', 'true');
  _sw.setAttribute('tabindex', '-1');
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

function _primeAudio() {
  _withCtx();
}

(function _preWarmAudio() {
  function _warm() {
    _primeAudio();
    document.removeEventListener('pointerdown', _warm);
    document.removeEventListener('touchstart', _warm);
  }
  document.addEventListener('pointerdown', _warm, { once: true, passive: true });
  document.addEventListener('touchstart', _warm, { once: true, passive: true });
})();

// Unlock in the gesture; retain only the latest pending cue for at most one second.
function _withCtx(fn) {
  try {
    const ctx = _getAudioCtx();
    if (!ctx) return;
    const pending = _audioReady, ticket = fn ? ++_audioTone : _audioTone, at = performance.now();
    if (ctx.state === 'suspended') ctx.resume().catch(function(){});
    const play = ready => {
      if (!ready || ready !== _sharedAudioCtx || ready.state === 'closed') return;
      if (pending && fn && (ticket !== _audioTone || performance.now() - at > 1000)) return;
      try {
        if (ready.state === 'suspended') ready.resume().catch(function(){});
        if (fn) fn(ready);
      } catch (_) {}
    };
    if (pending) pending.then(play);
    else play(ctx);
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
