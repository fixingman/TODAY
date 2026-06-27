# Bugs Archive

> Verified fixed bugs. Full root cause + fix detail preserved here.
> Active / awaiting bugs → `Bugs.md`
> **Ordering rule:** bugs must be listed in ascending numeric order (BUG-001 first, highest last).

---

## BUG-001: Triage dismissed on one device, still shows on the other
**Status:** ✅ Verified fixed (v2.12.59–2.12.60)
**Symptom:** Dismiss triage on Device A → Device B still shows the bar.
**Root cause:** `triageDismissedToday` was a local boolean — not read from localStorage on wake. Other device's dismissal was in Dropbox backup but the local flag was never refreshed.
**Fix:** On `visibilitychange` and `window.focus`, re-read `triage_dismissed` from localStorage after sync settles (3s delay). `mergeRemoteData` applies remote dismissal. `_triageBarSilent` prevents bar showing during the grace window.

---

## BUG-002: Dropbox sync fails silently — stale data on return
**Status:** ✅ Verified fixed (v2.12.58–2.12.61)
**Symptom:** Return to app after a while — tasks are stale, no indication of sync failure.
**Root cause:** Silent `catch(e) {}` blocks, renamed function (`dropboxUpdateUI` → `renderConnections`), and network errors reaching the red dot. Multiple sync paths had no error visibility.
**Fix:** Removed silent catches, fixed renamed function at all call sites, added `_logSyncError` with network error filtering, added red dot indicator.

---

## BUG-003: Red dot on network loss
**Status:** ✅ Verified fixed (v2.12.58 + v2.12.61 + v2.12.67 + v2.13.4 + v2.14.1)
**Symptom:** WiFi drops → red dot appears, causing false alarm.
**Root cause:** `_logSyncError` had no network error filter — "Failed to fetch" triggered red dot on every WiFi drop. `unhandledrejection` had no filter either.
**Fix:** `_logSyncError` detects network errors (Failed to fetch, NetworkError, Load failed, CORS, ERR_INTERNET, Failed to update a ServiceWorker) → console only, no red dot. Same filter applied to `unhandledrejection`.

---

## BUG-004: App blank after sleep/wake during focus
**Status:** ✅ Verified fixed (v2.12.57 + v2.12.66 + v2.16.20 + v2.16.21 + v2.17.1 + v2.17.24)
**Symptom:** Focus mode running → computer sleeps → wakes → app is blank. No data loss, clicking restores it.
**Root causes (compounding):**
1. `contain: layout style` on `.task-list` — browser skipped repainting isolated layers
2. `.focusing` class stuck on `#main-app` after wake — recedes all non-focused elements to 7% opacity
3. Async timing gap — `renderManual()` (from Dropbox sync on wake) destroys `.focused` element; `_focusReanchor` re-attaches moments later. During that gap: `.focusing` on, nothing `.focused` → blank
4. GPU compositor layers not ready after long sleep — synchronous repaint too early
**Fixes:**
- **v2.12.57:** Force repaint on `visibilitychange`, `window.focus`, `pageshow`
- **v2.12.66:** Removed `contain: layout style`. Repaint targets `#main-app`
- **v2.16.20:** Added `.focusing` cleanup to `visibilitychange` (immediate check)
- **v2.16.21:** Added 350ms deferred `_clearStaleFocusing()` — catches async DOM rebuild gap
- **v2.17.1:** Multi-pass repaint (immediate + rAF + rAF + 500ms) — covers GPU warmup after hours of sleep
**Note:** Observer-based detection considered and rejected — observers report geometry, not pixel paint state. GPU compositor failure is invisible to JS.
**Recurrence (v2.17.24):** Blank UI on return when focus timer completed in background (desktop PWA). `completeFor()` ran while tab hidden → added `.complete` to `#focusFill` → started `timerCompletePulse` (infinite CSS animation, `will-change: transform`). GPU compositor promoted this layer while hidden; on restore, WebKit kept stale layer at wrong Z-position masking tasks. **Fix:** Toggle `animationPlayState` on restore (paused → rAF → '') to force layer destroy/recreate. `_clearStaleFocusing` extended to 1000ms; `_forceRepaint` extra pass at 1500ms.

---

