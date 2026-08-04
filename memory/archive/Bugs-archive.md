# Bugs Archive

> Verified fixed bugs. Full root cause + fix detail preserved here.
> Active / awaiting bugs → `Bugs.md`
> **Ordering rule:** newest first (highest BUG number on top, BUG-001 at the bottom).

---

## BUG-065: Focus mode re-opens itself after you leave it; timer torn loose on fast switch

**Symptom:** Can's report — switching focus between tasks quickly breaks things; focus comes back to a task after leaving it; "focus component leftovers stay on the screen." Suspected sync.

**Investigation (reproduced before any edit):** Not Dropbox sync and not the Trello focus map — but the 7-second sync tick was the trigger, since it drives `renderTrello()`/`renderManual()`.

**Root cause:** `closeUI(doResetState)` cleared `today_focus_session` only when `doResetState` was true. Every user-facing exit passes **false** — Escape, click-outside, task switch (inside `openUI`), PiP close; only `_focusOnCheck` passed true. So any exit short of completing a task left a live-looking session in localStorage, and `_tryRestoreFocusSession()` (wired into both renderers by v2.43.0) re-opened focus on it at the next render. Its only guard was `if (uiTaskId) return`, which passes once the UI is closed. Self-perpetuating: the restored session re-saves every tick. Reproduced with no switching at all — focus, Escape, `renderManual()` → focus open again.

**Second fault (older, latent):** `closeUI` defers DOM teardown 200ms for the CSS transition; `openUI` calls `closeUI(false)` synchronously when switching. The stale teardown then fired after the new session was live, running `document.body.appendChild(timerEl)` and `appEl.classList.remove('focusing')` — reparenting the timer out from under the active task. Predates v2.43.0 and used to self-heal via `_focusReanchor()`; v2.43.0 made the window destructive.

**Fix (v2.43.7):** (1) clear `today_focus_session` synchronously on every close, ungated; (2) `_restoreAttempted` latch makes restore cold-start-only, deliberately not set when the task element is absent so the Trello-not-yet-loaded retry survives; (3) `focusGen` counter lets the deferred teardown detect supersession and skip the shared timer chrome, while still releasing its own task and never stripping `.focused` from whatever is live (A→B→A within 200ms).

**Lesson:** v2.43.0 added a persisted key and a restore path, but did not audit who *clears* the key. The clearing was gated behind a flag that every real exit path sets to false — so the feature worked only on the one path that was tested (session completes).

**Verified fixed:** ✅ 2026-07-31 (Can, real device) — same day as the regression shipped.

---

## BUG-063: Focus sessions completing just after midnight are not recorded

**Symptom:** Can's report — focus time completed shortly after midnight "does not record till 1am." A pomodoro finished in the minutes after the day rolled over showed no focus minutes at all.

**Root cause:** A race between the focus-completion write and the daily reset, both driven by the same 7-second ticker. `completeFor()` (or `_trackFocusTime()`) would add 25 minutes to `stat_focus_mins_today`; then, within the same ticker window, `applyNewDayCleanup()` would fire, snapshot the running total as *yesterday's* focus for the history entry, and reset the counter to 0 — discarding the session that had just landed. The window was small but real, and it caught exactly the sessions that straddled the boundary.

**Fix (v2.42.4), three-pronged:**
1. `completeFor()` and `_trackFocusTime()` now compare `stat_focus_mins_date` against `_getAppDay()` *before* incrementing. If the date has flipped, they snapshot the pre-midnight total into `stat_focus_mins_yesterday_snapshot` and start today from 0.
2. `applyNewDayCleanup()` consumes that snapshot for yesterday's `today_daily_history` entry when `stat_focus_mins_date` is already today, and skips resetting the counter — preserving the post-midnight session.
3. The Trello focus map (`today_trello_focus`) got the same guard via `today_trello_focus_date`, so 🍅 session badges earned after midnight survive the clear too.

**Related:** the shared recording path was later factored into `_recordFocusComplete()` (v2.43.0) specifically to avoid duplicating this day-boundary guard across call sites.

**Verified fixed:** ✅ 2026-07-31 (Can, real device)

---

## BUG-060: Completed Trello card reappears as active — persists through normal daily sync

**Symptom:** Can connected TODAY on a new desktop PWA; an old Trello task — already completed in TODAY, with a due date well in the past — showed up on the list as if still active.

**Root cause:** `loadTrello()` fires from `init()` (`index.html:5269`), which runs before the Dropbox restore lands. On a genuinely fresh device, `doneIds` (`index.html:3900`) is still an empty `Set` at that moment — nothing has restored `today_checked_ids` yet. The Trello fetch's own done-filter (`assets/trello.js`) checks `doneIds.has(id)`, finds nothing, and the overdue card passes the "overdue, not done → show" branch. It gets cached to `today_trello_cache` and rendered as active.

This would normally self-correct within one 7-second ticker cycle, except it can't: `syncTrello()` only re-fetches Trello when the board's own `dateLastActivity` changes, and that gets *seeded* to the current value right at load (`index.html:9115`), before the Dropbox merge even runs. Since the task was only ever completed inside TODAY — the actual Trello card was never archived or moved on the real board — `dateLastActivity` never changes again. The phantom card is stuck showing until something else happens to touch that board, or the user manually clicks Refresh.

