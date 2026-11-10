// Opt-in habit/day occurrences. Private configuration travels in the normal backup.
(function() {
  'use strict';
  const policy = Today.use('habit-task-policy');
  const STORAGE = 'today_habit_tasks_v1';
  let ready = false, running = false, again = false;
  const read = () => policy.clean(safeJSON(STORAGE, {}));
  function persist(value, changed = true) {
    localStorage.setItem(STORAGE, JSON.stringify(value));
    if (changed) { _setLastLocalChange(); dropboxAutoSave(); }
  }
  const nowStamp = () => new Date().toISOString();
  const allTasks = () => [...manualTasks, ...soonTasks, ...pastTasks];
  const current = task => task?.habitTask?.day === _habitTodayISO();
  function merge(remote) {
    const before = read(), merged = policy.merge(before, remote);
    const changed = JSON.stringify(before) !== JSON.stringify(merged);
    persist(merged, false);
    if (ready) schedule();
    return changed;
  }
  function saveConfig(habitId, raw) {
    if (!habitsList.some(h => h.id === habitId && !h.archived)) return false;
    const state = read(), old = state.configs[habitId];
    const at = new Date(Math.max(Date.now(), Date.parse(old?.updatedAt || '') + 1 || 0)).toISOString();
    const config = policy.config({ ...raw, updatedAt: at });
    if (!config) return false;
    state.configs[habitId] = config; persist(state); schedule(); return true;
  }
  function restoreHabit(habitId) {
    const state = read(), day = _habitTodayISO(), id = policy.key(habitId, day), o = state.occurrences[id];
    if (o?.state === 'expired') { o.state = 'active'; o.updatedAt = nowStamp(); persist(state); schedule(); }
  }
  function changeState(task, value) {
    if (!task?.habitTask) return;
    const state = read(), id = policy.key(task.habitTask.habitId, task.habitTask.day), occurrence = state.occurrences[id];
    if (occurrence) { occurrence.state = value; occurrence.edited = true; occurrence.updatedAt = nowStamp(); persist(state); }
  }
  function dismiss(task) { changeState(task, 'dismissed'); }
  function restore(task) { changeState(task, 'active'); }
  function detach(task) { changeState(task, 'detached'); delete task.habitTask; }
  function setLog(name, id, at) {
    const entries = safeJSON(name, []).filter(entry => entry.id !== id);
    if (at) entries.push({ id, at });
    localStorage.setItem(name, JSON.stringify(entries));
  }
  function writeCompletion(habitId, day, done, at, task) {
    const dates = new Set(habitCompletions[habitId] || []);
    if (done) dates.add(day); else dates.delete(day);
    habitCompletions[habitId] = [...dates];
    habitEvents[policy.key(habitId, day)] = { type: done ? 'check' : 'uncheck', at };
    if (task) {
      if (done) doneIds.add(task.id); else doneIds.delete(task.id);
      setLog(done ? 'today_checked_ids' : 'today_unchecked_ids', task.id, at);
      setLog(done ? 'today_unchecked_ids' : 'today_checked_ids', task.id, null);
    }
  }
  function nextOperation(habitId, day, id) {
    const stamps = [habitEvents[policy.key(habitId, day)]?.at,
      ...safeJSON('today_checked_ids', []).filter(x => x.id === id).map(x => x.at),
      ...safeJSON('today_unchecked_ids', []).filter(x => x.id === id).map(x => x.at)];
    return new Date(Math.max(Date.now(), ...stamps.map(s => (Date.parse(s) || 0) + 1))).toISOString();
  }
  function fromTask(task, done) {
    if (!task?.habitTask) return;
    const { habitId, day } = task.habitTask;
    writeCompletion(habitId, day, done, nextOperation(habitId, day, task.id), task);
    Today.use('habits')._saveHabits(); _saveDone();
    if (!habitEditMode) Today.use('habits').renderHabits();
  }
  function fromHabit(habitId, day, done) {
    const task = allTasks().find(t => t.habitTask?.habitId === habitId && t.habitTask.day === day);
    if (!task) return;
    const wasDone = doneIds.has(task.id);
    writeCompletion(habitId, day, done, nextOperation(habitId, day, task.id), task);
    _saveDone(); Today.use('habits')._saveHabits();
    if (done && !wasDone) _memoryOnTaskComplete(task.text, task.id);
    Today.use('connections').renderManual(); updateStats();
  }
  function reconcileCompletions(state) {
    let changed = false;
    const checks = new Map(safeJSON('today_checked_ids', []).map(x => [x.id, x.at]));
    const unchecks = new Map(safeJSON('today_unchecked_ids', []).map(x => [x.id, x.at]));
    for (const occurrence of Object.values(state.occurrences)) {
      if (occurrence.state === 'detached') continue;
      const id = policy.taskId(occurrence.habitId, occurrence.day);
      const task = manualTasks.find(t => t.id === id && t.habitTask);
      const event = habitEvents[policy.key(occurrence.habitId, occurrence.day)];
      const check = checks.get(id) || '', uncheck = unchecks.get(id) || '';
      let at = event?.at || '', done = event?.type === 'check';
      if (check > at) { at = check; done = true; }
      if (uncheck >= at && uncheck) { at = uncheck; done = false; }
      if (!at) continue;
      const habitDone = (habitCompletions[occurrence.habitId] || []).includes(occurrence.day);
      if (habitDone !== done || (task && doneIds.has(id) !== done) || event?.at !== at) {
        writeCompletion(occurrence.habitId, occurrence.day, done, at, task); changed = true;
      }
    }
    return changed;
  }
  function changeToday(habitId, actionId) {
    const state = read(), c = state.configs[habitId], action = c?.actions.find(a => a.id === actionId);
    const o = state.occurrences[policy.key(habitId, _habitTodayISO())];
    if (!o || o.state !== 'active' || !action) return false;
    o.actionId = action.id; o.text = action.text; o.edited = true; o.updatedAt = nowStamp(); persist(state); schedule(); return true;
  }
  async function reconcile() {
    if (!ready || document.hidden) return;
    if (running) { again = true; return; }
    running = true;
    try {
      let state = read(); const day = _habitTodayISO();
      const pending = habitsList.filter(h => !h.archived && state.configs[h.id]?.enabled && !state.occurrences[policy.key(h.id, day)]);
      let snapshot = null;
      if (pending.some(h => state.configs[h.id].calendarTiming || state.configs[h.id].calendarTitles)) {
        const captured = JSON.stringify(state.configs);
        try {
          snapshot = await Promise.race([Today.use('calendar').habitSnapshot(day, pending.some(h => state.configs[h.id].calendarTitles)),
            new Promise(resolve => setTimeout(() => resolve(null), 800))]);
        } catch { /* Missing/offline Calendar uses approved routine, never delays the list. */ }
        state = read();
        if (day !== _habitTodayISO() || captured !== JSON.stringify(state.configs) || document.hidden) { again = true; return; }
      }
      const before = JSON.stringify(state), beforeTasks = JSON.stringify([manualTasks, soonTasks, pastTasks, [...doneIds]]);
      let completionsChanged = reconcileCompletions(state);
      const deleted = new Set(_getDeletedIds().map(x => x.id));
      for (const [id, o] of Object.entries(state.occurrences)) {
        const taskId = policy.taskId(o.habitId, o.day), c = state.configs[o.habitId];
        const habit = habitsList.find(h => h.id === o.habitId);
        if (o.state === 'detached') {
          for (const task of allTasks().filter(t => t.id === taskId)) delete task.habitTask;
          continue;
        }
        if (o.state === 'active' && (o.day < day || !habit || habit.archived || !c?.enabled)) {
          o.state = 'expired'; o.updatedAt = nowStamp();
        }
        if (o.state !== 'active') {
          const done = manualTasks.find(t => t.id === taskId && doneIds.has(t.id));
          if (done && !pastTasks.some(t => t.id === taskId)) pastTasks.unshift({ ...done, zone: 'past', status: 'done', zoneChangedAt: nowStamp() });
          manualTasks = manualTasks.filter(t => t.id !== taskId);
          doneIds.delete(taskId);
        }
        // Old occurrence records need not outlive the habit's own 90-day strength window.
        if (new Date(o.day + 'T12:00:00') < new Date(Date.now() - 90 * 86400000)) delete state.occurrences[id];
      }
      // Remove orphaned habitTask metadata from tasks whose occurrence was pruned or is missing.
      const knownTaskIds = new Set(Object.values(state.occurrences).map(o => policy.taskId(o.habitId, o.day)));
      for (const task of allTasks()) {
        if (!task.habitTask || knownTaskIds.has(task.id)) continue;
        if (task.habitTask.day < day && manualTasks.includes(task)) {
          if (doneIds.has(task.id) && !pastTasks.some(t => t.id === task.id))
            pastTasks.unshift({ ...task, zone: 'past', status: 'done', zoneChangedAt: nowStamp() });
          manualTasks = manualTasks.filter(t => t.id !== task.id);
          doneIds.delete(task.id);
        } else { delete task.habitTask; }
      }
      for (const habit of habitsList) {
        const c = state.configs[habit.id]; if (habit.archived || !c?.enabled) continue;
        const id = policy.key(habit.id, day), taskId = policy.taskId(habit.id, day);
        let o = state.occurrences[id];
        if (!o) {
          const action = policy.choose(c, day, snapshot), at = nowStamp();
          o = state.occurrences[id] = { habitId: habit.id, day, actionId: action.id, text: action.text, createdAt: at, updatedAt: at, state: 'active', edited: false };
        }
        if (o.state !== 'active' || deleted.has(taskId)) continue;
        const existing = allTasks().find(t => t.id === taskId);
        if (existing) { existing.text = o.text; continue; }
        if ((habitCompletions[habit.id] || []).includes(day)) continue;
        manualTasks.push({ id: taskId, text: o.text, createdAt: Date.parse(o.createdAt), habitTask: { habitId: habit.id, day } });
      }
      const tasksChanged = beforeTasks !== JSON.stringify([manualTasks, soonTasks, pastTasks, [...doneIds]]);
      const stateChanged = before !== JSON.stringify(state);
      if (tasksChanged || stateChanged || completionsChanged) {
        persist(state); _saveManual(); _saveSoon(); _savePast(); _saveDone();
        if (completionsChanged) Today.use('habits')._saveHabits();
        if (tasksChanged) { Today.use('connections').renderManual(); renderSoon(); renderPast(); updateStats(); }
        if (completionsChanged && !habitEditMode) Today.use('habits').renderHabits();
      }
    } finally { running = false; if (again) { again = false; schedule(); } }
  }
  function schedule() { void reconcile().catch(error => { console.error('Habit daily tasks:', error); }); }
  function setReady() { ready = true; schedule(); }
  Today.define('habit-tasks', { read, merge, saveConfig, current, dismiss, restore, restoreHabit, detach, fromTask, fromHabit, changeToday, reconcile, setReady });
  Today.ready('boot', () => {
    if (!localStorage.getItem('dropbox_token')) setReady();
    setInterval(() => { if (!document.hidden) schedule(); }, 60000);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  window.addEventListener('online', schedule);
})();
