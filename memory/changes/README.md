# Release notes

Each session describes its change here instead of editing the version, the About
CHANGELOG, `sw.js`, the top of `memory/Changelog.md` or the `memory/Bugs.md` table.
`npm run release:cut --prefix scripts` turns every note into one release commit and
deletes the notes. See Housekeeping → Publish.

A change note, `memory/changes/<topic>.md`:

```
---
bump: patch            # none | patch | minor | major (Rules → Version Bumping)
title: Habit focus timer survives re-renders (BUG-{habit-timer})
about: The focus timer no longer disappears when a habit is focused.
---
Technical changelog entry: cause, fix, tests. Refer to new bugs as BUG-{slug}.
```

`about` is the one plain-language line users read in About (Rule 31); leave it out
when `bump: none` (documentation, tests, CI).

A new bug, `memory/changes/<slug>.md`, gets the next free number at cut time:

```
---
bug: Habit focus loses its timer on re-render
status: ⏳ Verify      # ⏳ Verify | 🔧 Local | 🚫 Rejected | 🔍 Open
summary: One line for the status table.
---
Report, root cause, fix and how it was verified.
```

Status changes to existing bugs (verifying, archiving) are ordinary edits.
