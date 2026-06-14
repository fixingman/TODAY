# TODAY — Memory Structure (Token-Optimized)

## Hierarchy

```
memory/
├── Rules.md           (~50 lines)   ← ALWAYS READ FIRST
├── Changelog.md       (~130 lines)  ← Version history only
│
├── design/
│   ├── Tokens.md      (~200 lines)  ← CSS variables, colors, fonts
│   ├── Components.md  (~300 lines)  ← UI component specs
│   ├── Motion.md      (~150 lines)  ← Animation rules
│   └── Layout.md      (~200 lines)  ← Structure, z-index, positioning
│
├── architecture/
│   ├── Data.md        (~200 lines)  ← localStorage schema, IDs
│   ├── Sync.md        (~200 lines)  ← Dropbox, merge logic
│   ├── AI.md          (~200 lines)  ← AI companion system
│   └── Build.md       (~50 lines)   ← Build system docs
│
└── research/
    ├── Integrations.md (~300 lines) ← API research (Trello, Todoist)
    ├── Psychology.md   (~400 lines) ← User behavior, emotional design
    └── Features.md     (~500 lines) ← Feature explorations
```

## Reading Strategy

| Task | Files to Read |
|------|---------------|
| Any change | `Rules.md` (always) |
| CSS/visual | `Rules.md` → `design/Tokens.md` |
| New component | `Rules.md` → `design/Components.md` |
| Animation | `Rules.md` → `design/Motion.md` |
| Data/storage | `Rules.md` → `architecture/Data.md` |
| Sync logic | `Rules.md` → `architecture/Sync.md` |
| AI features | `Rules.md` → `architecture/AI.md` |
| New feature | `Rules.md` → relevant `research/*.md` |

## Token Savings

| Before | After |
|--------|-------|
| Read 945-line Design.md | Read ~200-line specific file |
| Read 635-line Architecture.md | Read ~200-line specific file |
| Read 1273-line Research.md | Read ~400-line specific file |

**Estimated savings: 60-70% per task**

## Quick Reference (in Rules.md)

Rules.md should contain pointers:
```markdown
## File Guide
- CSS tokens → design/Tokens.md
- Component specs → design/Components.md
- Data schema → architecture/Data.md
- AI system → architecture/AI.md
```
