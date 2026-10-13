// One-release retirement worker for the previous Workbox app shell.
function isAppWorkboxCache(name) {
  return /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name) &&
    name.endsWith(self.registration.scope);
}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil((async () => {
  try {
    const names = await caches.keys();
    await Promise.allSettled(names.filter(isAppWorkboxCache).map(name => caches.delete(name)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window" });
    await Promise.allSettled(clients.map(client => client.navigate(client.url)));
  } finally {
    await self.registration.unregister();
  }
})()));