---
bump: none
title: Fix About-sidebar teardown check in smoke test connections section
---
Smoke test connections privacy check opened the About sidebar panel via
`Today.use('about').toggleInfo()` but closed it by checking
`infoPanel.classList.contains('open')` — the old API. `infoPanel` never
gets an `open` class now that About is sidebar-based, so the panel stayed
open. On macOS, CSS animations run in headless Chrome, so
`sidebar.close()` was async; `ex-open` remained on the body, hiding
`#addTaskBar` with `pointer-events:none` and causing `page.type()` to
silently fail. CI passed because headless Linux runs no CSS animations,
making close synchronous.

Fixed to `Today.use('sidebar').isOpen('about')` / `close(true)`.
