# TODAY — Design Document
> Single source of truth for design decisions, visual system, and interaction rules.  
> Update this file whenever a meaningful decision is made — before or alongside the code change.

---

## 1. Philosophy

**One screen. One day. One list.**

TODAY is a single-day task manager. It shows only what matters right now — today's tasks. Nothing carries over. Nothing accumulates. The morning is a clean slate.

- **No history.** Done tasks are acknowledged, not archived.
- **No projects.** No labels, no priorities, no due dates.
- **No anxiety.** The UI should feel calm, dark, and focused.
- **Offline-first.** The app must work without internet after the first load.

### Core UX Principles

1. The fastest path to adding a task must always be one tap / one keystroke. On desktop, `Shift+;` focuses the add input from anywhere (no input currently focused).
2. Completing a task should feel satisfying — not administrative. Unchecking is neutral — no celebration.
3. The empty state is a reward, not a failure. Two distinct states: **"Nothing added yet"** (truly empty) vs **"✦ All done for today"** (all tasks completed — the reward moment). Never conflate them.
4. Every animation must serve meaning, not decoration.
5. Never show a loading state for local data.
6. Chrome is distraction. Hide the scrollbar — scroll works, the bar never shows.

### User Context

- User opens the app first thing in the morning, often on mobile.
- Primary use: brain-dump of the day's intentions, then progressive completion.
- Trello integration pulls in work tasks — user doesn't want to re-enter them.
- Dropbox sync shares state across devices (desktop → mobile).
- User works in a dark environment — high-contrast accent on dark background is intentional.
- Local file access (`file:///`) is used during development — absolute font/asset paths won't resolve locally.

---

## 2. Tonality

TODAY speaks like a calm, present friend — not a system, not a manager, not a coach.

### Voice Principles

1. **Human, not technical.** Describe what the person is doing, not what the UI is doing.
   - ✗ "Close panel" → ✓ "rest"
   - ✗ "Pause timer" → ✓ "breathe"
   - ✗ "Session completed" → ✓ "restart"

2. **Present tense, active voice.** Speak to now, not about later.
   - ✗ "Tasks will be cleared" → ✓ "All done for today"
   - ✗ "No tasks have been added" → ✓ "Nothing added yet"

3. **Calm, not urgent.** The app is a tool for focus, not a source of pressure.
   - No exclamation marks in system text
   - No gamification language ("streak broken!", "keep going!")
   - Gentle acknowledgment over celebration

4. **Brief, not minimal.** Use enough words to be warm, not so many to be noisy.
   - Labels: 1-3 words
   - Status messages: 1 short sentence
   - Empty states: human, not robotic

5. **For humans, not robots.** Acknowledge that minds and bodies need rest.
   - "breathe" instead of "pause" — it's okay to stop
   - "rest" instead of "close" — stepping away is valid
   - The tool serves the person, not the other way around

### Vocabulary

| Instead of | Use |
|------------|-----|
| Close | rest |
| Pause | breathe |
| Resume | (no label — just tap again) |
| Reset | restart |
| Completed | done |
| No tasks | Nothing added yet |
| All tasks done | All done for today |
| Delete | (swipe or icon — no label) |
| Cancel | (just close — no label) |
| Submit | (action-specific: "Connect", "Save") |

### Focus Mode Language

The Pomodoro timer uses zen-adjacent language:
- **breathe** — pause the timer, take a moment
- **rest** — step away from focus mode entirely
- **restart** — begin a fresh session

This frames productivity as sustainable, not extractive.

---

## 3. Design Tokens

All visual values **must** reference a token. Never hardcode a colour, spacing, radius, or duration outside `:root`.

### Colour

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#0e0e10` | Page background |
| `--color-surface` | `#17171a` | Card / hover surface |
| `--color-surface2` | `#1f1f24` | Elevated surface — panels, config |
| `--color-border` | `#2a2a30` | Default border |
| `--color-text` | `#e8e8ec` | Primary text |
| `--color-muted` | `#6b6b78` | Secondary text, placeholders, labels |
| `--color-accent` | `#c8f060` | Primary accent — lime green |
| `--color-accent-dim` | `rgba(200,240,96,0.12)` | Ghost accent background |
| `--color-accent-glow` | `rgba(200,240,96,0.28)` | Accent glow border |
| `--color-danger` | `#ff5f5f` | Error, delete |
| `--color-danger-dim` | `rgba(255,95,95,0.10)` | Danger background tint |
| `--color-danger-border` | `rgba(255,95,95,0.20)` | Danger border |
| `--color-highlight` | `#579dff` | Info, Trello links |
| `--color-done-line` | `rgba(107,107,120,0.55)` | Strikethrough on done tasks |
| `--color-noise-overlay` | `rgba(255,255,255,0.03)` | Texture layer |

