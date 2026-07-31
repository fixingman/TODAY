# Sync & Backup

> Dropbox sync, merge logic, and backup schema.

---

## Design Principles

1. **Local-first** — app works offline, syncs when possible
2. **Union merge** — additions from both sides preserved
3. **Explicit deletes** — tracked with timestamps
4. **Last-write-wins** — for simple values (stats)
5. **No conflicts** — merge is deterministic
6. **`init()` runs before sync lands — anything reading synced state there needs a post-merge re-check, at *every* place that state can change, not just cold start.** `init()` executes synchronously on load; the Dropbox restore + `mergeRemoteData()` that actually populates fresh cross-device state happens later, async. Any `init()`-time function that reads a variable `mergeRemoteData()` reassigns (`doneIds`, `habitsList`/`habitCompletions`, `today_daily_history`, etc.) sees stale or empty data on a genuinely fresh device — and won't self-correct later unless something explicitly re-runs it, because the normal 7s ticker often gates its own re-fetch on a *different* signal (e.g. Trello's `dateLastActivity`, which may never change even though local completion state did). Confirmed five times so far: triage bar (fixed pre-BUG-060), morning nudge (v2.37.6), Trello done-state (BUG-060, v2.37.7 then extended v2.40.1), Sunday/habit badges (BUG-061, v2.37.8).

   **Correction (2026-07-28, BUG-060):** this principle previously said the fix pattern is "always the same — two spots, cold-start plus Dropbox-restore." That undersold it and the initial BUG-060 fix (v2.37.7) shipped covering only cold-start, which is why the bug kept recurring through ordinary daily use for months. There are actually **four** places `mergeRemoteData()` (or an equivalent local-state overwrite) can run: the periodic `syncDropbox()` tick (`fromSync` branch), manual "Restore from Dropbox" (a *different* code path — wholesale overwrite, doesn't call `mergeRemoteData()` at all), the `online` reconnect handler, and the cold-start load. **The right question isn't "did I cover the two usual spots" — it's "does this specific downstream read ever self-correct through some OTHER path, and if not, does it need the re-check at every site that changes the state it depends on."** In BUG-060's case, the periodic tick turned out to be the actual everyday trigger (Trello's own re-fetch is gated on a signal — `dateLastActivity` — that this specific bug can never change), while the `online` handler turned out to already self-correct via its own unrelated subsequent `loadTrello()` call and didn't need the fix at all. Don't assume symmetry between similar-looking bugs — trace each one's actual call graph before deciding scope, and verify with confidence, not pattern-matching to a checklist. Full trace in `Bugs.md`'s BUG-060 entry.

---

## Dropbox Integration

### Files

| Environment | File |
|-------------|------|
| Production | `/today-backup.json` |
| Dev | `/today-backup-dev--today-here.json` |

### Sync Flow

```
1. On load: fetch remote, merge with local (behind splash) — kicks off right
   after init(), not gated on window.load (v2.38.5, see below)
2. On mutation: debounced save (800ms), retry with exponential backoff on failure
3. On tab return / PWA focus: immediate sync (wake errors silenced for 3s)
4. Every 7s: background sync check (rev comparison, skipped if _pendingBackup)
5. On reconnect ('online' event): full pull + merge + push
6. On disconnect ('offline' event): stop ticker
```

### Cold-Start Sync Timing (v2.38.5)

The Trello `dateLastActivity` check + Dropbox pull/merge block used to be gated on `window.addEventListener('load', ...)`. That's a much coarser gate than the splash animation itself needs: `window.load` waits for *every* subresource on the page — both self-hosted fonts, both icon PNGs, the OG-image meta tag's image, all 11 `apple-touch-startup-image` launch-screen PNGs — while the splash animation only waits on the two fonts (`document.fonts.load()` raced against a 2000ms ceiling). Sync sat idle in that gap even after everything the splash actually needed was already ready.

Fixed by removing the `window.load` wrapper — the sync block now runs as a plain statement right after `init();` is called, still wrapped in the same `setTimeout(0)` yield the code already used to avoid blocking first paint. Two things make this safe rather than a re-introduction of a load-order race (both traced before shipping, not assumed):

- **`init()` is fully synchronous.** No matter how early the async sync block is triggered, its `await`ed continuations can't run until `init()` — including `checkDayNudge(false)`'s pre-sync call — has already returned. Removing the `window.load` gate doesn't change this; JS's own execution model already guarantees it.
- **`startTicker()`'s rev-seed-before-first-tick ordering is untouched.** `startTicker()` is called from *inside the same async function* that was moved (after the rev-seed step in `deferredSyncBookkeeping`), so that internal sequence — pull+merge → nudge/triage re-checks → `_onAppLoadDone()` → rev-seed → `startTicker()` — travels with the block as one unit. Only *when the whole block begins* changed, not the order of anything inside it.

Splash dismissal (`_appLoadDone`) already only depended on sync *finishing*, never on when it started — so this change can only shorten cold-start time-to-ready, never lengthen it or introduce a new race.

### Wake Sequence — `window._onWake()` (v2.17.0, updated v2.17.50)

All wake-related UI logic is consolidated into `window._onWake()`, defined in global scope. Called from three entry points:

| Entry point | When |
|---|---|
| Sync module `visibilitychange` | Tab becomes visible, after sync is set up |
| `window.focus` | PWA window gains focus (fallback — PWA may skip `visibilitychange`) |
| `pageshow` (persisted) | bfcache restore |

Three handlers remain in their own closures — not merged, they need private variables: SW update check, timer wall-clock correction, PiP show/hide.

**`_onWake()` sequence:**
1. `_forceRepaint()` × 7 passes (immediately, rAF, rAF+rAF, 500ms, 1500ms, 3000ms, 5000ms) — BUG-004/BUG-056. The extra 3s/5s passes target GPU compositor stalls after long Mac sleep where the GPU is slower to wake than the earlier passes' ceiling. Each is a one-time cost; no-ops when GPU is already ready.
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

## Backup Schema (v5.4)

```javascript
{
  version: '5.4',
  saved_at: 'ISO string',
  // Tasks
  manual_tasks: [{id, text, lastActive?, zone?, zoneChangedAt?}, ...],
  manual_order_at: 'ISO',  // v5.4 — manual reorder timestamp; newer wins on merge (drag jump-back fix). Mirrors trello_order_at. Absent in older backups → '' → remote order wins (prior behavior)
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
  today_trello_firstseen: {'trello_<id>': firstSeenMs, ...},  // v2.18.22 BUG-049 — when a card entered YOUR list; age basis. Union-merge MIN wins, NO date guard, persists across days (NOT daily-reset)
  today_trello_lastactive: {'trello_<id>': ms, ...},  // v2.43.6 BUG-064 — last focus activity per card; the Trello analogue of manual `lastActive`. Union-merge MAX wins (opposite of firstseen), NO date guard, persists across days. Additive, no schema bump
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
  memory: {totalTasksCompleted, patterns: {...}, aiName, moments: [...],
    noticed: {...},       // Noticed show-once bookkeeping — travels in the blob but NOT merged (device-local, v2.39.3)
    noticedDates: {...}}, // Noticed cross-device same-day dates — IS merged, earliest-date-wins (v2.39.4). See below.
  // Triage (v5.1)
  triage_history: [{id, decision, at}, ...],
  triage_dismissed: 'YYYY-MM-DD',  // synced to prevent repeat prompts
  // Daily history — per-day snapshots the week grid reads for past days (v5.3, BUG-036)
  daily_history: [{date: 'YYYY-MM-DD', tasksDone: 0, focusMins: 0, habitsKept: 0, habitsTotal: 0}]
}
```

**Zone status values:** `done`, `let_go`, `aged`

### Noticed: two sync-adjacent fields with opposite merge rules (v2.39.3 + v2.39.4)

`appMemory.noticed` and `appMemory.noticedDates` both ride inside the same `memory` blob, but only one is actually merged on read — a deliberate split, not an oversight:

- **`appMemory.noticed`** — "have I shown THIS device this Noticed line yet." **Not merged** (`mergeRemoteData` skips it entirely, reverting BUG-058's v2.36.3 sync). It still travels in the outgoing/incoming blob since it's one object with everything else in `appMemory`, but the incoming value is simply never read into local state.
- **`appMemory.noticedDates`** — "when did this signal-occurrence first fire, on any device," keyed per-occurrence (e.g. `'peak:14'`, `'habit:<id>:30'` — the key encodes the *value* being gated on, so a later occurrence of the same signal type gets a fresh key rather than being blocked by a stale one). **Is merged**, earliest-date-wins per key (`mergeRemoteData` in `index.html`).

Why the split is safe: `noticedDates` only ever carries a date string per key, never the shown text or which device saw it — so merging it can't reintroduce BUG-058's actual failure mode (two devices showing *different content* for the same pattern). It only answers "is today still within the window where any device may show this," which `_noticedEligible()`/`_noticedStamp()` (`assets/insights.js`) check against before a signal is allowed to fire locally. Net effect: a signal shows on every device that opens About on the same calendar day it first fired anywhere, then goes quiet — not "once ever, on one device" (v2.39.3 alone) and not "once ever, shared across all devices" (the BUG-058 bug this whole area was built to avoid repeating).

### Trello aging: two maps with opposite merge rules (v2.43.6, BUG-064)

A Trello card's age basis is `lastactive || firstseen || now` — mirroring the manual path's `task.lastActive || created`. The two maps look interchangeable and are not:

- **`today_trello_firstseen`** — "when did this card first enter MY list, on any device." **MIN-merges** (earliest sighting wins). That *is* its meaning: a card is as old as the first time any device saw it.
- **`today_trello_lastactive`** — "when was this card last worked on, on any device." **MAX-merges** (newest activity wins), matching how manual tasks already reconcile `lastActive` in `mergeRemoteData()`.

**Why not one key.** The obvious fix for BUG-064 was to push `firstseen` forward on focus. It fails silently in exactly the way that is hardest to catch: correct locally, then reverted on the next sync by any device still holding the older timestamp — because MIN-merge is doing precisely what it was designed to do. The bug would present as "the un-aging works, then randomly undoes itself," which reads like a race and is not one.

**Generalised:** a synced map's merge rule encodes its semantics. Before writing a new kind of value into an existing synced key, check what its merge rule *means* — MIN (earliest wins), MAX (newest wins), union (any device's presence wins), LWW (last writer wins). If the new value wants a different rule, it needs its own key. Compare `habit_events` (LWW, BUG-026) and the `noticed`/`noticedDates` split below — same lesson, three separate times.

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

### Revive from PAST → SOON (v2.27.0, Roadmap #8)
`reviveFromPast(id)` moves an `aged`/`let_go` task (never `done`) back to SOON with its
original ID — clears `status`, sets fresh `zoneChangedAt`, increments a `revived` counter
(future nudge/insight signal), immediate `dropboxBackup(true)`.

**Merge guard change:** the SOON merge's phantom-task guard ("skip remote soon entries that
exist in local PAST") became timestamp-aware — `_stillPast(t)`: a remote SOON entry passes
only if its `zoneChangedAt` is **strictly newer** than the local PAST entry's. A revive on
device A carries a fresh timestamp, so it survives the merge on device B (whose local PAST
still holds the task); a stale remote `soon_tasks` entry with an older/missing timestamp is
still blocked (original phantom-task protection). The existing PAST-merge cleanup then
removes B's local PAST copy ("now in SOON with newer timestamp" loop).

### Zone Operations Trigger Backup (v2.12.44)

**Critical:** All zone operations trigger `dropboxBackup(true)` **immediately** (no debounce):

| Operation | Function | Sync |
|-----------|----------|------|
| Pull from SOON | `pullFromSoon()` | Immediate |
| Move to SOON | `moveToSoon()` | Immediate |
| Move to PAST | `moveToPast()` | Immediate |
| Revive from PAST | `reviveFromPast()` | Immediate |
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

### Recency-Aware Manual Order — drag jump-back (v2.38.7)

**Symptom:** drag a manual task to reorder, and ~1 second later it snaps back to its old position — most visible on a warm refresh (reopened within 30 min, so the splash is skipped and the app is interactive instantly).

**Root cause:** `mergeRemoteData()` ordered manual tasks **remote-order-wins** with no recency guard. `_pendingBackup` prevents the 7s ticker from clobbering a fresh drag, but the **initial load pull** and the **reconnect pull** don't check that flag. On a warm refresh the initial Dropbox pull is still in flight while the user drags; it resolves carrying the pre-drag order and `mergeRemoteData` applies it over the drag. Trello order had a recency guard since BUG-042; manual order never did. (v2.38.5's earlier sync kickoff shifted when the initial pull lands, which is why this surfaced then — but the missing guard was the actual flaw, present long before.)

**Fix:** mirror BUG-042 for manual order. `today_manual_order_at` (ISO) is stamped on every manual reorder (drop handler + touch `_saveOrder`) and synced as `manual_order_at` (schema 5.4). In `mergeRemoteData`, order basis is chosen by recency: remote wins by default, but a strictly-newer local reorder stamp keeps the local sequence for shared tasks (remote-only additions still append at the end; local-only additions still append after that; all the zone/delete filters are unchanged). When remote wins, the device adopts the remote stamp so the next merge compares correctly. Ties → remote wins. Absent stamp (old backup) → `''` → remote wins = exact prior behavior, so no migration needed.

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
| Task list | Union by ID, remote order wins; per-field: remote wins except `lastActive` (max wins — BUG-059) |
| Task order | Detected via ID sequence comparison (v2.12.55) |
| Habit list | Union by ID, remote order wins |
| Trello order | Newer `trello_order_at` wins (bootstrap if local order empty) — BUG-042 |
| Trello focus map | Union by card ID (max value), date-guarded — v2.18.17 |
| Trello first-seen | Union by card ID, **MIN timestamp wins** (earliest sighting), no date guard, persists across days — v2.18.22 (BUG-049) |
| Done IDs | Union with check/uncheck timestamps (most-recent op wins) |
| Done-today count | NOT stored/merged — derived from checked_ids via `_doneTodayCount()` (v2.18.21) |
| Deleted IDs | Union (excluded from tasks) |
| SOON tasks | Union by ID, newer zoneChangedAt wins |
| PAST tasks | Union by ID, newer zoneChangedAt wins, age-based purge only (done >7d, let_go/aged >30d) — no count cap (v2.17.47) |
| Stats | Max wins |
| Triage dismissed | If remote = today, apply locally |
| Nudge dismissal (unified day nudge) | If remote = `'1'` and local key unset for today, set + hide element. Payload field AND merge block are both driven by the `_DISMISS_SYNC` registry (v2.18.40) — new per-day dismissable surface = one registry row (BUG-051/053 lesson). v2.19.0 merged the two nudges into one `dayNudge` (`day_nudge_dismissed`); the legacy `trello_nudge_dismissed`/`morning_nudge_dismissed` fields remain as registry rows mapped to the new key for pre-2.19.0 devices — remove once all devices updated |
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
