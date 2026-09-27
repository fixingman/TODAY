---
format: 1920x1080
duration: 79s
message: "One day, start to finish — and it ends clean"
arc: Title → the day in order (morning → add → order → focus → done → habits → evening → Soon/Past) → over time → yours → tomorrow
audience: a new TODAY user on their first open, or someone deciding whether to try it
mode: collaborative
music: none
---

<!-- Audio is hand-built like the promo: ../render-audio.mjs bed-80.wav + the app's own SFX, placed in index.html. -->

## Decisions

- **Plan approved by Can** (frame table in chat); sketches skipped — layout, type and seams are the confirmed promo system (`frame.md` copied from `../today-promo`).
- **Spine:** real app window left, copy right, numbered step kicker ("03 — Add"). 01 and 11 are type-only.
- **Seams:** 1s soft dissolves (outgoing host runs 1s long), same as the promo.
- **Truth:** every app shot is the real app on seeded data (`../capture.mjs`). Scene 10's Noticed lines are seeded from real templates in `assets/insights.js`; the copy says "over time".
- **Build:** frames 02–10 share one layout; 01/11/12 derive from the promo's 01/04/06. Clip cut points and SFX times come from the footage (`prepare.sh`, `index.html`).

## Frame 1 — Title

- scene: Type only: "How TODAY works." typed in, then "One day, start to finish."
- duration: 4s
- transition_in: cut
- status: animated
- src: compositions/frames/01-title.html

## Frame 2 — Morning

- scene: First open: logo, then the day's poem. "Each day opens with a poem." / "Then the list."
- duration: 6s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/02-morning.html
- asset_candidates: assets/poem.mp4 — capture scene `poem`

## Frame 3 — Add

- scene: Three tasks typed in. "Type what matters today." / "Press Enter." / "work: in front adds a tag."
- duration: 8s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/03-add.html
- asset_candidates: assets/add-tasks.mp4 — capture scene `add-tasks`

## Frame 4 — Order

- scene: A task dragged to the top. "Drag to put first things first." / "TODAY never re-sorts your list."
- duration: 6s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/04-order.html
- asset_candidates: assets/reorder.mp4 — capture scene `reorder`

## Frame 5 — Focus

- scene: Tap → dim → 25:00. "Tap a task to focus." / "25 minutes, just this." / "Space to breathe. Esc to rest."
- duration: 8s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/05-focus.html
- asset_candidates: assets/focus.mp4 — capture scene `focus`

## Frame 6 — Done

- scene: Two check-offs, ember drift. "Tick it off when it's done."
- duration: 6s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/06-done.html
- asset_candidates: assets/complete.mp4 — capture scene `complete`

## Frame 7 — Habits

- scene: Habits panel, two habits checked. "Habits get one check a day." / "Streaks are noticed, never demanded."
- duration: 7s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/07-habits.html
- asset_candidates: assets/habits.mp4 — capture scene `habits`

## Frame 8 — Evening

- scene: Review: keep, Soon, let go + reason; one left. "What didn't happen?" / "Keep it." / "Move it to Soon." / "Or let it go."
- duration: 10s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/08-evening.html
- asset_candidates: assets/evening.mp4 — capture scene `evening`

## Frame 9 — Soon & Past

- scene: Soon opens, one pulled in; Past below. "Soon holds what can wait." / "Pull it in when you're ready." / "Past holds what's finished, and fades."
- duration: 7s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/09-soon-past.html
- asset_candidates: assets/zones.mp4 — capture scene `zones`

## Frame 10 — Over time

- scene: About panel, Noticed block (seeded real templates), slow push. "Over time, it notices your rhythm." / "Rarely, and only when something changes."
- duration: 7s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/10-noticed.html
- asset_candidates: assets/noticed.mp4 — capture scene `noticed`

## Frame 11 — Yours

- scene: Type only: "Your device. Your Dropbox. No account."
- duration: 4s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/11-yours.html

## Frame 12 — Tomorrow

- scene: List clears, poem; "Tomorrow starts clean." → TODAY wordmark + URL, chime.
- duration: 6s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/12-tomorrow.html
- asset_candidates: assets/empty-evening.mp4 — capture scene `empty-evening`