**Backward-compat aliases** (`--bg`, `--surface`, `--accent`, etc.) are defined in `:root` and must never be removed — they are used in inline styles and JS. `--highlight-ui` aliases to `--color-accent` and is used for interactive UI elements (primary buttons, input focus, config links) — distinct from `--highlight` which is for external/info content.

### Spacing

4px base grid. Off-grid exceptions listed below.

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-20` | 80px |

**Intentionally off-grid (do not tokenise):**
- `2px` — `.task-list` gap (hairline rhythm between rows)
- `1px` — `.task-check` margin-top (optical vertical alignment)
- `3px` — changelog dots, loading animation
- `10px 14px` — input padding (ergonomic, not grid-derived)
- Mobile breakpoint overrides

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Badge, tag |
| `--radius-md` | 6px | Input, small card |
| `--radius-lg` | 8px | Task row, button |
| `--radius-xl` | 12px | Panel, config section |
| `--radius-full` | 99px | Pill |

### Typography

Two fonts only. No exceptions.

| Token | Value | Usage |
|---|---|---|
| `--font-display` | `'Syne', sans-serif` | Logo, headings, date, section labels |
| `--font-mono` | `'DM Mono', monospace` | Everything else |

**Token audit (v1.7.3) — new tokens added:**

| Token | Value | Purpose |
|---|---|---|
| `--accent-focus-bg` | rgba(200,240,96,0.04) | Focused row background |
| `--accent-focus-border` | rgba(200,240,96,0.12) | Focused row + timer border |
| `--accent-check` | rgba(200,240,96,0.55) | Focused checkbox border |
| `--accent-check-hover` | rgba(200,240,96,0.90) | Focused checkbox hover |
| `--accent-check-glow` | rgba(200,240,96,0.10) | Focused checkbox glow |
| `--accent-timer-bg` | rgba(200,240,96,0.022) | Timer bar background |
| `--accent-timer-fill` | rgba(200,240,96,0.08) | Timer progress fill |
| `--accent-timer-paused` | rgba(200,240,96,0.03) | Timer fill when paused |
| `--opacity-recede` | 0.07 | Non-focused tasks during focus mode |
| `--opacity-recede-done` | 0.035 | Done tasks receded in focus mode |
| `--opacity-recede-chrome` | 0.08 | Headers/date receded in focus mode |
| `--opacity-copy` | 0.45 | Copy button at rest in focus mode |
| `--bg-glass` | rgba(14,14,16,0.92) | Sticky header frosted background |
| `--text-xs2` | 12px | Clean alias for 12px step (was `--text-sm2` only) |

**Important:** `@font-face { font-family: ... }` declarations must use the raw string (`'DM Mono'`, `'Syne'`) — CSS custom properties are not resolved inside `@font-face`. The tokens reference these same strings and are used everywhere else.

| Token | Value | Usage |
|---|---|---|
| `--text-xs` | 10px | Tiny labels, kbd hints |
| `--text-sm` | 11px | Small labels, session count |
| `--text-sm2` | 12px | Config hints, secondary meta |
| `--text-base` | 13px | Base size, timer display |
| `--text-task` | 13.5px | Task row text — between sm and base |
| `--text-md` | 14px | Body default (`html, body`) |
| `--text-lg` | 16px | Buttons, prominent controls |
| `--text-xl` | 22px | Section headings |

Fonts are self-hosted under `/fonts/` and pre-cached by the service worker. The app must never ping Google Fonts on load.

### Motion

| Token | Value | Usage |
|---|---|---|
| `--dur-fast` | 0.15s | Enter snaps, hover changes, timer open |
| `--dur-base` | 0.18s | General UI transitions |
| `--dur-mid` | 0.20s | Focus mode exit, timer element fades |
| `--dur-slow` | 0.30s | Recede/reveal, opacity fades |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Overshoot-free deceleration |
| `--ease-std` | `ease` | Generic |

### Z-index

| Token | Value |
|---|---|
| `--z-base` | 1 |
| `--z-splash` | 500 |
| `--z-overlay` | 999 |

### Opacity

| Token | Value | Usage |
|---|---|---|
| `--opacity-subtle` | 0.28 | Checkbox progress fill, timer time (paused) |
| `--opacity-dim` | 0.35 | Done state, secondary badges, mobile delete button |
| `--opacity-label` | 0.40 | Subtle hints, kbd hint, noise overlay |
| `--opacity-mid` | 0.50 | Session count in active focus |
| `--opacity-soft` | 0.60 | Session count on hover |
| `--opacity-muted` | 0.65 | Paused label |
| `--opacity-strong` | 0.80 | Timer time (running) |
| `--opacity-hover` | 0.85 | Button hover states |

Note: `style.opacity` in JS cannot use CSS custom properties — use the raw value with a comment referencing the token (e.g. `check.style.opacity = '0.4'; // --opacity-label`).

