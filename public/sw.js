// Bario Push Notification Service Worker
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Bario';
  const options = {
    body: data.message || data.body || '',
    icon: data.icon || '/bario-logo.png',
    badge: '/bario-logo.png',
    data: { url: data.action_url || data.url || '/' },
    vibrate: [100, 50, 100],
    tag: data.type || 'default',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
