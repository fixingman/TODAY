// Daily habit actions: deterministic selection and convergent private records.
(function(global) {
  'use strict';
  const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
  const stamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : '';
  const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
  const key = (habitId, day) => habitId + '::' + day;
  const LOADS = ['light', 'normal', 'heavy'], SIZES = ['practice', 'minimal', 'deepen', 'return'];
  // Habit-task delete reasons: [key, label]. Lowercase, 1–3 words (Philosophy.md).
  const REASON_LIST = [['too_hard', 'too hard'], ['not_useful', 'not useful'], ['my_way', 'did it my way']];
  const REASONS = REASON_LIST.map(([k]) => k);
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
        state: raw.state, edited: raw.edited === true, basis: text(raw.basis, 1200),
        ...(LOADS.includes(raw.load) ? { load: raw.load, loadSource: raw.loadSource === 'full' ? 'full' : 'partial' } : {}),
        ...(SIZES.includes(raw.size) ? { size: raw.size } : {}),
        ...(REASONS.includes(raw.dismissReason) ? { dismissReason: raw.dismissReason } : {}),
        ...(stamp(raw.reasonCheckAt) ? { reasonCheckAt: raw.reasonCheckAt } : {}) };
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
      // Expiry is automatic (a day passing), so it never outranks a change the person made.
      const explicit = o => o.edited || ['dismissed', 'detached'].includes(o.state) || !!o.dismissReason;
      const explicitA = explicit(current), explicitB = explicit(incoming);
      const wroteA = current.actionId === 'ai', wroteB = incoming.actionId === 'ai';
      let winner = explicitA || explicitB
        ? explicitA && explicitB ? later(current, incoming) : explicitA ? current : incoming
        : wroteA !== wroteB ? (wroteA ? current : incoming) : current.createdAt < incoming.createdAt ? current : incoming.createdAt < current.createdAt ? incoming : later(current, incoming);
      // A newer expiry closes an active copy; an older one never undoes a later restore.
      const expiry = [current, incoming].find(o => o.state === 'expired' && o.updatedAt > winner.updatedAt);
      if (winner.state === 'active' && expiry) winner = { ...winner, state: 'expired', updatedAt: expiry.updatedAt };
      // The day's load is its own fact: a calendar-informed reading beats a partial one; otherwise first write wins.
      const loaded = [current, incoming].filter(o => o.load);
      // Order is total (source, then creation, then value) so merge(a,b) equals merge(b,a).
      const rank = o => [o.loadSource === 'full' ? 0 : 1, o.createdAt, LOADS.indexOf(o.load)];
      const best = loaded.sort((x, y) => { const a = rank(x), b = rank(y); return a[0] - b[0] || a[1].localeCompare(b[1]) || a[2] - b[2]; })[0];
      winner = { ...winner };
      delete winner.load; delete winner.loadSource;
      if (best) Object.assign(winner, { load: best.load, loadSource: best.loadSource });
      result.occurrences[id] = winner;
    }
    return result;
  }
  // Source binding is additive: legacy occurrences remain usable, but cannot prove
  // practice under a renamed habit or a changed setup. No inferred backfill.
  function basis(habit, c) {
    const value = JSON.stringify([habit.name, c.updatedAt]);
    return value.length <= 1200 ? value : '';
  }
  // ── Signals: what the device already knows about a habit, no note required ──
  //   habit events (check times) ─► usually / after (stack partner, checked just before)
  //   AI-task days (shown, checked or not) ─► lately, avoid, ownWay
  //   saved day loads + checks ─► heavyDays (holds / slips)
  //   carry-over, calendar hours, yesterday's habits ─► load (light / normal / heavy)
  //   ─► size: practice · minimal · deepen · return
  const dayKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function shift(day, n) { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return dayKey(d); }
  // A check made on its own calendar date between 06:00 and 23:00 is a doing time;
  // checks after midnight (before the 3am close) are logging, not doing.
  function daytimeHour(day, event) {
    if (!event || event.type !== 'check' || !stamp(event.at)) return null;
    const t = new Date(event.at);
    if (dayKey(t) !== day) return null;
    const h = t.getHours() + t.getMinutes() / 60;
    return h >= 6 && h < 23 ? h : null;
  }
  const REDUCE = /\b(?:quit|stop|less|reduce|cut(?:ting)? (?:down|back)|fewer|no more|without)\b|^\s*no\s/i;
  function median(values) {
    const v = values.filter(Number.isFinite).sort((a, b) => a - b);
    return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null;
  }
  // Day load from aggregates only. Unknown inputs never make a day heavy.
  function load({ carried = null, carriedHistory = [], calendarHours = null, keptYesterday = null, habitsYesterday = 0 }) {
    const usual = median(carriedHistory);
    const heavyCarry = Number.isFinite(carried) && usual !== null && carried >= usual * 1.5 && carried >= usual + 3;
    const heavyCalendar = Number.isFinite(calendarHours) && calendarHours >= 5;
    const rough = habitsYesterday >= 3 && Number.isFinite(keptYesterday) && keptYesterday / habitsYesterday < 0.34;
    const source = Number.isFinite(calendarHours) ? 'full' : 'partial';
    if (heavyCarry || heavyCalendar || rough) return { load: 'heavy', source };
    const calmCarry = Number.isFinite(carried) && usual !== null && carried <= usual;
    const calmCalendar = Number.isFinite(calendarHours) ? calendarHours < 2 : true;
    const goodYesterday = habitsYesterday < 3 || !Number.isFinite(keptYesterday) || keptYesterday / habitsYesterday >= 0.67;
    return { load: calmCarry && calmCalendar && goodYesterday ? 'light' : 'normal', source };
  }
  function signals({ habit, habits = [], day, completions = {}, events = {}, occurrences = {}, note = '', today = null }) {
    const own = new Set(completions[habit.id] || []);
    const window = Array.from({ length: 30 }, (_, i) => shift(day, -(i + 1)));
    // usually: median daytime check hour, only when most checks are daytime.
    const checks = window.map(d => ({ d, e: events[key(habit.id, d)] })).filter(x => x.e?.type === 'check');
    const hours = checks.map(x => daytimeHour(x.d, x.e)).filter(h => h !== null);
    let usually = null;
    if (checks.length >= 8 && hours.length / checks.length >= 0.6) {
      const m = median(hours);
      usually = m < 11 ? 'morning' : m < 14 ? 'midday' : m < 18 ? 'afternoon' : 'evening';
    }
    // after: another habit checked in the daytime 0–20 min before this one on ≥ 10 of 30 days.
    let after = null, best = 0;
    for (const other of habits) {
      if (!other || other.id === habit.id || other.archived) continue;
      let n = 0;
      for (const d of window) {
        const mine = daytimeHour(d, events[key(habit.id, d)]), theirs = daytimeHour(d, events[key(other.id, d)]);
        if (mine === null || theirs === null) continue;
        const gap = (Date.parse(events[key(habit.id, d)].at) - Date.parse(events[key(other.id, d)].at)) / 60000;
        if (gap > 0 && gap <= 20) n++;
      }
      if (n >= 10 && n > best) { best = n; after = text(other.name, 80); }
    }
    // AI-task days: the suggestion was written by AI and its day has closed.
    const shown = window.map(d => ({ d, o: occurrences[key(habit.id, d)] }))
      .filter(x => x.o && x.o.actionId === 'ai' && ['active', 'expired', 'dismissed'].includes(x.o.state));
    const kept = x => own.has(x.d);
    const recent = shown.filter(x => x.d >= shift(day, -7));
    let slipping = 0;
    for (const x of shown) { if (kept(x) || x.o.dismissReason === 'my_way') break; if (x.o.state === 'dismissed' && !x.o.dismissReason) continue; slipping++; }
    const lately = shown.length < 3 ? 'unknown' : slipping >= 3 ? 'slipping'
      : recent.length >= 5 && recent.filter(kept).length >= 5 ? 'steady' : 'mixed';
    // A suggestion that went undone or was marked not useful is not repeated for 14 days.
    const avoid = shown.filter(x => x.d >= shift(day, -14) && x.o.text && (x.o.dismissReason === 'not_useful' || (!kept(x) && x.o.state === 'expired')))
      .map(x => text(x.o.text, 120)).slice(0, 14);
    const ownWay = shown.slice(0, 10).filter(x => x.o.dismissReason === 'my_way').length >= 3;
    const tooHard = [1, 2].some(n => occurrences[key(habit.id, shift(day, -n))]?.dismissReason === 'too_hard');
    // heavyDays: does this habit hold on saved heavy days?
    const rated = window.map(d => ({ d, o: occurrences[key(habit.id, d)] })).filter(x => x.o?.load);
    const heavy = rated.filter(x => x.o.load === 'heavy'), other = rated.filter(x => x.o.load !== 'heavy');
    const rate = list => list.length ? list.filter(x => own.has(x.d)).length / list.length : null;
    const heavyDays = heavy.length < 4 ? 'unknown' : rate(heavy) >= (rate(other) ?? 0) - 0.15 ? 'holds' : 'slips';
    // return: checked within 14 days but not in the last 3.
    const last3 = [1, 2, 3].some(n => own.has(shift(day, -n))), last14 = window.slice(0, 14).some(d => own.has(d));
    const deepenedLately = [1, 2].some(n => occurrences[key(habit.id, shift(day, -n))]?.size === 'deepen');
    let size = 'practice';
    if (!last3 && last14) size = 'return';
    else if (tooHard || lately === 'slipping' || (today === 'heavy' && heavyDays === 'slips')) size = 'minimal';
    else if (lately === 'steady' && today !== 'heavy' && !deepenedLately) size = 'deepen';
    const recentPractice = shown.filter(kept).slice(0, 3).map(x => text(x.o.text, 120)).filter(Boolean);
    return { size, usually, after, lately, heavyDays, today: today || 'normal', ownWay,
      goal: REDUCE.test(habit.name + ' ' + note) ? 'reduce' : null, avoid, recentPractice };
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
  global.Today.define('habit-task-policy', { key, taskId, config, clean, merge, choose, basis, signals, load, REASON_LIST });
})(window);
