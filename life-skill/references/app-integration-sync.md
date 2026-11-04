# Personal app integration and sync specification

Status: implementable design, not an installed connector or running sync service. The initial generic design predates workspace inspection. For the inspected TODAY architecture, read today-integration.md: the adapter below is not an existing TODAY API. No app, task list, account or scheduler was changed by this package.

## Ownership and surfaces

Use one logical exploration workspace with stable identity. The app may own the canonical data store; otherwise the private folder is canonical. Choose explicitly before enabling writes. Codex and Claude consume the same export and produce versioned changes. Do not keep independent “latest” copies that silently overwrite one another.

The app should offer quick natural-language observation capture, the current problem map, an experiment detail view, a lightweight review, and import/export. Keep AI interpretations visually distinguishable from user words. The user can correct, reject, pause, delete, or export. Do not require a rating or daily streak. Preserve direction/engagement/leverage as separate optional lenses.

## To-do mapping

An experiment is a learning container, not just a task. Create an app task only for an action the user has agreed to put there. Map task.id to experiment.task_id and store experiment_id in the task's private metadata where possible. Send only the action title, optional due date, and minimal necessary context. Do not sync therapist questions or the raw journal to a general task list by default.

Task completion may append an execution event; it must not mark an experiment beneficial, change the hypothesis, or close its review. Task deletion means the action was removed; ask or review before changing experiment status. Experiment pause/stop may propose cancelling its linked task. Resolve differences without recreating deleted tasks automatically.

## Suggested adapter interface

These are adapter operations to implement, not claims about a live service:

- exportWorkspace(workspaceId) → schema version, revision, state, records.
- applyChanges(workspaceId, baseRevision, idempotencyKey, changes) → committed revision or conflict.
- getChanges(workspaceId, afterRevision) → ordered changes and next cursor.
- createOrUpdateTask(experimentId, approvedFields, expectedTaskRevision) → task ID/revision.

Changes identify entity ID, operation (create/update/delete), expected entity revision and changed fields. Authenticate through the app's existing mechanism; keep credentials outside exports and prompts. Validate schema, ownership and authorization server-side. Do not embed credentials, remote executable instructions, or provider settings in portable state.

## Safe sync algorithm

1. Read local state, remote revision and last common snapshot. If no common base exists, perform an explicit initial import/merge; do not assume an empty local copy should delete remote records.
2. Validate schema compatibility, workspace identity, unique IDs and references. Back up affected private data before changes.
3. Compare both versions with the common base. Union independent new records by stable ID. Repeated IDs with identical content are no-ops. Same ID with different newly created content is a conflict, not an automatic merge.
4. Merge edits to different fields only when their meaning remains compatible. Concurrent edits to the same field, raw user text, hypothesis endorsement, or deletion versus edit require user resolution. Preserve both alternatives and provenance. Do not use last-write-wins for personal interpretations.
5. Submit a bounded atomic batch with baseRevision and a stable idempotency key. Server commits only if the base still matches; otherwise return conflict with no partial write. Retry transient transport failure at most twice with the same key. On revision conflict, reread and recompute; do not blindly replay a stale replacement. Stop and report unresolved conflicts.
6. Read back the committed revision and changed IDs, then advance the common checkpoint. If acknowledgement is lost, query the idempotency key before resubmitting. Show a brief summary of actual changes.

Offline observations get new UUIDs and remain queued locally. Preserve original occurrence times. Mark unsynced status visibly; do not claim cross-tool persistence until acknowledged. A Markdown export is a manual snapshot, not a live sync channel. Plain cloud-folder syncing alone does not implement conflict-safe multiwriter updates; use one writer until an adapter exists.

## Privacy, deletion and recovery

Default all journal data to private. An export can contain sensitive material: let the user choose its destination and scope. Therapist sharing is a separate deliberate export, never automatic. Encrypt transport and storage using the host app's protections; exclude private data from source control, diagnostic logs and analytics.

Use tombstones to propagate deletions across offline replicas; never resurrect them from stale snapshots. On explicit permanent deletion, remove content from active stores and sync queues, expire backups according to the disclosed policy, and retain only minimal non-content deletion markers if needed to prevent resurrection. Explain any retention limits. Restore only through an explicit user action.

Reviews occur on resumed sessions. A next_review_at value is metadata. Only a separately authorized scheduler integration creates reminders, and the app must distinguish planned from actually scheduled reminders.

## Acceptance scenarios for a future adapter

- Same offline observation uploaded twice produces one record.
- Two devices append different observations; both survive.
- Both edit the same problem statement; neither silently wins.
- Task completion records action status but leaves learning unresolved.
- A stale device cannot resurrect a deleted observation.
- A rejected/stale batch changes nothing remotely.
- Network failure after commit can be reconciled by idempotency key.
- Export/import round trip retains user words, interpretations, evidence links and unknown extension fields.
- Unsupported schema version leaves the current workspace intact.
- Journal and therapist content stay out of task titles and ordinary logs.
