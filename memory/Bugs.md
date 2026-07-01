# Bugs

> Full history for verified bugs → `Bugs-archive.md`

## Status Summary

| # | Description | Status |
|---|---|---|
| 001 | Triage dismissed cross-device | ✅ v2.12.59–60 |
| 002 | Dropbox sync fails silently | ✅ v2.12.58–61 |
| 003 | Red dot on network loss | ✅ v2.12.58–2.14.1 |
| 004 | App blank after sleep/wake | ✅ v2.17.24 |
| 005 | Trello pomodoro badge vanishing | ✅ v2.12.56–66 |
| 006 | `_onWake()` consolidation | ✅ v2.17.0 |
| 007 | Triage bar flash after triage | ✅ v2.13.2–2.16.6 |
| 008 | Drag jump-back on mobile | ✅ v2.12.72 |
| 009 | Task aging opacity broken | ✅ v2.12.73 |
| 010 | Habits didn't roll over | ✅ v2.12.74–77 |
| 011 | PiP ghost chime on wrong task | ✅ v2.16.9 |
| 012 | Overdue Trello card disappears on check | ✅ v2.16.5 |
| 013 | Focus timer jumps on restore | ✅ v2.14.9 |
| 014 | PiP not reappearing after restore | ✅ v2.15.5–2.16.19 |
| 015 | AI repeats same aging task | ✅ v2.15.2 |
| 016 | AI chip labels generic | ✅ v2.15.6 |
| 017 | Focus minutes only on full completion | ✅ v2.16.0 |
| 018 | Phantom SOON tasks reappear | ✅ v2.17.9 |
| 019 | Star explosion missing on mobile | ✅ v2.17.29 |
| 020 | Streak double-counts across devices | ✅ v2.17.26 |
| 021 | Splash explosion invisible / freezes after typewriter | ✅ v2.17.27–29 |
| 022 | Focus fill bar pulsates during active countdown | ✅ v2.17.36 |
| 023 | Top panels flash twice on desktop PWA restore | ✅ v2.17.37 |
| 024 | Focus minutes carry over to next day | ✅ v2.17.48 |
| 025 | PiP "Again" lost / shows 25:00 after sleep/wake | ✅ v2.17.52 |
| 026 | Habit re-checks itself after uncheck | ✅ v2.17.53 |
| 027 | Trello focus timer resets on re-open | ✅ v2.17.62 |
| 028 | Completed bar flash/pause on window return | ✅ v2.17.94 |
| 029 | `_aiSendFromInput` undefined — crash on ✦ submit | ✅ v2.17.64 |
| 029b | ✦ submit answer swapped by proactive load race | ✅ v2.17.93 |
| 030 | Checkmark animation lags ~30s on iOS PWA open | ✅ v2.17.105 |
| 031 | Red error dot invisible on mobile PWA | ✅ v2.17.75 |
| 032 | Splash logo appears mid-animation on mobile | ⏳ v2.18.18 |
| 033 | Morning nudge missing on first cold-start | ✅ v2.17.125 |
| 034 | Morning nudge AI text swaps mid-read | ✅ v2.17.125 |
| 035 | Trello cards never age visually | ✅ v2.17.127 |
| 036 | This Week differs web vs mobile | ✅ v2.17.132 |
| 037 | Task list stale on morning open | ✅ v2.17.135 |
| 038 | Red dot on mobile when offline | ✅ v2.17.136 |
| 039 | All-habits-done celebration never fires | ✅ v2.17.137 |
| 040 | Morning nudge reappears after dismiss | ✅ v2.17.139 |
| 041 | White flash on mobile cold start | ✅ v2.18.13 |
| 042 | Trello card order scrambles across devices | ✅ v2.18.4 |
| 043 | Aged card won't un-dim after focus session | ✅ v2.18.11, v2.18.17 |
| 044 | Delayed focus chime after Escape/task-switch | ✅ v2.18.6 |
| 045 | Done-today count inflates | ⏳ v2.18.21 |
| 046 | Trello board selector / Dropbox buttons flicker | ✅ v2.18.15 |
| 047 | Dropbox connect on fresh install doesn't auto-restore | ⏳ v2.18.16 |
| 048 | Trello card aging not synced across devices | ✅ v2.18.17 |
| 049 | New Trello card looks aged on arrival | ⏳ v2.18.22 |
| 051 | Trello nudge dismissal not synced across devices | ⏳ v2.18.23 |

