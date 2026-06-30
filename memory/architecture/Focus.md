# Focus Mode (Pomodoro)

> Timer system, states, and session tracking.

---

## Overview

25-minute focus sessions with optional breaks. One task at a time.

---

## States

| State | Timer | UI |
|-------|-------|-----|
| Idle | Stopped | No timer visible |
| Running | Counting down | Progress bar fills |
| Paused | Frozen | "breathe" shown |
| Complete | At 00:00 | Pulsing "restart" |

---

## Starting Focus

1. Click play icon on any task/habit
2. Timer appears, countdown begins
3. Non-focused tasks recede (7% opacity)
4. Header shows timer

---

## Controls

| Action | Label | Effect |
|--------|-------|--------|
| Pause | "breathe" | Freezes timer |
| Resume | (tap again) | Continues |
| Exit | "rest" | Ends session, exits mode |
| Complete | "restart" | Starts new session |

---

## Session Tracking

```javascript
// Per-task session count
today_trello_focus: {taskId: sessionCount}

// Daily stats
stat_focus_mins_today: number
stat_focus_mins_alltime: number
```

`today_trello_focus[id]` is set to 1 (engaged) on **any** partial focus session — Escape,
task-switch, or completion. Guard: if the count is already > 0 (set by `_logSession` on a
completed pomodoro or `_focusOnCheck`), `closeUI` skips the increment to avoid double-count.
Full completion still increments via `_logSession`; partial-only sessions are caught by
`closeUI`'s `_hadTime && count === 0` guard.

---

## Visual Treatment

### Focused Task
- Full opacity
- Accent border glow
- Timer bar below

### Non-Focused Tasks
- 7% opacity (`--opacity-recede`)
- No interaction

### Done Tasks (during focus)
- 3.5% opacity (`--opacity-recede-done`)

---

## Sound

| Event | Sound |
|-------|-------|
| Start | Rising tone (520→680 Hz) |
| Complete | Chime (4 notes) |
| Pause/Resume | None |

---

## Haptics

| Event | Pattern |
|-------|---------|
| Start | Medium impact |
| Complete | Success pattern |
| Pause | Light tap |

---

## Picture-in-Picture (v2.8.5)

Optional floating timer window:
- Auto-opens when focus starts
- Shows time + task name
- Controls: breathe, rest
- Syncs with main timer

Supported: Chrome, Edge (Chromium)
Not supported: Safari, Firefox (behind flag)

---

## Reset Behavior

- `lastActive` (manual tasks) and `today_trello_focus` (Trello tasks) update on **any** focus
  engagement — partial or complete (v2.18.8/v2.18.11, BUG-043). Previously required a full
  25-min pomodoro via `_logSession`.
- Removes task aging (`data-age-bucket`) immediately on `closeUI`; the 7s Trello patch cycle
  confirms it on its next pass.
- Task "feels fresh" after any genuine engagement, not just completed sessions.

---

## Gotcha: timer DOM lives inside the task's list (BUG-027)

`openUI()` does `taskEl.after(timerEl); timerEl.after(kbdHint)`, so the shared `timerEl` +
`kbdHint` become **children of whatever list holds the focused row** — `#trelloList`,
`#manualList`, etc. `#trelloList` is re-rendered every ~7s by `renderTrello()`, so anything
that walks `#trelloList.children` (e.g. index-based repositioning) **must filter to
`.task[data-taskid]`** or it will count the timer/hint as cards and churn the focus UI.
Manual list avoids this (full `innerHTML` rebuild + `_focusReanchor`); habits don't tick-render.

Also: a **completed** session keeps `taskStates[id].rem === 0`. Any "resume in-progress
session" check must use `rem > 0 && rem < TOTAL`, else a completed-then-dismissed task
re-opens idle instead of starting fresh on click.
