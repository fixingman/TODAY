# TODAY — Changelog

| Version | Key change |
|---|---|
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
