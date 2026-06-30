/** Map notification deep links to driver case workspace routes. */
export function resolveDriverNotificationUrl(notification: {
  redirectUrl?: string | null
  actionUrl?: string | null
  eventKey?: string | null
  entityType?: string | null
  entityId?: string | null
  category?: string | null
}): string {
  const raw = notification.redirectUrl || notification.actionUrl || ''

  if (raw.startsWith('/driver/mission')) return raw
  if (raw.startsWith('/driver/')) {
    if (raw.includes('/missions/active') || raw.includes('/missions/assigned') || raw.includes('/missions/workflow')) {
      return notification.entityId
        ? `/driver/mission?caseId=${notification.entityId}`
        : '/driver/mission'
    }
    return raw
  }

  if (
    notification.eventKey === 'MISSION_ASSIGNED' ||
    notification.category === 'MISSION' ||
    notification.entityType?.includes('Emergency')
  ) {
    return notification.entityId
      ? `/driver/mission?caseId=${notification.entityId}`
      : '/driver/mission'
  }

  if (notification.category === 'ATTENDANCE') {
    return '/driver/shifts'
  }

  if (raw.includes('emergency') || raw.includes('mission')) {
    return notification.entityId
      ? `/driver/mission?caseId=${notification.entityId}`
      : '/driver/mission'
  }

  return '/driver/notifications'
}
