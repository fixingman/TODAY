---
bump: minor
title: Habit daily tasks learn from what you do, not from notes
about: Habit daily tasks now fit your day: they learn when you usually do a habit and what you do just before it, keep their size on busy days when you usually manage anyway, and go smaller when a habit keeps slipping. Deleting one offers too hard, not useful or did it my way.
---
**Why (Can, 2026-11-26):** suggestions felt "a bit dummy … random"; 6 of 9 habits have no note, and the old progression only adapted habits with a note (`progression()` returned baseline without one) and reset after any settings edit; "harder" days came from a fixed every-4th-day timer (`stretchDay`). Design + eng review + Codex outside voice: `~/.gstack/projects/fixingman-TODAY/can-dev-design-20261126-habit-daily-tasks.md`.

**Signals (`habit-task-policy.js`, pure `signals()` / `load()`):** usual time and stack partner from daytime check times (night logging ignored; partner must be checked before), recent outcome of AI-written tasks, heavy-day record from saved day loads, reduction goal from name/note, avoid list, own-way. Day load from carry-over vs 14-day median, calendar busy hours via `timingSnapshot()` (only when its day equals the habit day, so not between midnight and 3am), and yesterday's habits from completion records (not the midnight snapshot). Size replaces the 4-day timer; a heavy day alone never shrinks a habit that holds on heavy days. New principle-only prompt; labels only reach the model (plus the partner habit's name). Rules 35 guard on task text.

**Feedback:** habit tasks get their own reasons in the delete toast and evening review (too hard / not useful / did it my way), stored as `dismissReason` on the habit-day occurrence and kept out of task let-go statistics. "did it my way" checks the habit; Undo removes only the check that tap made (`reasonCheckAt`).

**Sync:** occurrence merge no longer treats automatic expiry as an explicit change (a stale device can't erase a reason), and `load` merges on its own (calendar-informed beats partial, else first write). `clean()` validates the new fields.

**Cleanup:** removed dead `changeToday()` (no caller since v3.10.0) and `_getProactiveObservations` / `_pickObservationToMention` (test-only).

**Tests:** `habit-task-policy-unit-test` (signals, night logging, reversed partner, sizes and spacing, heavy-day holds/slips, reasons, reduction, load, merge/clean), `habit-tasks-test` (payload labels, load stored, habit reasons in the toast, no task stats, my-way check and Undo, independent check kept, ordinary tasks keep four reasons), `triage-test` (evening review habit reasons), `insights-test` (dead code removed).
