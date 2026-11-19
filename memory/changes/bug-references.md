---
bump: none
title: Engineering bug fixes keep their release reference; stale verified rows cleared
---
BUG-172 showed "—" as its reference because `release:cut` wrote "—" for any bug shipped in an engineering-only cut. Fixes in such cuts now record `v<current> (engineering)`; only rejected or open bugs get "—" (`release-cut-test` covers it). BUG-172's archive row now names v3.10.11 (engineering, CI-only fix).

Bugs.md still listed BUG-168 and 170–172 as ✅ after they were archived on November 17; those rows are removed. BUG-167 was marked verified but never archived; it moves to the archive with its detail. Bugs.md now holds only open, awaiting, rejected and merge rows, as its header says.
