---
bump: patch
title: Start mobile panels at the top when they open
about: Explore, About, Habits and Memory open at the top on your phone.
---
Can clarifies this is mobile-only: opening a panel should return both viewport and panel content to the beginning. Reset phone panel scroll, including inline Habits, after mounting and once after layout, fenced against close/replacement/desktop transitions; preserve later reading and close behavior. Start mobile Explore's first loaded conversation at the beginning rather than following existing content to its end; preserve subsequent reply-follow and navigation-return behavior. Add long-list/mounted-scroll, real repeated About/Habits/Memory opening and asynchronous real-conversation regressions, with shipped-runtime negative controls. Native iOS acceptance remains open.
