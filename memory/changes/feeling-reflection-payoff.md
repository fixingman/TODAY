---
bump: none
title: Implement an offline commitment-episode reflection experiment
---
Implemented `scripts/reflection-episode-experiment.mjs`: a read-only local analysis of existing opt-in thirty-day reflections and task outcomes. It excludes ambiguous linkage/order and unknown endings, separates resolution types, deduplicates shared dates, compares start/resolution/baseline feeling frequencies and removes each contributing date to test sensitivity. Aggregate stdout omits private text, identifiers, reasons and per-episode dates; there are no network/model calls, state changes or report files. Screening remains exploratory with source/feedback/usefulness review required; it does not certify statistical significance or personal writing. Registered fictional linkage, sensitivity, source-boundary and CLI-privacy tests in CI and documented the command. The raw feeling-history UI proposal remains rejected. No shipping code, retention or permissions changed.
