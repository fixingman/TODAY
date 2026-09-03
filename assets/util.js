// TODAY — pure leaf utilities (Roadmap #3, first module extraction)
//
// Zero DOM, zero app state, no forward references — these are the leaves the rest
// of the app depends on but that depend on nothing. Loaded as a classic <script>
// BEFORE the main inline script (and before assets/poems.js), so its function/const
// globals are visible everywhere via the shared global lexical environment — the
// exact pattern `const POEMS` already uses. safeJSON in particular must exist before
// the main script's state-init runs.
//
// What stays in index.html (not leaves): _breathe/_KF_BLINK (motion → future motion.js),
// _cacheElements/$ (DOM-coupled, mutable app state).

// Safe JSON parsing with fallback — avoids try/catch boilerplate everywhere
function safeJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch(e) { return fallback; }
}

// App day boundary — tasks / triage / streak / focus roll over at midnight.
// Habits roll over at 3am instead (see _habitTodayISO / _habitNow) — a deliberate,
// consistent grace window, not the v2.12.74 lag bug (that was an *unintended*
// mismatch where the strip refreshed on a different boundary than checking).
function _getAppDay() {
  return new Date().toDateString();
}

// Unified local date helper — returns YYYY-MM-DD in local timezone.
// NEVER use toISOString().slice(0,10) for date logic — that returns UTC,
// which diverges from local time near midnight (BUG-010). All date strings
// stored in habits, AI memory, and moments must use this function.
function _localISO(d) {
  if (!d) d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Daily task-add counts feed completion-rate memory. Historical cumulative values
// can be marked as per-day deltas and restored by sync, so treat anything outside
// the observed plausible range as missing data rather than letting one corrupt day
// dominate the rate. Shared by sync normalization and Memory's two read paths.
const MAX_DAILY_TASKS_ADDED = 30;
function _sanitizeDailyTasksAdded(value) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 && count <= MAX_DAILY_TASKS_ADDED
    ? count
    : 0;
}

// Habits roll over at 3am — a late-night check counts toward the day that's ending.
// Keep _habitNow() as the single source for habit-day reads so the strip refreshes
// in lockstep with check eligibility (v2.12.74 lesson).
// Keyword count helper — sums per-day counts if the new schema is present,
// falls back to the legacy flat `completed` field for older entries.
function _kwCount(kw) {
  if (kw && kw.days) return Object.values(kw.days).reduce((s, v) => s + v, 0);
  return (kw && kw.completed) || 0;
}

// Let-go / revive reason count helper — same per-day pattern.
// Legacy values are plain numbers; new values are { days: { "YYYY-MM-DD": N } }.
function _lrCount(v) {
  if (v && typeof v === 'object' && v.days) return Object.values(v.days).reduce((s, c) => s + c, 0);
  return typeof v === 'number' ? v : 0;
}

const HABIT_ROLLOVER_HOURS = 3;
function _habitNow() {
  return new Date(Date.now() - HABIT_ROLLOVER_HOURS * 60 * 60 * 1000);
}
function _habitTodayISO() {
  return _localISO(_habitNow());
}

// Remove all localStorage keys with a given prefix except one — used by the
// per-day nudge dismiss/AI-cache keys (`<prefix>YYYY-MM-DD`) to drop stale days
// when writing today's (BUG-040). Backward iteration: removeItem shifts indices.
function _pruneLS(prefix, exceptKey) {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix) && k !== exceptKey) localStorage.removeItem(k);
  }
}

// Minutes → compact "Hh Mm" / "Hh" / "Mm"
function _formatFocusTime(mins) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

// HTML-escape untrusted text before innerHTML
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Color constants for canvas / JS where CSS vars don't apply (kept in sync with :root)
const COLOR_ACCENT = '#c8f060';
const COLOR_BG     = '#0e0e10';
const COLOR_MUTED  = '#6b6b78';
const COLOR_BORDER = '#2a2a30';

