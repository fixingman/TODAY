---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "One day, start to finish — and it ends clean"
destination: website
aspect: 1920x1080
language: en
audience: "a new TODAY user on their first open, or someone deciding whether to try it"
length: 75s
angle: walkthrough
narration: no
---

## Intent

The onboarding walkthrough — the second video (the promo, `../today-promo`, came first). Where the
promo sells relief, this shows how a day actually runs, in the order it happens: first open,
adding, ordering, focus, checking off, habits, the evening question, Soon and Past, what TODAY
notices over time, and a clean tomorrow. Same register (Positioning.md): warm and certain, never
loud; a friend showing you how they use it.

Positioning beat 2 ("it becomes yours"), left out of the promo for lack of footage, gets its scene
here: the About panel's Noticed block, seeded with real line templates from `assets/insights.js`.

## Assets

- Real app footage from `../capture.mjs` (new onboarding scenes), same seeded Monday.
- Design system: `frame.md` copied from the promo (TODAY tokens, Syne + DM Mono).
- Audio: `../render-audio.mjs` bed (rendered at this video's length) + the app's own SFX.

## Customizations

- Every step is on-screen text; reads completely muted. Numbered step kicker per scene.
- Same spine as the promo: real app in a portrait window left, copy right; 1s soft dissolves.

## Notes

- Show only core, no-setup features. Connections (Dropbox, Gmail, Trello, AI keys, meeting mode)
  are mentioned at most once, never demonstrated.
- Copy rules as the promo: present tense, no exclamation marks, "usually" never "should".
