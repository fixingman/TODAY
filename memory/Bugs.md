# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60 |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61 |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1 |
| 004 | App blank after sleep/wake | ✅ v2.17.24 |
| 005 | Trello pomodoro badge vanishing | ✅ v2.12.56–66 |
| 006 | _onWake() consolidation | ✅ v2.17.0 |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6 |
| 008 | Drag jump-back on mobile | ✅ v2.12.72 |
| 009 | Task aging opacity broken | ✅ v2.12.73 |
| 010 | Habits didn't roll over | ✅ v2.12.74–77 |
| 011 | PiP ghost chime on wrong task | ✅ v2.16.9 |
| 012 | Overdue Trello card disappears on check | ✅ v2.16.5 |
| 013 | Focus timer jumps on restore | ✅ v2.14.9 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9 |
| 019 | Star explosion missing on mobile | ✅ v2.17.29 |
| 020 | Streak double-counts across devices | ✅ v2.17.26 |
| 021 | Splash explosion invisible / freezes after typewriter | ✅ v2.17.27–29 |
| 022 | Focus fill bar pulsates during active countdown | ✅ v2.17.36 |
| 023 | Top panels flash twice on desktop PWA restore | ✅ v2.17.37 |
| 024 | Focus minutes carry over to next day | ✅ v2.17.48 |
| 025 | PiP "Again" lost / shows 25:00 after sleep/wake | ✅ v2.17.52 |
| 026 | Habit re-checks itself after uncheck | ✅ v2.17.53 |
| 027 | Trello focus timer — re-open idle 25:00 + completed bar stops pulsing | ⏳ v2.17.62 |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-027: Trello focus timer — re-open idle + completed bar stops pulsing

**Status:** Fixed v2.17.62 — awaiting verification

**Symptoms (Trello cards only):**
1. Complete a focus session on a Trello card, click away, click back to focus → timer shows **25:00 but doesn't count down**; needs an extra click. Other task types start on the first click.
2. After completion the bar **stays solid highlighted and doesn't pulse** ("again?" not blinking).

**Why Trello-specific:** `openUI()` injects the focus `timerEl` + `kbdHint` right after the focused row, so for a Trello card they become children of `#trelloList` — the only task list re-rendered every ~7s (`loadTrello()` → `renderTrello()`; `renderManual` runs only on data merges).

**Root cause 1 (symptom 1):** the click handler treated any `taskStates[id].rem < TOTAL` as a resumable partial session. A completed session has `rem === 0` (also `< TOTAL`), so it opened the UI but the `rem > 0` resume guard failed → idle 25:00 instead of starting. (Likely affected all task types; most visible on Trello.)
**Fix:** gate `rem > 0 && rem < TOTAL`, so a completed session falls through to `start()` and one click begins a fresh countdown.

**Root cause 2 (symptom 2):** `renderTrello`'s reposition loop computed `stableChildren` from all `#trelloList` children minus `.removing`. With the timer + kbd hint living in that list during focus, they were counted as cards, corrupting the index→sibling mapping and shuffling rows / churning the timer every 7s — disrupting the completed `.complete` pulse.
**Fix:** filter `stableChildren` to `.task[data-taskid]` only (both branches).

**Verify:**
- Focus a Trello card → complete it → bar should pulse "again?" and keep pulsing across 7s sync ticks.
- Complete, click away, click the card again → countdown should **start on the first click**.
- Trello list shouldn't visibly reorder while a card is focused.
- (If the bar still doesn't pulse after this: likely a stranded inline `animation:none` from a prior wake — flag and I'll chase root cause 2b.)

**Verified fixed:** ☐
