import type { AppNotification } from '@/lib/notifications/types'
import {
  isDesktopCategoryEnabled,
  loadDesktopNotificationPrefs,
  PRIMARY_DESKTOP_EVENTS,
  saveDesktopNotificationPrefs,
} from '@/lib/notifications/desktopPreferences'
import { extractTrackingCode } from '@/lib/notifications/notificationTextUtils'
import { ensureNotificationServiceWorker } from '@/lib/notifications/notificationServiceWorker'
import { subscribeToWebPush } from '@/lib/notifications/pushSubscription'
import { pushMissionAssignedWindowsToast, pushWindowsStyleToast } from '@/lib/notifications/windowsToast'

const PERMISSION_ASKED_KEY = 'aamin_desktop_notif_permission_asked'

export function hasAskedDesktopPermission(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(PERMISSION_ASKED_KEY) === '1'
}

export function markDesktopPermissionAsked(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PERMISSION_ASKED_KEY, '1')
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  return Notification.permission
}

function enableDesktopPrefsAfterGrant(): void {
  const prefs = loadDesktopNotificationPrefs()
  if (!prefs.desktopEnabled) {
    saveDesktopNotificationPrefs({ ...prefs, desktopEnabled: true })
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) return 'unsupported'
  markDesktopPermissionAsked()
  await ensureNotificationServiceWorker()

  if (Notification.permission === 'granted') {
    enableDesktopPrefsAfterGrant()
    await subscribeToWebPush()
    return 'granted'
  }
  if (Notification.permission === 'denied') return 'denied'

  try {
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      enableDesktopPrefsAfterGrant()
      await subscribeToWebPush()
    }
    return result
  } catch {
    return Notification.permission
  }
}

export async function registerNotificationServiceWorker(): Promise<void> {
  await ensureNotificationServiceWorker()
}

type OsNotificationPayload = {
  title: string
  body: string
  tag: string
  clickUrl: string
  silent: boolean
}

/** Show native Windows/macOS notification — works when tab is in background. */
async function showOsNotification(payload: OsNotificationPayload): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const options: NotificationOptions = {
    body: payload.body,
    tag: payload.tag,
    icon: '/aamin-icon.svg',
    badge: '/aamin-icon.svg',
    silent: payload.silent,
    data: { url: payload.clickUrl },
    requireInteraction: PRIMARY_DESKTOP_EVENTS.has(payload.tag) ? false : false,
  }

  try {
    const registration = await ensureNotificationServiceWorker()
    if (registration?.active) {
      registration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: payload.title,
        options,
      })
      return
    }
    if (registration && 'showNotification' in registration) {
      await registration.showNotification(payload.title, options)
      return
    }
  } catch {
    /* fall through */
  }

  try {
    const notification = new Notification(payload.title, options)
    notification.onclick = () => {
      window.focus()
      if (payload.clickUrl) window.location.href = payload.clickUrl
      notification.close()
    }
  } catch {
    /* in-app toast may still be visible */
  }
}

function buildDesktopContent(
  eventKey: string | null | undefined,
  title: string,
  message: string,
  entityId?: string | null,
): { title: string; body: string } {
  const code =
    extractTrackingCode(message) ||
    extractTrackingCode(title) ||
    (entityId ? 'Open case' : 'Case update')

  const appTitle = 'Aamin Ambulance'

  const desktopByEvent: Record<string, string> = {
    NEW_EMERGENCY_REQUEST: `New Emergency Request — ${code}`,
    EMERGENCY_CREATED: `New Emergency Request — ${code}`,
    CREW_ASSIGNED: `New Mission Assigned — ${code}`,
    MISSION_ASSIGNED: `New Mission Assigned — ${code}`,
    CASE_COMPLETED: `Case Completed — ${code}`,
    MISSION_COMPLETED: `Case Completed — ${code}`,
    CASE_STARTED: `Case Started — ${code}`,
    ARRIVED_SCENE: `Arrived at Scene — ${code}`,
    PATIENT_LOADED: `Patient Loaded — ${code}`,
    MEDICAL_NOTES_COMPLETED: `Medical Notes Done — ${code}`,
    EN_ROUTE_HOSPITAL: `En Route to Hospital — ${code}`,
    ARRIVED_HOSPITAL: `Arrived at Hospital — ${code}`,
    HANDOVER_COMPLETED: `Handover Completed — ${code}`,
  }

  const body = (eventKey && desktopByEvent[eventKey]) || `${title} — ${code}`

  return { title: appTitle, body }
}

function shouldShowOsPopup(
  eventKey: string | null | undefined,
  prefs: ReturnType<typeof loadDesktopNotificationPrefs>,
): boolean {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') return false

  const key = eventKey ?? ''
  const isPrimary = PRIMARY_DESKTOP_EVENTS.has(key)

  if (isPrimary) {
    return isDesktopCategoryEnabled(key, { ...prefs, desktopEnabled: true })
  }

  if (!prefs.desktopEnabled) return false
  return isDesktopCategoryEnabled(key, prefs)
}

export function usesWindowsStyleToast(eventKey: string | null | undefined): boolean {
  if (!eventKey) return false
  return PRIMARY_DESKTOP_EVENTS.has(eventKey)
}

function isTabVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible'
}

/** In-app toast (tab visible) + native OS notification (always when permitted). */
export function showModernNotification(payload: AppNotification, clickUrl: string): void {
  if (isTabVisible()) {
    pushWindowsStyleToast(payload, clickUrl)
  }

  const prefs = loadDesktopNotificationPrefs()
  if (!shouldShowOsPopup(payload.eventKey, prefs)) return

  const isPrimary = PRIMARY_DESKTOP_EVENTS.has(payload.eventKey ?? '')
  const isMission =
    payload.category === 'MISSION' ||
    payload.priority === 'CRITICAL' ||
    payload.priority === 'HIGH'

  if (!isPrimary && !isMission && payload.category !== 'BROADCAST') return

  const { title, body } = buildDesktopContent(
    payload.eventKey,
    payload.title,
    payload.message,
    payload.entityId,
  )

  void showOsNotification({
    title,
    body,
    tag: payload.id,
    clickUrl,
    silent: !prefs.soundEnabled,
  })
}

export function showBrowserNotification(payload: AppNotification, clickUrl: string): void {
  showModernNotification(payload, clickUrl)
}

export function showMissionAssignedDesktopNotification(
  trackingCode: string | undefined,
  caseId: string,
  clickUrl: string,
): void {
  if (isTabVisible()) {
    pushMissionAssignedWindowsToast(trackingCode, caseId, clickUrl)
  }

  const prefs = loadDesktopNotificationPrefs()
  if (!shouldShowOsPopup('CREW_ASSIGNED', prefs)) return

  const code = trackingCode || caseId
  void showOsNotification({
    title: 'Aamin Ambulance',
    body: `New Mission Assigned — ${code}`,
    tag: 'CREW_ASSIGNED',
    clickUrl,
    silent: !prefs.soundEnabled,
  })
}

export function playNotificationSoundIfEnabled(): void {
  const prefs = loadDesktopNotificationPrefs()
  if (!prefs.soundEnabled) return
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    /* optional */
  }
}

export async function initDesktopNotificationsOnLogin(): Promise<void> {
  if (!isBrowserNotificationSupported()) return

  await ensureNotificationServiceWorker()

  if (Notification.permission === 'granted') {
    enableDesktopPrefsAfterGrant()
    await subscribeToWebPush()
    return
  }

  if (Notification.permission === 'denied') return
  if (hasAskedDesktopPermission()) return

  await requestBrowserNotificationPermission()
}
