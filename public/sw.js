// Minimal service worker (Phase 13.5) — offline resilience for the app shell
// and the 3MB agrun.js bundle, so a repeat visit does not re-download it.
//
// Strategy:
//  - navigations (HTML): network-first, so a fresh deploy is picked up
//    immediately and only falls back to cache when offline.
//  - other same-origin GETs (hashed Vite assets, agrun.js, favicon):
//    cache-first — Vite assets are content-hashed so this is always safe;
//    agrun.js is unhashed, so bump CACHE below when it changes.
const CACHE = 'got-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