---

## 4. Visual Language

### Colour usage

- Accent (`--color-accent`) signals the one actionable thing: add, primary CTA, active state. Not used for structural chrome like section dots.
- Muted (`--color-muted`) is for all secondary information: labels, counts, hints, timestamps.
- Danger (`--color-danger`) only appears on destructive hover states — never as a resting colour. **Exception:** `.badge.due` uses `--danger` at rest because a due-date badge is genuinely time-critical information, not a UI state. This is an intentional exception, not a violation.
- Highlight (`--color-highlight`) is for external links and info-level UI elements — Trello card links, config panel titles, external CTAs (e.g. buy-me-coffee). Not for primary actions or task-level UI.
- Done tasks use `--color-done-line` for strikethrough and reduced opacity — they recede, not disappear.

### Layout

- Single-column, centred, max-width constrained.
- iOS safe-area: `.app` uses `calc(48px + env(safe-area-inset-top))` for top padding. `viewport-fit=cover` in meta.
- Section rhythm: `.section` and `.config-panel` use `--space-8` (32px) margin-bottom.
- Config panel internal padding: `--space-5` (20px).

### Task row

- Flex row, `align-items: flex-start` (supports multi-line text).
- Gap: `--space-3`. Padding: `--space-3` vertical, `--space-4` horizontal.
- Checkbox tap target: `.task-check::after` with `inset: -13px` — expands to 44px minimum (mobile).
- Delete button: `align-self: center` so it stays vertically centred regardless of text height.
- On hover: surface background, delete button fades in.
- Done state: strikethrough, opacity reduced, delete hidden.

### Section header

- Both sections: count → label. No dot, no pill — the number leads, the label follows.
- Count uses `--color-muted`, no background, no border. Plain text, same weight as the label.
- Pomodoro session count (`N 🍅`) matches this weight: `--color-muted`, full opacity on hover, `0.35` on done tasks.

### Empty state

- Padding: `var(--space-6) var(--space-4)`.
- Positive framing — reaching the empty state is a reward, not a void.

---

## 5. Motion & Animation

### Core rules

- **Prefer opacity over movement.** If a state change can be communicated through opacity alone, do not add transform. Movement implies spatial meaning — only use it when there is spatial meaning.
- **Snappy in, gentle out.** Enter transitions use `--dur-fast`. Exit/collapse use `--dur-mid`. Responsive on click, graceful on release.
- No animation should block interaction or feel like a wait.
- `will-change` only on elements that actually animate — don't pre-apply broadly.

### What moves, and how

| Element | Property | Duration | Notes |
|---|---|---|---|
| Task hover | `background` | `--dur-fast` | Surface tint only |
| Task completion | `opacity` + strikethrough | `--dur-fast` | No translateY |
| Task removal | `opacity` + `scaleY` | `--dur-slow` | GPU-only |
| Empty state | `opacity` | `--dur-slow` | No translateY — caused jumpiness |
| Focus recede | `opacity` | `--dur-mid` | 0 → 0.07, nothing moves |
| Focus exit | `opacity`, `background`, `border-color` | `--dur-mid` | Reverses recede |
| Timer bar open | `max-height` + `opacity` | `--dur-fast` | Expands downward only |
| Splash entrance | `translateY` + `opacity` | staggered | One-time cinematic reveal |

