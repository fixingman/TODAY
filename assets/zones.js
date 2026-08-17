// TODAY — Soon/Past zone management, save helpers, aging, and purge.
// Inert until index.html calls window._startZones() before init().
(function() {
  'use strict';
  let started = false;
  window._startZones = function() {
    if (started) return;
    started = true;
    // No state moves into this closure — soonTasks, pastTasks, triageDismissedToday
    // remain as inline globals (wholesale-reassigned by merge layer; mutated directly
    // in assets/triage.js). All functions reference those globals by name.

    function _saveSoon()   { localStorage.setItem('today_soon',   JSON.stringify(soonTasks)); }
    function _savePast()   { localStorage.setItem('today_past',   JSON.stringify(pastTasks)); }
    function _saveManual() { localStorage.setItem('today_manual', JSON.stringify(manualTasks)); }
    function _saveDone()   { localStorage.setItem('today_done',   JSON.stringify([...doneIds])); }

    function _ageSoon() {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const SOON_AGE_DAYS = 30;

      const aged = [];
      soonTasks = soonTasks.filter(t => {
        if (!t.zoneChangedAt) return true;
        const age = (now - new Date(t.zoneChangedAt).getTime()) / DAY_MS;
        if (age >= SOON_AGE_DAYS) {
          t.zone = 'past';
          t.status = 'aged';
          t.zoneChangedAt = new Date().toISOString();
          aged.push(t);
          return false;
        }
        return true;
      });

      if (aged.length > 0) {
        pastTasks.unshift(...aged);
        _saveSoon();
        _savePast();
        console.log(`[TODAY] Aged ${aged.length} items from SOON → PAST`);
      }
    }

    // Purge old items from PAST zone
    // - done items: 7 days
    // - let_go/aged items: 30 days
    // Returns tombstone entries {id, at} for the purged items — callers must persist them
    // into deleted_ids (BUG-054: a purged task is in no list, so without a tombstone any
    // device still holding it in manual_tasks resurrects it into TODAY on merge).
    // Callers persist differently: applyNewDayCleanup appends to localStorage directly;
    // mergeRemoteData injects into mergedDeletedMap BEFORE its own deleted_ids persist
    // (a direct write here would be clobbered by that persist).
    function _purgePast() {
      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const DONE_DAYS = 7;
      const LETGO_DAYS = 30;
      const nowISO = new Date(now).toISOString();

      const purgedEntries = [];
      pastTasks = pastTasks.filter(t => {
        if (!t.zoneChangedAt) { purgedEntries.push({ id: t.id, at: nowISO }); return false; }
        const age = (now - new Date(t.zoneChangedAt).getTime()) / DAY_MS;
        let keep = true;
        if (t.status === 'done') keep = age < DONE_DAYS;
        else if (t.status === 'let_go' || t.status === 'aged') keep = age < LETGO_DAYS;
        else keep = age < LETGO_DAYS;
        if (!keep) purgedEntries.push({ id: t.id, at: nowISO });
        return keep;
      });

      if (purgedEntries.length > 0) {
        _savePast();
        console.log(`[TODAY] Purged ${purgedEntries.length} old items from PAST`);
      }
      return purgedEntries;
    }

    function toggleZone(zone) {
      const list = document.getElementById(zone + 'List');
      const chevron = document.getElementById(zone + 'Chevron');
      const isOpen = list.style.display !== 'none';
      list.style.display = isOpen ? 'none' : 'block';
      chevron.classList.toggle('open', !isOpen);
      chevron.textContent = isOpen ? '+' : '−';
    }

    function renderSoon() {
      const section = document.getElementById('soonSection');
      const list = document.getElementById('soonList');
      const count = document.getElementById('soonCount');

      if (soonTasks.length === 0) {
        section.style.display = 'none';
        return;
      }

      section.style.display = 'block';
      count.textContent = soonTasks.length;

      list.innerHTML = [...soonTasks].sort((a, b) => a.text.localeCompare(b.text)).map(t => {
        const tagMatch = t.text.match(/^([a-z0-9]{1,12}):\s+(.+)$/i);
        const textHTML = tagMatch
          ? `<span class="task-tag">${esc(tagMatch[1].toLowerCase())}</span>${esc(tagMatch[2])}`
          : esc(t.text);
        return `
        <div class="task" data-id="${t.id}">
          <span class="task-text">${textHTML}</span>
          <button class="zone-badge pull-btn" onclick="pullFromSoon('${t.id}')" title="Pull into today">← pull in</button>
        </div>
      `}).join('');

      const _soonTouch = !window.matchMedia('(hover: hover)').matches;
      list.querySelectorAll('.task').forEach(taskEl => {
        const tagEl = taskEl.querySelector('.task-tag');
        if (!tagEl) return;
        const _shimmer = () => window._playTagInteractionShimmer(tagEl);
        if (_soonTouch) {
          const obs = new IntersectionObserver((entries, o) => {
            if (!entries[0].isIntersecting) return;
            o.disconnect();
            _shimmer();
          }, { threshold: 0.8 });
          obs.observe(tagEl);
        } else {
          taskEl.addEventListener('mouseenter', _shimmer);
        }
      });
    }

    function renderPast() {
      const section = document.getElementById('pastSection');
      const list = document.getElementById('pastList');
      const count = document.getElementById('pastCount');

      const visible = pastTasks;

      if (visible.length === 0) {
        section.style.display = 'none';
        return;
      }

      section.style.display = 'block';
      count.textContent = pastTasks.length;

      list.innerHTML = visible.map(t => {
        const statusClass = t.status || '';
        const statusBadge = t.status === 'done' ? '✓' : t.status === 'let_go' ? '○' : '◌';
        const tagMatch = t.text.match(/^([a-z0-9]{1,12}):\s+(.+)$/i);
        const textHTML = tagMatch
          ? `<span class="task-tag">${esc(tagMatch[1].toLowerCase())}</span>${esc(tagMatch[2])}`
          : esc(t.text);
        const badge = t.status === 'done'
          ? `<span class="zone-badge">${t.status}</span>`
          : `<button class="zone-badge pull-btn" onclick="reviveFromPastShowReason('${t.id}')" title="Back to soon">&#x21a9;&#xFE0E; soon</button>`;
        return `
          <div class="task ${statusClass}" data-id="${t.id}">
            <div class="task-check past-check">
              <span class="past-icon">${statusBadge}</span>
            </div>
            <div class="task-body">
              <div class="task-text">${textHTML}</div>
            </div>
            ${badge}
          </div>
        `;
      }).join('');
    }

    function pullFromSoon(id) {
      const task = soonTasks.find(t => t.id === id);
      if (!task) return;

      soonTasks = soonTasks.filter(t => t.id !== id);
      _saveSoon();

      task.zone = 'today';
      task.returnedFrom = 'soon';
      task.zoneChangedAt = new Date().toISOString();
      manualTasks.unshift(task);
      _saveManual();

      renderSoon();
      renderManual();
      updateStats();
      _haptic('light');
      if (typeof _memoryOnSoonPull === 'function') _memoryOnSoonPull(task.text);

      const token = localStorage.getItem('dropbox_token');
      if (token) dropboxBackup(true);
    }

    // Revive an aged/let-go item from PAST back to SOON — same task ID, so age basis,
    // session counts, and insight history survive (Roadmap #8: replaces Can's manual
    // copy-text → new task → move-to-soon ritual, which reset all of that).
    // Done items stay put — PAST is acknowledgment; only the unfinished get a way back.
    function reviveFromPastShowReason(id) {
      const card = document.querySelector(`#pastList .task[data-id="${id}"]`);
      if (!card) { reviveFromPast(id); return; }
      const btn = card.querySelector('.pull-btn');
      if (btn) btn.style.display = 'none';
      const reasons = [
        ['still_relevant', 'still relevant'],
        ['new_context',    'new context'],
        ['too_hasty',      'too hasty'],
        ['came_up_again',  'came up again'],
      ];
      const row = document.createElement('div');
      row.className = 'triage-reason-row past-revive-reasons';
      row.innerHTML = reasons.map(([key, label]) =>
        `<button class="triage-reason-btn" onclick="reviveFromPast('${id}','${key}')">${label}</button>`
      ).join('');
      card.querySelector('.task-body').appendChild(row);
    }

    function reviveFromPast(id, reason = '') {
      const task = pastTasks.find(t => t.id === id);
      if (!task || task.status === 'done') return;

      pastTasks = pastTasks.filter(t => t.id !== id);
      _savePast();

      // Fresh zoneChangedAt wins the merge against other devices still holding
      // the task in their PAST list.
      delete task.status;
      task.zone = 'soon';
      task.zoneChangedAt = new Date().toISOString();
      task.revived = (task.revived || 0) + 1;
      if (reason) task.reviveReason = reason;
      soonTasks.unshift(task);
      _saveSoon();

      renderPast();
      renderSoon();
      updateStats();
      _haptic('light');
      if (typeof _memoryOnRevive === 'function') _memoryOnRevive(task.text, reason);

      const token = localStorage.getItem('dropbox_token');
      if (token) dropboxBackup(true);
    }

    function moveToSoon(id) {
      const task = manualTasks.find(t => t.id === id);
      if (!task) return;

      manualTasks = manualTasks.filter(t => t.id !== id);
      _saveManual();

      task.zone = 'soon';
      task.zoneChangedAt = new Date().toISOString();
      delete task.returnedFrom;
      soonTasks.unshift(task);
      _saveSoon();

      renderManual();
      renderSoon();
      updateStats();
      checkTriageBar();

      const token = localStorage.getItem('dropbox_token');
      if (token) dropboxBackup(true);
    }

    function moveToPast(id, status = 'let_go') {
      const task = manualTasks.find(t => t.id === id);
      if (!task) return;

      manualTasks = manualTasks.filter(t => t.id !== id);
      _saveManual();

      task.zone = 'past';
      task.status = status;
      task.zoneChangedAt = new Date().toISOString();
      pastTasks.unshift(task);
      _savePast();

      renderManual();
      renderPast();
      updateStats();
      checkTriageBar();

      const token = localStorage.getItem('dropbox_token');
      if (token) dropboxBackup(true);
    }

    window._saveSoon = _saveSoon;
    window._savePast = _savePast;
    window._saveManual = _saveManual;
    window._saveDone = _saveDone;
    window._ageSoon = _ageSoon;
    window._purgePast = _purgePast;
    window.toggleZone = toggleZone;
    window.renderSoon = renderSoon;
    window.renderPast = renderPast;
    window.pullFromSoon = pullFromSoon;
    window.reviveFromPastShowReason = reviveFromPastShowReason;
    window.reviveFromPast = reviveFromPast;
    window.moveToSoon = moveToSoon;
    window.moveToPast = moveToPast;
  };
})();
