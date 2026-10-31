window._startNudge = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

    let _nudgeRendered = false;
    let _nudgeRacing   = false;
    let _nudgeEpoch = 0;
    let _memoryReady   = false;
    let _nudgeIsFallback = false;
    let _nudgeShownText = null;
    let _nudgeTouched = false;      // any press on the strip since it appeared
    let _nudgeFallbackAt = 0;       // performance.now() when the default appeared
    const _NUDGE_SWAP_WINDOW_MS = 20000;
    let _reasonDismissTimer = null;
    let _retryTimer = null;
    let _nudgeKind = null;

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

    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

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
    // Diagnostics are categorical only; never persist facts, prose, keys or votes.
    function _generationEvent(state, path, status, httpStatus, ms) {
      if (state !== _generationForToday()) return;
      const event = { at: new Date().toISOString(), path, status };
      if (Number.isInteger(httpStatus)) event.httpStatus = httpStatus;
      if (Number.isFinite(ms)) event.ms = Math.round(ms);
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
      if (typeof _observationTextIsGrounded === 'function' && !_observationTextIsGrounded(text, Infinity))
        return 'rejected-grounding';
      if (text.trim().split(/\s+/).length > 30) return 'rejected-length';
      return 'accepted';
    }
    async function _requestNudgeAI(body, path, state, canShorten = true, current = () => true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), _REQUEST_TIMEOUT_MS);
      let result, text;
      const epoch = _nudgeEpoch;
      try {
        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, surface: 'daily-nudge' }), signal: controller.signal,
        });
        if (!current()) result = {status:'stale-request',retryable:false};
        else if (!res.ok) {
          result = { status: 'http-error', httpStatus: res.status,
            retryable: res.status === 408 || res.status === 429 || res.status >= 500 };
        } else {
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
      if (!current()) result = {status:'stale-request',retryable:false};
      _generationEvent(state, path, result.status === 'accepted' ? 'response-valid' : result.status, result.httpStatus);
      if (canShorten && result.status === 'rejected-length' && new Date().getHours() < 12
          && epoch === _nudgeEpoch && state === _generationForToday()) {
        return _requestNudgeAI({ ...body, messages: [...body.messages,
          { role: 'assistant', content: text },
          { role: 'user', content: 'Shorten that same reading to at most 30 words. Preserve its meaning, uncertainty and task references. Add no fact, interpretation or advice. Return only the complete shortened line.' },
        ] }, path + '-length-repair', state, false, current);
      }
      return result;
    }

    async function _morningFeedbackPolicy() {
      let timer;
      try {
        return await Promise.race([
          import('./feedback-policy.js').then(() => Today.use('feedback-policy')),
          new Promise(resolve => { timer = setTimeout(() => resolve(null), 300); }),
        ]);
      } catch (_) { return null; }
      finally { clearTimeout(timer); }
    }
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

    function _raceAINudge({ cacheKey, cachePrefix, fetchPromise, fallbackMsg, onShow, onLate, isCurrent, onAccept, isAIValid = () => true }) {
      let settled = false;
      const settle = (text, isAI) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (isCurrent() && text !== _NUDGE_QUIET) onShow(text, isAI);
      };
      const timer = setTimeout(() => {
        if (fallbackMsg != null) settle(fallbackMsg, false);
      }, _NUDGE_AI_WAIT_MS);
      fetchPromise.then(text => {
        if (!isCurrent()) { settle(_NUDGE_QUIET, false); return; }
        if (text === _NUDGE_QUIET) { settle(_NUDGE_QUIET, false); return; }
        if (!text) { settle(fallbackMsg ?? _NUDGE_QUIET, false); return; }
        if (!isAIValid()) {settle(fallbackMsg ?? _NUDGE_QUIET,false);return;}
        onAccept?.(text);
        _pruneLS(cachePrefix, cacheKey);
        localStorage.setItem(cacheKey, text);
        if ($.infoPanel?.classList.contains('open')) Today.use('about').renderInfoStats();
        dropboxAutoSave();
        if (settled) { if (isCurrent() && onLate) onLate(text); return; }
        settle(text, true);
      }).catch(() => settle(fallbackMsg ?? _NUDGE_QUIET, false));
    }

    // A generated sentence has no verified link to an individual task. Keep the
    // accepted local-day reading stable; completion or shared words are not proof
    // that it became invalid. The strip and About read the same dated cache.
    function _currentDayLine() {
      return _aiSurfaceGet('day_nudge_ai') || null;
    }

    function checkDayNudge(allowGenerate = true, background = false) {
      const nudgeEl = $.dayNudge || document.getElementById('dayNudge');
      if (!nudgeEl) return;

      const hour = new Date().getHours();
      if (hour >= 12) {
        _clearNudgeRetry();
        nudgeEl.classList.remove('visible', 'show');
        localStorage.removeItem('morning_nudge_count');
        localStorage.removeItem('today_day_review');
        _pruneLS('morning_nudge_ai_', '');
        _pruneLS('trello_nudge_ai_', '');
        _pruneLS('morning_nudge_dismissed_', '');
        _pruneLS('trello_nudge_dismissed_', '');
        return;
      }

      const _dismissKey = 'day_nudge_dismissed_' + _localISO();
      const dismissed = !!localStorage.getItem(_dismissKey);
      const _nudgeCacheKey = _aiCacheKey('day_nudge_ai');
      const _aiCached = _aiSurfaceGet('day_nudge_ai');
      const _aiCurrent = _currentDayLine();
      const canShow = !dismissed && !background;
      if (dismissed) {
        nudgeEl.classList.remove('visible', 'show');
        document.getElementById('dayNudgeReact')?.classList.remove('open');
        if (_aiCached || _memoryLineFor('morning nudge', _localISO())) {
          _clearNudgeRetry();
          return;
        }
      }

      let carriedOver = parseInt(localStorage.getItem('morning_nudge_count') || '0');
      if (carriedOver === 0 && typeof manualTasks !== 'undefined' && typeof doneIds !== 'undefined') {
        carriedOver = manualTasks.filter(t => !doneIds.has(t.id)).length;
        if (carriedOver > 0) localStorage.setItem('morning_nudge_count', carriedOver);
      }

      const cards = (typeof trelloTasks !== 'undefined' ? trelloTasks : []).filter(t => !doneIds.has(t.id));
      const todayStr = _localISO();
      const overdueCount = cards.filter(t => t.due && t.due.slice(0, 10) < todayStr).length;

      const review = (() => {
        try { return safeJSON('today_day_review', null); }
        catch(e) { return null; }
      })();

      const _yd = new Date(); _yd.setDate(_yd.getDate() - 1);
      const isReviewFresh = review && review.date && review.date === _localISO(_yd);

      if (carriedOver === 0 && cards.length === 0 && !isReviewFresh) {
        _clearNudgeRetry();
        nudgeEl.classList.remove('visible', 'show');
        return;
      }

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

      const _showNudge = (text, isAI) => {
        if (!canShow) return;
        if (_reasonDismissTimer) clearTimeout(_reasonDismissTimer);
        _reasonDismissTimer = null;
        const _wasFallback = _nudgeRendered && _nudgeIsFallback;
        _nudgeRendered = true;
        _nudgeIsFallback = !isAI;
        _nudgeShownText = text;
        if (!isAI) { _nudgeFallbackAt = performance.now(); _nudgeTouched = false; }
        {
          const st = _generationForToday();
          const own = (st.events || []).some(e => e.status === 'response-valid');
          _generationEvent(st, 'display', !isAI ? 'default' : _wasFallback ? (own ? 'upgraded' : 'upgraded-synced') : (own ? 'line' : 'line-synced'), undefined, performance.now());
        }
        nudgeEl.innerHTML = `<span class="nudge-star">✦</span><span class="nudge-text">${esc(text)}</span>`;
        _breathe(nudgeEl.querySelector('.nudge-star'), _KF_BREATHE_SMALL, 2400);
        if (!nudgeEl.classList.contains('show')) {
          nudgeEl.classList.add('show');
          requestAnimationFrame(() => {
            if (!localStorage.getItem(_dismissKey) && nudgeEl.classList.contains('show')) nudgeEl.classList.add('visible');
          });
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
          _pruneLS('day_nudge_dismissed_', _dismissKey);
          localStorage.setItem(_dismissKey, '1');
          localStorage.removeItem('morning_nudge_count');
          localStorage.removeItem('today_day_review');
          dropboxAutoSave();
        };
        const reactEl = document.getElementById('dayNudgeReact');
        const spokenToday = isAI && typeof _memoryLineFor === 'function'
          ? _memoryLineFor('morning nudge', _localISO()) : null;
        if (reactEl) {
          reactEl.classList.remove('open');
          reactEl.innerHTML = '';
          reactEl.onclick = null;
          if (spokenToday) {
            const btn = (r, label) => `<button type="button" class="nudge-react-btn${spokenToday.reaction === r ? ' on' : ''}" data-react="${r}" aria-pressed="${spokenToday.reaction === r}">${label}</button>`;
            reactEl.innerHTML = `<div class="morning-nudge-react-body"><div class="nudge-react open" role="group" aria-label="Did this land?">${btn('landed', 'landed')}${btn('missed', 'not really')}${spokenToday.text === text ? Today.use('pool-wording').button(spokenToday) : ''}</div>` +
              _memoryMissReasonHTML('morning nudge', spokenToday) + '</div>';
            reactEl.onclick = e => {
              if (e.target.closest('[data-pool-source]')) {clearTimeout(_reasonDismissTimer);_reasonDismissTimer=null;}
              const reason = e.target.closest('.nudge-reason-btn');
              if (reason) {
                _memorySetReactionReason('morning nudge', _localISO(), reason.dataset.reason);
                if (typeof _haptic === 'function') _haptic();
                _dismiss();
                return;
              }
              const b = e.target.closest('.nudge-react-btn');
              if (!b) return;
              const choice = _memoryReactToLine('morning nudge', _localISO(), b.dataset.react);
              if (typeof _haptic === 'function') _haptic();
              if (choice === 'missed') {
                reactEl.querySelector('.nudge-reason').hidden = false;
                return;
              }
              _dismiss();
            };
          }
        }
        nudgeEl.onpointerdown = () => { _nudgeTouched = true; };
        nudgeEl.onclick = () => {
          if (!spokenToday || !reactEl) { _dismiss(); return; }
          if (!reactEl.classList.contains('open')) {
            _syncMorningReactionControls();
            reactEl.classList.add('open');
          } else {
            reactEl.classList.remove('open');
            const reasonRow = reactEl.querySelector('.nudge-reason');
            if (reasonRow) reasonRow.hidden = true;
          }
        };
      };

      // An accepted AI line stays while its dated cache is current; task completion cannot retire it.
      if (_nudgeRendered && !_nudgeIsFallback && _nudgeShownText === _aiCurrent) { _clearNudgeRetry(); return; }
      const _retired = _nudgeRendered && !_nudgeIsFallback && !_aiCurrent;
      if (_retired) {
        _nudgeRendered = false;
        _nudgeShownText = null;
        nudgeEl.classList.remove('visible', 'show');
        document.getElementById('dayNudgeReact')?.classList.remove('open');
      }

      if (_aiCurrent) {
        _clearNudgeRetry();
        _showNudge(_aiCurrent, true);
      } else if (allowGenerate && _memoryReady && !_nudgeRacing) {
        const state = _generationForToday();
        if (state.status === 'rejected-length' && state.lengthRepair !== true) state.terminal = false;
        // Resume under the original budget; accepted lines/dismissals were handled above.
        if (state.status === 'rejected-recap' && state.attempts < _MAX_ATTEMPTS) {
          state.terminal = false;
          state.status = 'idle';
          _generationEvent(state, 'policy', 'recap-filter-removed');
        }
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
        state.lengthRepair = true;
        state.status = 'started';
        _generationEvent(state, 'attempt', 'started');
        const epoch = _nudgeEpoch;
        let poolResult;
        const isCurrent = () => epoch === _nudgeEpoch && state.date === _localISO();
        const isAIValid = () => {
          const valid=!poolResult?.current || poolResult.current();
          if (!valid && isCurrent() && state.status!=='stale-request') {
            state.status='stale-request';state.terminal=true;state.retryAt=0;
            _generationEvent(state,'pool','stale-request');
          }
          return valid;
        };
        _raceAINudge({
          cacheKey: _nudgeCacheKey,
          cachePrefix: _AI_SURFACES.find(s => s.key === 'day_nudge_ai').prefix,
          fetchPromise: _fetchDayNudgeAI(review, carriedOver, cards, state).then(result => {
            poolResult=result;
            if (!isCurrent()) return _NUDGE_QUIET;
            if (!isAIValid()) return null;
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
            return text;
          }).finally(() => {
            if (isCurrent()) {
              _nudgeRacing = false;
              _scheduleNudgeRetry(state);
            }
          }),
          fallbackMsg: msg,
          isCurrent, isAIValid,
          onAccept: text => {
            if (typeof _memoryRecordSpokenLine === 'function') _memoryRecordSpokenLine('morning nudge',text,_nudgeKind);
            poolResult?.adopt?.();
          },
          onShow: (text, isAI) => {
            if (!canShow || new Date().getHours() >= 12 || localStorage.getItem(_dismissKey)) return;
            if (_nudgeRendered) return;
            _showNudge(text, isAI);
          },
          onLate: text => {
            const st = _generationForToday();
            const since = performance.now() - _nudgeFallbackAt;
            const ok = canShow && new Date().getHours() < 12 && !localStorage.getItem(_dismissKey)
              && _nudgeRendered && _nudgeIsFallback && !_nudgeTouched && since <= _NUDGE_SWAP_WINDOW_MS
              && text === _currentDayLine();
            if (!ok) { _generationEvent(st, 'display', _nudgeTouched ? 'late-kept-touched' : 'late-kept', undefined, performance.now()); return; }
            const textEl = nudgeEl.querySelector('.nudge-text');
            const dur = _motionDuration('--dur-slow');
            const swap = () => { _showNudge(text, true); _generationEvent(st, 'display', 'swapped', undefined, performance.now());
              nudgeEl.querySelector('.nudge-text')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: _motionEasing('--ease-out') }); };
            if (textEl && dur > 0) textEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: _motionEasing('--ease-out') }).finished.then(swap, swap);
            else swap();
          },
        });
      }
      // A line whose dated cache is absent never lingers when no replacement is being written.
      if (_retired && !_nudgeRendered && !_nudgeRacing) _showNudge(msg, false);
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
      const wordingAPI=Today.use('pool-wording');
      const stamp=() => JSON.stringify([_nudgeEpoch,_memoryReady,wordingAPI.source('morning nudge'),
        _currentMorningTasks().map(row => [row.id,row.text])]);
      let source=stamp();const current=() => source===stamp();
      const wording=await wordingAPI.prepare('morning nudge');
      if (!current()) return {status:'stale-request',retryable:false};
      const result = await _requestNudgeAI({
          provider: Today.use('connections')._aiGetProvider(),
          apiKey: key,
          messages: [{ role: 'user', content:
            'Evidence: ' + winner.evidence + '\n' +
            'Supported insight: ' + winner.insight + '\n\n' +
            'Write the morning line. Preserve the supported insight and leave its implication unresolved — the ' +
            'person supplies what it means, not you. Add no fact beyond the evidence above.' + wording }],
          systemPrompt: 'You are the quiet companion in a minimal daily task app. One or two sentences, under 30 words. Second person — address the user as "you". Use numerals for all numbers (3 not three). No exclamation marks, no emoji. Never wrap your reply in quotation marks. Warm, plain, grounded — a friend noticing, not a coach.',
      }, 'pool', state, true, current);
      return { ...result, current, adopt:() => {source=stamp();}, kind: result.status === 'accepted' ? winner.kind : null };
    }

    function _currentMorningTasks() {
      const pastIds = new Set(pastTasks.map(t => t.id));
      return manualTasks.filter(t => !doneIds.has(t.id) && !pastIds.has(t.id)).slice(0, 6);
    }

    async function _calendarSupport(tasks) {
      if (document.hidden || !navigator.onLine || !localStorage.getItem('calendar_refresh_token') ||
          localStorage.getItem('calendar_token_expired') === '1' ||
          !tasks.some(t => /\b(?:minutes?|mins?)\b/i.test(t.text) && /\b(?:before|by)\s+\d{1,2}:\d{2}\b/i.test(t.text))) return null;
      const epoch = _nudgeEpoch;
      let timer;
      try {
        const work = import('./calendar-nudge.js')
          .then(() => Today.use('calendar-nudge').support(tasks, () => epoch === _nudgeEpoch))
          .catch(() => null);
        return await Promise.race([work, new Promise(resolve => { timer = setTimeout(() => resolve(null), 800); })]);
      } finally { clearTimeout(timer); }
    }

    function _calendarSupportStillCurrent(support) {
      try {
        return Today.use('calendar-nudge').stillCurrent(support, _currentMorningTasks());
      } catch { return false; }
    }

    async function _fetchDayNudgeAI(review, carriedOver, cards, state, allowCalendar = true) {
      try {
        const key = Today.use('connections')._aiGetKey();
        if (!key || !navigator.onLine) return { status: key ? 'offline' : 'not-configured', retryable: true };

        const pooled = allowCalendar ? await _fetchPoolNudge(key, state) : null;
        if (pooled?.status === 'accepted' || pooled?.retryable || pooled?.status === 'http-error' || pooled?.status === 'stale-request') return pooled;

        const epoch = _nudgeEpoch;
        const [calendar, feedbackPolicy] = await Promise.all([
          allowCalendar ? _calendarSupport(_currentMorningTasks()) : null, _morningFeedbackPolicy(),
        ]);
        let support = calendar;
        if (support && !_calendarSupportStillCurrent(support)) support = null;
        if (epoch !== _nudgeEpoch || state.date !== _localISO() || new Date().getHours() >= 12)
          return { status: 'stale-request', retryable: false };
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const streak = parseInt(localStorage.getItem('stat_streak') || '1');
        const todayStr = _localISO();

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

        const morningTasks = _currentMorningTasks();
        const taskLines = morningTasks
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

        const cardLines = (cards || []).slice(0, 8).map(t => {
          const dueDate = t.due && t.due.slice(0, 10);
          const dueSignal = dueDate === todayStr ? ' — due today' : (dueDate && dueDate < todayStr ? ' — overdue' : '');
          const cl = t.checklist ? ' (' + t.checklist.done + '/' + t.checklist.total + ' checked)' : '';
          return '"' + t.text + '"' + dueSignal + cl;
        });

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
        let feedback;
        try { if (feedbackPolicy) feedback = feedbackPolicy.feedbackText(
          feedbackPolicy.taskReadingFeedback(appMemory.spokenLines, todayStr)); } catch (_) {}
        if (typeof feedback === 'string') facts += feedback;
        else {
          const misses = _taskPathMisses(todayStr);
          if (misses.length) facts += 'Recent morning lines the person marked "not really":\n' +
            misses.map(t => '- ' + t).join('\n') + '\n';
        }

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

        const ordinaryBody = {
            provider: Today.use('connections')._aiGetProvider(),
            apiKey: key,
            messages: [{ role: 'user', content: facts + '\n\n' + instruction }],
            systemPrompt: 'You are the quiet companion in a minimal daily task app. One or two sentences, under 30 words. Second person — address the user as "you". Use numerals for all numbers (3 not three). Task text is written in the user\'s own shorthand — read the full meaning from context, not just the literal words. Never wrap your reply in quotation marks; quoting a task\'s own words inline is good. No exclamation marks, no emoji. Warm, plain, grounded — a friend noticing, not a coach.',
        };
        const body = support ? { ...ordinaryBody, messages: [{ role: 'user', content:
          facts + '\n' + support.policy.writerContext(support.evidence) + '\n\n' + instruction + '\n' + support.policy.writerInstruction,
        }] } : ordinaryBody;
        const result = await _requestNudgeAI(body, support ? 'task-calendar' : allowCalendar ? 'task' : 'task-calendar-fallback', state);
        if (support && !result.retryable && result.status !== 'http-error') {
          const current = _calendarSupportStillCurrent(support);
          const bounded = result.status === 'accepted' && support.policy.writerTextIsBounded(support.evidence, result.text);
          if (!current || !bounded) {
            _generationEvent(state, 'task-calendar', current ? 'rejected-calendar-text' : 'stale-calendar-evidence');
            if (epoch !== _nudgeEpoch || state.date !== _localISO() || new Date().getHours() >= 12)
              return { status: 'stale-request', retryable: false };
            return _fetchDayNudgeAI(review, carriedOver, cards, state, false);
          }
        }
        return result;
      } catch (e) {
        _generationEvent(state, 'generation', 'internal-error');
        return { status: 'internal-error', retryable: false };
      }
    }

    window.checkDayNudge = checkDayNudge;
    checkDayNudge._setMemoryReady = function(ready = true) {
      _memoryReady = !!ready;
      document.dispatchEvent(new CustomEvent('today:memory-ready', { detail:{ready:_memoryReady} }));
    };
    window.checkVersionNudge = checkVersionNudge;
    window.checkSundayNudge = checkSundayNudge;
    window.checkHabitNudge = checkHabitNudge;
    Today.define('nudge', { generationAudit: _generationAudit, currentLine: _currentDayLine, auditLine: () => _nudgeAuditLine() });
    window.addEventListener('online', () => checkDayNudge());
    // device's audit (times, paths, elapsed seconds). Never synced; no prose, keys or votes.
    function _nudgeAuditLine() {
      const a = _generationAudit();
      const hm = iso => { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
      const sec = e => Number.isFinite(e.ms) ? ' ' + (e.ms / 1000).toFixed(1) + 's' : '';
      const label = e => {
        if (e.path === 'display') return ({ default: 'default', line: 'line', 'line-synced': 'line from other device',
          upgraded: 'upgraded', 'upgraded-synced': 'upgraded from other device', swapped: 'swapped',
          'late-kept': 'late, kept default', 'late-kept-touched': 'late, strip touched' })[e.status] || e.status;
        if (e.status === 'started') return 'asked';
        if (e.status === 'response-valid') return 'answered';
        if (e.status === 'accepted') return null;
        return (e.path.includes('length-repair') ? 'shortened: ' : '') + e.status.replace(/-/g, ' ') + (e.httpStatus ? ' ' + e.httpStatus : '');
      };
      const parts = (a.events || []).map(e => { const l = label(e); return l ? hm(e.at) + ' ' + l + sec(e) : null; }).filter(Boolean);
      return parts.length ? parts.slice(-6).join(' · ') : 'no morning activity on this device today';
    }

    document.addEventListener('click', e => {
      const label = e.target.closest?.('#todayNudgeBlock .week-label');
      if (!label) return;
      const block = document.getElementById('todayNudgeBlock');
      let line = block?.querySelector('.nudge-audit');
      if (line) { line.remove(); return; }
      line = document.createElement('div');
      line.className = 'nudge-audit';
      line.setAttribute('role', 'status');
      line.style.cssText = 'font-size:var(--text-xs);color:var(--muted);letter-spacing:0.04em;line-height:1.5;margin:2px 0 6px;';
      line.textContent = _nudgeAuditLine();
      label.after(line);
    });
    window._nudgeOnNewDay = function() {
      _clearNudgeRetry();
      if (_reasonDismissTimer) clearTimeout(_reasonDismissTimer);
      _reasonDismissTimer = null;
      _nudgeRendered  = false;
      _nudgeRacing    = false;
      _nudgeEpoch++;
      _nudgeIsFallback = false;
      _nudgeShownText = null;
      const nudgeEl = $.dayNudge || document.getElementById('dayNudge');
      if (nudgeEl) nudgeEl.classList.remove('visible', 'show');
      document.getElementById('dayNudgeReact')?.classList.remove('open');
    };
  };
}());
