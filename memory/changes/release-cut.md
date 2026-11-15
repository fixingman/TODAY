---
bump: none
title: Releases are cut from notes; one worktree per session; dev runs no longer cancel each other
---
**Why (Can, November 15):** parallel sessions shared one checkout and all edited the same lines on every release (top of the About CHANGELOG, `sw.js`, the top of this file, the Bugs.md table and the next bug number). On November 14 that produced two v3.10.2s, BUG-162/163/166 each claimed twice, curly quotes from a hand-resolved conflict that stopped the app from starting, and a session stuck mid-rebase in the shared checkout. Ten days of dev CI: 33 passed, 36 failed, 9 cancelled.

**Release notes.** Sessions now describe a change in `memory/changes/<topic>.md` (format in its README) and new bugs in their own note, referred to as `BUG-{slug}`. `npm run release:cut --prefix scripts` (new `scripts/release-cut.mjs`) fetches dev, drops the session's own stale cut, rebases, then writes the version (largest `bump`), the three About CHANGELOG entries in double quotes, `sw.js`, the technical changelog sections and Bugs.md rows/details with the next free numbers, deletes the notes and commits with a `Release-Cut:` trailer. If another session publishes first, git refuses the stale push and the next `release:cut` re-cuts on current dev. `release-cut-test` covers note validation, version/bug numbering, the written files and a real two-session race against a bare origin.

**One worktree per session.** Rules 30/33 and Housekeeping now require each session to work in its own worktree; `release:publish` accepts a detached HEAD there (only one worktree can hold `dev`).

**CI.** Each dev push gets its own concurrency group and is never cancelled; only superseded PR runs are. `ci-plan` metadata, `smoke-test` and `performance-test` read CHANGELOG keys in straight single or double quotes only: the previous patterns accepted curly quotes as valid keys, which is how the November 14 syntax error passed smoke, and the November 14 double-quote switch had broken the planner's metadata parser and the payload check's single-quote fallback.
