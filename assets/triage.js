// TODAY — evening triage flow and history.
// Inert until index.html calls window._startTriage() before init().
(function() {
  'use strict';
  let started = false;
  window._startTriage = function() {
    if (started) return;
    started = true;

    let triageDecisions = {};
    let _triageSnapshot = null;
    let _triageAutoCloseTimer = null;
    let _triageAutoCloseStart = 0;
    let _triageAutoCloseRemaining = 3000;
    let _triageActive = false;
    let _triageBarSilent = false;
    let _triageBarShown = false;
    const TRIAGE_HISTORY_MAX = 50;

    function _undoneTasks() {
      return {
        manual: manualTasks.filter(t => !doneIds.has(t.id)),
        trello: (trelloTasks || []).filter(t => !doneIds.has(t.id)),
      };
    }

    function checkTriageBar() {
      const bar = $.triageBar || document.getElementById('triageBar');
      if (!bar) return;

      if (_triageActive) {
        bar.classList.remove('visible'); bar.classList.add('hidden');
        const overlay = $.triageOverlay || document.getElementById('triageOverlay');
        if (overlay && !overlay.classList.contains('hidden')) {
          const { manual: undoneManual, trello: undoneTrello } = _undoneTasks();
          const totalUndone = undoneManual.length + undoneTrello.length;
          renderTriageList();
          const titleEl = $.triageTitle || document.getElementById('triageTitle');
          const remaining = totalUndone - Object.keys(triageDecisions).length;
          if (titleEl && remaining > 0) titleEl.textContent = `${remaining} didn't happen`;
        }
        return;
      }

      if (_triageBarSilent) {
        bar.classList.remove('visible'); bar.classList.add('hidden');
        return;
      }

      const hour = new Date().getHours();
      const { manual: undoneManual, trello: undoneTrello } = _undoneTasks();
      const totalUndone = undoneManual.length + undoneTrello.length;
      const inTriageWindow = hour >= 20;

      if (inTriageWindow && totalUndone > 0 && !triageDismissedToday) {
        const countEl = $.triageCount || document.getElementById('triageCount');
        if (countEl) countEl.textContent = totalUndone;
        if (!bar.classList.contains('visible')) {
          bar.classList.remove('hidden');
          bar.style.display = '';
          requestAnimationFrame(() => bar.classList.add('visible'));
        }
        _triageBarShown = true;
      } else if (_triageBarShown && inTriageWindow && !triageDismissedToday && totalUndone === 0) {
        bar.classList.remove('visible'); bar.classList.add('hidden');
        _triageBarShown = false;
      } else if (!inTriageWindow || triageDismissedToday) {
        bar.classList.remove('visible'); bar.classList.add('hidden');
        _triageBarShown = false;
      }
    }

    function triageExpand() {
      triageDecisions = {};
      _triageActive = true;

      const { manual: undoneManual, trello: undoneTrello } = _undoneTasks();
      const totalUndone = undoneManual.length + undoneTrello.length;

      const bar = $.triageBar || document.getElementById('triageBar');
      if (bar) { bar.classList.remove('visible'); bar.classList.add('hidden'); }
      const titleEl = $.triageTitle || document.getElementById('triageTitle');
      if (titleEl) titleEl.textContent = `${totalUndone} didn't happen`;
      document.getElementById('triageComplete').classList.add('hidden');
      const triageHdrReset = document.querySelector('.triage-header');
      if (triageHdrReset) triageHdrReset.style.display = '';

      renderTriageList();
      const overlay = $.triageOverlay || document.getElementById('triageOverlay');
      if (overlay) {
        overlay.hidden = false;
        overlay.classList.remove('hidden');
        if (window._a11yOpenDialog) _a11yOpenDialog(overlay, {
          modal: true,
          initialFocus: overlay.querySelector('.triage-header-btn'),
          returnFocus: document.getElementById('triageReviewBtn'),
          onEscape: triageMinimize
        });
      }
    }

    function renderTriageList() {
      const { manual: undoneManual, trello: undoneTrello } = _undoneTasks();
      const allUndone = [
        ...undoneManual.map(t => ({ ...t, source: 'manual' })),
        ...undoneTrello.map(t => ({ ...t, text: t.text || t.name, source: 'trello' }))
      ];
      const list = document.getElementById('triageList');

      const focusData = safeJSON('today_trello_focus_total', {});

      list.innerHTML = allUndone.map(t => {
        const decision = triageDecisions[t.id];
        const isTrello = t.source === 'trello';

        let metaText = 'from Trello';
        if (!isTrello) {
          const created = t.lastActive || t.createdAt || _getCreatedFromId(t.id);
          const age = _getAgeDays(created);
          metaText = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days`;
        }

        const focusCount = focusData[t.id] || 0;
        const metaClass = focusCount > 0 ? 'focus' : (isTrello ? 'trello' : '');
        if (focusCount > 0) metaText = `${focusCount} ⏱︎`;

        if (decision) {
          const badgeClass = decision;
          const badgeText = decision === 'done' ? 'done' : decision === 'kept' ? 'kept' : decision === 'soon' ? '↩︎ soon' : 'let go';
          const needsReason = decision === 'letgo' && !triageDecisions[t.id + '_reason'];
          const _rcs = [['not_relevant','not relevant'],['no_energy','no energy'],['lost_interest','lost interest'],['replaced','replaced']];
          return `
        <div class="triage-task decided" data-id="${t.id}">
          <div class="triage-task-row">
            <span class="triage-task-text">${esc(t.text)}</span>
            <span class="triage-task-badge ${badgeClass}">${badgeText}</span>
          </div>
          ${needsReason ? `<div class="triage-actions"><div class="triage-reason-row">${_rcs.map(([k,l])=>`<button class="triage-reason-btn" onclick="triageSetReason('${t.id}','${k}')">${l}</button>`).join('')}</div></div>` : ''}
        </div>
      `;
        }

        const actions = isTrello ? `
      <button class="triage-btn keep" onclick="triageDecide('${t.id}','kept')">Keep</button>
      <button class="triage-btn" onclick="triageShowReason('${t.id}')">Let go</button>
      <button class="triage-btn done" onclick="triageDecide('${t.id}','done')">Done</button>
    ` : `
      <button class="triage-btn keep" onclick="triageDecide('${t.id}','kept')">Keep</button>
      <button class="triage-btn" onclick="triageDecide('${t.id}','soon')">↩&#xFE0E; Soon</button>
      <button class="triage-btn" onclick="triageShowReason('${t.id}')">Let go</button>
      <button class="triage-btn done" onclick="triageDecide('${t.id}','done')">Done</button>
    `;

        return `
      <div class="triage-task${isTrello ? ' trello' : ''}" data-id="${t.id}">
        <div class="triage-task-row">
          <span class="triage-task-text">${esc(t.text)}</span>
          <span class="triage-task-meta ${metaClass}">${metaText}</span>
        </div>
        <div class="triage-actions">
          ${actions}
        </div>
      </div>
    `;
      }).join('');

      const remaining = allUndone.filter(t => !triageDecisions[t.id]).length;
      if (remaining > 0) {
        document.getElementById('triageTitle').textContent = `${remaining} didn't happen`;
      }
    }

    function triageShowReason(id) {
      triageDecisions[id] = 'letgo';
      _haptic('light');
      const { manual: undoneManual, trello: undoneTrello } = _undoneTasks();
      const allUndone = [...undoneManual, ...undoneTrello];
      const remaining = allUndone.filter(t => !triageDecisions[t.id]).length;
      if (remaining === 0) {
        triageApplyAll();
      } else {
        renderTriageList();
      }
    }

    function triageSetReason(id, reason) {
      triageDecisions[id + '_reason'] = reason;
      renderTriageList();
    }

    function triageDecide(id, decision, reason = '') {
      triageDecisions[id] = decision;
      if (decision === 'letgo') triageDecisions[id + '_reason'] = reason;
      _haptic('light');

      const { manual: undoneManual, trello: undoneTrello } = _undoneTasks();
      const allUndone = [...undoneManual, ...undoneTrello];
      const remaining = allUndone.filter(t => !triageDecisions[t.id]).length;

      if (remaining === 0) {
        triageApplyAll();
      } else {
        renderTriageList();
      }
    }

    function triageKeepAll() {
      const { manual: undoneManual, trello: undoneTrello } = _undoneTasks();
      undoneManual.forEach(t => triageDecisions[t.id] = 'kept');
      undoneTrello.forEach(t => triageDecisions[t.id] = 'kept');
      triageApplyAll();
    }

    function triageApplyAll() {
      triageDismissedToday = true;
      localStorage.setItem('triage_dismissed', _getAppDay());

      const { manual: undoneManual, trello: undoneTrello } = _undoneTasks();

      _triageSnapshot = {
        manualTasks:  JSON.parse(JSON.stringify(manualTasks)),
        doneIds:      new Set(doneIds),
        soonTasks:    JSON.parse(JSON.stringify(soonTasks)),
        pastTasks:    JSON.parse(JSON.stringify(pastTasks)),
        checkedIds:   localStorage.getItem('today_checked_ids')   || '[]',
        uncheckedIds: localStorage.getItem('today_unchecked_ids') || '[]',
      };
      let keptCount = 0, soonCount = 0, letgoCount = 0, doneCount = 0;

      const _markDoneInTriage = (id, text) => {
        doneIds.add(id);
        _addCheckedId(id);
        _removeUncheckedId(id);
        if (typeof _memoryOnTaskComplete === 'function') _memoryOnTaskComplete(text || '', id);
      };

      const hour = new Date().getHours();
      const dayOfWeek = new Date().getDay();
      const focusData = safeJSON('today_trello_focus_total', {});

      undoneManual.forEach(t => {
        const decision = triageDecisions[t.id];
        if (!decision) return;

        const created = t.lastActive || t.createdAt || _getCreatedFromId(t.id);
        const ageDays = _getAgeDays(created);
        const sessions = focusData[t.id] || 0;

        const _letgoReason = decision === 'letgo' ? (triageDecisions[t.id + '_reason'] || '') : '';
        _saveTriageHistory({
          text: t.text,
          decision: decision,
          sessions: sessions,
          ageDays: ageDays,
          dayOfWeek: dayOfWeek,
          hour: hour,
          ts: new Date().toISOString(),
          ...(decision === 'letgo' && _letgoReason && { reason: _letgoReason })
        });

        if (decision === 'kept') {
          keptCount++;
        } else if (decision === 'done') {
          doneCount++;
          _markDoneInTriage(t.id, t.text);
        } else if (decision === 'soon') {
          soonCount++;
          t.zone = 'soon';
          t.zoneChangedAt = new Date().toISOString();
          soonTasks.unshift(t);
        } else if (decision === 'letgo') {
          letgoCount++;
          _memoryOnTaskLetgo(t.text, _letgoReason);
          t.zone = 'past';
          t.status = 'let_go';
          t.zoneChangedAt = new Date().toISOString();
          pastTasks.unshift(t);
        }
      });

      undoneTrello.forEach(t => {
        const decision = triageDecisions[t.id];
        if (!decision) return;

        const sessions = focusData[t.id] || 0;

        const _tLetgoReason = decision === 'letgo' ? (triageDecisions[t.id + '_reason'] || '') : '';
        _saveTriageHistory({
          text: t.text || t.name,
          decision: decision,
          sessions: sessions,
          ageDays: 0,
          dayOfWeek: dayOfWeek,
          hour: hour,
          source: 'trello',
          ts: new Date().toISOString(),
          ...(decision === 'letgo' && _tLetgoReason && { reason: _tLetgoReason })
        });

        if (decision === 'kept') {
          keptCount++;
        } else if (decision === 'done') {
          doneCount++;
          _markDoneInTriage(t.id, t.text || t.name);
        } else if (decision === 'letgo') {
          letgoCount++;
          if (_tLetgoReason) _memoryOnTaskLetgo(t.text || t.name, _tLetgoReason);
          doneIds.add(t.id);
        }
      });

      _saveDone();

      const movedIds = undoneManual
        .filter(t => triageDecisions[t.id] !== 'kept' && triageDecisions[t.id] !== 'done')
        .map(t => t.id);
      manualTasks = manualTasks.filter(t => !movedIds.includes(t.id));

      const _postTriageDone = manualTasks.filter(t => doneIds.has(t.id));
      _postTriageDone.forEach(t => {
        t.zone = 'past';
        t.status = 'done';
        t.zoneChangedAt = new Date().toISOString();
        pastTasks.unshift(t);
      });
      if (_postTriageDone.length > 0) manualTasks = manualTasks.filter(t => !doneIds.has(t.id));

      _saveManual();
      if (soonCount > 0) _saveSoon();
      if (letgoCount > 0 || _postTriageDone.length > 0) _savePast();

      if (movedIds.length > 0 || doneCount > 0 || _postTriageDone.length > 0) {
        const token = localStorage.getItem('dropbox_token');
        if (token) dropboxBackup(true);
      }

      const triageParts = [];
      if (keptCount > 0) triageParts.push(`${keptCount} kept`);
      if (soonCount > 0) triageParts.push(`${soonCount} to soon`);
      if (letgoCount > 0) triageParts.push(`${letgoCount} let go`);

      const _doneToday = _doneTodayCount();
      const _focusMins = parseInt(localStorage.getItem('stat_focus_mins_today') || '0');
      const _streak    = parseInt(localStorage.getItem('stat_streak') || '1');
      const _habitsDoneCount = habitsList.filter(h =>
        (habitCompletions[h.id] || []).includes(_habitTodayISO())
      ).length;

      let headline = 'All sorted';
      if (_doneToday >= 8)                          headline = 'Big day';
      else if (_doneToday >= 5)                     headline = 'Solid day';
      else if (_doneToday >= 3 && _focusMins >= 50) headline = 'Deep work today';
      else if (_doneToday >= 3)                     headline = 'Good day';
      else if (_doneToday >= 1)                     headline = 'You showed up';
      else if (_habitsDoneCount > 0)                headline = 'Habits held';
      else                                          headline = 'All sorted';

      const detailParts = [];
      if (_doneToday > 0) detailParts.push(`${_doneToday} done`);
      if (_focusMins >= 5) detailParts.push(_formatFocusTime(_focusMins) + ' focused');
      if (_habitsDoneCount > 0) detailParts.push(`${_habitsDoneCount} habit${_habitsDoneCount > 1 ? 's' : ''}`);
      if (_streak >= 3) detailParts.push(`day ${_streak}`);

      document.getElementById('triageList').innerHTML = '';
      document.getElementById('triageComplete').classList.remove('hidden');
      const triageHdr = document.querySelector('.triage-header');
      if (triageHdr) triageHdr.style.display = 'none';

      const msgEl = document.querySelector('.triage-complete-msg');
      if (msgEl) msgEl.textContent = headline + '.';

      const subParts = [];
      if (_doneToday > 0) subParts.push(`${_doneToday} done`);
      if (_focusMins >= 25) subParts.push(_formatFocusTime(_focusMins) + ' focused');
      if (_habitsDoneCount > 0 && _doneToday === 0) subParts.push(`${_habitsDoneCount} habit${_habitsDoneCount > 1 ? 's' : ''}`);
      if (_streak >= 3 && subParts.length < 2) subParts.push(`day ${_streak}`);

      const summaryEl = document.getElementById('triageSummary');
      if (summaryEl) {
        const subLine = subParts.join(' · ');
        summaryEl.innerHTML = subLine
          ? `<div class="triage-complete-sub">${esc(subLine)}</div>`
          : '';
      }

      localStorage.setItem('today_day_review', JSON.stringify({
        done: _doneToday,
        focusMins: _focusMins,
        habits: _habitsDoneCount,
        habitsTotal: habitsList.length,
        streak: _streak,
        kept: keptCount,
        soon: soonCount,
        letgo: letgoCount,
        date: _localISO(),
      }));

      _haptic('success');

      renderManual();
      renderTrello();
      renderSoon();
      renderPast();
      updateStats();

      const undoBtn = document.getElementById('triageUndoBtn');
      if (undoBtn) undoBtn.style.display = '';

      const reflectionState = typeof window._reflectionShowAfterTriage === 'function'
        ? window._reflectionShowAfterTriage()
        : { visible: false };

      const initialMs = reflectionState.timeoutMs || 3000;
      _startAutoClose(initialMs);

      if (typeof window._reflectionMountInTriage === 'function') window._reflectionMountInTriage(reflectionState);

      if (typeof window._memoryAbstract === 'function') window._memoryAbstract();
    }

    function _startAutoClose(durationMs) {
      if (_triageAutoCloseTimer) clearTimeout(_triageAutoCloseTimer);
      _triageAutoCloseRemaining = durationMs;
      _triageAutoCloseStart = Date.now();
      _triageAutoCloseTimer = setTimeout(() => {
        _triageSnapshot = null;
        triageClose();
      }, durationMs);

      const _triageCompleteEl = document.getElementById('triageComplete');
      if (_triageCompleteEl && !_triageCompleteEl._hoverWired) {
        _triageCompleteEl._hoverWired = true;
        _triageCompleteEl.addEventListener('mouseenter', () => {
          if (!_triageAutoCloseTimer) return;
          clearTimeout(_triageAutoCloseTimer);
          _triageAutoCloseTimer = null;
          _triageAutoCloseRemaining -= (Date.now() - _triageAutoCloseStart);
        });
        _triageCompleteEl.addEventListener('mouseleave', () => {
          if (!_triageSnapshot) return;
          _triageAutoCloseStart = Date.now();
          _triageAutoCloseTimer = setTimeout(() => {
            _triageSnapshot = null;
            triageClose();
          }, Math.max(_triageAutoCloseRemaining, 600));
        });
      }
    }

    function _triageResetAutoClose(ms) {
      if (_triageAutoCloseTimer) { clearTimeout(_triageAutoCloseTimer); _triageAutoCloseTimer = null; }
      _triageAutoCloseRemaining = ms;
      _triageAutoCloseStart = Date.now();
      _triageAutoCloseTimer = setTimeout(() => {
        _triageSnapshot = null;
        triageClose();
      }, ms);
    }

    window._triageResetAutoClose = _triageResetAutoClose;

    function _saveTriageHistory(entry) {
      let history = safeJSON('today_triage_history', []);
      history.unshift(entry);
      if (history.length > TRIAGE_HISTORY_MAX) {
        history = history.slice(0, TRIAGE_HISTORY_MAX);
      }
      localStorage.setItem('today_triage_history', JSON.stringify(history));
    }

    function _getTriageHistory() {
      return safeJSON('today_triage_history', []);
    }

    function triageMinimize() {
      if (triageDismissedToday) {
        triageClose();
        return;
      }
      _triageActive = false;
      const overlay = document.getElementById('triageOverlay');
      overlay.classList.add('hidden');
      if (window._a11yCloseDialog) _a11yCloseDialog(overlay);
      else overlay.hidden = true;
      const _tbMin = document.getElementById('triageBar');
      if (_tbMin) { _tbMin.classList.remove('hidden'); requestAnimationFrame(() => _tbMin.classList.add('visible')); }
    }

    function triageClose() {
      _triageActive = false;
      triageDismissedToday = true;
      localStorage.setItem('triage_dismissed', _getAppDay());
      const overlay = document.getElementById('triageOverlay');
      overlay.classList.add('hidden');
      if (window._a11yCloseDialog) _a11yCloseDialog(overlay);
      else overlay.hidden = true;
      const _tbClose = document.getElementById('triageBar');
      if (_tbClose) {
        _tbClose.classList.remove('visible');
        setTimeout(() => _tbClose.classList.add('hidden'), 300);
      }

      const token = localStorage.getItem('dropbox_token');
      if (token) dropboxBackup(true);
    }

    function triageUndo() {
      if (!_triageSnapshot) return;
      clearTimeout(_triageAutoCloseTimer);
      _triageAutoCloseTimer = null;
      manualTasks  = _triageSnapshot.manualTasks;
      doneIds      = _triageSnapshot.doneIds;
      soonTasks    = _triageSnapshot.soonTasks;
      pastTasks    = _triageSnapshot.pastTasks;
      localStorage.setItem('today_checked_ids',   _triageSnapshot.checkedIds);
      localStorage.setItem('today_unchecked_ids', _triageSnapshot.uncheckedIds);
      _saveManual(); _saveDone(); _saveSoon(); _savePast();
      _triageSnapshot = null;
      triageDecisions = {};
      _triageActive = false;
      triageDismissedToday = false;
      localStorage.removeItem('triage_dismissed');
      const overlay = document.getElementById('triageOverlay');
      overlay.classList.add('hidden');
      if (window._a11yCloseDialog) _a11yCloseDialog(overlay);
      else overlay.hidden = true;
      const undoBtn = document.getElementById('triageUndoBtn');
      if (undoBtn) undoBtn.style.display = 'none';
      if (typeof _memoryOnTriageUndo === 'function') _memoryOnTriageUndo();
      renderManual(); renderTrello(); renderSoon(); renderPast(); updateStats();
      const token = localStorage.getItem('dropbox_token');
      if (token) dropboxBackup(true);
      if (window._a11yAnnounce) _a11yAnnounce('Triage changes undone.');
    }

    window.checkTriageBar = checkTriageBar;
    window.triageExpand = triageExpand;
    window.renderTriageList = renderTriageList;
    window.triageShowReason = triageShowReason;
    window.triageSetReason = triageSetReason;
    window.triageDecide = triageDecide;
    window.triageKeepAll = triageKeepAll;
    window.triageApplyAll = triageApplyAll;
    window.triageMinimize = triageMinimize;
    window.triageClose = triageClose;
    window.triageUndo = triageUndo;
    window._setTriageBarSilent = v => { _triageBarSilent = v; };
  };
})();
