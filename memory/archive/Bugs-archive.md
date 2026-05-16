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

## BUG-005: Pomodoro session count not shown on Trello tasks
**Status:** ✅ Verified fixed (v2.12.56 + v2.12.66)
**Root cause:** `newText` (used for innerHTML comparison in Trello patch path) didn't include the session badge. `innerHTML` was rewritten every 7s tick → badge destroyed.
**Fix:** Session badge included in `newText`. Comparison now stable — innerHTML only overwrites when text/link/badge actually changes.

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
**Root cause:** `touchend` handler was calling `renderManual()` synchronously after drop, which rebuilt the list from `manualTasks` array (not yet updated with new order). Task appeared to snap back.
**Fix:** Drag-end updates `manualTasks` array order before triggering render.

---

## BUG-009: Task aging opacity broken — day 1 immediately muted
**Status:** ✅ Verified fixed (v2.12.73)
**Root cause:** Age calculation used `Date.now()` vs task ID timestamp comparison in UTC, crossing local midnight boundaries incorrectly.
**Fix:** Age calculation uses `_localISO()` for consistent local-time date comparison.

---

## BUG-010: Habits did not roll over at 1:02am
**Status:** ✅ Verified fixed (v2.12.74 + v2.12.77)
**Root cause:** `checkNewDay()` used `_getAppDay()` string comparison, but habit completion was stored with UTC ISO timestamps. Near midnight, UTC and local date diverged → habits didn't roll over.
**Fix:** All habit date comparisons use `_habitTodayISO()` which wraps `_localISO()`. Day boundary unified at local midnight.

---

## BUG-006: _onWake() consolidation (not a bug — backlog refactor)
**Status:** 📋 Backlog — not started
**Note:** Four separate `visibilitychange` handlers scattered across the codebase. Not a bug, but a maintenance risk. Tracked in `Backlog.md`.

---

## BUG-013: Focus timer jumps 8-10 seconds on minimize/PiP restore
**Status:** ✅ Verified fixed (v2.14.9)
**Root cause:** `tickFor` used `setTimeout(1000)` which browsers throttle when tab is hidden (1s tick could take 1.5–2s). On restore, several missed ticks fired rapidly — timer jumped visually.
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

---

## BUG-004: App blank after sleep/wake during focus

**Status:** ✅ Verified fixed (v2.12.57 + v2.12.66 + v2.16.20 + v2.16.21 + v2.17.1)

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

**Alternative approach considered:** Observer-based detection rejected — observers report geometry, not pixel paint state. GPU compositor failure is invisible to JS.

---

## BUG-018: Phantom SOON tasks reappear after day
**Status:** ✅ Verified fixed (v2.17.9)
**Root cause:** `mergeRemoteData` excluded `deleted_ids` from SOON merge but not `pastTasks` IDs. Completed/aged tasks move to PAST (not `deleted_ids`), so remote backup still had them in `soon_tasks`. On next day's sync, merge restored them to SOON.
**Fix:** Built `pastIds = new Set(pastTasks.map(t => t.id))` before SOON merge. Added `pastIds` exclusion to both local and remote sides of the SOON union. Tasks already in PAST cannot re-enter SOON via sync.

---

## BUG-019: Star explosion missing on mobile at splash end
**Status:** ✅ Verified fixed (v2.17.21)
**Root causes:**
1. **Canvas coordinate system** — `position:fixed;inset:0` on a canvas with `width=innerWidth*dpr` attribute caused some browsers to use the attribute as intrinsic CSS size, making the display box `innerWidth*dpr` px wide. Drawing coords landed at `x*dpr` on screen — burst appeared off-screen on mobile. **Fix:** explicit `style.width/height` in CSS px in `sResize()`.
2. **Burst origin unreliable** — `getBoundingClientRect()` on the star at dismiss time returned stale/wrong layout values (parent opacity transition just triggered). **Fix:** capture star center 600ms after `startSplash()` into `_burstX/_burstY`.
3. **Animation sequence wrong** — app was revealed at T+630ms while explosion still playing. **Fix:** typewriter → explosion (waits for `sLoop` to complete) → app cross-fades in.
4. **Dark pause after explosion** — app reveal delayed `FADE_OUT+30ms` after explosion end. **Fix:** app cross-fade starts simultaneously with splash fade-out.
5. **Loop ran too long** — `SPLASH_MAX_FRAMES=240` kept invisible sub-particles alive. **Fix:** stop loop when `maxAlpha < 0.1`; cap reduced to 90 frames.
