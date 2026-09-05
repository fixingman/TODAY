// TODAY — deterministic, side-effect-free sync merge primitives.
(function initSyncMerge(global) {
  'use strict';

  function mergeDailyHistory(localArr, remoteArr, sanitizeTasksAdded = value => value || 0) {
    const cleanEntry = entry => ({
      ...entry,
      tasksAdded: sanitizeTasksAdded(entry.tasksAdded),
    });
    const byDate = new Map();
    for (const entry of (Array.isArray(localArr) ? localArr : [])) {
      if (entry?.date) byDate.set(entry.date, cleanEntry(entry));
    }
    for (const entry of (Array.isArray(remoteArr) ? remoteArr : [])) {
      if (!entry?.date) continue;
      const remote = cleanEntry(entry);
      const current = byDate.get(entry.date);
      if (!current) {
        byDate.set(entry.date, remote);
        continue;
      }
      const tasksAdded = current.tasksAddedFixed && remote.tasksAddedFixed
        ? Math.max(current.tasksAdded, remote.tasksAdded)
        : current.tasksAddedFixed
          ? current.tasksAdded
          : remote.tasksAddedFixed
            ? remote.tasksAdded
            : Math.max(current.tasksAdded, remote.tasksAdded);
      byDate.set(entry.date, {
        date: entry.date,
        tasksDone: Math.max(current.tasksDone || 0, remote.tasksDone || 0),
        tasksAdded,
        ...(current.dayStartCount != null || remote.dayStartCount != null
          ? { dayStartCount: Math.max(current.dayStartCount ?? 0, remote.dayStartCount ?? 0) }
          : {}),
        focusMins: Math.max(current.focusMins || 0, remote.focusMins || 0),
        habitsKept: Math.max(current.habitsKept || 0, remote.habitsKept || 0),
        habitsTotal: Math.max(current.habitsTotal || 0, remote.habitsTotal || 0),
        ...(current.tasksAddedFixed || remote.tasksAddedFixed ? { tasksAddedFixed: true } : {}),
      });
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }

  function mergeSuggestionOutcomes(localArr, remoteArr, limit = 100) {
    const byId = new Map((Array.isArray(localArr) ? localArr : [])
      .filter(entry => entry?.id)
      .map(entry => [entry.id, { ...entry }]));
    const later = (a, b) => !a ? b : !b ? a : (a > b ? a : b);

    for (const remoteEntry of (Array.isArray(remoteArr) ? remoteArr : [])) {
      if (!remoteEntry?.id) continue;
      const localEntry = byId.get(remoteEntry.id);
      if (!localEntry) {
        byId.set(remoteEntry.id, { ...remoteEntry });
        continue;
      }
      const localNewest = (localEntry.updatedAt || localEntry.offeredAt || '') >=
        (remoteEntry.updatedAt || remoteEntry.offeredAt || '');
      const newest = localNewest ? localEntry : remoteEntry;
      const merged = {
        ...(localNewest ? remoteEntry : localEntry),
        ...newest,
        offeredAt: later(localEntry.offeredAt, remoteEntry.offeredAt),
        appliedAt: later(localEntry.appliedAt, remoteEntry.appliedAt),
        dismissedAt: later(localEntry.dismissedAt, remoteEntry.dismissedAt),
        ignoredAt: later(localEntry.ignoredAt, remoteEntry.ignoredAt),
        helpedAt: later(localEntry.helpedAt, remoteEntry.helpedAt),
        reversedAt: later(localEntry.reversedAt, remoteEntry.reversedAt),
        updatedAt: later(localEntry.updatedAt, remoteEntry.updatedAt),
        resultTaskIds: [...new Set([
          ...(localEntry.resultTaskIds || []),
          ...(remoteEntry.resultTaskIds || []),
        ])],
      };
      if (merged.helpedAt) merged.outcome = 'helped';
      else if (merged.reversedAt) merged.outcome = 'reversed';
      else if (merged.appliedAt) merged.outcome = 'applied';
      else if (merged.dismissedAt) merged.outcome = 'dismissed';
      else if (merged.ignoredAt) merged.outcome = 'ignored';
      byId.set(remoteEntry.id, merged);
    }

    return [...byId.values()]
      .sort((a, b) => (b.offeredAt || '').localeCompare(a.offeredAt || ''))
      .slice(0, limit);
  }

  const api = { mergeDailyHistory, mergeSuggestionOutcomes };
  if (global.Today) global.Today.define('sync-merge', api);
})(window);
