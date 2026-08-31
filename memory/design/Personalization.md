# Personalization & Intelligence

> How TODAY personalizes, why it has no settings, and how both serve the north star. Companion to `Philosophy.md` (Wallpaper Test) and `ProductThinking.md` (walls).

---

## The chain

**North star names the arc. Intelligence makes it visible. Personalization keeps it fresh.**

- The north star (*a longitudinal companion*, `Backlog.md` ◎, updated Aug 2026) claims an **arc**, not a moment and not a feature set. TODAY accumulates real understanding of you — your relationship with your own commitments — so that over time you see yourself more clearly. The morning remains the signature beat, but it is now where the arc surfaces, not the whole of it.
- **What changed, and why it matters here.** The retired north star (*own the first 30 seconds of the day*) was satisfied by any sufficiently good morning line. The companion north star is not: a line that is fresh every day but never accumulates fails it. Freshness is necessary and no longer sufficient — a surface must also show that TODAY has been paying attention across days. This raises the bar on every AI surface and is the reason the three gates below exist.
- Intelligence is what makes the arc legible — and what makes each individual moment worth its seconds. Placement is already visible in the code: AI surfaces cluster at day boundaries — morning nudge, daily brief (✦), evening triage hints, day-end review, Sunday reflection / Monday intention. The focus companion (✦ ask button, v2.45.0) is the intentional exception: it fires at session-start, not a day boundary, because its job is to frame a 25-minute sitting, not the day. New intelligence surfaces should keep landing on day boundaries unless they have an equivalently bounded session moment to justify the exception; an AI surface that fires mid-day at random competes with focus instead of framing it.
- Personalization is what keeps intelligence off the Wallpaper Test's kill list. `Philosophy.md`: *variety of input matters more than the model* — an LLM prompted the same way over the same data becomes slower wallpaper. Personal data IS the input variety. When a surface starts going stale, the fix is a fresh signal (`appMemory`, day shape, calendar), not a better prompt.

---

## Data, not knobs

TODAY personalizes through **observed behavior** and **opt-in connections** — never preference toggles.

Every toggle is a product decision deferred to the user. TODAY has opinions (no labels, midnight boundaries, 8pm triage) and keeps them; the user makes the app more theirs by *using* it and by *connecting* more, not by configuring more. Precedent: WEEK explicitly rejects manual energy ratings in favor of patterns from `today_daily_history`.

Naming caveat: `appMemory.preferences` contains only **inferences** (peakHour is computed from completions, never asked). The name is a historical misnomer — nothing in it is a setting, and nothing should become one.

---

## Earned personality — the AI/data contract (v2.71.12)

**Personality belongs in the delivery; evidence owns the claim.** A safe sentence that merely repeats a counter is wallpaper, while a lively sentence built from unrelated task nouns is faux insight. Every proactive personal line must therefore pass three gates before prose generation:

1. **Evidence** — repeated behavior, a clear self-comparison, or a relationship with observations on both sides.
2. **Novelty** — something the visible list, grid, or counters do not already say.
3. **Usefulness** — it changes self-understanding, suggests a lever, or helps choose what to do next.

If any gate fails, the surface abstains. It does not fall back to a generic summary. When a candidate passes, code selects and describes the observation; the LLM is a **writer, not the epistemologist**. It may add warmth, rhythm, dry wit, or a clarifying metaphor, but may not add evidence, infer identity, or turn association into causation. The voice can be confident; the claim stays conservative.

The Sunday reflection is the first full implementation. `_buildWeekReflectionInsight()` deterministically ranks supported focus/completion, habit/completion, recurring-weekday, and burst-rhythm candidates. `_fetchWeekReflection()` receives only the winner — no lifetime biography and no bag of completed-task titles. A programmatic output guard rejects identity, causal, tenure, and overlong claims. `none` or no qualifying candidate hides the sentence and leaves the week grid alone.

