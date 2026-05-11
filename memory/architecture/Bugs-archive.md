# Bugs Archive

> Verified fixed bugs. Full root cause + fix detail preserved here.
> Active / awaiting bugs → `Bugs.md`

---

## BUG-001: Triage dismissed on one device, still shows on the other
**Status:** ✅ Verified fixed (v2.12.59–2.12.60)
**Root cause:** `triageDismissedToday` was a local boolean — not read from localStorage on wake. Other device's dismissal was in Dropbox backup but the local flag was never refreshed.
**Fix:** On `visibilitychange` and `window.focus`, re-read `triage_dismissed` from localStorage after sync settles (3s delay). `mergeRemoteData` applies remote dismissal. `_triageBarSilent` prevents bar showing during the grace window.

---

## BUG-002: Dropbox sync fails silently — stale data on return
**Status:** ✅ Verified fixed (v2.12.58–2.12.61)
**Root cause:** Silent `catch(e) {}` blocks, renamed function (`dropboxUpdateUI` → `renderConnections`), and network errors reaching the red dot. Multiple sync paths had no error visibility.
**Fix:** Removed silent catches, fixed renamed function at all call sites, added `_logSyncError` with network error filtering, added red dot indicator.

---

## BUG-003: Red dot on network loss
**Status:** ✅ Verified fixed (v2.12.58 + v2.12.61 + v2.12.67 + v2.13.4 + v2.14.1)
**Root cause:** `_logSyncError` had no network error filter — "Failed to fetch" triggered red dot on every WiFi drop. `unhandledrejection` had no filter either.
**Fix:** `_logSyncError` detects network errors (Failed to fetch, NetworkError, Load failed, CORS, ERR_INTERNET, Failed to update a ServiceWorker) → console only, no red dot. Same filter applied to `unhandledrejection`.

---

## BUG-004: App blank after sleep/wake during focus
**Status:** ✅ Verified fixed (v2.12.57 + v2.12.66 + v2.16.20 + v2.16.21 + v2.17.1)
**Root causes (compounding):**
1. `contain: layout style` on `.task-list` — browser skipped repainting isolated layers
2. `.focusing` class stuck on `#main-app` after wake — recedes all non-focused elements to 7% opacity
3. Async timing gap — `renderManual()` destroys `.focused` element; `_focusReanchor` re-attaches moments later. During gap: `.focusing` on, nothing `.focused` → blank
4. GPU compositor layers not ready after long sleep — synchronous repaint too early
**Fixes:** v2.12.57: force repaint. v2.12.66: removed `contain: layout style`. v2.16.20: `.focusing` cleanup immediate. v2.16.21: 350ms deferred `_clearStaleFocusing()`. v2.17.1: multi-pass repaint (immediate + rAF + rAF + 500ms).
**Note:** Observer-based detection considered and rejected — observers report geometry, not pixel paint state. GPU compositor failure is invisible to JS.

---

## BUG-005: Pomodoro session count not shown on Trello tasks
**Status:** ✅ Verified fixed (v2.12.56 + v2.12.66)
**Root cause:** `newText` (used for innerHTML comparison in Trello patch path) didn't include the session badge. `innerHTML` was rewritten every 7s tick → badge destroyed.
**Fix:** Session badge included in `newText`. Comparison now stable — innerHTML only overwrites when text/link/badge actually changes.

---

## BUG-006: _onWake() consolidation
**Status:** ✅ Done (v2.17.0) — refactor, not a user-facing bug
**Note:** Four separate `visibilitychange` handlers scattered across codebase. Consolidated into `window._onWake()` called from sync module `visibilitychange`, `window.focus`, and `pageshow`. Three closure-bound handlers (SW update, timer wall-clock, PiP) left in their closures.

---