### Hard bans

- **`translateY` is banned for task-level micro-interactions** — causes visible jumps mid-list.
- **`translateX` is banned on task rows** — causes horizontal drift in/out of focus mode.
- **`font-size` and `scale()` on `.task-text` are banned** — cause sibling reflow.
- Exception: splash uses `translateY(-8px → 0)` on the whole app reveal. Intentional one-time entrance.

---

## 6. Focus Mode (Pomodoro)

Desktop only. Mobile never enters focus mode — `@media (hover: hover)` guards all CSS, `matchMedia` guard in JS.

### Interaction model

| Action | Result |
|---|---|
| Click task or habit row | Start 25min session, open timer UI |
| Click outside | Dismiss UI, pause timer |
| Click same task/habit | Re-open UI, auto-resume |
| Click different task/habit | Start fresh session, clear previous state |
| `space` | Pause / resume (blocked if input is focused) |
| `esc` | Full stop + reset |
| Tab away / hidden | Wall-clock correction on return |
| Check task during focus | Log partial session, exit focus, mark done |
| Copy button (focused task) | Copy clean task text to clipboard |

### State model

Each task has its own `{ rem, running, paused, wallStart }` in the `taskStates` memory map.

| State | `running` | `paused` | On re-open |
|---|---|---|---|
| Active | `true` | `false` | Already ticking |
| Dismissed | `false` | `false` | Auto-resumes |
| Explicitly paused | `false` | `true` | Shows paused label, waits for input |
| Complete | `false` | `false`, `rem: 0` | Shows 00:00 |

- State survives UI dismiss.
- Cleared on `esc` or task switch.
- **Not persisted to localStorage** — resets on page reload. A fresh day is a fresh start.
- `focusSessions` (completed count) **is** persisted to `manualTasks` in localStorage.

### Animation contract

- **Enter:** focused task snaps in (`background` + `border-color`) at `--dur-fast`. Feels immediate.
- **Recede:** other tasks fade to `opacity: 0.07` at `--dur-mid`. Nothing translates.
- **Timer bar:** slides open downward via `max-height: 0 → 36px` at `--dur-fast`. One `rAF` delay — task snaps first, bar follows. Never shifts tasks above.
- **Exit:** recede reverses at `--dur-mid`. DOM cleanup after transition completes.
- No CTAs inside focused state. Controls are keyboard and click only.

### Session count

- Inline after task text: `N 🍅`. DOM order: text → Trello link → session count.
- Also rendered inline in habit name for habits used in focus mode.
- `opacity: 0` default → `opacity: 1` on hover → `opacity: 0.35` on done tasks.
- Color: `var(--muted)` — same visual weight as section counts.
- Desktop only — never rendered on mobile.
- Persisted to `manualTasks[i].focusSessions`, `trello_focus` map, or `habitsList[i].focusSessions` depending on row type. All three paths go through `_logSession(id)`.

### Sound design language

Synthesised via Web Audio API. No audio files. Fails silently. All sine wave — purest, least harsh. Four sounds form a family: each is a short gesture, differentiated by pitch, direction, and duration. Never plays on load. No loops, no repeats.

| Sound | Trigger | Character | Frequency | Duration |
|---|---|---|---|---|
| **Start** | New session begins, reset from 00:00 | Snappy ascending chirp — intention | 520→680 Hz | ~150ms | 0.20 peak |
| **Resume** | Timer resumed after pause | Ascending chirp — start's quieter sibling. Same action family, smaller gesture | 500→600 Hz | ~120ms |
| **Complete task** | Task checked off | Warm descending two-step — satisfaction | 600→480→380 Hz | ~240ms |
| **Session end (chime)** | 25min timer reaches 00:00 | Low organic growl with beating wobble — earned rest | Two osc: 210→148 Hz + 202→141 Hz, ~8 Hz detune creates rumble | ~1.4s |

**Design rules:**
- Start and resume are ascending — they signal forward motion. Resume is quieter and shorter than start — it's a continuation, not a beginning.
- Complete is descending — it closes a loop. Two-step shape (fast drop, slower drift) makes it feel deliberate, not accidental.
- Session chime is the only two-oscillator sound. The ~8 Hz frequency gap between the two creates amplitude beating — an organic wobble that makes it feel alive rather than electronic. Lower register keeps it warm, not alarming.
- All gains are present but not harsh (peak 0.12–0.26). Audible alongside background music without demanding attention.
- New sounds should follow the same sine/gesture pattern — differentiated by pitch direction, step count, and duration. Avoid harsh waveforms (square, sawtooth).

