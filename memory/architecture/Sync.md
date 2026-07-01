# Sync & Backup

> Dropbox sync, merge logic, and backup schema.

---

## Design Principles

1. **Local-first** — app works offline, syncs when possible
2. **Union merge** — additions from both sides preserved
3. **Explicit deletes** — tracked with timestamps
4. **Last-write-wins** — for simple values (stats)
5. **No conflicts** — merge is deterministic

---

## Dropbox Integration

### Files

| Environment | File |
|-------------|------|
| Production | `/today-backup.json` |
| Dev | `/today-backup-dev--today-here.json` |

### Sync Flow

```
1. On load: fetch remote, merge with local (behind splash)
2. On mutation: debounced save (800ms), retry with exponential backoff on failure
3. On tab return / PWA focus: immediate sync (wake errors silenced for 3s)
4. Every 7s: background sync check (rev comparison, skipped if _pendingBackup)
5. On reconnect ('online' event): full pull + merge + push
6. On disconnect ('offline' event): stop ticker
```

### Wake Sequence — `window._onWake()` (v2.17.0, updated v2.17.50)

All wake-related UI logic is consolidated into `window._onWake()`, defined in global scope. Called from three entry points:

| Entry point | When |
|---|---|
| Sync module `visibilitychange` | Tab becomes visible, after sync is set up |
| `window.focus` | PWA window gains focus (fallback — PWA may skip `visibilitychange`) |
| `pageshow` (persisted) | bfcache restore |

Three handlers remain in their own closures — not merged, they need private variables: SW update check, timer wall-clock correction, PiP show/hide.

**`_onWake()` sequence:**
1. `_forceRepaint()` × 5 passes (immediately, rAF, rAF+rAF, 500ms, 1500ms) — BUG-004
2. Each repaint pass suppresses persistent CSS animations so they don't restart on `display:none/block` cycle:
   - `.config-panel.open` → `fadeIn` (BUG-023), cleared on next user-open
   - `.complete` → `timerCompletePulse` (BUG-025)
   - `.ai-badge`, `.done-star`, `#errorIndicator.open`, `.loading-dots span`, `.ai-suggestion-msg.thinking`
   - After the final 1500ms pass, all except `.config-panel.open` are restored via rAF
3. Single-play animation classes cleared once on wake (not per-pass): `.task-slide-in`, `.removing`, `.just-checked`, `.milestone-pulse`, `.dot-ripple`, `#manualEmpty.fading-in`
4. Clear stale `.focusing` immediately, at 350ms, and at 1000ms — guarded by `window._focusUIActive` to prevent premature removal when re-anchor is in progress (race condition: Dropbox sync may call `renderManual` which destroys `.focused` before `_focusReanchor` re-attaches it)
5. `checkMorningNudge()` — returning users after overnight need this
6. `_triageBarSilent = true` (3s window)
7. After 3s: clear silent, re-read `triage_dismissed`, `checkTriageBar()`
8. Retry `_pendingBackup` if any
9. `_applyOfflinePanel()` — re-apply offline/online state in case connectivity changed while sleeping

**`window._focusUIActive` flag:**
- Set to `true` in `openUI()`, `false` in `closeUI()`
- Read by `_clearStaleFocusing()` to skip removal when focus mode is legitimately active
- Prevents a race where the 350ms check fires between `renderManual()` destroying `.focused` and `_focusReanchor()` re-attaching it

**Sync module `visibilitychange` calls `_onWake` after sync is triggered:**
1. `clearTimeout(wakeTimer)`
2. `checkNewDay()`
3. `lastDropboxRev = null` + `_refreshSyncCache()`
4. `_wakeSyncSilent = true` → `syncDropbox()` + `syncTrello()`
5. `window._onWake()`
6. `wakeTimer` → `startTicker()` after 2s

### Error Handling (v2.13.4 + v2.14.1)

