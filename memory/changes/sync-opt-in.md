---
bump: none
title: Folder sync after publishing is opt-in
---
The first live run of `syncWorktrees` (v3.12.1 engineering) moved Can's `beirut` workspace as intended, but also four other sessions' Conductor workspaces and eight pinned `.context/` evidence snapshots that happened to be clean and behind. All twelve were restored to their previous commits from their own reflogs the same day (each checked clean). The sync is now opt-in: only checkouts holding an empty `.context/follow-dev` (gitignored) move; `beirut` has it. `release-publish-test` adds a clean, not-opted-in checkout that must stay put. Housekeeping updated.
