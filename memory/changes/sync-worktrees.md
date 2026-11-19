---
bump: none
title: Publishing keeps other checkouts (Conductor workspaces) on the published commit
---
Can's workspace folder was 46 commits behind dev: since November 15 each session works in its own copy and pushes to dev, so nothing moved the folders people look at. After a successful publish, `release:publish` now runs `syncWorktrees`: every other checkout of the repository that is detached, clean (no tracked changes), not mid-merge/rebase, without its own commits (dev already contains its HEAD) and not under the temp directory is fast-forwarded with `git checkout --detach <sha>`. Everything else is listed as left unchanged with the reason; a failure there never fails the publish. `release-publish-test` covers all six cases with real Git. Housekeeping documents it.
