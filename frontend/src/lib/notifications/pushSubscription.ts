import { ensureNotificationServiceWorker } from '@/lib/notifications/notificationServiceWorker'
import { notificationsService } from '@/lib/api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function subscribeToWebPush(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('PushManager' in window) || Notification.permission !== 'granted') return false

  try {
    const registration = await ensureNotificationServiceWorker()
    if (!registration?.pushManager) return false

    const { publicKey } = await notificationsService.getPushPublicKey()
    if (!publicKey) return false

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false

    await notificationsService.savePushSubscription({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    })

    return true
  } catch {
    return false
  }
}

export async function unsubscribeFromWebPush(): Promise<void> {
  try {
    const registration = await ensureNotificationServiceWorker()
    const subscription = await registration?.pushManager?.getSubscription()
    if (subscription) {
      await notificationsService.removePushSubscription(subscription.endpoint)
      await subscription.unsubscribe()
    }
  } catch {
    /* optional */
  }
}
