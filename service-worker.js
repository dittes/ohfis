// Files Online — Service Worker
// Cache-first for app shell, network-first for CDN resources.

const CACHE_VERSION = '306b3d3fd2';
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
  "/assets/i18n/menu.cs.js",
  "/assets/i18n/menu.de.js",
  "/assets/i18n/menu.en.js",
  "/assets/i18n/menu.pl.js",
  "/assets/i18n/pdf-ui.cs.js",
  "/assets/i18n/pdf-ui.de.js",
  "/assets/i18n/pdf-ui.pl.js",
  "/assets/i18n/routes.cs.js",
  "/assets/i18n/routes.de.js",
  "/assets/i18n/routes.en.js",
  "/assets/i18n/routes.es.js",
  "/assets/i18n/routes.fr.js",
  "/assets/i18n/routes.it.js",
  "/assets/i18n/routes.pl.js",
  "/assets/i18n/routes.pt.js",
  "/assets/i18n/search.cs.js",
  "/assets/i18n/search.de.js",
  "/assets/i18n/search.en.js",
  "/assets/i18n/search.es.js",
  "/assets/i18n/search.fr.js",
  "/assets/i18n/search.it.js",
  "/assets/i18n/search.pl.js",
  "/assets/i18n/search.pt.js",
  "/assets/i18n/tr.cs.data.js",
  "/assets/i18n/tr.cs.dev.js",
  "/assets/i18n/tr.cs.documents.js",
  "/assets/i18n/tr.cs.finance.js",
  "/assets/i18n/tr.cs.images.js",
  "/assets/i18n/tr.cs.js",
  "/assets/i18n/tr.cs.media.js",
  "/assets/i18n/tr.cs.notes.js",
  "/assets/i18n/tr.cs.team.js",
  "/assets/i18n/tr.cs.text.js",
  "/assets/i18n/tr.cs.time.js",
  "/assets/i18n/tr.cs.video.js",
  "/assets/i18n/tr.de.data.js",
  "/assets/i18n/tr.de.dev.js",
  "/assets/i18n/tr.de.documents.js",
  "/assets/i18n/tr.de.finance.js",
  "/assets/i18n/tr.de.images.js",
  "/assets/i18n/tr.de.js",
  "/assets/i18n/tr.de.media.js",
  "/assets/i18n/tr.de.notes.js",
  "/assets/i18n/tr.de.team.js",
  "/assets/i18n/tr.de.text.js",
  "/assets/i18n/tr.de.time.js",
  "/assets/i18n/tr.de.video.js",
  "/assets/i18n/tr.es.data.js",
  "/assets/i18n/tr.es.dev.js",
  "/assets/i18n/tr.es.documents.js",
  "/assets/i18n/tr.es.finance.js",
  "/assets/i18n/tr.es.images.js",
  "/assets/i18n/tr.es.js",
  "/assets/i18n/tr.es.media.js",
  "/assets/i18n/tr.es.notes.js",
  "/assets/i18n/tr.es.team.js",
  "/assets/i18n/tr.es.text.js",
  "/assets/i18n/tr.es.time.js",
  "/assets/i18n/tr.es.video.js",
  "/assets/i18n/tr.fr.data.js",
  "/assets/i18n/tr.fr.dev.js",
  "/assets/i18n/tr.fr.documents.js",
  "/assets/i18n/tr.fr.finance.js",
  "/assets/i18n/tr.fr.images.js",
  "/assets/i18n/tr.fr.js",
  "/assets/i18n/tr.fr.media.js",
  "/assets/i18n/tr.fr.notes.js",
  "/assets/i18n/tr.fr.team.js",
  "/assets/i18n/tr.fr.text.js",
  "/assets/i18n/tr.fr.time.js",
  "/assets/i18n/tr.fr.video.js",
  "/assets/i18n/tr.it.data.js",
  "/assets/i18n/tr.it.dev.js",
  "/assets/i18n/tr.it.documents.js",
  "/assets/i18n/tr.it.finance.js",
  "/assets/i18n/tr.it.images.js",
  "/assets/i18n/tr.it.js",
  "/assets/i18n/tr.it.media.js",
  "/assets/i18n/tr.it.notes.js",
  "/assets/i18n/tr.it.team.js",
  "/assets/i18n/tr.it.text.js",
  "/assets/i18n/tr.it.time.js",
  "/assets/i18n/tr.it.video.js",
  "/assets/i18n/tr.pl.data.js",
  "/assets/i18n/tr.pl.dev.js",
  "/assets/i18n/tr.pl.documents.js",
  "/assets/i18n/tr.pl.finance.js",
  "/assets/i18n/tr.pl.images.js",
  "/assets/i18n/tr.pl.js",
  "/assets/i18n/tr.pl.media.js",
  "/assets/i18n/tr.pl.notes.js",
  "/assets/i18n/tr.pl.team.js",
  "/assets/i18n/tr.pl.text.js",
  "/assets/i18n/tr.pl.time.js",
  "/assets/i18n/tr.pl.video.js",
  "/assets/i18n/tr.pt.data.js",
  "/assets/i18n/tr.pt.dev.js",
  "/assets/i18n/tr.pt.documents.js",
  "/assets/i18n/tr.pt.finance.js",
  "/assets/i18n/tr.pt.images.js",
  "/assets/i18n/tr.pt.js",
  "/assets/i18n/tr.pt.media.js",
  "/assets/i18n/tr.pt.notes.js",
  "/assets/i18n/tr.pt.team.js",
  "/assets/i18n/tr.pt.text.js",
  "/assets/i18n/tr.pt.time.js",
  "/assets/i18n/tr.pt.video.js",
  "/assets/i18n/ut.cs.js",
  "/assets/i18n/ut.de.js",
  "/assets/i18n/ut.en.js",
  "/assets/i18n/ut.es.js",
  "/assets/i18n/ut.fr.js",
  "/assets/i18n/ut.it.js",
  "/assets/i18n/ut.pl.js",
  "/assets/i18n/ut.pt.js",
  "/assets/js/pdf/lib.js",
  "/assets/js/pdf/main.js",
  "/assets/js/pdf/ops.js",
  "/assets/js/pdf/pages.js",
  "/assets/js/pdf/tools.js",
  "/assets/js/pdf/ui.js",
  "/assets/js/search.js",
  "/assets/js/site.js",
  "/assets/js/tools/calctool.js",
  "/assets/js/tools/canvasboard.js",
  "/assets/js/tools/csv-worker.js",
  "/assets/js/tools/data.js",
  "/assets/js/tools/dev.js",
  "/assets/js/tools/documents.js",
  "/assets/js/tools/finance.js",
  "/assets/js/tools/images.js",
  "/assets/js/tools/kit.js",
  "/assets/js/tools/lib/analysis.js",
  "/assets/js/tools/lib/archive.js",
  "/assets/js/tools/lib/astro.js",
  "/assets/js/tools/lib/audio.js",
  "/assets/js/tools/lib/bizdocs.js",
  "/assets/js/tools/lib/canvas.js",
  "/assets/js/tools/lib/csv.js",
  "/assets/js/tools/lib/data.js",
  "/assets/js/tools/lib/devtools.js",
  "/assets/js/tools/lib/diff.js",
  "/assets/js/tools/lib/docs.js",
  "/assets/js/tools/lib/dummy.js",
  "/assets/js/tools/lib/epub.js",
  "/assets/js/tools/lib/ffrun.js",
  "/assets/js/tools/lib/files.js",
  "/assets/js/tools/lib/fin.js",
  "/assets/js/tools/lib/font.js",
  "/assets/js/tools/lib/formula.js",
  "/assets/js/tools/lib/gif.js",
  "/assets/js/tools/lib/image.js",
  "/assets/js/tools/lib/it.js",
  "/assets/js/tools/lib/mp3.js",
  "/assets/js/tools/lib/notes.js",
  "/assets/js/tools/lib/numfmt.js",
  "/assets/js/tools/lib/pdfhtml.js",
  "/assets/js/tools/lib/pdfmore.js",
  "/assets/js/tools/lib/speech.js",
  "/assets/js/tools/lib/team.js",
  "/assets/js/tools/lib/text.js",
  "/assets/js/tools/lib/textmore.js",
  "/assets/js/tools/lib/time.js",
  "/assets/js/tools/lib/video.js",
  "/assets/js/tools/main.js",
  "/assets/js/tools/media.js",
  "/assets/js/tools/notes.js",
  "/assets/js/tools/regex-worker.js",
  "/assets/js/tools/tabletool.js",
  "/assets/js/tools/team.js",
  "/assets/js/tools/text.js",
  "/assets/js/tools/time.js",
  "/assets/js/tools/video.js"
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

  // Same-origin: cache-first
  if (url.origin === self.location.origin) {
    // For navigation requests always try network first so the latest HTML is served
    // Unversioned scripts (tool modules loaded by dynamic import) are also network-first so a new release is never shadowed by a stale cached copy
    if (request.mode === 'navigate' || (url.pathname.endsWith('.js') && !url.search)) {
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
