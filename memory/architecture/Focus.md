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

**Native controls and task context (v2.99.0 local):** Space keeps native control behavior instead of toggling the timer (including activating focused buttons); the background Space shortcut remains. Web/Trello context has optional exact-card not useful, Undo and later show context in its existing action row. Hidden cards expose no source CTA, arrow or timer shortcut; Gmail Draft reply keeps its existing higher priority. This is local card control, not learned style or a task-completion signal. Focus exit synchronously invalidates the enrichment view even if its valid task-level lookup later caches a result. Unchanged list/storage refresh retains the live card and immediate Undo label; renderManual restores the focused timer control after reattachment. Data/expiry/rollback live in AI.md → Web/Trello task enrichment.

**Gmail ownership (v2.99.1 local):** Focus exit calls the Gmail component’s synchronous `closeFocus` before teardown. Focus-origin lookups and drafts cancel; stale task/text/grant/key/cache/visit replies, labels and Mail/Copy actions cannot affect another view. A valid capture-origin lookup may still cache for its unchanged task. Unchanged background refresh retains current context/draft controls; normal access-token refresh preserves the sign-in grant. Existing booking/no-draft and shortcut priority remain. Full provenance/expiry rules: AI.md → Gmail ownership.

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

**Cold audio preparation (v2.101.1):** `sound.js` prepares the one shared AudioContext during startup, before the first pointer or keyboard interaction. No node/tone is started at preparation. Browser autoplay policy keeps it suspended; the existing trusted gesture/sound paths resume the same context. This removes cold running-context construction from the first Focus/complete gesture. A rejected preparation retries on later use; absent APIs fail quietly and a closed context is recreated through the existing fallback. The sine-wave sound family and scheduling remain unchanged. Chrome’s [autoplay policy](https://developer.chrome.com/blog/autoplay#web_audio) documents pre-gesture suspended construction and later gesture resume. `sound-test.mjs` covers a deliberately blocking late constructor, real app input timing, no autoplay, unchanged tones and fallback paths. Installed iOS/background playback remains a real-device check.

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

**Trigger:** click `.focus-ai-timer-btn` → sets `ai-active` on `.focus-timer` → `_focusAskAI()` replaces the button label with `thinking…`, then with the returned help. Tapping the suggested line again dismisses the answer and every feedback row, restores `✦ ask` and the counter/progress controls, and leaves the timer running or paused as it was. Dismissal is neutral.

**Task prompt:** JSON-quoted task text is the only factual input; same-session replies/ratings may accompany it as untrusted presentation history, as described below. No recorded focus/age/return history, other tasks, clock, person-wide patterns or Memory inferences. Clarify a consequential uncertainty first; otherwise offer one task-supported action or acknowledge a sufficient action/wait. No generic progress/finish-line question, invented blocker or forced 25-minute frame. Questions, steps and acknowledgements share a nonempty, single-line, under-20-word format guard; questions have one terminal question mark. Invalid results or failures stop loading without recording or another generation; a current task shows “No reply to show. Try again.” in the same button for an explicit retry. Stale owners reset quietly. Format is not a usefulness test; full contract in `architecture/AI.md`.

**Habit prompt:** an explicitly requested, separate name-only question about a useful choice for that habit. No automatic question on entry, new field, saved cue/answer, extra context or forced routine-planning question. The 25-minute timer remains as-is; the question does not imply the habit needs all 25 minutes. A single under-20-word question is accepted syntactically, otherwise Ask resets quietly. Accepted wording retains the existing private spoken-line record. No mobile focus entry or daily-nudge change; full privacy/quality limits: `architecture/AI.md` → Habit-specific request.

**Neutral availability:** Ask keeps its existing muted treatment. The history-density highlight and its CSS are removed: an old or returning task does not establish that useful help is available. No replacement badge, background generation or new attention signal.

**State:** displayed help state is per-interaction, not restored on reload (accepted prose still uses existing private spoken history). `closeUI` or another tap resets it, aborts pending work and restores the Ask label. Owner/source/connection checks fence late replies, including delayed response bodies and errors after a newer Ask. Habit edits/archive/removal/completion, detached rows and habit-day changes withhold pending delivery. The 25s deadline includes body parsing. Timer/session state is not changed by a request or failure. The help becomes the button's accessible name and polite announcement; dismissal restores “Ask for focus help”. Silent no-op if AI is not configured.

**Exact-answer feedback (v2.101.0 / 15D):** the accepted answer retains its original 34px row. Its end-aligned feedback button has a reserved, measured area, separate from the clipped/moving answer text. It opens one sibling row with landed / not landed; selection does not add another row, regenerate, dismiss or pause. The current controls use direct vote revision and one **clear vote** action at the right edge of that same row; selecting an active rating again also clears it. Undo is removed because the first-vote behavior duplicated Clear. A selected rating uses the primary white text and the other uses muted gray. Clearing makes only this answer unrated; its text stays neutral repetition history and other answers retain their ratings. Closing the feedback row preserves the rating. Answer dismissal hides everything and restores the accessible counter; leaving/completing Focus clears the session’s replies and votes. The outer timer clips without becoming a scroll container, preventing keyboard focus from scrolling the answer during row expansion. Existing viewport overflow correction remains.

The lazy `focus-ask` component owns only the session adapter and controls. It keeps at most three valid replies, each at most 800 characters, for the current exact task/habit/source, local date/habit day and provider/key. Every accepted reply gets a separate transient identity, including repeated wording. The next explicit Ask includes those replies and current whole-reply ratings as untrusted presentation guidance; no inferred reason, style preference, task outcome or other-owner facts. Invalid/failed/over-cap replies never gain feedback influence. Source edits/deletion/check-off, day/config changes, exit, owner switch, completion and reload discard influence. DOM/source reconciliation and a bounded one-second active-session check invalidate dismissed history too. The normal 25s request/body deadline also covers lazy loading; failed loading stays explicitly retryable. No new model call, persistent store, sync or backup field. The old `focus question + date` spoken history is not repurposed as a feedback identifier. Task/habit writer rubrics remain unchanged.

**Copy appearance (Can, October 28):** restored the exact focused Copy rule from before `43f3d378`: inherit the shared CTA’s muted color at `--opacity-copy` (0.45), with the existing white/full-opacity border treatment on hover and accent copied feedback. September’s `43f3d378` / `98dca8d1` contrast corrections had made it permanently bright. The requested dim resting state is now a documented contrast exception; clipboard behavior/reset remain unchanged.

**Responsive answer width (v2.101.1):** the current delivered answer and its button area are observed independently. Width changes coalesce a fresh, source-fenced overflow measurement; scrolling starts when needed and stops when the line fits. v2.101.2 measures the text Range width directly, avoiding native-button overflow reporting and the current translated position. Feedback expansion/selection does not change the answer width or wording. Dismissal cancels queued layout work, and late observations cannot restore an old answer. Motion preferences remain authoritative.

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

**Ask source boundary (v2.101.0):** factual task input comes from the authoritative stored wording, preserving its tags and URLs while excluding rendered session badges and link labels. A separate display snapshot strips presentation metadata and still invalidates on displayed-text changes. Deleting a focused owner closes the detached timer as well as discarding feedback.

## Audio preparation — 15G (v2.103.2)

Sound remains self-contained in assets/sound.js: the five existing sine-wave envelopes and haptics do not change. Where the browser supports a silent output sink, prepare it before input and asynchronously attach only the system default. Gesture-bound resume stays intact; an early cue waits for output readiness without blocking the timer. Only the latest pending cue may wait up to one second; closed/replaced contexts and expired cues do not play later. Once ready, original tone overlap is preserved. Unsupported/refused setup uses the existing default-context path without an unhandled rejection. No device picker, enumeration, new permission, storage or AI/provider change. sound-test covers slow default construction, held/refused output, stale contexts/cues, all tones and native autoplay/default routing. See [Chrome’s audio output API contract](https://developer.chrome.com/blog/audiocontext-setsinkid).

**Gmail feedback (v2.104.0 dev):** the existing Gmail component may hide a rejected thread; its hidden draft button cannot intercept Ask. Accepted Ask answers stay isolated when Gmail feedback changes. Native controls/Space retain timer semantics; feedback expansion, current-card reconciliation and resize use the existing timer-expansion hook. Exiting synchronously cancels lookups/drafts and removes visit-local Undo/retry permission. The existing Mail/Copy action remains, with optional wording controls below the actual draft; no extra task-answer feedback row.
