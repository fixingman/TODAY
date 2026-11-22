---
bump: none
title: Fix daily-task link test after habit-task-editor in-place swap
---
Habits-test daily-task-link check timed out waiting for `#habitList .habit`
because `habit-task-editor.open()` swaps `#habitsContent` in-place without
changing `sidebar.active`. The old code called `sidebar.open('habits')` which
either closed the panel (toggle, when active was still habits) or re-opened it
(when habit-task-editor had switched active), creating a timing race.

Fixed to check `#habitList .habit` directly and reopen with `{fromDailyTask:true}`
only when the list is gone. `{fromDailyTask:true}` bypasses the toggle guard.
Also restores `habitEditMode=true` directly so `toggleHabitEditMode()` takes the
exit path without needing edit-mode DOM elements that may not exist.
