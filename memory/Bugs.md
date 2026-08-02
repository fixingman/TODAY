# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status key

| Badge | Meaning |
|-------|---------|
| ✅ `vX.X.X`  | Fixed and verified by Can on real device |
| ⏳ `vX.X.X`  | Fix shipped — awaiting real-device verification |
| 🚫 Rejected  | Not a fixable app bug (platform limitation, won't fix) |

## Status Summary

| # | Description | Status |
|---|---|---|
| 067 | Focused task jumps to top of viewport after focus ends — renderManual reorder during focus shifts DOM offset, saved scrollY no longer places task correctly | ⏳ v2.44.1  |
| 066 | Focus minutes from another device read 0 on the second device — merge adopted the value without stamping its date guard, so the post-restore cleanup banked them as yesterday's | ⏳ v2.43.8  |
| 065 | Focus mode re-opened itself after leaving it; timer bar torn loose on fast task switch (regression from v2.43.0) | ✅ v2.43.7  |
| 064 | Focusing a Trello card masked its age for one day, then it returned dimmed one tier worse — focus never moved the age basis | ✅ v2.43.6  |
| 063 | Focus sessions completing just after midnight wiped by daily reset race — stat_focus_mins_today reset to 0 before completeFor could persist | ✅ v2.42.4  |
| 062 | Native share-sheet popover opens far from the poem's click point, not fixable from page DOM | 🚫 Rejected  |
| 061 | Sunday/habit badges silently fail to show on a fresh device (same root cause as BUG-060) | ⏳ v2.37.8  |
| 060 | Completed Trello card (overdue) reappears as active — persists through normal daily sync, not just fresh device | ✅ v2.40.1  |
| 059 | Task card age reset by sync after focus — card re-dims on refresh | ✅ v2.36.5  |
| 058 | Noticed block in About shows different content between devices | ✅ v2.36.3  |
| 057 | About "This week" / "New week" AI text differs between devices (cache never synced) | ✅ v2.36.1  |
| 056 | BUG-004 recurrence — blank app after long Mac sleep (GPU wakeup too slow for 1500ms repaint ceiling) | ✅ v2.31.9  |
| 055 | Done tasks from today wiped on second-device first-open | ✅ v2.30.1  |
| 054 | Phantom old tasks resurrect in TODAY list via sync merge | ✅ v2.23.6  |
| 053 | Morning nudge dismissal not synced across devices | ✅ v2.18.38  |
| 052 | Splash dismissal slow — sync bookkeeping held the gate | ✅ v2.18.36  |
| 051 | Trello nudge dismissal not synced across devices | ✅ v2.18.23  |
| 050 | Sticky section headers — too low / mid-page snap / jitter / safe area / departure snap (seven passes) | ✅ v2.33.8  |
| 049 | New Trello card looks aged on arrival | ✅ v2.18.22  |
| 048 | Trello card aging not synced across devices | ✅ v2.18.17  |
| 047 | Dropbox connect on fresh install doesn't auto-restore | ✅ v2.18.16  |
| 046 | Trello board selector / Dropbox buttons flicker | ✅ v2.18.15  |
| 045 | Done-today count inflates | ✅ v2.18.21  |
| 044 | Delayed focus chime after Escape/task-switch | ✅ v2.18.6  |
| 043 | Aged card won't un-dim after focus session | ✅ v2.18.11, v2.18.17  |
| 042 | Trello card order scrambles across devices | ✅ v2.18.4  |
| 041 | White flash / splash logo from top on mobile (second pass) | ✅ v2.17.29  |
| 040 | Morning nudge reappears after dismiss | ✅ v2.17.139  |
| 039 | All-habits-done celebration never fires | ✅ v2.17.137  |
| 038 | Red dot on mobile when offline | ✅ v2.17.136  |
| 037 | Task list stale on morning open | ✅ v2.17.135  |
| 036 | This Week differs web vs mobile | ✅ v2.17.132  |
| 035 | Trello cards never age visually | ✅ v2.17.127  |
| 034 | Morning nudge AI text swaps mid-read | ✅ v2.17.125  |
| 033 | Morning nudge missing on first cold-start | ✅ v2.17.125  |
| 032 | Splash logo appears mid-animation on mobile | ✅ v2.18.27  |
| 031 | Red error dot invisible on mobile PWA | ✅ v2.17.75  |
| 030 | Checkmark animation lags ~30s on iOS PWA open | ✅ v2.17.105  |
| 029b | ✦ submit answer swapped by proactive load race | ✅ v2.17.93  |
| 029 | `_aiSendFromInput` undefined — crash on ✦ submit | ✅ v2.17.64  |
| 028 | Completed bar flash/pause on window return | ✅ v2.17.94  |
| 027 | Trello focus timer resets on re-open | ✅ v2.17.62  |
| 026 | Habit re-checks itself after uncheck | ✅ v2.17.53  |
| 025 | PiP "Again" lost / shows 25:00 after sleep/wake | ✅ v2.17.52  |
| 024 | Focus minutes carry over to next day | ✅ v2.17.48  |
| 023 | Top panels flash twice on desktop PWA restore | ✅ v2.17.37  |
| 022 | Focus fill bar pulsates during active countdown | ✅ v2.17.36  |
| 021 | Splash explosion invisible / freezes after typewriter | ✅ v2.17.27–29  |
| 020 | Streak double-counts across devices | ✅ v2.17.26  |
| 019 | Star explosion missing on mobile | ✅ v2.17.29  |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9  |
| 017 | Focus minutes only on full completion | ✅ v2.16.0  |
| 016 | AI chip labels generic | ✅ v2.15.6  |
| 015 | AI repeats same aging task | ✅ v2.15.2  |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19  |
| 013 | Focus timer jumps on restore | ✅ v2.14.9  |
| 012 | Overdue Trello card disappears on check | ✅ v2.16.5  |
| 011 | PiP ghost chime on wrong task | ✅ v2.16.9  |
| 010 | Habits didn't roll over | ✅ v2.12.74–77  |
| 009 | Task aging opacity broken | ✅ v2.12.73  |
| 008 | Drag jump-back on mobile | ✅ v2.12.72  |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6  |
| 006 | `_onWake()` consolidation | ✅ v2.17.0  |
| 005 | Trello pomodoro badge vanishing | ✅ v2.12.56–66  |
| 004 | App blank after sleep/wake | ✅ v2.17.24  |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1  |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61  |
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60  |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-061: Sunday/habit badges silently fail to show on a fresh device

**Symptom:** Found by audit after BUG-060, not yet reported in the wild. On a genuinely fresh device, the week-reflection badge (Sun/Mon) and the habits-button badge (10pm–3am) can silently fail to light up even when real, synced data exists that should trigger them.

**Root cause:** Same family as BUG-060. `checkSundayNudge()` reads `today_daily_history` and `checkHabitNudge()` reads `habitsList`/`habitCompletions` — both genuinely Dropbox-synced (backup payload + merge logic in `mergeRemoteData`), both module-level variables initialized once from local (pre-sync) `localStorage` at script-parse time. Both functions are called only from `init()` (`index.html:5251-5252`), which runs before the Dropbox restore lands — so on a fresh device they read empty/stale local state and simply return early (`if (!...length) return`), no badge. Unlike BUG-060, this is a false negative (something that should show, doesn't) rather than a false positive (something that shouldn't show, does) — same architectural gap, softer symptom. Neither function was ever added to the post-merge re-check pattern already established for `checkTriageBar()`/`checkDayNudge()`.

**Fix (v2.37.8):** added `checkSundayNudge()` and `checkHabitNudge()` calls alongside the existing `checkDayNudge()` re-check, at both post-merge points (Dropbox restore path and the primary cold-start load handler).

**Verify:** On a Sunday, Monday, or during 10pm–3am with real synced habit/week data, do a fresh PWA install / fresh Dropbox connect on a new device. The relevant badge should appear once sync settles, not require a manual refresh or reopen.

---

## BUG-062: Native share-sheet popover doesn't open near the click point

**Symptom:** Poem share (`_shareDailyPoem()`, `navigator.share()`) opens the OS/browser share sheet many pixels away from where the user actually clicked — reported across every trigger structure tried during the poem-share feature's iteration (v2.40.0 button, v2.40.4 corner overlay, v2.40.6/v2.40.7 whole-poem click target), with no change in position across any of them.

**Investigation:** v2.40.7 hypothesized the popover anchors to `document.activeElement` rather than literal cursor coordinates, and added a `.focus()` call on the small corner label immediately before invoking `navigator.share()`, to bias the anchor toward a small predictable element instead of the whole poem's bounding box. Can's direct real-device test after that fix: "share sheet pop up is behaving exactly like before fix. nothing looks changed." Falsified.

**Root cause:** Unknown from our side, and very likely outside our control — `navigator.share()`'s spec gives web pages no API to influence the popover's on-screen position; it's entirely rendered and positioned by the browser/OS. The fact that its position hasn't moved across several structurally very different DOM approaches (different element types, positions, click targets) is itself strong evidence this is fixed OS/browser chrome behavior, not something responsive to page structure, focus state, or element geometry.

**Fix:** None. The disproven `.focus()` call and its supporting `tabindex="-1"` were removed (v2.40.8) rather than left as dead code implying an effect that doesn't exist.

**Status:** Closed as a platform limitation, not a bug in our code — mirrors BUG-041's precedent (iOS splash white-flash) for issues ruled out of app-code control after direct investigation. Revisit only if a future browser API (e.g. a hypothetical `ShareData.anchor`) offers real control.

---

## BUG-066: Focus minutes from another device read 0, and overwrite yesterday's history

**Symptom:** Can worked a focus session on desktop PWA; opened mobile PWA later the same day; focus minutes showed 0.

**Root cause:** `mergeRemoteData()` adopted the remote `stat_focus_mins_today` but never wrote `stat_focus_mins_date` with it. `applyNewDayCleanup()` runs *after* the Dropbox restore by explicit design (`init()` — "so we always clean the freshest data"), so it read a stale date, concluded the just-merged minutes were yesterday's, wrote them into `today_daily_history` as yesterday's entry, and zeroed today's counter. Two harms from one omission.

**Not a regression.** The merge never stamped that date. Before BUG-063 (v2.42.4) the cleanup reset unconditionally and wiped harder; that fix added the right shape of guard but cannot help when nothing writes the date it reads.

**Fix (v2.43.8):** stamp `stat_focus_mins_date = _getAppDay()` whenever the merge adopts a value — safe because `mergedFocusMins` only differs from local when remote's date-gated today-value won, so the merged number is definitionally today's. Plus: if the local counter was still on yesterday with unbanked minutes, hand them to `stat_focus_mins_yesterday_snapshot` (the channel BUG-063 established) so stamping today does not cost yesterday its history entry.

**Lesson:** a synced value and its date guard are one unit. Writing the value without the guard leaves the next reader — here a cleanup that deliberately runs afterwards — to infer the wrong day. Sibling of the BUG-064 lesson in `Sync.md`: merge semantics are part of a key's meaning.

**Status:** ⏳ Fix shipped v2.43.8 — awaiting real-device verification. **What to check:** run a focus session on one device, then open the other later the same day — the minutes should match. Covered by `scripts/focus-test.mjs` section 4.

---

## BUG-067: Focused task jumps to top of viewport after focus ends

**Symptom:** A task that was mid-list and centered during a focus session appears at the very top of the viewport (almost out of view) once focus closes. Can: "when i came back when focus was over, the task moved to the top of the view, and almost out of viewport on the scroll list."

**Root cause:** Focus mode locks scroll by setting `position:fixed; top:-${scrollY}px` on `body`, saving `scrollY` at lock time. While focus is active, `visibilitychange` on tab return fires `syncDropbox()` → `mergeRemoteData()` → `renderManual()`, which rebuilds the task list. If `renderManual()` reorders tasks (e.g. the focused task's `lastActive` was just updated to `Date.now()`, moving it toward the top), the task's document offset changes. On close, `closeUI` restores `scrollY` correctly — but the task is now at a different offset in the rebuilt DOM. At the original `scrollY`, the task now sits near the top edge rather than at center.

**Fix (v2.44.1):** `openUI` saves the task's viewport Y (`getBoundingClientRect().top`) into `dataset.focusTaskTop` at lock time, after any nudge scroll. `closeUI` compares this saved Y to the task's actual viewport Y after scroll restoration. If the task drifted more than 2px, `window.scrollTo` is called a second time to compensate by exactly the delta — restoring the task to the same visual row it occupied when focus started. No change when the DOM didn't move (delta ≈ 0).

**Status:** ⏳ Fix shipped v2.44.1 — awaiting real-device verification. **What to check:** start focus on a mid-list task, switch tabs (trigger a Dropbox sync), return and exit focus. Task should be in the same place on screen, not near the top.
