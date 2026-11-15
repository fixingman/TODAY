---
bump: none
title: Observe suite startup without depending on animation frames
---
Assistant, About, Explore and Sidebar still used frame-polled startup waits; the earlier Dropbox repair already demonstrated that a ready background device tab can stop notifying that observer. The five suites now share a timer-polled successful-boot prerequisite, including the interactive seal before component access. Each caller keeps its original total deadline and owner predicate; Sidebar mounting shares its existing 10-second budget. Common failure diagnostics identify the fixture, visibility, boot/seal state and errors. A held real MessageChannel startup and suspended driver frame observer prove the old wait misses completion while the repaired waits see readiness. Held startup and a missing owner still fail. Existing mobile Enter, viewport, painting and two-device sync assertions remain. No application, sync, splash, performance policy or retry behavior changes.
