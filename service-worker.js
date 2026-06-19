/* ============================================================
   Trading Pocket Dashboard — Service Worker
   Cache strategy: App Shell (cache-first) + Network fallback
   ============================================================ */

const APP_VERSION   = "v4";
const CACHE_SHELL   = `tpd-shell-${APP_VERSION}`;
const CACHE_RUNTIME = `tpd-runtime-${APP_VERSION}`;

// All files that form the app shell — must ALL succeed or install fails
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

/* ---- Install: pre-cache the shell ---- */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())  // activate immediately, don't wait for old tabs to close
  );
});

/* ---- Activate: purge old caches ---- */
self.addEventListener("activate", event => {
  const keep = [CACHE_SHELL, CACHE_RUNTIME];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !keep.includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // take control of all open tabs immediately
  );
});

/* ---- Fetch: shell = cache-first, everything else = network-first ---- */
self.addEventListener("fetch", event => {
  const { request } = event;

  // Only handle GET requests; let POST/other through unchanged
  if (request.method !== "GET") return;

  // Skip cross-origin requests (analytics, CDN fonts, etc.)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages) → serve shell, fall back to index.html
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html")
        .then(cached => cached || fetch(request))
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Shell assets → cache-first (fast, reliable offline)
  const isShellAsset = SHELL_ASSETS.some(asset => {
    const assetUrl = new URL(asset, self.location.href).pathname;
    return url.pathname === assetUrl || url.pathname.endsWith(asset.replace("./", "/"));
  });

  if (isShellAsset) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) return cached;
          // Not in cache yet — fetch and store
          return fetch(request).then(response => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_SHELL).then(cache => cache.put(request, clone));
            }
            return response;
          });
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Everything else → network-first, runtime cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_RUNTIME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
