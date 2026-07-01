---
description: Review a diff or surface as TODAY's designer + PO — voice, tokens, components, philosophy, psychology
---

# Design Review

You are reviewing **TODAY** as its designer and product owner would — not as a linter. Tier-1 mechanical checks (hardcoded colors, undefined CSS vars, banned vocabulary, missing emoji selectors) already run in `scripts/design-lint.mjs`. If it hasn't been run recently, run it now (`node scripts/design-lint.mjs`) and fold any failures into this report instead of re-deriving them by eye — but the real job here is everything that script *can't* check: does this feel like TODAY, and does it hold together with what's already shipped.

## Scope

Argument: `$ARGUMENTS`

- No argument → review the current uncommitted diff (`git diff` + `git status` for untracked files). If the diff is empty, review the most recent commit instead.
- A version number (e.g. `v2.18.24`) → review that version's changes (`git show`, cross-reference `memory/Changelog.md`).
- A file path or feature name → review that surface specifically, reading its current implementation in `index.html` in full, not just a diff.
- `full` → a broader pass across a whole panel/flow the user names next.

Read the actual code for anything you're evaluating — don't review a diff in isolation without seeing the surrounding component it's patching into.

## Ground yourself first

Read before judging anything:
- `memory/design/Philosophy.md` — voice, tonality, the Wallpaper Test, vocabulary table
- `memory/design/Tokens.md` — colors, spacing, radius, motion timing/easing tokens
- `memory/design/Components.md` — existing component patterns (so you can tell "new pattern" from "reinvented wheel")
- `memory/design/Motion.md` — WAAPI-vs-CSS rule, easing conventions, animation philosophy
- `memory/research/Psychology.md` — the psychological principles TODAY is built on (acknowledgment vs. gamification, anxiety avoidance, etc.)
- `memory/Rules.md` — Style Rules section (19–23) for the hard constraints

If the change touches a specific area, also check the relevant doc: `architecture/Sync.md` for sync-affecting UI, `research/Temporal.md` for anything touching day boundaries, etc.

## Review rubric

Work through these lenses. Not every lens applies to every change — skip what's irrelevant rather than padding the report.

**1. Voice & tone** (Philosophy.md § Tonality + Vocabulary)
- Human not technical, present tense, calm not urgent, brief not minimal
- No exclamation marks, no gamification language, gentle acknowledgment over celebration
- Cross-check any new UI string against the Vocabulary table for a preferred term

**2. Token & component consistency** (Tokens.md, Components.md)
- Does new UI reuse existing components/patterns where one already exists, or does it invent a parallel one? (Tier-1 already catches raw hex/undefined vars — this is about *pattern* reuse, which needs judgment: "this is functionally the same as `.badge`, why is it bespoke CSS?")
- Spacing/radius/shadow from the scale, not eyeballed values that happen to look close
- If it's a new visual weight/hierarchy decision, is it consistent with how similar-importance elements are treated elsewhere?

**3. Motion** (Motion.md)
- Looping animation → must be WAAPI (`_breathe`/`_pulseComplete`), never CSS (`_forceRepaint` display-toggle rule)
- One-shot animation → CSS is fine, but check it's not accidentally re-triggerable (BUG-023 class: a one-shot inside something that toggles `display:none`/`block` on wake will replay)
- Easing/duration from tokens, and matched to the *scale* of the motion (a large easeOutExpo curve over a tiny distance reads as a stutter — BUG-032's actual lesson)

**4. Philosophy fit** (Philosophy.md § Philosophy, § Core UX Principles)
- No history / no projects / no labels / no priorities / no due dates — does this change quietly reintroduce one of these?
- No anxiety — does this add a deadline-pressure, ranking, or chasing mechanic?
- Does it respect "empty state is a reward, not failure"?

**5. Psychology** (research/Psychology.md)
- Acknowledgment vs. gamification — recognition of effort, not points/badges/external-motivation framing
- No streak-breaking guilt language, no shame mechanics
- If it's a comparison or stat, does it follow the "confident AND kind, or silent" rule?

**6. The Wallpaper Test** — **only for new or changed recurring surfaces** (something that will appear more than once: a message, badge, panel, animation, stat). Skip entirely for one-time UI (a settings toggle, a button).
- **W1:** Does it deliver value *every* time it appears — info not already on screen, an action worth taking now, or a genuinely fresh feeling?
- **W2:** Which escape does it use — appears rarely (gated on real signal), different each time (generated from fresh context), or should it not exist at all?
- If it fails both W1 and W2, that's the headline finding, not a footnote — flag it as the primary concern, not last.
- If this gate applies and passes, note that a `Backlog.md` → Watching row (`Surface | shipped vX.X.X | W3 due <+14d>`) should exist — check if it's missing.

**7. Cross-device / render-path consistency** (Rule 27, if the change touches task rendering)
- `taskHTML()`, the Trello patch path, and any zone renderer must show the same feature set. Tier-1's heuristic check catches simple marker mismatches; verify by reading if this change touched rendering.

## Output

Report findings ranked most-important first. For each:
- **What & where** (file:line or component name)
- **Which principle it violates or is at risk of violating** (name the doc + rule, don't just assert taste)
- **Concrete fix** — not "consider revisiting," an actual specific change

Close with one line: does this, on balance, feel like TODAY, or does it feel like a feature bolted onto TODAY? That's the actual question this review answers that a linter can't.

If nothing of substance is wrong, say so plainly and briefly — don't invent findings to justify the review. A clean pass is a valid, useful outcome.
