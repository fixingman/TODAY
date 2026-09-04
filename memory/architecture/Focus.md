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

### Chrome (during focus, v2.82.4)
- The morning nudge, the triage bar and the sticky header recede to `--opacity-recede-chrome` with the same noise-blur as section headers. Only the add bar and its mic buttons stay crisp: they are the one thing you can still do.
- The header keeps pointer-events — its buttons exit focus and open their panel (v2.75.15). Nudge and triage bar go `pointer-events: none`.

### Scroll lock and the header (BUG-098)
- Entering focus sets `body { position: fixed; top: -scrollY }` and animates `top` for the nudge. A `position: sticky` header has nothing to stick to inside a fixed body: it sits at the top of the body, which is off-screen by `scrollY`, and then rides the nudge — seen as the nav being shoved up when a task near the bottom enters focus.
- Fix: the lock adds `body.focus-locked`, under which the header is `position: fixed; top: 0`, and pads the body by the header's height so nothing below shifts when it leaves the flow. `_doUnfix()` clears both. The lock also clears the splash's leftover inline opacity transition on the header so the recede beat governs.

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

## Session Persistence (v2.43.0)

Focus sessions now survive iOS killing the PWA while backgrounded. Every tick writes
`today_focus_session = { taskId, rem, savedAt, paused }` to localStorage. On reload,
`_tryRestoreFocusSession()` (called from `renderManual()` and `renderTrello()`) checks:

- **Task gone or done** → clear key, ignore
- **Session would have already completed** (`Date.now() - savedAt > rem * 1000`) → call
  `_recordFocusComplete(taskId)` silently (no chime, no UI) — stats + 🍅 badge updated
- **Time still remaining** → restore timer state, call `openUI()`, resume ticking

`_saveSession()` is also called in `start()` and `pause()` so the state is valid from the
first second. `closeUI(true)` and `_recordFocusComplete()` both remove the key so stale state
can't resurrect after a deliberate end.

---

## Reset Behavior

- `lastActive` (manual tasks) and `today_trello_focus` (Trello tasks) update on **any** focus
  engagement — partial or complete (v2.18.8/v2.18.11, BUG-043). Previously required a full
  25-min pomodoro via `_logSession`.
- Removes task aging (`data-age-bucket`) immediately on `closeUI`; the 7s Trello patch cycle
  confirms it on its next pass.
- Task "feels fresh" after any genuine engagement, not just completed sessions.

---

## Companion Question (v2.45.0–v2.64.9)

A `✦ ask` button lives inside the focus timer bar. Tapping it asks the AI for a single question to sit with before the clock takes over.

**Trigger:** click `.focus-ai-timer-btn` → sets `ai-active` on `.focus-timer` → `_focusAskAI()` replaces the button label with `thinking…`, then with the returned question. Tapping the question again dismisses it and restores `✦ ask`.

**Prompt shape:** task text plus contextual signals: total sessions on the task, age, revived/deferred state, exact device-local time with broad period, peak-hour match, sessions completed today, and up to four confirmed memory inferences. The model returns one question under 18 words. If it refers to time, it must name the supplied clock value rather than say something vague such as “this late.”

**State:** question state is per-session, not persisted. `closeUI` resets it (`ai-active` cleared and button label restored). Silent fail if AI is not configured.

**Motion:** `thinking…` pulses through WAAPI and is skipped for `prefers-reduced-motion`. The animation is cancelled on success, dismissal, failure, and focus close.

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
