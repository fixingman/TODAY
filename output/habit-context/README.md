# Habit context — second isolated prototype

Can explicitly requested this new prototype after withdrawing the first sketch, October 16, 2026. This is **not** a revival of `../habit-moments/`, permission to ship, or a Memory redesign. Claude is involved before implementation, using the actual component and design documents.

## Scope

- Keep the existing Habits panel: compact grid/checks, circular 21-day desktop / 7-day mobile history, independent strength column, hover-only row treatment, bottom actions and inline name editing/archive.
- No Moment field, section, second-line metadata, renamed equivalent, compulsory naming format, background detection or setup ritual.
- Explore an optional cue-related question through the existing **desktop-only** focus-companion interaction pattern. No answer is collected or saved; entering focus alone does not force a habit-planning question. This is a new proposed habit-specific behavior, not a claim that it already ships. Touch retains tracking and the morning comparison, not a newly invented mobile focus entry.
- Compare a designer-selected preparation relationship in the existing daily-nudge placement with an ordinary morning that has no habit contribution. Both are fictional, pre-authored examples, not a working selector or configured-AI experiment.

The practical limitation remains explicit: a question may help the person choose a routine in their own life, but without an answer input TODAY does not learn their choice. This prototype does not pretend to implement durable habit anchors or real-time recognition.

## Boundaries

No live app imports, account/Dropbox access, AI calls, task/vote/cache writes, Calendar titles or routine inference from check timestamps. Check time is bookkeeping, not behavior time. A short task list is not evidence of free time. Retired weekday/productivity-stat candidates are not revived. The native habit tracker, focus protections, day boundaries and sync remain unchanged in production.

Only an isolated visual/interaction study is authorized. Names entered in the study must stay out of any model-visible host state. Review scene controls are not proposed app navigation. Any displayed timer is a static preview, not a running focus session.

The rejected first study remains marked withdrawn. Approval of this second visual does not approve AI selection, new data handling or deployment.

Subsequently Can explicitly approved the desktop Ask implementation, now prepared locally in `assets/focus.js` (v2.97.0). This fragment remains fictional/pre-authored, not connected to that implementation. Configured-AI wording review and release remain separate; the morning connection is a liked but still gated follow-up. See `memory/Backlog.md` → 14 for the current state.

October 17: the approved three-call configured-AI check is complete. [Results and limits](quality-check-2026-10-17.md): unchanged watched live state; valid shape in all three samples, mixed usefulness/voice. This is not a release approval; no runtime prompt was changed by that check.

Can subsequently approved one bounded habit-prompt revision and three fresh calls. The same report now includes the exact revised prompt hash and new outputs: less menu-like, Phone less corrective, Read still somewhat mechanical. Watched state stayed unchanged. The local prompt is revised; the installed app is not. No commit/push or morning-nudge change.

**Release approval, later October 17:** Can approved pushing the desktop v2.97.0 implementation to dev and master after the further Read refinement. This does not ship the fictional morning scenes or revive the withdrawn Moment UI. Latest prompt is unsampled; confirm deployed version and observe usefulness separately (W3 target October 31). The no-push statements above describe the earlier study/check phases.

## Review and verification

Try **Read → ✦** for the optional question. Entering focus alone shows the timer, not a question. **Edit** retains inline habit-name editing/archive; **New habit** remains one field. **Morning connection** and **Ordinary morning** are separate fictional scenes, not a working recommender. Their controls are review chrome, not app navigation.

Claude helped author the fragment using current Habits CSS, tokens and the design guide. A final source-review request was blocked by Claude's usage limit; there is no final Claude sign-off or Claude screenshot review. Local Chrome checks compare the reading component at 1024px and 390px against the current `index.html` CSS with no app scripts. Measured geometry, typography, colours and borders match. This is not a production screenshot or a usefulness verdict. The latest inspected panel commit is Memory-only; Habits source remains the baseline.

Deliberate preview adaptations: native name text is a reset semantic button; a text checkmark replaces the app's inline SVG; edit fields include their padding/border within the existing name column to avoid touching the history dots; the optional companion is readable rather than dimmed, with no running timer or app-wide focus overlay. None of these changes edits the production component.

```sh
node output/habit-context/check.mjs
```

Ten isolated check groups cover source isolation/syntax; same-viewport native reading layout; 320/390/736/1024px reading/editing; native grid/history/strength; neutral position-stable check/uncheck; keyboard order; opt-in desktop focus question, no answer field and focus return; archive/Undo; safe single-field add/IME/long names; private-only entered content and host-state echo; unchanged morning text on task completion; no completion offer; optional width control; axe in six states; touch without a focus entry; reduced motion; unexpected requests/page errors. Narrow focus captures stress the desktop layout, not mobile capability. Captures go to `.context/habit-context/` and the loopback server/Chrome close afterward. The test uses the existing scripts dependencies and the visualization preview renderer, not CI or the service worker.

The fragment requests only static Google Fonts. The preview renderer also supplies pinned static icon/positioning scripts. If the conversation host supports study-state restoration, only scene/width choices enter model-visible state; typed habit names stay in private study state. This is not a new TODAY sync or AI privacy implementation.

Narrow Chrome checks are not physical iPhone/WebKit keyboard, production focus-lock, scoring, sync, AI-output quality or behavior-change verification. History/strength are illustrative fixtures, not a newly implemented strength algorithm. No version bump, commit, push or deployment is part of this study.
