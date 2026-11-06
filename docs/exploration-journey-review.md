# Explore journey review — November 6, 2026

**Verdict: iterate.** Can has used Explore but has not experienced the proposed accumulation of a plausible understanding, a useful unresolved question or an optional action. Its purpose and progression remain unclear. This is a product finding; green component tests and previous layout approval do not resolve it.

This review covers the native v3.4.0 flow and the separate, unpublished v3.4.1 BUG-145 repair. It uses actual source and controlled fictional states, not Can's journal or a live model. It does not approve new runtime/source-retention behavior, a schema change, additional collection, background generation or a redesigned UI.

The [implementation proposal](exploration-continuity-plan.md) now turns these findings into ordered deliverables, a bounded request/storage design, source rules and acceptance checks. Can approved the revised single-request direction November6; its runtime is now local in v3.5.0. This review preserves the original findings rather than claiming the earlier UI already had that behavior. Technical verification and real-use acceptance remain separate.

## What “sources changed” actually means

A source is a task or Memory record that the app supplied as context for an AI reply. Its fingerprint includes more than visible words. There is no requirement that the person edit Explore, change a source setting or revise their account before a reading can become unavailable.

| Automatic event | Confirmed behavior | What the person experiences |
|---|---|---|
| Daily Memory abstraction supports the same interpretation again | `_memorySupport` updates `lastSeen`. Memory projects that date in `basis`; Explore hashes it. Executing the actual helper with unchanged wording changes the fingerprint and hides the dependent reading. | An interpretation disappears even though the person changed no words or permissions. |
| A previously completed task graduates to Past on a new day | The actual day-cleanup block removes it from `manualTasks` and retains it in `pastTasks`. Explore's current-task projection no longer contains its reference. | A normal transition in the task list can remove an exploration's latest interpretation. |
| Ranking or candidate membership changes | The earlier projection could drop an unchanged returning record below five visible rows, or a task below100 candidates. The local BUG-145 repair separates those windows from existing-dependency checks. | False source loss; this narrow case is repaired locally, not yet deployed. |
| Initial sync/readiness, actual expiry, remote edits or explicit withdrawal | Sources may be unavailable or changed without an edit in the current exploration visit. Actual withdrawal/clear/retention protections must hold. | The original single notice did not distinguish these cases. |

The first two paths reproduce even with the local BUG-145 fix. They demonstrate automatic triggers, not the exact cause in Can's saved document. The daily Memory refresh is invoked from normal cold-start and triage paths. The controlled probe executes the real `_memorySupport` helper, the real task-graduation block and the real projection/core checks; receipts are `.context/living-note-investigation/journey-probe.mjs` and `journey-probe.json`.

“Changed” currently means “the stored reference no longer matches the current projection.” It does not establish that the person's account or the meaning of an earlier interpretation changed. Equally, old task/Memory wording must not silently be treated as current truth after genuine changes. The design needs to distinguish those meanings rather than ask the person to manage source freshness.

## One complete journey

All quoted experiences and proposed responses below are fictional. They illustrate the desired product outcome; they are not measured model outputs or prompt examples to copy into production.

| Moment | Person's experience | What Explore should contribute | Current gap |
|---|---|---|---|
| First visit | “I keep postponing writing even when I have some time.” | Help examine one uncertainty. Ask what happens just before postponing; leave competing explanations open. | A bounded reply and follow-up exist. Their actual usefulness is unverified; no explanation of the feature's eventual contribution emerges from the interaction itself. |
| Further conversation | “Yesterday I spent the available time choosing which part to work on.” | A concrete tentative distinction: choosing a starting point may be friction in this example; time may still matter on other days. | The writer can express this, but the product does not maintain a distinct developing account of supporting examples, alternatives and corrections. |
| Look at the living note | “What have we understood so far?” | A short coherent account: what the person described, the current possibility and the question that would distinguish alternatives. | “Your account” is the last three observations; “A possibility” is the latest reply/amendment; “Still open” is its next question and summary. These are projections of the latest exchange, not a cumulative synthesis. |
| Stop for a few days | No maintenance work by the person | Retain permitted personal continuity. Ordinary app maintenance should have an understandable, proportionate effect on auxiliary factual context. | A last-seen update, task graduation or genuine source change can hide the entire latest reading, its resumption and next question. Dependencies also accumulate across replies. |
| Return | “Where were we?” | Recognizable continuation: the experience being examined and the useful distinction still open. Resume from the person's permitted account even if auxiliary context needs checking. Opening should make no model request. | With a valid reading, the saved summary/question provide a return. Without it, the conversation falls back to generic invitations. The local fix retains the person's original topic in the note but does not create accumulated understanding. |
| Optional small action | Only if the person wants to try something | For this fictional case, choosing a paragraph before the next writing session could test whether a clearer start helps. Keep the purpose, uncertainty and modest bounds clear. | The existing path is living note → “something to try” → “suggest something”. Its availability is easy to miss. Only that dedicated action enables the structured experiment mode; ordinary conversation stores `experiment:null` even if a model returns an experiment. A requested step belongs to the latest reading. |
| Return after trying it, or deciding not to | “I tried it once; starting was easier,” or “I didn't want to try it.” | Retain the chosen step as relevant continuity and let the person describe what happened. One experience can refine a possibility without proving causation. Declining/doing nothing is acceptable. | The next ordinary reading stores `experiment:null`, displacing the prior step in the current view. `core.context` passes prior text/corrections but omits the experiment. No dependable continuity for the optional action is implemented. Task completion cannot supply the missing account of what helped. |

