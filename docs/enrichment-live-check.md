# Deployed enrichment check

Run after changes to task-enrichment provider/tool handling, and when investigating a deployed lookup failure. This is an explicit paid check outside automatic CI. It exercises the existing deployed function with one fixed public museum-hours lookup; it never reads app storage, personal tasks, Gmail or Trello credentials. It does not modify deployed configuration.

From a checkout matching the deployed app version:

```sh
npm run test:enrichment:live --prefix scripts
```

Default target: dev. For an explicitly authorized production check:

```sh
npm run test:enrichment:live --prefix scripts -- --target production
```

Use an approved test `ANTHROPIC_API_KEY` already supplied through the terminal environment or a secret manager. Never paste a key in chat, a command argument, a tracked file or a report. Without an environment key, the check relies on the deployed function's existing server-side configuration; it cannot borrow the key saved in your app's Connections. The deployed function prefers its server-side key when configured, so an environment fallback does not establish which account a server uses.

The runner verifies the public app version before making exactly one enrichment POST. It disables redirects and retries, bounds the preflight to5seconds and the POST including its body to30seconds, and caps the response at64KiB. The existing function may use up to three provider turns; one probe therefore does not mean exactly one billable provider call. No provider model, tool, token limit or routing is changed.

- Exit0: HTTP200 with a valid bounded card or explicit `card:null`.
- Exit1: unexpected HTTP failure (including502), invalid JSON/card, oversized response, network failure or timeout.
- Exit2: blocked, including missing credentials, version mismatch or failed preflight. Never treat this as skipped-green proof.

Each invocation reserves a new private `.context/enrichment-live-*/report.json` before the POST. `--output PATH` can choose a new report file; existing files are never overwritten. Reports include checkout SHA, app version, target, status, timing and allowlisted failure categories. They exclude keys, task/card prose, raw errors and response bodies. Preserve failed or blocked reports. No request retries occur automatically; investigate before authorizing another live attempt.

A pass establishes the deployed handler/provider response contract at that moment. Explicit no-result is a valid response, so it does not establish useful retrieval, consistent writing, Gmail/Trello access, installed Focus behavior or the original failure's root cause. App-version preflight also does not establish exact server-source identity; use release evidence separately.

The normal `task-enrich-test` suite tests the runner with fictional fetches, including deliberate502, timeout, malformed-response and privacy cases. Those checks run without credentials or live calls. The actual live runner is excluded from the default CI inventory.

November23 initial dev evidence: app v3.15.1, HTTP400 `credential-required`, exit2. The function was reached, but provider integration remains unverified until an approved credential is supplied. No second lookup was attempted.
