# TODAY — Critical Rules
> **Read this first.** These rules must never break.

---

## Current Focus (update each session)
- **Working on:** v2.17.107 (next)
- **Recent:** habit archive-on-delete (v2.17.106), BUG-030 Metal pre-warm + haptic eager init (v2.17.105), habit row mobile padding (v2.17.104)
- **Watch for:** BUG-030 awaiting re-verification on iOS cold start · BUG-032 awaiting verification · WAAPI wake behaviour — watch for BUG-004 recurrence after long sleep

---

## File Guide (what to read for each task)

### Tier 1 — Always read at session start
| File | Purpose |
|------|---------|
| `Rules.md` | Critical constraints |
| `Housekeeping.md` | Session routines |
| `Backlog.md` | Pending work |
| `Bugs.md` | Known bugs & verification status |
| `Changelog.md` | Recent changes (last ~20 versions) |

### Tier 2 — Read when task requires
| Task | Read |
|------|------|
| Bug fixes | `Bugs.md` |
| CSS/colors/fonts | `design/Tokens.md` |
| Animation/motion | `design/Motion.md` |
| UI components | `design/Components.md` |
| Design philosophy/voice | `design/Philosophy.md` |
| Data/localStorage | `architecture/Data.md` |
| Sync/backup | `architecture/Sync.md` |
| Connections panel / auth flows | `architecture/Connections.md` |
| AI companion | `architecture/AI.md` |
| Focus/timer | `architecture/Focus.md` |
| User psychology | `research/Psychology.md` |
| Time/day logic | `research/Temporal.md` |
| Integrations | `research/Integrations.md` |
| Quick capture | `research/Quick-capture.md` |
| Competitor analysis | `research/Landscape.md` |
| Testing | `Test-matrix.md` |
| Performance | `Performance-audit.md` |
| Historical bugs (verified, closed) | `archive/Bugs-archive.md` |
| Full changelog history | `archive/Changelog-archive.md` |

---

## Layout Rules (will break UI if violated)

1. `.app` has `overflow-x: hidden` — **never** put `position: fixed/sticky` children inside it
2. Sticky header: `<div class="sticky-header">` goes **before** `<div class="app">`
3. Add-task bar: `<div id="addTaskBar">` goes **after** `</div><!-- end .app -->`
4. `scrollRestoration = 'manual'` must be the **very first line** of `<script>`
5. Fixed elements outside `.app` need `style="opacity:0"` — revealed after splash dismissal
5b. **Every `position: fixed` element anchored to a screen edge must offset by `env(safe-area-inset-*)`** — `viewport-fit=cover` draws the iOS PWA under the status bar (~47–59px) and home indicator. An element at `top: 8px` is invisible on mobile (BUG-031: error dot fired behind the status bar). Pattern: `top: calc(env(safe-area-inset-top, 0px) + 8px)`. Desktop unaffected (inset = 0).

## Interaction Rules

6. **Enter key = always add task** (no mode switching, no routing)
7. **✦ button = AI route** (with or without text in input)
8. `_aiLoadedOnce` prevents re-fetch on panel toggle — reset only on error
9. Uncheck = neutral (no celebration, no sound)
10. Check = celebration (sound, particles, haptic)

## Data Rules