## BUG-005: Pomodoro session count not shown on Trello tasks
**Status:** ✅ Verified fixed (v2.12.56 + v2.12.66)
**Symptom:** Pomodoro badge disappears from Trello task rows every 7 seconds.
**Root cause:** `newText` (used for innerHTML comparison in Trello patch path) didn't include the session badge. `innerHTML` was rewritten every 7s tick → badge destroyed.
**Fix:** Session badge included in `newText`. Comparison now stable — innerHTML only overwrites when text/link/badge actually changes.

---

## BUG-006: _onWake() consolidation
**Status:** ✅ Verified fixed (v2.17.0)
**Symptom:** Four separate `visibilitychange` handlers scattered across the codebase — maintenance risk, subtle ordering bugs possible.
**Root cause:** Wake-related logic (repaint, triage, sync) accumulated across multiple modules with no coordination.
**Fix:** Consolidated into single `window._onWake()` in global scope. Sync module's `visibilitychange` calls it after sync is triggered. Three handlers remain in their own closures where private variables are needed: SW update check, timer wall-clock correction, PiP show/hide.

---

## BUG-007: Triage bar stays visible during and after triage
**Status:** ✅ Verified fixed (v2.13.2 + v2.16.6)
**Symptom:** Triage bar visible while overlay is open; reappears briefly after dismissal on mobile.
**Root cause (original):** `_triageActive` flag not set during overlay open — `checkTriageBar()` showed bar while overlay was open.
**Root cause (mobile regression):** Backdrop tap during 3s post-triage summary called `triageMinimize()` which restored the bar even though `triageDismissedToday` was already true.
**Fix (v2.13.2):** `_triageActive` locks bar hidden while overlay is open.
**Fix (v2.16.6):** `triageMinimize()` checks `triageDismissedToday` — if true, routes to `triageClose()` instead.

---

## BUG-008: Dragged task jumps back to previous position
**Status:** ✅ Verified fixed (v2.12.72)
**Symptom:** Drag task to new position → it snaps back to where it was.
**Root cause:** `touchend` handler was calling `renderManual()` synchronously after drop, which rebuilt the list from `manualTasks` array (not yet updated with new order). Task appeared to snap back.
**Fix:** Drag-end updates `manualTasks` array order before triggering render.

---

## BUG-009: Task aging opacity broken — day 1 immediately muted
**Status:** ✅ Verified fixed (v2.12.73)
**Symptom:** New tasks appear muted/faded immediately instead of starting bright.
**Root cause:** Age calculation used `Date.now()` vs task ID timestamp comparison in UTC, crossing local midnight boundaries incorrectly.
**Fix:** Age calculation uses `_localISO()` for consistent local-time date comparison.

---

## BUG-010: Habits did not roll over at midnight
**Status:** ✅ Verified fixed (v2.12.74 + v2.12.77)
**Symptom:** Open app after midnight — yesterday's habits still show as completed.
**Root cause:** `checkNewDay()` used `_getAppDay()` string comparison, but habit completion was stored with UTC ISO timestamps. Near midnight, UTC and local date diverged → habits didn't roll over.
**Fix:** All habit date comparisons use `_habitTodayISO()` which wraps `_localISO()`. Day boundary unified at local midnight.

---

## BUG-011: PiP ghost chime on wrong task
**Status:** ✅ Verified fixed (v2.13.5 + v2.13.6 + v2.16.9)
**Symptom:** Task A → PiP → restore → check Task A → start Task B focus → chime fires during Task B's session.
**Root cause:** `startPiPClock` captured `uiTaskId` by reference (closure). With BUG-014 fix keeping PiP alive, old RAF from Task A still ran. When its reference point hit zero, it called `completeFor(uiTaskId)` — but `uiTaskId` had changed to Task B.
**Fix (v2.16.9):** `clockTaskId = uiTaskId` captured by value at clock start. RAF stops if `uiTaskId !== clockTaskId`. Reused PiP path calls `startPiPClock()` for current task.

---

