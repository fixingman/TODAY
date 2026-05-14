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
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9 |
| 019 | Star explosion missing on mobile at splash end | ⏳ v2.17.20 |
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

---

## BUG-019: Star explosion missing on mobile at splash end

**Status:** Under investigation — introduced around v2.17.0 (_onWake consolidation)

**Symptom:** At the end of the splash screen, the star should explode into a burst of particles. Works on desktop, not visible on mobile. The splash still dismisses correctly — only the explosion is absent or invisible.

**Pre-regression baseline:** v2.16.21 — splash worked correctly on mobile. `sResize` used `innerWidth/innerHeight` (no DPR). Typewriter used `setTimeout`. No `_appReady` flag.

**Changes since baseline that touch splash or its timing:**
- **v2.17.0** — `window.focus` now calls `_onWake()` (extra work on PWA open, may shift timing)
- **v2.17.1** — Multi-pass repaint (0ms, rAF, rAF, 500ms) fires on `window.focus` — during splash before `_appReady` guard existed
- **v2.17.14** — `_appReady` flag added — `_onWake()` blocked during splash ✓ but `_appReady = true` set too early (end of `init()`)
- **v2.17.17** — `_appReady = true` moved to inside splash dismiss callback — correct timing
- **v2.17.19** — DPR canvas scaling added. Typewriter switched to rAF. `sctx.scale(dpr, dpr)` applied in `sResize`.

**Candidates under investigation:**
1. `_appReady = true` is set AFTER `splashCanvas.remove()` — canvas is already detached when `_onWake()` first runs. Could this affect rAF scheduling?
2. DPR scaling in `sResize` — `sctx.scale(dpr, dpr)` changes coordinate space. `clearRect` now uses `splashCanvas.width/dpr`. Need to verify particles render in correct CSS px space on all DPR values.
3. `window.focus` extra work (checkMorningNudge, triageBarSilent etc.) shifting timing before `_appReady` guard was added — possibly corrupted JS execution order during explosion.
4. `sBurst` fires correctly but explosion is invisible against fading splash background on mobile.

**Verify:** Open TODAY on mobile as PWA → watch end of splash → star should visibly explode into particles.

**Verified fixed:** ☐
