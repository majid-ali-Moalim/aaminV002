const CACHE = 'aamin-notifications-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'SHOW_NOTIFICATION') return

  const { title, options } = data
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Aamin Ambulance',
    body: 'You have a new alert',
    url: '/',
    tag: 'aamin-push',
  }

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() }
    }
  } catch {
    /* use defaults */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/aamin-icon.svg',
      badge: '/aamin-icon.svg',
      tag: payload.tag || 'aamin-push',
      data: { url: payload.url || '/' },
      renotify: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client && url) {
            return client.navigate(url)
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    }),
  )
})
