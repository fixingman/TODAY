---
bug: Done count includes tasks finished on earlier days
status: ⏳ Verify
summary: The header showed "32 of 44 done" on a day with far fewer tasks; done tasks from the past week were counted.
---
**Report (Can, November 15):** the top bar said 32 of 44 done; there were not 44 tasks that day.

**Root cause:** `updateStats` adds every PAST task whose id is in `doneIds`, meant for tasks done today that evening triage moved to PAST. Done tasks stay in PAST for 7 days. At the new day the first device removes graduated ids from `doneIds` and clears yesterday's check history; a device that has not rolled over yet still lists those ids as done, and `mergeRemoteData` keeps an id with no check/uncheck history by union. The ids return, and up to a week of finished tasks inflates both numbers. Reproduced in the real app: 1 of 4 done becomes 21 of 24 after one such sync.

**Fix:** count PAST tasks only when checked today. The merge still restores those ids into `doneIds`; nothing else reads them for PAST rows today, so the sync rule (a non-delegation zone) is left unchanged. Verify: the header count matches the tasks you see plus today's triaged ones, across midnight on two devices.