11. `manualTasks` and `habitsList` preserve drag order — **never re-sort**
12. Backup schema version: **5.2** (includes trello_order)
13. Task IDs: `manual_` + timestamp, habit IDs: `habit_` + timestamp
14. All timestamps: ISO strings (UTC for sync ordering). **Date-only strings: use `_localISO()`** (local YYYY-MM-DD) — never `toISOString().slice(0,10)` which returns UTC and diverges near midnight (BUG-010).
15. **State variables must be declared before functions that use them** — `let` has temporal dead zone
16. **Day boundaries — tasks/triage/streak/focus at midnight, habits at 3am.** `_getAppDay()` (midnight, human-readable) and `_localISO()` (YYYY-MM-DD) govern tasks, triage, streak, focus. **Habits roll at 3am** via `_habitTodayISO()` → `_localISO(_habitNow())` where `_habitNow() = Date.now() - 3h` (a late-night check counts toward the day that's ending). `_getHabitDates()` uses the same `_habitNow()` so the strip refreshes in lockstep (do NOT split these — that was the v2.12.74 lag bug). All local time — the grace shifts a Date then derives the local date, never UTC (BUG-010). Full ISO timestamps (`zoneChangedAt`, `ts`) stay UTC for cross-timezone sync.
17. **Triage window: 8pm–midnight** — triage bar only shows in this window (aligned with day boundary)
18. **Flow rate = `100 × (1 - 0.8^done)`** — diminishing returns formula. First task = 20%, 5 tasks ≈ 67%. Live calc, not stored. (Based on Endowed Progress Effect + Goal Gradient Hypothesis)

## Style Rules

19. No hardcoded hex/rgba outside `:root` — all tokenized
20. No emojis in system UI text. **Emoji-capable Unicode glyphs (ℹ ⚡ ⏱ etc.) must carry the `U+FE0E` text-presentation selector** (`&#xFE0E;` in HTML, `︎` appended in JS strings) or iOS renders them as full-colour emoji. Exception: 🍅 session badges are intentional emoji. (v2.17.78)
21. Fonts: `--font-mono: 'DM Mono'`, `--font-display: 'Syne'`
22. Accent: `#c8f060` — all variants derived from this
23. **`--font-display` (Syne) = all-caps or numbers only** — Syne's geometric letterforms work for "TODAY", version numbers, and stat values. Never use Syne for mixed-case English sentences — DM Mono handles all natural language text.

## Build Rules

24. Single-file app — all code in `index.html`, no build step
25. SW cache version must match app version: `today-v{VERSION}`
26. **`_cacheElements()` must run at START of `init()`** — before any rendering
27. **All render paths must match `taskHTML()` features** — tags, badges, session counts, etc. Three places render tasks independently: `taskHTML()` (new tasks), `renderTrello()` patch path (existing Trello tasks, every 7s), and zone renderers (SOON/PAST). When adding a feature to `taskHTML()`, also add it to the Trello patch path and zone renderers.
28. **Every code change requires memory review** — ask: "Does this affect documented behavior?" Update relevant memory files.
29. **Looping animations → WAAPI (`_breathe`/`_pulseComplete`), never CSS** — `_forceRepaint` display toggles restart CSS animations from keyframe 0 (visible flash, unfixable by suppression — BUG-028 ×4). CSS is fine for one-shots. See `design/Motion.md`.

## Git Rules

30. **Always work on `dev` branch** — never create feature branches unless explicitly asked

## Non-Delegation Zones (require extra scrutiny)

These areas are error-prone — always read the relevant file and double-check logic:

| Zone | Why | Reference |
|------|-----|-----------|
| Sync merge logic | Union merge + deleted_ids is subtle | `architecture/Sync.md` |
| Data schema changes | Breaking changes affect backups | `architecture/Data.md` |
| Delete operations | `deleted_ids` must persist across days | Rule 11, Data.md |
| Day boundary logic | Tasks vs habits use different cutoffs | Rule 16 |
| Zone operations | Must trigger `dropboxBackup(true)` | Sync.md |
| Trello patch path | Must mirror `taskHTML()` features (tags, badges, sessions) | Rule 27 |

## Z-Index Stack

| Layer | Z-Index | Element |
|-------|---------|---------|
| Base | 1 | Normal content |
| Header | 10 | Sticky header |
| Modal | 100 | Panels, overlays |
| Splash | 500 | Loading splash |
| Overlay | 999 | Top-level overlays |
| Idle companion | 50 | Creatures |

## Version Bumping (vA.BB.CC)

| Segment | Bump when... | Example |
|---------|--------------|---------|
| **CC** (Patch) | Bug fix, polish, small tweak | 2.12.51 → 2.12.52 |
| **BB** (Minor) | New feature, new UI section, new integration | 2.12.x → 2.13.0 |
| **A** (Major) | Breaking change, full redesign, data migration | 2.x.x → 3.0.0 |

**Reset rule:** When BB bumps, reset CC to 0. When A bumps, reset both BB and CC to 0.
