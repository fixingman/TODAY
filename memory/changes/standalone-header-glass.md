---
bump: patch
title: Restore glass on the standalone desktop header
about: The installed desktop app’s header is translucent again.
---
Adopt the other session's one-line removal of the desktop standalone sticky-header opacity/backdrop override. Preserve document growth and pinned long-list geometry, the WCO opaque header/title underlay and its pixel-leak contract, and ordinary browser/mobile behavior. Extend the existing platform fixture to assert computed glass/blur for desktop browser and non-WCO standalone; the original CSS fails that assertion before the change. Platform, focus and invariant checks validate the scoped fix. Native installed appearance remains separate from emulated checks.
