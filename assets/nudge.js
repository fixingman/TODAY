// TODAY — morning nudge, version/Sunday/habit badge nudges.
// Inert until index.html calls window._startNudge() before init().
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
    function _generationEvent(state, path, status, httpStatus) {
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
      if (typeof _observationTextIsGrounded === 'function' && !_observationTextIsGrounded(text, Infinity))
        return 'rejected-grounding';
      if (text.trim().split(/\s+/).length > 30) return 'rejected-length';
      return 'accepted';
    }
    async function _requestNudgeAI(body, path, state, canShorten = true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), _REQUEST_TIMEOUT_MS);
      let result, text;
      const epoch = _nudgeEpoch;
      try {
        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, surface: 'daily-nudge' }), signal: controller.signal,
        });
        if (!res.ok) {
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
      _generationEvent(state, path, result.status === 'accepted' ? 'response-valid' : result.status, result.httpStatus);
      if (canShorten && result.status === 'rejected-length' && new Date().getHours() < 12
          && epoch === _nudgeEpoch && state === _generationForToday()) {
        return _requestNudgeAI({ ...body, messages: [...body.messages,
          { role: 'assistant', content: text },
          { role: 'user', content: 'Shorten that same reading to at most 30 words. Preserve its meaning, uncertainty and task references. Add no fact, interpretation or advice. Return only the complete shortened line.' },
        ] }, path + '-length-repair', state, false);
      }
      return result;
    }

    // Missed model wording may steer the next line; optional reasons stay private.
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

    function _taskNudgeOnlyInventories(text) {
      const line = String(text || '');
      const duration = /\b\d+\s+days?\b/i.test(line);
      const waiting = /\b(?:waiting|waited|open|on the list|carried over)\b/i.test(line);
      const turn = /\b(?:but|because|rather|instead|before|while|if|window|worth|decide|deciding|choice|choose|deadline|due|doesn.t|isn.t)\b/i.test(line);
      return duration && waiting && !turn;
    }

    // Settle once. A late answer saves for About, never swaps text mid-read.
    function _raceAINudge({ cacheKey, cachePrefix, fetchPromise, fallbackMsg, onShow, isCurrent }) {
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
        _pruneLS(cachePrefix, cacheKey);
        localStorage.setItem(cacheKey, text);
        if ($.infoPanel?.classList.contains('open')) Today.use('about').renderInfoStats();
        dropboxAutoSave();
        settle(text, true);
      }).catch(() => settle(fallbackMsg ?? _NUDGE_QUIET, false));
    }

    // One rule for today's saved line, asked by both the strip and About: it retires
    // once it names a task completed today (here or synced in), so neither surface
    // can show a line the other has dropped. Finishing an unrelated task keeps it.
    const _NUDGE_MENTION_STOP = new Set(['about','after','also','back','been','before','call','check','done',
      'email','find','from','have','into','just','look','make','more','need','next','order','pick','read',
      'send','some','start','take','task','tasks','than','that','them','then','they','this','today','update',
      'week','were','what','when','will','with','write','your']);
    function _doneTaskTextsToday() {
      const today = _localISO();
      const texts = [];
      const pools = [typeof manualTasks !== 'undefined' ? manualTasks : [],
        typeof trelloTasks !== 'undefined' ? trelloTasks : []];
      for (const pool of pools) for (const t of pool) if (t && t.text && doneIds.has(t.id)) texts.push(t.text);
      for (const e of (appMemory?.recentCompletedTasks || [])) if (e && e.text && e.date === today) texts.push(e.text);
      return texts;
    }
    function _dayLineNamesDoneTask(line) {
      const hay = String(line || '').toLowerCase();
      return _doneTaskTextsToday().some(text => {
        const words = (typeof _stripTag === 'function' ? _stripTag(text) : text).toLowerCase().match(/[a-zÀ-ɏ']+/g) || [];
        let keys = words.filter(w => w.length >= 4 && !_NUDGE_MENTION_STOP.has(w));
        if (!keys.length) keys = words.filter(w => w.length >= 3 && !_NUDGE_MENTION_STOP.has(w));
        return keys.some(w => {
          const stem = w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w;
          return new RegExp('(^|[^a-zÀ-ɏ])' + stem.replace(/'/g, "'?") + "(s|es|'s)?($|[^a-zÀ-ɏ])").test(hay);
        });
      });
    }
    function _currentDayLine() {
      const line = _aiSurfaceGet('day_nudge_ai');
      return line && !_dayLineNamesDoneTask(line) ? line : null;
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
        _nudgeRendered = true;
        _nudgeIsFallback = !isAI;
        _nudgeShownText = text;
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
            _syncMorningReactionControls();
            reactEl.classList.add('open');
            return;
          }
          _dismiss();
        };
      };

      // An AI line on screen stays unless the shared rule has retired or replaced it.
      if (_nudgeRendered && !_nudgeIsFallback && _nudgeShownText === _aiCurrent) { _clearNudgeRetry(); return; }
      const _retired = _nudgeRendered && !_nudgeIsFallback && !_aiCurrent;
      if (_retired) {
        // Leave at once; the replacement (or the fallback) slides back in when it settles.
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
        const isCurrent = () => epoch === _nudgeEpoch && state.date === _localISO();
        _raceAINudge({
          cacheKey: _nudgeCacheKey,
          cachePrefix: _AI_SURFACES.find(s => s.key === 'day_nudge_ai').prefix,
          fetchPromise: _fetchDayNudgeAI(review, carriedOver, cards, state).then(result => {
            if (!isCurrent()) return _NUDGE_QUIET;
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
              if (typeof _memoryRecordSpokenLine === 'function') _memoryRecordSpokenLine('morning nudge', text, _nudgeKind);
            }
            return text;
          }).finally(() => {
            if (isCurrent()) {
              _nudgeRacing = false;
              _scheduleNudgeRetry(state);
            }
          }),
          fallbackMsg: msg,
          isCurrent,
          onShow: (text, isAI) => {
            if (!canShow || new Date().getHours() >= 12 || localStorage.getItem(_dismissKey)) return;
            if (_nudgeRendered) return;
            _showNudge(text, isAI);
          },
        });
      }
      // A retired line never lingers when no replacement is being written.
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

    // Code selects the pool reading; task reading is the separate ordinary path.
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

    function _currentMorningTasks() {
      const pastIds = new Set(pastTasks.map(t => t.id));
      return manualTasks.filter(t => !doneIds.has(t.id) && !pastIds.has(t.id)).slice(0, 6);
    }

    // Opt-in and explicit constraints only; cap the entire lazy read at 800ms.
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
        if (pooled?.status === 'accepted' || pooled?.retryable || pooled?.status === 'http-error') return pooled;

        const epoch = _nudgeEpoch;
        let support = allowCalendar ? await _calendarSupport(_currentMorningTasks()) : null;
        if (support && !_calendarSupportStillCurrent(support)) support = null;
        if (epoch !== _nudgeEpoch || state.date !== _localISO() || new Date().getHours() >= 12)
          return { status: 'stale-request', retryable: false };
        // Facts follow the bounded read so edits/completions during it are current.
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
          const bounded = result.status === 'accepted' && support.policy.writerTextIsBounded(support.evidence, result.text)
            && !_taskNudgeOnlyInventories(result.text);
          if (!current || !bounded) {
            _generationEvent(state, 'task-calendar', current ? 'rejected-calendar-text' : 'stale-calendar-evidence');
            if (epoch !== _nudgeEpoch || state.date !== _localISO() || new Date().getHours() >= 12)
              return { status: 'stale-request', retryable: false };
            // One fresh ordinary recovery; never a second Calendar attempt.
            return _fetchDayNudgeAI(review, carriedOver, cards, state, false);
          }
        }
        if (result.status !== 'accepted') return result;
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
    Today.define('nudge', { generationAudit: _generationAudit, currentLine: _currentDayLine, retireStaleStrip: () => _retireStaleStrip() });
    window.addEventListener('online', () => checkDayNudge());
    // Completing a task the visible line names (here or synced in) retires it on the spot, as About does.
    function _retireStaleStrip() {
      if (_nudgeRendered && !_nudgeIsFallback && _nudgeShownText && _dayLineNamesDoneTask(_nudgeShownText)) checkDayNudge();
    }
    document.addEventListener('today:reflection-evidence-change', _retireStaleStrip);
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
