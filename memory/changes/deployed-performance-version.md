---
bump: none
title: Share local and deployed performance version parsing
---
The November 16 deployed-performance run [43869978255](https://github.com/fixingman/TODAY/actions/runs/43869978255) stopped before measurement: its deployed parser accepted only single/curly quotes, while release:cut now writes double-quoted CHANGELOG keys. The live dev response is HTTP 200 and has the expected v3.10.11 key. Both local payload evidence and deployed preflight now use one parser accepting matching straight single/double quotes. Missing/mismatched versions, curly/mismatched quotes and non-OK HTTP responses remain failures. The performance harness covers both accepted formats and these negative controls. Budgets, profile and iteration count are unchanged; this repair does not establish a deployed performance pass or close BUG-135.
