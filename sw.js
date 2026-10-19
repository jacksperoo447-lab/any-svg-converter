// AnySVG Service Worker for PWA Installation and Offline Capabilities
const CACHE_NAME = 'anysvg-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through network requests with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
