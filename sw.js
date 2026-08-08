/* Offline shell. Bump CACHE whenever you edit data.js/app.js/styles.css,
   otherwise returning visitors keep the old copy until their cache expires. */

const CACHE = 'rtd-v8';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './anime.min.js',
  './data.js',
  './app.js',
  './fx.js',
  './account.js',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Network first, so a deploy reaches people on their next online visit.
  ev.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
