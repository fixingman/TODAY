# Habit daily suggestions: progression research

Research date: November 17, 2026. Reviewed against origin/dev at `7515c9fd`.

Can agreed with gentle progression for fresh daily habit suggestions and requested an online and repository research pass. This document refines that direction; it is research and a candidate behavior, not a shipped feature or a final progression algorithm.

## What the evidence changes

Use consistency as permission to try a modest stretch within the person's chosen habit. Recorded completion does not establish skill, ease, available time, readiness for exercise progression, or a wish to keep increasing effort. Preserve a stable way to begin, allow consolidation, and keep maintenance as a valid outcome.

| Source | Finding and limits | Implication for this proposal |
|---|---|---|
| [Lally et al., 2010](https://doi.org/10.1002/ejsp.674), prospective habit-formation study | Daily self-reports from 96 volunteers over 12 weeks; modeled formation times varied widely. Missing one opportunity did not materially disrupt formation. Observational evidence about automaticity, not a test of escalating AI suggestions. | No universal streak-to-readiness rule or lost-progress reset after a single miss. |
| [Ebert & Lin, 2024](https://pubmed.ncbi.nlm.nih.gov/39225981/), walking-context RCT | In 127 working midlife adults, consistent-context planning supported sustained automaticity; the expected walking-maintenance result was absent. Specific behavior/population and short follow-up. | Keep the chosen cue/context while varying the action. Automaticity and sustained activity are different outcomes. |
| [Adams et al., 2013](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0082901), adaptive physical-activity pilot | Twenty adults were randomized to six-month adaptive or static interventions. Adaptive goals moved up and down with recent measured performance; the adaptive package improved steps more. Incentive contingencies also differed, so the pilot does not isolate goal adaptation. | Adaptation can include holding or reducing demand. Step-count results cannot validate difficulty inferred from a binary app check. |
| [Adams et al., 2017](https://pubmed.ncbi.nlm.nih.gov/28356097/), factorial goal/incentive RCT | Adaptive and static goals were crossed with immediate/delayed financial incentives. Adaptive goals showed slower deterioration over the intervention, with interactions between components. Evidence concerns measured activity and incentives, not generic habit suggestions. | Supports testing responsiveness to recent behavior; supplies no universal increase percentage, completion threshold, or AI wording rule. |
| [Ryan & Deci, 2000](https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf), motivation framework/research synthesis | Competence and autonomy both matter to self-motivation. Challenge should support competence within self-directed activity. This is a broad framework, not a trial of TODAY. | Let the person's setup define what growth means and its limits. Completing a suggestion must not silently increase tomorrow's obligation. |
| [Silverman & Barasch, 2023](https://doi.org/10.1093/jcr/ucac029), seven studies of logged streaks | Highlighting an intact versus broken logged streak changed subsequent engagement, including conditions holding actual behavior constant. The finding concerns presentation and motivation, not demonstrated mastery. | Avoid streak-loss messages, level demotion, catch-up tasks, and making every success raise the bar. |

These sources support a cautious experiment. They do not establish that every habit benefits from increasing difficulty or that LLM-generated progression improves long-term adherence. Detailed motor-learning challenge frameworks are adjacent theory, not validation for arbitrary daily habits.

## Fit with existing memory

- [Psychology](../memory/research/Psychology.md): Habit Anchors favors consistent context; Habit Strength softens isolated misses; Earned Personalization separates records from claims about the person. The older deadline discussion values bounded closure, but provides no evidence that difficulty should rise with a streak. Preserve the existing 3am grace.
- [Personalization](../memory/design/Personalization.md): code selects supported evidence and the LLM phrases it. A count is insufficient evidence of ability. Use the existing daily task rather than introduce another observation, dashboard, or repeated encouragement.
- [Observation Selection](../memory/research/ObservationSelection.md): explicit selection precedes generation. The writer should receive a bounded instruction such as hold or modest stretch, not discover an unlimited difficulty policy from a history dump.
- [Temporal](../memory/research/Temporal.md): habit-day evidence uses local 3am rollover, including DST handling. Midnight task snapshots are not an equivalent habit-day record.
- [Product Thinking](../memory/design/ProductThinking.md): inspect the actual component, try the smallest fictional prompt experiment, and evaluate relevance before runtime integration. The earlier rejected Habit Moment UI is not reopened.

## What the current implementation can tell us

The existing `fresh` writer in [habit-tasks.js](../assets/habit-tasks.js) sends the habit name, setup note and up to 14 earlier occurrence texts. Earlier text includes suggestions that might never have been completed. It is a repetition-avoidance input, not a successful-practice history. The `set` mode rotates stored alternatives and refreshes them separately; keep it outside the first experiment.

`fromTask()` and `fromHabit()` both update the linked task and `habitCompletions`; `reconcileCompletions()` resolves the same shared completion. There is no reliable independent record proving that the person performed the generated suggestion rather than another valid instance of the habit. Describe this as recorded completion of a habit with a daily suggestion. Do not backfill fictional suggestion-specific outcomes from the habit streak.

Occurrence state distinguishes active, dismissed, detached and expired, with explicit edits. These states describe app interactions; none establishes why a day was unchecked. Exclude periods before configuration, disabled/archived periods, future days and the still-open current habit day from progression opportunity counts. Unknown coverage stays unknown, not a failed opportunity. Undo/uncheck and sync corrections must withdraw stale support.

The current writer asks tasks to differ in substance from earlier tasks. Requiring novelty every day can conflict with repeated practice. A progression experiment should permit useful repetition and consolidation while rejecting merely cosmetic rewrites.

## Candidate behavior to test

1. **Keep the setup authoritative.** Use its chosen purpose, cue, time budget, resources and exclusions. A skill-building purpose can support deeper practice. A maintenance routine can remain stable indefinitely. An ambiguous name alone does not authorize a curriculum or increased workload.
2. **Establish a comfortable baseline.** Start from the saved routine and comparable recent suggestions. A recent, bounded completion pattern may permit an occasional small stretch; neither lifetime streak nor the global habit-strength percentage establishes readiness.
3. **Change one dimension, then consolidate.** Within the same time budget, a learning suggestion might move from recalling one idea to applying it to one familiar example. This is an illustrative product scenario, not prompt text or a validated learning protocol. Additional duration, cost, equipment or commitments require support in the setup.
4. **Hold after uncertainty.** A single unchecked day does not erase progress or diagnose difficulty. Persistent lower recorded completion may justify returning to a familiar, easier action, without a failure label or a claim about its cause. Never assign catch-up work. Unknown history means baseline.
5. **Cap progression.** Each step stays within the setup and a bounded range, with consolidation days. Never generate today's difficulty as yesterday's difficulty plus another increase indefinitely. Quantified health/exercise intensities must not be inferred from a streak.
6. **Respect current choices.** An edited, dismissed, detached or completed task cannot be overwritten. A setup/name/source change, day rollover, AI configuration change or arriving sync correction must invalidate a request based on earlier support. Offline behavior remains the approved fallback.

Candidate windows, minimum supported opportunities, spacing of stretch days and caps are design parameters to test, not scientifically established numbers. Avoid advertising a seven-day or 21-day threshold as habit formation or mastery.

## Smallest useful next experiment

Before runtime wiring, compare existing variety-only generation with bounded progression on the same fictional setups. Include sustained completion, an isolated miss, sustained low completion, unknown/new history, maintenance goals, a skill goal with a fixed time cap, explicit exclusions, setup edits, undo/sync corrections, and late-night/DST habit days. Hold provider, generation count and fixtures fixed; retain all outputs rather than replace weak samples.

Review whether each action is concrete, relevant, within the setup, meaningfully challenging when appropriate, repeatable when useful, and free of escalation after weak evidence. Test that a deliberately broken policy still rejects unchecked/current/unknown days as readiness proof. Existing unit/browser tests would then cover deterministic selection, data projection, consent/fallback and stale-response behavior; prose quality needs separate review.

A substantive proposal/fictional comparison should use the existing component and Claude-assisted review specified in Product Thinking. No machine-routing change is needed. A new history-derived writer input needs a narrow data contract and the existing signal-pickup probe before production integration. Do not send unrelated habits, raw completion dates, Memory, feelings, Calendar titles or reasons to the writer as part of this research.

Acceptance in normal use: suggestions remain useful after two weeks, stretches feel appropriate, repetition can serve practice, and completing a task does not feel like earning more work. Check with Can after natural exposure; do not add analytics or a new daily rating requirement to prove this. Completion alone cannot certify usefulness or mastery.


## Local implementation — November 17, 2026

Can confirmed the direction after the research review. Dev publication was requested November 17; exact-commit CI and the publication receipt remain authoritative. No new interface or difficulty control was added.

The pure policy reads the previous14 local habit days. A supported opportunity has an AI-written, unedited active/expired occurrence bound to the exact current name/config revision via additive `basis`; legacy records have unknown source and are not backfilled. Habit completion is resolved from its effective check/uncheck event, falling back to the habit completion set when no valid event exists. Counts apply only to qualifying opportunities. A current/future day, absent record, edited/dismissed/detached occurrence, offline fallback, old name or old config supplies no readiness evidence.

At least10 known days with10 recorded checks, including4 in the last7 calendar days, permits an occasional deepen direction. A deterministic per-habit calendar phase allows at most one stretch slot in4 days; other days consolidate. The most recent known unchecked day or an unchecked/changed most recent stretch slot suppresses that stretch. Three supported checks permit familiar practice; at least5 known opportunities with at most2 checks prefer a familiar return. Otherwise stay baseline. These are conservative, testable product parameters, not empirically established optimal thresholds. Non-daily habits may stay baseline; the policy does not infer missed real-world behavior or reset a level.

The writer gets a bounded direction, original saved reference and at most3 checked-associated practice texts. Stretch-slot wording is excluded from practice references to avoid silently raising the baseline. It may deepen only a development purpose supported by the note; maintenance or unclear purpose stays steady. Instructions prohibit added time, quantity, cost, equipment, commitments or exercise intensity to manufacture difficulty. This is a semantic instruction, not a deterministic guarantee of output quality. Fresh replies must be nonempty and at most70 characters or the fallback stays.

`basis` is carried in the existing90-day, privately backed-up occurrence record. It is `[habit.name, config.updatedAt]` serialized, with a1200-character cap. A source that exceeds the cap establishes no readiness. Any setup save conservatively starts new support, even for a timing-only edit. There is no new level, streak, attempt ledger, tracking SDK or backup schema version. Older clients may drop source metadata; support then becomes unknown. No lifetime/legacy-history migration pretends that the new binding existed earlier.

The fresh request rechecks all same-habit source inputs plus AI connection and the current3am habit-day before accepting a response. An edited/dismissed/detached/completed task or renamed/archived habit cannot receive a late suggestion. A12-second abort retains fallback on failure. Existing attempt scope is page session/habit/day/mode; another page/device may attempt independently. The varied-set request receives no progression data and keeps substantive variety.

### Review and fictional signal-pickup evidence

The Claude collaborator reviewed the supplied actual components and product contract. Adopted corrections: separate fresh repetition from varied-set novelty; count checks only on supported opportunities; accept expired past records; preserve an original routine reference; exclude stretch slots from consolidation references; and suppress a stretch after an unchecked/changed recent slot. The proposed keyword/number veto was not adopted because it cannot establish semantic workload and would reject ordinary legitimate wording. A new persistent attempt ledger was outside this change.

Six isolated generations used identical fresh instructions and fixed fictional input pairs, adding only the bounded progression field in the enriched arm. All original outputs are retained in `.context/habit-progression-evidence-20261117/`; no rerolls replaced weak samples. They used the existing configured Claude CLI transport with tools disabled, not the deployed handler, so they do not prove production-provider quality or latency.

| Fictional case | Baseline | With bounded progression |
|---|---|---|
| French, same ten-minute development setup | Say a short sentence aloud using familiar French words | Say short French sentences using familiar words from my notebook |
| Desk maintenance, sustained checks | Put the desk items back in their places before bed | Put the desk items back in their places before bed |
| Drawing, consolidate familiar practice | Sketch the desk mug again after tea, adding its cast shadow | After tea, sketch the mug on your desk for fifteen minutes |

The consolidation pair shows useful pickup: guidance retained familiar practice where baseline added a new demand. Maintenance correctly stayed unchanged. The French pair is a weak progression distinction and its plural wording does not prove equal effort. This tiny author-reviewed sample supports testing restraint and source pickup, not a claim that adaptive suggestions are better or that all workload limits are guaranteed. Real-use acceptance remains open; retain weak evidence alongside the promising case.
