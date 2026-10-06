# Integration Research

> Historical API feasibility notes. Current product decisions and priority live in `Backlog.md`; recheck external API details before implementation.

---

## Current Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Trello | ✅ Done | Baseline complexity (1×) |
| Dropbox | ✅ Done | PKCE OAuth, JSON backup |
| AI (Gemini) | ✅ Done | Free tier, 250 RPD |
| AI (Claude) | ✅ Done | Pay-per-token, private |

---

## Current Decisions

| Integration | Decision | Reasoning |
|-------------|----------|-----------|
| Google Drive | Parked; spec in `Backlog.md` §9 | Alternative sync provider, chosen explicitly at setup |
| Todoist | Rejected 2026-08-21 | No demonstrated need for a second task-integration lane |
| Microsoft To Do, TickTick, iCloud, Jira | No active plan | Feasibility notes below are historical, not a build order |

---

## Gmail context relevance (2026-10-06)

Can's “Book haircut” matched a calendar-generated reminder. GitHub research found two distinct approaches:

- **Source filtering:** [Q00's Gmail filters](https://gist.github.com/Q00/24b6891dcef7925a0992f287f8f535a8) and [erikdstock's calendar filter](https://gist.github.com/erikdstock/5d6770b2accec3124e8d15f394861c06) identify `calendar-notification@google.com`. Some examples also match invitations/subjects; TODAY deliberately does not copy that broader rule because service correspondence can contain a calendar attachment or reminder wording. No external script is installed and no inbox filters are created.
- **Semantic retrieval:** [semantic-mail](https://github.com/yahorbarkouski/semantic-mail) downloads mail and builds a local embedding/vector index; [mail-semantic-search](https://github.com/JonLaliberte/mail-semantic-search) adds metadata filtering and cross-encoder reranking to a local email archive. Useful retrieval patterns, but their mailbox ingestion, model runtime and database are not a drop-in fit for TODAY's bounded task lookup. No adoption proposed from this incident.

**Applied:** v2.93.20 excludes the known Google Calendar sender across Gmail enrichment queries, selected messages and old caches, with bounded next-candidate inspection. [Gmail's search guide](https://developers.google.com/workspace/gmail/api/guides/filtering) distinguishes API message search from Gmail UI thread-wide search; fetching a full thread still needs a selected-message guard. This is not a general relevance ranking solution. Keep the October 20 booking-context verdict open; do not infer a preferred salon from one search hit or introduce mailbox indexing/personal memory without intervention evidence. Other calendar providers need observed source evidence.

**Selected with Can (v2.93.21):** [MiniSearch](https://github.com/lucaong/minisearch) is a local lexical ranker with field boosting; use a transient five-thread candidate set, not a mailbox index. Vendored 7.2.0 is lazy-imported and precached. Keep deterministic service/provider, notification and ambiguity gates around the scorer. A small fake-email comparison selects confirmations over wrong-service/promotional first hits and abstains on ambiguous senders/unsupported synonyms; this is regression evidence, not live-account accuracy. [Fuse](https://github.com/krisk/Fuse) was an overlapping lexical alternative. [Transformers.js](https://github.com/huggingface/transformers.js) and [Ternlight](https://github.com/soycaporal/ternlight) allow local semantic ranking without a whole mailbox index, correcting the narrower whole-mailbox-app research above, but model download/mobile cost is not justified yet. Revisit only if observed lexical misses warrant it.

---

## Todoist Feasibility (historical; rejected)

### API Overview
- REST API v2
- OAuth2 for auth
- Sync API for real-time

### Mapping
| Todoist | TODAY |
|---------|-------|
| Task | Task |
| Due today | Shown |
| Due later | Hidden |
| Project | Ignored |
| Priority | Ignored |

### Complexity: ~1.5×
- Simple REST calls
- Well-documented
- Similar to Trello flow

---

## Microsoft To Do

### API Overview
- Microsoft Graph API
- Azure AD OAuth
- Outlook Tasks backend

### Complexity: ~2×
- More auth complexity
- Graph API learning curve
- Good docs

---

## Google Drive (backup alternative)

### API Overview
- Drive API v3
- OAuth2
- File CRUD operations

### Use Case
Alternative to Dropbox for users without Dropbox account.

### Complexity: ~2×
- Well-documented
- More setup than Dropbox

---

## AI Providers

### Gemini 2.5 Flash (default)
- Free tier: 250 requests/day
- No credit card required
- Good for personal use

### Claude Sonnet (private)
- Pay-per-token (~$0.000015/call — ~5x Haiku, negligible at personal scale)
- Noticeably warmer, more contextual responses
- Better at reflective outputs (reflect, break_down, observations)
- Model: `claude-sonnet-4-6`
- For maintainer's deploy

### Proxy Architecture
```
Client → /.netlify/functions/ai-assist → Provider API
```

Key stored in localStorage, passed through proxy.
