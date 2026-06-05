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
| 027 | Trello focus timer — re-open idle 25:00 + completed bar stops pulsing | ✅ v2.17.62 |
| 028 | Completed bar shows "again?" a tick (~1s) late | ⏳ v2.17.63 |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-028: Completed focus bar shows "again?" a tick late

**Status:** Fixed v2.17.63 — awaiting verification

**Symptom (all task types):** when a focus session reaches zero, the bar fills and looks complete but sits **full and static for ~1s before the "again?" pulse appears**. Noticed after BUG-027 made the completed state reliably visible.

**Root cause:** `tickFor` decrements `st.rem`, and when it hits 0 it drew `"00:00"` + a full bar and then **scheduled another tick**. `completeFor` (which adds `.complete` + "again?" + the pulse) only ran at the *top* of that next tick — one full second later. So there was always a dead "00:00" second between the bar filling and the completed state rendering. Sibling of BUG-025/027 but a distinct root cause (tick scheduling, not Trello re-render or sleep/wake).

**Fix (v2.17.63):** after the decrement, `if (st.rem <= 0) { completeFor(taskId); return; }` — complete in the same tick that reaches zero, skipping the dead "00:00" frame. The display-update + reschedule only run while `rem > 0`.

**Verify:**
- Run a focus session to completion (any task type) → the moment the bar fills it should show the pulsing **"again?"**, with no static full-bar pause first.

**Verified fixed:** ☐
