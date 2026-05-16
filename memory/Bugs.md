# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60 |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61 |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1 |
| 004 | App blank after sleep/wake | ⏳ v2.17.24 — recurred, awaiting verification |
| 005 | Trello 🍅 badge vanishing | ✅ v2.12.56–66 |
| 006 | _onWake() consolidation | ✅ v2.17.0 |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6 |
| 008 | Drag jump-back on mobile | ✅ v2.12.72 |
| 009 | Task aging opacity broken | ✅ v2.12.73 |
| 010 | Habits didn't roll over | ✅ v2.12.74–77 |
| 011 | PiP ghost chime on wrong task | ⏳ v2.16.9 |
| 012 | Overdue Trello card disappears on check | ⏳ v2.16.5 |
| 013 | Focus timer jumps on restore | ✅ v2.14.9 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9 |
| 019 | Star explosion missing on mobile | ✅ v2.17.21 — verified |

---

## BUG-004 (recurrence): App blank on restore after background focus completion

**Status:** Fixed v2.17.24 — awaiting verification

**Scenario:** Desktop PWA, focus mode active, user switches to another app. Focus timer completes in background via `tickFor` setTimeout. On return: logo visible but task list blank. Clicking restores.

**Root cause:** `completeFor()` runs while tab is hidden → adds `.complete` class to `#focusFill` → starts `timerCompletePulse` animation (infinite, `will-change: transform`). GPU compositor creates a promoted layer for this animation while page is hidden. On restore, WebKit/macOS keeps this stale compositor layer, rendering it at the wrong Z-position and masking the task list. `display:none → display:''` on `#main-app` (existing repaint) doesn't always destroy `will-change` promoted layers in all GPU drivers.

**Fix (v2.17.24):**
1. In focus module `visibilitychange` handler: after returning from background, if `#focusFill` has `.complete`, toggle `animationPlayState` (`paused` → rAF → `''`). This forces the GPU to destroy and recreate the compositor layer at the correct position.
2. `_clearStaleFocusing()` extended to also run at 1000ms (was 0ms + 350ms).
3. `_forceRepaint()` extra pass at 1500ms.

**Verify:** Focus a task → switch to another app → wait for 25min timer to complete → return to PWA → task list should be visible immediately (no blank state).

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

