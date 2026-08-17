// TODAY — Config panel, privacy gate, connections rendering, and task HTML.
// Inert until index.html calls window._startConnections() before init().
(function() {
  'use strict';
  let started = false;
  window._startConnections = function() {
    if (started) return;
    started = true;
    // Two state vars live here: not wholesale-replaced by the Dropbox sync/merge layer.
    const _CONNECTIONS_PRIVACY_SEEN_KEY = 'today_connections_privacy_seen';
    let _connectionsPrivacyVisible = false;
    // All other state (manualTasks, doneIds, soonTasks, pastTasks, trelloTasks, $)
    // is wholesale-replaced by mergeRemoteData — must stay as inline globals.

    function setTrelloIcon(connected) {
      const btn = document.getElementById('trelloBtn');
      if (!btn) return;
      btn.textContent = connected ? '✦︎' : '⚡︎';
      // title stays "Connections" — set in HTML, never overwritten
    }

    function syncActiveButtons() {
      const habitsOpen = $.habitsPanel.classList.contains('open');
      const configOpen = $.configPanel.classList.contains('open');
      const infoOpen   = $.infoPanel.classList.contains('open');
      const memoryOpen = $.memoryPanel?.classList.contains('open');
      document.getElementById('habitsBtn').classList.toggle('active', habitsOpen);
      document.getElementById('trelloBtn').classList.toggle('active', configOpen);
      document.getElementById('infoBtn').classList.toggle('active',   infoOpen);
      $.todayLogo?.classList.toggle('active', memoryOpen);

    }


    function _connectionsHaveCredentials() {
      const trelloConfig = safeJSON('trello_config', {});
      return !!(
        localStorage.getItem('trello_token') ||
        trelloConfig.apiToken ||
        localStorage.getItem('dropbox_token') ||
        localStorage.getItem('dropbox_refresh_token') ||
        localStorage.getItem('dropbox_token_expired') === '1' ||
        _aiGetKey('gemini') ||
        _aiGetKey('claude')
      );
    }

    function _renderConnectionsPrivacy() {
      if (_connectionsPrivacyVisible && _connectionsHaveCredentials()) {
        _connectionsPrivacyVisible = false;
      }
      const note = document.getElementById('connectionsPrivacyNote');
      if (note) note.style.display = _connectionsPrivacyVisible ? 'block' : 'none';
    }

    function _beginConnectionsPrivacyVisit() {
      const isFirstVisit = localStorage.getItem(_CONNECTIONS_PRIVACY_SEEN_KEY) !== '1';
      if (isFirstVisit) localStorage.setItem(_CONNECTIONS_PRIVACY_SEEN_KEY, '1');
      _connectionsPrivacyVisible = isFirstVisit && !_connectionsHaveCredentials();
      _renderConnectionsPrivacy();
    }

    function _endConnectionsPrivacyVisit() {
      _connectionsPrivacyVisible = false;
      _renderConnectionsPrivacy();
    }

    function toggleConfig() {
      const scrollY = window.scrollY; // Preserve scroll position
      const configPanel = $.configPanel;
      const isOpening = !configPanel.classList.contains('open');
      if (isOpening) {
        configPanel.style.animation = ''; // clear repaint suppression so fadeIn plays (BUG-023)
        configPanel.classList.add('open');
      } else {
        configPanel.classList.remove('open');
      }
      $.infoPanel.classList.remove('open');
      $.habitsPanel.classList.remove('open');
      $.memoryPanel?.classList.remove('open');
      syncActiveButtons();
      window.scrollTo(0, scrollY); // Restore scroll position
      if (isOpening) {
        _beginConnectionsPrivacyVisit();
        renderConnections();
        setTimeout(_aiRenderConfig, 0);
        renderMeetingNames();
      } else {
        _endConnectionsPrivacyVisit();
        const s = document.getElementById('statusMsg');
        const d = document.getElementById('dropboxMsg');
        if (s) { s.textContent = ''; s.className = 'status-msg'; }
        if (d) { d.textContent = ''; d.className = 'status-msg'; }
      }
    }

    // Renders Trello + Dropbox in a compact layout based on connection state

    function _applyOfflinePanel() {
      const offline = !navigator.onLine;
      const banner = document.getElementById('offlineBanner');
      if (banner) banner.classList.toggle('visible', offline);

      // Disable/enable all CTAs in the connections panel and AI section
      const panel = document.getElementById('configPanel');
      if (panel) {
        panel.querySelectorAll('button:not(#offlineBanner *)').forEach(btn => {
          btn.disabled = offline;
          btn.style.opacity = offline ? 'var(--opacity-dim)' : '';
          btn.style.cursor  = offline ? 'not-allowed' : '';
        });
        const aiInput = panel.querySelector('#aiApiKey');
        if (aiInput) {
          aiInput.disabled = offline;
          aiInput.style.opacity = offline ? 'var(--opacity-dim)' : '';
        }
      }
    }

    function renderConnections() {
      // Skip if panel isn't open — background sync calls this frequently
      // but rebuilding HTML when panel is hidden is wasted work
      const configPanel = $.configPanel || document.getElementById('configPanel');
      if (configPanel && !configPanel.classList.contains('open')) return;

      const container = document.getElementById('connectionsContainer');
      if (!container) return;

      _renderConnectionsPrivacy();

      const trelloToken = localStorage.getItem('trello_token');
      const trelloConfig = getSavedConfig();
      const trelloHasBoard = !!(trelloConfig.boardId);

      const dropboxToken = localStorage.getItem('dropbox_token');
      const dropboxExpired = localStorage.getItem('dropbox_token_expired') === '1';
      const dropboxConnected = dropboxToken && !dropboxExpired;

      const lastBackup = localStorage.getItem('last_successful_backup');
      const lastSyncRead = localStorage.getItem('last_sync_read');
      let backupStatus = '';
      if (lastBackup || lastSyncRead) {
        // Show the most recent of read or write
        const lastActivity = lastSyncRead && lastBackup 
          ? (new Date(lastSyncRead) > new Date(lastBackup) ? lastSyncRead : lastBackup)
          : (lastSyncRead || lastBackup);
        const mins = Math.round((Date.now() - new Date(lastActivity).getTime()) / 60000);
        backupStatus = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.round(mins/60)}h ago`;
      }
      // Both disconnected: side-by-side cards
      if (!trelloToken && !dropboxConnected) {
        container.innerHTML = `
          <div class="connections-grid">
            <div class="connection-card">
              <div class="connection-card-header">
                <span class="connection-card-title">Trello</span>
              </div>
              <div class="connection-card-hint">Pull today's cards automatically</div>
              <button class="btn-primary" onclick="trelloAuth()">Connect</button>
            </div>
            <div class="connection-card">
              <div class="connection-card-header">
                <span class="connection-card-title">Dropbox</span>
              </div>
              <div class="connection-card-hint">Sync tasks across devices</div>
              <button class="btn-primary" onclick="dropboxAuth()">Connect</button>
            </div>
          </div>`;
        _applyOfflinePanel();
        return;
      }

      // At least one connected: stacked layout
      let html = '';

      // Trello section
      if (trelloToken && trelloHasBoard) {
        // Connected with board — compact row
        const boardName = _getTrelloBoardName() || 'Board';
        const listName = trelloConfig.todayList || 'Due today';
        html += `
          <div class="connection-row connected">
            <div class="connection-row-info">
              <span class="connection-row-title connected">Trello</span>
              <span class="connection-row-status">${esc(boardName)} → ${esc(listName)}</span>
            </div>
            <span class="conn-check">✓</span>
            <div class="connection-row-actions">
              <button class="btn-sm" onclick="loadTrello()">Refresh</button>
              <button class="btn-sm btn-forget" onclick="clearTrello()">Forget</button>
            </div>
          </div>`;
      } else if (trelloToken) {
        // Connected but needs board selection — expanded
        html += `
          <div class="connection-expanded" id="trelloExpanded">
            <div class="connection-expanded-header">
              <span class="connection-expanded-title">Trello</span>
              <span class="connection-expanded-status">● Connected</span>
            </div>
            <select id="boardSelect" onchange="onBoardChange()">
              <option value="">— select a board —</option>
            </select>
            <div id="listFieldWrap" style="display:none">
              <select id="listSelect">
                <option value="">— due today only —</option>
              </select>
            </div>
            <div class="connection-expanded-actions">
              <button class="btn-sm primary" id="loadTasksBtn" onclick="saveAndLoad()">Get tasks</button>
              <button class="btn-sm ghost" onclick="clearTrello()">Forget</button>
            </div>
          </div>`;
      } else {
        // Disconnected — compact row with connect
        html += `
          <div class="connection-row">
            <div class="connection-row-info">
              <span class="connection-row-title">Trello</span>
              <span class="connection-row-status">Pull today's cards</span>
            </div>
            <div class="connection-row-actions">
              <button class="btn-sm primary" onclick="trelloAuth()">Connect</button>
            </div>
          </div>`;
      }

      // Dropbox section
      if (dropboxConnected) {
        // Connected — compact row
        html += `
          <div class="connection-row connected">
            <div class="connection-row-info">
              <span class="connection-row-title connected">Dropbox</span>
              <span class="connection-row-status">${backupStatus ? 'Saved ' + backupStatus : ''}</span>
            </div>
            <span class="conn-check">✓</span>
            <div class="connection-row-actions">
              <button class="btn-sm" onclick="dropboxBackup()">Save</button>
              <button class="btn-sm" onclick="dropboxRestore()">Restore</button>
              <button class="btn-sm btn-forget" onclick="dropboxDisconnect()">Forget</button>
            </div>
          </div>`;
      } else if (dropboxExpired) {
        // Expired — show reconnect
        html += `
          <div class="connection-row">
            <div class="connection-row-info">
              <span class="connection-row-title">Dropbox</span>
              <span class="connection-row-status error">Session expired</span>
            </div>
            <div class="connection-row-actions">
              <button class="btn-sm primary" onclick="dropboxAuth()">Reconnect</button>
            </div>
          </div>`;
      } else {
        // Disconnected — compact row
        html += `
          <div class="connection-row">
            <div class="connection-row-info">
              <span class="connection-row-title">Dropbox</span>
              <span class="connection-row-status">Backup & sync</span>
            </div>
            <div class="connection-row-actions">
              <button class="btn-sm primary" onclick="dropboxAuth()">Connect</button>
            </div>
          </div>`;
      }

      container.innerHTML = html;

      // If Trello needs board loading, do it now
      if (trelloToken && !trelloHasBoard) {
        loadTrelloBoards();
      }

      _applyOfflinePanel();
      renderMeetingNames();
    }


    // Dropbox disconnect helper
    function dropboxDisconnect() {
      localStorage.removeItem('dropbox_token');
      localStorage.removeItem('dropbox_refresh_token');
      localStorage.removeItem('dropbox_token_expiry');
      localStorage.removeItem('dropbox_token_expired');
      renderConnections();
      showStatus('Dropbox disconnected.', 'success');
    }


    function _getDueStr(task) {
      if (!task.due) return '';
      const d   = new Date(task.due);
      const now = new Date();
      // Future date (after today) — hide the badge entirely
      if (d.toDateString() !== now.toDateString() && d > now) return '';
      // Overdue (past, not today) — show the date
      if (d < now && d.toDateString() !== now.toDateString())
        return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
      // Due today — show the time
      return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    }

    // Tag shimmer state is exclusive: an arrival shimmer must never be replaced
    // midway by the shorter hover/scroll shimmer. Both paths call this helper so
    // their classes and cleanup cannot overlap (BUG-075).
    function _playTagShimmer(tagEl, className, state) {
      if (!tagEl || tagEl.dataset.tagShimmer) return false;
      tagEl.dataset.tagShimmer = state;
      tagEl.classList.add(className);

      const cleanup = event => {
        if (event.target !== tagEl || event.animationName !== 'tagShimmer') return;
        tagEl.classList.remove(className);
        if (tagEl.dataset.tagShimmer === state) delete tagEl.dataset.tagShimmer;
        tagEl.removeEventListener('animationend', cleanup);
        tagEl.removeEventListener('animationcancel', cleanup);
      };
      tagEl.addEventListener('animationend', cleanup);
      tagEl.addEventListener('animationcancel', cleanup);
      return true;
    }

    function _queueTagArrivalShimmer(tagEl) {
      if (!tagEl || tagEl.dataset.tagShimmer) return;
      // Mark synchronously. A mouseenter delivered after the row is appended but
      // before IntersectionObserver runs must not steal the arrival animation.
      tagEl.dataset.tagShimmer = 'arrival-pending';
      const observer = new IntersectionObserver((entries, currentObserver) => {
        if (!entries[0].isIntersecting) return;
        currentObserver.disconnect();
        if (tagEl.dataset.tagShimmer !== 'arrival-pending') return;
        delete tagEl.dataset.tagShimmer;
        _playTagShimmer(tagEl, 'task-tag-shimmer', 'arrival');
      }, { threshold: 0.8 });
      observer.observe(tagEl);
    }

    function _playTagInteractionShimmer(tagEl) {
      return _playTagShimmer(tagEl, '_soon-shimmer', 'interaction');
    }

    function renderManual() {
      const list  = $.manualList || document.getElementById('manualList');
      const empty = $.manualEmpty || document.getElementById('manualEmpty');
      if (!list || !empty) return;

      // Full render — only called on init/page load
      list.innerHTML = manualTasks.map(t => taskHTML(t, 'manual')).join('');
      list.querySelectorAll('.task.done').forEach(el => _applyDoneStyles(el, true));
      const countEl = $.manualCount || document.getElementById('manualCount');
      if (countEl) countEl.textContent = manualTasks.length;
      updateManualEmptyState();
      // Re-anchor focus timer if active — innerHTML destroyed the old task element
      if (window._focusReanchor) window._focusReanchor();
      // Attempt to restore a focus session that survived an iOS PWA reload
      if (window._tryRestoreFocusSession) window._tryRestoreFocusSession();
      _wireManualTagShimmer(list);
    }

    // Wire hover/scroll shimmer on .task-tag elements in the manual list.
    // Pass a list container (renderManual) or a single .task element (addManual).
    // Desktop: mouseenter → single shimmer sweep. Mobile: IntersectionObserver.
    // Threshold 0.3 (not 0.8) so shimmer leads the element into view rather than
    // waiting until it's nearly fully visible.
    function _wireManualTagShimmer(container) {
      const _isTouch = !window.matchMedia('(hover: hover)').matches;
      const tasks = container.classList && container.classList.contains('task')
        ? [container]
        : [...container.querySelectorAll('.task:not(.done)')];
      tasks.forEach(taskEl => {
        const tagEl = taskEl.querySelector('.task-tag');
        if (!tagEl) return;
        const _shimmer = () => _playTagInteractionShimmer(tagEl);
        if (_isTouch) {
          const obs = new IntersectionObserver((entries, o) => {
            if (!entries[0].isIntersecting) return;
            o.disconnect();
            _shimmer();
          }, { threshold: 0.3 });
          obs.observe(tagEl);
        } else {
          taskEl.addEventListener('mouseenter', _shimmer);
        }
      });
    }

    function taskHTML(task, type) {
      const done   = doneIds.has(task.id);
      const tid    = task.id; // original id - safe alphanumeric, stored in data-taskid
      const dueStr = _getDueStr(task);

      // Calculate task age in days (manual + trello)
      let ageDays = 0;
      if (!done) {
        const created = type === 'trello'
          ? _trelloAgeBasis(task.id)   // first-seen in your list, not Trello creation date (BUG-049)
          : (task.lastActive || _getCreatedFromId(task.id));
        ageDays = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
        // A Trello card focused today reads as active — no dimming. Trello age is first-seen-based
        // (cards have no lastActive), so manual tasks un-age on activity but Trello can't; the
        // daily-reset focus count is its activity signal. (BUG-043)
        if (type === 'trello' && (_getTrelloFocus()[task.id] || 0) > 0) ageDays = 0;
      }

      // Detect tag pattern: "tag: rest of text" at start
      // Tag must be 1-12 chars, lowercase/numbers only, followed by ": "
      const tagMatch = task.text.match(/^([a-z0-9]{1,12}):\s+(.+)$/i);

      const safeUrl = task.url && /^https?:\/\//i.test(task.url) ? task.url : '';
      const linkTitle = type === 'trello' ? 'Open in Trello' : 'Open link';
      // Trello links are system-generated URLs — just ↗. Manual links were pasted by user — link ↗.
      const linkLabel = type === 'trello' ? '↗︎' : 'link ↗︎';
      const linkHTML = safeUrl
        ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener" class="task-link" title="${linkTitle}">${linkLabel}</a>`
        : '';

      // For manual tasks: if URL is still in task.text (new behavior), inject inline.
      // For legacy manual tasks and Trello: URL not in text, append at end.
      let taskTextHTML;
      const urlInText = safeUrl && task.text.includes(safeUrl);

      if (urlInText) {
        // Split text around the URL, escape each part, inject link inline
        const parts = task.text.split(safeUrl);
        const before = parts[0];
        const after = parts.slice(1).join(safeUrl); // handles edge case of URL appearing twice
        if (tagMatch) {
          const tag = tagMatch[1].toLowerCase();
          // Tag detection on the before portion
          const tagRest = before.replace(new RegExp('^' + tag + ':\\s+', 'i'), '');
          taskTextHTML = `<span class="task-tag">${esc(tag)}</span>${esc(tagRest)}${linkHTML}${esc(after)}`;
        } else {
          taskTextHTML = `${esc(before)}${linkHTML}${esc(after)}`;
        }
      } else {
        // Legacy / Trello: text has no inline URL — build text then append link
        if (tagMatch) {
          taskTextHTML = `<span class="task-tag">${esc(tagMatch[1].toLowerCase())}</span>${esc(tagMatch[2])}${linkHTML}`;
        } else {
          taskTextHTML = `${esc(task.text)}${linkHTML}`;
        }
      }

      const checklistBadge = type === 'trello' && task.checklist
        ? `<span class="badge checklist">${task.checklist.done}/${task.checklist.total} ✓</span>`
        : '';
      const badges = type === 'trello' && (dueStr || checklistBadge)
        ? `${dueStr ? `<span class="badge due">due ${esc(dueStr)}</span>` : ''}${checklistBadge}`
        : '';

      const sessions = type === 'trello'
        ? (_getTrelloFocusTotal()[task.id] || 0)
        : (parseInt(task.focusSessions) || 0);
      const sessionBadge = sessions > 0
        ? `<span class="session-count has-sessions">${sessions} 🍅</span>`
        : `<span class="session-count"></span>`;

      const deleteBtn = type === 'manual'
        ? `<button class="task-delete" data-taskid="${tid}" title="Remove">×</button>`
        : '';
      // Copy button — visible only in focus mode via CSS, present on all task types
      const copyBtn = `<button class="task-copy copy-cta" data-taskid="${tid}" title="Copy task text">copy</button>`;

      // Age bucket for CSS-based visual aging (undone manual + trello tasks)
      // Day 3-4: young, 5-6: mid, 7+: old. Day 0-2: no attribute (full opacity).
      let ageBucket = '';
      if (!done) {
        if (ageDays >= 7) ageBucket = 'old';
        else if (ageDays >= 5) ageBucket = 'mid';
        else if (ageDays >= 3) ageBucket = 'young';
      }
      const ageAttr = ageBucket ? ` data-age-bucket="${ageBucket}"` : '';

      return `
        <div class="task${done ? ' done' : ''}"${ageAttr} data-taskid="${tid}">
          <div class="task-check" data-taskid="${tid}">
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="task-body">
            <div class="task-text">${taskTextHTML}<span class="task-tail">${badges ? `<span class="task-meta">${badges}</span>` : ''}${sessionBadge}</span></div>
          </div>
          ${deleteBtn}
          ${copyBtn}
        </div>`;
    }

    // Extract creation timestamp from manual task ID (format: manual_1234567890123)
    function _getCreatedFromId(id) {
      if (!id || !id.startsWith('manual_')) return Date.now();
      const ts = parseInt(id.replace('manual_', ''));
      return isNaN(ts) ? Date.now() : ts;
    }


    // Get age in days from a timestamp
    function _getAgeDays(timestamp) {
      if (!timestamp) return 0;
      return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    }

    window.setTrelloIcon = setTrelloIcon;
    window.syncActiveButtons = syncActiveButtons;
    window._renderConnectionsPrivacy = _renderConnectionsPrivacy;
    window._endConnectionsPrivacyVisit = _endConnectionsPrivacyVisit;
    window.toggleConfig = toggleConfig;
    window._applyOfflinePanel = _applyOfflinePanel;
    window.renderConnections = renderConnections;
    window.dropboxDisconnect = dropboxDisconnect;
    window._getDueStr = _getDueStr;
    window._queueTagArrivalShimmer = _queueTagArrivalShimmer;
    window.renderManual = renderManual;
    window._wireManualTagShimmer = _wireManualTagShimmer;
    window.taskHTML = taskHTML;
    window._getCreatedFromId = _getCreatedFromId;
    window._getAgeDays = _getAgeDays;
  };
})();
