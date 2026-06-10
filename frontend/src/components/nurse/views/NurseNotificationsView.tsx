'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Bell,
  CheckSquare,
  ExternalLink,
  Loader2,
  Radio,
} from 'lucide-react'
import { notificationsService } from '@/lib/api'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { resolveNurseNotificationUrl } from '@/lib/nurse/nurseNotificationRoutes'
import type { AppNotification } from '@/lib/notifications/types'

export default function NurseNotificationsView() {
  const router = useRouter()
  const { recent, stats, connected, setRecent, setStats, markLocalRead, markAllLocalRead } =
    useNotificationStore()
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const load = async () => {
    try {
      const [inbox, inboxStats] = await Promise.all([
        notificationsService.getInbox({ limit: 50 }),
        notificationsService.getStats(),
      ])
      if (inbox?.items) setRecent(inbox.items)
      if (inboxStats) setStats(inboxStats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // Merge socket prepends — store already updated by useNotificationSocket
  const items = useMemo(() => {
    const list = recent.length ? recent : []
    return filter === 'unread' ? list.filter((n) => n.status === 'UNREAD' || n.isUnread) : list
  }, [recent, filter])

  const markAll = async () => {
    try {
      await notificationsService.markAllRead()
      markAllLocalRead()
      toast.success('All marked as read')
    } catch {
      toast.error('Could not mark all read')
    }
  }

  const openNotification = async (n: AppNotification) => {
    try {
      if (n.status === 'UNREAD' || n.isUnread) {
        await notificationsService.markRead(n.id)
        markLocalRead(n.id)
      }
    } catch {
      markLocalRead(n.id)
    }
    const href = resolveNurseNotificationUrl(n)
    router.push(href)
  }

  const unread = stats?.unread ?? items.filter((n) => n.status === 'UNREAD').length

  return (
    <div className="space-y-4">
      <div className="nurse-notif-status-bar">
        <span className={`nurse-live-pill${connected ? '' : ' offline'}`}>
          {connected ? '● Real-time connected' : '○ Connecting…'}
        </span>
        <span className="text-sm text-zinc-400 flex items-center gap-2">
          <Bell size={14} /> {unread} unread
        </span>
        {unread > 0 && (
          <button type="button" className="nurse-btn ghost" onClick={markAll}>
            <CheckSquare size={16} />
            Mark all read
          </button>
        )}
      </div>

      <div className="nurse-notif-filters">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`nurse-notif-filter${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="nurse-loading">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : items.length === 0 ? (
        <div className="nurse-empty-card">No notifications yet. Mission alerts will appear here in real time.</div>
      ) : (
        <div className="nurse-card-stack">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`nurse-notif-card clickable${n.status === 'UNREAD' || n.isUnread ? ' unread' : ''}`}
              onClick={() => openNotification(n)}
            >
              <div className="nurse-notif-card-top">
                <span className={`nurse-notif-type ${(n.category || 'SYSTEM').toLowerCase()}`}>
                  {n.category || n.type}
                </span>
                {n.priority && (
                  <span className={`nurse-priority ${n.priority.toLowerCase()}`}>{n.priority}</span>
                )}
              </div>
              <p className="nurse-notif-title">{n.title}</p>
              <p className="nurse-notif-msg">{n.message}</p>
              <div className="nurse-notif-footer">
                <span className="nurse-notif-time">
                  {n.createdAt ? format(new Date(n.createdAt), 'MMM d, h:mm a') : ''}
                </span>
                {n.senderName && (
                  <span className="nurse-notif-sender">
                    <Radio size={11} /> {n.senderName}
                  </span>
                )}
                <ExternalLink size={12} className="nurse-notif-link-icon" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
