# CI phase 3 — exact-candidate release evidence

Bootstrap release v2.105.6, October 29. **Reuse is disabled** (`CI_RELEASE_REUSE: 'false'`). Full master/release checks remain active. This implementation does not promote a branch or change repository protection. Phase 2's dev rollout confirmation is separate.

## Commands

Run from a clean checkout of the exact candidate, using the supported Node version. SHA means a full 40-character commit ID, never a version number or moving branch name.

```sh
npm run release:status --prefix scripts -- SHA
npm run release:preflight --prefix scripts -- SHA --run RUN_ID
npm run release:dispatch --prefix scripts -- SHA
```

Status and preflight are read-only apart from refreshing remote-tracking refs and temporary artifact files. Neither pushes or modifies repository protection. Dispatch explicitly starts one full dev workflow for the recorded candidate, then returns; do not poll/wait. The default branch must already contain the same release workflow before dispatch is allowed. Dispatch checks current dev again and supplies `mode=release` plus `candidate=SHA`; the workflow checks that its candidate, checkout and executing workflow SHA agree.

Without `--run`, preflight inspects the current successful dev runs for that SHA once. Missing, pending, failed, cancelled, partial, expired or incompatible evidence requests full release validation. It never silently accepts an old version-equivalent result. A selected-only run is not release approval; an automatic dev full fallback may supply proof only when every suite and all five performance runs actually passed.

Promotion remains an explicitly authorized action outside the helper. Immediately before an authorized identical-SHA fast-forward push, run preflight again. Dev must still point to the candidate, master must remain unchanged during verification, and master must be an ancestor. A merge, squash, rebase, metadata follow-up or other new SHA needs its own evidence. Never force master to fit an old proof.

## Evidence contract

The existing `test` workflow writes `.context/release-evidence.json` after all required checks succeed. It retains the original full logs/performance JSON and a compact proof in `ci-evidence-RUN_ID-ATTEMPT` for 30 days. PR and master runs cannot become dev promotion evidence.

Verification checks:

- The fixed `fixingman/TODAY` repository, dev source branch, trusted test workflow ID/path, completed successful run and matching run attempt.
- Exact candidate/checkout/end-of-checkout and executing workflow SHA, plus the actual workflow ref/event in the functional report.
- Hashes of committed runtime/test/workflow inputs and the complete test/tooling/workflow policy, including budgets and dependency locks. Tracked input edits and changed input fingerprints refuse proof creation.
- The canonical inventory, every suite executed exactly once with a passing first attempt, zero failures/flakes/timeouts and no missed selection. Incomplete/running or selected-only evidence is rejected.
- The pinned Linux/Node/Chrome environment, local-source benchmark, original CPU/network profile, current app version, current budgets, byte/script limits and every worst-of-five timing. Measurements are checked against budgets rather than trusting the stored `pass` label.
- Artifact run/attempt/SHA, expiry and GitHub's SHA256 archive digest. Downloaded archive bytes must match; only the fixed proof JSON member is read, with bounded size. Downloaded code is never executed.

The final `test` job step runs with `always()` and validates explicit dependency outcomes. With reuse off, full master checks keep running. If reuse is later enabled for master pushes, the proof verifier either permits cheap invariants or falls back to the complete gate. A missing proof cannot cause a green skipped job. Master-targeting PRs remain full because head-only proof cannot approve a different integration SHA.

## Activation gates and rollback

1. Phase 2's hosted dev rollout was confirmed passed by Can on October 29 ([run40872255422](https://github.com/fixingman/TODAY/actions/runs/40872255422)). Review this implementation and its offline mutation/CLI tests.
2. Bootstrap this workflow on the default branch through the existing full gate, under explicit publication authorization. Do not depend on manual dispatch before bootstrap.
3. Verify a real exact-SHA full dev run creates an accepted report, dispatch validates the recorded candidate, and the artifact verifier accepts that exact run while rejecting wrong/expired/partial inputs.
4. Confirm required checks/rulesets before enabling reuse. Branch-protection reads currently return HTTP403 with this token; the existing `test` job name and check remain in place. No protection settings were changed.
5. Verify hosted reuse/fallback/final-check behavior, then explicitly enable the switch and update Rules/Housekeeping/Test-matrix together. Only then replace repeated local/dev/master release work with the hosted authoritative proof. Until then, existing full local release requirements remain.

Rollback is `CI_RELEASE_REUSE: 'false'`: full master functional and five-run performance checks resume; routine phase-2 selection is independent. Original CI and deployed BUG-135 failures remain retained. For the first five releases record full runs/benchmarks per SHA, routine duration, output bytes, failures outside selection and unexplained CI-only failures.

## GitHub references

GitHub documents [workflow dispatch and default-branch availability](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch), [executing workflow variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables), and [artifact metadata, expiry and digest](https://docs.github.com/en/rest/actions/artifacts). These constraints explain the bootstrap and provenance checks; they are not evidence that this bootstrap has passed hosted activation.

Bootstrap publication validation:59/59 suites passed, zero flakes/failures in336.4s, with unchanged runtime/test/workflow fingerprints. All five performance runs passed unchanged budgets; worst cold TBT53ms /200ms. Node24.14.0 / Chrome152.0.7977.75. Hosted exact-commit/bootstrap and proof reuse acceptance remain pending; CI_RELEASE_REUSE stays false.
