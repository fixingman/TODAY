# Portable data contract v1.0

Keep reusable skill files separate from private evolving data:

```
my-life-exploration/
  state.json
  journal.md
  reviews/       # one dated review per file, if used
  handoff.md     # optional latest continuation summary
```

Copy templates/state.json and templates/experiment-journal.md (rename the latter journal.md). Start revision 0; assign a workspace UUID on initialization. Do not use a device path as workspace identity. JSON null means unknown/unset; empty arrays mean no recorded items. The initial four candidates are unconfirmed. The initial stage is observe and is not evidence that any prior stage was completed.

Stage enum: observe, frame, experiment, integrate. Stage changes are navigation, not clinical or progress judgments. Preserve supplied stage names in a framework extension if the source differs. Use ISO 8601 timestamps with offsets or UTC; store user timezone as an IANA identifier when known. Keep occurred_at separate from recorded_at for delayed observations.

State is a current snapshot; journal records are the evidence history. Increment revision once per successfully committed update, update updated_at, and preserve unknown extension fields. Every evidence reference must resolve to an existing journal or review ID. Never reference observations that were only imagined by the AI. Persist explicit provenance and endorsement separately. A hypothesis can remain unconfirmed while being useful to test.

For JSON-based apps, map each journal entry to the following common envelope (a proposed integration format, not an existing API):

```
{
  "id": "OBS-unique-id",
  "kind": "observation",
  "revision": 1,
  "created_at": "2026-11-03T20:00:00Z",
  "updated_at": "2026-11-03T20:00:00Z",
  "author": "user",
  "source": {"type": "conversation", "reference": null},
  "privacy": "private",
  "payload": {"user_words": "...", "occurred_at": null,
              "interpretation": null, "endorsement": "unconfirmed",
              "problem_ids": [], "experiment_ids": []},
  "deleted_at": null
}
```

Kinds: observation, experiment, review, amendment. Payload fields follow the corresponding Markdown template; retain fields you do not understand. ID prefixes are readable conveniences, uniqueness is required. A therapist question is a user-controlled note, not a therapist message. Store no diagnosis field by default.

Write procedure for file-capable agents: read current revision; prepare edits; verify references and JSON parsing; check revision has not changed; save a recoverable prior snapshot in private local storage; write to a temporary file then replace atomically. Use a single writer or lock when available. If the platform cannot guarantee a multi-file transaction, write durable journal entries first, then update the state; on interruption, reconcile IDs before retrying. Do not silently roll back new evidence. Explain limitations when only chat attachments are available.

Exports must include state and referenced records, schema version and export time. Import into a temporary location, validate versions, IDs and references, and present conflicts before replacing a current workspace. Reject unsupported major versions without altering data. Preserve extension fields for minor-version additions. Exporting a reusable skill alone does not export personal memory.
