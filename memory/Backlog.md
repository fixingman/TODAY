# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## Claude session conventions

| Context | Use |
|---------|-----|
| Searching Coda | `/browse` skill — not raw WebFetch or grep |
| Poem display in chat | Real line breaks, one per line, in a blockquote. Never `/` as an inline separator. |

**Poem curation search process:** Broaden discovery before narrowing candidates — national libraries, university digital collections, regional/bilingual anthologies, oral-literature archives, historical journals, author/translator archives. Generic poetry sites only as leads or cross-checks; Gutenberg, Wikisource, and Internet Archive for exact text and PD verification. WebSearch to identify a specific poem or collection → targeted fetch of the relevant page only; no bulk-fetching. Work inline in the main conversation, not via agents.

---

## ◎ North star (updated Aug 2026)

**TODAY is a longitudinal companion.** It accumulates real understanding of you — not your productivity stats, but your relationship with your own commitments. Over time it helps you see yourself more clearly, so you can make different choices.

The experience is calm. Opening TODAY in the morning shows an imprint of your life — choices you've made, not obligations staring back. No pressure, no shame, no guilt. A companion that speaks when it matters, holds space when it doesn't, and catches the blind corners you can't see yourself.

**The morning is TODAY's signature beat** — nudge (verdict 2026-07-18: kept, read every time), poem (#2), briefing (#7); everything else supports or follows. How intelligence and personalization serve this → `design/Personalization.md`.

---

## ▸ Roadmap

Ordered by potential impact on TODAY's longitudinal-companion promise and daily experience, not by build readiness or effort. Gated items remain gated. Reviewed 2026-10-10.

| # | Item | Status | Next gate / action |
|---|------|--------|--------------------|
| 12c | **Companion — observation pool** | Phases 0–3 shipped; **Phase 4 iterate / re-observe** | Privately diagnose misses; October 15 verdict. Distinguish pool quality from ordinary morning quality and delivery. |
| 13 | **DreamBank** | M1 live; phone-verified October 5 | Two-week usefulness verdict before M2. Can's listening test stands in for scripted evals, which were not run. |
| — | **WEEK companion** | Gated | 12c must genuinely feel like a companion, not a feature. |
| — | **New week — distinct Monday recognition** | Gated | Week-scale evidence, a different job from Today, earned silence; real-use verdict after 12c. |
| 2 | **Poem corpus** | In progress — 134 poems | Expand geography and voice; check curation ledger before proposing candidates. |
| 10a | **Granola — meeting import** | Not started — priority path | Reviewed action chips; build before native calendar-led capture. |
| 10b | **Google Calendar — meeting context** | v2.94.0 live on dev + production; Cloud configured | Real consent, refresh, Forget and read-only verification on desktop/phone before designing Join / Record. |
| 11 | **Task agent — enrichment** | Stages 1–3 shipped; relevance under observation | Judge useful context, wrong cards and useful cards withheld; Contacts / AI calendar tools deferred. |
| 9 | **Google Drive sync** | Parked — product decisions recorded | Revalidate architecture and auth before implementation; preserve Dropbox behavior. |

---

## Item details

### 12c · Observation Pool — Phase 4 iterate / re-observe

**Architecture:** one ranked candidate pool, two surfaces. Code owns evidence, conservative insight and eligibility; the model phrases the reading. Morning accepts only kinds with a hook in today's list; Sunday can carry every outcome kind. Evidence, novelty, single-reading and the person's usefulness reaction govern delivery. Cooldowns and material-change reopening are cross-surface. Current contracts: `architecture/AI.md`, `design/Personalization.md`, `research/ObservationSelection.md`; pure policy: `assets/week-reflection-policy.js`.

**Verdict (Can, 2026-09-30): iterate, not kept or removed.** Sampled pool lines have not landed; ordinary task-reading morning lines have often helped. Do not discard the companion bet, declare it kept, or rewrite policy from a tiny sample. WEEK and New week remain gated.

