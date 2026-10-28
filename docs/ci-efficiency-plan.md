# CI efficiency implementation plan

Status (October 28): phases 1–2 are published in v2.105.2 (`776dee3e`) on dev/master. The completed dev Linux artifact verifies 58 passes, zero flakes/failures, unchanged inputs, zero selection misses and all five performance runs. This is one candidate checkpoint; the same SHA on master is confirmation, not a second candidate. The requested CI handoff documentation is the next normal candidate. Selective CI stays inactive until its shadow result is reviewed. Phase 3 release-evidence reuse remains planned.

## Starting point

- `.github/workflows/test.yml` runs the complete suite plus five-run performance on every dev/master push and matching PR. The current inventory is 54 functional suites; derive that inventory rather than hardcoding its count in new tooling.
- `scripts/test-all.mjs` already retains every attempt, caps suite execution and treats a diagnostic retry pass as flaky/failing. Preserve those semantics.
- `.github/workflows/performance.yml` independently measures deployed dev each night. The October 28 v2.103.5 result still fails worst cold TBT at 425ms / 200ms; CI efficiency does not resolve BUG-135.
- `memory/Housekeeping.md` currently requires the full local gate on every push. Change that rule only when the corresponding workflow replacement is activated.

## Intended check policy

| Event | Required work |
|---|---|
| Local development / ordinary dev push | Cheap invariants plus affected suites and explicitly mapped dependents. No automatic five-run benchmark. |
| Shared foundation, unknown path, missing diff base or CI policy change | Full functional suite. Run performance early for startup/audio/loading/performance changes. |
| Explicit release candidate on dev | Full Linux suite and all five performance runs on the exact candidate SHA, unchanged budgets. An already successful full run for the same SHA/policy may supply this evidence. |
| Promotion to master | Verify complete release evidence before pushing. Run cheap invariants and an explicit evidence check on master; reuse the full result only for the identical SHA. |
| PR | Select against the PR merge base; keep an always-running final check. A master-targeting integration must have full release evidence for the actual integration SHA. |
| Nightly | Keep deployed five-run performance, version checks, original failures and traces. It remains distinct from source-based release evidence. |

A normal dev pass means the selected checks passed; it must never be labelled production-ready. No new automatic model calls, evaluator, platform migration, database or paid service.

## Step 1 — Reduce output and wasted runs

Implemented locally in the existing runner/workflow, keeping the full test policy:

- Extend `scripts/test-all.mjs` with a machine-readable summary: candidate SHA, selected/executed suites, durations, passed/flaky/failed counts and evidence paths. Keep complete first/retry logs in the existing artifact directory; show only bounded error excerpts and links in the terminal/GitHub summary. Update `scripts/ci-tooling-test.mjs` so bounded excerpts must retain the actual error, including errors preceding long stack traces.
- Record workflow, runner, Node and Chrome versions with results. Use current run data to establish routine and full-gate duration baselines; do not promise an unmeasured speed target.
- Cancel superseded routine dev/PR runs using separate concurrency groups per workflow/event/branch or PR. Do not let routine pushes cancel an explicit release check or combine unrelated branches.
- Agents hand off after a push: share the CI link/current status and end the turn. No automatic polling, background watches or waiting updates; inspect status once when Can asks. Monitor until completion only when explicitly requested, using compact summaries and necessary failure logs. Existing validation and publication gates remain required.

Acceptance: synthetic pass/fail/flaky/timeout fixtures preserve exit behavior and complete evidence; summary output stays bounded as log size grows. Measure the reduction in emitted output. Existing full CI still works.

Local phase-1 evidence: tooling fixtures cover pass/flaky/fail, large output, real child timeouts, invalid inventory and event/branch/PR concurrency. A synthetic large failure retains 469,880 log bytes while emitting 1,483 terminal bytes (99.7% less). All 54 functional suites pass with zero failures/flakes in 342.9s on the local Node 24/macOS environment. All 114 runtime/test/workflow fingerprints remain unchanged through validation. Payload, workflow YAML syntax, memory inventory and whitespace checks pass. The unchanged five-run performance benchmark was not rerun for this reporting-only patch. This is one local full-gate duration sample, not a Linux latency promise. Hosted cancellation/step-summary behavior remains pending publication; no selective execution or release-proof reuse is active.

