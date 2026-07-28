// TODAY — Trello integration (Roadmap #3, fifth module extraction)
//
// Auth, config, board/list pickers, card loading + filtering, and the section
// renderer (incl. the 7s patch path — Rule 27: must mirror taskHTML() features;
// scripts/design-lint.mjs checks parity across index.html AND this file).
//
// Classic <script>, loaded after util.js and before the main inline script —
// the established extraction pattern: function declarations land on the shared
// global environment (inline onclick handlers in renderConnections() HTML call
// trelloAuth/saveAndLoad/onBoardChange/clearTrello/loadTrello directly), and all
// cross-references into main-script globals (trelloTasks, trelloConnected,
// doneIds, $, taskHTML, showStatus, renderConnections, setTrelloIcon, _breathe,
// updateStats, checkTriageBar, _getTrelloFocus, _getTrelloFirstSeen, _getDueStr,
// _trelloAgeBasis, _applyDoneStyles, _logSyncError, syncActiveButtons,
// checkDayNudge) resolve at call time — nothing here runs at eval.
//
// Deliberately NOT here: trelloTasks/trelloConnected declarations (main script
// owns state), syncTrello (nested in the 7s polling closure — coupled core),
// setTrelloIcon (panel-UI cluster), _getDueStr (shared with taskHTML),
// _getTrelloFocus/_setTrelloFocus/first-seen (focus/aging cluster).

const TRELLO_API_KEY  = 'f24cb0d938ae01e9cbf3feff20df8c1a';

function _getTrelloBoardName() {
  try {
    const cache = safeJSON('today_trello_cache', {});
    return cache.boardName || '';
  } catch(e) { return ''; }
}

function getSavedConfig() {
  return safeJSON('trello_config', {});
}

function trelloAuth() {
  // Trello returns the token to the return_url in the hash
  const returnUrl = encodeURIComponent(window.location.origin + '/');
  const authUrl = 'https://trello.com/1/authorize'
    + '?expiration=never'
    + '&scope=read'
    + '&response_type=token'
    + '&key=' + TRELLO_API_KEY
    + '&return_url=' + returnUrl
    + '&name=TODAY%20App'
    + '&callback_method=fragment';
  const popup = window.open(authUrl, 'trello_auth', 'width=600,height=700,left=200,top=100');
  if (!popup || popup.closed) {
    showStatus('Popup blocked — please allow popups for this site and try again.', 'error');
    return;
  }

  const poll = setInterval(function() {
    try {
      if (!popup || popup.closed) { clearInterval(poll); return; }
      // Trello redirects back to return_url with #token=xxx in the hash
      if ((popup.location.href || '').includes(window.location.host)) {
        const hash = popup.location.hash || '';
        const tokenMatch = hash.match(/token=([^&]+)/);
        clearInterval(poll);
        popup.close();
        if (tokenMatch) {
          const token = tokenMatch[1];
          localStorage.setItem('trello_token', token);
          trelloConnected = true;
          // _syncToken update handled by next _refreshSyncCache() tick (<7s)
          setTrelloIcon(true);
          showStatus('Connected. Loading your boards…', 'success');
          renderConnections();
          loadTrelloBoards();
        } else {
          showStatus('Trello authorisation cancelled.', 'error');
        }
      }
    } catch(e) {
      // cross-origin — still on trello.com, keep polling
    }
  }, 500);
}