## BUG-012: Overdue Trello card disappears on check / shows undone cross-device
**Status:** ✅ Verified fixed (v2.14.5 + v2.16.5)
**Symptom 1:** Check overdue Trello card → it disappears immediately before midnight.
**Symptom 2:** Check overdue card on Device A → Device B shows it unchecked.
**Root cause (original):** Race between `loadTrello()` and Dropbox sync — stale `doneIds` when filter ran.
**Root cause (Symptom 1):** Filter said `done + overdue = hide` without checking WHEN it was done.
**Fix (v2.14.5):** `mergeRemoteData` re-filters after updating `doneIds`.
**Fix (v2.16.5):** Both `loadTrello` filter and `mergeRemoteData` eviction check `today_checked_ids` timestamp — overdue + done + checked today → show until EOD. Only evict if checked before today.

---

## BUG-013: Focus timer jumps 8-10 seconds on minimize/PiP restore
**Status:** ✅ Verified fixed (v2.14.9)
**Symptom:** Switch away during focus → come back → timer visually jumps forward several seconds.
**Root cause:** `tickFor` used `setTimeout(1000)` which browsers throttle when tab is hidden (1s tick could take 1.5–2s). On restore, several missed ticks fired rapidly — timer jumped visually.
**Fix:** Wall-clock correction on restore. `wallStart` timestamp used to calculate true elapsed time. PiP RAF uses its own wall-clock anchor, immune to throttling.

---

## BUG-014: PiP not reappearing after restoring app during focus
**Status:** ✅ Verified fixed (v2.15.5 + v2.16.19)
**Symptom:** Focus running in PiP → restore app → PiP window doesn't reopen.
**Root cause (original):** `requestWindow()` requires user gesture. Second minimize had no gesture.
**Root cause (v2.16.19 — manual restore):** Browser auto-closes PiP on dock/Alt+Tab restore (`pagehide` fires → `pipWindow = null`). OS minimize button has no accessible user gesture.
**Fix (v2.15.5):** `_pipRestoredFromButton` flag — PiP button tap carries gesture, keeps PiP alive.
**Fix (v2.16.19):** `_hadPiP` flag. On restore, if `_hadPiP` and focus active, reopens PiP using the dock-click gesture. `_hadPiP` cleared on explicit close or focus end.

---

## BUG-015: AI repeats same aging task suggestion every session
**Status:** ✅ Verified fixed (v2.15.2)
**Symptom:** AI keeps suggesting the same old Trello task every day regardless of cooldown.
**Root cause:** Suggestion cooldown pruning only iterated `manualTasks` IDs. Trello task IDs were never in the retention set → all Trello cooldowns deleted nightly → Trello tasks appeared perpetually "new".
**Fix:** Pruning builds ID set from both `manualTasks` and `trelloTasks`.

---

## BUG-016: AI chip labels show generic "Add step"
**Status:** ✅ Verified fixed (v2.15.6)
**Symptom:** `break_down` action chips all labelled "Add step" regardless of content.
**Root cause:** `break_down` handler rendered chips with hardcoded `"Add step"` label instead of extracting step text from payload.
**Fix:** Chips use actual step text, capped at 28 chars. System prompt updated: banned colons in labels, banned mid-conversation openers.

---

## BUG-017: Focus minutes only recorded on full session completion
**Status:** ✅ Verified fixed (v2.16.0)
**Symptom:** Exit focus early → no minutes recorded for the partial session.
**Root cause:** `_trackFocusTime()` only called when `doResetState=true` in `closeUI()`. Only `completeFor()` passed `true`. Escape/task-switch/early close lost all minutes.
**Fix:** Removed `doResetState` condition. `_trackFocusTime` called on every `closeUI`. Guards (`st.tracked`, `timeSpentMins <= 0`) prevent double-counting.

---

## BUG-018: Phantom SOON tasks reappear after day
**Status:** ✅ Verified fixed (v2.17.9)
**Symptom:** Tasks moved to PAST reappear in SOON the next day after sync.
**Root cause:** `mergeRemoteData` excluded `deleted_ids` from SOON merge but not `pastTasks` IDs. Completed/aged tasks move to PAST (not `deleted_ids`), so remote backup still had them in `soon_tasks`. On next day's sync, merge restored them to SOON.
**Fix:** Built `pastIds = new Set(pastTasks.map(t => t.id))` before SOON merge. Added `pastIds` exclusion to both local and remote sides of the SOON union. Tasks already in PAST cannot re-enter SOON via sync.

---

