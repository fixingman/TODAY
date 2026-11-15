---
bump: none
title: Focus re-entry check asserts its real invariant at both scroll geometries
---
`focus-test`'s "An older exit cannot expose the new Focus header" failed intermittently (dev CI 43720860303, first attempt; every local run on Chrome 156). Probe: after Escape the restored scroll leaves the header fully above the viewport at 1280px (logo bottom −149px) but only 24px above it at 1024px with Explore docked (logo bottom +47px). In the second geometry the logo is legitimately visible before re-entry, so the old assertion (logo off screen or unpainted) could never hold; whether a run hit it depended on the restored scroll.

The check now records the logo before re-entry. Off screen: it must stay off screen or unpainted (the original condition, unchanged). Visible: it must not move (BUG-151's no-movement rule). Three consecutive local runs pass; app code is unchanged.
