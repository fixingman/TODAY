// TODAY — browser platform integration (Roadmap #3 module extraction)
//
// Loaded before the main script, but intentionally inert until index.html calls
// window._startPlatform() at the original end-of-script platform boundary.
(function() {
  let _platformStarted = false;

  window._startPlatform = function() {
    if (_platformStarted) return;
    _platformStarted = true;

// ─── Service Worker registration + auto-update ────────────────────────────────
// Only register SW on actual deployment domains, skip preview iframes and local dev
const SW_ALLOWED_HOSTS = ['today-here.netlify.app', 'dev--today-here.netlify.app', 'localhost', '127.0.0.1'];
const canRegisterSW = SW_ALLOWED_HOSTS.some(h => location.hostname === h || location.hostname.endsWith('.' + h));
if ('serviceWorker' in navigator && canRegisterSW) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        // Poll for updates every 30 minutes while app is open
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

        // Also check for updates when app regains focus
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });

        // When a new SW is waiting (downloaded in background), activate it
        function _activateWaiting(sw) {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // New version ready, old one is controlling — safe to take over
            console.log('[SW] New version ready, activating...');
            sw.postMessage('SKIP_WAITING');
          }
        }

        function _onNewSW(sw) {
          console.log('[SW] New service worker detected, state:', sw.state);
          // Check immediately in case it's already installed
          _activateWaiting(sw);
          // Also listen for state changes
          sw.addEventListener('statechange', () => {
            console.log('[SW] State changed to:', sw.state);
            _activateWaiting(sw);
          });
        }

        if (reg.waiting) {
          console.log('[SW] Update already waiting');
          _onNewSW(reg.waiting);
        }
        reg.addEventListener('updatefound', () => {
          console.log('[SW] Update found, installing...');
          if (reg.installing) _onNewSW(reg.installing);
        });

        // Reload when new SW takes control — but only if we HAD a previous controller
        // (first install doesn't need reload, page is already fresh)
        const hadController = !!navigator.serviceWorker.controller;
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[SW] Controller changed, reloading...');
          if (!hadController || refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        console.log('[SW] Registered, version:', APP_VERSION);
      })
      .catch(err => { console.log('[SW] Registration failed:', err); });
  });
}

// ══════════════════════════════════════════════════════════════════════════
// Mobile Keyboard Handling
// Use visualViewport API to position input bar above keyboard
// ══════════════════════════════════════════════════════════════════════════
(function() {
  const bar = document.getElementById('addTaskBar');
  const input = document.getElementById('newTask');
  if (!bar || !input) return;

  // Only on touch devices
  if (!window.matchMedia('(pointer: coarse)').matches) return;

  // Check for visualViewport support
  const vv = window.visualViewport;
  let rafId = null;

  function positionBar() {
    if (!bar.classList.contains('keyboard-open')) return;
    if (!vv) return;

    // Cancel any pending frame to prevent stacking
    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      // Calculate where bottom of visual viewport is
      const keyboardTop = vv.offsetTop + vv.height;

      // Use transform for GPU-accelerated smooth positioning
      const targetTop = keyboardTop - bar.offsetHeight;
      bar.style.transform = `translateY(${targetTop}px)`;
      bar.style.position = 'fixed';
      bar.style.top = '0';
      bar.style.bottom = 'auto';
    });
  }

  function resetBar() {
    if (rafId) cancelAnimationFrame(rafId);
    bar.style.transform = '';
    bar.style.position = '';
    bar.style.top = '';
    bar.style.bottom = '';
  }

  input.addEventListener('focus', () => {
    bar.classList.add('keyboard-open');
    // Small delay for keyboard to start opening
    setTimeout(() => {
      positionBar();
      // Scroll input into view
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 100);
  });

  input.addEventListener('blur', () => {
    bar.classList.remove('keyboard-open');
    resetBar();
  });

  // Reposition on viewport resize (keyboard animation)
  if (vv) {
    vv.addEventListener('resize', positionBar);
    vv.addEventListener('scroll', positionBar);
  }
})();

// ═══════════════════════════════════════════════════════════════════════════
// PWA Install Prompt (Android only)
// ═══════════════════════════════════════════════════════════════════════════
let _deferredInstallPrompt = null;

// Capture the beforeinstallprompt event (fires on Android Chrome when installable)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;

  // Show install button in About panel
  const btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'inline-flex';

  // Show install row in Connections panel
  const section = document.getElementById('pwaInstallSection');
  if (section) {
    section.innerHTML = `<div class="connection-row">
      <div class="connection-row-info">
        <span class="connection-row-title">Install app</span>
        <span class="connection-row-status">Add TODAY to your home screen</span>
      </div>
      <div class="connection-row-actions">
        <button class="btn-sm primary" onclick="installPWA()">Install</button>
      </div>
    </div>`;
    section.style.display = 'block';
  }

  console.log('[PWA] Install prompt captured — ready to install');
});

