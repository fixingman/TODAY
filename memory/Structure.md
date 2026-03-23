# TODAY — Memory Structure (Token-Optimized)

## Hierarchy

```
memory/
├── Rules.md           (~70 lines)   ← ALWAYS READ FIRST
├── Housekeeping.md    (~140 lines)  ← Maintenance routines
├── Backlog.md         (~100 lines)  ← Prototype TODOs, feature tracking
├── Changelog.md       (~130 lines)  ← Version history only
│
├── design/
│   ├── Philosophy.md  (~70 lines)   ← Voice, principles, vocabulary
│   ├── Tokens.md      (~110 lines)  ← CSS variables, colors, fonts
│   ├── Components.md  (~130 lines)  ← UI component specs
│   └── Motion.md      (~80 lines)   ← Animation rules
│
├── architecture/
│   ├── Data.md        (~100 lines)  ← localStorage schema, IDs
│   ├── Sync.md        (~110 lines)  ← Dropbox, merge logic
│   ├── AI.md          (~120 lines)  ← AI companion system
│   └── Focus.md       (~110 lines)  ← Pomodoro timer, states
│
└── research/
    ├── Integrations.md (~100 lines) ← API research (Trello, Todoist)
    ├── Psychology.md   (~120 lines) ← User behavior, emotional design
    └── Temporal.md     (~100 lines) ← Past/Today/Soon exploration
```

## Reading Strategy

| Task | Files to Read |
|------|---------------|
| Any change | `Rules.md` (always) |
| Prototype work | `Rules.md` → `Backlog.md` |
| End of session | `Housekeeping.md` |
| CSS/visual | `Rules.md` → `design/Tokens.md` |
| New component | `Rules.md` → `design/Components.md` |
| Animation | `Rules.md` → `design/Motion.md` |
| Data/storage | `Rules.md` → `architecture/Data.md` |
| Sync logic | `Rules.md` → `architecture/Sync.md` |
| AI features | `Rules.md` → `architecture/AI.md` |
| New feature | `Rules.md` → `Research.md` or relevant `research/*.md` |

## Token Savings

| Before | After |
|--------|-------|
| Read 945-line Design.md | Read ~100-line specific file |
| Read 635-line Architecture.md | Read ~100-line specific file |
| Read 1273-line Research.md | Read ~100-line specific file |

**Estimated savings: 70-85% per task**
