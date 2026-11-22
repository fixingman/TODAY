---
bump: none
title: Fix mobile bottom-edge pixel sample to avoid card-border anti-aliasing
---
Shift the bottom-edge pixel assertion from x=8..15 to x=0..7. At 390px width
the sidebar's scroll content places a card border at x=15 whose anti-aliased
edge reads as (23,29,30) instead of the background (23,23,26), failing the
exact-color check. The leftmost margin (x=0..7) is always background.
