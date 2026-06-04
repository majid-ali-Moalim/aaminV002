export type NotificationCategory =
  | 'MISSION'
  | 'COMMUNICATION'
  | 'ATTENDANCE'
  | 'HOSPITAL'
  | 'INCIDENT'
  | 'SYSTEM'
  | 'BROADCAST'

export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type NotificationStatus = 'UNREAD' | 'READ' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ARCHIVED'

export interface AppNotification {
  id: string
  title: string
  message: string
  type: string
  category: NotificationCategory
  priority: NotificationPriority
  status: NotificationStatus
  senderName?: string | null
  eventKey?: string | null
  actionUrl?: string | null
  redirectUrl?: string | null
  entityType?: string | null
  entityId?: string | null
  relatedModule?: string | null
  relatedId?: string | null
  isUnread?: boolean
  readAt?: string | null
  createdAt: string
  updatedAt?: string
  createdBy?: { username?: string; email?: string } | null
}

export interface NotificationStats {
  total: number
  unread: number
  critical: number
  archived: number
  resolved: number
  broadcasts?: number
  categoryCounts?: Record<string, number>
}

export interface InboxResponse {
  items: AppNotification[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface AlertRecord {
  id: string
  title: string
  message: string
  alertType: string
  priority: NotificationPriority
  status: string
  assignedToId?: string | null
  relatedModule?: string | null
  relatedId?: string | null
  actionUrl?: string | null
  createdAt: string
  resolvedAt?: string | null
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  MISSION: 'Mission',
  COMMUNICATION: 'Communication',
  ATTENDANCE: 'Attendance',
  HOSPITAL: 'Hospital',
  INCIDENT: 'Incident',
  SYSTEM: 'System',
  BROADCAST: 'Emergency Broadcast',
}

export const PRIORITY_STYLES: Record<
  NotificationPriority,
  { badge: string; dot: string; border: string }
> = {
  CRITICAL: {
    badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    dot: 'bg-red-500',
    border: 'border-l-red-500',
  },
  HIGH: {
    badge: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    dot: 'bg-orange-500',
    border: 'border-l-orange-500',
  },
  MEDIUM: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
    border: 'border-l-blue-500',
  },
  LOW: {
    badge: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    dot: 'bg-gray-400',
    border: 'border-l-gray-400',
  },
}

export const DRAWER_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'UNREAD', label: 'Unread' },
  { id: 'CRITICAL', label: 'Critical' },
  { id: 'MISSION', label: 'Mission' },
  { id: 'COMMUNICATION', label: 'Communication' },
  { id: 'ATTENDANCE', label: 'Attendance' },
] as const

export type DrawerTabId = (typeof DRAWER_TABS)[number]['id']
