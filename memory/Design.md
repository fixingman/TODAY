# TODAY — Design Document
> Living reference for decisions, rules, UX thinking, and visual system.  
> Update this document whenever a meaningful decision is made.

---

## 1. Product Philosophy

**One screen. One day. One list.**

TODAY is a single-day task manager. It shows only what matters right now — today's tasks. Nothing carries over. Nothing accumulates. The morning is a clean slate.

- **No history.** Done tasks are acknowledged, not archived.
- **No projects.** No labels, no priorities, no due dates.
- **No anxiety.** The UI should feel calm, dark, and focused.
- **Offline-first.** The app must work without internet after the first load.

### Core UX Principles
1. The fastest path to adding a task must always be one tap / one keystroke.
2. Completing a task should feel satisfying — not administrative. Unchecking is neutral — no celebration.
3. The empty state is a reward, not a failure.
4. Every animation must serve meaning, not decoration.
5. Never show a loading state for local data.
6. Chrome is distraction. Hide the scrollbar — scroll works, the bar never shows.

---

## 2. User Research Notes

- User opens the app first thing in the morning, often on mobile.
- Primary use: brain-dump of the day's intentions, then progressive completion.
- Trello integration is used to pull in work tasks — user doesn't want to re-enter them.
- Dropbox sync is used to share state across devices (desktop → mobile).
- User works in a dark environment; high-contrast accent on dark background is intentional.
- Local file access (`file:///`) is used during development — absolute font/asset paths won't resolve locally.

---

## 3. Design Tokens

All visual values **must** reference a token. Never hardcode a colour, spacing, radius, or duration outside `:root`.

### Colors
| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#0e0e10` | Page background |
| `--color-surface` | `#17171a` | Card / hover surface |
| `--color-surface2` | `#1f1f24` | Elevated surface (panels) |
| `--color-border` | `#2a2a30` | Default border |
| `--color-text` | `#e8e8ec` | Primary text |
| `--color-muted` | `#6b6b78` | Secondary / placeholder |
| `--color-accent` | `#c8f060` | Primary accent (lime green) |
| `--color-accent-dim` | `rgba(200,240,96,0.12)` | Ghost accent background |
| `--color-accent-glow` | `rgba(200,240,96,0.28)` | Accent glow border |
| `--color-danger` | `#ff5f5f` | Error / delete |
| `--color-danger-dim` | `rgba(255,95,95,0.10)` | Danger background tint |
| `--color-danger-border` | `rgba(255,95,95,0.20)` | Danger border |
| `--color-highlight` | `#579dff` | Info / Trello link |
| `--color-done-line` | `rgba(107,107,120,0.55)` | Strikethrough on done tasks |
| `--color-noise-overlay` | `rgba(255,255,255,0.03)` | Texture layer |

### Spacing (4px base grid)
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
- `2px` — `.task-list` gap (hairline rhythm)
- `1px` — `.task-check` margin-top (optical alignment)
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
| Token | Value |
|---|---|
| `--font-display` | `'Syne', sans-serif` |
| `--font-mono` | `'DM Mono', monospace` |
| `--text-xs` | 10px |
| `--text-sm` | 11px |
| `--text-sm2` | 12px — small labels, config hints |
| `--text-base` | 13px |
| `--text-task` | 13.5px — task row text, between sm and base |
| `--text-md` | 14px — body default |
| `--text-lg` | 16px |
| `--text-xl` | 22px |

**Font rules:**
- `Syne` is used for all display text: logo, headings, section labels, date.
- `DM Mono` is used for everything else: tasks, inputs, meta, UI controls.
- Body default (`html, body`) is `DM Mono` at `--text-md`.
- Fonts are self-hosted under `/fonts/` on Netlify and pre-cached by the service worker. They do **not** fall back to Google Fonts — the app must not ping Google on load.

