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

## 2. Design Tokens

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

## 3. Visual Language

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

## 4. Motion & Animation

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

## 5. Focus Mode (Pomodoro)

Desktop only. Mobile never enters focus mode — `@media (hover: hover)` guards all CSS, `matchMedia` guard in JS.

### Interaction model

| Action | Result |
|---|---|
| Click task | Start 25min session, open timer UI |
| Click outside | Dismiss UI, pause timer |
| Click same task | Re-open UI, auto-resume |
| Click different task | Start fresh session, clear previous state |
| `space` | Pause / resume (blocked if input is focused) |
| `esc` | Full stop + reset |
| Tab away / hidden | Wall-clock correction on return |
| Check task during focus | Log partial session, exit focus, mark done |

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
- `opacity: 0` default → `opacity: 1` on hover → `opacity: 0.35` on done tasks.
- Color: `var(--muted)` — same visual weight as section counts.
- Desktop only — never rendered on mobile.

### Sound design language

Synthesised via Web Audio API. No audio files. Fails silently. All sine wave — purest, least harsh. Four sounds form a family: each is a short gesture, differentiated by pitch, direction, and duration. Never plays on load. No loops, no repeats.

| Sound | Trigger | Character | Frequency | Duration |
|---|---|---|---|---|
| **Start** | New session begins, reset from 00:00 | Snappy ascending chirp — intention | 520→680 Hz | ~150ms |
| **Resume** | Timer resumed after pause | Ascending chirp — start's quieter sibling. Same action family, smaller gesture | 500→600 Hz | ~120ms |
| **Complete task** | Task checked off | Warm descending two-step — satisfaction | 600→480→380 Hz | ~240ms |
| **Session end (chime)** | 25min timer reaches 00:00 | Low organic growl with beating wobble — earned rest | Two osc: 210→148 Hz + 202→141 Hz, ~8 Hz detune creates rumble | ~1.4s |

**Design rules:**
- Start and resume are ascending — they signal forward motion. Resume is quieter and shorter than start — it's a continuation, not a beginning.
- Complete is descending — it closes a loop. Two-step shape (fast drop, slower drift) makes it feel deliberate, not accidental.
- Session chime is the only two-oscillator sound. The ~8 Hz frequency gap between the two creates amplitude beating — an organic wobble that makes it feel alive rather than electronic. Lower register keeps it warm, not alarming.
- All gains are quiet (peak 0.08–0.14). Present without demanding attention.
- New sounds should follow the same sine/gesture pattern — differentiated by pitch direction, step count, and duration. Avoid harsh waveforms (square, sawtooth).

---

## 6. Habits

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

### Sound

Habit check has its own sound — distinct from the task complete sound:

| Sound | Trigger | Character | Frequency | Duration |
|---|---|---|---|---|
| **Habit done** | Habit checked | Warm descending three-step — quieter and slower than task complete | 520→400→300 Hz | ~320ms |

Slower and lower than the task complete sound — deliberate, grounded. A habit check is not a one-time win, it's a quiet confirmation of continuity.

---

## 7. Integrations

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

---

## 8. Offline & Service Worker

- SW file: `sw.js`. Cache version: `today-v{version}` — must match `APP_VERSION` on every deploy.
- Strategy: **network-first** for all requests.
- **Pre-cached at install:** `/` (app shell) + all 6 font files.
- Fonts are self-hosted so the SW can cache them. Cross-origin fonts cannot be SW-cached — this is the primary reason fonts are self-hosted.
- `BYPASS_ORIGINS`: Trello, Dropbox, Google APIs — always network, never SW cache.
- Sync loop stops on `visibilitychange hidden`, resumes 2s after visible.
- All sync functions guard with `navigator.onLine`.

---

## 9. Security & Privacy

- All user content rendered via `esc()` before `innerHTML` — no XSS surface.
- Trello token scope: `read` only.
- Dropbox PKCE state parameter verified on callback.
- All `window.open` calls are synchronous (iOS Safari popup block fix).
- `sessionStorage` PKCE keys cleaned up immediately after use.
- No Google Fonts requests on load — zero external pings to Google.
- No ads. No analytics in app code. Netlify RUM is server-injected and easily blocked.

---

## 10. Development Rules

1. **All margins and paddings must use design tokens.** Never hardcode `px` outside `:root` unless explicitly off-grid (see Spacing above).
2. **Bump `APP_VERSION` and `DEV_HOURS` together** on every meaningful change.
3. **Update this file** whenever a design decision, animation rule, interaction model, or token changes.
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

## 11. Haiku

> Only today shows  
> Done rests, quietly proud  
> Morning clears the slate
