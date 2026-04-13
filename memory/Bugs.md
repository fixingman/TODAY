# TODAY — Known Bugs

> Persistent bugs that need verified fixes. Each bug tracks the problem, root cause, fix attempts, and verification status.

---

## BUG-001: Triage dismissed on one device, still shows on the other

**Status:** Fixed in v2.12.59–2.12.60 — awaiting verification
**First noticed:** ~v2.12.27
**Previous fix attempts:** v2.12.27 (triage sync), v2.12.40 (read fresh from localStorage on tab return), v2.12.43 (overlay hides on sync)

**Symptoms:**
- Complete triage on Device A
- Open Device B (or return to it) before end of day
- Device B still shows triage bar/overlay, even though Device A already dismissed it

**Root cause:**
`checkTriageBar()` ran synchronously on tab return, before the async `syncDropbox()` could complete. The sequence was:
1. Tab becomes visible
2. `triageDismissedToday` reads from localStorage (stale — sync hasn't pulled yet)
3. `checkTriageBar()` shows triage bar immediately
4. Sync pulls remote data seconds later → `mergeRemoteData` hides the bar

The triage bar would flash on screen for a few seconds before being hidden — or worse, if sync failed silently, it would stay.

**Fix (v2.12.59 + v2.12.60):**
1. v2.12.59: Sync now runs immediately on tab return (no 2s delay), so the window is shorter
2. v2.12.60: `checkTriageBar()` deferred 3s on tab return via `setTimeout`. This gives sync time to complete and pull the dismissed state from Dropbox. `mergeRemoteData` already handles setting `triageDismissedToday = true` and hiding the bar/overlay when remote has today's dismissal.

**How to verify:**
1. Have undone tasks on both devices during triage window (8pm–1am)
2. On Device A, complete triage (keep/soon/let go all tasks) → bar dismisses
3. Wait ~10 seconds for Dropbox sync to push
4. Switch to Device B (or bring it to foreground)
5. Triage bar should NOT appear — not even a brief flash
6. If triage bar does flash briefly and then disappears, the fix is partially working but sync is slower than 3s

**Verified fixed:** ☐

---

## BUG-002: Dropbox sync fails silently on fresh load / tab return

**Status:** Fixed in v2.12.58–2.12.59 — awaiting verification
**Severity:** High — user sees stale data with no indication sync failed

**Symptoms:**
- Open app fresh → shows "last sync 45m ago" and doesn't pull new data
- Changes made on Device A don't appear on Device B even after fresh load
- No error shown — app looks normal but data is stale

**Root causes and fixes:**

### Path A: Token expired silently → Fixed v2.12.58
- `_dropboxEnsureToken()` now retries once with 2s backoff (Netlify cold start)
- Failures routed to `_logSyncError` → red dot visible in PWA

### Path B: Rev comparison skips sync → Fixed v2.12.59
- `lastDropboxRev` reset to `null` on tab return (`visibilitychange`) and PWA focus
- Forces a fresh metadata check even if Dropbox CDN hasn't propagated the new rev yet

### Path C: Tab return 2s delay → Fixed v2.12.59
- `syncDropbox()` and `syncTrello()` now run immediately on `visibilitychange`
- 2s delay kept only for starting the ticker (not the initial pull)
- PWA `window.focus` also triggers immediate sync as fallback

### Path D: `catch(e) {}` swallows everything → Fixed v2.12.58
- All sync catch blocks now use `_logSyncError()` → red dot error indicator

**How to verify:**
1. Make changes on Device A (add/check tasks), wait for sync indicator to update
2. Switch to Device B (which has been idle)
3. Tasks should appear within 1-2 seconds — no 2s+ delay, no stale data
4. Check "last sync" timestamp in Connections — should show "just now"
5. If sync fails, red dot should appear with tagged error message
6. Test specifically in PWA standalone mode (not just browser tab)

**Verified fixed:** ☐

---

## BUG-003: "Failed to fetch" errors in production, disappear on refresh

**Status:** Fixed in v2.12.58 — awaiting verification
**Severity:** Medium — intermittent, no permanent data loss, but confusing

**Symptoms:**
- Console shows "Failed to fetch" errors in production
- App may appear to work but API calls (AI, Dropbox, Trello) silently fail
- Refreshing the page fixes it

**Root cause:**
Every `catch(e) {}` in the sync module swallowed errors completely — no logging, no UI feedback. "Failed to fetch" appeared in the console only when it bubbled as an unhandled rejection (rare). Most failures were invisible. Netlify function cold starts could timeout `_dropboxEnsureToken()`, causing all subsequent Dropbox calls to fail silently for the session.

**Fix (v2.12.58):**
1. Added `_logSyncError(source, msg)` helper — pushes to the red dot error indicator AND logs to console. Errors now visible in PWA without devtools.
2. All sync catch blocks now use `_logSyncError` with tagged sources: `Dropbox` (token refresh, sync, restore, rev seed, initial pull), `Trello` (sync), `Sync` (startup).
3. `_dropboxEnsureToken()` retries once with 2s backoff — catches Netlify cold start timeouts.

**How to verify:**
1. Open app as PWA on desktop
2. If sync errors occur, the red dot should appear in the top-right
3. Click the red dot — error log should show tagged messages like `[Dropbox] Token refresh attempt 1: Failed to fetch`
4. After refresh, if the error was a cold start, it should not recur (retry handles it)
5. Monitor over several days — any "Failed to fetch" should now be visible and identifiable

**Verified fixed:** ☐

---

## BUG-004: Task list disappears after inactivity, returns on click

**Status:** Fixed in v2.12.57 — awaiting verification
**Severity:** High — core UX broken, user thinks tasks are lost
**Previous fix attempts:** v2.12.41 (clear stale `.focusing` class on init and bfcache restore)

**Symptoms:**
- Leave app inactive for a while (tab in background or screen off)
- Return to app — task list area appears empty/blank
- Click anywhere on the task list area → tasks reappear instantly
- No data loss — tasks were always there, just not visible
- **Desktop only** — not observed on mobile
- **No focus timer active** — app is simply idle in background
- **Running as PWA** (standalone mode via Add to Dock) — not a browser tab

**Root cause:**
Most likely browser paint deferral, but in PWA standalone context rather than tab throttling. When a PWA window is minimized or loses focus for extended periods, the OS suspends its renderer. On restore, the DOM may be correct but the compositor layer isn't repainted. The `contain: layout style` on `.task-list` makes this worse — it tells the browser the list's layout is isolated, giving it permission to skip repainting that layer.

PWA standalone mode doesn't fire `visibilitychange` the same way as browser tabs — some browsers only fire it on minimize/restore, not on window focus changes. This means the forced repaint fix may not trigger in all cases.

Clicking anywhere forces a repaint, which is why tasks "come back" on click — JS isn't restoring them, the browser is finally painting.

**Fix (v2.12.57):**
Forced repaint on three entry points:
1. `visibilitychange` → when tab/app becomes visible, toggle `manualList.style.display` off/on with `offsetHeight` read in between to force reflow
2. `pageshow` (bfcache) → same forced repaint after clearing stale focus state
3. `window.focus` → fallback for PWA standalone mode, which may not fire `visibilitychange` on window restore/focus

Both run before any sync or triage checks.

**How to verify:**
1. Open app on desktop (Chrome or Safari) with tasks visible
2. Switch to another tab or minimize window
3. Wait at least 2-3 minutes (longer = more likely to reproduce)
4. Switch back to app tab
5. Task list should be visible immediately — no blank state, no click needed
6. Repeat several times over a day to confirm

**Verified fixed:** ☐

---

## BUG-005: Pomodoro session count not shown on Trello tasks

**Status:** Fixed in v2.12.56 — awaiting verification
**Severity:** Low — cosmetic, data is tracked but not displayed after patch render

**Symptoms:**
- Complete a focus session on a Trello task
- Session count (🍅) badge doesn't appear or update on the Trello task row
- Manual tasks and habits show session counts correctly

**Root cause:**
`renderTrello()` has two code paths:
1. **New task** (line ~5001): uses `taskHTML(task, 'trello')` which correctly includes session count via `_getTrelloFocus()`
2. **Existing task patch** (line ~4976): surgically updates text, due badge, and done state — but **never touches the session count badge**

After a focus session completes, `_logSession` updates `today_trello_focus` in localStorage, but `renderTrello`'s patch path doesn't re-read or update the `.session-count` span. The badge stays empty until a full page reload triggers path 1.

**Fix (v2.12.56):**
Added session count patching to the existing-task branch in `renderTrello()`, after done state toggle. Reads `_getTrelloFocus()[id]`, updates `.session-count` text and `has-sessions` class. Also handles the reverse (count reset to 0).

**How to verify:**
1. Connect Trello with at least one task visible
2. Click a Trello task to start a focus session (desktop)
3. Complete or cancel the session (check the task or click away)
4. Trello task should show `1 🍅` badge immediately — no refresh needed
5. Start and complete a second session → badge should update to `2 🍅`

**Verified fixed:** ☐

---
