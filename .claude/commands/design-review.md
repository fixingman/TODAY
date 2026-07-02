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

## Calibration — what a finding is (and isn't)

Real examples from this repo's history. Match this altitude.

**A good finding** (shipped as the v2.18.19 fix — judgment a linter can't reach):

> **Finding:** Triage action row — Done shares Keep's accent treatment and leads the row. Two accent buttons means the row's one positive color no longer points anywhere (Components.md: accent = the single suggested action). **Fix:** drop `.done` from the accent CSS rule so it falls back to the neutral default, and move Done to the end of the row.

Full shape: what/where, the doc-grounded principle (not "I feel like"), and a concrete fix — never "consider revisiting."

**A Wallpaper Test finding** (shipped as the v2.17.66 removal — note that *removal* was the fix):

> **Finding:** The About panel's week narrative lines (`#weekNarrative`/`#weekCompare`/`#weekRhythm`) are rule-based phrases from a small template pool — same words for the same data shape, every open. Fails W1 (the visual grid already shows the week's shape, so the sentence adds no information) and W2 (not gated on a real signal, not fresh each time). **Fix:** remove them. The Sunday AI reflection stays — it's the one place a *generated* sentence adds value.

Removal is a valid, sometimes correct fix — don't only propose softening or rewording. And a W1+W2 fail is the headline finding, first in the report.

**A consistency finding** (shipped in v2.18.3 — the convention lives in the code, not in Tokens.md):

> **Finding:** The quiet muted voice has drifted across three letter-spacings — `.section-count` (0), `.morning-nudge` (0.04em), `.empty` (0.06em) — for text of identical rank sitting near each other. The app's de-facto quiet-text tracking is 0.04em (16 existing inline uses). **Fix:** standardize all three on 0.04em.

Two lessons: a "token" can be an *implicit convention* (found by counting usage), and the fix is to join the majority convention — **not** to invent a new `--tracking` token mid-review (that was considered and rejected: it would orphan the other 13 inline uses; a system-wide pass is a separate task, not a review finding).

**A voice finding** (shipped as v2.18.20): "README" as a section header in the About panel is a developer pun leaking into user-facing UI — Philosophy.md wants human, not technical. Fix: "Read Me". Voice findings are usually this small; report them anyway when the fix is one word.

**A non-finding** (don't report things like this):

> `.morning-nudge` uses `padding: 7px var(--space-3)` — 7px is off the spacing scale. Not a finding: it's a deliberate optical adjustment between two scale steps on a one-off surface, consistent with how the app tunes vertical rhythm elsewhere. Report an off-scale value only when it creates *visible inconsistency with a sibling component*, not because the number isn't in Tokens.md.

**Stay in scope:** when the v2.18.19 Done *button* lost its accent, the Done *badge* (post-decision label) kept it — adjacent, arguably inconsistent, deliberately left out of scope. Don't inflate a finding into a redesign of everything it touches; note the adjacent question in one sentence at most.

**Check documented exceptions before reporting:** 🍅 session badges look like a Rule 20 emoji violation but are an intentional, documented exception (Rules.md #20). If something looks wrong, first check whether Rules.md / the design docs already bless it.

## Output

Report findings ranked most-important first. For each:
- **What & where** (file:line or component name)
- **Which principle it violates or is at risk of violating** (name the doc + rule, don't just assert taste)
- **Concrete fix** — not "consider revisiting," an actual specific change

Close with one line: does this, on balance, feel like TODAY, or does it feel like a feature bolted onto TODAY? That's the actual question this review answers that a linter can't.

If nothing of substance is wrong, say so plainly and briefly — don't invent findings to justify the review. A clean pass is a valid, useful outcome.
