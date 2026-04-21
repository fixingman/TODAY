# TODAY — Known Bugs

> Tracks persistent bugs, their fixes, and verification status. Read at session start (Tier 1).

---

## BUG-001: Triage dismissed on one device, still shows on the other

**Status:** ✅ Verified fixed (v2.12.59–2.12.60)

**Symptom:** Complete triage on Device A → Device B still shows triage bar on return.

**Root cause:** `checkTriageBar()` ran synchronously on tab return, before async `syncDropbox()` could pull the dismissed state from Dropbox.

**Fix:** Sync runs immediately on return (v2.12.59). `checkTriageBar()` deferred 3s on both `visibilitychange` and `window.focus` so sync has time to pull `triage_dismissed` from remote (v2.12.60). `mergeRemoteData` already handles hiding the bar when remote has today's dismissal.

**Verify:** During triage window (8pm–1am), dismiss triage on Device A → wait 10s → return to Device B. Bar should not appear, not even briefly.

**Verified fixed:** ☑

---

## BUG-002: Dropbox sync fails silently — stale data on return

**Status:** ✅ Verified fixed (v2.12.58–2.12.61)

**Symptom:** Open app or return to it → shows "last sync 45m ago", doesn't pull new data. No error visible.

**Root causes & fixes:**
- **Token refresh fails silently** → Now retries once with 2s backoff + errors route to red dot (v2.12.58)
- **Rev comparison skips sync** → `lastDropboxRev` reset to `null` on every return (v2.12.59)
- **2s delay before sync on return** → Sync now runs immediately; 2s delay only for ticker start (v2.12.59)
- **Silent `catch(e) {}`** → All sync catches use `_logSyncError()` → red dot indicator (v2.12.58)
- **PWA fallback** → `window.focus` triggers rev reset + sync for standalone mode (v2.12.59)

**Verify:** Make changes on Device A → switch to idle Device B → tasks should appear within 1-2s. If sync fails, red dot should appear.

**Verified fixed:** ☑

---

## BUG-003: Sync errors in production — "Failed to fetch", Trello 405

**Status:** Fixed v2.12.58 + v2.12.61 + v2.12.67 + v2.13.4 — awaiting verification

**Symptom:** Red dot shows sync errors. Originally "dropboxUpdateUI is not defined". Later Trello 405. Most recently: red dot on every WiFi drop — "Failed to fetch" from sync attempts.

**Root causes found and fixed:**
1. `dropboxUpdateUI()` called but never defined → fixed v2.12.61
2. Sleep/wake: `navigator.onLine` true before network ready → fixed v2.12.61 (wake silent flag)
3. Silent `catch(e) {}` blocks hid everything → fixed v2.12.58
4. Trello 405/429 errors had no user-facing message → fixed v2.12.67
5. Background Trello load errors invisible → fixed v2.12.67 (routed to red dot)
6. Network errors treated as real errors → fixed v2.13.4: `_logSyncError` detects "Failed to fetch" / "NetworkError" / "Load failed" / "CORS" and suppresses red dot. Console only.

**Verify:** Disconnect WiFi briefly while app is open → no red dot should appear. Reconnect → sync resumes. Red dot should only appear for actual API errors (expired token, wrong key).

**Verified fixed:** ☐

---

## BUG-004: Task list blank after inactivity, returns on click

**Status:** ✅ Verified fixed (v2.12.57 + v2.12.66)

**Symptom:** Leave desktop PWA idle → return → task list area blank (both manual AND Trello). Click anywhere → tasks reappear instantly. No data loss.

**Root cause:** Two issues compounding:
1. `contain: layout style` on `.task-list` gave the browser permission to skip repainting isolated layers after background suspension
2. Repaint fix only targeted `#manualList` — Trello list was also going blank

**Fixes:**
- v2.12.57: Forced repaint on `visibilitychange`, `window.focus`, `pageshow` (targeted `manualList` only)
- v2.12.66: Removed `contain: layout style` from `.task-list`. Repaint now targets `#main-app` to cover all child lists.

**Verify:** Open desktop PWA with both manual and Trello tasks → minimize/switch away for 2-3 min → return. Both lists should be visible immediately without clicking. Repeat over several days.

**Verified fixed:** ☑

---

## BUG-005: Pomodoro session count not shown on Trello tasks

**Status:** ✅ Verified fixed (v2.12.56 + v2.12.66)

**Symptom:** Complete focus session on Trello task → 🍅 badge appears momentarily then vanishes.

**Root cause:** Two issues:
1. v2.12.56 fix added session count patching to `renderTrello` — but as a separate DOM update after `innerHTML` overwrite
2. The real problem: `newText` (used for `innerHTML` comparison) didn't include the session badge, but `textEl.innerHTML` did. They never matched → innerHTML was rewritten every 7s tick → badge destroyed

**Fix (v2.12.66):** Session badge now included in `newText` construction. Comparison is stable — `innerHTML` only overwrites when text/link/badge actually changes. Removed redundant separate session patch.

**Verify:** Start and complete a focus session on a Trello task → `1 🍅` should appear and persist (not vanish after a few seconds). Complete second session → `2 🍅`.