Same bug class as `checkTriageBar()`/`checkDayNudge()` needing a post-merge re-check (see the `window 'load'` handler's existing "init() ran too early" comments) — `loadTrello()` had just never been given the same treatment.

**Fix (v2.37.7):** new `_reconcileTrelloAfterMerge()` in `trello.js`, called right after `mergeRemoteData()` in the load handler. Re-filters the already-loaded `trelloTasks` against the now-correct `doneIds`, using the identical done+grace-window rule `loadTrello()` itself uses (done, but checked today → still show; done and not checked today → hide). No extra Trello API call — purely a local re-filter of what's already in memory.

**Verify (v2.37.7):** On a device where a Trello task was completed in TODAY (but never archived on the actual Trello board) and has a due date in the past, do a fresh PWA install / fresh Dropbox+Trello connect on a new device. The card should not appear, even momentarily.

**Still persisting after v2.37.7 (Can's report, 2026-07-28):** the fix only covered the cold-start load path. Traced `syncAll()`'s 7s ticker end to end: `syncTrello()` only re-fetches Trello when `dateLastActivity` changes, which — per the root cause above — never happens for a task only ever completed inside TODAY. So the periodic `syncDropbox()` merge (`index.html:8947`, the `fromSync` branch) is the *only* thing that ever learns about the completion during normal use, and nothing else in the tick re-filters `trelloTasks` against the corrected `doneIds` afterward — `mergeRemoteData()` never touches `trelloTasks` at all, and the unconditional per-tick `renderTrello()` just repaints whatever's already in memory. So the phantom card could resurface any time another device completed a Trello-linked task and this device's next sync tick merged that completion — ordinary daily use, not just a one-time fresh install. Separately, the manual "Restore from Dropbox" branch (`index.html:~8951` on) doesn't call `mergeRemoteData()` at all — it wholesale-overwrites `doneIds` directly — so it never had the reconcile call either.

**Fix, extended (v2.40.1):** verified `mergeRemoteData()` is fully synchronous end to end (no `await` anywhere inside it) before concluding it was safe to call `_reconcileTrelloAfterMerge()` immediately after any call to it — `doneIds` and `today_checked_ids` are both guaranteed correct and written before the function returns, no race window. Added the call to two more sites: `syncDropbox()`'s `fromSync` branch (`index.html:8947`) and the manual restore branch (`index.html:~8965`). Deliberately did NOT add it to the `online` reconnect handler (`index.html:9345`) — traced that path and found it already self-corrects via its own existing unconditional `loadTrello()` call a few lines later, which reads `doneIds` live after the merge has already finished; a reconcile call there would only remove a few hundred milliseconds of stale flicker, not fix a persistence bug.

**Verify (v2.40.1):** with two devices sharing a Trello-linked task, complete it on device A; on device B (already open, not freshly installed), wait for the next sync tick (~7s) rather than reloading. The card should disappear from device B without a manual refresh or page reload.

**Confirmed fixed (2026-07-29):** Can verified — a Trello-linked task completed on one device correctly disappeared on a second, already-open device without a manual refresh.

---

## BUG-057: About weekly block differs between devices

**Symptom:** The "This week" (Sunday) / "New week" (Monday) AI text in About shows different sentences on different devices. Reported 2026-07-20 (a Monday).

**Root cause:** `week_reflection_<date>` / `monday_intention_<date>` were device-local localStorage caches — never in the Dropbox backup payload, never merged. Each device called the AI independently and kept its own text. Identical disease to the pre-v2.27.0 morning nudge (and BUG-036's week-grid divergence before it).

**Fix (v2.36.1):** Mirror of the `day_nudge_ai` pattern: both keys added to the backup payload (today's date), merged remote-always-wins in `mergeRemoteData` — first device to push Dropbox owns the day's text; both devices converge on it. About re-renders live if the panel is open when the merge lands.

**Verify:** On a Sunday or Monday, open About on both devices (let sync settle ~10s) — the weekly block should read identically. The device that opened *second* may briefly show its own text before the merge swaps it.

---

## BUG-056: BUG-004 recurrence — blank app after long Mac sleep

**Status:** ✅ Verified fixed (v2.31.9; verified 2026-07-18)

**Symptom:** App renders blank (white) after the Mac wakes from a long sleep; a click restores it. Same symptom family as BUG-004 (fixed v2.17.24 with deferred repaint passes on wake).

**Root cause:** `_onWake()`'s repaint passes topped out at 1500ms, but Mac GPU re-initialization after hours of sleep can take 3–5 seconds. The user's click restored the UI because pointer events get higher paint priority — the deferred passes just missed the window. No other code implicated: `_clearStaleFocusing` and the `fill._pulseAnim` toggle are both correct when no focus session is active.

**Fix (v2.31.9):** Two additional `_forceRepaint` calls at 3000ms and 5000ms in `_onWake()` (passes: 0, 120, 400, 900, 1500, 3000, 5000ms).

---

## BUG-055: Done tasks from today wiped on second-device first-open

**Status:** ✅ Verified fixed (v2.30.1; verified 2026-07-17)

**Symptom:** Tasks checked off on computer (after midnight) disappear from the main list and appear in PAST when the phone is opened for the first time that day. Done count drops.

**Root cause:** `applyNewDayCleanup()` guards on `stat_last_visit` (device-local). A phone that last opened yesterday correctly fires cleanup. After Dropbox restore pulls today's done tasks, the cleanup treats them all as "yesterday's done tasks" and graduates them to PAST — it has no way to distinguish tasks done today from tasks done yesterday.

**Fix (v2.30.1):** Before graduating done tasks to PAST, build `_checkedTodayIds` from `_getCheckedIds()` entries whose `at` timestamp falls on today's local date. Tasks in that set stay in `manualTasks` and keep their `doneIds` entry. `today_checked_ids` is already synced via Dropbox (since v2.18.21), so the second device has the timestamps it needs after restore.

---

## BUG-054: Phantom old tasks resurrect in TODAY list via sync merge

**Status:** ✅ Verified fixed (v2.23.6; verified 2026-07-11)

**Symptom:** Old tasks completed long ago reappeared in the manual TODAY list, unchecked — some with pomodoro icons and aged styling. No unusual device involved; localhost dev copy ruled out.

**Root cause (two holes, same class as BUG-018):** `mergeRemoteData` union-merges `manual_tasks`; a task is protected from resurrection only while tombstoned in `deleted_ids` or present in a local SOON/PAST zone. (1) `_purgePast()` dropped PAST items (done: 7d, let_go/aged: 30d) with no tombstone — once purged, any device whose state still carried the task could resurrect it. (2) `_cleanupDeletedIds()` pruned tombstones after 30 days, so explicit deletions also lost protection.

**Fix (v2.23.6):** `_purgePast()` now returns `{id, at}` tombstones; `applyNewDayCleanup` appends them to `today_deleted_ids`, `mergeRemoteData` injects them into `mergedDeletedMap` before its merged-log persist. Tombstone TTL 30 → 180 days + newest-2000 backstop. Merge filter hardened: `zoneChangedAt > deletedAt` keeps a legitimate pull-back racing a purge tombstone.

**Verified fixed:** ✅ 2026-07-11 — no phantom reappearance over ~2 weeks of normal multi-device use.

---

## BUG-053: Morning nudge dismissal not synced across devices

**Status:** ✅ Verified fixed (v2.18.38; unified under v2.19.0)

**Symptom:** "When I dismiss the manual task nudge on computer it is not dismissed on mobile." Same class as BUG-051 (Trello nudge), but for the manual/carried-over-tasks nudge.

**Root cause:** `morning_nudge_dismissed_YYYY-MM-DD` was written to localStorage on dismiss but never added to the Dropbox backup payload or `mergeRemoteData()`. The two nudges shared almost identical dismiss logic but only one got the cross-device fix (BUG-051).

**Fix (v2.18.38):** mirrored the BUG-051 fix. Added `morning_nudge_dismissed` to backup payload and a merge block in `mergeRemoteData()`. **Superseded by v2.19.0:** both nudges merged into `#dayNudge` with a single `day_nudge_dismissed_` key; `_DISMISS_SYNC` registry handles payload + merge. Legacy field names kept as transition rows.

**Verified fixed:** ✅ Jul 2026

---

## BUG-052: Splash dismissal sometimes slow — sync bookkeeping held the gate

**Status:** ✅ Verified fixed (v2.18.36)

**Symptom:** "Sometimes it takes a long time for the explosion and dismissal of the splash screen — things felt snappier before." Reported alongside BUG-032 (same surface, different mechanism).

**Root cause:** the splash dismisses on a two-flag gate (animation done + app load done). The load flag fired only after the ENTIRE startup sync chain completed serially: Trello board fetch → Dropbox token refresh (extra round-trip whenever the 4-hour token had expired — i.e. every first open of the morning) → backup download + merge → `get_metadata` rev seed → and, when local data differed from remote, an awaited full `dropboxBackup(true)` upload. The last two are bookkeeping — they don't change what's on screen — but added 1–3 awaited round-trips to the gate, up to the 6s safety cap on slow networks.

**Fix (v2.18.36):** `_onAppLoadDone()` now fires right after the pull+merge+render (the point where on-screen data is correct). The rev seed and conditional push-back run *after* the gate as `deferredSyncBookkeeping`, and `startTicker()` moved after that (preserving the "ticker only after rev baseline seeded" invariant — an unseeded rev would make the first tick redundantly re-restore). Gate now waits only for what the user can see.

**Verified fixed:** ✅ Jul 2026

---

## BUG-051: Trello nudge dismissal not synced across devices

**Status:** ✅ Verified fixed (v2.18.23)

**Symptom:** Dismissing the Trello morning nudge on one device leaves it visible on another device — it shows again even though the user already closed it.

**Root cause:** The dismissal flag (`trello_nudge_dismissed_YYYY-MM-DD`) was written to localStorage on click but never included in the Dropbox backup payload or `mergeRemoteData()`. The triage-dismissed state has the same shape and IS synced (BUG-001 fix); the nudge simply wasn't wired up the same way.

**Fix (v2.18.23):** Modelled exactly on `triage_dismissed`. Added `trello_nudge_dismissed` to the backup payload (`'1'` if dismissed today, `''` otherwise). Added a merge block in `mergeRemoteData()` after the triage-dismissed block: if remote value is `'1'` and local hasn't dismissed today, sets the local key and hides `$.trelloNudge` immediately. No full-restore handling needed (same as `triage_dismissed` — the next 7s merge tick applies it on any device that didn't catch the first sync).

**Verified fixed:** ✅ Jul 2026

---

## BUG-050: Sticky section headers — too low / mid-page snap / mobile jitter / iOS safe area / departure snap

**Status:** ✅ Verified fixed (v2.27.1 → v2.33.8, seven passes; verified on device 2026-07-18)

**Symptom (evolving across passes):** Section headers (Soon, Trello, Your tasks, Past) stick at `top: var(--sec-sticky-top)`. Initially: floated too low / snapped to mid-page once the logo header scrolled off. Then: few-px jitter during mobile scroll. Then: clipped behind the iOS status bar. Then: residual jitter at any scroll speed. Finally: a visible snap-apart between logo header and section headers at the departure moment, worse at fast scroll.

**The seven passes — each one's lesson:**
1. **v2.27.1** — replaced static `offsetHeight` with `getBoundingClientRect().bottom` tracking. *Fixed mid-page float; introduced jitter.*
2. **v2.27.3** — rect reads jitter on iOS (compositor scrolls ahead of main thread); switched to analytic `scrollY` math with rAF-coalesced updates. *Reduced but didn't eliminate.*
3. **v2.31.6** — `top: max(var(--sec-sticky-top), env(safe-area-inset-top))` floors the offset at the iOS safe area. *Fixed status-bar clipping.*
4. **v2.32.1** — CSS scroll-driven animation of `top`. *Failed: `top` is a layout property — WebKit samples it main-thread, one frame behind, the same lag it claimed to eliminate.*
5. **v2.33.1** — animation deleted; two-constant snap (`h` pinned ↔ `0` departed) + `#statusBarScrim` covers the safe-area strip. *Constants can't jitter, but jitter persisted anyway.*
6. **v2.33.3** — the real jitter cause: `.app`'s `overflow-x: clip`. On iOS WebKit ANY overflow clipping on an ancestor demotes sticky descendants to main-thread positioning. Removed; `html { overflow-x: hidden }` keeps horizontal protection (root-level doesn't demote — the smooth body-child logo header was the tell). *Jitter gone; the two-constant snap became visible at fast scroll.*
7. **v2.33.8** — final: `Math.min(h, Math.max(0, document.body.offsetHeight − window.scrollY))`. During departure this is exactly the logo header's visible bottom by geometry (header is body's first child, body = 100vh); outside it saturates to the constants. Continuous tracking without compositor reads. *Verified: snappiness good.*

**Companion polish (v2.33.9):** `.section-header::after` fade gradient (10px, `--bg` → transparent) — same softening as `.sticky-header::after`, so tasks dissolve under pinned labels instead of clipping at a hard edge.

**Durable lessons:** (a) never feed `getBoundingClientRect()` of a sticky element into layout during iOS scroll; (b) scroll-driven animations only help for compositor properties (transform/opacity), not `top`; (c) any ancestor overflow clipping demotes iOS sticky — Rules.md Rule 1; (d) pure scroll arithmetic is the only lag-free source for a sticky offset.

---

## BUG-049: New Trello cards look aged on arrival

**Status:** ✅ Verified fixed (v2.18.22)

**Symptom:** A Trello card that just entered the today list rendered dimmed (opacity ≈ 0.35–0.75) as if it were days old — even a card due *today* that was just given its due date in Trello.

**Root cause:** Trello card age was computed from the card's **Trello creation timestamp**, decoded from its MongoDB ObjectID via `_getCreatedFromTrelloId(id)`. A card created weeks ago in Trello but only just made relevant (due date added, moved to the right list) was therefore instantly "old" from the app's perspective.

**Fix (v2.18.22):** Age basis changed to a new `today_trello_firstseen` map `{trello_<id>: firstSeenMs}` — recording when each card first entered *your* filtered list. New helpers: `_getTrelloFirstSeen`, `_setTrelloFirstSeen`, `_trelloAgeBasis(id)` (falls back to `Date.now()` = fresh if unseen). Recorded and pruned in `loadTrello()` (departed cards dropped to keep the map bounded). Both age paths updated (Rule 27): `taskHTML()` and the `renderTrello()` 7s patch path. Synced via Dropbox: MIN-merge (earliest sighting across devices wins — a card's true first-seen is the earliest any device saw it), no date guard, NOT cleared in `applyNewDayCleanup` (must persist across days for the card to age). `_getCreatedFromTrelloId` removed (dead). One-time transition: on first load post-update all current cards got `firstSeen = now` → briefly fresh, then age naturally from that day.

**Verified fixed:** ✅ Jul 2026

---

## BUG-047: Dropbox connect on fresh install doesn't auto-restore

**Status:** ✅ Verified fixed v2.18.16 — verified 2026-07-08

**Symptom:** Installing the PWA on a new device, connecting Dropbox via OAuth, and finding the task list empty — even though a backup exists on Dropbox. The existing data was silently overwritten by the fresh install's empty state.

**Root cause:** `_dropboxExchangeCode()` (called after OAuth completes) unconditionally called `dropboxAutoSave()` — writing the device's current (empty) state to Dropbox immediately after receiving the token. The backup was overwritten before the user had a chance to restore.

**Fix (v2.18.16):** `_dropboxExchangeCode()` now detects a fresh install: if `manualTasks`, `habitsList`, `soonTasks`, and `pastTasks` are all empty, it probes Dropbox via `get_metadata` to check whether a backup file exists. If it does → `dropboxRestore(false)` (silent restore). If the probe fails or no file exists → falls back to `dropboxAutoSave()` as before. Reconnect on a device that already has local data also falls back to save.

---

## BUG-045: Done-today count inflates across check/uncheck cycles and cross-device sync

**Status:** ✅ Verified fixed (v2.18.14 date guard → v2.18.21 counter retired)

**Symptom:** The completed-task count shown in the evening triage summary and weekly grid blew up over the day — inflated by check/uncheck cycles (each check incremented, uncheck never decremented) and by cross-device `Math.max` merge (two devices each contributed their total and the higher won).

**Root cause:** `stat_tasks_done_today` was a monotonic increment-only counter. Three increment sites (normal checkbox, triage "done", `_focusOnCheck`) never decremented on uncheck. Cross-device merge used `Math.max(local, remote)`, so two devices that each did 3 tasks merged to 6. A date-guard was added (v2.18.14 — same class as BUG-024 focus minutes) but it only fixed midnight carry-over, not the inflation within a day.

**Fix (v2.18.21 — counter retired):** Fully removed `stat_tasks_done_today`: all 3 increment sites, the daily reset, the merge branch, the restore branch, and the backup payload fields. New `_doneTodayCount(dayISO?)` derives the count from `checked_ids` — entries dated for the target day whose check timestamp is newer than any matching `unchecked_ids` entry. Self-correcting: uncheck/re-check/cross-device sync all resolve correctly because the underlying `checked_ids`/`unchecked_ids` LWW arrays are already sound. Critical subtlety: `unchecked.get(c.id)` returns the `at` *string*, not an object — guard must compare `c.at > uAt` (not `c.at > u.at` which reads `.at` on a string → `undefined` → always false).

**Verified fixed:** ✅ Jul 2026

---

## BUG-044: Delayed focus chime when not in focus mode

**Status:** ✅ Verified fixed (v2.18.6)

**Symptom:** On desktop, a focus-session completion chime played — delayed — while the app was not in focus mode (no timer UI showing).

**Root cause:** `closeUI(false)` cleared the tick timer, closed PiP, and nulled `uiTaskId`/`_focusUIActive` — but did **not** set `st.running = false`. The click-outside handler stopped the session before `closeUI`, but Escape, task-switch, and other paths didn't. Later, `visibilitychange` correction iterated all running states, found the zombie, jumped `rem` to ≤0, and called `completeFor` → `playChime()` — a late chime with no focus UI active.

**Fix (v2.18.6):** `closeUI` now stops the closing task's session (`running=false, paused=false, wallStart=null`) right after `_trackFocusTime`, so no zombie survives any `closeUI` path. Correctness fix — `continueTicking` has no callers, PiP is closed by `closeUI`, so after any `closeUI` there must be no running session. `_trackFocusTime` (keys on `rem`/`tracked`) and resume-on-reclick (keys on `rem`) unaffected. Also fixed a latent "switch A→B leaves A running." No `_focusUIActive` guard on the chime (would mute the legitimate PiP completion chime).

**Verified fixed:** ✅ Jun 2026

---

## BUG-043: Aged Trello card won't un-dim after a focus session

**Status:** ✅ Verified fixed (v2.18.8 + v2.18.17)

**Symptom:** A Trello card dimmed by age (3+ days → 75%, etc.) stays dimmed even after a focus session on it. Manual tasks brighten back to full opacity; Trello cards don't. Also: focus-driven un-dimming was not synced cross-device (BUG-048, fixed v2.18.17).

**Root cause:** For Trello tasks the age basis was `_getCreatedFromTrelloId(id)` (creation timestamp, immutable), so the `today_trello_focus` map (`taskId → count`) was the activity signal. But `today_trello_focus` was only incremented in `_logSession`, called by `completeFor` (full 25-min pomodoro) and `_focusOnCheck` (task checked off while focusing). Closing focus via Escape or task-switch without completing — the common case — never set the count, so the card stayed dimmed.

**Fix (v2.18.4 → incomplete):** Wired `today_trello_focus` into `taskHTML` and the 7s patch path to gate the age bucket. Correct logic but the count was never set for partial sessions.

**Fix (v2.18.8 — root cause):** `closeUI` now marks the card engaged (`today_trello_focus[id] = 1`) whenever any focus time was spent (`st.rem < TOTAL`) and the count is still 0. Guard prevents double-increment when a completed pomodoro or `_focusOnCheck` already logged the session. Instant visual un-dim via `delete closingTask.dataset.ageBucket`; the 7s patch cycle confirms on its next pass.

**Fix (v2.18.17 — cross-device sync):** `today_trello_focus` was local-only. Added to backup payload (with `today_trello_focus_date` date guard), union-merged in `mergeRemoteData()`, and restored on full-restore.

**Verified fixed:** ✅ Jun 2026

---

## BUG-042: Trello card order scrambles across devices

**Status:** ✅ Verified fixed (v2.18.4)

**Symptom:** Custom Trello card order holds locally during the day but scrambles when a new day arrives / across two devices. Reordering on one device doesn't reliably stick on the other.

**Root cause (long-standing, not a regression — unchanged since v2.12.28):** `trello_order` was written into every backup, and `mergeRemoteData` adopted it unconditionally ("remote wins", no recency). Any unrelated write from another device re-asserted its possibly-stale order. Surfaces hardest at the day boundary: `applyNewDayCleanup()` removes `today_trello_cache` (forcing a re-fetch in Trello's native order) and both devices re-fetch + re-sync at once, so the clobber landed visibly.

**Fix (v2.18.4):** Added `today_trello_order_at` (ISO stamp set on reorder), carried in the payload. `mergeRemoteData` now adopts the remote order only if `remote.trello_order_at > local` or the device has no local order yet (bootstrap). Empty-string defaults: an untimestamped old-client backup never clobbers a timestamped local order. Full-restore path carries the stamp. Additive field — backward compatible, no schema bump. Neither `today_trello_order` nor `_at` is cleared at day rollover.

**Latent follow-ups (not blocking):** (1) `mergeRemoteData` adopts the order in-memory but doesn't rewrite `today_trello_cache` — a freshly-adopted order can look stale for one reload until the next live fetch. (2) "Newer reorder wins" comparison uses each device's wall clock — significant clock skew could mis-order adoption.

**Verified fixed:** ✅ Jun 2026

---

## BUG-041: White flash before dark on mobile cold start

**Status:** ✅ Verified fixed for the pre-web-content symptom below (v2.18.2 iOS, v2.18.7 Android/Arc, v2.18.13 OS launch screen). A *different* symptom under the same number — white flash during the splash reveal itself, not before it — went through three more passes (below) and was ultimately **🚫 closed 2026-07-24 as a probable iOS platform limitation, not fully fixed.**

**Distinct from BUG-032:** that bug is the *logo glyphs* painting mid-rise; this is the *page canvas* / OS launch screen flashing white — a separate root cause.

**Symptom:** On mobile cold start, the screen shows white for a brief moment before turning dark, just before the splash animation. Never on desktop / warm cache.

**Root cause (v2.18.2/v2.18.7 — WebView first-paint):** The dark background lived only in the stylesheet (`html, body { background: var(--bg) }`). The browser's first frame — before CSS parses — used the UA default white canvas. No `<meta name="color-scheme">` and no inline presentational background on `<html>`. iOS-only initially because Android Chrome bridges with manifest `background_color`; iOS Safari PWAs ignore it.

**Fix (v2.18.2 — iOS):** Added `<meta name="color-scheme" content="dark">` (UA paints a dark canvas pre-CSS) + inline `style="background:#0e0e10"` on `<html>` (applies on frame 1 before CSS vars exist — deliberate Rule 19 exception, documented inline).

**Fix (v2.18.7 — Android/Arc):** White frame survived on Arc (Chromium) in light system mode. Arc's pre-first-paint base-color heuristic was the culprit. Three additive changes: `<html>` `background` → `background-color`; inline `background-color:#0e0e10` on `<body>`; `color-scheme: dark` added to `:root` CSS.

**Root cause (v2.18.13 — OS launch screen):** The flash persisted on iPhone PWA cold launch because it was actually three frames. Frame 0 = iOS's *OS launch screen* (painted before the WebView exists) — not affected by any HTML/CSS/JS changes. iOS ignores manifest `background_color` for the launch screen; no `apple-touch-startup-image` was registered so the OS showed a white frame.

**Fix (v2.18.13):** Added a full set of `apple-touch-startup-image` links — one solid `#0e0e10` PNG per current iPhone resolution (exact physical-pixel dimensions + `device-width`/`device-height`/`-webkit-device-pixel-ratio`/`orientation` media query). Generated by `scripts/gen-splash.mjs`, stored in `assets/splash/`, precached in `sw.js`. Also added `apple-mobile-web-app-capable` meta (startup images only consulted in standalone mode). Critical verify note: iOS caches launch images at add-to-home-screen time — PWA must be removed and re-added after deploy.

**Verified fixed:** ✅ Jun 2026

---

**Second pass (v2.27.0) — different symptom, same number: white flash / splash logo appearing from the top.** Brief white flash at the very start of the splash animation, and the logo/star appearing to slide in from the top rather than fading in centered. Root cause: `#splash-star`'s `opacity`/`transform` transitions were set *outside* the `requestAnimationFrame` callback queuing the logo's own opacity fade. iOS WebKit promoted the star to its own compositing layer a frame before the logo's `opacity:0` baseline committed, so the star's white inner path (`fill="white"`, SVG `opacity=".18"`) briefly flashed at full brightness, uncomposited under the parent's fade. Fix: moved the star's transition/opacity/transform assignments inside the same `requestAnimationFrame` callback as the logo's fade, so iOS composites both together under the logo's `opacity:0` baseline.

**Third pass (v2.32.1) — persisted on iPhone 14 Pro after PWA re-add (2026-07-17).** Two symptoms: (a) brief white flash in light mode only, (b) logo letters appearing to come down from above mid-fade. For (b): `#splash` is `fixed; inset:0` and `#splash-inner` centers via `margin: auto 0` — on iOS PWA cold start the viewport settles (grows under the status bar) a few frames after first paint, re-centering the column downward mid-fade. Fix: `startSplash` now reads `#splash-inner`'s resolved `rect.top` before anything becomes visible and freezes it as an explicit `margin-top`, making later viewport growth a no-op. This fix verified as correct — letters-motion symptom (b) confirmed resolved in the fourth pass below. Symptom (a) needed a fresh light-mode test, flagged but not resolved this pass.

**Fourth pass (2026-07-22) — white flash (a) still persists; letters-motion (b) confirmed fixed.** Investigation ruled out every explanation reachable from app code: (1) all 11 `apple-touch-startup-image` PNGs sampled at RGB (14,14,16) — correctly dark, matches `--bg`, not a color mismatch; (2) iPhone 14 Pro's exact spec (393×852@3x) confirmed present in the startup-image media-query list (`splash-1179x2556.png`) — not a missing-device gap; (3) confirmed running the latest deployed version — not a stale-cache/SW issue; (4) `<head>` order checked — no `<script>` before `<style>`, font `preload` hints are non-blocking, inline `background-color` on `<html>` is already the first thing set — no render-blocking resource widening the flash window. Light/dark system-appearance correlation was asked but never confirmed.

With those four theories closed, what remains is the gap between iOS's static launch image ending and the WebView's first painted frame — a handoff that happens before any in-page HTML/CSS/JS runs, with no hook available from web content. **Closed 2026-07-24** as a probable iOS platform limitation rather than an open app-code bug. Reopen only if new evidence turns up: confirmation of a light/dark-mode correlation, or the flash appearing even on a warm/backgrounded reopen rather than only true cold start (either would point back at in-page code instead of the OS handoff).

---

## BUG-040: Morning nudge reappears after dismiss on every wake

**Status:** Fixed v2.17.139

**Symptom:** Morning nudge appears, user clicks to dismiss it, and it comes back. Confirmed on desktop: every focus-away → focus-back of the window re-shows it with identical content.

**Root cause:** Regression from v2.17.128 (BUG-033 second pass). The dismiss handler removed `morning_nudge_count` and `today_day_review` but set no persistent dismissed flag. Each `visibilitychange` → `_onWake()` re-calls `checkMorningNudge()`, where the self-heal block (added v2.17.128) sees the count is missing, recalculates it from `manualTasks.filter(t => !doneIds.has(t.id))`, restores the key, and re-shows the nudge. The self-heal couldn't distinguish "dismissed today" from "count cleared by yesterday's dismiss."

**Fix (v2.17.139):** Added a per-day `morning_nudge_dismissed_<date>` flag (same pattern as the Trello nudge `trello_nudge_dismissed_<date>`). Dismiss sets it; a guard at the top of `checkMorningNudge()` returns early before self-heal runs. Per-day key, so tomorrow's nudge is unaffected and the self-heal still works across the day boundary. Old flags pruned on dismiss. Trello nudge got the same prune loop for parity.

**Verified fixed:** ✅ Jun 2026

---

## BUG-039: All-habits-done celebration never fires

**Status:** Fixed v2.17.137

**Symptom:** Completing the last habit of the day produces no glow, no extra embers, no extra haptic — just the normal single-habit celebration.

**Root cause:** `toggleHabitDone()` checked `habitsList.every(h => ...)` which includes archived habits. Archived habits have no completion for today, so `allDone` was permanently `false` for any user who had ever archived a habit. Broke silently when habit archiving landed in v2.17.106.

**Fix (v2.17.137):** Added `const activeHabits = habitsList.filter(h => !h.archived)` before the check, then used `activeHabits` in both the length guard and `.every()`. Matches the pattern already used in `renderHabits()`.

**Verified fixed:** ✅ Jun 2026

---

## BUG-038: Red dot appears on mobile when offline (SW update rejection)

**Status:** Fixed v2.17.136

**Symptom:** Going offline on mobile PWA triggers the red error dot. Tapping it shows a message about sw.js failing to load.

**Root cause (two gaps):**
1. Both `reg.update()` calls (30-min interval and visibilitychange) had no `.catch()`. On iOS Safari, unhandled rejections from SW update checks can route through `window.onerror` instead of `unhandledrejection`.
2. `window.onerror` had no network-error filter — it always showed the red dot. The `unhandledrejection` handler already had the filter (including `'Failed to update a ServiceWorker'`), but `window.onerror` didn't.

**Fix (v2.17.136):** Added `.catch(() => {})` to both `reg.update()` calls. Added the same network-error string filter to `window.onerror` that already existed in `unhandledrejection`.

**Verified fixed:** ✅ Jun 2026

---

## BUG-037: Task list appears stale on morning open (day-cleanup backup race)

**Status:** Fixed v2.17.135

**Symptom:** On morning open (app resuming from background on a new day), the task list shows yesterday's state — tasks completed on another device are missing. Doesn't self-correct during use; only resolves when the other device makes another Dropbox write.

**Root cause:** The `visibilitychange` path calls `checkNewDay()` **before** `syncDropbox()`. When `checkNewDay()` detects a new day it calls `applyNewDayCleanup()`, which fires `dropboxBackup(true)` without `await`. If that upload completes before `syncDropbox()`'s metadata fetch returns, `syncDropbox()` then downloads the device's own just-uploaded (stale) data — `lastDropboxRev` is updated to the stale rev, and the 7-second ticker sees no further rev change, leaving the task list stuck until another device writes.

The `window.load` path is unaffected — it pulls Dropbox first, then calls `applyNewDayCleanup()`. `zoneChangedAt` timestamps protect done→PAST moves independently, so the delayed backup is safe.

**Fix (v2.17.135):** Wrapped the cleanup `dropboxBackup(true)` call in a `setTimeout(..., 3000)`, giving `syncDropbox()` time to complete its pull first. 3s matches the existing triage grace window (`_triageBarSilent`) — same race class, same fix.

**Verified fixed:** ✅ Jun 2026

---

## BUG-036: This Week data differs between web app and mobile app

**Status:** Fixed v2.17.132

**Symptom:** The "This Week" grid in About shows different past-day tallies (tasks/focus/habits) on the web app vs the mobile app. Today's column matches; prior days diverge.

**Root cause:** `today_daily_history` was local-only — never included in the Dropbox backup payload. Each device writes its own snapshot of "yesterday" in `applyNewDayCleanup()` when it first opens after midnight, and those snapshots never crossed devices.

**Fix:** Added `daily_history` to the Dropbox backup (schema **5.2 → 5.3**) and union-merged it on both restore paths via `_mergeDailyHistory(local, remote)`: union by date, on a duplicate keep the richer snapshot (higher `tasksDone`, tiebreak `focusMins`); cap 30 days. Backward compatible.

**Verified fixed:** ✅ Jun 2026

---

## BUG-034: Morning nudge AI text swaps mid-read (Tier 1→2 upgrade)

**Status:** Fixed v2.17.125

**Symptom:** User is reading the rule-based nudge message; 1–5 seconds later the text fades out and is replaced by the AI-generated version. Surprising/jarring even with the 200ms fade.

**Root cause:** `checkMorningNudge()` always performed the DOM swap when the AI fetch resolved, regardless of how long the nudge had been visible. No guard on elapsed time.

**Fix:** Added `const _nudgeShownAt = Date.now()` before the async `_fetchMorningNudgeAI()` call. In the `.then()` callback, if `Date.now() - _nudgeShownAt > 3000`, the DOM swap is skipped. AI text is still written to localStorage cache — shows immediately (no swap) on the next cold start.

**Verified fixed:** ✅ Jun 2026

---

## BUG-033: Morning nudge missing on first cold-start of the day

**Status:** Fixed v2.17.125

**Symptom:** Cold-start the app in the morning — nudge doesn't appear. Switch away and back → nudge appears via `_onWake()`.

**Root cause:** `morning_nudge_count` is set by `applyNewDayCleanup()`, which runs in the sync startup block *after* `init()` has already called `checkMorningNudge()`. If the user dismissed yesterday's nudge (click removes the key), `init()`'s call finds no count and hides the nudge. `applyNewDayCleanup()` recalculates the count from current tasks but `checkMorningNudge()` is not called afterward — nudge never appears until `_onWake()` fires on next focus. Dropbox restore path already fixed this for Dropbox users; local-only path and Dropbox-failed-restore fallback were missing it.

**Fix:** Added `if (typeof checkMorningNudge === 'function') checkMorningNudge()` after `applyNewDayCleanup()` in the sync startup block. Idempotent — safe even if Dropbox path already ran it.

**Verified fixed:** ✅ Jun 2026

---

## BUG-032: Splash logo appears mid-way through splash animation (mobile)

**Status:** ✅ Verified fixed v2.18.27 — verified 2026-07-08

**Symptom:** Sometimes on mobile, the TODAY logo appears mid-way through the splash animation. The letter-rise animation occasionally starts late or logo appears unexpectedly during the sequence. Intermittent on cold start. Never on desktop.

**Root cause (two parts):**
1. The logo letters' rise animation started immediately from page render (CSS `animation-delay` from .06s), but the typewriter waits for `document.fonts.ready`. On mobile cold starts Syne isn't loaded yet, so the logo rendered in the fallback font; when Syne arrived the swap changed the logo block's metrics, and `#splash` (`justify-content: center`) re-centered the column — a visible shift right before typing starts. Desktop has fonts cached → never reproduces.
2. `startSplash` could fire twice when fonts take >800ms: the fallback timeout fires it, then `fonts.ready.then()` fires it again — restarting the star transition and double-running the typewriter rAF loop.

**Fix (v2.17.97):** Letter-rise animation moved behind a `#splash-logo.go` gate; `startSplash` adds the class after fonts are ready. `_splashStarted` guard makes `startSplash` idempotent.

**Recurrence + refix (v2.17.112):** v2.17.97 gated `.go` on `document.fonts.ready`, but iOS Safari resolves `.ready` *before* custom fonts actually paint on cold start. Refix: gate on specific faces via `document.fonts.load('800 96px Syne', 'TODAY')` + `document.fonts.load('300 13px "DM Mono"', 'JANUARY')` (FontFaceSet.load() resolves only when truly loaded — reliable on Safari). Also added `<link rel="preload">` for both splash woff2 files.

**Third pass (v2.17.126):** True mechanism found: all `@font-face` use `font-display: block` (no fallback swap) — the issue was desync between the rise animation start and font paint. If Syne lands mid-animation, logo appears partway through its rise. The `setTimeout(startSplash, 800)` fallback could fire before Syne painted. **Fix:** replaced with an rAF poll of `document.fonts.check()` — `.go` only added on a frame where both faces are usable. 2500ms ceiling with `.instant` static-reveal modifier.

**Fourth pass (v2.17.130):** `document.fonts.check()` confirms face loaded but glyph raster cache is per-size; logo renders at `clamp(48px,9vw,96px)`, not the 96px checked. First paint at real size collided with animation start. **Fix:** paint `.l` letters at `opacity:0.02`, force layout, then next rAF revert + add `.go` — rise runs on already-rasterised glyphs.

**Fifth pass (v2.17.133):** `opacity:0.02` warm was compositor-skippable. Root insight: per-letter opacity ramp always raced real paint on iOS. **Fix:** `#splash-logo` → `visibility:hidden` (no paint, stays in layout); gate → `fonts.load()` promise raced against 2000ms ceiling; double-rAF forces full-opacity raster before fading whole container in as one unit. Transform-only keyframe runs staggered rise.

**Sixth pass (v2.18.18):** Rise itself abrupt/stuttery — `translateY(0.12em)` over easeOutExpo did 90% travel in 120ms, then ~1px pixel-snap tail. **Fix:** gentler easeOutQuint inlined `cubic-bezier(0.22,1,0.36,1)`, distance `0.12em→0.18em`, duration `.4s→.55s`, stagger `.04s→.07s`.

**Seventh pass — final fix (v2.18.27):** "letters coming up from bottom" persisted. Approach structurally unwinnable: CSS `transform` animation on iOS/WebKit promotes each `.l` to its own compositing layer at animation start → glyph re-raster mid-motion (the exact problem every pass was fighting). Also the v2.17.133 warm paint showed the logo fully opaque at the lowered position for ~2 frames — visible flash. **Fix (per Can's direction):** per-letter rise deleted entirely. `#splash-logo` base: `visibility:hidden; opacity:0`. Animated path: flip visibility, commit baseline, fade whole logo to 1 over `.5s var(--ease-out)` — one unit, one layer, one raster. Ceiling path: static reveal. Fonts gate + 2000ms ceiling + `_splashStarted` guard unchanged.

**Motion.md rule added:** never use per-letter CSS transform animations on text — the animation itself promotes each element to a compositing layer and forces a re-raster mid-motion on iOS/WebKit.

**Verified fixed:** ✅ 2026-07-08 — iPhone PWA cold start confirmed: logo fades as single unit, no letter rise, no pop.

---

## BUG-031: Red error dot invisible on mobile PWA

**Status:** Fixed v2.17.75 — verified ✅

**Symptom:** When a sync/storage error fires on the installed iOS PWA, the red dot never appears in view — errors go unnoticed on mobile.

**Root cause:** `#errorIndicator` was `position: fixed; top: 8px`. The viewport uses `viewport-fit=cover`, so the standalone PWA canvas extends under the iOS status bar (~47–59px tall). The dot rendered behind the status bar — present in the DOM, outside the visible safe area. Other fixed elements (sticky header, add bar) already compensate with `env(safe-area-inset-top/bottom)`; the error dot and `#errorPanel` were missed.

**Fix (v2.17.75):** `top: calc(env(safe-area-inset-top, 0px) + 8px)` on the dot, `+ 24px` on the panel. Desktop unaffected (inset is 0).

**Verified:** Force-showed dot in desktop Chrome with 47px safe-area-inset injected via CSS override — dot rendered at top: 55px, fully clear of the status bar. Confirmed no active errors on the app (dot hidden = no errors, expected healthy state).

**Verified fixed:** ✅ (Can, Jun 2026)

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

## BUG-027: Trello focus timer — re-open idle 25:00 + completed bar stops pulsing

**Status:** ✅ Verified fixed (v2.17.62)

**Symptom (Trello cards only):** (1) complete a session on a Trello card, click away, click back → timer shows 25:00 but doesn't count down; needs an extra click (other task types start on first click). (2) After completion the bar stayed solid and didn't pulse.

**Why Trello-specific:** `openUI()` injects the focus `timerEl` + `kbdHint` right after the focused row, so for a Trello card they become children of `#trelloList` — the only task list re-rendered every ~7s (`loadTrello()` → `renderTrello()`).

**Root cause 1:** the click handler treated any `taskStates[id].rem < TOTAL` as a resumable partial session; a completed session has `rem === 0` (< TOTAL), so it opened the UI but the `rem > 0` resume guard failed → idle 25:00.
**Fix:** gate `rem > 0 && rem < TOTAL`, so a completed session falls through to `start()`.

**Root cause 2:** `renderTrello`'s reposition loop computed `stableChildren` from all `#trelloList` children minus `.removing`; the timer + kbd hint were counted as cards, corrupting the index→sibling mapping and churning the timer every 7s, disrupting the completed pulse.
**Fix:** filter `stableChildren` to `.task[data-taskid]` only (both branches).

---

## BUG-026: Habit re-checks itself after uncheck

**Status:** ✅ Verified fixed (v2.17.53)

**Symptom:** Uncheck a habit during the day → within ~10s it re-checks itself. Also reproducible on wake or tab return.

**Root cause:** `mergeRemoteData` used a pure set union for `habit_completions`. Uncheck removes today's date locally, but the 7s background sync reads stale Dropbox data (still has the date) and unions it back. The 800ms upload debounce creates a window where the sync fires before the local uncheck is uploaded. Tasks avoid this via timestamped `checked_ids`/`unchecked_ids` LWW arrays; habits had no equivalent.

**Fix (v2.17.53):** Added `habitEvents` — a flat LWW map `{ "habitId::YYYY-MM-DD": { type, at } }` from `today_habit_events` localStorage. `toggleHabitDone` records every check/uncheck with a timestamp. `mergeRemoteData` merges event maps (newer timestamp wins per key), then filters the union of completion dates — dates whose most recent event is `'uncheck'` are excluded. Old data without events passes through unchanged. Events purged after 30 days by `_cleanupHabitEvents()` in `applyNewDayCleanup`. Full-restore gap closed in v2.17.54 (reads `data.habit_events`).

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

## BUG-023: Top panels flash twice on desktop PWA restore

**Status:** ✅ Verified fixed (v2.17.37)

**Symptom:** Panel open (Habits/Connections/About) → alt-tab away and back → panel flashes twice (brief disappear+reappear with fadeIn animation).

**Root cause:** `_forceRepaint()` sets `#main-app.style.display = 'none'` then `''`. CSS `animation` properties restart when an element re-enters the render tree after its parent was `display:none`. `.config-panel.open` has `animation: fadeIn` — every repaint pass replays it. `_forceRepaint()` runs 5 times on wake; the 500ms and 1500ms passes produce the two clearly visible flashes.

**Fix:** After restoring `display: ''`, synchronously set `animation: none` inline on all `.config-panel.open` elements — suppresses fadeIn before any paint. `toggleConfig()`, `toggleInfo()`, `toggleHabits()` clear the inline `animation` style on open so user-triggered opens still play fadeIn normally.

---

## BUG-022: Focus fill bar pulsates during active countdown

**Status:** ✅ Verified fixed (v2.17.36)

**Symptom:** During an active focus session the fill bar simultaneously fills left-to-right AND pulsates in opacity — pulsating should only occur when the session is complete ("again?" state).

**Root cause:** `timerCompletePulse` animation runs via `.complete` class on the shared `fillEl`. Two paths left `.complete` stranded: (1) PiP "Again" handler (introduced v2.17.35) reset session state but didn't remove `.complete` from main UI elements — on restore `visibilitychange` restarted `tickFor` so the bar filled while `.complete` was still active. (2) `closeUI(false)` (Esc or task-switch) skips the `remove('complete')` block (inside `if (doResetState)` only) — next `openUI()` called `syncDisplay()` which also doesn't clean `.complete`, so the new task's fill pulsated.

**Fix:** (1) PiP "Again" handler: after resetting state, removes `.complete` from `fillEl`, `timeEl`, `timerEl` and resets fill display. (2) `openUI()`: strips `.complete` from all three elements before `syncDisplay()` — covers all remaining paths.

---

## BUG-021: Splash explosion invisible / freezes after typewriter

**Status:** ✅ Verified fixed (v2.17.27–29)

**Symptom:** Mobile + desktop PWA — star doesn't explode on launch (app recovers via 2s fallback). Desktop PWA: animation freezes after typewriter completes, requires page refresh (no recovery).

**Root cause 1 — explosion invisible (retina):** `sctx.scale(dpr, dpr)` was called inside `sResize()`, which fires on every `resize`. `scale()` multiplies the existing transform — after the first resize the context ran at `dpr²` scale, corrupting all particle coordinates. PWA launch almost always fires a resize (viewport settling), so the explosion drew at the wrong position; on a 3× phone particles compressed into the top-left corner — invisible. Introduced v2.17.19 with DPR-aware canvas.

**Fix (v2.17.27):** Replaced `sctx.scale(dpr, dpr)` with `sctx.setTransform(dpr, 0, 0, dpr, 0, 0)` in `sResize()` — resets to exactly `dpr×` each call regardless of prior state.

**Root cause 2 — freeze after typewriter:** The two-flag splash gate (`_splashAnimDone` + `_appLoadDone`) had no top-level timeout. If `await _dropboxEnsureToken()` hangs (OS network stack not ready on desktop PWA), the chain stalls indefinitely — splash never dismisses.

**Fix (v2.17.27–28):** 6s safety timeouts on both gate flags so a stalled fetch degrades gracefully (`_splashAnimDone` timeout added v2.17.28 for symmetry).

---

## BUG-020: Streak double-counts across devices

**Status:** ✅ Verified fixed (v2.17.26)

**Symptom:** Streak was 108 on Friday. Opened app on Device A Saturday → 109. Opened on Device B Saturday → jumped to 110.

**Root cause:** `stat_streak` was merged with `Math.max` but had no date guard (unlike `stat_focus_mins_today` which has `stat_focus_mins_date`). If Device B received streak=109 via background sync from Device A's Saturday backup, then on first open `checkNewDay()` saw `lastVisit = Friday = yesterday` → incremented 109→110. Same calendar day counted twice across devices.

**Fix:** Added `stat_streak_date` (YYYY-MM-DD local) — set whenever streak is incremented in `checkNewDay()`. `checkNewDay()` skips the increment if `stat_streak_date === todayISO`. Merge adopts the lexicographically newer `stat_streak_date` from remote alongside `Math.max` streak. Full restore and backup payload also include `stat_streak_date`.

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

## BUG-018: Phantom SOON tasks reappear after day

**Status:** ✅ Verified fixed (v2.17.9)

**Symptom:** Tasks moved to PAST reappear in SOON the next day after sync.

**Root cause:** `mergeRemoteData` excluded `deleted_ids` from SOON merge but not `pastTasks` IDs. Completed/aged tasks move to PAST (not `deleted_ids`), so remote backup still had them in `soon_tasks`. On next day's sync, merge restored them to SOON.

**Fix:** Built `pastIds = new Set(pastTasks.map(t => t.id))` before SOON merge. Added `pastIds` exclusion to both local and remote sides of the SOON union. Tasks already in PAST cannot re-enter SOON via sync.

---

## BUG-017: Focus minutes only recorded on full session completion

**Status:** ✅ Verified fixed (v2.16.0)

**Symptom:** Exit focus early → no minutes recorded for the partial session.

**Root cause:** `_trackFocusTime()` only called when `doResetState=true` in `closeUI()`. Only `completeFor()` passed `true`. Escape/task-switch/early close lost all minutes.

**Fix:** Removed `doResetState` condition. `_trackFocusTime` called on every `closeUI`. Guards (`st.tracked`, `timeSpentMins <= 0`) prevent double-counting.

---

## BUG-016: AI chip labels show generic "Add step"

**Status:** ✅ Verified fixed (v2.15.6)

**Symptom:** `break_down` action chips all labelled "Add step" regardless of content.

**Root cause:** `break_down` handler rendered chips with hardcoded `"Add step"` label instead of extracting step text from payload.

**Fix:** Chips use actual step text, capped at 28 chars. System prompt updated: banned colons in labels, banned mid-conversation openers.

---

## BUG-015: AI repeats same aging task suggestion every session

**Status:** ✅ Verified fixed (v2.15.2)

**Symptom:** AI keeps suggesting the same old Trello task every day regardless of cooldown.

**Root cause:** Suggestion cooldown pruning only iterated `manualTasks` IDs. Trello task IDs were never in the retention set → all Trello cooldowns deleted nightly → Trello tasks appeared perpetually "new".

**Fix:** Pruning builds ID set from both `manualTasks` and `trelloTasks`.

---

## BUG-014: PiP not reappearing after restoring app during focus

**Status:** ✅ Verified fixed (v2.15.5 + v2.16.19)

**Symptom:** Focus running in PiP → restore app → PiP window doesn't reopen.

**Root cause (original):** `requestWindow()` requires user gesture. Second minimize had no gesture.
**Root cause (v2.16.19 — manual restore):** Browser auto-closes PiP on dock/Alt+Tab restore (`pagehide` fires → `pipWindow = null`). OS minimize button has no accessible user gesture.

**Fix (v2.15.5):** `_pipRestoredFromButton` flag — PiP button tap carries gesture, keeps PiP alive.
**Fix (v2.16.19):** `_hadPiP` flag. On restore, if `_hadPiP` and focus active, reopens PiP using the dock-click gesture. `_hadPiP` cleared on explicit close or focus end.

---

## BUG-013: Focus timer jumps 8-10 seconds on minimize/PiP restore

**Status:** ✅ Verified fixed (v2.14.9)

**Symptom:** Switch away during focus → come back → timer visually jumps forward several seconds.

**Root cause:** `tickFor` used `setTimeout(1000)` which browsers throttle when tab is hidden (1s tick could take 1.5–2s). On restore, several missed ticks fired rapidly — timer jumped visually.

**Fix:** Wall-clock correction on restore. `wallStart` timestamp used to calculate true elapsed time. PiP RAF uses its own wall-clock anchor, immune to throttling.

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

## BUG-011: PiP ghost chime on wrong task

**Status:** ✅ Verified fixed (v2.13.5 + v2.13.6 + v2.16.9)

**Symptom:** Task A → PiP → restore → check Task A → start Task B focus → chime fires during Task B's session.

**Root cause:** `startPiPClock` captured `uiTaskId` by reference (closure). With BUG-014 fix keeping PiP alive, old RAF from Task A still ran. When its reference point hit zero, it called `completeFor(uiTaskId)` — but `uiTaskId` had changed to Task B.

**Fix (v2.16.9):** `clockTaskId = uiTaskId` captured by value at clock start. RAF stops if `uiTaskId !== clockTaskId`. Reused PiP path calls `startPiPClock()` for current task.

---

## BUG-010: Habits did not roll over at midnight

**Status:** ✅ Verified fixed (v2.12.74 + v2.12.77)

**Symptom:** Open app after midnight — yesterday's habits still show as completed.

**Root cause:** `checkNewDay()` used `_getAppDay()` string comparison, but habit completion was stored with UTC ISO timestamps. Near midnight, UTC and local date diverged → habits didn't roll over.

**Fix:** All habit date comparisons use `_habitTodayISO()` which wraps `_localISO()`. Day boundary unified at local midnight.

---

## BUG-009: Task aging opacity broken — day 1 immediately muted

**Status:** ✅ Verified fixed (v2.12.73)

**Symptom:** New tasks appear muted/faded immediately instead of starting bright.

**Root cause:** Age calculation used `Date.now()` vs task ID timestamp comparison in UTC, crossing local midnight boundaries incorrectly.

**Fix:** Age calculation uses `_localISO()` for consistent local-time date comparison.

---

## BUG-008: Dragged task jumps back to previous position

**Status:** ✅ Verified fixed (v2.12.72)

**Symptom:** Drag task to new position → it snaps back to where it was.

**Root cause:** `touchend` handler was calling `renderManual()` synchronously after drop, which rebuilt the list from `manualTasks` array (not yet updated with new order). Task appeared to snap back.

**Fix:** Drag-end updates `manualTasks` array order before triggering render.

---

## BUG-007: Triage bar stays visible during and after triage

**Status:** ✅ Verified fixed (v2.13.2 + v2.16.6)

**Symptom:** Triage bar visible while overlay is open; reappears briefly after dismissal on mobile.

**Root cause (original):** `_triageActive` flag not set during overlay open — `checkTriageBar()` showed bar while overlay was open.
**Root cause (mobile regression):** Backdrop tap during 3s post-triage summary called `triageMinimize()` which restored the bar even though `triageDismissedToday` was already true.

**Fix (v2.13.2):** `_triageActive` locks bar hidden while overlay is open.
**Fix (v2.16.6):** `triageMinimize()` checks `triageDismissedToday` — if true, routes to `triageClose()` instead.

---

## BUG-006: _onWake() consolidation

**Status:** ✅ Verified fixed (v2.17.0)

**Symptom:** Four separate `visibilitychange` handlers scattered across the codebase — maintenance risk, subtle ordering bugs possible.

**Root cause:** Wake-related logic (repaint, triage, sync) accumulated across multiple modules with no coordination.

**Fix:** Consolidated into single `window._onWake()` in global scope. Sync module's `visibilitychange` calls it after sync is triggered. Three handlers remain in their own closures where private variables are needed: SW update check, timer wall-clock correction, PiP show/hide.

---

## BUG-005: Pomodoro session count not shown on Trello tasks

**Status:** ✅ Verified fixed (v2.12.56 + v2.12.66)

**Symptom:** Pomodoro badge disappears from Trello task rows every 7 seconds.

**Root cause:** `newText` (used for innerHTML comparison in Trello patch path) didn't include the session badge. `innerHTML` was rewritten every 7s tick → badge destroyed.

**Fix:** Session badge included in `newText`. Comparison now stable — innerHTML only overwrites when text/link/badge actually changes.

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

## BUG-003: Red dot on network loss

**Status:** ✅ Verified fixed (v2.12.58 + v2.12.61 + v2.12.67 + v2.13.4 + v2.14.1)

**Symptom:** WiFi drops → red dot appears, causing false alarm.

**Root cause:** `_logSyncError` had no network error filter — "Failed to fetch" triggered red dot on every WiFi drop. `unhandledrejection` had no filter either.

**Fix:** `_logSyncError` detects network errors (Failed to fetch, NetworkError, Load failed, CORS, ERR_INTERNET, Failed to update a ServiceWorker) → console only, no red dot. Same filter applied to `unhandledrejection`.

---

## BUG-002: Dropbox sync fails silently — stale data on return

**Status:** ✅ Verified fixed (v2.12.58–2.12.61)

**Symptom:** Return to app after a while — tasks are stale, no indication of sync failure.

**Root cause:** Silent `catch(e) {}` blocks, renamed function (`dropboxUpdateUI` → `renderConnections`), and network errors reaching the red dot. Multiple sync paths had no error visibility.

**Fix:** Removed silent catches, fixed renamed function at all call sites, added `_logSyncError` with network error filtering, added red dot indicator.

---

## BUG-001: Triage dismissed on one device, still shows on the other

**Status:** ✅ Verified fixed (v2.12.59–2.12.60)

**Symptom:** Dismiss triage on Device A → Device B still shows the bar.

**Root cause:** `triageDismissedToday` was a local boolean — not read from localStorage on wake. Other device's dismissal was in Dropbox backup but the local flag was never refreshed.

**Fix:** On `visibilitychange` and `window.focus`, re-read `triage_dismissed` from localStorage after sync settles (3s delay). `mergeRemoteData` applies remote dismissal. `_triageBarSilent` prevents bar showing during the grace window.

## BUG-064: Focusing a Trello card un-ages it for one day, then it returns dimmed worse

**Status:** ✅ Verified fixed (v2.43.6)

**Symptom:** An aged Trello card brightens after a focus session, but is dimmed again the next day — and at a heavier tier than before the work. Can: "it feels like it might be broken... not sure to which level."

**Root cause:** The two task types un-aged by different mechanisms. A manual task's basis is `task.lastActive || created`, and focus sets `lastActive = Date.now()` — the basis genuinely moves. A Trello card's basis is `_getTrelloFirstSeen()[id]`, which never moves; instead `taskHTML()` carried a display override (`if (focusCount > 0) ageDays = 0`) fed by `today_trello_focus` — a map wiped every midnight. Focus was a 24-hour cosmetic mask, not an age reset.

**Fix:** New `today_trello_lastactive` map MAX-merging across devices, pushed forward at both focus sites — making the Trello age basis structurally identical to the manual path. BUG-043's override left in place, now harmless.

**Adjacent:** BUG-059 fixed the sync half of Trello aging; this is the day-boundary half.

## BUG-068: Trello card 🍅 session count resets every morning

**Status:** ✅ Fixed (v2.48.4)

**Symptom:** 🍅 tomato badge on a Trello card showed sessions worked today but reset to zero the next morning. Manual tasks accumulated sessions indefinitely; Trello cards did not.

**Root cause:** `today_trello_focus` served two roles — (1) daily activity signal for un-dimming aged cards (BUG-043/064), and (2) display count. Day-rollover logic at `applyNewDayCleanup()` wiped the whole map each morning to reset the activity signal, discarding the display count along with it.

**Fix (v2.48.4):** Added `today_trello_focus_total` — a permanent per-card lifetime counter. `_logSession()` now writes to both maps. All display reads (badge, triage AI context, triage panel) switch to the total. The daily map continues its existing role as the un-dim signal only. Syncs cross-device via MAX-merge (same pattern as `today_trello_lastactive`). Pruned in `loadTrello()` when cards leave the board (same pattern as `today_trello_firstseen`/`today_trello_lastactive`).

---

## BUG-066: Focus minutes from another device read 0, and overwrite yesterday's history

**Status:** ✅ Verified fixed (v2.43.8)

**Symptom:** Can worked a focus session on desktop PWA; opened mobile PWA later the same day; focus minutes showed 0.

**Root cause:** `mergeRemoteData()` adopted the remote `stat_focus_mins_today` but never wrote `stat_focus_mins_date` with it. `applyNewDayCleanup()` runs *after* the Dropbox restore by explicit design (`init()` — "so we always clean the freshest data"), so it read a stale date, concluded the just-merged minutes were yesterday's, wrote them into `today_daily_history` as yesterday's entry, and zeroed today's counter. Two harms from one omission.

**Not a regression.** The merge never stamped that date. Before BUG-063 (v2.42.4) the cleanup reset unconditionally and wiped harder; that fix added the right shape of guard but cannot help when nothing writes the date it reads.

**Fix (v2.43.8):** stamp `stat_focus_mins_date = _getAppDay()` whenever the merge adopts a value — safe because `mergedFocusMins` only differs from local when remote's date-gated today-value won, so the merged number is definitionally today's. Plus: if the local counter was still on yesterday with unbanked minutes, hand them to `stat_focus_mins_yesterday_snapshot` (the channel BUG-063 established) so stamping today does not cost yesterday its history entry.

**Lesson:** a synced value and its date guard are one unit. Writing the value without the guard leaves the next reader — here a cleanup that deliberately runs afterwards — to infer the wrong day. Sibling of the BUG-064 lesson in `Sync.md`: merge semantics are part of a key's meaning.