`_logSyncError()` routes errors to the red dot indicator, with two filters:
- **Wake silent** (first 3s after tab return): suppressed entirely — network may not be ready
- **Network errors** ("Failed to fetch", "NetworkError", "Load failed", "CORS"): logged to console only, no red dot — expected during WiFi drops

`window.unhandledrejection` applies the same network filter — previously "Promise: Failed to fetch" bypassed `_logSyncError` entirely and went straight to the red dot.

Red dot only shows for real problems: expired tokens (401), API rejections (405/429), server errors, code bugs.

### Merge Algorithm

```javascript
// Arrays: union by ID, prefer newer timestamps
merged = [...local, ...remote].reduce((acc, item) => {
  const existing = acc.find(i => i.id === item.id);
  if (!existing) return [...acc, item];
  // Keep the one with newer timestamp
  return acc.map(i => i.id === item.id && item.at > i.at ? item : i);
}, []);

// Deleted items: exclude from merge
merged = merged.filter(item => !deletedIds.includes(item.id));
```

---

## Backup Schema (v5.3)

```javascript
{
  version: '5.3',
  saved_at: 'ISO string',
  // Tasks
  manual_tasks: [{id, text, lastActive?, zone?, zoneChangedAt?}, ...],
  done_ids: ['id1', 'id2', ...],
  deleted_ids: [{id, at}, ...],
  checked_ids: [{id, at}, ...],
  unchecked_ids: [{id, at}, ...],
  // Zones (v5.0)
  soon_tasks: [{id, text, zone: 'soon', zoneChangedAt}, ...],
  past_tasks: [{id, text, zone: 'past', status, zoneChangedAt}, ...],
  // Trello
  trello_config: {apiKey, apiToken, boardId, todayList},
  trello_order: ['trello_id1', 'trello_id2', ...],  // v5.2
  trello_order_at: 'ISO',  // BUG-042 — reorder timestamp; newer wins on merge (additive, no schema bump)
  today_trello_focus: {trelloCardId: 1, ...},  // v2.18.17 — focus sessions today, union-merged cross-device
  today_trello_focus_date: '',  // YYYY-MM-DD local — date guard (daily-reset; prevents yesterday's focus restoring)
  // Habits
  habits: [{id, name, created_at, focusSessions?, archived?}, ...],
  habit_completions: {habitId: ['YYYY-MM-DD', ...]},
  habit_events: {'habitId::YYYY-MM-DD': {type: 'check'|'uncheck', at: ISO}},  // LWW map — BUG-026
  deleted_habit_ids: ['id1', ...],
  // Stats
  stat_focus_mins_today: '0',
  stat_focus_mins_date: '',      // YYYY-MM-DD local — date guard prevents yesterday's total restoring after midnight
  stat_streak: '1',
  stat_streak_date: '',          // YYYY-MM-DD local — prevents double-increment across devices (BUG-020)
  // NOTE: stat_tasks_done_today / _date RETIRED v2.18.21. Done-today count is no longer a
  // stored stat — it derives from checked_ids (via _doneTodayCount()). The old monotonic
  // counter + Math.max merge inflated it on re-checks and cross-device sync. See below.
  // Memory
  memory: {totalTasksCompleted, patterns: {...}, aiName, moments: [...]},
  // Triage (v5.1)
  triage_history: [{id, decision, at}, ...],
  triage_dismissed: 'YYYY-MM-DD',  // synced to prevent repeat prompts
  // Daily history — per-day snapshots the week grid reads for past days (v5.3, BUG-036)
  daily_history: [{date: 'YYYY-MM-DD', tasksDone: 0, focusMins: 0, habitsKept: 0, habitsTotal: 0}]
}
```

**Zone status values:** `done`, `let_go`, `aged`

### Triage Dismissed Sync (v2.12.60 + v2.14.0)

**Critical:** On tab return, do NOT check triage immediately — sync needs time to pull the dismissed state from Dropbox first. `mergeRemoteData` handles applying `triage_dismissed` from remote and hiding the bar/overlay.

