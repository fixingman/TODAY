// TODAY — Info panel, poem display, weekly digest, AI reflection, and stat rendering.
// Inert until index.html calls window._startAbout() before init().
(function() {
  'use strict';
  // Bumps when the evidence contract for the Sunday sentence changes. The dated
  // companion key prevents a previously cached, less-grounded line from surviving
  // a policy change or being restored by an older Dropbox backup.
  const WEEK_REFLECTION_POLICY = 'earned-v1';
  window._weekReflectionPolicy = WEEK_REFLECTION_POLICY;
  let started = false;
  window._startAbout = function() {
    if (started) return;
    started = true;
    // No state lives in this closure — manualTasks, trelloTasks, doneIds,
    // habitsList, habitCompletions, APP_VERSION, $ and appMemory are all
    // pre-existing inline globals read (never written) by this module.

    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

    function toggleInfo() {
      const scrollY = window.scrollY; // Preserve scroll position
      const panel = $.infoPanel;
      const isOpening = !panel.classList.contains('open');
      if (isOpening) {
        panel.style.animation = ''; // clear repaint suppression so fadeIn plays (BUG-023)
        panel.classList.add('open');
      } else {
        panel.classList.remove('open');
      }
      $.configPanel.classList.remove('open');
      _endConnectionsPrivacyVisit();
      $.habitsPanel.classList.remove('open');
      $.memoryPanel?.classList.remove('open');
      syncActiveButtons();
      window.scrollTo(0, scrollY); // Restore scroll position
      if (isOpening) {
        renderInfoStats();
        renderDailyPoem();
        const _ib = document.getElementById('infoBtn');
        if (_ib && _ib.classList.contains('btn-icon-week')) {
          _ib.classList.remove('btn-icon-week');
          localStorage.setItem('sunday_nudge_seen_' + _localISO(), '1');
          _pruneLS('sunday_nudge_seen_', 'sunday_nudge_seen_' + _localISO());
        }
        if (_ib && _ib.classList.contains('btn-icon-version')) {
          _ib.classList.remove('btn-icon-version');
          localStorage.setItem('today_seen_version', APP_VERSION);
          _versionBadgeBreathe();
        }
      }
    }

    // ─── Daily poem ──────────────────────────────────────────────────────────────
    // One human-written public-domain poem per day (corpus in assets/poems.js).
    // Deterministic by local date → same poem on every device, cycles without
    // repeats. Season pool follows the kigo idea: poems tagged for the current
    // season plus year-round ones. Hemisphere inferred from the device timezone
    // (no geolocation) — travelling flips the season with the device clock.
    // _SOUTHERN_TZ, _poemForDate(), _poemHTML(), _escPoem() → assets/poem-utils.js
    function _poemOfTheDay() { return _poemForDate(); }

    function renderDailyPoem() {
      const el = document.getElementById('dailyPoem');
      const poem = _poemOfTheDay();
      if (!el || !poem) return; // corpus missing — static haiku in the markup stays
      el.innerHTML = _poemHTML(poem.text)
        + `<div class="poem-author">${esc(poem.author)}</div>`;
    }

    // Poem tap — device-specific, mirrors what hover already gives desktop for
    // free. Desktop: hovering already reveals the highlight + label before any
    // click happens, so a single click can go straight to sharing. Touch has no
    // hover to do that reveal ahead of time, so tap itself has to carry both
    // jobs in two steps: first tap reveals (same visual state hover gives
    // desktop), second tap (while still revealed) actually shares — otherwise
    // an ordinary read-tap on mobile would fire the share sheet immediately,
    // with no equivalent of "just glancing at it" the way hovering allows.
    function _onPoemTap(event) {
      if (event?.detail === 0 || window.matchMedia('(hover: hover)').matches) { _shareDailyPoem(); return; }
      const block = document.getElementById('poemBlock');
      if (block && !block.classList.contains('revealed')) {
        block.classList.add('revealed');
        return;
      }
      _shareDailyPoem();
    }

    // Poem share (Backlog: Poem share) — one tap, no server, no share-count
    // tracking. Native share sheet where available; clipboard copy otherwise,
    // reusing the same fallback chain as the task-copy button.
    function _shareDailyPoem() {
      const poem = _poemOfTheDay();
      if (!poem) return;
      const dateStr = _localISO();
      const poemUrl = 'https://today-here.netlify.app/poem.html?date=' + dateStr;
      const text = poem.text + '\n— ' + poem.author;
      const btn = document.getElementById('poemShareBtn');
      // Immediate click acknowledgment, independent of which branch runs below —
      // navigator.share() itself gives no usable completion signal (its promise
      // only resolves once the OS sheet is fully dismissed, sometimes much later,
      // and gives no "shared successfully" moment to hook a "copied"-style label
      // change to), so without this the click produced zero visible feedback on
      // any device where navigator.share exists (i.e. most real devices — this
      // was invisible in earlier testing here specifically because forcing
      // navigator.share undefined to test the clipboard fallback also hid this gap).
      if (btn) {
        btn.classList.add('clicked');
        setTimeout(() => btn.classList.remove('clicked'), 400);
      }
      function _showCopied() {
        if (!btn) return;
        btn.textContent = 'copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'share';
          btn.classList.remove('copied');
        }, 1800);
        if (window._a11yAnnounce) _a11yAnnounce('Poem link copied.');
      }
      if (navigator.share) {
        if (window._a11yAnnounce) _a11yAnnounce('Share sheet opened.');
        navigator.share({ title: poem.author + ' · TODAY', text, url: poemUrl }).catch(() => {});
        return;
      }
      _copyToClipboard(poemUrl, _showCopied);
    }

    function _copyToClipboard(text, onCopied) {
      const _ta = () => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
          document.body.appendChild(ta);
          ta.focus(); ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          if (onCopied) onCopied();
        } catch (_) {}
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => { if (onCopied) onCopied(); }).catch(_ta);
      } else { _ta(); }
    }

    // Format focus time: "Xh Ym" if >= 60 minutes, "Xm" otherwise
    // Show a nudge block with a landing animation when transitioning from hidden.
    // forceAnimate=true re-runs the animation on an already-visible block (fresh async content).
    function _nudgeBlockShow(el, delayMs, forceAnimate) {
      const wasHidden = el.style.display === 'none';
      el.style.display = '';
      if (wasHidden || forceAnimate) {
        el.classList.remove('_nudge-entering');
        void el.offsetWidth; // force reflow so re-adding the class restarts the animation
        if (delayMs) el.style.animationDelay = delayMs + 'ms';
        else el.style.animationDelay = '';
        el.classList.add('_nudge-entering');
        el.addEventListener('animationend', () => {
          el.classList.remove('_nudge-entering');
          el.style.animationDelay = '';
        }, { once: true });
      }
    }
    // Animate an element's text landing in place (async resolve — "reflecting…" → real content).
    function _nudgeTextResolve(el) {
      el.classList.remove('_nudge-text-resolving');
      void el.offsetWidth;
      el.classList.add('_nudge-text-resolving');
      el.addEventListener('animationend', () => el.classList.remove('_nudge-text-resolving'), { once: true });
    }

    function renderInfoStats() {
      let _nudgeStagger = 0; // increments per visible block for staggered entrance
      // Pull stats from localStorage
      const focusMinsToday = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
      const streak = parseInt(localStorage.getItem('stat_streak') || '1');
      
      // Flow rate: research-based diminishing returns formula
      // Based on: Endowed Progress Effect (Nunes & Dreze 2006), Goal Gradient Hypothesis (Kivetz et al. 2006)
      // First task = ~20% (quick win), decelerates after (fast start, slow finish)
      // Formula: 100 × (1 - 0.8^done) — 5 tasks ≈ 67% "good day"
      const allTasks = [...manualTasks, ...pastTasks, ...(trelloTasks || [])];
      const totalDone = allTasks.filter(t => doneIds.has(t.id)).length;
      const flowRate = Math.round(100 * (1 - Math.pow(0.8, totalDone)));

      const stats = [
        { val: streak + 'd', label: 'Streak', id: 'statStreakVal' },
        { val: flowRate + '%', label: 'Flow' },
        { val: _formatFocusTime(focusMinsToday), label: 'Focus' },
      ];

      document.getElementById('infoStats').innerHTML = stats.map(s => `
        <div class="info-stat">
          <div class="info-stat-val"${s.id ? ` id="${s.id}"` : ''}>${s.val}</div>
          <div class="info-stat-label">${s.label}</div>
        </div>`).join('');

      if (localStorage.getItem('_streak_milestone_pending') === '1') {
        localStorage.removeItem('_streak_milestone_pending');
        requestAnimationFrame(() => {
          const el = document.getElementById('statStreakVal');
          if (el) {
            el.classList.add('milestone-pulse');
            el.addEventListener('animationend', () => el.classList.remove('milestone-pulse'), { once: true });
          }
        });
      }

      // ── Week grid ───────────────────────────────────────────────────────────────
      const _history = safeJSON('today_daily_history', []);
      const _today   = _localISO();
      const _isSun   = new Date().getDay() === 0;

      // Build 7-day window ending today
      const _days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');
        const letter = ['S','M','T','W','T','F','S'][d.getDay()];
        const entry = _history.find(e => e.date === iso);
        // Today: read live counters; prior days: use snapshot
        const tasks = iso === _today
          ? [...manualTasks, ...pastTasks, ...(trelloTasks || [])].filter(t => doneIds.has(t.id)).length
          : (entry ? entry.tasksDone : null);
        const focus = iso === _today
          ? parseInt(localStorage.getItem('stat_focus_mins_today') || '0')
          : (entry ? entry.focusMins : null);
        // Habit data for the composite "best day" dot — live for today, snapshot for past days
        const _activeHabits = habitsList.filter(h => !h.archived);
        const habitsTotal = iso === _today
          ? _activeHabits.length
          : (entry ? (entry.habitsTotal || 0) : 0);
        const habitsKept = iso === _today
          ? _activeHabits.filter(h => (habitCompletions[h.id] || []).includes(_habitTodayISO())).length
          : (entry ? (entry.habitsKept || 0) : 0);
        _days.push({ iso, letter, tasks, focus, habitsKept, habitsTotal, isToday: iso === _today });
      }

      const _weekSection = document.getElementById('weekSection');
      const _hasData = _days.some(d => d.tasks !== null);
      if (_weekSection) {
        _weekSection.style.display = _hasData ? '' : 'none';
        if (_hasData && !_weekSection._moreWired) {
          _weekSection._moreWired = true;
          let _moreDismiss;
          _weekSection.addEventListener('touchstart', function() {
            clearTimeout(_moreDismiss);
            _weekSection.classList.add('touched');
            _moreDismiss = setTimeout(() => _weekSection.classList.remove('touched'), 2500);
          }, { passive: true });
        }
      }

      const _weekGrid = document.getElementById('weekGrid');
      if (_weekGrid) {
        // Bar scale (①): height encodes tasks relative to the week's busiest day
        const _gMax = Math.max(1, ..._days.map(d => d.tasks || 0));
        // Your day (②): the week's best day by a composite of tasks, focus, and habits.
        // Each dimension is normalized to the week's max so the three scales are comparable,
        // then weighted. The bars already show task volume; the dot reflects a fuller "good day"
        // (a balanced day can out-score a pure task-grind day). Weights are tunable.
        const _gTot = _days.reduce((s, d) => s + (d.tasks || 0), 0);
        const _maxT = Math.max(1, ..._days.map(d => d.tasks || 0));
        const _maxF = Math.max(1, ..._days.map(d => d.focus || 0));
        const _dayScore = d => {
          const t = (d.tasks || 0) / _maxT;                                       // task volume
          const f = (d.focus || 0) / _maxF;                                       // focus depth
          const h = d.habitsTotal > 0 ? (d.habitsKept || 0) / d.habitsTotal : 0;  // habit consistency
          return 0.4 * t + 0.35 * f + 0.25 * h;
        };
        // Week must have real activity; pick the single top-scoring day; today reads accent already.
        let _yourDay = null;
        if (_gTot >= 4) {
          const _scored   = _days.map(d => ({ iso: d.iso, isToday: d.isToday, s: Math.round(_dayScore(d) * 1000) }));
          const _topScore = Math.max(..._scored.map(d => d.s));
          const _leaders  = _scored.filter(d => d.s === _topScore && d.s > 0);
          if (_leaders.length === 1 && !_leaders[0].isToday) _yourDay = _leaders[0].iso;
        }

        _weekGrid.innerHTML = _days.map(d => {
          const tStr = d.tasks === null ? '·' : String(d.tasks);
          const fStr = !d.focus ? '' : _formatFocusTime(d.focus);
          const cls  = d.tasks === null || d.tasks === 0 ? 'zero' : (d.isToday ? 'is-today' : '');
          // Nonzero days get a small floor height so they read; zero/null = empty track
          const pct  = (d.tasks || 0) > 0 ? Math.max(14, Math.round((d.tasks / _gMax) * 100)) : 0;
          const fillCls = d.isToday ? 'week-col-bar-fill is-today' : 'week-col-bar-fill';
          const isWin  = d.iso === _yourDay;
          const dotCls = isWin ? 'week-col-dot on' : 'week-col-dot';
          let dotTitle = '';
          if (isWin) {
            const parts = [(d.tasks || 0) + ' done'];
            if (d.focus) parts.push(_formatFocusTime(d.focus) + ' focused');
            if (d.habitsTotal > 0) parts.push(d.habitsKept + '/' + d.habitsTotal + ' habits');
            dotTitle = ' title="Your best day · ' + parts.join(' · ') + '"';
          }
          return '<div class="week-col">' +
            '<div class="week-col-day">' + d.letter + '</div>' +
            '<div class="week-col-bar"><div class="' + fillCls + '" style="height:' + pct + '%"></div></div>' +
            '<div class="week-col-tasks ' + cls + '">' + tStr + '</div>' +
            '<div class="' + dotCls + '"' + dotTitle + '></div>' +
            '<div class="week-col-focus">' + fStr + '</div>' +
            '</div>';
        }).join('');
      }

      // ── Pattern-based week reflection (below grid) ─────────────────────────────
      // ── Sunday AI reflection (above stats) ─────────────────────────────────────
      const _sundayBlock = document.getElementById('sundayBlock');
      const _isMon = new Date().getDay() === 1;
      if (_sundayBlock) {
        if ((_isSun || _isMon) && _history.length > 0) {
          const _weekLabel = _isSun ? 'This week' : 'New week';
          const _cacheKey  = _isSun ? 'week_reflection_' + _today : 'monday_intention_' + _today;

          // Structured week data for the Sunday evidence gate. Monday uses its
          // own forward-looking task context and ignores this object.
          const _week  = _days.filter(d => d.tasks !== null);
          const _reflectionStats = { days: _week, history: _history };
          const _weekInsight = _isSun ? _buildWeekReflectionInsight(_reflectionStats) : null;

          _nudgeBlockShow(_sundayBlock, _nudgeStagger++ * 60);
          const _weekPolicyKey = 'week_policy_' + _today;
          let _cached = localStorage.getItem(_cacheKey);
          const _weekPolicyCurrent = !_isSun || localStorage.getItem(_weekPolicyKey) === WEEK_REFLECTION_POLICY;
          if (_isSun && !_weekPolicyCurrent) {
            // The old Sunday contract mixed lifetime memory and unrelated task
            // titles. Never preserve one of those lines under the earned-insight
            // policy, even if it was generated earlier today.
            localStorage.removeItem(_cacheKey);
            _cached = null;
          }
          if (_cached) {
            _sundayBlock.innerHTML =
              '<div class="week-label">' + _weekLabel + '</div>' +
              '<div class="week-summary">' + esc(_cached) + '</div>';
          } else if (_isSun && _weekPolicyCurrent) {
            // A current policy marker without text is the negative cache: the
            // evidence gate found nothing worth saying. The grid can stand alone.
            _sundayBlock.style.display = 'none';
          } else if (_isSun && !_weekInsight) {
            // A real negative result is worth caching; a missing key or offline
            // state below is not. That distinction lets the line retry later if
            // connectivity returns, without repeatedly asking about a flat week.
            localStorage.setItem(_weekPolicyKey, WEEK_REFLECTION_POLICY);
            _pruneLS('week_policy_', _weekPolicyKey);
            _sundayBlock.style.display = 'none';
          } else if (_isSun && (!(_aiGetKey && _aiGetKey()) || !navigator.onLine)) {
            _sundayBlock.style.display = 'none';
          } else {
            _sundayBlock.innerHTML =
              '<div class="week-label">' + _weekLabel + '</div>' +
              '<div class="week-summary loading">reflecting…</div>';
            if (_isSun) {
              localStorage.setItem(_weekPolicyKey, WEEK_REFLECTION_POLICY);
              _pruneLS('week_policy_', _weekPolicyKey);
            }
            const _fetcher = _isSun
              ? _fetchWeekReflection({ ..._reflectionStats, insight: _weekInsight })
              : _fetchMondayIntention();
            _fetcher.then(text => {
              if (text) {
                localStorage.setItem(_cacheKey, text);
                _pruneLS(_isSun ? 'week_reflection_' : 'monday_intention_', _cacheKey);
                const el = _sundayBlock.querySelector('.week-summary');
                if (el) { el.textContent = text; el.classList.remove('loading'); _nudgeTextResolve(el); }
              } else {
                _sundayBlock.style.display = 'none';
              }
            });
          }
        } else {
          _sundayBlock.style.display = 'none';
        }
      }

      // ── Week theme for Noticed (v2.39.0) — once/week AI generation, same
      // fetch-cache-live-update shape as the Sunday reflection block above. A
      // negative-cache flag ("tried") stops every subsequent About-open from
      // re-firing the AI call for a week that genuinely has no pattern — that's
      // the common case by design, not something to keep retrying.
      {
        const _weekKey = _today.slice(0, 8) + Math.ceil(new Date().getDate() / 7);
        const _themeKey = 'week_theme_ai_' + _weekKey;
        const _themeTriedKey = 'week_theme_tried_' + _weekKey;
        if (!localStorage.getItem(_themeKey) && !localStorage.getItem(_themeTriedKey) && _history.length > 0) {
          _pruneLS('week_theme_tried_', _themeTriedKey);
          localStorage.setItem(_themeTriedKey, '1');
          _fetchWeekThemeAI().then(text => {
            if (text) {
              _pruneLS('week_theme_ai_', _themeKey);
              localStorage.setItem(_themeKey, text);
              if ($.infoPanel && $.infoPanel.classList.contains('open')) renderInfoStats();
            }
          });
        }
      }

      // ── Today's nudge line (above stats) — quiet second home (v2.33.0) ─────────
      // The morning strip is dismiss-once-and-gone; the line itself stays cached
      // until midnight (dated key). Re-surfaced here for the reflect-during-the-day
      // pattern the Roadmap #1 verdict confirmed. Hidden when no line exists.
      const _nudgeBlock = document.getElementById('todayNudgeBlock');
      if (_nudgeBlock) {
        const _dayLine = localStorage.getItem('day_nudge_ai_' + _today) || '';
        if (_dayLine) {
          _nudgeBlock.innerHTML =
            '<div class="week-label">Today</div>' +
            '<div class="week-summary">' + esc(_dayLine) + '</div>';
          _nudgeBlockShow(_nudgeBlock, _nudgeStagger++ * 60);
        } else {
          _nudgeBlock.style.display = 'none';
        }
      }

      // ── Noticed (below the Today line) — what TODAY has learned, delta-gated ────
      // _noticedLines() marks each line shown-once in appMemory.noticed; a dated
      // day-cache keeps the lines visible for the rest of the day (a milestone that
      // vanishes on the second panel open would feel like a glitch), self-expiring
      // at midnight with _pruneLS clearing stragglers on the next write.
      const _noticedEl = document.getElementById('noticedBlock');
      if (_noticedEl && typeof _noticedLines === 'function') {
        const _nKey = 'noticed_lines_' + _today;
        const _prior = safeJSON(_nKey, []);
        const _fresh = _noticedLines(); // can't duplicate prior — show-once bookkeeping
        const _isSeason = e => e && typeof e === 'object' && e._season;
        let _all;
        if (_prior.some(_isSeason)) {
          // Season already shown today — preserve it, suppress any new fresh lines
          _all = _prior.filter(_isSeason);
        } else if (_fresh.some(_isSeason)) {
          // Season fires now — it owns the full block; ignore prior + other fresh lines
          _all = _fresh.filter(_isSeason);
          _pruneLS('noticed_lines_', _nKey);
          localStorage.setItem(_nKey, JSON.stringify(_all));
        } else {
          _all = _prior.concat(_fresh).slice(0, 2);
          if (_fresh.length) {
            _pruneLS('noticed_lines_', _nKey);
            localStorage.setItem(_nKey, JSON.stringify(_all));
          }
        }
        if (_all.length) {
          const _noticedWasHidden = _noticedEl.style.display === 'none';
          _noticedEl.innerHTML = '<div class="week-label">Noticed</div>' +
            _all.map((l, i) => {
              const _cls = '"week-summary' + (i >= _prior.length ? ' _nudge-fresh' : '') + '"';
              if (_isSeason(l)) {
                return '<div class=' + _cls + '><span class="noticed-term">' + esc(l.term) + '</span>' + esc(l.line) + '</div>';
              }
              return '<div class=' + _cls + '>' + esc(l) + '</div>';
            }).join('');
          _nudgeBlockShow(_noticedEl, _nudgeStagger++ * 60);
          // Fresh lines inside an already-visible block: animate just those spans.
          if (_fresh.length && !_noticedWasHidden) {
            _noticedEl.querySelectorAll('._nudge-fresh').forEach(el => _nudgeTextResolve(el));
          }
        } else {
          _noticedEl.style.display = 'none';
        }
      }
    }

    async function _fetchWeekReflection(stats) {
      try {
        const key = _aiGetKey ? _aiGetKey() : null;
        if (!key || !navigator.onLine) return null;
        const insight = stats.insight || _buildWeekReflectionInsight(stats);
        if (!insight) return null;
        const userContent =
          'Verified observation type: ' + insight.kind + '\n' +
          'Evidence: ' + insight.evidence + '\n' +
          'Useful meaning: ' + insight.meaning + '\n\n' +
          'Write the Sunday line. Give this observation personality and warmth, but preserve its epistemic limits. ' +
          'You may use a light metaphor or dry wit when it clarifies the pattern. Do not introduce any fact not present above.';
        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: _aiGetProvider(),
            apiKey: key,
            messages: [{ role: 'user', content: userContent }],
            systemPrompt: 'One sentence only. No quotes. Under 22 words. Confident voice, conservative claim. Be intentional, smart, useful, and quietly human. Never infer identity or personality, never say who the person is, never claim causation from correlation, and never restate a visible counter without adding meaning. If the evidence cannot support a useful line, reply exactly: none.',
          }),
        });
        if (!res.ok) return null;
        const text = _parseAIText(await res.json());
        return _weekReflectionTextIsGrounded(text) ? text : null;
      } catch (e) {
        return null;
      }
    }

    // Week theme for Noticed (v2.39.0) — replaces the old deterministic keyword-
    // frequency signal. That version just counted repeated words ("'cleanup' keeps
    // coming up") — a stat, not an observation. This asks the model to read the
    // actual completed-task texts and name a genuine pattern if one exists, grounded
    // in what was really done, never a fabricated specific. If nothing genuine
    // stands out, it returns null and the caller shows nothing — silence is correct
    // for a week with no real shape, not a forced insight.
    async function _fetchWeekThemeAI() {
      try {
        const key = _aiGetKey ? _aiGetKey() : null;
        if (!key || !navigator.onLine) return null;

        // Build behavioral data — NOT task content (which "This week" already covers).
        // "Noticed" observes HOW/WHEN they work, not WHAT they worked on.
        const m = appMemory;
        const dailyHistory = (typeof safeJSON === 'function') ? safeJSON('today_daily_history', []) : [];
        // Migration guard: tasksAdded was cumulative before the fix; convert to per-day deltas if needed.
        if (dailyHistory.length > 0 && !dailyHistory[0].tasksAddedFixed) {
          dailyHistory.sort((a, b) => a.date.localeCompare(b.date));
          for (let _mi = dailyHistory.length - 1; _mi >= 0; _mi--) {
            const _mp = _mi > 0 ? dailyHistory[_mi - 1].tasksAdded : 0;
            dailyHistory[_mi].tasksAdded = Math.max(0, (dailyHistory[_mi].tasksAdded || 0) - _mp);
            dailyHistory[_mi].tasksAddedFixed = true;
          }
          localStorage.setItem('today_daily_history', JSON.stringify(dailyHistory));
        }
        const behavioralLines = [];

        // Peak hour
        if (m.preferences?.peakHour !== null && m.preferences?.peakHour !== undefined) {
          const h = m.preferences.peakHour;
          behavioralLines.push(`Peak completion hour: ${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`);
        }

        // Focus correlation
        const _focusDays = dailyHistory.filter(e => (e.focusMins || 0) > 0);
        const _noFocusDays = dailyHistory.filter(e => (e.focusMins || 0) === 0 && e.tasksDone > 0);
        if (_focusDays.length >= 5 && _noFocusDays.length >= 5) {
          const _fAvg = (_focusDays.reduce((s, e) => s + e.tasksDone, 0) / _focusDays.length).toFixed(1);
          const _nfAvg = (_noFocusDays.reduce((s, e) => s + e.tasksDone, 0) / _noFocusDays.length).toFixed(1);
          behavioralLines.push(`Focus-session days: avg ${_fAvg} tasks done; non-focus days: avg ${_nfAvg} tasks (${_focusDays.length} vs ${_noFocusDays.length} days)`);
        }

        // Habit → output correlation
        const _habitDays = dailyHistory.filter(e => e.habitsTotal > 0);
        if (_habitDays.length >= 7) {
          const _fullH = _habitDays.filter(e => e.habitsKept >= e.habitsTotal);
          const _partH = _habitDays.filter(e => e.habitsKept < e.habitsTotal);
          if (_fullH.length >= 3 && _partH.length >= 3) {
            const _fhAvg = (_fullH.reduce((s, e) => s + e.tasksDone, 0) / _fullH.length).toFixed(1);
            const _phAvg = (_partH.reduce((s, e) => s + e.tasksDone, 0) / _partH.length).toFixed(1);
            behavioralLines.push(`All habits kept → avg ${_fhAvg} tasks done; partial habits → avg ${_phAvg} tasks (${_fullH.length} vs ${_partH.length} days)`);
          }
        }

        // Completion rate (added vs done)
        const _rateH = dailyHistory.filter(e => e.tasksAdded > 0);
        if (_rateH.length >= 5) {
          const _totalAdded = _rateH.reduce((s, e) => s + e.tasksAdded, 0);
          const _totalDone = _rateH.reduce((s, e) => s + e.tasksDone, 0);
          behavioralLines.push(`Completes ${Math.round(_totalDone / _totalAdded * 100)}% of tasks added (${_rateH.length} days)`);
        }

        // Late additions pattern (hours stored on patterns.lateAdditions)
        const _lateHours = m.patterns?.lateAdditions || [];
        if (_lateHours.length >= 5) {
          const _latePct = Math.round(_lateHours.filter(h => h >= 14).length / _lateHours.length * 100);
          behavioralLines.push(`${_latePct}% of additions happen after 2pm`);
        }

        // Day-of-week pattern
        const _byDow = {};
        for (const e of dailyHistory) {
          const d = new Date(e.date).getDay();
          if (!_byDow[d]) _byDow[d] = { total: 0, count: 0 };
          _byDow[d].total += e.tasksDone || 0;
          _byDow[d].count++;
        }
        const _dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const _dowAvgs = Object.entries(_byDow)
          .filter(([,v]) => v.count >= 3)
          .map(([d, v]) => ({ day: _dowNames[d], avg: v.total / v.count }))
          .sort((a, b) => b.avg - a.avg);
        if (_dowAvgs.length >= 3) {
          behavioralLines.push(`Most productive days: ${_dowAvgs[0].day} (${_dowAvgs[0].avg.toFixed(1)}/day), ${_dowAvgs[1].day} (${_dowAvgs[1].avg.toFixed(1)}/day)`);
        }

        if (behavioralLines.length < 2) return null; // not enough behavioral signal

        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: _aiGetProvider(),
            apiKey: key,
            messages: [{ role: 'user', content:
              'Behavioral data (all stats are independent daily averages — timing patterns are not same-day pairs):\n' + behavioralLines.join('\n') + '\n\n' +
              'Name one genuine pattern about WHEN or HOW this person works — timing, rhythm, focus sessions, habits, completion rate. ' +
              'Do NOT describe what tasks they worked on — that\'s covered elsewhere. ' +
              'Do NOT combine two timing stats into a same-day cause-effect claim — each is an independent aggregate. ' +
              'Ground it only in the numbers above, never invent. ' +
              'If nothing genuine stands out, reply with exactly: none.' }],
            systemPrompt: 'One sentence only, under 20 words. No quotes. Plain, observational, specific to their rhythm — not task content.',
          }),
        });
        if (!res.ok) return null;
        const text = _parseAIText(await res.json());
        if (!text || /^none\.?$/i.test(text.trim())) return null;
        return text;
      } catch (e) {
        return null;
      }
    }

    async function _fetchMondayIntention() {
      try {
        const key = _aiGetKey ? _aiGetKey() : null;
        if (!key || !navigator.onLine) return null;

        const _pastIds = new Set(pastTasks.map(t => t.id));
        const manualLines = manualTasks
          .filter(t => !doneIds.has(t.id) && !_pastIds.has(t.id))
          .slice(0, 5).map(t => '"' + t.text + '"');
        const soonLines = (typeof soonTasks !== 'undefined' ? soonTasks : [])
          .slice(0, 4).map(t => '"' + t.text + '"');
        const trelloLines = (trelloTasks || []).slice(0, 4).map(t => '"' + t.text + '"');

        const parts = [];
        if (manualLines.length) parts.push('Today\'s list: ' + manualLines.join(', ') + '.');
        if (soonLines.length)   parts.push('Parked for later: ' + soonLines.join(', ') + '.');
        if (trelloLines.length) parts.push('Trello cards: ' + trelloLines.join(', ') + '.');
        const ctx = parts.length ? parts.join(' ') : 'Fresh week, nothing waiting yet.';

        const memCtx = typeof _memoryForAI === 'function' ? _memoryForAI('weekly') : '';
        // BUG-085: when the task list is empty, AI was naming historical tasks from
        // suggestionHistory as if they were pending. Explicitly distinguish the two cases.
        const listIsEmpty = !manualLines.length && !soonLines.length && !trelloLines.length;
        const taskInstruction = listIsEmpty
          ? ' One sentence for Monday — a focus intention based on how this person works. Do not name any tasks; the list is empty and clear.'
          : ' One sentence for Monday — what most deserves attention this week. Only name tasks from the list above, not from history.';
        const userContent = (memCtx ? 'About this person:\n' + memCtx + '\n\n' : '') +
          ctx + taskInstruction;
        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: _aiGetProvider(),
            apiKey: key,
            messages: [{ role: 'user', content: userContent }],
            systemPrompt: 'One sentence only. No quotes. Under 20 words. Plain, warm, grounded. Speak about how this person works, not about specific tasks unless they appear in the current list.',
          }),
        });
        if (!res.ok) return null;
        return _parseAIText(await res.json());
      } catch (e) {
        return null;
      }
    }


    // Tapping anywhere outside the poem collapses a revealed-but-not-yet-shared
    // state, so a later fresh tap starts over at "reveal" rather than
    // accidentally landing on "share" from a stale earlier reveal.
    document.addEventListener('click', function(e) {
      const block = document.getElementById('poemBlock');
      if (block && block.classList.contains('revealed') && !block.contains(e.target)) {
        block.classList.remove('revealed');
      }
    });

    window.toggleInfo = toggleInfo;
    window._poemOfTheDay = _poemOfTheDay;
    window._onPoemTap = _onPoemTap;
    window._shareDailyPoem = _shareDailyPoem;
    window._copyToClipboard = _copyToClipboard;
    window.renderInfoStats = renderInfoStats;
    window._fetchWeekReflection = _fetchWeekReflection;
  };
})();
