// TODAY — browser platform integration (Roadmap #3 module extraction)
//
// Inert until the main script calls window._startPlatform().
(function() {
  let _platformStarted = false;

  window._startPlatform = function() {
    if (_platformStarted) return;
    _platformStarted = true;

// Native controls use theme-color. Blend into Explore instead of adding a strip.
const overlayMode = matchMedia('(display-mode: window-controls-overlay)');
const windowTheme = document.querySelector('meta[name="theme-color"]');
const originalTheme = windowTheme?.content;
function updateWindowTheme() {
  if (!windowTheme) return;
  const exploring = document.body.classList.contains('ex-open') || document.body.classList.contains('ex-closing');
  const colour = overlayMode.matches && exploring
    ? getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() : originalTheme;
  if (windowTheme.content !== colour) windowTheme.content = colour;
}
new MutationObserver(updateWindowTheme).observe(document.body, {attributes:true, attributeFilter:['class']});
overlayMode.addEventListener('change', updateWindowTheme);
updateWindowTheme();

// ─── Service Worker registration + auto-update ────────────────────────────────
// Only register SW on actual deployment domains, skip preview iframes and local dev
const SW_ALLOWED_HOSTS = ['today-here.netlify.app', 'dev--today-here.netlify.app', 'localhost', '127.0.0.1'];
const canRegisterSW = SW_ALLOWED_HOSTS.some(h => location.hostname === h || location.hostname.endsWith('.' + h));
if ('serviceWorker' in navigator && canRegisterSW) {
  Today.ready('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        // Poll for updates every 30 minutes while app is open
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

        // Also check for updates when app regains focus
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });

        // Activate waiting updates.
        function _activateWaiting(sw) {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            // New version ready, old one is controlling — safe to take over
            console.log('[SW] New version ready, activating...');
            sw.postMessage('SKIP_WAITING');
          }
        }

        function _onNewSW(sw) {
          console.log('[SW] New service worker detected, state:', sw.state);
          _activateWaiting(sw);
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

        // Reload updates, never first installation.
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

// Mobile keyboard: preserve scroll while the fixed input follows visualViewport.
(function() {
  const bar = document.getElementById('addTaskBar');
  const input = document.getElementById('newTask');
  if (!bar || !input) return;

  // Only on touch devices
  if (!window.matchMedia('(pointer: coarse)').matches) return;

  // Check for visualViewport support
  const vv = window.visualViewport;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let rafId = null;
  let tapAnchor = null;
  let scrollAnchor = null;
  let anchorTimer = null;

  function clearScrollAnchor() {
    if (anchorTimer) clearTimeout(anchorTimer);
    anchorTimer = null;
    scrollAnchor = null;
  }

  function preserveListDuringKeyboardOpen() {
    if (!isIOS || !scrollAnchor || scrollAnchor.userScrolled || !vv) return;
    // Rotation invalidates the saved scroll anchor.
    if (window.innerWidth !== scrollAnchor.viewportWidth) {
      clearScrollAnchor();
      return;
    }
    // Correct only actual keyboard opening.
    if (scrollAnchor.viewportHeight - vv.height < 100) return;
    if (Math.abs(window.scrollY - scrollAnchor.y) > 2) {
      window.scrollTo(window.scrollX, scrollAnchor.y);
    }
  }

  function positionBar() {
    if (!bar.classList.contains('keyboard-open')) return;
    if (!vv) return;

    // Cancel any pending frame to prevent stacking
    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      // Calculate where bottom of visual viewport is
      const keyboardTop = vv.offsetTop + vv.height;

      const targetTop = keyboardTop - bar.offsetHeight;
      bar.style.transform = `translateY(${targetTop}px)`;
      bar.style.position = 'fixed';
      bar.style.top = '0';
      bar.style.bottom = 'auto';
      // Undo WebKit keyboard scroll after positioning the fixed bar.
      preserveListDuringKeyboardOpen();
    });
  }

  function resetBar() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    bar.style.transform = '';
    bar.style.position = '';
    bar.style.top = '';
    bar.style.bottom = '';
  }

  // Anchor before native focus scrolling; programmatic focus uses current Y.
  input.addEventListener('pointerdown', () => {
    tapAnchor = { y: window.scrollY, viewportHeight: vv?.height, at: performance.now() };
  }, { passive: true });

  input.addEventListener('focus', () => {
    const tapped = tapAnchor && performance.now() - tapAnchor.at < 500;
    scrollAnchor = {
      y: tapped ? tapAnchor.y : window.scrollY,
      viewportHeight: tapped ? tapAnchor.viewportHeight : vv?.height,
      viewportWidth: window.innerWidth,
      userScrolled: false,
    };
    tapAnchor = null;
    // Bound correction to keyboard opening; preserve later scrolls.
    if (anchorTimer) clearTimeout(anchorTimer);
    anchorTimer = setTimeout(clearScrollAnchor, 1200);
    bar.classList.add('keyboard-open');
    // Position above the keyboard without scrolling the input into view.
    setTimeout(positionBar, 100);
  });

  input.addEventListener('blur', () => {
    clearScrollAnchor();
    bar.classList.remove('keyboard-open');
    resetBar();
  });

  // A deliberate gesture takes precedence over the temporary focus anchor.
  const markUserScroll = event => {
    if (scrollAnchor && !bar.contains(event.target)) scrollAnchor.userScrolled = true;
  };
  document.addEventListener('touchstart', markUserScroll, { capture: true, passive: true });
  document.addEventListener('wheel', markUserScroll, { capture: true, passive: true });
  window.addEventListener('scroll', () => {
    if (scrollAnchor) positionBar();
  }, { passive: true });

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
        <button class="btn-sm primary" data-today-click="platform.install">Install</button>
      </div>
    </div>`;
    section.style.display = 'block';
  }

  console.log('[PWA] Install prompt captured — ready to install');
});

function refreshInstall(){
  const btn=document.getElementById('installBtn');
  if(btn)btn.style.display=_deferredInstallPrompt&&!matchMedia('(display-mode: standalone)').matches&&!matchMedia('(display-mode: window-controls-overlay)').matches&&!navigator.standalone?'inline-flex':'none';
}

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
if (window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches || window.navigator.standalone) {
  console.log('[PWA] Running in standalone mode — already installed');
  Today.ready('DOMContentLoaded', () => {
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
  if (!btn._pulse) btn._pulse = _loopPulse(btn, [{ opacity: 0.45 }, { opacity: 1 }, { opacity: 0.45 }], 2500);
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
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
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
        <button class="btn-sm primary" data-today-click="platform.steps" data-platform="ios">How to add ↓</button>
      </div>
    </div>`;
  } else if (_isMacSafari) {
    _row = `<div class="connection-row">
      <div class="connection-row-info">
        <span class="connection-row-title">Install app</span>
        <span class="connection-row-status">Install TODAY as a desktop app</span>
      </div>
      <div class="connection-row-actions">
        <button class="btn-sm primary" data-today-click="platform.steps" data-platform="mac">How to add ↓</button>
      </div>
    </div>`;
  } else if (_isIOSNonSafari) {
    _row = `<div class="connection-row">
      <div class="connection-row-info">
        <span class="connection-row-title">Install app</span>
        <span class="connection-row-status">Open in Safari to add to your home screen</span>
      </div>
      <div class="connection-row-actions">
        <button class="btn-sm" data-today-click="platform.copy-link">Copy link</button>
      </div>
    </div>`;
  } else if (_isFirefox) {
    _row = `<div class="connection-row">
      <div class="connection-row-info">
        <span class="connection-row-title">Install app</span>
        <span class="connection-row-status">Open in Chrome or Edge to install</span>
      </div>
      <div class="connection-row-actions">
        <button class="btn-sm" data-today-click="platform.copy-link">Copy link</button>
      </div>
    </div>`;
  }

  if (!_row) return;
  const section = document.getElementById('pwaInstallSection');
  if (!section) return;
  section.innerHTML = _row;
  section.style.display = 'block';
})();

// bfcache can restore stale focus CSS after JS state resets; run wake recovery.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    // bfcache restore — run full wake sequence
    if (window._onWake) window._onWake();
  }
});

    if (window.Today) {
      Today.define('platform', {
        install: installPWA,
        refreshInstall,
        showSteps: _pwaShowSteps,
        copyLink: _pwaCopyLink,
      });
      Today.ui.register('click', 'platform.install', installPWA);
      Today.ui.register('click', 'platform.steps', (_event, button) => _pwaShowSteps(button, button.dataset.platform));
      Today.ui.register('click', 'platform.copy-link', (_event, button) => _pwaCopyLink(button));
    }

  };
})();