```javascript
// On visibility change / window focus:
// 1. Sync fires immediately (pulls remote data)
// 2. mergeRemoteData sets triageDismissedToday if remote has today's dismissal
// 3. _triageBarSilent set true — suppresses ticker from showing bar during grace window
// 4. Triage check deferred 3s to let sync complete, then clears silent flag
_triageBarSilent = true;
setTimeout(() => {
  _triageBarSilent = false;
  triageDismissedToday = localStorage.getItem('triage_dismissed') === _getAppDay();
  checkTriageBar();
}, 3000);
```

**Same pattern — day-cleanup backup (v2.17.135):** `applyNewDayCleanup()` ends with a `dropboxBackup(true)` to push the cleaned state. On morning wake via `visibilitychange`, this backup raced `syncDropbox()`'s metadata fetch — if the upload landed first, `syncDropbox` downloaded mobile's own stale write and the ticker saw no further rev change, leaving the task list behind. Fix: 3s `setTimeout` on the cleanup backup (matches the triage grace window). `zoneChangedAt` timestamps protect the done→PAST move independently.

**Why `_triageBarSilent` matters:** The 7s ticker fires `checkTriageBar()` independently. Without the flag, the ticker would show the bar during the 3s grace window (before sync settles), causing a brief flash on the second device. `_triageBarSilent` makes `checkTriageBar()` hide the bar unconditionally during that window.

**v2.12.40:** Read fresh from localStorage on return (was using stale variable).  
**v2.12.60:** Deferred triage check 3s so sync can pull dismissal state first.  
**v2.14.0:** Added `_triageBarSilent` flag to suppress ticker during the grace window.

### Deletion Persistence (v2.12.35+)

**Critical:** `deleted_ids` must persist across days. Never clear it on new-day cleanup.

- Deleted tasks stay deleted forever
- Sync cannot resurrect deleted tasks (merge checks `deleted_ids`)
- Entries auto-purge after 30 days (via `_cleanupDeletedIds()`)
- Applies to tasks from TODAY, SOON, or anywhere

**Bug fixed:** Prior to v2.12.35, `deleted_ids` was cleared on new-day cleanup. This allowed sync to resurrect tasks deleted the previous day.

---

## Zone-Aware Sync (v2.12.13+)

When merging `manualTasks` with remote data, tasks that exist in zones (SOON/PAST) are handled specially to prevent duplication:

### Scenario: Task moved to SOON on Device A
1. Device A: moves task to SOON → removed from manualTasks, added to soonTasks
2. Device A: backs up to Dropbox
3. Device B: restores → task is in remote's `soon_tasks` but NOT in `manual_tasks`
4. Device B's local `manualTasks` still has the task

**Resolution:** Compare `zoneChangedAt` timestamps:
- If remote zone timestamp is newer → task stays OUT of manualTasks (was moved to zone)
- If local task timestamp is newer → task was pulled BACK to TODAY, keep in manualTasks

### Scenario: Task pulled back from SOON on Device B
1. Device B: pulls task from SOON back to TODAY → `zoneChangedAt` updated
2. Device B: backs up to Dropbox
3. Device A: restores → local soonTasks has the task, remote manualTasks has it too

**Resolution:** Compare timestamps:
- If local zone timestamp is newer → task stays in zone (local zone move is more recent)
- If remote task timestamp is newer → task was pulled back, move to manualTasks

### Deleted Tasks in Zones (v2.12.14)
Deleted tasks are excluded from zone merge to prevent ghost tasks:
- When merging SOON: skip tasks in `mergedDeletedMap`
- When merging PAST: skip tasks in `mergedDeletedMap`
- AI `delete_task` action now calls `_addDeletedId()` for proper sync

### Zone Operations Trigger Backup (v2.12.44)

**Critical:** All zone operations trigger `dropboxBackup(true)` **immediately** (no debounce):

