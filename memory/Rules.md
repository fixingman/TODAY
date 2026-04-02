# TODAY — Critical Rules
> **Read this first.** These rules must never break. ~70 lines of essentials.

---

## File Guide (what to read for each task)

| Task | Read First | Then |
|------|------------|------|
| **Any change** | `Rules.md` | — |
| **Start of session** | `Housekeeping.md` | Pre-Session Checklist |
| **End of session** | `Housekeeping.md` | Post-Session Checklist |
| **Prototype/TODO** | `Backlog.md` | — |
| Public-facing docs | `README.md` | — |
| CSS/colors/fonts | `Rules.md` | `Design.md` |
| Animation | `Rules.md` | `Design.md` |
| UI component | `Rules.md` | `Design.md` |
| Voice/copy | `Rules.md` | `Design.md` |
| Data/localStorage | `Rules.md` | `Data.md` |
| Sync/backup | `Rules.md` | `Sync.md` |
| AI companion | `Rules.md` | `Architecture.md` |
| Focus/timer | `Rules.md` | `Architecture.md` |
| User psychology | `Rules.md` | `Psychology.md` |
| Time/day logic | `Rules.md` | `Temporal.md` |
| Quick capture | `Rules.md` | `Quick-capture.md` |
| Testing | `Test-matrix.md` | — |
| Performance | `Performance-audit.md` | — |
| Version history | `Changelog.md` | — |

---

## Layout Rules (will break UI if violated)

1. `.app` has `overflow-x: hidden` — **never** put `position: fixed/sticky` children inside it
2. Sticky header: `<div class="sticky-header">` goes **before** `<div class="app">`
3. Add-task bar: `<div id="addTaskBar">` goes **after** `</div><!-- end .app -->`
4. `scrollRestoration = 'manual'` must be the **very first line** of `<script>`
5. Fixed elements outside `.app` need `style="opacity:0"` — revealed after splash dismissal

## Interaction Rules

6. **Enter key = always add task** (no mode switching, no routing)
7. **✦ button = AI route** (with or without text in input)
8. `_aiLoadedOnce` prevents re-fetch on panel toggle — reset only on error
9. Uncheck = neutral (no celebration, no sound)
10. Check = celebration (sound, particles, haptic)

## Data Rules

11. `manualTasks` and `habitsList` preserve drag order — **never re-sort**
12. Backup schema version: **5.2** (includes trello_order)
13. Task IDs: `manual_` + timestamp, habit IDs: `habit_` + timestamp
14. All timestamps: ISO strings
15. **State variables must be declared before functions that use them** — `let` has temporal dead zone
16. **Day boundaries differ:** Tasks/triage use 1am (`_getAppDay()`), **Habits use midnight** (`_habitTodayISO()`)
17. **Triage window: 8pm–1am** — triage bar only shows in this window
18. **Flow rate = `done / total`** — live calc of visible tasks, not stored

## Style Rules

19. No hardcoded hex/rgba outside `:root` — all tokenized
20. No emojis in system UI text
21. Fonts: `--font-mono: 'DM Mono'`, `--font-display: 'Syne'`
22. Accent: `#c8f060` — all variants derived from this

## Build Rules

23. Single-file app — all code in `index.html`, no build step
24. SW cache version must match app version: `today-v{VERSION}`
25. **`_cacheElements()` must run at START of `init()`** — before any rendering
26. **Zone renderers must match `renderTask()` features** — tags, badges, etc.
27. **Every code change requires memory review** — ask: "Does this affect documented behavior?" Update relevant memory files.

## Z-Index Stack

| Layer | Z-Index | Element |
|-------|---------|---------|
| Base | 1 | Normal content |
| Header | 10 | Sticky header |
| Modal | 100 | Panels, overlays |
| Splash | 500 | Loading splash |
| Overlay | 999 | Top-level overlays |
| Idle companion | 50 | Creatures |