## Step 2 — Cover the full inventory and improve CI reliability

**Scope clarified by Can, October 28:** do not limit this phase to a small pilot. Its goals are lower agent/token consumption, less repeated execution and fewer CI-only failures. Cover the entire current test inventory and relevant repository paths, while retaining conservative full-run fallbacks. Selecting fewer tests does not repair a flaky fixture or a real app regression.

Keep one canonical suite inventory in the existing runner. Add an explicit selector (`scripts/ci-plan.mjs`) and a runner option for executing named suites; preserve `npm test --prefix scripts` as the full gate.

- Classify every registered suite and relevant tracked runtime/server/tooling path: explicit feature/dependent coverage, a justified full-run boundary, or a documented non-runtime category. Audit real module consumers and shared contracts, including AI surfaces, integrations, sync/storage, focus/timers, memory, task capture/actions/order/zones, accessibility/visuals, platform/offline, and CI tooling. Inventory validation must expose missing classifications; unknown future paths still force a full run. Do not infer safety merely because a filename matches a feature.
- Audit fixtures across the whole inventory for the known CI-only failure classes: wall-clock/day boundaries, local folders/files, unloaded or fallback fonts, mismatched CSS/JS hover/pointer state, fixed sleeps, incomplete async readiness/cleanup and mocks intercepting unrelated writers. Repair confirmed defects using isolated fictional fixtures and observable state. Give each repair a failing-before/passing-after control; preserve actual app assertions and production deadlines. Reuse existing test utilities where they fit rather than creating a new test framework.
- Establish an explicit reproducible Linux browser environment and record its effective versions/input/font/clock state. Check clean-checkout behavior, not only an existing macOS workspace. Keep genuine product, payload and deployed startup failures visible as repair work (including BUG-135); a shorter selected run cannot close them. Do not increase budgets, replace original failed measurements or treat a passing retry as a fix.
- Cheap checks for runtime/tooling changes: inventory validation, syntax, design/token/component contracts, payload, smoke, memory inventory and whitespace. Confirm their measured cost before expanding this set. Documentation-only changes may take an explicit lighter path after cross-file release metadata is checked; do not classify executable tooling, fixtures or performance policy as prose.
- Shared shell/CSS (`index.html`), bootstrap, registry/utilities, service worker, shared sync/storage/day/render paths, dependency manifests, workflow/selector/budget changes and unknown paths fall back to the full functional gate. Mark startup/audio/loading/performance changes for the five-run benchmark as well.
- Account for mandatory release metadata: a naive index.html/sw.js path fallback would otherwise make virtually every versioned change run everything. Permit a narrow metadata exception only when a deterministic comparison proves that changes are confined to the existing literal CHANGELOG/DEV_HOURS declarations and CACHE_VERSION declaration, with every byte outside those uniquely identified declarations unchanged. Validate the supported literal syntax, version agreement and allowed fields; keep payload/smoke/design and About coverage. An ambiguous parse, additional declaration, executable expression, cache resource-list edit or any CSS/JS outside those declarations forces full validation. This exception does not make mixed runtime edits metadata-only.
- A changed test selects itself and relevant dependents. New/unmapped test files force a full run; the global inventory check still rejects an unregistered suite. Renames and deletions inspect both old/new paths.
- Compare every commit in the push, not just `HEAD^`. PRs use their merge base; fetch the required history explicitly. Missing/invalid bases, new branches and force pushes fall back to full validation. Local selection must include staged, unstaged and relevant untracked files; release evidence always comes from a committed checkout.
- Print the reason for every selected group or full fallback. No learned selector or silent exclusion list.

