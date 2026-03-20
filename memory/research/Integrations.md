# Integration Research

> API complexity, implementation status, and priorities.

---

## Current Integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| Trello | ✅ Done | Baseline complexity (1×) |
| Dropbox | ✅ Done | PKCE OAuth, JSON backup |
| AI (Gemini) | ✅ Done | Free tier, 250 RPD |
| AI (Claude) | ✅ Done | Pay-per-token, private |

---

## Priority Ranking

| Integration | Complexity | Priority | Reasoning |
|-------------|------------|----------|-----------|
| Todoist | ~1.5× | **High** | Biggest power-user overlap |
| Microsoft To Do | ~2× | Medium | Best M365 path |
| Google Drive | ~2× | Medium | Dropbox alternative |
| TickTick | ~2× | Low | API still maturing |
| iCloud | ~2.5× | Low | Apple-only |
| Jira | ~3× | Low | Enterprise complexity |

---

## Todoist Integration (planned)

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

### Claude Haiku (private)
- Pay-per-token (~$0.000003/call)
- Higher quality responses
- For maintainer's deploy

### Proxy Architecture
```
Client → /.netlify/functions/ai-assist → Provider API
```

Key stored in localStorage, passed through proxy.
