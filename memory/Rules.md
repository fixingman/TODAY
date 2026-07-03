# TODAY — Critical Rules
> **Read this first.** These rules must never break.

---

## Current Focus (update each session)
- **Working on:** v2.18.39 (next)
- **Recent:** Fix BUG-053 v2.18.38 — morning nudge dismissal wasn't syncing across devices (same gap as BUG-051, mirrored fix). Poem round 15 v2.18.37 — Wen T'ung 'Morning' added (corpus 87) under new app-moment/corpus-fit tests + anthology-first search process (see Backlog.md § 2). Fix BUG-052 v2.18.36 — splash gate held by sync bookkeeping (rev seed + push-back now deferred past `_onAppLoadDone`; ticker starts after them — rev-baseline invariant kept). Fix v2.18.35 — Bashō Milky Way duplicate removed from corpus (87→86). Fix v2.18.34 — ☕ CTA emoji restored (FE0E removed, linter EXEMPT). Fix v2.18.33 — Trello nudge counting done tasks (`checkTrelloNudge` used raw `trelloTasks` without `doneIds` filter; one-line fix). Poem rounds 13–14 — corpus 82→87 (target ~90): Yaha summer-room haiku + Plato & Leonidas (Mackail Greek Anthology 1890 — new productive source) fixed thin summer 8→11 (v2.18.30); Marcus Aurelius IV.3 + V.1 in **Farquharson 1944** — the worldwide-PD modern-English Meditations; Casaubon/Higginson pass cut 4/4 on diction first (use modern-PD translators: Farquharson 1944, Haines 1916, Oldfather 1928) (v2.18.31). New canonical brief in Backlog.md (Can's wording); PD rule now worldwide-only — US-PD-only category retired, 11 legacy poems grandfathered pending decision. Turkish (no worldwide-PD English) + Sufi (Nicholson/Bell rejected on brief-fit) investigated + closed. Poem round 12 — corpus 80→82: Rilke 'Autumn' (Lemont trans.) + Bashō Milky Way haiku in; Goethe/Sappho/summer-moor cut (taste: gravity beats gentleness); Chamberlain 1902 scan found on archive.org — productive lead (v2.18.29). Poem round 11 — corpus 78→80: Yeats 'Innisfree' + Housman 'Loveliest of trees' in; Lowell/Pound/Crapsey cut (taste nuance: rhymed-lyrical with feeling beats imagist minis; quaintness is the disqualifier, not rhyme); 'London Snow' lead closed — too long (v2.18.28). BUG-032 seventh pass — per-letter splash rise REMOVED (structurally unwinnable: CSS transform animation promotes each letter to a compositing layer at animation start → glyph re-raster mid-motion; plus the 2-frame warm paint was itself a visible low-position flash); logo now fades in as a single unit (`.5s var(--ease-out)`), Motion.md rule added: never per-letter transform animations on text (v2.18.27, awaiting device verify). BUG-049 ✅ + BUG-051 ✅ verified 2026-07-02; Bugs.md table now newest-first. Nudge dot breathe made readable — opacity+scale (AI-badge treatment: 1→0.5 + scale 1→0.85, 2400ms) replacing the imperceptible opacity-only 1→0.65 on the 6px dot; new Motion.md § Breath Pattern rule: small elements (≤ ~10px) pair opacity with scale (v2.18.26). `/design-review` gained a Calibration section — real worked findings vs non-findings from repo history (Done-button accent, week-narrative Wallpaper removal, tracking drift, README→Read Me; 7px padding + scope discipline + 🍅 exception as non-findings). Design-testing tooling — `scripts/design-lint.mjs` (tier 1, mechanical: tokens/vocabulary/emoji-selector/Rule-27) + `.claude/commands/design-review.md` → `/design-review` (tier 2, judgment: voice/philosophy/psychology/Wallpaper Test); building it caught + fixed 3 exclamation-mark voice slips and 7 missing FE0E emoji selectors in real UI (v2.18.25). Morning nudge presence redesign — quiet surface panel + breathing accent dot, replacing the flush static-dot "footnote" treatment; text/data unchanged, only the frame (v2.18.24); BUG-051 Trello nudge dismissal synced across devices — `trello_nudge_dismissed` added to backup payload + `mergeRemoteData()` merge block, modelled on `triage_dismissed` (v2.18.23, ✅ verified 2026-07-02); BUG-049 new Trello cards look aged on arrival — now age from a synced `today_trello_firstseen` map (when the card entered your list) instead of Trello creation date; `_getCreatedFromTrelloId` removed (v2.18.22, ✅ verified 2026-07-02); BUG-045 done-today count inflation — retired the monotonic `stat_tasks_done_today` counter, now derived from checked_ids via `_doneTodayCount()` (v2.18.21, ✅ verified 2026-07-02; folds in the former BUG-049 — same bug, this was the counter-retirement pass after the v2.18.14 date guard); "README"→"Read Me" About label (v2.18.20); Triage Done button neutralised + moved to end of row (v2.18.19); BUG-032 splash letter-rise smoothness polish (v2.18.18); BUG-048 Trello focus map now syncs via Dropbox (v2.18.17); BUG-047 fresh-install auto-restore on Dropbox connect (v2.18.16); BUG-041 ✅ verified (v2.18.13); BUG-044 ✅ verified (v2.18.6)
- **Module extraction in progress:** `assets/util.js` + `assets/idle.js` out (classic scripts before main `<script>`, globals shared via lexical env, precached in sw.js). Next risk-ascending: `sound.js`, `celebration.js`, `trello.js`, `insights.js`, `sync.js` (last — Non-Delegation). Coupled core stays inline. See Backlog Roadmap #3.
- **Watch for:** **Partial-focus un-aging (BUG-043 design):** Can reacted to Trello aged cards un-aging without a *completed* focus session and asked to match manual — but both already un-age on *any* focus time (the v2.18.8/v2.18.11 design). Decided NOT to change yet (2026-07-01) — **watching** whether the partial-un-age rule feels wrong in practice; if so the fix is to require a completed session (symmetric, both task types). · BUG-047 fresh-install auto-restore awaiting verify (v2.18.16) · BUG-032 per-letter rise removed, single-unit fade awaiting device verify (v2.18.27) · BUG-052 splash-gate dropped sync bookkeeping, awaiting device verify — snappier morning cold start + confirm push-back still lands on Dropbox (v2.18.36) · BUG-053 morning nudge dismiss sync, awaiting device verify — dismiss on one device, confirm hidden on another within ~7s (v2.18.38) · WAAPI wake behaviour — watch for BUG-004 recurrence after long sleep

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
| Legacy architecture doc (pre-split) | `archive/Architecture.md` |
| Legacy design doc (pre-split) | `archive/Design.md` |
| Legacy research doc (pre-split) | `archive/Research.md` |
| Legacy README (pre-archive) | `archive/README-archive.md` |
| Legacy memory-structure doc | `archive/Structure.md` |

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
12. Backup schema version: **5.3** (5.2 + daily_history — week-grid per-day snapshots, union-merged by date; BUG-036)
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
Push to `master` only when explicitly asked. Don't ask permission to follow the rules; don't
commit without being asked.

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
