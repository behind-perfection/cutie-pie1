const CACHE = 'adhkar-walk-v4';
const SHELL = ['./', 'index.html', 'style.css', 'steps.js', 'data.js', 'app.js', 'library-store.js', 'library-reader.js', 'vendor/jszip.min.js', 'vendor/epub.min.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'icons/icon-64.png', 'icons/icon-192-maskable.png', 'icons/icon-512-maskable.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.protocol === 'blob:') return; // blob: URLs (PDF viewers, EPUB content) are never cached
  if (url.hostname === 'api.aladhan.com') return; // prayer times: always network
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net; // cached first (works offline), refreshed in the background
    })
  );
});