---

*Verified bugs → `archive/Bugs-archive.md`. Below: bugs still awaiting verification.*

---

## BUG-032: Splash logo appears mid-way through splash animation (mobile)

**Status:** Raster bug resolved through v2.17.133 (glyphs no longer paint mid-animation, confirmed by Can). Rise-smoothness polish in v2.18.18 — awaiting verification. Five raster passes (v2.17.97, v2.17.112, v2.17.126, v2.17.130, v2.17.133) + one motion-design pass (v2.18.18); see notes below.

**Symptom:** Sometimes on mobile, the TODAY logo appears mid-way through the splash animation (partially improved from v2.17.97/112 which fixed the downward-shift variant). The letter-rise animation occasionally starts late or logo appears unexpectedly during the sequence. Intermittent on cold start. Never on desktop.

**Root cause (two parts):**
1. The logo letters' rise animation started immediately from page render (CSS `animation-delay` from .06s), but the typewriter waits for `document.fonts.ready`. On mobile cold starts Syne isn't loaded yet, so the logo rendered in the fallback font; when Syne arrived the swap changed the logo block's metrics, and `#splash` (`justify-content: center`) re-centered the column — a visible shift right before typing starts. Desktop has fonts cached → never reproduces.
2. `startSplash` could fire twice when fonts take >800ms: the fallback timeout fires it, then `fonts.ready.then()` fires it again (the `clearTimeout` only helps if fonts win the race) — restarting the star transition and double-running the typewriter rAF loop.

**Fix (v2.17.97):** Letter-rise animation moved behind a `#splash-logo.go` gate; `startSplash` adds the class after fonts are ready, so the logo only ever renders in Syne. `_splashStarted` guard makes `startSplash` idempotent.

**Recurrence + refix (v2.17.112):** v2.17.97 gated `.go` on `document.fonts.ready`, but iOS Safari is known to resolve `.ready` *before* custom fonts actually paint on cold start. So `.go` revealed the letters in the fallback font and Syne swapped in a frame later; with `#splash-logo` at `line-height: 1` and tall Syne 800 glyphs, the swap repositions glyphs *within* the (constant-height) line box — the residual downward shift. Refix: gate on the specific faces via `document.fonts.load('800 96px Syne', 'TODAY')` + `document.fonts.load('300 13px "DM Mono"', 'JANUARY')` (`FontFaceSet.load()` resolves only when those faces are truly loaded — reliable on Safari), keeping the 800ms cap + `_splashStarted` guard. Also added `<link rel="preload">` for both splash woff2 files so they fetch before first paint.

**Third pass — corrected mechanism + refix (v2.17.126):** Can reported the logo still "appears mid-way through the splash animation" intermittently on mobile. Re-investigation found the earlier diagnosis was wrong: all `@font-face` rules use `font-display: block`, which renders glyphs **invisibly** (never in a fallback face) until the real font paints — so there is no fallback→Syne *position* swap. The true mechanism is a **desync between the rise animation and font paint**: the `splashLetterRise .4s` animation starts when `.go` is added, but the glyphs stay invisible until Syne paints. If Syne lands *mid-animation*, the logo appears partway through its rise (partial opacity/position) → "appears mid-way." The v2.17.112 `document.fonts.load()` gate was correct *when it won the race*, but the blind `setTimeout(startSplash, 800)` fallback could fire first on a slow cold start, adding `.go` before Syne painted — the leak that kept the bug intermittent. **Fix:** replaced the load+800ms-timeout race with a `requestAnimationFrame` poll of `document.fonts.check('800 96px Syne') && check('300 13px "DM Mono"')` — `.go` is added only on a frame where both faces are genuinely usable, so the rise always plays from `opacity:0` with visible glyphs. Generous **2500ms** ceiling (replacing 800ms) makes the leak vanishingly rare and stays under the 6s dismiss safety net; the ceiling path reveals the logo statically via a new `#splash-logo.go.instant .l { animation:none; opacity:1; transform:none }` modifier rather than stalling — so even then there's no mid-rise pop. `startSplash` now takes an `animated` flag.

