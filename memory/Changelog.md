# TODAY — Changelog

| Version | Key change |
|---|---|
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