// Handle install button click
function installPWA() {
  if (!_deferredInstallPrompt) {
    console.log('[PWA] No install prompt available');
    return;
  }

  // Trigger native install dialog
  _deferredInstallPrompt.prompt();

  // Wait for user choice
  _deferredInstallPrompt.userChoice.then((result) => {
    console.log('[PWA] User choice:', result.outcome);
    if (result.outcome === 'accepted') {
      const btn = document.getElementById('installBtn');
      if (btn) btn.style.display = 'none';
      const section = document.getElementById('pwaInstallSection');
      if (section) section.style.display = 'none';
    }
    _deferredInstallPrompt = null;
  });
}

// Hide install UI if already running as installed PWA
window.addEventListener('appinstalled', () => {
  console.log('[PWA] App installed successfully');
  _deferredInstallPrompt = null;
  const btn = document.getElementById('installBtn');
  if (btn) btn.style.display = 'none';
  const section = document.getElementById('pwaInstallSection');
  if (section) section.style.display = 'none';
});

// Also hide install button if already in standalone mode (already installed)
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
  console.log('[PWA] Running in standalone mode — already installed');
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('installBtn');
    if (btn) btn.style.display = 'none';
  });
}

// ── PWA install promotion for non-Chrome browsers ────────────────────────────
const _PWA_STEPS = {
  mac: 'File → Add to Dock',
  ios: 'Share ↑ → Add to Home Screen',
};
function _pwaShowSteps(btn, key) {
  btn.textContent = _PWA_STEPS[key] || '';
  btn.classList.add('_pwa-revealed');
  btn.disabled = true;
}
function _pwaCopyLink(btn) {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}
(function () {
  const _isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone;
  if (_isStandalone) return;
  const ua = navigator.userAgent;
  const _isIOS = /iPad|iPhone|iPod/.test(ua) ||
                 (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Exclude CriOS (Chrome iOS) and FxiOS (Firefox iOS) — they embed Safari UA but aren't Safari
  const _isIOSSafari = _isIOS && !ua.includes('CriOS') && !ua.includes('FxiOS') &&
                       /^((?!chrome|android).)*safari/i.test(ua);
  const _isMacSafari = !_isIOS && /Mac/.test(navigator.platform) &&
                       /^((?!chrome|android).)*safari/i.test(ua);
  const _isIOSNonSafari = _isIOS && !_isIOSSafari; // Chrome/Firefox/Edge on iOS
  const _isFirefox = !_isIOS && (ua.includes('Firefox'));

  let _row = '';
  if (_isIOSSafari) {
    _row = `<div class="connection-row">
      <div class="connection-row-info">
        <span class="connection-row-title">Install app</span>
        <span class="connection-row-status">Add TODAY to your home screen</span>
      </div>
      <div class="connection-row-actions">
        <button class="btn-sm primary" onclick="_pwaShowSteps(this,'ios')">How to add ↓</button>
      </div>
    </div>`;
  } else if (_isMacSafari) {
    _row = `<div class="connection-row">
      <div class="connection-row-info">
        <span class="connection-row-title">Install app</span>
        <span class="connection-row-status">Install TODAY as a desktop app</span>
      </div>
      <div class="connection-row-actions">
        <button class="btn-sm primary" onclick="_pwaShowSteps(this,'mac')">How to add ↓</button>
      </div>
    </div>`;
  } else if (_isIOSNonSafari) {
    _row = `<div class="connection-row">
      <div class="connection-row-info">
        <span class="connection-row-title">Install app</span>
        <span class="connection-row-status">Open in Safari to add to your home screen</span>
      </div>
      <div class="connection-row-actions">
        <button class="btn-sm" onclick="_pwaCopyLink(this)">Copy link</button>
      </div>
    </div>`;
  } else if (_isFirefox) {
    _row = `<div class="connection-row">
      <div class="connection-row-info">
        <span class="connection-row-title">Install app</span>
        <span class="connection-row-status">Open in Chrome or Edge to install</span>
      </div>
      <div class="connection-row-actions">
        <button class="btn-sm" onclick="_pwaCopyLink(this)">Copy link</button>
      </div>
    </div>`;
  }

  if (!_row) return;
  const section = document.getElementById('pwaInstallSection');
  if (!section) return;
  section.innerHTML = _row;
  section.style.display = 'block';
})();

// Handle bfcache restoration — browser may restore page with stale .focusing class
// but JS state is reset, leaving app visually stuck in focus mode
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // bfcache restore — run full wake sequence
    if (window._onWake) window._onWake();
  }
});

    // Preserve the global functions referenced by static and generated onclick handlers.
    window.installPWA = installPWA;
    window._pwaShowSteps = _pwaShowSteps;
    window._pwaCopyLink = _pwaCopyLink;
  };
})();
