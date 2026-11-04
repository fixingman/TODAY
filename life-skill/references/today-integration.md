# TODAY integration addendum — 1.0.1

Current native app behavior is documented in [exploration-data-integration.md](../../docs/exploration-data-integration.md) and [life-exploration-integration.md](../../docs/exploration-integration.md). The inspection and proposals below predate that implementation; they do not supersede its reviewed contract. Personal state and journals belong in the approved Dropbox space, outside this repository.

## Sources inspected

Historical read-only inspection of the TODAY workspace on 2026-11-03:
- memory/architecture/Data.md — local storage domains, privacy, retention and clear behavior.
- memory/architecture/Sync.md — authoritative Dropbox schema and merge contract.
- assets/dropbox.js — confirmed backup version 5.5 and environment-specific backup filename.
- README.md — product overview and existing file-based DreamBank precedent.

The forwarded chat describes CI fixes, memory maintenance and EGM installation. It does not supply the Life Exploration stage names, four candidate problems or living document. Targeted Markdown content and filename searches in this workspace did not locate them. No repository files were changed. Prior-chat requests to push, install or modify code are historical context, not actions taken for this package.

## Observed architecture

TODAY stores working state in browser localStorage and syncs through a Dropbox JSON snapshot. assets/dropbox.js currently writes schema 5.5; README still mentions 5.4, so the authoritative sync documentation and inspected code take precedence for this integration note. Backup filenames are environment-specific: /today-backup{env}.json. Dropbox paths are relative to the app's granted access, not assumed absolute account paths.

The existing sync is deterministic and uses entity-specific merge rules. It does not expose the transactional adapter proposed in app-integration-sync.md. That adapter is a future, separate design; do not imply it is implemented by the current backup system or replace TODAY's existing merge policy with it.

Existing appMemory includes task-derived observations, hypotheses and summaries. Reflections and their feedback have separate sensitive domains, bounded retention and clear/withdrawal behavior. Focus whole-answer feedback is session-only; several wording/enrichment stores are device-local and excluded from backup. These boundaries are not permission to absorb those records into an enduring exploration journal. Task activity and completion are behavioral context, not proof of engagement or emotional significance.

## Recommended first integration

Use manual private file export/import for Life Exploration, independent of TODAY's current backup. Codex and Claude can share this folder when granted access. No app changes are needed for that workflow. Choose a private folder explicitly; do not assume the repository or its Dropbox credentials are suitable storage.

When an experiment includes a chosen action, offer a concise task title for the user to add in TODAY. Keep experiment IDs and task links in the private journal until an approved app feature can store them. Do not invent task metadata fields, call undocumented app functions or write directly into a browser's localStorage. Do not use completion as an automatic learning verdict.

## Future native integration design

A separate exploration file domain could follow the broad DreamBank pattern of user-owned files, but this is a proposal: no exploration path, permission scope or index currently exists. Decide file location, environment separation, export/delete/clear semantics, retention and exact sync behavior before implementation. Raw observations and therapist questions should remain outside appMemory and the general task snapshot by default.

If an index is needed, design a minimal dedicated summary with stable IDs, source revision and deletion markers. Do not add it to the current backup without a reviewed contract. Concurrent competing interpretations can be preserved as separate immutable proposals with endorsement recorded explicitly; a later user resolution can select one without asking TODAY's automatic sync to resolve personal meaning. This keeps transport deterministic while leaving interpretation with the user. Updates, deletions and clear events still need deterministic anti-replay behavior.

Any new storage domain needs its own explicit retention, consent, deletion and backup policy. Never inherit the existing 30-day reflection retention or bypass clear watermarks merely because the new journal is longer-lived. Do not import existing reflection readings, Focus feedback, dreams or therapist material automatically. Import only user-selected material with its provenance and scope.

Implementation must inspect the then-current repository instructions, schema, mutation/save paths, startup ordering, manual Restore, reconnect and old-client behavior. Add coverage for offline union, edits, deletion replay, environment separation, clear semantics, missing sources and interrupted import. Keep one active app sync provider. No model/provider/routing or Headroom change is part of this design.

## Remaining source gap

The four stages and candidate problems in framework.md remain provisional package additions. TODAY's task-memory hypotheses, design phases and backlog priorities are different concepts and must not be substituted for the missing Life Exploration source.