| Operation | Function | Sync |
|-----------|----------|------|
| Pull from SOON | `pullFromSoon()` | Immediate |
| Move to SOON | `moveToSoon()` | Immediate |
| Move to PAST | `moveToPast()` | Immediate |
| Triage decisions | `triageApplyAll()` | Immediate |
| Triage close | `triageClose()` | Immediate |

**v2.12.42:** Added backup calls to zone operations.  
**v2.12.44:** Changed from `dropboxAutoSave()` (800ms debounce) to `dropboxBackup(true)` (immediate).  
**v2.18.0:** Triage gained a **Done** decision (task completed but never checked off). `triageApplyAll()` now fires its immediate backup on zone moves **or** any `done` decision (`movedIds.length > 0 || doneCount > 0`). Triage "Done" marks the task via the normal check path — `doneIds.add` + `_addCheckedId` — so it rides the existing "Done IDs: union with check/uncheck timestamps" merge (below) and survives a stale remote like any other check. **Also fixed here:** the Trello `letgo` branch previously called `_persistDone()`, which was **never defined** — a `ReferenceError` that aborted `triageApplyAll()` mid-run before its `today_manual`/zone persistence and the backup, so a triage that let go of a Trello card silently failed to sync. Replaced with a single `today_done` persist after both decision loops.

---

## Task Order Sync (v2.12.55)

**Bug fixed:** Prior to v2.12.55, `mergeRemoteData()` only detected task additions/removals, NOT reordering. If you reordered tasks on phone, desktop wouldn't update.

### Detection Logic

```javascript
// OLD: Only checked add/remove
if (prevTaskIds.size !== nextTaskIds.size || 
    [...nextTaskIds].some(id => !prevTaskIds.has(id))) _changed = true;

// NEW: Also checks order (v2.12.55)
if (!_changed && manualTasks.length === mergedTasks.length) {
  for (let i = 0; i < manualTasks.length; i++) {
    if (manualTasks[i].id !== mergedTasks[i].id) {
      _changed = true;
      break;
    }
  }
}
```

When `_changed` is true, `renderManual()` is called to update the UI.

---

## Timestamps

All sync timestamps are **full ISO strings** (`new Date().toISOString()`) — UTC, for cross-timezone ordering. Date-only strings (habits, AI memory) use `_localISO()` — local YYYY-MM-DD. Never mix the two.

### Tracked Events

| Event | Storage Key |
|-------|-------------|
| Task deleted | `today_deleted_ids` |
| Task checked | `today_checked_ids` |
| Task unchecked | `today_unchecked_ids` |
| Habit deleted | `today_deleted_habit_ids` |
| Local mutation | `last_local_change` |
| Successful backup (write) | `last_successful_backup` |
| Successful sync (read) | `last_sync_read` |

**Sync status display:** Shows most recent of `last_successful_backup` or `last_sync_read` (v2.12.55).

---

## Conflict Resolution

| Data Type | Resolution |
|-----------|------------|
| Task list | Union by ID, remote order wins |
| Task order | Detected via ID sequence comparison (v2.12.55) |
| Habit list | Union by ID, remote order wins |
| Trello order | Newer `trello_order_at` wins (bootstrap if local order empty) — BUG-042 |
| Trello focus map | Union by card ID (max value), date-guarded — v2.18.17 |
| Done IDs | Union with check/uncheck timestamps (most-recent op wins) |
| Done-today count | NOT stored/merged — derived from checked_ids via `_doneTodayCount()` (v2.18.21) |
| Deleted IDs | Union (excluded from tasks) |
| SOON tasks | Union by ID, newer zoneChangedAt wins |
| PAST tasks | Union by ID, newer zoneChangedAt wins, age-based purge only (done >7d, let_go/aged >30d) — no count cap (v2.17.47) |
| Stats | Max wins |
| Triage dismissed | If remote = today, apply locally |
| Memory | Merge patterns, max of counters, union of moments |

