# Feedback loops and writing evaluator

Prepared for Can, 2026-10-24. **Runtime implementation: v2.98.0.** Can subsequently requested implementation. The HOW DAYS FELT loop is implemented; the ordinary-nudge branch remains behind `_BALANCED_FEEDBACK_READY = false`. On October 25 Can ran the eight-call fictional two-by-two pickup through TODAY’s existing connection: all eight requests succeeded. Arm labels were hidden before assessment. Positive-only picked up prior effort usefully in the draft case, but the actual combined candidate returned the generic old-task reading; all booking variants noticed the explicit noon hold. One sample per cell cannot establish a consistent benefit or explain the difference. Keep the combined writer gated; do not select the positive-only variant post hoc from one favorable response. Exact local results and frozen judgments are in `.context/feedback-loops/`; repeat the separated comparison with held-out cases before activation. The evaluator remains development-only; the earlier bundled candidate is not promoted by this implementation.

Implementation decisions refining the proposed design below: merely viewing an insight does not enroll an existing user in derived-record storage; an explained first vote does. Feedback uses two additive backup fields under v5.5's documented extensibility rule. Its sixty-record cap also has a 250,000-character ceiling. A reading's SHA-256 id binds generation, claim, source support, wording and source coverage; `votedThrough` captures coverage at the vote. When sources naturally expire, erase the wording and per-evening source references, retaining only the person's private, bounded claim-withholding decision until the original record expires. Otherwise expiry itself would resurrect an unchanged missed claim. A source edit/withdrawal invalidates the affected full reading, and full history/Memory clear or consent withdrawal removes feedback too.

## Outcome

TODAY should become more helpful through ordinary use: current evidence produces a reading, the person optionally reacts, and the next eligible reading uses that reaction. No dashboard, preference setup, required explanation or recurring manual review is added to the daily flow. The north star remains understanding the person's relationship with commitments, with the morning as the signature beat.

Three responsibilities remain distinct:

| Responsibility | Owner | Cannot establish |
|---|---|---|
| Which facts/relationships are eligible | Existing deterministic policies | Whether a sentence will mean anything to the person |
| Whether wording preserves those facts intelligibly | Writing evaluator, backed by mechanical checks | Personal usefulness, causal truth or a better alternative relationship |
| Whether a reading landed | The person | Why it missed, or whether every factual claim was true |

The model does not rewrite its own instructions or train itself from votes. Personalization changes bounded context and eligible selections. Quality-policy changes remain versioned, tested engineering changes.