**Next decision — 2026-10-15:** re-observe the October 4 and 11 Sundays and morning pool. Privately review missed lines with Can, distinguishing untrue, already obvious, unable to help a choice, and wrong moment. If the pool stays quiet, inspect data, thresholds and delivery before prompts: Sunday silence is allowed, but must be earned. Revisit candidate kinds/usefulness structurally, not with a local wording fix.

**Privacy:** exact lines, dates, task text, votes and optional miss reasons stay in private synced `appMemory.spokenLines` / Dropbox. The vote saves before its skippable reason. Reasons never enter model prompts or this backlog; record only product lessons here. A two-state vote does not establish why a line missed, and a few reasons do not authorize automatic policy changes or analytics.

#### Ordinary morning nudge — separate quality and delivery checks

- **Current behavior (v2.93.16):** the three-miss pause was removed. Misses steer the next ordinary task-reading line, never silence the morning; a rejected bare recap falls back to the rule-based strip. Qualified pool observations retain their own gates.
- **Quality (v2.93.23):** both daily tracks use adaptive thinking with a bounded 2048-token ceiling. Other surfaces, prompts and selection are unchanged. Earlier perceptive lines followed by increasingly obvious recaps are a real-use signal; thinking being disabled is not a proven cause.
- **Delivery (v2.93.22–23, BUG-118):** content-free device-local audits distinguish failed requests from prose rejection. Bounded retries before noon can recover missing AI text into About after a fallback dismissal; real AI dismissals remain final. No timer replaces the visible strip mid-read. Local two-device coverage is not live verification of every historical failure.
- **Latest signal (Can, 2026-10-10):** a new ordinary nudge worked and felt perceptive, but leading with how long a task had waited emphasized delay. Task age may inform selection without becoming the headline; a useful opportunity can be the subject instead. This is one positive ordinary-path signal, not a pool verdict or a mandate for another quick prompt change. Re-observe quality and latency independently.

#### Settled lessons and candidate policy

Earlier samples exposed structural defects, now resolved: per-surface eligibility, live id→task text grounding, retirement of productivity-stat kinds, and a code-owned `insight` separate from `evidence` (v2.90.36). Candidate-aware guards must retain the selected relationship and literal app actions; fluent generic copy is not enough.

Three recognition depths remain distinct: **Noticed** speaks on a state change; **morning/Sunday pool** reads evidence-backed commitment relationships; **confirmed Memory** may hold longer-lived understanding after the person ratifies it. Sunday cannot turn an unconfirmed hypothesis into biography.

| Score | Kind | Signal |
|---|---|---|
| 115 | `focus-vs-obligation` | Where focus went, and where it did not |
| 105 | `obligation-completion` | Completion on obligation-framed vs chosen commitments |
| 95 | `letgo-reason` | What letting go is doing, grounded by the dominant stated reason and its contrast |
| 92 | `return-finished` | What comes back and gets done; withholds `letgo-return` when both fire |
| 88 | `soon-pullback` | What is deferred tends to come back |
| 85 | `letgo-return` | Linked release-to-return events, by id within 45 days |

**Do not restore:** `list-growth`, `cognitive-weight` (container subject), or `focus-leverage`, `habit-alignment`, `recurring-day`, `bursts` (productivity stats). The person is the subject; name the actual list or the observation is not sayable.

**Unknowns stay unknown:** reconstructed focus sessions must not become observed zeroes; missing obligation framing must not become chosen. Preserve `backfilled: true`, `obligation: null`, and explicit boolean partitions.

**Verification:** observation-pool, insights, Dropbox and nudge suites must assert silence as well as firing. Capture the real request payload before theorizing about output; use a fresh isolated browser/port rather than a reused cached origin.

### 13 · DreamBank

**Bet (Can, 2026-09-29):** dreams are a keyhole to the felt side of commitment decisions. First usefulness verdict at two weeks, not six; M2 is not an automatic next build.

**Locked M1 decisions:** design + eng review D1–D11 and adjacent test plan: `~/.gstack/projects/fixingman-TODAY/can-dev-design-20260929-185035.md`. Raw retelling and reading live in Can's Dropbox dream Markdown files; TODAY keeps a synced `appMemory.dreams.index` (images, role, people — no retellings). Dreams are dated by the day told. Night dating, *add a thought* and *change night* controls were removed; old notes remain read-only.

