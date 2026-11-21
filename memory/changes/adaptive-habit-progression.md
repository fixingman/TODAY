---
bump: minor
title: Adaptive habit progression — variety, responsive direction, cumulative deepen
about: Fresh daily habit tasks now vary their angle after the first completion, build progressively on recent stretch days, and avoid repeating yesterday's exact wording.
---
Shipped November 21 (commit 4433f9b4) to origin/dev. Changes to `assets/habit-task-policy.js` and `assets/habit-tasks.js`:

- **`earlier` repetition avoidance** — `FRESH_RULES` now explicitly instructs the AI to use the `earlier` field (past occurrence texts) to avoid verbatim repetition. Previously the field was passed but ignored by the prompt.
- **`practice` threshold** — lowered from 3→1 completion. Variety begins after the first success; waiting for three made rotation nearly invisible in practice.
- **`return` on recent drift** — added condition: `checked >= 1 && recentChecked === 0 && known >= 3`. A week without completion suggests a lower-friction angle even before the sustained-miss threshold (5 known / ≤2 checked) fires.
- **Cumulative `lastStretch`** — `progression()` now tracks the most recent completed stretch-day AI occurrence text as `lastStretch`. The AI is instructed to build on `lastStretch` for `deepen` direction, enabling push-ups to grow 10→11→12 over time rather than always referring back to the original baseline.
- **`baseline` rewritten** — now starts from "a genuinely achievable step toward the note's goal." Reduction habits (note contains quit/stop/reduce) get a bounded constraint on current behavior, not full cessation as the first-day floor.
- **`practice` direction** — now "offer a fresh approach at the same effort level using recentPractice — vary the angle, not the difficulty" (was: consolidate a familiar appropriate action).

Unit test (`scripts/habit-task-policy-unit-test.mjs`) updated for changed thresholds. Browser test (`scripts/habits-test.mjs`) adds click-propagation assertion for `.habit-daily-link`. W3 checkpoint December 1.