---

## 7. Habits

### Philosophy — why habits fit despite the "one day" tension

TODAY's core thesis is one screen, one day, no accumulation. Habits are explicitly not that — they persist across days, they have history, they are by definition multi-day. This tension is real and was unresolved in the initial MVP.

The resolution: **habits are a different layer of intention, not a different kind of task.** Tasks are what you do today. Habits are who you are trying to become. They live in the same app because both inform how you approach the morning — but they are intentionally separated into their own panel, not mixed into the task list. The daily reset still applies to tasks. Habits carry their own continuity.

The key design constraint: **habits must not introduce the anxiety that tasks are designed to remove.** This rules out streak counters, which create a single point of failure and shift focus from the habit itself to the number. See Product-research.md §6 for the full decision log.

### Habit strength — not streak

The metric shown per habit is **habit strength (0–100%)**, computed via exponential smoothing over the last 90 days. Not a consecutive streak counter.

- A few missed days reduce the score slightly — they do not reset it to zero
- Consistency over time builds toward ~90–100% — achievable but not trivially so
- The score recovers quickly when you return after a gap
- `hot` accent colour applies at ≥ 70% — a genuinely earned threshold, not just 7 consecutive days

This framing is consistent with TODAY's philosophy: each morning is its own moment. Today's check contributes to something real without being the only thing that matters.

### Interaction model

| Action | Result |
|---|---|
| Tap habit checkbox | Toggle done for today — strength updates immediately |
| Tap habit name (edit mode) | Name becomes editable input |
| Edit mode → delete | Habit removed, edit mode stays active |
| Edit mode → Done | Names saved, inputs swap back to text |
| New habit | Input row opens, habit appended on Enter |
| Long-press row (mobile) | Initiates drag-to-reorder after 380ms |
| Drag row (desktop) | Grab cursor on hover, drag after 4px movement |

### Visual treatment

- Row layout: 4-column grid — checkbox | name | dot strip | strength %
- Dot strip: 21 days on desktop, 7 days on mobile (older dots hidden via CSS)
- Dot opacity fades with age: last 7 days fully opaque, older dots fade to ~12%
- Today's dot has an outline ring — distinguishes it from history
- Strength % uses `--color-muted` at rest, `--color-accent` (hot) at ≥ 70%
- Done-today row: checkbox filled with accent, name at full opacity (habits are positive — no strikethrough, no recede)
- Edit mode: checkbox hidden (visibility: hidden, not display: none — holds column width)

### What habits do NOT do

- No strikethrough on completion — checking a habit is positive reinforcement, not closing something out
- No celebration particle burst (unlike tasks) — habit completion is quiet and accumulative, not a one-time moment
- No carry-over to task list — habits are never mixed with today's tasks
- No priority, label, or due date — habits are binary, daily, and timeless
- No swipe-to-complete — see §7 Interaction Decisions

### Sound

Habit check has its own sound — distinct from the task complete sound:

| Sound | Trigger | Character | Frequency | Duration |
|---|---|---|---|---|
| **Habit done** | Habit checked | Warm descending three-step — quieter and slower than task complete | 520→400→300 Hz | ~320ms |

Slower and lower than the task complete sound — deliberate, grounded. A habit check is not a one-time win, it's a quiet confirmation of continuity.

---

## 8. Interaction Decisions

A record of gestures and interaction patterns that were considered, built, and either kept or removed — and why. This section exists so the same decisions don't get revisited without context.

### Drag-to-reorder

**Status: Implemented (v1.6.36+)**

All three lists — manual tasks, Trello cards, habits — support drag-to-reorder.

**Desktop:** hover over any row reveals a `grab` cursor and a subtle 2px left accent line. Draggable is only set after 4px of mouse movement, which preserves normal text selection on click.

**Mobile:** long-press (380ms) activates a floating ghost clone of the row. Haptic feedback fires on activation. The ghost follows the finger; rows shift live as you drag. Releasing commits the new order.

