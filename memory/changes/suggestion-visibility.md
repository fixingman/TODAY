---
bump: patch
title: Post-add suggestions appear where you can see them (BUG-{suggestion-under-bar})
about: Suggestions after adding a task now appear above the input bar instead of hiding behind it.
---
See BUG-{suggestion-under-bar}. `assistant.js` gains one visible-band check (below the sticky header, above `#addTaskBar` and a shown `#triageBar`) used for delivery and exposure; geometry is rechecked on scroll, resize and visual-viewport resize as well as intersection changes. A just-added task sitting just below the band is scrolled into view with room for its row; a row that still lands under the bar is lifted by the minimum scroll. New outcome records carry `exposure: 2`; `suggestion-policy` counts an ignore only with it, so the 29 earlier timeouts stop throttling. Explicit dismissals, applies and reversals still count (the split reason keeps its 10 September dismissals).

Tests: `assistant-test` 1b (13 tasks at 390px: suggestion shown above the bar; pushed under the bar it is not "seen"; record marked), the delivery tests now keep tasks genuinely out of view, and `suggestion-policy-unit-test` covers legacy ignores. Both fail on v3.11.5. Docs: AI.md outcome definitions; Backlog #15F visibility row due 2026-12-02.
