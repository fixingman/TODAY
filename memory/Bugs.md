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

**Status:** ✅ Verified fixed (v2.12.58 + v2.12.61 + v2.12.67 + v2.13.4 + v2.14.1)

**Symptom:** Red dot shows sync errors. Originally "dropboxUpdateUI is not defined". Later Trello 405. Most recently: red dot on every WiFi drop — "Failed to fetch" from sync attempts.

**Root causes found and fixed:**
1. `dropboxUpdateUI()` called but never defined → fixed v2.12.61
2. Sleep/wake: `navigator.onLine` true before network ready → fixed v2.12.61 (wake silent flag)
3. Silent `catch(e) {}` blocks hid everything → fixed v2.12.58
4. Trello 405/429 errors had no user-facing message → fixed v2.12.67
5. Background Trello load errors invisible → fixed v2.12.67 (routed to red dot)
6. Network errors treated as real errors → fixed v2.13.4: `_logSyncError` detects "Failed to fetch" / "NetworkError" / "Load failed" / "CORS" and suppresses red dot. Console only.
7. `unhandledrejection` had no network filter → fixed v2.14.1: "Promise: Failed to fetch" at 00:21:16 was bypassing `_logSyncError` entirely. Same filter now applied.

**Verify:** Disconnect WiFi briefly while app is open → no red dot should appear. Reconnect → sync resumes. Red dot should only appear for actual API errors (expired token, wrong key).

**Verified fixed:** ☑

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

**Status:** Fixed v2.12.65 + v2.14.8 + v2.15.7 — awaiting verification

**Symptom:** During focus mode, leave window for a few minutes, return — gap appears between the task row and the countdown timer bar. Timer floats near the bottom of the screen detached from the task.

**Root cause (original — v2.12.65):** Sync fires on return → `mergeRemoteData` detects changes → `renderManual()` does `list.innerHTML = ...` which destroys the task DOM element. The timer bar was placed as a sibling via `taskEl.after(timerEl)`. Old element gone, new one created — timer bar orphaned.

**Fix (v2.12.65):** Added `window._focusReanchor()` — called at end of `renderManual()`. Finds new task element by `data-taskid`, re-attaches timer bar and kbd hint, updates `uiTaskEl` reference.

**Regression (v2.14.5 → reported v2.14.7):** BUG-012 fix added a `renderTrello()` call inside `mergeRemoteData` that ran standalone — no `_focusReanchor()` after it.

**Fix (v2.14.8):** Added `_focusReanchor()` call at the end of `renderTrello()`.

**Continued regression on Trello tasks (v2.15.7):** `_focusReanchor` only re-attached when `newTaskEl !== uiTaskEl` (element reference changed). But the Trello patch path reuses existing elements and repositions them with `list.insertBefore()`. Same element reference, just moved — so `_focusReanchor` did nothing. Timer stayed at old DOM position while task moved.

**Fix (v2.15.7):** Added a second condition to `_focusReanchor`: also re-attach if `timerEl.previousElementSibling !== newTaskEl` — i.e. if the timer is no longer immediately after the task in the DOM, regardless of element reference identity.

**Verify:** Start focus on a Trello task → minimize for 2+ min → return. Timer bar should stay flush against the task row. Sync may reorder tasks — timer must follow the task. Also test manual tasks.

**Verified fixed:** ☐

---

## BUG-007: Triage bar stays visible during and after triage

**Status:** Fixed v2.13.2 + v2.16.6 — awaiting verification (mobile)

**Symptom:** Click "Review" on triage bar → overlay opens but bar stays visible behind it. After triage completes and overlay closes, bar is still on screen for ~1s.

**Root cause:** `checkTriageBar()` fires every ~7s from sync. Previous fixes checked `overlay.classList.contains('hidden')` to decide whether bar should show — but this was fragile and could race with DOM changes. The overlay backdrop is also 60% transparent, so even with correct z-index the bar's accent border bleeds through.

**Fix (v2.13.2 — rewrite):** Added `_triageActive` boolean flag. Clean three-state model:
- `triageExpand()`: sets `_triageActive = true`, hides bar, shows overlay
- `triageMinimize()`: sets `_triageActive = false`, hides overlay, shows bar
- `triageClose()`: sets `_triageActive = false`, hides both, sets dismissed
- `checkTriageBar()`: if `_triageActive`, bar stays hidden unconditionally — no classList checks needed

**Continued regression on mobile (v2.16.6):** After triage completes, the 3s summary shows with the overlay still open. `_triageActive` is `true`. But on mobile, tapping the backdrop during this 3s window calls `triageMinimize()`, which was clearing `_triageActive = false` and restoring the bar (`classList.remove('hidden')`). Bar flashed briefly before `triageClose()` fired.

**Fix (v2.16.6):** `triageMinimize()` now checks `triageDismissedToday` — if already true, it calls `triageClose()` directly instead of restoring the bar. Keeps `_triageActive` locked until the proper close path.