**Persistence per list:**
- Manual tasks → `manualTasks` array reordered, saved to localStorage + Dropbox
- Trello cards → `trelloTasks` array reordered, written to local cache. Resets when Trello board activity changes — Trello is the source of truth for content, but the user controls daily ordering
- Habits → `habitsList` reordered, saved via `_saveHabits()` + Dropbox

**What is excluded from drag:**
- Done manual tasks — order only matters for what's still actionable
- Habits in edit mode — inputs would conflict with drag gesture
- Interactive elements: checkbox, delete button, links, any `<button>`

### Swipe-to-complete

**Status: Removed (v1.6.43)**

**What was built:** right-swipe gesture on manual task rows to mark done. 72px threshold, horizontal intent detection at 10px, a green accent track revealed during the swipe.

**Why removed:** after testing, the tap-to-check interaction is preferred. The checkbox is the right affordance for completion — it's explicit, reversible, and familiar. Swipe-to-complete added gesture complexity without meaningful gain over a clearly visible checkbox. The checkbox already has an expanded tap target (`::after` pseudo-element, `-16px` inset) making it easy to hit on mobile.

**Design principle behind the decision:** TODAY values calm and clarity over gesture cleverness. A gesture that replaces a visible control removes discoverability. The checkbox communicates its purpose; a swipe does not.

**If reconsidered:** only add swipe back if the checkbox becomes genuinely hard to reach (e.g. a layout change moves it further from thumb reach). Do not add it as a shortcut for its own sake.

### Copy button in focus mode

**Status: Implemented (v1.6.50)**

A small `copy` label appears in the top-right corner of the focused task row — only visible during focus mode on the focused task. Opacity `0.45` at rest, full on hover, accent green on success.

**Why a button and not text selection:** during focus mode, the grab cursor is overridden to `default` (fixed in v1.6.50), but text selection on task names is still imprecise — task text is short, surrounded by interactive elements, and the user is in a flow state. A single-tap copy removes friction without requiring precision.

**What it copies:** clean task text only — session count badge and Trello link arrow are stripped before writing to clipboard. `navigator.clipboard.writeText()` with silent failure.

**Scope:** manual tasks and Trello cards only. Habits are excluded — habit names are short self-reminders, not content worth copying.

**Feedback:** button label changes to `copied` in accent colour for 1.8 seconds, then resets. No toast, no animation — minimal noise during a focus session.

### Sticky header (mobile)

**Status: Implemented (v1.7.x)**

On mobile (≤480px), the header — TODAY logo, action buttons (habits, connections, info), date tag, and progress bar — is `position: sticky; top: 0`. On desktop it is static.

**Why mobile only:** on desktop the full content fits comfortably without scrolling in most cases, and a sticky bar consumes valuable vertical space. On mobile the list scrolls significantly and losing the date + progress context is disorienting.

**Visual treatment:** `background: var(--bg-glass)` (rgba(14,14,16,0.92)) with `backdrop-filter: blur(16px) saturate(1.4)` — frosted glass effect lets scrolled content bleed through slightly, same as iOS native apps. A 1px hairline separator at `rgba(255,255,255,0.05)` appears via `box-shadow` once content scrolls under.

**Safe area:** `padding-top` on `.sticky-header-inner` includes `env(safe-area-inset-top)` — sits correctly below notch/Dynamic Island on all iPhone models.

**DOM placement:** `.sticky-header` is a sibling of `.app`, not a child. This is mandatory — `overflow-x: hidden` on `.app` would break `position: sticky` if it were inside. See Research.md §3 for the gotcha.

### Drag cursor in focus mode

**Status: Fixed (v1.6.50)**

When focus mode activates, the `grab` cursor from drag-to-reorder persisted on the focused task row. Fixed by overriding `.focusing .task.focused` and `.focusing .task.focused:hover` to `cursor: default`. Non-focused tasks are `pointer-events: none` during focus, so they're unreachable — only the focused task needed the explicit override.

---

### AI Assistant (v1.8.0)

**Entry point:** `✦✦` button in the header. Toggles an inline panel — same open/close pattern as Habits and Connections. The task list remains visible while the panel is open.

**Interaction model:** The assistant reads the user's full state (tasks, habits, time of day, progress) and returns one sentence + 2–4 action chips. Chips execute immediately on tap — no confirmation dialogs. Terminal actions (check, delete, focus, dismiss) close the panel. Additive actions (add task) show brief feedback then reload suggestions.