**Fourth pass — glyph raster pre-warm (v2.17.130):** Can reported the rise still wasn't smooth — the glyphs became visible on the *same frame* the animation starts. Root: `document.fonts.check()` confirms the *face* is loaded, but the glyph raster cache is **per-size** and the logo renders at `clamp(48px,9vw,96px)`, not the `96px` we check. So the first paint at the real rendered size landed on frame 1 of the rise → rasterisation and animation start collided (stutter). **Fix:** in `startSplash` (animated path only), paint the real `.l` letters once at `opacity:0.02` (imperceptible — only exactly `0` is compositor-skipped), force layout via `offsetWidth`, then on the next `requestAnimationFrame` revert opacity to the CSS base and add `.go`. The rise now runs on already-rasterised glyphs at the exact size. ~16ms (one frame) cost, no new assets. `instant` ceiling path unchanged (font not ready → nothing to warm). Canvas pre-warm was rejected: raster cache is keyed by element+size, so only warming the real letters at their real `clamp()` size populates the cache the rise paints from.

**Fifth pass — transform-only reveal, fix the class not the timing (v2.17.133):** Can reported glyphs STILL paint *during* the animation. Root insight: all four prior passes tried to *time* `.go` to a `document.fonts` signal, but on iOS the API reports "loaded" before WebKit rasterises the glyphs at the real rendered size (`clamp(48px,9vw,96px)`; we checked at 96px), and `font-display:block` keeps the box blank until raster lands — so the per-letter **opacity** ramp always raced the real paint. The `opacity:0.02` warm (v2.17.130) was compositor-skippable. **Fix (eliminates the class):** (1) `#splash-logo` is `visibility:hidden` until ready — stays in layout so the FontFaceSet loads, but nothing paints (also kills the v2.17.97/112 fallback-metrics shift). (2) Gate switched from the `fonts.check()` poll back to the `fonts.load()` **promise** (reliable on Safari), raced against the 2000ms ceiling via `Promise.race`; `_splashStarted` makes a late resolve a no-op. (3) `startSplash` flips to `visible` at the start position with `.l` now `opacity:1`, forces an in-view raster across two `requestAnimationFrame`s (a genuine full-opacity paint, not 0.02), THEN fades the **whole container** in as one unit (all glyphs already rastered → none can paint mid-fade) while a **transform-only** keyframe runs the staggered rise (`from translateY(0.12em)` byte-identical to `.l` base → no 1-frame jump; no opacity in the keyframe). Star/cursor/typewriter start immediately; the double-rAF gates only `.go` → no perceptible startup delay. `.instant` ceiling path drops opacity (base is 1). Option B (container fade) chosen over pure solid-slide to keep the soft feel.

