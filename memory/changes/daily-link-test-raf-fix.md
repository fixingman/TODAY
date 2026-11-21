---
bump: none
title: Replace waitForFunction with RAF wait in daily-link focus test
---
habits-test: waiting for habitsTitle to change to "Daily task" timed out on CI
because the habit task editor lazy-loads its module. Focus-lock is synchronous
on click; switched to two animation frames which is sufficient and always fast.