## Findings

1. **The feature's central benefit is under-implemented.** It persists exchanges and can offer a thoughtful reply, but it has not established a legible progression from experience to developing understanding to a worthwhile return. More explanation of the current controls alone will not supply that benefit.
2. **Source freshness controls too much of the experience.** Every supplied context record and inherited prior dependency can gate the whole latest interpretation. The current one-claim/reply-level model cannot separate a dated task fact from a still-useful distinction grounded in the person's own words. Treating model citations as complete dependencies would weaken privacy and is not an acceptable shortcut.
3. **The living note's name promises more continuity than its projection provides.** It needs a defined job as the concise retained understanding of this exploration. The person's corrections and competing explanations need to remain meaningful over later replies, while raw observations remain intact.
4. **The optional-action loop stops too early.** The deliberate request and task creation work, but discoverability, retained relevance and a later conversational review are incomplete. More task tracking, reminders or mandatory experiments would not address this gap.
5. **The latest bug fix is necessary but narrow.** Local v3.4.1 repairs false source loss due to windows and removes technical status from the interpretation section. It does not solve automatic metadata invalidation, cumulative synthesis or action continuity. Do not present it as completion of this review.

## Recommended experience to develop

Keep one conversational thread and the existing optional living note. Each explicit reply should help the person examine their experience and update a short, grounded account of the exploration. It should become possible to say: “This is what you've described; this is the possibility we're examining; this is what we still don't know.” The note should earn those sentences from the conversation rather than display headings that imply learning has occurred.

On a later visit, return to that permitted understanding and one useful open question. An ordinary task or metadata update needs proportionate handling; true withdrawal, deletion, expiry and clear must still prevent unsupported use. A source-policy proposal must separately define semantic versus metadata changes, unchanged text with changed evidence, current versus dated facts, and what remains safe to display/use after each event. Claim-level support and persistent synthesis would need their own bounded provenance design; this review does not approve either mechanism by implication.

Offer a small step when wanted, explain what it could help examine, and retain that chosen step for the next relevant conversation. The person's explicit request in conversation should be sufficient to reach this optional help; learning a secondary menu path should not be required. Preserve the bounded explicit-request contract and further deliberate action before task creation. Asking what happened belongs to an explicit return/reply; there is no background exploration, automatic reminder or requirement to act. A declined step must not repeatedly return as unfinished work.

The next design artifact should show this complete fictional journey in the existing component: first reply, refined understanding, optional note, automatic context change, later return, and an optional step followed by a return. It must show where understanding improves and where uncertainty remains. Sources and document controls stay secondary. Review that concrete experience before changing the runtime/source policy; layout polish alone is insufficient.

## Acceptance for that journey

- A person can explain what Explore helped them understand after using it, without knowing the storage or source vocabulary.
- A second relevant experience refines the retained understanding; counterexamples and personal corrections remain distinguishable from AI guesses.
- Ordinary automatic maintenance does not leave the person with an unexplained loss of continuity. Actual privacy withdrawal/clear/deletion remains effective and cannot be bypassed through a recap or old action.
- A return without a new AI call is recognizable and useful. No new generation runs merely to fill a section or manufacture progress.
- An explicitly requested small step remains available when relevant, can be declined, and can be discussed later without interpreting completion as benefit.
- Sparse evidence can leave the question open. No fabricated meaning, diagnosis, stage assignment, required tracking or forced action is added to make the journey look complete.

Technical basis: [source fingerprints and selection](../assets/exploration-context.js), [current/support/context semantics](../assets/exploration-core.js), [note, resumption, request and step projection](../assets/exploration.js), [Memory record projection](../assets/memory-view.js), [automatic Memory maintenance](../assets/memory-panel.js), [new-day task graduation](../assets/day-lifecycle.js). The original [product intent](life-exploration-design.md) and [privacy/data contract](exploration-data-integration.md) remain the starting points; any future approved change must update their concrete guarantees.
