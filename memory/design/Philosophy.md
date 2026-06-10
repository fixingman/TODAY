# Philosophy & Tonality

> Core design principles and voice guidelines.

---

## Philosophy

**One screen. One day. One list.**

TODAY is a single-day task manager. It shows only what matters right now.

- **No history.** Done tasks are acknowledged, not archived.
- **No projects.** No labels, no priorities, no due dates.
- **No anxiety.** The UI should feel calm, dark, and focused.
- **Offline-first.** Works without internet after first load.

### Core UX Principles

1. Fastest path to add = one tap / one keystroke
2. Completing feels satisfying, unchecking is neutral
3. Empty state is a reward, not failure
4. Animation serves meaning, not decoration
5. Never show loading state for local data
6. Hide scrollbar — scroll works, bar never shows

---

## The Wallpaper Test

> *Will this still tell me something in two weeks, or will my eyes slide over it?*

Anything that's supposed to be smart, dynamic, or AI-backed must pass this test. **Wallpaper** is content that repeats its shape until the eye stops reading it — and it isn't about quality. A well-written phrase becomes wallpaper the moment it's *predictable*: same trigger, same shape, every day. Smartness that repeats is indistinguishable from a template.

**The three escapes:**
1. **Say it rarely** — gate on real signal (≥N days of data, clear deltas), so appearing at all carries information.
2. **Say it differently** — AI-generated from fresh context, never a fixed phrase from a lookup table.
3. **Say nothing** — silence beats a neutral line the user reads as filler (or worse, judgement).

**"AI-backed" alone doesn't pass the test.** An LLM prompted the same way over the same data drifts toward its own house style — slower wallpaper. Variety of *input* (fresh context, real patterns, memory) matters more than the model.

**Case law:**
- Week narrative lines (`#weekNarrative`/`#weekCompare`/`#weekRhythm`) — shipped v2.17.59, removed v2.17.66. Rule-based phrases became wallpaper after first reading; the visual grid already showed the week's shape.
- Sunday AI reflection — kept. Personal, fresh, AI-generated, once a week.
- Morning nudge AI upgrade (v2.17.73) — insight-gated prompt: name something non-obvious if it exists, else state the morning plainly.
- Comparison framing rule (`research/Psychology.md`) — when there isn't a confident *and* kind thing to say, say nothing.

---

## Tonality

TODAY speaks like a calm, present friend.

### Voice Principles

1. **Human, not technical**
   - ✗ "Close panel" → ✓ "rest"
   - ✗ "Pause timer" → ✓ "breathe"

2. **Present tense, active voice**
   - ✗ "Tasks will be cleared" → ✓ "All done for today"

3. **Calm, not urgent**
   - No exclamation marks
   - No gamification language
   - Gentle acknowledgment over celebration

4. **Brief, not minimal**
   - Labels: 1-3 words
   - Status messages: 1 short sentence

---

## Vocabulary

| Instead of | Use |
|------------|-----|
| Close | rest |
| Pause | breathe |
| Reset | restart |
| Completed | done |
| No tasks | Nothing added yet |
| All tasks done | All done for today |
| Disconnect | Forget |
| Loading… | Getting your… |
| Failed to | Can't reach |
| Clear done tasks | Tidy |
| Good job | Nice |
