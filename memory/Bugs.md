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
| 011 | PiP ghost chime on wrong task | ✅ v2.16.9 |
| 012 | Overdue Trello card disappears on check | ✅ v2.16.5 |
| 013 | Focus timer jumps on restore | ✅ v2.14.9 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9 |
| 019 | Star explosion missing on mobile | ✅ v2.17.29 |
| 020 | Streak double-counts across devices | ✅ v2.17.26 |
| 021 | Splash explosion invisible / freezes after typewriter | ⏳ v2.17.29 |
| 022 | Focus fill bar pulsates during active countdown | ✅ v2.17.36 |
| 023 | Top panels flash twice on desktop PWA restore | ✅ v2.17.37 |
| 024 | Per-task focus minutes carry over to next day | ⏳ v2.17.48 |
| 025 | PiP "Again" bar flashes twice on desktop PWA restore after session complete | ⏳ v2.17.49 |


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

## BUG-024: Per-task focus minutes carry over to next day

**Status:** Fixed v2.17.48 — awaiting verification

**Symptoms:**
- A task carried to the next day shows focus minutes accumulated from the previous day
- Today's focus time counter appears inflated before any work is done
- The 🍅 pomodoro count and icon carrying over is **intentional and correct** — only the focus minutes should reset

**Expected behaviour:**
- Each day starts at 0m focused per task
- The 🍅 count stays (lifetime sessions on that task)
- Focus minutes build fresh each day from zero

**Root cause:** `stat_focus_mins_date` was only generated as `_getAppDay()` in the backup payload — not persisted to localStorage. On Day 2 startup, the pre-cleanup `dropboxBackup()` call stamped yesterday's minutes with today's date. The next sync's date guard passed and `Math.max(0, 90) = 90` restored yesterday's total.

**Fix (v2.17.44):** `stat_focus_mins_date` now saved to localStorage when minutes are earned and on day-reset. Backup uses stored date (not `_getAppDay()`), so pre-cleanup backups carry the correct previous-day date.

**Fix (v2.17.46):** Backup payload fallback was `|| _getAppDay()`, meaning users without `stat_focus_mins_date` in localStorage (upgrading from pre-v2.17.44) got today's date stamped on stale minutes — bypassing the date guard. Fallback changed to `|| ''` so the guard rejects unknown-date data and treats remote minutes as 0.

**Fix (v2.17.48 — true root cause):** `applyNewDayCleanup()` had an early `return` at the streak guard (added for BUG-020): when `stat_streak_date` already matched today — e.g. because another device had synced the streak via Dropbox and `mergeRemoteData` had written it to localStorage — the function returned before resetting `stat_focus_mins_today`. The BUG-020 guard was correct in intent (skip the streak INCREMENT) but wrong in scope (it skipped the entire cleanup). Restructured: streak increment is now conditional inside an `if (streakDate !== todayISO)` block; daily counter reset always runs after.

**Verified fixed:** ☐

---

## BUG-025: PiP "Again" bar flashes twice on desktop PWA restore

**Status:** Fixed v2.17.49 — awaiting verification

**Symptoms:**
- After a focus session completes, bring the desktop PWA back to foreground
- The "Again" bar (complete state) flashes twice before settling into normal pulsate

**Root cause:** `_onWake` calls `_forceRepaint()` 5 times. Each call cycles `#main-app` through `display:none → display:''`, which resets all CSS animations on child elements — including `timerCompletePulse` on `fillEl.complete` (timer is inside `#main-app` while open). The first 3 calls happen within ~32ms and are imperceptible. The 4th at 500ms and 5th at 1500ms produce two clearly visible flashes. BUG-023 handled `.config-panel.open` the same way but missed `.complete` timer elements.

**Fix:** In `_forceRepaint`, suppress `animation` on `.complete` elements after each `display:none/block` cycle (same pattern as BUG-023). After the final 1500ms pass, clear suppression via rAF so the pulsate animation resumes once cleanly.

---

