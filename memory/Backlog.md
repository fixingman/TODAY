# Backlog

> **Forward-looking only: what to build next, what's parked, and decisions made.**
> Shipped work → `Changelog.md` (+ `archive/Changelog-archive.md`). Fixed bugs → `archive/Bugs-archive.md`. History is not duplicated here.

---

## ◎ North star (agreed Jun 2026)

**Own the first 30 seconds of the day.** The morning is becoming TODAY's signature beat — nudge, poem, briefing. Roadmap items 1, 2, 4 all serve it; everything else supports or follows.

---

## ▸ Roadmap (prioritised, Jun 2026 review)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | **Morning nudge — impressions week → iterate** | Shipped v2.17.73, collecting | Costs nothing, decides the AI-presence direction. Can collects real-morning impressions; then tune prompt/voice. Detail ↓ |
| 2 | **Promote poem to a daily moment** | Not started | Highest delight-per-effort. Corpus built (66); today it's buried in About. Candidate: first open of the day, shown once, quietly. Original plan foresaw this promotion. Corpus growth continues in parallel — detail ↓ |
| 3 | **Smoke-test script + module extraction** | Smoke test ✅ v2.17.100 | `scripts/smoke-test.mjs` — headless boot/splash/add/check, fails on uncaught errors; in the pre-commit routine (`Housekeeping.md`). Caught a boot-killing TDZ crash on first run. **Remaining:** module extraction (more `assets/*.js`; poems.js proved the pattern). |
| 4 | **Input bar discoverability** | ✅ Shipped v2.17.99 | Placeholder hint when AI connected, ✦ glow while typing, one-time tip in panel. Awaiting verification on device. |
| 5 | **Push notifications — day boundaries only** | Not started | Evening triage + morning briefing, nothing else — marks day boundaries without chasing tasks. Needs server infra; after #3. Detail ↓ |
| 6 | **WAAPI migration of remaining infinite animations** | Opportunistic | `.ai-badge`, `.done-star`, `errorPulse` → WAAPI, then **delete** the `_forceRepaint` suppress/restore machinery. Fold into the next session touching wake/repaint. |
| 7 | **Empty/peak states audit** | Not started | First-open, everything-done, brand-new-user. "Everything done" is the app's promise fulfilled — currently just an empty list. Polish session for a quiet week. |
| 8 | **Todoist integration** | Not started | Highest integration priority after Trello. ~1.5× Trello effort — `research/Integrations.md`. |

**Gated:** WEEK companion — decide ~autumn 2026 (needs 3+ months behavioural data + #1 learnings + #3 foundations). Detail ↓

**Parked:** idle companion artwork · sync merge-anomaly counter · AI prompt trimming · Trello checklist write-back. Detail ↓

---

## Details

### 1 · AI Improvements / Morning Nudge
**Done so far (v2.13.0–2.17.73):** morning briefings, day-end review, stale-task awareness, behavioral insights, break_down/move_soon/reflect actions, 7-day suggestion cooldowns, Dropbox-synced suggestion history, deterministic chips for aging tasks, conversation memory, AI morning nudge (one-sentence observation over the rule-based line; insight-gated, cached per day, silent fallback).
**Next:** collect a week of real-morning impressions → tune the prompt (more specific? quieter? ever suggest an action chip?). Then: deeper personality (weather/energy awareness beyond peak hour, richer habit-streak celebrations).

### 2 · Daily Poem Corpus Growth
**Process:** curation rounds in chat — Claude proposes verified public-domain candidates (text checked verbatim against Gutenberg/Wikisource, never from memory), Can cuts by number. Accepted poems land in `assets/poems.js`.
**Taste signal (10 rounds):** spare modern free verse + clear/light/affirming in; rhymed-quaint, ornate, cutesy, bleak out.
**Seasons:** balanced 6/7/6/6 (W/Sp/Su/Au) as of round 10 (corpus 66, target ~90).
**PD rules:** authors d. pre-1956 safe worldwide; US-PD-only (pre-1931 pub, author d. post-1956) approved by Can v2.17.82 (WCW, Sandburg, Frost); no PD modern-English Rumi exists (declined to bundle copyrighted Barks).
**Future PD unlocks (Jan 1):** cummings 2033, Frost/WCW worldwide 2034, Eliot 2036.
**Leads:** CC-licensed living poets (verify each license), Yeats 'Innisfree' + Bridges 'London Snow' (need verified sources), more Chamberlain haiku.

### 5 · Push Notifications
**Platform:** iOS 16.4+ (installed PWA only) + Android. Web Push API + VAPID keys.
**Stack:** `push` listener in `sw.js`, VAPID keys in Netlify env, two new Netlify functions (store subscription + scheduled send), permission UI in Connections panel.
**Key constraint:** iOS has no background sync — notifications must be server-sent via Netlify Scheduled Functions. The app cannot self-schedule.
**Scope decision (Jun 2026):** day boundaries only — 8pm triage reminder + morning briefing. No habit nudges, no task chasing.

### WEEK — standalone weekly planning companion *(gated)*
**Vision:** a separate lightweight weekly planning tool. TODAY = focus instrument, WEEK = planning surface.
**Differentiator:** predictive AI from observed behaviour — no manual energy ratings. WEEK learns what this user does Monday mornings, when they focus vs coast, what they defer.
**Feeds on TODAY data:** focus sessions, completion times, habit patterns, peak hour (`today_daily_history` accumulating since v2.17.55).
**Lesson (v2.17.59→66):** rule-based weekday-rhythm phrases became wallpaper and were removed; the aggregation logic is reusable but output must be AI-generated.
**Revisit:** ~autumn 2026, with 3+ months of data.

---

## Parked / Someday

- **Idle companion artwork** — higher-resolution creatures, consistency across the 7. Or reduce to one perfect creature. Revisit if they start mattering.
- **Sync merge-anomaly counter** — cheap local log when both devices changed the same task; tells us whether the unhandled 1% of conflicts is real. Build before WEEK consumes the data.
- **AI system-prompt trimming** — cost is <$0.01/day; only if token cost ever matters. Safe cuts: action-type descriptions, energy-awareness sub-bullets (~110 tokens). Never cut: task/habit lists with IDs, JSON rules, personality block.
- **Trello checklist write-back** — bidirectional checklist editing. Today read-only badge (v2.17.58). Build only if editing is actually wanted.

---

## Decisions & boundaries *(reference — rarely changes)*

### Watching
| Decision | Current | Watch for |
|----------|---------|-----------|
| Modularization | Single file (~12K lines) + `assets/poems.js` | Roadmap #3 starts the extraction. Revisit harder if growth continues. |

### Not implementing
| Feature | Reason |
|---------|--------|
| Keyboard shortcuts (desktop) | Dropped from backlog (Can, Jun 2026). No demonstrated need — revisit only if a real workflow gap shows up. |
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

*History (shipped features, fixed bugs) lives in `Changelog.md`, `archive/Changelog-archive.md`, and `archive/Bugs-archive.md` — intentionally not mirrored here. Last reorganised: v2.17.98 (Jun 2026 roadmap review).*
