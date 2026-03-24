// TODAY — Service Worker
// Strategy: network-first for app shell, strict exclusions for all API calls
// Version bump this string to force cache invalidation on deploy
const CACHE_VERSION  = 'today-v2.12.7';
const CACHE_APP_SHELL = [
  '/',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/today-og.png',
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
// ── Update message — client requests immediate takeover ──────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received, taking over...');
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // Cache offline fallback immediately — always available, even cold start
      cache.put('/__offline', new Response(OFFLINE_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }));
      // Attempt to cache app shell — may fail if offline during SW install, that's fine
      return cache.addAll(CACHE_APP_SHELL).catch(() => { /* offline at install time — ok */ });
    })
  );
  // skipWaiting is triggered by the client via postMessage('SKIP_WAITING')
  // — see auto-update listener in index.html. This prevents jarring mid-session takeovers.
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

// ── Fetch: network-first for app shell, bypass for all APIs ──────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Always bypass non-GET requests (POST to Dropbox/Trello etc.)
  if (event.request.method !== 'GET') return;

  // 2. Bypass all external API origins — never intercept
  if (BYPASS_ORIGINS.some(origin => url.hostname.includes(origin))) return;

  // 3. Bypass chrome-extension and non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // 4. Only handle same-origin navigation requests (the app shell)
  // This deliberately excludes cross-origin font/image requests
  if (url.origin !== self.location.origin) return;

  // Network-first: try network, on failure serve cache, on cache miss serve offline fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Successful network response — update cache for next offline visit
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(async () => {
        // Network failed — try cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Nothing in cache — serve branded offline screen for navigation requests
        // (non-navigation requests like fonts just fail silently)
        if (event.request.mode === 'navigate') {
          return caches.match('/__offline');
        }
      })
  );
});