**Sixth pass — motion-design polish, smoother rise (v2.18.18):** With the raster bug resolved, Can reported the rise itself read as abrupt/stuttery — "letters appearing up from the bottom" not smooth. Root: the rise distance is tiny (`translateY(0.12em)` ≈ 5.8–11.5px at `clamp(48px,9vw,96px)`) but used easeOutExpo (`--ease-out`, `cubic-bezier(0.16,1,0.3,1)`) over `.4s` — that curve does ~90% of the travel in the first ~120ms then crawls the last ~1px sub-pixel for ~280ms (~0.06px/frame); non-composited text pixel-snaps each frame, so the tail rendered as 2–3 discrete steps ("pop then stutter"). The aggressive curve is built for large travel, not an 11px glyph rise. **Fix (motion design only, raster orchestration untouched):** gentler easeOutQuint **inlined** `cubic-bezier(0.22,1,0.36,1)`, distance `0.12em→0.18em`, duration `.4s→.55s`, stagger `.04s→.07s` (delays .06→.34). Larger distance + gentler tail keep per-frame motion above the pixel-snap floor for nearly the whole duration. Easing is inlined (NOT via `--ease-out`, which stays easeOutExpo for the container fade + app transitions). Base `.l` `translateY`, keyframe `from`, and the JS comment all moved to `0.18em` together (byte-identical invariant → no v2.17.97/112 first-frame jump). **GPU layer promotion (`will-change`/`translateZ`) deliberately rejected** — it re-rasters glyphs at layer creation, exactly the late-raster class the five passes fixed.

**Verify:**
- Mobile PWA cold start (force-quit first, ideally on slow network), repeat → logo appears solid (font already painted) and fades+rises as one unit; glyphs never paint/appear partway through the motion
- Rise now reads as a calm, smooth cascade (longer wave, no clump); no visible step/stutter at the tail; no down-then-up jump on frame 1
- Desktop / warm cache: unchanged feel, no perceptible delay before the reveal
- Slow network (DevTools throttle + disable cache): reveal still clean; at worst the 2000ms ceiling reveals it statically (no rise)

**Verified fixed:** ☐

---

## BUG-045: Done-today count inflates across check/uncheck cycles and cross-device sync

**Status:** ⏳ v2.18.14 (date guard) → v2.18.21 (counter retired) — awaiting verify

**Symptom:** The completed-task count shown in the evening triage summary and weekly grid blew up over the day — inflated by check/uncheck cycles (each check incremented, uncheck never decremented) and by cross-device `Math.max` merge (two devices each contributed their total and the higher won).

**Root cause:** `stat_tasks_done_today` was a monotonic increment-only counter. Three increment sites (normal checkbox, triage "done", `_focusOnCheck`) never decremented on uncheck. Cross-device merge used `Math.max(local, remote)`, so two devices that each did 3 tasks merged to 6. A date-guard was added (v2.18.14 — same class as BUG-024 focus minutes) but it only fixed midnight carry-over, not the inflation within a day.

**Fix (v2.18.21 — counter retired):** Fully removed `stat_tasks_done_today`: all 3 increment sites, the daily reset, the merge branch, the restore branch, and the backup payload fields. New `_doneTodayCount(dayISO?)` derives the count from `checked_ids` — entries dated for the target day whose check timestamp is newer than any matching `unchecked_ids` entry. Self-correcting: uncheck/re-check/cross-device sync all resolve correctly because the underlying `checked_ids`/`unchecked_ids` LWW arrays are already sound. Critical subtlety: `unchecked.get(c.id)` returns the `at` *string*, not an object — guard must compare `c.at > uAt` (not `c.at > u.at` which reads `.at` on a string → `undefined` → always false).

**Verify:**
- Check a task, uncheck it, re-check it → count shows 1 (not 2 or 3)
- Two devices each check different tasks → merge shows the true combined count, not the sum of both counters
- Evening triage summary and weekly grid numbers look correct
- Midnight: count resets to 0 on the new day (checked_ids are cleared by `applyNewDayCleanup`)

**Verified fixed:** ☐

---

## BUG-047: Dropbox connect on fresh install doesn't auto-restore

**Status:** ⏳ v2.18.16 — awaiting verify

**Symptom:** Installing the PWA on a new device, connecting Dropbox via OAuth, and finding the task list empty — even though a backup exists on Dropbox. The existing data was silently overwritten by the fresh install's empty state.

**Root cause:** `_dropboxExchangeCode()` (called after OAuth completes) unconditionally called `dropboxAutoSave()` — writing the device's current (empty) state to Dropbox immediately after receiving the token. The backup was overwritten before the user had a chance to restore.

