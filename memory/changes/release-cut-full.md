---
bump: none
title: release:cut --full marks a master candidate for full CI
---
Can asked to push v3.10.11 to master. Its dev run was a selected run, so `release:preflight` found no full proof, and `release:dispatch` returns 403 for agent credentials (as recorded in the CI contract). The documented route is a dev commit carrying `CI-Validation: full`; `release:cut --full` now adds that trailer to the cut commit, so the normal dev push runs every suite plus the five-run performance gate and `release:publish --master` can promote the same SHA. Housekeeping's publish step names it; `release-cut-test` covers the trailer and unknown-option refusal.
