---
bump: none
title: Add an explicit deployed task-enrichment contract check
---
Add a dev-default, pinned-origin live probe with version preflight and exactly one fixed public enrichment request. Accept a bounded valid card or explicit no-result; fail unexpected HTTP/JSON/card/network/timeout responses, and report missing credentials or version mismatch as blocked rather than passing. Enforce opt-in, no redirects/retries, request/body deadlines, bounded output and content-free evidence. Credentials come only from an approved environment or existing deployed configuration. Keep real provider calls outside automatic CI; exercise success,502, auth, malformed/oversized bodies, timeouts and privacy guards offline in task-enrich-test. Document cost, manual operation and acceptance limits. Initial dev attempt reached v3.15.1 but was blocked by missing credentials; no live provider pass or original502 root-cause fix is claimed.
