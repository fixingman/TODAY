---
bump: none
title: Retry transient release-proof artifact downloads before full-validation fallback
---
Master run44183475116 repeated full validation after GitHub returned HTTP503 downloading otherwise eligible dev proof. Retry only the selected artifact ZIP acquisition for selected transient server/transport errors, with at most two extra attempts and1/2-second backoff inside the existing30-second total budget. Keep artifact identity fixed, discard failed partial output and log only classification/attempt/delay. Leave source-run eligibility, digest/archive/provenance/SHA/policy/full-inventory/zero-flake/five-performance verification outside recovery; permanent or invalid evidence still refuses reuse. Offline virtual-clock and real-verifier controls cover fast success, both recovery opportunities, exhausted attempts/time, permanent errors, corrupt bytes and failed-test proof. No application/runtime or permissions change.