**Evidence:** the first live reading prompted useful reflection; its saved Dropbox file and cross-device index were confirmed. On-demand retrieval into Memory (v2.93.10) holds the body only while Memory is open; BUG-112 was verified by Can on October 5. This closes the retrieval gate, not the quality verdict. No private dream file becomes a repo fixture.

**Next:** real-use usefulness verdict and whether the minimal Memory → Dreams entry earns its place (Wallpaper due October 18). Scripted evals were not run; Can's listening test stands in. M1 → M2 lexicon → M3 callbacks / Sunday / task links only after the preceding gate.

**Deferred — multi-dream capture (D1):** one capture = one dream in M1. Separate into `dreams[]`, chunk stitching and stacked cards only when Can tells distinct dreams together and wants them apart. Per-dream ids avoid migration; start with the owning meeting/extraction modules, not a general capture rewrite.

### WEEK — Companion Surface *(gated)*

Not a planning tool: TODAY is the daily moment; WEEK is accumulated relational awareness. Gate: 12c genuinely feels like a companion, not a feature. `today_daily_history` supplies signal; three months of data is useful context, not an unlock date.

### New week — Distinct Monday Recognition *(gated)*

The old Monday intention/badge was removed after it repeated Today's task-age and peak-hour reading. The week grid stays; a different prompt or synonym filter would not fix the duplicated job.

A return requires:

1. Code-selected relationship or lifecycle change across days, not task age, streak, count or peak hour.
2. A choice the person could see differently this week, not an instruction about what to finish today.
3. Novelty against Sunday and Today, including cross-surface spoken history.
4. Honest abstention when nothing qualifies — silence is better.
5. A real-use verdict after 12c Phase 4.

Do not turn this into another planner or a preview of WEEK. Keep existing Monday cache/sync fields for mixed-version compatibility until the design is decided.

### 2 · Poem Corpus — Iterate

**Brief:** human-written, spare, concrete, clear and held/affirming; no ornate, preachy or bleak-unresolved selections. New candidates: 2–6 displayed lines; previously approved longer poems are grandfathered, not a new length precedent. Test beside an undone task list and against the existing Bashō / Marcus Aurelius tone.

**Licensing:** worldwide public domain at both author and translator level (current cutoff: died before 1956), or verified author CC0 / explicit public-domain dedication. Never substitute an AI rewrite for an acceptable translation. Preserve the five approved US-only exceptions; do not extend that route.

**Next search:** geography and voice, especially Africa, Latin America, Middle East and Southeast Asia; ordinary lived detail and the choosing / keeping / loosening / returning of commitments. Diversity is a tie-breaker, not a quota. The shuffle fix is shipped, not the expansion lever.

**Corpus at last curation count (2026-10-10):** 134 = winter 16 + spring 18 + summer 14 + autumn 12 + year-round 74. Target 16 per season: autumn +4, summer +2; winter has reached it and spring is above it.

**Read before proposing:** `archive/Backlog-archive.md` → Poem curation ledger. It preserves approved exceptions, translation decisions, permanent cuts, rejected candidates and open leads. Source/archive discovery conventions above still apply.

### 10a · Granola — Meeting Import

**Not started; priority path:** manual import of structured notes/action items through Granola MCP credentials in Connections → Netlify `list_meetings` / `get_meetings` → extraction → reviewed task chips.

Build before investing in native calendar-led capture; this integration is independent of TODAY's Calendar connection. Gate: are the chips what the person would have written down themselves? Revalidate API/auth before implementing the draft.

### 10b · Google Calendar — Meeting Context

**Status (2026-10-10):** v2.94.0 deployed to dev and production. Calendar API and `calendar.events.readonly` were enabled/saved in the existing Google project and verified; deployed public client matches Gmail. Existing Gmail grants, credentials, audience and publishing settings were unchanged. Full local gate: 43 checks, no failures/flakes; dev CI and deployment contracts passed. Desktop connected state and a fresh bounded timing read were observed. **Consent-screen scope, refresh, Retry, Forget and phone flows remain unverified.**

