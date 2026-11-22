---
bump: none
title: Stabilise mobile bottom-edge paint assertion in sidebar-test
---
Stabilise mobile bottom-edge paint assertion: fitViewport uses rAF so layout
updates before paint flushes; add one extra rAF wait inside the viewport-height
loop so the screenshot lands after the compositor paints.
