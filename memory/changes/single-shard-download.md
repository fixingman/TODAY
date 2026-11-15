---
bug: Single functional artifact download fails the CI result combiner
status: ⏳ Verify
summary: Small selected runs download flat evidence; the combiner previously searched only subdirectories.
---
Observed in [README dev run 43774360676](https://github.com/fixingman/TODAY/actions/runs/43774360676) at 90ae004e: planning and both functional checks passed, but final merge failed with `Missing or extra functional shard`. The download log confirms one matched artifact extracted directly into `.context/ci-shards` despite `merge-multiple: false`.

The local real-command fixture reproduced that failure before the fix. The combiner now accepts a complete flat artifact only for one planned worker; multi-artifact layouts remain nested. It still rejects missing/extra/mixed shards, wrong SHA/run-attempt/input/environment, failed/retried suites and absent original logs. Two-suite flat and nested transport fixtures pass alongside the existing 36-suite multiworker fixture. Preserve the failed run; hosted verification of an actual single-worker selection remains open until observed.
