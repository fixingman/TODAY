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

**Header entry (v3.5.3, BUG-151 follow-up):** fade chrome over `--dur-exit`, then animate CSS blur from0 to6px over half that beat. The header alone omits the SVG noise reference: switching from `none` to a reference filter snaps to full blur before dimming, leaving a bright haze. Preserve its glass background, pinned geometry and final receded opacity.

**Offscreen paint (v3.6.1, BUG-151):** capture which header/groups are wholly above the viewport before lock and suppress their painting, without removing flow space or moving geometry. A fully offscreen header skips filter/transition compositing. Visible groups retain their fade/blur. Restore visibility after actual exit animations finish; an older exit cannot clear a newer session’s guard. This addresses a rendering exposure independently of rectangle continuity; installed Chrome confirmation remains separate.

### Scroll lock and the header (BUG-098)
- Entering focus sets `body { position: fixed; top: -scrollY }` and animates `top` for the nudge. A `position: sticky` header has nothing to stick to inside a fixed body: it sits at the top of the body, which is off-screen by `scrollY`, and then rides the nudge — seen as the nav being shoved up when a task near the bottom enters focus.
- Fix: the lock adds `body.focus-locked`, under which the header is fixed at its current viewport top (v3.5.1; formerly forced to0), and pads the body by the header's height so nothing below shifts when it leaves the flow. `_doUnfix()` clears both. The lock also clears the splash's leftover inline opacity transition on the header so the recede beat governs.
- **Header continuity (local v3.5.1, BUG-151):** capture the current viewport top before pinning, including a partially/offscreen header on a long list; clear that owned inline top on unlock. With Explore docked, retain the available Today-column width instead of expanding to the viewport. Logo/navigation geometry stays fixed while the existing blur/opacity changes; entry and exit are sampled frame by frame with the sidebar open/closed. Scroll lock, task positioning and restored padding remain unchanged.

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

## Companion Help (contextual availability; November 18 approval)

Ask is hidden by default. A deliberate desktop Focus entry prepares at most one suggestion through the existing configured AI route. No request runs on boot/session restoration, re-anchor, tick, pause/resume, feedback or dismissal. A deliberate new visit after exit can prepare again; restarting the timer within the same visit does not. No configured AI or mobile Focus entry means no request.

**Availability:** preparation is quiet and leaves the counter/progress controls accessible. The same request chooses a useful question/action or abstains; there is no second judge call. A valid prepared suggestion reveals the existing `✦ ask` button in accent with a gentle WAAPI breath. Pausing hides the ready cue from layout, tab order and the accessibility tree; resuming can reveal the same candidate without a call. Reduced motion keeps a static cue. Invalid output, abstention, missing helper, network/HTTP/body failure and the existing 25s deadline leave Ask hidden with no automatic retry or error attention.

**Reveal:** tapping the cue reveals the cached line in the original 34px answer row, cancels the cue pulse and activates the existing feedback controls. It makes no request. Only this reveal records the existing private `focus question` spoken line and enables wording feedback; an unseen candidate is not a shown/accepted reading. Tapping the answer dismisses it, restores the counter and hides Ask for the rest of that visit. Keyboard dismissal returns focus to the counter. Neither reveal nor dismissal changes the timer's running/paused state.

**Content:** authoritative task text or habit name remains the only factual input, JSON quoted as untrusted data. No task age/session/return history, other tasks, Memory inferences, clock or Calendar facts. The task prompt permits one consequential clarification or supported action; it abstains for generic advice, restatements, sufficient actions and deliberate waits. Habits retain a separate name-only question-or-silence prompt with no forced cue planning, coaching or 25-minute requirement. The transport is a closed `kind`/`text` JSON object; only question/action (habit: question only) with nonempty single-line text under 20 words and at most 320 characters can earn a cue. Format and the model's abstention decision do not certify actual usefulness; Can's real-use judgment remains required.

