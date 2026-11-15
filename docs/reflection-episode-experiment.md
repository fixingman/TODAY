# Commitment episode experiment

Implemented as local developer tooling, not an app feature. The question is whether a task's return and later resolution support a useful feeling reflection that current day-level comparisons miss. A record list in Memory is explicitly not the proposed payoff.

## Run

```sh
node scripts/reflection-episode-experiment.mjs \
  --backup /absolute/path/outside/repository/today-backup.json \
  --today YYYY-MM-DD
node scripts/reflection-episode-test.mjs
```

Use the current local calendar date for `--today`. The explicit date makes the analysis reproducible, including rollover and expiry. `snapshotAgeDays` compares calendar dates using the backup timestamp's UTC date; it is an approximate freshness indicator, not installed-state proof. Use the appropriate environment's existing backup. The tool reads the supplied file without changing it. It makes no network/model calls, writes no reports, changes no app state and does not extend retention. Do not redirect private results into the repository or paste personal backups into fixtures.

The JSON report contains aggregate coverage, exclusion reasons, four route summaries and any review-only signals. It omits task text, identifiers, link keys, private reasons, historical insight prose and per-episode dates. Errors omit filesystem paths and malformed JSON excerpts. Aggregate results are still personal information; they are not telemetry or anonymized data.

## Episode and evidence rules

Only the current thirty calendar days are eligible. Require reflection opt-in, valid categorical words and dates, and the reflection/Memory clear watermarks. Resolve conflicting reflection edits by latest timestamp; equally timed different feelings make that day unknown. Exclude backfilled events, missing link keys and keys associated with different live completion ids. Do not reconstruct identities from task titles or other sources. Text-hash linkage remains approximate even after these checks.

The fixed routes are Soon pull → done, Soon pull → let go, return from Past → done, and return from Past → let go. Follow each start to the next recorded date for the same key. A restart interrupts the earlier episode; it is not a failed resolution. Same-day start/resolution, conflicting endings, absent later outcomes and missing endpoint feelings cannot establish a complete episode. Do not skip an earlier terminal event to find a later one with a conveniently recorded feeling. Missing events can reflect bounded-history loss; they do not prove that a task stayed unfinished.

Record task/episode counts for coverage, but deduplicate matching date-pairs for analysis. Count distinct start and resolution days, not tasks, for feeling rates. Dates belonging to any recognized start/key history stay out of the baseline. Baseline days require a reflected feeling and an observed completion/release without a linked episode date; these are other recorded outcome days, not a representative sample of all evenings. Unlinked or renamed tasks can still contaminate that comparator.

## Screening and sensitivity

For each route and each of the eleven valid feeling words, compare the feeling's resolution-day frequency with both start-day frequency and baseline frequency. This is a fixed set of **44 exploratory hypotheses**, not a discovery engine or a significance test.

A review-only signal requires:

- At least four distinct start days, resolution days and baseline days.
- At least four disconnected components in the date-pair graph. Shared start, end or chained dates connect episodes; these components are not proof of statistical independence.
- At least three occurrences on the stronger episode side.
- Differences of at least thirty percentage points against both comparators, in the same direction.
- All requirements and the direction must survive removing each contributing date, including every pair sharing that date and each baseline date. This deliberately requires more original support than a single four-day group can supply.

These conservative screening rules reuse familiar minimums as research choices; they are not validated statistical confidence thresholds. Multiple hypotheses, selected evenings and other things happening on the same dates remain confounders. Feeling words are never ordered into a good/bad score. There is no automatic prose generation, winner optimization, live adaptation or assertion of cause.

`no_supported_reading` means nothing passed this experiment's screen. It does not establish that the history contains no useful meaning, or that the person should record more.

## Review and next decision

For a surviving signal, inspect linkage and source coverage privately, check existing feeling feedback for rejected claims/topics, and formulate at most a small number of explicitly tentative readings. A different name or episode route does not authorize repackaging a rejected observation. Show a reading only after those checks; ask whether it adds recognizable, useful meaning beyond the facts. Passing the screen alone supplies no usefulness verdict.

If nothing survives, report the actual coverage limitation without lowering thresholds to produce output. Decide whether to pursue another interpretation mechanism, revisit evidence requirements with a reason, or stop this route. New sources, retention changes, raw-data model access and runtime UI are separate decisions.

Tests use fictional backups only and cover linkage, repeated/shared days, baseline disagreement, leave-one-date-out failure, source edits/clear/opt-out/expiry, approximate-key ambiguity, unknown outcomes, non-mutating execution and CLI privacy. The owning CI suite is `reflection-episode-test`; tooling inventory includes it. No app/SW version bump is needed because shipping code is unchanged.
