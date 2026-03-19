# TODAY — Critical Rules
> **Read this first.** These rules must never break. ~50 lines of essentials.

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
11. Backup schema version: **4.0** (includes memory)
12. Task IDs: `manual_` + timestamp, habit IDs: `habit_` + timestamp
13. All timestamps: ISO strings

## Style Rules

14. No hardcoded hex/rgba outside `:root` — all tokenized
15. No emojis in system UI text
16. Fonts: `--font-mono: 'DM Mono'`, `--font-display: 'Syne'`
17. Accent: `#c8f060` — all variants derived from this

## Build Rules

18. Source files in `/src/` — run `node build.js` to combine into `index.html`
19. SW cache version must match app version: `today-v{VERSION}`

## Z-Index Stack

| Layer | Z-Index | Element |
|-------|---------|---------|
| Base | 1 | Normal content |
| Header | 10 | Sticky header |
| Modal | 100 | Panels, overlays |
| Splash | 500 | Loading splash |
| Overlay | 999 | Top-level overlays |
| Idle companion | 50 | Creatures |
