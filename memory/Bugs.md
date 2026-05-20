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
| 024 | Per-task focus minutes carry over to next day | ⏳ v2.17.44 |
| 025 | PiP "Again" bar flashes twice on desktop PWA restore after session complete | 🐛 open |


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

## BUG-025: PiP "Again" bar flashes twice on desktop PWA restore

**Status:** Open

**Symptoms:**
- After a focus session completes, bring the desktop PWA back to foreground
- The "Again" bar (complete state) flashes twice before settling into normal pulsate

**Suspected cause:**
- Similar pattern to BUG-022/023 — CSS animation restarted by visibility sync calls on restore
- `_pipSync(0, TOTAL)` fires on `visibilitychange` and may re-trigger complete state CSS
- `completeFor()` may also fire a second time via `_pipSync` path when app restores

**Files to investigate:**
- `index.html` visibilitychange handler (~line 10927), `_pipSync` (~line 11213), `completeFor` (~line 10700)

---

## BUG-024: Per-task focus minutes carry over to next day

**Status:** Open

**Symptoms:**
- A task carried to the next day shows focus minutes accumulated from the previous day
- Today's focus time counter appears inflated before any work is done
- The 🍅 pomodoro count and icon carrying over is **intentional and correct** — only the focus minutes should reset

**Expected behaviour:**
- Each day starts at 0m focused per task
- The 🍅 count stays (lifetime sessions on that task)
- Focus minutes build fresh each day from zero

**Suspected cause:**
- `focusSessions` is stored on the task object (`manualTasks[idx].focusSessions`) and carries with the task into the next day — this is correct for the 🍅 badge
- Per-task focus minutes may not be separated from the session count, so both persist across the day boundary
- `stat_focus_mins_today` (global) correctly resets to `0` on day change, but per-task minutes tracked within the task object or `today_trello_focus` may not

**Files to investigate:**
- `index.html` — `checkNewDay()` (~line 4417), `_trackFocusTime()` (~line 10517), `onSessionComplete()` (~line 10730)
- Per-task `focusSessions` on `manualTasks` and `habitsList`
- `today_trello_focus` localStorage key (cleared on day change at line 4452 — Trello is fine, manual tasks may not be)

---

