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
| `--color-border` | `#2a2a30` | Default border |
| `--color-text` | `#e8e8ec` | Primary text |
| `--color-muted` | `#6b6b78` | Secondary / placeholder |

**Aliases:** `--bg`, `--surface`, `--surface2`, `--border`, `--text`, `--muted`

### Accent (Lime Green)

| Token | Value | Usage |
|---|---|---|
| `--color-accent` | `#c8f060` | Primary accent |
| `--color-accent-dim` | `rgba(200,240,96,0.12)` | Ghost accent bg |
| `--color-accent-hover` | `rgba(200,240,96,0.18)` | Accent bg on hover |
| `--color-accent-glow` | `rgba(200,240,96,0.28)` | Accent glow border |

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

### Semantic Colors

| Token | Value | Usage |
|---|---|---|
| `--color-danger` | `#ff5f5f` | Error / delete |
| `--color-danger-dim` | `rgba(255,95,95,0.10)` | Danger bg tint |
| `--color-danger-border` | `rgba(255,95,95,0.20)` | Danger border |
| `--color-highlight` | `#579dff` | Info / Trello link |

**Aliases:** `--danger`, `--highlight`

### Utility Colors

| Token | Value | Usage |
|---|---|---|
| `--color-done-line` | `rgba(107,107,120,0.55)` | Strikethrough on done tasks |
| `--color-bg-glass` | `rgba(14,14,16,0.92)` | Sticky header frosted bg |
| `--color-overlay` | `rgba(0,0,0,0.6)` | Modal backdrop |
| `--color-breathe` | `rgba(22,26,20,0.88)` | Focus breathe overlay (rest) |
| `--color-breathe-active` | `rgba(28,34,24,0.92)` | Focus breathe overlay (active) |

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
| `--text-xs` | `10px` | Tiny labels, kbd hints |
| `--text-sm` | `11px` | Small labels |
| `--text-xs2` | `12px` | Config hints, secondary |
| `--text-sm2` | `12px` | Compat alias for `--text-xs2` |
| `--text-base` | `13px` | Base body size, timer |
| `--text-task` | `13.5px` | Task row text (between base and md) |
| `--text-md` | `14px` | Body default |
| `--text-lg` | `16px` | Buttons, controls |

**Note:** Triage summary headline uses Syne at 28px (hardcoded — no token at that scale).

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
| `--opacity-dim` | `0.25` | Done state, secondary badges |
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
| `--z-base` | `1` | Normal content |
| `--z-header` | `10` | Sticky header |
| `--z-modal` | `100` | Panels, overlays, triage bar |
| `--z-splash` | `500` | Loading splash |
| `--z-overlay` | `999` | Top-level overlays |

**Hardcoded (not tokenised):**
- Error dot: `9999`
- Error panel: `9998`
- Idle companion: `50`
