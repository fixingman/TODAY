# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Completed build/review history → `archive/Backlog-archive.md`; shipped changes → `Changelog.md`; bug verification → `Bugs.md`. Completed implementation can still have an open real-use check. Reviewed 2026-10-24.

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

Current work, decisions and gates. **Committed** means code exists, not that installation or usefulness has been verified. Review dates are checkpoints, not scheduled automations. Implementation details and closed studies are [archived](archive/Backlog-archive.md#completed-milestones-and-superseded-planning--october-24-2026).

Ordered by expected impact on daily trust, useful guidance and accumulated understanding, with current gaps ahead of unproven expansion. **Priority** is the impact rank; **ID** preserves the original item reference. Status and gates still determine what can proceed. Prioritized 2026-10-25.

| Priority | ID | Item / details | Current status | Next action / gate |
|---|---|---|---|---|
| 1 | — | [Release verification](#release-verification) | BUG-118/121/122 fixes implemented; accepted verification open | Check morning delivery, midnight poem and two-device zone convergence; remove diagnostic only after its purpose is met. |
| 2 | 15 | [Feedback loops and writing evaluator](#15-feedback-loops-and-writing-evaluator) | Feeling reactions shipped; normal morning vote context prepared in v2.98.1 | Finish automated release checks, deploy the ordinary feedback cycle and observe normal votes; critic research remains parked. |
| 3 | 12c | [Observation pool](#12c-observation-pool) | Phase 4 iterate; October 15 verdict overdue | Review actual morning/Sunday misses and earned silence; keep ordinary delivery separate. |
| 4 | — | [Memory](#memory-record-and-patterns) | KNOWN iterated; PATTERNS / HOW DAYS FELT re-observing | Keep the October 25/27 and November 1 checks distinct; reaction-loop runtime belongs to #15. |
| 5 | — | [Task Focus Ask](#task-focus-ask) | v2.97.10 committed and pushed; real-use verdict open | Confirm deployed/installed build, then judge whether the line changes the next action. |
| 6 | 11 | [Task enrichment](#11-task-enrichment) | Stages 1–3 implemented; relevance verdict overdue | Review wrong cards and useful cards withheld, including booking context. |
| 7 | — | [CI reliability](#watching--parked-investigations) | v2.97.9 attribution work committed; startup cause open | Inspect original-run GitHub evidence; local timing success does not close nightly reliability. |
| 8 | 14 | [Habit contextual companionship](#14-habit-contextual-companionship) | Desktop Ask verified: seldom used, kept for consistency (habits now act like tasks); morning slice unbuilt | Morning support gated on its own evidence; desktop slice done. |
| 9 | 10b | [Calendar context](#10b-google-calendar-context) | Foundation + timing-only increment implemented | Finish real-account checks and observe eligible daily lines; Join / Record remains unbuilt. |
| 10 | 10a | [Granola meeting import](#10a-granola-meeting-import) | Not started; priority meeting-capture path | Revalidate API/auth and reviewed action-chip flow before native calendar-led capture. |
| 11 | — | [WEEK companion](#week-companion) | Gated | 12c must genuinely feel like a companion; history volume alone does not unlock it. |
| 12 | — | [New week recognition](#new-week-recognition) | Gated | Distinct week-scale relationship, novelty and earned silence after 12c. |
| 13 | 13 | [DreamBank](#13-dreambank) | M1 + dream sheet kept; M2 extended | Wait for natural dream accumulation before judging recurrence; M3 remains gated. |
| 14 | 2 | [Poem corpus](#2-poem-corpus) | Ongoing curation; 159 poems verified in source | Broaden voices/geography; summer needs one to reach the existing seasonal target. |
| 15 | — | [First-run orientation](#open-decisions) | Open product decision; unbuilt | Decide deliberate minimalism versus a minimum orientation before building; the video is not that decision. |
| 16 | 9 | [Google Drive sync](#9-google-drive-sync) | Parked; product decisions recorded | Revalidate auth, shared merge architecture and current Connections before implementation. |

---

## Item details

### 12c: Observation pool

**Status:** phases 0–3 implemented; Phase 4 **iterate** (Can, September 30), with the October 15 usefulness checkpoint still overdue. Sampled pool lines have not landed; useful ordinary task-reading lines are not a pool keep verdict. WEEK and New week stay gated.

**Next:** privately review available mornings and Sundays for truth, novelty, a choice it could help, and timing. For quiet Sundays, inspect eligibility/data/delivery before prompts; silence must be earned. Do not repeat the expired October 4/11 observation plan as future work or reopen closed wording passes from a small sample.

**Current contracts:** code selects evidence/relationship/eligibility, the model phrases one reading; morning needs a hook in today's list, Sunday may use other eligible outcome relationships. Preserve unknowns, cross-surface cooldowns and material-change reopening. No retired productivity-stat kinds, biography from unconfirmed hypotheses, or inferred zeroes from missing records. Owners: `assets/week-reflection-policy.js`, `architecture/AI.md`, `design/Personalization.md`.

**Ordinary morning quality — separate:** preserve the existing writer while collecting real reactions. October 22 reviews support concrete consequences, practical orientation and calm permission, without a blanket ban on age, counts or routine. A missed reading does not reject its task. No private reasons or whole vote ledger to AI; no keyword veto or automatic policy change. Delivery belongs to [release verification](#release-verification); bounded feedback/evaluator work belongs to [#15](#15-feedback-loops-and-writing-evaluator).

Exact lines, votes and optional reasons stay in private synced `spokenLines` / Dropbox, not repo fixtures. [Completed writing/messaging studies](archive/Backlog-archive.md#ordinary-nudge-implementation-and-completed-messaging-studies) preserve the reasons earlier candidates were not promoted.

### 15: Feedback loops and writing evaluator

**Cross-surface direction (Can, October 25):** [AI improvement cycle](../docs/ai-improvement-cycle.md) owns one lifecycle and honest per-surface inventory: current evidence → valid displayed result → optional reaction/meaningful action → bounded current guidance → next eligible result. Content/selection, wording and action outcomes have distinct meanings and separate privacy domains. Normal use drives adaptation automatically; versioned engineering changes and automated regression checks improve the policy. No recurring manual console cycle or per-response critic.

**Execution order:** (0) resolve/release local v2.98.1 morning connection; (1) exact-result adapters and separate task/habit Focus Ask feedback reaching the next explicit Ask; (2) private feeling-style projection plus reviewed factual/wording constraints; (3) exact-card enrichment feedback, Gmail audit and pool/Sunday wording adapters; (4) dreams/extraction/themes only within existing gates and their appropriate fidelity/usefulness contracts. Focus's current one-line-per-day history cannot identify multiple answers, enrichment has no adaptive feedback, and feeling votes do not yet teach wording. Shared identity/store/merge/retention contracts and concrete exit criteria are specified in the linked document. Each slice must change a later eligible result, not merely record an event. No new runtime/storage/UI change is claimed by this cross-surface plan.

**Current direction (Can, October 25):** connect adaptation to the normal vote/generation cycle. v2.98.0’s feeling reactions are shipped. v2.98.1 is prepared locally to activate the narrower tested positive-context increment—up to two landed and two missed recent ordinary readings—with the existing writer instructions. The combined instruction change and automatic critic remain off. This is a bounded product decision using a signal that showed pickup, not a claim that the fictional comparison proves a quality improvement. Normal future votes update context automatically; no continuing manual console experiment is required to operate the loop. Accepted daily prose stays fixed when voted on; revision/clear/sync apply to the next eligible generation.

**Separated experiments reviewed (October 25):** 64 feedback outputs, with assessments frozen before variant mapping. Material unsupported claims: baseline 6/16, positive-only 5/16, instruction-only 9/16, combined 6/16; the combined instruction-change candidate did not establish improvement and stays off. Positive examples did not reliably recover prior-effort recognition. These are Codex development judgments, not user votes or comparative proof. The initial evaluator transport lost structured critique objects; that invalid portion is retained. A real-handler regression verified the adapter correction, then the focused recovery used 46 requests / 87.2 seconds against the same originals. All ten calibration labels matched, but the broader run falsely flagged three acceptable originals and rejected six supported revisions. Twelve blind pairs: nine revisions preferred (two still materially unsupported), two originals preferred, one tie; four other originals stayed unchanged. Three feeling corrections were accurate, all using one revive/calm aggregate. Actual rewrite chains took a median 5.887s, worst 6.914s within the development cap; this is not a mobile/runtime latency verdict. No automatic revision is activated. Reports, originals and frozen assessments stay in `.context/feedback-loops/study-v2/` and `study-v3/`.

**Parked development follow-up:** if a concrete writing problem warrants it, test the prepared evaluator-principles refinement against eight exact regression candidates (six falsely rejected supported lines plus two real remaining errors), the original calibration set and unseen acceptable wording. Supplied facts must remain authoritative; tentative action suggestions must not become availability promises or be flattened into inventory. Separately test held-out obligation/release/focus feeling aggregates and acceptable controls against current abstention before any feeling-only bounded recovery. Preserve the three-extra-call ceiling, choose an actual surface deadline/fallback and cover source/consent/deletion/sync fences before runtime integration. The normal-use activation above is limited to the tested positive-context increment. Keep automatic revision and the changed instruction off; future evaluator work is parked behind a concrete writing problem, not a required manual cycle.

**Feeling style — required, not implemented (Can, October 25):** ordinary feedback must improve how a feeling insight is written as well as which relationship appears. Existing whole-reading votes are a weak style signal, not an explicit reason or a permanent preference. Next: separate factual invariants from the current fixed opening/verbatim-context constraints; prepare a bounded on-device wording projection that exposes no historical feeling content; demonstrate useful pickup without adding a normal-path request, settings or manual console cycle. Preserve claim withholding, source/consent/deletion/expiry fences and stable valid readings. Sparse/conflicting feedback keeps the baseline voice. Do not claim that existing reuse/withholding already learns style. Detailed implementation boundaries are in [the plan](../docs/feedback-learning-plan.md#required-follow-up-feeling-writing-style-can-october-25).

**Foundation contracts:** HOW DAYS FELT uses explained first-vote consent, exact-reading reactions, Undo/footer review, source-bound reuse, claim-specific withholding and separately retained/synced sensitive data. Morning feedback uses existing ordinary spoken-line records only; no private reasons, pool/category votes or feelings enter it. Missing/hanging helper loads retain ordinary delivery with legacy misses. New positive context was tested independently of the replacement instruction; current activation keeps the original instructions and extra-call budget unchanged. Local checks cover the feedback cycle and deletion/sync boundaries; real-use usefulness remains for normal votes to establish.

**Release status (v2.98.1 local):** 52 functional suites passed without flakes/failures; natural desktop/mobile vote → next day → synced revision/clear and missing/hanging helper tests pass. Payload passes (1199.5 KB decoded / 342.4 KB Brotli). One existing performance gate remains open: first focus entry 429.7ms > 300ms. The missing original-interaction observer wiring is fixed with a real-entry-point regression; separate diagnostic replays do not reproduce the spike and do not supersede the failed five-run result. Preserve that evidence; no audio/focus change, budget increase, commit or deployment is claimed. This is release reliability work, not another manual nudge-quality experiment.


### Task Focus Ask

**Current:** v2.97.10 is committed and pushed to dev/master. Ask sends only JSON-quoted task text and aims to clarify a consequential unknown, otherwise offer a supported step or acknowledge a sufficient action/wait. The history highlight is removed; current task failures have explicit retry status. Habit wording, enrichment shortcuts, provider and timer contracts stay separate. Owners: `assets/focus.js`, `architecture/Focus.md`, `architecture/AI.md`.

**Next:** confirm the deployed/installed build and judge real help, including repeated generic wording, unsupported assumptions and deliberate waits. The 72-output comparison and subsequent wording checks used a different local model/transport; format and lifecycle tests do not establish usefulness. Repetition remains possible without per-task response association. No chat, answer field, extra collection or background generation is approved. W3 is provisionally November 7 if deployed October 24; move the checkpoint if release lands later.

### Memory record and patterns

**KNOWN:** v2.97.4 implements the October 18 iterate verdict: focus-backed returning tasks lead, intentional Soon waits stay inspectable under show waiting, zero recorded focus does not mean unstarted, outcome counts sit in coverage and Dreams is last. **Next:** November 1 check on whether the record helps choose what to revisit; implementation is not a keep verdict.

**PATTERNS:** merged list and corrected obligation/return calculations are implemented; October 27 checks whether valued lines still help and AI restatements stay gone. Inspect existing semantic/procedural/episodic confirmation statuses before adding generation or sources; Can's limited interest is not permission to expand collection.

**HOW DAYS FELT:** qualified aggregate selection and evidence freshness are implemented; October 25 check remains open on clarity and usefulness. A source feeling is not a reaction to its reading. Reaction/retention/sync integration is [#15](#15-feedback-loops-and-writing-evaluator), in progress locally and not a verified release. Contracts: `architecture/AI.md`, `design/Components.md`.

### 13: DreamBank

**Remaining:** M2 “comes back” recognition has too little natural exposure for a verdict. Re-observe as dreams accumulate; do not call it kept because M1's analysis/closing question or the dream sheet was kept. [M1 and sheet verdicts](archive/Backlog-archive.md#dreambank-m1-and-dream-sheet) are complete.

M2 recurrence is on-device over existing images/people, not new AI matching or a stored lexicon. Add semantic matching only if real use shows missed recurrences. **M3 callbacks/Sunday/task links remain gated on M2.** Multi-dream capture is deferred until Can actually wants separately told dreams split; one capture remains one dream. Contracts and locked design decisions remain in `architecture/AI.md` and the completed record; no private dream body becomes a repo fixture.

### 2: Poem corpus

**Current verified count:** 159 — winter 18, spring 18, summer 15, autumn 18, year-round 90. Summer needs one to reach the existing target of 16; the other seasonal pools already exceed it. Expansion is ongoing, not an unresolved shuffle fix.

**Next search:** broaden geography/voice, especially Africa, Latin America, Middle East and Southeast Asia, and ordinary lived detail around choosing/keeping/loosening/returning. Diversity is a tie-breaker, not a quota. New candidates are human-written, spare, concrete, held/affirming and 2–6 displayed lines; grandfathered longer approvals are not a new precedent.

Follow the recorded author/translator worldwide-PD or verified CC0/dedication rule; preserve the five approved US-only exceptions without extending that route. No AI rewrites or silent translation modernization. Read the [curation ledger](archive/Backlog-archive.md#poem-curation-ledger) before proposing anything: permanent cuts, exceptions and pending leads remain authoritative. Source-discovery conventions above still apply.

### 10a: Granola meeting import

**Not started; priority path:** manual structured meeting notes/action import through a revalidated Granola API/auth contract, then extraction and reviewed task chips. Build before native calendar-led capture; the integration is independent of TODAY's Calendar connection. Gate: are the proposed chips what the person would have written themselves? Existing endpoint/MCP sketches need fresh validation before implementation.

### 10b: Google Calendar context

**Implemented:** separate read-only primary-Calendar foundation and v2.96.0 timing-only support for the ordinary daily writer. [Build/release/test history](archive/Backlog-archive.md#calendar-foundation-and-first-daily-increment) is complete; runtime boundaries live in `architecture/Connections.md` and `architecture/AI.md`.

**Open account checks:** verify the current installed build, read-only consent/scope, refresh, Retry and Forget on desktop; repeat Connect and those checks on phone. Existing Gmail permissions must remain unchanged. The October 28 daily-writer checkpoint needs actual eligible use; no exposure is not a usefulness verdict and must not be manufactured by rewriting tasks or clearing the day's line.

**Keep the increment narrow:** one supported same-task continuity/deadline relationship, fresh complete intervals and a bounded lazy read; omit context for unknown/open/stale/slow input. No task-duration guess, event-title matching, raw events/titles/participants/intervals to AI/storage, agenda, new scopes or routing changes. Pool/Sunday/focus remain outside this integration. Delivery fences and ordinary recovery stay with the owning writer.

**Still unbuilt:** Join / Record offer after real-account checks and a separate design/W1–W2 pass; resolve no-link, overlapping-event and PiP behavior. Calendar is input, never output; a timed event is not proof of attendance and never authorizes auto-recording. Preserve in-room/speakerphone limits on mobile. Capture/transcription comparisons wait for real recordings; no new bake-off is owed now.

### 11: Task enrichment

**Remaining:** the October 20 relevance verdict is overdue. Observe helpful context, wrong cards and useful cards withheld by lexical matching, especially booking email context. Matching the task is necessary, not proof the card helps. Fresh-arrival wake repair is verified; the recurring cue's usefulness is still open.

Stages 1–3, Gmail/Calendar-notification filtering and bounded MiniSearch ranking are implemented. Owners: `architecture/AI.md`, `research/Integrations.md`; BUG-117 still owns accepted booking-match verification. Contacts and AI Calendar tools are deferred; Calendar's daily timing permission does not extend to enrichment. No inferred preferred provider, semantic mailbox model, others' email imported as tasks, or autonomous execution without review.

### 14: Habit contextual companionship

**Implemented:** desktop habit-specific Ask in v2.97.0, name-only input after an explicit tap. It is committed, not merely a local prototype. [Rejected UI, revised prototype, wording checks and release decisions](archive/Backlog-archive.md#habit-desktop-slice-and-completed-design-studies) are historical. **Verdict (Can, 2026-10-25):** seldom used but kept — habits now act like tasks, which is consistent and worth having. Not crucial, but not a candidate for removal. The latest Read refinement was not live-sampled; this verdict is based on real use, not syntactic validity.

**Separate, unbuilt follow-up:** a meaningful preparation relationship in the existing morning reading, not a saved Moment field or reminder. Establish evidence, extra value beyond a name recap, competition with the ordinary reading, repetition/checked/weak-evidence withholding, privacy and selection before wiring. Keep ordinary daily delivery unchanged when no habit relationship qualifies; desktop question usefulness does not establish morning usefulness.

The underlying habit/context idea remains open. Preserve the actual Habits component, name/check-off flow, history/strength, ordering, archive/undo, sync, 3am grace and existing evening attention. No required cue-bearing name, new field, completion-triggered offer, task-linking setup, automatic check-off or retrospective cue-adherence claim. No unobserved call/meal/bedtime inferred from a check or Calendar. Substantive future design uses actual components with Claude as specified in `design/ProductThinking.md`; research/design limits live in `design/Personalization.md` and `research/Psychology.md`.

### Release verification

**Do not archive these as verified:** [BUG-118](Bugs.md#bug-118--daily-nudge-delivery-and-recovery), [BUG-121](Bugs.md#bug-121--yesterdays-splash-cooldown-suppresses-the-new-days-poem), and [BUG-122](Bugs.md#bug-122--zone-agreement-warned-as-a-conflict-remote-past-did-not-fence-older-soon) have implemented v2.97.8 fixes but still await accepted verification. `Bugs.md` owns exact causes/statuses and other open bug work.

Check phone/desktop morning delivery, legacy rejection recovery and strip/About agreement; a fresh poem across midnight followed by same-day cooldown; and two-device newer-zone convergence without same-zone warnings. Dropbox metadata 504 already skips the poll and retries on the next active tick; it does not itself establish task loss.

The current nudge may upgrade an **untouched default once within 20 seconds**, before noon and without a real dismissal; otherwise About/wake/close carries late text. The temporary content-free About → Today readout remains until phone-first delivery is understood, then remove its UI and `display` audit events separately from judging the gentle swap. Do not reset live caches/votes or force an exposure to close a checklist.

### WEEK companion

Gated on 12c genuinely feeling like a companion. WEEK is accumulated relational awareness, not a planner; history volume or elapsed months alone is not an unlock.

### New week recognition

The repeated Monday intention was removed. A return needs a code-selected week-scale relationship/lifecycle change, a distinct useful choice beyond Today, novelty against Sunday/Today, honest abstention and a real-use verdict after 12c. No task-age/streak/peak-hour rewrite, badge rename or prompt-only return. Keep mixed-version Monday fields until a separate design decision.

### 9: Google Drive sync

**Parked:** one active provider; no Dropbox disruption/prompt, simultaneous sync or automatic cross-provider migration. Recorded direction is hidden app-data storage with one backup and manual export/import when switching; auth/API assumptions need revalidation.

Before building, review the current Connections lifecycle and extract/adapt shared merge behavior conservatively: pure primitives exist in `sync-merge.js`, while the full Dropbox controller remains in `dropbox.js`. Provider switching, deletion/merge parity, mutation saves, wake, tokens, Save/Restore/Forget and real-device convergence remain gates. No duplicated legacy controller or compatibility globals. [Historical draft](archive/Backlog-archive.md#google-drive-draft--historical-revalidation-required) is not current implementation authority; OneDrive/iCloud remain out.

---

## Watching / parked investigations

| Item | Current status / revisit trigger |
|---|---|
| CI reliability | **Open.** v2.97.9 corrects input timing and retains attribution from original measured runs. Available October 22–24 nightly evidence still has run-1 cold TBT 425/222/414ms against 200ms and two first-focus misses; later runs/separate replays were clean. Inspect original-run deployed GitHub evidence before claiming cause or fix. No raised budgets, discarded first runs, hidden failures or passing rerolls. |
| Memory AI hypotheses | Covered by [Memory](#memory-record-and-patterns): inspect existing confirmation/usefulness before adding generation or data. Keep separate from the KNOWN record verdict. |
| Suggestion outcome loop | Already bounded to 100 resolved offers; extend only on observed underperformance and changed action mix, without analytics. No current expansion task. |
| Shared ai-assist helper | Deferred D5 extraction; M1 is already live. If reopened, preserve full-content/valid-JSON parsing and each surface's privacy/delivery, one surface at a time under the gate. No broad nudge rewrite. |
| Chrome Built-in AI | Parked, not adoption approval. Reopen only for an actual local-classification need; verify current official support/device/privacy constraints and retain fallback. |

---

## Wallpaper Test — open verdicts

Resolve as **kept**, **iterated** or **removed** from actual exposure. No exposure means no verdict. Dated checkpoints are sorted first; elapsed dates remain overdue rather than silently renewed. [Resolved verdicts](archive/Backlog-archive.md#resolved-wallpaper-verdicts) are archived. Build completion and a repaired bug are not product keep verdicts.

| Surface | Due / trigger | Current status / next judgment |
|---|---|---|
| Observation pool — morning / Sunday | 2026-10-15 — overdue | **Iterate.** Review actual misses and quiet Sundays for evidence, novelty, usefulness and timing. Ordinary morning quality/delivery does not close this gate or unlock WEEK/New week. |
| Enrichment arrow arrival | 2026-10-20 — overdue | Wake repair verified October 22 (BUG-116). Still judge W1 useful arrival versus distraction; W2 one flash for fresh context, quiet cached hover. No quality verdict yet. |
| Connections sign-in attention | 2026-10-20 — overdue | W1 find the connection needing repair; W2 only expired Gmail/Dropbox/Calendar and quiet after opening Connections. Judge usefulness if reconnecting waits, not only the repair working. |
| Booking email context | 2026-10-20 — overdue | **Iterating.** W1 a relevant earlier confirmation can help rebook; W2 bounded task-grounded context without an automatic reply. Review wrong cards and useful cards withheld; BUG-117 verification remains separate. |
| Daily nudge quality / adaptive thinking | 2026-10-23 — overdue | W1 perceptive orientation beyond recap; W2 existing morning moment and bounded route. Judge wording/usefulness and latency independently. Historical decline is real; its cause is unproven. |
| Daily nudge delivery — BUG-118 | 2026-10-23 overdue; follow-up 2026-11-05 | **Re-observing v2.97.8.** W1 a useful morning must survive transient failure/false recap rejection; W2 bounded recovery with real dismissals final. Verify phone/desktop midnight, legacy recovery and strip/About agreement. Consolidates the older recovery and recap-filter rows without closing either check. |
| Memory → HOW DAYS FELT | 2026-10-25 | **Re-observing.** W1 recognizable relationship that can help a choice; W2 qualified comparison or silence, fenced to current evidence. Judge actual clarity/usefulness; #15's reaction integration is in progress, without a completed release/quality verdict. |
| Ordinary nudge feedback cycle (v2.98.1 prepared locally) | 2026-11-08 provisional | Existing votes feed the next eligible morning with recent landed/missed examples. No extra reaction UI, background experiment, critic delay or same-day rewrite. Observe actual readings through normal votes; not a model-score or fictional-test keep verdict. Move this +14-day checkpoint to actual release. |
| Feeling insight feedback (v2.98.0, 2026-10-25) | 2026-11-08 | W1 a vote can withhold an unhelpful unchanged insight and preserve valid useful wording. W2 existing sentence/reaction patterns, explained first vote, optional collapsed footer review; no new panel/count or cross-surface sensitive input. Local checks are not a keep verdict; verify installed behavior and usefulness after release. |
| Daily nudge length recovery | 2026-10-27 | **Re-observing.** W1 keep useful morning/About prose after a length miss; W2 one grounded shortening pass, not repeated prose hunting. Check delivery and retained meaning; no real-AI dismissal reset. |
| Triage touch countdown | 2026-10-27 | **Re-observing.** W1 enough time to read; W2 hold only during the active countdown, resume on release/cancel. Physical-phone naturalness/scrolling/choice check is still owed. |
| Memory → PATTERNS | 2026-10-27 | **Re-observing.** W1 corrected useful timing/outcome comparisons without HOW YOU WORK echo; W2 bounded list/qualified evidence. Judge valued lines and continued suppression of AI restatements. |
| Calendar-supported daily writer | 2026-10-28 target | W1 supported same-task continuity contrast; W2 rare explicit evidence without forced content or title import. Confirm deployed build and actual eligible use; no exposure means no verdict. |
| Desktop habit focus question | 2026-10-31 target | W1 a requested practical choice beyond the name; W2 name-only after Ask, no field/cue template. Confirm installed build and real usefulness/repetition; task Ask is a separate verdict. |
| Memory → KNOWN | 2026-11-01 | **Iterate October 18, v2.97.4 implemented.** W1 helps choose a return; W2 focus-backed returns lead, intentional waits inspectable. Judge whether it earns a visit without readiness inference or task reordering. |
| Task Focus Ask | 2026-11-07 provisional | **Iterate October 24, v2.97.10 committed/pushed.** W1 resolves a consequential uncertainty or supports a concrete move/wait; W2 explicit task-only Ask, neutral availability. Confirm deployment; shift +14-day checkpoint if needed. Samples are not real-use acceptance. |
| DreamBank M2 recurrence | next natural dream accumulation | **Extended.** M1 and dream sheet are kept/archived; M2 lacks enough exposure. Judge recognition versus a word count before M3. |
| Nudge readout / gentle default upgrade | once phone-first delivery is understood | **Temporary diagnostic.** Use the content-free Today readout to resolve the actual device path; then remove readout/`display` events. Judge the one bounded untouched-default upgrade separately. |
| Focus minutes / done count | if the October 18 miss recurs | **Holding (Can, October 20).** Capture surface/device/time, shown versus expected, and cross-device use before read-only stat/check/history inspection. No recurrence or new recording defect established. |
| Connections privacy reassurance | next genuine setup exposure | **Extended since October 5.** Existing credentials may bypass it; judge only when a real setup exposes the reassurance. |

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

*Poem curation, completed studies/build records and resolved Wallpaper verdicts live in `archive/Backlog-archive.md`. Current runtime contracts live in the architecture/design files; fixed-bug history is owned by `archive/Bugs-archive.md`.*
