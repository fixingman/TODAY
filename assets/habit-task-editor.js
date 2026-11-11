// Daily task setup, inside the Habits sidebar. Drafts are never autosaved.
// Two modes per habit: fresh (AI writes each day's task) or set (a varied set, rotated).
(function() {
  'use strict';
  let view = null, request = null;
  const STAR = '<span class="ht-star" aria-hidden="true">✦&#xFE0E;</span>';
  const LIST_IN = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 6h8M4 10h6M4 14h5M15 8v8M12.5 13.5L15 16l2.5-2.5"/></svg>';
  const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; };
  const $ = sel => view.root.querySelector(sel);
  const ai = () => Today.use('connections')._aiIsConfigured();
  function status(message) { if (view?.root.isConnected) $('.ht-status').textContent = message; }
  const mode = () => $('[name="mode"]:checked')?.value || 'fresh';
  const on = () => $('.ht-switch').getAttribute('aria-checked') === 'true';

  function renderPool() {
    const list = $('.ht-pool'); list.replaceChildren();
    view.pool.forEach((action, i) => {
      const item = node('li', 'ht-chip'); item.append(node('span', '', action.text));
      const remove = node('button', 'ht-chip-x', '×'); remove.type = 'button';
      remove.dataset.todayClick = 'habit-task-editor.remove'; remove.dataset.index = String(i);
      remove.setAttribute('aria-label', 'Remove ' + action.text); item.append(remove); list.append(item);
    });
    $('.ht-pool-empty').hidden = view.pool.length > 0;
    $('.ht-prepare').hidden = !ai();
  }
  function dayLabel(offset) {
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Tomorrow';
    const d = new Date(_habitTodayISO() + 'T12:00:00'); d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  }
  function preview() {
    const rows = $('.ht-rows'); rows.replaceChildren();
    const policy = Today.use('habit-task-policy'), today = _habitTodayISO();
    const occurrence = view.occurrence?.state === 'active' ? view.occurrence : null;
    const entries = [];
    if (mode() === 'fresh') {
      entries.push(occurrence ? [occurrence.text, occurrence.actionId === 'ai' ? 'new today' : ''] : ['written when it starts', '', true]);
      entries.push(['written that morning', '', true]);
    } else {
      const c = view.pool.length && policy.config({ actions: view.pool, updatedAt: new Date().toISOString() });
      const recent = [...view.recent];
      for (let i = 0; i < 3; i++) {
        if (i === 0 && occurrence && view.pool.some(a => a.id === occurrence.actionId)) { entries.push([occurrence.text]); recent.unshift(occurrence.actionId); continue; }
        if (!c) { entries.push(['add tasks to the set', '', true]); break; }
        const d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() + i);
        const pick = policy.choose(c, _localISO(d), null, Date.now(), recent); recent.unshift(pick.id);
        entries.push([pick.text]);
      }
    }
    entries.forEach(([text, source, quiet], i) => {
      const row = node('div', 'ht-row' + (i === 0 ? ' today' : ''));
      row.append(node('span', 'ht-day', dayLabel(i)));
      const task = node('span', 'ht-task' + (quiet ? ' quiet' : '')); task.append(node('span', 'ht-task-text', text));
      if (source) task.append(node('span', 'ht-src', source));
      row.append(task); rows.append(row);
    });
  }
  function sync() {
    if (!view?.root.isConnected) return;
    $('.ht-config').hidden = !on();
    $('.ht-set').hidden = mode() !== 'set';
    $('.ht-fresh-note').hidden = mode() !== 'fresh' || ai();
    renderPool(); preview();
  }

  function open(habitId) {
    const habit = habitsList.find(h => h.id === habitId && !h.archived); if (!habit) return;
    const tasks = Today.use('habit-tasks'), policy = Today.use('habit-task-policy');
    const state = tasks.read(), c = state.configs[habitId];
    const shell = node('div');
    shell.innerHTML = `<form class="ht-editor" data-today-submit="habit-task-editor.save" novalidate><div class="ht-body">
<button type="button" class="ht-link ht-back" data-today-click="habit-task-editor.back"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 5-5 5 5 5"/></svg>habits</button>
<h3 class="ht-title" tabindex="-1"></h3>
<p class="ht-sub">A task for this habit appears in Today each day.</p>
<div class="ht-switch-row"><p id="htSwitchLabel">Daily task<small>Checking it also checks the habit. A new one at 3am.</small></p><button type="button" class="ht-switch" role="switch" aria-checked="false" aria-labelledby="htSwitchLabel" data-today-click="habit-task-editor.toggle"></button></div>
<div class="ht-config">
<fieldset class="ht-modes"><legend class="ht-label">How the task changes</legend>
<label class="ht-mode"><input type="radio" name="mode" value="fresh" data-today-change="habit-task-editor.mode"><b>${STAR} Fresh each day</b><span>TODAY writes a new one each morning from your note and the tasks before it.</span></label>
<label class="ht-mode"><input type="radio" name="mode" value="set" data-today-change="habit-task-editor.mode"><b>${LIST_IN} A varied set, rotated</b><span>TODAY prepares up to 14 different ones; they rotate and refresh each week. Works offline.</span></label>
</fieldset>
<p class="ht-hint ht-fresh-note">Needs an AI connection in Connections. Until then, the task uses the habit’s name.</p>
<label class="ht-label" for="htNote">Anything to take into account?</label>
<textarea id="htNote" name="note" rows="2" maxlength="1000"></textarea>
<p class="ht-hint">Optional. Keeps every task within what suits you. Only the habit, this note and earlier task wording go to your connected AI.</p>
<section class="ht-set" aria-labelledby="htSetLabel"><h4 class="ht-label" id="htSetLabel">This week’s set · remove any you don’t want</h4>
<ul class="ht-pool"></ul><p class="ht-hint ht-pool-empty">No tasks yet. Prepare a set, or add your own.</p>
<div class="ht-add"><input name="own" type="text" maxlength="120" autocomplete="off" placeholder="Add your own…" aria-label="Add a task to the set" data-today-keydown="habit-task-editor.own-key"><button type="button" class="ht-link" data-today-click="habit-task-editor.own">add</button></div>
<button type="button" class="ht-link ht-prepare" data-today-click="habit-task-editor.prepare">${STAR} prepare a new set</button></section>
<section class="ht-preview" aria-labelledby="htPreviewLabel"><h4 class="ht-label" id="htPreviewLabel">What you’ll see in Today</h4><div class="ht-rows"></div></section>
</div>
<p class="ht-status" role="status" aria-live="polite"></p></div>
<div class="ht-footer"><button type="button" class="ht-text-btn" data-today-click="habit-task-editor.back">cancel</button><button type="submit" class="ht-text-btn ht-save">save</button></div></form>`;
    const root = shell.firstElementChild;
    const day = _habitTodayISO();
    view = { root, habitId, old: c, avoid: [...(c?.avoid || [])], refreshedAt: c?.refreshedAt || '',
      // The habit's name is only a fallback; it never shows in the set.
      pool: (c?.actions || []).filter(a => a.id !== 'habit_name'),
      occurrence: state.occurrences[policy.key(habitId, day)],
      recent: Object.values(state.occurrences).filter(o => o.habitId === habitId && o.day < day).sort((a, b) => b.day.localeCompare(a.day)).map(o => o.actionId) };
    root.querySelector('.ht-title').textContent = habit.name;
    root.querySelector('.ht-switch').setAttribute('aria-checked', String(c ? c.enabled : true));
    root.querySelector(`[name="mode"][value="${c?.mode || 'fresh'}"]`).checked = true;
    root.querySelector('[name="note"]').value = c?.note || '';
    const content = document.getElementById('habitsContent'); content.replaceChildren(root);
    document.getElementById('habitsTitle').textContent = 'Daily task';
    document.getElementById('habitNewBtn').hidden = true; document.getElementById('habitEditBtn').hidden = true;
    document.getElementById('habitCountdown').style.display = 'none';
    sync();
    root.querySelector('.ht-title').focus({ preventScroll: true });
  }
  function back() {
    request?.abort(); request = null; view = null;
    Today.use('sidebar').open('habits', { fromDailyTask: true });
    document.getElementById('habitEditBtn')?.focus({ preventScroll: true });
  }
  async function prepare() {
    if (!view?.root.isConnected || request) return;
    if (!ai()) { status('Connect AI in Connections, or add your own tasks.'); return; }
    if (!navigator.onLine) { status('You are offline. You can still add your own tasks.'); return; }
    const owner = view, habit = habitsList.find(h => h.id === owner.habitId), button = $('.ht-prepare');
    const controller = new AbortController(); request = controller; button.disabled = true; status('Preparing a varied set…');
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const actions = await Today.use('habit-tasks').makeSet(habit, { note: $('[name="note"]').value.trim(), avoid: owner.avoid }, controller.signal);
      if (view !== owner || !owner.root.isConnected) return;
      owner.pool = actions; owner.refreshedAt = new Date().toISOString(); sync();
      status(actions.length + ' tasks ready. Remove any you don’t want, then save.');
    } catch {
      if (view === owner && owner.root.isConnected) status('Could not prepare a set. Nothing changed; add your own or try again.');
    } finally { clearTimeout(timer); if (request === controller) request = null; if (button.isConnected) button.disabled = false; }
  }
  function addOwn() {
    const input = $('[name="own"]'), text = input.value.trim().replace(/\s+/g, ' ');
    if (!text) return;
    if (view.pool.length >= 14) { status('A set holds up to 14 tasks. Remove one first.'); return; }
    view.pool.push({ id: 'own_' + crypto.randomUUID().slice(0, 8), text, days: [], keywords: '', minutes: 0 });
    input.value = ''; sync(); status('Added to the set.');
  }

  Today.define('habit-task-editor', { open });
  Today.ui.register('submit', 'habit-task-editor.save', event => {
    event.preventDefault(); if (!view?.root.isConnected) return;
    const habit = habitsList.find(h => h.id === view.habitId);
    if (on() && mode() === 'set' && !view.pool.length) { status('Add at least one task to the set, or choose Fresh each day.'); return; }
    // The set doubles as fresh mode's offline fallback; without one, the habit's name stands in.
    const actions = view.pool.length ? view.pool : [{ id: 'habit_name', text: habit?.name || 'Habit', days: [], keywords: '', minutes: 0 }];
    const value = { enabled: on(), mode: mode(), note: $('[name="note"]').value.trim(), avoid: view.avoid,
      refreshedAt: view.pool.length ? view.refreshedAt || new Date().toISOString() : '',
      calendarTiming: view.old?.calendarTiming === true, calendarTitles: view.old?.calendarTitles === true,
      actions, defaultId: actions[0].id };
    if (Today.use('habit-tasks').saveConfig(view.habitId, value)) back(); else status('Could not save this habit.');
  });
  Today.ui.register('click', 'habit-task-editor.back', back);
  Today.ui.register('click', 'habit-task-editor.toggle', (_event, button) => {
    button.setAttribute('aria-checked', String(button.getAttribute('aria-checked') !== 'true')); sync();
  });
  Today.ui.register('change', 'habit-task-editor.mode', () => {
    sync();
    if (mode() === 'set' && !view.pool.length && ai()) void prepare();
  });
  Today.ui.register('click', 'habit-task-editor.remove', (_event, button) => {
    const [removed] = view.pool.splice(Number(button.dataset.index), 1); if (!removed) return;
    view.avoid = [...view.avoid, removed.text].slice(-30);
    sync(); status('Removed. It won’t come back in a new set.');
    ($('.ht-chip-x') || $('[name="own"]')).focus({ preventScroll: true });
  });
  Today.ui.register('click', 'habit-task-editor.own', addOwn);
  Today.ui.register('keydown', 'habit-task-editor.own-key', event => { if (event.key === 'Enter') { event.preventDefault(); addOwn(); } });
  Today.ui.register('click', 'habit-task-editor.prepare', prepare);
  document.addEventListener('today:sidebar-unmount', () => { request?.abort(); request = null; view = null; });
})();
