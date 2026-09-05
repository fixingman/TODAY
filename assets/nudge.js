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
    // Tracks whether the CURRENTLY shown nudge is the generic rule-based fallback
    // (true) or the real AI line (false). Diagnosed 2026-07-29: the AI nudge was
    // generating and caching correctly every day (About's Today block, which
    // reads the same cache with no race, proved this) but the task-list nudge
    // almost never showed it — a cold Netlify+LLM round trip routinely takes
    // longer than the 1s race window, the fallback wins by default, and
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
    // 12c Phase 3: set by _fetchDayNudgeAI when a pool candidate produced the line,
    // so the spoken-line record carries the kind the novelty gate cools down on.
    let _nudgeKind = null;

    // strip wrapping quotes. For plain-text responses only — _fetchTriageHints
    // expects JSON content and does its own parsing.
    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

    function _raceAINudge({ cacheKey, cachePrefix, fetchPromise, fallbackMsg, onShow }) {
      let settled = false;
      const settle = (text, isAI) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        onShow(text, isAI);
      };
      const timer = setTimeout(() => settle(fallbackMsg, false), 1000);
      fetchPromise.then(text => {
        if (!text) { settle(fallbackMsg, false); return; }
        _pruneLS(cachePrefix, cacheKey);
        localStorage.setItem(cacheKey, text);
        settle(text, true);
      }).catch(() => settle(fallbackMsg, false));
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

      // Only show review if it's from yesterday (not stale)
      const isReviewFresh = review && review.date && review.date !== _localISO();

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
      const _aiCacheKey = 'day_nudge_ai_' + _localISO();
      const _aiCached = localStorage.getItem(_aiCacheKey);

      const _showNudge = (text, isAI) => {
        _nudgeRendered = true;
        _nudgeIsFallback = !isAI;
        nudgeEl.innerHTML = `<span class="nudge-star">✦</span><span class="nudge-text">${esc(text)}</span>`;
        _breathe(nudgeEl.querySelector('.nudge-star'), _KF_BREATHE_SMALL, 2400);
        if (!nudgeEl.classList.contains('show')) {
          nudgeEl.classList.add('show');
          requestAnimationFrame(() => nudgeEl.classList.add('visible'));
        }
        nudgeEl.onclick = () => {
          nudgeEl.classList.remove('visible');
          setTimeout(() => nudgeEl.classList.remove('show'), 300);
          // Prune stale dismiss flags from prior days, then set today's. (BUG-040)
          _pruneLS('day_nudge_dismissed_', _dismissKey);
          localStorage.setItem(_dismissKey, '1');
          localStorage.removeItem('morning_nudge_count');
          localStorage.removeItem('today_day_review');
        };
        // Light the ✦ badge once when the brief is ready — discoverability signal
        if (Today.use('connections')._aiIsConfigured() && !_aiPanelOpen) {
          const _btn = document.getElementById('todayLogo');
          if (_btn && !_btn.querySelector('.ai-badge')) {
            const _badge = document.createElement('span');
            _badge.className = 'ai-badge';
            _btn.appendChild(_badge);
            _breathe(_badge, _KF_BREATHE_SMALL, 2400);
            _aiBadgeShown = true;
          }
        }
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
      // saw as pending may since be finished — discard and regenerate rather than
      // show a sentence that might be about finished work.
      const _doneCountKey = 'day_nudge_done_count_' + _localISO();
      let _cacheValid = !!_aiCached;
      if (_aiCached) {
        const _generatedDoneCount = parseInt(localStorage.getItem(_doneCountKey) || '-1', 10);
        if (_generatedDoneCount >= 0 && doneIds.size > _generatedDoneCount) {
          _cacheValid = false;
          localStorage.removeItem(_aiCacheKey);
          localStorage.removeItem(_doneCountKey);
        }
      }

      if (_cacheValid) {
        _showNudge(_aiCached, true);
      } else if (allowGenerate && !_nudgeRacing) {
        _nudgeRacing = true;
        _raceAINudge({
          cacheKey: _aiCacheKey,
          cachePrefix: 'day_nudge_ai_',
          fetchPromise: _fetchDayNudgeAI(review, carriedOver, cards).then(text => {
            if (text) {
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
      const _day = new Date().getDay();
      if (_day !== 0 && _day !== 1) return;  // Sunday or Monday only
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
    // contract in design/Personalization.md. Deliberately sends evidence + contrast
    // and nothing else: no task list, no appMemory dump, nothing for the model to
    // choose between. Selection already happened.
    //
    // This runs *before* the task-reading nudge below and wins when a candidate
    // survives the gate. That is rare by construction — four kinds, 21-day
    // cooldowns, strict thresholds — so the great majority of mornings still take
    // the task-reading path unchanged. Small blast radius on purpose; Phase 4
    // judges real output before any of this reaches the other four surfaces.
    async function _fetchPoolNudge(key) {
      if (typeof _buildObservationCandidates !== 'function'
       || typeof _observationNoveltyGate !== 'function'
       || typeof appMemory === 'undefined') return null;

      const todayISO = _localISO();
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
            'Contrast: ' + winner.contrast + '\n\n' +
            'Write the morning line. State the contrast and leave it unresolved — the ' +
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
        // Abstention here is per-surface: the nudge does not go silent, it falls
        // through to the job it already had. The morning is the signature beat.

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const streak = parseInt(localStorage.getItem('stat_streak') || '1');
        const todayStr = _localISO();

        // Yesterday line from the day review (may be absent)
        let yLine = 'no record of yesterday';
        if (review && review.date) {
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
          'When nothing stands out, a simple quiet morning note is the right answer.';

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
        return text;
      } catch (e) {
        return null;
      }
    }

    window.checkDayNudge = checkDayNudge;
    window.checkVersionNudge = checkVersionNudge;
    window.checkSundayNudge = checkSundayNudge;
    window.checkHabitNudge = checkHabitNudge;
    // Called by dropbox.js checkNewDay() at day boundary — resets session guards so the
    // fresh day's nudge can render in a tab that stayed open across midnight.
    window._nudgeOnNewDay = function() {
      _nudgeRendered  = false;
      _nudgeRacing    = false;
      _nudgeIsFallback = false;
    };
  };
}());
