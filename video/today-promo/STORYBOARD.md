---
format: 1920x1080
duration: 32s
message: "A task app that doesn't keep score against you"
arc: Hook (the pain, named) → Value (a list that ends) → Texture (simple, not plain) → Trust (said once) → Proof moment (let it go) → Reward + brand
audience: one person drowning in a task app that makes them feel behind
mode: collaborative
music: none
---

<!--
Audio note: `music: none` + no SCRIPT.md keeps the workflow's HeyGen/MusicGen audio step
a clean skip. Audio is still delivered, but hand-built (BRIEF.md D5 D): a sine-palette
ambient pad + the app's own SFX (assets/sound.js), placed as audio clips in Step 5.
Every line below is on-screen type — the video must read completely muted.
-->

## Decisions

- **Spine:** the real app, cropped to its 720px column, is one portrait window in the same place (left, 7cqw) in every product beat; copy always sits right (from 50cqw). Frames 01 and 04 are type-only breathers.
- **Format:** 1920×1080, ~31s, onscreen text only (no VO), sine bed + app SFX. Captions are the copy itself, so there is no separate caption rail.
- **Held frame:** 04 — nothing moves after the line lands. 05 ends on a 1.5s hold for "Nothing bad happens."
- **Bans:** no rebuilt/fake TODAY UI; no glow, shadow, gradient; no exclamation marks; no privacy icons; no slideshow, no screensaver motion.
- **Truth:** every app shot is the real app on seeded data (video/capture.mjs).
- **Sheet:** storyboard.html v1 (stills from .sketch/, extracted from the captures). Layout confirmed by Can.
- **Build:** hand-assembled index.html (not assemble-index.mjs): the workflow's assembler hoists frame video to the host root, which would strip the window rise, the Frame 05 push-in, and the Frame 06 dim. HyperFrames renders media inside sub-compositions natively. Crossfades are 0.4s host overlaps in index.html; assets/ is built by prepare.sh.
- **Capture v2 (Can: checks and focus lagged):** complete, focus, triage, reward and idle are recorded in slow motion (page clock, timers, rAF and CSS animations at 0.15×, re-timed to real speed in the encode) at 1× DPR; typing and the splash stay real-time. Clip cut points and SFX times re-derived from the new footage.

## Frame 1 — Keeping score

- scene: Dark ground; one line of Syne types calmly, then a second line answers it
- voiceover: "Most task apps keep score." / "This one ends."
- duration: 4s
- transition_in: cut
- status: animated
- src: compositions/frames/01-keeping-score.html
- type: hook
- persuasion: Pain validation → negative contrast
- beat: recognition → relief
- blueprint: kinetic-type-beats
- asset_candidates:

narrativeRole: names the feeling every task-app user already has, then resolves it in the same breath.
keyMessage: this isn't another list that remembers everything.

"ends" carries the lime accent; the only colour in the frame.

## Frame 2 — A list that ends

- scene: Real app — three tasks typed into an empty morning list, then two checked off with ember drift
- voiceover: "One day." / "One list." / "It ends."
- duration: 7s
- transition_in: crossfade
- status: animated
- src: compositions/frames/02-list-that-ends.html
- type: product_intro
- persuasion: Show-don't-tell proof
- beat: clarity + ease
- blueprint: device-surface-showcase
- asset_candidates: assets/desktop/add-tasks.mp4 — empty morning list, three tasks typed in with the character bounce; assets/desktop/complete.mp4 — two tasks checked off, accent check + ember drift

narrativeRole: the value claim, proven on the real surface by the second beat.
keyMessage: one screen, one day — and it finishes.

Floating window held as hero on the dark ground, captions set in DM Mono beside it. Hard cut
inside the frame from typing to checking (both clips trimmed to their action).

## Frame 3 — Simple, not plain

- scene: Focus timer starts on a task; quick flashes — the day's poem on first open, a small creature wandering in while you're away
- voiceover: "Nothing to set up." / "A poem in the morning." / "Company while you're away."
- duration: 5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/03-simple-not-plain.html
- type: benefits
- persuasion: Rule of three
- beat: delight
- blueprint: titlecard-reveal
- asset_candidates: assets/desktop/focus.mp4 — tap a task, screen dims, 25:00 focus timer; assets/desktop/poem.mp4 — splash then the day's poem (Marcus Aurelius); assets/desktop/idle.mp4 — line-drawn creature wanders in at the edge

narrativeRole: the small things the calm surface lets land — kept shortest on purpose (Positioning beat 3).
keyMessage: calm isn't bare.

Three ~1.6s shots seamed by hard cuts; each caption swaps in place.

## Frame 4 — Yours

- scene: Typography only — one quiet factual line
- voiceover: "Your device. Your Dropbox. No account."
- duration: 3s
- transition_in: crossfade
- status: animated
- src: compositions/frames/04-yours.html
- type: benefits
- persuasion: Risk reversal
- beat: trust
- blueprint: titlecard-reveal
- asset_candidates:

narrativeRole: privacy said once, factually — never pitched hard.
keyMessage: nothing for anyone to leak.

## Frame 5 — Let it go

- scene: Real app, 9pm — evening review "didn't happen"; "sort out the garage" (34 days) → Let go → lost interest; the sheet settles
- voiceover: "Some things didn't happen." / "Let it go." / "Nothing bad happens."
- duration: 7s
- transition_in: crossfade 1.0s
- status: animated
- src: compositions/frames/05-let-it-go.html
- type: key_feature
- persuasion: Future pacing (the felt proof moment)
- beat: tension → relief
- blueprint: device-surface-showcase
- asset_candidates: assets/desktop/triage.mp4 — evening review sheet; keep, let go of a 34-day-old task with a reason, move one to Soon

narrativeRole: the proof moment — the feeling IS the product (Positioning "The proof moment").
keyMessage: letting go is allowed, and it's safe.

Slow push-in toward the "34 days" row as the Let go tap lands; "Nothing bad happens." holds
in the quiet after.

## Frame 6 — The empty state is the reward

- scene: Real app — last task checked, the list clears, the day's poem appears on the empty list; resolve to the TODAY wordmark + today-here.netlify.app
- voiceover: "The empty list is the reward." / "TODAY" / "today-here.netlify.app"
- duration: 6s
- transition_in: crossfade
- status: animated
- src: compositions/frames/06-reward.html
- type: brand_outro
- persuasion: Negative contrast (empty = success, not failure)
- beat: peace of mind
- blueprint: logo-assemble-lockup
- asset_candidates: assets/desktop/empty-evening.mp4 — last two tasks checked, list clears, poem appears on the empty list

narrativeRole: the one line no one else can say, then the brand.
keyMessage: an empty list means you're done, not behind.

Wordmark in Syne 800 two-tone (TO in ink, DAY in lime) exactly like the app's logo; URL in DM Mono.
