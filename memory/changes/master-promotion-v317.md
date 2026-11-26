---
bump: none
title: Full validation for the master promotion of v3.17.0
---
Can asked to push to master (2026-11-26). `release:preflight` found no reusable full proof for 66329482 (its dev run covered selected suites), so this engineering cut requests `CI-Validation: full` on the identical application code before the exact-SHA fast-forward.
