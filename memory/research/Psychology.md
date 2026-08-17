# User Psychology

> Research on why task apps fail and how TODAY addresses it.

---

## Why Most Task Apps Fail

~47% user churn on todo apps. Main causes:

### 1. Feature Overwhelm
Apps add features → users feel obligated to use them → guilt → abandonment.

**TODAY's answer:** Radical constraint. No projects, labels, due dates.

### 2. The Guilt Spiral
Undone tasks accumulate → list becomes monument to failure → avoidance.

**TODAY's answer:** Single-day focus. Morning is clean slate.

### 3. Productivity Theater
Planning feels productive → actual doing decreases → shame.

**TODAY's answer:** No planning features. Just today's intentions.

### 4. Gamification Backfire
Streaks create anxiety → breaking streak feels like failure → quit entirely.

**TODAY's answer:** Acknowledge streaks without pressure. No "streak broken!" messages.

---

## The Emotional Positioning

**Primary:** "I feel scattered → I want to feel intentional"
**Secondary:** "I feel alone in my productivity → I want a companion"

The app is a **companion**, not a manager.

---

## Why Open TODAY?

### Real Triggers (what we support)
- Morning brain dump
- "What should I do next?"
- Quick capture of a thought
- End-of-day review
- Checking progress

### False Triggers (what we avoid)
- Boredom scrolling
- Procrastination disguised as planning
- Anxiety checking

---

## The Acknowledgment Principle

| Gamification | Acknowledgment |
|--------------|----------------|
| Points, badges | Recognition of effort |
| External motivation | Reflects what you did |
| Creates anxiety | Creates closure |
| Manipulative | Honest |

TODAY acknowledges without gamifying.

---

## Reflection Without Mood Tracking

A reflection prompt and a mood measurement can look identical, but they have different jobs.
Mood monitoring alone is useful as data, yet randomized evidence does not show a robust wellbeing
benefit; qualitative research also finds that repeated tracking can produce rumination, guilt,
foreboding, or the feeling of another task to maintain. Brief reflection has better support when it
helps a person **name** an experience or connect it to meaning or action. Affect-labeling research
likewise supports putting feelings into words more directly than selecting an unlabeled score.

**TODAY's product/privacy decision (v2.65.7):** opt-in evening reflections shipped. The explicit choices made, each driven by the above tensions:

- **Opt-in with two-tap consent** — prompt shown once after triage; “Remember” or “Not for me.” Consent is local, revocable at any time from the Memory panel.
- **Whole-history deletion** — “Forget reflections” clears policy, history, and watermark in one step; an immediate silent Dropbox backup propagates deletion to all devices.
- **Five categorical words only** — drained · tense · steady · calm · alive. No scores, no sliders, no unlabeled ratings, no emojis. Affect-labeling benefit without numeric-score baggage.
- **30-day local retention** — responses stay on device and in Dropbox if connected; they do not accumulate indefinitely.
- **Selected-population wording** — all in-app observations say “On evenings you reflected…” to acknowledge the selection bias: the sample is not a random cross-section of all evenings.
- **Conservative on-device observations** — purely deterministic, no AI. Require ≥14 reflections total, ≥4 per comparison group. Only two patterns surfaced: a dominant feeling (≥45% share) or a focus-association (≥30 pp difference between low-focus and long-focus groups). One observation maximum.
- **User-initiated AI only** — the “Reflect” button is shown only when the AI is configured and ≥7 reflections exist; sends aggregate counts and the on-device observation, never task text, raw dates, or identifiers; result is session-only and never stored.
- **No streaks, no trends** — no counts displayed, no completion indicators, no comparison across weeks.

