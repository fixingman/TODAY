# CI phase 2 shadow checkpoints

Two distinct normal candidates must pass the full hosted Linux shadow gate before selective CI is enabled. Duplicate dev/master runs of one SHA count once. A passing fallback run is evidence of workflow/environment reproducibility; it does not prove every dependency mapping.

| Candidate | Selected / executed | Result | Duration | Output | Performance |
|---|---:|---|---:|---:|---|
| [v2.105.2 ·776dee3e](https://github.com/fixingman/TODAY/actions/runs/40761327719) | 58 / 58 |58 passed;0 flaky, failed or selection misses; inputs unchanged |499.6s |82,009 child bytes /2,011 runner-terminal bytes |5 runs pass; worst cold TBT50ms /200ms |
| v2.105.3 ·CI handoff documentation | Pending committed run | Pending | — | — | Full gate remains required |

Checkpoint 1 provenance: artifact12848054299 (`ci-evidence-40761327719`), SHA776dee3e9274fd471dbd6f12c8ba978706664746. Extracted only summary/plan/browser-environment/performance JSON; successful per-suite logs were not read. Node24.14.0, Chrome152.0.7977.75, Ubuntu image20261026.354.1, x64. Local retained JSON: `.context/ci-phase2/checkpoints/776dee3e/`.

Checkpoint 2 is the real documentation change requested by Can: push/link/end-turn, one status check when asked, explicit opt-in for continuous monitoring. It also corrects stale phase-2 status. App code stays byte-identical outside uniquely parsed CHANGELOG/DEV_HOURS and CACHE_VERSION declarations. The selector should keep cheap invariants plus About/offline coverage; the hosted shadow runner still executes the entire inventory.

Before activation: inspect the second completed summary and unchanged inputs; require all registered suites executed, zero failed/flaky results and no failure outside selection. Correct any miss before enabling affected-suite execution. Update workflow/package/Rules/Housekeeping/Test-matrix together, retaining unknown/shared/tooling full fallbacks, full release/master requirements and unchanged performance budgets. Phase 3 proof reuse is separate.

After a push, record the run link and end the agent turn. A pending result is not a pass. Do not create a dummy commit or rerun an unchanged SHA just to fill this ledger. BUG-135 and original failed measurements remain open evidence.
