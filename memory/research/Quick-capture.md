# Quick Task Capture Research

> How to add tasks without opening the PWA

**Status:** Researched (Session 19, March 2026)  
**Decision:** Not implementing — no intuitive cross-platform solution exists

---

## The Problem

User wants to quickly capture a task idea without:
1. Finding the app icon
2. Opening the app
3. Waiting for it to load
4. Navigating to input

Ideal: "Hey Siri, add 'buy milk' to TODAY" or share text directly to app.

---

## Available Methods

### 1. Web App Manifest Shortcuts

**Platforms:** Android, Windows, macOS (Chrome/Edge)  
**NOT supported:** iOS ❌

Long-press app icon → context menu with shortcuts

```json
{
  "shortcuts": [
    {
      "name": "Add Task",
      "short_name": "Add",
      "description": "Quickly add a new task",
      "url": "/?action=add&autofocus=true",
      "icons": [{ "src": "/icons/add-192.png", "sizes": "192x192" }]
    }
  ]
}
```

**Limitation:** Still opens the app, just to a specific URL.

---

### 2. Web Share Target API

**Platforms:** Android (Chrome only)  
**NOT supported:** iOS ❌

Register PWA as share target in system share sheet.

```json
{
  "share_target": {
    "action": "/add-task",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text"
    }
  }
}
```

**Use case:** Share text from any app → PWA receives as new task.

**Limitations:**
- Only works on Android with Chrome
- Fragmented experience across platforms
- Still opens app (just with pre-filled data)

---

### 3. URL with Query Parameters

**Platforms:** All (but requires user setup)

PWA checks `window.location.search` on load:

```javascript
const params = new URLSearchParams(window.location.search);
if (params.has('add')) {
  document.getElementById('newTask').value = params.get('add');
  document.getElementById('newTask').focus();
}
```

**Example URL:** `https://today-here.netlify.app/?add=Call+dentist`

**Limitations:**
- User must create bookmarklet/shortcut themselves
- Not discoverable
- Feels hacky

---

### 4. iOS Shortcuts App

**Platforms:** iOS only

User creates Siri Shortcut that:
1. Prompts for task text via voice/keyboard
2. Opens PWA URL with task as query parameter

```
shortcuts://run-shortcut?name=AddToTODAY&input=text&text=Buy%20milk
```

**Limitations:**
- User must manually create the shortcut
- Can't distribute pre-made shortcuts easily
- PWAs can't register with Siri directly
- Siri can't launch PWAs by name

---

## Why Not Implementing

| Reason | Detail |
|--------|--------|
| **iOS has no support** | Main user platform can't use shortcuts or share target |
| **Fragmented experience** | Would only work on Android, confusing for users |
| **Requires user setup** | All workarounds need manual configuration |
| **Not "just works"** | No seamless, discoverable solution |
| **Feels hacky** | URL params, bookmarklets are power-user territory |

---

## Ideal Solution (Requires Native App)

A native iOS/Android app would enable:

| Feature | Capability |
|---------|------------|
| **Siri integration** | "Hey Siri, add task to TODAY" |
| **iOS Share Sheet** | Share text from any app → TODAY |
| **Spotlight search** | Find and add tasks from search |
| **Home screen widget** | Quick-add field always visible |
| **Background sync** | Sync even when app closed |
| **Push notifications** | Triage reminders, habit nudges |

---

## If Reconsidered Later

### Minimal Implementation

1. Add `shortcuts` to manifest.json (Android/desktop only)
2. Add `share_target` to manifest.json (Android only)
3. Add URL param handling in app init
4. Document for power users in info panel

### Code Snippets

**manifest.json additions:**
```json
{
  "shortcuts": [
    {
      "name": "Add Task",
      "url": "/?action=add&autofocus=true",
      "icons": [{ "src": "/icons/add-192.png", "sizes": "192x192" }]
    }
  ],
  "share_target": {
    "action": "/",
    "method": "GET",
    "params": { "text": "add" }
  }
}
```

**URL param handling:**
```javascript
// In init()
const params = new URLSearchParams(window.location.search);
const quickAdd = params.get('add') || params.get('text');
if (quickAdd) {
  document.getElementById('newTask').value = decodeURIComponent(quickAdd);
  document.getElementById('newTask').focus();
  // Clean URL
  history.replaceState({}, '', '/');
}
```

---

## References

- MDN: Web App Manifest Shortcuts
- MDN: Web Share Target API
- Apple: Shortcuts URL Schemes
- web.dev: App Shortcuts guide

---

*Last updated: Session 19 (March 2026)*
