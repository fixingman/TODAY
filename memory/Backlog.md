# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## ▸ Next up (at a glance)

| Item | Status | Notes |
|------|--------|-------|
| **Todoist integration** | Not started | Highest integration priority after Trello. ~1.5× Trello effort — see `research/Integrations.md`. |
| **Push notifications** | Not started | Medium effort. Server-sent (iOS can't self-schedule). Detail ↓ |
| **AI improvements** | In progress | AI morning nudge shipped v2.17.73 (awaiting impressions). Next: input bar discoverability, deeper personality. Detail ↓ |
| **Keyboard shortcuts (desktop)** | Not started | Keyboard-first power-user flow. Needs UX exploration first. |
| **Idle companion artwork** | Not started | Higher-resolution creatures, more visual consistency across the 7. |
| **Daily poem corpus growth** | Round 10 shipped (v2.17.89; corpus 66) | Grow `assets/poems.js` toward ~90 via curation rounds in chat (Claude proposes verified PD candidates, Can cuts by number). Taste signal: spare modern free verse + clear/light/affirming in; rhymed-quaint, ornate, cutesy, bleak out. Seasons balanced 6/7/6/6 (W/Sp/Su/Au). PD rules: authors d. pre-1956 safe worldwide; US-PD-only (pre-1931 pub, author d. post-1956) approved by Can v2.17.82 (WCW, Sandburg, Frost); no PD modern-English Rumi exists (declined to bundle copyrighted Barks). Future PD unlocks: cummings 2033, Frost/WCW worldwide 2034, Eliot 2036. Leads: CC-licensed living poets (verify each license), Yeats 'Innisfree' + Bridges 'London Snow' (need verified sources), more Chamberlain haiku. |

**Parked (see _Deferred_ below):** AI prompt trimming · WEEK companion · Trello checklist write-back.

---

## Details (for the items that need it)

### Push Notifications
**Platform:** iOS 16.4+ (installed PWA only) + Android. Web Push API + VAPID keys.
**Stack:** `push` listener in `sw.js`, VAPID keys in Netlify env, two new Netlify functions (store subscription + scheduled send), permission UI in Connections panel.
**Candidates:** 8pm triage reminder, habit nudge (custom time), morning briefing, peak-hour focus suggestion.
**Key constraint:** iOS has no background sync — notifications must be server-sent via Netlify Scheduled Functions. The app cannot self-schedule.
**Open question:** what to notify and when (the code is straightforward; the product decision isn't).

### AI Improvements
**Done so far (v2.13.0–2.17.11):** morning briefings, day-end review, stale-task awareness, behavioral insights, break_down/move_soon/reflect actions, morning reflection nudge, 7-day suggestion cooldowns, Dropbox-synced suggestion history (also fed into AI context), deterministic chips for aging tasks, conversation memory across sessions.
**Shipped v2.17.73 — AI morning nudge:** the existing morning nudge line (rule-based "Yesterday: N done · N carried over") now upgrades itself with a one-sentence AI observation (task names, ages, streak, yesterday's review). Insight-gated prompt: say something non-obvious if there is one, otherwise state the morning plainly. Cached per day; silent fallback to rule-based. **Awaiting Can's real-morning impressions — iterate on prompt/voice based on how the sentences feel over a week.**
**Remaining:**
- **Morning nudge voice iteration** — collect a week of real mornings, then tune the prompt (more specific? quieter? should it ever suggest an action chip?).
- **Input bar discoverability** — the `type + ✦` trick (sends text to AI as a free-form message) is a hidden superpower. Needs a hint: placeholder text change, tooltip, or a one-time nudge on first ✦ open.
- **Deeper personality** — weather/energy awareness beyond peak hour, richer habit-streak celebrations.

---

## Deferred / Someday

### WEEK — standalone weekly planning companion *(concept)*
**Vision:** a separate lightweight weekly planning tool. TODAY = focus instrument, WEEK = planning surface.
**Differentiator:** predictive AI from observed behaviour — no manual energy ratings. WEEK learns what this user does Monday mornings, when they focus vs coast, what they defer.
**Feeds on TODAY data:** focus sessions, completion times, habit patterns, peak hour.
**Aggregation explored (v2.17.59, removed v2.17.66):** a weekday-rhythm line ("You tend to move most on Tuesdays.") was shipped as a WEEK seed but removed with the other static narrative lines — rule-based phrases became wallpaper. The data (`today_daily_history`) still accumulates; the aggregation logic (bucket `tasksDone` by `getDay()`, find distinct leader) is worth reusing for WEEK, but with AI-generated output, not a fixed phrase.
**Revisit when:** TODAY has 3+ months of behavioural data (bug backlog is already clear).

### AI system-prompt trimming *(deferred — only if token cost ever matters)*
At ~700–800 static + 50–400 dynamic tokens and personal usage (10–30 calls/day), cost is <$0.01/day — negligible. The prompt is carefully tuned, so trimming risks regression.
**Safe to cut if needed:** action-type descriptions, energy-awareness example sub-bullets, message/rules overlap (~110 tokens total).
**Never cut:** task/habit lists with IDs, JSON format rules, "name the task" guideline, `ids` array docs, personality + philosophy block.

### Small enhancements *(low priority)*
- **Trello checklist write-back (Option B)** — bidirectional editing of card checklists. Today it's a read-only progress badge (v2.17.58). Build only if editing is actually wanted.

---

## Decisions & boundaries *(reference — rarely changes)*

### Watching
| Decision | Current | Watch for |
|----------|---------|-----------|
| Modularization | Single file (~11K lines) | Revisit if it grows significantly further. |

### Not implementing
| Feature | Reason |
|---------|--------|
| Widget / Home Screen | Needs WidgetKit (iOS) or native Android — not reachable from a PWA. Revisit only with a native wrapper. |
| Quick capture (without opening app) | No good cross-platform path. iOS has no PWA share target; Siri needs a native app. |
| Microsoft Notes integration | No clear user need. |
| Momentum integration | No public API; ICS is inbound-only to Momentum. Workflow pairing (plan in Momentum, execute in TODAY) is the answer. |

### Rejected approaches
| Area | Rejected | Reason |
|------|----------|--------|
| Quick capture | iOS Share Sheet / Shortcuts | No PWA share-target support on iOS. |
| Quick capture | Web share target | Android-only, inconsistent. |
| Sync | Real-time WebSocket | Overkill for single-user; Dropbox polling is simpler. |
| Sync | Conflict-resolution UI | Union merge + timestamps handles 99% of cases. |
| Sound | Web Audio with `.then()` | Lag after inactivity; play immediately instead. |
| Idle creatures | Complex AI behaviours | Simple random movement is charming enough. |
| Habits | Streak penalties | Anxiety-inducing; acknowledge, don't punish. |

---

*History (shipped features, fixed bugs) lives in `Changelog.md`, `archive/Changelog-archive.md`, and `archive/Bugs-archive.md` — intentionally not mirrored here. Last reorganised: v2.17.62.*
