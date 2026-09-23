// Bump this version when offline assets or holiday policies change.
const CACHE_VERSION = 'v4-20260922';
const CACHE_NAME = `stretchbreak-${CACHE_VERSION}`;
const HOLIDAY_API_CACHE = `stretchbreak-holidays-${CACHE_VERSION}`;
const PRECACHE_ASSETS = ['/', '/index.html', '/favicon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => name.startsWith('stretchbreak-') && name !== CACHE_NAME && name !== HOLIDAY_API_CACHE)
    .map(name => caches.delete(name)))).then(() => self.clients.claim()));
});

const annotateHoliday = (response, offline = false) => {
  const headers = new Headers(response.headers);
  // Fetch has already decoded the response body.
  headers.delete('content-length');
  headers.delete('content-encoding');
  if (offline) headers.set('x-stretchbreak-offline', 'true');
  else {
    headers.set('x-stretchbreak-fetched-at', new Date().toISOString());
    headers.delete('x-stretchbreak-offline');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/.netlify/functions')) return;

  if (url.origin === 'https://date.nager.at' && url.pathname.startsWith('/api/v3/')) {
    event.respondWith((async () => {
      const cache = await caches.open(HOLIDAY_API_CACHE);
      try {
        const response = await fetch(request);
        if (response.status !== 200) return response;
        const annotated = annotateHoliday(response);
        event.waitUntil(cache.put(request, annotated.clone()).catch(() => {}));
        return annotated;
      } catch (error) {
        const cached = await cache.match(request);
        if (!cached) throw error;
        return annotateHoliday(cached, true);
      }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Always retrieve the latest shell; never use a share query as a cache key.
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('/index.html', response.clone())).catch(() => {}));
        return response;
      } catch (error) {
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // Only versioned build assets and known public icons belong in the offline cache.
  if (!url.pathname.startsWith('/assets/') && !PRECACHE_ASSETS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).catch(() => {}));
    return response;
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