**Fix (v2.18.16):** `_dropboxExchangeCode()` now detects a fresh install: if `manualTasks`, `habitsList`, `soonTasks`, and `pastTasks` are all empty, it probes Dropbox via `get_metadata` to check whether a backup file exists. If it does → `dropboxRestore(false)` (silent restore). If the probe fails or no file exists → falls back to `dropboxAutoSave()` as before. Reconnect on a device that already has local data also falls back to save.

**Verify:**
- Fresh PWA install (no local tasks). Connect Dropbox via OAuth. Existing tasks should appear automatically — no manual "Restore" tap needed.
- Reconnect Dropbox on a device that already has tasks → existing local data is preserved (upload, not overwrite).

**Verified fixed:** ☐

---

## BUG-049: New Trello cards look aged on arrival

**Status:** ⏳ v2.18.22 — awaiting verify

**Symptom:** A Trello card that just entered the today list renders dimmed (opacity ≈ 0.35–0.75) as if it were days old — even a card due *today* that was just given its due date in Trello.

**Root cause:** Trello card age was computed from the card's **Trello creation timestamp**, decoded from its MongoDB ObjectID via `_getCreatedFromTrelloId(id)`. A card created weeks ago in Trello but only just made relevant (due date added, moved to the right list) was therefore instantly "old" from the app's perspective.

**Fix (v2.18.22):** Age basis changed to a new `today_trello_firstseen` map `{trello_<id>: firstSeenMs}` — recording when each card first entered *your* filtered list. New helpers: `_getTrelloFirstSeen`, `_setTrelloFirstSeen`, `_trelloAgeBasis(id)` (falls back to `Date.now()` = fresh if unseen). Recorded and pruned in `loadTrello()` (departed cards dropped to keep the map bounded). Both age paths updated (Rule 27): `taskHTML()` and the `renderTrello()` 7s patch path. Synced via Dropbox: MIN-merge (earliest sighting across devices wins — a card's true first-seen is the earliest any device saw it), no date guard, NOT cleared in `applyNewDayCleanup` (must persist across days for the card to age). `_getCreatedFromTrelloId` removed (dead). One-time transition: on first load post-update all current cards get `firstSeen = now` → briefly fresh, then age naturally from that day.

**Verify:**
- Take an old Trello card and set its due date to today → it appears at full opacity on next sync, not dimmed
- A card that has been in your list for 4 days (edit `today_trello_firstseen` in DevTools to 4 days ago) → shows mid-age dimming
- Two devices: Device A sees a card first. Device B adopts A's earlier first-seen via MIN-merge — both dim the card identically
- Focus un-dim still works (aged card focused today → full opacity, separate code path untouched)

**Verified fixed:** ☐

---

## BUG-051: Trello nudge dismissal not synced across devices

**Status:** ⏳ v2.18.23 — awaiting verify

**Symptom:** Dismissing the Trello morning nudge on one device leaves it visible on another device — it shows again even though the user already closed it.

**Root cause:** The dismissal flag (`trello_nudge_dismissed_YYYY-MM-DD`) was written to localStorage on click but never included in the Dropbox backup payload or `mergeRemoteData()`. The triage-dismissed state has the same shape and IS synced (BUG-001 fix); the nudge simply wasn't wired up the same way.

**Fix (v2.18.23):** Modelled exactly on `triage_dismissed`. Added `trello_nudge_dismissed` to the backup payload (`'1'` if dismissed today, `''` otherwise). Added a merge block in `mergeRemoteData()` after the triage-dismissed block: if remote value is `'1'` and local hasn't dismissed today, sets the local key and hides `$.trelloNudge` immediately. No full-restore handling needed (same as `triage_dismissed` — the next 7s merge tick applies it on any device that didn't catch the first sync).

**Verify:**
- Device A: dismiss the Trello nudge. Within ~7s, Device B's nudge disappears without any user interaction.
- Tomorrow: both devices show the nudge again (key is date-scoped to `_localISO()`).

**Verified fixed:** ☐

