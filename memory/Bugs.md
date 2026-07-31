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
| 064 | Focusing a Trello card masked its age for one day, then it returned dimmed one tier worse — focus never moved the age basis | ⏳ v2.43.6  |
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
| 041 | White flash / splash logo from top on mobile (second pass) | 🚫 Closed  |
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

## BUG-064: Focusing a Trello card un-ages it for one day, then it returns dimmed worse

**Symptom:** An aged Trello card brightens after a focus session, but is dimmed again the next day — and at a heavier tier than before the work. Can's report: "it feels like it might be broken... not sure to which level."

**Investigation (before any change):** The level is whatever the untouched first-seen date implies, which is always at least the tier it was at before, because the underlying clock never stopped. Measured with the real `taskHTML()` age logic: a card first seen 6 days ago reads `mid`; focus it, it reads clean; next morning it reads `old`. Doing the work costs a dimming tier.

**Root cause:** The two task types un-aged by different mechanisms. A manual task's basis is `task.lastActive || created`, and focus sets `lastActive = Date.now()` — the basis genuinely moves. A Trello card's basis is `_getTrelloFirstSeen()[id]`, which never moves; instead `taskHTML()` carried a display override (`if (focusCount > 0) ageDays = 0`) fed by `today_trello_focus`, a map wiped every midnight. Focus was therefore a 24-hour cosmetic mask, not an age reset. Out of scope for BUG-043, which addressed a card staying dimmed *while* being worked on; the override's own comment concedes "manual tasks un-age on activity but Trello can't."

**Fix (v2.43.6):** New `today_trello_lastactive` map (`{trello_<id>: ms}`) pushed forward at both focus sites, making the basis `lastActive || firstSeen || now` — structurally identical to the manual path. Deliberately a separate key rather than writing into `today_trello_firstseen`: first-seen MIN-merges across devices (earliest sighting wins, that is its meaning), so activity written there would be reverted by any device holding an older timestamp. The new map MAX-merges, mirroring how manual `lastActive` already reconciles in `mergeRemoteData()`. Added to backup payload, merge path and full-restore; pruned alongside first-seen; excluded from the midnight clear. BUG-043's override left in place — now only fires when `lastactive` is also set, and preserves that fix's partial-session contract.

**Adjacent:** BUG-059 (age reset clobbered by sync) fixed the *sync* half of Trello aging; this is the *day-boundary* half. No migration needed — an empty map falls through to first-seen.

**Status:** ⏳ Fix shipped v2.43.6 — awaiting real-device verification. **What to check:** focus an aged Trello card, then look at it the next day. It should read as fresh (no dimming), not return at a heavier tier.

---

## BUG-062: Native share-sheet popover doesn't open near the click point

**Symptom:** Poem share (`_shareDailyPoem()`, `navigator.share()`) opens the OS/browser share sheet many pixels away from where the user actually clicked — reported across every trigger structure tried during the poem-share feature's iteration (v2.40.0 button, v2.40.4 corner overlay, v2.40.6/v2.40.7 whole-poem click target), with no change in position across any of them.

**Investigation:** v2.40.7 hypothesized the popover anchors to `document.activeElement` rather than literal cursor coordinates, and added a `.focus()` call on the small corner label immediately before invoking `navigator.share()`, to bias the anchor toward a small predictable element instead of the whole poem's bounding box. Can's direct real-device test after that fix: "share sheet pop up is behaving exactly like before fix. nothing looks changed." Falsified.

**Root cause:** Unknown from our side, and very likely outside our control — `navigator.share()`'s spec gives web pages no API to influence the popover's on-screen position; it's entirely rendered and positioned by the browser/OS. The fact that its position hasn't moved across several structurally very different DOM approaches (different element types, positions, click targets) is itself strong evidence this is fixed OS/browser chrome behavior, not something responsive to page structure, focus state, or element geometry.

**Fix:** None. The disproven `.focus()` call and its supporting `tabindex="-1"` were removed (v2.40.8) rather than left as dead code implying an effect that doesn't exist.

**Status:** Closed as a platform limitation, not a bug in our code — mirrors BUG-041's precedent (iOS splash white-flash) for issues ruled out of app-code control after direct investigation. Revisit only if a future browser API (e.g. a hypothetical `ShareData.anchor`) offers real control.

---
