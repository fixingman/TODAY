# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 054 | Phantom old tasks resurrect in TODAY list via sync merge | ⏳ v2.23.6 |
| 053 | Morning nudge dismissal not synced across devices | ✅ v2.18.38 |
| 052 | Splash dismissal slow — sync bookkeeping held the gate | ✅ v2.18.36 |
| 051 | Trello nudge dismissal not synced across devices | ✅ v2.18.23 |
| 050 | — not assigned — | — |
| 049 | New Trello card looks aged on arrival | ✅ v2.18.22 |
| 048 | Trello card aging not synced across devices | ✅ v2.18.17 |
| 047 | Dropbox connect on fresh install doesn't auto-restore | ⏳ v2.18.16 |
| 046 | Trello board selector / Dropbox buttons flicker | ✅ v2.18.15 |
| 045 | Done-today count inflates | ✅ v2.18.21 |
| 044 | Delayed focus chime after Escape/task-switch | ✅ v2.18.6 |
| 043 | Aged card won't un-dim after focus session | ✅ v2.18.11, v2.18.17 |
| 042 | Trello card order scrambles across devices | ✅ v2.18.4 |
| 041 | White flash on mobile cold start | ✅ v2.18.13 |
| 040 | Morning nudge reappears after dismiss | ✅ v2.17.139 |
| 039 | All-habits-done celebration never fires | ✅ v2.17.137 |
| 038 | Red dot on mobile when offline | ✅ v2.17.136 |
| 037 | Task list stale on morning open | ✅ v2.17.135 |
| 036 | This Week differs web vs mobile | ✅ v2.17.132 |
| 035 | Trello cards never age visually | ✅ v2.17.127 |
| 034 | Morning nudge AI text swaps mid-read | ✅ v2.17.125 |
| 033 | Morning nudge missing on first cold-start | ✅ v2.17.125 |
| 032 | Splash logo appears mid-animation on mobile | ✅ v2.18.27 |
| 031 | Red error dot invisible on mobile PWA | ✅ v2.17.75 |
| 030 | Checkmark animation lags ~30s on iOS PWA open | ✅ v2.17.105 |
| 029b | ✦ submit answer swapped by proactive load race | ✅ v2.17.93 |
| 029 | `_aiSendFromInput` undefined — crash on ✦ submit | ✅ v2.17.64 |
| 028 | Completed bar flash/pause on window return | ✅ v2.17.94 |
| 027 | Trello focus timer resets on re-open | ✅ v2.17.62 |
| 026 | Habit re-checks itself after uncheck | ✅ v2.17.53 |
| 025 | PiP "Again" lost / shows 25:00 after sleep/wake | ✅ v2.17.52 |
| 024 | Focus minutes carry over to next day | ✅ v2.17.48 |
| 023 | Top panels flash twice on desktop PWA restore | ✅ v2.17.37 |
| 022 | Focus fill bar pulsates during active countdown | ✅ v2.17.36 |
| 021 | Splash explosion invisible / freezes after typewriter | ✅ v2.17.27–29 |
| 020 | Streak double-counts across devices | ✅ v2.17.26 |
| 019 | Star explosion missing on mobile | ✅ v2.17.29 |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 013 | Focus timer jumps on restore | ✅ v2.14.9 |
| 012 | Overdue Trello card disappears on check | ✅ v2.16.5 |
| 011 | PiP ghost chime on wrong task | ✅ v2.16.9 |
| 010 | Habits didn't roll over | ✅ v2.12.74–77 |
| 009 | Task aging opacity broken | ✅ v2.12.73 |
| 008 | Drag jump-back on mobile | ✅ v2.12.72 |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6 |
| 006 | `_onWake()` consolidation | ✅ v2.17.0 |
| 005 | Trello pomodoro badge vanishing | ✅ v2.12.56–66 |
| 004 | App blank after sleep/wake | ✅ v2.17.24 |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1 |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61 |
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60 |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-054: Phantom old tasks resurrect in TODAY list via sync merge

**Status:** ⏳ v2.23.6 — awaiting verify

**Symptom:** (2026-07-07) Old tasks Can had completed long ago reappeared in the manual TODAY list, unchecked — some with pomodoro icons (`focusSessions` lives on the task object) and aged styling (age derives from the `manual_<timestamp>` ID). No unusual device involved; localhost dev copy ruled out (inspected: no Dropbox token, empty state).

**Root cause (two holes, same class as BUG-018):** `mergeRemoteData` union-merges `manual_tasks`; a task is protected from resurrection only while tombstoned in `deleted_ids` or present in a local SOON/PAST zone. (1) `_purgePast()` dropped PAST items (done: 7d, let_go/aged: 30d) with **no tombstone** — once purged, any device whose state still carried the task in `manual_tasks` (e.g. hadn't synced in a couple of weeks) resurrected it as `localOnly` and pushed it to every device. (2) `_cleanupDeletedIds()` pruned tombstones after **30 days**, contradicting the "deleted tasks should never come back via sync" invariant — explicit deletions also lost protection.

**Fix (v2.23.6):** `_purgePast()` now returns `{id, at}` tombstones for purged items; `applyNewDayCleanup` appends them to `today_deleted_ids`, and `mergeRemoteData` injects them into `mergedDeletedMap` *before* its merged-log persist (a direct localStorage write there would be clobbered). Tombstone TTL 30 → 180 days with a newest-2000 backstop. Hardening: merge filter also keeps a task whose `zoneChangedAt` is newer than its tombstone (pull-back racing a purge). Stale "keep last 100" comment on the PAST merge removed (no cap exists).

**Known residual:** a device still holding pre-fix state can resurrect once more until it syncs the new tombstones; deleting the phantoms (as Can did) tombstones them for 180 days.

**Verify:**
- No phantom reappearance over the following weeks of normal multi-device use.
- Console check on any device: complete a task, let it roll to PAST, simulate age (edit `zoneChangedAt` to 8 days ago), reload → task purges AND its ID appears in `today_deleted_ids`.

**Verified fixed:** ☐

---

## BUG-047: Dropbox connect on fresh install doesn't auto-restore

**Status:** ⏳ v2.18.16 — awaiting verify

**Symptom:** Installing the PWA on a new device, connecting Dropbox via OAuth, and finding the task list empty — even though a backup exists on Dropbox. The existing data was silently overwritten by the fresh install's empty state.

**Root cause:** `_dropboxExchangeCode()` (called after OAuth completes) unconditionally called `dropboxAutoSave()` — writing the device's current (empty) state to Dropbox immediately after receiving the token. The backup was overwritten before the user had a chance to restore.

**Fix (v2.18.16):** `_dropboxExchangeCode()` now detects a fresh install: if `manualTasks`, `habitsList`, `soonTasks`, and `pastTasks` are all empty, it probes Dropbox via `get_metadata` to check whether a backup file exists. If it does → `dropboxRestore(false)` (silent restore). If the probe fails or no file exists → falls back to `dropboxAutoSave()` as before. Reconnect on a device that already has local data also falls back to save.

**Verify:**
- Fresh PWA install (no local tasks). Connect Dropbox via OAuth. Existing tasks should appear automatically — no manual "Restore" tap needed.
- Reconnect Dropbox on a device that already has tasks → existing local data is preserved (upload, not overwrite).

**Verified fixed:** ☐



