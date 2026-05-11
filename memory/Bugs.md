# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60 |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61 |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1 |
| 004 | App blank after sleep/wake during focus | ✅ v2.17.1 |
| 005 | Trello 🍅 badge vanishing | ✅ v2.12.56–66 |
| 006 | _onWake() consolidation | 📋 Backlog |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6 |
| 008 | Drag jump-back on mobile | ✅ v2.12.72 |
| 009 | Task aging opacity broken | ✅ v2.12.73 |
| 010 | Habits didn't roll over | ✅ v2.12.74–77 |
| 011 | PiP ghost chime on wrong task | ⏳ v2.16.9 |
| 012 | Overdue Trello card disappears on check | ⏳ v2.16.5 |
| 018 | Phantom SOON tasks reappear after day | ⏳ v2.17.9 |
| 013 | Focus timer double-counts | ✅ v2.14.9 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |

---

## BUG-011: PiP ghost chime on wrong task

**Status:** Fixed v2.13.5 + v2.13.6 + v2.16.9 — awaiting verification

**Symptom:** Task A → PiP → restore → check Task A → start Task B focus → chime fires during Task B's session.

**Root cause (v2.16.9):** `startPiPClock` captured `uiTaskId` by reference (closure). With BUG-014 fix keeping PiP alive, old RAF from Task A still ran. When its reference point hit zero, it called `completeFor(uiTaskId)` — but `uiTaskId` had changed to Task B.

**Fix (v2.16.9):**
1. `clockTaskId = uiTaskId` captured by value at clock start
2. RAF stops if `uiTaskId !== clockTaskId`
3. Reused PiP path calls `startPiPClock()` for current task

**Verify:** Task A → PiP → restore app → check Task A → start Task B → chime should NOT fire during Task B unless Task B's 25min completes.

**Verified fixed:** ☐

---

## BUG-012: Overdue Trello card disappears on check / shows undone cross-device

**Status:** Fixed v2.14.5 + v2.16.5 — awaiting verification

**Symptom 1:** Check overdue Trello card → it disappears immediately before midnight.
**Symptom 2:** Check overdue card on Device A → Device B shows it unchecked.

**Root cause (original):** Race between `loadTrello()` and Dropbox sync — stale `doneIds` when filter ran.

**Root cause (Symptom 1):** Filter said `done + overdue = hide` without checking WHEN it was done.

**Fix (v2.14.5):** `mergeRemoteData` re-filters after updating `doneIds`.
**Fix (v2.16.5):** Both `loadTrello` filter and `mergeRemoteData` eviction check `today_checked_ids` timestamp — overdue + done + checked today → show until EOD. Only evict if checked before today.

**Verify:** Check an overdue Trello card → should stay visible (done styling) until midnight. Other device → should clear within 7s without manual refresh.

**Verified fixed:** ☐

---

## BUG-018: Phantom SOON tasks reappear after day

**Status:** Fixed v2.17.9 — awaiting verification

**Symptom:** Tasks moved to SOON that were subsequently deleted or completed reappear in the SOON list the following day. Deleting or completing them again triggers the same cycle.

**Root cause:** `mergeRemoteData` built a `mergedDeletedMap` from `deleted_ids` and excluded those from the SOON merge. However, tasks that are completed or age out of SOON are moved to `pastTasks` — their IDs are **never added to `deleted_ids`**. The Dropbox remote backup still had these tasks in `soon_tasks`. On the next day's sync (morning wake pull), the merge saw the task ID was not in `mergedDeletedMap`, not in TODAY, so it was restored to SOON from the remote backup.

**Fix (v2.17.9):** Built `pastIds = new Set(pastTasks.map(t => t.id))` before the SOON merge. Added `pastIds` exclusion to both the local and remote sides of the SOON union:
- Local: `if (!mergedDeletedMap.has(t.id) && !pastIds.has(t.id))`
- Remote: `if (pastIds.has(t.id)) return;`

Tasks already in PAST cannot re-enter SOON via sync, regardless of what the remote backup contains.

**Verify:** Move a task to SOON → complete it or delete it → wait until next day or force sync → task should NOT reappear in SOON.

**Verified fixed:** ☐
