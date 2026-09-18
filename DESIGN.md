# TODAY — Design System

> The single calibration document. Every design decision starts here; every detail file is linked below.

---

## North star

**TODAY is a longitudinal companion.** It accumulates real understanding of you — not productivity stats, but your relationship with your own commitments. Over time it helps you see yourself more clearly, so you can make different choices.

The morning is the signature beat. Everything else supports or follows it.

---

## Philosophy

**One screen. One day. One list.**

- No history. Done tasks are acknowledged, not archived.
- No projects, no labels, no priorities, no due dates.
- No anxiety. Calm, dark, focused.
- Offline-first. Works without internet after first load.
- No preference knobs. Personalization is observed behavior + opt-in connections, never settings.

**The identity sentence:** *TODAY is a list that ends.*

**The one line no one else can say:** the empty state is the reward, not the failure.

**The walls (non-negotiable):** no labels/categories · no stream extraction (Slack/Gmail) · calendar as input only, never output · single-file no-build · manual task order is intent-encoded by drag, never auto-sorted.

→ Full voice, vocabulary, Wallpaper Test case law: `memory/design/Philosophy.md`
→ Positioning language, pitch beats, copy rules: `memory/design/Positioning.md`

---

## Token index

All tokens live in `:root` in `index.html`. Aliases (short names) are the ones used in component CSS.

| Category | Key tokens | Alias |
|---|---|---|
| Background | `--color-bg #0e0e10` · `--color-surface #17171a` · `--color-surface2 #1f1f24` | `--bg` · `--surface` · `--surface2` |
| Text | `--color-text #e8e8ec` · `--color-muted #80808d` | `--text` · `--muted` |
| Accent | `--color-accent #c8f060` · `--color-accent-dim rgba(200,240,96,0.12)` | `--accent` · `--accent-dim` |
| Danger | `--color-danger #ff5f5f` | `--danger` |
| Typography | `--font-mono 'DM Mono'` · `--font-display 'Syne'` | — |
| Sizes | `--text-sm 11px` · `--text-task 13.5px` · `--text-md 14px` · `--text-lg 16px` | — |
| Spacing | `--space-1 4px` through `--space-8 32px` (4px base scale) | — |
| Layout | `--add-task-bar-height 72px` · `--panel-max-width 420px` | — |
| Motion | `--dur-fast 0.15s` · `--dur-base 0.18s` · `--dur-slow 0.30s` | — |
| Easing | `--ease-out cubic-bezier(0.16,1,0.3,1)` · `--ease-spring cubic-bezier(0.34,1.56,0.64,1)` | — |
| Z-index | `--z-header 10` · `--z-modal 100` · `--z-splash 500` | — |

**Rules:** no hardcoded hex/rgba outside `:root` · no `transition: all` · no undefined CSS vars. Enforced by `scripts/design-lint.mjs`.

→ Full token table with usage notes: `memory/design/Tokens.md`

---

## Component conventions

### Runtime ownership
- `assets/runtime.js` loads first. Components publish frozen APIs via `Today.define(name, api)`; consumers resolve via `Today.use(name)`.
- All UI actions declared in markup as `data-today-click` / `data-today-change` / etc. No inline event attributes.
- Compatibility globals are transitional. Ceiling: 117. New APIs belong on `Today`.
- Deterministic logic lives outside DOM: `sync-merge.js`, `suggestion-policy.js`, `noticed-model.js`, `focus-session.js`.

→ Full contracts, task row spec, accessibility contract: `memory/design/Components.md`

### Motion rules
- **Looping animations → WAAPI only** (`_breathe` / `_pulseComplete`). CSS animations restart from keyframe 0 on `display` toggle — that is a guaranteed flash (BUG-028, four sub-fixes).
- **One-shots → CSS is correct** (slide-in, tag shimmer, completion pop).
- **Motion communicates state, not decoration.** Every animation must explain what changed.
- **Always gate on `prefers-reduced-motion`.** JS gates use `_motionDuration()` / `_motionEasing()` from `assets/util.js`; never hardcode ms or cubic-bezier values in WAAPI options.
- **Never animate per-letter transforms on text.** WebKit promotes each glyph to its own compositing layer and re-rasters mid-motion (BUG-032, seven passes). Text may fade or typewriter; per-glyph transforms are structurally unsafe.

→ Full timing table, animation catalog, splash sequence: `memory/design/Motion.md`

---

## AI surface rules

Every proactive AI line must pass three gates before prose generation:
1. **Evidence** — repeated behavior, a clear self-comparison, or a relationship with observations on both sides.
2. **Novelty** — something the visible list, grid, or counters do not already show.
3. **Usefulness** — it could change a choice. A true statement that leads nowhere fails this gate.

If any gate fails, the surface abstains — no generic fallback. Code selects the observation; the model is a writer, not the epistemologist.

**Wallpaper Test:** every recurring surface must deliver value every appearance or be iterated/removed. Day 14 is the test, not day 1. → `memory/design/Philosophy.md`

**AI surface placement:** cluster at day boundaries (morning nudge, evening triage, Sunday reflection, Monday intention). Mid-day surfaces require an equivalently bounded task or session moment. New surfaces must have an observable downstream outcome before shipping.

**Prompt rules:** state the principle, never worked examples · the person is the subject, never a container · an insight catches a blind corner; a count restates the visible.

→ Full personalization inventory, memory type taxonomy, evidence boundary: `memory/design/Personalization.md`

---

## Tone

TODAY speaks like a calm, present friend.
- Human, not technical: "rest" not "Close", "breathe" not "Pause", "Forget" not "Disconnect"
- Present tense, active voice. No exclamation marks. No gamification language.
- Labels: 1–3 words. Status messages: 1 short sentence.

Vocabulary and banned phrases are enforced by `scripts/design-lint.mjs`. → `memory/design/Philosophy.md`

---

## Design file index

| File | What's in it |
|---|---|
| `memory/design/Philosophy.md` | Core principles, Wallpaper Test with case law, vocabulary, tone |
| `memory/design/Tokens.md` | Full token table (colors, type, spacing, motion, opacity, z-index) |
| `memory/design/Components.md` | Task row, habit row, add bar, triage, focus timer, accessibility contract |
| `memory/design/Motion.md` | Animation catalog, timing tokens, WAAPI vs CSS rule, splash sequence |
| `memory/design/Personalization.md` | Intelligence contract, personalization data inventory, memory types |
| `memory/design/Positioning.md` | External language, pitch beats, copy rules |
| `memory/design/ProductThinking.md` | Product designer role, question sequence, the walls, constraint-first reasoning |
