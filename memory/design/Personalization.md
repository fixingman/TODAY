# Personalization & Intelligence

> How TODAY personalizes, why it has no settings, and how both serve the north star. Companion to `Philosophy.md` (Wallpaper Test) and `ProductThinking.md` (walls).

---

## The chain

**North star names the moment. Intelligence fills it. Personalization keeps it fresh.**

- The north star (*own the first 30 seconds of the day*, `Backlog.md` ◎) claims a **moment**, not a feature set.
- Intelligence is what makes that moment worth 30 seconds. This is already visible in the code: every AI surface clusters at day boundaries — morning nudge, daily brief (✦), evening triage hints, day-end review, Sunday reflection / Monday intention. New intelligence surfaces should keep landing on day boundaries; an AI surface that fires mid-day at random competes with focus instead of framing it.
- Personalization is what keeps intelligence off the Wallpaper Test's kill list. `Philosophy.md`: *variety of input matters more than the model* — an LLM prompted the same way over the same data becomes slower wallpaper. Personal data IS the input variety. When a surface starts going stale, the fix is a fresh signal (`appMemory`, day shape, calendar), not a better prompt.

---

## Data, not knobs

TODAY personalizes through **observed behavior** and **opt-in connections** — never preference toggles.

Every toggle is a product decision deferred to the user. TODAY has opinions (no labels, midnight boundaries, 8pm triage) and keeps them; the user makes the app more theirs by *using* it and by *connecting* more, not by configuring more. Precedent: WEEK explicitly rejects manual energy ratings in favor of patterns from `today_daily_history`.

Naming caveat: `appMemory.preferences` contains only **inferences** (peakHour is computed from completions, never asked). The name is a historical misnomer — nothing in it is a setting, and nothing should become one.

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
| `taskKeywords` (added count, avg days to complete) | `appMemory.patterns` | drag-keyword awareness |
| `focusMinutesTotal`, `bestStreak`, `moments` | `appMemory` | milestone observations; `focusMinutesTotal` also feeds a Noticed total-focus-hours milestone (v2.38.0) |
| `dayStartCount` / `lateAdditions` | `appMemory.patterns` | planned-vs-emergent insight (proactive `reactive_pattern` observation only — considered for Noticed v2.38.0, dropped as a near-duplicate of that existing observation) |
| `recentCompletedTasks` (30-day rolling, v2.29.0) | `appMemory` | `_memoryForAI()`, Sunday/Monday prompts, Noticed's AI-generated week theme (v2.39.0 — replaced a keyword-frequency count that read as a stat, not an insight) |
| `suggestionHistory` / `suggestionCooldowns` | `appMemory` | AI remembers what it suggested and what the user did |
| `today_daily_history` (30-day per-day snapshots) | localStorage | weekly stats, week grid, future WEEK companion |
| `user_names` | localStorage | meeting attribution — the only *declared* personal data |
| `task.revived` (v2.27.0, sync-merged) | task objects | strongest importance signal to nudge + proactive AI (v2.35.2) — "the choice was theirs, already made" |
| `appMemory.noticed` (v2.35.0, device-local) | `appMemory` | show-once bookkeeping for the Noticed block — deliberately not sync-merged. (Synced v2.36.3/BUG-058, then reverted back to device-local v2.39.3: syncing made "shown once" mean "shown once across all devices combined," so one device's About-open silently consumed the notification for every other device. The signal *data* itself — habit completions, focus minutes, peak hour, week-theme text — stays fully synced, so this never risks two devices showing different content, only whether each gets its own honest chance to show it at all.) |
| `appMemory.noticedDates` (v2.39.4, synced) | `appMemory` | narrower companion to `appMemory.noticed` — records only *when* each signal-occurrence first fired, on any device (earliest-date-wins merge), never the shown content. Lets a signal show same-day on a second device without reintroducing BUG-058's cross-device content divergence. |

---

## Resolved candidates (how the gates played out, 2026-07)

Both original gated candidates resolved with the Roadmap #1 verdict (2026-07-18: nudge kept, read every time):

- **Surfacing learned patterns** → **shipped v2.35.0 as the Noticed block** (About). The surveillance tension was answered by design, not softened wording: **delta-gating** — each line appears once when something *changes* (milestone crossed, peak hour moved, theme emerged), then never again; empty means hidden. A fact restated is surveillance; a change noticed once is attention. That principle — *state deltas, never facts* — is the reusable lesson for any future "what TODAY knows" surface. W3 verdict due 2026-08-02.
- **Calendar busy/free day-shape** — **untriggered.** It was the escape hatch for a stale nudge; the verdict found the nudge isn't stale. Stays in `Backlog.md`'s Not-implementing table as a conditional; revisit only if a future W-check finds the nudge going flat.

Current sequencing gate: the **W3 verdict season** (poem coda Jul 28 · brief Jul 30 · Today block Aug 1 · Noticed Aug 2). Four intelligence surfaces await behavioral verdicts — building a fifth before hearing how these four landed repeats the wallpaper mistake the #1 gate existed to prevent.

---

## App memory design — research-grounded principles (2026-08)

> From a research pass across production AI memory systems (ChatGPT, Claude, Mem.ai), user modeling academia, PKM tool communities, and privacy/consent literature. These principles should govern any new memory work before touching `appMemory`.

### Hard constraint
Memory must be **inspectable and clearable by the user.** Not just deletable in bulk — individual inferences should be viewable and revocable. The Connections panel is the right home: every memory row names what it stores and offers a real disconnect. Opt-in with visible payoff; never opt-out with invisible benefit. Deletion must trace through derived data, not just clear the source entry.

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
