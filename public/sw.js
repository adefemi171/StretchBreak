// StretchBreak Service Worker
const CACHE_VERSION = 'v3';
const CACHE_NAME = `stretchbreak-${CACHE_VERSION}`;
const HOLIDAY_API_CACHE = `stretchbreak-holidays-${CACHE_VERSION}`;

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest'
];

// Install event - precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[SW] Precache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('stretchbreak-') && name !== CACHE_NAME && name !== HOLIDAY_API_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip Netlify functions - always network only
  if (url.pathname.startsWith('/.netlify/functions')) {
    return;
  }

  // Holiday API - network first, fallback to cache
  if (url.hostname === 'date.nager.at') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(HOLIDAY_API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets - cache first, fallback to network
  if (
    request.method === 'GET' &&
    (url.origin === location.origin ||
     url.hostname === 'fonts.googleapis.com' ||
     url.hostname === 'fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type === 'error') {
                return response;
              }

              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });

              return response;
            })
            .catch((err) => {
              if (request.mode === 'navigate') {
                return caches.match('/index.html');
              }
              throw err;
            });
        })
    );
  }
});

// Message event - for manual cache updates if needed
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