**Shipped foundation:** separate Connections row and Calendar consent, device-local tokens, lazy bounded read of today's primary calendar. Only timed, non-cancelled, non-declined, non-transparent regular events survive. Transient context holds start/end and a safe video join URL, not titles, descriptions or participant names; no event data enters AI, appMemory, localStorage or Dropbox. Hidden/offline/stale/day-old context is withheld; Forget fences late responses. Separate Gmail/Calendar rows remain as Can requested.

**Next gate:** verify read-only consent, refresh, Retry and Forget on desktop; repeat Connect and those checks on phone. Then design the **proposed, unbuilt** meeting-start Join / Record offer, resolve no-link/overlap/PiP behavior and run Wallpaper gates. A timed event is not proof of a meeting; no automatic recording or proactive pill is shipped.

**Day-shape AI experiment — initial probe (2026-10-10; completed, pickup gate not passed):** 6 isolated calls through the existing daily-nudge AI route: 2 repetitions each of the same ordinary task/memory context alone, with a fresh locally reduced Calendar timing summary, and with a clearly labelled hypothetical fragmented day. Successful responses took 1.3–4.9 seconds; the watched live-nudge keys stayed unchanged. Initial harness/security-policy failures were resolved without weakening CSP or changing app/provider settings. No event names, participants, descriptions or join links reached the model; no task, vote, cache or Calendar-history writes were made.

**Initial reading:** no observable added usefulness from timing context in this small comparison. The actual-day input supplied no positive timing evidence, so abstaining from availability claims was appropriate; the hypothetical fragmented-day outputs also showed no useful task/timing relationship. Delay emphasis and assumed avoidance appeared across variants, not just Calendar-enriched ones: an ordinary-path quality concern, not proof of a Calendar regression. These were isolated current-context generations, not delivered morning lines or usefulness votes.

**Controlled synthetic follow-up (2026-10-10; timing pickup demonstrated, evidence/quality gate failed):** 6 more isolated calls, 2 repetitions each: no Calendar, fragmented time before an explicit task deadline, and a longer unscheduled interval before that deadline. Identical invented tasks included an explicit uninterrupted-time requirement; no personal history was supplied. Used the existing ordinary prompt plus a shared prototype Calendar evidence instruction. Responses took 1.2–3.1 seconds and changed with the timing input, but some moved work beyond its explicit deadline, invented block lengths, treated unscheduled intervals as available, or added pressure. The Calendar instruction alone did not enforce its evidence boundary. Watched nudge/memory keys stayed unchanged; no actual Calendar read or task/vote/cache writes occurred.

**Protection prototype (v2.94.2; local, not wired):** `scripts/lib/calendar-nudge-policy.cjs` now computes a conservative recorded timing clash only for a narrow, explicitly stated duration/deadline; empty/open/unknown input cannot generate availability advice. Complete/fresh/visible/online primary-calendar evidence, normalized/merged intervals, deadline/DST checks and delivery-time revalidation are required. AI can choose only a bounded reading or abstain; code renders the facts, rejecting free prose and extra fields. This trades unrestricted Calendar prose for a provable small boundary without changing ordinary AI nudges. The 14-group offline suite includes the earlier unsafe synthetic outputs and an independent 100-schedule oracle; two isolated configured-AI decisions succeeded with the deadline intact (2.2s / 3.3s), and watched nudge/memory keys stayed unchanged. No live integration, Calendar reads/history writes or provider/routing changes occurred.

**Protected quality comparison (2026-10-10; not ready for runtime):** 10 isolated configured-AI calls on fictional October 13 inputs: 6 ordinary-prompt baselines and 4 protected decisions, covering two declared timing clashes twice plus a natural-language equivalent and an untimed task once. All requests succeeded (0.76–3.03s); all four protected decisions preserved the declared facts and exposed a task/recorded-timing relationship absent from the baseline. They also selected the same code-owned template every time: structural novelty is demonstrated, but recurring voice fails the design review and personal usefulness is not established. An offline 12-phrase coverage check recognized only the 2 specially formatted declarations, missing all 6 clear natural variants; 4 unknown/ambiguous/conditional cases withheld appropriately. These are diagnostic fixtures, not accuracy estimates. Unsupported wording retained the ordinary path; no extra Calendar decision was requested. Some fictional baselines were directive or assumed competing tasks would consume the morning; that is not evidence of a regression in personal, memory-rich daily nudges. The 14 protection groups/100-schedule oracle passed again. Watched task/nudge/memory/Calendar keys stayed unchanged; no actual Calendar read, private history, vote, live cache write or runtime wiring occurred. Console submission-format errors were harness failures before requests, not app/provider failures.

