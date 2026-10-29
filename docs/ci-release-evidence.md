# CI phase 3 — exact-candidate release evidence

Activation dev candidate v2.105.7, October 30. The9888bf51 bootstrap and explicit release dispatch are verified. This new candidate must obtain its own full Linux dev proof before identical-SHA master promotion. Verified reuse skips duplicate functional/performance work and npm/browser setup; missing proof keeps the full gate. The helper never promotes branches or changes repository protection.

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

## Activation evidence and remaining gates

- Bootstrap dev40877228706 and master40877229222 passed on9888bf51. The default-branch workflow is available.
- Real dev preflight accepted artifact12898179670 (`ci-evidence-40877228706-1`), archive digest `sha256:a4fa7d5968b906537b363b6e6a816da5d6e3259be65e4044b1a8ba77772fdbbb`, policy digest `e722714c0419de0478717fe3de4e42e5caa12cf03eafb26d0be0e0afd1e1b67a`. Candidate/dev/master refs matched exactly.
- A local integration probe used that real hosted proof: reuse accepted, cheap invariants passed and the final check accepted skipped duplicate suites/benchmark. An actual wrong-checkout CLI invocation returned `reuse=false`; skipped fallback gates were rejected. This is not a claim that the master workflow has exercised hosted reuse yet.
- Branch metadata on October30 confirms dev/master `protected=false`, no required status contexts, and zero repository/parent rulesets. The protection-details endpoint still returns403, but the branch/ruleset endpoints resolve the earlier configuration uncertainty. Existing `test` check is retained; no protection was added or removed.
- The candidate's offline CLI fixtures now execute fallback and final-check scripts in a disposable Git checkout, so future hosted full validation also exercises that refusal path. Rollback configuration must pass tooling tests; tests accept an explicit true or false switch rather than requiring bootstrap false forever.

Remaining sequence:

1. Recorded-SHA release dispatch [40958666191](https://github.com/fixingman/TODAY/actions/runs/40958666191) passed for9888bf51, and its actual artifact12935645833 is accepted by preflight. The API credential can read Actions evidence but dispatch returns403, so routine dispatch needs the authenticated UI or a credential explicitly authorized for Actions write. No access was expanded. This is a bootstrap acceptance run, not routine duplicate validation. Hand off immediately; do not poll or wait. The dev ref must remain9888bf51 until it finishes.
2. With dispatch acceptance complete, publish this activation candidate to **dev first**. Its new SHA/policy cannot reuse the9888bf51 report. Local affected checks precede one authoritative full Linux suite/five-run result on that exact dev commit.
3. When that dev result passes, run exact-SHA preflight and recheck refs immediately before the authorized identical-SHA master fast-forward. Do not add metadata commits during promotion.
4. Confirm the hosted master receipt says `reuse=true`, duplicate functional/performance steps were skipped, and cheap invariants/final dependency checks passed. If proof is missing/incompatible, full master validation must execute. Only then close phase3 and measure the first five releases.

Once the activation is published, ordinary local work stays targeted; promotion relies on the authoritative hosted dev proof rather than repeating full local/dev/master validation. Pending results never approve promotion. Rollback is `CI_RELEASE_REUSE: 'false'`, restoring full master functional and five-run performance checks; routine phase2 selection is independent. Keep original failures and deployed BUG-135 visible.

## GitHub references

GitHub documents [workflow dispatch and default-branch availability](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch), [executing workflow variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables), and [artifact metadata, expiry and digest](https://docs.github.com/en/rest/actions/artifacts). These constraints explain the bootstrap and provenance checks; they are not evidence that this bootstrap has passed hosted activation.

Activation local validation:11 affected/invariant/metadata checks passed with zero flakes/failures in96.9s; runtime/test/workflow inputs unchanged. Reuse-path policy, payload and invariants also pass with node_modules removed and CHROME_PATH pointing to a missing browser. The new commit still requires a full hosted Linux dev proof before master promotion.
