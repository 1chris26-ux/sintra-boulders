const APP_CACHE = "sintra-app-v93";
const IMG_CACHE = "sintra-imgs-v1";
const TILE_CACHE = "sintra-tiles-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "https://unpkg.com",
  "https://unpkg.com"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(APP_CACHE).then(c => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith("sintra-app-") && k !== APP_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate" || url.pathname.endsWith("index.html") || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(APP_CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  if (url.pathname.includes("Boulder_Images/") || url.pathname.includes("Coast_Images/") || url.hostname.includes("wixstatic.com")) {
    e.respondWith(caches.open(IMG_CACHE).then(c => c.match(req).then(r => r || fetch(req))));
    return;
  }

  if (url.hostname.includes("google") || url.hostname.includes("openstreetmap") || url.hostname.includes("arcgisonline")) {
    e.respondWith(
      caches.open(TILE_CACHE).then(c => c.match(req).then(r => r || fetch(req).then(res => {
        if (res.ok) c.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
