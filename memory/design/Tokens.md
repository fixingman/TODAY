# Design Tokens

> All CSS variables defined in `:root`. Values are authoritative — sourced from index.html.

---

## Colors

### Core Palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#0e0e10` | Page background |
| `--color-surface` | `#17171a` | Card / hover surface |
| `--color-surface2` | `#1f1f24` | Elevated surface (panels) |
| `--color-border` | `#2a2a30` | Decorative separators only |
| `--color-control-border` | `#636370` | Interactive boundaries on the main surface |
| `--color-control-border-elevated` | `#6b6b78` | Interactive boundaries on elevated panels |
| `--color-text` | `#e8e8ec` | Primary text |
| `--color-muted` | `#80808d` | Secondary / placeholder text on the main surface |
| `--color-muted-elevated` | `#858594` | Secondary / placeholder text on elevated panels |

**Aliases:** `--bg`, `--surface`, `--surface2`, `--border`, `--control-border`, `--text`, `--muted`

### Accent (Lime Green)

| Token | Value | Usage |
|---|---|---|
| `--color-accent` | `#c8f060` | Primary accent |
| `--color-accent-dim` | `rgba(200,240,96,0.12)` | Ghost accent bg |
| `--color-accent-hover` | `rgba(200,240,96,0.18)` | Accent bg on hover |
| `--color-accent-glow` | `rgba(200,240,96,0.28)` | Accent glow border |

**Aliases:** `--accent`, `--accent-dim`, `--accent-hover`, `--accent-glow`

**Special aliases:** `--highlight-ui` → `--color-accent` (used for UI highlight elements distinct from Trello `--highlight`)

**Focus mode variants:**

| Token | Value | Usage |
|---|---|---|
| `--color-accent-focus-bg` | `rgba(200,240,96,0.04)` | Focused row background |
| `--color-accent-focus-border` | `rgba(200,240,96,0.12)` | Focused row border |
| `--color-accent-check` | `rgba(200,240,96,0.55)` | Focused checkbox border |
| `--color-accent-check-hover` | `rgba(200,240,96,0.90)` | Focused checkbox hover |
| `--color-accent-check-glow` | `rgba(200,240,96,0.10)` | Focused checkbox glow |
| `--color-accent-timer-bg` | `rgba(200,240,96,0.022)` | Timer bar background |
| `--color-accent-timer-fill` | `rgba(200,240,96,0.08)` | Timer progress fill |
| `--color-accent-timer-paused` | `rgba(200,240,96,0.03)` | Timer fill when paused |

**Aliases (used in components):** `--accent-focus-bg`, `--accent-focus-border`, `--accent-check`, `--accent-check-hover`, `--accent-check-glow`, `--accent-timer-bg`, `--accent-timer-fill`, `--accent-timer-paused` — each maps to its `--color-accent-*` form above.

### Semantic Colors

| Token | Value | Usage |
|---|---|---|
| `--color-danger` | `#ff5f5f` | Error / delete |
| `--color-danger-dim` | `rgba(255,95,95,0.10)` | Danger bg tint |
| `--color-danger-border` | `rgba(255,95,95,0.20)` | Danger border |
| `--color-danger-pulse` | `rgba(255,95,95,0.40)` | Error-indicator `errorPulse` ring animation start |
| `--color-highlight` | `#579dff` | Info / Trello link |
| `--color-highlight-dim` | `rgba(87,157,255,0.10)` | Highlight bg tint (error badges) |
| `--color-highlight-border` | `rgba(87,157,255,0.20)` | Highlight border (error badges) |

**Aliases:** `--danger`, `--highlight`

### Utility Colors

| Token | Value | Usage |
|---|---|---|
| `--color-done-line` | `rgba(107,107,120,0.55)` | Strikethrough on done tasks |
| `--color-muted-dim` | `rgba(107,107,120,0.12)` | Muted bg tint (external error badge) |
| `--color-bg-glass` | `rgba(14,14,16,0.92)` | Sticky header frosted bg |
| `--color-overlay` | `rgba(0,0,0,0.6)` | Modal backdrop |
| `--color-breathe` | `rgba(22,26,20,0.88)` | Focus breathe overlay (rest) |
| `--color-breathe-active` | `rgba(28,34,24,0.92)` | Focus breathe overlay (active) |

**Aliases:** `--done-line`, `--bg-glass`

### PiP Window Tokens

PiP runs in a separate `document` and cannot inherit the main page's CSS custom properties. The injected `<style>` block defines a local `:root` with these tokens as literal values. They mirror the main palette — update both if values change.

| Token | Value | Maps to |
|---|---|---|
| `--pip-bg` | `#0e0e10` | `--color-bg` |
| `--pip-accent` | `#c8f060` | `--color-accent` |
| `--pip-text-muted` | `rgba(255,255,255,0.50)` | (no main equiv) |
| `--pip-fill-track` | `rgba(200,240,96,0.08)` | `--color-accent-timer-fill` |
| `--pip-fill-bar` | `rgba(200,240,96,0.20)` | (between dim and hover) |
| `--pip-overlay` | `rgba(14,14,16,0.85)` | `--color-bg-glass` (0.92 in main) |
| `--pip-btn-bg` | `rgba(200,240,96,0.15)` | (between dim and hover) |
| `--pip-btn-border` | `rgba(200,240,96,0.30)` | `--color-accent-glow` (0.28 in main) |
| `--pip-btn-hover-bg` | `rgba(200,240,96,0.25)` | (between hover and glow) |
| `--pip-btn-hover-border` | `rgba(200,240,96,0.50)` | (between check and check-hover) |