## BUG-007: Triage bar stays visible during and after triage
**Status:** ✅ Verified fixed (v2.13.2 + v2.16.6)
**Root cause (original):** `_triageActive` flag not set during overlay open — `checkTriageBar()` showed bar while overlay was open.
**Root cause (mobile regression):** Backdrop tap during 3s post-triage summary called `triageMinimize()` which restored the bar even though `triageDismissedToday` was already true.
**Fix (v2.13.2):** `_triageActive` locks bar hidden while overlay is open.
**Fix (v2.16.6):** `triageMinimize()` checks `triageDismissedToday` — if true, routes to `triageClose()` instead.

---

## BUG-008: Dragged task jumps back to previous position
**Status:** ✅ Verified fixed (v2.12.72)
**Root cause:** `touchend` handler called `renderManual()` synchronously after drop, rebuilding the list from `manualTasks` array not yet updated with new order. Task appeared to snap back.
**Fix:** Drag-end updates `manualTasks` array order before triggering render.

---

## BUG-009: Task aging opacity broken — day 1 immediately muted
**Status:** ✅ Verified fixed (v2.12.73)
**Root cause:** Age calculation used `Date.now()` vs task ID timestamp in UTC, crossing local midnight boundaries incorrectly.
**Fix:** Age calculation uses `_localISO()` for consistent local-time date comparison.

---

## BUG-010: Habits did not roll over at 1:02am
**Status:** ✅ Verified fixed (v2.12.74 + v2.12.77)
**Root cause:** `checkNewDay()` used `_getAppDay()` string comparison, but habit completion was stored with UTC ISO timestamps. Near midnight, UTC and local date diverged → habits didn't roll over.
**Fix:** All habit date comparisons use `_habitTodayISO()` which wraps `_localISO()`. Day boundary unified at local midnight.

---

## BUG-013: Focus timer jumps 8-10 seconds on minimize/PiP restore
**Status:** ✅ Verified fixed (v2.14.9)
**Root cause:** `tickFor` used `setTimeout(1000)` which browsers throttle when tab is hidden. On restore, several missed ticks fired rapidly — timer jumped visually.
**Fix:** Wall-clock correction on restore. `wallStart` timestamp used to calculate true elapsed time. PiP RAF uses its own wall-clock anchor, immune to throttling.

---

## BUG-014: PiP not reappearing after restoring app during focus
**Status:** ✅ Verified fixed (v2.15.5 + v2.16.19)
**Root cause (original):** `requestWindow()` requires user gesture. Second minimize had no gesture.
**Root cause (v2.16.19 — manual restore):** Browser auto-closes PiP on dock/Alt+Tab restore (`pagehide` fires → `pipWindow = null`). OS minimize button has no accessible user gesture.
**Fix (v2.15.5):** `_pipRestoredFromButton` flag — PiP button tap carries gesture, keeps PiP alive.
**Fix (v2.16.19):** `_hadPiP` flag. On restore, if `_hadPiP` and focus active, reopens PiP using the dock-click gesture. `_hadPiP` cleared on explicit close or focus end.

---

## BUG-015: AI repeats same aging task suggestion every session
**Status:** ✅ Verified fixed (v2.15.2)
**Root cause:** Suggestion cooldown pruning only iterated `manualTasks` IDs. Trello task IDs were never in the retention set → all Trello cooldowns deleted nightly → Trello tasks appeared perpetually "new".
**Fix:** Pruning builds ID set from both `manualTasks` and `trelloTasks`.

---

## BUG-016: AI break_down chips show generic "Add step" label
**Status:** ✅ Verified fixed (v2.15.6)
**Root cause:** `break_down` handler rendered chips with hardcoded `"Add step"` label instead of extracting step text from payload.
**Fix:** Chips use actual step text, capped at 28 chars. System prompt updated: banned colons in labels, banned mid-conversation openers.

---

## BUG-017: Focus minutes only recorded on full session completion
**Status:** ✅ Verified fixed (v2.16.0)
**Root cause:** `_trackFocusTime()` only called when `doResetState=true` in `closeUI()`. Only `completeFor()` passed `true`. Escape/task-switch/early close lost all minutes.
**Fix:** Removed `doResetState` condition. `_trackFocusTime` called on every `closeUI`. Guards (`st.tracked`, `timeSpentMins <= 0`) prevent double-counting.
