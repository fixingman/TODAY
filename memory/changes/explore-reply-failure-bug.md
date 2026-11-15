---
bug: Explore hides provider credit failures behind generic retry
status: ⏳ Verify
summary: Explore discards the reason a reply failed and offers a generic retry even when the AI account needs credit or billing attention.
---
Reported Chat showed an unavailable earlier-context notice and a kept-message retry that did not help when AI allowance was exhausted. Normal reply handling discarded the typed failure used by suggestions, and the proxy preserved only an upstream message. Add exploration-scoped fixed failure categories and one actionable failed-turn notice; keep earlier source provenance on its existing inspection surfaces. Verify with fictional provider and browser cases, retaining saved-observation, source-withdrawal and late-response fences. Actual account balance has not been inspected.