## BUG-019: Star explosion missing on mobile at splash end
**Status:** ✅ Verified fixed (v2.17.21 + v2.17.27 — see also BUG-021)
**Symptom:** Splash typewriter completes but star doesn't explode — app loads directly with no animation.
**Root causes (v2.17.21):**
1. **Canvas display size** — `position:fixed;inset:0` with `width=innerWidth*dpr` attribute caused some browsers to use the attribute as intrinsic CSS size, making the display box `innerWidth*dpr` px wide. Drawing coords landed at `x*dpr` on screen — burst appeared off-screen. **Fix:** explicit `style.width/height` in CSS px in `sResize()`.
2. **Burst origin unreliable** — `getBoundingClientRect()` at dismiss time returned stale layout values (parent opacity transition just triggered). **Fix:** capture star center 600ms after `startSplash()` into `_burstX/_burstY`.
3. **Animation sequence wrong** — app was revealed at T+630ms while explosion still playing. **Fix:** typewriter → explosion → app cross-fades in (sequential, not overlapping).
4. **Dark pause after explosion** — app reveal delayed `FADE_OUT+30ms` after explosion end. **Fix:** app cross-fade starts simultaneously with splash fade-out.
5. **Loop ran too long** — `SPLASH_MAX_FRAMES=240` kept invisible sub-particles alive. **Fix:** stop loop when `maxAlpha < 0.1`; cap reduced to 90 frames.
**Recurrence (v2.17.27 — BUG-021):** Bug persisted on retina devices after v2.17.21. Real root cause: `sctx.scale(dpr, dpr)` inside `sResize()` accumulated on every resize event — after first resize context ran at `dpr²` scale, compressing particle coordinates into the top-left corner (invisible on 2× and 3× screens). Mobile PWA launch always triggers a resize. **Fix:** replaced `scale()` with `setTransform()` which resets the transform each call.

---

## BUG-020: Streak double-counts across devices
**Status:** ✅ Verified fixed (v2.17.26)
**Symptom:** Streak was 108 on Friday. Opened app on Device A Saturday → 109. Opened on Device B Saturday → jumped to 110.
**Root cause:** `stat_streak` was merged with `Math.max` but had no date guard (unlike `stat_focus_mins_today` which has `stat_focus_mins_date`). If Device B received streak=109 via background sync from Device A's Saturday backup, then on first open `checkNewDay()` saw `lastVisit = Friday = yesterday` → incremented 109→110. Same calendar day counted twice across devices.
**Fix:** Added `stat_streak_date` (YYYY-MM-DD local) — set whenever streak is incremented in `checkNewDay()`. `checkNewDay()` skips the increment if `stat_streak_date === todayISO`. Merge adopts the lexicographically newer `stat_streak_date` from remote alongside `Math.max` streak. Full restore and backup payload also include `stat_streak_date`.

---

## BUG-021: Splash explosion invisible / freezes after typewriter
**Status:** ✅ Verified fixed (v2.17.27–29)
**Symptom:** Mobile + desktop PWA — star doesn't explode on launch (app recovers via 2s fallback). Desktop PWA: animation freezes after typewriter completes, requires page refresh (no recovery).
**Root cause 1 — explosion invisible (retina):** `sctx.scale(dpr, dpr)` was called inside `sResize()`, which fires on every `resize`. `scale()` multiplies the existing transform — after the first resize the context ran at `dpr²` scale, corrupting all particle coordinates. PWA launch almost always fires a resize (viewport settling), so the explosion drew at the wrong position; on a 3× phone particles compressed into the top-left corner — invisible. Introduced v2.17.19 with DPR-aware canvas.
**Fix (v2.17.27):** Replaced `sctx.scale(dpr, dpr)` with `sctx.setTransform(dpr, 0, 0, dpr, 0, 0)` in `sResize()` — resets to exactly `dpr×` each call regardless of prior state.
**Root cause 2 — freeze after typewriter:** The two-flag splash gate (`_splashAnimDone` + `_appLoadDone`) had no top-level timeout. If `await _dropboxEnsureToken()` hangs (OS network stack not ready on desktop PWA), the chain stalls indefinitely — splash never dismisses.
**Fix (v2.17.27–28):** 6s safety timeouts on both gate flags so a stalled fetch degrades gracefully (`_splashAnimDone` timeout added v2.17.28 for symmetry).

---

