# Personalization & Intelligence

> How TODAY personalizes, why it has no settings, and how both serve the north star. Companion to `Philosophy.md` (Wallpaper Test) and `ProductThinking.md` (walls).

---

## The chain

**North star names the arc. Intelligence makes it visible. Personalization keeps it fresh.**

- The north star (*a longitudinal companion*, `Backlog.md` ◎, updated Aug 2026) claims an **arc**, not a moment and not a feature set. TODAY accumulates real understanding of you — your relationship with your own commitments — so that over time you see yourself more clearly. The morning remains the signature beat, but it is now where the arc surfaces, not the whole of it.
- **What changed, and why it matters here.** The retired north star (*own the first 30 seconds of the day*) was satisfied by any sufficiently good morning line. The companion north star is not: a line that is fresh every day but never accumulates fails it. Freshness is necessary and no longer sufficient — a surface must also show that TODAY has been paying attention across days. This raises the bar on every AI surface and is the reason the three gates below exist.
- Intelligence is what makes the arc legible — and what makes each individual moment worth its seconds. Placement is already visible in the code: AI surfaces cluster at day boundaries — morning nudge, evening triage reflection, and Sunday reflection. The former Monday intention is paused until it has a distinct week-scale evidence contract (Backlog: New week re-entry gate). Inline post-add help is bounded to the task just created; the focus companion is bounded to session start. New intelligence surfaces should keep landing on day boundaries unless they have an equivalently bounded task/session moment to justify the exception; an AI surface that fires mid-day at random competes with focus instead of framing it.
- Personalization is what keeps intelligence off the Wallpaper Test's kill list. `Philosophy.md`: *variety of input matters more than the model* — an LLM prompted the same way over the same data becomes slower wallpaper. Personal data IS the input variety. When a surface goes stale, inspect the supported evidence and its relevance before another wording pass. Freshness means current evidence, not manufactured prose variation: an unchanged valid relationship may keep its wording. A stale surface alone does not authorize collecting more data, expanding Calendar input or restoring a withdrawn prompt.

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

If any gate fails, the surface abstains. It does not fall back to a generic summary. When a candidate passes, code selects its evidence **and its supported insight**: evidence proves the relationship; insight states the bounded human reading or lever. The LLM is a **writer, not the epistemologist**. It may add warmth, rhythm, dry wit, or a clarifying metaphor, but may not discover meaning from counts, add evidence, infer identity, or turn association into causation. The voice can be confident; the claim stays conservative.

There are three different depths of recognition, and one surface should not impersonate another. **Noticed** is a state delta shown once. The **observation pool** is a windowed relationship in recent commitment history, suitable for Sunday or a today-hooked morning. **Confirmed Memory** is a longer-lived semantic or procedural hypothesis that the person has ratified. Pool output may echo a supported relationship; it may not promote an unconfirmed inference into durable biography merely to sound deeper.

The Sunday reflection is the first full implementation. It draws on the 12c observation pool (`_buildObservationCandidates()` in `week-reflection-policy.js`), which ranks outcome kinds about the person's commitments. It once also ranked focus/completion, habit/completion, recurring-weekday, and burst-rhythm statistics; those were retired in v2.85.0 because their subject was completions per day, which the north star rules out. `_fetchWeekReflection()` receives only the winner — no lifetime biography and no bag of completed-task titles. A programmatic output guard rejects identity, causal, tenure, and overlong claims. `none` or no qualifying candidate hides the sentence and leaves the week grid alone.

