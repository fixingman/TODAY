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

// Habits roll over at 3am — a late-night check counts toward the day that's ending.
// Keep _habitNow() as the single source for habit-day reads so the strip refreshes
// in lockstep with check eligibility (v2.12.74 lesson).
const HABIT_ROLLOVER_HOURS = 3;
function _habitNow() {
  return new Date(Date.now() - HABIT_ROLLOVER_HOURS * 60 * 60 * 1000);
}
function _habitTodayISO() {
  return _localISO(_habitNow());
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
