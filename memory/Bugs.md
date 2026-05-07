# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60 |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61 |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1 |
| 004 | App blank after sleep/wake during focus | ⏳ v2.16.21 |
| 005 | Trello 🍅 badge vanishing | ✅ v2.12.56–66 |
| 006 | _onWake() consolidation | 📋 Backlog |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6 |
| 008 | Drag jump-back on mobile | ✅ v2.12.72 |
| 009 | Task aging opacity broken | ✅ v2.12.73 |
| 010 | Habits didn't roll over | ✅ v2.12.74–77 |
| 011 | PiP ghost chime on wrong task | ⏳ v2.16.9 |
| 012 | Overdue Trello card disappears on check | ⏳ v2.16.5 |
| 013 | Focus timer double-counts | ✅ v2.14.9 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |

---

## BUG-004: App blank after sleep/wake during focus

**Status:** Fixed v2.12.57 + v2.12.66 + v2.16.20 + v2.16.21 + v2.17.1 — awaiting verification

**Symptom:** Focus mode running → computer sleeps → wakes → app is blank. No data loss, clicking anywhere restores it.

**Root causes (compounding):**
1. `contain: layout style` on `.task-list` — browser skipped repainting isolated layers (v2.12.57–66)
2. `.focusing` class stuck on `#main-app` after wake — recedes all non-focused elements to 7% opacity (v2.16.20)
3. Async timing gap — `renderManual()` (from Dropbox sync on wake) destroys `.focused` element; `_focusReanchor` re-attaches moments later. During that 10–100ms gap: `.focusing` on, nothing `.focused` → blank (v2.16.21)

**Fixes:**
- **v2.12.57:** Force repaint on `visibilitychange`, `window.focus`, `pageshow`
- **v2.12.66:** Removed `contain: layout style`. Repaint targets `#main-app`
- **v2.16.20:** Added `.focusing` cleanup to `visibilitychange` (immediate check)
- **v2.16.21:** Added 350ms deferred `_clearStaleFocusing()` to both `visibilitychange` and `window.focus` — catches the async DOM rebuild gap after sync + reanchor

**Verify:** Focus on a task or habit → let computer sleep for 5+ min → wake → app should show normally. Header visible, tasks visible, not blank.

**Verified fixed:** ☐

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
