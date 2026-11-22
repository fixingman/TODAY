---
bump: patch
title: Keep the next Sunday eligible after one missed weekly sentence (BUG-{sunday-single-miss-bug})
about: Marking one weekly reading as not helpful no longer skips the following Sunday.
---
Can reported that only Today and Noticed appeared on November 22 in installed production v3.12.1. The saved Sunday audit found a retired soon-pullback candidate and a week-shape fallback blocked seven days after its previous reading; production policy bytes match the inspected checkout. A single missed sentence, including an older retained kindVerdicts miss, added a second week to the fallback cooldown. Keep week-shape at seven days after one miss. Preserve two-miss/persisted retirement, same-day suppression, fresh qualified seven-calendar-day evidence, grounding, request/cache/source fences and all other outcome-kind cooldowns. No feedback migration, new source/store, provider request shape, retry or forced generation. Regression checks cover both feedback stores and mounted block delivery/cache reuse; retain before-fix failures. Installed behavior and writing usefulness remain to verify after publication.