// Looping animations must be WAAPI, never CSS: _forceRepaint's display toggles
// restart CSS animations from keyframe 0 (visible flash), a WAAPI timeline is
// unaffected (BUG-028 lesson; same pattern as _pulseComplete in the focus module).
// No cancel handle — every caller's element is removed/innerHTML-replaced when
// its state ends, which discards the animation with it. (_pulseComplete itself stays
// in the focus IIFE — it's a closure there, not a leaf.)
function _breathe(el, keyframes, duration, delay) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(keyframes, { duration, delay: delay || 0, easing: 'ease-in-out', iterations: Infinity });
}
const _KF_BLINK = [{ opacity: 0.2 }, { opacity: 1, offset: 0.4 }, { opacity: 0.2, offset: 0.8 }, { opacity: 0.2 }];
// Small-element breathe (Motion.md: elements ≤ ~10px pair opacity with scale — opacity
// alone doesn't read at that size). Shared by the nudge dots and the AI badge @2400ms;
// the done-star intentionally uses its own gentler values (0.6 / scale 0.92).
const _KF_BREATHE_SMALL = [
  { opacity: 1, transform: 'scale(1)' },
  { opacity: 0.5, transform: 'scale(0.85)' },
  { opacity: 1, transform: 'scale(1)' },
];

// ── mailto draft link (BUG-089) ─────────────────────────────────────────────
// Pure: builds the href for "Open in Mail". Lives here rather than in gmail.js so
// it can be unit-tested in Node — the grapheme-safe truncation crashed on emoji
// once (URIError on a split surrogate) and nothing caught it.
//
// - '@' stays literal in the address. encodeURIComponent gives
//   notifications%40kry.se, which most clients decode but not all, and it is not
//   the correct form for the mailto path.
// - Handlers commonly truncate mailto around 2 KB, silently and mid-sentence, so
//   the body is capped. Trim the RAW draft and re-encode; never slice the encoded
//   string, which can cut a %XX escape in half.
// - Trim by grapheme, not by UTF-16 index: slicing units can split a surrogate
//   pair and encodeURIComponent throws on a lone surrogate. Same class as
//   BUG-087; same Intl.Segmenter idiom as task-bounce.js.
// - A lone surrogate already present in the input would throw the same way, so
//   those are dropped first — by a plain scan, not a lookbehind regex, which is a
//   parse-time error on older Safari and would take this whole file down with it.
function _mailtoDraftHref(to, subject, draft, maxLen) {
  const cap = (typeof maxLen === 'number' && maxLen > 0) ? maxLen : 1900;
  const src = String(draft == null ? '' : draft);
  let clean = '';
  for (let i = 0; i < src.length; i++) {
    const c = src.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) {
      const d = i + 1 < src.length ? src.charCodeAt(i + 1) : 0;
      if (d >= 0xDC00 && d <= 0xDFFF) { clean += src[i] + src[i + 1]; i++; }
    } else if (!(c >= 0xDC00 && c <= 0xDFFF)) {
      clean += src[i];
    }
  }
  const addr = encodeURIComponent(String(to == null ? '' : to)).replace(/%40/g, '@');
  const head = 'mailto:' + addr
    + '?subject=' + encodeURIComponent(String(subject == null ? '' : subject))
    + '&body=';
  const units = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(clean), u => u.segment)
    : Array.from(clean);
  let kept = units;
  while (kept.length > 20 && head.length + encodeURIComponent(kept.join('')).length > cap) {
    kept = kept.slice(0, -20);
  }
  return head + encodeURIComponent(kept.join(''));
}

// ── Status bar helper — used by gmail.js, dropbox.js, connections.js, and others.
// Guarded: the only top-level DOM write in this file, and the one thing that kept
// it from loading in Node for unit tests.
if (typeof window !== 'undefined') {
  window.showStatus = function(msg, type) {
    const el = document.getElementById('statusMsg');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'status-msg ' + type;
  };
}

// Node only (unit tests). A classic <script> never sees `module`.
if (typeof module === 'object' && module.exports) module.exports = { _mailtoDraftHref };
