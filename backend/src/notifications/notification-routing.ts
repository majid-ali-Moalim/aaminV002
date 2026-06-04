import { NotificationCategory, NotificationType } from '@prisma/client';

export function inferCategory(
  type: NotificationType,
  explicit?: NotificationCategory | null,
): NotificationCategory {
  if (explicit) return explicit;
  switch (type) {
    case 'EMERGENCY':
    case 'AMBULANCE':
      return 'MISSION';
    case 'REFERRAL':
    case 'PATIENT_CARE':
      return 'HOSPITAL';
    case 'STAFF':
      return 'ATTENDANCE';
    case 'COMPLIANCE':
      return 'INCIDENT';
    case 'MAINTENANCE':
    case 'SYSTEM':
    default:
      return 'SYSTEM';
  }
}

export function resolveRedirectUrl(input: {
  redirectUrl?: string | null;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  relatedModule?: string | null;
  relatedId?: string | null;
  category?: NotificationCategory | null;
}): string {
  if (input.redirectUrl) return input.redirectUrl;
  if (input.actionUrl) return input.actionUrl;

  const entityType = (input.entityType || input.relatedModule || '').toLowerCase();
  const entityId = input.entityId || input.relatedId;

  if (entityType.includes('driver') && entityId) return `/admin/drivers/${entityId}`;
  if (entityType.includes('employee') && entityId) return `/admin/employees/${entityId}`;
  if (entityType.includes('dispatcher') && entityId) return `/admin/dispatchers/${entityId}`;
  if (entityType.includes('nurse') && entityId) return `/admin/nurses/${entityId}`;
  if (entityType.includes('incident') && entityId) return `/admin/incidents/${entityId}`;
  if (
    (entityType.includes('emergency') || entityType.includes('case') || entityType.includes('mission')) &&
    entityId
  ) {
    return `/admin/emergency-requests/active?id=${entityId}`;
  }
  if (entityType.includes('ambulance') && entityId) return `/admin/ambulances/${entityId}`;
  if (entityType.includes('handover')) return `/admin/hospitals/handover${entityId ? `?id=${entityId}` : ''}`;
  if (entityType.includes('referral') && entityId) return `/admin/hospitals/incoming?id=${entityId}`;
  if (entityType.includes('hospitalcoordination') && entityId) return `/admin/hospitals/incoming?id=${entityId}`;
  if (entityType.includes('hospital') && entityId) return `/admin/hospitals/availability?id=${entityId}`;

  switch (input.category) {
    case 'MISSION':
      return entityId ? `/admin/emergency-requests/active?id=${entityId}` : '/admin/emergency-requests/active';
    case 'COMMUNICATION':
      return '/admin/notifications?tab=all';
    case 'ATTENDANCE':
      return '/admin/employees/attendance';
    case 'HOSPITAL':
      return entityId ? `/admin/hospitals/incoming?id=${entityId}` : '/admin/hospitals/incoming';
    case 'INCIDENT':
      return '/admin/notifications?tab=all';
    case 'BROADCAST':
      return '/admin/notifications?tab=broadcasts';
    case 'SYSTEM':
    default:
      return '/admin/notifications?tab=all';
  }
}

export function enrichNotification<T extends Record<string, any>>(notification: T) {
  const category = inferCategory(notification.type, notification.category);
  const entityType = notification.entityType ?? notification.relatedModule ?? null;
  const entityId = notification.entityId ?? notification.relatedId ?? null;
  const redirectUrl = resolveRedirectUrl({
    redirectUrl: notification.redirectUrl,
    actionUrl: notification.actionUrl,
    entityType,
    entityId,
    relatedModule: notification.relatedModule,
    relatedId: notification.relatedId,
    category,
  });

  return {
    ...notification,
    category,
    entityType,
    entityId,
    redirectUrl,
    actionUrl: redirectUrl,
    isUnread: notification.status === 'UNREAD',
    isRead: notification.status !== 'UNREAD',
  };
}

export const resolveActionUrl = resolveRedirectUrl;
