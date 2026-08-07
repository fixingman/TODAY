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
| 068 | Trello card 🍅 session count resets every morning | ✅ v2.52.1  |
| 067 | Focused task jumps near top of viewport after focus ends | ✅ v2.44.1  |
| 066 | Focus minutes from another device read 0 on second-device open | ✅ v2.43.8  |
| 065 | Focus mode re-opened after leaving; timer bar torn loose on fast task switch | ✅ v2.43.7  |
| 064 | Focused Trello card un-ages for one day then returns at a heavier dim tier | ✅ v2.43.6  |
| 063 | Focus sessions near midnight wiped by new-day reset race | ✅ v2.42.4  |
| 062 | Native share-sheet popover opens far from the poem's click point, not fixable from page DOM | 🚫 Rejected  |
| 061 | Sunday/habit badges silently fail to show on a fresh device (same root cause as BUG-060) | ⏳ v2.37.8  |
| 060 | Completed Trello card reappears as active after daily sync | ✅ v2.40.1  |
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