**Research basis:** perceived rather than merely actual personalization drives message effects ([Li, 2016](https://scholarship.miami.edu/esploro/outputs/journalArticle/When-does-web-based-personalization-really-work/991031577120502976)); anthropomorphic style improves calibrated trust only when it communicates useful context ([Carter, Loft & Visser, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11457490/)); a new preprint found unsupported user-profile inference across every tested LLM, so model self-restraint is not an adequate evidence layer ([Sun, Zhang & Sheng, 2026](https://arxiv.org/abs/2608.04570)). See `research/Psychology.md` for the evidence boundary.

### Two gates that must be real, not editorial (2026-09-02)

The 12c pool shipped with three of its four gates implemented as code and the fourth as a hand-wave. The result was a line that passed everything and still missed:

- **Usefulness has to be a test, not a taste call.** "Which kinds of observation exist" is an editorial decision; *does knowing this change what the person does?* is a property of a specific candidate on a specific day, and nothing checked it. A pool that optimises for evidence + novelty produces statements that are true, new, and inert. **An observation earns its place only if seeing it could change a choice.**
- **Match the timescale to the moment.** A 30-day statistic on the daily beat reads as belonging to a different surface, and the register goes cold with it — an aggregate statement *about the person* is colder than a note about a task they are about to choose, whatever the wording. The day boundary rule above is not only about *when* a surface fires; it constrains *what span* it may speak about. **Mechanism:** per-surface eligibility (`_observationEligibleFor`) — the morning carries only kinds that can point at something on today's list; aggregates go to Sunday. Skipping this in 12c Phase 3 is what produced the first bad line.

**Corollary, learned the same day:** when a line lands badly, check placement and usefulness before touching the prompt. Rewriting the sentence cannot fix an observation that belongs on another surface or that leads nowhere.

**Resolved 2026-09-07 (v2.86.0): the usefulness gate is the person.** The second Phase 4 sample (a completions-per-day line on Sunday) passed evidence, novelty and single-reading and was, in Can's words, absolutely useless. Code can test the properties of the data; only the person can say whether a line meant anything. So the gate is a two-state reaction on every spoken line — *landed* / *not really* — stored on the line and read by `_observationGateExplain`: one miss extends a pool kind's cooldown (v2.97.3 adds seven days instead of doubling), two retire it. The reaction shapes which observations are chosen; it never reaches the model and never changes phrasing. Task-reading morning lines have no pool kind; v2.93.9 briefly paused that path after three misses, but v2.93.16 removed the pause. Up to three recent missed model lines now steer the next wording; the optional reason stays private. v2.93.23 restores adaptive Claude thinking only for daily nudges at Can’s request; real-use quality must still be re-observed. What code still does before speaking is the structural half: every surviving kind must point at a lever the person could pull, which the statistical kinds never did.

### Writing the instruction — rules earned the hard way (2026-09)

These come from the 12b failure and the production bugs that followed. They apply to any surface where a model is given evidence and asked to phrase it.

- **State the principle; never add worked examples.** Three examples of a good line, all sharing a shape, collapsed the nudge's output onto that single template — the Wallpaper Test failure mode authored directly into the prompt. The model does not need the form specified, only the goal.
- **Keep positive framing.** Replacing *"a friend noticing, not a coach"* with *"notice the pattern, don't diagnose the person"* removed the licence for acknowledgment lines that were landing well. A positive frame already forbids diagnosis; naming diagnosis invites thinking in those terms.
- **An insight catches a blind corner; a count restates what is already visible.** *"This one has a deadline you haven't clocked"* against *"this has been here 5 days"*. Only the first serves the north star. Age in particular is already printed by triage, so age-as-content fails novelty everywhere in the app.
- **The person is the subject, never a container.** *"Every focus session went to something you chose"* works; *"the list has been growing"* does not — nobody recognises themselves in a container's state. And name the actual list, or the observation is not sayable: TODAY has today's list, Soon, Past and Trello.
- **A stale premise cannot be fixed by wording.** Three production bugs in one week — a completed task reported as waiting 56 days, a let-go obligation reported as still pending, archived tasks offered as today's list — were all the model faithfully reporting what the context said. It never hallucinated. This class is invisible to prompt work, and better phrasing only produces a more convincing wrong sentence. When a line is wrong, check the evidence before the instruction.
- **A loose contrast still makes the model the epistemologist.** Evidence plus “what dominated / what did not” can be statistically valid and still leave the model to invent why it matters. Pool candidates therefore carry a code-owned `insight` alongside `evidence`. Output validation is candidate-aware: avoiding forbidden words is insufficient if the line drops the selected relationship.

### Where the existing symbiosis can compound next

These are leverage points, not permission to add more surfaces:

- **Expand only from earned intervention evidence.** v2.72.0 closes the first loop on the existing post-add suggestion row: offered reason → applied/dismissed/full-exposure ignore → generated-step completion or conservative reversal. v2.72.1 makes the evidence honest on long lists by counting an offer only when the unchanged task actually reaches the viewport and the suggestion is freshly delivered. A weak reason is reduced, not globally silenced; a reason earns preference from completed work, not persuasive copy. Before extending this machinery to another AI action, require an equally observable downstream outcome and reuse an existing surface.
- **Give memory provenance.** Confirmable inferences should eventually carry a short evidence window (“6 of 8 recorded Tuesdays”) and freshness/confidence metadata. This makes correction meaningful and prevents a once-true pattern from becoming permanent biography.
- **Prefer lifecycle evidence over noun themes.** Revive, Soon-return, age, focus-session, and let-go-reason data express choices the user actually made. They are stronger personalization material than semantic coincidence between task titles.
- **Share candidates across surfaces — pool shipped v2.80.0, two consumers now.** `_buildObservationCandidates()` / `_observationNoveltyGate()` in `assets/week-reflection-policy.js` serve the morning nudge and Sunday reflection with surface-specific eligibility, cooldowns, and material-change reopening (`architecture/AI.md` → Observation Pool). Noticed, Monday, and focus are not pool consumers; extending the pool to them waits on the Phase 4 real-use verdict (`Backlog.md` → 12c). Monday's task-list intention was paused in v2.92.13 after it repeated the morning line; a new prompt alone cannot establish a different week-scale subject. The history matters: 12b (v2.78.x) built the inverse — a raw `appMemory` dump with the model choosing what mattered — and four prompt revisions could not repair it.
- **Measure interventions, not just behavior.** If TODAY says focus appears to be a lever, later reflection should check whether using focus changed the following period. A recommendation that cannot be evaluated should not harden into memory.
- **Model expiry and contradiction.** Recent episodic evidence may challenge a durable pattern without overwriting it immediately. Confirmed memory needs decay/revalidation rules before more signals are added.

---

## Habit Moments — Concept Under Review (2026-10-16; second isolated prototype)

Backlog: `Backlog.md` → 14. **Latest review supersedes the field-based journey below:** Can does not want a separate Moment section and finds the prototype visually worse than existing Habits. The field/second-line UI and rebuilt-panel sketch are withdrawn from the active recommendation, not ready for polishing or implementation. The underlying habit/context idea remains unresolved. Can also raises a broader panel-design concern including Memory; this is not a request to redesign Memory here. Use Claude alongside Codex for substantive design critique, with actual components/guidelines supplied. The earlier journey below is retained as review context, not an active build plan. Examples are hypothetical, not private-day observations, AI outputs or production prompt examples.

**Later explicit request:** Can asked to build a revised prototype after Claude's review. `output/habit-context/` is the second isolated study, not a revival of `output/habit-moments/`. Existing panel composition stays the baseline. Opening a habit in desktop focus does not force a question; selecting the companion explores a possible routine cue, with no answer field or stored intention. Focus remains desktop-only; touch retains tracking and the morning comparison. Separate fixed morning examples test a preparation relationship versus an ordinary reading. There is no live AI, selection, task/vote/cache/Dropbox write or routine detection. This can test the usefulness of a question, not claim that TODAY now knows when a habit belongs. No Moment section, compulsory names, new capture step or production wiring is approved.

**Subsequent approval — desktop slice only (Can, October 16):** the accepted prototype led to approval to implement an explicitly requested habit-focus question. v2.97.0 is committed: only the selected habit name reaches its separate prompt; no history/Memory/clock/Calendar expansion, new saved cue/answer, automatic question or required routine-planning template. Accepted wording uses the existing private spoken-question history. See `architecture/AI.md` and `architecture/Focus.md` for request fencing and syntactic validation. Three authorized fictional-name probes on October 17 produced mixed wording results; the latest Read refinement remains unsampled. Release was approved and committed; installed-PWA confirmation and real-use usefulness remain open (Backlog → October 31 review). Can also likes the morning relationship and agrees it needs careful nudge work; that is a separate follow-up, not a daily writer/pool change in this slice.

**Job:** help a chosen habit fit into an existing part of life, then occasionally recognise something that could make that fit easier. Two separately judged promises: less repeated remembering/deciding, and useful recognition within the existing daily nudge. A passive field alone fulfils only the first. Not a notification channel, scheduling system or demand to improve completion rates.

**What TODAY has already taught us:** Can reads the daily nudge; habit counts have not explained anything useful; literal callbacks can feel empty while a supported relationship between commitments can help. Current `_memoryForAI` habit context is names, weekly counts and yesterday's status, not intended circumstances. Latest per-habit/day check/uncheck timestamps serve sync; they do not establish action time or cue occurrence. More history cannot reconstruct a chosen intention reliably. Keep existing input unchanged until a new contract is reviewed.

### 1. Withdrawn UI candidate — optional Moment detail

The earlier proposal added optional **Moment** in edit and a quiet second line. This has not earned its place and is no longer the recommended interaction. Do not replace it with a renamed field, forced habit-name syntax or automatic renaming. Can's original examples describe a desired real-life association, not a requirement for metadata or new UI. Keep existing habit capture/edit and its AI exposure unchanged.

### 2. Live the day normally

The real-world routine supplies the cue. No post-completion habit offer, timer-end suggestion, unrelated focus interruption or automatic check-off. An open app, Calendar interval, logged task or sync catch-up is not proof of an external event or available attention. Preserve current check/uncheck, manual order, focus/history, forgiving strength, archive/undo, evening attention, 3am grace and normal sync. No cue-specific failure/late state or extra penalty on no-call days; current daily tracking remains unchanged.

### 3. Let an intention make an existing daily reading more useful

Ask whether today's commitments support or obstruct the person's chosen arrangement, not which habit is unchecked. **Hypothetical:** the person chooses charging the phone outside the bedroom and adds a task to put a spare charger in the hallway. A supported preparation relationship could give that task significance beyond moving an object. It is a selection hypothesis, not an established dependency, validated output or reason to import raw history. A saved walk cue plus a calendar entry alone earns no availability or attendance claim.

Require a bounded evidence/selection/privacy contract before AI wiring; no keyword-only dependency guess or raw-memory dump. Any qualified relationship competes with the ordinary daily reading, reuses its feedback and withholds when obvious, unsupported or repetitive. Do not silence the ordinary path or expand pool/Sunday/focus/Calendar title access. Retired habit/productivity correlations remain retired.

### 4. Revision principle, not approval for a field

Any future change must preserve habit identity/history. An unchecked date does not reveal a failed cue, an unlogged action or a different choice. No automatic routine diagnosis, miss-reason questionnaire, recurring review prompt or weekly performance grade. A future interaction must earn its own place; a moment field is not selected.

**Superseded scenario pass (2026-10-15):** the agent withdrew the linked-call completion reminder after Can was not sold on the interaction/noticing. Literal recall did not establish enough value; the old “strongest timely candidate” designation is not an active recommendation. Do not add task linking or extra history just to revive that offer.

**Design review finding:** the withdrawn sketch used token values but changed component composition: permanent row dividers instead of quiet hover-only row borders; a larger layout column instead of compact checkboxes with enlarged hit areas; compressed history marks instead of 21 desktop / 7 mobile circular dots; strength below history instead of its own aligned column; stacked labelled fields instead of compact inline edit/archive. Preserve the current component's visual relationships, not just its palette. `output/habit-moments/` is a rejected isolated study, not a replacement component or proof of AI usefulness.

**Release/next gate (October 17):** Can approved pushing the desktop slice to dev and master. Confirm v2.97.0 deployment, then judge real usefulness; W3 target October 31. Exact fictional results are in `output/habit-context/quality-check-2026-10-17.md`; the final Read refinement is unsampled, not proven better by the earlier calls. The optional question and meaningful morning recognition remain separate hypotheses. No forced appearance, new interruption or repeated cue template. The morning candidate still needs bounded evidence/privacy/selection review before live nudge wiring. Claude's earlier critique/authorship is not a final sign-off; that request hit its usage limit. The trial judges usefulness, not automaticity; no exposure means no verdict.

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
| `dragKeywords` (rolling 100-word list) | `appMemory.preferences` | words extracted from tasks let go via triage (`_memoryOnTaskLetgo`, v2.52.0). Shown in memory panel when 10+ entries and a word appears 2+ times. Excluded from task Focus Ask in v2.97.10: deferred words cannot establish avoidance or an actionable blocker. |
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

Evening reflections (ten offered categorical feelings after triage; older “off” records stay valid) are a **separate sensitive record** from the main `appMemory` object. They live in four dedicated localStorage keys (`today_reflection_policy`, `today_reflections`, `today_reflections_cleared_at`, `today_reflection_intro_seen_at`) with policy, records and the deletion watermark backed up in Dropbox; the intro cooldown stays local.

Design decisions:

- **Opt-in with visible payoff**: a one-time consent prompt after the user's first eligible triage; nothing is collected before "Remember" is tapped.
- **No general AI inclusion**: `_memoryForAI()` does NOT include reflection history, and no reflection data reaches other AI surfaces. HOW DAYS FELT may temporarily join reflection dates to date-only task outcomes on-device; the AI receives only one selected aggregate relationship, never dates, task text, identifiers, the full feeling distribution, or alternate candidates.
- **Selected-population wording required**: any surface that analyses reflection data must say "On evenings you reflected…" — the sample is never claimed to be representative of all evenings.
- **A relationship, or silence**: a feeling frequency is a record, not self-understanding. Code first requires two sufficiently observed ways of handling commitments (obligation-framed versus chosen completions, letting go versus finishing without release, recorded task focus, or bringing a task back from Past) and a material difference between them. The model phrases only that selected evidence. If no relationship qualifies—or the reply is incomplete, causal, or ungrounded—HOW DAYS FELT hides for opted-in users; it shows no count or technical subtitle (v2.95.1). A current sentence can use up to 40 words to explain both recognizable actions without claiming causes or manufacturing a takeaway.
- **Evidence freshness (v2.95.1)**: transient results are bound to consent, the deletion watermark, the current local date window, eligible reflected evenings and their outcome evidence. Local changes, sync and rollover invalidate old wording; late replies are fenced even after deletion and re-consent. Unchanged evidence may retain the same valid sentence. This is freshness of evidence, not manufactured prose variation; real-use usefulness still needs Can's verdict.
- **Whole-history deletion**: clearing also sends an immediate silent Dropbox backup so the deletion propagates to all devices without waiting for the next scheduled sync.
- **Deliberate exclusion from `#memoryPanel` main blocks**: the reflection block is appended _after_ the main `typeBlock` sections by a separate `_reflectionRenderMemory(el)` call, so it can never be accidentally included in a memory-reset flow that doesn't also call `_reflectionClearFromAllMemory`.

---

## Resolved candidates (how the gates played out, 2026-07)

Both original gated candidates resolved with the Roadmap #1 verdict (2026-07-18: nudge kept, read every time):

- **Surfacing learned patterns** → **shipped v2.35.0 as the Noticed block** (About). The surveillance tension was answered by design, not softened wording: **delta-gating** — each line appears once when something *changes* (milestone crossed, peak hour moved, theme emerged), then never again; empty means hidden. A fact restated is surveillance; a change noticed once is attention. That principle — *state deltas, never facts* — is the reusable lesson for any future "what TODAY knows" surface. W3 verdict season passed (Aug 2026) — Noticed remains in watch list pending Can's read.
- **Calendar busy/free day-shape** — **untriggered.** It was the escape hatch for a stale nudge; the verdict found the nudge isn't stale. Stays in `Backlog.md`'s Not-implementing table as a conditional; revisit only if a future W-check finds the nudge going flat.

The W3 verdict season (poem coda, brief, Today block, Noticed — all due Jul 28–Aug 2 2026) has passed. Verdicts outstanding: **Noticed 7-signal** still open in `Rules.md` watch list. Focus companion and Monday intention had their W-check in Aug 2026 — improvements shipped (v2.65.0, v2.65.1), but Monday's later real-use repetition failed the Wallpaper Test and paused it in v2.92.13. The sequencing gate principle stands: hear how a surface is landing before building the next one.

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

Storage keeps these types; display does not mirror them. Memory shows semantic and procedural together under **PATTERNS**, episodic under **LATELY**, meta under **WHAT TODAY HAS SEEN** (v2.95.5 — see `design/Components.md` → Memory Panel — PATTERNS).

Conflating types produces systems too cautious about small things or overconfident about important ones. Meta memory is underrated — saying "I don't have enough data on X yet" is a feature, not a failure.

### Three temporal scales, different inertia
- **This week** — high plasticity, updates fast. Episodic state.
- **This month** — medium inertia, rolling average. Procedural patterns.
- **Stable identity** — very slow, resists transient noise. Semantic traits.

If a week looks wildly different from the medium window, surface that as a signal rather than immediately updating the long-window model. Don't let a burned-out week erase 6 months of healthy patterns (catastrophic forgetting).

### Trust architecture: AI proposes, user confirms
Fully automatic inference erodes trust when it's wrong — users have no mental model for why and no path to contest. The pattern that works: **AI generates candidate inferences from behavioral data → surfaces them visibly as hypotheses → user ratifies or rejects.** This converts implicit signal to explicit, authoritative memory without bypassing the user's agency. **As built (v2.91.0+):** stable inferences confirm *automatically* once supported in three distinct calendar weeks (`HYPO_CONFIRM_WEEKS`), fade after 28 days without support, and the person's lever is **not me** (remove + tombstone + prompt exclusion) — rejection, not ratification. Explicit ratification remains an open option. Connects directly to the *Noticed* block pattern: delta-gated, once on change, user can always inspect.

### Personalization backfire effect
When users feel surveilled rather than served, personalization *reduces* engagement — measurably, in controlled research. The shift from "helpful" to "creepy" is not predictable from outside; opt-in with visible payoff is safer than opt-out with invisible benefit. Show the user what the system knows and what it did with that knowledge.
