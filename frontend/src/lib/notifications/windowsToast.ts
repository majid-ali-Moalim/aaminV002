import type { AppNotification } from '@/lib/notifications/types'
import { PRIMARY_DESKTOP_EVENTS } from '@/lib/notifications/desktopPreferences'
import { extractTrackingCode } from '@/lib/notifications/notificationTextUtils'
import { useWindowsToastStore } from '@/lib/stores/windowsToastStore'

const APP_NAME = 'Aamin Ambulance'

type ToastContent = {
  title: string
  message: string
  actionLabel: string
}

function buildToastContent(
  eventKey: string | null | undefined,
  title: string,
  message: string,
): ToastContent {
  const code = extractTrackingCode(message) || extractTrackingCode(title) || 'Case update'

  switch (eventKey) {
    case 'NEW_EMERGENCY_REQUEST':
    case 'EMERGENCY_CREATED':
      return {
        title: 'New Emergency Request',
        message: `A new critical emergency has been received. ${code}`,
        actionLabel: 'Open case',
      }
    case 'CREW_ASSIGNED':
    case 'MISSION_ASSIGNED':
      return {
        title: 'New Mission Assigned',
        message: `You have been assigned to mission ${code}.`,
        actionLabel: 'Open mission',
      }
    case 'CASE_COMPLETED':
    case 'MISSION_COMPLETED':
      return {
        title: 'Case Completed',
        message: `Mission ${code} has been completed successfully.`,
        actionLabel: 'View case',
      }
    default:
      return {
        title,
        message: message.length > 120 ? `${message.slice(0, 117)}…` : message,
        actionLabel: 'Open',
      }
  }
}

export function pushWindowsStyleToast(payload: AppNotification, href: string): void {
  const key = payload.eventKey ?? ''
  const isPrimary = PRIMARY_DESKTOP_EVENTS.has(key)
  const isMission =
    payload.category === 'MISSION' ||
    payload.priority === 'CRITICAL' ||
    payload.priority === 'HIGH'

  if (!isPrimary && !isMission) return

  const content = buildToastContent(key, payload.title, payload.message)

  useWindowsToastStore.getState().pushToast({
    id: payload.id,
    appName: APP_NAME,
    title: content.title,
    message: content.message,
    actionLabel: content.actionLabel,
    href,
  })
}

export function pushMissionAssignedWindowsToast(
  trackingCode: string | undefined,
  caseId: string,
  href: string,
): void {
  const code = trackingCode || caseId
  useWindowsToastStore.getState().pushToast({
    id: `crew-assigned-${caseId}-${Date.now()}`,
    appName: APP_NAME,
    title: 'New Mission Assigned',
    message: `You have been assigned to mission ${code}.`,
    actionLabel: 'Open mission',
    href,
  })
}

export function pushEnableNotificationsToast(): void {
  useWindowsToastStore.getState().pushToast({
    id: 'enable-desktop-notifications',
    appName: APP_NAME,
    title: 'Enable desktop notifications',
    message:
      'Allow alerts for new cases, assignments, and completions — like other Windows apps.',
    actionLabel: 'Turn on notifications',
    href: '__enable_notifications__',
  })
}
