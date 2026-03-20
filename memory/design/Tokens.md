# Design Tokens

> All CSS variables, colors, typography, and spacing values.

---

## Colors

### Core Palette

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | #0e0e10 | App background |
| `--color-surface` | #17171a | Card/hover surface |
| `--color-surface2` | #1f1f24 | Elevated surface (panels) |
| `--color-border` | #2a2a30 | Default border |
| `--color-text` | #e8e8ec | Primary text |
| `--color-muted` | #6b6b78 | Secondary/placeholder |

### Accent (Lime Green)

| Token | Value | Usage |
|---|---|---|
| `--color-accent` | #c8f060 | Primary accent |
| `--color-accent-dim` | rgba(200,240,96,0.12) | Ghost accent bg |
| `--color-accent-hover` | rgba(200,240,96,0.18) | Accent bg on hover |
| `--color-accent-glow` | rgba(200,240,96,0.28) | Accent glow border |

### Focus Mode Variants

| Token | Value | Usage |
|---|---|---|
| `--accent-focus-bg` | rgba(200,240,96,0.04) | Focused row background |
| `--accent-focus-border` | rgba(200,240,96,0.12) | Focused row border |
| `--accent-check` | rgba(200,240,96,0.55) | Focused checkbox border |
| `--accent-check-hover` | rgba(200,240,96,0.90) | Focused checkbox hover |
| `--accent-timer-bg` | rgba(200,240,96,0.022) | Timer bar background |
| `--accent-timer-fill` | rgba(200,240,96,0.08) | Timer progress fill |

### Semantic Colors

| Token | Value | Usage |
|---|---|---|
| `--color-danger` | #ff5f5f | Error/delete |
| `--color-danger-dim` | rgba(255,95,95,0.10) | Danger bg tint |

---

## Typography

### Fonts

| Token | Value | Usage |
|---|---|---|
| `--font-mono` | 'DM Mono', monospace | Body text, tasks |
| `--font-display` | 'Syne', sans-serif | Logo, headings |

Fonts are self-hosted under `/fonts/` and pre-cached by service worker.

### Sizes

| Token | Value | Usage |
|---|---|---|
| `--text-xs` | 10px | Tiny labels, kbd hints |
| `--text-sm` | 11px | Small labels |
| `--text-sm2` | 12px | Config hints, secondary |
| `--text-base` | 13px | Base size, timer |
| `--text-task` | 13.5px | Task row text |
| `--text-md` | 14px | Body default |
| `--text-lg` | 16px | Buttons, controls |
| `--text-xl` | 22px | Section headings |

---

## Spacing

| Token | Value | Usage |
|---|---|---|
| `--space-xs` | 4px | Tight gaps |
| `--space-sm` | 8px | Small gaps |
| `--space-md` | 12px | Default spacing |
| `--space-lg` | 16px | Section gaps |
| `--space-xl` | 24px | Large sections |

---

## Z-Index Stack

| Layer | Z-Index | Element |
|-------|---------|---------|
| Base | 1 | Normal content |
| Header | 10 | Sticky header |
| Idle companion | 50 | Creatures |
| Modal | 100 | Panels, overlays |
| Splash | 500 | Loading splash |
| Overlay | 999 | Top-level overlays |

---

## Opacity

| Token | Value | Usage |
|---|---|---|
| `--opacity-dim` | 0.25 | Dimmed elements |
| `--opacity-muted` | 0.5 | Muted text |
| `--opacity-recede` | 0.07 | Non-focused tasks |
| `--opacity-recede-done` | 0.035 | Done tasks receded |
