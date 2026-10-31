/* Service worker for Aachi's Gameslot.
   Caches the app so it opens fast and works offline after the first visit.
   Bump CACHE when you deploy a new version so players get the update. */
const CACHE = "aachi-gameslot-v1";
const CORE = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // The page itself: try the network first so updates arrive, fall back to the cache offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match("./")))
    );
    return;
  }

  // Everything else (fonts, face model, scripts, icons): serve from cache, refresh in the background.
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req)
        .then(r => {
          if (r && (r.ok || r.type === "opaque")) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return r;
        })
        .catch(() => cached || Response.error());
      return cached || net;
    })
  );
});
