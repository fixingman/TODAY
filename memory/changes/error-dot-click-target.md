---
bump: patch
title: Error indicator click target too small on desktop (BUG-{error-dot-click-target})
about: The error dot in the top-right corner is now easier to click on desktop.
---
On desktop (≥640px) the error indicator button was 12×12px with a 3px transparent border — 18×18px total, below the 24px minimum. Increased border-width from 3px to 6px; total click area is now 24×24px. Visible dot size unchanged.

Root cause: the mobile size (24×24px + 7px border) was fine; the desktop override shrank the border without compensating.
