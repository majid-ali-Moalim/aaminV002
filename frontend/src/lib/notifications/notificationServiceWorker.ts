let swReadyPromise: Promise<ServiceWorkerRegistration | null> | null = null

/** Register and wait until the notification service worker is active. */
export async function ensureNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

  if (swReadyPromise) return swReadyPromise

  swReadyPromise = (async () => {
    try {
      let registration = await navigator.serviceWorker.getRegistration('/')

      if (!registration) {
        registration = await navigator.serviceWorker.register('/notification-sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
      }

      await waitForActiveWorker(registration)
      return navigator.serviceWorker.ready
    } catch {
      return null
    }
  })()

  return swReadyPromise
}

function waitForActiveWorker(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return Promise.resolve()

  const worker = registration.installing || registration.waiting
  if (!worker) {
    return navigator.serviceWorker.ready.then(() => undefined)
  }

  return new Promise((resolve) => {
    const onStateChange = () => {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', onStateChange)
        resolve()
      }
    }
    worker.addEventListener('statechange', onStateChange)
    if (worker.state === 'activated') resolve()
  })
}

export function resetServiceWorkerCache(): void {
  swReadyPromise = null
}
