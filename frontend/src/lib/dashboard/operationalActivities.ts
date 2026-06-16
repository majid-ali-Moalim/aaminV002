export type OperationalActivityCategory =
  | 'emergency'
  | 'case'
  | 'hospital'
  | 'user'
  | 'alert'
  | 'ambulance'

export interface OperationalActivityItem {
  id: string
  category: OperationalActivityCategory
  kind: string
  title: string
  description: string
  actorName: string
  actorRole: string
  createdAt: string
  href: string
  actionLabel: string
  trackingCode?: string
  priority?: string
}

export interface OperationalActivityFeed {
  summary: {
    todayCount: number
    criticalCount: number
    pendingCount: number
  }
  activities: OperationalActivityItem[]
}

export type ActivityFilterTab = 'all' | 'emergency' | 'cases' | 'hospitals' | 'users'

export const ACTIVITY_FILTER_TABS: { id: ActivityFilterTab; label: string; apiCategory?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'emergency', label: 'Emergency', apiCategory: 'emergency' },
  { id: 'cases', label: 'Cases', apiCategory: 'missions' },
  { id: 'hospitals', label: 'Hospitals', apiCategory: 'hospitals' },
  { id: 'users', label: 'Users', apiCategory: 'users' },
]

export function formatTimeAgo(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  if (date >= yesterday && date < todayStart) return 'Yesterday'

  const diffDays = Math.floor(diffMins / 1440)
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
}

export function getActivityVisual(kind: string, category: OperationalActivityCategory) {
  const styles: Record<
    OperationalActivityCategory,
    { bg: string; text: string; border: string; emoji: string }
  > = {
    emergency: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', emoji: '🚨' },
    alert: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', emoji: '⚠️' },
    case: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', emoji: '🚑' },
    hospital: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', emoji: '🏥' },
    user: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100', emoji: '👤' },
    ambulance: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', emoji: '🚑' },
  }

  const kindEmoji: Record<string, string> = {
    CASE_CREATED: '🚨',
    CRITICAL_ALERT: '⚠️',
    AMBULANCE_ASSIGNED: '🚑',
    DRIVER_ACCEPTED: '👨',
    NURSE_ACCEPTED: '👨‍⚕️',
    HOSPITAL_ACCEPTED: '🏥',
    HOSPITAL_REGISTERED: '🏥',
    TRANSPORT_STARTED: '🚑',
    ARRIVED_HOSPITAL: '🏥',
    CASE_COMPLETED: '✅',
    USER_CREATED: '👤',
    AMBULANCE_ADDED: '🚑',
  }

  const base = styles[category] ?? styles.case
  return { ...base, emoji: kindEmoji[kind] ?? base.emoji }
}
