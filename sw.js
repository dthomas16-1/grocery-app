// =========================
// sw.js  (CACHE v39)
// =========================
const VERSION = 39;
const CACHE = `grocery-app-v${VERSION}`;

// Minimal app-shell for now (we’ll add icons after we confirm filenames)
const APP_SHELL = [
  "./",
  "./index.html",
  "./sw.js",
  "./manifest.webmanifest",
];

// Install: pre-cache shell and take over quickly
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: remove old caches and claim clients
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - HTML navigations: network-first (keeps index.html fresh)
// - Same-origin assets: cache-first (fast/offline)
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          // Keep a fresh copy of index.html in cache
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((resp) => {
        // Don’t cache opaque/error responses
        if (!resp || resp.status !== 200) return resp;

        const copy = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return resp;
      });
    })
  );
});
