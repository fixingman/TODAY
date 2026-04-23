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

## Backup Schema (v5.2)

```javascript
{
  version: '5.2',
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
  // Habits
  habits: [{id, name, created_at, focusSessions?}, ...],
  habit_completions: {habitId: ['YYYY-MM-DD', ...]},
  deleted_habit_ids: ['id1', ...],
  // Stats
  stat_focus_mins_today: '0',
  stat_streak: '1',
  stat_tasks_done_today: '0',
  // Memory
  memory: {totalTasksCompleted, patterns: {...}, aiName, moments: [...]},
  // Triage (v5.1)
  triage_history: [{id, decision, at}, ...],
  triage_dismissed: 'YYYY-MM-DD'  // synced to prevent repeat prompts
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
| Trello order | Remote wins |
| Done IDs | Union with check/uncheck timestamps |
| Deleted IDs | Union (excluded from tasks) |
| SOON tasks | Union by ID, newer zoneChangedAt wins |
| PAST tasks | Union by ID, newer zoneChangedAt wins, keep last 100 |
| Stats | Max wins |
| Triage dismissed | If remote = today, apply locally |
| Memory | Merge patterns, max of counters, union of moments |

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
