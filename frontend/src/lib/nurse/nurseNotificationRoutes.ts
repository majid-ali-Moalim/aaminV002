/** Map notification deep links to nurse portal routes. */
export function resolveNurseNotificationUrl(notification: {
  redirectUrl?: string | null
  actionUrl?: string | null
  eventKey?: string | null
  entityType?: string | null
  entityId?: string | null
  category?: string | null
}): string {
  const raw = notification.redirectUrl || notification.actionUrl || ''
  if (raw.startsWith('/nurse/')) return raw

  if (notification.eventKey === 'MISSION_ASSIGNED' || notification.category === 'MISSION') {
    return notification.entityId
      ? `/nurse/mission?caseId=${notification.entityId}`
      : '/nurse/mission'
  }
  if (raw.includes('handover') || notification.eventKey?.includes('HANDOVER')) {
    return '/nurse/mission'
  }
  if (notification.category === 'COMMUNICATION') {
    return '/nurse/communications'
  }
  if (notification.category === 'ATTENDANCE') {
    return '/nurse/shifts'
  }
  if (notification.category === 'HOSPITAL') {
    return '/nurse/handover'
  }
  if (raw.includes('emergency') || raw.includes('mission') || notification.entityType?.includes('emergency')) {
    return notification.entityId
      ? `/nurse/mission?caseId=${notification.entityId}`
      : '/nurse/mission'
  }
  return '/nurse/notifications'
}
