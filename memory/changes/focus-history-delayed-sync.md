---
bump: patch
title: Retain past-day focus counters during delayed sync (BUG-176)
about: Keep yesterday’s focus time when another device syncs after midnight.
---
Reopened BUG-176 after Can reported Friday November 27 focus time disappearing after it had been visible. Reproduce an independent loss path with the actual component: a past-day dated remote live counter is ignored after local rollover when no equivalent history row exists. Fold that valid counter into history by existing per-field maximum in both sync and manual Restore, preserving date boundaries, richer rows, replay idempotence and the existing schema/retention. No live-account cause or recovery is claimed. Existing pre-fix reproduction fails on missing retained minutes; owning/adjacent tests cover sync, Restore, missing history, richer rows and invalid/current/future counters. Publication and installed acceptance remain separate.

The subsequent engineering audit follows the existing BUG-066 value/date-unit contract: bank a local past-day pair before adopting a today pair even when the number is equal or smaller, including manual Restore. A poorer shared focus snapshot queues normal repair even if this device’s richer state did not change. Shared fictional Dropbox tests exercise actual restored focus completion, queued upload, writer/receiver-first rollover, rendered About, both reloads, automatic stale-row repair and a quiet converged pull. No transport/tombstone/zone/auth/schema/routing rewrite or concurrent-total summation.

Pre-publication specialist review replaced an ineffective global autosave spy with the actual merge-result contract and a poorer-snapshot negative control; transport-upload assertions remain. Corrected owning-suite and invariant checks pass in fresh-ypJERl (2/2, zero failures/flakes). Prior six-suite runtime evidence remains; release publication runs exact-candidate checks again.
