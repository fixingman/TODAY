---
bump: patch
title: Explore's Connections button carries the sign-in nudge (BUG-{plug-nudge})
about: When a sign-in needs you, the Connections button inside Explore now breathes too, and it stops once you have looked.
---
`_syncConnectionsNudge` now also sets `btn-icon-attention`, the WAAPI pulse and an explicit label ("Connections, a sign-in needs you") on Explore's `#exConnections`; Explore calls it after every header render. `_mountConfigPanel` marks `connections_nudge_seen_<day>` like the header path does. CSS keeps the accent colour under reduced motion. `connections-test` covers both; it fails on v3.10.4 at "the plug in Explore carries the nudge".