Validate in shadow mode on the next two normal candidate full runs: calculate selections but still execute everything. Any failure outside the selection blocks activation until its dependency mapping or fallback is corrected. This is a minimum implementation check, not proof of complete dependency coverage.

Acceptance fixtures: multi-commit push, PR base, first/force push, rename/delete, unknown module, shell/shared-core edit, changed/new test, docs-only change, valid version-only edits, metadata plus a hidden runtime/cache-list edit, ambiguous metadata boundaries, invalid suite name and missing history. Mapped feature cases include all reviewed dependents. Selection errors fail or broaden the run; they never silently run zero checks.

Phase 2 is complete only when the full inventory/path classification is reviewed, selector edge cases pass, confirmed fixture repairs have causal regression coverage, and clean Linux plus shadow results establish both coverage and reproducibility. Report selected/executed suites, duration, output bytes and remaining unexplained CI-only failures separately. Do not claim reliability improvement from checks that simply stopped running. The two normal full runs are integration checkpoints, not a reason to limit the scope or perform repeated full rerolls.

## Step 3 — Run full release validation once

Add an explicit release mode to CI, with a small status/promotion preflight helper. Use GitHub's existing workflow runs and artifacts; no separate result service.

- Dispatch a full run for a recorded candidate SHA, check out exactly that SHA and verify the executing workflow/test policy matches it. Require the candidate to be on dev. Keep full logs and the unchanged five-run performance result together with a compact release report. Reuse an automatic full run only if its report proves the same required coverage.
- Before promotion, verify the trusted repository/workflow identity, completed successful run, exact candidate SHA, report schema/policy, complete current inventory, zero failures/flakes and all five performance results. Missing, expired, cancelled, failed, partial or malformed evidence blocks promotion and requests full validation. A version number alone is insufficient.
- Recheck remote refs immediately before promotion. Initially support identical-SHA fast-forward promotion only. A merge, squash, rebase, follow-up metadata commit or different integration SHA requires fresh validation of that resulting candidate. Never rewrite or force master to reuse evidence.
- The master push performs cheap invariants and explicitly verifies that evidence; it must not report success merely because the full job was skipped. Inspect branch protection/rulesets before choosing the final check name and event wiring. Preserve the existing required check until its replacement is proven. Do not silently change repository protection settings.
- Keep a final push/PR check with `always()` and explicit dependency/result validation. A manual dispatch alone is not a PR-required-check replacement. Do not use workflow-level path skips for a required check.
- Bootstrap the new release workflow on the default branch through the existing full gate before depending on manual dispatch. Until dispatch, evidence verification and required-check behavior are proven, keep the existing full gate on master.
- For PRs, do not reuse head-only evidence when the integration/merge SHA differs. Initially retain a full master-targeting PR run if the exact integration proof cannot be reused safely.

Acceptance: valid same-SHA reuse avoids a duplicate benchmark; wrong SHA/workflow/policy, dev advancing, non-fast-forward promotion, missing artifact, expired proof, partial run, hidden flake, cancelled run and failed dependencies cannot approve a release. A newer routine run cannot cancel the release evidence run. No branch promotion is performed during fixture tests.

## Activation, measurement and rollback

Deliver these as three small changes in order. Step 1 gives immediate output savings. Step 2 remains in shadow mode before reducing dev checks. Step 3 removes duplicate local/dev/master release work only after evidence validation passes.

At activation, update `.github/workflows/test.yml`, any new release workflow, `scripts/package.json`, `memory/Rules.md`, `memory/Housekeeping.md` and `memory/Test-matrix.md` together. Document that local development uses targeted validation, while the single authoritative full release run is the hosted Linux candidate run. Do not continue requiring full local + full dev + full master validation by habit after the replacement is live.

For the first five releases, retain compact metrics: ordinary dev duration, number of executed suites, full-run count per SHA, benchmark count, output bytes, failures found outside the original selection and CI-only failures. The goal is one full release validation per unchanged candidate, lower routine latency and smaller agent inputs; use measured results to set duration targets. Avoid aggressive browser-suite parallelism initially, which could change timing/resource contention and muddy performance evidence.

