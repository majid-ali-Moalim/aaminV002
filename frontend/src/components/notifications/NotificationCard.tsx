'use client'

import {
  Activity,
  AlertTriangle,
  Archive,
  Bell,
  Building2,
  Check,
  Clock,
  ExternalLink,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  ShieldAlert,
  Trash2,
  Truck,
  User,
  Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { AppNotification, NotificationCategory } from '@/lib/notifications/types'
import { CATEGORY_LABELS, PRIORITY_STYLES } from '@/lib/notifications/types'

function getCategoryIcon(category: NotificationCategory, priority: string) {
  const critical = priority === 'CRITICAL'
  const cls = critical ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'
  switch (category) {
    case 'MISSION':
      return <Truck className={`w-5 h-5 ${cls}`} />
    case 'COMMUNICATION':
      return <MessageSquare className={`w-5 h-5 ${cls}`} />
    case 'ATTENDANCE':
      return <Users className={`w-5 h-5 ${cls}`} />
    case 'HOSPITAL':
      return <Building2 className={`w-5 h-5 ${cls}`} />
    case 'INCIDENT':
      return <ShieldAlert className={`w-5 h-5 ${cls}`} />
    case 'BROADCAST':
      return <Megaphone className={`w-5 h-5 ${cls}`} />
    case 'SYSTEM':
    default:
      return <Bell className={`w-5 h-5 ${cls}`} />
  }
}

export interface NotificationCardProps {
  notification: AppNotification
  compact?: boolean
  onOpen?: (notification: AppNotification) => void
  onMarkRead?: (id: string) => void
  onMarkUnread?: (id: string) => void
  onArchive?: (id: string) => void
  onDelete?: (id: string) => void
}

export default function NotificationCard({
  notification,
  compact = false,
  onOpen,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onDelete,
}: NotificationCardProps) {
  const isUnread = notification.isUnread ?? notification.status === 'UNREAD'
  const priorityStyle = PRIORITY_STYLES[notification.priority] ?? PRIORITY_STYLES.MEDIUM

  const handleClick = () => {
    if (isUnread && onMarkRead) onMarkRead(notification.id)
    onOpen?.(notification)
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={[
        'group relative flex gap-3 rounded-2xl border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
        'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900',
        'hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800',
        isUnread ? 'bg-blue-50/40 dark:bg-blue-950/20' : '',
        `border-l-4 ${priorityStyle.border}`,
        compact ? 'p-3' : 'p-4 md:p-5',
      ].join(' ')}
    >
      {isUnread && (
        <span
          className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900"
          aria-label="Unread"
        />
      )}

      <div
        className={[
          'shrink-0 flex items-center justify-center rounded-xl shadow-sm',
          notification.priority === 'CRITICAL'
            ? 'bg-red-50 dark:bg-red-950/50 w-10 h-10'
            : 'bg-gray-50 dark:bg-gray-800 w-10 h-10',
        ].join(' ')}
      >
        {getCategoryIcon(notification.category, notification.priority)}
      </div>

      <div className="flex-1 min-w-0 pr-4">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {CATEGORY_LABELS[notification.category]}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${priorityStyle.badge}`}
          >
            {notification.priority}
          </span>
        </div>

        <h3
          className={`font-black text-sm leading-snug truncate ${
            isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          {notification.title}
        </h3>

        <p
          className={`text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed ${
            compact ? 'line-clamp-2' : 'line-clamp-3'
          }`}
        >
          {notification.message}
        </p>

        {!compact && (notification.senderName || notification.createdBy) && (
          <p className="text-[11px] text-gray-500 mt-2">
            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">
              {notification.senderName ? 'From: ' : 'Created By: '}
            </span>
            {notification.senderName ||
              notification.createdBy?.username ||
              notification.createdBy?.email ||
              'System'}
          </p>
        )}

        {!compact && notification.entityId && (
          <p className="text-[11px] text-gray-500 mt-1 font-mono">
            ID: {notification.entityId}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-gray-400 font-medium">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
          {notification.relatedId && (
            <span className="font-mono text-gray-500">{notification.relatedId}</span>
          )}
          {isUnread ? (
            <span className="text-blue-600 font-black uppercase tracking-widest">● Unread</span>
          ) : (
            <span className="uppercase tracking-widest">Read</span>
          )}
        </div>

        {!compact && (
          <div className="mt-3 flex flex-wrap items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isUnread ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkRead?.(notification.id)
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 hover:bg-gray-50"
              >
                <Check className="w-3 h-3" /> Mark read
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkUnread?.(notification.id)
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 hover:bg-gray-50"
              >
                Mark unread
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onArchive?.(notification.id)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 hover:bg-gray-50"
            >
              <Archive className="w-3 h-3" /> Archive
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(notification.id)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-100 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700"
            >
              View <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {compact && (
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4 text-gray-300" />
        </div>
      )}
    </article>
  )
}

export function NotificationCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl border border-gray-100 animate-pulse flex gap-3">
      <div className="w-10 h-10 rounded-xl bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/4" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
    </div>
  )
}