## BUG-022: Focus fill bar pulsates during active countdown
**Status:** ✅ Verified fixed (v2.17.36)
**Symptom:** During an active focus session the fill bar simultaneously fills left-to-right AND pulsates in opacity — pulsating should only occur when the session is complete ("again?" state).
**Root cause:** `timerCompletePulse` animation runs via `.complete` class on the shared `fillEl`. Two paths left `.complete` stranded: (1) PiP "Again" handler (introduced v2.17.35) reset session state but didn't remove `.complete` from main UI elements — on restore `visibilitychange` restarted `tickFor` so the bar filled while `.complete` was still active. (2) `closeUI(false)` (Esc or task-switch) skips the `remove('complete')` block (inside `if (doResetState)` only) — next `openUI()` called `syncDisplay()` which also doesn't clean `.complete`, so the new task's fill pulsated.
**Fix:** (1) PiP "Again" handler: after resetting state, removes `.complete` from `fillEl`, `timeEl`, `timerEl` and resets fill display. (2) `openUI()`: strips `.complete` from all three elements before `syncDisplay()` — covers all remaining paths.

---

## BUG-023: Top panels flash twice on desktop PWA restore
**Status:** ✅ Verified fixed (v2.17.37)
**Symptom:** Panel open (Habits/Connections/About) → alt-tab away and back → panel flashes twice (brief disappear+reappear with fadeIn animation).
**Root cause:** `_forceRepaint()` sets `#main-app.style.display = 'none'` then `''`. CSS `animation` properties restart when an element re-enters the render tree after its parent was `display:none`. `.config-panel.open` has `animation: fadeIn` — every repaint pass replays it. `_forceRepaint()` runs 5 times on wake; the 500ms and 1500ms passes produce the two clearly visible flashes.
**Fix:** After restoring `display: ''`, synchronously set `animation: none` inline on all `.config-panel.open` elements — suppresses fadeIn before any paint. `toggleConfig()`, `toggleInfo()`, `toggleHabits()` clear the inline `animation` style on open so user-triggered opens still play fadeIn normally.

---

## BUG-024: Per-task focus minutes carry over to next day
**Status:** ✅ Verified fixed (v2.17.44 + v2.17.46 + v2.17.48)
**Symptom:** A task carried to the next day shows focus minutes accumulated from the previous day. Today's focus time counter appears inflated before any work is done. The 🍅 pomodoro count carrying over is intentional — only focus minutes should reset.
**Root cause (v2.17.44):** `stat_focus_mins_date` was only generated as `_getAppDay()` in the backup payload — not persisted to localStorage. On Day 2 startup, the pre-cleanup `dropboxBackup()` stamped yesterday's minutes with today's date. Next sync's date guard passed → `Math.max(0, 90) = 90` restored yesterday's total.
**Fix (v2.17.44):** `stat_focus_mins_date` now saved to localStorage when minutes are earned and on day-reset. Backup uses stored date (not `_getAppDay()`).
**Root cause (v2.17.46):** Backup payload fallback was `|| _getAppDay()` — users upgrading from pre-v2.17.44 (no `stat_focus_mins_date` in localStorage) got today's date stamped on stale minutes, bypassing the date guard.
**Fix (v2.17.46):** Fallback changed to `|| ''` so the guard rejects unknown-date data and treats remote minutes as 0.
**Root cause (v2.17.48 — true root cause):** `applyNewDayCleanup()` had an early `return` at the BUG-020 streak guard — when `stat_streak_date` already matched today (synced from another device), the function returned before resetting `stat_focus_mins_today`.
**Fix (v2.17.48):** Streak increment is now conditional inside `if (streakDate !== todayISO)` block; daily counter reset always runs after.

---

