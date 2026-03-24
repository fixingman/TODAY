# TODAY — Critical Rules
> **Read this first.** These rules must never break. ~70 lines of essentials.

---

## File Guide (what to read for each task)

| Task | Read First | Then |
|------|------------|------|
| **Any change** | `Rules.md` | — |
| **End of session** | `Housekeeping.md` | — |
| **Prototype/TODO** | `Backlog.md` | — |
| CSS/colors/fonts | `Rules.md` | `design/Tokens.md` |
| Animation | `Rules.md` | `design/Motion.md` |
| UI component | `Rules.md` | `design/Components.md` |
| Voice/copy | `Rules.md` | `design/Philosophy.md` |
| Data/localStorage | `Rules.md` | `architecture/Data.md` |
| Sync/backup | `Rules.md` | `architecture/Sync.md` |
| AI companion | `Rules.md` | `architecture/AI.md` |
| Focus/timer | `Rules.md` | `architecture/Focus.md` |
| User psychology | `Rules.md` | `research/Psychology.md` |
| API integrations | `Rules.md` | `research/Integrations.md` |
| New feature | `Rules.md` | `Research.md` |

---

## Layout Rules (will break UI if violated)

1. `.app` has `overflow-x: hidden` — **never** put `position: fixed/sticky` children inside it
2. Sticky header: `<div class="sticky-header">` goes **before** `<div class="app">`
3. Add-task bar: `<div id="addTaskBar">` goes **after** `</div><!-- end .app -->`
4. `scrollRestoration = 'manual'` must be the **very first line** of `<script>`

## Interaction Rules

5. **Enter key = always add task** (no mode switching, no routing)
6. **✦ button = AI route** (with or without text in input)
7. `_aiLoadedOnce` prevents re-fetch on panel toggle — reset only on error
8. Uncheck = neutral (no celebration, no sound)
9. Check = celebration (sound, particles, haptic)

## Data Rules

10. `manualTasks` and `habitsList` preserve drag order — **never re-sort**
11. Backup schema version: **5.1** (includes triage history)
12. Task IDs: `manual_` + timestamp, habit IDs: `habit_` + timestamp
13. All timestamps: ISO strings
14. **State variables must be declared before functions that use them** — `let` has temporal dead zone

## Style Rules

15. No hardcoded hex/rgba outside `:root` — all tokenized
16. No emojis in system UI text
17. Fonts: `--font-mono: 'DM Mono'`, `--font-display: 'Syne'`
18. Accent: `#c8f060` — all variants derived from this

## Build Rules

19. Source files in `/src/` — run `node build.js` to combine into `index.html`
20. SW cache version must match app version: `today-v{VERSION}`
21. **`_cacheElements()` must run at START of `init()`** — before any rendering

## Z-Index Stack

| Layer | Z-Index | Element |
|-------|---------|---------|
| Base | 1 | Normal content |
| Header | 10 | Sticky header |
| Modal | 100 | Panels, overlays |
| Splash | 500 | Loading splash |
| Overlay | 999 | Top-level overlays |
| Idle companion | 50 | Creatures |
