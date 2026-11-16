---
bump: patch
title: Shift+D tidies finished tasks into Past
about: Shift+D is back as a tidy-up: finished tasks move to Past, where they keep counting for today and can be brought back.
---
Follow-up to v3.10.12, at Can's request: Shift+D returns on desktop, but moves finished tasks to Past exactly as evening triage does (zone `past`, status `done`, `zoneChangedAt` now) instead of deleting them. Their ids stay done and checked today, so the top bar and the tick log agree; nothing is tombstoned, so Past can revive them. It is ignored during Focus (the list never moves under a focused task), announces the result to screen readers, and backs up like other zone moves (`dropboxBackup(true)`).

`zones.moveDoneToPast()` owns the move; `accessibility.js` binds the key outside text fields. `task-actions-test` 10c presses the real key and requires agreement plus Past, not deleted. Test-matrix 1.12 restored with the new behaviour.
