---
bump: patch
title: Remove the Shift+D "clear done" shortcut
about: The hidden Shift+D shortcut that deleted finished tasks is gone; finished tasks now always leave through the evening review or at midnight, and keep counting for today.
---
Shift+D (`_clearAllDone`, since v1.6.39) deleted done tasks from TODAY. That made the top bar drop work the tick log still counted as done today (probe: top bar 1, tick log 2), unlike evening triage and midnight rollover, which move done tasks to PAST. Can chose removal over changing it to move to PAST. Nothing in the UI offered it.

Removed: the key handler (`accessibility.js`), `_clearAllDone` and its global (`task-actions.js`), its contract shim and task-actions test, and Test-matrix rows 1.12 / 9.1. The global compatibility cap drops from 122 to 121. `task-actions-test` 10c ("top bar matches the tick log") now covers every way done tasks leave the list.
