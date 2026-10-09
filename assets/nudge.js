// TODAY — morning nudge, version/Sunday/habit badge nudges.
// Inert until index.html calls window._startNudge() before init().
window._startNudge = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

    // Init, wake and sync all re-check. Render and in-flight guards are separate:
    // a settled race prevents mid-read swaps; a pending fetch prevents parallel calls.
    let _nudgeRendered = false;
    let _nudgeRacing   = false;
    let _nudgeEpoch = 0;
    // Cold-start callers such as Trello can finish before Dropbox has merged
    // appMemory.spokenLines. They may render a synced cache, but must not generate
    // a new line until the initial merge has settled; otherwise two devices can
    // independently speak the same kind inside its cooldown.
    let _memoryReady   = false;
    // Only a fallback can upgrade on a later natural check. An AI line never
    // replaces another AI line, and completion never swaps text mid-read (BUG-034).
    let _nudgeIsFallback = false;
    let _reasonDismissTimer = null;
    let _retryTimer = null;
    // Pool kind carried by the spoken record for novelty gating.
    let _nudgeKind = null;

    // About votes refresh controls, never the sentence being read.
    function _syncMorningReactionControls() {
      const reactEl = document.getElementById('dayNudgeReact');
      const line = _memoryLineFor('morning nudge', _localISO());
      if (!reactEl?.querySelector('.nudge-react') || !line) return;
      reactEl.querySelectorAll('.nudge-react-btn').forEach(btn => {
        const on = btn.dataset.react === line.reaction;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-pressed', String(on));
      });
      const reasonRow = reactEl.querySelector('.nudge-reason');
      if (reasonRow) {
        reasonRow.hidden = line.reaction !== 'missed';
        reasonRow.querySelectorAll('.nudge-reason-btn').forEach(btn => {
          const on = btn.dataset.reason === line.reactionReason;
          btn.classList.toggle('on', on);
          btn.setAttribute('aria-pressed', String(on));
        });
      }
    }
    document.addEventListener('today:spoken-reaction-change', e => {
      if (e.detail?.surface === 'morning nudge' && e.detail.date === _localISO()) _syncMorningReactionControls();
    });

    // Strip wrapping quotes from plain text, not JSON responses.
    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

    // Allow a 2–4s model round trip before the count fallback. Never swap mid-read.
    const _NUDGE_AI_WAIT_MS = 5000;
    const _NUDGE_QUIET = Symbol('morning nudge abstained');
    const _GENERATION_KEY = 'today_nudge_generation_v1';
    const _MAX_ATTEMPTS = 3;
    const _RETRY_DELAYS = [30000, 120000];
    const _REQUEST_TIMEOUT_MS = 12000;
    let _generation = safeJSON(_GENERATION_KEY, null);

    function _generationForToday() {
      const date = _localISO();
      if (!_generation || _generation.schema !== 1 || _generation.date !== date
          || !Number.isInteger(_generation.attempts) || _generation.attempts < 0
          || _generation.attempts > _MAX_ATTEMPTS || !Array.isArray(_generation.events)) {
        _generation = { schema: 1, date, attempts: 0, status: 'idle', retryAt: 0, events: [] };
      }
      return _generation;
    }
    function _generationEvent(state, path, status, httpStatus) {
      // Persist only this device's current-day delivery state. Never retain the
      // response, facts, task wording, errors, credentials or reaction reasons.
      if (state !== _generationForToday()) return;
      const event = { at: new Date().toISOString(), path, status };
      if (Number.isInteger(httpStatus)) event.httpStatus = httpStatus;
      state.events = [...(state.events || []), event].slice(-20);
      state.updatedAt = event.at;
      try { localStorage.setItem(_GENERATION_KEY, JSON.stringify(state)); } catch(e) {}
    }
    function _generationAudit() {
      const state = _generationForToday();
      return { schema: 1, version: APP_VERSION, date: state.date, attempts: state.attempts,
        status: state.status, retryAt: state.retryAt, updatedAt: state.updatedAt || null,
        events: (state.events || []).map(e => ({ ...e })) };
    }
    function _clearNudgeRetry() {
      if (_retryTimer !== null) clearTimeout(_retryTimer);
      _retryTimer = null;
    }
    function _scheduleNudgeRetry(state) {
      _clearNudgeRetry();
      if (state.terminal || state.attempts >= _MAX_ATTEMPTS || !state.retryAt
          || new Date().getHours() >= 12) return;
      const epoch = _nudgeEpoch;
      _retryTimer = setTimeout(() => {
        _retryTimer = null;
        if (epoch === _nudgeEpoch && state.date === _localISO()) checkDayNudge(true, true);
      }, Math.max(0, state.retryAt - Date.now()));
    }
    function _responseVerdict(text) {
      if (!text) return 'empty-response';
      if (text.trim().split(/\s+/).length > 30) return 'rejected-length';
      if (typeof _observationTextIsGrounded === 'function' && !_observationTextIsGrounded(text, 30))
        return 'rejected-grounding';
      return 'accepted';
    }
    async function _requestNudgeAI(body, path, state) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), _REQUEST_TIMEOUT_MS);
      let result;
      try {
        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, surface: 'daily-nudge' }), signal: controller.signal,
        });
        if (!res.ok) {
          result = { status: 'http-error', httpStatus: res.status,
            retryable: res.status === 408 || res.status === 429 || res.status >= 500 };
        } else {
          let text;
          try { text = _parseAIText(await res.json()); }
          catch(e) { result = controller.signal.aborted
            ? { status: 'request-timeout', retryable: true }
            : { status: 'unreadable-response', retryable: false }; }
          if (!result) {
            const status = _responseVerdict(text);
            result = { text: status === 'accepted' ? text : null, status, retryable: false };
          }
        }
      } catch(e) {
        result = { status: controller.signal.aborted ? 'request-timeout' : 'network-error', retryable: true };
      } finally { clearTimeout(timer); }
      _generationEvent(state, path, result.status === 'accepted' ? 'response-valid' : result.status, result.httpStatus);
      return result;
    }

    // Task-path misses steer tomorrow, not silence it. Only earlier model wording
    // enters the prompt; optional reasons stay private.
    function _taskPathMisses(todayISO) {
      const daysAgo = date => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return Infinity;
        return Math.round((Date.parse(todayISO + 'T00:00:00Z') - Date.parse(date + 'T00:00:00Z')) / 86400000);
      };
      return (appMemory.spokenLines || [])
        .filter(l => l && l.surface === 'morning nudge' && !l.kind && l.reaction === 'missed'
          && l.text && daysAgo(l.date) > 0 && daysAgo(l.date) <= 14)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)
        .map(l => String(l.text).slice(0, 200));
    }

    // Reject bare age recaps, not useful contrasts/choices. The person judges usefulness.
    function _taskNudgeOnlyInventories(text) {
      const line = String(text || '');
      const duration = /\b\d+\s+days?\b/i.test(line);
      const waiting = /\b(?:waiting|waited|open|on the list|carried over)\b/i.test(line);
      const turn = /\b(?:but|because|rather|instead|before|while|if|window|worth|decide|deciding|choice|choose|deadline|due|doesn.t|isn.t)\b/i.test(line);
      return duration && waiting && !turn;
    }

    function _raceAINudge({ cacheKey, cachePrefix, fetchPromise, fallbackMsg, onShow, isCurrent }) {
      let settled = false;
      const settle = (text, isAI) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (isCurrent() && text !== _NUDGE_QUIET) onShow(text, isAI);
      };
      // A null fallback (no rule-based line for today) waits for the AI instead.
      const timer = setTimeout(() => {
        if (fallbackMsg != null) settle(fallbackMsg, false);
      }, _NUDGE_AI_WAIT_MS);
      fetchPromise.then(text => {
        if (!isCurrent()) { settle(_NUDGE_QUIET, false); return; }
        if (text === _NUDGE_QUIET) { settle(_NUDGE_QUIET, false); return; }
        if (!text) { settle(fallbackMsg ?? _NUDGE_QUIET, false); return; }
        _pruneLS(cachePrefix, cacheKey);
        localStorage.setItem(cacheKey, text);
        if ($.infoPanel?.classList.contains('open')) Today.use('about').renderInfoStats();
        dropboxAutoSave();
        settle(text, true);
      }).catch(() => settle(fallbackMsg ?? _NUDGE_QUIET, false));
    }

    // One morning surface between SOON and Trello.
    function checkDayNudge(allowGenerate = true, background = false) {
      const nudgeEl = $.dayNudge || document.getElementById('dayNudge');
      if (!nudgeEl) return;

      // Only show in morning hours (before noon)
      const hour = new Date().getHours();
      if (hour >= 12) {
        _clearNudgeRetry();
        nudgeEl.classList.remove('visible', 'show');
        localStorage.removeItem('morning_nudge_count');
        localStorage.removeItem('today_day_review');
        // day_nudge_ai_<date> deliberately NOT cleared here (v2.33.0): the line lives
        // in About until midnight and feeds the ✦ brief all day. The dated key
        // self-expires at day change; _pruneLS on next write clears stragglers.
        // Legacy pre-2.19.0 keys — one-time sweep, no-op afterwards
        _pruneLS('morning_nudge_ai_', '');
        _pruneLS('trello_nudge_ai_', '');
        _pruneLS('morning_nudge_dismissed_', '');
        _pruneLS('trello_nudge_dismissed_', '');
        return;
      }

      // Dismissal is a display decision. Without an accepted line, background
      // recovery may still fill About, on this device or after a synced dismissal.
      const _dismissKey = 'day_nudge_dismissed_' + _localISO();
      const dismissed = !!localStorage.getItem(_dismissKey);
      const _nudgeCacheKey = _aiCacheKey('day_nudge_ai');
      const _aiCached = _aiSurfaceGet('day_nudge_ai');
      const canShow = !dismissed && !background;
      if (dismissed) {
        nudgeEl.classList.remove('visible', 'show');
        document.getElementById('dayNudgeReact')?.classList.remove('open');
        // A genuine AI dismissal never regenerates, even if its cache was pruned
        // or more tasks were completed. A spoken record is accepted-line evidence.
        if (_aiCached || _memoryLineFor('morning nudge', _localISO())) {
          _clearNudgeRetry();
          return;
        }
      }

      // Use stored count, but self-heal if missing — day-transition sets it once, but a
      // nudge dismiss clears it and a same-day re-open won't re-run cleanup to restore it.
      let carriedOver = parseInt(localStorage.getItem('morning_nudge_count') || '0');
      if (carriedOver === 0 && typeof manualTasks !== 'undefined' && typeof doneIds !== 'undefined') {
        carriedOver = manualTasks.filter(t => !doneIds.has(t.id)).length;
        if (carriedOver > 0) localStorage.setItem('morning_nudge_count', carriedOver);
      }

      // Trello: undone cards + overdue count
      const cards = (typeof trelloTasks !== 'undefined' ? trelloTasks : []).filter(t => !doneIds.has(t.id));
      const todayStr = _localISO();
      const overdueCount = cards.filter(t => t.due && t.due.slice(0, 10) < todayStr).length;

      const review = (() => {
        try { return safeJSON('today_day_review', null); }
        catch(e) { return null; }
      })();

      // Only show review if it's specifically from yesterday (not 2+ days old)
      const _yd = new Date(); _yd.setDate(_yd.getDate() - 1);
      const isReviewFresh = review && review.date && review.date === _localISO(_yd);

      if (carriedOver === 0 && cards.length === 0 && !isReviewFresh) {
        _clearNudgeRetry();
        nudgeEl.classList.remove('visible', 'show');
        return;
      }

      // Rule-based tier 1 — surface only what's important: pressing things first
      // (carried-over tasks, overdue cards), at most two clauses. Yesterday's
      // reflection only appears when nothing is pressing.
      const parts = [];
      if (carriedOver > 0) {
        parts.push(`${carriedOver} task${carriedOver === 1 ? '' : 's'} still here from yesterday`);
      }
      if (overdueCount > 0) {
        parts.push(`${overdueCount} overdue in Trello`);
      } else if (cards.length > 0) {
        parts.push(`${cards.length} card${cards.length === 1 ? '' : 's'} in Trello today`);
      }
      let msg = parts.slice(0, 2).join(' · ');
      if (!msg && isReviewFresh) {
        const yp = [];
        if (review.done > 0) yp.push(`${review.done} done`);
        if (review.focusMins >= 5) yp.push(_formatFocusTime(review.focusMins) + ' focused');
        if (review.habits > 0) yp.push(`${review.habits} habit${review.habits > 1 ? 's' : ''}`);
        if (yp.length) msg = `Yesterday: ${yp.join(', ')}`;
      }
      if (!msg) { _clearNudgeRetry(); nudgeEl.classList.remove('visible', 'show'); return; }

      // Cached AI shows directly. Otherwise wait up to 5s, then keep the fallback
      // stable until a later natural check (BUG-034).
      const _showNudge = (text, isAI) => {
        if (!canShow) return;
        if (_reasonDismissTimer) clearTimeout(_reasonDismissTimer);
        _reasonDismissTimer = null;
        _nudgeRendered = true;
        _nudgeIsFallback = !isAI;
        nudgeEl.innerHTML = `<span class="nudge-star">✦</span><span class="nudge-text">${esc(text)}</span>`;
        _breathe(nudgeEl.querySelector('.nudge-star'), _KF_BREATHE_SMALL, 2400);
        if (!nudgeEl.classList.contains('show')) {
          nudgeEl.classList.add('show');
          requestAnimationFrame(() => {
            if (!localStorage.getItem(_dismissKey) && nudgeEl.classList.contains('show')) nudgeEl.classList.add('visible');
          });
          // The strip can arrive seconds after the list (it waits for the AI line), so it
          // opens its own space rather than shoving the list down in one frame. WAAPI,
          // never CSS: the wake repaint's display toggle replays CSS animations (BUG-028).
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            nudgeEl.animate(
              [
                { maxHeight: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', overflow: 'hidden' },
                { maxHeight: '12rem', overflow: 'hidden' },
              ],
              { duration: _motionDuration('--dur-slow'), easing: _motionEasing('--ease-out') }
            );
          }
        }
        const _dismiss = () => {
          if (_reasonDismissTimer) clearTimeout(_reasonDismissTimer);
          _reasonDismissTimer = null;
          nudgeEl.classList.remove('visible');
          setTimeout(() => nudgeEl.classList.remove('show'), 300);
          if (reactEl) reactEl.classList.remove('open');
          // Prune stale dismiss flags from prior days, then set today's. (BUG-040)
          _pruneLS('day_nudge_dismissed_', _dismissKey);
          localStorage.setItem(_dismissKey, '1');
          localStorage.removeItem('morning_nudge_count');
          localStorage.removeItem('today_day_review');
          dropboxAutoSave();
        };
        // Spoken lines reveal sibling reaction buttons, never nested buttons.
        // A second sentence tap dismisses without voting.
        const reactEl = document.getElementById('dayNudgeReact');
        const spokenToday = isAI && typeof _memoryLineFor === 'function'
          ? _memoryLineFor('morning nudge', _localISO()) : null;
        if (reactEl) {
          reactEl.classList.remove('open');
          reactEl.innerHTML = '';
          reactEl.onclick = null;
          if (spokenToday) {
            const btn = (r, label) => `<button type="button" class="nudge-react-btn${spokenToday.reaction === r ? ' on' : ''}" data-react="${r}" aria-pressed="${spokenToday.reaction === r}">${label}</button>`;
            reactEl.innerHTML = `<div class="nudge-react open" role="group" aria-label="Did this land?">${btn('landed', 'landed')}${btn('missed', 'not really')}</div>` +
              _memoryMissReasonHTML('morning nudge', spokenToday);
            reactEl.onclick = e => {
              const reason = e.target.closest('.nudge-reason-btn');
              if (reason) {
                _memorySetReactionReason('morning nudge', _localISO(), reason.dataset.reason);
                if (typeof _haptic === 'function') _haptic();
                _dismiss();
                return;
              }
              if (e.target.closest('.nudge-reason-skip')) { _dismiss(); return; }
              const b = e.target.closest('.nudge-react-btn');
              if (!b) return;
              const choice = _memoryReactToLine('morning nudge', _localISO(), b.dataset.react);
              if (typeof _haptic === 'function') _haptic();
              if (choice === 'missed') {
                // The vote is already saved. This extra reason is optional: a
                // short, non-blocking window, or "done" to leave immediately.
                reactEl.querySelector('.nudge-reason').hidden = false;
                _reasonDismissTimer = setTimeout(_dismiss, 8000);
                return;
              }
              _dismiss();
            };
          }
        }
        nudgeEl.onclick = () => {
          if (spokenToday && reactEl && !reactEl.classList.contains('open')) {
            // A Dropbox merge may have changed the vote since this strip was
            // rendered; read the live record before showing its controls.
            _syncMorningReactionControls();
            reactEl.classList.add('open');
            return;
          }
          _dismiss();
        };
      };

      // Never replace a visible AI line. A fallback can upgrade on a natural check.
      if (_nudgeRendered && !_nudgeIsFallback) { _clearNudgeRetry(); return; }

      // Extra completions can stale an unseen line. Keep it for About/sync until
      // replacement succeeds; deleting first let a failed request blank every device.
      const _doneCountKey = 'day_nudge_done_count_' + _localISO();
      let _cacheValid = !!_aiCached;
      if (_aiCached) {
        const _generatedDoneCount = parseInt(localStorage.getItem(_doneCountKey) || '-1', 10);
        if (_generatedDoneCount >= 0 && doneIds.size > _generatedDoneCount) _cacheValid = false;
      }

      if (_cacheValid) {
        _clearNudgeRetry();
        _showNudge(_aiCached, true);
      } else if (allowGenerate && _memoryReady && !_nudgeRacing) {
        const state = _generationForToday();
        // Rejected prose and permanent errors are not network failures. Do not
        // repeatedly ask the model until it produces something that passes.
        if (state.terminal || state.attempts >= _MAX_ATTEMPTS || Date.now() < state.retryAt) {
          _scheduleNudgeRetry(state);
          if (!_nudgeRendered) _showNudge(msg, false);
          return;
        }
        const key = Today.use('connections')._aiGetKey();
        if (!key || !navigator.onLine) {
          _clearNudgeRetry();
          state.status = key ? 'offline' : 'not-configured';
          if (state.events?.at(-1)?.status !== state.status) _generationEvent(state, 'preflight', state.status);
          if (!_nudgeRendered) _showNudge(msg, false);
          return;
        }
        _nudgeRacing = true;
        _clearNudgeRetry();
        state.attempts++;
        state.status = 'started';
        _generationEvent(state, 'attempt', 'started');
        const epoch = _nudgeEpoch;
        const isCurrent = () => epoch === _nudgeEpoch && state.date === _localISO();
        _raceAINudge({
          cacheKey: _nudgeCacheKey,
          cachePrefix: _AI_SURFACES.find(s => s.key === 'day_nudge_ai').prefix,
          fetchPromise: _fetchDayNudgeAI(review, carriedOver, cards, state).then(result => {
            if (!isCurrent()) return _NUDGE_QUIET;
            // A sync may have supplied the accepted line while this request ran.
            // Preserve that canonical text and its votes rather than replacing it.
            const adopted = _aiSurfaceGet('day_nudge_ai');
            if (adopted && adopted !== _aiCached) {
              state.status = 'cache-adopted';
              state.retryAt = 0;
              state.terminal = false;
              _generationEvent(state, 'attempt', state.status);
              return _NUDGE_QUIET;
            }
            state.status = result.status;
            state.terminal = !result.retryable && result.status !== 'accepted';
            state.retryAt = result.retryable ? Date.now() + (_RETRY_DELAYS[state.attempts - 1] || 120000) : 0;
            _generationEvent(state, 'attempt', result.status);
            const text = result.text;
            _nudgeKind = result.kind || null;
            if (text && text !== _NUDGE_QUIET) {
              localStorage.setItem(_doneCountKey, String(doneIds.size));
              if (typeof _memoryRecordSpokenLine === 'function') _memoryRecordSpokenLine('morning nudge', text, _nudgeKind);
            }
            return text;
          }).finally(() => {
            // A yesterday request must not unlock a new day's in-flight one.
            if (isCurrent()) {
              _nudgeRacing = false;
              _scheduleNudgeRetry(state);
            }
          }),
          fallbackMsg: msg,
          // Single-arg — the old "N carried over · " prefix on AI text is gone;
          // the AI sees the counts in its facts and mentions what matters itself.
          isCurrent,
          onShow: (text, isAI) => {
            if (!canShow || new Date().getHours() >= 12 || localStorage.getItem(_dismissKey)) return;
            // A recovered answer is saved for About and the next natural check,
            // never swapped into an already-visible fallback mid-read.
            if (_nudgeRendered) return;
            _showNudge(text, isAI);
          },
        });
      }
      // else: no cache yet and generation isn't allowed at this call site (init(),
      // which runs before the Dropbox sync pull lands) — do nothing and let the
      // post-sync re-check (window 'load' handler, after mergeRemoteData) be the
      // one that generates, so the AI sees the freshest cross-device task list
      // instead of whatever this device had before syncing.
    }

    function checkVersionNudge() {
      const seen = localStorage.getItem('today_seen_version');
      if (!seen) { localStorage.setItem('today_seen_version', APP_VERSION); return; }
      if (seen === APP_VERSION) return;
      document.getElementById('infoBtn')?.classList.add('btn-icon-version');
    }

    function checkSundayNudge() {
      if (new Date().getDay() !== 0) {
        document.getElementById('infoBtn')?.classList.remove('btn-icon-week');
        return;
      }
      // Sunday's diagnostic is local-only and runs before badge/history guards so
      // an absent badge cannot hide why the deeper reflection stayed quiet. This
      // function runs again after Dropbox sync, replacing the pre-sync snapshot.
      try { Today.use('about')._debugSundayAudit(_localISO()); }
      catch (e) { console.warn('[Sunday observation audit]', e && e.message); }
      if (localStorage.getItem('sunday_nudge_seen_' + _localISO())) return;
      if (!safeJSON('today_daily_history', []).length) return;
      const btn = document.getElementById('infoBtn');
      if (btn) btn.classList.add('btn-icon-week');
    }

    function checkHabitNudge() {
      const btn = document.getElementById('habitsBtn');
      if (!btn) return;
      const hour = new Date().getHours();
      const inWindow = hour >= 22 || hour < 3;
      if (!inWindow) { btn.classList.remove('btn-icon-habits'); return; }
      const activeHabits = habitsList.filter(h => !h.archived);
      if (!activeHabits.length) { btn.classList.remove('btn-icon-habits'); return; }
      const todayISO = _habitTodayISO();
      const allDone = activeHabits.every(h => (habitCompletions[h.id] || []).includes(todayISO));
      if (allDone) { btn.classList.remove('btn-icon-habits'); return; }
      if (localStorage.getItem('habit_nudge_opened_' + todayISO)) { btn.classList.remove('btn-icon-habits'); return; }
      btn.classList.add('btn-icon-habits');
    }

    // Day nudge AI rewrite — one sentence with the single most important thing,
    // seeing both manual tasks and Trello cards (v2.19.0 merged the two fetchers).
    // Mirrors _fetchWeekReflection: silent null on any failure (rule-based stays).
    // 12c Phase 3 — the pool track.
    //
    // Code selects the observation and the model only phrases it, per the AI/data
    // contract in design/Personalization.md. Deliberately sends evidence + the
    // code-owned supported insight
    // and nothing else: no task list, no appMemory dump, nothing for the model to
    // choose between. Selection already happened.
    //
    // This runs *before* the task-reading nudge below and wins when a candidate
    // survives the gate. That is rare by construction — four kinds, 21-day
    // cooldowns, strict thresholds — so most eligible mornings take the
    // task-reading path. Recent misses guide its wording, not its availability.
    async function _fetchPoolNudge(key, state) {
      if (typeof _buildObservationCandidates !== 'function'
       || typeof _observationNoveltyGate !== 'function'
       || typeof appMemory === 'undefined') return null;

      const todayISO = _localISO();
      if (typeof _memoryStampOutcomeKeys === 'function') _memoryStampOutcomeKeys();
      const ranked = _buildObservationCandidates({
        outcomes: appMemory.taskOutcomes,
        todayISO,
        taskTexts: (typeof _memoryTaskTexts === 'function') ? _memoryTaskTexts() : {},
      });
      // Eligibility before novelty. The morning frames a day, so only kinds that
      // can point at something on the list right now are offered here; the
      // aggregate kinds go to Sunday. Verdict from the first real pool line
      // (2026-09-02): a 30-day statistic on the daily beat read as a month insight
      // and the register went cold with it. This is the fix — not the wording.
      const hasObligationOnList = (typeof manualTasks !== 'undefined' && typeof doneIds !== 'undefined'
                                   && typeof _aiCheckObligationLanguage === 'function')
        ? manualTasks.some(t => t && !doneIds.has(t.id) && _aiCheckObligationLanguage(t.text))
        : false;
      const eligible = (typeof _observationEligibleFor === 'function')
        ? _observationEligibleFor(ranked, 'nudge', { hasObligationOnList })
        : [];
      const winner = _observationNoveltyGate(eligible, {
        spokenLines: appMemory.spokenLines,
        kindVerdicts: appMemory.kindVerdicts,
        outcomes: appMemory.taskOutcomes,
        surface: 'nudge',
        todayISO,
      })[0];
      if (!winner) return null;

      const result = await _requestNudgeAI({
          provider: Today.use('connections')._aiGetProvider(),
          apiKey: key,
          messages: [{ role: 'user', content:
            'Evidence: ' + winner.evidence + '\n' +
            'Supported insight: ' + winner.insight + '\n\n' +
            'Write the morning line. Preserve the supported insight and leave its implication unresolved — the ' +
            'person supplies what it means, not you. Add no fact beyond the evidence above.' }],
          systemPrompt: 'You are the quiet companion in a minimal daily task app. One or two sentences, under 30 words. Second person — address the user as "you". Use numerals for all numbers (3 not three). No exclamation marks, no emoji. Never wrap your reply in quotation marks. Warm, plain, grounded — a friend noticing, not a coach.',
      }, 'pool', state);
      return { ...result, kind: result.status === 'accepted' ? winner.kind : null };
    }

    async function _fetchDayNudgeAI(review, carriedOver, cards, state) {
      try {
        const key = Today.use('connections')._aiGetKey();
        if (!key || !navigator.onLine) return { status: key ? 'offline' : 'not-configured', retryable: true };

        const pooled = await _fetchPoolNudge(key, state);
        if (pooled?.status === 'accepted' || pooled?.retryable || pooled?.status === 'http-error') return pooled;

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const streak = parseInt(localStorage.getItem('stat_streak') || '1');
        const todayStr = _localISO();

        // Yesterday line from the day review — only if it's specifically from yesterday
        const _ydAI = new Date(); _ydAI.setDate(_ydAI.getDate() - 1);
        const _reviewFreshAI = review && review.date && review.date === _localISO(_ydAI);
        let yLine = 'no record of yesterday';
        if (_reviewFreshAI) {
          const yp = [];
          if (review.done > 0)        yp.push(review.done + ' done');
          if (review.focusMins >= 5)  yp.push(_formatFocusTime(review.focusMins) + ' focused');
          if (review.habits > 0)      yp.push(review.habits + ' habit' + (review.habits > 1 ? 's' : ''));
          if (yp.length) yLine = yp.join(', ');
        }

        // Pending tasks with rich signals — drag order, sessions, revived flag, age.
        // Numbered so the AI knows position is intentional (user-set drag order).
        // Also exclude pastTasks IDs: if a done task re-enters manualTasks via stale sync
        // after midnight cleanup clears doneIds, pastIds catches it defensively.
        const _pastIds = new Set(pastTasks.map(t => t.id));
        const taskLines = manualTasks
          .filter(t => !doneIds.has(t.id) && !_pastIds.has(t.id))
          .slice(0, 6)
          .map((t, i) => {
            const created = Today.use('connections')._getCreatedFromId(t.id);
            const age = created ? Math.floor((Date.now() - created) / 86400000) : 0;
            const sessions = parseInt(t.focusSessions) || 0;
            const signals = [];
            if (age >= 2) signals.push(age + 'd old');
            if (sessions > 0) signals.push(sessions + ' focus session' + (sessions > 1 ? 's' : ''));
            if (t.revived) signals.push('revived from past');
            return (i + 1) + '. "' + t.text + '"' + (signals.length ? ' (' + signals.join(', ') + ')' : '');
          });

        // Trello cards with due-date and checklist markers
        const cardLines = (cards || []).slice(0, 8).map(t => {
          const dueDate = t.due && t.due.slice(0, 10);
          const dueSignal = dueDate === todayStr ? ' — due today' : (dueDate && dueDate < todayStr ? ' — overdue' : '');
          const cl = t.checklist ? ' (' + t.checklist.done + '/' + t.checklist.total + ' checked)' : '';
          return '"' + t.text + '"' + dueSignal + cl;
        });

        // Soon tasks — deferred items the AI can surface if context warrants it
        const soonLines = (typeof soonTasks !== 'undefined' ? soonTasks : [])
          .slice(0, 6)
          .map(t => {
            const created = Today.use('connections')._getCreatedFromId(t.id);
            const totalAgeDays = created ? Math.floor((Date.now() - created) / 86400000) : 0;
            const soonSince = t.zoneChangedAt ? Math.floor((Date.now() - new Date(t.zoneChangedAt).getTime()) / 86400000) : null;
            const sessions = parseInt(t.focusSessions) || 0;
            const signals = [];
            if (soonSince !== null) signals.push(soonSince + 'd in soon');
            if (totalAgeDays > soonSince + 2) signals.push(totalAgeDays + 'd old total');
            if (sessions > 0) signals.push(sessions + ' focus session' + (sessions > 1 ? 's' : '') + ' before deferral');
            if (t.returnedFrom === 'past') signals.push('returned from past');
            return '"' + t.text + '"' + (signals.length ? ' (' + signals.join(', ') + ')' : '');
          });

        // Work pattern context — peak hour, focus history, past suggestion outcomes
        const patternCtx = (typeof _memoryForAI === 'function') ? _memoryForAI('nudge') : '';

        let facts =
          'Morning check-in. Today is ' + dayNames[new Date().getDay()] + '.\n' +
          'Yesterday: ' + yLine + '.\n' +
          (carriedOver > 0 ? carriedOver + ' task(s) carried over from yesterday.\n' : '');
        if (patternCtx) facts += 'About you: ' + patternCtx + '\n';
        if (taskLines.length) facts +=
          'Tasks, in the order the user arranged them:\n' +
          taskLines.join('\n') + '\n';
        if (cardLines.length) facts += 'Trello cards:\n' + cardLines.join('\n') + '\n';
        if (!taskLines.length && !cardLines.length) facts += 'The list is empty.';
        if (soonLines.length) facts += 'Soon (deferred tasks, not today\'s list):\n' + soonLines.join('\n') + '\n';
        const misses = _taskPathMisses(todayStr);
        if (misses.length) facts += 'Recent morning lines the person marked "not really":\n' +
          misses.map(t => '- ' + t).join('\n') + '\n';

        const instruction =
          'The person is starting their morning. You have their full picture — today\'s tasks and Trello cards, ' +
          'what they\'ve deferred to Soon, yesterday\'s work, their patterns, and examples of how they tend to write tasks. ' +
          'Find the one thing worth saying that they\'d miss just by reading the list themselves. ' +
          'Understand what each task means in real life — what depends on it, what happens if they wait, ' +
          'who else might be involved, whether the window is closing — not just what the words say on the surface. ' +
          'The "About you" section tells you what has happened before — which tasks keep coming back, what has ' +
          'never been started, what they have been finishing. Use it to judge which thing matters and how much. ' +
          'It sharpens the insight; it is not the insight. Never report it back as a count. ' +
          'When you name a task, use a short fragment of its exact words so the person can spot it at a glance. ' +
          'The list order is the user\'s own arrangement, not importance. ' +
          'When nothing stands out, a simple quiet morning note is the right answer. ' +
          'Lines marked "not really" missed for this person: do not repeat their angle, their shape, or what they chose to point at.';

        const result = await _requestNudgeAI({
            provider: Today.use('connections')._aiGetProvider(),
            apiKey: key,
            messages: [{ role: 'user', content: facts + '\n\n' + instruction }],
            systemPrompt: 'You are the quiet companion in a minimal daily task app. One or two sentences, under 30 words. Second person — address the user as "you". Use numerals for all numbers (3 not three). Task text is written in the user\'s own shorthand — read the full meaning from context, not just the literal words. Never wrap your reply in quotation marks; quoting a task\'s own words inline is good. No exclamation marks, no emoji. Warm, plain, grounded — a friend noticing, not a coach.',
        }, 'task', state);
        if (result.status !== 'accepted') return result;
        // A bare recap is not worth saying, but neither is an empty morning: fall back
        // to the plain rule-based line rather than leaving the strip blank.
        if (_taskNudgeOnlyInventories(result.text)) {
          _generationEvent(state, 'task', 'rejected-recap');
          return { status: 'rejected-recap', retryable: false };
        }
        return result;
      } catch (e) {
        _generationEvent(state, 'generation', 'internal-error');
        return { status: 'internal-error', retryable: false };
      }
    }

    window.checkDayNudge = checkDayNudge;
    checkDayNudge._setMemoryReady = function(ready = true) { _memoryReady = !!ready; };
    window.checkVersionNudge = checkVersionNudge;
    window.checkSundayNudge = checkSundayNudge;
    window.checkHabitNudge = checkHabitNudge;
    Today.define('nudge', { generationAudit: _generationAudit });
    // Reconnect/wake checks complement the bounded background retry timer.
    window.addEventListener('online', () => checkDayNudge());
    // Called by dropbox.js checkNewDay() at day boundary — resets session guards so the
    // fresh day's nudge can render in a tab that stayed open across midnight.
    window._nudgeOnNewDay = function() {
      _clearNudgeRetry();
      if (_reasonDismissTimer) clearTimeout(_reasonDismissTimer);
      _reasonDismissTimer = null;
      _nudgeRendered  = false;
      _nudgeRacing    = false;
      _nudgeEpoch++;
      _nudgeIsFallback = false;
      // Yesterday's line must not stay up while today's is being written.
      const nudgeEl = $.dayNudge || document.getElementById('dayNudge');
      if (nudgeEl) nudgeEl.classList.remove('visible', 'show');
      document.getElementById('dayNudgeReact')?.classList.remove('open');
    };
  };
}());
