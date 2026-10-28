// TODAY — deterministic, side-effect-free sync merge primitives.
(function initSyncMerge(global) {
  'use strict';

  // Progress is cumulative; record/zone precedence must never lower it.
  function mergeTaskProgress(task, other = {}) {
    const merged = { ...task };
    const number = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
    for (const field of ['focusSessions', 'lastActive']) {
      if (task[field] != null || other[field] != null) merged[field] = Math.max(number(task[field]), number(other[field]));
    }
    return merged;
  }

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

  // DreamBank index (v2.93.0): union by id, the later updatedAt wins — a deletion is a
  // tombstone row, so it wins over the older live copy instead of being unioned back.
  // "Clear all memory" drops every row recorded before the watermark, on both sides.
  function mergeDreamIndex(localArr, remoteArr, clearedAt = '', limit = 500) {
    const byId = new Map();
    const keep = row => row && row.id && !(clearedAt && row.recordedAt && String(row.recordedAt) < clearedAt);
    for (const row of [...(Array.isArray(localArr) ? localArr : []), ...(Array.isArray(remoteArr) ? remoteArr : [])]) {
      if (!keep(row)) continue;
      const cur = byId.get(row.id);
      if (!cur || String(row.updatedAt || '') > String(cur.updatedAt || '')) byId.set(row.id, row);
    }
    return [...byId.values()]
      .sort((a, b) => String(a.recordedAt || '').localeCompare(String(b.recordedAt || '')))
      .slice(-limit);
  }

  // M2 dismissed images: { [key]: ISO }, later dismissal wins per key; entries from before
  // a "clear all memory" are dropped with everything else.
  function mergeDreamDismissed(local, remote, clearedAt = '') {
    const out = {};
    for (const src of [local, remote]) {
      if (!src || typeof src !== 'object') continue;
      for (const [key, at] of Object.entries(src)) {
        if (typeof at !== 'string' || (clearedAt && at < clearedAt)) continue;
        if (!out[key] || at > out[key]) out[key] = at;
      }
    }
    return out;
  }

  // Pool wording events are independent of whole-result votes; no prose is copied.
  const poolWriters = Object.freeze({'morning nudge':'pool-morning-v1','Sunday reflection':'pool-sunday-v1'});
  function poolReadingKey(row) {
    if (!row || !Object.hasOwn(poolWriters,row.surface) || (row.policy != null && (typeof row.policy !== 'string' || row.policy.length > 80)) || typeof row.text !== 'string' || !row.text.trim() || row.text.length > 200
        || !/^\d{4}-\d\d-\d\d$/.test(row.date || '') || !Number.isFinite(Date.parse(row.date))
        || new Date(row.date).toISOString().slice(0,10) !== row.date
        || !['focus-vs-obligation','obligation-completion','letgo-reason','return-finished','soon-pullback','letgo-return',...(row.surface === 'Sunday reflection' ? ['week-shape'] : [])].includes(row.kind)) return null;
    return JSON.stringify([row.surface,row.date,row.kind,row.policy || '',row.text]);
  }
  function poolReadingTag(row) {
    const key=poolReadingKey(row);if (!key) return '';
    let value=2166136261;
    for (let i=0;i<key.length;i++) value=Math.imul(value^key.charCodeAt(i),16777619);
    return (value>>>0).toString(16).padStart(8,'0');
  }
  function poolWordingTime(value, now = Date.now()) {
    const n = typeof value === 'string' && Date.parse(value);
    return typeof value === 'string' && value.length === 24 && Number.isFinite(n)
      && new Date(n).toISOString() === value && n <= now + 60000 ? n : 0;
  }
  function poolWordingEvent(row, clearedAt = '', now = Date.now()) {
    const w = row?.wording;if (!w) return null;
    const date=new Date(now),localDay=new Date(now-date.getTimezoneOffset()*60000).toISOString().slice(0,10);
    const age=(Date.parse(localDay)-Date.parse(row?.date))/86400000;
    if (!(age>=-2 && age<30) || !poolReadingKey(row) || !w || w.policy !== 1 || w.writer !== poolWriters[row.surface]
        || ![null,'unclear','formal'].includes(w.concern) || typeof w.sourceTag !== 'string' || !/^[a-f0-9]{8}$/.test(w.sourceTag) || typeof w.sourceId !== 'string' || !/^[a-f0-9]{64}$/.test(w.sourceId)
        || !poolWordingTime(w.at,now) || poolWordingTime(w.at,now) <= poolWordingTime(clearedAt,now)) return null;
    return {policy:1,sourceId:w.sourceId,sourceTag:w.sourceTag,writer:w.writer,concern:w.sourceTag===poolReadingTag(row) ? w.concern : null,at:w.at};
  }
  function mergePoolWording(base, one, two, clearedAt = '', now = Date.now()) {
    const identity = poolReadingKey(base);
    const events = [one,two].filter(row => identity && row?.surface===base.surface && row.date===base.date)
      .map(row => poolWordingEvent(row,clearedAt,now)).filter(Boolean);
    const selected=events.sort((a,b) => b.at.localeCompare(a.at) || Number(a.concern !== null)-Number(b.concern !== null)
      || String(a.concern).localeCompare(String(b.concern)) || a.sourceId.localeCompare(b.sourceId))[0];
    return selected ? {...selected,concern:selected.sourceTag===poolReadingTag(base) ? selected.concern : null} : null;
  }
  function normalizePoolWording(memory) {
    if (!memory || typeof memory !== 'object') return memory;
    if (!poolWordingTime(memory.poolWordingClearedAt)) delete memory.poolWordingClearedAt;
    if (poolWordingTime(memory.clearedAt)>=poolWordingTime(memory.poolWordingClearedAt)) delete memory.poolWordingClearedAt;
    const clear=[memory.clearedAt,memory.poolWordingClearedAt].filter(at => poolWordingTime(at)).sort().at(-1) || '';
    const rows=Array.isArray(memory.spokenLines) ? memory.spokenLines : [];
    rows.forEach((row,index) => {
      if (!row || typeof row !== 'object') return;
      const w=index>=rows.length-120 ? poolWordingEvent(row,clear) : null;
      if (w) row.wording=w;else delete row.wording;
    });
    return memory;
  }
  const api = { mergeTaskProgress, mergeDailyHistory, mergeSuggestionOutcomes, mergeDreamIndex, mergeDreamDismissed,
    poolWriters, poolReadingKey, poolReadingTag, poolWordingTime, poolWordingEvent, mergePoolWording, normalizePoolWording };
  if (global.Today) global.Today.define('sync-merge', api);
})(window);