**Verify:** Complete triage → summary shows → tap backdrop during 3s summary. Bar should NOT flash. Also verify backdrop tap during active triage (before completion) still minimizes correctly.

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

---

## BUG-011: PiP timer delayed vs main app timer + chime fires late

**Status:** ✅ Verified fixed (v2.13.5 + v2.13.6)

**Symptom:** PiP countdown runs behind the main app timer. When the main timer hits 00:00, PiP still shows time remaining. Chime fires late — after PiP shows 00:00, not simultaneously.

**Root cause:** Two compounding issues:

1. **PiP was driven by throttled ticks.** The PiP only updated when `_pipSync()` was called from `tickFor`. `tickFor` uses `setTimeout(1000)`. When the main tab is hidden (which is always when PiP is open), browsers aggressively throttle `setTimeout` — each "1 second" tick can take 1.5s, 2s, or longer. PiP mirrored these stale ticks and fell further behind real wall time.

2. **Chime tied to throttled tick.** `completeFor()` (which calls `playChime()`) was only triggered when `tickFor` hit zero — the same throttled path. So even if PiP showed 00:00, the chime wouldn't fire until the next throttled tick arrived.

**Fix (v2.13.5) — Timer display:** PiP now drives its own `requestAnimationFrame` loop inside the PiP window. Uses a fixed reference point (`refTime` + `refRem`): real remaining = `refRem - (Date.now() - refTime)`. Completely independent of main tab tick rate. Handles pause/resume by re-anchoring reference on state change.

**Fix (v2.13.6) — Chime:** PiP RAF calls `completeFor()` directly when `currentRem <= 0`. Guard added to `completeFor()`: `if (!st.running) return` prevents double chime/session if `tickFor` also fires.

**Verify:** Start a focus session, switch to another app so PiP appears. PiP should count down in sync with wall clock. When timer ends, chime should fire at the same moment PiP shows 00:00.

**Verified fixed:** ☑

---

## BUG-012: Completed overdue Trello task shows unchecked on other device / disappears immediately

**Status:** Fixed v2.14.5 + v2.16.5 — awaiting verification

**Symptom 1 (original):** Complete an overdue Trello card on Device A → Device B shows it unchecked. Manual refresh fixes it.

**Symptom 2 (new):** Complete an overdue Trello card on any device → it disappears from TODAY immediately, before end of day.

**Root cause (original — v2.14.5):** Race between `loadTrello()` and Dropbox sync. `loadTrello` runs with stale `doneIds` → includes overdue card as undone → Dropbox sync updates `doneIds` → DOM patches done, but subsequent `renderTrello` re-shows it undone.

**Fix (v2.14.5):** `mergeRemoteData` re-filters `trelloTasks` after updating `doneIds`, evicting done+overdue cards.

**Root cause (v2.16.5):** The filter logic in both `loadTrello` and the v2.14.5 `mergeRemoteData` eviction said `done + overdue = hide` — without checking **when** it was done. Checking an overdue card today immediately hid it. The "due today" path correctly shows done cards all day; overdue lacked that grace.

**Fix (v2.16.5):** Both `loadTrello` filter and `mergeRemoteData` eviction now check `today_checked_ids` timestamp. Overdue + done: if checked today → show until EOD (same as due-today). If checked before today → hide immediately.

**Verify:** Complete an overdue Trello card → it should remain visible (with done styling) until midnight, not disappear immediately. Next day open → it should be gone.

**Verified fixed:** ☐

---

## BUG-013: Focus timer jumps 8-10 seconds on minimize/PiP restore

**Status:** ✅ Verified fixed (v2.14.9)

**Symptom:** During a focus session, minimize the app or switch to PiP, then return. The timer jumps forward 8-10 seconds — more time has passed than the actual elapsed.

**Root cause:** Double-counting between `tickFor` and the `visibilitychange` wall-clock correction.

`tickFor` runs every ~1000ms via `setTimeout` and decrements `st.rem--`. When the tab is hidden, browsers throttle `setTimeout` — ticks fire every 2-3s instead of 1s. When the tab returns, `visibilitychange` corrects:

```javascript
const elapsed = Math.floor((Date.now() - st.wallStart) / 1000);
st.rem = Math.max(0, st.rem - elapsed);
```

`wallStart` was set when the timer started and never updated during ticks. So `elapsed` = total time since timer started — including time that `tickFor` already counted via `st.rem--`. The correction double-counts those throttled ticks.

**Example:** Tab hidden 30s, `tickFor` fires 5 times (throttled) → `st.rem -= 5`. Return → `elapsed = 30` → `st.rem -= 30`. Total decrement: 35. Should be 30. 5 seconds over-corrected.

**Fix (v2.14.9):** Update `st.wallStart += 1000` on every tick inside `tickFor`. Now `wallStart` tracks "when the last tick fired". On return, `elapsed = time since last tick` = only the throttling gap, not time already counted.

