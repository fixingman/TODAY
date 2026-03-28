# Housekeeping & Maintenance

> Routines to keep the codebase and documentation optimized.

---

## Pre-Session Checklist

Before starting work, read:
1. `Housekeeping.md` — This file (release routine, checklists)
2. `Rules.md` — Critical constraints (always)
3. `Backlog.md` — Check for prototype TODOs (if continuing a feature)
4. Relevant split file for the task (see Rules.md file guide)

---

## Post-Session Checklist

After completing work:

### 1. Run Pre-Release Tests
**See `Test-matrix.md` → Pre-Release Checklist (9 tests)**

### 2. Update Changelog
```markdown
| **X.X.X** | **Feature name** — Brief description. |
```

### 3. Update Relevant Docs
- New feature → Add to appropriate split file
- New rule → Add to `Rules.md`
- Data change → Update `architecture/Data.md`
- UI change → Update `design/Components.md`
- Prototype work → Update `Backlog.md`

### 4. Version Bump
- `index.html`: Update `APP_VERSION`
- `index.html`: Update `DEV_HOURS` (add session time to current value)
- `sw.js`: Update `CACHE_VERSION` to match `APP_VERSION`

### 5. Commit Format
```
type: brief description (vX.X.X)
```
Types: `feat`, `fix`, `docs`, `refactor`, `style`

### 6. Reflect
- What broke or was harder than expected?
- Any pattern worth adding to `Rules.md`?
- Any routine that failed? Fix it now, not later.

---

## Periodic Maintenance

### Weekly: Quality Check
- Run `bash memory/validate-files.sh` — ensure File Guide is current
- Any file > 150 lines? Split or trim
- Review `Backlog.md` — any stale items to close?

### Monthly: Documentation Audit
- Remove outdated information
- Archive decided research (keep decision + rationale only)
- Update version references

---

## File Size Targets

| File Type | Target | Max |
|-----------|--------|-----|
| Rules.md | < 60 lines | 80 lines |
| Split docs | < 120 lines | 150 lines |
| Research (decided) | < 50 lines | — |
| Research (exploring) | < 150 lines | — |

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
