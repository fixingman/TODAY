# Backlog

> **Forward-looking only: what to build next, what is parked, and which decisions remain.**
> Reviewed 2026-10-30 against v2.106.0 on dev/master. Shipped code is not an installed-device or usefulness verdict. Release/handoff history lives in [the archive](archive/Backlog-archive.md#release-and-handoff-snapshots--october-30-2026); defects belong to [Bugs.md](Bugs.md).

---

## ◎ North star (updated Aug 2026)

**TODAY is a longitudinal companion.** It accumulates real understanding of you — not your productivity stats, but your relationship with your own commitments. Over time it helps you see yourself more clearly, so you can make different choices.

The experience is calm. Opening TODAY in the morning shows an imprint of your life — choices you've made, not obligations staring back. No pressure, no shame, no guilt. A companion that speaks when it matters, holds space when it doesn't, and catches the blind corners you can't see yourself.

**The morning is TODAY's signature beat** — nudge (verdict 2026-07-18: kept, read every time), poem (#2), briefing (#7); everything else supports or follows. How intelligence and personalization serve this → `design/Personalization.md`.

---

## ▸ Roadmap

**Can’s top product priority remains AI continuous improvement, #15, targeting v3.0.0 (October 25 decision).** Preserve the original IDs; priority is work rank. Independent installed/account checks do not block design or implementation on another slice.

**Current baseline:** v2.106.0 is published to dev/master. Its full Linux dev proof passed 61 suites and all five performance runs; master verified reuse in 15 seconds. CI efficiency phases 1–3 are complete and [archived](archive/Backlog-archive.md#ci-efficiency-completion). Follow-up release metrics are routine maintenance, not another build initiative. Deployment, installed behavior and writing usefulness remain separate.

**Latest verification (October 30):** v2.106.1 (`946dc046`) is published to dev/master. Eight targeted suites and deployed offline/source checks verify technical BUG-136/134/131/128/127; those records are archived. Current master CI41042013402 fails pool-wording clearing/reflection display (59 passed, one flaky, one failed), so BUG-137 remains open. Earlier v2.106.0 release proof does not approve this newer SHA. CI-efficiency implementation remains complete; connected-account relevance, installed delivery and product usefulness retain their existing owners.

| Priority | ID | Item / details | Current status | Next action / gate |
|---|---|---|---|---|
| 1 | 15 | [AI continuous improvement — target v3.0.0](#15-ai-continuous-improvement) | Bounded feedback/next-use mechanisms shipped through v2.106.0; broader personal style and acceptance remain open | Agree the concrete 3.0.0 acceptance/scope and any explicit deferrals; use the [single sub-item queue](#15-sub-items). |
| 2 | — | [Release verification](#release-verification) | Installed/account checks and deployed performance follow-ups remain | Verify delivery and current installed behavior; keep BUG-135 separate from completed CI work; BUG-138 is verified closed. |
| 3 | — | [Memory record and patterns](#memory-record-and-patterns) | KNOWN iterated; PATTERNS re-observing | Preserve November 1 KNOWN and overdue October 27 PATTERNS checkpoints; HOW DAYS FELT belongs to #15B. |
| 4 | 14 | [Habit contextual companionship](#14-habit-contextual-companionship) | Desktop Ask kept; new morning contribution unbuilt | Existing Ask improvement belongs to #15D; a new morning relationship requires its own evidence/design decision. |
| 5 | 10b | [Calendar context](#10b-google-calendar-context) | Read-only foundation and timing-only daily-writer increment implemented | Finish account/eligible-use checks; Join / Record remains unbuilt. |
| 6 | 10a | [Granola meeting import](#10a-granola-meeting-import) | Not started; priority meeting-capture path | Revalidate API/auth and reviewed task chips before native calendar-led capture. |
| 7 | — | [WEEK companion](#week-companion) | Gated | #15C / 12c must feel useful; history volume or a common framework does not unlock it. |
| 8 | — | [New week recognition](#new-week-recognition) | Gated | Distinct week-scale relationship, novelty and earned silence after 12c. |
| 9 | 13 | [DreamBank](#13-dreambank) | M1 + sheet kept; M2 extended | Natural recurrence verdict remains separate; M3 and new dream-history input stay gated. |
| 10 | 2 | [Poem corpus](#2-poem-corpus) | Ongoing; 159 poems | Broaden voices/geography; summer needs one to reach the existing target. |
| 11 | — | [First-run orientation](#open-decisions) | Open product decision; unbuilt | Decide deliberate minimalism versus minimum orientation before building. |
| 12 | 9 | [Google Drive sync](#9-google-drive-sync) | Parked | Revalidate auth/shared merge/current Connections before implementation. |


---

## Item details

### 12c: Observation pool

**Owner: [#15C](#15-sub-items), retaining ID 12c.** Phases 0–3 and later correctness/wording increments are implemented. Phase 4 remains **iterate** (Can, September 30); the October 15 usefulness checkpoint is overdue. Useful ordinary task-reading lines are not a pool keep verdict. WEEK/New week remain gated.

**Next:** review naturally encountered mornings/Sundays for truth, novelty, a choice the reading could help, and timing. For quiet Sundays, distinguish earned silence from readiness/delivery failure before changing prompts. The aggregate audit can help; no recurring console packet or forced generation is required.

**Preserve:** code selects evidence/relationship/eligibility and the model phrases one reading. Keep same-surface fixed concerns, unknowns, source/clear/sync fences, kind retirement/cooldowns and seven-date truth. Exact lines/votes/private reasons stay in private synced spokenLines/Dropbox, not repo fixtures. Contracts: `architecture/AI.md`, `design/Personalization.md`; build/test history is archived.

Ordinary morning quality/delivery remains separate under #15A and release verification. No private reasons or whole vote ledger to AI, keyword veto, inferred zeroes or automatic policy change.


### 15: AI continuous improvement

**Priority 1; release target v3.0.0 — Can, October 25.** Improve when AI helps, which supported content it chooses and how it writes through normal use. [The reviewed plan](../docs/ai-improvement-cycle.md) owns architecture/privacy/acceptance; this table owns the work queue. [Detailed nudge/feeling contracts](../docs/feedback-learning-plan.md) and [completed studies](archive/Backlog-archive.md#ai-feedback-and-evaluator-studies--october-25-2026) are references, not new recurring tasks.

**Before the 3.0.0 cut:** agree concrete acceptance and any explicitly deferred personal-style work. Fixed concerns, safety fixes, repetition control and changed sentences do not by themselves finish the broader style goal. Keep separately shipped prerequisites at their actual versions; cut app/SW and both changelogs together only for the agreed scope. No artificial schema migration or automatic critic is implied.

#### #15 sub-items

Execution order is independent of the letters. Implemented mechanisms are not a new build queue; product/installed acceptance stays open until supported by actual use.

| Execution order | ID | Work / consolidated source | Current status | Remaining action / acceptance |
|---|---|---|---|---|
| 1 — acceptance | 15A | Morning loop and delivery | Balanced ordinary feedback/next-morning context shipped; v2.106.2 dev candidate fixes accepted-reading stability | Verify normal vote pickup, helper/fallback provenance, delivery (BUG-118) and writing usefulness. BUG-139 local fix passes eight affected suites and56 desktop/touch delivery cases, retaining an accepted About reading and vote after local/synced completions; one shared word is not a task link. Preserve writer freedom and existing daily boundaries; no metadata or extra AI call. Optional verified task relationships remain a future design option, not part of this fix. Do not rebuild the activated adapter. |
| 1 — style design alongside | 15B | HOW DAYS FELT safety and writing style | Retention/export/incoming-merge safety, clearer day/evening framing and optional wording feedback shipped | Verify installed behavior and real clarity/voice. Define a meaningful permitted mechanism for broader personal style or agree an explicit deferral; prior feeling prose stays private. |
| 3 — usefulness | 15C / 12c | Pool morning and Sunday | Selection/correctness and same-surface fixed-concern wording shipped | Judge natural-use clarity, novelty, timing and earned silence. Keep revision/clear/sync and selection meanings; iterate is not closed by tests or an ordinary-nudge success. |
| 2 — usefulness | 15D | Focus Ask, tasks and habits | v2.106.0 adds same-owner/device concerns across sessions; whole votes remain session-only | Confirm installed build and later explicit Ask usefulness. Keep the 7-day / 20-owner / 16 KiB support, source/clear/expiry fences, no old-answer prose, and no cross-owner/surface transfer. Broader learned style remains open. |
| 4 — relevance and writing | 15E / 11 | Web/Trello cards and Gmail context/drafts | Ownership, exact-card controls, requested alternatives and bounded next-use wording/selection shipped | Judge installed relevance/clarity and actual writing. Gmail thread rejection stays task-local; device-local cross-task wording is explicitly approved. Preserve retention/clear and no draft-prose reuse; BUG-117/account checks stay separate. |
| Existing machinery — acceptance | 15F | Post-add suggestions/outcomes | Recovery, source-index application, stale-Apply guards and confirmed oil eligibility shipped through v2.106.0 | Verify useful offers in normal installed capture. Keep newest-capture cancellation, original wording, outcome/frequency meanings and conservative unsupported syntax. No automatic analysis of old tasks is approved. |
| Throughout — maintenance | 15G | Shared contracts, evaluation and release assurance | CI efficiency phases 1–3 complete; scoped regression/release checks remain | Apply existing per-slice safety/evaluation checks. Track deployed startup BUG-135 separately; hosting RUM BUG-138 is verified closed; automatic critic and D5 extraction stay parked. |

**Completion rule:** each slice must show its normal trigger → actual result → feedback/current-source effect → next eligible use, with privacy/clear/sync and fallback preserved. Correctness, repetition/card control and personalized style are distinct. Sparse/unavailable signals stay an open goal, not an infinite dependency or permission for more collection. No manual console operating cycle, automatic prompt edits or default extra judge calls.


### Task Focus Ask

**Owner: [#15D](#15-sub-items).** Task/habit Ask and same-owner wording are published through v2.106.0. Facts remain task-only/name-only; whole-reply votes stay in the current session. Explicit fixed wording concerns may affect a later requested answer for that same owner/device within the bounded support. This is not broader persistent personal style or permission for other task history.

**Next:** confirm installed behavior and judge repeated generic wording, unsupported assumptions, concrete help and deliberate waits through normal use. Keep the existing November 7 provisional Ask checkpoint; the newer same-owner wording loop has its own exposure-based review. Mock/format/lifecycle checks and older model comparisons are not usefulness verdicts. No chat, answer field or background generation is approved. Contracts: `architecture/Focus.md`, `architecture/AI.md`.


### Memory record and patterns

**KNOWN:** v2.97.4 implements the October 18 iterate verdict: focus-backed returning tasks lead, intentional Soon waits stay inspectable under show waiting, zero recorded focus does not mean unstarted, outcome counts sit in coverage and Dreams is last. **Next:** November 1 check on whether the record helps choose what to revisit; implementation is not a keep verdict.

**PATTERNS:** merged list and corrected obligation/return calculations are implemented; October 27 checks whether valued lines still help and AI restatements stay gone. Inspect existing semantic/procedural/episodic confirmation statuses before adding generation or sources; Can's limited interest is not permission to expand collection.

**HOW DAYS FELT:** now owned by [#15B](#15-sub-items), including the October 25 clarity/usefulness verdict. v2.98.0 reaction/retention/sync foundation is pushed, without a style-learning or accepted real-use verdict. A source feeling is not a reaction to its reading. Memory hierarchy/KNOWN/PATTERNS remain separate; do not collect more to fill the panel.

### 13: DreamBank

**Remaining:** M2 “comes back” recognition has too little natural exposure for a verdict. Re-observe as dreams accumulate; do not call it kept because M1's analysis/closing question or the dream sheet was kept. [M1 and sheet verdicts](archive/Backlog-archive.md#dreambank-m1-and-dream-sheet) are complete.

M2 recurrence is on-device over existing images/people, not new AI matching or a stored lexicon. Add semantic matching only if real use shows missed recurrences. **M3 callbacks/Sunday/task links remain gated on M2.** Multi-dream capture is deferred until Can actually wants separately told dreams split; one capture remains one dream. Contracts and locked design decisions remain in `architecture/AI.md` and the completed record; no private dream body becomes a repo fixture.

### 2: Poem corpus

**Current verified count:** 159 — winter 18, spring 18, summer 15, autumn 18, year-round 90. Summer needs one to reach the existing target of 16; the other seasonal pools already exceed it. Expansion is ongoing, not an unresolved shuffle fix.

**Next search:** broaden geography/voice, especially Africa, Latin America, Middle East and Southeast Asia, and ordinary lived detail around choosing/keeping/loosening/returning. Diversity is a tie-breaker, not a quota. New candidates are human-written, spare, concrete, held/affirming and 2–6 displayed lines; grandfathered longer approvals are not a new precedent.

Follow the recorded author/translator worldwide-PD or verified CC0/dedication rule; preserve the five approved US-only exceptions without extending that route. No AI rewrites or silent translation modernization. Read the [curation ledger](archive/Backlog-archive.md#poem-curation-ledger) before proposing anything: permanent cuts, exceptions and pending leads remain authoritative. [Source-discovery conventions](Housekeeping.md#research-and-session-conventions) still apply.

### 10a: Granola meeting import

**Not started; priority path:** manual structured meeting notes/action import through a revalidated Granola API/auth contract, then extraction and reviewed task chips. Build before native calendar-led capture; the integration is independent of TODAY's Calendar connection. Gate: are the proposed chips what the person would have written themselves? Existing endpoint/MCP sketches need fresh validation before implementation.

### 10b: Google Calendar context

**Implemented:** separate read-only primary-Calendar foundation and v2.96.0 timing-only support for the ordinary daily writer. [Build/release/test history](archive/Backlog-archive.md#calendar-foundation-and-first-daily-increment) is complete; runtime boundaries live in `architecture/Connections.md` and `architecture/AI.md`.

**Open account checks:** verify the current installed build, read-only consent/scope, refresh, Retry and Forget on desktop; repeat Connect and those checks on phone. Existing Gmail permissions must remain unchanged. The October 28 daily-writer checkpoint needs actual eligible use; no exposure is not a usefulness verdict and must not be manufactured by rewriting tasks or clearing the day's line.

**Keep the increment narrow:** one supported same-task continuity/deadline relationship, fresh complete intervals and a bounded lazy read; omit context for unknown/open/stale/slow input. No task-duration guess, event-title matching, raw events/titles/participants/intervals to AI/storage, agenda, new scopes or routing changes. Pool/Sunday/focus remain outside this integration. Delivery fences and ordinary recovery stay with the owning writer.

**Still unbuilt:** Join / Record offer after real-account checks and a separate design/W1–W2 pass; resolve no-link, overlapping-event and PiP behavior. Calendar is input, never output; a timed event is not proof of attendance and never authorizes auto-recording. Preserve in-room/speakerphone limits on mobile. Capture/transcription comparisons wait for real recordings; no new bake-off is owed now.

### 11: Task enrichment

**Owner: [#15E](#15-sub-items), retaining ID 11.** Web/Trello and Gmail ownership/controls are shipped, including fixed-concern next-use wording, exact-thread rejection/next selection and explicit bounded alternatives. Existing cache/source/grant/clear/expiry and late-response fences remain. Feedback makes no automatic request and accepted caches stay stable.

**Remaining:** the October 20 relevance verdict is overdue. Observe helpful context, wrong cards and useful cards withheld by matching, particularly booking email context. Fresh-arrival wake repair is verified; the cue's usefulness remains open. The actual eight-output web/Trello writing comparison was mixed/**iterate**, not evidence of broad learned taste; Gmail's actual writing/installed acceptance also remains open.

BUG-117 and other mail/account checks stay with `Bugs.md`. Opening/editing/copying a draft proves neither truth nor sending. No extra scopes, autonomous send, inferred provider preference, semantic mailbox model or importing others' email as tasks. Calendar's timing permission does not extend here. Contracts: [web/Trello](../docs/enrichment-feedback-plan.md), [Gmail](../docs/gmail-feedback-plan.md), `architecture/AI.md`, `research/Integrations.md`.


### 14: Habit contextual companionship

**Implemented:** desktop habit-specific Ask in v2.97.0, name-only input after an explicit tap. It is committed, not merely a local prototype. [Rejected UI, revised prototype, wording checks and release decisions](archive/Backlog-archive.md#habit-desktop-slice-and-completed-design-studies) are historical. **Verdict (Can, 2026-10-25):** seldom used but kept — habits now act like tasks, which is consistent and worth having. Not crucial, but not a candidate for removal. The latest Read refinement was not live-sampled; this verdict is based on real use, not syntactic validity.

**Scope split:** improvements to the existing desktop habit Ask belong to [#15D](#15-sub-items); that does not reopen its keep verdict.

**Separate, unbuilt follow-up:** a meaningful preparation relationship in the existing morning reading, not a saved Moment field or reminder. Establish evidence, extra value beyond a name recap, competition with the ordinary reading, repetition/checked/weak-evidence withholding, privacy and selection before wiring. Keep ordinary daily delivery unchanged when no habit relationship qualifies; desktop question usefulness does not establish morning usefulness.

The underlying habit/context idea remains open. Preserve the actual Habits component, name/check-off flow, history/strength, ordering, archive/undo, sync, 3am grace and existing evening attention. No required cue-bearing name, new field, completion-triggered offer, task-linking setup, automatic check-off or retrospective cue-adherence claim. No unobserved call/meal/bedtime inferred from a check or Calendar. Substantive future design uses actual components with Claude as specified in `design/ProductThinking.md`; research/design limits live in `design/Personalization.md` and `research/Psychology.md`.

### Release verification

**Hosted release assurance is complete for v2.106.0:** the exact Linux dev proof covers 61 suites and all five performance runs; master verified reuse plus cheap checks. This closes the CI-efficiency rollout, not installed/account or product acceptance.

**Still open:**

- BUG-118: phone/desktop morning delivery, legacy rejection recovery and strip/About agreement through normal use.
- BUG-139 (v2.106.2 dev candidate): verify the accepted About reading and its vote survive completion/sync without a replacement request; the fix leaves the writer unchanged. Publication and installed pickup remain pending.
- BUG-135: deployed/installed startup evidence. Retain the failed local/deployed measurements; the accepted Linux release proof does not erase them or establish deployed recovery.
- Current installed Calendar/mail relevance and other explicit account checks remain with [Bugs.md](Bugs.md) and the relevant product item. Technical source/cache/request ownership BUG-127/128 and precache BUG-136 are independently verified and archived; this does not close account relevance or normal installed experience. BUG-137 still owns the current hosted pool/reflection failures.
- Ordinary two-device sync experience remains an installed check; BUG-130's confirmed unread-revision defect is already verified/archived and is not reopened as an implementation task. Do not promise a delivery SLA or lower polling to conceal latency.

Keep the normal fresh-poem/midnight and two-device zone behavior checks; their accepted technical bug fixes stay closed. The one untouched-default nudge upgrade remains bounded to 20 seconds/before noon/no real dismissal. Use the temporary content-free About → Today readout only until phone-first delivery is understood, then remove the readout and display audit events as a separate cleanup. Do not reset live caches/votes or force exposure to close a checklist.


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
| Deployed startup | BUG-135 remains separate from completed CI efficiency. Startup/readiness changes and the pinned Linux gate do not close deployed/installed performance. BUG-138 is [verified closed](archive/Bugs-archive.md#bug-138--hosting-appends-real-user-monitoring); RUM removal does not establish performance recovery. Preserve original failures and limits; use the existing deployed workflow/explicit checks, not passing rerolls. |
| Memory AI hypotheses | Inspect existing confirmation/usefulness before adding generation or data; keep separate from the KNOWN record verdict. |
| Suggestion outcome loop | Owned by #15F; preserve existing bounded policy rather than creating another build queue. |
| Shared ai-assist helper | D5 extraction stays deferred and is not a prerequisite for #15G. Reopen separately only with preserved per-surface delivery/privacy; no new orchestrator or broad rewrite. |
| Chrome Built-in AI | Parked, not adoption approval. Reopen for an actual local-classification need and revalidate official support/device/privacy/fallback constraints then. |


## Wallpaper Test — open verdicts

Resolve as **kept**, **iterated** or **removed** from actual exposure. No exposure means no verdict. Publication labels below reflect master history; deployed/installed exposure is still checked separately. Existing due/provisional dates are preserved, not silently restarted. [Resolved verdicts](archive/Backlog-archive.md#resolved-wallpaper-verdicts) remain archived.

### Dated checkpoints

| Surface | Due / trigger | Current status / next judgment |
|---|---|---|
| [#15C / 12c](#15-sub-items) — pool morning / Sunday | 2026-10-15 — overdue | **Iterate.** Review actual misses and quiet Sundays for evidence, novelty, usefulness and timing. Ordinary morning quality/delivery does not close this gate or unlock WEEK/New week. |
| [#15E](#15-sub-items) — enrichment arrow arrival | 2026-10-20 — overdue | Wake repair verified October 22 (BUG-116). Still judge W1 useful arrival versus distraction; W2 one flash for fresh context, quiet cached hover. No quality verdict yet. |
| Connections sign-in attention | 2026-10-20 — overdue | W1 find the connection needing repair; W2 only expired Gmail/Dropbox/Calendar and quiet after opening Connections. Judge usefulness if reconnecting waits, not only the repair working. |
| [#15E](#15-sub-items) — booking email context | 2026-10-20 — overdue | **Iterating.** W1 a relevant earlier confirmation can help rebook; W2 bounded task-grounded context without an automatic reply. Review wrong cards and useful cards withheld; BUG-117 verification remains separate. |
| [#15A](#15-sub-items) — daily nudge quality / thinking | 2026-10-23 — overdue | W1 perceptive orientation beyond recap; W2 existing morning moment and bounded route. Judge wording/usefulness and latency independently. Historical decline is real; its cause is unproven. |
| Daily nudge delivery — BUG-118 | 2026-10-23 overdue; follow-up 2026-11-05 | **Re-observing v2.97.8.** W1 a useful morning must survive transient failure/false recap rejection; W2 bounded recovery with real dismissals final. Verify phone/desktop midnight, legacy recovery and strip/About agreement. Consolidates the older recovery and recap-filter rows without closing either check. |
| [#15B](#15-sub-items) — HOW DAYS FELT | 2026-10-25 — overdue | **Re-observing.** W1 recognizable relationship; W2 qualified comparison or silence fenced to current evidence. Feedback foundation shipped in v2.98.0; usefulness and writing-style verdicts remain open. |
| [#15A](#15-sub-items) — nudge length recovery | 2026-10-27 — overdue | **Re-observing.** W1 keep useful morning/About prose after a length miss; W2 one grounded shortening pass, not repeated prose hunting. Check delivery and retained meaning; no real-AI dismissal reset. |
| Triage touch countdown | 2026-10-27 — overdue | **Re-observing.** W1 enough time to read; W2 hold only during the active countdown, resume on release/cancel. Physical-phone naturalness/scrolling/choice check is still owed. |
| Memory → PATTERNS | 2026-10-27 — overdue | **Re-observing.** W1 corrected useful timing/outcome comparisons without HOW YOU WORK echo; W2 bounded list/qualified evidence. Judge valued lines and continued suppression of AI restatements. |
| Calendar-supported daily writer | 2026-10-28 target — exposure unconfirmed | W1 supported same-task continuity contrast; W2 rare explicit evidence without forced content or title import. Confirm deployed build and actual eligible use; no exposure means no verdict. |
| Memory → KNOWN | 2026-11-01 | **Iterate October 18, v2.97.4 implemented.** W1 helps choose a return; W2 focus-backed returns lead, intentional waits inspectable. Judge whether it earns a visit without readiness inference or task reordering. |
| [#15D](#15-sub-items) — Task Focus Ask | 2026-11-07 provisional | **Iterate October 24, v2.97.10 committed/pushed.** v2.101.0 feedback W1/W2: a rating affects the next explicit same-owner Ask without an interruption, extra model call or new collection. Feedback W3 due deployment +14 days (November 10 if deployed October 27); installed and real-writing acceptance remain open. W1 resolves a consequential uncertainty or supports a concrete move/wait; W2 explicit task-only Ask, neutral availability. Confirm deployment; shift +14-day checkpoint if needed. Samples are not real-use acceptance. |
| [#15A](#15-sub-items) — ordinary feedback (published v2.98.1 foundation) | 2026-11-08 provisional | Existing votes feed the next eligible morning with recent landed/missed examples. No extra reaction UI, background experiment, critic delay or same-day rewrite. Observe actual readings through normal votes; not a model-score or fictional-test keep verdict. Move this +14-day checkpoint to actual release. |
| [#15B](#15-sub-items) — feeling feedback (v2.98.0) | 2026-11-08 | W1 a vote can withhold an unhelpful unchanged insight and preserve valid useful wording. W2 existing sentence/reaction patterns, explained first vote, review inline within HOW DAYS FELT block; no new panel/count or cross-surface sensitive input. Local checks are not a keep verdict; verify installed behavior and usefulness after release. |
| #15E Gmail next-result feedback (published v2.104.0) | 2026-11-11 provisional; confirm deployment/exposure | W1 a rejection changes the next same-task selection and an explicit wording concern reaches the next requested draft. W2 optional native controls inside the existing Gmail block, no automatic call/survey/panel. Judge real relevance/clarity rather than changed sentences; set the date from actual release. |
| #15C optional wording loop — v2.105.0, dev/master publication October 28 | November 11 (release +14 days) | W1 optional feedback addresses a concrete clarity/formality concern on the next eligible same-surface reading. W2 existing signal-gated sentence/reaction shell; no extra call or mandatory vote. Observe whether writing improves; no automatic keep verdict, WEEK/New week or inferred personal style. |
| [#15E](#15-sub-items) — wording / requested alternative (shipped v2.103.0) | 2026-11-11 — release +14 days | W1 future context can follow an explicit wording concern and a rejected card has a deliberate recovery path. W2 optional controls inside the existing card; fixed local bounds; no request on rating and one explicit alternative per visit. Actual fictional writing verdict iterate. Judge normal next-card/recovery usefulness and revise/remove if it does not earn its place. Release requested October 28; keep/iterate/remove remains open. |

### Exposure-dependent follow-ups

These already-shipped mechanisms still need a confirmed release/exposure date or natural use. Do not describe them as unbuilt/local prototypes, assign a new date without evidence, or manufacture exposure.

| Surface | Due / trigger | Current status / next judgment |
|---|---|---|
| About → Today accepted-reading retention (v2.106.2 dev candidate, BUG-139) | Confirmed deployment +14 days; date unconfirmed | W1 revisit the accepted daily reading and vote after task progress. W2 existing Today block, dated cache and feedback controls; no extra call, prompt or new UI. Local shared-word/completion/sync/vote/noon/rollover checks verify correctness. Judge normal availability after installed pickup; broader writing usefulness remains #15A. |
| #15B optional wording feedback (published v2.100.0; approved October 27) | 14 days after actual release | W1 an explicit wording concern changes permitted guidance on the next eligible feeling generation; W2 optional collapsed controls inside the existing reaction, no mandatory second vote or new panel. Compare actual clarity/voice; passing tests do not establish preference or quality. |
| #15E exact-card control (published v2.99.1) | 14 days after actual release | W1 remove unhelpful context and resume the task; W2 existing card/action row, optional local hide/Undo with no survey or extra call. Technical correctness is separate from relevance/style learning. |
| #15F post-add recovery (published v2.99.1, BUG-129) | 14 days after actual release | W1 useful capture-time help survives a brief outage; W2 latest unchanged capture only, two-minute window and one retry with existing frequency/viewport limits. Verify actual delivery/usefulness after release; no automatic old-task review. |
| #15D same-owner Focus wording — published v2.106.0 | Confirmed deployment/exposure +14 days; date unconfirmed | W1 explicit concerns can improve a later requested answer for the same owner; W2 existing Ask/hidden feedback shell, no automatic call or mandatory vote. Verify wording usefulness through normal use; no model-quality claim from mock providers. |
| #15C Sunday fallback integration (published v2.99.1, BUG-126) | 14 days after actual release | W1 a reading respects rejected kinds and accurately describes supported actions; W2 existing Sunday component, one qualified reading or silence, no extra call/controls. Technical checks do not establish usefulness; the older pool iterate verdict stays open. |
| DreamBank M2 recurrence | next natural dream accumulation | **Extended.** M1 and dream sheet are kept/archived; M2 lacks enough exposure. Judge recognition versus a word count before M3. |
| Nudge readout / gentle default upgrade | once phone-first delivery is understood | **Temporary diagnostic.** Use the content-free Today readout to resolve the actual device path; then remove readout/`display` events. Judge the one bounded untouched-default upgrade separately. |
| Focus minutes / done count | if the October 18 miss recurs | **Holding (Can, October 20).** Capture surface/device/time, shown versus expected, and cross-device use before read-only stat/check/history inspection. No recurrence or new recording defect established. |
| Connections privacy reassurance | next genuine setup exposure | **Extended since October 5.** Existing credentials may bypass it; judge only when a real setup exposes the reassurance. |

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

*Completed build/study/release records and superseded handoffs are archived; current runtime contracts live in the architecture/design files. Product priorities and unaccepted verdicts above are unchanged.*
