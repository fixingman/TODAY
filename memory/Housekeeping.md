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
**The two changelogs have different audiences — write them differently:**

**a) `memory/Changelog.md`** — for dev sessions. Technical detail welcome: root causes, function names, design rationale.
```markdown
| **X.X.X** | **Feature name** — Brief description. |
```

**b) `index.html` CHANGELOG object** — **user-facing** (renders in the About panel). Short, plain language, no lingo. Say what changed for the user, not how. One sentence, two max. No function names, no CSS properties, no root-cause archaeology, no version cross-references.
```javascript
'X.X.X': 'Feature name — what changed, in plain words.',
```
✗ `'Fix: #errorIndicator sat at top:8px but viewport-fit=cover draws under the status bar — offset by env(safe-area-inset-top).'`
✓ `'Fix: error dot was hidden behind the status bar on mobile — now visible.'`

### 2. Review & Update Memory Files
**Every change should trigger a memory review.** Ask: "Does this change affect any documented behavior?"
**If the change adds/modifies a recurring surface** (message, badge, panel, animation, AI feature): run the Wallpaper Test gates W1–W2 (`Test-matrix.md` → Design Review Gate). **Passing W1–W2 creates a dated row in `Backlog.md` → Watching** — `Surface | shipped vX.X.X | W3 due <ship date + 14d>` — so the day-14 check is an artifact, not something to remember. The loop only closes when that row is resolved (kept / iterated / removed).
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
- `index.html`: **`APP_VERSION` is derived** — `Object.keys(CHANGELOG)[0]`. Don't hand-type it;
  add the new entry at the **top** of the `CHANGELOG` object and it follows automatically.
- `index.html`: Update `DEV_HOURS` (add session time to current value)
- `sw.js`: Update `CACHE_VERSION` to `today-v{newest version}` — the one value still hand-synced.
  The smoke test asserts it matches and fails the pre-commit gate on drift, so it can't be forgotten.

**Which digit → `Rules.md` § Version Bumping (vA.BB.CC).** Consult the table **before** writing the
new number — 2.17.x ran 100+ patches (Jun 2026) because bumps were done reflexively without checking
it; the daily poem should have been 2.18.0. No retroactive renumbering — the next qualifying feature
rolls the minor.

**Commit type → segment** (so the type and the bump never disagree):

| Commit type | Segment | |
|---|---|---|
| `feat` | **BB** (minor) | new feature / UI section / integration — reset CC to 0 |
| `fix` `refactor` `style` `chore` `docs` | **CC** (patch) | fix / polish / cleanup / docs |
| breaking / redesign / migration | **A** (major) | reset BB and CC to 0 |

**Mixed commit → the highest applicable segment wins** (a feat+fix is a minor). When in doubt,
round up — a patch that should have been a minor is the cheaper mistake than the reverse.

### 4. Commit Format
```
type: brief description (vX.X.X)
```
Types: `feat`, `fix`, `docs`, `refactor`, `style`, `chore`

**Committing and pushing are human-gated** — prep the bump/changelog/doc updates automatically, but
wait for Can to say so. When he does, commit and immediately push to `dev` — no separate
confirmation needed for the push. Push to `master` only when explicitly asked.
See `Rules.md` § Operating Mode for the full discipline-vs-gate split.

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
- **Wallpaper audit (W3):** any recurring surface shipped ~2+ weeks ago — ask Can whether it still delivers each time it appears, or has become skippable. Iterate or remove (removal is a valid outcome).

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

## Code Reading Discipline

> Applies during every session. Token cost from `view` calls accumulates permanently in context.

**Before viewing any code, ask: is this section already in context?**
- If I viewed it earlier this session AND no edit has touched that section since → trust the in-context version, skip the re-read
- If any `str_replace` or `create_file` has touched that section since the last view → re-read before acting on it
- If in doubt → re-read (a 300-token view is cheaper than a bad edit that needs reverting)

**Prefer grep over view when possible**
`grep -n "funcName"` gives line number and enough context for many tasks. Only `view` when surrounding code is genuinely needed.

**Read wider ranges once, not narrow ranges repeatedly**
If lines 100–120 and 130–150 are both needed, read 100–155 once.

