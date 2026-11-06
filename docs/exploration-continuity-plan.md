# Explore continuity — revised single-request plan

Owner: the existing Explore follow-up in [Backlog](../memory/Backlog.md), following the [journey review](exploration-journey-review.md).

**Implementation authorized and local, November 6:** Can approved the single-request revision with “go for it.” The runtime now implements one-result synthesis/return, semantic source validation, correction withdrawal and retained optional steps. Native journal schema3 adds those semantics; the task-backup schema stays5.5. Verification receipts and remaining live-writing/release limits are recorded below.

**November 6 decision:** Can rejected the two-request proposal after reviewing its cost, potentially divergent outputs, partial updates and coordination complexity. That architecture is withdrawn, including its independent personal-synthesis writer and dual-write coordinator. Neither was implemented. Do not revive it from the earlier prototype or treat the implementation request as approval of it.

The [earlier fictional prototype](../output/life-exploration/continuity/README.md) demonstrates a developing conversation, correction and optional step, but its independently surviving personal-note behavior is superseded. Its five-width/accessibility checks verify only that earlier scripted artifact. Claude's required critique was attempted but the configured account returned a monthly spend-limit error. No account/routing change, critique or design approval is claimed.

## What to build

Improve the existing conversation rather than add a second writer:

1. **One response, one saved result.** Keep the existing single request on explicit Send and25-second deadline. That response already contains `reply`, `summary` and `next_question`. Make the summary a coherent account of the developing understanding, not a recap of only the latest exchange. The conversation displays `reply`; the living note and return use the same accepted record's `summary` and question. Validate and save the complete result in one revision-conditional append after the existing raw-words save. No separate note request, note write, background call, automatic retry or critic.
2. **Carry understanding forward within existing bounds.** Include the last supported summary, applicable corrections and chosen step in the next request. Fit this within the existing bounded prior-context allocation rather than accumulating an ever-growing transcript or increasing the output limit. Keep uncertainty and counterexamples; do not invent a possibility or question. Raw words and history remain intact. A single call does not imply identical token consumption on every turn or guarantee improved writing.
3. **Repair false source invalidation.** Define semantic identity separately from housekeeping and eligibility. Display ranking, `isNew` and a same-meaning freshness timestamp must not erase understanding. Relevant changes to wording, counted facts or underlying evidence still matter. Actual expiry, clear markers, permission changes and deletion remain effective. Do not simply remove all dates or evidence fields from hashes.
4. **Retain an optional step.** An explicit conversational request may return the existing six bounded experiment fields. Keep an eligible previously chosen step across ordinary replies that offer no replacement. Support deliberate decline/revision and keep those choices; never treat task completion as benefit. Preserve task creation as its own explicit action. Use the smallest compatible versioned record representation required for those choices, not a second synthesis store or general profile.
5. **Return without generating.** Open the last valid saved understanding and its useful question. Keep sources and document administration secondary. If real withdrawal invalidates that result, show permitted original words and a brief explanation separately; rebuild only after a later explicit reply.

Keep the existing typography, tokens, panel and navigation. This plan changes no model/provider/routing, collection scope, task-sync policy, backup schema or between-visit behavior.

## The privacy limit remains explicit

A reply and summary produced together from task/Memory context share those actual dependencies. We cannot call the summary “independent personal understanding,” or preserve it after withdrawing supporting information, merely because the model says it used only the person's words. Model citations do not establish complete provenance.

Consequently, this simpler design fixes loss caused by **irrelevant housekeeping**, but does not promise a generated note will always survive genuine changes or withdrawal of supporting context. Both views use the same validation and become unavailable together when their real dependencies require it. The remaining permitted user words can still provide continuity. Do not weaken withdrawal, drop inherited dependencies or copy old generated content into a supposedly clean summary to avoid this limit.

A task moving to Past is not automatically permission withdrawal, but its current-task status has changed. Review whether existing permitted data can still validate a dated reference before retaining it; never call it a current task, bypass retention or broaden collection. Unknown initial readiness must not write a permanent retirement. Legacy hashes cannot be safely converted into semantic hashes without the original inputs: keep old references conservative and apply versioned semantics to new results without automatically resurrecting withheld ones.

## Failure and persistence

Keep canonical Dropbox Markdown, raw-first saving, strict revision checks, exact lost-ack recovery and current size/record limits. Reply and note derive from one durably acknowledged reading; neither is optimistically displayed as saved. A failed request/write leaves the preceding valid result and saved raw observation, using existing explicit recovery. This removes split reply-versus-note failure, not the network failures the app already has.

Account/grant, document/revision, provider/key, input inclusion, source permission, close and Forget continue to fence late responses. Any new reference or step-choice semantics must have a compatible versioned reader/writer; do not assume older clients enforce a field they ignore. No independent-note lineage or branch coordinator is needed.

## Verification and implementation order

First implement one-result synthesis/return and meaningful source identity, then retained-step choices. Update the real component and current integration documentation together; no broad redesign or further prototype series.

- Assert one provider call per explicit turn, zero on open/return, unchanged deadline and context/output ceilings; reply/note are accepted or rejected together.
- Use fictional first experience, counterexample and correction to verify retained meaning. Keep original outputs for one bounded comparison, at most six provider requests/three minutes (three existing and three revised turns), only with an approved workspace credential. This is not a guarantee of real-use usefulness or a new manual operating routine.
- Distinguish same-meaning freshness/ranking changes from real content/evidence change, expiry, deletion, Memory clear and permission withdrawal. Preserve readiness, legacy-reference and no-revival controls.
- Cover raw-save/request/result-write failure, conflict/lost acknowledgement, edits/withdrawal/Forget during a request and late results. No extra branch-failure matrix.
- Request a step naturally, keep it through an ordinary reply and return, decline/revise it, and discuss an outcome. Task creation stays deliberate and completion remains neutral.
- Run affected actual-component, privacy, keyboard/axe and four-width checks, then the repository's existing release gates when publication is requested. Preserve previous failed receipts and separate technical passes from Can's real-use verdict.

The local BUG-145 source-window/notice patch remains a narrower fix, not completion of continuity. This plan now records the local v3.5.0 implementation. The native codec reads schemas1/2/3 and upgrades on deliberate writes; older editing devices must update. A native document from a future unsupported version has no creation/import composer, preventing an accidental downgrade through the Markdown fallback. There is no automatic journal migration on open. Commit/publication retain the existing explicit authorization requirements.

## Verification receipt

The first broad fresh run (`.context/fresh-F9H2cj/`) completed the assertions but is not accepted as clean proof: its Explore child timed out and handled the signal with exit0, which the runner incorrectly accepted. Preserve that receipt. BUG-148 now requires a zero exit without spawn error/signal; a real handled-timeout before/after control covers it. The Explore fixture uses the existing advancing morning clock and explicit connection cleanup, without changing product timing or assertions. Final fresh proof:13 first-attempt passes, zero failures/flakes/timeouts,37.9s, with unchanged inputs (`.context/fresh-eifc2b/receipt.json`; concise receipt `.context/explore-single-request/verification.json`). Six fictional transport outputs pass through the actual handler, with no live provider calls. No approved workspace test key is available, so prose quality and Can’s normal-use verdict remain unverified. Claude’s requested critique remains unavailable at the configured monthly spend limit. Full exact-candidate release proof is still required when publication is requested.

**Publication:** Can authorized commit/push to dev November6. Reconcile onto the already-published v3.4.2/input-fixture commits, preserve their release history, and preserve the separately published v3.4.3 poem commit and keep unrelated pending chevron edits outside this candidate. Master publication is not authorized by this request.