### Motion
| Token | Value |
|---|---|
| `--dur-fast` | 0.15s |
| `--dur-base` | 0.18s |
| `--dur-slow` | 0.30s |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-std` | `ease` |

**Animation rules:**
- Task completion: opacity fade + strikethrough only. No translateY.
- Task removal (`.task.removing`): opacity + scaleY only. GPU-only. `will-change: opacity, transform`.
- Empty state: opacity fade only — no translateY (caused jumpiness on manual delete).
- **translateY is banned for task-level micro-interactions** — causes visible jumps mid-list.
- **translateX is also banned on task rows** — causes horizontal drift when entering/leaving focus mode.
- **Exception:** the splash exit stagger uses `translateY(-8px → 0)` on the whole app reveal. This is intentional — it's a one-time cinematic entrance, not a mid-list interaction.
- Splash burst fires from the star position at `onSplashDone`. Star is null-guarded.
- No animation should block interaction or feel like a wait.
- **Snappy in, gentle out:** enter transitions use fast durations (~120ms). Exit/collapse transitions are slightly slower (~220ms). The UI feels responsive without abruptness on close.
- **Prefer opacity over movement.** If a state change can be communicated through opacity alone, do not add transform. Movement implies spatial meaning — only use it when there is spatial meaning.

**Focus mode animation rules (Pomodoro) — desktop only:**
- **Desktop only.** `@media (hover: hover)` wraps all focus CSS. JS bails via `matchMedia('(hover: hover)')` on touch devices. Mobile never enters focus mode.
- Receding tasks: opacity-only (`0.07`), `160ms ease`. Nothing translates. Nothing moves.
- Focused task: `background` tint + `border-color` snap in via `var(--dur-fast)` (~120ms). No size, no translate.
- **Enter is a snap, exit is an ease.** Asymmetry makes UI feel responsive on click, graceful on release.
- Timer block expands **downward only** via `max-height: 0 → 36px` at `130ms`. One `rAF` delay — task snaps first, bar slides in second. Never causes tasks above to shift.
- Text scale is banned — causes sibling reflow. Focused task signals through its container only.
- Session count (`N 🍅`): inline after task text. DOM order: text → trello link → session count. Desktop hover only.
- **No CTAs inside focused state.** `space` pauses (input-guarded), `esc` resets, clicking outside dismisses UI.

**Focus mode interaction model:**
- Click task → start session, open UI immediately.
- Click outside → **dismiss UI only**. Timer keeps running in background. App fully interactive.
- Click same task again → re-open UI and resume.
- Click different task → start fresh. Previous task state cleared.
- `space` → pause/resume (blocked if an input is focused).
- `esc` → full stop + reset.
- Tab away → wall-clock correction on return; timer continues accurately.

**Per-task state (memory model):**
- `taskStates` map in JS memory: `{ rem, running, wallStart }` per task ID.
- Survives UI dismiss — timer keeps ticking when you click elsewhere.
- Cleared on `esc` or task switch.
- NOT persisted to localStorage — resets on page reload intentionally.
- `focusSessions` (completed sessions) IS persisted to `manualTasks` in localStorage, shown as `N 🍅` inline on hover. Desktop only — no mobile render.


### Z-index
| Token | Value |
|---|---|
| `--z-base` | 1 |
| `--z-splash` | 500 |
| `--z-overlay` | 999 |

---

## 4. Layout & Component Rules

### App structure
- Single-column, centred, max-width constrained.
- iOS safe-area: `.app` uses `calc(48px + env(safe-area-inset-top))` for top padding.
- `viewport-fit=cover` is set in the meta viewport tag.

### Task row
- Gap: `--space-3` (12px)
- Padding: `--space-3` top/bottom, `--space-4` left/right (16px)
- Tap target for checkbox: `.task-check::after` with `inset: -13px` expanding hit area to 44px minimum.

### Empty state
- Padding: `var(--space-6) var(--space-4)` (24px / 16px)
- The empty state is reached by completing or deleting all tasks. It is a positive moment.

### Section rhythm
- `.section` margin-bottom: `--space-8` (32px)
- `.config-panel` margin-bottom: `--space-8` (32px)

### Config panel
- Uses `.panel-section` for internal grouping (`.panel-section-lg` was removed as a duplicate).
- Padding: `--space-5` (20px)

---

## 5. Integrations

### Trello
- Read-only. Scope: `read`.
- Pulls cards from a selected board/list into the task list.
- Cache key: `today_trello_cache` — cleared on `checkNewDay()` before `loadTrello()`.
- Card links use `--color-highlight` (#579dff).
- Auth uses standard OAuth redirect (not PKCE).

### Dropbox
- Read/write. Used for cross-device sync.
- PKCE OAuth flow via Netlify functions (`dropbox-token.js`, `dropbox-refresh.js`).
- File: `/today-backup.json` on production, `/today-backup-{hostname}.json` on preview deploys.
- `_dropboxEnsureToken()` is called before every backup/restore.
- `last_local_change` and `last_successful_backup` timestamps are persisted to detect drift.
- On reconnect (`online` event): backup-first strategy — push local changes before pulling remote.
- Expired token detection shows accurate UI state; local changes are preserved on reconnect.

### Netlify
- `publish = "."` — repo root is the publish directory.
- Functions in `netlify/functions/`.
- `DROPBOX_APP_KEY` and `DROPBOX_CLIENT_SECRET` set as Netlify env vars.
- Netlify injects a RUM analytics script (`/.netlify/scripts/rum`) — this is Netlify's own tracking, not app code. Ad blockers will block it; this is harmless.

---

## 6. Offline & Service Worker

- SW file: `sw.js`, cache version: `today-v{version}`.
- Strategy: **network-first** for all requests.
- **Pre-cached at install:** `/` (app shell) + all 6 font files.
- Fonts are same-origin (self-hosted) so the SW can cache them. Google Fonts (cross-origin) cannot be SW-cached — this is the primary reason fonts are self-hosted.
- `BYPASS_ORIGINS`: Trello, Dropbox, Google APIs — these always go to network, never SW cache.
- Sync loop stops on `visibilitychange hidden`, resumes 2s after visible.
- `navigator.onLine` guards on all sync fetches.

---

## 7. Security & Privacy

- All user content rendered via `esc()` before `innerHTML` — no XSS surface.
- Trello token scope: `read` only.
- Dropbox PKCE state parameter verified on callback.
- All `window.open` calls are synchronous (iOS Safari popup block fix).
- `sessionStorage` PKCE keys cleaned up immediately after use.
- No Google Fonts requests on load — zero external pings to Google.
- No ads. No analytics in app code. Netlify RUM is injected server-side and easily blocked.

---

## 8. Development Rules

1. **All margins and paddings must use design tokens.** Never hardcode `px` values outside `:root` unless they are intentionally off-grid (see spacing section above).
2. **Version and dev hours are always bumped together** on every meaningful change.
3. **Test on the deployed Netlify URL**, not from a local `file:///` path. Absolute asset paths (`/fonts/`, `/`) do not resolve locally.
4. **Never remove the backward-compat token aliases** (`--bg`, `--surface`, etc.) — they are used in inline styles and JS.
5. **Circular CSS token references are bugs.** A token must never reference itself.
6. **Duplicate CSS classes are bugs.** One class, one definition.
7. **SW cache version must match app version** on every deploy.

