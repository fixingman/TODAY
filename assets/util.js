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
