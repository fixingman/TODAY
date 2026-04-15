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

**Status:** Fixed v2.12.58–2.12.59 — awaiting verification

**Symptom:** Open app or return to it → shows "last sync 45m ago", doesn't pull new data. No error visible.

**Root causes & fixes:**
- **Token refresh fails silently** → Now retries once with 2s backoff + errors route to red dot (v2.12.58)
- **Rev comparison skips sync** → `lastDropboxRev` reset to `null` on every return (v2.12.59)
- **2s delay before sync on return** → Sync now runs immediately; 2s delay only for ticker start (v2.12.59)
- **Silent `catch(e) {}`** → All sync catches use `_logSyncError()` → red dot indicator (v2.12.58)
- **PWA fallback** → `window.focus` triggers rev reset + sync for standalone mode (v2.12.59)

**Verify:** Make changes on Device A → switch to idle Device B → tasks should appear within 1-2s. If sync fails, red dot should appear.

**Verified fixed:** ☐

---

## BUG-003: "Failed to fetch" errors in production, disappear on refresh

**Status:** Fixed v2.12.58 + v2.12.61 — awaiting re-verification

**Symptom:** Red dot shows "Failed to fetch" and "dropboxUpdateUI is not defined". App works after refresh.

**Root causes found:**
1. `dropboxUpdateUI()` was called in 8 places but never defined (renamed to `renderConnections()` at some point). Broke token refresh entirely — every attempt threw, token never refreshed, all Dropbox sync failed.
2. Sleep/wake: `navigator.onLine` reports `true` before network is actually ready. Sync fires immediately, fetch fails.
3. Original silent `catch(e) {}` blocks hid all of the above.

**Fixes:**
- v2.12.58: `_logSyncError` + token retry (made errors visible, but retry still hit the undefined function)
- v2.12.61: Replaced all `dropboxUpdateUI()` → `renderConnections()`. Added 500ms delay to sync on wake for network recovery.

**Verify:** After computer sleep/wake, no red dot should appear. If it does, errors should be transient (self-heal on next tick, not "is not defined").

**Verified fixed:** ☐

---

## BUG-004: Task list blank after inactivity, returns on click

**Status:** Fixed v2.12.57 + v2.12.66 — awaiting re-verification

**Symptom:** Leave desktop PWA idle → return → task list area blank (both manual AND Trello). Click anywhere → tasks reappear instantly. No data loss.

**Root cause:** Two issues compounding:
1. `contain: layout style` on `.task-list` gave the browser permission to skip repainting isolated layers after background suspension
2. Repaint fix only targeted `#manualList` — Trello list was also going blank

**Fixes:**
- v2.12.57: Forced repaint on `visibilitychange`, `window.focus`, `pageshow` (targeted `manualList` only)
- v2.12.66: Removed `contain: layout style` from `.task-list`. Repaint now targets `#main-app` to cover all child lists.

**Verify:** Open desktop PWA with both manual and Trello tasks → minimize/switch away for 2-3 min → return. Both lists should be visible immediately without clicking. Repeat over several days.

**Verified fixed:** ☐

---

## BUG-005: Pomodoro session count not shown on Trello tasks

**Status:** Fixed v2.12.56 + v2.12.66 — awaiting re-verification

**Symptom:** Complete focus session on Trello task → 🍅 badge appears momentarily then vanishes.

**Root cause:** Two issues:
1. v2.12.56 fix added session count patching to `renderTrello` — but as a separate DOM update after `innerHTML` overwrite
2. The real problem: `newText` (used for `innerHTML` comparison) didn't include the session badge, but `textEl.innerHTML` did. They never matched → innerHTML was rewritten every 7s tick → badge destroyed

**Fix (v2.12.66):** Session badge now included in `newText` construction. Comparison is stable — `innerHTML` only overwrites when text/link/badge actually changes. Removed redundant separate session patch.

**Verify:** Start and complete a focus session on a Trello task → `1 🍅` should appear and persist (not vanish after a few seconds). Complete second session → `2 🍅`.

**Verified fixed:** ☐

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
