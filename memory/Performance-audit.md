# TODAY — Performance, Bug & Safety Audit
> v1.6.16 · March 2026  
> Full audit of runtime performance, rendering strategy, security posture, privacy, and correctness. Supersedes the previous audit.

---

## 1. Bundle & Load

| Metric | Value | Notes |
|---|---|---|
| Total file size | 163 KB | Single HTML file — no build step |
| CSS | 6 KB | Inline `<style>` |
| JS | 90 KB | Inline `<script>` |
| HTML + SVG + inline data | 67 KB | Includes SVG favicon, noise data URI |
| External scripts | 0 | No CDN, no analytics SDK |
| External fonts loaded on first visit | 6 files | Self-hosted, pre-cached by SW after first load |
| External fonts on repeat visits | 0 | All served from SW cache |
| Google Fonts requests | 0 | Fonts are self-hosted — zero external pings |

**Assessment:** The JS payload (90 KB) is the main weight. No minification or tree-shaking — acceptable for a single-file project with no build step. First load fetches 6 font files. All subsequent loads are fully offline-capable. No third-party scripts execute on load.

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
- No `setInterval` active. Ticker uses a single `setInterval` reference (`ticker`), cleared on hide.
- Focus mode: `taskStates` map holds one entry per active task — cleared on `esc` / task switch. Never accumulates.
- Celebration particles: canvas-based, cleared when `celebParticles` empties. RAF loop exits when idle.
- AudioContext: created fresh per chime, closed via `osc.onended`. No lingering contexts.
- Event delegation used for task interactions (click on list containers, not per-task listeners). Adding or removing tasks does not change listener count.

### setTimeout inventory (15 total)
| Duration | Purpose | Notes |
|---|---|---|
| 180ms | Task remove animation | Matches `--dur-base` animation |
| 200ms (×3) | Focus mode DOM cleanup, misc UI | Matches `--dur-mid` |
| 160ms | Checkbox uncheck pulse | Matches animation duration |
| 800ms (×3) | Status message auto-hide | Intentional user-facing delay |
| 1000ms (×2) | Dropbox status clear | Intentional |
| 2000ms (×2) | Ticker resume after show/online | Prevents race on reconnect |
| 500ms | Trello auth poll interval | Tight loop while popup open only |
| 38ms | Focus mode rAF delay | One-frame delay for task-snap-first sequence |

No runaway timers. All are single-fire except the 500ms Trello auth poll (which runs only while the OAuth popup is open, then clears itself).

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
| Trello board with 0 cards | "No Trello tasks for today." shown | Empty list path |
| Trello auth popup blocked by browser | Popup never opens — currently no error shown | **UX gap** — silent failure |
| Dropbox PKCE state mismatch | "State mismatch — possible CSRF" error shown | Security path verified |
| Very long task text (500 chars) | Wraps via `overflow-wrap: break-word` | CSS handles it |
| Shift+; with input already focused | Shortcut does nothing (guard in place) | Verified in code |

---

## 6. Known Issues & Gaps

| Issue | Severity | Notes |
|---|---|---|
| No CSP header | Low | Personal tool, inline scripts/styles make strict CSP complex |
| `localStorage` quota failures are silent | Medium | If storage is full, saves fail without user feedback |
| Trello popup blocked | ✅ Fixed v1.6.17 | Error message shown using `showStatus()` consistent with design system |
| `dropboxRestore` catch coverage | ✅ Verified | `_dropboxEnsureToken` catches internally and never throws. Both callers have their own try/catch. `fromSync=true` errors intentionally silent — sync must not surface errors mid-session. |
| `stat_alltime_done` increments on every check, not just first | Low | Re-checking a previously unchecked task increments the all-time counter again |
| Focus mode not available on touch devices | By design | Documented in Design.md |
| Backup file version not validated on restore | Low | If a v2.0 backup is restored to v3.0 app, missing fields default to `[]` — safe but silent |

---

## 7. Summary Scorecard

| Area | Score | Notes |
|---|---|---|
| Load performance | ✅ Good | No external JS, fonts cached after first visit |
| Runtime performance | ✅ Good | Cheap ticker, incremental DOM, key-gated favicon |
| XSS protection | ✅ Good | `esc()` on all user content, URL protocol check |
| CSRF protection | ✅ Good | PKCE state verified, sessionStorage keys cleaned up |
| Privacy | ✅ Good | No app analytics, data stays local or in user's Dropbox |
| Error handling | ⚠️ Fair | `localStorage` quota silent; popup-block fixed in v1.6.17 |
| Offline support | ✅ Good | SW cache, union merge, backup-on-reconnect |
| Token hygiene | ✅ Good | App key public by design (PKCE), no secret client-side |
| CSP | ❌ Missing | No Content Security Policy |