async function loadTrelloBoards() {
  const token = localStorage.getItem('trello_token');
  if (!token) return;
  try {
    const res = await fetch(`https://api.trello.com/1/members/me/boards?key=${TRELLO_API_KEY}&token=${token}&fields=name,id&filter=open`);
    if (!res.ok) throw new Error(res.status);
    const boards = await res.json();
    // boardSelect is already in the DOM — renderConnections() always runs before this
    // function is called (panel-open path: renderConnections→loadTrelloBoards at line ~5459;
    // post-auth path: renderConnections at line ~5520, then loadTrelloBoards at line ~5521).
    // Calling renderConnections() here caused a re-render loop: renderConnections → loadTrelloBoards
    // → renderConnections → … wiping and rebuilding the panel on every board API response.
    const sel = document.getElementById('boardSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— select a board —</option>'
      + boards.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
    // Restore saved board/list selection
    const cfg = getSavedConfig();
    if (cfg.boardId) {
      sel.value = cfg.boardId;
      await loadTrelloLists(cfg.boardId, cfg.todayList);
    }
  } catch(e) {
    if (navigator.onLine) showStatus('Couldn\'t reach Trello — will try again', 'error');
  }
}

async function onBoardChange() {
  const boardSel = document.getElementById('boardSelect');
  const listSel = document.getElementById('listSelect');
  const listWrap = document.getElementById('listFieldWrap');
  if (!boardSel || !listSel) return;
  
  const boardId = boardSel.value;
  listSel.innerHTML = '<option value="">— due today only —</option>';
  if (listWrap) listWrap.style.display = boardId ? '' : 'none';
  if (boardId) await loadTrelloLists(boardId, '');
}

async function loadTrelloLists(boardId, selectedList) {
  const token = localStorage.getItem('trello_token');
  if (!token || !boardId) return;
  try {
    const res = await fetch(`https://api.trello.com/1/boards/${boardId}/lists?key=${TRELLO_API_KEY}&token=${token}&fields=name,id&filter=open`);
    if (!res.ok) throw new Error(res.status);
    const lists = await res.json();
    const sel = document.getElementById('listSelect');
    const wrap = document.getElementById('listFieldWrap');
    if (!sel) return;
    sel.innerHTML = '<option value="">— due today only —</option>'
      + lists.map(l => `<option value="${esc(l.name)}"${l.name === selectedList ? ' selected' : ''}>${esc(l.name)}</option>`).join('');
    if (wrap) wrap.style.display = '';
  } catch(e) {
    if (navigator.onLine) showStatus('Couldn\'t reach Trello — will try again', 'error');
  }
}

function saveAndLoad() {
  const token   = localStorage.getItem('trello_token');
  const boardSel = document.getElementById('boardSelect');
  const listSel = document.getElementById('listSelect');
  const boardId = boardSel ? boardSel.value : '';
  const todayList = listSel ? listSel.value : '';
  if (!token || !boardId) {
    showStatus('Please select a board.', 'error');
    return;
  }
  const config = { apiKey: TRELLO_API_KEY, apiToken: token, boardId, todayList };
  localStorage.setItem('trello_config', JSON.stringify(config));
  // _syncCfg update handled by next _refreshSyncCache() tick (<7s)
  loadTrello();
  renderConnections(); // Switch to compact connected view
}

function clearTrello() {
  localStorage.removeItem('trello_config');
  localStorage.removeItem('trello_token');
  localStorage.removeItem('today_trello_cache');
  trelloTasks = [];
  trelloConnected = false;
  setTrelloIcon(false);
  renderConnections();
  renderTrello();
  updateStats();
  showStatus('Trello disconnected.', 'success');
}

// ─── Trello API ───────────────────────────────────────────────────────────────
async function loadTrello(fromSync) {
  const config = getSavedConfig();
  if (!config.apiToken || !config.boardId) return;

  const emptyEl = document.getElementById('trelloEmpty');
  const listEl  = document.getElementById('trelloList');

  // Only wipe list on manual load with no cache — background sync and
  // cache-seeded loads keep existing DOM for diff render (no spinner flash).
  // If trelloTasks already populated from cache, treat like a sync load.
  const hasCachedTasks = trelloTasks.length > 0;
  if (!fromSync && !hasCachedTasks) {
    // Section is hidden while empty (v2.34.0) — reveal it for the loading state
    document.getElementById('trelloSection').style.display = '';
    emptyEl.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span> Getting your cards…';
    emptyEl.querySelectorAll('.loading-dots span').forEach((s, i) => _breathe(s, _KF_BLINK, 1200, [0, 180, 400][i]));
    emptyEl.style.display = 'block';
    listEl.innerHTML = '';
  }

  try {
    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    // Fetch lists and cards in parallel
    const [listsRes, cardsRes] = await Promise.all([
      fetch(`https://api.trello.com/1/boards/${config.boardId}/lists?key=${config.apiKey}&token=${config.apiToken}`),
      fetch(`https://api.trello.com/1/boards/${config.boardId}/cards?key=${config.apiKey}&token=${config.apiToken}&fields=name,due,idList,url,labels&checklists=all`)
    ]);

    if (!listsRes.ok) throw new Error(`Trello ${listsRes.status}: ${listsRes.statusText}`);
    if (!cardsRes.ok) throw new Error(`Trello ${cardsRes.status}: ${cardsRes.statusText}`);

    const lists = await listsRes.json();
    const cards = await cardsRes.json();

    // Find "today" list by name (case-insensitive)
    const todayListName = (config.todayList || '').toLowerCase().trim();
    const todayListId   = todayListName
      ? ((lists.find(l => l.name.toLowerCase() === todayListName) || {}).id || null)
      : null;

    // Filter: in today list OR due today/overdue
    // Done cards are hidden the next day (they were completed yesterday)
    const filtered = cards.filter(c => {
      const trelloId = 'trello_' + c.id;
      const isDone = doneIds.has(trelloId);
      
      // In today list
      if (todayListId && c.idList === todayListId) {
        if (!isDone) return true; // Not done — show
        // Done — show only if checked TODAY (hide if checked before today)
        const checkedIds = safeJSON('today_checked_ids', []);
        const checkedEntry = checkedIds.find(e => e.id === trelloId);
        if (checkedEntry && checkedEntry.at) {
          const checkedDate = new Date(checkedEntry.at);
          checkedDate.setHours(0,0,0,0);
          if (checkedDate.getTime() === today.getTime()) return true; // Checked today — show
        }
        return false; // Checked before today — hide
      }
      
      // Has due date
      if (c.due) {
        const d = new Date(c.due); d.setHours(0,0,0,0);
        // Due today — show all day (even if done)
        if (d.getTime() === today.getTime()) return true;
        // Overdue — show if not done
        if (d < today && !isDone) return true;
        // Overdue + done — show only if checked TODAY (same grace as due-today cards)
        // If checked before today it's stale — hide it
        if (d < today && isDone) {
          const checkedIds = safeJSON('today_checked_ids', []);
          const checkedEntry = checkedIds.find(e => e.id === trelloId);
          if (checkedEntry && checkedEntry.at) {
            const checkedDate = new Date(checkedEntry.at);
            checkedDate.setHours(0,0,0,0);
            if (checkedDate.getTime() === today.getTime()) return true; // Checked today — show until day ends
          }
          return false; // Checked before today — hide
        }
      }
      return false;
    });

    const isEmpty = text => !text || /^[\s\-–—_\.]+$/.test(text.trim());

    trelloTasks = filtered
      .filter(c => !isEmpty(c.name))
      .map(c => {
        const cls = c.checklists || [];
        const checkTotal = cls.reduce((s, cl) => s + (cl.checkItems || []).length, 0);
        const checkDone  = cls.reduce((s, cl) => s + (cl.checkItems || []).filter(i => i.state === 'complete').length, 0);
        return {
          id:        'trello_' + c.id,
          text:      c.name,
          due:       c.due || null,
          url:       c.url || '',
          checklist: checkTotal > 0 ? { done: checkDone, total: checkTotal } : null,
        };
      });

    // First-seen aging (BUG-049): a card ages from when it entered YOUR list, not its Trello
    // creation date (which made just-arrived cards look aged). Persists across days; prune cards
    // that have left so the map stays bounded.
    const _fs = _getTrelloFirstSeen();
    const _fsNow = Date.now();
    const _present = new Set(trelloTasks.map(t => t.id));
    let _fsChanged = false;
    for (const t of trelloTasks) if (!_fs[t.id]) { _fs[t.id] = _fsNow; _fsChanged = true; }
    for (const id of Object.keys(_fs)) if (!_present.has(id)) { delete _fs[id]; _fsChanged = true; }
    if (_fsChanged) _setTrelloFirstSeen(_fs);

    // Apply synced order if available (cards not in order list go to the end)
    const savedOrder = safeJSON('today_trello_order', []);
    if (savedOrder.length > 0) {
      const orderMap = new Map(savedOrder.map((id, i) => [id, i]));
      trelloTasks.sort((a, b) => {
        const aIdx = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
        const bIdx = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
        return aIdx - bIdx;
      });
    }

    // Persist to cache — keyed by date + boardId so stale entries are auto-rejected
    try {
      localStorage.setItem('today_trello_cache', JSON.stringify({
        date:    new Date().toDateString(),
        boardId: config.boardId,
        tasks:   trelloTasks,
      }));
    } catch(e) { /* storage full — non-fatal */ }

    renderTrello();
    updateStats();
    checkTriageBar();  // Re-check now that Trello tasks are loaded

    const label = config.todayList ? `"${config.todayList}"` : 'your today list';
    const msg   = trelloTasks.length === 0
      ? `Connected. No cards found due today or in ${label}.`
      : `Loaded ${trelloTasks.length} card${trelloTasks.length !== 1 ? 's' : ''} from Trello.`;

    setTrelloIcon(true);

    // Only show status in panel if it's already open
    if ($.configPanel.classList.contains('open')) {
      showStatus(msg, 'success');
      setTimeout(() => { $.configPanel.classList.remove('open'); syncActiveButtons(); }, 1800);
    }

  } catch(e) {
    let msg = (e && e.message) ? e.message : 'Failed to connect to Trello.';
    const isNetworkError = !msg || msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Load failed') || msg.includes('CORS');

    if (isNetworkError) {
      // If we have cached tasks already rendered, stay silent — user can still read and interact
      if (trelloTasks.length > 0) return;
      msg = 'Network error — check your API Key and Token are correct. Make sure the token has read access.';
    } else if (msg.includes('401')) {
      msg = 'Unauthorised (401) — your token may be expired. Re-generate at trello.com/power-ups/admin.';
    } else if (msg.includes('404')) {
      msg = 'Board not found (404) — double-check your Board ID or URL.';
    } else if (msg.includes('405')) {
      msg = 'Trello rejected the request (405). This is usually temporary — try again in a minute.';
    } else if (msg.includes('429')) {
      msg = 'Trello rate limit hit (429). Wait a moment and try again.';
    }

    // Log to red dot on background sync so errors are visible in PWA
    // But respect wake silent — transient errors after sleep shouldn't alarm
    if (fromSync && !isNetworkError) {
      _logSyncError('Trello', 'Load: ' + (e.message || msg));
    }

    setTrelloIcon(false);

    // Only open config panel on manual load — don't interrupt user on background sync
    if (!fromSync) {
      $.configPanel.classList.add('open');
      syncActiveButtons();
      showStatus(msg, 'error');
      emptyEl.textContent = 'Couldn\'t reach Trello — check above';
      emptyEl.style.display = 'block';
    }
  }
}

// ─── Reconcile after a Dropbox merge (fresh-device fix) ────────────────────────
// loadTrello() fires from init(), which runs before Dropbox restore lands — on a
// brand-new device doneIds is still empty at that point, so an old card that was
// completed in TODAY (but never archived/moved on the real Trello board) passes
// the "overdue, not done" filter and shows as active. Normally the 7s ticker
// would catch this on its next Trello re-fetch, but syncTrello() only re-fetches
// when the board's own dateLastActivity changes — and it never does, because the
// completion only ever happened in TODAY, not on the actual card. Same bug class
// as checkTriageBar()/checkDayNudge() needing a post-merge re-check (see the
// window 'load' handler) — loadTrello() just never got one. Re-filters what's
// already loaded against the now-correct doneIds; no extra Trello API call.
function _reconcileTrelloAfterMerge() {
  if (!trelloTasks.length) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const checkedIds = safeJSON('today_checked_ids', []);
  const stillActive = trelloTasks.filter(t => {
    if (!doneIds.has(t.id)) return true; // not done — keep, same as loadTrello()
    // Done — same grace window as loadTrello(): show only if checked today.
    const entry = checkedIds.find(e => e.id === t.id);
    if (entry && entry.at) {
      const checkedDate = new Date(entry.at); checkedDate.setHours(0, 0, 0, 0);
      if (checkedDate.getTime() === today.getTime()) return true;
    }
    return false;
  });
  if (stillActive.length !== trelloTasks.length) {
    trelloTasks = stillActive;
    renderTrello();
    updateStats();
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderTrello() {
  const section = document.getElementById('trelloSection');
  const list  = document.getElementById('trelloList');
  const empty = document.getElementById('trelloEmpty');
  if (!list || !empty || !section) return;

  document.getElementById('trelloCount').textContent = trelloTasks.length;

  if (trelloTasks.length === 0) {
    // No tasks — hide the entire section, connected or not (v2.34.0 first-run:
    // a third-party brand shouldn't be the first thing on a fresh screen;
    // Trello discovery lives in the ✧ Connections panel).
    section.style.display = 'none';
    list.innerHTML = '';
    empty.style.display = 'none';
    return;
  }

  // Has tasks — show section
  section.style.display = '';
  empty.style.display = 'none';

  const incomingIds = trelloTasks.map(t => t.id);
  const incomingSet = new Set(incomingIds);

  // 1. Remove tasks no longer in the list — animate each out individually
  list.querySelectorAll('.task[data-taskid]').forEach(el => {
    if (!incomingSet.has(el.dataset.taskid)) {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 200);
    }
  });

  // 2. Update or insert tasks in correct order
  // Use only non-removing children for index calculation so fading-out
  // elements don't throw off insertion positions
  incomingIds.forEach((id, index) => {
    const task    = trelloTasks[index];
    const safeUrl = task.url && /^https?:\/\//i.test(task.url) ? task.url : '';
    // Detect tag pattern for Trello tasks (same as taskHTML)
    const _tagMatch = task.text.match(/^([a-z0-9]{1,12}):\s+(.+)$/i);
    const _textPart = _tagMatch
      ? `<span class="task-tag">${esc(_tagMatch[1].toLowerCase())}</span>${esc(_tagMatch[2])}`
      : esc(task.text);
    const _link = safeUrl
      ? `<a href="${esc(safeUrl)}" target="_blank" rel="noopener" class="task-link" title="Open in Trello">↗&#xFE0E;</a>`
      : '';
    // Include session badge in text comparison so patch doesn't destroy it (BUG-005).
    // Due/checklist badges (task-meta) are built into the same string, in the
    // same order taskHTML() uses (text+link, then task-meta, then session
    // last) — a single full-replace comparison, rather than patching task-meta
    // separately, so the two render paths can't silently drift out of order
    // with each other (Rule 27) the way they did when this was two patches.
    const _focusCount = _getTrelloFocus()[id] || 0;
    const _sessionBadge = _focusCount > 0
      ? `<span class="session-count has-sessions">${_focusCount} 🍅</span>`
      : `<span class="session-count"></span>`;
    const dueStr = _getDueStr(task);
    const _clBadge = task.checklist
      ? `<span class="badge checklist">${task.checklist.done}/${task.checklist.total} ✓</span>`
      : '';
    const newBadge = `${dueStr ? `<span class="badge due">due ${esc(dueStr)}</span>` : ''}${_clBadge}`;
    const newMeta = newBadge ? `<span class="task-meta">${newBadge}</span>` : '';
    const newText = _textPart + _link + newMeta + _sessionBadge;

    let el = list.querySelector(`.task[data-taskid="${CSS.escape(id)}"]`);

    if (el) {
      // Existing task — patch content silently, no flash
      const textEl = el.querySelector('.task-text');
      if (textEl && textEl.innerHTML !== newText) textEl.innerHTML = newText;

      el.classList.toggle('done', doneIds.has(id));
      _applyDoneStyles(el, doneIds.has(id));

      // Keep age-bucket in sync — patch cycle doesn't re-call taskHTML() so update here
      const _patchBucket = (() => {
        if (doneIds.has(id)) return '';
        if ((_getTrelloFocus()[task.id] || 0) > 0) return ''; // focused today — active (BUG-043)
        const _c = _trelloAgeBasis(task.id); // first-seen, not Trello creation date (BUG-049)
        const _d = Math.floor((Date.now() - _c) / (1000 * 60 * 60 * 24));
        if (_d >= 7) return 'old';
        if (_d >= 5) return 'mid';
        if (_d >= 3) return 'young';
        return '';
      })();
      if (_patchBucket) el.dataset.ageBucket = _patchBucket;
      else delete el.dataset.ageBucket;

      // Move to correct position — count only task rows. When a Trello task is focused,
      // the focus timer (timerEl) + kbd hint are children of #trelloList; counting them
      // here threw off the index→sibling mapping and shuffled rows / churned the timer
      // every 7s sync, disrupting the completed "again?" pulse. (BUG-027)
      const stableChildren = [...list.children].filter(c => c.matches('.task[data-taskid]') && !c.classList.contains('removing'));
      const sibling = stableChildren[index];
      if (sibling !== el) list.insertBefore(el, sibling || null);

    } else {
      // New task — build and slide in
      const tmp = document.createElement('div');
      tmp.innerHTML = taskHTML(task, 'trello');
      el = tmp.firstElementChild;
      _applyDoneStyles(el, doneIds.has(id));
      el.classList.add('task-slide-in');
      el.addEventListener('animationend', () => el.classList.remove('task-slide-in'), { once: true });
      // Task rows only — exclude focus timer / kbd hint nodes (BUG-027, see above)
      const stableChildren = [...list.children].filter(c => c.matches('.task[data-taskid]') && !c.classList.contains('removing'));
      const sibling = stableChildren[index];
      list.insertBefore(el, sibling || null);
    }
  });
  // Re-anchor focus timer if active — Trello patch may have replaced the focused task element
  if (window._focusReanchor) window._focusReanchor();
  if (typeof checkDayNudge === 'function') checkDayNudge();
}
