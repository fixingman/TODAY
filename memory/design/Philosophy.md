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

> *Does this feature deliver value every time it appears — or is it just present?*

A product-level test, not a copywriting one. It applies to any recurring surface: messages, badges, panels, animations, stats, AI features. **Wallpaper** is a feature that shows up repeatedly without delivering value each time. The cost isn't cognitive load — a quiet line is cheap to ignore. The cost is that a surface which doesn't pay rent *teaches the user to stop looking at it*, and takes neighboring features down with it (you stopped opening ✦ not because it was hidden, but because it usually had nothing to offer).

It isn't about quality either. A well-built feature becomes wallpaper the moment its output is *predictable*: same trigger, same shape, same takeaway every time. Smart-looking and template are indistinguishable after the third encounter.

**How wallpaper shows itself** (symptoms, by surface type): passive surfaces → eyes slide over the text; interactive surfaces → chips stop getting tapped, panels stop getting opened. Same disease, different symptoms — watch for the behavioral one, it's measurable.

**The bar:** every appearance must deliver something — information the screen doesn't already show, an action worth taking now, or a feeling that's genuinely fresh. "It's nice" on day one is not the test; day fourteen is.

**The three escapes:**
1. **Appear rarely** — gate on real signal (≥N days of data, clear deltas), so appearing at all carries information.
2. **Be different each time** — generated from fresh context (real patterns, memory, today's specifics), never a fixed output from a lookup table.
3. **Don't exist** — absence beats a surface the user has learned to skip. Removing a feature that stopped paying rent is a feature.

**"AI-backed" alone doesn't pass the test.** An LLM prompted the same way over the same data drifts toward its own house style — slower wallpaper. Variety of *input* (fresh context, real patterns, memory) matters more than the model.

**Case law:**
- Week narrative lines (`#weekNarrative`/`#weekCompare`/`#weekRhythm`) — shipped v2.17.59, removed v2.17.66. Rule-based phrases stopped delivering after first reading; the visual grid already showed the week's shape. Escape 3.
- Sunday AI reflection — iterated v2.71.12 after a noun-juxtaposition line failed W1. Code now selects an evidence-backed, non-obvious, useful observation; AI supplies earned personality; no signal means silence. Escapes 1 + 2 only when the evidence gate passes.
- Morning nudge AI upgrade (v2.17.73) — insight-gated prompt: name something non-obvious if it exists, else state the morning plainly. Escape 2.
- Comparison framing rule (`research/Psychology.md`) — when there isn't a confident *and* kind thing to say, say nothing. Escape 1.

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

*This table (plus the "no exclamation marks" rule above) is mechanically checked by `scripts/design-lint.mjs` — new banned phrases should be added there too. Everything else on this page (voice fit, the Wallpaper Test, philosophy alignment) needs judgment — see the `/design-review` command.*
