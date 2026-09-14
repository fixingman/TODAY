// TODAY — Shift+Space voice capture: hold to speak, release to add task.
// Uses Web Speech API (no API key). Inert if unsupported.
window._startVoiceCapture = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    let _capturing = false;
    let _recognition = null;

    function _isInputFocused() {
      const el = document.activeElement;
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    }

    function _setPillState(state) {
      const pill = document.getElementById('voiceCapturePill');
      if (!pill) return;
      const label = pill.querySelector('.vc-label');
      if (state === 'listening') {
        if (label) label.textContent = 'Listening…';
        pill.hidden = false;
        pill.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => pill.classList.add('visible'));
      } else if (state === 'adding') {
        if (label) label.textContent = 'Adding…';
      } else {
        pill.classList.remove('visible');
        setTimeout(() => { pill.hidden = true; pill.setAttribute('aria-hidden', 'true'); }, 260);
      }
    }

    function _startCapture() {
      if (_capturing) return;
      _capturing = true;

      _recognition = new SR();
      _recognition.lang = navigator.language || 'en-US';
      _recognition.interimResults = false;
      _recognition.maxAlternatives = 1;

      _recognition.onresult = e => {
        _capturing = false;
        const text = e.results[0]?.[0]?.transcript?.trim();
        if (text) {
          _setPillState('adding');
          Today.use('task-actions').addTaskFromText(text);
          setTimeout(() => _setPillState('hidden'), 700);
        } else {
          _setPillState('hidden');
        }
      };

      _recognition.onerror = () => {
        _capturing = false;
        _setPillState('hidden');
      };

      _recognition.onend = () => {
        if (_capturing) { _capturing = false; _setPillState('hidden'); }
      };

      try {
        _recognition.start();
        _setPillState('listening');
      } catch(_) {
        _capturing = false;
      }
    }

    function _stopCapture() {
      if (!_recognition) return;
      try { _recognition.stop(); } catch(_) {}
    }

    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && e.shiftKey && !e.repeat && !_capturing && !_isInputFocused()) {
        e.preventDefault();
        _startCapture();
      }
    });

    document.addEventListener('keyup', e => {
      if (e.code === 'Space' && e.shiftKey) {
        e.preventDefault();
        _stopCapture();
      }
    });
  };
}());
