# TODAY — Known Bugs

> Persistent bugs that need verified fixes. Each bug tracks the problem, root cause, fix attempts, and verification status.

---

## BUG-001: Triage dismissed on one device, still shows on the other

**Status:** Open
**First noticed:** ~v2.12.27
**Previous fix attempts:** v2.12.27 (triage sync), v2.12.40 (read fresh from localStorage on tab return), v2.12.43 (overlay hides on sync)

**Symptoms:**
- Complete triage on Device A
- Open Device B (or return to it) before end of day
- Device B still shows triage bar/overlay, even though Device A already dismissed it

**Root cause:**
On tab return, `visibilitychange` fires and checks `triage_dismissed` in localStorage immediately — but Dropbox sync hasn't run yet at that point. The dismissed state from Device A hasn't arrived. By the time sync pulls the remote state (next 7s tick), the triage bar is already visible.

**The real problem:**
`checkTriageBar()` runs *before* `syncDropbox()` on tab return. The sequence is:
1. Tab becomes visible
2. `triageDismissedToday` reads from localStorage (still local/stale)
3. `checkTriageBar()` shows triage bar
4. ...seconds later, sync pulls remote data and hides it

**Correct fix direction:**
On tab return, trigger sync *first*, then check triage *after* sync completes. Or: defer `checkTriageBar()` until after the first sync cycle on visibility return.

**Verified fixed:** ☐

---

## BUG-002: Dropbox sync fails silently on fresh load / tab return

**Status:** Open
**Severity:** High — user sees stale data with no indication sync failed

**Symptoms:**
- Open app fresh → shows "last sync 45m ago" and doesn't pull new data
- Changes made on Device A don't appear on Device B even after fresh load
- No error shown — app looks normal but data is stale

**Multiple failure paths identified:**

### Path A: Token expired silently
- `_dropboxEnsureToken()` checks `dropbox_token_expiry` — if expired, tries refresh
- If refresh fails (network, Netlify cold start, etc.), it catches silently (line 7136: `catch(e) {}`)
- Token stays expired, `freshToken` is stale/invalid
- The download fetch at line 7939 fails with 401 or network error
- Caught by the outer `catch(e) {}` at line 7965 — **completely silent**
- `last_sync_read` is NOT updated → status shows old timestamp ("45m ago")
- But no error is shown to the user

### Path B: Download succeeds but rev seeding prevents ticker sync
- On load, after merge, the rev is seeded (line 7959: `_dbxSetRev(m.rev)`)
- On tab return, `syncDropbox()` compares rev: `if (!rev || rev === lastDropboxRev) return` (line 7814)
- If the rev didn't change between load and tab return (because another device wrote but Dropbox CDN hasn't propagated), sync skips entirely

### Path C: Tab return 2s delay + stale localStorage
- `visibilitychange` handler delays `syncAll()` by 2 seconds (line 7869)
- Meanwhile the Housekeeping `visibilitychange` listener (line 7154) reads stale localStorage immediately
- Even after 2s, if Path A or B apply, sync still doesn't happen

### Path D: `catch(e) {}` swallows everything
- Both the inner try/catch (line 7935) and outer try/catch (line 7967) on load are completely silent
- The `syncDropbox()` ticker function also has `catch(e) {}` (line 7818)
- Any failure — network, JSON parse, 401, 409 — is invisible

**Correct fix direction:**
1. On sync failure, update `last_sync_read` status to show "sync failed" or at least don't show a stale timestamp as if everything is fine
2. On fresh load, if the initial pull fails, retry with backoff instead of giving up silently
3. On tab return, run sync immediately (not 2s delay) and surface errors
4. Token refresh failure should be visible — not caught silently

**Verified fixed:** ☐

---

## BUG-003: "Failed to fetch" errors in production, disappear on refresh

**Status:** Open
**Severity:** Medium — intermittent, no permanent data loss, but confusing

**Symptoms:**
- Console shows "Failed to fetch" errors in production
- App may appear to work but API calls (AI, Dropbox, Trello) silently fail
- Refreshing the page fixes it

**Likely causes (in order of probability):**

### 1. Netlify function cold start timeout
- `/.netlify/functions/dropbox-refresh` and `ai-assist` are serverless functions
- Cold starts can take several seconds — browser may time out the fetch
- On refresh, the function is already warm → works fine
- Particularly affects `_dropboxEnsureToken()` which calls `dropbox-refresh` — if this times out, all subsequent Dropbox fetches fail because the token is expired

### 2. Momentary network loss (mobile)
- PWA on mobile can lose connectivity briefly (cell handoff, sleep/wake)
- `navigator.onLine` may still report `true` during brief drops
- All in-flight fetches fail with "Failed to fetch"
- On refresh, network is back

### 3. Stale service worker
- Old SW active + new app code = possible mismatch
- SW caches same-origin GET requests (line 127) — if a Netlify function URL was ever fetched via GET by accident, stale cached response could cause issues
- Refresh triggers SW update → fixed

### 4. CORS or Dropbox API hiccup
- Dropbox occasionally returns unexpected responses
- `BYPASS_ORIGINS` in SW correctly skips Dropbox domains, but if Dropbox redirects to an unlisted domain, SW might intercept

**Why it's hard to diagnose:**
- Every `catch(e) {}` in the sync module swallows the error silently (see BUG-002)
- The error indicator (red dot) shows console errors, but "Failed to fetch" gives no detail about which fetch failed
- No retry mechanism — once a fetch fails, it waits for the next 7s tick

**Correct fix direction:**
1. Add context to catch blocks — log *which* fetch failed (Dropbox download, metadata, token refresh, Trello, AI)
2. Add retry with backoff for critical fetches (token refresh, Dropbox sync)
3. If `_dropboxEnsureToken()` fails, don't attempt subsequent Dropbox calls — they'll all fail too
4. Consider showing a subtle sync status indicator (not just "45m ago")

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