**Prototype revision (v2.94.3; local, not wired):** affirmative natural declarations now support varied punctuation/order and explicit continuous / without-interruptions / one-stretch wording. Captured label/duration/deadline spans retain exact source provenance on-device; ambiguity, estimates, conditional/reported requirements, extra tasks/clocks/durations and missing requirements still withhold. Correction to the earlier coverage description: *quiet minutes* alone does not establish uninterrupted time, so that fixture remains withheld rather than being counted as a clear continuous-time requirement. The warning-like renderer now centres continuity or leaves commitment fit open, retaining code-owned facts and the strict AI choice contract. A pure optional last-3-readings input withholds a previously acknowledged task/duration/deadline relationship instead of disguising it with another sentence; it has no live history hookup, storage or sync. The 18-group suite adds natural declarations/provenance, ambiguity/adversarial cases, novelty and both bounded stances, retaining the 100-schedule oracle. Six isolated configured-AI calls on fictional natural task wording (2 ordinary baselines, 4 protected decisions) succeeded in 0.76–3.13s. All protected decisions chose continuity acknowledgment, preserved facts and stayed below 30 words; supplied repeat evidence, empty/open timing, quiet-only wording and missing duration withheld with no further AI request. Watched live keys stayed unchanged. The reading is calmer in design review, but still a bounded family with no demonstrated voice variety or personal usefulness; these are not real morning verdicts.

**Isolated voice comparison (2026-10-11; quality gate not passed):** 12 successful configured-AI calls (0.9–3.0s), comparing a free whole-line writer with a code-owned factual anchor plus AI reflection: 3 fictional explicit timing clashes, 2 repetitions per mode. The existing bounded renderer was the deterministic control; no additional control AI calls. All 6 whole-line outputs retained duration/deadline and described recorded timing without scheduling or pressure, but converged on a factual clash followed by a disclaimer. All 6 reflections also converged on uncertainty/disclaimer language; one was repeated verbatim, one made an unsupported categorical claim about commitments outside Calendar, and one produced a 30-word combined line despite the below-30 limit. The experiment's verb-label anchor also had awkward grammar; that is harness presentation debt, not a model regression. Neither mode demonstrated a fresh, choice-relevant companion reading. Manual review of this small fictional sample is not a semantic safety guarantee or a real usefulness verdict. No abstentions, request failures, actual Calendar reads, private memory inputs or task/vote/cache writes; watched live keys stayed unchanged. The unchanged 18-group protection suite and 100-schedule oracle passed. Native submission trouble on October 10 happened before requests; the comparison completed October 11 after restaging, not by rerunning a completed batch.

**Next:** keep Calendar out of live AI prompts. Review the voice findings with Can before another iteration: adding free prose to locked facts did not solve Wallpaper, and relaxing fact ownership is not justified. A next isolated test should distinguish a grounded commitment-fit perspective from a mandatory factual recap/disclaimer; uncertainty remains an evidence limit, not filler or a claim about unseen commitments. Define the real observation/novelty window before any future history hookup, and validate relevant real-day usefulness before approving runtime wiring. No task-syntax requirement, duration/deadline settings, inferred missing duration, relaxed timing boundary, Sunday-pool changes or private task/output examples. October 13 remains a proposed real-use day, not a waiting requirement.

**Boundaries:** calendar is INPUT, never OUTPUT — no agenda, event list or “next up.” Phone-call audio is unavailable on iOS; mobile capture is in-room/speakerphone only. Headphone mic + tab-audio capture is an after-MVP question. Auto-recording is a posture decision about others in the room, not a technical default.

