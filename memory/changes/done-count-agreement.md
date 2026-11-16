---
bump: none
title: Test that the top bar and the tick log agree on "done today"
---
BUG-171 slipped through partly because the app has two definitions of "done today": the top bar (`updateStats`) and the tick-log count About, the weekly graph and triage use (`_doneTodayCount`), each tested alone. `task-actions-test` 10c now requires the two to match after checking, unchecking, evening triage to PAST and a sync from a device that has not rolled over. On its own it fails on v3.10.9 (before the BUG-171 fixes).

Known remaining difference, not asserted: Shift+D (`_clearAllDone`) deletes done tasks, so the top bar drops them while the tick log still counts them (probe: top bar 1, tick log 2). Raised with Can as a product question.
