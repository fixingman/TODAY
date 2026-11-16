---
bump: none
title: Guard desktop standalone header paint in a real app window
---
Extend platform-test with an isolated Chromium app window using actual standalone media predicates and desktop input, without rewriting matchMedia/CSS, installing a PWA or touching the user's browser profile. Exercise real Focus entry/exit, wide/compact desktop resizing, long-list sticky positioning and the actual About sidebar. Compare rendered viewport pixels over contrasting fictional backdrops as well as computed glass/blur/visibility. The exact old opaque override and a separate opaque underlay must both eliminate transmission; the latter preserves correct computed header styles, proving the need for pixel coverage. Keep existing WCO opacity/title pixel protection and ordinary browser/mobile tests unchanged. This is test-only coverage; native OS frame composition, Safari Add to Dock and installed appearance remain device acceptance, not automated claims.
