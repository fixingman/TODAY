# TODAY — Performance, Bug & Safety Audit
> v2.3.4 · March 2026  
> Full audit of runtime performance, rendering strategy, security posture, privacy, and correctness.

---

## 1. Bundle & Load

| Metric | Value | Notes |
|---|---|---|
| Total file size | 305 KB | Single HTML file — no build step |
| CSS | 60 KB | Inline `<style>` — includes all animations, focus mode, AI panel |
| JS | 198 KB | Inline `<script>` — includes AI assist, particle systems, drag-to-reorder |
| HTML + SVG + inline data | 47 KB | Includes SVG favicon, noise data URI |
| External scripts | 0 | No CDN, no analytics SDK |
| External fonts loaded on first visit | 6 files | Self-hosted, pre-cached by SW after first load |
| External fonts on repeat visits | 0 | All served from SW cache |
| Google Fonts requests | 0 | Fonts are self-hosted — zero external pings |

**Assessment:** File size has grown from 163KB (v1.6) to 305KB (v2.3) due to AI assistant, proactive suggestions, enhanced animations, and particle systems. No minification — acceptable for a single-file project. All loads after first are fully offline-capable.

---

## 2. Runtime Performance

### Ticker (every 7s)
- `syncAll()` runs `_refreshSyncCache()` (2 localStorage reads), then `checkNewDay()`, `syncTrello()`, `syncDropbox()`.
- `_refreshSyncCache()` batches all localStorage reads into a single pass per tick — downstream functions read from the in-memory cache (`_syncCfg`, `_syncToken`), not localStorage directly.
- `syncTrello()`: fetches board `dateLastActivity` only (~1 KB). Full card fetch only if `date !== lastTrelloDate`. Cheap in steady state.
- `syncDropbox()`: fetches file metadata only (~300 B). Full download only if `rev !== lastDropboxRev`. Cheap in steady state.
- Ticker stops on `visibilitychange hidden`, resumes 2s after visible. Background tabs produce zero network activity.

### DOM rendering
| Operation | Strategy | Notes |
|---|---|---|
| Initial manual task list | Full re-render (`list.innerHTML`) | Only runs once on page load |
| Add manual task | Incremental — `appendChild` | No list re-render |
| Delete manual task | Incremental — `el.remove()` | Animation first, DOM removal after 180ms |
| Trello task list (sync) | Diff patch | Text, badge, done state, position patched individually; new tasks appended; removed tasks `.removing` animated out |
| Trello task list (full fetch) | Full replace | Only when board `dateLastActivity` changes |
| Section counts | `textContent` writes | Direct, no re-render |
| Empty state | `textContent` + `display` toggle | `updateManualEmptyState()` called after every mutation |
| Favicon | Key-gated canvas redraw | `Math.round(pct * 20)` quantises to 5% steps — 21 possible states max, redraws only on state change |

### Memory
- Ticker uses a single `setInterval` reference (`ticker`), cleared on hide.
- Focus mode: `taskStates` map holds one entry per active task — cleared on `esc` / task switch. Never accumulates.
- Celebration particles: two canvas systems (celeb + splash), RAF loops exit when idle.
- AudioContext: single shared context, reused across sounds. Oscillators closed via `osc.onended`.
- AI state: `_aiCurrentSuggestion` holds one reference, cleared on dismiss. `_aiProactiveEl` same.
- Event delegation used for task interactions (click on list containers, not per-task listeners). Adding or removing tasks does not change listener count.
- Drag ghost: single element created on drag start, removed on drag end. Never accumulates.

### setTimeout inventory (27 total — up from 15 in v1.6)
| Duration | Purpose | Notes |
|---|---|---|
| 0ms | Defer heavy sync on load | Yields to event loop after paint (v2.2.16 fix) |
| 0ms | AI config render | Deferred to avoid layout thrash |
| 30ms | Habit input focus | Brief delay for panel animation |
| 38ms | Splash typewriter | Typing rhythm |
| 80–100ms | Panel transitions | Close → open sequencing |
| 160ms | Checkbox uncheck pulse | Matches animation duration |
| 180ms | Task remove animation | Matches `--dur-base` animation |
| 200ms | Focus mode DOM cleanup | Matches `--dur-mid` |
| 500ms | Splash font timeout | Fallback if fonts slow |
| 600ms | AI reload after action | Brief pause before refresh |
| 800ms | Status message auto-hide | Intentional user-facing delay |
| 1000ms | Dropbox status clear, focus tick | Intentional |
| 1800ms | Config panel auto-close after Trello connect | UX flow |
| 2000ms (×2) | Ticker resume after show/online, AI analyze debounce | Prevents race on reconnect |
| 12000ms | Proactive suggestion auto-dismiss | 12s timeout |

**New since v1.6:** AI debounce (2s), proactive dismiss (12s), deferred sync (0ms), panel transitions.

