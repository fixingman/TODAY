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
| 13 | **DreamBank** | M1 kept; dream sheet kept (2026-10-18); M2 re-observing | Dream sheet reading/retelling kept (Can, Oct 18). M2 "comes back" needs more dreams to judge — extend to next natural observation. M3 gated on M2's verdict. |
| — | **WEEK companion** | Gated | 12c must genuinely feel like a companion, not a feature. |
| — | **New week — distinct Monday recognition** | Gated | Week-scale evidence, a different job from Today, earned silence; real-use verdict after 12c. |
| 2 | **Poem corpus** | In progress — 159 poems | Expand geography and voice; check curation ledger before proposing candidates. |
| 10a | **Granola — meeting import** | Not started — priority path | Reviewed action chips; build before native calendar-led capture. |
| 10b | **Google Calendar — meeting context** | Foundation live; v2.96.0 daily timing support release approved (Oct 14) | Verify deployed version, then observe eligible daily use without forcing an exposure. Real consent/refresh/Forget checks on desktop/phone still owed before Join / Record. |
| 11 | **Task agent — enrichment** | Stages 1–3 shipped; relevance under observation | Judge useful context, wrong cards and useful cards withheld; Contacts / AI calendar tools deferred. |
| 9 | **Google Drive sync** | Parked — product decisions recorded | Revalidate architecture and auth before implementation; preserve Dropbox behavior. |
| 14 | **Habits — tie to a moment** | Desktop Ask v2.97.0 release approved for dev/master (Oct 17) | Confirm deployment and observe usefulness; W3 Oct 31. No Moment field. Morning relationship remains separate selection/privacy/quality work before nudge wiring. |

---

## Item details

### 12c · Observation Pool — Phase 4 iterate / re-observe

**Architecture:** one ranked candidate pool, two surfaces. Code owns evidence, conservative insight and eligibility; the model phrases the reading. Morning accepts only kinds with a hook in today's list; Sunday can carry every outcome kind. Evidence, novelty, single-reading and the person's usefulness reaction govern delivery. Cooldowns and material-change reopening are cross-surface. Current contracts: `architecture/AI.md`, `design/Personalization.md`, `research/ObservationSelection.md`; pure policy: `assets/week-reflection-policy.js`.

**Verdict (Can, 2026-09-30): iterate, not kept or removed.** Sampled pool lines have not landed; ordinary task-reading morning lines have often helped. Do not discard the companion bet, declare it kept, or rewrite policy from a tiny sample. WEEK and New week remain gated.

**Next decision — 2026-10-15:** re-observe the October 4 and 11 Sundays and morning pool. Privately review missed lines with Can, distinguishing untrue, already obvious, unable to help a choice, and wrong moment. If the pool stays quiet, inspect data, thresholds and delivery before prompts: Sunday silence is allowed, but must be earned. Revisit candidate kinds/usefulness structurally, not with a local wording fix.

**Privacy:** exact lines, dates, task text, votes and optional miss reasons stay in private synced `appMemory.spokenLines` / Dropbox. The vote saves before its skippable reason. Reasons never enter model prompts or this backlog; record only product lessons here. A two-state vote does not establish why a line missed, and a few reasons do not authorize automatic policy changes or analytics.

#### Ordinary morning nudge — separate quality and delivery checks

