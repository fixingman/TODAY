// TODAY — Shift+Space voice capture: hold to speak, release to add one task.
// Privacy order: verified on-device SpeechRecognition first; otherwise one
// ephemeral MediaRecorder blob through the user's configured Gemini connection.
// Audio is never stored, chunked, or sent to the browser's default cloud recognizer.
window._startVoiceCapture = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const MAX_CAPTURE_MS = 45000;
    const ACTIVITY_SAMPLE_MS = 40;
    const SPEECH_RMS_THRESHOLD = 0.012;
    const MIN_VOICED_MS = 160;
    const lang = navigator.language || 'en-US';
    let _held = false;
    let _starting = false;
    let _session = null;
    let _hideTimer = null;

    // Only call SpeechRecognition when the browser can explicitly guarantee
    // on-device processing. The legacy API may silently send mic audio to a
    // browser-owned service, which is not a TODAY connection or trust boundary.
    let _localReady = Promise.resolve(false);
    if (SR && typeof SR.available === 'function') {
      try {
        _localReady = Promise.resolve(SR.available({ langs: [lang], processLocally: true }))
          .then(status => status === 'available')
          .catch(() => false);
      } catch (_) {}
    }

    function _isInputFocused() {
      const el = document.activeElement;
      return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    }

    function _setPillState(state) {
      const pill = document.getElementById('voiceCapturePill');
      if (!pill) return;
      clearTimeout(_hideTimer);
      const label = pill.querySelector('.vc-label');
      const labels = {
        starting: 'Getting ready…',
        listening: 'Listening…',
        transcribing: 'Finding the words…',
        added: 'Added',
        unavailable: 'Voice needs Gemini',
        empty: 'Nothing heard',
        error: 'Didn’t catch that',
      };
      pill.dataset.state = state;
      if (label && labels[state]) label.textContent = labels[state];

      if (state === 'hidden') {
        pill.querySelector('.vc-dot')?.getAnimations().forEach(animation => animation.cancel());
        pill.classList.remove('visible');
        _hideTimer = setTimeout(() => {
          pill.hidden = true;
          pill.setAttribute('aria-hidden', 'true');
          delete pill.dataset.state;
        }, 300);
        return;
      }

      pill.hidden = false;
      pill.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => pill.classList.add('visible'));
      const dot = pill.querySelector('.vc-dot');
      if (state === 'listening' && dot && !dot.getAnimations().length) {
        _breathe(dot, _KF_BREATHE_SMALL, 2400);
      } else if (state !== 'listening' && dot) {
        dot.getAnimations().forEach(animation => animation.cancel());
      }
    }

    function _showThenHide(state, delay) {
      _setPillState(state);
      _hideTimer = setTimeout(() => _setPillState('hidden'), delay);
    }

    function _geminiKey() {
      try { return Today.use('connections')._aiGetKey('gemini') || ''; }
      catch (_) { return ''; }
    }

    function _recorderMime() {
      if (typeof MediaRecorder === 'undefined') return null;
      const candidates = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
      return candidates.find(type => MediaRecorder.isTypeSupported(type)) || null;
    }

    // MediaRecorder happily produces a valid blob for silence. Sending that to
    // a generative transcriber can turn room noise into a plausible sentence,
    // so quick capture requires a small amount of sustained acoustic activity.
    // If Web Audio is unavailable, the request-level no-speech instruction is
    // still applied by /transcribe; this meter is the earlier, local guard.
    function _startActivityMeter(session, stream) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        const context = new Ctx();
        session.audioContext = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        session.audioSource = source;
        session.audioAnalyser = analyser;
        session.activityAvailable = typeof analyser.getFloatTimeDomainData === 'function';
        session.voicedMs = 0;
        if (!session.activityAvailable) return;
        Promise.resolve(context.resume?.()).then(() => {
          if (context.state === 'suspended') session.activityAvailable = false;
        }).catch(() => { session.activityAvailable = false; });
        session.activityTimer = setInterval(() => {
          analyser.getFloatTimeDomainData(samples);
          let sum = 0;
          for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
          if (Math.sqrt(sum / samples.length) >= SPEECH_RMS_THRESHOLD) {
            session.voicedMs += ACTIVITY_SAMPLE_MS;
          }
        }, ACTIVITY_SAMPLE_MS);
      } catch (_) {
        session.activityAvailable = false;
        _stopActivityMeter(session);
      }
    }

    function _stopActivityMeter(session) {
      if (!session) return null;
      clearInterval(session.activityTimer);
      try { session.audioSource?.disconnect(); } catch (_) {}
      try { session.audioAnalyser?.disconnect(); } catch (_) {}
      try { session.audioContext?.close()?.catch(() => {}); } catch (_) {}
      session.activityTimer = null;
      session.audioSource = null;
      session.audioAnalyser = null;
      session.audioContext = null;
      return session.activityAvailable ? session.voicedMs >= MIN_VOICED_MS : null;
    }

    function _finish(session, text, outcome) {
      if (!session || session.finalized) return;
      session.finalized = true;
      clearTimeout(session.capTimer);
      _stopActivityMeter(session);
      session.stream?.getTracks().forEach(track => track.stop());
      if (_session === session) _session = null;
      _starting = false;

      const clean = (text || '').trim();
      session.parts = [];
      session.pieces = [];
      session.apiKey = '';
      session.stream = null;
      if (clean) {
        Today.use('task-actions').addTaskFromText(clean);
        _showThenHide('added', 700);
      } else {
        _showThenHide(outcome || 'empty', 1400);
      }
    }

    async function _blobBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    async function _transcribe(session, blob, mimeType) {
      if (session.finalized) return;
      if (!blob.size) { _finish(session, '', 'empty'); return; }
      try {
        const audioData = await _blobBase64(blob);
        const res = await fetch('/.netlify/functions/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData, mimeType, apiKey: session.apiKey, rejectSilence: true,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
        _finish(session, data.text, data.text ? 'added' : 'empty');
      } catch (_) {
        _finish(session, '', 'error');
      }
    }

    function _startLocal() {
      const recognition = new SR();
      const session = {
        mode: 'local', recognition, pieces: [], finalized: false,
        stopRequested: false, capTimer: null,
      };
      _session = session;
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.processLocally = true;

      recognition.onresult = event => {
        for (let i = event.resultIndex || 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal !== false) {
            const piece = result[0]?.transcript?.trim();
            if (piece) session.pieces.push(piece);
          }
        }
      };
      recognition.onerror = event => {
        const quiet = event?.error === 'no-speech' ? 'empty' : 'error';
        _finish(session, session.pieces.join(' '), quiet);
      };
      recognition.onend = () => _finish(session, session.pieces.join(' '), 'empty');

      try {
        recognition.start();
        _starting = false;
        _setPillState('listening');
        session.capTimer = setTimeout(() => _releaseCapture(), MAX_CAPTURE_MS);
      } catch (_) {
        _finish(session, '', 'error');
      }
    }

    async function _startRecorder(apiKey, mimeType) {
      const session = {
        mode: 'recorder', apiKey, mimeType, recorder: null, stream: null,
        parts: [], finalized: false, stopRequested: false, capTimer: null,
        activityTimer: null, activityAvailable: false, voicedMs: 0,
        audioContext: null, audioSource: null, audioAnalyser: null,
      };
      _session = session;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        session.stream = stream;
        if (!_held || _session !== session) {
          stream.getTracks().forEach(track => track.stop());
          if (_session === session) _session = null;
          _starting = false;
          _setPillState('hidden');
          return;
        }
        const options = { audioBitsPerSecond: 32000 };
        if (mimeType) options.mimeType = mimeType;
        const recorder = new MediaRecorder(stream, options);
        session.recorder = recorder;
        _startActivityMeter(session, stream);
        recorder.addEventListener('dataavailable', event => {
          if (event.data && event.data.size) session.parts.push(event.data);
        });
        recorder.addEventListener('stop', () => {
          const type = mimeType || recorder.mimeType || 'audio/webm';
          if (session.speechDetected === false) _finish(session, '', 'empty');
          else _transcribe(session, new Blob(session.parts, { type }), type);
        });
        recorder.addEventListener('error', () => _finish(session, '', 'error'));
        recorder.start();
        _starting = false;
        _setPillState('listening');
        session.capTimer = setTimeout(() => _releaseCapture(), MAX_CAPTURE_MS);
      } catch (_) {
        _finish(session, '', 'error');
      }
    }

    async function _startCapture() {
      if (_starting || _session) return;
      _starting = true;
      _setPillState('starting');
      const local = await _localReady;
      if (!_held) { _starting = false; _setPillState('hidden'); return; }
      if (local) { _startLocal(); return; }

      const apiKey = _geminiKey();
      const mimeType = _recorderMime();
      const mediaReady = navigator.mediaDevices?.getUserMedia && mimeType !== null;
      if (apiKey && mediaReady) { _startRecorder(apiKey, mimeType); return; }

      _starting = false;
      _showThenHide('unavailable', 1800);
    }

    function _stopCapture() {
      const session = _session;
      if (!session || session.stopRequested) return;
      session.stopRequested = true;
      clearTimeout(session.capTimer);
      _setPillState('transcribing');
      try {
        if (session.mode === 'local') session.recognition.stop();
        else if (session.recorder?.state === 'recording') {
          session.speechDetected = _stopActivityMeter(session);
          session.recorder.stop();
        }
        else _finish(session, '', 'error');
      } catch (_) {
        _finish(session, '', 'error');
      }
    }

    function _releaseCapture() {
      _held = false;
      _stopCapture();
    }

    document.addEventListener('keydown', event => {
      if (event.code !== 'Space' || !event.shiftKey || event.repeat || _held || _isInputFocused()) return;
      event.preventDefault();
      _held = true;
      _startCapture();
    });

    // Either key ending the chord ends capture. Checking only Shift on Space's
    // keyup misses the common release order where Shift comes up first.
    document.addEventListener('keyup', event => {
      if (!_held || (event.code !== 'Space' && event.code !== 'ShiftLeft' && event.code !== 'ShiftRight')) return;
      if (event.code === 'Space') event.preventDefault();
      _releaseCapture();
    });
    window.addEventListener('blur', () => { if (_held) _releaseCapture(); });
  };
}());
