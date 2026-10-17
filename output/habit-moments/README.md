# Withdrawn — Habits with a place design study

Started at Can's request, October 16, 2026. **Withdrawn after review:** Can does not want a separate Moment section and finds this sketch visually worse than the current Habits panel. Do not polish, deploy or use it as an implementation base. The original habit/context idea remains open. Technical checks do not establish design quality. Retained as rejected design material only; not a live feature, approved UI, AI experiment or release.

## Review scope

- Start with Habits. Walk and Brush teeth x2 have no moment; Vegetables and the phone habit have one. All content and history are fictional.
- **Edit → Add a moment → Done** adds a quiet second line. Existing moments can be edited or cleared. No empty moment field is imposed on every established habit. Long moments wrap while reading and editing.
- **New** remains a one-field add. Checking/unchecking keeps the row in place; no habit reminder follows a task completion.
- The scene selector is review chrome, not proposed app navigation. Preparation shows a pre-authored morning relationship. No-call shows an ordinary reading instead of a habit reminder. Focus removes habit/nudge/reaction controls from the depicted app.
- Optional host design controls compare separate / inline-name / absent moment **reading layouts**, and responsive / phone width. These are visual comparisons, not metadata migrations; the edit interaction always explores the separate optional field. Changing a design control retains current edit drafts.

The preparation sentence is illustrative copy chosen by the designer, not an AI output, implemented semantic match or proof of usefulness. It changes only when choosing a different scene, never because a task was checked while reading. No-call does not claim that the current tracker can distinguish an unavailable cue from an unlogged action. The focus timer is a static preview, not an active session.

## What to decide

1. Does the quiet moment justify the additional row height compared with putting it in the name—or leaving the habit unchanged?
2. Is the optional edit affordance discoverable without making habits feel like another configuration exercise?
3. Is the preparation relationship worth the daily nudge's attention, independently of the practical cue's usefulness?

Do not turn approval of the layout into approval of the companion selector. Evidence selection, privacy, delivery and normal cross-device metadata merge/restore remain separate implementation gates. Current production Calendar title access, AI inputs, scores, day boundaries and sync behavior are untouched.

## Isolation and verification

The fragment never imports TODAY's runtime, reads browser/app storage, calls AI, accesses accounts, or writes tasks, votes or habits in TODAY. Interactions are local to the study. If supported by the conversation host, study state can be retained there: only scene/layout choices go in model-visible state; entered names/moments stay in private study state. This is not the app's Dropbox or AI privacy implementation. Static Google Fonts are the only resources requested by the fragment; the supplied preview renderer also loads its pinned static icon/positioning utilities.

Using the existing scripts dependencies, local Chrome and the visualization skill's preview renderer:

```sh
node output/habit-moments/check.mjs
```

Override `CHROME_PATH` or `VISUALIZE_RENDERER` if needed. The check creates an ephemeral loopback-only preview server and closes it and Chrome afterward. It does not add this study to CI or the production service worker. Captures go to `.context/habit-moments/`.

Coverage: source isolation/syntax; optional add/edit/remove; native check/uncheck and row position; quick add; blank-name validation; Escape/focus return; Enter/IME; model-visible state content; 320/390/736/1024px read/edit and long text; reading-layout alternatives; illustrative reactions; no completion offer/mid-read swap; no-call/focus silence; axe checks in five states; reduced motion; unexpected requests/page errors.

Chrome narrow-screen checks are **not** physical iPhone/PWA keyboard, WebKit, production accessibility, sync, AI quality or behavior-change verification. Existing reordering, archive, evening countdown, scoring and audio are not reimplemented here. No app version bump, commit, push or deployment is part of this study.
