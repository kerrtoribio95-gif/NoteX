const CACHE_NAME = 'notex-cache-v3';

// Pinned CDN versions so cache matches exact library files
const ASSETS_TO_CACHE = [
'./',
  './index.html',
  './logo.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@0.400.0/dist/umd/lucide.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

// 1. Resilient Install (Does NOT fail completely if one CDN link fails)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          fetch(url, { mode: 'cors' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {
              // Silently ignore single asset failure; SW still installs
            })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Clean up old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. Smart Strategy: Network-First for HTML, Cache-First for static libraries
self.addEventListener('fetch', (event) => {
  // 1. Never cache non-GET requests (Cache API strictly rejects POST, PUT, PATCH, DELETE)
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. Bypass Supabase APIs and realtime websockets
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  const isHTML = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isHTML) {
    // Network first for the page so code updates show up immediately
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(() => caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // Cache-first for all pinned scripts & styles
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((networkRes) => {
        if (networkRes && networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return networkRes;
      });
    })
  );
});
