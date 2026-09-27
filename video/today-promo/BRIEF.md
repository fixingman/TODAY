---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "A task app that doesn't keep score against you"
destination: website
aspect: 1920x1080
language: en
audience: "one person drowning in a task app that makes them feel behind"
length: 30s
angle: promo
narration: no
---

## Intent

A ~30s promo for TODAY, the first of two videos (an onboarding walkthrough, 60–90s, reuses
this scene library next). Sell relief, not features — register from `memory/design/Positioning.md`:
"warm and certain, never loud", a friend explaining why they kept something. Ends on the felt
proof moment: letting go of a task that's haunted you for a month, and nothing bad happens.

Cut (confirmed by Can, D7):
1. 0–4s hook — "Most task apps keep score."
2. 4–11s add-tasks + complete — "One day. One list. It ends."
3. 11–16s focus, then poem + idle creature as flashes (simple, not plain — shortest beat).
4. 16–19s privacy said once — "Your device. Your Dropbox. No account."
5. 19–26s triage let-go — "Let it go. Nothing bad happens."
6. 26–30s empty list + poem → TODAY wordmark + today-here.netlify.app.

Beat 2 of Positioning ("it becomes yours") is deliberately out of the promo — no footage yet;
it gets a real scene in the onboarding cut.

## Assets

- capture/assets/desktop/*.mp4|png — real app footage, 2880×1800 (1440×900 @2x), from `video/capture.mjs`. Inventory: capture/extracted/asset-descriptions.md.
- capture/assets/mobile/*.mp4|png — same scenes at 1170×2532 for the 9:16 cut.
- ../../fonts/syne, ../../fonts/DM Mono — TODAY's self-hosted fonts.
- ../../assets/sound.js — the app's sine sound family (start / complete / chime); source for SFX.

## Customizations

- Captions/on-screen type carry the whole message: the video must read completely muted.
- Audio: no narration. Music bed generated offline from the app's own sine palette (D5 D —
  ambient, slow, warm, resolving downward like the `complete` tone; no drums). App SFX
  (complete, start, chime) placed on the matching on-screen moments.
- Deliverables: 16:9 master (with audio) + 9:16 cut from the mobile captures + a `-silent`
  variant; published muted-by-default with an unmute toggle (embed snippet in video/README.md).

## Notes

- Show the real app; never rebuild TODAY's UI in HTML. Type/transitions may be HTML.
- Copy rules: present tense, no exclamation marks, no gamification words, "usually" never "should".
  Privacy said once. Four beats is the ceiling.
- HeyGen not signed in; everything offline (Can chose local-only).
