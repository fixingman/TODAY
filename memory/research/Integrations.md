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