**Verified fixed:** ☑

---

## Cross-cutting: `_logSyncError` (v2.12.58)

Helper function that makes sync failures visible in PWA without devtools. Pushes to `_errorLog` array and shows the red dot error indicator. Click the red dot → alert shows all errors with tagged sources. Defined in the Error Monitoring section near the top of `<script>`.

---

## Future: Consolidate wake handlers into `_onWake()`

**Status:** Not started — document only
**Priority:** Low — refactor, not a bug

**Problem:** 5 separate `visibilitychange` listeners + `window.focus` handler all fire on wake, each doing different things with different delays. Current wake sequence:

| Source | Delay | Action |
|--------|-------|--------|
| visibilitychange (line ~7194) | 0ms | Force repaint (BUG-004) |
| visibilitychange (line ~7194) | 3s | Deferred triage check (BUG-001) |
| visibilitychange (line ~7938) | 0ms | Rev reset + sync (BUG-002) |
| visibilitychange (line ~7938) | 2s | Start ticker |
| visibilitychange (line ~7938) | 3s | Clear wake silent flag |
| visibilitychange (line ~8317) | 0ms | SW update check |
| visibilitychange (line ~9913) | 0ms | Focus timer correction |
| visibilitychange (line ~10053) | 0ms | PiP check |
| window.focus | 0ms | Repaint + rev reset + sync + wake silent |
| window.focus | 3s | Triage check + clear wake silent |

**Risk:** Changing any wake behaviour requires finding and updating multiple scattered listeners. Easy to miss one or introduce timing conflicts.

