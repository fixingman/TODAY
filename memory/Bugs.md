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

**Status:** Fixed v2.12.57 — awaiting verification

**Symptom:** Leave desktop PWA idle → return → task list area blank. Click anywhere → tasks reappear instantly. No data loss.

**Root cause:** Browser paint deferral in PWA standalone. OS suspends renderer when window loses focus. On restore, DOM is correct but compositor layer isn't repainted. `contain: layout style` on `.task-list` gives browser permission to skip repainting. PWA may not fire `visibilitychange` on window focus.

**Fix:** Forced repaint (`display` toggle + `offsetHeight` reflow) on three entry points: `visibilitychange`, `window.focus` (PWA fallback), `pageshow` (bfcache).

**Verify:** Open desktop PWA with tasks → minimize or switch away for 2-3 min → return. Task list should be visible immediately without clicking. Repeat over several days.

**Verified fixed:** ☐

---

## BUG-005: Pomodoro session count not shown on Trello tasks

**Status:** Fixed v2.12.56 — awaiting verification

**Symptom:** Complete focus session on Trello task → 🍅 badge doesn't appear until page reload.

**Root cause:** `renderTrello()` has a surgical patch path for existing tasks that updates text, due badge, and done state — but skipped session count.

**Fix:** Added `_getTrelloFocus()[id]` read and `.session-count` DOM update to the existing-task branch in `renderTrello()`.

**Verify:** Start and complete a focus session on a Trello task → `1 🍅` should appear immediately. Second session → `2 🍅`.

**Verified fixed:** ☐

---

## Cross-cutting: `_logSyncError` (v2.12.58)

Helper function that makes sync failures visible in PWA without devtools. Pushes to `_errorLog` array and shows the red dot error indicator. Click the red dot → alert shows all errors with tagged sources. Defined in the Error Monitoring section near the top of `<script>`.

---