- **Current behavior (v2.97.8):** misses steer the next ordinary task-reading line, never silence the morning. The fix removes the recap word-pattern veto and its persisted delivery lockout; old recap rejections may resume under their remaining daily budget. The existing writer, grounding/length checks and feedback remain; no rewrite loop. Qualified pool observations retain their own evidence/novelty/usefulness gates. This repairs a delivery regression, not proof of better prose.
- **Quality (v2.93.23):** both daily tracks use adaptive thinking with a bounded 2048-token ceiling. Other surfaces, prompts and selection are unchanged. Earlier perceptive lines followed by increasingly obvious recaps are a real-use signal; thinking being disabled is not a proven cause.
- **Delivery (v2.93.22–23, BUG-118):** content-free device-local audits distinguish failed requests from prose rejection. Bounded retries before noon can recover missing AI text into About after a fallback dismissal; real AI dismissals remain final. No timer replaces the visible strip mid-read. Local two-device coverage is not live verification of every historical failure.
- **Latest signal (Can, 2026-10-10):** a new ordinary nudge worked and felt perceptive, but leading with how long a task had waited emphasized delay. Task age may inform selection without becoming the headline; a useful opportunity can be the subject instead. This is one positive ordinary-path signal, not a pool verdict or a mandate for another quick prompt change. Re-observe quality and latency independently.
- **Feedback review (2026-10-22):** private review of newer ordinary morning feedback supports preserving the writer while repairing delivery. Useful lines connect a commitment to a concrete consequence, timing opportunity or practical way back into it; visible-list totals/position and familiar routine alone can add no useful choice. Age and timing also occur in useful readings, so do not turn this into blanket bans or a new keyword score. The removed recap filter did not catch a recent unhelpful inventory. Recorded focus may support re-entry, but does not establish that a task is nearly finished. These are product lessons, not a pool verdict, verified delivery fix or mandate for another prompt pass; exact wording, votes and reasons stay private.
- **Full retained-feedback messaging review (2026-10-22):** preserve the ordinary writer; older positive reactions to some count/routine lines rule out a blanket lexical ban, while repeated visible-list inventories can become wallpaper. Recognition, practical orientation and calm permission can each help. Current ordinary feedback explicitly supplies only recent misses; recent successful wording is unlabelled repetition history. A narrow future test may clarify that a missed reading does not reject its task, then separately compare a small balanced positive/negative signal against misses-only. No whole vote ledger or private reasons to AI, no templates, no new rejection gate; any new positive signal needs the existing pickup probe before wiring. This review changes no app prompt or production feedback input and does not close pool/Sunday or delivery verification.
- **Fictional feedback comparison — parked (Can, 2026-10-22):** 24 outputs through the existing Claude connection compared current feedback with a bundled two-landed/two-missed signal and narrower missed-reading instruction. Shuffled-label review: candidate better in **3 of 6 cases**, tied in **2**, mixed in **1**. Both arms passed automated length/grounding checks, yet manual review found **4 materially unsupported outputs per arm**; quiet mornings still invented effort/availability and a candidate invented a task dependency. Some voice/practical orientation improved, but the candidate is **not approved for production**. **Revisit after a few more real nudge reviews**, as Can requested; leave the production prompt and feedback input unchanged in the meantime. Do not add lexical vetoes, expand collection or send private reasons. Any later test must distinguish the positive-feedback signal from the changed instruction before attributing benefit. The midnight delivery fix remains separate.
- **Delivery follow-up (Can, 2026-10-18):** task-list default while About held the full line. Tracked under BUG-118 (former BUG-120, merged October 22): strip and About used different staleness rules; now one rule, v2.97.2. Real-startup tests cover startup, delayed response/body/shortening, About close handoff, wake, reload and strip/About agreement after completions and sync.

#### Settled lessons and candidate policy

