// Daily habit actions: deterministic selection and convergent private records.
(function(global) {
  'use strict';
  const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
  const stamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : '';
  const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
  const key = (habitId, day) => habitId + '::' + day;
  const taskId = (habitId, day) => 'habit_task_' + key(habitId, day);
  function config(value) {
    if (!value || !stamp(value.updatedAt) || !Array.isArray(value.actions)) return null;
    const actions = value.actions.slice(0, 14).map((a, i) => ({
      id: text(a.id, 100) || 'action_' + i, text: text(a.text, 500),
      days: [...new Set((Array.isArray(a.days) ? a.days : []).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort(),
      keywords: text(a.keywords, 200), minutes: Math.max(0, Math.min(240, Math.floor(Number(a.minutes) || 0))),
    })).filter(a => a.text);
    if (!actions.length || new Set(actions.map(a => a.id)).size !== actions.length) return null;
    const defaultId = actions.some(a => a.id === value.defaultId) ? value.defaultId : actions[0].id;
    // fresh: AI writes each day's task (actions are the offline fallback); set: rotate actions.
    return { enabled: value.enabled === true, mode: value.mode === 'fresh' ? 'fresh' : 'set', note: text(value.note, 1000),
      avoid: (Array.isArray(value.avoid) ? value.avoid : []).map(v => text(v, 500)).filter(Boolean).slice(-30),
      refreshedAt: stamp(value.refreshedAt), calendarTiming: value.calendarTiming === true,
      calendarTitles: value.calendarTitles === true, actions, defaultId, updatedAt: value.updatedAt };
  }
  function clean(value) {
    const result = { configs: {}, occurrences: {} };
    for (const [id, raw] of Object.entries(value?.configs || {})) {
      if (!/^habit_[\w-]+$/.test(id)) continue;
      const c = config(raw); if (c) result.configs[id] = c;
    }
    for (const [id, raw] of Object.entries(value?.occurrences || {})) {
      if (!raw || !/^habit_[\w-]+$/.test(raw.habitId) || !dayPattern.test(raw.day) || id !== key(raw.habitId, raw.day) || !stamp(raw.createdAt)) continue;
      if (!['active', 'dismissed', 'detached', 'expired'].includes(raw.state)) continue;
      result.occurrences[id] = { habitId: raw.habitId, day: raw.day, actionId: text(raw.actionId, 100),
        text: text(raw.text, 500), createdAt: raw.createdAt, updatedAt: stamp(raw.updatedAt) || raw.createdAt,
        state: raw.state, edited: raw.edited === true };
    }
    return result;
  }
  const later = (a, b) => a.updatedAt > b.updatedAt || (a.updatedAt === b.updatedAt && JSON.stringify(a) > JSON.stringify(b)) ? a : b;
  function merge(local, remote) {
    const a = clean(local), b = clean(remote), result = clean(a);
    for (const [id, incoming] of Object.entries(b.configs)) result.configs[id] = a.configs[id] ? later(a.configs[id], incoming) : incoming;
    for (const [id, incoming] of Object.entries(b.occurrences)) {
      const current = a.occurrences[id];
      if (!current) { result.occurrences[id] = incoming; continue; }
      // Automatic choices are first-write-wins; explicit changes are LWW.
      // A task the AI wrote beats an offline fallback for the same day.
      const explicitA = current.edited || current.state !== 'active', explicitB = incoming.edited || incoming.state !== 'active';
      const wroteA = current.actionId === 'ai', wroteB = incoming.actionId === 'ai';
      result.occurrences[id] = explicitA || explicitB
        ? explicitA && explicitB ? later(current, incoming) : explicitA ? current : incoming
        : wroteA !== wroteB ? (wroteA ? current : incoming) : current.createdAt < incoming.createdAt ? current : incoming.createdAt < current.createdAt ? incoming : later(current, incoming);
    }
    return result;
  }
  // recent: action ids of earlier days, newest first; the set rotates through before repeating.
  function choose(c, day, snapshot, now = Date.now(), recent = []) {
    const weekday = new Date(day + 'T12:00:00').getDay();
    const validSnapshot = snapshot?.day === day && snapshot.capturedAt <= now && now - snapshot.capturedAt <= 300000;
    const events = validSnapshot ? snapshot.events.filter(e => e.end > now) : [];
    const matches = a => c.calendarTitles && a.keywords && events.some(e =>
      a.keywords.split(',').some(word => word.trim() && (e.title || '').toLocaleLowerCase().includes(word.trim().toLocaleLowerCase())));
    // Timing can rule out an action's requested stretch; it cannot prove availability.
    const fits = a => {
      if (!c.calendarTiming || !a.minutes || !validSnapshot || !events.length) return true;
      const start = Math.max(now, new Date(day + 'T08:00:00').getTime()), end = new Date(day + 'T22:00:00').getTime();
      if (end <= start) return false;
      let cursor = start;
      for (const event of events.filter(e => e.start < end && e.end > start)) {
        if (Math.min(end, event.start) - cursor >= a.minutes * 60000) return true;
        cursor = Math.max(cursor, event.end);
      }
      return end - cursor >= a.minutes * 60000;
    };
    const candidates = c.actions.map(a => ({ a, rank: matches(a) ? 3 : a.days.includes(weekday) ? 2 : !a.days.length && !a.keywords ? 1 : 0 }))
      .filter(({a, rank}) => rank > 0 && (rank === 3 || fits(a)));
    const rank = Math.max(0, ...candidates.map(x => x.rank));
    const ranked = candidates.filter(x => x.rank === rank).map(x => x.a);
    const used = new Set(recent.slice(0, ranked.length - 1)), unused = ranked.filter(a => !used.has(a.id));
    const pool = unused.length ? unused : ranked;
    let hash = 0; for (const char of day) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return pool.length ? pool[hash % pool.length] : c.actions.find(a => a.id === c.defaultId) || c.actions[0];
  }
  global.Today.define('habit-task-policy', { key, taskId, config, clean, merge, choose });
})(window);
