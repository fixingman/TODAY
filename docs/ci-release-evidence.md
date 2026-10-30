# CI phase 3 — exact-candidate release evidence

**Complete — October 30, v2.106.0 on dev/master (`2b5f229cb4f50d2d30559b62698d691aacbbb7c1`).** [Dev40962438500](https://github.com/fixingman/TODAY/actions/runs/40962438500) supplies accepted exact-SHA Linux proof: 61 suites, zero failures/flakes and all five performance runs. [Master40964846722](https://github.com/fixingman/TODAY/actions/runs/40964846722) verified `reuse=true` and passed in 15 seconds. Duplicate functional/performance work and npm/browser setup were skipped; cheap invariants and the final dependency check passed. Source artifact12937236095 and master artifact12937971159 digests/provenance were verified. Missing/incompatible proof keeps the full gate. The helper never promotes branches or changes repository protection.

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

The final `test` job step runs with `always()` and validates explicit dependency outcomes. With reuse off, full master checks keep running. Reuse is enabled for master pushes: the proof verifier either permits cheap invariants or falls back to the complete gate. A missing proof cannot cause a green skipped job. Master-targeting PRs remain full because head-only proof cannot approve a different integration SHA.

## Completed activation evidence

- Bootstrap dev40877228706 and master40877229222 passed on9888bf51. The default-branch workflow is available.
- Real dev preflight accepted artifact12898179670 (`ci-evidence-40877228706-1`), archive digest `sha256:a4fa7d5968b906537b363b6e6a816da5d6e3259be65e4044b1a8ba77772fdbbb`, policy digest `e722714c0419de0478717fe3de4e42e5caa12cf03eafb26d0be0e0afd1e1b67a`. Candidate/dev/master refs matched exactly.
- A local integration probe used that real hosted proof: reuse accepted, cheap invariants passed and the final check accepted skipped duplicate suites/benchmark. An actual wrong-checkout CLI invocation returned `reuse=false`; skipped fallback gates were rejected. This historical local probe preceded the accepted hosted master reuse above.
- Branch metadata on October30 confirms dev/master `protected=false`, no required status contexts, and zero repository/parent rulesets. The protection-details endpoint still returns403, but the branch/ruleset endpoints resolve the earlier configuration uncertainty. Existing `test` check is retained; no protection was added or removed.
- The candidate's offline CLI fixtures now execute fallback and final-check scripts in a disposable Git checkout, so future hosted full validation also exercises that refusal path. Rollback configuration must pass tooling tests; tests accept an explicit true or false switch rather than requiring bootstrap false forever.

Completed sequence:

1. Recorded-SHA release dispatch [40958666191](https://github.com/fixingman/TODAY/actions/runs/40958666191) passed for bootstrap9888bf51; artifact12935645833 was accepted by preflight. The API credential can read Actions evidence but dispatch returns403, so dispatch used the authenticated UI. No access was expanded.
2. v2.105.7 enabled reuse; v2.106.0 superseded that activation candidate and received its own complete hosted dev proof. The cancelled older dev run is not used as evidence.
3. Exact-SHA preflight accepted v2.106.0 before its authorized identical-SHA master promotion. No metadata commit was added during promotion.
4. The hosted master receipt verified reuse from dev40962438500/artifact12937236095, with duplicate setup/suites/benchmark skipped and cheap invariants/final dependency checks passing.

All three CI-efficiency phases are complete. The first-of-five release measurement is retained locally in `.context/ci-phase3-enable/.context/release-metrics.json`; record the next four during normal releases, without creating extra runs. Ordinary local work stays targeted; promotion relies on authoritative hosted dev proof. Pending results never approve promotion. After dispatch/push, share the link/status and end the turn; review a compact completion report when asked, without polling. Rollback is `CI_RELEASE_REUSE: 'false'`, restoring full master functional and five-run performance checks; routine phase2 selection is independent. Keep original failures and deployed/installed BUG-135 and hosting BUG-138 open.

## GitHub references

GitHub documents [workflow dispatch and default-branch availability](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch), [executing workflow variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables), and [artifact metadata, expiry and digest](https://docs.github.com/en/rest/actions/artifacts). These references explain the workflow and provenance constraints; actual activation evidence is recorded above.

Historical activation local validation:11 affected/invariant/metadata checks passed with zero flakes/failures in96.9s; runtime/test/workflow inputs unchanged. Reuse-path policy, payload and invariants also pass with node_modules removed and CHROME_PATH pointing to a missing browser. This local check preceded the accepted hosted proof and master reuse above.