**Evidence boundary (research pass, 2026-08):** mood-monitoring RCT meta-analysis found no robust
benefit or harm ([Astill Wright et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC12779106/)); a brief
daily self-care reflection RCT reduced stress and negative affect but included behavioural reflection
and planning, not a single rating ([Fiodorova & Farb](https://pubmed.ncbi.nlm.nih.gov/34313502/));
user-experience synthesis found both insight and risks such as rumination and guilt
([Astill Wright et al.](https://www.nature.com/articles/s41746-025-02118-8)). The value of TODAY's
opt-in closure version therefore remains a product hypothesis, not a proven wellbeing intervention.
The wellbeing benefit of even the brief one-tap form is unproven; rumination and guilt remain real
risks. See `Backlog.md` → Watching for the Wallpaper Test watchlist entry (re-evaluate ~2 weeks
after release).

---

## Task Aging Philosophy

Old tasks don't need action — they need **acknowledgment**.

- Visual fade over 7 days (not binary stale/fresh)
- AI notices: "This has been here a while. Still relevant?"
- No auto-archive or forced decisions

The urge is for acknowledgment, not action.

---

## Empty State Psychology

Empty list can feel like:
- **Void** — "nothing to do, purposeless"
- **Victory** — "all done, accomplished"
- **Invitation** — "clean slate, what matters?"

TODAY treats empty as **invitation**, not void.

---

## Energy Rhythm

People have predictable productive hours. TODAY notices:

| Time | Suggestion Style |
|------|------------------|
| Peak hour | "Good moment for deep work" |
| Pre-peak | "Start light" |
| Post-peak | "Wind down with quick ones" |

No lecture, just smarter suggestions.

---

## The Reward Moment

Completing the last task deserves more than text.

- Visual: accent glow pulse
- Haptic: double success pattern
- Message: variable, warm ("8 tasks cleared. Impressive.")

Not fireworks. Just acknowledgment.

---

## Habit Strength Philosophy

Habit tracking has the same gamification backfire risk as streaks. If missing one day drops the indicator too far, users feel punished → anxiety → abandon the habit entirely.

**The 30–80% zone problem:** With symmetric smoothing (α=0.9 both ways), gains in the 30–80% range are tiny (+2-3% per day) but misses are large (−8-10%). One bad day undoes a week of progress. This is the zone where most users are most of the time — making it feel like Sisyphus.

**TODAY's answer (v2.15.0):** Asymmetric smoothing:
- Build rate unchanged: `alpha_up = 0.90` — gaining strength still takes consistent effort
- Miss penalty softened: `alpha_down = 0.97` — one miss from a 30-day streak drops ~3%, not 10%

**Design principle:** Building a habit should feel like work. Missing one day should feel like life, not failure. The indicator reflects the pattern, not the exception.

---

## Habit Deadline & the 3am Grace

A firm midnight cutoff acts as a **commitment device** — a self-imposed deadline that raises completion (the deadline effect), powered by loss aversion over the streak. That pressure is valuable; don't dissolve it.

But "unchecked at midnight" hides two very different things:
- **A true miss** — you didn't do it. The deadline *should* bite (and asymmetric smoothing already softens it).
- **A false negative** — you did it (or finished at 12:30am) but the clock beat your tap. This is uniquely corrosive: the tracker punishes a thing you actually did, eroding trust in the data.

**Free next-day editing is the wrong fix** — it can't tell the two apart, so it removes the deadline for both and invites moral licensing ("I'll just backfill tomorrow").

**TODAY's answer (v2.17.61):** a bounded **3am grace rollover** for habits — "the day ends when you sleep, not when the clock flips." It keeps a real deadline (at a humane hour), fixes the common false-negative, and closes the licensing hole (still a hard cutoff, no editing the distant past). The reframe underneath: we measure *doing the habit*, not *logging on time*.

---

## Comparison Framing (week-over-week)

Any feature that compares the user to their past self (week-over-week, month-over-month) inherits the streak/gamification backfire risk: a "down" period can read as a verdict.

**TODAY's rule (first used in `#weekCompare`, v2.17.59; that feature removed v2.17.66):**
- An up-period is stated plainly ("A little more focus than last week.").
- A down-period is only ever surfaced when it can be framed as permission, not failure ("Quieter than last week — that's alright.").
- When there isn't a confident *and* kind thing to say, **say nothing**. Silence beats a neutral metric the user reads as judgement.
- Gate on real data (≥3 known prior days) and clear deltas (~1.4×) so noise never triggers a comparison.

**Why `#weekCompare` was removed (v2.17.66):** even with kind framing, rule-based phrases become wallpaper after the first few readings. The principle above applies to all future comparative/predictive surfaces (incl. the WEEK companion) — but the presentation should be AI-generated and fresh, not a fixed phrase from a lookup table. Now formalized as **the Wallpaper Test** in `design/Philosophy.md`.
