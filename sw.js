// TODAY — Service Worker
// Strategy: installed-version cache first for the public app shell; API calls bypass
// Version bump this string to force cache invalidation on deploy.
// This is the ONE version value still hand-synced — a SW can't import APP_VERSION from
// index.html (separate context, no build step). scripts/smoke-test.mjs asserts it matches
// `today-v${APP_VERSION}` and fails the pre-commit gate on drift.
const CACHE_VERSION  = 'today-v3.8.11';
const CACHE_APP_SHELL = [
  '/',
  '/poem.html',
  '/manifest.json',
  '/assets/runtime.js',
  '/assets/util.js',
  '/assets/accessibility.js',
  '/assets/poems.js',
  '/assets/poem-utils.js',
  '/assets/idle.js',
  '/assets/sound.js',
  '/assets/celebration.js',
  '/assets/connections.js',
  '/assets/sync-merge.js',
  '/assets/dropbox.js',
  '/assets/gmail.js',
  '/assets/gmail-feedback.js',
  '/assets/calendar.js',
  '/assets/calendar-nudge.js',
  '/assets/calendar-nudge-policy.js',
  '/assets/vendor/minisearch-7.2.0.js',
  '/assets/task-enrich.js',
  '/assets/enrichment-feedback.js',
  '/assets/reflections.js',
  '/assets/feedback-policy.js',
  '/assets/pool-wording.js',
  '/assets/reflection-wording.js',
  '/assets/trello.js',
  '/assets/suggestion-policy.js',
  '/assets/noticed-model.js',
  '/assets/insights.js',
  '/assets/error-monitor.js',
  '/assets/splash.js',
  '/assets/platform.js',
  '/assets/habits.js',
  '/assets/drag.js',
  '/assets/zones.js',
  '/assets/triage.js',
  '/assets/sidebar.js',
  '/assets/sidebar.css',
  '/assets/memory-panel.js',
  '/assets/memory-view.js',
  '/assets/memory-view.css',
  '/assets/exploration-context.js',
  '/assets/exploration.js',
  '/assets/exploration-entry.js',
  '/assets/exploration-files.js',
  '/assets/exploration-core.js',
  '/assets/exploration.css',
  '/assets/week-reflection-policy.js',
  '/assets/about.js',
  '/assets/task-bounce.js',
  '/assets/dreambank.js',
  '/assets/meeting.js',
  '/assets/voice-capture.js',
  '/assets/task-actions.js',
  '/assets/assistant.js',
  '/assets/nudge.js',
  '/assets/day-lifecycle.js',
  '/assets/focus-session.js',
  '/assets/focus.js',
  '/assets/focus-ask.js',
  '/assets/focus-wording.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/today-og.png',
  // iOS PWA launch screens (BUG-041) — precached so they survive offline re-install
  '/assets/splash/splash-750x1334.png',
  '/assets/splash/splash-1242x2208.png',
  '/assets/splash/splash-1125x2436.png',
  '/assets/splash/splash-828x1792.png',
  '/assets/splash/splash-1242x2688.png',
  '/assets/splash/splash-1170x2532.png',
  '/assets/splash/splash-1284x2778.png',
  '/assets/splash/splash-1179x2556.png',
  '/assets/splash/splash-1290x2796.png',
  '/assets/splash/splash-1206x2622.png',
  '/assets/splash/splash-1320x2868.png',
  '/fonts/DM%20Mono/dm-mono-v16-latin-300.woff2',
  '/fonts/DM%20Mono/dm-mono-v16-latin-regular.woff2',
  '/fonts/DM%20Mono/dm-mono-v16-latin-500.woff2',
  '/fonts/syne/syne-v24-latin_latin-ext-regular.woff2',
  '/fonts/syne/syne-v24-latin_latin-ext-700.woff2',
  '/fonts/syne/syne-v24-latin_latin-ext-800.woff2',
];

// External origins we must NEVER intercept — let them go straight to network
const BYPASS_ORIGINS = [
  'api.trello.com',
  'content.dropboxapi.com',
  'api.dropboxapi.com',
  'api2.dropbox.com',
  'www.dropbox.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.apple-cloudkit.com',
  'www.googleapis.com',
  'gmail.googleapis.com',
  'oauth2.googleapis.com',
  'accounts.google.com',
];

// ── Offline fallback — baked in so cold starts get a branded screen ──────────
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0e0e10">
  <title>TODAY</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%; background: #0e0e10;
      display: flex; align-items: center; justify-content: center;
    }
    .star {
      font-size: 18px;
      color: #c8f060;
      opacity: 0.18;
      animation: pulse 2.8s ease-in-out infinite;
      user-select: none;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.12; }
      50%       { opacity: 0.35; }
    }
  </style>
</head>
<body>
  <span class="star">✦</span>
</body>
</html>`;

// ── Install: pre-cache app shell + offline fallback ───────────────────────────
// Updates activate after the last controlled window closes. Ignore legacy
// SKIP_WAITING messages so an older open client cannot force a takeover.
self.addEventListener('install', event => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async cache => {
      // Cache offline fallback immediately — always available, even cold start
      await cache.put('/__offline', new Response(OFFLINE_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }));
      // A partial update must not replace the complete offline worker.
      try { await cache.addAll(CACHE_APP_SHELL); }
      catch (error) { await caches.delete(CACHE_VERSION); throw error; }
    })
  );
  // Keep the browser's waiting phase; background downloads do not restart clients.
});

// ── Activate: purge old cache versions ───────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys => {
      const oldKeys = keys.filter(key => key !== CACHE_VERSION);
      if (oldKeys.length > 0) {
        console.log('[SW] Purging old caches:', oldKeys);
      }
      return Promise.all(oldKeys.map(key => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// The complete installed shell is one version, including fresh tabs and refreshes.
// Worker update checks still go to the network; installation/activation owns replacement.
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || !url.protocol.startsWith('http') ||
      url.origin !== self.location.origin ||
      BYPASS_ORIGINS.some(origin => url.hostname === origin || url.hostname.endsWith('.' + origin))) return;

  const key = url.pathname === '/index.html' ? '/' : url.pathname;
  const shell = CACHE_APP_SHELL.includes(key);
  // Private/API responses and unknown static resources are never cached.
  if (!shell && request.mode !== 'navigate') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    if (shell) {
      const cached = await cache.match(key);
      if (cached) return cached;
    }
    try { return await fetch(request); }
    catch (error) {
      if (request.mode === 'navigate') return await cache.match('/__offline') || Response.error();
      throw error;
    }
  })());
});
