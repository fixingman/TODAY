# Focus Mode (Pomodoro)

> Timer system, states, and session tracking.

---

## Overview

25-minute focus sessions with optional breaks. One task at a time.

`assets/focus.js` owns DOM, sound, PiP, companion, persistence wiring, and lifecycle events.
DOM-free session creation, elapsed-time calculation, wall-clock restore correction, and
serialization live in `assets/focus-session.js` and are tested directly. The extraction does
not change stored keys or focus timing behavior.

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

1. On desktop, click a task/habit row or use its Enter key action (touch does not start this mode)
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
// Manual tasks / habits: cumulative session count on each record
focusSessions: number
// Trello: cumulative display count and separate daily activity map
today_trello_focus_total: {taskId: sessionCount}
today_trello_focus: {taskId: dailyCount}

// Daily stats
stat_focus_mins_today: number
stat_focus_mins_alltime: number
```

For Trello, `today_trello_focus[id]` is set to 1 (engaged) after partial focus when the
daily map has no activity yet. Full completion increments the daily and lifetime maps;
partial exit updates last-active without adding a completed session. Manual tasks likewise
refresh `lastActive` on partial exit, and `_logSession` increments their `focusSessions`
only on full completion or the existing check-off-during-focus path.

Focus completion and exits with elapsed time stamp `last_local_change` and queue the
normal retrying Dropbox autosave, including silent completion restored after suspension.
Manual task `focusSessions` is cumulative, not a daily counter. Sync keeps the highest
count and newest `lastActive` across Today/Soon/Past; it does not add concurrent totals
from two devices. New progress refreshes the row and heals stale remote copies (BUG-124).

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
- The morning nudge (including its separate reaction strip), the triage bar and the sticky header recede to `--opacity-recede-chrome` with the same noise-blur as section headers. Only the add bar and its mic buttons stay crisp: they are the one thing you can still do.
- The header keeps pointer-events — its buttons exit focus and open their panel (v2.75.15). Nudge and triage bar go `pointer-events: none`.
- The triage bar and the nudge's sibling reaction strip also join `_setFocusInert`'s reversible `inert`/`aria-hidden` state. Their low-opacity treatment is purely visual; Review and “landed / not really” cannot remain keyboard or screen-reader targets during focus, and return on exit.

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

`scripts/focus-test.mjs` provides a deterministic Document PiP window and covers
open-on-hide, task/time and accessible-control mirroring, Open, pause/resume,
completion→Again, restart, Rest, close, and persisted-session cleanup. A real
browser PiP pass remains required because the fake cannot reproduce OS window policy.

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

## Companion Help (task iteration v2.97.10; habit questions v2.97.0)

A `✦ ask` button lives inside the focus timer bar. Tapping it asks for one bounded line of help for the selected task; habits retain their separate question-only path.

**Trigger:** click `.focus-ai-timer-btn` → sets `ai-active` on `.focus-timer` → `_focusAskAI()` replaces the button label with `thinking…`, then with the returned help. Tapping it again dismisses it and restores `✦ ask`.

**Task prompt:** JSON-quoted task text only. No recorded focus/age/return history, other tasks, clock, person-wide patterns or Memory inferences. Clarify a consequential uncertainty first; otherwise offer one task-supported action or acknowledge a sufficient action/wait. No generic progress/finish-line question, invented blocker or forced 25-minute frame. Questions, steps and acknowledgements share a nonempty, single-line, under-20-word format guard; questions have one terminal question mark. Invalid results or failures stop loading without recording or another generation; a current task shows “No reply to show. Try again.” in the same button for an explicit retry. Stale owners reset quietly. Format is not a usefulness test; full contract in `architecture/AI.md`.

**Habit prompt:** an explicitly requested, separate name-only question about a useful choice for that habit. No automatic question on entry, new field, saved cue/answer, extra context or forced routine-planning question. The 25-minute timer remains as-is; the question does not imply the habit needs all 25 minutes. A single under-20-word question is accepted syntactically, otherwise Ask resets quietly. Accepted wording retains the existing private spoken-line record. No mobile focus entry or daily-nudge change; full privacy/quality limits: `architecture/AI.md` → Habit-specific request.

**Neutral availability:** Ask keeps its existing muted treatment. The history-density highlight and its CSS are removed: an old or returning task does not establish that useful help is available. No replacement badge, background generation or new attention signal.

**State:** displayed help state is per-interaction, not restored on reload (accepted prose still uses existing private spoken history). `closeUI` or another tap resets it, aborts pending work and restores the Ask label. Owner/source/connection checks fence late replies, including delayed response bodies and errors after a newer Ask. Habit edits/archive/removal/completion, detached rows and habit-day changes withhold pending delivery. The 25s deadline includes body parsing. Timer/session state is not changed by a request or failure. The help becomes the button's accessible name and polite announcement; dismissal restores “Ask for focus help”. Silent no-op if AI is not configured.

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
