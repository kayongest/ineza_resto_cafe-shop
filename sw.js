const CACHE_NAME = 'favorite-cafe-cache-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './mobile_app.html',
  './admin.html',
  './css/style.css',
  './css/mobile_app.css',
  './css/admin.css',
  './css/bootstrap.min.css',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Network-Only strategy for all API endpoints to guarantee zero stale cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        return new Response(JSON.stringify({ status: 'error', message: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network-First for JS, CSS, and HTML assets
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200 && event.request.url.startsWith('http')) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
