# Feedback loops and writing evaluator

**Release target:** the complete update targets **3.0.0**, beginning the 3.x.x series at Can’s request. Existing version references below describe actual earlier implementation/evidence, not completion of that major update.

**Overall contract and delivery order:** [TODAY’s AI improvement cycle](ai-improvement-cycle.md) now owns the cross-surface lifecycle, honest inventory and implementation sequence. This file retains the detailed nudge/feeling contracts and experimental evidence. The shared contract does not mean that Focus, enrichment or feeling style adaptation is already implemented.

Prepared for Can, 2026-10-24. **Current implementation:** v2.98.0 ships evidence-bound HOW DAYS FELT reactions; v2.98.1 is prepared locally to connect ordinary morning feedback to the normal generation cycle. Your recent landed/not-really votes automatically become bounded context for a later morning, using the existing writer instructions. Today's accepted sentence is not regenerated when voted on. The optional helper has a 300ms fallback; there is no extra AI call or manual console step in normal use.

**Product decision (Can, October 25):** activate only the tested positive-context increment. The earlier pickup showed useful prior-effort use once; the broader comparison does not establish a general quality win. The combined instruction change and automatic critic remain off. Model-based critique/revision is a development investigation for a concrete future writing problem, not an operating requirement for feedback to reach the next reading. Exact experimental results are recorded below; normal future votes are the ongoing input. HOW DAYS FELT keeps its separate consent, source, retention and deletion boundaries. No automatic prompt editing, score optimizer, telemetry or new collection is introduced.

Implementation decisions refining the proposed design below: merely viewing an insight does not enroll an existing user in derived-record storage; an explained first vote does. Feedback uses two additive backup fields under v5.5's documented extensibility rule. Its sixty-record cap also has a 250,000-character ceiling. A reading's SHA-256 id binds generation, claim, source support, wording and source coverage; `votedThrough` captures coverage at the vote. When sources naturally expire, erase the wording and per-evening source references, retaining only the person's private, bounded claim-withholding decision until the original record expires. Otherwise expiry itself would resurrect an unchanged missed claim. A source edit/withdrawal invalidates the affected full reading, and full history/Memory clear or consent withdrawal removes feedback too.

## Outcome

TODAY should become more helpful through ordinary use: current evidence produces a reading, the person optionally reacts, and the next eligible reading uses that reaction. No dashboard, preference setup, required explanation or recurring manual review is added to the daily flow. The north star remains understanding the person's relationship with commitments, with the morning as the signature beat.

Three responsibilities remain distinct:

| Responsibility | Owner | Cannot establish |
|---|---|---|
| Which facts/relationships are eligible | Existing deterministic policies | Whether a sentence will mean anything to the person |
| Whether wording preserves those facts intelligibly | Runtime surface guards; development evaluator for reviewed changes | Personal usefulness, causal truth or a better alternative relationship |
| Whether a reading landed | The person | Why it missed, or whether every factual claim was true |

The model does not rewrite its own instructions or train itself from votes. Personalization changes bounded context and eligible selections. Quality-policy changes remain versioned, tested engineering changes.

