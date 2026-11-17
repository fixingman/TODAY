---
bump: patch
title: Restore the integrated desktop PWA title area (BUG-162)
about: Desktop window headers blend into TODAY and its sidebars again.
---
Restore the WCO sidebar to the top edge with internal native clearance, and retain the existing desktop glass header. Blend only the occupied native-control regions into the pane using titlebar environment geometry and the existing base colour, without mutating theme metadata or reintroducing its origin-label trigger. Preserve the opaque title underlay against scrolling text, dragging, narrow-layout header treatment, Focus and sidebar input. Correct the platform fixture's obsolete below-titlebar/opaque-header assertions; add both-ended Mac control geometry, pane/control paint checks, old-gap/missing-blend controls, bounded glass transmission and actual WCO-layout Focus/close actions. Installed native-control composition remains separate acceptance.