**Ownership:** pending, ready and displayed suggestions belong to the current owner/raw source/display snapshot/local date/habit day/provider/key. Source edits, completion, archive/deletion, detached owners, connection changes, day changes, exit/switch/restart and reload invalidate them. Current-source checks run after helper load, headers/body and before reveal; the existing observer/one-second active check also withdraws ready candidates. The 25s deadline includes helper loading and response-body parsing. A stale response cannot overwrite a newer visit or enter spoken history. Prepared prose stays in memory only and is discarded on dismissal/exit; it is never added to a feedback store, sync or backup.

**Feedback:** landed / not really, revision and clear still rate only the exact revealed answer in the current session. One preparation per visit means these whole-reply votes no longer feed a second generation in that session; they do not become persistent or cross-session style evidence. The separately approved optional fixed wording concerns still guide a later eligible preparation for that same unchanged owner/device within 7 days / 20 owners / 16 KiB. Earlier answer prose never enters that store or later request. Clear/withdrawal/expiry/source/config fences remain, including between preparation and reveal. No new feedback collection or automatic learning.

Gmail draft and web-link actions remain in their own existing blocks; the ready Ask cue always reveals its prepared suggestion rather than opening a different action.

**Copy appearance (Can, October 28):** restored the exact focused Copy rule from before `43f3d378`: inherit the shared CTA’s muted color at `--opacity-copy` (0.45), with the existing white/full-opacity border treatment on hover and accent copied feedback. September’s `43f3d378` / `98dca8d1` contrast corrections had made it permanently bright. The requested dim resting state is now a documented contrast exception; clipboard behavior/reset remain unchanged.

**Responsive answer width (v2.101.1):** the current delivered answer and its button area are observed independently. Width changes coalesce a fresh, source-fenced overflow measurement; scrolling starts when needed and stops when the line fits. v2.101.2 measures the text Range width directly, avoiding native-button overflow reporting and the current translated position. Feedback expansion/selection does not change the answer width or wording. Dismissal cancels queued layout work, and late observations cannot restore an old answer. Motion preferences remain authoritative.

**Motion:** only the ready cue breathes through WAAPI; preparation is invisible. Reduced motion uses the static accent cue. Reveal, pause, dismissal, invalidation and Focus close cancel the breath.

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

**Gmail feedback (v2.104.0 dev):** the existing Gmail component may hide a rejected thread; its draft/link actions remain separate from the prepared Ask cue. Accepted Ask answers stay isolated when Gmail feedback changes. Native controls/Space retain timer semantics; feedback expansion, current-card reconciliation and resize use the existing timer-expansion hook. Exiting synchronously cancels lookups/drafts and removes visit-local Undo/retry permission. The existing Mail/Copy action remains, with optional wording controls below the actual draft; no extra task-answer feedback row.

**October 29 implementation:** 15D v2.106.0: optional wording in the existing feedback panel stores only fixed unclear/formal concerns for the same unchanged task or habit on this device for 7 days (20 owners/16 KiB). Earlier answers stay out of this store and cross-session guidance; existing private spoken history is unchanged. Landed/not-landed remains an active-session rating; it does not persist or trigger another preparation. Exact current answer identity, owner/source hashes/checksums, independent clocks, expiry/null withdrawal and clear watermark protect edits/deletion/completion/archive/AI Forget/Memory clear/cross-tab changes. Accepted answers stay stable on feedback; pending responses are fenced after preparation/headers/body and before display. A later deliberate Focus entry consumes current guidance; merely preparing a candidate creates no feedback support. Extra wording controls require its own disclosure; landed adds no row. Task/habit separation, keyboard/Escape, 24 px targets, real fonts and 320 px wrapping are covered.

The lazy feedback controller observes its panel as well as the answer/toggle. An already-open disclosure wrapping after resize updates timer max-height; controls cannot remain clipped below the answer. The regression checks natural versus displayed height before any disclosure toggle, and keyboard clear returns focus to wording.

**Exploration entrance (local v3.1.0):** an explicit Explore action closes Focus through its existing header-entry path. A linked task’s Explore button opens the conversation instead of also opening that task’s Focus view. It creates no observation or AI request by itself; the task snapshot is offered for deliberate inclusion. Existing native-control keyboard and timer behavior stays.
