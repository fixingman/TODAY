// TODAY — morning nudge, version/Sunday/habit badge nudges.
// Inert until index.html calls window._startNudge() before init().
window._startNudge = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

    // Session-level guards (not per-race) — checkDayNudge() has multiple call sites
    // (init, wake, Dropbox restore, the post-sync load handler). _raceAINudge()'s own
    // "settled" flag only prevents a swap WITHIN one call's race; it can't stop a
    // LATER, separate call from finding a freshly-written cache and re-rendering with
    // different text once the first race's fetch resolves after its own timeout
    // already displayed the fallback — the actual mechanism behind the reported
    // "shows a note, then swaps a second later" bug. _nudgeRendered blocks any further
    // render once one has happened this page load; _nudgeRacing stops a second call
    // site from starting its own parallel race while one is already in flight.
    let _nudgeRendered = false;
    let _nudgeRacing   = false;
    // Cold-start callers such as Trello can finish before Dropbox has merged
    // appMemory.spokenLines. They may render a synced cache, but must not generate
    // a new line until the initial merge has settled; otherwise two devices can
    // independently speak the same kind inside its cooldown.
    let _memoryReady   = false;
    // Tracks whether the CURRENTLY shown nudge is the generic rule-based fallback
    // (true) or the real AI line (false). Diagnosed 2026-07-29: the AI nudge was
    // generating and caching correctly every day (About's Today block, which
    // reads the same cache with no race, proved this) but the task-list nudge
    // almost never showed it — a cold Netlify+LLM round trip routinely takes
    // longer than the (then) 1s race window, the fallback wins by default, and
    // _nudgeRendered then blocks the rest of that page load from ever checking
    // again, even after the real line finishes generating moments later and
    // sits unused in the same cache About reads fine. _nudgeIsFallback lets
    // exactly one upgrade through — fallback shown → AI text later becomes
    // available → next natural re-check (wake, a later sync tick) shows it —
    // without reopening the door BUG-034 closed (an AI answer is never allowed
    // to replace another AI answer, or fire twice; only a plain fallback may be
    // upgraded, once, and only from a genuinely later call, never a same-instant
    // swap while still mid-read).
    let _nudgeIsFallback = false;
    let _reasonDismissTimer = null;
    // 12c Phase 3: set by _fetchDayNudgeAI when a pool candidate produced the line,
    // so the spoken-line record carries the kind the novelty gate cools down on.
    let _nudgeKind = null;

    // About can change today's reaction while the task-list strip is already
    // mounted. Only its controls refresh: re-running checkDayNudge would either
    // hit the one-render guard or risk replacing a sentence mid-read.
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

    // strip wrapping quotes. For plain-text responses only — _fetchTriageHints
    // expects JSON content and does its own parsing.
    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

    // A Netlify + model round trip (sometimes two: the observation pool, then the task
    // path) routinely takes 2–4s. With nothing shown while waiting, a longer window costs
    // only a later arrival — whereas losing the race showed the plain count on every
    // first open of the day and held the real line back until the next open (BUG-034
    // forbids swapping it in mid-read). Failures still settle immediately below.
    const _NUDGE_AI_WAIT_MS = 5000;
    const _NUDGE_QUIET = Symbol('morning nudge abstained');

    // The pool has per-kind verdicts; ordinary task-reading lines have no kind. A miss
    // on that path steers the next line instead of silencing the morning: tomorrow's
    // list is different, and a quiet morning yields no vote to learn from. The model
    // sees only its own earlier wording — never the optional reason, which stays private.
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

    // A few age-led lines in the private voted corpus landed because they made a
    // real contrast or choice. Only reject the narrow bare-recap shape: a waiting
    // duration with no turn beyond the list itself. This is a floor, not a claim
    // that code can determine whether an observation is useful to the person.
    function _taskNudgeOnlyInventories(text) {
      const line = String(text || '');
      const duration = /\b\d+\s+days?\b/i.test(line);
      const waiting = /\b(?:waiting|waited|open|on the list|carried over)\b/i.test(line);
      const turn = /\b(?:but|because|rather|instead|before|while|if|window|worth|decide|deciding|choice|choose|deadline|due|doesn.t|isn.t)\b/i.test(line);
      return duration && waiting && !turn;
    }

    function _raceAINudge({ cacheKey, cachePrefix, fetchPromise, fallbackMsg, onShow }) {
      let settled = false;
      const settle = (text, isAI) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (text !== _NUDGE_QUIET) onShow(text, isAI);
      };
      // A null fallback (no rule-based line for today) waits for the AI instead.
      const timer = setTimeout(() => {
        if (fallbackMsg != null) settle(fallbackMsg, false);
      }, _NUDGE_AI_WAIT_MS);
      fetchPromise.then(text => {
        if (text === _NUDGE_QUIET) { settle(_NUDGE_QUIET, false); return; }
        if (!text) { settle(fallbackMsg ?? _NUDGE_QUIET, false); return; }
        _pruneLS(cachePrefix, cacheKey);
        localStorage.setItem(cacheKey, text);
        settle(text, true);
      }).catch(() => settle(fallbackMsg ?? _NUDGE_QUIET, false));
    }

    // Unified morning nudge (v2.19.0) — one surface between SOON and Trello,
    // replacing the separate manual + Trello nudges. Two nudges competed for the
    // same morning attention; one line that leads with what matters most doesn't.
    function checkDayNudge(allowGenerate = true) {
      const nudgeEl = $.dayNudge || document.getElementById('dayNudge');
      if (!nudgeEl) return;

      // Only show in morning hours (before noon)
      const hour = new Date().getHours();
      if (hour >= 12) {
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

      // Dismissed this morning — stay hidden until tomorrow (per-day flag).
      // Without this guard, the self-heal below recalculates carriedOver from
      // manualTasks and resurrects a nudge the user just dismissed on every wake. (BUG-040)
      const _dismissKey = 'day_nudge_dismissed_' + _localISO();
      if (localStorage.getItem(_dismissKey)) {
        nudgeEl.classList.remove('visible', 'show');
        return;
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
      if (!msg) { nudgeEl.classList.remove('visible', 'show'); return; }

      // ── AI-or-rule race (v2.17.129) ──
      // If AI text is cached for today, show it directly — no rule-based flash, no swap.
      // If not cached, race the AI fetch against a 1s timeout. AI wins → show Tier 2 from
      // the start. Timeout wins → show rule-based and never swap mid-display (BUG-034).
      // No content is ever replaced while the user is reading.
      const _nudgeCacheKey = _aiCacheKey('day_nudge_ai');
      const _aiCached = _aiSurfaceGet('day_nudge_ai');

      const _showNudge = (text, isAI) => {
        if (_reasonDismissTimer) clearTimeout(_reasonDismissTimer);
        _reasonDismissTimer = null;
        _nudgeRendered = true;
        _nudgeIsFallback = !isAI;
        nudgeEl.innerHTML = `<span class="nudge-star">✦</span><span class="nudge-text">${esc(text)}</span>`;
        _breathe(nudgeEl.querySelector('.nudge-star'), _KF_BREATHE_SMALL, 2400);
        if (!nudgeEl.classList.contains('show')) {
          nudgeEl.classList.add('show');
          requestAnimationFrame(() => nudgeEl.classList.add('visible'));
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
        };
        // 12e (v2.86.0): when today's line is a spoken one, the first tap reveals the
        // two states in the sibling strip instead of dismissing; a state records and
        // dismisses; tapping the sentence again dismisses without a verdict. The strip
        // is a <button>, so the states live in a sibling — never nested buttons.
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

      // Once the real AI line has shown, no further call site may render again —
      // otherwise a later call finding a freshly-cached (different) value re-renders
      // over content the user already saw. If what's showing is only the plain
      // fallback, though, let a later call site check again — see _nudgeIsFallback.
      if (_nudgeRendered && !_nudgeIsFallback) return;

      // Staleness guard: day_nudge_ai_<date> is cached once and never revalidated
      // for the rest of the day — if the AI's sentence mentions a task and the user
      // finishes it before actually looking at the banner (generated at 8am, first
      // seen at 9am, task done at 8:05am), the cached text describes already-done
      // work. Text-matching the AI's sentence against done-task text is unreliable
      // (the AI only quotes a short fragment, not the full task string), so instead
      // stamp doneIds.size at generation time and compare against the current count:
      // if more tasks are done now than when the text was written, something the AI
      // saw as pending may since be finished — regenerate rather than show a
      // sentence that might be about finished work.
      // The stale line is skipped here but never deleted: About's Today block and the
      // Dropbox upload read the same key, so deleting it before a replacement lands let
      // a failed retry blank the line for the rest of the day on every device.
      // _raceAINudge overwrites it only when a fresh line arrives.
      const _doneCountKey = 'day_nudge_done_count_' + _localISO();
      let _cacheValid = !!_aiCached;
      if (_aiCached) {
        const _generatedDoneCount = parseInt(localStorage.getItem(_doneCountKey) || '-1', 10);
        if (_generatedDoneCount >= 0 && doneIds.size > _generatedDoneCount) _cacheValid = false;
      }

      if (_cacheValid) {
        _showNudge(_aiCached, true);
      } else if (allowGenerate && _memoryReady && !_nudgeRacing) {
        _nudgeRacing = true;
        _raceAINudge({
          cacheKey: _nudgeCacheKey,
          cachePrefix: _AI_SURFACES.find(s => s.key === 'day_nudge_ai').prefix,
          fetchPromise: _fetchDayNudgeAI(review, carriedOver, cards).then(text => {
            if (text && text !== _NUDGE_QUIET) {
              localStorage.setItem(_doneCountKey, String(doneIds.size));
              if (typeof _memoryRecordSpokenLine === 'function') _memoryRecordSpokenLine('morning nudge', text, _nudgeKind);
            }
            return text;
          }),
          fallbackMsg: msg,
          // Single-arg — the old "N carried over · " prefix on AI text is gone;
          // the AI sees the counts in its facts and mentions what matters itself.
          onShow: _showNudge,
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
    // task-reading path. Its own recent misses can now pause that path without
    // muting a qualified pool observation.
    async function _fetchPoolNudge(key) {
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

      const res = await fetch('/.netlify/functions/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: Today.use('connections')._aiGetProvider(),
          apiKey: key,
          messages: [{ role: 'user', content:
            'Evidence: ' + winner.evidence + '\n' +
            'Supported insight: ' + winner.insight + '\n\n' +
            'Write the morning line. Preserve the supported insight and leave its implication unresolved — the ' +
            'person supplies what it means, not you. Add no fact beyond the evidence above.' }],
          systemPrompt: 'You are the quiet companion in a minimal daily task app. One or two sentences, under 30 words. Second person — address the user as "you". Use numerals for all numbers (3 not three). No exclamation marks, no emoji. Never wrap your reply in quotation marks. Warm, plain, grounded — a friend noticing, not a coach.',
        }),
      });
      if (!res.ok) return null;
      const text = _parseAIText(await res.json());
      // Same guard Sunday uses, at the nudge's own word cap. Rejects identity and
      // causal claims even when the model ignores the instruction.
      if (!text || (typeof _observationTextIsGrounded === 'function'
                    && !_observationTextIsGrounded(text, 30))) return null;
      _nudgeKind = winner.kind;
      return text;
    }

    async function _fetchDayNudgeAI(review, carriedOver, cards) {
      try {
        const key = Today.use('connections')._aiGetKey();
        if (!key || !navigator.onLine) return null;

        _nudgeKind = null;
        const pooled = await _fetchPoolNudge(key).catch(() => null);
        if (pooled) return pooled;

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

        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: Today.use('connections')._aiGetProvider(),
            apiKey: key,
            messages: [{ role: 'user', content: facts + '\n\n' + instruction }],
            systemPrompt: 'You are the quiet companion in a minimal daily task app. One or two sentences, under 30 words. Second person — address the user as "you". Use numerals for all numbers (3 not three). Task text is written in the user\'s own shorthand — read the full meaning from context, not just the literal words. Never wrap your reply in quotation marks; quoting a task\'s own words inline is good. No exclamation marks, no emoji. Warm, plain, grounded — a friend noticing, not a coach.',
          }),
        });
        if (!res.ok) return null;
        const text = _parseAIText(await res.json());
        // Same guard the pool path applies. Adding it there first left the split
        // incoherent: an identity or causal claim was blocked on the rare path and
        // waved through on the majority one. Rejecting falls back to the rule-based
        // line, which is the correct failure — never a claim about who you are.
        if (!text || (typeof _observationTextIsGrounded === 'function'
                      && !_observationTextIsGrounded(text, 30))) return null;
        // A bare recap is not worth saying, but neither is an empty morning: fall back
        // to the plain rule-based line rather than leaving the strip blank.
        if (_taskNudgeOnlyInventories(text)) return null;
        return text;
      } catch (e) {
        return null;
      }
    }

    window.checkDayNudge = checkDayNudge;
    checkDayNudge._setMemoryReady = function(ready = true) { _memoryReady = !!ready; };
    window.checkVersionNudge = checkVersionNudge;
    window.checkSundayNudge = checkSundayNudge;
    window.checkHabitNudge = checkHabitNudge;
    // Called by dropbox.js checkNewDay() at day boundary — resets session guards so the
    // fresh day's nudge can render in a tab that stayed open across midnight.
    window._nudgeOnNewDay = function() {
      if (_reasonDismissTimer) clearTimeout(_reasonDismissTimer);
      _reasonDismissTimer = null;
      _nudgeRendered  = false;
      _nudgeRacing    = false;
      _nudgeIsFallback = false;
      // Yesterday's line must not stay up while today's is being written.
      const nudgeEl = $.dayNudge || document.getElementById('dayNudge');
      if (nudgeEl) nudgeEl.classList.remove('visible', 'show');
      document.getElementById('dayNudgeReact')?.classList.remove('open');
    };
  };
}());
