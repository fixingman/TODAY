---
bump: patch
title: Sync no longer brings back earlier days' done marks (BUG-171, source fix)
about: Syncing between devices around midnight no longer brings back earlier days' finished tasks as today's.
---
Follow-up to v3.10.10's display fix. `mergeRemoteData` now removes from the merged done set any id whose task is in PAST (and not in TODAY) unless it was checked today, matching what `applyNewDayCleanup` does when it graduates tasks. Earlier days' ids had lost their check history at rollover, so the no-history union fallback let a device that had not rolled over restore them. Today's evening-triaged tasks keep their done state (checked today); Trello and other ids are untouched. `dropbox-test` 9b fails on v3.10.10 and passes now; sync-merge, day-lifecycle, triage, task-actions, Trello, habits, habit-tasks, zones and timezone suites pass. Sync.md's done-ID rule records the change.
