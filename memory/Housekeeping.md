# Housekeeping & Maintenance

> Routines to keep the codebase and documentation optimized.

---

## Pre-Session Checklist

Before starting work, read:
1. `Rules.md` — Critical constraints (always)
2. Relevant split file for the task (see Rules.md file guide)

---

## Post-Session Checklist

After completing work:

### 1. Update Changelog
```markdown
| **X.X.X** | **Feature name** — Brief description. |
```

### 2. Update Relevant Docs
- New feature → Add to appropriate split file
- New rule → Add to `Rules.md`
- Data change → Update `architecture/Data.md`
- UI change → Update `design/Components.md`

### 3. Version Bump
- `index.html`: Update `APP_VERSION` and `DEV_HOURS`
- `sw.js`: Update `CACHE_VERSION` to match

### 4. Commit Format
```
type: brief description (vX.X.X)

Details...
```
Types: `feat`, `fix`, `docs`, `refactor`, `style`

---

## Periodic Maintenance

### Weekly: Token Optimization Check
- Are any split files > 150 lines? Consider splitting further
- Are legacy files still being referenced? Remove if not
- Is `Rules.md` still < 80 lines? Keep it compact

### Monthly: Documentation Audit
- Remove outdated information
- Consolidate duplicate content
- Update version references

---

## File Size Targets

| File Type | Target | Max |
|-----------|--------|-----|
| Rules.md | < 60 lines | 80 lines |
| Split docs | < 120 lines | 150 lines |
| Research sections | < 100 lines each | — |

If a file exceeds max, split it.

---

## Code Hygiene

### Before Committing
- [ ] No console.log debugging left
- [ ] No hardcoded test values (like 10s idle timer)
- [ ] Version numbers match across files
- [ ] SW cache version updated

### Naming Conventions
- Functions: `camelCase`, prefix private with `_`
- CSS tokens: `--kebab-case`
- localStorage keys: `snake_case` with `today_` prefix
- IDs: `type_timestamp` (e.g., `manual_1234567890`)

---

## Memory Structure Summary

```
memory/
├── Rules.md           ← ALWAYS READ (critical constraints)
├── Housekeeping.md    ← THIS FILE (maintenance routines)
├── Structure.md       ← File hierarchy reference
├── Changelog.md       ← Version history
├── Research.md        ← Feature explorations
├── Performance-audit.md
│
├── design/
│   ├── Philosophy.md  ← Voice, principles
│   ├── Tokens.md      ← CSS variables
│   ├── Motion.md      ← Animation
│   └── Components.md  ← UI specs
│
├── architecture/
│   ├── Data.md        ← localStorage schema
│   ├── Sync.md        ← Dropbox, backup
│   ├── Focus.md       ← Pomodoro
│   └── AI.md          ← AI companion
│
└── research/
    ├── Psychology.md  ← User behavior
    └── Integrations.md ← API research
```

---

## Quick Reference

### Current Version
Check `APP_VERSION` in `index.html`

### Token Budget
- Rules.md: ~70 lines = ~500 tokens
- Split file: ~100 lines = ~700 tokens
- Full read before: ~3000 lines = ~21,000 tokens
- Full read after: ~500 lines = ~3,500 tokens
- **Savings: ~85%**

### Key Files for Common Tasks

| Task | Primary File |
|------|--------------|
| CSS change | `design/Tokens.md` |
| Animation | `design/Motion.md` |
| UI component | `design/Components.md` |
| Data model | `architecture/Data.md` |
| Sync logic | `architecture/Sync.md` |
| AI feature | `architecture/AI.md` |
| Focus mode | `architecture/Focus.md` |
| User research | `research/Psychology.md` |
| New integration | `research/Integrations.md` |
