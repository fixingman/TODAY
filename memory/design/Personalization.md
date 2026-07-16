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
| `focusMinutesTotal`, `bestStreak`, `moments` | `appMemory` | milestone observations |
| `dayStartCount` / `lateAdditions` | `appMemory.patterns` | planned-vs-emergent insight |
| `recentCompletedTasks` (30-day rolling, v2.29.0) | `appMemory` | keyword themes in `_memoryForAI()`, Sunday/Monday prompts |
| `suggestionHistory` / `suggestionCooldowns` | `appMemory` | AI remembers what it suggested and what the user did |
| `today_daily_history` (30-day per-day snapshots) | localStorage | weekly stats, week grid, future WEEK companion |
| `user_names` | localStorage | meeting attribution — the only *declared* personal data |

---

## Gated candidates (not roadmap items)

- **Calendar busy/free day-shape** — the strongest fresh-input candidate for the nudge (`Backlog.md` §1). Gated on the Roadmap #1 verdict. Read-only, busy/free shape only, never an events panel.
- **Surfacing learned patterns** ("what TODAY has noticed" — peak hour, themes, best streak). Connections shows what TODAY *sees*; nothing shows what it *has learned*. Honest tension: done well it's a trust/delight surface; done carelessly it reads as surveillance. Gated on the #1 verdict **plus** a Wallpaper Test design — a static "your peak hour is 2pm" line becomes wallpaper in three readings. If built, it lives in About (the reflective surface), never as a nudge.

Sequencing rule inherited from `Backlog.md`: everything above waits for the Roadmap #1 verdict. Building more intelligence before the north-star surface itself has a verdict repeats the wallpaper mistake.