**Auth:** PKCE and independent Calendar tokens; `calendar-token` keeps the secret server-side. A complete Calendar client pair can be used, otherwise the existing Gmail pair, without changing Gmail scopes/tokens. No ICS proxy. If the Google app remains in Testing mode, account for its seven-day refresh-token limit; expired sign-in must be visible.

**Later:** Gemini / Whisper / Deepgram transcription bake-off after real recordings exist (names, cost, latency). Extraction quality gate: reviewed chips should be what the person would write themselves.

### 11 · Task Agent — Enrichment at Add-Time

**Shipped:** task-triggered web/Trello context plus Gmail enrichment in focus; bounded on-device MiniSearch ranking and Calendar-generated email exclusion (v2.93.20–21). Fresh context signals arrival once; cached context should stay quiet. Current runtime contracts live in `architecture/AI.md` and relevance research in `research/Integrations.md`, not old model/turn-limit snapshots.

**Next:** observe booking-context relevance through October 20 — wrong cards and useful cards withheld by lexical matching both matter. A task-grounded email is necessary, not proof it helps.

**Deferred:** `search_contacts` and `read_calendar`. Calendar timing now exists, but is deliberately not AI input; using it for enrichment needs an explicit privacy/scope/design decision. No inferred preferred provider or semantic mailbox model without evidence.

**Out:** autonomous execution without review, importing others' email as tasks, always-on background agents. External context enriches a task; the companion arc builds internal understanding of the person. Do not conflate them.

### 9 · Google Drive Sync *(parked)*

**Product decisions:** one active sync provider; Dropbox users see no change/prompt. Full API, `drive.appdata` hidden folder, single `today-backup.json`; manual export/re-import when switching, no automatic cross-provider migration. Motivation: a second device on Drive and broader Google-account reach.

**Before building:** revalidate auth, provider lifecycle and Connections design against current module contracts. `assets/sync-merge.js` already holds some pure merge primitives; the full Dropbox merge controller still lives in `dropbox.js`. Shared controller/parity work is not done. Plan a narrowly scoped, behavior-preserving extraction/adaptation with full tests and real-device sync verification; do not add compatibility globals or duplicate merge logic from the old draft.

**Parity gate:** OAuth/refresh/expired state; debounced autosave on every mutation; wake sync; complete merge/deletion semantics; Save / Restore / Forget and provider switching; cache registration and token cleanup. Never rewrite working Dropbox sync as a side effect.

**Historical draft:** `archive/Backlog-archive.md` → Google Drive draft. Its exact globals, startup wiring and extraction instructions predate the current module boundary and are not implementation authority. OneDrive/iCloud and simultaneous Dropbox + Drive remain out.

---

## Watching / parked investigations

| Item | Revisit trigger / boundary |
|------|----------------------------|
| Memory panel — AI hypotheses | Can rarely visits and finds most guesses uninteresting. Inspect semantic/episodic/procedural confirmation statuses before adding generation or sources; separate this from the plain KNOWN record verdict. |
| AI/data outcome loop | `suggestionOutcomes` is bounded to 100 resolved offers. Extend only if underperformance appears and the action mix actually changed; no automatic analytics. |
| Merge-anomaly observability | Console-only breadcrumb, no persisted counter. Revisit only when anomalies appear during debugging. |
| Shared ai-assist helper | Deferred D5 extraction; M1 is now live, not a future prerequisite. Preserve valid-JSON vs `{content}` parsing and per-surface behavior/privacy. If undertaken, migrate one surface at a time under the full gate; no broad nudge rewrite. |
| Chrome Built-in AI | Parked, not an adoption decision. Verify current official API/support, device cost and privacy before evaluating on-device classification with existing fallback; old Chrome-version/origin-trial assumptions are not a plan. |
| Videos | Promo + onboarding shipped (v2.92.6–10); no phone 9:16 cut (Can, October 6). Compare real-app footage after UI changes and recapture only if a visible difference appears. Workflow: `video/README.md`. |

---

## Wallpaper Test — open verdicts

> Resolve each row as **kept**, **iterated**, or **removed** at its due date. In the preceding week, note a one-word observation when used or skipped. No exposure means no verdict.
>
> Sorted by due date; overdue rows stay open until an explicit verdict. Resolved rows → `archive/Backlog-archive.md`.

