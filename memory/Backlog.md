# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Completed build/review history → `archive/Backlog-archive.md`; shipped changes → `Changelog.md`; bug verification → `Bugs.md`. Completed implementation can still have an open real-use check. Reviewed 2026-10-25.

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

**Can’s top product priority (October 25): AI continuous improvement, #15.** Related feedback, writing and relevance work is grouped under that parent rather than competing as separate roadmap initiatives. **Priority** is the work rank; **ID** preserves the original reference. Release/data-safety gates still apply without making every unrelated open verification a prerequisite for planning or implementation.

| Priority | ID | Item / details | Current status | Next action / gate |
|---|---|---|---|---|
| 1 | 15 | [AI continuous improvement — target v3.0.0](#15-ai-continuous-improvement) | Foundations published; Gmail v2.104.0 dev; pool/Sunday wording v2.105.0 | [15A–15G sub-items](#15-sub-items): verify installed writing usefulness of the bounded pool/Sunday loop. Broader personal style, pool usefulness and agreed 3.0.0 acceptance remain open. |
| 2 | — | [Release verification](#release-verification) | BUG-118 delivery verification open | Observe real morning-nudge delivery. Keep #15A’s failed performance gate explicit; unrelated account/device checks do not block #15 design work. |
| 3 | — | [Memory record and patterns](#memory-record-and-patterns) | KNOWN iterated; PATTERNS re-observing | Preserve November 1 / October 27 verdicts. HOW DAYS FELT writing and feedback now belong to #15B. |
| 4 | — | [CI reliability](#watching--parked-investigations) | CI phases1–2 prepared for v2.105.2 dev; full gate remains active in shadow mode | Verify exact-commit hosted Linux and two normal shadow reports before reducing dev checks. Conservative full fallbacks, original failures and unchanged budgets remain; phase3 release reuse is planned. [Plan](../docs/ci-efficiency-plan.md), [audit](../docs/ci-phase2-audit.md). |
| 5 | 14 | [Habit contextual companionship](#14-habit-contextual-companionship) | Desktop Ask kept; a new morning habit contribution remains unbuilt | Existing Ask improvement belongs to #15D. A new morning relationship remains a separate evidence/product decision. |
| 6 | 10b | [Calendar context](#10b-google-calendar-context) | Foundation + timing-only increment implemented | Finish account checks/eligible-use verdict; #15A may improve the existing writer, not widen Calendar input. Join / Record remains unbuilt. |
| 7 | 10a | [Granola meeting import](#10a-granola-meeting-import) | Not started; priority meeting-capture path | Revalidate API/auth and reviewed action-chip flow before native calendar-led capture. |
| 8 | — | [WEEK companion](#week-companion) | Gated | #15C / 12c must genuinely feel useful; history volume or a common feedback framework does not unlock it. |
| 9 | — | [New week recognition](#new-week-recognition) | Gated | Distinct week-scale relationship, novelty and earned silence after 12c. |
| 10 | 13 | [DreamBank](#13-dreambank) | M1 + dream sheet kept; M2 extended | Natural recurrence verdict stays separate; #15 inventory coverage does not unlock M3 or new dream-history input. |
| 11 | 2 | [Poem corpus](#2-poem-corpus) | Ongoing; 159 poems verified | Broaden voices/geography; summer needs one to reach the existing target. |
| 12 | — | [First-run orientation](#open-decisions) | Open product decision; unbuilt | Decide deliberate minimalism versus minimum orientation before building. |
| 13 | 9 | [Google Drive sync](#9-google-drive-sync) | Parked | Revalidate auth/shared merge architecture/current Connections before implementation. |

---

## Item details

### 12c: Observation pool

**Owner: [#15C](#15-sub-items), retaining ID 12c.** The former standalone roadmap row is consolidated under AI continuous improvement; the contract and open verdict remain here.

**Status:** phases 0–3 implemented; Phase 4 **iterate** (Can, September 30), with the October 15 usefulness checkpoint still overdue. Sampled pool lines have not landed; useful ordinary task-reading lines are not a pool keep verdict. WEEK and New week stay gated.

**Next:** privately review available mornings and Sundays for truth, novelty, a choice it could help, and timing. For quiet Sundays, inspect eligibility/data/delivery before prompts; silence must be earned. Do not repeat the expired October 4/11 observation plan as future work or reopen closed wording passes from a small sample.

**15C.1 engineering status:** the week-shape fallback was introduced in v2.98.2; BUG-126's qualification, feedback, seven-date truth, audit and source/late-response corrections shipped in v2.99.1 and have accepted verification. This integration is implemented, not a pending parallel handoff. Product usefulness remains iterate.

**Current correction (October 27, v2.101.1 dev release / BUG-134):** reject tied let-go reasons as a majority and scope supported insights to reasons actually supplied. Missing reasons do not establish the cause of all releases. Original policy/browser failures are retained; 130 policy checks, the complete About suite, lint and payload pass in the working tree and published-baseline control. Kind identity, retirement, cooldowns, existing caches and request frequency are unchanged. No new personal style mechanism or collection.

**Remaining review:** use naturally encountered readings and existing private reactions to judge truth, novelty, the choice a reading could help and timing. The handoff supplied no current private reading/delivery history, so no new Can verdict or explanation for a particular quiet Sunday is inferred. The existing aggregate audit can distinguish earned silence from readiness/delivery failure; no recurring console packet or forced generation is required.

**Current contracts:** code selects evidence/relationship/eligibility, the model phrases one reading; morning needs a hook in today's list, Sunday may use other eligible outcome relationships. Preserve unknowns, cross-surface cooldowns and material-change reopening. No retired productivity-stat kinds, biography from unconfirmed hypotheses, or inferred zeroes from missing records. Owners: `assets/week-reflection-policy.js`, `architecture/AI.md`, `design/Personalization.md`.

**Ordinary morning quality — separate:** preserve the existing writer while collecting real reactions. October 22 reviews support concrete consequences, practical orientation and calm permission, without a blanket ban on age, counts or routine. A missed reading does not reject its task. No private reasons or whole vote ledger to AI; no keyword veto or automatic policy change. Delivery belongs to [release verification](#release-verification); bounded feedback/evaluator work belongs to [#15](#15-ai-continuous-improvement).

Exact lines, votes and optional reasons stay in private synced `spokenLines` / Dropbox, not repo fixtures. [Completed writing/messaging studies](archive/Backlog-archive.md#ordinary-nudge-implementation-and-completed-messaging-studies) preserve the reasons earlier candidates were not promoted.

### 15: AI continuous improvement

**15C wording continuation (v2.105.0):** Can approved optional hard-to-follow / too-formal feedback on October 28. The existing morning/Sunday reaction disclosure now offers wording feedback on an actually displayed pool reading; only fixed concerns guide the next otherwise eligible writer on that same surface. Previous sentences and private miss reasons stay out of the writer. Choices revise, toggle, Undo and clear; exact-reading identity, original 30-day support, independent synced event clocks and clear watermarks prevent stale backups or late replies restoring influence. Added optional schema 5.5 metadata is capped at 32 KiB; no new store, retention, automatic request or critic. Whole votes keep selection/cooldown/retirement meaning. [Approved implementation contract](../docs/pool-wording-plan.md). The isolated v2.105.0 candidate passes 55 functional suites with zero flaky/failed results and all five performance runs within unchanged budgets (1202.5 KiB decoded / 340.7 KiB Brotli / 38 eager scripts). All 121 frozen source fingerprints remain unchanged. In the shared Root checkout, all 52 pool groups plus sync merge, CI policy/tooling, design/component, smoke, payload and actual offline-helper checks pass; Root payload is 1202.7 KiB decoded. These results do not claim a full combined 58-suite release gate for the separate pending Focus/oil/CI work. Original diagnostic failures stay retained. Live prose quality and installed usefulness remain open.

**v2.105.1 verification follow-up:** require the actual DM Mono weights in pool fixtures after decoding their encoded URLs. The old server fails this assertion and the corrected52 groups pass. Can reserved this patch for the pool release; the separate CI release must rebase afterward. Product writer/feedback behavior stays the v2.105.0 contract. The frozen v2.105.1 candidate passes 55 suites, zero flaky/failed, and all five performance runs within unchanged limits: 1202.5 KiB decoded / 340.6 KiB Brotli / 38 eager scripts. All 121 source/test fingerprints remain unchanged. All assets/*.js remain byte-identical to v2.105.0; only tests and release metadata change. Exact-commit hosted checks remain separate.

**15E Gmail continuation (v2.104.0 dev):** feedback now has a concrete next-use mechanism in the existing mail domain. Rejecting a displayed thread changes the next explicit same-query selection for that task; optional fixed wording concerns guide later requested Gmail drafts on this device. No call on a vote, prior email/draft prose reuse, inferred satisfaction, new mailbox access or sending. Can explicitly approved same-device cross-task Gmail wording guidance on October 28; old task-only votes keep their scope. Current support stays within 24h and 20 owners/16KiB in the existing local cache, with revision/Undo/clear, source/grant/owner/expiry and late-response fences. Existing 42 Gmail checks and 37 new actual-component groups pass. Combined local release checks pass: 54 suites, zero flaky/failed results, all five performance runs and unchanged payload budgets (1200.7 KiB decoded / 340.8 KiB Brotli / 38 eager scripts). Dev publication approved October 28; hosted CI/deployment, actual writing comparison and installed usefulness remain separate. [Concrete contract](../docs/gmail-feedback-plan.md). The scoped Gmail dev candidate also passes all 54 suites (zero flaky/failed) and all five performance runs with unchanged budgets: 1200.5 KiB decoded / 340.8 KiB Brotli / 38 eager scripts. All 157 runtime/test fingerprints remain unchanged. This release excludes the pending Focus/accessibility and oil-splitting edits.

**15G input-model follow-up (October 28, v2.103.5):** the v2.103.4 hosted runs both pass 52 suites and still fail Focus. Font diagnostics locate the JS-desktop/native-CSS-no-hover mismatch; a longer answer did not repair it. Consistent test-only hardware predicates preserve production declarations and width/motion queries, with explicit agreement checks. The critical case now runs under real native no-hover hardware and retains all scrolling, rating, keyboard and 320px assertions; the old fixture fails locally and the corrected 29 groups pass. The frozen v2.103.5 candidate passes all 53 functional suites with zero flaky/failed results and all five performance runs with unchanged limits; payload passes at 1201.1 KiB decoded / 340.9 KiB Brotli / 38 eager scripts. All 149 runtime/test fingerprints stay unchanged across the gates. Original failures and no-hover before/after controls remain retained. Exact-commit hosted confirmation and installed acceptance are separate. Production behavior, deadlines and budgets are unchanged.

**Hosting follow-up — BUG-138:** Netlify appends RUM to both origins outside the repo, contrary to Rule 32. Can has been asked to disable the setting; verify both deployed HTML responses before claiming it removed. Browser connection and Netlify credentials are unavailable.

**Earlier v2.103.4 local evidence:** startup audio and incomplete offline-update repairs are implemented, with causal before/after controls and the original failures retained. Both v2.103.2 hosted runs passed 52 suites and exposed one remaining fixture assumption: a short answer fits at 320px on Linux and correctly stays stationary. The follow-up uses a valid 14-word answer, checks desktop fit/no motion, and retains narrow scrolling, widening, exact text/reaction, native overflow-reporting checks and all deadlines. The revised isolated full gate passes 53 suites with zero flaky/failed results; the proportional-font Focus control passes all 29 groups. No runtime policy or release budget changes. All five v2.103.4 performance runs pass unchanged budgets: worst cold blocking 67 ms / 200 ms, cold FCP 6712 ms / 7000 ms, warm FCP 124 ms / 500 ms and Focus 38 ms / 300 ms. Payload is 1201.1 KiB decoded / 341.0 KiB Brotli with 38 eager scripts. Hosted results are verified against the exact published commit; installed acceptance and broader writing quality stay separate.

**Earlier v2.103.2 evidence:** the first repair passed all 53 local functional suites and all five performance runs (worst cold blocking 59 ms / 200 ms, cold FCP 6748 ms / 7000 ms, warm FCP 124 ms / 500 ms, Focus 35.9 ms / 300 ms). Publication a2357665 supplied the repair to dev/master; both hosted failures and original local failures remain retained. Both previously deployed v2.103.0 origins passed complete-shell/offline-helper checks. The v2.103.4 follow-up above owns the remaining hosted fixture correction.


**Priority 1; release target v3.0.0 — Can, October 25.** One product initiative: improve when AI helps, what supported content it chooses and how it writes through normal use. [The reviewed plan](../docs/ai-improvement-cycle.md) owns architecture, privacy decisions, dependencies and acceptance. This backlog owns work status; [the detailed feedback plan](../docs/feedback-learning-plan.md) retains nudge/feeling contracts and [completed studies](archive/Backlog-archive.md#ai-feedback-and-evaluator-studies--october-25-2026) remain evidence, not a recurring console task.

**Version boundary:** Can explicitly wants the complete AI continuous-improvement update to start the **3.x.x** series, with **3.0.0** as the first release. This is the release target, not a claim that the current partial work is complete. Freeze the actual 3.0.0 scope/acceptance before cutting the app/SW version; meaningful personal writing adaptation stays an explicit requirement or an explicitly agreed deferral, not silently completed by a new number. Separately released prerequisite/parallel fixes keep their actual versions; the parallel Sunday implementation is committed as 2.98.2 (66d0ce28, changelog fa2d5a50). The final version cut updates app/SW and both changelogs together. This explicit product release decision overrides the usual major-bump trigger; it does not imply a schema migration.

#### #15 sub-items

**Remaining-work checkpoint (October 28):** v2.103.0 is published to dev/master. Foundation loops are implemented for ordinary nudges, explicit feeling wording, same-session Focus, post-add outcomes and device-local web/Trello wording/requested alternatives. 15G repairs causal audio-output startup blocking, incomplete worker-update handling and confirmed release-fixture defects through v2.103.4; exact-release hosted evidence is separate from local gates. Gmail next-result adaptation is implemented in v2.104.0 dev. Pool/Sunday fixed-concern wording is implemented in v2.105.0; broader personal style and pool usefulness, a decision on persistent Focus learning and real-use acceptance remain open. Freeze concrete 3.0.0 acceptance and any agreed deferrals before the major release. Automatic evaluator revision stays parked.

**Historical release follow-up (superseded by v2.103.5):** 9f012a5e hosted dev CI reports 50 passed/zero flaky/three failed; master reports 50 passed/one flaky/two failed. Calendar’s wall-clock fixture crosses midnight, enrichment assumes a local artifact directory and Focus waits for an OS-specific width. Local v2.103.2 repairs these while preserving behavior assertions; a separate deterministic triage-close readiness repair addresses the first local gate’s single flake. New hosted confirmation requires publication. Original failed performance/CI results remain retained; later passes do not erase them.

| Execution order | ID | Work / consolidated source | Status | Next shippable result |
|---|---|---|---|---|
| **1 — foundation implemented; acceptance open** | **15A** | **Morning loop and delivery** — ordinary nudge quality/feedback, existing Calendar-supported wording and release handoff | Balanced feedback foundation is included in dev/master; installed delivery/quality remain open; v2.101.1 repairs and verifies cold-focus audio preparation | Verify real next-morning vote pickup, helper/fallback provenance and reliable delivery (BUG-118). Keep the retained 429.7/490.7 ms first-focus failures visible; later passing runs do not establish a fix. Do not rebuild the already activated feedback adapter. |
| **1 — safety; style design alongside** | **15B** | **HOW DAYS FELT: safety and writing style** — formerly split across Memory and #15 | Storage/export guards shipped; incoming-merge repair, clearer baseline and optional wording loop pushed to dev in v2.100.0 | Local release checks passed; verify installed behavior. `reflected-days-v2` explicitly separates daytime actions from evening reports without changing claim identity. Can approved optional wording feedback: hard-to-follow/too-formal choices guide the next eligible feeling writer, keeping previous sentences private. Verify real-use wording quality; broader style remains open. |
| **3 — integration implemented; usefulness open** | **15C / 12c** | **Pool morning and Sunday** — observation-pool usefulness, selection, wording and earned silence | Selection/correctness shipped; v2.105.0 adds explicitly approved same-surface wording feedback → next eligible writer; usefulness remains iterate | Verify installed clarity/naturalness through ordinary use. Verify revision/Undo/clear, synced withdrawal and unchanged selection/cooldown/retirement and seven-date comparisons. Retain the real-use iterate verdict; technical gates do not unlock WEEK/New week or establish personal writing learning. Historical first-focus failures remain retained alongside the causal v2.101.1 audio repair. |
| **2 — bounded next-use loop** | **15D** | **Focus Ask, tasks and habits** — separate Task Focus Ask row + desktop #14 improvement | **v2.101.0** exact-answer same-session ratings; **v2.101.1** repairs responsive-width/CI timing plus cold-audio preparation; v2.101.1 local combined gates pass but hosted Focus resize failed; v2.101.2 text measurement follow-up under verification; installed acceptance pending | Reviewed UI preserves Ask turning into the answer; end-aligned feedback opens one row, landed adds none, and clicking the answer restores the counter/progress. Undo/revision/clear reach only the next explicit same-owner/source/session Ask. Cap three replies; no storage/sync/schema or extra AI call. Verify release and installed usefulness; persistent personal style remains open. |
| **4 — ownership/control + next-use** | **15E / 11** | **Task enrichment** — web/Trello cards and Gmail context/drafts | Ownership shipped; web/Trello wording in v2.103.0; v2.104.0 dev adds bounded Gmail thread rejection/next-selection and exact-draft concerns/next-request | 54 suites, zero flaky/failed and all five performance runs/payload pass in the combined local checkout. Dev publication approved; hosted CI/deployment and real-use checks remain. Can approved device-local cross-task mail wording on October 28; thread rejection stays task-local. Validate actual relevance/clarity, retention/clear and no draft-prose reuse. BUG-117 account relevance and broader personal style remain separate. [Mail contract](../docs/gmail-feedback-plan.md). |
| **Existing + delivery repair** | **15F** | **Post-add suggestion outcome loop** — missing split offers under review | Recovery shipped; confirmed source-eligibility and stale-Apply gaps included in v2.100.1 dev release (BUG-131) | Automated release gates passed; verify installed behavior. Model selects source indices; application keeps original wording. Existing recovery, rapid-capture cancellation, outcome meanings and frequency remain. Ambiguous/unsupported syntax stays conservative. |
| **Throughout — starts with 1** | **15G** | **Shared feedback contracts, evaluator and release checks** — prior evaluator work plus per-surface acceptance | Shared contracts/checks and v2.103.5 release-reliability repairs implemented; model critic off | Maintain full-inventory/zero-flake, five-run performance and exact-commit hosted gates; verify both deployed shells and offline helper; disable hosting-injected RUM (BUG-138). Installed acceptance stays separate. Preserve next-trigger/source/sync/deletion coverage; generalize helpers only when a second real adapter needs them. Apply Claude review dispositions; no speculative framework or new store. Model critic remains parked. |

**How to read the table:** 15A–15G are stable work identifiers, **not** a build sequence. Use the execution-order column. 15G supplies only the contracts/checks needed by each real slice; it is not a platform project that must be completed first. 15B’s safety work is first, while its writing/style design can progress alongside the other slices without blocking them.

**Claude-reviewed sequence (October 25):** prepare #15A context-path provenance/release and #15B’s reproduced BUG-123 safety fix; then a bounded same-session #15D candidate, the overdue #15C selection review, and #15E cache/ownership plus exact-card control. #15B personal style can ship, remain open alongside baseline-writing work, or be parked on a recorded decision; all outcomes unblock independent slices, and only an actual personal mechanism completes that goal. Can already requested style adaptation: it is not silently removed. #15G supports concrete slices, #15F is preserved, and D5/new generic stores/automatic critic remain outside the critical path. Dreams/extraction/themes keep their existing gates.

**Independent review:** Claude returned a conditional verdict; [findings and Codex’s accept/qualify/reject decisions](../docs/ai-improvement-cycle.md#claude-review-and-adjudication--october-25) are part of the plan. The original feelings-first shipping dependency is superseded. In particular, nudges still wait for initial sync, optional vote rates are not a success metric, and same-session Ask/card hiding are not claimed as completed style learning.

**Historical release checkpoint (October 25):** v2.98.0 feeling reactions were pushed. **v2.98.2 Sunday fallback pushed to dev** (52 suites passed, 0 flaky; payload 1200.8 KB / 342.8 KB Brotli, 38 scripts; budget raised to 1204 KB). **v2.98.3 BUG-123 safety fix committed** (c71497c8); **v2.98.1 nudge feedback loop committed** (this commit); both local, not yet deployed. Nudge first-focus performance gate remains open (429.7 ms > 300 ms, pre-existing in CI Oct 22–24; no audio/focus fix, budget increase or usefulness win claimed).

**Historical handoff state (October 25):** HEAD was fa2d5a50 after the parallel Sunday commits. Those commits include app/SW version 2.98.2 and the 2.98.1 About/changelog labels, but `assets/nudge.js` balanced-context activation and its new tests remain uncommitted here. The prior verification paragraph is historical evidence for that nudge patch, not proof the combined tree or current displayed version contains every runtime change. The Sunday commit also changed decoded payload ceiling from 1200 to 1204 KiB; preserve/check that agent’s rationale and actual combined evidence rather than claiming our prior unchanged-budget gate covers it.

**Historical implementation checkpoint (October 26):** 15A feedback context, 15B’s initial safety fix and bounded 15D Ask are committed. Phase 3/15C corrections, 15E web/Trello ownership/control and cleanup are local v2.99.0, with focused Claude review complete; combined checks now pass on a stable shared-tree snapshot (52/52, zero flaky; five-run performance and payload within unchanged budgets). Gmail ownership/source repair (BUG-128) is now local v2.99.1 with combined 52-suite and five-run performance/payload gates passing; commit/release remains pending. Keep the incoming reflection-sync safety gap and clearer feeling baseline open; personal writing-style adaptation, especially feelings, still needs a concrete mechanism and implementation. Broader persistent Ask/enrichment adaptation needs its own justified feedback design, not an assumed new store. The parallel 15F/BUG-129 delivery repair is included in this candidate and both changelogs; commit/release remains pending. Real-use usefulness and agreed 3.0.0 acceptance remain separate from technical completion; the automatic critic stays parked.

**15F real-use report (Can, October 26):** no task-splitting prompt seen for at least ten days; this predates the latest AI improvement increments. The split controller/policy last changed September 28 (v2.92.12), and the recent nudge, Focus and sync work did not change them. Current automatic help runs only after a new manual add, requires 2–3 explicitly written actions, and reduces a reason to one-in-four delivery after at least four resolved offers with at least 70% negative outcomes. Long or broad tasks alone are deliberately ineligible; existing tasks are not periodically reconsidered. A fictional policy probe accepts “Write the draft and add examples” but rejects the equally explicit “Install the shelves and paint the wall” and “Translate the document and send it” because their verbs are outside the fixed English list. These are confirmed coverage gaps, not proof of the cause on Can’s device. Missing eligible-offer/verb-language coverage and silent failure/delivery need review; current passing positive-path/outcome tests do not establish that useful offers are still reaching Can. Exact absent-offer cause remains open without assuming his task wording or vote history; no runtime/model/provider change or private-state inspection was made. Probe: `.context/post-add-split-review-2026-10-26.json`. **Follow-up:** Can cannot recall a definite historical task and also reports no offers on tasks already in the list. A later tentative two-action example passes the actual split guard when its two action phrases are copied exactly; the fixed-verb-list gap does not explain that wording. Model paraphrasing can still fail the exact-copy rule. Existing tasks have no automatic re-analysis trigger, so distinguish missing help at capture from an expectation of help later. Inspect new-add cancellation, model abstention/paraphrase, reason reduction and delivery before attributing this case or changing frequency. The personal wording was tested transiently and was not added to repo fixtures.

**15F mechanics follow-up (October 26 / BUG-129):** actual Add → actual proxy → fictional provider reproduces a lost offer after one HTTP 503 and after offline capture, despite healthy reconnect. The control delivers correctly; this establishes a delivery defect without proving the cause of every past miss. The local latest-capture-only timeout/recovery fix preserves the writer, grounding and suppression policy. Synthetic rechecks now deliver once after the transient failure/reconnect; capture/proxy, offline/foreground, deadline, owner, cap and terminal-result regressions pass. Prompt/eligibility/frequency source checks and smoke/component/design/payload gates pass; the final combined 52-suite gate and five-run performance/payload checks pass, with recovery included in both local v2.99.0 changelogs. Commit/release and installed delivery remain pending. Rapid capture still intentionally supersedes the previous task. The separate verb-list/paraphrase coverage gaps remain open; recovery does not solve them.

**Completion rule:** each slice must show its promised normal trigger → actual result → feedback/current-source effect → next eligible use, with privacy/clear/sync and fallback preserved. Distinguish correctness, repetition/card control and actual personalized style: the former do not finish the latter. An unavailable style signal stays an open goal, not an infinite dependency. No manual console operating cycle, automatic prompt edits or default extra judge calls.


### Task Focus Ask

**Owner: [#15D](#15-sub-items).** Existing task/habit feedback and wording work shares that one queue. This section preserves the current task-specific behavior and separate real-use verdict.

**Current:** v2.97.10 is committed and pushed to dev/master. Ask sends only JSON-quoted task text and aims to clarify a consequential unknown, otherwise offer a supported step or acknowledge a sufficient action/wait. The history highlight is removed; current task failures have explicit retry status. Habit wording, enrichment shortcuts, provider and timer contracts stay separate. Owners: `assets/focus.js`, `architecture/Focus.md`, `architecture/AI.md`.

**Next:** confirm the deployed/installed build and judge real help, including repeated generic wording, unsupported assumptions and deliberate waits. The 72-output comparison and subsequent wording checks used a different local model/transport; format and lifecycle tests do not establish usefulness. v2.101.0 adds bounded exact-answer same-session association and optional ratings; this does not establish live usefulness or persistent style learning. No chat, answer field or background generation is approved. #15D’s proposed exact-result feedback requires its own bounded Data/Sync and component review before collection; the current writer is not permission for other task history. W3 is provisionally November 7 if deployed October 24; move the checkpoint if release lands later.

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

Follow the recorded author/translator worldwide-PD or verified CC0/dedication rule; preserve the five approved US-only exceptions without extending that route. No AI rewrites or silent translation modernization. Read the [curation ledger](archive/Backlog-archive.md#poem-curation-ledger) before proposing anything: permanent cuts, exceptions and pending leads remain authoritative. Source-discovery conventions above still apply.

### 10a: Granola meeting import

**Not started; priority path:** manual structured meeting notes/action import through a revalidated Granola API/auth contract, then extraction and reviewed task chips. Build before native calendar-led capture; the integration is independent of TODAY's Calendar connection. Gate: are the proposed chips what the person would have written themselves? Existing endpoint/MCP sketches need fresh validation before implementation.

### 10b: Google Calendar context

**Implemented:** separate read-only primary-Calendar foundation and v2.96.0 timing-only support for the ordinary daily writer. [Build/release/test history](archive/Backlog-archive.md#calendar-foundation-and-first-daily-increment) is complete; runtime boundaries live in `architecture/Connections.md` and `architecture/AI.md`.

**Open account checks:** verify the current installed build, read-only consent/scope, refresh, Retry and Forget on desktop; repeat Connect and those checks on phone. Existing Gmail permissions must remain unchanged. The October 28 daily-writer checkpoint needs actual eligible use; no exposure is not a usefulness verdict and must not be manufactured by rewriting tasks or clearing the day's line.

**Keep the increment narrow:** one supported same-task continuity/deadline relationship, fresh complete intervals and a bounded lazy read; omit context for unknown/open/stale/slow input. No task-duration guess, event-title matching, raw events/titles/participants/intervals to AI/storage, agenda, new scopes or routing changes. Pool/Sunday/focus remain outside this integration. Delivery fences and ordinary recovery stay with the owning writer.

**Still unbuilt:** Join / Record offer after real-account checks and a separate design/W1–W2 pass; resolve no-link, overlapping-event and PiP behavior. Calendar is input, never output; a timed event is not proof of attendance and never authorizes auto-recording. Preserve in-room/speakerphone limits on mobile. Capture/transcription comparisons wait for real recordings; no new bake-off is owed now.

### 11: Task enrichment

**Owner: [#15E](#15-sub-items), retaining ID 11.** Card relevance, presentation, feedback and booking-context work now share #15’s queue. Existing connector access and bug verification stay separately bounded.

**15E next-use increment (dev/master release requested October 28, v2.103.0):** Can explicitly approved fixed-concern wording guidance across future web/Trello cards on this device. The optional disclosure keeps the existing card layout; revision, per-task toggle-off, Undo and clear all remove supported influence. Task edits/deletion, expiry, board changes, Claude Forget and incoming/local memory-clear withdraw it. The ordinary next eligible request receives at most two fixed concerns, never old task/card prose. Existing accepted caches remain unchanged. A hidden card may explicitly request one alternative per focus visit; no extra automatic request/critic. Empty/error/late work keeps the original hidden and recoverable. Actual-component privacy/freshness/keyboard/axe/320px/resize controls pass. Isolated candidate validation: 53 suites, zero flaky/failed, and payload pass. The five-run performance gate fails (BUG-135); a published-code control also fails startup blocking, Can requested publication to dev and master after the failure was reported; BUG-135 remains open. Pending parallel Focus changes are excluded. Eight actual-Haiku fictional writing outputs used eight calls and retained originals plus blind review: **iterate**, with no broad quality/learned-taste claim; deadline qualifier drift remains documented. The confirmed Trello Call label is corrected to Open deterministically. [Contract and evidence limits](../docs/enrichment-feedback-plan.md). This is a bounded implementation toward 3.0.0; Gmail and broader style remain open.

**15E implementation (October 26, local v2.99.0):** web/Trello cards now bind to the current task/text/source/policy, fence late calls/views, and provide optional exact-card not useful → Undo/show context. This uses the bounded local cache only, with no model-feedback projection or schema change; see AI/Data/Sync and BUG-127. Focused Claude review completed after the initial spend limit. Its real background-render Undo-focus defect is reproduced and corrected, along with label-in-name/live announcement and hidden-state consistency; final combined local gates now pass, with commit/release pending. **Gmail follow-up:** BUG-128 classifier/source and late-response ownership is repaired in local v2.99.1 below. The separate fictional audit reproduced an old query reused for changed wording and a late selected-email cache write after owner deletion. Preserve existing mail/draft boundaries before adding any controls or learning.

**Historical cleanup checkpoint (October 26, superseded by combined verification below):** remove verified BUG-083 revive probes/their timer, use only cache state for card hiding, and coalesce zone persistence cleanup after completed moves. Actual move APIs now cover retention through intermediate saves. Enrichment (37 checks), zones, drag, Focus and smoke pass; payload is 1198.8 KiB / 342.6 KiB Brotli / 38 scripts. The last shared full-run snapshot was 50/52, failing Memory footer targets and the visual baseline. The parallel Memory styling change is now committed (e5dd07be); a fresh combined run must establish current status. Isolated pre-cleanup slice passed 51 suites; its only tooling failure was the checkout shell selecting Node20, and the same check passes with the project’s existing Node24 binary. Earlier own-slice full runs passed 52/52; do not present them as a clean release gate for the subsequently changed shared tree. No commit/push or new product usefulness verdict.

**Combined release verification (October 26, local v2.99.0):** 52/52 suites pass, zero flaky/failed, including post-add recovery/terminal/owner fences, suggestion outcomes, Sunday, enrichment, reflections, sync, accessibility and all six visual scenes. Five cold/warm and interaction runs pass every unchanged budget; payload 1199.6 KiB decoded / 342.7 KiB Brotli / 38 scripts. Memory action heights/footer padding are restored; feeling-feedback review stays inside a visible insight with an existing-footer fallback when withheld. Only the visually inspected Memory baseline changed. Source hashes stayed unchanged through the full suite and benchmark; only generated performance evidence changed. Syntax, memory inventory and whitespace checks pass. Evidence: `.context/combined-release-checks/`; tracked performance audit refreshed. This supersedes the earlier shared-gate failures without erasing them or claiming the historical first-focus cause is fixed. No commit/push by this session, installed-device or product usefulness verdict.

**Gmail ownership slice (October 26, local v2.99.1 / BUG-128):** current retained task/text and local refresh-grant provenance bind both existing caches. Current Today/undone owner, AI configuration, adopted cache and request/visit guards fence classification, search, draft and late token results; normal access-token refresh survives. Whole-chain/draft deadlines, synchronous Focus exit, actual sync/zone and cross-tab source changes are covered. Legacy unbound caches invalidate; no scope, prompt, mail feedback or backup expansion. Final validation: 41 Gmail checks, 37 enrichment checks and all 52 suites pass with zero flaky/failed tests. Five-run performance and payload pass unchanged budgets (1202.8 KiB decoded / 343.1 KiB Brotli / 38 scripts); audit refreshed. Runtime source hashes and earlier failures are retained in `.context/gmail-128/`. No commit/push, installed-account or usefulness claim. This includes stale-tab cache preservation and active-view 24h expiry. This supersedes the earlier “next Gmail” checkpoint, without closing installed-account/relevance or personal-style goals.

**Remaining:** the October 20 relevance verdict is overdue. Observe helpful context, wrong cards and useful cards withheld by lexical matching, especially booking email context. Matching the task is necessary, not proof the card helps. Fresh-arrival wake repair is verified; the recurring cue's usefulness is still open.

Stages 1–3, Gmail/Calendar-notification filtering and bounded MiniSearch ranking are implemented. Owners: `architecture/AI.md`, `research/Integrations.md`; BUG-117 still owns accepted booking-match verification. Contacts and AI Calendar tools are deferred; Calendar's daily timing permission does not extend to enrichment. No inferred preferred provider, semantic mailbox model, others' email imported as tasks, or autonomous execution without review.

### 14: Habit contextual companionship

**Implemented:** desktop habit-specific Ask in v2.97.0, name-only input after an explicit tap. It is committed, not merely a local prototype. [Rejected UI, revised prototype, wording checks and release decisions](archive/Backlog-archive.md#habit-desktop-slice-and-completed-design-studies) are historical. **Verdict (Can, 2026-10-25):** seldom used but kept — habits now act like tasks, which is consistent and worth having. Not crucial, but not a candidate for removal. The latest Read refinement was not live-sampled; this verdict is based on real use, not syntactic validity.

**Scope split:** improvements to the existing desktop habit Ask belong to [#15D](#15-sub-items); that does not reopen its keep verdict.

**Separate, unbuilt follow-up:** a meaningful preparation relationship in the existing morning reading, not a saved Moment field or reminder. Establish evidence, extra value beyond a name recap, competition with the ordinary reading, repetition/checked/weak-evidence withholding, privacy and selection before wiring. Keep ordinary daily delivery unchanged when no habit relationship qualifies; desktop question usefulness does not establish morning usefulness.

The underlying habit/context idea remains open. Preserve the actual Habits component, name/check-off flow, history/strength, ordering, archive/undo, sync, 3am grace and existing evening attention. No required cue-bearing name, new field, completion-triggered offer, task-linking setup, automatic check-off or retrospective cue-adherence claim. No unobserved call/meal/bedtime inferred from a check or Calendar. Substantive future design uses actual components with Claude as specified in `design/ProductThinking.md`; research/design limits live in `design/Personalization.md` and `research/Psychology.md`.

### Release verification

**BUG-130 — cross-device completion delay (v2.98.6, installed verification pending):** failed content downloads and post-operation metadata sampling could acknowledge unread revisions. Same-revision retry, exact upload/download revision provenance and two-store check/uncheck plus wake regressions are implemented; installed visible/reopen latency remains open. See `Bugs.md`; do not close this from the fictional tests or lower the poll interval to hide the fault.

**Accepted browser verification (October 27):** Can accepted reproduction-equivalent local tests for BUG-121/123/124/125/132/133. Their detail sections are archived and their bug statuses are verified. BUG-133 is included in the combined v2.101.0 release; verification is separate from installed rollout.

**Still awaiting verification:** [BUG-118](Bugs.md#bug-118--daily-nudge-delivery-and-recovery) retains a real morning delivery/usefulness check. BUG-121 and BUG-122 have accepted verification and are archived. `Bugs.md` owns exact causes/statuses and other open bug work.

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
| CI reliability | **15G repair implemented through v2.103.4.** Causal audio preparation and fixture corrections preserve the original-run evidence and unchanged release limits. v2.97.9 corrected input timing and retained attribution from original measured runs. Available October 22–24 nightly evidence still has run-1 cold TBT 425/222/414ms against 200ms and two first-focus misses; later runs/separate replays were clean. Inspect original-run deployed GitHub evidence before claiming cause or fix. No raised budgets, discarded first runs, hidden failures or passing rerolls. |
| Memory AI hypotheses | Covered by [Memory](#memory-record-and-patterns): inspect existing confirmation/usefulness before adding generation or data. Keep separate from the KNOWN record verdict. |
| Suggestion outcome loop | Owned by [#15F](#15-sub-items); existing bounded outcome policy is retained, not a second build queue. |
| Shared ai-assist helper | D5 transport extraction remains deferred and is **not** a prerequisite for #15G feedback contracts. If separately reopened, preserve response parsing and each surface’s privacy/delivery; no new orchestrator or broad rewrite. |
| Chrome Built-in AI | Parked, not adoption approval. Reopen only for an actual local-classification need; verify current official support/device/privacy constraints and retain fallback. |

---

## Wallpaper Test — open verdicts

Resolve as **kept**, **iterated** or **removed** from actual exposure. No exposure means no verdict. Dated checkpoints are sorted first; elapsed dates remain overdue rather than silently renewed. [Resolved verdicts](archive/Backlog-archive.md#resolved-wallpaper-verdicts) are archived. Build completion and a repaired bug are not product keep verdicts.

| Surface | Due / trigger | Current status / next judgment |
|---|---|---|
| #15E Gmail next-result feedback (v2.104.0 dev) | Dev October28; W3 November11; production pending | W1 a rejection changes the next same-task selection and an explicit wording concern reaches the next requested draft. W2 optional native controls inside the existing Gmail block, no automatic call/survey/panel. Judge real relevance/clarity rather than changed sentences; set the date from actual release. |
| #15B optional wording feedback (local v2.100.0, approved October 27) | 14 days after actual release | W1 an explicit wording concern changes permitted guidance on the next eligible feeling generation; W2 optional collapsed controls inside the existing reaction, no mandatory second vote or new panel. Compare actual clarity/voice; passing tests do not establish preference or quality. |
| #15E exact-card control (local v2.99.0) | 14 days after actual release | W1 remove unhelpful context and resume the task; W2 existing card/action row, optional local hide/Undo with no survey or extra call. Technical correctness is separate from relevance/style learning. |
| #15F post-add recovery (local v2.99.0, BUG-129) | 14 days after actual release | W1 useful capture-time help survives a brief outage; W2 latest unchanged capture only, two-minute window and one retry with existing frequency/viewport limits. Verify actual delivery/usefulness after release; no automatic old-task review. |
| #15C optional wording loop — v2.105.0, dev/master publication October 28 | November 11 (release +14 days) | W1 optional feedback addresses a concrete clarity/formality concern on the next eligible same-surface reading. W2 existing signal-gated sentence/reaction shell; no extra call or mandatory vote. Observe whether writing improves; no automatic keep verdict, WEEK/New week or inferred personal style. |
| #15C Sunday fallback integration (local, BUG-126) | 14 days after actual release | W1 a reading respects rejected kinds and accurately describes supported actions; W2 existing Sunday component, one qualified reading or silence, no extra call/controls. Technical checks do not establish usefulness; the older pool iterate verdict stays open. |
| [#15C / 12c](#15-sub-items) — pool morning / Sunday | 2026-10-15 — overdue | **Iterate.** Review actual misses and quiet Sundays for evidence, novelty, usefulness and timing. Ordinary morning quality/delivery does not close this gate or unlock WEEK/New week. |
| [#15E](#15-sub-items) — enrichment arrow arrival | 2026-10-20 — overdue | Wake repair verified October 22 (BUG-116). Still judge W1 useful arrival versus distraction; W2 one flash for fresh context, quiet cached hover. No quality verdict yet. |
| Connections sign-in attention | 2026-10-20 — overdue | W1 find the connection needing repair; W2 only expired Gmail/Dropbox/Calendar and quiet after opening Connections. Judge usefulness if reconnecting waits, not only the repair working. |
| [#15E](#15-sub-items) — booking email context | 2026-10-20 — overdue | **Iterating.** W1 a relevant earlier confirmation can help rebook; W2 bounded task-grounded context without an automatic reply. Review wrong cards and useful cards withheld; BUG-117 verification remains separate. |
| [#15A](#15-sub-items) — daily nudge quality / thinking | 2026-10-23 — overdue | W1 perceptive orientation beyond recap; W2 existing morning moment and bounded route. Judge wording/usefulness and latency independently. Historical decline is real; its cause is unproven. |
| Daily nudge delivery — BUG-118 | 2026-10-23 overdue; follow-up 2026-11-05 | **Re-observing v2.97.8.** W1 a useful morning must survive transient failure/false recap rejection; W2 bounded recovery with real dismissals final. Verify phone/desktop midnight, legacy recovery and strip/About agreement. Consolidates the older recovery and recap-filter rows without closing either check. |
| [#15B](#15-sub-items) — HOW DAYS FELT | 2026-10-25 | **Re-observing.** W1 recognizable relationship; W2 qualified comparison or silence fenced to current evidence. Feedback foundation shipped in v2.98.0; usefulness and writing-style verdicts remain open. |
| [#15A](#15-sub-items) — ordinary feedback (v2.98.1 local) | 2026-11-08 provisional | Existing votes feed the next eligible morning with recent landed/missed examples. No extra reaction UI, background experiment, critic delay or same-day rewrite. Observe actual readings through normal votes; not a model-score or fictional-test keep verdict. Move this +14-day checkpoint to actual release. |
| [#15B](#15-sub-items) — feeling feedback (v2.98.0) | 2026-11-08 | W1 a vote can withhold an unhelpful unchanged insight and preserve valid useful wording. W2 existing sentence/reaction patterns, explained first vote, review inline within HOW DAYS FELT block; no new panel/count or cross-surface sensitive input. Local checks are not a keep verdict; verify installed behavior and usefulness after release. |
| [#15A](#15-sub-items) — nudge length recovery | 2026-10-27 | **Re-observing.** W1 keep useful morning/About prose after a length miss; W2 one grounded shortening pass, not repeated prose hunting. Check delivery and retained meaning; no real-AI dismissal reset. |
| Triage touch countdown | 2026-10-27 | **Re-observing.** W1 enough time to read; W2 hold only during the active countdown, resume on release/cancel. Physical-phone naturalness/scrolling/choice check is still owed. |
| Memory → PATTERNS | 2026-10-27 | **Re-observing.** W1 corrected useful timing/outcome comparisons without HOW YOU WORK echo; W2 bounded list/qualified evidence. Judge valued lines and continued suppression of AI restatements. |
| Calendar-supported daily writer | 2026-10-28 target | W1 supported same-task continuity contrast; W2 rare explicit evidence without forced content or title import. Confirm deployed build and actual eligible use; no exposure means no verdict. |
| Memory → KNOWN | 2026-11-01 | **Iterate October 18, v2.97.4 implemented.** W1 helps choose a return; W2 focus-backed returns lead, intentional waits inspectable. Judge whether it earns a visit without readiness inference or task reordering. |
| [#15E](#15-sub-items) — wording / requested alternative (shipped v2.103.0) | 2026-11-11 — release +14 days | W1 future context can follow an explicit wording concern and a rejected card has a deliberate recovery path. W2 optional controls inside the existing card; fixed local bounds; no request on rating and one explicit alternative per visit. Actual fictional writing verdict iterate. Judge normal next-card/recovery usefulness and revise/remove if it does not earn its place. Release requested October 28; keep/iterate/remove remains open. |
| [#15D](#15-sub-items) — Task Focus Ask | 2026-11-07 provisional | **Iterate October 24, v2.97.10 committed/pushed.** v2.101.0 feedback W1/W2: a rating affects the next explicit same-owner Ask without an interruption, extra model call or new collection. Feedback W3 due deployment +14 days (November 10 if deployed October 27); installed and real-writing acceptance remain open. W1 resolves a consequential uncertainty or supports a concrete move/wait; W2 explicit task-only Ask, neutral availability. Confirm deployment; shift +14-day checkpoint if needed. Samples are not real-use acceptance. |
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

**Dev release v2.99.1 (October 26):** Can authorized commit/push of the reviewed Sunday, web/Trello controls, post-add recovery and Gmail ownership slices. The separate Dropbox revision repair was published first as v2.98.6 and is retained as the release base. Clean-checkout functional and performance gates are recorded with the release evidence; installed/account and product usefulness verdicts remain open.

**Memory UI fixes on dev (October 26, e5dd07be + b74e0f17, unversioned):** Memory panel button tokens aligned to copy-cta (`memory-item-btn`, dreams manage, Connections →). HOW DAYS FELT UX: after a "not really" vote, the block now preserves its header and dims the insight text instead of collapsing to a bare status row; feeling feedback review moved from the memory footer into the HOW DAYS FELT block; `nudge-react-btn` in the reflection-reaction context overridden to match copy-cta tokens (text-xs, normal case, transparent border). The reviewed Memory baseline and documented action target sizes were refreshed in v2.98.6; the withheld-insight feedback fallback is included in v2.99.1. 52 suites pass; performance/payload within budget. No version bump; these will roll into the next versioned release.

**15B continuation (October 27, v2.100.0 on dev):** incoming-source readiness now protects merged feeling votes; true edits/deletion/expiry still remove influence. Clearer baseline framing covers all four comparisons without changing the stable claim or importing historical prose. Can subsequently approved optional wording feedback, now implemented in the existing reaction with first-use explanation, Undo/clear, source-bound additive fields and one bounded next-writer instruction. Earlier sentences stay private; broader personal style and actual quality remain open. No live evaluator or extra model call. Final checks: 52/52 suites, zero flaky/failed; all five performance runs and payload pass unchanged budgets (1203.4 KiB decoded / 343.3 KiB Brotli / 38 scripts). Runtime is on dev in 0571190b; installed/real-use writing quality remains open.

**15F continuation (October 27, v2.100.1 dev release / BUG-131):** confirmed install/paint/translate eligibility now passes. The writer confirms source-clause indices rather than rewriting the actions; client application copies the exact original wording and rechecks the current undone owner/source. Invalid/invented responses remain terminal; the old delayed-click edit/check/move bug is fenced without a false miss. Actual Add/proxy/mobile-keyboard and existing recovery/outcome controls cover this bounded increment. Final automated checks: 52/52 suites, zero flaky/failed; all five performance runs and payload pass unchanged budgets (1203.9 KiB decoded / 343.2 KiB Brotli / 38 scripts). No live model/usefulness or installed acceptance is claimed; dev release approved. No extra request, new history or frequency reset.