Pattern reference: [Anthropic's evaluator-optimizer notebook](https://github.com/anthropics/claude-cookbooks/blob/main/patterns/agents/evaluator_optimizer.ipynb). This plan uses bounded critique and optional later repair rather than repeating until a model awards PASS.

## Loop 1: ordinary morning nudges

**v2.98.1 prepared:** the ordinary writer reads up to two landed and two missed prior ordinary lines from fourteen local calendar days. Existing `spokenLines` supplies the current synced votes; unlabelled repetition history remains unchanged. A failed or hanging optional helper falls back to the old three-miss context. Pool/Sunday cooldown and retirement remain separate.

**Feedback behavior:**

1. Keep evidence gathering, Calendar projection, current task selection, existing memory boundaries and delivery unchanged.
2. Build a pure `taskReadingFeedback(lines, todayISO)` projection in an owning policy module. Include only `surface === 'morning nudge'`, no pool `kind`, prior local dates within fourteen calendar days, nonempty wording and an explicit current vote. Sort deterministically, newest first; take at most two landed and two missed lines, each at most 200 characters. Missing positives or negatives are valid; never synthesize a balanced history.
3. Append the two labelled groups with the existing writer instructions unchanged. The separately tested replacement instruction is not promoted. Past wording is feedback on earlier readings, not a new source of current task facts, known reasons or permanent preferences. Unlabelled repetition context stays separate and unchanged.
4. Show and record the final accepted line through the existing flow. A vote takes effect on the next generation, after current device/sync state settles. Do not regenerate today's accepted line when a vote changes. No vote is neutral, not an implicit miss; latest revision/clear wins across devices.
5. Let examples age out naturally. Do not infer a permanent dislike of counts, old tasks, questions or particular subjects from a binary vote. Do not infer avoidance, personality, effort remaining or emotional state. Preserve optional reasons as private review material, never model input.

**No new nudge store is needed.** Reuse the existing line's date, wording, surface, reaction and reaction timestamp. Existing memory clear, retention/cap and Dropbox ordering remain authoritative. A small sample is contextual guidance, not a learned numerical preference score. No ordinary miss retires the morning or an observation-pool kind.

**Delivery:** no extra evaluator round trip is inserted into the live morning in this phase. Keep the accepted-cache, real-dismissal, noon, day-epoch, initial-sync and stale-task fences; the existing bounded shortening repair retains its own purpose. No new persisted rejection state, keyword recap veto, regeneration on vote or mid-read swap.

## Loop 2: HOW DAYS FELT

**v2.98.0 shipped:** `assets/reflections.js` chooses one qualified aggregate on-device and sends only that aggregate to the writer. Explained first-vote consent enables a separate bounded reading/reaction store. Votes target exact evidence/wording and govern reuse/withholding; source evening feelings remain distinct sensitive records. No historical feeling prose enters the writer as feedback.

**Feedback behavior:**

1. Preserve opt-in, thirty-day source retention, current qualification thresholds, recognizable action contexts, reflected-evening population and the forty-word limit. Code still selects the relationship. No qualified relationship means silence.
2. Add optional reactions to the actual completed sentence using the existing reaction component, typography and keyboard patterns. The accessible group must identify this as feedback on the insight, not a way to change the evening feeling. Do not show reactions for loading, absent or rejected prose.
3. Save a vote before hiding anything. A miss acknowledges the choice and offers Undo in the same component until the panel closes, then withholds that unchanged observation on reopening. A compact, keyboard-accessible "review feedback" disclosure in the existing Memory footer must allow later revision/clear without bringing the sentence back as an active insight. It must remain reachable when HOW DAYS FELT is hidden, including when no comparison currently qualifies. Its actual markup needs component/design review before wiring; no new panel or permanently expanded history list.
4. A landed vote preserves a still-valid sentence; it does not force another appearance, extend source retention, establish causation or outrank insufficient evidence. A miss withholds the specific claim, not every comparison of the same kind. After withholding, code may choose the next independently qualified unsuppressed comparison; it must not search repeatedly until a new AI sentence happens to pass.
5. Reconsider a missed claim only after material new support, a different named feeling/comparison direction, or the person revises/clears the vote. A changed local day, row order, wording or moving-window label alone does not earn reappearance. An unchanged valid relationship can keep its existing wording; freshness does not mean cosmetic variety.

### Required follow-up: feeling writing style (Can, October 25; Claude-reviewed)

The shipped feeling loop is incomplete as a writing-personalization loop. Can explicitly requires style to improve through ordinary use, alongside relationship selection and evidence freshness. This goal remains required; a simpler correctness fix or reusable sentence is not a substitute.

**Current mechanism is not supported as specified.** The fixed reflected-evening opening and verbatim action comparison leave little independent wording freedom. Qualification requires repeated evenings, valid unchanged insights reuse prose, and feedback expires after thirty days. Sparse whole-reading votes confound the relationship and wording. Allowing more historical sentences would not by itself solve those constraints, and fictional votes cannot reveal Can’s taste. The earlier “content-free style projection” is therefore not the assumed implementation; do not commission another generic batch to justify it or replace it with hardcoded variant scoring.

1. **Safety first:** resolve [BUG-123](../memory/Bugs.md#bug-123--feeling-feedback-pruned-against-not-yet-ready-source-evidence), reproduced in an isolated actual-component fixture. Not-ready source evidence must not erase a stored missed claim. Trace read/export/reconcile/merge and manual Restore, preserving true withdrawal, expiry, clear and source-generation fences.
2. **Baseline writing:** a concrete clarity defect can justify a versioned wording/copy change under the existing selected-aggregate-only contract. Review fixed phrasing versus factual invariants, preserving the reflected population, named feeling, both action contexts, comparison direction, uncertainty and forty-word ceiling. Compare real candidate wording to the current wording; do not call the result learned personal style or regenerate unchanged evidence for novelty.
3. **Personal adaptation remains an explicit design goal:** before further UI/storage, identify a meaningful permitted feedback signal, enough independent wording variation and a concrete feedback-to-next-writing mechanism. Whole votes remain weak evidence about style; do not invent dislike reasons, equate brevity with quality or add mandatory second ratings/settings. Historical feeling prose and derived sensitive profiles stay excluded from model context under the present consent boundary.
4. **Terminating gate:** a personal mechanism may ship when justified; baseline-writing work may proceed with personal adaptation still open; or the unresolved mechanism can be parked with a recorded decision. All dispositions allow independent nudge/pool/Focus/enrichment work to proceed. Only the first completes personalized style adaptation. A richer-input/consent proposal, if ever needed, must be concrete and separately approved; it is not enabled by this document or by Claude’s review.

**Status (October 27):** evidence-bound reaction/reuse/withholding and initial BUG-123 storage/export guards are shipped. The incoming-merge follow-up and clearer baseline are implemented locally in v2.100.0; the approved optional wording loop is implemented locally; real-use writing quality remains open. The current writer receives only the selected aggregate and the approved bounded wording instruction when one exists. A bounded same-session Focus increment and card hiding can be useful elsewhere without satisfying this style goal. See the [Claude review adjudication](ai-improvement-cycle.md#claude-review-and-adjudication--october-25) for accepted findings and qualified/rejected recommendations.

### 15B implementation — approved optional wording feedback (October 27)

Can approved adding optional **wording** feedback inside the existing reaction. Local v2.100.0 implements safety, baseline clarity and that narrow personal-writing mechanism. The earlier whole-vote/content-free-projection feasibility objection remains valid; this adds an explicit wording signal rather than assigning a cause to landed/not-really.

`reflected-days-v2` starts “In your evening reflections,” and compares explicit “on days … than on days …”. It names a task’s recorded focus session without claiming it happened that day. The person/feeling phrase can use everyday language while population, ordered action clauses, frequency comparison, one feeling and the 40-word bound remain enforced. Stable claim strings retain the original contexts; accepted legacy prose can be reused. Updating copy cannot reset a miss, manufacture an evening or trigger cosmetic regeneration.

The optional collapsed **wording** disclosure offers **hard to follow** and **too formal**. First use explains that the choice guides later feeling wording, keeps earlier sentences private, and stores this insight/feedback for up to 30 days here/in connected Dropbox. No second rating is required. Save, revise, immediate Undo and clear target the exact displayed reading; a wording concern does not mark its relationship missed. History management remains reachable when no insight is shown. `reflection-wording.js` is a lazy private helper for controls; reflection owns storage/calls and `feedback-policy.js` owns validation/projection.

Optional `wordingReaction` and `wordingAt` stay within the existing sensitive feedback store and its total 30-day/60-record/250,000-character limits. Data/Sync specify independent per-field LWW, null clears, missing old-client fields, source expiry and deletion. The latest still-active explicit concern supplies one short code-owned writing instruction at the next eligible generation. Clearing/Undo removes that reading’s concern; an independent still-active concern may then apply. Clear feeling feedback removes all such influence. No durable profile, historical sentence, source date, vote ledger, private reason or additional feeling relationship enters the writer.

An accepted insight is not rewritten on a wording vote. A pending request is fenced if its actual guidance changes. Feedback/source clear, withdrawal and expiry remove future influence. This is a bounded explicit-feedback loop, not training, automatic prompt editing or a promise that every later sentence improves. Whole-insight votes retain their selection/reuse/withholding meaning. No model judge or extra call is inserted.

Eight fictional component controls cover all four comparisons/both directions; actual browser checks cover first-use save, Undo, next-trigger guidance, revision/clear, sync/old backup, late responses, keyboard/axe and 320px wrapping. They establish delivery/privacy and guard behavior. Live production-model style quality is unsampled because no developer test credential is configured; no app credential is extracted and no repeated console packet is required. Real-use quality is the next verdict; no personal taste is inferred from fictional votes.

### Identity and material change

Use three separate identities; the current session evidence key cannot do every job:

- **Request snapshot:** the current existing consent/version, deletion watermark, local window and eligible evidence. Any change fences pending evaluator/writer work and invalidates stale prose.
- **Claim key:** relationship kind, named feeling and ordered action contexts, under a stable relationship-schema identity. Writing-policy versions belong to exact readings, not this claim. Stable across date rollover, prompt updates and paraphrases. This scopes withholding; it is not a permanent category retirement.
- **Reading id:** claim key + support digest + accepted wording digest + consent/deletion generation. The reaction targets exactly what was shown, not a mutable date/surface slot.

For the initial material-support rule, require at least two new eligible reflected-evening records since the missed reading, with at least one in each comparison group, and require the relationship to pass all existing qualification checks again. Merely editing the wording, dropping old records or increasing an existing day's task count does not qualify. Keep bounded private support references to determine new membership; do not copy raw source histories. Use the reflection's private local date as membership identity, separately from source-version digests: editing the same evening does not create a new evening. A different feeling or direction is a new claim but still must qualify independently. This is a proposed conservative reappearance rule, to be tested with fictional sequences and reviewed in real use, not a statistical validation claim.

### Sensitive storage and sync work required before release

Do **not** put feeling sentences or votes in general `appMemory.spokenLines`, `_memoryForAI()` or ordinary nudge context. Historical feeling wording must not be sent as positive/negative examples to the model: that would expose additional relationships beyond the selected aggregate.

Use a dedicated versioned `today_reflection_feedback` record store and `today_reflection_feedback_cleared_at` watermark. Full records hold: reading id, generation, claim key, source support/references, accepted wording, creation time, reaction (including null), reaction timestamp and source coverage at the vote. Only displayed readings are saved after first-vote consent; no historical ledger is manufactured. At most sixty records / 250,000 characters, thirty days from reading creation, obsolete unvoted readings pruned first. Digests/references are sensitive metadata, not anonymization. Natural-expiry entries retain only id/generation/claim/timing/user verdict and coverage, never wording or source values.

This **derived sensitive record** is explained before first-vote consent. The backup-contract review uses two additive fields under v5.5’s documented extensibility rule; old-client missing fields, revised/cleared reactions, source withdrawal and old-backup replay are covered. See `architecture/Data.md` / `Sync.md`.

- Merge by reading id and latest reaction timestamp, including cleared votes. At an equal timestamp, explicit null wins over a set vote; otherwise use a fixed lexical tie-break. The immutable reading body is identified by its digest; first-shown time merges by MIN. A newer vote must not be reset by a stale sentence record.
- After the initial reflection/Dropbox merge, choose a canonical reading for the same claim/support/policy: the reading with the latest explicit reaction event (including clear), then the earliest first-shown time if none has an event, then lexical reading id. Retain distinct voted readings within the cap rather than transferring a vote onto another sentence. Across readings of the same unchanged claim, the latest reaction event governs withholding; clearing it must not silently revive an older miss. Do not generate on every open or against a not-yet-merged consent/deletion state.
- Clearing feedback removes its examples/withholding independently, with a synced watermark. Clear-all-memory, reflection-history deletion and consent withdrawal remove source-derived readings and feedback too; old devices cannot restore them.
- A source edit/removal invalidates affected full readings and feedback. Scheduled source expiry strips their wording/support and retains only bounded user withholding, as described above; the original thirty-day feedback expiry still applies. Any newly generated relationship must qualify from current sources.
- All feedback fields stay outside general memory exports/prompts. Only the currently selected aggregate reaches the feeling writer/evaluator: no source dates, task text, source ids, other feelings, historical comparisons or private reasons.
- Withdrawing evidence during a writer/evaluator request discards the late answer. A cancelled or unavailable evaluator never creates a vote or a retirement. Re-consent starts a new generation, not a continuation of deleted work.

Feedback from feelings changes local eligibility and reuse. It does not silently teach the nudge writer how the person feels. The October 27 explicit wording loop is a narrow personal-writing increment; broader style learning remains open and near-fixed factual clauses/sparse exposure still constrain it. The evaluator remains development-only, not a live writing-improvement mechanism.

## Writing evaluator: implemented development contract

`scripts/writing-evaluator.mjs` exports `prepareEvaluation`, `mechanicalIssues`, `reviewEvaluation` and `evaluateWriting`.

It is not loaded by TODAY, cached by the service worker or connected to a provider. `evaluateWriting(case, {callModel, signal, isCurrent})` accepts an injected transport using existing configuration. The transport receives only `{systemPrompt, messages}` and an abort signal, and must return the full text response. No model/provider/route overrides, credential discovery, app reads, telemetry, automatic retries or rewrites are included.

Inputs are strictly projected:

- Nudge: draft, bounded caller-reviewed factual statements and explicit unknowns, with local evidence labels. These labels support critique; they are not real task ids. The caller must verify the projection itself: allowed text fields are not a de-identification guarantee.
- Feelings: draft and one selected aggregate with the feeling, ordered contexts and group counts; never raw reflection records. Input validation checks shape and comparison consistency. Eligibility thresholds remain the selector's responsibility.

Mechanical checks reject basic length/line problems and malformed feeling comparisons before spending a judge call. They do not certify semantics. The model checks unsupported claims, comparison/population mistakes, causality and concrete ambiguity. It cannot score usefulness or require a particular poetic shape. A tentative question or quiet acknowledgement is not automatically a defect.

The response contains a request digest, `clear | revise | uncertain`, and bounded issues with exact draft excerpts, short explanations and valid evidence references. `clear` means no defect found, not proven truth/usefulness. Malformed output becomes uncertain; wrong-request responses become stale. A timeout, error, cancellation or missing transport becomes unavailable. No failure is converted to a pass.

`evaluateWriting` makes at most one judge call, with a twelve-second default development timeout (maximum thirty seconds), abort propagation and a current-evidence callback before/after the request. A late response cannot replace a settled result. The digest binds the evaluator version, prompt text, draft and projected evidence; application integration must ALSO use the owning consent/day/source epoch through `isCurrent`, since those private source identities are deliberately absent from the provider payload.

### Use

The CLI prepares requests and imports responses; it deliberately makes no live calls:

```sh
# INPUT is one fixture's input object, not the whole fixture wrapper.
node scripts/writing-evaluator.mjs --prepare INPUT.json .context/evaluation-request.json
# Supply that systemPrompt/messages to the existing test transport.
# REPLY contains the model's JSON text, not a provider response envelope.
node scripts/writing-evaluator.mjs --review INPUT.json REPLY.json .context/evaluation-review.json
node scripts/writing-evaluator-test.mjs
```

Outputs use new paths and restrictive permissions. The review command exits nonzero for anything other than clear. It is an experiment result, not a release gate on personal usefulness or a production rejection policy. Keep any private inputs/outputs in gitignored local storage; the committed fixtures are fictional.

## Completed studies and remaining runtime checks

**Separated studies reviewed (October 25):** all 64 feedback outputs were assessed with variant labels hidden before unmasking. Material unsupported claims: baseline 6/16, positive-only 5/16, instruction-only 9/16, combined 6/16. The combined candidate did not establish improvement and remains off. These are Codex development judgments, not Can’s votes or statistical proof. The first evaluator adapter discarded parsed critique objects; its unavailable results remain retained and are not quality measurements. The corrected adapter passes a regression through the real server handler with a mocked provider; a focused recovery repeated only calibration/revision against the same originals (46 requests, 87.2 seconds). It matched all ten reference calibration cases, but broader review found three acceptable originals falsely flagged and six supported revisions rejected. Of twelve blind pairs, nine preferred revisions (two still materially unsupported), two preferred originals, one tied; four other originals stayed unchanged. Three feeling corrections succeeded, all on one revive/calm aggregate. Keep automatic revision development-only. Exact records/reports are in `.context/feedback-loops/study-v2/` and `study-v3/`; original and frozen assessments are retained. Eight concrete regression candidates and a proposed evaluator-principles refinement are prepared locally. Next: test that refinement against these cases plus unseen acceptable wording, and independently test distinct feeling aggregates/controls before any surface-specific bounded recovery. No app, prompt, provider/routing, activation or deployment changed during the studies.


**Active delivery order:** [the reviewed cross-surface plan](ai-improvement-cycle.md#delivery-order-and-exit-criteria) and [Backlog #15A–15G](../memory/Backlog.md#15-sub-items). The earlier ordered study-first sequence is superseded; completed experiments are not recurring gates for normal feedback use.

| Work | Current disposition |
|---|---|
| Development evaluator, fictional rubric fixtures and transport contracts | Implemented; the default test gate covers contracts. No live semantic/usefulness certification. |
| Independent feedback/instruction comparison and evaluator calibration/revision | Completed and retained, including failures and false positives. Do not request another generic packet or call the combined writer a winner. |
| Evidence-bound feeling reaction/reuse/withholding loop | Shipped v2.98.0; installed/real-use value remains independently verifiable. Does not learn writing style. |
| Ordinary two-landed/two-missed context with existing instruction | Implemented locally v2.98.1; release/performance gate remains open. Not deployed. |
| Explicit feeling wording feedback | Approved October 27 and implemented locally v2.100.0; next eligible writer reads a bounded instruction, with historical prose private. Real-use writing quality remains open. |
| Broader personal style, exact task/habit Ask feedback and enrichment adaptation | Broader mechanisms remain open under #15B/15D/15E. The optional wording loop is a narrow increment, not completion of the full 3.0.0 vision. |
| General automatic evaluator revision | Parked after false alarms and weakened acceptable prose. Future consideration needs a concrete defect, held-out acceptable controls, independent relationship cases, a fixed request/time cap and safe fallback; not a dependency of ordinary adaptation. |

### Required checks for the runtime steps

- Nudge selection: correct surface/kind/window boundaries, DST-safe local-date arithmetic, sparse history, all-positive/all-negative/unvoted data, vote revision/clear, deterministic ties, text bounds, privacy canaries and unchanged production payload when no eligible feedback exists. Pool retirement and optional reasons remain separate.
- Feelings: vote attaches to exact displayed evidence/wording; unchanged claim stays withheld across reopen, rollover and paraphrase; genuinely new support/direction follows the explicit rule; no manufactured variation. Empty/insufficient evidence hides. Corrected/deleted outcomes, reflection edits, policy changes, sync and source expiry invalidate derived prose.
- Persistence: cross-device vote versus stale-reading races, latest clear wins, deletion and re-consent generations, old backups/clients, support-reference expiry, cap behavior, corruption handling and late writer/evaluator replies after deletion. No sensitive data enters general memory or another surface.
- Interaction: optional reactions, immediate save/Undo and later revision, keyboard-only use, screen-reader naming distinct from the feeling picker, hidden-tree behavior, focus restoration, 320px wrapping and unchanged reading rhythm.
- Release: affected nudge, insights, reflections, Memory, Dropbox, observation-pool, AI and accessibility suites; full gate, payload budget and existing required performance/release checks. Version, both changelogs, service worker and behavior docs update with runtime changes.

After release, assess whether real voted readings improve and whether delivery stays reliable. Do not add analytics, silently repurpose optional reasons, optimize to model scores or claim causality from a before/after count. Changing circumstances and a small personal sample limit the conclusion. A feeling relationship that never earns its place can still be removed.