## BUG-025: PiP "Again" lost / shows 25:00 on sleep/wake after session complete
**Status:** ✅ Verified fixed (v2.17.49 + v2.17.52)
**Original symptom (v2.17.49):** After a focus session completes, bring the desktop PWA back to foreground — the "Again" bar flashes twice before settling into normal pulsate.
**Extended symptom (v2.17.52):** Complete a session (timer shows "again?" pulsating, PiP shows "Again"), computer sleeps, on wake PiP shows 25:00 with "Breathe" instead of "Again"; main timer may revert to "00:00".
**Root cause — original flash:** `_onWake` calls `_forceRepaint()` 5 times, each cycling `#main-app` through `display:none → display:''`, resetting all CSS animations — including `timerCompletePulse` on `.complete` elements. 500ms and 1500ms passes produced two visible flashes.
**Fix (v2.17.49):** `_forceRepaint` suppresses `animation` on `.complete` elements after each display cycle; restored after the final 1500ms pass.
**Root cause — extended (three compounding issues):** (1) `pipTick` running branch calls `completeFor` then stops RAF without updating PiP display — the next RAF tick (paused branch detection) never fires. (2) `visibilitychange` PiP handler had `if (st.rem <= 0) return` at top, blocking restore sync for complete sessions. (3) `syncDisplay` called from `_focusReanchor` after sync rebuilds DOM set `timeEl.textContent = fmt(0)` = "00:00", overwriting "again?".
**Fix (v2.17.52):** (1) `pipTick` running branch explicitly shows done state before stopping. (2) `st.rem <= 0` guard moved inside `document.hidden` branch — restore path always syncs PiP. (3) `syncDisplay` re-applies `.complete` classes and "again?" text when `rem === 0 && !running`.

---

## BUG-026: Habit re-checks itself after uncheck
**Status:** ✅ Verified fixed (v2.17.53)
**Symptom:** Uncheck a habit during the day → within ~10s it re-checks itself. Also reproducible on wake or tab return.
**Root cause:** `mergeRemoteData` used a pure set union for `habit_completions`. Uncheck removes today's date locally, but the 7s background sync reads stale Dropbox data (still has the date) and unions it back. The 800ms upload debounce creates a window where the sync fires before the local uncheck is uploaded. Tasks avoid this via timestamped `checked_ids`/`unchecked_ids` LWW arrays; habits had no equivalent.
**Fix (v2.17.53):** Added `habitEvents` — a flat LWW map `{ "habitId::YYYY-MM-DD": { type, at } }` from `today_habit_events` localStorage. `toggleHabitDone` records every check/uncheck with a timestamp. `mergeRemoteData` merges event maps (newer timestamp wins per key), then filters the union of completion dates — dates whose most recent event is `'uncheck'` are excluded. Old data without events passes through unchanged. Events purged after 30 days by `_cleanupHabitEvents()` in `applyNewDayCleanup`. Full-restore gap closed in v2.17.54 (reads `data.habit_events`).

---

## BUG-027: Trello focus timer — re-open idle 25:00 + completed bar stops pulsing
**Status:** ✅ Verified fixed (v2.17.62)
**Symptom (Trello cards only):** (1) complete a session on a Trello card, click away, click back → timer shows 25:00 but doesn't count down; needs an extra click (other task types start on first click). (2) After completion the bar stayed solid and didn't pulse.
**Why Trello-specific:** `openUI()` injects the focus `timerEl` + `kbdHint` right after the focused row, so for a Trello card they become children of `#trelloList` — the only task list re-rendered every ~7s (`loadTrello()` → `renderTrello()`).
**Root cause 1:** the click handler treated any `taskStates[id].rem < TOTAL` as a resumable partial session; a completed session has `rem === 0` (< TOTAL), so it opened the UI but the `rem > 0` resume guard failed → idle 25:00.
**Fix:** gate `rem > 0 && rem < TOTAL`, so a completed session falls through to `start()`.
**Root cause 2:** `renderTrello`'s reposition loop computed `stableChildren` from all `#trelloList` children minus `.removing`; the timer + kbd hint were counted as cards, corrupting the index→sibling mapping and churning the timer every 7s, disrupting the completed pulse.
**Fix:** filter `stableChildren` to `.task[data-taskid]` only (both branches).

---

## BUG-028: Completed focus bar — four sub-fixes

**Status:** Fixed across v2.17.63 / v2.17.65 / v2.17.68 / v2.17.94 — verified ✅

**Sub-fix A — v2.17.63: "again?" shown a tick late (all task types)**
`tickFor` hit 0, drew "00:00" + full bar, then scheduled another tick; `completeFor` only ran on the *next* tick (~1s later). Fix: call `completeFor` in the same tick that reaches zero and `return` — skip the dead "00:00" frame.

