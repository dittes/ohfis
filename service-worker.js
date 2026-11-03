// Files Online — Service Worker
// Cache-first for app shell, network-first for CDN resources.

const CACHE_VERSION = '86a1becc34';
const SHELL_CACHE = `files-online-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `files-online-runtime-${CACHE_VERSION}`;

// Written by build/build.mjs. Pages and vendor libraries are cached the first time they are used.
const SHELL_FILES = [
  "/",
  "/manifest.webmanifest",
  "/assets/icons/icon.svg",
  "/assets/css/site.css",
  "/assets/fonts/inter-cyrillic-ext-wght-normal.woff2",
  "/assets/fonts/inter-cyrillic-wght-normal.woff2",
  "/assets/fonts/inter-greek-ext-wght-normal.woff2",
  "/assets/fonts/inter-greek-wght-normal.woff2",
  "/assets/fonts/inter-latin-ext-wght-normal.woff2",
  "/assets/fonts/inter-latin-wght-normal.woff2",
  "/assets/fonts/inter-vietnamese-wght-normal.woff2",
  "/assets/i18n/pdf-ui.cs.js",
  "/assets/i18n/pdf-ui.de.js",
  "/assets/i18n/pdf-ui.pl.js",
  "/assets/i18n/routes.cs.js",
  "/assets/i18n/routes.de.js",
  "/assets/i18n/routes.en.js",
  "/assets/i18n/routes.pl.js",
  "/assets/i18n/ut.cs.js",
  "/assets/i18n/ut.de.js",
  "/assets/i18n/ut.en.js",
  "/assets/i18n/ut.pl.js",
  "/assets/js/pdf/lib.js",
  "/assets/js/pdf/main.js",
  "/assets/js/pdf/ops.js",
  "/assets/js/pdf/pages.js",
  "/assets/js/pdf/tools.js",
  "/assets/js/pdf/ui.js",
  "/assets/js/site.js",
  "/assets/js/tools/kit.js",
  "/assets/js/tools/lib/diff.js",
  "/assets/js/tools/lib/dummy.js",
  "/assets/js/tools/lib/text.js",
  "/assets/js/tools/main.js",
  "/assets/js/tools/text.js"
];

// Install: pre-cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('[SW] Shell cache install partially failed:', err);
        return self.skipWaiting();
      })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: route requests to appropriate strategy
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // CDN resources (vendor libraries): network-first, cache as fallback
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(networkFirstWithCache(request, RUNTIME_CACHE));
    return;
  }

  // Same-origin: cache-first
  if (url.origin === self.location.origin) {
    // For navigation requests always try network first so the latest HTML is served
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstWithCache(request, SHELL_CACHE));
    } else {
      event.respondWith(cacheFirstWithNetwork(request, SHELL_CACHE));
    }
    return;
  }
});

async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline: for navigation return cached index.html
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // For navigation offline fallback
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}
