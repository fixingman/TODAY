# Asset inventory — real TODAY footage

No site crawl: every asset is the real app driven by `video/capture.mjs` with seeded
fixtures and a running clock anchored to Monday, September 14. Regenerate with
`cd video && npm run capture && npm run capture:mobile`. Each scene exists as
`desktop/<scene>.mp4|png` (1440×900) and `mobile/<scene>.mp4|png` (1170×2532, 390×844 @3x).

| Scene | Length | What happens on screen | Positioning beat |
|---|---|---|---|
| poem | ~17s | First open of the day: TODAY logo glitch-types in, date, then the day's poem fades in (Marcus Aurelius, "Men look for retreats for themselves…"). | 3 — simple, not plain |
| add-tasks | ~12s | Empty morning list ("Still early. Good."); three tasks typed in with the per-character bounce: "call mum back", "work: finish the design proposal", "reply to Sam about Saturday". | 1 — a list that ends |
| complete | ~7s | Five tasks; "call mum back" and "reply to Sam about Saturday" checked off — accent check, ember drift particles. | 1 |
| focus | ~9s | Tap "work: finish the design proposal" → the rest of the screen dims, 25:00 focus timer starts counting down. | 1 |
| triage | ~12s | 9pm evening review sheet: "3 didn't happen". Keep the status update; "sort out the garage" (34 days old) → Let go → "lost interest"; the domain renewal → Soon. | Proof moment — let it go, nothing bad happens |
| empty-evening | ~9s | 7pm, last two tasks checked; the list clears and the day's poem appears on the empty list — the empty state as reward. | Wedge line — the empty state is the reward |
| idle | ~12s | Mid-afternoon, user steps away; a small line-drawn creature wanders in at the edge. | 3 — simple, not plain |