### Stat Merge — Date Guards

Stats use `Math.max` but the remaining counter has a date guard to prevent yesterday's value restoring after midnight:

**`stat_focus_mins_today` / `stat_focus_mins_date`**
- `stat_focus_mins_date` is saved to localStorage whenever minutes are earned or reset
- Backup payload uses the stored date (never `_getAppDay()` — that was the BUG-024 root cause)
- Fallback in backup payload is `''` (empty) not today's date — `''` fails the date guard and treats remote value as 0
- Merge: `remoteFocusMinsToday = remoteFocusDate === _getAppDay() ? remoteFocusMins : 0`

**Done-today count — DERIVED, not a stat (v2.18.21, retired the counter)**
- `stat_tasks_done_today` / `_date` existed v2.18.14–2.18.20 (BUG-045 date guard) but the underlying counter was fundamentally broken: it only ever incremented (never decremented on uncheck) and merged cross-device via `Math.max`, so check/uncheck/re-check cycles and two synced devices inflated it without bound (Can: "the final completed task number blew up").
- Replaced by `_doneTodayCount(dayISO?)`: counts `checked_ids` entries whose `at` is on the given local day (default today) AND whose check is the *winning* op — i.e. no `unchecked_ids` entry for that id with a later timestamp. This mirrors the `mergedDoneIds` most-recent-wins logic, because `mergeRemoteData` persists the checked/unchecked maps as a plain union (a stale check can outlive an uncheck on the sync path).
- Self-correcting (uncheck removes the local entry / loses the timestamp race) and coherent across devices with no `Math.max`. No backup field, no merge branch, no restore branch, no daily reset — the daily boundary falls out of the date filter + the existing `checked_ids` clear in `applyNewDayCleanup()`.
- Readers: evening triage summary, `applyNewDayCleanup` daily_history snapshot (passes `yesterdayISO`), `_getWeeklyStats`. **Gotcha found in review:** the `unchecked` map value IS the timestamp string (`.map(u => [u.id, u.at])`), so compare `c.at > uAt`, not `c.at > u.at` (the latter reads `.at` on a string → `undefined` → every uncheck wrongly zeroes the task).

**`stat_streak` / `stat_streak_date`**
- `stat_streak_date` is set to `_localISO()` whenever streak is incremented in `applyNewDayCleanup()`
- Merge adopts the lexicographically newer date from remote (alongside `Math.max` streak)
- **Critical:** `applyNewDayCleanup()` only skips the streak INCREMENT when `streakDate === todayISO` — it must NOT return early, as the focus-minutes reset and other daily cleanup still need to run (BUG-024 true root cause, fixed v2.17.48)

---

## Offline Behavior

1. App fully functional offline
2. Mutations queued in localStorage
3. Sync resumes on connectivity
4. SW caches app shell for offline access

---

## Triage Bar State Flags

Three boolean flags control triage bar visibility. All default `false`, all in module scope.

| Flag | Set by | Cleared by | Purpose |
|---|---|---|---|
| `_triageActive` | `triageExpand()` | `triageClose()`, `triageMinimize()` | Locks bar hidden while overlay is open (BUG-007) |
| `_triageBarSilent` | `visibilitychange` + `focus` on wake | 3s `setTimeout` | Prevents ticker showing bar before sync settles (BUG-001, cross-device flash) |
| `_triageBarShown` | `checkTriageBar()` on first show | `applyNewDayCleanup()`, all tasks gone, midnight | Once shown, mutations (delete, zone moves) don't hide bar mid-evening |

**Priority in `checkTriageBar()`:**
1. `_triageActive` → hide unconditionally, refresh overlay list
2. `_triageBarSilent` → hide unconditionally (no list refresh)
3. Normal rules: `inTriageWindow && totalUndone > 0 && !triageDismissedToday`
4. `_triageBarShown` prevents hiding when conditions unchanged mid-evening
