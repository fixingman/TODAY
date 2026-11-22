---
bug: Daily-history row can swallow unbanked focus minutes at rollover
status: ⏳ Verify
summary: Cleanup skips unbanked focus minutes when another history row already exists, then resets the counter.
---
**Report (Can, November23):** Friday November20 focus minutes disappeared from About after previously showing approximately1–2h. Exact minutes, device sequence and when the disappearance occurred are unknown. Related repairs BUG-063 and BUG-066 cover midnight snapshot ordering and adopting synced counters with their dates; those fixes remain in place.

**Reproduction:** seed a fictional outgoing-day history row with focus0 and a correctly dated local live counter of90. `applyNewDayCleanup()` finds the existing row, skips the snapshot and resets the counter to0; About cannot show those minutes. The actual-component regression fails before repair with `minutesRetained:false`, other row/count/reset checks true and no app error. This establishes an independent defect, not the confirmed cause of Can’s historical data.

**Repair:** merge the outgoing-day snapshot before reset through existing `sync-merge.mergeDailyHistory` and `_sanitizeDailyTasksAdded`, preserving per-field maxima, fixed-count precedence, one row/date and30-row retention. Never add totals. Preserve richer rows and the BUG-063 distinction between yesterday’s snapshot and today’s minutes. No live history or backup was read/rewritten and no estimated minutes were restored.

**Verification:** retain failing control and final scoped evidence in `.context/friday-focus-history-20261123/`. Tests cover About’s visible1h30m, a richer120-minute row against90, corrected task/habit values, midnight45 versus today90 and repeated cleanup. Final fresh check `fresh-kCZ0Bs` passes all5 suites (invariants, day lifecycle, About, sync-merge unit and Dropbox) with0 failures/flakes in27.3s; payload, memory inventory and whitespace also pass. Actual Friday cause, recovery and installed acceptance remain unverified after publication.

**Stronger regression (November23):** the existing CI-owned day-lifecycle suite now runs Friday November20/Saturday November21 in two isolated browser contexts. One device banks0; the other merges that row before banking90. Both must converge on90 and display Friday1h30m; stale-zero replay, duplicate rows and next-day carryover are rejected. An isolated original-runtime control fails specifically with `syncedPartial:true`, `retained:false`, `todayReset:true`. The fixed same-test owning-suite run `fresh-FgosJa` passes both checks with0 flakes/failures in12.1s. The earlier five-suite pass remains recorded separately.
