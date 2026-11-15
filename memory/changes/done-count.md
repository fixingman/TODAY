---
bump: patch
title: The "x of y done" count only includes today's tasks (BUG-{done-count-past})
about: The done count at the top now counts only today's tasks; it no longer includes work you finished on earlier days.
---
See BUG-{done-count-past}. `updateStats` counts PAST tasks only when they were checked today (`today_checked_ids`), which keeps evening-triaged work in the count and drops earlier days' done tasks. `task-actions-test` 10b fails on v3.10.9 (21 of 22) and passes now (1 of 2).