No runaway timers. All are single-fire except:
- `setInterval` for ticker (7s, cleared on hide)
- `setInterval` for Trello auth poll (500ms, only while popup open)
- `setInterval` for SW update check (60min)
- `setInterval` for focus mode tick (1s, only while focusing)

---

## 3. Security

### XSS
- `esc()` escapes `&`, `<`, `>`, `"` before any user content enters `innerHTML`.
- **All user-controlled content goes through `esc()`:**  `task.text`, `task.url`, `dueStr` (Trello), board/list names in selects.
- `task.url` additionally validated with `/^https?:\/\//i` before use as `href` — prevents `javascript:` URLs.
- Changelog, stats, and version info rendered from hardcoded app constants — no user input in those paths.
- `sessionBadge` uses `parseInt(task.focusSessions)` — numeric, safe.
- `tid` (task ID) used in `data-taskid` attributes — IDs are `manual_` + `Date.now()` or Trello card IDs (alphanumeric). Safe.
- No `eval()`. No `new Function()`. No dynamic script injection.

### CSRF / OAuth
- Dropbox PKCE: `state` parameter generated and stored in `sessionStorage`, verified on callback. Mismatch shown as explicit error.
- `sessionStorage` PKCE keys (`dbx_verifier`, `dbx_redirect_uri`, `dbx_state`) cleared immediately after exchange — not persisted beyond the session.
- Trello OAuth uses standard redirect flow. Token stored in `localStorage` after redirect — standard for single-page OAuth clients.

### API keys
- `DROPBOX_APP_KEY` (`e7xrc6xsw7etlqr`) is client-visible — this is expected for PKCE OAuth (public client). No secret is exposed client-side; the actual app secret lives only in Netlify env vars (`DROPBOX_CLIENT_SECRET`), used only in the Netlify function.
- `TRELLO_APP_KEY` is client-visible — this is standard for Trello's OAuth model (read-only scope).
- No credentials appear in query strings. Tokens passed in `Authorization` headers only.

### Popup blocking
- All `window.open()` calls are synchronous (not inside `await`) — prevents iOS Safari popup blocker from blocking OAuth windows.

### Missing: Content Security Policy
- No CSP `<meta>` tag or header. An inline-heavy single-file app makes a strict CSP difficult (`unsafe-inline` would be required for both style and script), but a nonce-based or hash-based approach is possible. **Low priority for a personal tool; worth revisiting if the app ever becomes multi-user.**

---

## 4. Privacy

- **No analytics in app code.** No user events, task content, or identifiers sent anywhere by the app.
- **Netlify RUM** (`/.netlify/scripts/rum`) is injected server-side by Netlify's infrastructure. It tracks page-load timing only. Ad blockers prevent it; the app functions identically without it.
- **Task content never leaves the device** except when the user explicitly connects Dropbox. Dropbox sync writes to the user's own Dropbox account — Anthropic/app author has no access.
- Trello tokens stored in `localStorage` — scoped to the origin, not accessible cross-origin. Token scope: `read` only.
- **No cookies set by app code.** Netlify may set session cookies for its infrastructure.
- `stat_alltime_done` and streak data stored locally only — never synced or reported externally.

---

## 5. Bug Test Cases

### Task management
| Test | Expected | Risk |
|---|---|---|
| Add task with `<script>alert(1)</script>` | Rendered as escaped text, no execution | **XSS — verified safe via `esc()`** |
| Add task with `"` or `'` characters | Displayed correctly | Attribute injection — safe, `esc()` covers `"` |
| Add empty task (whitespace only) | Rejected — `text.trim()` guard | Input validation |
| Add task at 500 char limit | Accepted, displayed, saved | `maxlength="500"` on input |
| Add task at 501 chars (paste) | Truncated by `maxlength` | Browser enforces limit |
| Delete last manual task | "Nothing added yet" appears with fade | Verified |
| Check all manual tasks | "✦ All done for today" appears with fade | Verified |
| Uncheck one task after all-done state | All-done state disappears | `updateManualEmptyState()` called in `toggleDone` |
| Delete a done task | Task removed, counts update | `doneIds.delete()` runs on delete |
| Rapid check/uncheck | No visual glitch, state consistent | No debounce — direct DOM toggle |

### Sync
| Test | Expected | Risk |
|---|---|---|
| Add tasks offline, reconnect | Tasks pushed to Dropbox on `online` event | Offline-first |
| Two devices add different tasks offline | Both appear after sync (union merge) | v3.0 schema |
| Device A checks task, Device B unchecks (offline) | Most recent timestamp wins | `checked_ids` / `unchecked_ids` |
| Device A deletes task, Device B still has it | Task deleted everywhere | `deleted_ids` propagation |
| Dropbox token expires mid-session | Expired flag set, UI updates, local data preserved | Token refresh path |
| Restore from Dropbox with corrupted JSON | `res.json()` throws — caught in try/catch | Error handling |
| Restore from Dropbox with missing fields | Defaults applied (`Array.isArray` guards everywhere) | Defensive parsing |
| New day triggers during active session | Cleanup runs, Trello cache cleared, streak updated | `checkNewDay()` |

