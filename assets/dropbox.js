// TODAY — Dropbox auth, backup/restore, live sync cluster, and state helpers.
// Inert until index.html calls window._startDropbox() before init().
// _appReady stays as an inline global — assets/splash.js writes it as a bare identifier.
(function() {
  'use strict';
  let started = false;
  window._startDropbox = function() {
    if (started) return;
    started = true;
    // One file per environment — dev and prod never share data
    const _env         = window.location.hostname === 'today-here.netlify.app' ? '' : '-' + window.location.hostname.split('--')[0];
    const DROPBOX_FILE = `/today-backup${_env}.json`;

    let dropboxSaveTimer  = null;
    // Persisted to localStorage so offline mutations survive page reload
    // Updated on every local mutation — not just successful Dropbox writes
    const _getLastLocalChange  = () => localStorage.getItem('last_local_change') || null;
    const _setLastLocalChange  = ()  => localStorage.setItem('last_local_change', new Date().toISOString());

    // ── Deleted IDs: {id, at} — explicit delete tracking for union merge ──────────
    const _getTrelloFocus = () => safeJSON('today_trello_focus', {});
    const _setTrelloFocus = (map) => {
      localStorage.setItem('today_trello_focus', JSON.stringify(map));
      localStorage.setItem('today_trello_focus_date', _getAppDay());
    };
    // Lifetime session totals per Trello card — persists across days, never date-wiped.
    // The daily focus map (_getTrelloFocus) handles the activity/un-dim signal (BUG-043/064);
    // this total map is the display count and AI context source.
    const _getTrelloFocusTotal = () => safeJSON('today_trello_focus_total', {});
    const _setTrelloFocusTotal = (map) => localStorage.setItem('today_trello_focus_total', JSON.stringify(map));

    // Trello first-seen: {trello_<id>: firstSeenMs}. Age basis so a card ages from when it entered
    // YOUR list, not its Trello creation date (BUG-049). Persists across days (NOT daily-reset like
    // focus) and syncs via MIN-merge (earliest sighting wins). Fallback "now" = treat unseen as fresh.
    const _getTrelloFirstSeen = () => safeJSON('today_trello_firstseen', {});
    const _setTrelloFirstSeen = (map) => localStorage.setItem('today_trello_firstseen', JSON.stringify(map));
    // Trello last-active: {trello_<id>: ms}. The Trello analogue of a manual task's
    // `lastActive` field — focus activity pushes it forward so the card genuinely un-ages
    // (BUG-064). Kept SEPARATE from first-seen on purpose: first-seen MIN-merges (earliest
    // sighting wins, that's its meaning), so writing activity into it would be reverted by
    // any device still holding the older timestamp. This map MAX-merges instead, matching
    // how manual tasks already reconcile `lastActive` in mergeRemoteData().
    const _getTrelloLastActive = () => safeJSON('today_trello_lastactive', {});
    const _setTrelloLastActive = (map) => localStorage.setItem('today_trello_lastactive', JSON.stringify(map));
    const _markTrelloActive = (id) => {
      const m = _getTrelloLastActive();
      m[id] = Date.now();
      _setTrelloLastActive(m);
    };

    // Age basis mirrors the manual path (`task.lastActive || created`): activity first,
    // else when the card entered your list, else treat as fresh.
    const _trelloAgeBasis = (id) =>
      _getTrelloLastActive()[id] || _getTrelloFirstSeen()[id] || Date.now();

    const _getDeletedIds = () => safeJSON('today_deleted_ids', []);
    const _addDeletedId  = (id) => {
      // Safety: Don't mark as deleted if task exists in SOON or PAST zones
      if (soonTasks.some(t => t.id === id) || pastTasks.some(t => t.id === id)) {
        console.warn('[TODAY] Blocked deletion of task in zone:', id);
        return;
      }
      const existing = _getDeletedIds().filter(d => d.id !== id);
      existing.push({ id, at: new Date().toISOString() });
      localStorage.setItem('today_deleted_ids', JSON.stringify(existing));
    };

    // Clean up deleted_ids that incorrectly contain zone task IDs
    const _cleanupDeletedIds = () => {
      const zoneIds = new Set([
        ...soonTasks.map(t => t.id),
        ...pastTasks.map(t => t.id)
      ]);
      const deleted = _getDeletedIds();
      // 180-day TTL — long enough that any realistically-offline device syncs first
      // (BUG-054: the old 30-day TTL let stale devices resurrect deleted tasks).
      // Entries ride every backup payload, so they can't persist forever.
      const cutoff = Date.now() - (180 * 24 * 60 * 60 * 1000);

      // Remove entries that: (1) match zone tasks, OR (2) are older than 180 days
      let cleaned = deleted.filter(d => {
        if (zoneIds.has(d.id)) return false; // in a zone — shouldn't be in deleted
        if (d.at && new Date(d.at).getTime() < cutoff) return false; // too old
        return true;
      });

      // Backstop against pathological growth: keep only the newest 2000 tombstones
      if (cleaned.length > 2000) {
        cleaned = cleaned.sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 2000);
      }

      if (cleaned.length !== deleted.length) {
        console.log('[TODAY] Cleaned', deleted.length - cleaned.length, 'stale deleted_ids');
        localStorage.setItem('today_deleted_ids', JSON.stringify(cleaned));
      }
    };

    // Purge habit_events older than 30 days — called from applyNewDayCleanup
    function _cleanupHabitEvents() {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      let changed = false;
      Object.keys(habitEvents).forEach(key => {
        if (habitEvents[key].at < cutoff) { delete habitEvents[key]; changed = true; }
      });
      if (changed) localStorage.setItem('today_habit_events', JSON.stringify(habitEvents));
    }

    // ── Unchecked IDs: {id, at} — explicit uncheck tracking ───────────────────────
    const _getUncheckedIds = () => safeJSON('today_unchecked_ids', []);
    const _addUncheckedId  = (id) => {
      const existing = _getUncheckedIds().filter(u => u.id !== id);
      existing.push({ id, at: new Date().toISOString() });
      localStorage.setItem('today_unchecked_ids', JSON.stringify(existing));
    };
    const _removeUncheckedId = (id) => {
      localStorage.setItem('today_unchecked_ids', JSON.stringify(_getUncheckedIds().filter(u => u.id !== id)));
    };

    // ── Checked IDs: {id, at} — check timestamps so uncheck can be compared ───────
    const _getCheckedIds = () => safeJSON('today_checked_ids', []);
    const _addCheckedId  = (id) => {
      const existing = _getCheckedIds().filter(c => c.id !== id);
      existing.push({ id, at: new Date().toISOString() });
      localStorage.setItem('today_checked_ids', JSON.stringify(existing));
    };
    const _removeCheckedId = (id) => {
      localStorage.setItem('today_checked_ids', JSON.stringify(_getCheckedIds().filter(c => c.id !== id)));
    };

    // Done-today count — DERIVED from today_checked_ids rather than a monotonic counter.
    // The old stat_tasks_done_today only ever incremented (never decremented on uncheck) and
    // merged cross-device via Math.max, so check/uncheck/re-check cycles and two synced devices
    // inflated it without bound ("blew up"). checked_ids holds one {id, at} per task and merges
    // by timestamp union, so deriving the count is self-correcting and coherent across devices.
    // Counts tasks whose check timestamp is on the given local day (default today) AND whose
    // check is the *winning* op — not superseded by a later uncheck. The uncheck guard matters
    // on the sync path: mergeRemoteData persists the checked/unchecked maps as a plain union
    // (it tracks "done" separately via most-recent-wins), so a stale check entry can outlive an
    // uncheck; this mirrors that most-recent-wins logic. Retired the counter v2.18.21.
    const _doneTodayCount = (dayISO) => {
      const day = dayISO || _localISO();
      const unchecked = new Map(_getUncheckedIds().map(u => [u.id, u.at]));
      return _getCheckedIds().filter(c => {
        if (!c.at || _localISO(new Date(c.at)) !== day) return false;
        const uAt = unchecked.get(c.id); // map value IS the uncheck timestamp string
        return !uAt || c.at > uAt; // check is the most-recent op (ISO strings compare correctly)
      }).length;
    };

    // ── UI helpers ────────────────────────────────────────────────────────────────
    function getDropboxAppKey() {
      if (DROPBOX_APP_KEY) return DROPBOX_APP_KEY;
      const saved = localStorage.getItem('dropbox_app_key') || '';
      const input = document.getElementById('dropboxAppKey');
      return (input && input.value.trim()) || saved;
    }

    function dropboxShowMsg(msg, type) {
      showStatus(msg, type);
    }

    // ── PKCE helpers ──────────────────────────────────────────────────────────────
    function _generateVerifier() {
      const arr = new Uint8Array(48);
      crypto.getRandomValues(arr);
      return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    }
    async function _generateChallenge(verifier) {
      const data   = new TextEncoder().encode(verifier);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
    }

    async function dropboxAuth() {
      const appKey = (getDropboxAppKey() || '').trim();
      if (!appKey) { dropboxShowMsg('Enter your App Key first.', 'error'); return; }

      // Open popup synchronously first — iOS Safari blocks window.open after any await
      const popup = window.open('about:blank', 'dropbox_auth', 'width=600,height=700,left=200,top=100');

      const verifier    = _generateVerifier();
      const challenge   = await _generateChallenge(verifier);
      const redirectUri = window.location.origin + '/';
      const _stateArr   = new Uint8Array(16);
      crypto.getRandomValues(_stateArr);
      const state       = Array.from(_stateArr, b => b.toString(16).padStart(2, '0')).join('');

      sessionStorage.setItem('dbx_verifier',     verifier);
      sessionStorage.setItem('dbx_redirect_uri', redirectUri);
      sessionStorage.setItem('dbx_state',        state);

      const authUrl = 'https://www.dropbox.com/oauth2/authorize'
        + '?client_id='            + encodeURIComponent(appKey)
        + '&response_type=code'
        + '&token_access_type=offline'
        + '&code_challenge='       + encodeURIComponent(challenge)
        + '&code_challenge_method=S256'
        + '&redirect_uri='         + encodeURIComponent(redirectUri)
        + '&state='                + encodeURIComponent(state);

      // Now redirect the already-open popup to the auth URL
      if (popup) { popup.location.href = authUrl; }
      else { dropboxShowMsg('Popup blocked — please allow popups for this site.', 'error'); return; }

      const poll = setInterval(async function() {
        try {
          if (!popup || popup.closed) { clearInterval(poll); return; }
          const search = popup.location.search || '';
          if (search.includes('code=')) {
            clearInterval(poll);
            const params      = new URLSearchParams(search);
            const code        = params.get('code');
            const returnState = params.get('state');
            const err         = params.get('error_description') || params.get('error');
            popup.close();
            if (err)   { dropboxShowMsg('Dropbox error: ' + err, 'error'); return; }
            if (!code) { dropboxShowMsg('No code received — check App Key and redirect URI.', 'error'); return; }
            if (returnState !== sessionStorage.getItem('dbx_state')) {
              dropboxShowMsg('State mismatch — possible CSRF. Try again.', 'error'); return;
            }
            await _dropboxExchangeCode(code);
          } else if (search.includes('error=')) {
            clearInterval(poll);
            popup.close();
            const params = new URLSearchParams(search);
            dropboxShowMsg('Dropbox error: ' + (params.get('error_description') || params.get('error') || 'Unknown'), 'error');
          }
        } catch(e) { /* cross-origin — still on dropbox.com, keep polling */ }
      }, 500);
    }

    async function _dropboxExchangeCode(code) {
      const verifier    = sessionStorage.getItem('dbx_verifier');
      const redirectUri = sessionStorage.getItem('dbx_redirect_uri');
      sessionStorage.removeItem('dbx_verifier');
      sessionStorage.removeItem('dbx_redirect_uri');
      sessionStorage.removeItem('dbx_state');

      dropboxShowMsg('Connecting…', 'success');
      try {
        const res  = await fetch('/.netlify/functions/dropbox-token', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri }),
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch(e) {
          dropboxShowMsg('Connection failed: ' + (text || res.status), 'error'); return;
        }
        if (!res.ok) { dropboxShowMsg('Connection failed: ' + (data.error || res.status), 'error'); return; }

        localStorage.setItem('dropbox_token',         data.access_token);
        localStorage.setItem('dropbox_refresh_token', data.refresh_token);
        localStorage.setItem('dropbox_token_expiry',  String(Date.now() + (data.expires_in - 60) * 1000));
        localStorage.removeItem('dropbox_token_expired');
        _setLastLocalChange();
        renderConnections();
        showStatus('Dropbox connected', 'success');
        // Fresh install: no local data — try to restore from existing Dropbox backup first.
        // Reconnect with local data: save current state (sync ticker will merge differences).
        const _hasLocalData = manualTasks.length > 0 || habitsList.length > 0 || soonTasks.length > 0 || pastTasks.length > 0;
        if (_hasLocalData) {
          dropboxAutoSave();
        } else {
          try {
            const _probe = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('dropbox_token')}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: DROPBOX_FILE }),
            });
            if (_probe.ok) {
              await dropboxRestore(false);
            } else {
              dropboxAutoSave();
            }
          } catch(_e) {
            dropboxAutoSave();
          }
        }
      } catch(e) {
        showStatus('Connection failed: ' + (e.message || 'unknown'), 'error');
      }
    }

    // Silently refreshes access token if expired — called before every API request
    async function _dropboxEnsureToken() {
      const expiry       = parseInt(localStorage.getItem('dropbox_token_expiry') || '0');
      const refreshToken = localStorage.getItem('dropbox_refresh_token');
      if (!refreshToken) return; // legacy token — no refresh possible
      if (Date.now() < expiry)  return; // still valid

      // Retry once on failure — Netlify cold starts can cause first fetch to timeout (BUG-003)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch('/.netlify/functions/dropbox-refresh', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ refresh_token: refreshToken }),
          });
          // Netlify's own platform (not our function — it always returns JSON, checked)
          // can return a plain-text error page on a timeout/crash. res.json() then
          // throws a cryptic "Unexpected token" SyntaxError instead of a clear message.
          // Read as text first so a non-JSON body falls through to the retry path below
          // (the transient-failure case the retry already exists for) with a readable
          // error, instead of crashing on the parse itself.
          const raw = await res.text();
          let data;
          try { data = JSON.parse(raw); }
          catch (e) { throw new Error(`HTTP ${res.status} — ${raw.slice(0, 60) || res.statusText || 'non-JSON response'}`); }
          if (!res.ok) {
            // Clean rejection from Dropbox itself (e.g. revoked/invalid refresh token) —
            // retrying won't fix an auth failure, mark expired immediately, no retry.
            localStorage.setItem('dropbox_token_expired', '1');
            renderConnections();
            return;
          }
          localStorage.setItem('dropbox_token',        data.access_token);
          localStorage.setItem('dropbox_token_expiry', String(Date.now() + (data.expires_in - 60) * 1000));
          localStorage.removeItem('dropbox_token_expired');
          renderConnections();
          return; // success — exit loop
        } catch(e) {
          _logSyncError('Dropbox', 'Token refresh attempt ' + (attempt + 1) + ': ' + e.message);
          if (attempt === 0) await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
        }
      }
      // Both attempts failed (transient/non-JSON failures only — a clean auth rejection
      // above already returned) — mark expired so Connections reflects reality instead
      // of silently retrying sync against a token that's actually dead.
      localStorage.setItem('dropbox_token_expired', '1');
      renderConnections();
    }

    // ── Auto-save (debounced, called after every user action that changes state) ──
    let _pendingBackup  = false; // Track if there's an unsaved change
    let _backupAttempt  = 0;     // Retry counter for exponential backoff

    function _scheduleBackup(delay) {
      clearTimeout(dropboxSaveTimer);
      dropboxSaveTimer = setTimeout(async () => {
        const token = localStorage.getItem('dropbox_token');
        if (!token) return; // token revoked — give up silently, ticker will re-auth on next change
        const success = await dropboxBackup(true);
        if (success) {
          _pendingBackup = false;
          _backupAttempt = 0;
        } else {
          // Backup failed — retry with exponential backoff so _pendingBackup
          // doesn't stay true forever and block sync pulls indefinitely.
          // Delays: 2s, 5s, 15s, 30s, 30s, 30s... (cap at 30s, retry forever)
          _backupAttempt++;
          const delays = [2000, 5000, 15000, 30000];
          const nextDelay = delays[Math.min(_backupAttempt - 1, delays.length - 1)];
          _scheduleBackup(nextDelay);
        }
      }, delay);
    }

    function dropboxAutoSave() {
      const token = localStorage.getItem('dropbox_token');
      if (!token) return;
      _pendingBackup = true;
      _backupAttempt = 0; // Reset — new user change, start fresh
      _scheduleBackup(800);
    }

    // Retry pending backup when tab becomes visible
    let _lastWakeTime = 0; // debounce guard for _onWake double-fire (visibilitychange + window.focus)

    // ─── _onWake — unified wake sequence ─────────────────────────────────────────
    // Called by the Dropbox sync module's visibilitychange handler (which has the
    // right closure variables for sync). Handles repaint, focus cleanup, and triage.
    // Do NOT add a second visibilitychange listener here — let the sync module call this.
    window._onWake = function() {
      if (!_appReady) return; // Skip during initial page load — window.focus fires on PWA open
      // Debounce: visibilitychange and window.focus both fire on desktop PWA restore within ~50ms
      // of each other. Without this, _onWake runs twice — doubling all repaint passes and timers.
      // 200ms covers the same-event-cluster case; a genuine rapid wake-sleep-wake still passes
      // through after >200ms. (discovered during _onWake redundancy audit)
      const _now = Date.now();
      if (_now - _lastWakeTime < 200) return;
      _lastWakeTime = _now;
      // Force repaint — PWA standalone defers painting after sleep/wake. (BUG-004)
      // After a long sleep the GPU compositor layers may not be ready synchronously.
      // Run repaint immediately, on next rAF (GPU more likely ready), and after 500ms.
      // Clicking also restores it (user-interactive paints are prioritised) — these
      // deferred passes replicate that urgency without requiring user interaction.
      // All looping animations are WAAPI (_breathe / _pulseComplete) — their timelines
      // survive the display toggles below, so no suppress/restore machinery is needed.
      // (BUG-028 history: CSS animations restart from keyframe 0 on every toggle;
      // four sub-fixes of suppress/restore tuning could only move the flash, never
      // remove it. WAAPI removed it. The machinery was deleted in v2.17.103.)
      // The one survivor: .config-panel.open's slide-up is a ONE-SHOT CSS animation
      // that would replay on each pass (panels visibly flash, BUG-023) — suppress it;
      // it's restored when the user next opens a panel.
      function _forceRepaint() {
        if (document.visibilityState === 'hidden') return; // re-slept before this pass fired
        const appEl = document.getElementById('main-app');
        if (!appEl) return;
        // Save scroll positions of all scrollable children before display:none
        // which resets scroll to 0. Restore after display:''.
        const scrollEls = appEl.querySelectorAll('[id$="List"], #main-app');
        const scrollPositions = Array.from(scrollEls).map(el => ({ el, top: el.scrollTop }));
        const appScroll = window.scrollY;
        appEl.style.display = 'none';
        void appEl.offsetHeight;
        appEl.style.display = '';
        appEl.querySelectorAll('.config-panel.open').forEach(el => { el.style.animation = 'none'; });
        scrollPositions.forEach(({ el, top }) => { el.scrollTop = top; });
        window.scrollTo(0, appScroll);
      }
      // Re-anchor focused task and correct its viewport position after repaint.
      // BUG-071: blank screen also occurs when PWA returns from background (not only after
      // long sleep). Re-anchoring ensures .focused re-attaches after sync re-renders the DOM.
      // Viewport correction handles body.position:fixed scroll drift on wake.
      function _wakeFocusCheck() {
        if (!window._focusUIActive) return;
        if (typeof window._focusReanchor === 'function') window._focusReanchor();
        const focused = document.querySelector('#main-app .task.focused');
        if (!focused) return;
        const rect = focused.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.top >= -8 && rect.bottom <= vh + 8) return; // already in view
        // During focus mode body is position:fixed — adjust body.top to re-center the task.
        const savedScrollY = parseInt(document.body.dataset.scrollY || '0');
        const drift = rect.top - (vh / 2 - focused.offsetHeight / 2);
        const newScrollY = Math.max(0, savedScrollY + drift);
        document.body.style.top = `-${newScrollY}px`;
        document.body.dataset.scrollY = String(newScrollY);
      }
      _forceRepaint(); _wakeFocusCheck();
      requestAnimationFrame(() => {
        _forceRepaint(); _wakeFocusCheck();
        requestAnimationFrame(() => { _forceRepaint(); _wakeFocusCheck(); });
      });
      // Extra passes for slow GPU wakeup after long sleep (BUG-004/056/071).
      // Mac GPU re-init can take >5s after hours of sleep; extended to 12s.
      // Also covers PWA-backgrounded returns where GPU compositor layers go stale.
      [500, 1500, 3000, 5000, 8000, 12000].forEach(ms =>
        setTimeout(() => { _forceRepaint(); _wakeFocusCheck(); }, ms)
      );

      // Clear single-play animation classes that may be mid-flight at sleep time.
      // Removing the class cancels cleanly; the animation will re-play on next trigger.
      const _wakeEl = document.getElementById('main-app');
      if (_wakeEl) {
        _wakeEl.querySelectorAll('.task-slide-in').forEach(el => el.classList.remove('task-slide-in'));
        _wakeEl.querySelectorAll('.task.removing').forEach(el => el.classList.remove('removing'));
        _wakeEl.querySelectorAll('.just-checked').forEach(el => el.classList.remove('just-checked'));
        _wakeEl.querySelectorAll('.milestone-pulse').forEach(el => el.classList.remove('milestone-pulse'));
        _wakeEl.querySelectorAll('.dot-ripple').forEach(el => el.classList.remove('dot-ripple'));
        const _emptyFading = _wakeEl.querySelector('#manualEmpty.fading-in');
        if (_emptyFading) _emptyFading.classList.remove('fading-in');
      }

      // Clear stale .focusing — three checks:
      // 1. Immediate: covers clean sleep/wake where .focused was never set
      // 2. Deferred 350ms: covers async Dropbox sync gap — renderManual() destroys
      //    .focused element, _focusReanchor re-attaches moments later. During that
      //    gap .focusing is on but nothing is .focused → everything at 7% → blank. (BUG-004)
      // 3. Deferred 1000ms: catches late renders after Dropbox/Trello sync completes
      function _clearStaleFocusing() {
        // If focus mode is still active, _focusReanchor may not have re-attached .focused yet
        // (sync can trigger renderManual between our checks). Don't remove .focusing prematurely.
        if (window._focusUIActive) return;
        const appEl = document.getElementById('main-app');
        if (appEl && appEl.classList.contains('focusing') && !appEl.querySelector('.focused')) {
          appEl.classList.remove('focusing');
          console.log('[TODAY] Cleared stale .focusing class on wake');
        }
      }
      _clearStaleFocusing();
      setTimeout(_clearStaleFocusing, 350);
      setTimeout(_clearStaleFocusing, 1000);

      // Check morning nudge — only called in init() normally, so returning users
      // after overnight don't see it without this. Nudge has its own hour < 12 guard.
      if (typeof checkDayNudge === 'function') checkDayNudge();

      // Cold-start memory abstraction — once per day if triage hasn't already triggered it.
      if (typeof _localISO === 'function' && appMemory?.memory?._lastAbstractDate !== _localISO()) {
        if (typeof window._memoryAbstract === 'function') window._memoryAbstract();
      }

      // Triage silent window — prevents ticker showing bar before sync settles. (BUG-001)
      _setTriageBarSilent(true);
      setTimeout(() => {
        _setTriageBarSilent(false);
        triageDismissedToday = localStorage.getItem('triage_dismissed') === _getAppDay();
        checkTriageBar();
      }, 3000);

      // Retry pending backup — route through _scheduleBackup to share timer. (BUG-002)
      if (_pendingBackup) {
        const token = localStorage.getItem('dropbox_token');
        if (token) _scheduleBackup(1000);
      }

      // Re-apply offline state — navigator.onLine may have changed while sleeping.
      if (typeof _applyOfflinePanel === 'function') _applyOfflinePanel();
    };

    // PWA standalone may not always fire visibilitychange on window restore —
    // window focus is a reliable fallback for forced repaint (BUG-004) and sync (BUG-002)
    window.addEventListener('focus', () => {
      // PWA may not always fire visibilitychange on window restore — this is a fallback.
      // Trigger sync if available
      if (window._dbxResetRev) window._dbxResetRev();
      if (window._setWakeSyncSilent) window._setWakeSyncSilent(true);
      if (window._dbxSyncNow) window._dbxSyncNow();
      setTimeout(() => { if (window._setWakeSyncSilent) window._setWakeSyncSilent(false); }, 3000);
      // Unified wake handler — repaint, focus cleanup, triage, pending backup
      if (window._onWake) window._onWake();
    });

    // ── Per-day dismissable surfaces (sync registry) ──────────────────────────────
    // One row drives BOTH the backup payload field and the mergeRemoteData block —
    // BUG-051 and BUG-053 each happened because one of those two touchpoints was
    // forgotten for one nudge. A new dismissable surface (e.g. a future digest card)
    // is one row here; payload and merge follow automatically.
    // Model: localStorage key `<prefix>YYYY-MM-DD` (local day, _localISO), value '1';
    // payload carries '1' if dismissed today else ''. No full-restore handling needed —
    // the next 7s merge tick applies it (BUG-051 decision).
    // Triage dismissal is intentionally NOT here: different model (single key holding
    // the app-day string, plus the triageDismissedToday global and two elements) —
    // migrating it would be a backup-schema change with no user payoff.
    const _DISMISS_SYNC = [
      { field: 'day_nudge_dismissed', prefix: 'day_nudge_dismissed_', el: 'dayNudge' }, // v2.19.0 unified nudge
      // Legacy fields (pre-2.19.0 devices): their dismiss hides the unified nudge here,
      // and our payload carries today's value back under the old names so their two
      // nudges hide too. Remove once all devices are past 2.19.0.
      { field: 'trello_nudge_dismissed',  prefix: 'day_nudge_dismissed_', el: 'dayNudge' }, // BUG-051
      { field: 'morning_nudge_dismissed', prefix: 'day_nudge_dismissed_', el: 'dayNudge' }, // BUG-053
      { field: 'sunday_nudge_seen', prefix: 'sunday_nudge_seen_', el: '' },                 // BUG-073 Fix 8
    ];

    // ── Backup ────────────────────────────────────────────────────────────────────
    async function dropboxBackup(silent) {
      await _dropboxEnsureToken();
      const token = localStorage.getItem('dropbox_token');
      if (!token) { if (!silent) dropboxShowMsg('Not connected. Click Connect Dropbox first.', 'error'); return false; }
      if (!silent) dropboxShowMsg('Saving backup…', 'success');

      const now = new Date().toISOString();
      const data = {
        version:      '5.5', // 5.5: + reflection_policy, reflections, reflections_cleared_at
        saved_at:     now,
        manual_tasks:      safeJSON('today_manual', []),
        done_ids:          safeJSON('today_done',   []),
        deleted_ids:       _getDeletedIds(),
        unchecked_ids:     _getUncheckedIds(),
        checked_ids:       _getCheckedIds(),
        manual_order_at:   localStorage.getItem('today_manual_order_at') || '', // recency for manual reorder merge (drag jump-back)
        trello_config:     (function() { const tc = safeJSON('trello_config', {}); delete tc.apiToken; return tc; }()),
        // Trello order — synced so drag order persists across devices
        trello_order:      safeJSON('today_trello_order', []),
        trello_order_at:   localStorage.getItem('today_trello_order_at') || '', // recency for merge (BUG-042)
        today_trello_focus:       safeJSON('today_trello_focus', {}),
        today_trello_focus_date:  localStorage.getItem('today_trello_focus_date') || '',
        today_trello_focus_total: safeJSON('today_trello_focus_total', {}), // MAX-merge, no date guard
        today_trello_firstseen:  safeJSON('today_trello_firstseen', {}), // MIN-merge, no date guard (BUG-049)
        today_trello_lastactive: safeJSON('today_trello_lastactive', {}), // MAX-merge, no date guard (BUG-064)
        // Zones — SOON and PAST (v5.0)
        soon_tasks:        safeJSON('today_soon', []),
        past_tasks:        safeJSON('today_past', []),
        // Stats — synced cross-device (flow rate is calculated live, not stored)
        stat_focus_mins_today:  localStorage.getItem('stat_focus_mins_today')  || '0',
        stat_focus_mins_date:   localStorage.getItem('stat_focus_mins_date')  || '',
        stat_streak:            localStorage.getItem('stat_streak')            || '1',
        stat_streak_date:       localStorage.getItem('stat_streak_date')       || '',
        // Done-today count is no longer a stored stat — it derives from checked_ids (above),
        // which already syncs. Retired stat_tasks_done_today / _date here v2.18.21.
        // Habits — persisted cross-device
        habits:               safeJSON('today_habits',            []),
        habit_completions:    safeJSON('today_habit_completions', {}),
        habit_events:         habitEvents,
        deleted_habit_ids:    safeJSON('today_deleted_habit_ids', []),
        // Memory — AI's learned patterns and moments
        memory:               safeJSON('today_memory', null),
        // Triage history — AI learns from past decisions
        triage_history:       safeJSON('today_triage_history', []),
        // Triage dismissed — synced so triage doesn't re-prompt on other devices
        triage_dismissed:        localStorage.getItem('triage_dismissed') || '',
        // Per-day nudge dismiss flags (BUG-051/053) — fields driven by _DISMISS_SYNC,
        // the same registry that applies them in mergeRemoteData
        ...Object.fromEntries(_DISMISS_SYNC.map(d => [d.field, localStorage.getItem(d.prefix + _localISO()) || ''])),
        // Day review + AI nudge — sync so morning nudge shows consistently across devices.
        // Fill-if-empty on merge: first device to compute wins for the day.
        day_review:   safeJSON('today_day_review', null),
        day_nudge_ai: localStorage.getItem('day_nudge_ai_' + _localISO()) || '',
        // Sunday reflection / Monday intention in About — same cross-device story as
        // day_nudge_ai (BUG-057): without sync each device generates its own AI text
        week_reflection:  localStorage.getItem('week_reflection_'  + _localISO()) || '',
        week_reflection_policy: localStorage.getItem('week_policy_' + _localISO()) || '',
        monday_intention: localStorage.getItem('monday_intention_' + _localISO()) || '',
        // Week theme for Noticed (v2.39.0) — same cross-device story, keyed per calendar
        // week rather than per day (Sunday/Monday-only surfaces use _localISO(); this
        // one needs to stay stable across all 7 days of the week it was generated in).
        week_theme_ai: localStorage.getItem('week_theme_ai_' + (_localISO().slice(0, 8) + Math.ceil(new Date().getDate() / 7))) || '',
        // Daily history — per-day snapshots the week grid reads for past days (v5.3, BUG-036).
        // Union-merged by date on restore so the week view matches across devices.
        daily_history:        safeJSON('today_daily_history', []),
        // User's name(s) — meeting mode attribution. Primary name in user_name for compat; full list in user_names.
        user_name:            _getUserNames()[0] || '',
        user_names:           _getUserNames(),
        user_names_at:        localStorage.getItem('user_names_at') || '',
        // stat_last_visit intentionally excluded — it's local device state, meaningless on another device
        // Reflections — opt-in evening feelings; today_reflection_intro_seen_at intentionally excluded (local-only)
        ...(typeof window._reflectionBackupFields === 'function' ? window._reflectionBackupFields() : {}),
      };

      try {
        const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization':    `Bearer ${token}`,
            'Content-Type':     'application/octet-stream',
            'Dropbox-API-Arg':  JSON.stringify({ path: DROPBOX_FILE, mode: 'overwrite', autorename: false, mute: true }),
          },
          body: JSON.stringify(data),
        });

        if (res.status === 401) {
          if (silent) {
            // Mark token as expired so UI reflects reality
            localStorage.setItem('dropbox_token_expired', '1');
            renderConnections();
            return false;
          }
          localStorage.removeItem('dropbox_token');
          localStorage.removeItem('dropbox_token_expired');
          renderConnections();
          dropboxShowMsg('Session expired — please reconnect.', 'error'); renderConnections();
          return false;
        }
        if (!res.ok) throw new Error(`Dropbox ${res.status}`);

        // Record when we last wrote so background sync can reject older remote files
        localStorage.setItem('last_local_change', now);
        localStorage.setItem('last_successful_backup', now);
        localStorage.removeItem('dropbox_token_expired');
        if (window._dbxSetRev) {
          // Update rev baseline so next sync tick doesn't re-trigger on our own write
          try {
            const meta = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
              method:  'POST',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: DROPBOX_FILE }),
            });
            if (meta.ok) { const m = await meta.json(); if (m && m.rev) window._dbxSetRev(m.rev); }
          } catch(e) { /* non-critical */ }
        }

        const label = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        if (!silent) dropboxShowMsg(`Backup saved at ${label} ✓`, 'success');
        return true;

      } catch(e) {
        console.log('[Dropbox] Backup failed:', e.message);
        if (!silent) dropboxShowMsg('Backup failed: ' + (e.message || 'unknown error'), 'error');
        return false;
      }
    }

    // ── Merge-anomaly log — silent console breadcrumb, NOT an error ──────────────
    // Fires when union merge had to discard one device's intent (a true concurrent
    // change to the same task since the last sync read). The merge itself succeeded,
    // so this never touches the red dot — it's a debug-only trace of how often the
    // theoretical "unhandled 1%" of conflicts actually happens. Console-only.
    function _logMergeAnomaly(kind, id, detail) {
      console.warn('[merge-anomaly] ' + kind + ' on ' + id, detail);
    }

    // ── Daily history union merge (BUG-036) — the week grid reads per-day snapshots from
    // today_daily_history, which used to be local-only, so each device snapshotted its own
    // days at midnight and the week view diverged across devices. Union by date; on duplicate
    // dates merge per-field with Math.max so neither device's data is silently discarded.
    // Cap 30 days.
    function _mergeDailyHistory(localArr, remoteArr) {
      const byDate = new Map();
      for (const e of (Array.isArray(localArr)  ? localArr  : [])) { if (e && e.date) byDate.set(e.date, e); }
      for (const e of (Array.isArray(remoteArr) ? remoteArr : [])) {
        if (!e || !e.date) continue;
        const cur = byDate.get(e.date);
        if (!cur) { byDate.set(e.date, e); continue; }
        byDate.set(e.date, {
          date:        e.date,
          tasksDone:   Math.max(cur.tasksDone   || 0, e.tasksDone   || 0),
          // tasksAdded: per-day delta only — values above 100 are cumulative artifacts
          // (the v2 migration zeroes them locally, but a sync from the other device can
          // restore large values via Math.max before that device has run the migration).
          // _sa() treats any value > 100 as 0 so the merge stays clean on both sides.
          tasksAdded: (function() {
            const _sa = v => (v || 0) > 100 ? 0 : (v || 0);
            const _a = _sa(cur.tasksAdded), _b = _sa(e.tasksAdded);
            if (cur.tasksAddedFixed && e.tasksAddedFixed) return Math.max(_a, _b);
            if (cur.tasksAddedFixed) return _a;
            if (e.tasksAddedFixed)   return _b;
            return Math.max(_a, _b);
          })(),
          focusMins:   Math.max(cur.focusMins   || 0, e.focusMins   || 0),
          habitsKept:  Math.max(cur.habitsKept  || 0, e.habitsKept  || 0),
          habitsTotal: Math.max(cur.habitsTotal || 0, e.habitsTotal || 0),
          ...(cur.tasksAddedFixed || e.tasksAddedFixed ? { tasksAddedFixed: true } : {}),
        });
      }
      return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    }

    // ── Core merge logic — operates on a remote data object, no timestamp guard ───
    // Called by dropboxRestore(fromSync=true) AND by the offline-reconnect path.
    // Returns true if any state changed (so caller knows whether to push back to Dropbox).
    // ── appMemory merge helper — called by both auto-sync and manual restore ─────
    // Merges a remote appMemory snapshot into the local appMemory in-place,
    // then persists via _saveMemory(). All strategies are idempotent and safe
    // to run on every 7-second sync tick.
    function _mergeAppMemory(remote) {
      if (!remote || typeof remote !== 'object') return;
      if (typeof appMemory === 'undefined' || !appMemory) return;
      // AI name: remote wins (first device to set it becomes canonical)
      if (remote.aiName) appMemory.aiName = remote.aiName;
      // Merge completionsByHour (max), then re-derive peakHour from merged data
      for (const [h, count] of Object.entries(remote.patterns?.completionsByHour || {})) {
        appMemory.patterns.completionsByHour[h] = Math.max(appMemory.patterns.completionsByHour[h] || 0, count);
      }
      { let _pk = null, _pkC = 0;
        for (const [h, c] of Object.entries(appMemory.patterns.completionsByHour)) {
          if (c > _pkC) { _pkC = c; _pk = parseInt(h); }
        }
        appMemory.preferences.peakHour = _pk;
      }
      // Merge taskKeywords (max per keyword)
      for (const [word, kd] of Object.entries(remote.patterns?.taskKeywords || {})) {
        if (!appMemory.patterns.taskKeywords[word]) appMemory.patterns.taskKeywords[word] = { completed: 0 };
        appMemory.patterns.taskKeywords[word].completed = Math.max(appMemory.patterns.taskKeywords[word].completed, kd.completed || 0);
      }
      // Max of lifetime counters
      appMemory.patterns.focusMinutesTotal = Math.max(appMemory.patterns.focusMinutesTotal, remote.patterns?.focusMinutesTotal || 0);
      appMemory.patterns.bestStreak        = Math.max(appMemory.patterns.bestStreak,        remote.patterns?.bestStreak        || 0);
      appMemory.totalTasksCompleted = Math.max(appMemory.totalTasksCompleted, remote.totalTasksCompleted || 0);
      appMemory.totalDaysActive     = Math.max(appMemory.totalDaysActive,     remote.totalDaysActive     || 0);
      // Keep the earliest firstSeen across devices — new-device init sets today, Dropbox had the real date
      if (remote.firstSeen && (!appMemory.firstSeen || remote.firstSeen < appMemory.firstSeen)) {
        appMemory.firstSeen = remote.firstSeen;
      }
      if (remote.meetingAttribution) {
        const ma = appMemory.meetingAttribution, rma = remote.meetingAttribution;
        ma.mineShown      = Math.max(ma.mineShown,      rma.mineShown      || 0);
        ma.mineKept       = Math.max(ma.mineKept,       rma.mineKept       || 0);
        ma.othersShown    = Math.max(ma.othersShown,    rma.othersShown    || 0);
        ma.othersSelected = Math.max(ma.othersSelected, rma.othersSelected || 0);
      }
      // Union of moments (dedupe by type+date)
      const existingKeys = new Set(appMemory.moments.map(m => m.type + m.date));
      for (const moment of (remote.moments || [])) {
        if (!existingKeys.has(moment.type + moment.date)) appMemory.moments.push(moment);
      }
      appMemory.moments = appMemory.moments.slice(-20);
      // Merge suggestion cooldowns (remote wins if more recent)
      for (const [id, date] of Object.entries(remote.suggestionCooldowns || {})) {
        if (!appMemory.suggestionCooldowns[id] || date > appMemory.suggestionCooldowns[id]) {
          appMemory.suggestionCooldowns[id] = date;
        }
      }
      // Merge suggestion history (union by taskId+suggested+action)
      const existingHistoryKeys = new Set((appMemory.suggestionHistory || []).map(h => h.taskId + h.suggested + h.action));
      for (const entry of (remote.suggestionHistory || [])) {
        if (!existingHistoryKeys.has(entry.taskId + entry.suggested + entry.action)) {
          appMemory.suggestionHistory.unshift(entry);
        }
      }
      if (appMemory.suggestionHistory.length > 50) appMemory.suggestionHistory = appMemory.suggestionHistory.slice(0, 50);
      // Merge recentCompletedTasks (union by text+date, 30-day window)
      if (Array.isArray(remote.recentCompletedTasks)) {
        const cutoff = new Date(Date.now() - 30 * 864e5);
        const existingRCT = new Set((appMemory.recentCompletedTasks || []).map(e => e.text + e.date));
        for (const entry of remote.recentCompletedTasks) {
          if (!existingRCT.has(entry.text + entry.date) && new Date(entry.date) > cutoff) {
            appMemory.recentCompletedTasks.push(entry);
          }
        }
        appMemory.recentCompletedTasks.sort((a, b) => a.date < b.date ? -1 : 1);
      }
      // noticedDates: earliest date wins per key (when signal first fired on any device)
      if (remote.noticedDates && typeof remote.noticedDates === 'object') {
        if (!appMemory.noticedDates) appMemory.noticedDates = {};
        for (const key of Object.keys(remote.noticedDates)) {
          const rDate = remote.noticedDates[key], lDate = appMemory.noticedDates[key];
          if (!lDate || rDate < lDate) appMemory.noticedDates[key] = rDate;
        }
      }
      // BUG-073 pattern fields — additive counters (max) and union collections
      if (remote.patterns) {
        appMemory.patterns.triageUndos   = Math.max(appMemory.patterns.triageUndos   || 0, remote.patterns.triageUndos   || 0);
        appMemory.patterns.soonPulls     = Math.max(appMemory.patterns.soonPulls     || 0, remote.patterns.soonPulls     || 0);
        appMemory.patterns.dayStartCount = Math.max(appMemory.patterns.dayStartCount || 0, remote.patterns.dayStartCount || 0);
        if (remote.patterns.dayStartDate) {
          if (!appMemory.patterns.dayStartDate || remote.patterns.dayStartDate < appMemory.patterns.dayStartDate) {
            appMemory.patterns.dayStartDate = remote.patterns.dayStartDate;
          }
        }
        if (remote.patterns.dayShapeState) appMemory.patterns.dayShapeState = remote.patterns.dayShapeState;
        for (const [k, v] of Object.entries(remote.patterns.letgoReasons  || {})) {
          appMemory.patterns.letgoReasons[k]  = Math.max(appMemory.patterns.letgoReasons[k]  || 0, v);
        }
        for (const [k, v] of Object.entries(remote.patterns.reviveReasons || {})) {
          appMemory.patterns.reviveReasons[k] = Math.max(appMemory.patterns.reviveReasons[k] || 0, v);
        }
        const _localLate  = appMemory.patterns.lateAdditions || [];
        const _remoteLate = remote.patterns.lateAdditions    || [];
        // Union by date:h — preserves entries from both devices; old plain-number entries normalized
        { const _lMap = new Map();
          for (const _e of [..._localLate, ..._remoteLate]) {
            const _n = typeof _e === 'number' ? { h: _e, date: '' } : _e;
            const _k = _n.date + ':' + _n.h;
            if (!_lMap.has(_k)) _lMap.set(_k, _n);
          }
          appMemory.patterns.lateAdditions = [..._lMap.values()]
            .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
            .slice(-50);
        }
        const mergedSamples = [...(appMemory.patterns.taskLifespanSamples || []), ...(remote.patterns.taskLifespanSamples || [])];
        appMemory.patterns.taskLifespanSamples = mergedSamples.slice(-20);
      }
      // recentConversations — union by date+message prefix, cap at 5
      if (Array.isArray(remote.recentConversations)) {
        if (!appMemory.recentConversations) appMemory.recentConversations = [];
        const seenConv = new Set(appMemory.recentConversations.map(c => c.date + '|' + (c.message || '').slice(0, 20)));
        for (const c of remote.recentConversations) {
          const key = c.date + '|' + (c.message || '').slice(0, 20);
          if (!seenConv.has(key)) { appMemory.recentConversations.push(c); seenConv.add(key); }
        }
        appMemory.recentConversations.sort((a, b) => b.date > a.date ? 1 : -1);
        appMemory.recentConversations = appMemory.recentConversations.slice(0, 5);
      }
      // BUG-073 AI inferences — union by id, dedup by text prefix
      if (remote.memory && appMemory.memory) {
        for (const type of ['semantic', 'episodic', 'procedural']) {
          if (!Array.isArray(remote.memory[type])) continue;
          if (!Array.isArray(appMemory.memory[type])) appMemory.memory[type] = [];
          const existingIds   = new Set(appMemory.memory[type].map(i => i.id));
          const existingTexts = new Set(appMemory.memory[type].map(i => (i.text || '').toLowerCase().slice(0, 8)));
          for (const item of remote.memory[type]) {
            if (!item.id || existingIds.has(item.id)) continue;
            if (existingTexts.has((item.text || '').toLowerCase().slice(0, 8))) continue;
            appMemory.memory[type].push({ ...item, isNew: false });
            existingIds.add(item.id);
            existingTexts.add((item.text || '').toLowerCase().slice(0, 8));
          }
        }
      }
      _saveMemory();
    }

    function mergeRemoteData(data) {
      let _changed = false;
      const remoteTasks     = Array.isArray(data.manual_tasks)  ? data.manual_tasks  : [];
      const remoteDone      = Array.isArray(data.done_ids)      ? data.done_ids      : [];
      const remoteDeleted   = Array.isArray(data.deleted_ids)   ? data.deleted_ids   : [];
      const remoteUnchecked = Array.isArray(data.unchecked_ids) ? data.unchecked_ids : [];
      const remoteChecked   = Array.isArray(data.checked_ids)   ? data.checked_ids   : [];

      const remoteDeletedMap   = new Map(remoteDeleted.map(d   => [d.id, d.at]));
      const remoteUncheckedMap = new Map(remoteUnchecked.map(u => [u.id, u.at]));
      const remoteCheckedMap   = new Map(remoteChecked.map(c   => [c.id, c.at]));

      const localDeleted      = _getDeletedIds();
      const localUnchecked    = _getUncheckedIds();
      const localChecked      = _getCheckedIds();
      const localDeletedMap   = new Map(localDeleted.map(d   => [d.id, d.at]));
      const localUncheckedMap = new Map(localUnchecked.map(u => [u.id, u.at]));
      const localCheckedMap   = new Map(localChecked.map(c   => [c.id, c.at]));

      // Union of all operation logs from both devices
      const mergedDeletedMap   = new Map([...localDeletedMap,   ...remoteDeletedMap]);
      const mergedUncheckedMap = new Map([...localUncheckedMap, ...remoteUncheckedMap]);
      // Max-per-key: remote-spread-last gives remote the initial win; then upgrade any
      // entry where local's timestamp was actually newer. Prevents wrong-LWW from
      // overwriting a more-recent local toggle with a stale remote timestamp.
      for (const [id, localAt] of localUncheckedMap) {
        if ((remoteUncheckedMap.get(id) ?? '') < localAt) mergedUncheckedMap.set(id, localAt);
      }
      const mergedCheckedMap   = new Map([...localCheckedMap,   ...remoteCheckedMap]);
      for (const [id, localAt] of localCheckedMap) {
        if ((remoteCheckedMap.get(id) ?? '') < localAt) mergedCheckedMap.set(id, localAt);
      }

      // ── Zones: get remote SOON/PAST for zone-aware task merging ────────────
      const remoteSoon = Array.isArray(data.soon_tasks) ? data.soon_tasks : [];
      const remotePast = Array.isArray(data.past_tasks) ? data.past_tasks : [];

      // ── Task list: remote order wins, local-only tasks appended at end ────────
      const localIds = new Set(manualTasks.map(t => t.id));
      const remoteIds = new Set(remoteTasks.map(t => t.id));

      // Build maps of zone tasks with their timestamps for conflict resolution
      const remoteZoneMap = new Map(); // id -> {zone, zoneChangedAt}
      remoteSoon.forEach(t => remoteZoneMap.set(t.id, { zone: 'soon', at: t.zoneChangedAt || '' }));
      remotePast.forEach(t => remoteZoneMap.set(t.id, { zone: 'past', at: t.zoneChangedAt || '' }));

      const localZoneMap = new Map();
      soonTasks.forEach(t => localZoneMap.set(t.id, { zone: 'soon', at: t.zoneChangedAt || '' }));
      pastTasks.forEach(t => localZoneMap.set(t.id, { zone: 'past', at: t.zoneChangedAt || '' }));

      // Local-only tasks — but EXCLUDE any that were moved to zones on remote MORE RECENTLY
      const localOnly = manualTasks.filter(t => {
        if (remoteIds.has(t.id)) return false; // exists in remote manualTasks
        const remoteZone = remoteZoneMap.get(t.id);
        if (!remoteZone) return true; // not in any remote zone, keep it
        // Task is in remote zone — compare timestamps
        // If local task's zoneChangedAt is MORE RECENT, it was pulled back to TODAY
        const localAt = t.zoneChangedAt || '';
        return localAt > remoteZone.at; // local pull-back is more recent
      });

      // Build task map for latest data (remote text/fields win on conflict)
      const taskDataMap = new Map();
      manualTasks.forEach(t => taskDataMap.set(t.id, t));
      remoteTasks.forEach(t => {
        const local = taskDataMap.get(t.id);
        const merged = { ...local, ...t };
        // lastActive: local focus session may not have reached Dropbox yet — keep the newer value
        if (local && local.lastActive && (!merged.lastActive || local.lastActive > merged.lastActive)) {
          merged.lastActive = local.lastActive;
        }
        taskDataMap.set(t.id, merged);
      });

      // Order basis: remote wins by default (union merge convention), BUT a more-recent
      // LOCAL reorder keeps its sequence — otherwise a pull that's already in flight when
      // the user drags carries the pre-drag order and reverts the drag ~1s later (drag
      // jump-back). The 7s ticker guards this via _pendingBackup, but the initial load
      // pull and reconnect pull don't — so the guard must live in the merge itself, keyed
      // on a reorder timestamp. Mirrors Trello order (BUG-042). Ties → remote wins (strict >).
      const _localOrderAt  = localStorage.getItem('today_manual_order_at') || '';
      const _remoteOrderAt = data.manual_order_at || '';
      const _localWinsOrder = _localOrderAt && _localOrderAt > _remoteOrderAt;
      const _orderBasis = _localWinsOrder
        ? [...manualTasks.filter(t => remoteIds.has(t.id)),   // shared tasks in LOCAL order
           ...remoteTasks.filter(t => !localIds.has(t.id))]    // remote-only additions appended at end
        : remoteTasks;                                          // default: remote order wins

      // Preserve chosen order, then append local-only tasks
      // EXCLUDE any tasks that exist in LOCAL zones MORE RECENTLY than their manualTasks version
      const orderedTasks = [..._orderBasis.map(t => taskDataMap.get(t.id)), ...localOnly]
        .filter(t => {
          const localZone = localZoneMap.get(t.id);
          if (!localZone) return true; // not in any local zone, keep it
          // Task is in local zone — compare timestamps
          const taskAt = t.zoneChangedAt || '';
          return taskAt > localZone.at; // task was returned to TODAY more recently
        });

      // Filter out deleted tasks
      const mergedTasks = orderedTasks.filter(t => {
        const deletedAt = mergedDeletedMap.get(t.id);
        if (!deletedAt) return true;
        // A pull-back to TODAY newer than the tombstone wins — protects a task pulled
        // from PAST on one device racing another device's purge tombstone (BUG-054)
        if (t.zoneChangedAt && t.zoneChangedAt > deletedAt) return true;
        const taskCreatedAt = t.id.startsWith('manual_')
          ? new Date(parseInt(t.id.replace('manual_', ''))).toISOString()
          : null;
        return taskCreatedAt && taskCreatedAt > deletedAt;
      });

      // ── Done state: most-recent-operation wins per task ID ───────────────────
      const allEverTouched = new Set([
        ...doneIds, ...remoteDone,
        ...mergedUncheckedMap.keys(), ...mergedCheckedMap.keys(),
      ]);

      const mergedDoneIds = new Set();
      allEverTouched.forEach(id => {
        const checkedAt   = mergedCheckedMap.get(id)   || null;
        const uncheckedAt = mergedUncheckedMap.get(id) || null;

        if (!checkedAt && !uncheckedAt) {
          // No timestamp history — union fallback
          if (doneIds.has(id) || remoteDone.includes(id)) mergedDoneIds.add(id);
        } else if (checkedAt && !uncheckedAt) {
          mergedDoneIds.add(id);
        } else if (!checkedAt && uncheckedAt) {
          // Unchecked, no recorded check — leave unchecked
        } else {
          // Both exist — most recent wins
          if (checkedAt > uncheckedAt) mergedDoneIds.add(id);
        }
      });

      // ── Merge-anomaly detection — both devices changed the same task ──────────
      // A real conflict = local AND remote each carry an op on the same task that is
      // (a) newer than the last sync read and (b) not just the other side's echo
      // (pushed ops come back with identical timestamps — those are excluded).
      // Text edits aren't detectable (no per-edit timestamp) — done state + zones only.
      const _anomalySince = localStorage.getItem('last_sync_read') || '';
      if (_anomalySince) {
        allEverTouched.forEach(id => {
          const lc = localCheckedMap.get(id),   rc = remoteCheckedMap.get(id);
          const lu = localUncheckedMap.get(id), ru = remoteUncheckedMap.get(id);
          const localNew  = (lc && lc > _anomalySince && lc !== rc) || (lu && lu > _anomalySince && lu !== ru);
          const remoteNew = (rc && rc > _anomalySince && rc !== lc) || (ru && ru > _anomalySince && ru !== lu);
          if (localNew && remoteNew) _logMergeAnomaly('done-state', id, { lc, rc, lu, ru });
        });
        localZoneMap.forEach((lz, id) => {
          const rz = remoteZoneMap.get(id);
          if (rz && lz.at && rz.at && lz.at !== rz.at && lz.at > _anomalySince && rz.at > _anomalySince) {
            _logMergeAnomaly('zone', id, { local: lz.zone + ' @ ' + lz.at, remote: rz.zone + ' @ ' + rz.at });
          }
        });
      }

      // ── Habits: union merge with remote order preserved ─────────────────────
      const remoteHabits      = Array.isArray(data.habits)            ? data.habits            : [];
      const remoteHabitComps  = (data.habit_completions && typeof data.habit_completions === 'object') ? data.habit_completions : {};
      const remoteDeletedHabitIds = new Set(Array.isArray(data.deleted_habit_ids) ? data.deleted_habit_ids : []);
      const localDeletedHabitIds  = new Set(safeJSON('today_deleted_habit_ids', []));
      const mergedDeletedHabitIds = new Set([...localDeletedHabitIds, ...remoteDeletedHabitIds]);

      // Build habit map — remote data wins on conflict (like tasks)
      const remoteHabitIds = new Set(remoteHabits.map(h => h.id));
      const localOnlyHabits = habitsList.filter(h => !remoteHabitIds.has(h.id));

      const habitMap = new Map();
      habitsList.forEach(h => habitMap.set(h.id, h));
      remoteHabits.forEach(h => habitMap.set(h.id, { ...habitMap.get(h.id), ...h }));

      // Preserve remote order, then append local-only habits
      habitsList = [...remoteHabits.map(h => habitMap.get(h.id)), ...localOnlyHabits]
        .filter(h => !mergedDeletedHabitIds.has(h.id));

      // Merge habit events: LWW per "habitId::YYYY-MM-DD" key.
      // Prevents a 7s background sync from re-checking a habit the user just unchecked. (BUG-026)
      const remoteHabitEvents = (data.habit_events && typeof data.habit_events === 'object') ? data.habit_events : {};
      const mergedHabitEvents = { ...habitEvents };
      Object.keys(remoteHabitEvents).forEach(key => {
        const remote = remoteHabitEvents[key];
        const local  = habitEvents[key];
        if (!local || remote.at > local.at) mergedHabitEvents[key] = remote;
      });
      habitEvents = mergedHabitEvents;
      localStorage.setItem('today_habit_events', JSON.stringify(habitEvents));

      // Union of completions, then filter by merged events — uncheck events veto dates from the union.
      // Dates with no event (pre-fix data) pass through unchanged for backward compatibility.
      const allHabitIds = new Set([...Object.keys(habitCompletions), ...Object.keys(remoteHabitComps)]);
      allHabitIds.forEach(id => {
        const local  = new Set(habitCompletions[id]  || []);
        const remote = new Set(remoteHabitComps[id]  || []);
        const union  = [...new Set([...local, ...remote])];
        habitCompletions[id] = union.filter(date => {
          const ev = mergedHabitEvents[id + '::' + date];
          return !ev || ev.type === 'check';
        });
      });

      localStorage.setItem('today_habits',            JSON.stringify(habitsList));
      localStorage.setItem('today_habit_completions', JSON.stringify(habitCompletions));
      localStorage.setItem('today_deleted_habit_ids', JSON.stringify([...mergedDeletedHabitIds].slice(-200)));

      const habitsPanel = document.getElementById('habitsPanel');
      if (habitsPanel && habitsPanel.classList.contains('open')) renderHabits();

      // ── Trello order: newer reorder wins ─────────────────────────────────────
      // Was unconditional "remote wins" — but trello_order rides in EVERY backup, so
      // any unrelated write from the other device re-asserted its (possibly stale)
      // order, scrambling the custom order across devices (worst at the day boundary,
      // when both devices re-fetch + re-sync at once). Now gated on a reorder
      // timestamp: adopt remote only if it reordered more recently, or to bootstrap a
      // device that has no local order yet. Empty-string defaults: an untimestamped
      // remote (old client) never clobbers a timestamped local. (BUG-042)
      const remoteTrelloOrder   = Array.isArray(data.trello_order) ? data.trello_order : [];
      const remoteTrelloOrderAt = data.trello_order_at || '';
      const localTrelloOrderAt  = localStorage.getItem('today_trello_order_at') || '';
      const localTrelloOrder    = safeJSON('today_trello_order', []);
      const _adoptTrelloOrder = remoteTrelloOrder.length > 0 &&
        (localTrelloOrder.length === 0 || remoteTrelloOrderAt > localTrelloOrderAt);
      if (_adoptTrelloOrder) {
        localStorage.setItem('today_trello_order', JSON.stringify(remoteTrelloOrder));
        if (remoteTrelloOrderAt) localStorage.setItem('today_trello_order_at', remoteTrelloOrderAt);
        // Re-apply order to current trelloTasks if loaded
        if (trelloTasks.length > 0) {
          const orderMap = new Map(remoteTrelloOrder.map((id, i) => [id, i]));
          trelloTasks.sort((a, b) => {
            const aIdx = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
            const bIdx = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
            return aIdx - bIdx;
          });
          renderTrello();
        }
      }

      // ── Zones: SOON and PAST (v5.0) ───────────────────────────────────────────
      // Union merge by task ID — most recent zoneChangedAt wins for conflicts
      // (remoteSoon and remotePast already declared above for zone-aware task filtering)
      // IMPORTANT: Exclude tasks that were deleted on either device
      // IMPORTANT: Exclude tasks that were pulled back to TODAY (exist in mergedTasks with newer timestamp)

      // Build map of merged manual tasks for zone exclusion checks
      const mergedTasksMap = new Map(mergedTasks.map(t => [t.id, t]));

      // Merge SOON: union by ID, most recent zoneChangedAt wins, exclude deleted and pulled-back
      // Also exclude tasks already in PAST — completed/aged tasks in PAST won't be in deleted_ids
      // but must not reappear in SOON when remote backup still has them in soon_tasks. (phantom task bug)
      // Timestamp-aware since v2.27.0: a PAST→SOON revive on another device carries a fresh
      // zoneChangedAt — provably newer than our PAST entry, so it must pass this guard.
      // No/older remote timestamp keeps the original phantom-task protection.
      const localPastAt = new Map(pastTasks.map(t => [t.id, t.zoneChangedAt || '']));
      const _stillPast = (t) => {
        const pastAt = localPastAt.get(t.id);
        if (pastAt === undefined) return false;                 // not in local PAST
        return !t.zoneChangedAt || t.zoneChangedAt <= pastAt;   // revive must be provably newer
      };
      const soonMap = new Map();
      soonTasks.forEach(t => {
        if (!mergedDeletedMap.has(t.id) && !_stillPast(t)) soonMap.set(t.id, t);
      });
      remoteSoon.forEach(t => {
        if (mergedDeletedMap.has(t.id)) return; // Skip deleted tasks
        if (_stillPast(t)) return; // In local PAST and not a provably-newer revive
        // Skip if task was pulled back to TODAY more recently
        const inToday = mergedTasksMap.get(t.id);
        if (inToday && inToday.zoneChangedAt && (!t.zoneChangedAt || inToday.zoneChangedAt > t.zoneChangedAt)) return;
        const existing = soonMap.get(t.id);
        if (!existing || (t.zoneChangedAt && (!existing.zoneChangedAt || t.zoneChangedAt > existing.zoneChangedAt))) {
          soonMap.set(t.id, t);
        }
      });
      // Also remove any SOON tasks that are now in TODAY with newer timestamp
      for (const [id, task] of soonMap) {
        const inToday = mergedTasksMap.get(id);
        if (inToday && inToday.zoneChangedAt && (!task.zoneChangedAt || inToday.zoneChangedAt > task.zoneChangedAt)) {
          soonMap.delete(id);
        }
      }
      soonTasks = [...soonMap.values()];
      localStorage.setItem('today_soon', JSON.stringify(soonTasks));

      // Merge PAST: union by ID, most recent zoneChangedAt wins, exclude deleted and pulled-back
      const pastMap = new Map();
      pastTasks.forEach(t => {
        if (!mergedDeletedMap.has(t.id)) pastMap.set(t.id, t);
      });
      remotePast.forEach(t => {
        if (mergedDeletedMap.has(t.id)) return; // Skip deleted tasks
        // Skip if task was pulled back to TODAY or SOON more recently
        const inToday = mergedTasksMap.get(t.id);
        if (inToday && inToday.zoneChangedAt && (!t.zoneChangedAt || inToday.zoneChangedAt > t.zoneChangedAt)) return;
        const inSoon = soonMap.get(t.id);
        if (inSoon && inSoon.zoneChangedAt && (!t.zoneChangedAt || inSoon.zoneChangedAt > t.zoneChangedAt)) return;
        const existing = pastMap.get(t.id);
        if (!existing || (t.zoneChangedAt && (!existing.zoneChangedAt || t.zoneChangedAt > existing.zoneChangedAt))) {
          pastMap.set(t.id, t);
        }
      });
      // Also remove any PAST tasks that are now in TODAY or SOON with newer timestamp
      for (const [id, task] of pastMap) {
        const inToday = mergedTasksMap.get(id);
        if (inToday && inToday.zoneChangedAt && (!task.zoneChangedAt || inToday.zoneChangedAt > task.zoneChangedAt)) {
          pastMap.delete(id);
          continue;
        }
        const inSoon = soonMap.get(id);
        if (inSoon && inSoon.zoneChangedAt && (!task.zoneChangedAt || inSoon.zoneChangedAt > task.zoneChangedAt)) {
          pastMap.delete(id);
        }
      }
      // Sort by zoneChangedAt descending, then apply age-based purge
      // so items expired locally don't get resurrected from remote on every sync
      pastTasks = [...pastMap.values()]
        .sort((a, b) => (b.zoneChangedAt || '').localeCompare(a.zoneChangedAt || ''));
      // Tombstone purged items via mergedDeletedMap — NOT a direct localStorage write,
      // which the merged-log persist below would clobber (BUG-054). The map write also
      // puts them in the next backup payload via _getDeletedIds().
      _purgePast().forEach(p => {
        if (!mergedDeletedMap.has(p.id)) mergedDeletedMap.set(p.id, p.at);
      });
      // _purgePast() calls _savePast() internally when items are removed;
      // save unconditionally here to cover the no-purge path
      localStorage.setItem('today_past', JSON.stringify(pastTasks));

      // Re-render zones if visible
      if (typeof renderSoon === 'function') renderSoon();
      if (typeof renderPast === 'function') renderPast();

      // ── Persist merged operation logs ────────────────────────────────────────
      localStorage.setItem('today_deleted_ids',   JSON.stringify([...mergedDeletedMap.entries()].map(([id,at]) => ({id,at}))));
      localStorage.setItem('today_unchecked_ids', JSON.stringify([...mergedUncheckedMap.entries()].map(([id,at]) => ({id,at}))));
      localStorage.setItem('today_checked_ids',   JSON.stringify([...mergedCheckedMap.entries()].map(([id,at]) => ({id,at}))));

      // ── DOM updates ──────────────────────────────────────────────────────────
      const mergedTaskIds = new Set(mergedTasks.map(t => t.id));

      manualTasks.forEach(t => {
        if (!mergedTaskIds.has(t.id)) {
          const el = document.querySelector(`.task[data-taskid="${CSS.escape(t.id)}"]`);
          if (el) { el.classList.add('removing'); setTimeout(() => el.remove(), 180); }
        }
      });

      const brandNew = mergedTasks.filter(t => !localIds.has(t.id));
      if (brandNew.length > 0) {
        const listEl = $.manualList;
        const empty  = $.manualEmpty;
        brandNew.forEach(t => {
          const tmp = document.createElement('div');
          tmp.innerHTML = taskHTML(t, 'manual');
          listEl.appendChild(tmp.firstElementChild);
        });
        if (empty) empty.style.display = 'none';
      }

      const prevTaskIds = new Set(manualTasks.map(t => t.id));
      const nextTaskIds = new Set(mergedTasks.map(t => t.id));
      if (prevTaskIds.size !== nextTaskIds.size || [...nextTaskIds].some(id => !prevTaskIds.has(id))) _changed = true;

      // Also check if ORDER changed (same IDs but different sequence)
      if (!_changed && manualTasks.length === mergedTasks.length) {
        for (let i = 0; i < manualTasks.length; i++) {
          if (manualTasks[i].id !== mergedTasks[i].id) {
            _changed = true;
            break;
          }
        }
      }

      const prevDone = JSON.stringify([...doneIds].sort());
      const nextDone = JSON.stringify([...mergedDoneIds].sort());
      if (prevDone !== nextDone) _changed = true;

      manualTasks = mergedTasks;
      _saveManual();
      // Adopt remote reorder stamp when remote order won, so the next merge compares
      // against it rather than re-winning off a stale local stamp (mirrors Trello, BUG-042).
      if (!_localWinsOrder && _remoteOrderAt) localStorage.setItem('today_manual_order_at', _remoteOrderAt);

      doneIds = mergedDoneIds;
      _saveDone();

      // ── Stats: take max of each counter (both devices may have added focus time) ──
      // Flow rate is calculated live from visible tasks, not stored
      const localFocusMins  = parseInt(localStorage.getItem('stat_focus_mins_today')  || '0');
      const localStreak     = parseInt(localStorage.getItem('stat_streak')            || '1');
      const localStreakDate  = localStorage.getItem('stat_streak_date') || '';

      const remoteFocusMins = parseInt(data.stat_focus_mins_today  || '0');
      const remoteStreak    = parseInt(data.stat_streak            || '1');
      const remoteStreakDate = data.stat_streak_date || '';

      // Max wins — but ONLY merge focus mins if the remote data is from today.
      // Without this guard, yesterday's backed-up total (e.g. 45min) would restore
      // after midnight when local resets to 0 but remote still holds the old value.
      const remoteFocusDate = data.stat_focus_mins_date || '';
      const remoteFocusMinsToday = remoteFocusDate === _getAppDay() ? remoteFocusMins : 0;

      const mergedFocusMins = Math.max(localFocusMins, remoteFocusMinsToday);
      const mergedStreakDate = remoteStreakDate > localStreakDate ? remoteStreakDate : localStreakDate;
      // Streak count: only adopt remote's count when remote's date is at least as recent
      // as local's. If remote is older (stale device), its count may reflect a streak the
      // current device already correctly reset via applyNewDayCleanup() — the ticker path
      // runs cleanup BEFORE sync, so Math.max would re-inflate the reset value every tick.
      // Same-day (remoteDate === localDate) takes Math.max, which is correct (BUG-020 guard).
      const mergedStreak = remoteStreakDate >= localStreakDate
        ? Math.max(localStreak, remoteStreak)
        : localStreak;
      // Done count is NOT merged here — it derives from checked_ids, which merge by timestamp
      // union below. Math.max on a monotonic counter was what inflated it (retired v2.18.21).

      if (mergedFocusMins !== localFocusMins) {
        // Stamp the date guard alongside the value (BUG-066). mergedFocusMins only differs
        // from local when remote's date-gated today-value won, so the merged number IS
        // today's. Without the stamp, applyNewDayCleanup — which by design runs AFTER the
        // Dropbox restore (see init(), "clean the freshest data") — reads a stale date,
        // banks the other device's minutes into YESTERDAY's history and zeroes the counter.
        // Symptom: work a focus session on desktop, open mobile later the same day, see 0.
        const localFocusDate = localStorage.getItem('stat_focus_mins_date') || '';
        if (localFocusDate && localFocusDate !== _getAppDay() && localFocusMins > 0) {
          // Local counter was still on yesterday and cleanup hadn't banked it yet. Hand it
          // to the snapshot cleanup consumes — same channel BUG-063 established — so
          // stamping today's date below doesn't cost yesterday its history entry.
          localStorage.setItem('stat_focus_mins_yesterday_snapshot', String(localFocusMins));
        }
        localStorage.setItem('stat_focus_mins_today', String(mergedFocusMins));
        localStorage.setItem('stat_focus_mins_date', _getAppDay());
        _changed = true;
        if ($.infoPanel && $.infoPanel.classList.contains('open')) renderInfoStats();
      }
      if (mergedStreak !== localStreak || mergedStreakDate !== localStreakDate) {
        localStorage.setItem('stat_streak', String(mergedStreak));
        localStorage.setItem('stat_streak_date', mergedStreakDate);
        _changed = true;
      }

      // ── Triage history: union merge by timestamp ──
      if (data.triage_history && Array.isArray(data.triage_history)) {
        const localHistory = safeJSON('today_triage_history', []);
        const localTs = new Set(localHistory.map(h => h.ts));
        const remoteNew = data.triage_history.filter(h => h.ts && !localTs.has(h.ts));
        if (remoteNew.length > 0) {
          const merged = [...localHistory, ...remoteNew]
            .sort((a, b) => new Date(b.ts) - new Date(a.ts))
            .slice(0, 50);
          localStorage.setItem('today_triage_history', JSON.stringify(merged));
        }
      }

      // ── Daily history: union merge by date (week grid cross-device, BUG-036) ──
      if (Array.isArray(data.daily_history)) {
        const localDaily  = safeJSON('today_daily_history', []);
        const mergedDaily = _mergeDailyHistory(localDaily, data.daily_history);
        if (JSON.stringify(mergedDaily) !== JSON.stringify(localDaily)) {
          localStorage.setItem('today_daily_history', JSON.stringify(mergedDaily));
          _changed = true;
        }
      }

      // ── Trello focus map: union merge so un-dimmed cards propagate across devices ──
      // Date-guarded — avoids yesterday's focus restoring after the other device's day-cleanup
      const _remoteFocusMapDate = data.today_trello_focus_date || '';
      if (_remoteFocusMapDate === _getAppDay() && data.today_trello_focus && typeof data.today_trello_focus === 'object') {
        const _localFocusMap = safeJSON('today_trello_focus', {});
        const _mergedFocusMap = { ..._localFocusMap };
        let _focusMapChanged = false;
        for (const [_fid, _fv] of Object.entries(data.today_trello_focus)) {
          if (!_mergedFocusMap[_fid] || _fv > _mergedFocusMap[_fid]) { _mergedFocusMap[_fid] = _fv; _focusMapChanged = true; }
        }
        if (_focusMapChanged) { _setTrelloFocus(_mergedFocusMap); renderTrello(); _changed = true; }
      }

      // ── Trello first-seen map: union merge, MIN timestamp wins (BUG-049) ──
      // A card's true first-seen is the EARLIEST any device saw it. No date guard — first-seen
      // persists across days by design (that's how the card ages).
      if (data.today_trello_firstseen && typeof data.today_trello_firstseen === 'object') {
        const _localFS = safeJSON('today_trello_firstseen', {});
        const _mergedFS = { ..._localFS };
        let _fsChg = false;
        for (const [_id, _ts] of Object.entries(data.today_trello_firstseen)) {
          if (!_mergedFS[_id] || _ts < _mergedFS[_id]) { _mergedFS[_id] = _ts; _fsChg = true; }
        }
        if (_fsChg) { _setTrelloFirstSeen(_mergedFS); renderTrello(); _changed = true; }
      }

      // ── Trello last-active: MAX-merge (BUG-064) ──
      // Mirror image of first-seen above: the newest activity on ANY device un-ages the card,
      // so a focus session on the phone doesn't get undone by the laptop's older value.
      if (data.today_trello_lastactive && typeof data.today_trello_lastactive === 'object') {
        const _localLA = _getTrelloLastActive();
        const _mergedLA = { ..._localLA };
        let _laChg = false;
        for (const [_id, _ts] of Object.entries(data.today_trello_lastactive)) {
          if (!_mergedLA[_id] || _ts > _mergedLA[_id]) { _mergedLA[_id] = _ts; _laChg = true; }
        }
        if (_laChg) { _setTrelloLastActive(_mergedLA); renderTrello(); _changed = true; }
      }

      // ── Trello focus total: MAX-merge, no date guard ──
      // Lifetime session counts persist across days — highest count on any device wins.
      if (data.today_trello_focus_total && typeof data.today_trello_focus_total === 'object') {
        const _localFT = _getTrelloFocusTotal();
        const _mergedFT = { ..._localFT };
        let _ftChg = false;
        for (const [_id, _cnt] of Object.entries(data.today_trello_focus_total)) {
          if (!_mergedFT[_id] || _cnt > _mergedFT[_id]) { _mergedFT[_id] = _cnt; _ftChg = true; }
        }
        if (_ftChg) { _setTrelloFocusTotal(_mergedFT); renderTrello(); _changed = true; }
      }

      // ── Triage dismissed: sync across devices ──
      // If remote shows triage was dismissed today (or more recently), apply it locally
      const remoteDismissed = data.triage_dismissed || '';
      const localDismissed = localStorage.getItem('triage_dismissed') || '';
      const today = _getAppDay();
      if (remoteDismissed === today && localDismissed !== today) {
        localStorage.setItem('triage_dismissed', remoteDismissed);
        triageDismissedToday = true;
        // Hide triage bar AND overlay if showing
        const triageBar = document.getElementById('triageBar');
        const triageOverlay = document.getElementById('triageOverlay');
        if (triageBar) { triageBar.classList.remove('visible'); triageBar.classList.add('hidden'); }
        if (triageOverlay) triageOverlay.classList.add('hidden');
      }

      // ── User names: last-write-wins via user_names_at timestamp ──
      // Remote wins if its timestamp is strictly newer; fallback fill-if-empty for
      // old backups that predate the timestamp field (user_names_at = '').
      const _remoteNamesAt = data.user_names_at || '';
      const _localNamesAt  = localStorage.getItem('user_names_at') || '';
      const _incomingNames = Array.isArray(data.user_names) && data.user_names.length
        ? data.user_names
        : (data.user_name ? [data.user_name] : []);
      if ((_remoteNamesAt && _remoteNamesAt > _localNamesAt) ||
          (!_remoteNamesAt && !localStorage.getItem('today_user_names'))) {
        if (_incomingNames.length) {
          localStorage.setItem('today_user_names', JSON.stringify(_incomingNames));
          localStorage.setItem('today_user_name', _incomingNames[0]);
          if (_remoteNamesAt) localStorage.setItem('user_names_at', _remoteNamesAt);
        }
      }

      // ── Per-day nudge dismissals: sync across devices (BUG-051/053) ──
      // Driven by _DISMISS_SYNC — the same registry that puts these fields in the
      // backup payload, so payload and merge can't drift apart per surface again.
      const _todayISO = _localISO();
      _DISMISS_SYNC.forEach(d => {
        if ((data[d.field] || '') === '1' && !localStorage.getItem(d.prefix + _todayISO)) {
          localStorage.setItem(d.prefix + _todayISO, '1');
          if ($[d.el]) $[d.el].classList.remove('visible', 'show');
        }
      });

      // ── Trello config: fill-if-empty so a new device picks up existing Trello setup ──
      if (!localStorage.getItem('trello_config') && data.trello_config && typeof data.trello_config === 'object' && Object.keys(data.trello_config).length) {
        localStorage.setItem('trello_config', JSON.stringify(data.trello_config));
      }

      // ── Full appMemory merge: patterns, inferences, moments, keywords ───────────
      _mergeAppMemory(data.memory);

      // ── Day review + AI nudge ─────────────────────────────────────────────────
      // day_review: fill-if-empty (local is the authoritative current-session record)
      if (data.day_review && !localStorage.getItem('today_day_review')) {
        localStorage.setItem('today_day_review', JSON.stringify(data.day_review));
      }
      // day_nudge_ai: remote always wins — first device to open the app generates
      // the line and pushes it; all other devices should show the same sentence.
      // Fill-if-empty caused each device to independently generate and keep its own
      // AI line, making the nudge differ across PWA instances on the same day.
      const _aiNudgeKey = 'day_nudge_ai_' + _todayISO;
      if (data.day_nudge_ai) {
        localStorage.setItem(_aiNudgeKey, data.day_nudge_ai);
        if (typeof checkDayNudge === 'function') checkDayNudge();
        // About's Today block shows this line — refresh live if the panel is open
        if ($.infoPanel && $.infoPanel.classList.contains('open')) renderInfoStats();
      }
      // Sunday reflection / Monday intention: remote always wins, same reasoning as
      // day_nudge_ai — one device's generated text becomes the day's text everywhere
      // (BUG-057: About's This week / New week block differed between devices).
      let _weekBlockSynced = false;
      const _expectedWeekPolicy = window._weekReflectionPolicy || '';
      if (_expectedWeekPolicy && data.week_reflection_policy === _expectedWeekPolicy) {
        const _weekPolicyKey = 'week_policy_' + _todayISO;
        if (localStorage.getItem(_weekPolicyKey) !== _expectedWeekPolicy) {
          localStorage.setItem(_weekPolicyKey, _expectedWeekPolicy);
          _pruneLS('week_policy_', _weekPolicyKey);
          _weekBlockSynced = true;
        }
        if (data.week_reflection && data.week_reflection !== localStorage.getItem('week_reflection_' + _todayISO)) {
          localStorage.setItem('week_reflection_' + _todayISO, data.week_reflection);
          _pruneLS('week_reflection_', 'week_reflection_' + _todayISO);
          _weekBlockSynced = true;
        }
      }
      if (data.monday_intention && data.monday_intention !== localStorage.getItem('monday_intention_' + _todayISO)) {
        localStorage.setItem('monday_intention_' + _todayISO, data.monday_intention);
        _pruneLS('monday_intention_', 'monday_intention_' + _todayISO);
        _weekBlockSynced = true;
      }
      // Week theme for Noticed (v2.39.0) — same remote-always-wins reasoning, keyed
      // per calendar week (see the backup-payload comment for why the key differs
      // from week_reflection/monday_intention's per-day key).
      const _curWeekKey = _todayISO.slice(0, 8) + Math.ceil(new Date().getDate() / 7);
      if (data.week_theme_ai && data.week_theme_ai !== localStorage.getItem('week_theme_ai_' + _curWeekKey)) {
        localStorage.setItem('week_theme_ai_' + _curWeekKey, data.week_theme_ai);
        _weekBlockSynced = true;
      }
      if (_weekBlockSynced && $.infoPanel && $.infoPanel.classList.contains('open')) renderInfoStats();

      // Full re-render if tasks were added or removed — surgical patch is not enough
      if (_changed) {
        renderManual();
      } else {
        // Only done state changed — patch in place, no DOM rebuild needed
        document.querySelectorAll('.task[data-taskid]').forEach(el => {
          el.classList.toggle('done', doneIds.has(el.dataset.taskid));
        });
      }

      // Re-filter Trello tasks — done+overdue cards checked BEFORE today should disappear.
      // Cards checked TODAY should persist until end of day (same grace as due-today cards).
      // loadTrello may have run before Dropbox sync completed, so it used stale doneIds.
      if (trelloTasks.length > 0) {
        const today = new Date(); today.setHours(0,0,0,0);
        const checkedIds = safeJSON('today_checked_ids', []);
        const prevLen = trelloTasks.length;
        trelloTasks = trelloTasks.filter(t => {
          if (!doneIds.has(t.id)) return true; // Not done — keep
          if (!t.due) return true; // No due date — keep
          const d = new Date(t.due); d.setHours(0,0,0,0);
          if (d.getTime() >= today.getTime()) return true; // Due today or future — keep
          // Overdue + done — keep only if checked today
          const entry = checkedIds.find(e => e.id === t.id);
          if (entry && entry.at) {
            const checkedDate = new Date(entry.at); checkedDate.setHours(0,0,0,0);
            if (checkedDate.getTime() === today.getTime()) return true; // Checked today — keep until EOD
          }
          return false; // Checked before today — evict
        });
        if (trelloTasks.length !== prevLen) renderTrello();
      }
      if (typeof window._reflectionMergeRemote === 'function' && window._reflectionMergeRemote(data)) _changed = true;

      // BUG-082 diagnostic — remove after root cause confirmed
      { const _pd = pastTasks.filter(t => doneIds.has(t.id)).length; if (_pd === 0 && pastTasks.length > 0) console.warn('[BUG-082] mergeRemoteData: pastDone=0 pastLen=', pastTasks.length, 'doneIds.size=', doneIds.size, 'manualLen=', manualTasks.length); }
      updateStats();
      return _changed;
    }

    // ── Restore ───────────────────────────────────────────────────────────────────
    async function dropboxRestore(fromSync) {
      await _dropboxEnsureToken();
      const token = localStorage.getItem('dropbox_token');
      if (!token) { if (!fromSync) dropboxShowMsg('Not connected. Click Connect Dropbox first.', 'error'); return; }
      if (!fromSync) dropboxShowMsg('Fetching backup…', 'success');

      try {
        const res = await fetch('https://content.dropboxapi.com/2/files/download', {
          method: 'POST',
          headers: {
            'Authorization':   `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify({ path: DROPBOX_FILE }),
          },
        });

        if (res.status === 401) {
          localStorage.setItem('dropbox_token_expired', '1');
          renderConnections();
          if (!fromSync) {
            localStorage.removeItem('dropbox_token');
            localStorage.removeItem('dropbox_token_expired');
            renderConnections();
            dropboxShowMsg('Session expired — please reconnect.', 'error'); renderConnections();
          }
          return;
        }
        if (res.status === 409) {
          if (!fromSync) dropboxShowMsg('No backup found. Make a backup first.', 'error');
          return;
        }
        if (!res.ok) throw new Error(`Dropbox ${res.status}`);

        const data = await res.json();

        if (fromSync) {
          // No timestamp guard here — mergeRemoteData() handles conflicts correctly
          // regardless of file age. The old guard (reject if remote older than local)
          // was correct under last-write-wins but breaks union merge: it would cause
          // device B to never see tasks device A added before B's last edit.
          // Rev change in syncDropbox() already ensures we only run when something changed.

          // Union merge via shared mergeRemoteData() — handles tasks, deletes, check/uncheck
          // Only push back if the merge actually changed local state — avoids rev churn
          // where every device rewrites the file every 7s even when nothing changed.
          const changed = mergeRemoteData(data);
          if (changed) dropboxAutoSave();
          // Re-check Trello cards against the now-merged doneIds (BUG-060, extended):
          // a task completed only inside TODAY (never archived on the real Trello
          // board) never changes the board's dateLastActivity, so syncTrello() never
          // re-fetches to pick up the completion — this periodic Dropbox merge is the
          // only thing that ever learns about it, and nothing else in the 7s tick
          // re-filters trelloTasks against the corrected doneIds without this call.
          if (typeof _reconcileTrelloAfterMerge === 'function') _reconcileTrelloAfterMerge();

        } else {
          // Manual restore — full overwrite, exactly what the user expects
          manualTasks = Array.isArray(data.manual_tasks) ? data.manual_tasks : [];
          doneIds     = new Set(Array.isArray(data.done_ids) ? data.done_ids : []);
          localStorage.setItem('today_manual',        JSON.stringify(manualTasks));
          // Take remote's reorder stamp wholesale too, so a later sync merge doesn't
          // treat this restored order as stale and re-sort it (mirrors trello_order_at below).
          if (data.manual_order_at) localStorage.setItem('today_manual_order_at', data.manual_order_at);
          _saveDone();
          localStorage.setItem('today_deleted_ids',   JSON.stringify(Array.isArray(data.deleted_ids)   ? data.deleted_ids   : []));
          localStorage.setItem('today_unchecked_ids', JSON.stringify(Array.isArray(data.unchecked_ids) ? data.unchecked_ids : []));
          localStorage.setItem('today_checked_ids',   JSON.stringify(Array.isArray(data.checked_ids)   ? data.checked_ids   : []));
          // Manual restore doesn't go through mergeRemoteData() — doneIds/checked_ids
          // above are a wholesale overwrite instead — but trelloTasks (already in
          // memory from before the restore) is never touched by this branch either
          // way, so it needs the same post-merge reconcile (BUG-060, extended).
          if (typeof _reconcileTrelloAfterMerge === 'function') _reconcileTrelloAfterMerge();
          if (data.trello_config)         localStorage.setItem('trello_config',         JSON.stringify(data.trello_config));
          // Trello order — full restore takes remote wholesale, including its reorder stamp (BUG-042)
          if (Array.isArray(data.trello_order)) {
            localStorage.setItem('today_trello_order', JSON.stringify(data.trello_order));
            if (data.trello_order_at) localStorage.setItem('today_trello_order_at', data.trello_order_at);
          }
          // Trello focus map — date-guarded (daily reset), restores which cards were worked today
          const _restoreFocusMapDate = data.today_trello_focus_date || '';
          if (_restoreFocusMapDate === _getAppDay() && data.today_trello_focus && typeof data.today_trello_focus === 'object') {
            localStorage.setItem('today_trello_focus', JSON.stringify(data.today_trello_focus));
            localStorage.setItem('today_trello_focus_date', _restoreFocusMapDate);
          } else {
            localStorage.removeItem('today_trello_focus');
            localStorage.removeItem('today_trello_focus_date');
          }
          // Trello first-seen map — take remote wholesale (no date guard; persists across days).
          // The next sync tick MIN-merges any local-only entries (BUG-049).
          if (data.today_trello_firstseen && typeof data.today_trello_firstseen === 'object') {
            localStorage.setItem('today_trello_firstseen', JSON.stringify(data.today_trello_firstseen));
          }
          // Same treatment for last-active; next sync tick MAX-merges local-only entries (BUG-064).
          if (data.today_trello_lastactive && typeof data.today_trello_lastactive === 'object') {
            localStorage.setItem('today_trello_lastactive', JSON.stringify(data.today_trello_lastactive));
          }
          // Lifetime Trello focus totals — take remote wholesale; next sync tick MAX-merges local-only.
          if (data.today_trello_focus_total && typeof data.today_trello_focus_total === 'object') {
            localStorage.setItem('today_trello_focus_total', JSON.stringify(data.today_trello_focus_total));
          }
          // Stats (flow_rate is calculated live from visible tasks, not stored)
          // Date guard: only restore focus mins if the backup is from today,
          // same as mergeRemoteData — prevents yesterday's total restoring after midnight
          const _restoreFocusDate = data.stat_focus_mins_date || '';
          if (data.stat_focus_mins_today && _restoreFocusDate === _getAppDay()) {
            localStorage.setItem('stat_focus_mins_today', data.stat_focus_mins_today);
          } else if (_restoreFocusDate !== _getAppDay()) {
            localStorage.setItem('stat_focus_mins_today', '0');
          }
          if (data.stat_streak)            localStorage.setItem('stat_streak',            data.stat_streak);
          if (data.stat_streak_date)       localStorage.setItem('stat_streak_date',       data.stat_streak_date);
          // Done-today count derives from checked_ids (restored above) — nothing to restore here.
          // Habits
          if (Array.isArray(data.habits)) {
            habitsList       = data.habits;
            habitCompletions = (data.habit_completions && typeof data.habit_completions === 'object') ? data.habit_completions : {};
            habitEvents      = (data.habit_events      && typeof data.habit_events      === 'object') ? data.habit_events      : {};
            localStorage.setItem('today_habits',            JSON.stringify(habitsList));
            localStorage.setItem('today_habit_completions', JSON.stringify(habitCompletions));
            localStorage.setItem('today_habit_events',      JSON.stringify(habitEvents));
            localStorage.setItem('today_deleted_habit_ids', JSON.stringify(Array.isArray(data.deleted_habit_ids) ? data.deleted_habit_ids : []));
            const habitsPanel = document.getElementById('habitsPanel');
            if (habitsPanel && habitsPanel.classList.contains('open')) renderHabits();
          }
          // Restore zones — SOON and PAST (v5.0)
          if (Array.isArray(data.soon_tasks)) {
            soonTasks = data.soon_tasks;
            localStorage.setItem('today_soon', JSON.stringify(soonTasks));
            if (typeof renderSoon === 'function') renderSoon();
          }
          if (Array.isArray(data.past_tasks)) {
            pastTasks = data.past_tasks;
            localStorage.setItem('today_past', JSON.stringify(pastTasks));
            if (typeof renderPast === 'function') renderPast();
          }
          // Restore triage history
          if (Array.isArray(data.triage_history)) {
            const localHistory = safeJSON('today_triage_history', []);
            const localTs = new Set(localHistory.map(h => h.ts));
            const remoteNew = data.triage_history.filter(h => h.ts && !localTs.has(h.ts));
            if (remoteNew.length > 0) {
              const merged = [...localHistory, ...remoteNew]
                .sort((a, b) => new Date(b.ts) - new Date(a.ts))
                .slice(0, 50);
              localStorage.setItem('today_triage_history', JSON.stringify(merged));
            }
          }
          // Restore daily history (union by date — week grid cross-device, BUG-036)
          if (Array.isArray(data.daily_history)) {
            const localDaily  = safeJSON('today_daily_history', []);
            const mergedDaily = _mergeDailyHistory(localDaily, data.daily_history);
            localStorage.setItem('today_daily_history', JSON.stringify(mergedDaily));
          }
          // Restore memory (merge with local) — delegates to _mergeAppMemory() which
          // is also called on every auto-sync tick. appMemory.noticed is intentionally
          // NOT merged (local-only gate; see v2.36.3 / BUG-058 comments in insights.js).
          _mergeAppMemory(data.memory);
          // stat_last_visit intentionally NOT restored — it's local device state.
          // Restoring it would cause applyNewDayCleanup() to re-run and delete today's tasks.
          if (typeof window._reflectionMergeRemote === 'function') window._reflectionMergeRemote(data);
          renderManual();
          renderTrello();
          updateStats();
          // The stamp below makes this device skip its new-day cleanup, which is also
          // where morning_nudge_count (local-only) gets set — so the nudge only ever
          // appeared on the first device to open in the morning. If this restore is the
          // device's first open of the day, do that one piece of bookkeeping here,
          // from the restored (freshest) state.
          if (localStorage.getItem('stat_last_visit') !== _getAppDay()) {
            const carried = manualTasks.filter(t => !doneIds.has(t.id)).length;
            if (carried > 0) localStorage.setItem('morning_nudge_count', carried);
            else localStorage.removeItem('morning_nudge_count');
          }
          // Prevent checkNewDay() from running new-day cleanup on the next tick
          // and filtering done tasks out of the state we just restored.
          localStorage.setItem('stat_last_visit', _getAppDay());
          if (typeof checkDayNudge === 'function') checkDayNudge();
          // Re-check Sunday/habit badges too — same "init() ran before sync landed"
          // gap as the nudge: both read Dropbox-synced state (today_daily_history,
          // habitsList/habitCompletions) that's empty on a fresh device until now.
          if (typeof checkSundayNudge === 'function') checkSundayNudge();
          if (typeof checkHabitNudge === 'function') checkHabitNudge();
          // Seed rev baseline so syncDropbox doesn't immediately re-merge on top of this restore
          if (window._dbxSetRev) {
            try {
              const _token = localStorage.getItem('dropbox_token');
              const _m = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: DROPBOX_FILE }),
              });
              if (_m.ok) { const _md = await _m.json(); if (_md && _md.rev) window._dbxSetRev(_md.rev); }
            } catch(e) { _logSyncError('Dropbox', 'Rev seed: ' + e.message); }
          }
          dropboxShowMsg('Restore complete ✓', 'success');
        }

      } catch(e) {
        _logSyncError('Dropbox', 'Restore: ' + e.message);
        if (!fromSync) dropboxShowMsg('Restore failed: ' + (e.message || 'unknown error'), 'error');
      }
    }

    // ─── Live sync ───────────────────────────────────────────────────────────────
    // Visibility-based polling: re-syncs when tab regains focus or every 30s while
    // active. Background tabs are completely silent — no network, no battery drain.
      let   ticker         = null;
      let   lastDropboxRev = null;
      let   _wakeSyncSilent = false; // suppress red dot for transient wake failures
      window._isWakeSyncSilent = () => _wakeSyncSilent;
      window._setWakeSyncSilent = (v) => { _wakeSyncSilent = v; };
      let   lastTrelloDate = null;

      // ── Trello: cheap activity check first, full fetch only if board changed ──
      async function syncTrello() {
        if (!navigator.onLine) return; // don't attempt fetches when offline
        const cfg = _syncCfg; // use cached config — avoids localStorage read every 7s tick
        if (!cfg || !cfg.apiKey || !cfg.apiToken || !cfg.boardId) return;
        try {
          const res = await fetch(
            `https://api.trello.com/1/boards/${cfg.boardId}?fields=dateLastActivity&key=${cfg.apiKey}&token=${cfg.apiToken}`
          );
          if (!res.ok) return;
          const board = await res.json();
          const date  = board.dateLastActivity;
          if (!date || date === lastTrelloDate) return;
          lastTrelloDate = date;
          loadTrello(true);
        } catch(e) { _logSyncError('Trello', 'Sync: ' + e.message); }
      }

      // ── Dropbox: cheap rev check, only restore if file changed on another device ──
      async function syncDropbox() {
        if (!navigator.onLine) return;
        if (!_syncToken) return;
        // If there's a pending local backup, skip the pull — our local state is newer
        // than remote, and pulling would overwrite the unsaved drag/edit. The pending
        // backup will upload within 800ms and the next tick can sync normally.
        // (Fixes drag jump-back race on mobile PWA)
        if (_pendingBackup) return;
        try {
          await _dropboxEnsureToken();
          const token = localStorage.getItem('dropbox_token');
          if (!token) return;
          const res = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
            method:  'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: DROPBOX_FILE }),
          });
          if (!res.ok) return;
          const meta = await res.json();
          const rev  = meta.rev;
          if (!rev || rev === lastDropboxRev) return;
          lastDropboxRev = rev;
          await dropboxRestore(true);
          localStorage.setItem('last_sync_read', new Date().toISOString());
        } catch(e) { _logSyncError('Dropbox', 'Sync: ' + e.message); }
      }

      // Expose rev setter so dropboxBackup can update baseline after its own write
      window._dbxSetRev = function(rev) { lastDropboxRev = rev; };

      // Day boundary cleanup — uses midnight boundary (aligned with habits as of v2.12.74)
      function checkNewDay() {
        // Compute app day fresh each tick — a cached value set at module load would be
        // stale if the app stays open past midnight without a reload.
        const today = _getAppDay();
        if (localStorage.getItem('stat_last_visit') === today) return;
        applyNewDayCleanup();
        renderManual();
        loadTrello(true);
        updateStats();
        // Refresh the nudge banner too — a tab left open across midnight (common desktop
        // usage) would otherwise keep showing yesterday's cached AI text (wrong counts,
        // tasks that were completed before midnight described as still pending) until a
        // full reload. The banner's own cache key is date-scoped and would naturally
        // regenerate — but _nudgeRendered (v2.38.4, blocks re-render once shown per page
        // load) doesn't know a genuine day boundary just passed, so it must be reset here.
        if (typeof window._nudgeOnNewDay === 'function') window._nudgeOnNewDay();
        if (typeof checkDayNudge === 'function') checkDayNudge();
      }

      // Cached values read once per sync cycle — avoids repeated localStorage access
      let _syncCfg   = null;
      let _syncToken = null;
      function _refreshSyncCache() {
        _syncCfg   = getSavedConfig();
        _syncToken = localStorage.getItem('dropbox_token');
      }

      function syncAll() {
        _refreshSyncCache();
        checkNewDay();
        syncTrello();
        syncDropbox();
        // Age-bucket patch runs every tick — time-based dimming is independent of Trello
        // board activity. syncTrello() only calls loadTrello() (and thus renderTrello()) when
        // dateLastActivity changes on the server; cards age silently between board events.
        renderTrello();
      }

      function startTicker() {
        if (ticker) return;
        ticker = setInterval(syncAll, INTERVAL_MS);
      }
      function stopTicker() {
        clearInterval(ticker);
        ticker = null;
      }

      // Expose sync controls for cross-scope access (window.focus handler, etc.)
      window._dbxSyncNow = () => syncAll();
      window._dbxResetRev = () => { lastDropboxRev = null; };

      let wakeTimer = null;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          clearTimeout(wakeTimer);
          // Check day boundary immediately — if app was suspended past midnight,
          // habits and tasks should roll over right away, not wait 9s for first tick. (v2.12.74)
          checkNewDay();
          // Reset rev baseline so syncDropbox does a full pull on return —
          // Dropbox CDN may lag, so rev could appear unchanged even when
          // another device wrote new data. (BUG-002 Path B)
          lastDropboxRev = null;
          _refreshSyncCache();
          // Sync on wake — but silently. After sleep, network may not be ready yet.
          // No red dot for transient wake failures. (BUG-003)
          _wakeSyncSilent = true;
          syncDropbox();
          syncTrello();
          renderTrello(); // age-buckets are time-based — update immediately on wake
          setTimeout(() => { _wakeSyncSilent = false; }, 3000);
          // Unified wake handler — repaint, focus cleanup, triage, pending backup
          if (window._onWake) window._onWake();
          // Live meeting: verify the recorder survived suspension (iOS kills it on
          // screen lock). Direct call, not via _onWake — that path is debounced and
          // _appReady-gated; this check must run on every return to visible.
          if (typeof _meetingHealthCheck === 'function') _meetingHealthCheck();
          // Start ticker
          wakeTimer = setTimeout(() => { startTicker(); }, 2000);
        } else {
          clearTimeout(wakeTimer);
          stopTicker();
          // Mark when a live meeting went hidden — if iOS kills the mic during
          // suspension, the honest note reports time kept up to this moment.
          if (typeof _mtg !== 'undefined' && _mtg && _mtg.live) _mtg.hiddenAt = Date.now();
        }
      });

      // On reconnect: push any offline mutations first, then refresh Trello, then resume sync
      window.addEventListener('online', async () => {
        const token       = localStorage.getItem('dropbox_token');
        const lastChange  = _getLastLocalChange();
        const lastBackup  = localStorage.getItem('last_successful_backup');

        // If local mutations happened after the last successful backup:
        // pull remote first, merge with local offline edits, then push merged result.
        // This preserves check/uncheck timestamps from the other device.
        if (token && lastChange && (!lastBackup || lastChange > lastBackup)) {
          try {
            const r = await fetch('https://content.dropboxapi.com/2/files/download', {
              method: 'POST',
              headers: {
                'Authorization':   `Bearer ${token}`,
                'Dropbox-API-Arg': JSON.stringify({ path: DROPBOX_FILE }),
              },
            });
            if (r.ok) {
              const remoteData = await r.json();
              mergeRemoteData(remoteData); // renderManual called inside if tasks changed
            }
          } catch(e) { /* push local as-is if fetch fails */ }
          await dropboxBackup(true);
          renderManual(); // always re-render after reconnect merge — DOM may be stale
          updateStats();
        }

        // Refresh Trello so cached tasks get replaced with fresh data
        // fromSync=true: reconnect is a background event — transient errors must not open the config panel
        const cfg = getSavedConfig();
        if (cfg.apiToken && cfg.boardId) loadTrello(true);

        // Resume sync ticker (2s delay to let backup settle)
        clearTimeout(wakeTimer);
        wakeTimer = setTimeout(() => { syncAll(); startTicker(); }, 2000);
      });

      // On disconnect: stop ticker cleanly — navigator.onLine guards inside syncTrello/syncDropbox
      // already protect against stray fetches, but stopping is cleaner
      window.addEventListener('offline', () => {
        clearTimeout(wakeTimer);
        stopTicker();
        _applyOfflinePanel();
      });

      window.addEventListener('online', () => {
        _applyOfflinePanel();
      }, { capture: true });

      // Seed baselines before starting ticker so first tick has something to compare.
      // Was gated on window.load — but load waits for every subresource (icons, OG
      // image, all splash launch-screens), while the splash animation itself only
      // waits on fonts. That gap meant sync started later than it needed to, eating
      // into overlap with splash time instead of running fully in its shadow. Fires
      // right after init() instead — init() is synchronous, so this still can't run
      // before init() finishes; only the "wait for window.load" gate is removed.
      {
        // Defer heavy sync work to avoid blocking first interaction
        // Use setTimeout(0) to yield to the event loop after initial paint
        setTimeout(async () => {
          // Sync bookkeeping that doesn't change what's on screen (rev seed + push-back
          // of local-only changes) is deferred until AFTER the splash gate fires — it
          // was adding 1–2 awaited round-trips (3 when the merged push ran) to every
          // splash, felt as a slow "explosion". Only the pull+merge gates the splash.
          let deferredSyncBookkeeping = null;
          try {
            const cfg = getSavedConfig();
            if (cfg.apiKey && cfg.apiToken && cfg.boardId) {
              const r = await fetch(`https://api.trello.com/1/boards/${cfg.boardId}?fields=dateLastActivity&key=${cfg.apiKey}`, {
                headers: { Authorization: `OAuth oauth_consumer_key="${cfg.apiKey}", oauth_token="${cfg.apiToken}"` }
              }).catch(() => null);
              if (r && r.ok) { const b = await r.json(); if (b) lastTrelloDate = b.dateLastActivity; }
            }
            const token = localStorage.getItem('dropbox_token');
            if (token) {
              // Always pull remote and merge on load — ensures fresh data after refresh
              // mergeRemoteData handles conflicts: union for tasks, most-recent-wins for done state
              try {
                await _dropboxEnsureToken();
                const freshToken = localStorage.getItem('dropbox_token');
                if (freshToken) {
                  const r = await fetch('https://content.dropboxapi.com/2/files/download', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${freshToken}`,
                      'Dropbox-API-Arg': JSON.stringify({ path: DROPBOX_FILE }),
                    },
                  });
                  if (r.ok) {
                    const remoteData = await r.json();
                    const changed = mergeRemoteData(remoteData);
                    // Re-check Trello cards against the now-merged doneIds — loadTrello()
                    // in init() ran before this restore landed, so on a fresh device an
                    // old completed-but-never-archived card can still be showing as active.
                    if (typeof _reconcileTrelloAfterMerge === 'function') _reconcileTrelloAfterMerge();
                    // Track when we last successfully pulled
                    localStorage.setItem('last_sync_read', new Date().toISOString());
                    deferredSyncBookkeeping = async () => {
                      try {
                        // Seed rev so ticker doesn't re-trigger on same data
                        const meta = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ path: DROPBOX_FILE }),
                        });
                        if (meta.ok) {
                          const m = await meta.json();
                          if (m && m.rev && window._dbxSetRev) window._dbxSetRev(m.rev);
                        }
                        // If local had changes that weren't in remote, push merged result
                        // (dropboxBackup re-seeds the rev after its own write)
                        if (changed) await dropboxBackup(true);
                      } catch(e) { _logSyncError('Dropbox', 'Rev seed: ' + e.message); }
                    };
                  }
                }
              } catch(e) { _logSyncError('Dropbox', 'Initial pull: ' + e.message); }
            }
          } catch(e) { _logSyncError('Sync', 'Startup: ' + e.message); }

          // New-day cleanup runs here — AFTER Dropbox restore — so we always clean
          // the freshest data. Running it in init() before the restore caused done
          // tasks to reappear because the Dropbox pull overwrote the cleaned state.
          applyNewDayCleanup();
          renderManual();
          updateStats();

          // Re-check triage now that sync and cleanup are done — init() ran too early
          // when doneIds might not have been merged yet, causing done tasks to appear
          checkTriageBar();
          // Re-check nudge — applyNewDayCleanup() sets morning_nudge_count but init()'s
          // checkDayNudge() ran before cleanup (count may have been missing/stale).
          // Mirrors what the Dropbox restore path already does at line 8700.
          if (typeof checkDayNudge === 'function') checkDayNudge();
          // Same fix, same reason, for the Sunday/habit badges — both read
          // Dropbox-synced state (today_daily_history, habitsList/habitCompletions)
          // that init()'s early call couldn't have seen yet on a fresh device.
          if (typeof checkSundayNudge === 'function') checkSundayNudge();
          if (typeof checkHabitNudge === 'function') checkHabitNudge();

          // Signal gate — what's on screen is correct, splash can dismiss if animation
          // also done. Bookkeeping and ticker start continue below, off the gate.
          window._onAppLoadDone && window._onAppLoadDone();

          if (deferredSyncBookkeeping) await deferredSyncBookkeeping();
          // Only start ticker after baselines are seeded — an unseeded rev would make
          // the first tick do a redundant full restore of data we just merged
          startTicker();
        }, 0);
      }

    window._setLastLocalChange = _setLastLocalChange;
    window._getTrelloFocus = _getTrelloFocus;
    window._setTrelloFocus = _setTrelloFocus;
    window._getTrelloFocusTotal = _getTrelloFocusTotal;
    window._setTrelloFocusTotal = _setTrelloFocusTotal;
    window._getTrelloFirstSeen = _getTrelloFirstSeen;
    window._setTrelloFirstSeen = _setTrelloFirstSeen;
    window._getTrelloLastActive = _getTrelloLastActive;
    window._setTrelloLastActive = _setTrelloLastActive;
    window._markTrelloActive = _markTrelloActive;
    window._trelloAgeBasis = _trelloAgeBasis;
    window._getDeletedIds = _getDeletedIds;
    window._addDeletedId = _addDeletedId;
    window._cleanupDeletedIds = _cleanupDeletedIds;
    window._cleanupHabitEvents = _cleanupHabitEvents;
    window._getUncheckedIds = _getUncheckedIds;
    window._addUncheckedId = _addUncheckedId;
    window._removeUncheckedId = _removeUncheckedId;
    window._getCheckedIds = _getCheckedIds;
    window._addCheckedId = _addCheckedId;
    window._removeCheckedId = _removeCheckedId;
    window._doneTodayCount = _doneTodayCount;
    window.dropboxAutoSave = dropboxAutoSave;
    window.dropboxBackup = dropboxBackup;
    window.dropboxRestore = dropboxRestore;
    window.dropboxAuth = dropboxAuth;
    window.mergeRemoteData = mergeRemoteData;
  };
})();
