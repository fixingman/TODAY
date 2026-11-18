---
bump: none
title: Use the shared boot-readiness observer in the meeting fixture
---
Full dev run 44186586652 passed the scroll suites and performance gate but rejected meeting-test's startup timeout followed by a diagnostic retry pass. Replace its older animation-frame owner-only observer with the existing timer-polled waitForAppReady helper, requiring completed boot and the meeting API/button within the unchanged15-second deadline. Gate the first real startup yield and suspend animation-frame callbacks until readiness succeeds, then restore normal frames before exercising unchanged capability/media assertions. Preserve the original failure: its log lacks boot/visibility diagnostics, so the exact hosted cause cannot be established retroactively. The shared helper adds those diagnostics for future failures. No application/runtime change.
