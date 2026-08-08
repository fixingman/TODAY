# TODAY — Critical Rules
> **Read this first.** These rules must never break.

---

## Current Focus (update each session)
- **Working on:** v2.61.5 — blank-screen-on-wake fix (BUG-071, third recurrence of BUG-004/056 family). Also in flight: BUG-070 ⏳ (undo toast chip layout + feedback, v2.61.3–4, unverified). Recent session: poem share image (v2.61.0), poem-utils.js extraction (v2.61.2), undo toast column layout (v2.61.3), chip highlight/dismiss (v2.61.4), wake repaint extended to 12s + _wakeFocusCheck (v2.61.5).
- **Recent (2026-08-08):** Undo toast chips unclickable on narrow screens (BUG-070) — two-pass fix: column layout v2.61.3, feedback v2.61.4. Blank app on wake/PWA background return during focus (BUG-071) — repaint schedule to 12s + visibility guard + _wakeFocusCheck viewport correction v2.61.5. Poem share card (canvas PNG, Web Share API, v2.61.0). Shared poem-utils.js to eliminate index.html/poem.html duplication (v2.61.2). OG edge function for poem pages (v2.59.1). Sekki micro-seasons in poem selection (v2.60.0).
- **Module extraction (Roadmap #3):** Done: `util.js`, `idle.js`, `sound.js`, `celebration.js`, `trello.js` (v2.33.5), `insights.js` (v2.33.10), `poem-utils.js` (v2.61.2). Next: `sync.js` (~510 lines, Non-Delegation). Coupled core stays inline.
- **Watch for (open items only — verified history lives in Changelog.md / archives):**
  - **BUG-070 ⏳ v2.61.4** — verify undo toast chips are tappable on narrow screen; selected chip highlights accent, toast dismisses 800ms after tap.
  - **BUG-071 ⏳ v2.61.5** — verify: focus mode active → PWA background → return → app not blank. Also: Mac long sleep (5–15 min) → wake → focused task still in viewport.
  - **Meeting attribution accuracy — ask Can:** after a few real meetings, ask "how's meeting attribution doing?" and read `appMemory.meetingAttribution` (`mineKept/mineShown` precision, `othersSelected/othersShown` recall).
  - **Noticed 7-signal expansion (v2.38.0)** — if it still reads as noise, ask whether Noticed needs a different shape.
  - v2.28.0 meeting mode mobile — real in-room meeting on iPhone PWA (phone on table, screen on).

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
| Product thinking / feature evaluation | `design/ProductThinking.md` |
| Personalization / intelligence strategy | `design/Personalization.md` |
| Outward-facing copy / pitch / README voice | `design/Positioning.md` |
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
| Legacy architecture doc (pre-split) | `archive/Architecture.md` |
| Legacy design doc (pre-split) | `archive/Design.md` |
| Legacy research doc (pre-split) | `archive/Research.md` |
| Legacy README (pre-archive) | `archive/README-archive.md` |
| Legacy memory-structure doc | `archive/Structure.md` |

---

## Bug Lifecycle

When Can says a bug is verified:
1. **`Bugs.md` status table** — change ⏳ to ✅, keep the version number, no date (e.g. `✅ v2.18.27`)
2. **`Bugs.md` detail block** — move the full `## BUG-XXX` section to `archive/Bugs-archive.md` (ascending numeric order; keep the `---` separator). Remove it from `Bugs.md`.
3. **`Rules.md` Watch for** — remove the bug's entry from the Watch for line.

Status symbols used throughout:
- ⏳ = fix shipped, awaiting real-device verify
- ✅ = verified fixed (date noted)

---

## Layout Rules (will break UI if violated)

1. **`.app` has NO overflow clipping** (v2.33.3) — even `overflow-x: clip` (which doesn't create a scroll container) demotes `position: sticky` descendants to main-thread positioning on iOS WebKit, making section headers lag the compositor scroll by a frame (BUG-050 sixth pass; the never-jittering logo header — a direct body child with no clipping ancestor — was the tell). Horizontal protection lives on the root: `html { overflow-x: hidden }`. Never put `overflow`/`overflow-x` of any value on `.app` or any ancestor of a sticky element. `position: fixed` children still must be outside `.app` (Rule 5).
2. Sticky header: `<div class="sticky-header">` goes **before** `<div class="app">`
3. Add-task bar: `<div id="addTaskBar">` goes **after** `</div><!-- end .app -->`
4. `scrollRestoration = 'manual'` must be the **very first line** of `<script>`
5. Fixed elements outside `.app` need `style="opacity:0"` — revealed after splash dismissal
5b. **Every `position: fixed` element anchored to a screen edge must offset by `env(safe-area-inset-*)`** — `viewport-fit=cover` draws the iOS PWA under the status bar (~47–59px) and home indicator (~34px). An element at `top: 8px` is invisible on mobile (BUG-031: error dot fired behind the status bar). Pattern: `top: calc(env(safe-area-inset-top, 0px) + 8px)`. Desktop unaffected (inset = 0). **Bottom-edge gotcha (v2.32.2):** for a bar fixed at `bottom: 0` with `align-items: center`, adding safe-area via `padding-bottom` alone is wrong — centering happens over the full height including the extra padding, pushing content into the home indicator zone. Correct: `bottom: env(safe-area-inset-bottom, 0px)` (bar floats above the indicator) + symmetric padding + `::after` fill for the gap. For overlays with `align-items: flex-end`: use `padding-bottom: calc(base + env(safe-area-inset-bottom, 0px))` (shorthand override).
5c. **Every focusable text input must be ≥16px font-size on mobile** — iOS auto-zooms the page when a focused input is smaller, breaking the layout until the user pinches out. The viewport meta cannot prevent this without `maximum-scale=1` (accessibility cost — never add it). The ≤600px media block forces `--text-lg` (16px) on all text inputs; when adding a new input, add it to that list (v2.33.2).

## Interaction Rules

6. **Enter key = always add task** (no mode switching, no routing)
7. **✦ button = AI route** (with or without text in input)
8. `_aiLoadedOnce` prevents re-fetch on panel toggle — reset only on error
9. Uncheck = neutral (no celebration, no sound)
10. Check = celebration (sound, particles, haptic)

## Data Rules

11. `manualTasks` and `habitsList` preserve drag order — **never re-sort**
12. Backup schema version: **5.4** (5.3 + `manual_order_at` — recency-aware manual order merge, drag jump-back fix, v2.38.7). Additive keys that need no bump: `trello_order_at` (BUG-042), `today_trello_lastactive` (BUG-064)
13. Task IDs: `manual_` + timestamp, habit IDs: `habit_` + timestamp
14. All timestamps: ISO strings (UTC for sync ordering). **Date-only strings: use `_localISO()`** (local YYYY-MM-DD) — never `toISOString().slice(0,10)` which returns UTC and diverges near midnight (BUG-010).
15. **State variables must be declared before functions that use them** — `let` has temporal dead zone
16. **Day boundaries — tasks/triage/streak/focus at midnight, habits at 3am.** `_getAppDay()` (midnight, human-readable) and `_localISO()` (YYYY-MM-DD) govern tasks, triage, streak, focus. **Habits roll at 3am** via `_habitTodayISO()` → `_localISO(_habitNow())` where `_habitNow() = Date.now() - 3h` (a late-night check counts toward the day that's ending). `_getHabitDates()` uses the same `_habitNow()` so the strip refreshes in lockstep (do NOT split these — that was the v2.12.74 lag bug). All local time — the grace shifts a Date then derives the local date, never UTC (BUG-010). Full ISO timestamps (`zoneChangedAt`, `ts`) stay UTC for cross-timezone sync.
17. **Triage window: 8pm–midnight** — triage bar only shows in this window (aligned with day boundary)
18. **Flow rate = `100 × (1 - 0.8^done)`** — diminishing returns formula. First task = 20%, 5 tasks ≈ 67%. Live calc, not stored. (Based on Endowed Progress Effect + Goal Gradient Hypothesis)

## Style Rules

19. No hardcoded hex/rgba outside `:root` — all tokenized *(checked by `scripts/design-lint.mjs`)*
20. No emojis in system UI text. **Emoji-capable Unicode glyphs (ℹ ⚡ ⏱ etc.) must carry the `U+FE0E` text-presentation selector** (`&#xFE0E;` in HTML, `︎` appended in JS strings) or iOS renders them as full-colour emoji. Exception: 🍅 session badges are intentional emoji. (v2.17.78) *(checked by `scripts/design-lint.mjs` — self-calibrated to whichever glyphs the codebase has already paired with the selector)*
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

## Operating Mode (how routines run)

**Discipline runs automatically; commits/pushes are human-gated.** The version bump, *both*
changelogs, and affected-doc updates are part of any code change — they run unprompted, not
when a trigger phrase like "are you following rules md?" is spoken. A trigger phrase invokes a
routine *on demand*; it is never the precondition for doing the right thing. Conversely,
**Committing waits for Can to say so — pushing to `dev` follows the commit automatically.**
**The version must be bumped before pushing to `master`** — if it wasn't bumped before the
commit, bump it now and commit again before pushing. Push to `master` only when explicitly
asked. Don't ask permission to follow the rules; don't commit without being asked.

**Derive, don't duplicate.** `APP_VERSION` is derived from the newest `CHANGELOG` key
(`Object.keys(CHANGELOG)[0]`) — only edit the changelog. `sw.js` `CACHE_VERSION` is the one
value that genuinely can't derive (separate SW context, no build) — the smoke test asserts it
matches, so drift fails the pre-commit gate instead of shipping a stale cache.

## Git Rules

30. **Always work on `dev` branch** — never create feature branches unless explicitly asked

## Changelog Rules

31. **`index.html` CHANGELOG — keep exactly 3 entries (1 current + 2 history).** The About panel renders `slice(0, 1 + HISTORY_SHOWN)` where `HISTORY_SHOWN = 2` — anything beyond 3 is never shown. Plain language only: no function names, CSS properties, BUG-XXX codes, or root-cause archaeology. Say what changed for the user, not how. When adding a new entry, drop the oldest one (full history is in `memory/Changelog.md` / `memory/archive/Changelog-archive.md`). Dev detail belongs in `memory/Changelog.md`, not here.

## Non-Delegation Zones (require extra scrutiny)

These areas are error-prone — always read the relevant file and double-check logic:

| Zone | Why | Reference |
|------|-----|-----------|
| Sync merge logic | Union merge + deleted_ids is subtle | `architecture/Sync.md` |
| Writing a new kind of value into an existing synced map | Its merge rule encodes its meaning (MIN/MAX/union/LWW). A mismatched write works locally then silently reverts on sync — needs its own key instead (BUG-064; also `habit_events`, `noticedDates`) | Sync.md |
| Data schema changes | Breaking changes affect backups | `architecture/Data.md` |
| Delete operations | `deleted_ids` must persist across days | Rule 11, Data.md |
| Any `init()`-time check reading synced state | Runs before `mergeRemoteData()` lands — stale/empty on a fresh device, four confirmed instances (triage, nudge, Trello BUG-060, Sunday/habit BUG-061) | Sync.md Design Principle 6 |
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