| Surface | Due | Status |
|---------|-----|--------|
| Memory panel KNOWN record (12d Phase A) | 2026-10-09 | **Overdue — verdict still open.** Re-observing — v2.91.0 adds waiting Soon tasks to KNOWN and gives AI observations a lifecycle (episodic refreshed daily, stable shown only after 3 weeks of support, "not me" rejects). Extended from 2026-10-01: stable items need ~15 days to appear. Does the panel now earn a visit? |
| Focus companion question | 2026-10-15 | Re-observing — v2.92.5 made the highlight quieter (accent label, border on hover), counts only stuck/returning-task signals, and replaced the prompt's lookup table with principles. Does the question now name something about the task itself? |
| Choice, reorder, and focus motion | 2026-10-15 | Open — do the transitions clarify where state went without becoming noticeable choreography? |
| Observation pool — morning + Sunday (12c Phase 4) | 2026-10-15 | **Iterate (2026-09-30)** — sampled pool lines have not landed; ordinary morning task-reading remains useful. Keep feedback running through the October 4 and 11 Sundays; audit silent Sundays to distinguish earned silence from delivery failure; privately diagnose misses by truth, novelty, usefulness, and timing before changing candidate logic. Do not unlock WEEK or New week. |
| Dream sheet + Memory → Dreams (v2.93.8, read fix v2.93.10) | 2026-10-18 | Open — W1: the reading and retelling are worth a glance each time a dream is told; W2: the sheet now shows no date or thought controls, Memory shows one line, and a saved dream can reopen from Dropbox on demand. Does Memory → Dreams earn its place before M2, or should it go? |
| Shift+Space quick voice capture | 2026-10-19 | **Extended (2026-10-05)** — unused since it shipped (v2.90.18); Can chose to keep it for another window. If still unused by 2026-10-19, a hidden gesture nobody reaches for is a removal candidate. |
| HOW DAYS FELT insight | 2026-10-19 | **Iterated (2026-10-05, v2.93.14)** — Can often couldn't find the feeling he meant. Ten words in two columns (lighter · heavier, lightest on top), adding content, joyful, sad, frustrated, scattered and retiring *off* from the picker; mocked and chosen by Can. Re-observe: does the right word now exist most evenings, and does the larger list slow HOW DAYS FELT reaching anything to say? |
| Enrichment arrow arrival (v2.93.20, BUG-116) | 2026-10-20 | Open — W1: a single flash says useful context just arrived. W2: only a fresh result triggers it; hover reveals cached context quietly. Does returning to the desktop PWA remain quiet, and is the first-arrival cue useful? |
| Connections sign-in attention (v2.93.18) | 2026-10-20 | Open — W1: a breathing ✧ points to a sign-in that needs repair, with a Reconnect action behind it. W2: only while Gmail, Dropbox or Calendar is expired, and opening Connections quiets it for the day. Does it help locate the repair without becoming a nag if reconnection waits? |
| Booking email context in focus (v2.93.19; filter v2.93.20; ranking v2.93.21) | 2026-10-20 | **Iterating (2026-10-06)** — Can's “Book haircut” surfaced a calendar reminder. BUG-117 excludes Google Calendar notifications; MiniSearch now ranks a bounded candidate set locally, checks service/provider evidence and abstains on ambiguity. W1: an earlier confirmation may help rebook the named service; no reply draft. W2: a task-grounded non-calendar email is necessary, not proof of usefulness. Watch both incorrect cards and useful cards withheld by lexical matching—no inferred preferred salon or semantic model without evidence. No new surface, mailbox index or startup script. Research: `research/Integrations.md` → Gmail context relevance. |
| Daily nudge adaptive thinking (v2.93.23, shipped 2026-10-09) | 2026-10-23 | Open — W1: recover a perceptive reading of today's commitments rather than a list recap. W2: same strip, no added controls or mid-read swaps; both daily tracks only, fixed reasoning ceiling and existing timeout. Re-observe real quality and latency after deployment. Historical decline is supported, its cause is not yet proven. |
| Daily nudge delivery recovery (v2.93.22; .23 follow-up shipped 2026-10-09, BUG-118) | 2026-10-23 | Open — W1: a transient failed request must not silence the signature morning beat for the whole session. W2: bounded timers recover into About, even after fallback dismissal; no new UI, timer-driven strip swap or reopened dismissal. Real AI dismissals remain final. Check desktop/mobile audits for failure versus rejection before revising prose guards. |
| Connections privacy reassurance | next genuine setup exposure | **Extended (2026-10-05)** — still unobserved; existing credentials can bypass this reassurance. Judge it when a new setup actually exposes it, not merely when a service is added. Do not infer a verdict from absence of exposure. |

