/**
 * MinhaAgenda 2.0 — Service Worker
 * Cache estratégico para PWA
 */

const CACHE_NAME = 'minha-agenda-v2.0.4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/css/style.css',
  '/js/config.js',
  '/js/store.js',
  '/js/ui.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/router.js',
  '/js/agenda.js',
  '/js/clientes.js',
  '/js/servicos.js',
  '/js/pacotes.js',
  '/js/profissionais.js',
  '/js/relatorios.js',
  '/js/lembretes.js',
  '/js/pwa.js',
  '/manifest.webmanifest',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg'
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls — network only (no cache)
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // CDN resources — network first, fallback to cache
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML/JS/CSS locais — network first para evitar app velho em cache
  var isCoreRuntime = (event.request.destination === 'script') ||
    (event.request.destination === 'style') ||
    (event.request.mode === 'navigate') ||
    /\.(js|css|html)$/i.test(url.pathname);

  if (isCoreRuntime) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
        .then((response) => {
          if (response) return response;
          if (event.request.mode === 'navigate') return caches.match('/index.html');
          return response;
        })
    );
    return;
  }

  // Assets locais estáticos (imagens/ícones) — cache first
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        return fetch(event.request).then((networkResponse) => {
          var responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});