**Closed writer experiment (2026-10-11–13):** the grounding/voice draft was withdrawn and never deployed. Can preferred a supported tentative connection and gentle invitation to a literal date/location callback, but repeated samples did not establish natural voice or general improvement. Keep task-owned facts, uncertainty and the existing writer; do not infer shared projects/dependencies, ban noticing language, add worked prompt examples or reopen wording passes from this case. This is a modest usefulness signal, not a pool keep verdict or an app vote. Facts/route/isolation and delivery regression coverage remain. Full comparisons and close-out: [archived nudge experiments](archive/Backlog-archive.md#closed-ordinary-nudge-experiments-october-1113-2026).

Earlier samples exposed structural defects, now resolved: per-surface eligibility, live id→task text grounding, retirement of productivity-stat kinds, and a code-owned `insight` separate from `evidence` (v2.90.36). Candidate-aware guards must retain the selected relationship and literal app actions; fluent generic copy is not enough.

Three recognition depths remain distinct: **Noticed** speaks on a state change; **morning/Sunday pool** reads evidence-backed commitment relationships; **confirmed Memory** may hold longer-lived understanding once supported across three weeks (automatic; the person can reject with *not me*). Sunday cannot turn an unconfirmed hypothesis into biography.

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

**Usefulness verdict — kept (Can, 2026-10-11, after two weeks of real use):** "they work good" — the reading's analysis is good and its closing question lands, and the imagery the dream file records (`images`) is itself useful to Can. The bet's commitment link is not yet tested: M1 never connects a dream to tasks, so that half waits for M3.

**M2 built (v2.95.0–1; hide removed v2.95.5):** Memory → Dreams shows one line — *comes back: company (2)* — for up to five things that appear in two or more distinct dreams. Counts appear once; **manage** lists individual dreams to read/delete, with no hide control or reappearance explanation (Can, 2026-10-13: unnecessary). Recurrence is computed on-device from existing index images/people using a shared content-word stem, with no extra AI call or stored lexicon. Synonyms (sea / ocean) are not matched; add an AI match only if real use shows missed recurrences. The legacy `appMemory.dreams.dismissed` map remains for mixed-version sync compatibility but is neither read nor written by the current recurrence UI.

**Dream sheet verdict — kept (Can, 2026-10-18):** the reading and retelling are worth a glance each time a dream is told.

**M2 verdict — extended:** not enough dreams recorded yet to judge whether "comes back: …" reads as recognition or a word count. Re-observe at next natural accumulation point. M3 (callbacks, Sunday, task links) remains gated on M2's real-use verdict.

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

**Corpus at last curation count (2026-10-14):** 159 = winter 18 + spring 18 + summer 15 + autumn 18 + year-round 90. Target 16 per season: summer +1; winter and autumn have reached it and spring is above it.

**Read before proposing:** `archive/Backlog-archive.md` → Poem curation ledger. It preserves approved exceptions, translation decisions, permanent cuts, rejected candidates and open leads. Source/archive discovery conventions above still apply.

### 10a · Granola — Meeting Import

**Not started; priority path:** manual import of structured notes/action items through Granola MCP credentials in Connections → Netlify `list_meetings` / `get_meetings` → extraction → reviewed task chips.

Build before investing in native calendar-led capture; this integration is independent of TODAY's Calendar connection. Gate: are the chips what the person would have written down themselves? Revalidate API/auth before implementing the draft.

### 10b · Google Calendar — Meeting Context

**First daily integration authorized/built (2026-10-14; v2.96.0 release):** Can clarified that the intended destination was runtime Calendar support, not more ordinary-writer experiments, and authorized the small integration. The ordinary writer keeps its existing system/base instruction and thinking route. Code may append one same-task derived timing relationship only when a current manual task explicitly states an uninterrupted duration and its own same-day deadline, and fresh complete recorded primary-calendar intervals leave no gap that long before that deadline. It does not infer task duration, match event titles, turn an empty Calendar into availability, create an agenda or require special task syntax. Ordinary shorthand is not a failure and should not be rewritten to trigger this. Pool/Sunday/focus remain unchanged.

**Release decision (Can, 2026-10-14):** deploy this first increment to both dev and master, including the other agent's 4 approved autumn poems (140 total). Synthetic tests establish wiring/regression safeguards, not good real-use insight; Can explicitly prefers live observation over more artificial quality comparisons. Do not clear today's nudge/cache/vote or manufacture a qualifying task. This lifts the earlier no-runtime-wiring gate only for the timing-only increment above; event-title import, broad Calendar reasoning and extra surfaces remain separate decisions. Deployment is identified by v2.96.0, not inferred from connection status. W3 target: October 28 if deployed October 14; no eligible exposure means no usefulness verdict.

**Boundaries:** lazy shared evidence policy, existing opt-in reader, 800ms total Calendar-read cap; late reads never alter an existing request/line. Empty/unrelated/stale/incomplete/disconnected/slow data omits the block and preserves the ordinary payload. Task facts rebuild after the wait; before saving, enriched replies re-check task text/current membership, snapshot/day/state/account epoch and relationship. Known overreach or stale/invalid supplemental replies recover once through the ordinary writer with fresh facts; normal bounded length repair and transport recovery remain. Negative prose checks are not a proof of arbitrary semantic correctness or personal usefulness. No event titles/descriptions/participants, raw intervals/counts, links, identifiers or provenance reach AI/storage; an accepted derived reading follows the existing private spoken-line/cache/vote/Dropbox path. Forget fences pending input but does not erase an already-spoken line. No new scopes, routing/model overrides, provider/thinking change, sync fields or forced cache/dismissal reset.

**Design review:** W1 has a structural lever—an explicit continuity request contrasted with recorded commitments, which the task list alone cannot show—but real usefulness is unproven; prior failed templates are not deployed. W2 uses rare supported input and the existing writer, never a mandatory Calendar sentence. Track actual eligible use after deployment; no exposure means no verdict. W3 is due 14 days after deployment, not 14 days after this local build. Do not start another wording exercise or import titles automatically to manufacture a match.

**Local verification:** ordinary/delivery nudge suite, 17 new Calendar runtime cases, 20 pure policy groups/100-schedule oracle, Calendar foundation/snapshot tests, AI thinking contract, Connections, smoke/component/design, CI tooling and offline lazy-cache checks passed. Five-run performance passed unchanged budgets: 1199.9 KB decoded / 343.7 KB Brotli, 38 eager scripts. The initial combined worktree exceeded decoded size by 5.4 KB; lazy orchestration and condensed nudge comments restored the gate without changing executable delivery logic or raising ceilings. Raw-byte headroom remains small; future edits must pass payload preflight. All data/responses are synthetic; no live AI call, task/calendar/vote/cache write, commit, push or installed-PWA verification. The full combined release suite subsequently passed: 46 checks, zero flakes/failures. These checks still do not establish real nudge quality; release authorization and observation plan are recorded above.

**Status (2026-10-10):** v2.94.0 deployed to dev and production. Calendar API and `calendar.events.readonly` were enabled/saved in the existing Google project and verified; deployed public client matches Gmail. Existing Gmail grants, credentials, audience and publishing settings were unchanged. Full local gate: 43 checks, no failures/flakes; dev CI and deployment contracts passed. Desktop connected state and a fresh bounded timing read were observed. **Consent-screen scope, refresh, Retry, Forget and phone flows remain unverified.**

**Shipped foundation:** separate Connections row and Calendar consent, device-local tokens, lazy bounded read of today's primary calendar. Only timed, non-cancelled, non-declined, non-transparent regular events survive. Transient context holds start/end and a safe video join URL, not titles, descriptions or participant names; no event data enters AI, appMemory, localStorage or Dropbox. Hidden/offline/stale/day-old context is withheld; Forget fences late responses. Separate Gmail/Calendar rows remain as Can requested.

**Next gate:** verify read-only consent, refresh, Retry and Forget on desktop; repeat Connect and those checks on phone. Then design the **proposed, unbuilt** meeting-start Join / Record offer, resolve no-link/overlap/PiP behavior and run Wallpaper gates. A timed event is not proof of a meeting; no automatic recording or proactive pill is shipped.

**Pre-release experiments (2026-10-10–13):** timing pickup and guard coverage did not establish a useful recurring reading; title-aware pickup did not earn automatic title import. October 14 authorization superseded the no-runtime-wiring gate only for the narrow timing-only v2.96.0 increment described above. Broader/title-aware integration and real-account checks remain gated. Historical comparisons and expired October 13 follow-up: [archived Calendar experiments](archive/Backlog-archive.md#pre-release-calendar-experiments-october-1013-2026). Do not force a qualifying task or restart the closed ordinary-writer experiment.

**Boundaries:** calendar is INPUT, never OUTPUT — no agenda, event list or “next up.” Phone-call audio is unavailable on iOS; mobile capture is in-room/speakerphone only. Headphone mic + tab-audio capture is an after-MVP question. Auto-recording is a posture decision about others in the room, not a technical default.

**Auth:** PKCE and independent Calendar tokens; `calendar-token` keeps the secret server-side. A complete Calendar client pair can be used, otherwise the existing Gmail pair, without changing Gmail scopes/tokens. No ICS proxy. If the Google app remains in Testing mode, account for its seven-day refresh-token limit; expired sign-in must be visible.

**Later:** Gemini / Whisper / Deepgram transcription bake-off after real recordings exist (names, cost, latency). Extraction quality gate: reviewed chips should be what the person would write themselves.

### 11 · Task Agent — Enrichment at Add-Time

**Shipped:** task-triggered web/Trello context plus Gmail enrichment in focus; bounded on-device MiniSearch ranking and Calendar-generated email exclusion (v2.93.20–21). Fresh context signals arrival once; cached context should stay quiet. Current runtime contracts live in `architecture/AI.md` and relevance research in `research/Integrations.md`, not old model/turn-limit snapshots.

**Next:** observe booking-context relevance through October 20 — wrong cards and useful cards withheld by lexical matching both matter. A task-grounded email is necessary, not proof it helps.

**Deferred:** `search_contacts` and `read_calendar`. Derived timing support is limited to the ordinary daily writer (v2.96.0); using Calendar for task enrichment needs a separate privacy/scope/design decision. No inferred preferred provider or semantic mailbox model without evidence.

**Out:** autonomous execution without review, importing others' email as tasks, always-on background agents. External context enriches a task; the companion arc builds internal understanding of the person. Do not conflate them.

### 9 · Google Drive Sync *(parked)*

**Product decisions:** one active sync provider; Dropbox users see no change/prompt. Full API, `drive.appdata` hidden folder, single `today-backup.json`; manual export/re-import when switching, no automatic cross-provider migration. Motivation: a second device on Drive and broader Google-account reach.

**Before building:** revalidate auth, provider lifecycle and Connections design against current module contracts. `assets/sync-merge.js` already holds some pure merge primitives; the full Dropbox merge controller still lives in `dropbox.js`. Shared controller/parity work is not done. Plan a narrowly scoped, behavior-preserving extraction/adaptation with full tests and real-device sync verification; do not add compatibility globals or duplicate merge logic from the old draft.

**Parity gate:** OAuth/refresh/expired state; debounced autosave on every mutation; wake sync; complete merge/deletion semantics; Save / Restore / Forget and provider switching; cache registration and token cleanup. Never rewrite working Dropbox sync as a side effect.

**Historical draft:** `archive/Backlog-archive.md` → Google Drive draft. Its exact globals, startup wiring and extraction instructions predate the current module boundary and are not implementation authority. OneDrive/iCloud and simultaneous Dropbox + Drive remain out.

### 14 · Habits — Tie to a Moment

**Idea (Can, 2026-10-15):** connect a chosen habit to a recognizable moment: walking after the first client call, vegetables at lunch, charging the phone outside the bedroom at a chosen time. TODAY currently records the habit name, daily completion and latest check/uncheck timestamp per habit-day, not a separate cue or cue occurrence. Logging time does not establish action time. This is a research-backed candidate, not build approval or a new top priority.

**Why it fits:** help a commitment find a place in the person's real life, rather than add another completion statistic or coach them to do more. Cue–action planning is supported by research; it does not establish that a new field or more reminders will help in TODAY. A [192-person randomized trial](https://pubmed.ncbi.nlm.nih.gov/33405284/) found no difference between routine-based and clock-time cues. A [2024 walking trial](https://pubmed.ncbi.nlm.nih.gov/39225981/) supports consistent context for automaticity but did not show the expected maintenance of walking in that group. Full evidence/limitations: `research/Psychology.md` → Habit anchors.

**Agreed direction (Can, 2026-10-15): contextual companionship, not a notification system.** Improve the existing experience by recognizing when a chosen habit has a meaningful place in the person's current commitments. A saved cue, unchecked habit, open app or clock time alone does not earn a spoken reminder. First identify a supported relationship, something useful beyond the visible habit name, and an appropriate interaction moment; the model may express it, not invent the opportunity. The person retains the choice. Do not force every habit to have an anchor, fill every surface with habit content or compete with a better morning observation. Silence is correct when the context is weak, the opportunity is unknown/past, the habit is already checked, the reading repeats or the person is focused elsewhere. This applies to the optional habit contribution, not a new rule to silence the ordinary daily nudge.

**Build on the existing experience (Can's clarification, 2026-10-15):** this is not a habits redesign or a claim that current tracking is failing. Preserve the simple name/check-off flow, neutral uncheck, completion acknowledgment, manual order, focus/session support, current 21-day history strip, forgiving strength calculation, archive/undo and normal cross-device save/merge. Keep the 3am grace and existing late-evening Habits-button attention/countdown; “no countdown” below means no new cue-specific countdown, not removal of that existing rhythm. These are verified current capabilities/design commitments, not a fresh usefulness verdict on every element. The proposed cue addresses the moment **before** acting; tracking/recognition continue to serve what happened **after**. Habits that already fit the person's life need no extra setup or migration exercise.

**Consider alongside—not instead of—current work:** 12c usefulness/delivery and its real-use verdicts, Memory's PATTERNS work, and the narrow Calendar daily integration keep their separate gates. Do not turn habit anchors into another nudge, add them automatically to Calendar/focus/Sunday prompts, restore retired habit/completion pool statistics or infer a new pattern from a chosen cue. Habit names/completions already reach some existing companion context (`insights.js` → `_memoryForAI`); keep those flows unchanged. A cue written into the *name* would inherit that existing exposure, whereas a separate cue field must not automatically enter AI. Make that privacy difference explicit when comparing designs. Priority remains unassigned; the new idea does not displace work already under consideration.

**Current review outcome (Can, 2026-10-16):** Can does not want a separate Moment section in this proposal and finds the sketches worse than the existing Habits panel, with a broader concern about panel design degradation including Memory. Withdraw the field/second-line UI direction and prototype as an implementation candidate; do not just rename or hide the same setup. The original habit/context idea remains open, not approved or rejected wholesale. Keep existing Habits geometry, density, hierarchy, controls and history as the design reference. Memory feedback is not authorization for a Memory redesign. Can requests Claude alongside Codex for substantive design work; provide actual components and guidelines, not only a description of an invented replacement.

**Claude review completed (2026-10-16):** read-only critique using actual Habits CSS, design/token documents and the described prototype differences—not screenshots, live app data or implementation. It confirms the structural drift in history geometry, effective hit area versus visible grid, row density/separators, strength alignment and inline editing. Recommendation: leave additional UI unbuilt pending a specific useful case. This is not Can rejecting the underlying idea or approving forced cue-bearing names/a personal homework trial. A routine can supply its own cue without app detection; research supports exploring that mechanism, not this UI. Future design starts from actual components and a same-viewport comparison; every visible difference needs a named user need. No model/provider/routing configuration changed.

**Renewed prototype request (Can, later October 16):** build a second isolated prototype after Claude's critique; this supersedes the pause on another sketch, not the rejection of the first. `../output/habit-context/` retains the actual Habits panel and explores a habit-specific question only after the person chooses the focus companion. No answer field, saved cue, forced naming format or new section. Separate pre-authored morning scenes show a designer-selected preparation relationship and an ordinary reading without habit content; task completion never opens Habits or changes the delivered line. These are fictional interaction examples, not AI results, a selector or proof of usefulness. Without an answer input TODAY does not learn an intended routine. Claude helped author the revised fragment from actual CSS/guidelines; narrow/mobile interaction checks and same-viewport current-source comparison are separate from Can's design verdict. Preserve concurrent panel work; the visible October 16 panel commit changes Memory, not Habits.

**Prototype limits:** focus remains desktop-only, as in `assets/focus.js`; touch has normal tracking and the morning examples, not a new focus entry. Ten isolated check groups pass, including current-source geometry/typography comparison and six-state axe checks; this does not verify physical iPhone behavior or prove usefulness. Claude's final source-review attempt hit its usage limit, so only its earlier critique/authorship is complete, not a final sign-off. No live files, provider/routing settings, AI inputs or sync changed.

**Implementation approved (Can, later October 16):** accepted the revised direction and said to proceed with the desktop habit-question slice. v2.97.0 resolves the active habit's name only after ✦ ask, with a separate bounded question prompt; normal task prompting, timer, Habits layout and daily nudges stay unchanged. No forced cue question, new saved field or answer input. Accepted questions retain the existing private spoken-line history. Request ownership/abort, source/configuration checks and syntactic output rejection cover stale/failing delivery; synthetic tests are not a quality verdict. An isolated no-client-key configured-route probe returned HTTP 400, so real wording remains unverified pending an approved configured connection. Built locally, not committed/deployed. This approval supersedes the earlier prohibition on live implementation **only for this desktop slice**.

**Morning follow-up (Can, October 16):** likes the morning habit connection too, while agreeing it needs careful nudge tuning. Keep it as the next separately judged slice, not automatic permission to alter the daily writer now. Start with bounded supported preparation relationships from existing chosen habit/task names, value beyond a name recap, competition with the ordinary reading, repetition/checked-habit/weak-evidence withholding and current privacy/feedback. Do not reintroduce a Moment field, raw history, count coaching, Calendar availability inference or a recurring habit reminder. Preserve ordinary daily delivery when no habit relationship qualifies; a question's usefulness cannot establish the morning candidate's usefulness.

**Configured wording check (Can-authorized, October 17):** completed exactly three fictional-name calls through desktop v2.96.4's existing Claude connection, with the exact local v2.97.0 habit prompt (hash checked), not the live focus function. Responses took 1.3–2.0s and all passed the one-question/under-20-word shape guard. Watched live habits/tasks/feedback/nudge state and visible nudge stayed unchanged during the probe; no action execution or spoken-line writes, and no real content sent. Judgment is **mixed, not release-approved**: the charger question offers a concrete setup choice but has corrective “actually” emphasis; Read/Walk both fall into a generic options-menu shape. Preserve name-only privacy and do not force timing questions or expand context to compensate. Exact fictional examples/method: `../output/habit-context/quality-check-2026-10-17.md`. No prompt edit or extra AI calls in this check.

**Can's feedback on those outputs (October 17):** Read and Phone are slightly in the right direction, but can be better. This is a modest positive signal for both, not an acceptance verdict; do not let the agent's options-menu critique erase Read's usefulness signal or treat every choice question as a failure. Preserve room for an inviting reading choice and a concrete phone-charging arrangement without lists of arbitrary options, corrective emphasis, invented routines or a forced timing question. Wording sketches are not new AI results or production prompt examples. No extra calls, runtime prompt edit or release approved by this feedback alone.

**Remaining product hypothesis — not an approved interaction:** distinguish less repeated remembering/deciding from worthwhile recognition within an existing daily nudge. Current `_memoryForAI` habit context is names, weekly completion counts and yesterday's status; more history or a better prompt cannot reliably reconstruct the person's intended context. That limitation does not justify a new field, required naming syntax, data collection or automatic model-input expansion.

**Withdrawn experience:** the optional Moment edit field, quiet second line and standalone rebuilt panel were explored in `../output/habit-moments/` using fictional data, not shipped. Their interaction/layout checks do not establish design quality or usefulness. A hypothetical hallway-charger relationship was designer-selected, not an AI output or implemented selector. Do not polish or wire this prototype as the next step. Any future daily contribution still needs bounded evidence/selection/privacy, existing feedback, and value beyond recalling a plan; no raw-memory dump, keyword-only dependency guess, Calendar title import or forced habit sentence.

**Possible touchpoints—not implemented or blanket permission to wire them:**

- **Habit setup/review:** preserve existing capture/edit. No separate Moment section, new setup step or automatic renaming is selected by this proposal.
- **Daily nudge:** optional support for a genuinely relevant morning reading, not a daily habit checklist or a requirement to mention an anchor. Any new cue input needs its own bounded privacy/evidence contract; preserve the working writer and existing feedback.
- **Task completion:** keep the existing acknowledgment only. The earlier linked-task reminder proposal is withdrawn from the recommended design: recalling “you chose a walk after this call” did not establish sufficient value. No new completion offer, task-link setup or automatic habit check-off.
- **Focus:** no unrelated habit interruptions. A relevant cue may support the habit itself; a timer finishing is not evidence that the task or external cue happened.
- **Unobserved moments:** lunch, bedtime and untracked calls may happen while TODAY is closed. No delivery-at-that-moment promise or retrospective “you missed it” message. The real-world routine can supply the cue without an app alert; existing evening attention stays unchanged.

**Boundaries:** no alarms/push notifications (already rejected), cue-specific due/late state or countdown, auto-reordering or extra penalty. A clock cue does not replace the existing 3am habit-day boundary. Do not infer that a call, meal or bedtime happened from Calendar, a check-off timestamp or an absent check; the person marks the action, not compliance with its cue. Irregular/no-call days, travel, time zones/DST, multiple daily actions and changed cues need explicit design handling before any cue-specific scoring. Keep current completion/strength behavior in scope only as unchanged behavior—not proof of cue adherence or automaticity. No AI, Calendar access, new private-history collection or analytics needed for the first candidate.

**Review lesson (2026-10-15; supersedes the first scenario pass):** Can was not sold on the interaction/noticing and asked for a concrete definition grounded in TODAY's accumulated decisions and external research. The agent withdrew the literal post-completion callback; do not carry the old “strongest candidate” designation into implementation. `design/Personalization.md` → Habit Moments now holds the revised journey and its limits. Unrelated completion, focus/timer end, unobserved lunch/bedtime and established/no-cue habits keep the normal behavior. No new behavior has been approved.

**Bounded revision completed (Can-authorized, later October 17):** revised only the habit prompt toward the person's own concrete preference/arrangement, without supplied options or corrective emphasis; no worked examples/templates. Three fresh fictional Claude calls through the unchanged installed connection passed the format guard in 0.9–2.4s; all watched live-state comparisons stayed unchanged. Walk now asks about an enjoyable route; Phone preserves the practical placement choice without “actually.” Read is less menu-like but “book or material”/“for this” remains mechanical. Agent judgment: modest improvement, not Can's quality/release approval. Exact outputs and prompt hash are in the same report. Fresh focus suite (24 groups), payload preflight and supporting checks cover implementation; no daily/task prompt, privacy boundary or morning wiring changed. No further calls/iterations, commit or push in this pass.

**Read follow-up (Can, later October 17):** agrees Read is still not good and approved revising the previous version. Local principles now favor natural language about what would suit the person, not an inventory of materials or assumed enthusiasm, retaining the earlier open invitation without its menu. No hardcoded Read reply, added context or extra AI calls; this newest wording has not been sampled. Task/daily prompts and Phone's practical-arrangement direction stay unchanged. No commit/push.

**Release approved (Can, October 17):** push v2.97.0's desktop habit-focus slice to dev and master, excluding the separate in-progress `poem.html` work. The newest Read refinement remains unsampled; release approval is not a claim that AI wording or real-use usefulness is proven. No extra AI calls or prompt churn. W1 hypothesis: a requested habit-specific question helps a practical choice beyond the visible name. W2: opt-in at the selected habit, not automatic/repeated cue-planning; name-only input limits freshness, so real usefulness must earn keeping it. W3 target October 31, conditional on October 17 deployment; confirm deployed version and judge actual exposure without resetting the overdue task-focus verdict. Morning connection retains its own evidence/privacy/selection gate. The first sketch stays withdrawn. No forced cue-bearing names, capture requirements, completion reminders, new metadata or global sync rewrite. Judge practical remembering/deciding and meaningful recognition separately, not checkmarks or habit formation.

---

## Watching / parked investigations

| Item | Revisit trigger / boundary |
|------|----------------------------|
| CI reliability (v2.95.6 shipped) | Review the next GitHub first-process performance failure using retained cold/warm/focus traces; cause is still unresolved. October 13 v2.95.6 dev/master CI and October 14 deployed performance passed; successful runs do not establish that the intermittent stall is fixed. Keep worst-run budgets and flaky-test failures. Delayed two-device nudge fixtures reproduce and remove a fixed-sleep race; early payload preflight and complete attempt logs improve diagnosis. |
| Calendar daily timing support (v2.96.0 release approved 2026-10-14) | Verify deployed version after push, then observe actual eligible use; W3 target Oct 28 (14 days after Oct 14 deployment). No exposure is not failure. Review usefulness/false withholding and the conservative text guard separately; no event-title import, wider parsing or forced live line from synthetic tests. |
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
| Memory panel KNOWN record (12d Phase A; iterated v2.97.4) | 2026-11-01 | **Iterate (Can, 2026-10-18).** Returning tasks with recorded focus can prompt a concrete choice; waiting Soon rows are kept intentionally and crowd that signal. W1: the record helps choose what to revisit. W2: focus-backed returning rows lead, Soon waits stay inspectable under show waiting, missing focus is not “not started”. Counts move to coverage; Dreams is last. Re-observe whether this earns a visit; no readiness inference or task reordering. |
| Focus companion question | 2026-10-15 | Re-observing — v2.92.5 made the highlight quieter (accent label, border on hover), counts only stuck/returning-task signals, and replaced the prompt's lookup table with principles. Does the question now name something about the task itself? |
| Observation pool — morning + Sunday (12c Phase 4) | 2026-10-15 | **Iterate (2026-09-30)** — sampled pool lines have not landed; ordinary morning task-reading remains useful. Keep feedback running through the October 4 and 11 Sundays; audit silent Sundays to distinguish earned silence from delivery failure; privately diagnose misses by truth, novelty, usefulness, and timing before changing candidate logic. Do not unlock WEEK or New week. |
| Dream sheet + Memory → Dreams (v2.93.8; M2 recurrence v2.95.0, compact v2.95.1) | open | **Dream sheet kept (2026-10-18).** M2 "comes back" extended — not enough dreams to judge recognition vs. word count. Re-observe when more dreams accumulate. M3 gated on M2 verdict. |
| Enrichment arrow arrival (v2.93.20, BUG-116) | 2026-10-20 | **Wake bug verified by Can, 2026-10-22.** Returning to the desktop PWA no longer repeatedly flashes existing arrows. W1: a single flash says useful context just arrived. W2: only a fresh result triggers it; hover reveals cached context quietly. Bug verification closes BUG-116; whether the recurring first-arrival cue earns its place remains a separate product verdict. |
| Connections sign-in attention (v2.93.18) | 2026-10-20 | Open — W1: a breathing ✧ points to a sign-in that needs repair, with a Reconnect action behind it. W2: only while Gmail, Dropbox or Calendar is expired, and opening Connections quiets it for the day. Does it help locate the repair without becoming a nag if reconnection waits? |
| Booking email context in focus (v2.93.19; filter v2.93.20; ranking v2.93.21) | 2026-10-20 | **Iterating (2026-10-06)** — Can's “Book haircut” surfaced a calendar reminder. BUG-117 excludes Google Calendar notifications; MiniSearch now ranks a bounded candidate set locally, checks service/provider evidence and abstains on ambiguity. W1: an earlier confirmation may help rebook the named service; no reply draft. W2: a task-grounded non-calendar email is necessary, not proof of usefulness. Watch both incorrect cards and useful cards withheld by lexical matching—no inferred preferred salon or semantic model without evidence. No new surface, mailbox index or startup script. Research: `research/Integrations.md` → Gmail context relevance. |
| Daily nudge adaptive thinking (v2.93.23, shipped 2026-10-09) | 2026-10-23 | Open — W1: recover a perceptive reading of today's commitments rather than a list recap. W2: same strip, no added controls or mid-read swaps; both daily tracks only, fixed reasoning ceiling and existing timeout. Re-observe real quality and latency after deployment. Historical decline is supported, its cause is not yet proven. |
| Daily nudge delivery recovery (v2.93.22; .23 follow-up shipped 2026-10-09, BUG-118) | 2026-10-23 | Open — W1: a transient failed request must not silence the signature morning beat for the whole session. W2: bounded timers recover into About, even after fallback dismissal; no new UI, timer-driven strip swap or reopened dismissal. Real AI dismissals remain final. Check desktop/mobile audits for failure versus rejection before revising prose guards. |
| Memory → HOW DAYS FELT (shipped v2.95.1, 2026-10-11) | 2026-10-25 | **Re-observing.** W1: a recognizable comparison may reveal a relationship with commitments that the task list cannot show; Can found the old sentence unclear and without a useful takeaway. W2: qualified reflected-evening comparison or silence; evidence changes invalidate results, unchanged valid evidence may keep the sentence. Counts/subtitle removed. Real use must establish whether the insight earns its place; clarity and freshness alone do not establish usefulness. |
| Daily nudge length recovery (shipped v2.95.4, 2026-10-13) | 2026-10-27 | **Re-observing.** W1: a word-limit miss should not erase a useful morning reading and its About record. W2: one grounded shortening pass, then strict validation or fallback; no repeated prose hunting, reopened real-AI dismissal or mid-read replacement. Desktop October 13 audit confirmed length rejection; phone cause remains uninspected. Observe actual delivery and whether shortened wording retains its meaning. |
| Triage touch countdown (shipped v2.95.3 with v2.95.4, 2026-10-13) | 2026-10-27 | **Re-observing.** W1: hold to keep enough time to read the evening completion/reflection without changing button actions. W2: only during an active completion countdown and while held; release/cancel resumes remaining time. Verify on the physical phone that this feels natural and does not interrupt scrolling or choices. |
| Memory → PATTERNS merge (shipped v2.95.5, 2026-10-13) | 2026-10-27 | **Re-observing.** W1: one PATTERNS list keeps every timing line plus the three outcome contrasts Can valued, without the lower-resolution HOW YOU WORK echo. W2: corrected obligation and return calculations may show different numbers or stay silent until the evidence qualifies; first 6 rows, then show all. Do the corrected lines still feel on point, and do AI restatements stay gone? |
| Calendar-supported daily writer (v2.96.0 release, 2026-10-14) | 2026-10-28 | **Open.** W1: a same-task continuity need contrasted with recorded commitments can reveal a choice the list alone cannot. W2: rare explicit evidence, optional input to the existing writer, no forced Calendar message or title import. Verify deployed version first; judge actual eligible lines via existing feedback, not synthetic prose. No exposure means no usefulness verdict. Watch false withholding and extra ordinary recovery separately. |
| Desktop habit focus question (v2.97.0 release approved 2026-10-17) | 2026-10-31 | **Open; confirm deployment.** W1: an explicitly requested question may help a practical choice beyond the habit name. W2: name-only input after Ask, not automatic cue planning or a new field; no daily-nudge change. Latest Read refinement has not been AI-sampled. Judge real usefulness and repeated generic wording, not format validity; no exposure means no verdict. Keep the older task-focus verdict separate. |
| Ordinary nudge delivery after recap-filter removal (v2.97.8, 2026-10-22) | 2026-11-05 | **Re-observing; real-use verification open.** W1: a useful ordinary reading can be lost merely for lacking a contrast keyword; the signature morning must survive that faulty veto. W2: existing daily surface, writer/context, hard guards and feedback; no new rewrite loop or collection. Verify midnight delivery and legacy recovery after deployment, then judge actual usefulness/recap quality independently. No synthetic pass is a keep verdict. |
| Nudge delivery readout + gentle swap (v2.97.5, temporary diagnostic) | once phone delivery is understood | **Temporary — remove later (Can, 2026-10-19).** Tap About's "Today" label for this device's content-free delivery line (asked / default / answered / swapped / from other device). Read it on the phone after a phone-first morning to confirm the slow-request theory; keep the swap (option B) on its own merits, then delete the readout and its `display` audit events. |
| Focus minutes / done count missed (one-off, Oct 18 evening) | if it recurs | **Holding (Can, 2026-10-20).** TODAY didn't register focus minutes or the right done count on the evening of Oct 18; not seen since. No code change since Oct 16 touches focus recording (`completeFor`) or done/stat sync (checked v2.97.0–v2.97.5). If it happens again, capture: which surface (triage summary / About / Memory), device and time, shown vs expected, and whether work and viewing were on different devices — then run a read-only console check of `stat_focus_mins_*`, `today_checked_ids` and `today_daily_history`. |
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

*Poem curation, closed experiment history and resolved Wallpaper verdicts live in `archive/Backlog-archive.md`. Shipped features and fixed bugs live in `Changelog.md`, `archive/Changelog-archive.md`, and `archive/Bugs-archive.md` — intentionally not mirrored here.*