---

## Typography

### Fonts

| Token | Value | Usage |
|---|---|---|
| `--font-mono` | `'DM Mono', monospace` | Body text, task rows, timer |
| `--font-display` | `'Syne', sans-serif` | Logo, large headings, triage summary |

Self-hosted under `/fonts/`, pre-cached by service worker.

### Sizes

| Token | Value | Usage |
|---|---|---|
| `--text-micro` | `9px` | Micro labels — week grid letters/focus, Sunday label, AI provider badge, error panel badge |
| `--text-xs` | `10px` | Tiny labels, kbd hints |
| `--text-sm` | `11px` | Small labels, week-summary lines |
| `--text-sm2` | `12px` | Small labels, config hints |
| `--text-base` | `13px` | Base body size, timer |
| `--text-task` | `13.5px` | Task row text (between base and md) |
| `--text-md` | `14px` | Body default |
| `--text-lg` | `16px` | Buttons, controls |

**Note:** Triage summary headline uses Syne at 28px (hardcoded — no token at that scale).

**Poem typography (v2.35.5):** all four poem surfaces (`.splash-poem-text`, `.panel-haiku`, `.brief-poem`, `.empty-poem`) get `text-wrap: pretty` (progressive enhancement) plus the `_poemHTML()` nbsp widow guard — an authored line that wraps never strands a single word. New poem surfaces must use `_poemHTML()`, not raw `split('\n')`.

---

## Spacing

Scale is numeric, 4px base:

| Token | Value |
|---|---|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-20` | `80px` |

---

## Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Badge, tag |
| `--radius-md` | `6px` | Input, small card |
| `--radius-lg` | `8px` | Task row, button |
| `--radius-xl` | `12px` | Panel, config section |
| `--radius-full` | `99px` | Pill |

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-float` | `0 8px 24px rgba(0,0,0,0.4)` | Floating elements |
| `--shadow-panel-sm` | `0 4px 16px rgba(0,0,0,0.12)` | Small panels |
| `--shadow-triage` | `0 -8px 32px rgba(0,0,0,0.12), 0 -2px 8px rgba(0,0,0,0.08)` | Triage + bottom panels |

---

## Motion

| Token | Value | Usage |
|---|---|---|
| `--dur-fast` | `0.15s` | Hover, snaps |
| `--dur-base` | `0.18s` | General transitions |
| `--dur-mid` | `0.20s` | Focus mode exit, fades |
| `--dur-slow` | `0.30s` | Slide-up panels, recede/reveal |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Deceleration, no overshoot |
| `--ease-std` | `ease` | Generic |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Subtle overshoot for panels |

---

## Opacity

| Token | Value | Usage |
|---|---|---|
| `--opacity-dim` | `0.25` | Done-task row treatment and secondary badges; done-task contrast is an accepted exception |
| `--opacity-label` | `0.40` | Subtle hints, kbd hint |
| `--opacity-copy` | `0.45` | Copy button at rest in focus |
| `--opacity-mid` | `0.50` | Focused session count |
| `--opacity-soft` | `0.60` | Session count on hover |
| `--opacity-muted` | `0.65` | Paused label, kbd hint base |
| `--opacity-strong` | `0.80` | Timer time, triage sub-line |
| `--opacity-hover` | `0.85` | Button hover states |
| `--opacity-subtle` | `0.28` | Checkbox fill, timer paused |
| `--opacity-recede` | `0.07` | Non-focused tasks during focus |
| `--opacity-recede-done` | `0.035` | Done tasks receded in focus |
| `--opacity-recede-chrome` | `0.08` | Headers/date receded in focus |

---

## Z-Index Stack

| Token | Value | Element |
|---|---|---|
| `--z-base` | `1` | Normal content (`.app`) |
| `--z-header` | `10` | Sticky header |
| `--z-modal` | `100` | Panels, overlays, triage bar |
| `--z-splash` | `500` | Loading splash overlay |
| `--z-overlay` | `999` | Top-level overlays |

**Hardcoded (not tokenised):**
| Value | Element | Reason |
|---|---|---|
| `0` | `body::before` noise texture | Below all content |
| `5` | `#statusBarScrim` (v2.33.1) | Above content (1), below section headers (9) and glass header (10) — covers the iOS safe-area strip |
| `9` | `.section-header` sticky | One below the glass header it slides under |
| `50` | Idle companion | Between header and modal |
| `90` | `#aiPanel` | Below modal (100), above header (10) |
| `600` | Splash canvas (star burst) | Above splash overlay (500); burst fires on top of the splash |
| `9998` | Error panel | Above all app content |
| `9999` | Error dot | Always on top |
