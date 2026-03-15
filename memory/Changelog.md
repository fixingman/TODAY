# TODAY — Changelog

| Version | Key change |
|---|---|
| **2.3.6** | **Animation simplification** — `taskSlideIn` → pure fade (no transform), ✦ button → subtle opacity pulse (removed width expansion), splash → faster/tighter timing. Removed shadow-divider from mobile bar. |
| 2.3.5 | Accessibility: `prefers-reduced-motion` support — disables breathing animations, reduces transitions for users who prefer reduced motion. |
| 2.3.4 | Fade gradients on sticky header and add-task bar — content softens before clipping under chrome. |
| 2.3.3 | Motion refinement: breathing animations on proactive CTA button (`gentleBreath`) and "All done" star (`starBreath`). Motion Philosophy documented in Design.md. |
| **2.3.2** | **Token audit** — `--z-header`, `--accent-hover`, `--shadow-float`, `--shadow-divider` added. All hardcoded rgba/z-index replaced with tokens. `#trelloSection` padding-top for header clearance. |
| 2.3.1 | Proactive suggestion copy: "Nice — tidy up?" / "✦ All done" with "Tidy" / "Start fresh" buttons |
| **2.3.0** | **AI proactive suggestions** — after checking off ≥3 tasks, offers to clear done tasks. No API call, pure client-side. Auto-dismisses 12s, once per session. |
| **2.2.16** | **First interaction freeze fix** — defer heavy sync work with setTimeout(0) to yield to event loop after paint. App now responds instantly. |
| 2.2.15 | Fix intermittent null style error in splash animation — add guards for logo/dateWrap/splash/mainApp |
| 2.2.14 | Mobile drag fix: disable text selection on manual tasks (pointer:coarse) for smoother drag gestures |
| 2.2.13 | Replace deprecated apple-mobile-web-app-capable with mobile-web-app-capable |
| 2.2.12 | AI config layout redesign: input + Connect inline, status + link below, cleaner spacing |
| 2.2.11 | AI config: hide empty error banner when switching tabs or reopening panel |
| 2.2.10 | AI config: Forget button first, then "Connected" status (no checkmark, no provider name) |
| 2.2.9 | AI error handling: detect HTML responses, show human-friendly errors |
| 2.2.8 | AI config UX: Connect button disabled until input, label layout fixed, connected state inline |
| 2.2.7 | Bottom bar stroke removed (cleaner visual) |
| 2.2.6 | Header polish: remove shadow and bottom padding, progress bar flush at bottom |
| 2.2.5 | Copy revision: tonality applied throughout — "Get tasks", "Forget", "Save", "Bring back", "One moment…" |
| **2.2.4** | **Tonality** — Focus mode hints now say "breathe" / "rest". Tonality guidelines added to Design.md §2. Human language for humans, not robots. |
| 2.2.3 | Focus mode: Esc closes UI without resetting timer (keeps running in background) |
| 2.2.2 | Focus mode: kbd hint appears below timer bar, not fixed at bottom (avoids overlap with add-task bar) |
| 2.2.1 | Focus mode: click blinking timer bar to restart pomodoro (cursor:pointer on complete state) |
| **2.2.0** | **AI Post-Add Enhancement** — after adding a task, AI analyzes in background and offers to break down complex tasks into 2-3 subtasks. Non-blocking, auto-dismisses after 10s. |
| 2.1.3 | AI config: explicit hasKey check to prevent false "connected" state |
| 2.1.2 | Fix `_todayStr is not defined` — use `_habitTodayISO()` instead |
| 2.1.1 | Fix unnecessary scroll on short lists — `overflow-y: auto`, removed `min-height: 100vh` |
| 2.1.0 | AI function overhaul — all responses JSON, CORS headers, proper error handling for HTML responses |
| **2.0.9** | AI system prompt improvements — prioritize overdue tasks, suggest focus sessions, stricter output rules (≤15 words, 2-3 chips), prevent done-item suggestions |
| 2.0.8 | Fix ByteString error — strip non-ASCII chars from API key on client + server |
| 2.0.7 | Guard against HTML error responses — friendly message if Gemini/Anthropic return HTML |
| 2.0.6 | AI error clarity — specific messages (invalid key / quota / network), allow retry without reload |
| 2.0.5 | Fix AI key lost on SW reload — save before async validation, remove on failure |
| 2.0.4 | Re-add .task-copy exclusion to focus click handler |
| 2.0.3 | Fix AI key error visibility — .status-msg className handling |
| 2.0.2 | Fix task text overlapping copy button — padding-right in focus mode |
| 2.0.1 | Focus mode complete state — accent fill + pulse, "restart" label, one-click restart |
| **2.0.0** | Scroll reset on reload (scrollRestoration=manual), focus exit scrolls task into view |
| 1.9.9 | Fix Gemini 404 — model string updated to stable gemini-2.5-flash |
| 1.9.0 | Fix first-click freeze — AudioContext pre-warmed on first pointerdown/touchstart |
| 1.8.4 | Fix fake key validation — real API test call before saving, surfaces actual error message |
| 1.8.3 | Fix AI button persistent active state — was driven by key presence, now panel-open only |
| 1.8.2 | AI UX: active = panel open only, chip actions close immediately not linger |
| 1.8.1 | AI UX rethink — inline panel (no modal overlay), suggestion chips, task list stays visible |
| **1.8.0** | **AI Assistant — Gemini 2.5 Flash (free default) + Claude Haiku (private). Provider selector, Netlify proxy, structured actions.** |
| 1.7.3 | Progress bar fix | Sticky header mobile-only | Sticky add bar bottom | Viewport lock | No black strip |
| 1.7.3 | Token audit — all hardcoded colours, opacities, and spacing replaced with design tokens |
| 1.7.2 | Fix sticky header (outside .app, no overflow conflict) | Fix iOS haptics (drop switch trick, use vibrate directly) |
| 1.7.1 | Fix sticky header — full viewport width, was constrained to 680px app column |
| **1.7.0** | **Habits system** — 21-day strip, habit strength %, Dropbox sync, focus mode on habits | **Drag-to-reorder** — all three lists, desktop + mobile long-press | **PWA** — installable on macOS + iOS, offline fallback, auto-update | Rendering optimisations — GPU compositing, font smoothing, touch-action | Copy button on focused tasks | Shift+D shortcut |
| **1.7.0** | **Version bump — habits, drag-to-reorder, focus on habits, haptics, sticky header. Three missed minors corrected. Versioning rules enforced going forward.** |
| 1.6.54 | Fix iOS haptics (in-viewport switch + state tracking) | Sticky header with backdrop blur |
| 1.6.53 | Fix copy button visible on mobile — hidden globally, shown only on hover-capable devices |
| 1.6.52 | Haptics overhaul — iOS switch trick + differentiated Android patterns across 5 interaction types |
| 1.6.51 | Habit check in focus mode closes UI with same transition as tasks |
| 1.6.50 | Focus mode: cursor fixed to default | Copy button on focused tasks |
| 1.6.49 | Fix OG image paths to /assets/ | today-og.png added to SW cache |
| 1.6.48 | Housekeeping: images moved to assets/ folder, manifest + SW paths updated |
| 1.6.47 | Rendering: transition:all removed, width→scaleX, will-change, contain:layout |
| 1.6.47 | Rendering optimisations — font smoothing, touch-action, overscroll, GPU compositing for drag ghost |
| 1.6.46 | Fix drag first-grab miss — draggable set on mousedown, not after 4px movement |
| 1.6.45 | Focus mode extended to habits — click row starts Pomodoro, session count badge, full recede/focus CSS |
| 1.6.44 | Auto-update — SW polls every 60min, activates on next app focus, reloads seamlessly |
| 1.6.43 | Sound volume +60% — all gains raised, character unchanged |
| 1.6.43 | Swipe-to-complete removed |
| 1.6.42 | Mobile drag-to-reorder — long-press + touch ghost for all three lists |
| 1.6.41 | Fix text selection on drag | Fix swipe intent detection on iOS | Fix Trello card drag blocked by link element |
| 1.6.40 | Drag-to-reorder all three lists — manual tasks, Trello cards, habits |
| 1.6.39 | Fix drag TypeError — instanceof Element guard on all drag and swipe handlers |
| 1.6.38 | Drag handle removed — row itself is the drag target, grab cursor + left accent line on hover |
| 1.6.37 | Fix swipe track ✓ visible on desktop |
| 1.6.36 | Drag-to-reorder manual tasks | Swipe-right-to-complete on mobile | Shift+D clears all done tasks |
| 1.6.35 | Fix Trello refresh loop (stat_last_visit never set on first open) | Fix manual restore wiped by next-tick new-day cleanup |
| 1.6.34 | PWA manifest — installable via Safari Add to Dock or Chrome install prompt, no developer account needed |
| 1.6.33 | Offline cold start fallback — blinking ✦ replaces white screen |
| 1.6.32 | Trello overdue cards persist until checked off |
| 1.6.31 | Habit strength % replaces streak — exponential smoothing over 90 days, missing days don't zero progress |
| 1.6.30 | Done state visuals restored on load — _applyDoneStyles called from renderManual + renderTrello |
| 1.6.29 | Mobile habits: 7-dot strip, tighter padding, gap tokens | Edit mode persists after delete | Streak column alignment fixed | Empty .task.done rule removed |
| 1.6.28 | Edit mode surgical DOM patch | Midnight cleanup fresh date fix | Habits new-day reset | Future due dates hidden | Mobile done state inline styles | Sync renderManual guarantee | Splash parallel load two-flag gate | Trello refresh button removed |
| 1.6.27 | Housekeeping: SW cache synced, duplicate CSS removed, ember burst on habit check, no layout shift in edit mode, hover-only row reveal, surgical toggleHabitDone. |
| 1.6.26 | Habits Dropbox sync: union merge, deleted_habit_ids, backup schema v4.0. |
| 1.6.25 | Habits panel: 21-day dot strip with fade, streak counter, edit mode, add habit, habit done sound (heavier sibling of task complete). |
| 1.6.24 | Fix: Dropbox ticker silently failing after long absence. syncDropbox now calls _dropboxEnsureToken() before metadata fetch. |
| 1.6.23 | Top bar: Habits button (stub), Connections, About. Trello ↻ Refresh moved into config panel. Refresh button removed. |
| 1.6.22 | Chime redesigned to match sound family — three ascending sine notes then a settling fade. |
| 1.6.21 | Persistent shared AudioContext primed on session start. Chime and sounds now play when tab is in background. |
| 1.6.20 | Sound design language established. Complete task sound (warm descending two-step). Resume sound (soft rising nudge). Chime revised to low organic two-oscillator growl with beating wobble. |
| 1.6.19 | Trello tasks track pomodoro session counts (`today_trello_focus`). Counts reset on new day, same as manual tasks. |
| 1.6.18 | Focus mode: chime plays from background tab via `AudioContext.resume()`. Click completed timer resets and starts new session. Start sound on new session. |
| 1.6.17 | Trello popup-blocked error shown. Performance, bug & safety audit documented. |
| 1.6.16 | Font-family tokens applied everywhere. `--opacity-dim` corrected to 0.25. Opacity scale tokenised. `Shift+;` focuses add input. All-done empty state: ✦ All done for today. Section headers: count leads, no dot, no pill. Design.md restructured. |
| 1.6.15 | Focus mode: dismiss pauses, click resumes. `paused` flag added. Checkbox during focus logs partial session. `--dur-mid` token. Delete button vertically centred. |
| 1.6.14 | Focus mode (Pomodoro) — 25min sessions, timer bar, recede animation, chime, session count `N 🍅` |
| 1.6.13 | Fix new-day cleanup: done tasks now cleared correctly. Runs after Dropbox restore. `_todayStr` cached in memory |
| 1.6.12 | Union merge sync: `deleted_ids`, `checked_ids`, `unchecked_ids` with timestamps. Backup schema v3.0 |
| 1.6.11 | Favicon ✦ redesign: ring fills with progress. Scrollbar hidden. Uncheck neutral |
| 1.6.10 | Self-hosted fonts: SW-cacheable, works offline. Null crash fix in splash |
| 1.6.8 | All spacing tokenised, no hardcoded px outside `:root` |
| 1.6.7 | Housekeeping: circular tokens, ghost vars, dead sync writes, SW accent |
| 1.6.6 | Offline SW cache, persistent mutation tracking, backup-first reconnect |
| 1.6.5 | iOS Safari popup fix, session expired UX cleanup |
| 1.6.4 | Dropbox reconnect UX, Netlify functions, spacing polish |
| 1.6.3 | Design system tokens, iOS safe-area, GPU animations, dev hours tracker |
| 1.6.2 | Battery/mobile optimisation, splash DOM cleanup, theme-color |
| 1.6.1 | Trello card update animations, surgical DOM diff |
| 1.6.0 | Dropbox PKCE OAuth, Netlify functions |
| 1.5.2 | Dropbox expired token detection, accurate UI state |
