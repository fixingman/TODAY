# Competitive Landscape

> Apps that share TODAY's emotional positioning — anti-anxiety, anti-pressure, calm productivity. Not feature competitors but philosophy competitors.

The Todoist / Things / TickTick category is NOT TODAY's competitive set. Those apps optimize for capture and project management. TODAY (and the apps below) optimize for emotional sustainability — the user's relationship with their list.

---

## Momentum — momentumplanner.co

**Inspected:** Session 34 (May 2026)
**Tagline:** "The weekly planner built around energy, not output."
**Pricing:** Free tier · €3.99/mo Pro (waitlist) · €19 one-time founding member
**Status when reviewed:** Live demo at momentumplanner.co/demo, Pro tier on waitlist

### What it does

Weekly planner with explicit energy modelling. User sets daily energy each morning (Low/Medium/High) and sizes each task by energy cost (S/M/L/XL). Tasks placed in time blocks within each day (Early Morning / Morning / Midday / Afternoon / Evening). Capacity ratio shown per day — "6 / 10" means planned 6 units against felt capacity of 10. Over-commitment shows visually.

### Product structure

Three views:
- **Plan** — 7-column weekly grid, drag tasks between days
- **Reflect** — historical weekly retrospectives with AI summary
- **Your Progress** — overall balance pie, weekly energy bars (planned vs felt), energy variability per day, theme overview, aggregated notes

### Data model per task

- Title
- Theme (Work / Workout / Self Care / Social / Life Admin / Learning / Rest / Other)
- Energy size (S / M / L / XL)
- Fixed (commitments) vs Flex (movable)
- Day + time block
- Skip reason (when skipped — chosen from short list)

### Key innovations worth understanding

**1. Skip with reason flow**
Skipping a task opens a modal: "Any reason for skipping?" Options: *Overbooked*, *Avoided it*, *Something else took priority*, *Too tired*. Skipped tasks stay visible with strikethrough and reason as small label — not deleted, labeled. Data feeds weekly insights.

**2. Planned vs Felt energy**
Tracks both. Planned energy = what you assigned. Felt energy = how it actually went. Shows the gap weekly. The single biggest insight engine in the product.

**3. "Open space" as affirmation**
Empty time blocks render with text "Open space" — empty time framed as a feature, not a gap.

**4. Weekly reflect — 4 questions**
- What went well this week?
- What didn't go as planned?
- What would you change next week?
- How did the week feel? (5 emoji: Exhausted / Drained / Balanced / Energised / Thriving)

AI generates a one-sentence summary from the answers + the data.

**5. Capacity ratio per day**
Live counter "6 / 10" updates as tasks are added/removed. Visual over-commitment prevention without blocking the user.

### Visual identity

- Light theme native (dark mode toggle available)
- Custom serif "momentum" wordmark — 70s magazine feel
- Editorial typography — serif headlines, sans body
- Soft pastel theme tag colors (one per category)
- Warm palette — orange accent (~#E87B47), purple/pink/cream gradients
- Generous whitespace, card-based layout
- Today highlighted with orange border
- Animated gradient blobs on landing page

### Tonality

These are direct quotes from their site:

> "Why does empty space feel like pressure to fill?"
> "Why is rest the first thing to go?"
> "Slowing down and rest is also required for momentum and growth."
> "Not now, doesn't mean never."
> "It's not that I don't have time. It's that I don't have the energy."
> "Your plan just doesn't account for how you feel."

User testimonials they highlight:
> "I want something that feels light and health focused, but still keeps me moving. Not another thing that gives me anxiety."
> "I don't want a tool that makes me feel more pressure to be productive."
> "It's not that I don't have time. It's that I don't have the energy."

The emotional positioning is near-identical to TODAY's. Same audience, same anti-pressure stance, different execution.

---

## TODAY vs Momentum — Mental Model

The two apps answer different questions:

| | TODAY | Momentum |
|---|---|---|
| Question | "What do I focus on now?" | "What does this week look like?" |
| Mode | Execution | Planning |
| Horizon | Today only | Week |
| Used | Throughout the day | Sunday + each morning |
| Aesthetic | Terminal / dev tool, dark, mono | Editorial / magazine, light, serif |
| Accent | Lime green (alert, energetic) | Warm orange (soft, encouraging) |
| Energy data | Auto-inferred (peakHour) | Explicit user input (S/M/L/XL + felt) |
| Time anchoring | None — flat list | Time blocks within day |
| Defer | SOON zone | Unplanned backlog + drag-to-day |
| Reflection | Day-end summary (3s) | Weekly retrospective (4Q + emoji) |

**Conceptually:** TODAY is the focus instrument used during work. Momentum is the planning surface used before work. They could coexist in the same person's life — Sunday on Momentum, Monday-Sunday on TODAY each day.

---

## What TODAY Could Borrow

### High value, low friction

**Skip-reason on letgo (priority)**
TODAY's triage has Keep / Soon / Letgo. Letgo currently asks nothing. A one-tap reason picker — *Not relevant anymore*, *No energy*, *Lost interest*, *Replaced by something else* — would give the AI massive insight into user patterns. Lowest-friction, highest-leverage addition. Tracked in Backlog.

**Energy-Aware AI Suggestions**
TODAY already tracks `peakHour` in `appMemory.preferences`. The AI prompt has generic energy language. Tighten so the AI explicitly ties task suggestions to the rhythm: "You usually peak around 2pm — save the report for then." System prompt change only. Tracked in Backlog.

**"How did today feel?" emoji**
Once a day, after triage. Five-emoji prompt (mirrors Momentum's 5-point scale). One tap, optional, feeds AI memory. Compounds over time.

### Medium consideration

**Sunday Mirror — structured weekly reflection**
TODAY has a Sunday-evening AI moment. Could be restructured into a 4-question retrospective using existing data (focus minutes, peak hour, habit consistency, top tags). Read-only mirror, not a planner. Adds the meta-awareness Momentum sells without becoming Momentum.

### Don't borrow

- **Multi-day grid** — kills TODAY's "today only" identity
- **Theme taxonomy as required UI** — TODAY's free-form tags preserve more freedom
- **Time blocks within day** — kills TODAY's flat-list strength
- **Per-task energy ratings as user input** — friction without proportional value when AI can infer

---

## Product Strategy Note

**Don't build a "TODAY Planner."** Momentum has months of head start in the weekly-energy-planner niche, with a clear visual identity and pricing established. Splitting attention to compete there would slow TODAY's progress in the focus-instrument niche where it's strong.

**Better path:** Make TODAY the best in the world at the focus-instrument role. Borrow specific Momentum-ish mechanics (skip reasons, energy-aware AI, weekly mirror) without becoming a planner. TODAY users who also need weekly planning can use Momentum or another tool — that's not a defeat, it's a compatible pairing.

---

## Other apps in the space (to research)

Placeholder for future analysis. Candidates worth inspecting if/when relevant:
- Sunsama — daily planner with weekly horizon
- Reclaim.ai — energy-aware calendar AI
- Akiflow — capture and time-blocking
- Cron / Notion Calendar — time blocking
- Routine — calendar + tasks unified

When inspecting any of these, structure the entry like the Momentum one above: what it does, structure, key innovations, visual identity, tonality, what to borrow / not borrow.
