# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60 |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61 |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1 |
| 004 | App blank after sleep/wake | ✅ v2.17.24 |
| 005 | Trello pomodoro badge vanishing | ✅ v2.12.56–66 |
| 006 | _onWake() consolidation | ✅ v2.17.0 |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6 |
| 008 | Drag jump-back on mobile | ✅ v2.12.72 |
| 009 | Task aging opacity broken | ✅ v2.12.73 |
| 010 | Habits didn't roll over | ✅ v2.12.74–77 |
| 011 | PiP ghost chime on wrong task | ⏳ v2.16.9 |
| 012 | Overdue Trello card disappears on check | ✅ v2.16.5 |
| 013 | Focus timer jumps on restore | ✅ v2.14.9 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9 |
| 019 | Star explosion missing on mobile | ⏳ v2.17.29 |
| 020 | Streak double-counts across devices | ✅ v2.17.26 |
| 021 | Splash explosion invisible / freezes after typewriter | ⏳ v2.17.29 |
| 022 | Focus fill bar pulsates during active countdown | ✅ v2.17.36 |
| 023 | Top panels flash twice on desktop PWA restore | ⏳ v2.17.37 |


## BUG-023: Top panels flash twice on desktop PWA restore

**Status:** Fixed v2.17.37 — awaiting verification

**Symptom:** Habits, Connections, or About panel is open → user alt-tabs away and back → panel flashes twice (brief disappear+reappear with fadeIn animation).

**Root cause:** `_forceRepaint()` (BUG-004 fix) sets `#main-app.style.display = 'none'` then `''`. CSS `animation` properties restart from scratch when an element re-enters the render tree after its parent was `display:none`. `.config-panel.open` has `animation: fadeIn` — so every repaint call replays the fade-in. `_forceRepaint()` runs 5 times on wake (immediate, rAF×2, 500ms, 1500ms); the 500ms and 1500ms passes are the two clearly visible flashes.

**Fix (v2.17.37):**
1. `_forceRepaint()`: after restoring `display: ''`, synchronously set `animation: none` inline on all `.config-panel.open` elements — suppresses the fadeIn before any paint.
2. `toggleConfig()`, `toggleInfo()`, `toggleHabits()`: clear the inline `animation` style (`panel.style.animation = ''`) when opening, so user-triggered opens still play fadeIn normally.

**Verify:**
- Open any panel → fades in normally ✅
- Alt-tab away → alt-tab back → panel is static, no flash ✅
- Close and reopen panel → fades in again ✅
- BUG-004 (blank on wake) not regressed ✅

**Verified fixed:** ☐

---

## BUG-021: Splash explosion invisible / freezes after typewriter

**Status:** Fixed v2.17.27 — awaiting verification

**Symptoms:**
- Mobile PWA: star doesn't explode, task list loads directly (app recovers via 2s fallback)
- Desktop PWA: star doesn't explode (same fallback recovery)
- Desktop PWA: animation freezes after typewriter completes, requires page refresh (no recovery)

**Root cause 1 — explosion invisible (retina devices):** `sctx.scale(dpr, dpr)` was called inside `sResize()`, which fires on every `resize` event. `scale()` multiplies the existing transform — so after first resize the context ran at `dpr²` scale, corrupting all particle coordinates. On mobile PWA launch, a resize almost always fires (viewport settling, keyboard), so the explosion always drew at the wrong position. On a 3× phone, particles compressed into the top-left corner of the screen — invisible. Introduced in v2.17.19 when DPR-aware canvas was added.

**Fix:** Replaced `sctx.scale(dpr, dpr)` with `sctx.setTransform(dpr, 0, 0, dpr, 0, 0)` in `sResize()`. `setTransform` resets to exactly `dpr×` each call regardless of prior state.

**Root cause 2 — freeze after typewriter:** The two-flag splash gate (`_splashAnimDone` + `_appLoadDone`) has no top-level timeout. `_onAppLoadDone` fires inside an async load chain that includes `await _dropboxEnsureToken()`. If that network request hangs with no timeout (possible on desktop PWA when OS network stack isn't ready), the chain stalls indefinitely. `_appLoadDone` is never set, splash never dismisses. No recovery — user must refresh.

**Fix:** Added a 6-second safety timeout after the gate definitions: calls `_onAppLoadDone` if it hasn't fired yet, so a stalled fetch degrades gracefully instead of freezing.

**Verify:**
- Open app fresh (splash shows) on mobile PWA → star should explode visibly
- Open app fresh on desktop PWA → star should explode visibly
- On slow/flaky network, splash should still dismiss within ~6s even if Dropbox stalls

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