**Research basis:** perceived rather than merely actual personalization drives message effects ([Li, 2016](https://scholarship.miami.edu/esploro/outputs/journalArticle/When-does-web-based-personalization-really-work/991031577120502976)); anthropomorphic style improves calibrated trust only when it communicates useful context ([Carter, Loft & Visser, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11457490/)); a new preprint found unsupported user-profile inference across every tested LLM, so model self-restraint is not an adequate evidence layer ([Sun, Zhang & Sheng, 2026](https://arxiv.org/abs/2608.04570)). See `research/Psychology.md` for the evidence boundary.

### Where the existing symbiosis can compound next

These are leverage points, not permission to add more surfaces:

- **Expand only from earned intervention evidence.** v2.72.0 closes the first loop on the existing post-add suggestion row: offered reason → applied/dismissed/full-exposure ignore → generated-step completion or conservative reversal. v2.72.1 makes the evidence honest on long lists by counting an offer only when the unchanged task actually reaches the viewport and the suggestion is freshly delivered. A weak reason is reduced, not globally silenced; a reason earns preference from completed work, not persuasive copy. Before extending this machinery to another AI action, require an equally observable downstream outcome and reuse an existing surface.
- **Give memory provenance.** Confirmable inferences should eventually carry a short evidence window (“6 of 8 recorded Tuesdays”) and freshness/confidence metadata. This makes correction meaningful and prevents a once-true pattern from becoming permanent biography.
- **Prefer lifecycle evidence over noun themes.** Revive, Soon-return, age, focus-session, and let-go-reason data express choices the user actually made. They are stronger personalization material than semantic coincidence between task titles.
- **Share candidates across surfaces — now the active gap (2026-09-01).** Sunday, Noticed, Monday, the morning nudge, and focus should draw from one ranked observation pool with surface-specific eligibility and cooldowns. That prevents the same pattern from being narrated twice and makes abstention consistent. **Status:** the companion arc's 12b (v2.78.x) built the inverse — it handed the morning nudge a dump of raw `appMemory` signals and asked the model to choose what mattered, making the LLM the epistemologist. Four successive prompt revisions could not repair it, exactly as the bullet above predicts. `_buildWeekReflectionInsight()` remains the only correct implementation of the contract; the pool is that pattern generalized, and it is the prerequisite for 12b being fixable at all.
- **Measure interventions, not just behavior.** If TODAY says focus appears to be a lever, later reflection should check whether using focus changed the following period. A recommendation that cannot be evaluated should not harden into memory.
- **Model expiry and contradiction.** Recent episodic evidence may challenge a durable pattern without overwriting it immediately. Confirmed memory needs decay/revalidation rules before more signals are added.

---

## Capabilities vs. preferences — the Connections membership test

The "settings drawer" worry dissolves once the two populations are split:

- **Preferences** — behavior knobs ("show X", "sort by Y"). Target count: ~zero, forever.
- **Capabilities** — things TODAY can see or do that it couldn't before (Trello, Dropbox, AI key, your name). These are **consent**, not configuration.

**Membership test for the Connections panel: every row must name a data boundary and offer a disconnect.** "Dropbox sees your backup — Forget." "Your name — spots your tasks in meetings — removable." A row that fails this test (an accent picker, a hide-PAST toggle) is preference drift; it doesn't belong there or anywhere.

Under this test the panel growing is not drift — it's the privacy model becoming visible. For a client-only, no-account product, one screen that inventories everything the app can see, each row revocable, is a **trust ledger**. Server-side products can't offer this; the architecture makes the panel more honest as it grows.

Growth rule: past ~6 rows, group by data direction (what flows in: Trello/Todoist · where it goes: Dropbox/AI) — not by feature.

Capture vs. management: capture identity/consent **at the point of need** (name prompt on first mic tap, v2.31.0); manage it **where people go looking** (Connections). These are different jobs and almost never share a home.

---

## Inventory — what personalization data already exists

Run ProductThinking's "what already exists?" reflex against this table before adding a new signal. All local, Dropbox-synced.

| Signal | Where | Feeds |
|---|---|---|
| `completionsByHour` → `peakHour` | `appMemory.patterns` / `.preferences` | energy-rhythm lines, proactive observations |
| `taskKeywords` (added count, avg days to complete) | `appMemory.patterns` | historical task keyword stats — distinct from `dragKeywords` |
| `dragKeywords` (rolling 100-word list) | `appMemory.preferences` | words extracted from tasks let go via triage (`_memoryOnTaskLetgo`, v2.52.0). Shown in memory panel when 10+ entries and a word appears 2+ times. **Used in focus companion (v2.65.0):** task words matched against this list (freq ≥ 2, len > 3) — if there's a hit, companion is told to name the avoidance pattern directly. |
| `focusMinutesTotal`, `bestStreak`, `moments` | `appMemory` | milestone observations; `focusMinutesTotal` also feeds a Noticed total-focus-hours milestone (v2.38.0) |
| `dayStartCount` / `lateAdditions` | `appMemory.patterns` | planned-vs-emergent insight (proactive `reactive_pattern` observation only — considered for Noticed v2.38.0, dropped as a near-duplicate of that existing observation) |
| `recentCompletedTasks` (30-day rolling, v2.29.0) | `appMemory` | `_memoryForAI()` and Monday context. Removed from Sunday in v2.71.12: unrelated titles encouraged semantic wordplay without evidence. Noticed uses behavioral aggregates, not task content, since v2.64.2. |
| `suggestionHistory` / `suggestionCooldowns` | `appMemory` | Assistant-panel aging-task history and cooldown |
| `suggestionOutcomes` (v2.72.0) | `appMemory` | Post-add inline offers by reason: applied, dismissed, ignored, completed-step help, and conservative reversal. Reduces repeatedly failing reasons and informs model preference; last 100, Dropbox-synced, no telemetry or new surface. |
| `today_daily_history` (30-day per-day snapshots) | localStorage | weekly stats, week grid, future WEEK companion |
| `user_names` | localStorage | meeting attribution — the only *declared* personal data |
| `task.revived` (v2.27.0, sync-merged) | task objects | strongest importance signal to nudge + proactive AI (v2.35.2) — "the choice was theirs, already made" |
| `letgoReasons` (v2.62+) | `appMemory.patterns` | reason distribution for tasks let go via triage. **Caution (v2.62.1):** `letgoReasons['']` is now semantically ambiguous — it captures both "triage Let go, no reason chip selected" and "silent delete (toast expired without undo)." If this bucket is ever surfaced or compared, these two populations need to be distinguished (a separate `silentDeletes` counter or a richer key). Does not feed `_memoryForAI`. **Used in focus companion (v2.65.0):** dominant reason surfaced when one reason ≥35% of ≥8 total. |
| `soonPulls` (v2.62.1) | `appMemory.patterns` | how many times a task was pulled back from Soon to today. Forms a **reschedule regret cluster** with `task.revived` (Past → Today is the stronger version; Soon → Today is the softer one — wishful deferral the user couldn't commit to). Not in `_memoryForAI` yet. |
| `reviveReasons` (v2.62.1) | `appMemory.patterns` | reason distribution for tasks revived from Past (the *why* behind `task.revived`). Enriches but does not change the existing `task.revived` → Noticed path. Not in `_memoryForAI` yet. |
| `triageUndos` (v2.62.1) | `appMemory.patterns` | how many times the user undid an entire triage session. Meta signal: if elevated, triage decisions are hasty or the session fired at the wrong moment. Not in `_memoryForAI` yet. |
| `returningTasks` (v2.77.26) | `appMemory` | `{ [taskId]: { text, firstSeen, dayCount, focusSessions } }` — tasks (manual + Trello) on the list 5+ days. Updated on every `_memoryForAI()` call when `manualTasks` is available. In `_memoryForAI`: top 3 by age; separately surfaces tasks with 0 focus sessions (pure avoidance signal). Psychology basis: Zeigarnik effect + procrastination research. |
| `obligationLanguageTally` (v2.77.26) | `appMemory` | `{ week, count, completed }` — rolling weekly count of tasks added with obligation language ("have to", "should", "must") and completions of same. Incremented by `assistant.js` on obligation detection; `completed` by `_memoryOnTaskComplete`. In `_memoryForAI`: surfaces as ratio when count ≥ 2. Psychology basis: SDT autonomy continuum. |
| `taskAgeBuckets` (v2.77.26) | `appMemory` | `{ d1to3, d4to6, d7to13, d14plus }` — summary counts of all current tasks by age bracket. Updated alongside `returningTasks`. In `_memoryForAI`: `d14plus` count surfaces as cognitive weight signal when ≥ 2. Psychology basis: Zeigarnik ambient load. |
| `appMemory.noticed` (v2.35.0, device-local) | `appMemory` | show-once bookkeeping for the Noticed block — deliberately not sync-merged. (Synced v2.36.3/BUG-058, then reverted back to device-local v2.39.3: syncing made "shown once" mean "shown once across all devices combined," so one device's About-open silently consumed the notification for every other device. The signal *data* itself — habit completions, focus minutes, peak hour, week-theme text — stays fully synced, so this never risks two devices showing different content, only whether each gets its own honest chance to show it at all.) |
| `appMemory.noticedDates` (v2.39.4, synced) | `appMemory` | narrower companion to `appMemory.noticed` — records only *when* each signal-occurrence first fired, on any device (earliest-date-wins merge), never the shown content. Lets a signal show same-day on a second device without reintroducing BUG-058's cross-device content divergence. |

---

## Sensitive-data boundary — post-triage reflections (v2.65.7)

Evening reflections (five categorical feelings after triage) are a **separate sensitive record** from the main `appMemory` object. They live in four dedicated localStorage keys (`today_reflection_policy`, `today_reflections`, `today_reflections_cleared_at`, `today_reflection_intro_seen_at`) backed up under matching keys in Dropbox.

Design decisions:

- **Opt-in with visible payoff**: a one-time consent prompt after the user's first eligible triage; nothing is collected before "Remember" is tapped.
- **No automatic AI inclusion**: the `_memoryForAI()` function does NOT include reflection history. The user triggers AI via a "Reflect" button in the Memory panel, which sends only aggregate counts — never the feeling words attached to specific dates.
- **Selected-population wording required**: any surface that analyses reflection data must say "On evenings you reflected…" — the sample is never claimed to be representative of all evenings.
- **Whole-history deletion**: clearing also sends an immediate silent Dropbox backup so the deletion propagates to all devices without waiting for the next scheduled sync.
- **Deliberate exclusion from `#memoryPanel` main blocks**: the reflection block is appended _after_ the four main `typeBlock` sections by a separate `_reflectionRenderMemory(el)` call, so it can never be accidentally included in a memory-reset flow that doesn't also call `_reflectionClearFromAllMemory`.

---

## Resolved candidates (how the gates played out, 2026-07)

Both original gated candidates resolved with the Roadmap #1 verdict (2026-07-18: nudge kept, read every time):

- **Surfacing learned patterns** → **shipped v2.35.0 as the Noticed block** (About). The surveillance tension was answered by design, not softened wording: **delta-gating** — each line appears once when something *changes* (milestone crossed, peak hour moved, theme emerged), then never again; empty means hidden. A fact restated is surveillance; a change noticed once is attention. That principle — *state deltas, never facts* — is the reusable lesson for any future "what TODAY knows" surface. W3 verdict season passed (Aug 2026) — Noticed remains in watch list pending Can's read.
- **Calendar busy/free day-shape** — **untriggered.** It was the escape hatch for a stale nudge; the verdict found the nudge isn't stale. Stays in `Backlog.md`'s Not-implementing table as a conditional; revisit only if a future W-check finds the nudge going flat.

The W3 verdict season (poem coda, brief, Today block, Noticed — all due Jul 28–Aug 2 2026) has passed. Verdicts outstanding: **Noticed 7-signal** still open in `Rules.md` watch list. Focus companion and Monday intention had their W-check in Aug 2026 — improvements shipped (v2.65.0, v2.65.1). The sequencing gate principle stands: hear how a surface is landing before building the next one.

---

## App memory design — research-grounded principles (2026-08)

> From a research pass across production AI memory systems (ChatGPT, Claude, Mem.ai), user modeling academia, PKM tool communities, and privacy/consent literature. These principles should govern any new memory work before touching `appMemory`.

### Hard constraint
Memory must be **inspectable and clearable by the user.** Not just deletable in bulk — individual inferences should be viewable and revocable. **Implementation decision (v2.47.0):** Memory lives in a dedicated `#memoryPanel` (opened via ✦ in the task bar), not in Connections — the two panels have different jobs (memory = content you've inferred about me; connections = data I've consented to share). A "Connections →" link in the Memory panel footer bridges the two for discoverability. Opt-in with visible payoff; never opt-out with invisible benefit. Deletion must trace through derived data, not just clear the source entry.

### Abstraction over storage
Don't store behavior — store conclusions. Completion timestamps, focus session counts, and task keywords are inputs. Memory is what you derive from them: *"tends to finish tasks before noon," "focus clusters Tue/Wed," "breaks projects into ≤30-min chunks."* The transformation step is the design. Storing more raw history degrades quality — expanding preference context from 5 to 25 examples dropped LLM accuracy from 61% to 59% in controlled research. The existing `peakHour` inference from `completionsByHour` is the right pattern to extend.

### Four memory types — store, update, and surface differently

| Type | What it holds | Update rate |
|---|---|---|
| **Semantic** | Stable identity traits — "is a morning person," "prefers short tasks" | Slow — months |
| **Episodic** | Specific recent state — "had three bad focus sessions last week" | Fast — days |
| **Procedural** | Behavioral habits — "breaks projects into ≤30-min chunks," "avoids admin after 3pm" | Medium — weeks |
| **Meta** | System's own confidence and data coverage — "I only have 5 days of evening data" | Continuous |

Conflating types produces systems too cautious about small things or overconfident about important ones. Meta memory is underrated — saying "I don't have enough data on X yet" is a feature, not a failure.

### Three temporal scales, different inertia
- **This week** — high plasticity, updates fast. Episodic state.
- **This month** — medium inertia, rolling average. Procedural patterns.
- **Stable identity** — very slow, resists transient noise. Semantic traits.

If a week looks wildly different from the medium window, surface that as a signal rather than immediately updating the long-window model. Don't let a burned-out week erase 6 months of healthy patterns (catastrophic forgetting).

### Trust architecture: AI proposes, user confirms
Fully automatic inference erodes trust when it's wrong — users have no mental model for why and no path to contest. The pattern that works: **AI generates candidate inferences from behavioral data → surfaces them visibly as hypotheses → user ratifies or rejects.** This converts implicit signal to explicit, authoritative memory without bypassing the user's agency. Connects directly to the *Noticed* block pattern: delta-gated, once on change, user can always inspect.

### Personalization backfire effect
When users feel surveilled rather than served, personalization *reduces* engagement — measurably, in controlled research. The shift from "helpful" to "creepy" is not predictable from outside; opt-in with visible payoff is safer than opt-out with invisible benefit. Show the user what the system knows and what it did with that knowledge.
