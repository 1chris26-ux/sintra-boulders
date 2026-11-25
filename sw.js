const APP_CACHE = "sintra-app-v93d";
const IMG_CACHE = "sintra-imgs-v1";
const TILE_CACHE = "sintra-tiles-v1";

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(APP_CACHE).then(async c => {
      for (const u of ["./", "./index.html"]) {
        try { await c.add(new Request(u, { cache: "reload" })); } catch (err) {}
      }
    }).then(() => self.skipWaiting())
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
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then(c => c.put("./index.html", copy));
        }
        return res;
      }).catch(async () => {
        const c = await caches.open(APP_CACHE);
        return (await c.match(req, { ignoreSearch: true })) || (await c.match("./index.html")) || (await c.match("./"));
      })
    );
    return;
  }

  if (url.pathname.includes("Boulder_Images/") || url.pathname.includes("Coast_Images/") || url.hostname.includes("wixstatic.com")) {
    e.respondWith(caches.open(IMG_CACHE).then(c => c.match(req, { ignoreSearch: true }).then(r => r || fetch(req))));
    return;
  }

  if (url.hostname.includes("unpkg.com")) {
    e.respondWith(
      caches.open(APP_CACHE).then(c => c.match(req).then(r => r || fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
        return res;
      })))
    );
    return;
  }

  if (url.hostname.includes("google") || url.hostname.includes("openstreetmap") || url.hostname.includes("opentopomap") || url.hostname.includes("arcgisonline")) {
    const normUrl = req.url.replace(/mt[0-3]\.google\.com/, "://google.com");
    e.respondWith(
      caches.open(TILE_CACHE).then(c => c.match(normUrl).then(r => r || fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) c.put(normUrl, res.clone());
        return res;
      })))
    );
    return;
  }
});
