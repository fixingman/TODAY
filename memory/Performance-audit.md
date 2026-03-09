# TODAY — Performance Audit
_March 2026_

---

## File Size

| Section | Size |
|---|---|
| Total file | 137.7 KB |
| JavaScript | 46.6 KB |
| CSS | 15.1 KB |
| HTML | 8.4 KB |
| Base64 blobs (favicon/icons) | 66.2 KB |

**The base64 blobs are 48% of the file.** The actual app code is only ~70 KB. The icons are inlined which avoids extra HTTP requests but adds weight to every page load. Not an issue for a PWA-style app used regularly, but worth knowing.

---

## Network — On Load

| Request | Size | Frequency |
|---|---|---|
| Google Fonts (Syne + DM Mono) | ~40–60 KB | Once, then cached |
| Trello boards + cards | ~5–15 KB | On load + every sync |
| Dropbox metadata check | ~200 bytes | On load (baseline seed) |

**External dependencies: 3.** No CDN scripts, no analytics, no tracking. Clean.

---

## Network — Live Sync (every 30s, visible tab only)

| Condition | Requests | Data |
|---|---|---|
| Nothing changed | 2 tiny checks | ~350 bytes total |
| Trello changed | 2 checks + 2 full fetches | ~5–15 KB |
| Dropbox changed | 1 check + 1 full restore | ~2–5 KB |

Wake debounce: **2s** — rapid tab switching won't fire multiple syncs.  
Background: **zero** — ticker pauses on `visibilitychange`, no drain when screen is off.

---

## JavaScript

| Metric | Value | Notes |
|---|---|---|
| Functions defined | 65 | Reasonable for this scope |
| Active intervals | 1 (sync ticker) | The 2 OAuth poll intervals self-clear after use ✓ |
| Event listeners | 5 | Low |
| fetch() call sites | 10 | All conditional — none fire unconditionally |
| localStorage ops | 52 references | See below |
| console.log | 0 | Clean ✓ |

---

## localStorage — Write Frequency

| Key | Writes in code |
|---|---|
| `today_manual` | 4 |
| `today_done` | 4 |
| `stat_streak` | 2 |
| `stat_last_visit` | 2 |
| `trello_config` | 2 |
| `stat_alltime_done` | 2 |

**No concerns.** localStorage writes are synchronous but tiny and infrequent. `dropboxAutoSave` is debounced (fires 2s after last change) so task toggling doesn't hammer Dropbox.

---

## Rendering

| Issue | Count | Impact |
|---|---|---|
| `innerHTML` writes | 11 | Each triggers a reflow — acceptable for list-size data |
| Canvas `requestAnimationFrame` loops | 2 | Both self-terminate when particle arrays empty ✓ |
| `cancelAnimationFrame` calls | 0 | ⚠ Minor — rAF loops rely on empty-array exit, not explicit cancel |

Both canvas loops (celebration + splash particles) stop themselves when their particle arrays drain to zero. This is correct but slightly fragile — if a particle gets stuck with `life > 0`, the loop runs forever. Low probability, worth noting.

---

## CSS

| Metric | Value |
|---|---|
| Classes defined | 58 |
| Possibly unused | 1 (`task`) |

`.task` may be used dynamically via JS `classList` — likely safe. CSS size is healthy at 15 KB.

---

## Issues — Prioritised

### 🟡 Medium
**Base64 favicon bloat** — 66 KB of base64 icon data loads on every first visit before caching. Could be moved to an external `.png` file to cut initial parse time by ~48%.

**No `cancelAnimationFrame`** — both rAF loops exit via empty-array check rather than explicit cancel. If a particle's `life` never reaches 0 due to a float precision edge case, the loop would never stop. Low risk but worth a guard.

### 🟢 Low / Informational
**`innerHTML` rewrites on render** — `renderManual()` and `renderTrello()` replace the entire list HTML on each sync. For the task counts used here (typically <30 items) this is imperceptible. If the list ever grows large, diffing would help.

**One unused CSS class** (`.task`) — negligible, likely safe.

**Font load** — Google Fonts loads on every cold start. Could be self-hosted or subset for ~20–30 KB saving. Low priority.

---

## Summary

| Area | Status |
|---|---|
| File size | ✅ Lean — 70 KB of real code |
| Network on load | ✅ 3 external deps, fonts cached after first visit |
| Background battery drain | ✅ Zero — ticker pauses when hidden |
| Live sync efficiency | ✅ Cheap checks before full fetches |
| Wake debounce | ✅ 2s guard on tab focus |
| JavaScript memory | ✅ No leaks found, intervals self-clean |
| CSS | ✅ Clean, 1 possibly unused class |
| Render performance | ✅ Fine at current data scale |
| rAF lifecycle | 🟡 No explicit cancel — low risk |
| Base64 icons | 🟡 66 KB inline — consider externalising |
