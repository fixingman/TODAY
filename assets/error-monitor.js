// TODAY — Error Monitoring (Roadmap #3, seventh module extraction)
//
// Dev-aid: catches sync/network/runtime errors and surfaces them as a small
// red dot (#errorIndicator) the user can tap to see a plain-language log
// (#errorPanel). Classic <script>, loaded after insights.js and before the
// main inline script — every external caller (_logSyncError, 14 call sites
// across index.html and trello.js) invokes it from inside a function body or
// catch block, none at parse time, so nothing here needs to load before
// anything else; it only needs to be defined before those call sites actually
// fire, which is well after every script has loaded.
//
// Deliberately NOT here: the static CSS for #errorIndicator/#errorPanel
// (stays in index.html's <style>, matching how sound.js/idle.js/celebration.js
// were extracted — only JS moves, static styles don't).

const _errorLog = [];
function _fmtErrTime() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}
function _showErrorDot() {
  const el = document.getElementById('errorIndicator');
  if (el) { el.style.display = 'block'; el.dataset.count = _errorLog.length; }
}
function _logSyncError(source, msg) {
  const entry = _fmtErrTime() + ' [' + source + '] ' + (msg || 'unknown error');

  // During wake sync (first 3s after tab return), suppress entirely —
  // network may not be ready yet, ticker will retry. (BUG-003)
  if (window._isWakeSyncSilent && window._isWakeSyncSilent()) {
    console.warn('[wake-silent] ' + entry);
    return;
  }

  // Network errors (offline, DNS, CORS) are expected during connectivity drops.
  // Log to console but don't show red dot — the ticker will retry when
  // connection returns, and the 'online' event handles full reconnect. (BUG-003)
  const isNetworkError = !msg || msg.includes('Failed to fetch') || msg.includes('NetworkError')
    || msg.includes('Load failed') || msg.includes('CORS') || msg.includes('ERR_INTERNET')
    || msg.includes('Failed to update a ServiceWorker');
  if (isNetworkError) {
    console.warn('[network] ' + entry);
    return;
  }

  _errorLog.push(entry);
  _showErrorDot();
  console.warn(entry);
}
// Catch localStorage quota errors globally — wraps setItem so failures surface
// in the red dot instead of disappearing silently. (v2.17.70)
(function() {
  const _orig = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, val) {
    try { _orig(key, val); }
    catch(e) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
        _logSyncError('Storage', 'Quota exceeded — "' + key + '" not saved. Clear some data.');
      }
    }
  };
})();

window.onerror = function(msg, url, line, col, err) {
  // Network errors and SW update failures are expected when offline — don't show red dot
  const msgStr = String(msg || '');
  if (msgStr.includes('Failed to fetch') || msgStr.includes('NetworkError')
    || msgStr.includes('Load failed') || msgStr.includes('ERR_INTERNET')
    || msgStr.includes('Failed to update a ServiceWorker')) {
    console.warn('[network-onerror]', msgStr);
    return false;
  }
  // Check if error originates from outside the app (browser extensions, injected scripts)
  const isExternal = url && !url.includes(window.location.hostname) && !url.includes('index.html');
  const prefix = isExternal ? '[external] ' : '';
  _errorLog.push(`${_fmtErrTime()} ${prefix}${msg} at ${url}:${line}:${col}`);
  _showErrorDot();
  console.error('[TODAY Error]', prefix + msg, { url, line, col, err });
  return false;
};
window.addEventListener('unhandledrejection', function(e) {
  const msg = e.reason?.message || String(e.reason) || 'Unhandled promise rejection';

  // Network errors are expected during connectivity drops — same filter as _logSyncError.
  // Don't show red dot for transient network failures. (BUG-003)
  const isNetworkError = msg.includes('Failed to fetch') || msg.includes('NetworkError')
    || msg.includes('Load failed') || msg.includes('CORS') || msg.includes('ERR_INTERNET')
    || msg.includes('Failed to update a ServiceWorker');
  if (isNetworkError) {
    console.warn('[network-promise] ' + msg);
    return;
  }

  const entry = `${_fmtErrTime()} Promise: ${msg}`;
  _errorLog.push(entry);
  _showErrorDot();
  console.error('[TODAY Promise Error]', msg, e.reason);
});

// Show/hide error panel — dot is the toggle. Close clears the log.
let _errorPanelOpen = false;

function _toggleErrorPanel() {
  const dot   = document.getElementById('errorIndicator');
  const panel = document.getElementById('errorPanel');
  if (!dot || !panel) return;

  if (_errorPanelOpen) {
    // Close and clear
    _errorPanelOpen = false;
    panel.classList.remove('open');
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    dot.classList.remove('open');
    dot.setAttribute('aria-expanded', 'false');
    dot.setAttribute('aria-label', 'Open error log');
    _errorLog.length = 0;
    dot.style.display = 'none';
    dot.dataset.count = 0;
  } else {
    // Open — render entries
    _errorPanelOpen = true;
    dot.classList.add('open');
    dot.setAttribute('aria-expanded', 'true');
    dot.setAttribute('aria-label', 'Close and clear error log');
    panel.innerHTML = _errorLog.map(entry => {
      // Parse: "HH:MM:SS [source] message" or "HH:MM:SS [external] message"
      const timeMatch   = entry.match(/^(\d{2}:\d{2}:\d{2})\s/);
      const sourceMatch = entry.match(/\[([\w-]+)\]/);
      const time   = timeMatch   ? timeMatch[1]   : '';
      const source = sourceMatch ? sourceMatch[1] : 'app';
      const msg    = entry
        .replace(/^\d{2}:\d{2}:\d{2}\s/, '')
        .replace(/\[[\w-]+\]\s?/, '')
        .trim();
      const badgeClass = ['Dropbox','Trello','Sync'].includes(source)
        ? 'source-' + source.toLowerCase()
        : source === 'external' ? 'source-external' : 'source-app';
      return `
        <div class="error-panel-row">
          <div class="error-panel-meta">
            <span class="error-panel-time">${esc(time)}</span>
            <span class="error-panel-badge ${badgeClass}">${esc(source)}</span>
          </div>
          <div class="error-panel-msg">${esc(msg)}</div>
        </div>`;
    }).join('');
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('open');
  }
}