---

## Decisions & Boundaries

### Open decisions

| Decision | Status | Notes |
|---|---|---|
| **First-run / onboarding** | Open — needs a decision before building | A new user sees an empty list, a poem, and no explanation. Triage is invisible until 8pm. SOON/PAST are hidden until populated. The separate onboarding video does not resolve in-app orientation. **The question:** is this deliberate (philosophy: fastest path to add, calm over instruction) or unbuilt? If deliberate, record it here and close. If not, define the minimum orientation surface — the decision shapes every future AI surface and feature introduction. Do not build onboarding before the decision is written down. |

---

### Not implementing

| Decision | Rationale |
|---|---|
| Full-contrast completed tasks | Rows recede to 25% opacity. WCAG 1.4.3/1.4.11 accepted exceptions; semantics intact. |
| Visible pointer reorder controls | Drag-only; Option+Arrow for keyboards. WCAG 2.2 criterion 2.5.7 accepted exception. |
| Weather-aware nudges | **Rejected 2026-08-17.** Adds external-data dependency + new privacy boundary with no demonstrated need. Do not re-propose. |
| Truncating task text | **Rejected 2026-08-01.** Task text is primary content. Wrapping is correct; do not re-propose clamping. |
| Additional keyboard shortcuts (desktop) | Existing row/focus/capture shortcuts remain; add more only for a demonstrated workflow gap. |
| Widget / Home Screen | Needs WidgetKit / native Android — not reachable from a PWA. |
| Quick capture (without opening app) | No good cross-platform path. iOS has no PWA share target; Siri needs a native app. |
| Microsoft Notes integration | No clear user need. |
| Momentum integration | No public API; ICS is inbound-only. |
| Calendar integration as agenda | Timing context is input only; no agenda or event list. TODAY is not a planner. |
| Adaptive triage time | **Decided 2026-09-18.** 8pm is the fixed triage gate — no user-configurable time, no adaptive scheduling. The 8pm rhythm works as a day-closing ritual. Do not re-propose. |
| Slack / stream extraction | Wrong trust model; renders others' demands into the calm list. Gmail enrichment (v2.75.1) is readonly and distinct. |
| Todoist integration | **Rejected 2026-08-21.** No demonstrated need for a second task-integration lane. Do not re-propose. |
| Push notifications | **Rejected 2026-08-21.** No demonstrated need. Needs server infra with no validated payoff. Do not re-propose. |
| In-app analytics / session replay | **Rejected 2026-08-11.** TODAY promises no observation. A tracker can expose OAuth tokens. Separate public landing surface only. |

### Rejected approaches

| Area | Rejected | Reason |
|------|----------|--------|
| Quick capture | iOS Share Sheet / Shortcuts | No PWA share-target support on iOS. |
| Quick capture | Web share target | Android-only, inconsistent. |
| Sync | Real-time WebSocket | Overkill for single-user; polling is simpler. |
| Sync | Conflict-resolution UI | Union merge + timestamps handles 99% of cases. |
| Sound | Web Audio with `.then()` | Lag after inactivity; play immediately instead. |
| Idle creatures | Complex AI behaviours | Simple random movement is charming enough. |
| Habits | Streak penalties | Anxiety-inducing; acknowledge, don't punish. |

---

*Poem curation and resolved Wallpaper verdicts live in `archive/Backlog-archive.md`. Shipped features and fixed bugs live in `Changelog.md`, `archive/Changelog-archive.md`, and `archive/Bugs-archive.md` — intentionally not mirrored here.*