Rollback is a full-run mode/workflow switch that restores the existing policy, without deleting failure history or increasing limits. Any missed dependency forces broader selection immediately. Keep BUG-135 and any deployed failures visible throughout; reducing duplicate checks is not evidence those bugs are fixed.

## GitHub constraints checked for this plan

- [Workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency): cancellation must use separate groups for independent work.
- [Manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow): dispatch requires the workflow on the default branch; branch selection is explicit.
- [Required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks): latest/integration SHA matters; dispatch checks alone do not satisfy PR rules; workflow path skips and skipped dependent jobs need explicit handling.

Local CI-only candidate evidence:57/57 checks pass, zero flakes/failures in308.5s; full shadow fallback selects/executes57 with zero misses. All five performance runs pass unchanged budgets (1200.4KiB decoded /340.8KiB Brotli /38 scripts; median cold FCP6672ms and Focus40ms). All168 runtime/test fingerprints remain unchanged through functional and performance gates. Complete child output77,356 bytes; runner terminal output1,941 bytes. The eight-check runtime invariant set totals8.488s in this macOS run; the docs subset totals2.703s. These are local measurements, not Linux promises or evidence of activated selection savings. Actual raw-font-path before controls and initial inventory failure are retained. Clean hosted Linux and two normal candidate shadow checkpoints remain pending; this local run does not count as either checkpoint.

Publication integration: dev advanced to v2.105.0 before the requested push. The release candidate is rebased onto92e8f317 with all published pool/Sunday runtime bytes preserved and58 total checks. Metadata is v2.105.1; the prior57-check CI-only result remains historical evidence, not proof of this new integration. Hosted Linux and two normal shadow reports remain required before activation.

**v2.105.1 CI integration, October28:** the original five-run local benchmark on Chrome152/Node20 fails cold TBT at244ms/200ms (runs244/0/0/0/0). Original-run attribution records225.5ms in unchanged sound.js and116.5ms in the page script. All58 functional suites passed on Node24 with zero failures/flakes. The benchmark shell selected unsupported Node20 in the isolated directory; a separately labelled explicit-Node24 comparison is retained without replacing this original or claiming it explains/fixes the browser stall. Published runtime bytes are unchanged; BUG-135 remains open.

The explicit Node24.14.0/Chrome152 configured-environment comparison passes all five runs, worst cold TBT141ms/200ms. This does not erase the original Node20 failure or establish that Node caused or fixed the browser stall. All170 runtime/test inputs remain unchanged through both benchmarks; BUG-135 stays open.

Final publication integration: the pool session reserved and published v2.105.1 (05bde9eb), so this CI release is v2.105.2. Compared with the validated58-suite CI integration, only literal release metadata and the published three-line pool font-test strengthening differ in runtime/test inputs. Application code outside supported metadata declarations is byte-identical. Revised pool, metadata/smoke/About/offline and CI invariants are checked locally; hosted Linux runs the full58 checks and unchanged five-run performance on the final committed SHA. Prior full and failed timing evidence stays retained; no automatic release-proof reuse or selective CI activation is introduced.

Final v2.105.2 local integration validation: exact app-shell/SW metadata-normalized equality passes, all other runtime/test inputs match the prior full58-check result except the published pool font fixture. The revised pool suite plus smoke/About/offline/design and CI invariants/planner/tooling pass8/8, zero flakes/failures, with unchanged inputs. The configured Node24/Chrome152 five-run performance evidence applies to identical runtime bytes outside literal metadata; original Node20 failure remains retained. The pushed commit still requires its complete hosted Linux gate.

Current checkpoint evidence and activation criteria: [CI shadow checkpoints](ci-shadow-checkpoints.md). Historical local candidates below/above are retained evidence, not additional completed Linux candidate checkpoints.