Pattern reference: [Anthropic's evaluator-optimizer notebook](https://github.com/anthropics/claude-cookbooks/blob/main/patterns/agents/evaluator_optimizer.ipynb). This plan uses bounded critique and optional later repair rather than repeating until a model awards PASS.

## Loop 1: ordinary morning nudges

**Today:** `assets/nudge.js::_taskPathMisses()` sends up to three prior missed ordinary lines from fourteen local calendar days. Successful lines occur only as unlabelled repetition history. Pool/Sunday kinds have a separate cooldown/retirement policy. `assets/insights.js` stores and revises votes in private synced `spokenLines`.

**Proposed behavior:**

1. Keep evidence gathering, Calendar projection, current task selection, existing memory boundaries and delivery unchanged.
2. Build a pure `taskReadingFeedback(lines, todayISO)` projection in an owning policy module. Include only `surface === 'morning nudge'`, no pool `kind`, prior local dates within fourteen calendar days, nonempty wording and an explicit current vote. Sort deterministically, newest first; take at most two landed and two missed lines, each at most 200 characters. Missing positives or negatives are valid; never synthesize a balanced history.
3. Supply those two labelled groups to the existing writer. Explain that a vote concerns that reading in its original moment. Learn from successful readings without copying their prose; avoid repeating a missed interpretation, while allowing the same task when current evidence supports another reading. Past wording supplies preference context, never current facts about a task. Unlabelled repetition context remains separate and unchanged during the experiment.
4. Show and record the final accepted line through the existing flow. A vote takes effect on the next generation, after current device/sync state settles. Do not regenerate today's accepted line when a vote changes. No vote is neutral, not an implicit miss; latest revision/clear wins across devices.
5. Let examples age out naturally. Do not infer a permanent dislike of counts, old tasks, questions or particular subjects from a binary vote. Do not infer avoidance, personality, effort remaining or emotional state. Preserve optional reasons as private review material, never model input.

**No new nudge store is needed.** Reuse the existing line's date, wording, surface, reaction and reaction timestamp. Existing memory clear, retention/cap and Dropbox ordering remain authoritative. A small sample is contextual guidance, not a learned numerical preference score. No ordinary miss retires the morning or an observation-pool kind.

**Delivery:** no extra evaluator round trip is inserted into the live morning in this phase. Keep the accepted-cache, real-dismissal, noon, day-epoch, initial-sync and stale-task fences; the existing bounded shortening repair retains its own purpose. No new persisted rejection state, keyword recap veto, regeneration on vote or mid-read swap.

## Loop 2: HOW DAYS FELT

**Today:** `assets/reflections.js` chooses one qualified aggregate on-device, sends only that aggregate to the writer, and binds transient results to the evidence snapshot. It does not record reactions to its sentences. Evening feeling choices are sensitive source records, not votes on the resulting insight.

**Proposed behavior:**

1. Preserve opt-in, thirty-day source retention, current qualification thresholds, recognizable action contexts, reflected-evening population and the forty-word limit. Code still selects the relationship. No qualified relationship means silence.
2. Add optional reactions to the actual completed sentence using the existing reaction component, typography and keyboard patterns. The accessible group must identify this as feedback on the insight, not a way to change the evening feeling. Do not show reactions for loading, absent or rejected prose.
3. Save a vote before hiding anything. A miss acknowledges the choice and offers Undo in the same component until the panel closes, then withholds that unchanged observation on reopening. A compact, keyboard-accessible "review feedback" disclosure in the existing Memory footer must allow later revision/clear without bringing the sentence back as an active insight. It must remain reachable when HOW DAYS FELT is hidden, including when no comparison currently qualifies. Its actual markup needs component/design review before wiring; no new panel or permanently expanded history list.
4. A landed vote preserves a still-valid sentence; it does not force another appearance, extend source retention, establish causation or outrank insufficient evidence. A miss withholds the specific claim, not every comparison of the same kind. After withholding, code may choose the next independently qualified unsuppressed comparison; it must not search repeatedly until a new AI sentence happens to pass.
5. Reconsider a missed claim only after material new support, a different named feeling/comparison direction, or the person revises/clears the vote. A changed local day, row order, wording or moving-window label alone does not earn reappearance. An unchanged valid relationship can keep its existing wording; freshness does not mean cosmetic variety.

### Identity and material change

Use three separate identities; the current session evidence key cannot do every job:

- **Request snapshot:** the current existing consent/version, deletion watermark, local window and eligible evidence. Any change fences pending evaluator/writer work and invalidates stale prose.
- **Claim key:** relationship kind, named feeling, ordered action contexts and wording-policy version. Stable across date rollover and paraphrases. This scopes withholding; it is not a permanent category retirement.
- **Reading id:** claim key + support digest + accepted wording digest + consent/deletion generation. The reaction targets exactly what was shown, not a mutable date/surface slot.

For the initial material-support rule, require at least two new eligible reflected-evening records since the missed reading, with at least one in each comparison group, and require the relationship to pass all existing qualification checks again. Merely editing the wording, dropping old records or increasing an existing day's task count does not qualify. Keep bounded private support references to determine new membership; do not copy raw source histories. Use the reflection's private local date as membership identity, separately from source-version digests: editing the same evening does not create a new evening. A different feeling or direction is a new claim but still must qualify independently. This is a proposed conservative reappearance rule, to be tested with fictional sequences and reviewed in real use, not a statistical validation claim.

### Sensitive storage and sync work required before release

Do **not** put feeling sentences or votes in general `appMemory.spokenLines`, `_memoryForAI()` or ordinary nudge context. Historical feeling wording must not be sent as positive/negative examples to the model: that would expose additional relationships beyond the selected aggregate.

Use a dedicated versioned `today_reflection_feedback` record store and `today_reflection_feedback_cleared_at` watermark. Full records hold: reading id, generation, claim key, source support/references, accepted wording, creation time, reaction (including null), reaction timestamp and source coverage at the vote. Only displayed readings are saved after first-vote consent; no historical ledger is manufactured. At most sixty records / 250,000 characters, thirty days from reading creation, obsolete unvoted readings pruned first. Digests/references are sensitive metadata, not anonymization. Natural-expiry entries retain only id/generation/claim/timing/user verdict and coverage, never wording or source values.

This is an explicit new **derived sensitive record**, to be explained in the reflection consent/payoff copy. It requires a backup-contract review before implementation; do not assume the current backup schema already supports it. Additive backup fields may be sufficient, but decide against `architecture/Data.md` / `Sync.md` and old-client round-trip tests rather than promising no schema impact.

- Merge by reading id and latest reaction timestamp, including cleared votes. At an equal timestamp, explicit null wins over a set vote; otherwise use a fixed lexical tie-break. The immutable reading body is identified by its digest; first-shown time merges by MIN. A newer vote must not be reset by a stale sentence record.
- After the initial reflection/Dropbox merge, choose a canonical reading for the same claim/support/policy: the reading with the latest explicit reaction event (including clear), then the earliest first-shown time if none has an event, then lexical reading id. Retain distinct voted readings within the cap rather than transferring a vote onto another sentence. Across readings of the same unchanged claim, the latest reaction event governs withholding; clearing it must not silently revive an older miss. Do not generate on every open or against a not-yet-merged consent/deletion state.
- Clearing feedback removes its examples/withholding independently, with a synced watermark. Clear-all-memory, reflection-history deletion and consent withdrawal remove source-derived readings and feedback too; old devices cannot restore them.
- A source edit/removal invalidates affected full readings and feedback. Scheduled source expiry strips their wording/support and retains only bounded user withholding, as described above; the original thirty-day feedback expiry still applies. Any newly generated relationship must qualify from current sources.
- All feedback fields stay outside general memory exports/prompts. Only the currently selected aggregate reaches the feeling writer/evaluator: no source dates, task text, source ids, other feelings, historical comparisons or private reasons.
- Withdrawing evidence during a writer/evaluator request discards the late answer. A cancelled or unavailable evaluator never creates a vote or a retirement. Re-consent starts a new generation, not a continuation of deleted work.

Feedback from feelings changes local eligibility and reuse. It does not silently teach the nudge writer how the person feels. Writing improvements initially come from the evaluator's current-aggregate check and separately reviewed fictional examples.

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

## Implementation sequence and acceptance

1. **Current deliverable:** this plan, strict evaluator, eight fictional rubric cases and offline contract tests registered in the existing gate. No live judge accuracy claim. The fixtures include invented progress/dependency, a legitimate tentative connection, quiet orientation, a valid feeling comparison, a causal addition, reversed direction and generalized population.
2. **Calibrate the evaluator with the existing configured test transport.** Freeze human issue labels before reading its answers. Measure missed material errors AND false positives on acceptable quiet/tentative lines; report uncertainty, latency and calls. Keep human judgments; do not choose labels to agree with the critic. Probe injection resistance separately: the system prompt/data boundary is a precaution, not proven immunity. More held-out examples are required before runtime use.
3. **Test loop 1 before wiring.** Separate balanced feedback from the changed missed-reading instruction (a controlled two-by-two comparison), then test critic-assisted revision separately. Reuse fictional mornings and add held-out counterexamples. Freeze blind review before mapping arms. The previous bundled 24-output comparison cannot attribute improvement to positive votes alone. Run the required memory-signal pickup probe before any new positive input reaches the writer.
4. **Implement the two feedback loops without live critic calls.** Extend existing modules and consent/backup contracts, verify two-device feedback convergence and deletion, and review the actual feeling component against existing tokens/layout with Claude as specified in ProductThinking.md. Run W1–W2 and record a dated W3 review for changed recurring surfaces. Do not count a test result as a real-use verdict.
5. **Only then consider one bounded writing repair.** Compare original and revised wording blindly, preserving the same evidence and uncertainty. Re-evaluate the revision once if needed for measurement; never loop until PASS. Total development comparison ceiling is three judge/writer calls after the original: judge, one rewrite, final judge. A second failure stops. Runtime integration needs its own end-to-end latency budget and delivery decision; do not stack this behind the morning's existing shortening recovery or add a new all-day lockout. For feelings, continued abstention is allowed when no acceptable sentence remains.

### Required checks for the runtime steps

- Nudge selection: correct surface/kind/window boundaries, DST-safe local-date arithmetic, sparse history, all-positive/all-negative/unvoted data, vote revision/clear, deterministic ties, text bounds, privacy canaries and unchanged production payload when no eligible feedback exists. Pool retirement and optional reasons remain separate.
- Feelings: vote attaches to exact displayed evidence/wording; unchanged claim stays withheld across reopen, rollover and paraphrase; genuinely new support/direction follows the explicit rule; no manufactured variation. Empty/insufficient evidence hides. Corrected/deleted outcomes, reflection edits, policy changes, sync and source expiry invalidate derived prose.
- Persistence: cross-device vote versus stale-reading races, latest clear wins, deletion and re-consent generations, old backups/clients, support-reference expiry, cap behavior, corruption handling and late writer/evaluator replies after deletion. No sensitive data enters general memory or another surface.
- Interaction: optional reactions, immediate save/Undo and later revision, keyboard-only use, screen-reader naming distinct from the feeling picker, hidden-tree behavior, focus restoration, 320px wrapping and unchanged reading rhythm.
- Release: affected nudge, insights, reflections, Memory, Dropbox, observation-pool, AI and accessibility suites; full gate, payload budget and existing required performance/release checks. Version, both changelogs, service worker and behavior docs update with runtime changes.

After release, assess whether real voted readings improve and whether delivery stays reliable. Do not add analytics, silently repurpose optional reasons, optimize to model scores or claim causality from a before/after count. Changing circumstances and a small personal sample limit the conclusion. A feeling relationship that never earns its place can still be removed.
