// TODAY — memory panel and AI abstraction.
// Inert until index.html calls window._startMemoryPanel() before init().
(function() {
  'use strict';
  let started = false;
  window._startMemoryPanel = function() {
    if (started) return;
    started = true;

    let _memoryClearPending = false;
    let _memoryAbstractRunning = false;

    function _parseAIText(data) {
      if (data.error) return null;
      return (data.content || data.message || '').trim().replace(/^["']+|["']+$/g, '') || null;
    }

    function toggleMemory() {
      const scrollY = window.scrollY;
      const panel = $.memoryPanel;
      const isOpening = !panel.classList.contains('open');
      if (isOpening) {
        panel.style.animation = '';
        panel.classList.add('open');
      } else {
        panel.classList.remove('open');
      }
      $.configPanel.classList.remove('open');
      _endConnectionsPrivacyVisit();
      $.habitsPanel.classList.remove('open');
      $.infoPanel.classList.remove('open');
      syncActiveButtons();
      window.scrollTo(0, scrollY);
      if (isOpening) {
        let _anyNew = false;
        const _memTypes = ['semantic', 'episodic', 'procedural'];
        for (const _t of _memTypes) {
          for (const _item of (appMemory?.memory?.[_t] || [])) {
            if (_item.isNew) { _item.isNew = false; _anyNew = true; }
          }
        }
        if (_anyNew) _saveMemory();
        renderMemoryPanel();
      }
    }

    function renderMemoryPanel() {
      const el = document.getElementById('memoryContent');
      if (!el) return;
      const m = appMemory;
      if (!m) { el.innerHTML = '<div class="memory-empty">no data yet</div>'; return; }

      function typeBlock(name, desc, items, pendingNote) {
        const rows = items.length
          ? items.map(item => `<div class="memory-item">` +
                (item.isNew ? `<span class="memory-item-new"></span>` : '') +
                `<span class="memory-item-text">${esc(item.text)}</span>` +
                `</div>`
            ).join('')
          : pendingNote
            ? `<div class="memory-pending">${pendingNote}</div>`
            : `<div class="memory-empty">nothing here yet</div>`;
        return `<div class="memory-type-block">` +
          `<div class="memory-type-header">` +
          `<span class="memory-type-name">${name}</span>` +
          `<span class="memory-type-desc">${desc}</span>` +
          `</div>${rows}</div>`;
      }

      const _dowNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const _parseDowLocal = iso => { const [y,mo,d] = iso.split('-').map(Number); return new Date(y, mo-1, d).getDay(); };
      const allDailyHistory = safeJSON('today_daily_history', []);
      // One-time migration: tasksAdded was stored as a cumulative lifetime total (never
      // reset at day rollover). Convert to per-day deltas by diffing consecutive entries.
      // Marker: if any entry has tasksAddedFixed=true we've already run the migration.
      if (allDailyHistory.length > 0 && !allDailyHistory[0].tasksAddedFixed) {
        allDailyHistory.sort((a, b) => a.date.localeCompare(b.date));
        for (let _i = allDailyHistory.length - 1; _i >= 0; _i--) {
          const _prev = _i > 0 ? allDailyHistory[_i - 1].tasksAdded : 0;
          const _raw  = allDailyHistory[_i].tasksAdded || 0;
          const _delta = Math.max(0, _raw - _prev);
          allDailyHistory[_i].tasksAdded = _delta;
          allDailyHistory[_i].tasksAddedFixed = true;
        }
        localStorage.setItem('today_daily_history', JSON.stringify(allDailyHistory));
      }
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString().slice(0, 10);
      const weekHistory = allDailyHistory.filter(e => e.date >= weekAgoISO);

      // ── SEMANTIC: stable identity traits ──────────────────────────────────────
      const semanticItems = [];
      const peakHour = m.preferences?.peakHour;
      if (peakHour !== null && peakHour !== undefined) {
        const _fmtH = h => h === 0 ? 'midnight' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`;
        const _hourCounts = m.patterns?.completionsByHour || {};
        const _peakCount = _hourCounts[String(peakHour)] || 1;
        const _thresh = _peakCount * 0.5;
        const _activeHours = Object.entries(_hourCounts)
          .filter(([, c]) => c >= _thresh).map(([h]) => parseInt(h)).sort((a, b) => a - b);
        const _runs = []; let _run = [_activeHours[0]];
        for (let i = 1; i < _activeHours.length; i++) {
          if (_activeHours[i] - _activeHours[i-1] <= 1) { _run.push(_activeHours[i]); }
          else { _runs.push(_run); _run = [_activeHours[i]]; }
        }
        _runs.push(_run);
        const _peakRun = _runs.find(r => r.includes(parseInt(peakHour))) || [parseInt(peakHour)];
        if (_peakRun.length >= 2) {
          const _s = _peakRun[0], _e = _peakRun[_peakRun.length - 1];
          const _period = _s < 12 ? 'morning' : _s < 17 ? 'afternoon' : 'evening';
          semanticItems.push({ text: `most productive between ${_fmtH(_s)}–${_fmtH(_e)} — a ${_period} person` });
        } else {
          const h = parseInt(peakHour);
          const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
          semanticItems.push({ text: `tends to get most done around ${_fmtH(h)} — a ${period} person` });
        }
      }
      const samples = m.patterns?.taskLifespanSamples || [];
      if (samples.length >= 5) {
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        let lifespanText;
        if (avg < 0.5) lifespanText = 'most tasks close the same day';
        else if (avg < 1.5) lifespanText = 'tasks typically take about a day to close';
        else lifespanText = `tasks typically close in about ${Math.round(avg)} day${Math.round(avg) === 1 ? '' : 's'}`;
        semanticItems.push({ text: lifespanText });
      }
      const best = m.patterns?.bestStreak || 0;
      const _curStreak = parseInt(localStorage.getItem('stat_streak') || '0');
      if (best >= 3 && best > _curStreak) semanticItems.push({ text: `longest streak: ${best} day${best === 1 ? '' : 's'}` });
      // Day-of-week preference from all history (need >= 14 entries, >= 3 days with 2+ samples each)
      if (allDailyHistory.length >= 14) {
        const byDow = {};
        allDailyHistory.forEach(e => {
          const dow = _parseDowLocal(e.date);
          if (!byDow[dow]) byDow[dow] = [];
          byDow[dow].push(e.tasksDone);
        });
        const dowAvgs = Object.entries(byDow)
          .filter(([, vals]) => vals.length >= 2)
          .map(([dow, vals]) => [parseInt(dow), vals.reduce((s, v) => s + v, 0) / vals.length]);
        if (dowAvgs.length >= 3) {
          const [bestDow, bestAvg] = dowAvgs.sort(([, a], [, b]) => b - a)[0];
          const secondAvg = dowAvgs[1][1];
          if (bestAvg >= 2 && bestAvg > secondAvg * 1.2) {
            semanticItems.push({ text: `most productive on ${_dowNames[bestDow]}s` });
          }
        }
      }
      (m.memory?.semantic || []).filter(i => i.status === 'confirmed').forEach(i => {
        semanticItems.push({ text: i.text, forgetKey: `semantic:${i.id}` });
      });
      (m.memory?.semantic || []).filter(i => i.status === 'pending').forEach(i => {
        semanticItems.push({ text: i.text, dismissKey: `semantic:${i.id}` });
      });

      // ── EPISODIC: what has been happening lately ──────────────────────────────
      const episodicItems = [];
      const recent = (m.recentCompletedTasks || []);
      const thisWeek = recent.filter(e => e.date >= weekAgoISO);
      if (thisWeek.length > 0) {
        episodicItems.push({ text: `completed ${thisWeek.length} task${thisWeek.length === 1 ? '' : 's'} in the last 7 days` });
      }
      const streak = parseInt(localStorage.getItem('stat_streak') || '0');
      if (streak >= 2) {
        episodicItems.push({ text: `on a ${streak}-day streak` });
      }
      // Best day this week
      if (weekHistory.length >= 2) {
        const bestDay = weekHistory.reduce((a, b) => b.tasksDone > a.tasksDone ? b : a);
        if (bestDay.tasksDone >= 3) {
          const dayName = _dowNames[_parseDowLocal(bestDay.date)];
          episodicItems.push({ text: `best day this week: ${dayName} (${bestDay.tasksDone} tasks)` });
        }
      }
      // Average tasks on active days this week
      const activeDays = weekHistory.filter(e => e.tasksDone > 0);
      if (activeDays.length >= 3) {
        const avg = activeDays.reduce((s, e) => s + e.tasksDone, 0) / activeDays.length;
        episodicItems.push({ text: `averaging ${avg.toFixed(1)} tasks on active days this week` });
      }
      // Focus correlation: tasks done on focus days vs non-focus days
      (m.memory?.episodic || []).filter(i => i.status === 'confirmed').forEach(i => {
        episodicItems.push({ text: i.text, forgetKey: `episodic:${i.id}` });
      });
      (m.memory?.episodic || []).filter(i => i.status === 'pending').forEach(i => {
        episodicItems.push({ text: i.text, dismissKey: `episodic:${i.id}` });
      });

      // ── PROCEDURAL: how you tend to work ─────────────────────────────────────
      const proceduralItems = [];
      const lateAdds = (m.patterns?.lateAdditions || []);
      const dayStart = m.patterns?.dayStartCount;
      if (lateAdds.length >= 5 && dayStart !== null && dayStart !== undefined) {
        const recentLate = lateAdds.slice(-20);
        const _latePct = recentLate.filter(h => h >= 14).length / recentLate.length;
        if (_latePct >= 0.40) {
          proceduralItems.push({ text: `tends to add tasks reactively — most additions happen after the day starts` });
        } else {
          proceduralItems.push({ text: `mostly plans ahead — tasks are usually set before the day begins` });
        }
      }
      const keywords = m.patterns?.taskKeywords || {};
      const _memStopWords = new Set(['about','after','also','back','been','before','call','check','done','from','have','into','just','make','more','need','send','some','take','than','that','them','then','they','this','were','what','when','will','with','your']);
      const topWords = Object.entries(keywords)
        .map(([w, d]) => [w.replace(/[^a-z]/g, ''), d])
        .filter(([w, d]) => d.completed >= 3 && w.length >= 5 && !_memStopWords.has(w))
        .sort(([, a], [, b]) => b.completed - a.completed)
        .slice(0, 5)
        .map(([w]) => w);
      if (topWords.length >= 2) {
        proceduralItems.push({ text: `often works on: ${topWords.join(', ')}` });
      }
      // Completion rate from daily history entries that have tasksAdded tracked
      const rateHistory = allDailyHistory.filter(e => e.tasksAdded > 0);
      if (rateHistory.length >= 5) {
        const totalAdded = rateHistory.reduce((s, e) => s + e.tasksAdded, 0);
        const totalDone  = rateHistory.reduce((s, e) => s + e.tasksDone,  0);
        const rate = Math.round((totalDone / totalAdded) * 100);
        proceduralItems.push({ text: `completes ${rate}% of tasks added — ${totalDone} done of ${totalAdded} added` });
      }
      // Habit cross-variable: tasks done on full-habit days vs partial/missed days
      const _habitDays = allDailyHistory.filter(e => e.habitsTotal > 0);
      if (_habitDays.length >= 7) {
        const _fullHabitDays = _habitDays.filter(e => e.habitsKept >= e.habitsTotal);
        const _partialHabitDays = _habitDays.filter(e => e.habitsKept < e.habitsTotal);
        if (_fullHabitDays.length >= 3 && _partialHabitDays.length >= 3) {
          const _fhAvg = (_fullHabitDays.reduce((s, e) => s + e.tasksDone, 0) / _fullHabitDays.length).toFixed(1);
          const _phAvg = (_partialHabitDays.reduce((s, e) => s + e.tasksDone, 0) / _partialHabitDays.length).toFixed(1);
          proceduralItems.push({ text: `all habits done: ${_fhAvg} tasks avg vs ${_phAvg} on days with missed habits` });
        }
      }
      // Focus cross-variable: tasks done on focus days vs days without a session (all-time pattern)
      const _focusDays = allDailyHistory.filter(e => (e.focusMins || 0) > 0);
      const _noFocusDays = allDailyHistory.filter(e => (e.focusMins || 0) === 0 && e.tasksDone > 0);
      if (_focusDays.length >= 5 && _noFocusDays.length >= 5) {
        const _fAvg = (_focusDays.reduce((s, e) => s + e.tasksDone, 0) / _focusDays.length).toFixed(1);
        const _nfAvg = (_noFocusDays.reduce((s, e) => s + e.tasksDone, 0) / _noFocusDays.length).toFixed(1);
        proceduralItems.push({ text: `focus days average ${_fAvg} tasks done vs ${_nfAvg} without a session` });
      }
      // Deferred vocabulary: words that keep getting let go at triage
      const _deferWords = m.preferences?.dragKeywords || [];
      if (_deferWords.length >= 10) {
        const _wCounts = {};
        _deferWords.forEach(w => { _wCounts[w] = (_wCounts[w] || 0) + 1; });
        const _topDefer = Object.entries(_wCounts)
          .filter(([, c]) => c >= 2)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([w]) => w);
        if (_topDefer.length >= 2) {
          proceduralItems.push({ text: `tends to defer: ${_topDefer.join(', ')}` });
        }
      }
      const _lr = m.patterns?.letgoReasons || {};
      const _lrTotal = Object.values(_lr).reduce((s, v) => s + v, 0);
      if (_lrTotal >= 8) {
        const _lrTop = Object.entries(_lr).sort(([,a],[,b]) => b - a)[0];
        const _lrLabels = { not_relevant: 'not relevant', no_energy: 'no energy', lost_interest: 'lost interest', replaced: 'replaced' };
        const _lrPct = Math.round((_lrTop[1] / _lrTotal) * 100);
        if (_lrPct >= 35) {
          proceduralItems.push({ text: `most let-go decisions: ${_lrLabels[_lrTop[0]] || _lrTop[0]} (${_lrPct}%)` });
        }
      }
      (m.memory?.procedural || []).filter(i => i.status === 'confirmed').forEach(i => {
        proceduralItems.push({ text: i.text, forgetKey: `procedural:${i.id}` });
      });
      (m.memory?.procedural || []).filter(i => i.status === 'pending').forEach(i => {
        proceduralItems.push({ text: i.text, dismissKey: `procedural:${i.id}` });
      });

      // ── META: what today knows it knows ───────────────────────────────────────
      const metaItems = [];
      if (m.firstSeen) {
        const _calDays = Math.round((Date.now() - new Date(m.firstSeen + 'T12:00:00').getTime()) / 86400000);
        const _activeDays = m.totalDaysActive || 0;
        const _dayStr = _activeDays > 0 && _calDays > 0
          ? `active on ${_activeDays} of ${_calDays} day${_calDays === 1 ? '' : 's'}`
          : `${_calDays} day${_calDays === 1 ? '' : 's'} of data`;
        let _sinceStr = m.firstSeen;
        try {
          const _d = new Date(m.firstSeen + 'T12:00:00');
          _sinceStr = _d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (_) {}
        metaItems.push({ text: `tracking since ${_sinceStr} — ${_dayStr}` });
      }
      if (m.totalTasksCompleted > 0) {
        metaItems.push({ text: `${m.totalTasksCompleted} tasks completed total` });
      }
      if ((m.patterns?.focusMinutesTotal || 0) > 0) {
        const hrs = (m.patterns.focusMinutesTotal / 60).toFixed(1);
        metaItems.push({ text: `${hrs} hours of deep focus logged across all sessions` });
      }
      const coverageNotes = [];
      if ((m.patterns?.focusMinutesTotal || 0) === 0) coverageNotes.push('no focus session data yet');
      if (!peakHour) coverageNotes.push('not enough completion data for timing patterns');
      if (coverageNotes.length) {
        metaItems.push({ text: `gaps: ${coverageNotes.join(' · ')}` });
      }

      el.innerHTML =
        typeBlock('SEMANTIC', '— stable things today has concluded about you', semanticItems,
          'needs more data to form stable conclusions') +
        typeBlock('EPISODIC', '— what has been happening lately', episodicItems,
          'no recent activity to report') +
        typeBlock('PROCEDURAL', '— how you tend to work', proceduralItems,
          'patterns will appear after more activity') +
        typeBlock('META', '— what today has seen and how confident it is', metaItems);

      const footer = document.getElementById('memoryFooter');
      if (footer) footer.innerHTML = _memoryClearPending
        ? `<div class="memory-footer">` +
          `<span class="memory-confirm-msg">erase everything?</span>` +
          `<span style="display:flex;gap:var(--space-3)">` +
          `<button class="memory-clear-btn" style="opacity:1;color:var(--danger)" onclick="_memoryClearConfirm()">yes, clear</button>` +
          `<button class="btn-ghost memory-conn-link" onclick="_memoryClearCancel()">cancel</button>` +
          `</span></div>`
        : `<div class="memory-footer">` +
          `<button class="memory-clear-btn" onclick="_memoryClearRequest()">clear all memory</button>` +
          `<button type="button" class="memory-conn-link" onclick="_memoryGoToConnections()">Connections →</button>` +
          `</div>`;
    }

    function _memoryGoToConnections() {
      $.memoryPanel.classList.remove('open');
      syncActiveButtons();
      if (!$.configPanel.classList.contains('open')) toggleConfig();
    }

    function _memoryClearRequest() {
      _memoryClearPending = true;
      const footer = document.getElementById('memoryFooter');
      if (footer) footer.innerHTML =
        `<div class="memory-footer">` +
        `<span class="memory-confirm-msg">erase everything?</span>` +
        `<span style="display:flex;gap:var(--space-3)">` +
        `<button class="memory-clear-btn" style="opacity:1;color:var(--danger)" onclick="_memoryClearConfirm()">yes, clear</button>` +
        `<button class="btn-ghost memory-conn-link" onclick="_memoryClearCancel()">cancel</button>` +
        `</span></div>`;
    }

    function _memoryClearCancel() {
      _memoryClearPending = false;
      renderMemoryPanel();
    }

    function _memoryClearConfirm() {
      _memoryClearPending = false;
      if (appMemory) {
        appMemory.preferences = { peakHour: null, dragKeywords: [] };
        appMemory.patterns = {
          completionsByHour: {}, taskKeywords: {}, focusMinutesTotal: appMemory.patterns?.focusMinutesTotal || 0,
          bestStreak: 0, taskLifespanSamples: [], lateAdditions: [], tasksAddedToday: 0,
          dayStartCount: null, dayStartDate: null, dayShapeState: null,
        };
        appMemory.memory = { semantic: [], episodic: [], procedural: [] };
        appMemory.recentCompletedTasks = [];
        appMemory.moments = [];
        appMemory.suggestionHistory = [];
        _saveMemory();
      }
      if (typeof window._reflectionClearFromAllMemory === 'function') window._reflectionClearFromAllMemory();
      renderMemoryPanel();
    }


    async function _memoryAbstract() {
      if (!_aiIsConfigured() || !navigator.onLine) return;
      const m = appMemory;

      // Throttle: once per day
      if (m.memory?._lastAbstractDate === _localISO()) return;

      // Require minimum signal
      if ((m.totalTasksCompleted || 0) < 5) return;

      if (_memoryAbstractRunning) return;
      _memoryAbstractRunning = true;

      try {
        const completionHours = Object.entries(m.patterns?.completionsByHour || {})
          .sort(([, a], [, b]) => b - a).slice(0, 3)
          .map(([h, c]) => `${h}:00 (${c})`).join(', ');

        const lifespanSamples = (m.patterns?.taskLifespanSamples || []).slice(-10);
        const avgLifespan = lifespanSamples.length >= 3
          ? (lifespanSamples.reduce((a, b) => a + b, 0) / lifespanSamples.length).toFixed(1) : null;

        const lateAdds = m.patterns?.lateAdditions || [];
        const lateAddPct = lateAdds.length >= 5
          ? Math.round(lateAdds.filter(h => h >= 14).length / lateAdds.length * 100) : null;

        const topKeywords = Object.entries(m.patterns?.taskKeywords || {})
          .filter(([w, d]) => d.completed >= 2 && w.length > 3)
          .sort(([, a], [, b]) => b.completed - a.completed).slice(0, 5)
          .map(([w, d]) => `${w} (${d.completed} done, avg ${(d.avgDaysToComplete || 0).toFixed(1)}d)`);

        const dailyHistory = (typeof safeJSON === 'function') ? safeJSON('today_daily_history', []) : [];
        // Migration guard: same as renderMemoryPanel — convert cumulative tasksAdded to per-day deltas.
        if (dailyHistory.length > 0 && !dailyHistory[0].tasksAddedFixed) {
          dailyHistory.sort((a, b) => a.date.localeCompare(b.date));
          for (let _mi = dailyHistory.length - 1; _mi >= 0; _mi--) {
            const _mp = _mi > 0 ? dailyHistory[_mi - 1].tasksAdded : 0;
            dailyHistory[_mi].tasksAdded = Math.max(0, (dailyHistory[_mi].tasksAdded || 0) - _mp);
            dailyHistory[_mi].tasksAddedFixed = true;
          }
          localStorage.setItem('today_daily_history', JSON.stringify(dailyHistory));
        }
        const _parseDowAbs = iso => { const [y, mo, d] = iso.split('-').map(Number); return new Date(y, mo - 1, d).getDay(); };
        const byDow = {};
        dailyHistory.slice(-14).forEach(e => {
          const dow = _parseDowAbs(e.date);
          if (!byDow[dow]) byDow[dow] = [];
          byDow[dow].push(e.tasksDone || 0);
        });
        const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dowPattern = Object.entries(byDow)
          .filter(([, vals]) => vals.length >= 2)
          .map(([d, vals]) => `${dowNames[d]}: avg ${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}`)
          .join(', ');

        // Focus correlation: days with focus sessions vs days without
        const focusDays = dailyHistory.filter(e => (e.focusMins || 0) > 0);
        const noFocusDays = dailyHistory.filter(e => (e.focusMins || 0) === 0 && e.tasksDone > 0);
        let focusCorrelation = null;
        if (focusDays.length >= 5 && noFocusDays.length >= 5) {
          const focusAvg = (focusDays.reduce((s, e) => s + e.tasksDone, 0) / focusDays.length).toFixed(1);
          const noFocusAvg = (noFocusDays.reduce((s, e) => s + e.tasksDone, 0) / noFocusDays.length).toFixed(1);
          focusCorrelation = `Focus session days avg ${focusAvg} tasks done vs ${noFocusAvg} tasks on non-focus days (${focusDays.length} vs ${noFocusDays.length} days)`;
        }

        // Habit cross-variable: tasks done on days when all habits completed vs not
        const habitDays = dailyHistory.filter(e => e.habitsTotal > 0);
        let habitCorrelation = null;
        if (habitDays.length >= 7) {
          const fullHabitDays = habitDays.filter(e => e.habitsKept >= e.habitsTotal);
          const partialHabitDays = habitDays.filter(e => e.habitsKept < e.habitsTotal);
          if (fullHabitDays.length >= 3 && partialHabitDays.length >= 3) {
            const fullAvg = (fullHabitDays.reduce((s, e) => s + e.tasksDone, 0) / fullHabitDays.length).toFixed(1);
            const partialAvg = (partialHabitDays.reduce((s, e) => s + e.tasksDone, 0) / partialHabitDays.length).toFixed(1);
            habitCorrelation = `Days with all habits completed avg ${fullAvg} tasks done vs ${partialAvg} tasks on days with missed habits (${fullHabitDays.length} vs ${partialHabitDays.length} days)`;
          }
        }

        // Completion rate: tasksAdded vs tasksDone ratio from daily_history
        const rateHistory = dailyHistory.filter(e => e.tasksAdded > 0);
        let completionRate = null;
        if (rateHistory.length >= 5) {
          const totalAdded = rateHistory.reduce((s, e) => s + e.tasksAdded, 0);
          const totalDone = rateHistory.reduce((s, e) => s + e.tasksDone, 0);
          completionRate = `Completes ${Math.round(totalDone / totalAdded * 100)}% of tasks added (${totalDone} done of ${totalAdded} added over ${rateHistory.length} days)`;
        }

        const alreadyConfirmed = ['semantic', 'episodic', 'procedural'].flatMap(t =>
          (m.memory?.[t] || []).filter(i => i.status === 'confirmed').map(i => i.text)
        );

        const recentTexts = (m.recentCompletedTasks || []).slice(-10).map(e => e.text).filter(Boolean);

        const dataLines = [
          completionHours ? `Most active hours: ${completionHours}` : null,
          avgLifespan !== null ? `Avg task lifespan: ${avgLifespan} days (${lifespanSamples.length} samples)` : null,
          lateAddPct !== null ? `Tasks added after 2pm: ${lateAddPct}% (${lateAdds.length} obs)` : null,
          topKeywords.length ? `Frequent task types: ${topKeywords.join(', ')}` : null,
          (m.patterns?.focusMinutesTotal || 0) > 0 ? `Total focus: ${Math.round(m.patterns.focusMinutesTotal)} min` : null,
          m.totalTasksCompleted ? `Total completed: ${m.totalTasksCompleted}` : null,
          dowPattern ? `Day-of-week pattern: ${dowPattern}` : null,
          focusCorrelation,
          habitCorrelation,
          completionRate,
          recentTexts.length ? `Recent completed tasks (last 10): ${recentTexts.join(' · ')}` : null,
          alreadyConfirmed.length ? `Already confirmed: ${alreadyConfirmed.join('; ')}` : null,
        ].filter(Boolean).join('\n');

        const systemPrompt = 'Analyze user data and return ONLY a valid JSON array. No prose, no code fences. The array may be empty. Each item: {"type":"semantic"|"episodic"|"procedural","text":"..."}.';
        const userMsg = `Productivity app behavioral data:\n${dataLines}\n\nGenerate 2–3 observations a rule-based system would miss — look especially for cross-variable correlations (focus vs output, habits vs tasks, time-of-day vs lifespan) and surprises. type=semantic for stable traits, episodic for recent patterns (last few days), procedural for recurring work habits (weeks). If recent tasks look unusually different from the keyword patterns, surface that as episodic. Text ≤15 words, lowercase, no period, surfaces a pattern useful for deciding what to work on or when to start. Skip thin data. Avoid restating confirmed list. Return [] if nothing new.`;

        const key = _aiGetKey();
        const provider = _aiGetProvider();
        const res = await fetch('/.netlify/functions/ai-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, apiKey: key, messages: [{ role: 'user', content: userMsg }], systemPrompt }),
        });
        if (!res.ok) return;

        const data = await res.json();
        const raw = _parseAIText(data)?.trim();
        if (!raw) return;

        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return;

        let inferences;
        try { inferences = JSON.parse(jsonMatch[0]); } catch (_e) { return; }
        if (!Array.isArray(inferences)) return;

        const validTypes = ['semantic', 'episodic', 'procedural'];
        let added = 0;
        for (const inf of inferences) {
          if (!validTypes.includes(inf.type) || typeof inf.text !== 'string' || !inf.text.trim()) continue;
          const slot = m.memory[inf.type];
          const textLower = inf.text.toLowerCase();
          if (slot.some(i => i.text.toLowerCase().startsWith(textLower.slice(0, 8)))) continue;
          slot.push({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            text: inf.text.trim(),
            type: inf.type,
            confidence: 0.7,
            source: 'ai_abstract',
            addedAt: _localISO(),
            status: 'confirmed',
            isNew: true,
          });
          added++;
        }
        m.memory._lastAbstractDate = _localISO();
        _saveMemory();
      } catch (_e) {
        // silent fail
      } finally {
        _memoryAbstractRunning = false;
        renderMemoryPanel();
      }
    }

    function _versionBadgeBreathe() {
      const badge = document.querySelector('#changelogPanel .version-badge');
      if (!badge || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // Start only when visible; finite iterations end on the opacity-1 keyframe,
      // so the breath settles naturally instead of being cancelled mid-cycle.
      const io = new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        io.disconnect();
        badge.animate(
          [{ opacity: 1 }, { opacity: 0.65 }, { opacity: 1 }],
          { duration: 1800, easing: 'ease-in-out', iterations: 3 }
        );
      }, { threshold: 0.9 });
      io.observe(badge);
    }

    window.toggleMemory = toggleMemory;
    window.renderMemoryPanel = renderMemoryPanel;
    window._memoryGoToConnections = _memoryGoToConnections;
    window._memoryClearRequest = _memoryClearRequest;
    window._memoryClearCancel = _memoryClearCancel;
    window._memoryClearConfirm = _memoryClearConfirm;
    window._memoryAbstract = _memoryAbstract;
    window._versionBadgeBreathe = _versionBadgeBreathe;
  };
})();
