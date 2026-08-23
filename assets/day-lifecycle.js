// TODAY — new-day cleanup: streak, daily history, zone aging, tombstones, delayed backup.
// Inert until index.html calls window._startDayLifecycle() before init().
window._startDayLifecycle = (function() {
  let started = false;
  return function() {
    if (started) return; started = true;

    // Trello card map pruning — age-based, safe to call after Trello loads.
    function _pruneTrelloMaps() {
      if (!window.trelloTasks || !window.trelloTasks.length) return;
      const lastActive = safeJSON('today_trello_lastactive', {});
      const cutoffISO = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const stale = Object.keys(lastActive).filter(id => lastActive[id] < cutoffISO);
      if (!stale.length) return;
      ['today_trello_firstseen', 'today_trello_lastactive', 'today_trello_focus_total'].forEach(key => {
        const obj = safeJSON(key, {});
        stale.forEach(id => delete obj[id]);
        localStorage.setItem(key, JSON.stringify(obj));
      });
    }

    function applyNewDayCleanup() {
      const today = _getAppDay();
      // Guard: only run if last visit was a different app day
      const lastVisit = localStorage.getItem('stat_last_visit');
      if (lastVisit === today) return;
      if (!lastVisit) {
        // First ever open — no cleanup needed, just record today so checkNewDay() stops firing
        localStorage.setItem('stat_last_visit', today);
        return;
      }

      // Yesterday = calendar day before today (midnight boundary, matches _getAppDay)
      const now = new Date();
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const streak     = parseInt(localStorage.getItem('stat_streak') || '1');
      const streakDate = localStorage.getItem('stat_streak_date') || '';
      const todayISO   = _localISO();
      // Only increment streak if not already bumped today — another device may have synced it first.
      // Do NOT return early here; the daily counter reset must still run regardless.
      if (streakDate !== todayISO) {
        const newStreak = lastVisit === yesterday.toDateString() ? streak + 1 : 1;
        localStorage.setItem('stat_streak', newStreak);
        localStorage.setItem('stat_streak_date', todayISO);
        if ([7, 14, 30, 60, 100].includes(newStreak)) {
          localStorage.setItem('_streak_milestone_pending', '1');
        }
        _memoryOnStreakUpdate(newStreak);
      }

      // ── Daily counters reset ──

      // Snapshot yesterday into rolling 30-day history (before checked_ids is cleared below).
      // Done count is derived from yesterday's check timestamps, not a counter (see _doneTodayCount).
      const yesterdayISO = _localISO(yesterday);
      const doneToday = _doneTodayCount(yesterdayISO);
      _memoryOnDaySummary(doneToday);

      // If a focus session already ran after midnight (BUG-063), completeFor() wrote a
      // snapshot of the pre-midnight total and reset the counter; use that snapshot
      // so yesterday's history entry reflects actual yesterday work, not post-midnight mins.
      const _focusMinsDate = localStorage.getItem('stat_focus_mins_date') || '';
      const _midnightSnapshot = parseInt(localStorage.getItem('stat_focus_mins_yesterday_snapshot') || '0');
      const focusMinsYesterday = _focusMinsDate === _getAppDay()
        ? _midnightSnapshot
        : parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
      localStorage.removeItem('stat_focus_mins_yesterday_snapshot');
      const activeHabitsYesterday = habitsList.filter(h => !h.archived);
      const habitsKeptYesterday = activeHabitsYesterday.filter(h =>
        (habitCompletions[h.id] || []).includes(yesterdayISO)
      ).length;
      const dailyHistory = safeJSON('today_daily_history', []);
      if (!dailyHistory.find(e => e.date === yesterdayISO)) {
        dailyHistory.push({
          date: yesterdayISO,
          tasksDone: doneToday,
          tasksAdded: appMemory?.patterns?.tasksAddedToday || 0,
          focusMins: focusMinsYesterday,
          habitsKept: habitsKeptYesterday,
          habitsTotal: activeHabitsYesterday.length,
        });
        // Keep only the last 30 days
        dailyHistory.sort((a, b) => a.date.localeCompare(b.date));
        if (dailyHistory.length > 30) dailyHistory.splice(0, dailyHistory.length - 30);
        localStorage.setItem('today_daily_history', JSON.stringify(dailyHistory));
      }

      // Reset daily counters. Done-today is derived from today_checked_ids (cleared below),
      // so there's no done counter to zero here — only focus minutes.
      // Guard: if date is already today a post-midnight session recorded before cleanup ran —
      // don't wipe those minutes (BUG-063).
      if (_focusMinsDate !== _getAppDay()) {
        localStorage.setItem('stat_focus_mins_today', '0');
        localStorage.setItem('stat_focus_mins_date',  _getAppDay());
      }

      // Snapshot planned task count at day start — carried-over undone tasks.
      // Used for emergent vs planned insight: how many tasks started the day planned
      // vs how many were added reactively during the day.
      if (appMemory?.patterns) {
        const undoneCarriedOver = manualTasks.filter(t => !doneIds.has(t.id)).length;
        appMemory.patterns.dayStartCount = undoneCarriedOver;
        appMemory.patterns.dayStartDate  = _localISO();
        if (!appMemory.patterns.lateAdditions) appMemory.patterns.lateAdditions = [];
        appMemory.patterns.tasksAddedToday = 0;
        _saveMemory();
      }

      // Move done manual tasks to PAST (zone model).
      // Guard: tasks checked *today* (by timestamp) stay done in TODAY — this protects
      // cross-device sessions where the second device opens after midnight but the work
      // was done on the first device earlier the same calendar day (BUG-055).
      const _newDayISO2 = _localISO();
      const _checkedTodayIds = new Set(
        _getCheckedIds()
          .filter(c => c.at && _localISO(new Date(c.at)) === _newDayISO2)
          .map(c => c.id)
      );
      const doneTasks = manualTasks.filter(t => doneIds.has(t.id) && !_checkedTodayIds.has(t.id));
      doneTasks.forEach(t => {
        t.zone = 'past';
        t.status = 'done';
        t.zoneChangedAt = new Date().toISOString();
        pastTasks.unshift(t);
      });
      if (doneTasks.length > 0) _savePast();

      // Remove graduated tasks from TODAY (today-checked tasks remain)
      manualTasks = manualTasks.filter(t => !doneIds.has(t.id) || _checkedTodayIds.has(t.id));
      _saveManual();

      // Clear only manual done IDs that graduated — today-checked IDs are kept
      for (const id of [...doneIds]) {
        if (id.startsWith('manual_') && !_checkedTodayIds.has(id)) doneIds.delete(id);
      }
      _saveDone();

      // Clear stale caches and operation logs — but NOT deleted_ids (deleted tasks stay deleted)
      localStorage.removeItem('today_trello_cache');
      // Guard: if a post-midnight session already wrote the focus map for today, don't clear it (BUG-063).
      if ((localStorage.getItem('today_trello_focus_date') || '') !== _getAppDay()) {
        localStorage.removeItem('today_trello_focus');
        localStorage.removeItem('today_trello_focus_date');
      }
      // NOTE: do NOT clear today_trello_firstseen or today_trello_lastactive here — both must
      // persist across days so cards age from when they entered the list (BUG-049) and stay un-aged
      // after real activity (BUG-064). loadTrello() prunes departed cards from both instead.
      // deleted_ids persists for 180 days (_cleanupDeletedIds TTL) — deleted and
      // PAST-purged tasks must not come back via sync within that window (BUG-054)
      //
      // Preserve any check/uncheck ops that already carry today's date — these happen when the
      // user works past midnight and the app detects the day change late (e.g. at 1 AM). Without
      // this guard, clearing checked_ids wipes those post-midnight entries and today's live count
      // drops to 0 (BUG-036 continuation).
      const _newDayISO = _localISO();
      const _todayChecks   = _getCheckedIds().filter(c => c.at && _localISO(new Date(c.at)) === _newDayISO);
      const _todayUnchecks = _getUncheckedIds().filter(u => u.at && _localISO(new Date(u.at)) === _newDayISO);
      localStorage.removeItem('today_unchecked_ids');
      localStorage.removeItem('today_checked_ids');
      if (_todayChecks.length)   localStorage.setItem('today_checked_ids',   JSON.stringify(_todayChecks));
      if (_todayUnchecks.length) localStorage.setItem('today_unchecked_ids', JSON.stringify(_todayUnchecks));

      // Reset triage dismissed flag
      localStorage.removeItem('triage_dismissed');
      triageDismissedToday = false;
      _triageBarShown = false; // Reset for the new evening

      // Prune suggestion cooldowns for tasks that no longer exist (manual OR Trello)
      if (appMemory?.suggestionCooldowns) {
        const existingIds = new Set([
          ...manualTasks.map(t => t.id),
          ...(trelloTasks || []).map(t => t.id),
        ]);
        for (const id of Object.keys(appMemory.suggestionCooldowns)) {
          if (!existingIds.has(id)) delete appMemory.suggestionCooldowns[id];
        }
        _saveMemory();
      }

      // Track carried-over tasks for morning nudge (undone tasks that survived cleanup)
      const carriedOver = manualTasks.length;
      if (carriedOver > 0) {
        localStorage.setItem('morning_nudge_count', carriedOver);
      } else {
        localStorage.removeItem('morning_nudge_count');
      }

      // Habits: completions are append-only ISO date strings — no data is deleted.
      // Re-render so the new day's dot appears and yesterday's checks show as history.
      renderHabits();

      // Age old SOON items → PAST (30+ days)
      _ageSoon();

      // Purge old items from PAST (done: 7 days, let_go/aged: 30 days) and tombstone
      // them in deleted_ids so stale devices can't resurrect them via merge (BUG-054)
      const _purgedTombs = _purgePast();
      if (_purgedTombs.length > 0) {
        const _purgedSet = new Set(_purgedTombs.map(p => p.id));
        const _tombs = _getDeletedIds().filter(d => !_purgedSet.has(d.id)).concat(_purgedTombs);
        localStorage.setItem('today_deleted_ids', JSON.stringify(_tombs));
      }

      localStorage.setItem('stat_last_visit', today);
      _pruneTrelloMaps();

      // Push clean state after a short delay — gives syncDropbox time to pull remote first.
      // Without the delay, this backup races with syncDropbox's metadata fetch on morning wake
      // (visibilitychange path): if the upload lands before the metadata fetch returns, syncDropbox
      // downloads mobile's own stale write and the 7s ticker sees no further rev change, leaving
      // the task list behind until the other device writes again. 3s matches the triage grace window
      // (same race, same fix). zoneChangedAt timestamps protect done→PAST moves independently.
      setTimeout(() => {
        const tok = localStorage.getItem('dropbox_token');
        if (tok) dropboxBackup(true);
      }, 3000);
    }

    window.applyNewDayCleanup = applyNewDayCleanup;
  };
}());
