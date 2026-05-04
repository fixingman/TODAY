# Housekeeping & Maintenance

> Routines to keep the codebase and documentation optimized.

---

## Pre-Session Checklist

Before starting work:

### 0. Log the session (3 lines, forces the scan)
```
Session N — vX.X.X · Nh
Unverified bugs: BUG-XXX, BUG-XXX
Goal: [what we're doing today]
```

### 1. Read Tier 1 files
1. `Rules.md` — Critical constraints + File Guide
2. `Housekeeping.md` — This file (routines, checklists)
3. `Backlog.md` — Pending work, watch decisions
4. `Bugs.md` — Known bugs, fix status, verification steps
5. `Changelog.md` — Recent changes

Then read Tier 2 files relevant to the task (see `Rules.md` File Guide).

---

## Post-Session Checklist

> **Ownership:** Steps 1–5 are Claude's responsibility. Step 6 (production tests) is Can's responsibility — Claude cannot run the app.

### 1. Update both Changelogs (per version bump — not just at session end)
**a) `memory/Changelog.md`** — add row:
```markdown
| **X.X.X** | **Feature name** — Brief description. |
```
**b) `index.html` CHANGELOG object** — add entry at the top:
```javascript
'X.X.X': 'Feature name — Brief description.',
```

### 2. Review & Update Memory Files
**Every change should trigger a memory review.** Ask: "Does this change affect any documented behavior?"
- Bug fix → `Bugs.md` (update status, add verification steps)
- New rule → `Rules.md`
- Data/localStorage change → `architecture/Data.md`
- Sync behavior → `architecture/Sync.md`
- AI companion → `architecture/AI.md`
- Focus/timer → `architecture/Focus.md`
- UI components → `design/Components.md`
- Animation → `design/Motion.md`
- Design philosophy → `design/Philosophy.md`
- Colors/tokens → `design/Tokens.md`
- User psychology → `research/Psychology.md`
- Time/zones → `research/Temporal.md`
- Integrations → `research/Integrations.md`
- Prototype work → `Backlog.md`

### 3. Version Bump
- `index.html`: Update `APP_VERSION`
- `index.html`: Update `DEV_HOURS` (add session time to current value)
- `sw.js`: Update `CACHE_VERSION` to match `APP_VERSION`

### 4. Commit Format
```
type: brief description (vX.X.X)
```
Types: `feat`, `fix`, `docs`, `refactor`, `style`

### 5. Reflect
- What broke or was harder than expected?
- Any pattern worth adding to `Rules.md`?
- Any routine that failed? Fix it now, not later.

---

## Production Tests (Can's responsibility)

> Run after deploying to production. Claude cannot do these — they require the live app.
> **See `Test-matrix.md` → Pre-Release Checklist (9 tests)**

Quick smoke test after any deploy:
- [ ] App loads, splash dismisses
- [ ] Add task, check task, delete task
- [ ] Sync triggers (if Dropbox connected)
- [ ] No red dot appears
- [ ] Visual intact — no broken layout

---

## Periodic Maintenance

> These run on a best-effort basis — not a hard schedule. Do them when the session is light or things feel cluttered.

### Occasionally: Quality Check
- Run from repo root: `bash memory/validate-files.sh` — checks all memory files are in File Guide
- Review `Backlog.md` — any stale items to close or move to Not Implementing?
- Check `Bugs.md` — any "awaiting" bugs that have been soaking for 3+ sessions? Follow up with Can.

### Occasionally: Documentation Audit
- Changelog.md over 20 versions? Archive oldest entries to `Changelog-archive.md`
- Any architecture doc drifting from reality? Spot-check against code
- Update version references in performance audit, component docs

---

## File Size Guidance

No hard limits — but when files get large they slow down Tier 1 reads. Use judgement:

| File | Note |
|------|------|
| `Rules.md` | Keep focused — if a rule belongs in a Tier 2 doc, move it there |
| `Bugs.md` | Grows naturally — archive verified bugs older than ~3 months if file exceeds 400 lines |
| `Changelog.md` | Keep last ~20 versions. Older entries → `Changelog-archive.md` |
| Architecture docs | Split if over 200 lines |
| Research docs | Keep concise — decided research should be < 50 lines |

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
