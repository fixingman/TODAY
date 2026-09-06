// TODAY — meeting mode and voice note.
// Inert until index.html calls window._startMeeting() after app state and
// AI helpers are defined. Classic script by design: no build step, SW-precached.
(function() {
  'use strict';

  let started = false;

  window._startMeeting = function() {
    if (started) return;
    started = true;

    // ── Meeting mode (v2.22.0 desktop, v2.28.0 mobile) ────────────────────────────
    // Listens to a meeting through the mic and leaves behind only tasks. Fully
    // ephemeral: audio chunks and the rolling context live in _mtg below and are
    // nulled on teardown — nothing recorded, nothing persisted, no voice ID.
    // Gemini-only (sole provider with native audio input). Chunks via recorder
    // stop/restart (not timeslice — later timeslice chunks aren't independently
    // decodable). Failed chunks retry once, then drop: a lost chunk beats a dead
    // meeting. Mobile contract: wake lock keeps the screen on while listening;
    // if it locks anyway, the meeting ends with an honest note of what was kept.
    // See memory/design/Components.md § Meeting Mode.

    const MEETING_CHUNK_MS = 360000; // 6-min chunks — ~10 API calls/hour (webm path)

    let _mtg = null;          // { stream, recorder, items, context, startedAt, timerId, chunkTimerId,
                              //   chunkStartedAt, chunkMs, finalChunkSecs, processingFinalChunk, live,
                              //   mime, dotAnim, wakeLock, hiddenAt, suspendNote }
    let _meetingStarting = false; // blocks double-start during the getUserMedia await window

    function _meetingSupported() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        && typeof MediaRecorder !== 'undefined'
        && (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            || MediaRecorder.isTypeSupported('audio/mp4'));
    }

    // Multi-name store — migration: single today_user_name → today_user_names array
    function _getUserNames() {
      const stored = localStorage.getItem('today_user_names');
      if (stored) { try { return JSON.parse(stored); } catch(_) {} }
      // Migrate legacy single-name key
      const legacy = localStorage.getItem('today_user_name');
      return legacy ? [legacy] : [];
    }
    function _saveUserNames(names) {
      if (names.length) localStorage.setItem('today_user_names', JSON.stringify(names));
      else localStorage.removeItem('today_user_names');
      // Keep today_user_name in sync for backup payload backward compat
      if (names.length) localStorage.setItem('today_user_name', names[0]);
      else localStorage.removeItem('today_user_name');
      localStorage.setItem('user_names_at', new Date().toISOString());
      _setLastLocalChange();
      dropboxAutoSave();
    }
    function renderMeetingNames() {
      const list = document.getElementById('nameChipList');
      if (!list) return;
      const names = _getUserNames();
      list.innerHTML = names.map((n, i) =>
        `<span class="name-chip">${esc(n)}<button class="name-chip-remove" data-today-click="meeting.remove-name" data-name-index="${i}" aria-label="Remove ${esc(n)}">×</button></span>`
      ).join('') +
      `<label class="visually-hidden" for="meetingNameInput">Add a meeting name</label><input id="meetingNameInput" type="text" maxlength="60"
        autocomplete="off" autocorrect="off" spellcheck="false"
        placeholder="${names.length ? 'Add another…' : 'First name…'}"
        data-today-keydown="meeting.add-name-key"
        data-today-focusout="meeting.add-name" />`;
    }
    function addMeetingName() {
      const input = document.getElementById('meetingNameInput');
      if (!input) return;
      const name = input.value.replace(/,/g, '').trim().slice(0, 60);
      if (!name) return;
      const names = _getUserNames();
      if (!names.includes(name)) { names.push(name); _saveUserNames(names); }
      input.value = '';
      renderMeetingNames();
      // Restore focus to the new input element after re-render
      document.getElementById('meetingNameInput')?.focus();
    }
    function removeMeetingName(idx) {
      const names = _getUserNames();
      names.splice(idx, 1);
      _saveUserNames(names);
      renderMeetingNames();
    }

    // Reveal the mic button when recording is supported and Gemini is configured —
    // called from init() and after AI config changes.
    function _meetingInit() {
      const btn = document.getElementById('meetingBtn');
      if (!btn) return;
      const ok = _meetingSupported() && !!Today.use('connections')._aiGetKey('gemini');
      btn.style.display = ok ? 'flex' : 'none';
    }

    function toggleMeeting() {
      if (_mtg && _mtg.live) { _meetingStop(); return; }
      if (!_getUserNames().length) { _meetingNamePromptShow(); return; }
      _meetingStart();
    }

    // ── Meeting capture PiP (v2.44.0) ─────────────────────────────────────────────
    // A floating record control that follows you out of the tab, so a running capture can
    // be stopped — or just watched — while another app owns focus. The screen-share case:
    // bringing TODAY forward would put the task list on someone else's monitor.
    //
    // NO manual opener button. One was built and removed the same day: to press it you had
    // to be looking at TODAY, and if you are already there the mic icon does the same job
    // in fewer steps. A pop-out only earns its place if it arrives without you going to
    // get it — so it is opened automatically on tab-leave while a capture is live.
    //
    // Best-effort by nature: requestWindow() needs transient user activation, so the open
    // rides the activation from the click that started the capture. Tap record then switch
    // to the call and it lands; linger in TODAY first and it may not (same caveat the focus
    // timer PiP carries). Immediate attempt plus a short retry, exactly as focus does.
    //
    // The window renders ONLY a dot, elapsed time and one button: it is safe to be *seen*,
    // which is the point — a fully shared screen hides nothing anyway.
    // Chrome/Edge desktop only (Document PiP).
    let _mtgPipWin = null;

    async function _meetingPipOpen() {
      if (!('documentPictureInPicture' in window)) return;
      if (_mtgPipWin && !_mtgPipWin.closed) { _mtgPipWin.focus(); return; }
      try {
        _mtgPipWin = await documentPictureInPicture.requestWindow({
          width: 240, height: 78, disallowReturnToOpener: true,
        });
      } catch (e) { _mtgPipWin = null; return; }

      const baseUrl = window.location.origin;
      const pip = _pipTokens();
      // PiP documents inherit no styles from the opener, so tokens are re-declared here —
      // same approach as the focus timer PiP.
      _mtgPipWin.document.body.innerHTML =
        '<style>' +
        ':root{--pip-bg:' + pip.bg + ';--pip-accent:' + pip.accent + ';--pip-text:' + pip.text + ';--pip-muted:' + pip.muted + ';' +
        '--pip-btn-bg:' + pip.btnBg + ';--pip-btn-border:' + pip.btnBorder + ';--pip-btn-hover-bg:' + pip.btnHoverBg + ';}' +
        '*{box-sizing:border-box;margin:0;padding:0;}' +
        '@font-face{font-family:"DM Mono";src:url("' + baseUrl + '/fonts/DM%20Mono/dm-mono-v16-latin-300.woff2") format("woff2");font-weight:300;}' +
        'html,body{width:100%;height:100%;background:var(--pip-bg);overflow:hidden;' +
        'font-family:"DM Mono",ui-monospace,monospace;color:var(--pip-text);}' +
        '.mp{display:flex;align-items:center;gap:10px;height:100%;padding:0 14px;}' +
        '.mp-dot{width:8px;height:8px;border-radius:50%;background:var(--pip-muted);flex-shrink:0;}' +
        '.mp-dot.live{background:var(--pip-accent);}' +
        '.mp-time{font-size:15px;letter-spacing:0.04em;flex:1;color:var(--pip-muted);}' +
        '.mp-time.live{color:var(--pip-text);}' +
        '.mp-btn{font-family:inherit;font-size:11px;letter-spacing:0.06em;padding:5px 11px;border-radius:6px;' +
        'background:var(--pip-btn-bg);border:1px solid var(--pip-btn-border);color:var(--pip-accent);cursor:pointer;' +
        'transition:background 140ms;}' +
        '.mp-btn:hover{background:var(--pip-btn-hover-bg);}' +
        '.mp-btn:focus-visible{outline:2px solid var(--pip-accent);outline-offset:2px;}' +
        '.mp-note{position:absolute;left:14px;right:14px;bottom:6px;font-size:9px;letter-spacing:0.04em;' +
        'color:var(--pip-muted);text-align:center;}' +
        '</style>' +
        '<div class="mp">' +
          '<div class="mp-dot" id="mpDot" aria-hidden="true"></div>' +
          '<span class="mp-time" id="mpTime" role="timer" aria-label="Meeting elapsed time">00:00</span>' +
          '<button class="mp-btn" id="mpBtn" aria-pressed="false" aria-label="Start meeting recording">record</button>' +
        '</div>' +
        '<div class="mp-note" id="mpNote"></div>';

      _mtgPipWin.document.title = 'TODAY';

      _mtgPipWin.document.getElementById('mpBtn').addEventListener('click', () => {
        // The first-use name prompt lives in the opener and would be invisible from here,
        // so surface the reason instead of appearing to do nothing.
        if (typeof _getUserNames === 'function' && !_getUserNames().length && !(_mtg && _mtg.live)) {
          const note = _mtgPipWin.document.getElementById('mpNote');
          if (note) note.textContent = 'set your name in TODAY first';
          return;
        }
        toggleMeeting();
        setTimeout(_meetingPipSync, 80); // let _meetingStart's await settle
      });

      _mtgPipWin.addEventListener('pagehide', () => { _mtgPipWin = null; });

      _meetingPipSync();
    }

    // Mirrors _mtg into the PiP. Called from the meeting tick (already wall-clock based,
    // so it stays accurate while the tab is backgrounded) and right after any toggle.
    function _meetingPipSync() {
      if (!_mtgPipWin || _mtgPipWin.closed) return;
      const d = _mtgPipWin.document;
      const dot = d.getElementById('mpDot');
      const time = d.getElementById('mpTime');
      const btn = d.getElementById('mpBtn');
      const note = d.getElementById('mpNote');
      if (!dot || !time || !btn) return;
      const live = !!(typeof _mtg !== 'undefined' && _mtg && _mtg.live);
      dot.classList.toggle('live', live);
      time.classList.toggle('live', live);
      btn.textContent = live ? 'stop' : 'record';
      btn.setAttribute('aria-pressed', String(live));
      btn.setAttribute('aria-label', live ? 'Stop meeting recording' : 'Start meeting recording');
      if (live) {
        const el = Math.floor((Date.now() - _mtg.startedAt) / 1000);
        time.textContent = String(Math.floor(el / 60)).padStart(2, '0') + ':' +
                           String(el % 60).padStart(2, '0');
        if (note) note.textContent = '';
      } else {
        time.textContent = '00:00';
      }
    }

    // Automatic trigger — the only reason this feature earns its place. Mirrors the focus
    // timer's approach: try at once, then retry shortly after, since activation may lapse.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      if (!(typeof _mtg !== 'undefined' && _mtg && _mtg.live)) return;
      if (_mtgPipWin && !_mtgPipWin.closed) return;
      _meetingPipOpen();
      setTimeout(() => {
        if (document.hidden && _mtg && _mtg.live && (!_mtgPipWin || _mtgPipWin.closed)) _meetingPipOpen();
      }, 300);
    });

    function _meetingPipClose() {
      if (_mtgPipWin && !_mtgPipWin.closed) _mtgPipWin.close();
      _mtgPipWin = null;
    }

    function _meetingNamePromptShow() {
      const el = document.getElementById('meetingNamePrompt');
      if (!el) return;
      if (window._a11yOpenPopover) _a11yOpenPopover(el, document.getElementById('meetingBtn'));
      else el.hidden = false;
      el.classList.add('show');
      requestAnimationFrame(() => el.classList.add('visible'));
      setTimeout(() => document.getElementById('meetingNamePromptInput')?.focus(), 50);
    }
    function _meetingNamePromptHide() {
      const el = document.getElementById('meetingNamePrompt');
      if (!el) return;
      el.classList.remove('visible');
      setTimeout(() => {
        el.classList.remove('show');
        if (window._a11yClosePopover) _a11yClosePopover(el);
        else el.hidden = true;
      }, 300);
    }
    function _meetingNamePromptKey(e) {
      if (e.key === 'Enter') { e.preventDefault(); _meetingNamePromptSubmit(); }
      if (e.key === 'Escape') { e.preventDefault(); _meetingNamePromptHide(); }
    }
    function _meetingNamePromptSubmit() {
      const input = document.getElementById('meetingNamePromptInput');
      const name = (input?.value || '').trim().slice(0, 60);
      if (name) {
        const names = _getUserNames();
        if (!names.includes(name)) { names.push(name); _saveUserNames(names); renderMeetingNames(); }
      }
      if (input) input.value = '';
      _meetingNamePromptHide();
      _meetingStart();
    }

    function _micGlow(stream, targets) {
      const els = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx || !els.length) return { stop() {} };
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let raf, glow = 0, active = true;

      // Page background used as gap-masking layer between rings
      const bg = getComputedStyle(document.body).backgroundColor;

      function tick() {
        if (!active) return;
        raf = requestAnimationFrame(tick);
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        // Power curve: quiet speech (rms ~0.03-0.07) maps to visible range
        const target = Math.min(Math.pow(rms * 14, 0.6), 1);
        glow += (target - glow) * (target > glow ? 0.45 : 0.07);
        const a1 = (glow * 0.9 ).toFixed(2); // inner ring
        const a2 = (glow * 0.22).toFixed(2); // middle ring — subtle
        const a3 = (glow * 0.09).toFixed(2); // outer ring — very faint
        const ag = (glow * 0.08).toFixed(2); // soft ambient glow
        // Three crisp rings separated by bg-coloured gap layers, plus a soft glow behind them.
        // The gap layers (drawn front-to-back in CSS) occlude the fill between rings,
        // making each accent layer appear as a thin line rather than a filled blob.
        const shadow = [
          '0 0 0 3px rgba(200,240,96,' + a1 + ')',    // ring 1 — tight to border
          '0 0 0 6px ' + bg,                            // gap
          '0 0 0 8px rgba(200,240,96,' + a2 + ')',    // ring 2
          '0 0 0 12px ' + bg,                           // gap
          '0 0 0 14px rgba(200,240,96,' + a3 + ')',   // ring 3
          '0 0 14px 2px rgba(200,240,96,' + ag + ')', // soft ambient glow
        ].join(', ');
        els.forEach(el => { el.style.boxShadow = shadow; });
      }
      raf = requestAnimationFrame(tick);

      return {
        stop() {
          active = false;
          cancelAnimationFrame(raf);
          ctx.close().catch(() => {});
          els.forEach(el => {
            el.style.transition = 'box-shadow 0.4s ease';
            el.style.boxShadow = '';
            setTimeout(() => { el.style.transition = ''; }, 400);
          });
        }
      };
    }

    async function _meetingStart() {
      // _meetingStarting covers the getUserMedia await window where _mtg is still null —
      // without it a second tap opens a parallel stream that is never released.
      if (_mtg || _meetingStarting) return;
      _meetingStarting = true;
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        _meetingStarting = false;
        _logSyncError('Meeting', 'Mic access declined — enable it in the browser site settings');
        return;
      }
      _meetingStarting = false;

      // Detect MIME once per session — codec support cannot change mid-meeting
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''); // mp4 = iOS path

      // iOS ignores audioBitsPerSecond for AAC — real output can hit ~192 kbps, which
      // would put a 6-min chunk (~8.6MB → ~11.8MB base64) past Netlify's 6MB limit.
      // 2-min mp4 chunks stay safe at worst case (~2.9MB → ~4MB base64).
      const chunkMs = mime === 'audio/mp4' ? 120000 : MEETING_CHUNK_MS;

      _mtg = { stream, recorder: null, items: [], context: '', startedAt: Date.now(),
               timerId: null, chunkTimerId: null, live: true, mime, chunkMs, dotAnim: null,
               wakeLock: null, hiddenAt: null, suspendNote: null };
      _meetingWakeLock(); // keep the screen on while listening (no-op where unsupported)

      document.getElementById('meetingBtn')?.classList.add('live');
      const meetingBtn = document.getElementById('meetingBtn');
      if (meetingBtn) {
        meetingBtn.setAttribute('aria-pressed', 'true');
        meetingBtn.setAttribute('aria-label', 'Stop meeting recording');
      }
      const pill = document.getElementById('meetingPill');
      const time = document.getElementById('meetingPillTime');
      if (time) time.textContent = '00:00';
      if (pill) {
        pill.hidden = false;
        pill.setAttribute('aria-hidden', 'false');
        pill.classList.add('show');
        requestAnimationFrame(() => pill.classList.add('visible'));
        // Store the animation handle so _meetingTeardown can cancel it — the pill element
        // is reused across sessions and _breathe stacks a new animation each call otherwise.
        _mtg.dotAnim = _breathe(pill.querySelector('.meeting-pill-dot'), _KF_BREATHE_SMALL, 2400);
        _mtg.glowAnim = _micGlow(stream, pill);
      }

      // Wall-clock elapsed — immune to background-tab interval throttling
      _mtg.timerId = setInterval(() => {
        if (!_mtg) return;
        const elapsed = Math.floor((Date.now() - _mtg.startedAt) / 1000);
        const t = document.getElementById('meetingPillTime');
        if (t) t.textContent =
          String(Math.floor(elapsed / 60)).padStart(2, '0') + ':' +
          String(elapsed % 60).padStart(2, '0');
        _meetingPipSync(); // keep the floating recorder in step (v2.44.0)
      }, 1000);

      _meetingRecordChunk();
    }

    // One self-contained recording of MEETING_CHUNK_MS; onstop ships it and starts the next.
    function _meetingRecordChunk() {
      if (!_mtg || !_mtg.live) return;
      // iOS may fire a stalled recorder's onstop before visibilitychange on resume —
      // constructing a MediaRecorder on a dead stream throws. End honestly instead.
      if (_mtg.stream.getAudioTracks().some(t => t.readyState === 'ended')) { _meetingSuspendEnd(); return; }
      // 32 kbps opus is plenty for speech and keeps a 6-min chunk (~1.4MB raw, ~1.9MB
      // base64) safely under Netlify's 6MB function-body limit — the browser default
      // (~128 kbps) would push a full chunk past it and drop 6 minutes at a time.
      const rec = new MediaRecorder(_mtg.stream,
        { audioBitsPerSecond: 32000, ...(_mtg.mime ? { mimeType: _mtg.mime } : {}) });
      const parts = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = () => {
        const wasLive = _mtg && _mtg.live;
        if (parts.length) {
          const send = _meetingSendChunk(new Blob(parts, { type: _mtg?.mime || rec.mimeType || 'audio/webm' }));
          if (!wasLive) {
            send.then(() => {
              const ovl = document.getElementById('meetingOverlay');
              if (_mtg && !_mtg.live && ovl && !ovl.classList.contains('hidden')) {
                if (_mtg) _mtg.processingFinalChunk = false;
                _meetingRenderReview(_mtg);
              }
            });
          }
        } else if (!wasLive && _mtg) {
          // No audio in final chunk (stopped right as a new chunk started) — clear banner immediately.
          // _mtg guard: a quick Discard can null it before this onstop fires.
          _mtg.processingFinalChunk = false;
          _meetingRenderReview(_mtg);
        }
        // Identity guard (same pattern as the chunk timer below): a suspended recorder's
        // late onstop must not restart when _meetingHealthCheck already started a fresh
        // one — two recorders on one stream, the orphan never ships. Its partial parts
        // above still ship (real captured audio); only the restart is fenced.
        if (wasLive && _mtg && _mtg.recorder === rec) _meetingRecordChunk();
      };
      // Route recorder errors through the same resume policy — no second error path.
      rec.onerror = () => { if (_mtg && _mtg.live && _mtg.recorder === rec) _meetingHealthCheck(); };
      rec.start();
      _mtg.recorder = rec;
      _mtg.chunkStartedAt = Date.now(); // used at stop time to compute final chunk duration
      _mtg.chunkTimerId = setTimeout(() => {
        if (_mtg && _mtg.recorder === rec && rec.state === 'recording') rec.stop();
      }, _mtg.chunkMs);
    }

    // Screen Wake Lock — best effort. Absence (old iOS, desktop browsers without it)
    // is normal, not an error: the meeting still works, the screen just may dim.
    async function _meetingWakeLock() {
      if (!_mtg || !navigator.wakeLock) return;
      try { _mtg.wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
    }

    // Resume policy — called on visibilitychange→visible and recorder.onerror.
    // iOS suspends the PWA on screen lock/backgrounding and silently kills the
    // recorder; without this check a meeting looks live while capturing nothing.
    function _meetingHealthCheck() {
      if (!_mtg || !_mtg.live) return;
      _meetingWakeLock(); // auto-released on hide; request only succeeds while visible
      const tracks = _mtg.stream.getAudioTracks();
      if (!tracks.length || tracks.some(t => t.readyState === 'ended')) {
        _meetingSuspendEnd(); // mic is gone — end honestly with what was kept
        return;
      }
      // Tracks alive ('muted' counts — iOS unmutes on foreground). Check the recorder:
      const rec = _mtg.recorder;
      if (rec && rec.state === 'recording') return; // survived a brief app switch
      if (rec && rec.state === 'paused') { rec.stop(); return; } // onstop ships partial + restarts
      // inactive or missing — restart the chunk cycle (audio during suspension is lost)
      clearTimeout(_mtg.chunkTimerId);
      _meetingRecordChunk();
    }

    // The honest end: the OS killed the mic while we were suspended. Report what was
    // actually kept — the dangerous failure is a user believing an hour was captured
    // when only the pre-lock minutes were.
    function _meetingSuspendEnd() {
      if (!_mtg || !_mtg.live) return;
      const mins = Math.round(((_mtg.hiddenAt || Date.now()) - _mtg.startedAt) / 60000);
      _mtg.suspendNote = mins >= 1
        ? 'Listening stopped when the screen locked — kept the first ' + mins + ' min'
        : 'Listening stopped when the screen locked — only the first moments were kept';
      _meetingStop();
    }

    async function _meetingSendChunk(blob, retryCount = 0, priorState = null) {
      // Capture state at call time — meeting may end while this chunk is in flight.
      // Retries reuse the original capture so a chunk from a discarded meeting can
      // never write into a new one started in the meantime.
      const state = priorState || _mtg;
      if (!state) return;
      // Belt-and-braces for the iOS AAC path: 4.3MB × 1.37 (base64) ≈ 5.9MB, the edge
      // of Netlify's body limit. A larger blob would 502 twice and waste the retry.
      if (blob.size > 4300000) {
        _logSyncError('Meeting', 'Chunk too large to send — dropped');
        return;
      }
      const _isQuota = (msg) => /quota|rate.?limit|resource.?exhausted|429/i.test(msg);
      try {
        const b64 = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(',')[1] || '');
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
        const res = await fetch('/.netlify/functions/meeting-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: Today.use('connections')._aiGetKey('gemini'),
            audioChunk: b64,
            mimeType: blob.type || 'audio/webm',
            userName: _getUserNames().join(', '),
            rollingContext: state.context,
            capturedMine: state.items.filter(x => x.mine).map(x => x.text),
          }),
        });
        const rawText = await res.text();
        let data;
        try { data = JSON.parse(rawText); }
        catch (_) { throw new Error(rawText.replace(/<[^>]+>/g, '').trim().slice(0, 120) || `HTTP ${res.status}`); }
        if (data.error) throw new Error(data.error);
        if (typeof data.updatedContext === 'string') state.context = data.updatedContext;
        (data.actionItems || []).forEach(item => {
          // Dedupe on normalized text — the prompt asks Gemini not to repeat, this backstops it
          const norm = item.text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
          if (!state.items.some(x => x.norm === norm)) {
            state.items.push({ text: item.text, owner: item.owner, mine: item.mine, norm });
          }
        });
        // Re-render for the final chunk is handled by the onstop promise chain above.
      } catch (e) {
        const msg = e.message || 'network';
        if (_isQuota(msg)) {
          // Quota exceeded — show red dot immediately and bail. Retrying after 30s won't help
          // and leaves the user staring at "Digesting…" with no explanation.
          _logSyncError('Meeting', 'Quota exceeded — ' + msg.slice(0, 100));
          return; // send.then() fires → processingFinalChunk clears → overlay resolves
        }
        if (retryCount === 0) {
          // Non-quota first failure: retry once immediately
          return _meetingSendChunk(blob, 1, state);
        }
        _logSyncError('Meeting', 'Chunk dropped — ' + msg.slice(0, 120));
      }
    }

    function _meetingStop() {
      if (!_mtg) return;
      _mtg.live = false;
      // Capture has ended, so the floating control has no job left — the review that
      // follows happens in TODAY. Closed here rather than in _meetingTeardown(), which
      // only runs once the review is accepted or discarded. (v2.44.0)
      _meetingPipClose();
      clearTimeout(_mtg.chunkTimerId);
      clearInterval(_mtg.timerId);
      _mtg.wakeLock?.release().catch(() => {});
      _mtg.wakeLock = null;
      if (_mtg.recorder && _mtg.recorder.state === 'recording') _mtg.recorder.stop(); // flushes final chunk via onstop
      _mtg.glowAnim?.stop();
      _mtg.stream.getTracks().forEach(t => t.stop());

      document.getElementById('meetingBtn')?.classList.remove('live');
      const meetingBtn = document.getElementById('meetingBtn');
      if (meetingBtn) {
        meetingBtn.setAttribute('aria-pressed', 'false');
        meetingBtn.setAttribute('aria-label', 'Start meeting recording');
      }
      const _pill = document.getElementById('meetingPill');
      if (_pill) {
        _pill.classList.remove('visible');
        setTimeout(() => {
          _pill.classList.remove('show');
          _pill.hidden = true;
          _pill.setAttribute('aria-hidden', 'true');
        }, 300);
      }

      // Snapshot how long the final chunk is so the review can show "Digesting last X min…"
      // On a suspend-end, measure to when the app was hidden — not now — so the
      // digesting label doesn't count minutes of suspended silence.
      const _stopRef = (_mtg.suspendNote && _mtg.hiddenAt) ? _mtg.hiddenAt : Date.now();
      _mtg.finalChunkSecs = Math.max(0, Math.round((_stopRef - (_mtg.chunkStartedAt || _mtg.startedAt)) / 1000));
      _mtg.processingFinalChunk = true;
      // Render immediately — shows prior-chunk items if any, or loader if none yet.
      _meetingRenderReview(_mtg);
      const ovl = document.getElementById('meetingOverlay');
      if (ovl) {
        ovl.style.animation = '';
        ovl.hidden = false;
        ovl.classList.remove('hidden');
        if (window._a11yOpenDialog) _a11yOpenDialog(ovl, {
          modal: true,
          initialFocus: document.getElementById('meetingAddBtn'),
          returnFocus: document.getElementById('meetingBtn')
        });
        requestAnimationFrame(() => ovl.classList.add('visible'));
      }
    }

    function _meetingRenderReview(state) {
      const list  = document.getElementById('meetingItems');
      const title = document.getElementById('meetingReviewTitle');
      const sub   = document.getElementById('meetingReviewSub');
      const add   = document.getElementById('meetingAddBtn');
      if (!list) return;

      const processing = state.processingFinalChunk;
      const secs = state.finalChunkSecs || 0;
      const mins = Math.max(1, Math.round(secs / 60));
      const label = mins === 1 ? '1 min' : mins + ' min';

      // Suspend-end note — honesty about what was captured, shown in every state
      const note = state.suspendNote
        ? `<div class="meeting-suspend-note">${esc(state.suspendNote)}</div>` : '';

      const actions = document.querySelector('.meeting-review-actions');
      if (!state.items.length) {
        // State 1 — digesting with no prior items, or empty result
        if (title) title.textContent = processing ? 'Digesting…' : 'From your call';
        if (sub) sub.style.display = 'none';
        if (add) add.style.display = 'none';
        if (actions) actions.classList.add('no-add');
        if (processing) {
          list.innerHTML = note + `<div class="meeting-processing-center">
            <span class="loading-dots"><span></span><span></span><span></span></span>
            <span class="meeting-processing-label">last ${label}</span>
          </div>`;
        } else {
          list.innerHTML = note + '<div class="meeting-review-empty">Nothing came up</div>';
        }
        list.querySelectorAll('.loading-dots span').forEach((s, i) => _breathe(s, _KF_BLINK, 1200, [0, 180, 400][i]));
        return;
      }

      // Items exist — states 2 and 3
      if (title) title.textContent = 'From your call';
      if (sub) sub.style.display = '';
      if (add) { add.style.display = ''; add.disabled = false; }
      if (actions) actions.classList.remove('no-add');

      const itemsHTML = state.items.map((item, i) => `
        <button type="button" class="meeting-item${item.mine ? ' selected' : ''}" data-idx="${i}" aria-pressed="${item.mine}" data-today-click="meeting.toggle-item">
          <span class="meeting-tick" aria-hidden="true"></span>
          <span class="meeting-item-text">${esc(item.text)}</span>
          ${item.owner ? '<span class="meeting-owner">' + esc(item.owner) + '</span>' : ''}
        </button>`).join('');

      if (processing) {
        // State 2 — inset strip above prior items
        list.innerHTML = note + `<div class="meeting-processing-strip">
          <span class="loading-dots"><span></span><span></span><span></span></span>
          Still digesting last ${label}
        </div>` + itemsHTML;
      } else {
        // State 3 — rule then items
        list.innerHTML = note + '<div class="meeting-review-rule"></div>' + itemsHTML;
      }

      list.querySelectorAll('.loading-dots span').forEach((s, i) => _breathe(s, _KF_BLINK, 1200, [0, 180, 400][i]));
      _meetingUpdateCount();
    }

    function _meetingUpdateCount() {
      const n = document.querySelectorAll('#meetingItems .meeting-item.selected').length;
      const btn = document.getElementById('meetingAddBtn');
      if (btn) {
        btn.textContent = n === 0 ? 'Add tasks' : 'Add ' + n + ' task' + (n === 1 ? '' : 's');
        btn.disabled = n === 0;
      }
    }

    function _meetingAccept() {
      // Attribution accuracy signal — compares what the model called mine/others
      // against what the user actually kept selected at the end of review.
      if (typeof _memoryOnMeetingAttribution === 'function' && _mtg) {
        const stats = { mineShown: 0, mineKept: 0, othersShown: 0, othersSelected: 0 };
        document.querySelectorAll('#meetingItems .meeting-item').forEach(el => {
          const item = _mtg.items[+el.dataset.idx];
          if (!item) return;
          const selected = el.classList.contains('selected');
          if (item.mine) { stats.mineShown++; if (selected) stats.mineKept++; }
          else { stats.othersShown++; if (selected) stats.othersSelected++; }
        });
        _memoryOnMeetingAttribution(stats);
      }
      const picked = [...document.querySelectorAll('#meetingItems .meeting-item.selected .meeting-item-text')]
        .map(el => el.textContent.trim()).filter(Boolean);
      picked.forEach((text, i) => {
        manualTasks.push({ id: 'manual_' + (Date.now() + i), text });
      });
      if (picked.length) {
        _saveManual();
        Today.use('connections').renderManual();
        _setLastLocalChange();
        dropboxAutoSave();
      }
      _meetingTeardown();
    }

    function _meetingDiscard() { _meetingTeardown(); }

    // Ephemerality guarantee: audio, items, and rolling context all die here.
    function _meetingTeardown() {
      _meetingPipClose(); // defensive — normally already closed by _meetingStop()
      _mtg?.dotAnim?.cancel(); // stop the breathing animation before releasing the reference
      _mtg?.wakeLock?.release().catch(() => {}); // defensive — normally released in _meetingStop
      const _ovl = document.getElementById('meetingOverlay');
      if (_ovl) {
        if (window._a11yCloseDialog) _a11yCloseDialog(_ovl, { hide: false });
        _ovl.classList.remove('visible');
        setTimeout(() => {
          _ovl.classList.add('hidden');
          _ovl.hidden = true;
          const list = document.getElementById('meetingItems');
          if (list) list.innerHTML = '';
        }, 300);
      } else {
        const list = document.getElementById('meetingItems');
        if (list) list.innerHTML = '';
      }
      _mtg = null;
    }

    // ── Voice note (v2.24.0, mobile-only) ─────────────────────────────────────────
    const _VN_CAP_SECS = 90;
    let _vn = null;
    let _vnStarting = false;

    function _voiceNoteSupported() {
      return ('ontouchstart' in window)
        && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        && typeof MediaRecorder !== 'undefined'
        && !!Today.use('connections')._aiGetKey('gemini');
    }

    function _voiceNoteInit() {
      const btn = document.getElementById('voiceNoteBtn');
      if (!btn) return;
      // Hide voice note when meeting mode is also available — avoid two mic CTAs on mobile
      const meetingAvailable = _meetingSupported() && !!Today.use('connections')._aiGetKey('gemini');
      btn.style.display = (_voiceNoteSupported() && !meetingAvailable) ? 'flex' : 'none';
    }

    function toggleVoiceNote() {
      if (_vn) { _voiceNoteStop(); return; }
      _voiceNoteStart();
    }

    async function _voiceNoteStart() {
      if (_vn || _vnStarting) return;
      _vnStarting = true;
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        _vnStarting = false;
        return;
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      recorder.addEventListener('dataavailable', e => { if (e.data.size > 0) chunks.push(e.data); });
      recorder.addEventListener('stop', () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mimeType });
        _voiceNoteSend(blob, mimeType);
        _vn = null;
        const pill = document.getElementById('voicePill');
        if (pill) {
          pill.classList.remove('visible');
          setTimeout(() => {
            pill.classList.remove('show');
            pill.hidden = true;
            pill.setAttribute('aria-hidden', 'true');
          }, 300);
        }
        document.getElementById('voiceNoteBtn')?.classList.remove('live');
        const voiceBtn = document.getElementById('voiceNoteBtn');
        if (voiceBtn) { voiceBtn.setAttribute('aria-pressed', 'false'); voiceBtn.setAttribute('aria-label', 'Record a voice note'); }
      });

      recorder.start();
      const startedAt = Date.now();
      _vnStarting = false;

      // Timer + 90s cap
      let capShown = false;
      const timerId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const remaining = _VN_CAP_SECS - elapsed;
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        const timeEl = document.getElementById('voicePillTime');
        if (timeEl) timeEl.textContent = m + ':' + String(s).padStart(2, '0');
        if (remaining <= 10 && !capShown) {
          capShown = true;
          const capEl = document.getElementById('voicePillCap');
          if (capEl) { capEl.textContent = remaining + 's'; capEl.classList.add('visible'); }
        }
        if (remaining <= 0) { _voiceNoteStop(); }
      }, 1000);

      _vn = { recorder, timerId, mimeType, glowAnim: null };

      const pill = document.getElementById('voicePill');
      if (pill) {
        pill.hidden = false;
        pill.setAttribute('aria-hidden', 'false');
        const timeEl = document.getElementById('voicePillTime');
        if (timeEl) timeEl.textContent = '0:00';
        const capEl = document.getElementById('voicePillCap');
        if (capEl) { capEl.textContent = ''; capEl.classList.remove('visible'); }
        pill.classList.add('show');
        requestAnimationFrame(() => pill.classList.add('visible'));
        _vn.glowAnim = _micGlow(stream, pill);
      }
      document.getElementById('voiceNoteBtn')?.classList.add('live');
      const voiceBtn = document.getElementById('voiceNoteBtn');
      if (voiceBtn) { voiceBtn.setAttribute('aria-pressed', 'true'); voiceBtn.setAttribute('aria-label', 'Stop voice note recording'); }
    }

    function _voiceNoteStop() {
      if (!_vn) return;
      _vn.glowAnim?.stop();
      clearInterval(_vn.timerId);
      _vn.recorder.stop();
      // Pill hide + state clear happen in the 'stop' event handler
    }

    async function _voiceNoteSend(blob, mimeType) {
      const input = document.getElementById('newTask');
      if (!input) return;

      // Show "…" while transcribing
      const prev = input.value;
      input.value = '…';
      input.disabled = true;

      const reader = new FileReader();
      reader.onload = async function() {
        const base64 = reader.result.split(',')[1];
        try {
          const res = await fetch('/.netlify/functions/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioData: base64, mimeType, apiKey: Today.use('connections')._aiGetKey('gemini') }),
          });
          const data = await res.json();
          input.value = data.text || prev;
        } catch (e) {
          input.value = prev;
        }
        input.disabled = false;
        toggleClearBtn();
      };
      reader.readAsDataURL(blob);
    }

    if (window.Today) {
      Today.define('meeting', {
        _getUserNames,
        _meetingUpdateCount,
        toggleMeeting,
        _meetingStop,
        renderMeetingNames,
        addMeetingName,
        removeMeetingName,
        _meetingNamePromptKey,
        _meetingNamePromptSubmit,
        _meetingAccept,
        _meetingDiscard,
        _meetingInit,
        _meetingHealthCheck,
        toggleVoiceNote,
        _voiceNoteStop,
        _voiceNoteInit,
      });
      Today.ui.register('click', 'meeting.toggle', toggleMeeting);
      Today.ui.register('click', 'meeting.stop', _meetingStop);
      Today.ui.register('click', 'meeting.toggle-voice', toggleVoiceNote);
      Today.ui.register('click', 'meeting.stop-voice', _voiceNoteStop);
      Today.ui.register('keydown', 'meeting.name-key', _meetingNamePromptKey);
      Today.ui.register('click', 'meeting.name-submit', _meetingNamePromptSubmit);
      Today.ui.register('click', 'meeting.accept', _meetingAccept);
      Today.ui.register('click', 'meeting.discard', _meetingDiscard);
      Today.ui.register('click', 'meeting.remove-name', (_event, button) => removeMeetingName(Number(button.dataset.nameIndex)));
      Today.ui.register('keydown', 'meeting.add-name-key', event => {
        if (event.key === 'Enter' || event.key === ',') {
          event.preventDefault();
          addMeetingName();
        }
      });
      Today.ui.register('focusout', 'meeting.add-name', addMeetingName);
      Today.ui.register('click', 'meeting.toggle-item', (_event, button) => {
        button.classList.toggle('selected');
        button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
        _meetingUpdateCount();
      });
    }

    // Compatibility exports used by startup and integration tests.
  };
})();