**Sub-fix B — v2.17.65: bar holds static ~1.5s on window return**
`_forceRepaint` suppressed `.complete` animation on every wake pass but only restored after 1500ms. Fix: restore infinite animations (`.complete`, `.ai-badge`, `.done-star`) on the very next `rAF` inside `_forceRepaint` itself.

**Sub-fix C — v2.17.68: bar flashes 2–3× on window return**
Sub-fix B's per-pass rAF created rapid suppress→restore cycles (each of the 4 passes suppressed then immediately restored). Fix: restore moved outside `_forceRepaint`; animations suppressed 0–500ms across all passes, then restored **once** at 520ms in a single external rAF. The 1500ms slow-GPU pass gets `skipAnimSuppression=true`.

**Sub-fix D — v2.17.94: still one flash on window return (reported after C was verified)**
Architectural dead end: with a CSS animation, every `display:none/block` repaint pass restarts it from keyframe 0 (opacity 1) — if the bar is mid-pulse (0.65) at wake, one visible jump is *guaranteed*; suppress/restore only relocates it. Fix: pulse converted to Web Animations API (`_pulseComplete(fillEl, on)` beside the fillEl definition; same approach as the v2.17.72 checkmark). A WAAPI timeline is unaffected by display toggles — measured continuous (opacity 0.766 → 0.760 across the exact `_forceRepaint` cycle, headless Chrome). CSS `timerCompletePulse` keyframes deleted; `.complete` removed from `_resumeAfterRepaint`; reduced-motion preference respected via `matchMedia` gate.

**Verified fixed:** ✅ (Can, Jun 2026) — A–C verified earlier; D (WAAPI pulse) validated on device, no flash on window return.

---

## BUG-030: Checkmark animation lags ~30s on iOS PWA open

**Status:** Fixed v2.17.71/72 — verified ✅

**Symptom:** For the first ~20-30 seconds after opening the PWA on iOS, checking a task shows a laggy or stuttering checkmark animation. After ~30s it becomes smooth and stays smooth.

**Root cause A — SVG stroke-dashoffset (main cause):** The old `checkDraw` animation used `stroke-dashoffset`, a paint-triggered CSS property that cannot be GPU-composited. It forces the SVG rasterizer to recalculate and repaint the stroke path geometry on every animation frame (CPU-only). iOS WebKit's JavaScriptCore JIT compiler spends ~20-30s JIT-compiling a large bundle; during JIT commit phases the main thread stalls briefly, which stalls paint-path animations.

**Root cause B — canvas Metal pipeline cold:** The first `fireEmberDrift` call (first task check after open) triggers iOS Metal GPU shader compilation for the Canvas 2D context — a ~100-200ms one-time stall.

**Fix (v2.17.71/72):** Replaced `checkDraw` (stroke-dashoffset) with `checkPop` (`transform: scale + opacity` on the svg element). Both properties are compositor-animatable — they run on the GPU thread entirely separate from JS/JIT. Also added a 2s idle canvas pre-warm (`clearRect(0,0,1,1)`) in `init()` to trigger Metal compilation before the first tap.

**Verified fixed:** ✅ (Can, Jun 2026) — iOS warmup lag gone. Rapid back-to-back desktop checks improved but can still skip in extreme cases (edge case, low priority).

**Re-opened Jun 2026:** Can reported checkmark still janky and slow for first ~20s on iOS cold start. WAAPI animation itself was correct; two remaining warm-up gaps were found:

**Root cause C — incomplete Metal pre-warm:** `clearRect(0,0,1,1)` only warms the basic Metal clear-rect shader. `fireEmberDrift` uses `createRadialGradient` + `arc`/`fill` + `fillText` — different shader types, each compiled on first use. These compiled mid-animation (during the 150ms `checkPop` WAAPI playback), causing GPU stalls that made the animation appear janky.

**Root cause D — haptic switch element lazy DOM creation:** `_iosHaptic()` created `<input type="checkbox" switch>` and appended it to `document.body` on the very first `_haptic()` call (inside the task check handler, before `svg.animate()`). The DOM append + style recalc added latency on cold first tap.

**Fix (v2.17.105):** Pre-warm now runs `createRadialGradient` + `arc`+`fill` + `fillText` at off-screen coordinates (-1000,-1000) during the same 2s idle timer, so all Metal shaders `fireEmberDrift` uses are cached before first tap. Haptic switch element moved to eager creation at IIFE init time, removing the DOM append from the hot path.