**Trust edits — don't confirm with a view unless something looks wrong**
After `str_replace`, the new content is known. No need to re-read the result unless the edit was complex or uncertain.

---

## Code Hygiene

### Before Committing
- [ ] Run syntax check: `node -e "const fs=require('fs');const c=fs.readFileSync('index.html','utf8');const s=c.slice(c.indexOf('<script>')+8,c.lastIndexOf('</script>'));try{new Function(s);console.log('OK')}catch(e){console.log('ERROR:',e.message)}"`
- [ ] **Run smoke test** (any change touching index.html/sw.js/assets): `node scripts/smoke-test.mjs` — boots the app headless, splash dismisses, add+check a task, zero uncaught errors. ~10s. First-time setup: `cd scripts && npm install`. Caught a real boot-killing TDZ crash on its first ever run (v2.17.99 dev).
- [ ] **Run focus test** (any change touching the focus IIFE, `trello.js`, or the renderers): `node scripts/focus-test.mjs` — ~40s, silent on success. **How it works:** focus mode has exactly two legal states — OFF (no `.focused`, no `.focusing`, no persisted session, timer parked in `<body>`) and ON (exactly one `.focused` task that owns the timer, the persisted session and `.focusing`). Anything else is a bug, and every focus bug on record is one of those two being violated. The test defines both states once and re-checks after *every* operation, so it catches bugs we have not had yet — rather than scripting one assertion per past bug. A 12-row operation matrix walks all four reachable exit paths (escape, click-outside, task switch, check-off — BUG-065's root cause was that *every* exit leaked, so testing one would miss the rest), interleaving a render tick after each, plus rapid A→B→A inside the 200ms teardown window. Then: the invariant survives a reload, a render never resurrects focus (cold-start-only restore), cold-start restore still works, a session for an already-done task is discarded, background auto-complete records 25 min silently, and post-midnight completion preserves yesterday (BUG-063). Section 4 adds a **cross-device axis**: `mergeRemoteData()` takes a plain object, so another device is simulated with no Dropbox and no network — a value adopted from another device must arrive stamped as today's and survive the cleanup that runs after the restore (BUG-066), max must still win, and remote's yesterday total must never restore as today (BUG-024). **Why this area:** focus is 16 of 59 recorded bugs (27%). Teeth verified by reverting each of the four real fixes independently — all produce exit 1. Not reachable headless: PiP close. Not covered (needs `taskStates` internals): `.complete` bleed (BUG-022/028), frozen 00:00 on re-open (BUG-027) — human checks in `Test-matrix.md`. Skip for docs/poem/prompt-only commits. If it goes flaky, delete it rather than nurse it.
- [ ] **Run design lint** (any change touching CSS or user-facing strings): `node scripts/design-lint.mjs` — static analysis, no browser, ~1s. Catches hardcoded hex/rgba outside `:root` (Rule 19), `transition: all`, undefined CSS vars, banned vocabulary (Philosophy.md), exclamation marks in strings, missing `U+FE0E` emoji selectors (Rule 20, self-calibrated — flags a glyph if the *same* glyph carries the selector elsewhere in the file but this occurrence doesn't), and a soft Rule 27 render-path parity check. Mechanical only — does not judge voice/taste/philosophy fit, that's `/design-review` (see below).
- [ ] **For anything touching voice, a new/changed recurring surface, or component design** — run `/design-review` (`.claude/commands/design-review.md`) before shipping. Judgment-based: reviews against Philosophy.md/Tokens.md/Components.md/Motion.md/Psychology.md, including the Wallpaper Test for recurring surfaces. Not a blocking gate like smoke-test/design-lint — a structured second opinion, called on demand.
- [ ] No console.log debugging left
- [ ] No hardcoded test values (like 10s idle timer)
- [ ] Version numbers match across files
- [ ] SW cache version updated

### Naming Conventions
- Functions: `camelCase`, prefix private with `_`
- CSS tokens: `--kebab-case`
- localStorage keys: `snake_case` with `today_` prefix
- IDs: `type_timestamp` (e.g., `manual_1234567890`)