**What it is not:** a chat interface. No conversation history, no freeform back-and-forth by default. The input field accepts natural language but the response is always chips — the user taps, things happen.

**Active state rule:** `aiBtn` is active (accent) only when the panel is open — identical to all other header buttons. It does not stay lit when a key is configured.

**Provider selector:** Gemini 2.5 Flash (default, free) or Claude Haiku. Selector lives in Connections panel, not in the AI panel itself. Keeps the AI panel focused on the task.

**Key validation:** `saveAIKey()` makes a real test call before accepting the key. Shows "Testing…" while validating, surfaces the API's actual error message on failure.

## 9. Integrations

### Trello

- Read-only. OAuth scope: `read`.
- Pulls cards from a selected board + list into the task list.
- Cache key: `today_trello_cache` — cleared on `checkNewDay()` before `loadTrello()`.
- Card links use `--color-highlight` (#579dff).
- Auth: standard OAuth redirect (not PKCE).

### Dropbox

- Read/write. Used for cross-device sync.
- PKCE OAuth flow via Netlify functions (`dropbox-token.js`, `dropbox-refresh.js`).
- File: `/today-backup.json` on production, `/today-backup-{hostname}.json` on preview deploys.
- `_dropboxEnsureToken()` called before every backup/restore.
- `last_local_change` and `last_successful_backup` timestamps detect drift.
- On reconnect: backup-first — push local changes before pulling remote.
- Expired token detection shows accurate UI state; local changes are preserved.

### Netlify

- `publish = "."` — repo root is the publish directory.
- Functions in `netlify/functions/`.
- `DROPBOX_APP_KEY` and `DROPBOX_CLIENT_SECRET` set as Netlify env vars.
- Netlify injects a RUM analytics script (`/.netlify/scripts/rum`) — Netlify's own tracking. Ad blockers block it harmlessly.

### AI Assistant

- Provider: Gemini 2.5 Flash (default, free) or Claude Haiku (private).
- Key stored in `localStorage('today_ai_key')`, proxied via `/.netlify/functions/ai-assist`.
- Panel opens via ✦ button in add-task bar.
- Structured responses: AI returns JSON with `message` + `actions[]` array.
- Action chips execute immediately on tap (add_task, check_task, start_focus, etc.).

#### Post-Add Enhancement (v2.2+)

AI assists *after* task entry, never blocking the input flow:

1. User adds task via Enter → task appears instantly
2. AI analyzes in background (async, debounced 2s)
3. If useful, suggestion row appears below task:
   - Subtle, dismissible, auto-expires after 10s
   - Chips: [Break into 3 tasks] [Add details] [Dismiss]
4. User can ignore or engage

**Design rules:**
- Never delay task entry for AI
- Never auto-modify tasks without explicit tap
- Suggestions are ephemeral — don't persist across sessions
- Show suggestions sparingly — only when genuinely useful

**Visual treatment:**
- `.task-suggestion` row: muted background, smaller text
- Positioned directly below the triggering task
- Slides in with `var(--dur-fast)`, fades out on dismiss
- Uses existing chip styling from AI panel

---

## 10. Offline & Service Worker

- SW file: `sw.js`. Cache version: `today-v{version}` — must match `APP_VERSION` on every deploy.
- Strategy: **network-first** for all requests.
- **Pre-cached at install:** `/` (app shell) + all 6 font files.
- Fonts are self-hosted so the SW can cache them. Cross-origin fonts cannot be SW-cached — this is the primary reason fonts are self-hosted.
- `BYPASS_ORIGINS`: Trello, Dropbox, Google APIs — always network, never SW cache.
- Sync loop stops on `visibilitychange hidden`, resumes 2s after visible.
- All sync functions guard with `navigator.onLine`.

---

## 11. Security & Privacy

- All user content rendered via `esc()` before `innerHTML` — no XSS surface.
- Trello token scope: `read` only.
- Dropbox PKCE state parameter verified on callback.
- All `window.open` calls are synchronous (iOS Safari popup block fix).
- `sessionStorage` PKCE keys cleaned up immediately after use.
- No Google Fonts requests on load — zero external pings to Google.
- No ads. No analytics in app code. Netlify RUM is server-injected and easily blocked.

---

## 12. Development Rules

1. **All margins and paddings must use design tokens.** Never hardcode `px` outside `:root` unless explicitly off-grid (see Spacing above). This includes colours inside `@media` blocks and focus mode CSS — all `rgba()` accent variants have named tokens (`--accent-focus-bg`, `--accent-check`, `--accent-timer-fill`, etc.).
2. **GPU compositing for animations.** Animate only `opacity` and `transform` — never `width`, `height`, `top`, `left`, `background`, or `border` in transitions that fire frequently. Moving elements use `transform: translate()` not `left/top`. See §4 Motion for the full animation contract.
3. **`-webkit-font-smoothing: antialiased` is set globally.** Do not override it on individual components — consistent antialiasing is intentional.
4. **`touch-action: pan-y` on scrollable lists.** All `.task-list` and `.habit-list` containers carry this — do not remove it. It eliminates 300ms touch delay and improves scroll responsiveness on mobile.
5. **Bump `APP_VERSION` and `DEV_HOURS` together** on every meaningful change.
6. **Update this file** whenever a design decision, animation rule, interaction model, or token changes.
4. **Update `Changelog.md`** on every version bump — immediately after updating `index.html`. Never defer it. Format: single table row, terse, no bullet lists, no implementation detail.
5. **Test on the deployed Netlify URL**, not `file:///`. Absolute paths (`/fonts/`, `/`) do not resolve locally.
6. **Never remove backward-compat token aliases** (`--bg`, `--surface`, etc.) — used in inline styles and JS.
7. **Circular CSS token references are bugs.** A token must never reference itself.
8. **Duplicate CSS classes are bugs.** One class, one definition.
9. **SW cache version must match `APP_VERSION`** on every deploy.
10. **Sweep for dead code on every housekeeping pass** — but reason carefully before removing anything. A function that appears unreferenced in JS may still be called via an inline `onclick` in HTML, a dynamic string, or a Dropbox/Trello callback. A CSS class that appears unused may be added by JS at runtime. The test is: *could this be reached at runtime by any code path, including dynamic ones?* If genuinely unreachable, remove it and note it in the changelog. If uncertain, leave it and add a comment explaining why.
11. **Check for critical bugs before shipping** — on every housekeeping pass, manually review: (a) any function that writes to `localStorage` without a try/catch — quota failures are silent; (b) any merge or restore path that could silently overwrite local data; (c) any place a missing DOM element could cause a null-reference crash mid-session; (d) any async operation whose error is swallowed entirely with no fallback. These are the four most common silent failure modes in this codebase.
12. **Security and privacy sweep on every housekeeping pass** — verify: (a) all user-supplied content still goes through `esc()` before touching `innerHTML` — new features are the most common way XSS surfaces are introduced; (b) no new external origin has been added to fetch calls, script tags, or `new URL()` constructions without being added to `BYPASS_ORIGINS` in `sw.js`; (c) no token, key, or credential appears in a URL query string — all must be in headers; (d) `sessionStorage` PKCE keys are still cleaned up after OAuth exchange. Report any finding as a comment in the relevant code and as a row in the audit table in `Performance-audit.md`.

---

## 13. Haptics

TODAY uses `_haptic(preset)` for tactile feedback on mobile. Design rules (from web-haptics design guide):

- **Supplement, never replace** — UI works fully without haptics. Haptics enhance, they don't communicate.
- **Fire at the exact instant the visual change occurs** — synchronised with the animation, not before or after.
- **Don't overuse** — reserved for meaningful moments only. Every tap vibrating makes nothing feel special.
- **Match intensity to significance** — light interaction = light/selection, standard action = medium/success, major/destructive = heavy/warning.

**Moments and presets:**
| Moment | Preset | Reasoning |
|---|---|---|
| Task check done | `success` | Primary positive action |
| Habit check done | `success` | Same |
| Pomodoro session complete | `success` | Pairs with chime |
| Task delete | `warning` | Destructive — slightly unsettling by design |
| Long-press drag activates | `heavy` | Physical confirmation drag mode engaged |
| Drag row snaps to slot | `selection` | Tiny tick — barely perceptible, just enough |

**Not haptic:** adding a task, opening panels, toggling habits panel, typing.

## 14. Haiku

> Only today shows  
> Done rests, quietly proud  
> Morning clears the slate
