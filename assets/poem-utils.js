// poem-utils.js — shared poem selection and rendering
// Loaded by index.html and poem.html. POEMS must be defined before _poemForDate is called.

const _SOUTHERN_TZ = [
  'Australia/', 'Pacific/Auckland', 'Pacific/Fiji',
  'Pacific/Port_Moresby', 'America/Sao_Paulo', 'America/Argentina',
  'America/Santiago', 'America/Montevideo', 'America/Asuncion', 'America/Lima',
  'America/La_Paz', 'Africa/Johannesburg', 'Africa/Windhoek', 'Africa/Maputo',
  'Africa/Lusaka', 'Africa/Harare', 'Indian/Antananarivo',
];

// Returns the poem for a given YYYY-MM-DD string, or today if omitted.
// Applies southern-hemisphere season flip via viewer timezone.
function _poemForDate(dateStr) {
  if (typeof POEMS === 'undefined' || !POEMS.length) return null;
  const date = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  let m = date.getMonth();
  if (_SOUTHERN_TZ.some(p => tz.startsWith(p))) m = (m + 6) % 12;
  const season = m >= 2 && m <= 4 ? 'spring'
               : m >= 5 && m <= 7 ? 'summer'
               : m >= 8 && m <= 10 ? 'autumn' : 'winter';
  const pool = POEMS.filter(p => !p.season || p.season === season);
  if (!pool.length) return null;
  const appDay = date.toDateString();
  const days   = Math.floor(new Date(appDay).getTime() / 86400000);
  return pool[days % pool.length];
}

// HTML-safe escape for poem output.
function _escPoem(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Converts raw poem text to HTML: \n → <br>, with a widow guard
// (non-breaking space before the last word of each line) to prevent orphans.
function _poemHTML(text) {
  return text.split('\n').map(line => {
    const e = _escPoem(line);
    const i = e.lastIndexOf(' ');
    return i > 0 ? e.slice(0, i) + ' ' + e.slice(i + 1) : e;
  }).join('<br>');
}