### Focus mode
| Test | Expected | Risk |
|---|---|---|
| Click task, click outside | Timer pauses, UI closes, task interactive | Dismiss = pause |
| Click same task again | UI reopens, timer resumes | Auto-resume when `paused: false` |
| Hit `space` while input focused | No pause — input takes the keystroke | Input guard in keydown handler |
| Check task during active focus session | Partial session logged, focus exits, task done | `_focusOnCheck` hook |
| `esc` during session | Timer reset, state cleared | `closeUI(true)` + `clearState()` |
| Tab away, return after 5 min | Timer shows correct remaining time | Wall-clock correction via `wallStart` |
| Session completes | Chime plays, session count increments, `focusSessions` persisted | `osc.onended` chain |
| Focus on done task | Should not be possible — done tasks have no hover affordance | CSS: `.task.done .task-check` pointer-events |

### Edge cases
| Test | Expected | Risk |
|---|---|---|
| `localStorage` quota exceeded | `setItem` throws — currently unhandled | **Known gap** — silent failure possible |
| `localStorage` disabled (private mode) | App loads but data not persisted | Graceful degradation — not currently tested |
| No internet on first load (SW not yet cached) | App fails to load — expected | First load requires network |
| No internet after first load (SW cached) | App loads, works fully, sync skipped | Offline-first verified |
| Trello board with 0 cards | "Nothing due today" shown | Empty list path |
| Trello auth popup blocked by browser | ✅ Fixed v1.6.17 | Error message shown |
| Dropbox PKCE state mismatch | "State mismatch — possible CSRF" error shown | Security path verified |
| Very long task text (500 chars) | Wraps via `overflow-wrap: break-word` | CSS handles it |
| Shift+; with input already focused | Shortcut does nothing (guard in place) | Verified in code |
| AI API key invalid | ✅ "Invalid API key" shown, Connect button re-enabled | Verified |
| AI API quota exceeded | ✅ "API quota exceeded" shown | Verified |
| AI panel open during task add | Post-add analysis skipped (no double-suggestion) | Intentional |

---

## 6. Known Issues & Gaps

| Issue | Severity | Notes |
|---|---|---|
| No CSP header | Low | Personal tool, inline scripts/styles make strict CSP complex |
| `localStorage` quota failures are silent | Medium | If storage is full, saves fail without user feedback |
| Trello popup blocked | ✅ Fixed v1.6.17 | Error message shown using `showStatus()` |
| `dropboxRestore` catch coverage | ✅ Verified | All error paths handled |
| `stat_alltime_done` increments on every check, not just first | Low | Re-checking increments counter again |
| Focus mode not available on touch devices | By design | Documented in Design.md |
| Backup file version not validated on restore | Low | Missing fields default to `[]` — safe |
| AI post-add suggestion dismissed on any add | By design | Only one suggestion at a time |
| Proactive suggestion once per session | By design | After dismiss, won't show again until reload |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | No external JS, fonts cached after first visit. 305KB acceptable for single-file. |
| Runtime performance | ✅ Good | Deferred sync (v2.2.16), cheap ticker, incremental DOM, key-gated favicon |
| XSS protection | ✅ Good | `esc()` on all user content, URL protocol check |
| CSRF protection | ✅ Good | PKCE state verified, sessionStorage keys cleaned up |
| Privacy | ✅ Good | No app analytics, data stays local or in user's Dropbox. AI keys stored locally only. |
| Error handling | ✅ Good | AI errors surfaced with human messages, popup-block fixed, quota still silent |
| Offline support | ✅ Good | SW cache, union merge, backup-on-reconnect |
| Token hygiene | ✅ Good | App keys public by design (PKCE), AI keys stored locally, sent through own proxy |
| Animation performance | ✅ Good | CSS animations, GPU compositing, no JS-driven scroll animations |
| CSP | ❌ Missing | No Content Security Policy — inline scripts/styles make it complex |

---

## 8. New in v2.x

| Feature | Performance impact | Notes |
|---|---|---|
| AI Assistant | +1 API call per panel open, +1 per post-add analysis | Debounced 2s, skipped if panel open |
| Proactive suggestions | Zero API calls | Pure client-side logic |
| Breathing animations | Minimal | CSS-only, `ease-in-out`, no JS |
| Fade gradients | Minimal | Static `linear-gradient` pseudo-elements |
| Drag-to-reorder | Event delegation | Single listener per list, not per-row |
| Particle systems | RAF-based | Exits when idle, mobile-reduced |