**Verify:**
- Force-quit iOS PWA, reopen cold
- Within first 5 seconds, check a task → checkmark should pop crisply with no stutter or jank
- Animation should feel identical at 5s and at 60s

**Awaiting re-verification** (Can, Jun 2026)

---

## BUG-031: Red error dot invisible on mobile PWA

**Status:** Fixed v2.17.75 — verified ✅

**Symptom:** When a sync/storage error fires on the installed iOS PWA, the red dot never appears in view — errors go unnoticed on mobile.

**Root cause:** `#errorIndicator` was `position: fixed; top: 8px`. The viewport uses `viewport-fit=cover`, so the standalone PWA canvas extends under the iOS status bar (~47–59px tall). The dot rendered behind the status bar — present in the DOM, outside the visible safe area. Other fixed elements (sticky header, add bar) already compensate with `env(safe-area-inset-top/bottom)`; the error dot and `#errorPanel` were missed.

**Fix (v2.17.75):** `top: calc(env(safe-area-inset-top, 0px) + 8px)` on the dot, `+ 24px` on the panel. Desktop unaffected (inset is 0).

**Verified:** Force-showed dot in desktop Chrome with 47px safe-area-inset injected via CSS override — dot rendered at top: 55px, fully clear of the status bar. Confirmed no active errors on the app (dot hidden = no errors, expected healthy state).

**Verified fixed:** ✅ (Can, Jun 2026)

---

## BUG-033: Morning nudge missing on first cold-start of the day

**Status:** Fixed v2.17.125

**Symptom:** Cold-start the app in the morning — nudge doesn't appear. Switch away and back → nudge appears via `_onWake()`.

**Root cause:** `morning_nudge_count` is set by `applyNewDayCleanup()`, which runs in the sync startup block *after* `init()` has already called `checkMorningNudge()`. If the user dismissed yesterday's nudge (click removes the key), `init()`'s call finds no count and hides the nudge. `applyNewDayCleanup()` recalculates the count from current tasks but `checkMorningNudge()` is not called afterward — nudge never appears until `_onWake()` fires on next focus. Dropbox restore path already fixed this for Dropbox users; local-only path and Dropbox-failed-restore fallback were missing it.

**Fix:** Added `if (typeof checkMorningNudge === 'function') checkMorningNudge()` after `applyNewDayCleanup()` in the sync startup block. Idempotent — safe even if Dropbox path already ran it.

**Verified fixed:** ✅ Jun 2026

---

## BUG-034: Morning nudge AI text swaps mid-read (Tier 1→2 upgrade)

**Status:** Fixed v2.17.125

**Symptom:** User is reading the rule-based nudge message; 1–5 seconds later the text fades out and is replaced by the AI-generated version. Surprising/jarring even with the 200ms fade.

**Root cause:** `checkMorningNudge()` always performed the DOM swap when the AI fetch resolved, regardless of how long the nudge had been visible. No guard on elapsed time.

**Fix:** Added `const _nudgeShownAt = Date.now()` before the async `_fetchMorningNudgeAI()` call. In the `.then()` callback, if `Date.now() - _nudgeShownAt > 3000`, the DOM swap is skipped. AI text is still written to localStorage cache — shows immediately (no swap) on the next cold start.

**Verified fixed:** ✅ Jun 2026

---

## BUG-036: This Week data differs between web app and mobile app

**Status:** Fixed v2.17.132

**Symptom:** The "This Week" grid in About shows different past-day tallies (tasks/focus/habits) on the web app vs the mobile app. Today's column matches; prior days diverge.

**Root cause:** `today_daily_history` was local-only — never included in the Dropbox backup payload. Each device writes its own snapshot of "yesterday" in `applyNewDayCleanup()` when it first opens after midnight, and those snapshots never crossed devices.

**Fix:** Added `daily_history` to the Dropbox backup (schema **5.2 → 5.3**) and union-merged it on both restore paths via `_mergeDailyHistory(local, remote)`: union by date, on a duplicate keep the richer snapshot (higher `tasksDone`, tiebreak `focusMins`); cap 30 days. Backward compatible.

**Verified fixed:** ✅ Jun 2026