**Verify:** Start focus session → minimize for 30s → restore. Timer should show approximately 30s elapsed, not 38-40s.

**Verified fixed:** ☑

---

## BUG-014: PiP doesn't reappear after restoring app during focus

**Status:** Fixed v2.15.5 — awaiting verification

**Symptom:** Focus running → minimize → PiP appears ✅. Restore app (via PiP "open app" button) → minimize again → PiP does NOT appear.

**Root cause:** `documentPictureInPicture.requestWindow()` requires a user gesture. The first minimize works because the focus start button was recently pressed (gesture still valid). When the tab restores and the user minimizes again, `visibilitychange` fires but has no user gesture → `requestWindow()` silently fails → no PiP.

**Fix (v2.15.5):** Added `_pipRestoredFromButton` flag. When user taps "open app" in PiP, the flag is set and `window.focus()` is called. On tab restore, if flag is set, the PiP window is kept alive (not closed) instead of being destroyed. On next minimize, the existing PiP window is still valid — we just sync the display and let it float back up. No new `requestWindow()` needed → no gesture required.

**Edge cases handled:**
- Normal restore (switching tabs, not via PiP button) → PiP still closes as before
- Focus ends while PiP kept alive → `_pipClose()` closes it via `closeUI()`
- `_pipRestoredFromButton` reset immediately after use

**Verify:** Start focus → minimize (PiP appears) → tap "open app" in PiP → minimize again → PiP should reappear.

**Verified fixed:** ☐

---

## BUG-015: AI repeats same aging task suggestion every session

**Status:** ✅ Verified fixed (v2.15.2)

**Symptom:** The AI consistently shows the same aging Trello task in the intro message session after session, even after the user dismissed or acted on it. Cooldown appeared to work for manual tasks but not Trello.

**Root cause:** Suggestion cooldown pruning only iterated over `manualTasks` IDs when building the retention set. Trello task IDs were never included, so all Trello cooldown entries were deleted nightly during cleanup. Trello tasks appeared perpetually "new" to the cooldown system despite repeated suggestions.

**Fix (v2.15.2):** Updated the pruning step to build the ID retention set from both `manualTasks` and `trelloTasks`. `suggestionCooldowns` (7-day cooldown) and `suggestionHistory` (50 entries, Dropbox-synced) were already implemented correctly — only the cleanup was wrong.

**Verify:** Dismiss or act on an aging Trello task suggestion → it should not reappear in the AI intro for at least 7 days.

**Verified fixed:** ☑

---

## BUG-016: AI break_down chips show generic "Add step" label

**Status:** ✅ Verified fixed (v2.15.6)

**Symptom:** When the AI uses the `break_down` action and returns subtask suggestions, all action chips showed the label "Add step" regardless of step content. Also: AI was using colons in chip labels ("Focus: deep work") and starting responses with conversational openers ("It is.", "Yeah —") mismatched to a fresh message context.

**Root cause:** `break_down` handler rendered chips with a hardcoded `"Add step"` label string instead of extracting the step text from the returned `add_task` action payload.

**Fix (v2.15.6):**
1. `break_down` chips now use the actual step text as the label, capped at 28 chars with ellipsis
2. System prompt updated: banned colons in chip labels — labels must be noun/verb phrases only
3. System prompt updated: banned mid-conversation openers — AI message must open fresh, not as a reply

**Verify:** Ask AI to break down a task → chips should show abbreviated step text, no colons. AI intro should not start with "It is." or "Yeah —" style fragments.

**Verified fixed:** ☑

---

## BUG-017: Focus minutes only recorded on full session completion

**Status:** ✅ Verified fixed (v2.16.0)

**Symptom:** Focus time shown in stats (flow bar, triage summary, morning nudge, AI context) only accumulates when the 25-minute timer runs to zero. Stopping early with Escape, switching tasks, or closing the timer manually — those minutes are lost. Users noticed minutes only appeared when checking a task (which often happens immediately after a natural completion).

**Root cause:** `_trackFocusTime()` was only called in `closeUI(doResetState)` when `doResetState === true`. The only caller that passes `true` is `completeFor()` — the natural timer completion path. All other `closeUI` callers pass `false`:
- Switching to a different task: `closeUI(false)`
- Escape key: `closeUI(false)`
- visibilitychange / PiP restore: `closeUI(false)`

**Fix (v2.16.0):** Removed the `doResetState` condition from `_trackFocusTime` call in `closeUI`. Now tracks on every close. Guards already in `_trackFocusTime` prevent issues: `st.tracked` prevents double-counting on natural completion, `timeSpentMins <= 0` discards sub-minute sessions.

**Verify:** Start a focus session, run for 5+ minutes, press Escape. Focus minutes in the flow bar should increase. Repeat with task-switch path.

**Verified fixed:** ☐

---
