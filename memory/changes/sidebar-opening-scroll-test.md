---
bump: none
title: Align the inline Habits regression with mobile opening scroll behavior
---
Verification publication 82d4f942 incorporated the newer v3.11.3 mobile-panel opening behavior during release rebase. Hosted run 44180733130 retained the stale sidebar assertion that inline phone Habits should preserve the pre-open page scroll; it failed twice with 0 instead of 280, while the other functional checks passed. Update that fixture to require opening at the top, unlocked page scrolling, free subsequent reading and preservation of the current position on close. The earlier sidebar controller is rejected by the new opening check (retained negative receipt `.context/fresh-ks5pZ3/receipt.json`); the exact current runtime is restored afterward and passes Sidebar, Connections and invariants first try in27.8s with zero failures/flakes (`.context/fresh-A4p8cl/receipt.json`). No runtime, timeout, tolerance, app version or installed-device acceptance change.
