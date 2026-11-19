---
bump: none
title: Wait for settled Focus layout before comparing feedback geometry
---
Dev CI 44426188188 passed the enrichment checks but rejected focus-test's exact geometry assertion twice. Local reproduction records loaded fonts and identical x/width/height while y moves during startup/Focus entrance animations. Wait within a bounded three-second predicate for loaded fonts and existing finite layout-affecting motion to finish before and after feedback, excluding the independent progress-fill animation. Keep exact rectangle equality and report both rectangles on failure. Preserve the original failed run and controls; no product CSS, animation timing or geometry tolerance changes. The owning suite and an intentionally shifted feedback-answer control verify that real layout movement still fails.
