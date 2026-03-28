# Quick Task Capture Research

> How to add tasks without opening the PWA

**Status:** Decided — Not implementing  
**Date:** Session 19, March 2026

---

## Decision

**Not implementing** — no intuitive cross-platform solution exists for PWAs.

## Why

| Reason | Detail |
|--------|--------|
| iOS has no support | Main user platform can't use PWA shortcuts or share target |
| Fragmented | Would only work on Android, confusing for users |
| Requires user setup | All workarounds need manual configuration |
| Feels hacky | URL params, bookmarklets are power-user territory |

## What Was Explored

1. **Manifest shortcuts** — Long-press icon → "Add Task" (Android/desktop only, not iOS)
2. **Web Share Target API** — Share text from any app → PWA receives (Android Chrome only)
3. **URL query params** — `?add=task` auto-fills input (all platforms, but requires user setup)
4. **iOS Shortcuts app** — User creates Siri Shortcut manually (too much friction)

## Ideal Solution (Requires Native App)

True quick capture needs a native iOS/Android app:
- Siri: "Hey Siri, add task to TODAY"
- iOS Share Sheet as target
- Home screen widget with quick-add field
- Background sync

## If Reconsidered

Minimal implementation (Android/desktop only):

```json
{
  "shortcuts": [{ "name": "Add Task", "url": "/?add=true" }],
  "share_target": { "action": "/", "method": "GET", "params": { "text": "add" } }
}
```

```javascript
// In init()
const params = new URLSearchParams(location.search);
if (params.has('add')) {
  document.getElementById('newTask').value = params.get('add') || '';
  document.getElementById('newTask').focus();
  history.replaceState({}, '', '/');
}
```