---

## 9. Audio Design

TODAY uses synthesised audio only — no audio files, no external dependencies. All sounds are generated via the Web Audio API and fail silently if unavailable.

### Completion chime (focus mode)
Plays when a 25-minute Pomodoro session completes.

| Property | Value | Rationale |
|---|---|---|
| Waveform | Sine | Purest, least harsh |
| Start frequency | 432 Hz | Just below concert A — warm, not alarming |
| End frequency | 320 Hz | Soft downward drift — feels like a breath settling |
| Peak gain | 0.18 | Quiet — noticeable but not startling |
| Attack | 40ms | Fast but not a click |
| Decay | ~1.2s | Long enough to feel deliberate, short enough not to intrude |
| Total duration | ~1.3s | Gone before the user can react negatively |

**Design intent:** the sound should feel like an acknowledgement, not an alert. A single soft tone that rises and falls. The pitch drop at the end signals completion, not urgency.

**Rules:**
- Never autoplay on page load or task interaction — only on session complete.
- Always wrap in try/catch — AudioContext may be blocked by browser policy.
- No loops. No repeats. One chime, then silence.
- Future sounds (e.g. session start, halfway marker) should follow the same sine/decay pattern, differentiated by pitch and duration only.

---

## 10. Haiku

> Only today shows  
> Done rests, quietly proud  
> Morning clears the slate
