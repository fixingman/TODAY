---
bug: Clicking the daily-task link in a habit row enters focus mode instead of opening the habit task editor
status: ⏳ Verify
summary: .habit-daily-link inside .habit[data-habit-id] was missing from the focus.js document click handler exclusion list.
---
**Report:** Can noticed on desktop that clicking the "daily task" link in the habit edit panel caused the page to enter focus mode. A second click then revealed the habit task editor.

**Root cause:** `assets/focus.js` has a document-level click handler (line ~1135) that fires focus mode when `e.target.closest('.habit[data-habit-id]')` matches. The handler has an explicit exclusion list (`.habit-edit-input`, `.habit-edit-delete`, etc.) but `.habit-daily-link` was absent. Because `.habit-daily-link` lives inside `.habit[data-habit-id]`, the outer `.closest()` match triggered focus mode before the `data-today-click="habits.daily-task"` handler could open the editor.

**Fix** (commit 1bb7ab01): added `if (e.target.closest('.habit-daily-link')) return;` to the exclusion list in `focus.js`.

**Test** (commit bed8cf21): `scripts/habits-test.mjs` now clicks `.habit-daily-link` in edit mode, waits for `habitsTitle` to become "Daily task" (confirming the editor opened), and asserts `document.body.classList.contains('focus-locked')` is false.

**Verification needed:** confirm on the installed app that clicking the daily-task link in the habit panel opens the editor directly without triggering focus mode.
