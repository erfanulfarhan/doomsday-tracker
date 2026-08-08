/* RETIRED WORKER — kill switch.
   The previous offline cache was serving visitors a stale version of the site.
   This worker takes over, deletes every cache, unregisters itself, and reloads
   any open page once so everyone lands on the latest network build. After that
   no service worker controls the site (app.js no longer registers one). */
self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
      await self.registration.unregister();
      var clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(function (c) { c.navigate(c.url); });
    } catch (e) { /* nothing else to do */ }
  })());
});