**Proposed solution:** Create a single `_onWake()` function that orchestrates the full sequence. Each module registers a callback instead of its own listener. The SW, focus timer, and PiP listeners can stay separate (they're module-scoped and unrelated to sync/triage).

**When to do this:** Next time a wake-related bug surfaces or we need to change wake timing. Don't refactor proactively — current code works.

---

## BUG-006: Focus timer bar splits from task after returning to window

**Status:** ✅ Verified fixed (v2.12.65)

**Symptom:** During focus mode on desktop PWA, leave window for a few minutes, return — gap appears between the task row and the countdown timer bar.

**Root cause:** Sync fires on return → `mergeRemoteData` detects changes → `renderManual()` does `list.innerHTML = ...` which destroys the task DOM element. The timer bar was placed as a sibling via `taskEl.after(timerEl)`. Old element gone, new one created — timer bar orphaned, gap appears.

**Fix:** Added `window._focusReanchor()` — exposed from focus mode IIFE, called at end of `renderManual()`. Finds new task element by `data-taskid`, re-attaches timer bar and kbd hint, updates `uiTaskEl` reference.

**Verify:** Start focus session on a manual task → minimize/switch away for 2+ min → return. Timer bar should stay flush against the task row with no gap.

**Verified fixed:** ☑

---

## BUG-007: Triage bar stays visible during and after triage

**Status:** Fixed v2.13.2 — awaiting verification

**Symptom:** Click "Review" on triage bar → overlay opens but bar stays visible behind it. After triage completes and overlay closes, bar is still on screen for ~1s.

**Root cause:** `checkTriageBar()` fires every ~7s from sync. Previous fixes checked `overlay.classList.contains('hidden')` to decide whether bar should show — but this was fragile and could race with DOM changes. The overlay backdrop is also 60% transparent, so even with correct z-index the bar's accent border bleeds through.

**Fix (v2.13.2 — rewrite):** Added `_triageActive` boolean flag. Clean three-state model:
- `triageExpand()`: sets `_triageActive = true`, hides bar, shows overlay
- `triageMinimize()`: sets `_triageActive = false`, hides overlay, shows bar
- `triageClose()`: sets `_triageActive = false`, hides both, sets dismissed
- `checkTriageBar()`: if `_triageActive`, bar stays hidden unconditionally — no classList checks needed

**Verify:** During triage window, click Review → bar should disappear completely. Complete triage → bar should not reappear.

**Verified fixed:** ☐

---

## BUG-008: Dragged task jumps back to previous position

**Status:** ✅ Verified fixed (v2.12.72)

**Symptom:** Drag a task to reorder on mobile PWA → task briefly stays in new position, then jumps back to the old position. Not reproducible reliably.

**Root cause:** Race condition between local drag save and sync pull.

1. User drags → `_saveOrder` reorders `manualTasks` locally → `dropboxAutoSave()` debounced 800ms
2. During the 800ms window, mobile PWA can fire `visibilitychange` (iOS drops notification, briefly loses focus, etc.)
3. `visibilitychange` handler resets `lastDropboxRev = null` and calls `syncDropbox()` immediately
4. `syncDropbox` fetches remote metadata → rev doesn't match null → triggers `dropboxRestore(true)` → `mergeRemoteData`
5. Remote still has OLD order (our upload hasn't happened yet) → `orderedTasks` uses remote order → local order overwritten
6. `renderManual()` runs → task visually jumps back to old position
7. 800ms timer fires later → uploads the (now-reverted) order → drag is lost

**Fix:** `syncDropbox` returns early if `_pendingBackup === true`. Pull waits for our upload to complete. Covers all drag paths (manual tasks, habits) since both use `dropboxAutoSave`.

**Verify:** On mobile PWA, drag tasks around several times in succession. Each reorder should persist. No visual jump-back.

**Verified fixed:** ☑

---

## BUG-009: Task aging opacity broken — day 1 immediately muted

**Status:** ✅ Verified fixed (v2.12.73)

**Symptom:** After 1 day, a task gets visually muted (minimum opacity). No three-stage fade (day 3-4, 5-6, 7+) as intended.

**Root cause:** CSS selectors using attribute-starts-with:
```css
.task[data-age-days^="1"],  /* intended: day 10-19 */
.task[data-age-days^="2"],  /* intended: day 20-29 */
...
{ opacity: 0.35; }
```
But `^="1"` also matches `"1"` (day 1). Same for `^="2"` → day 2, `^="3"` → day 3, etc. So single-digit aged tasks immediately got the "day 7+" minimum opacity, overriding the intended intermediate stages for days 3-4 and 5-6.

**Fix:** Replaced fragile string-match selectors with `data-age-bucket="young|mid|old"` set in `taskHTML` based on age:
- Day 0-2: no attribute (opacity 1)
- Day 3-4: `young` (opacity 0.75)
- Day 5-6: `mid` (opacity 0.55)
- Day 7+: `old` (opacity 0.35)

CSS is now three trivial selectors, no ambiguity. Also updated `_logSession` to remove the new attribute when a focus session resets age.

**Verify:** Add a task, wait 3+ days, confirm it fades gradually. Or manually edit localStorage's `today_manual[N].lastActive` to an older timestamp and reload.

**Verified fixed:** ☑

---

## BUG-010: Habits did not roll over at 1:02am

**Status:** ✅ Verified fixed (v2.12.74 + v2.12.77)

**Symptom:** At 1:23am Stockholm, habits still showed yesterday's completion state. Tasks cleaned up correctly, date header showed today. Dot strip hadn't shifted — today's dot was missing.

**Root causes found:**
1. (v2.12.74) `checkNewDay` gated by `_getAppDay()` which used 1am shift — blocked cleanup between midnight and 1am. Fixed by aligning at midnight.
2. (v2.12.77) **The real cause:** `_habitTodayISO()` used `toISOString().slice(0,10)` which returns **UTC** date. In Stockholm (UTC+2), at 1:23am local, UTC was still 11:23pm yesterday. So `_habitTodayISO()` returned yesterday's date. Tasks used `toDateString()` (local time) — correctly today. Same issue in `_getHabitDates()` and `_getHabitStrength()`.

**Fix (v2.12.77):** All three functions now use local date formatting (`getFullYear/getMonth/getDate`) instead of `toISOString()`.

**Verify:** After midnight local time (but before UTC midnight), check habits panel. Dot strip should show today's empty dot. Completing a habit should fill today's dot, not yesterday's.

**Fix:**
1. `_getAppDay()` now returns calendar date at midnight (matches habits)
2. Triage window narrowed from 8pm-1am to 8pm-midnight
3. `visibilitychange` handler now calls `checkNewDay()` immediately (was waiting 2s + 7s for first ticker tick after resume)

**Verify:** Leave the app open past midnight → habits should roll over instantly. Close the app before midnight, reopen after → habits should roll over within ~1 second of returning.

**Verified fixed:** ☑

**Status:** Fixed v2.13.5 + v2.13.6 — awaiting verification

**Symptom:** PiP countdown runs behind the main app timer. When the main timer hits 00:00, PiP still shows time remaining. Chime fires late — after PiP shows 00:00, not simultaneously.

**Root cause:** Two compounding issues:

1. **PiP was driven by throttled ticks.** The PiP only updated when `_pipSync()` was called from `tickFor`. `tickFor` uses `setTimeout(1000)`. When the main tab is hidden (which is always when PiP is open), browsers aggressively throttle `setTimeout` — each "1 second" tick can take 1.5s, 2s, or longer. PiP mirrored these stale ticks and fell further behind real wall time.

2. **Chime tied to throttled tick.** `completeFor()` (which calls `playChime()`) was only triggered when `tickFor` hit zero — the same throttled path. So even if PiP showed 00:00, the chime wouldn't fire until the next throttled tick arrived.

**Fix (v2.13.5) — Timer display:** PiP now drives its own `requestAnimationFrame` loop inside the PiP window. Uses a fixed reference point (`refTime` + `refRem`): real remaining = `refRem - (Date.now() - refTime)`. Completely independent of main tab tick rate. Handles pause/resume by re-anchoring reference on state change.

**Fix (v2.13.6) — Chime:** PiP RAF calls `completeFor()` directly when `currentRem <= 0`. Guard added to `completeFor()`: `if (!st.running) return` prevents double chime/session if `tickFor` also fires.

**Verify:** Start a focus session, switch to another app so PiP appears. PiP should count down in sync with wall clock. When timer ends, chime should fire at the same moment PiP shows 00:00.

**Verified fixed:** ☐

---
