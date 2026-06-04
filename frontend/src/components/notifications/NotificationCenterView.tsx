'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Check,
  Loader2,
  Search,
  Megaphone,
  MessageSquare,
  Truck,
  Users,
  Building2,
  ShieldAlert,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notificationsService } from '@/lib/api'
import NotificationCard, { NotificationCardSkeleton } from './NotificationCard'
import type { AppNotification, NotificationCategory, NotificationStats } from '@/lib/notifications/types'
import { CATEGORY_LABELS } from '@/lib/notifications/types'

const CATEGORY_ICONS: Record<NotificationCategory, React.ElementType> = {
  MISSION: Truck,
  COMMUNICATION: MessageSquare,
  ATTENDANCE: Users,
  HOSPITAL: Building2,
  INCIDENT: ShieldAlert,
  SYSTEM: Settings,
  BROADCAST: Megaphone,
}

export interface NotificationCenterViewProps {
  title: string
  description: string
  category?: NotificationCategory
  defaultPriority?: string
  showBroadcastActions?: boolean
}

export default function NotificationCenterView({
  title,
  description,
  category,
  defaultPriority,
}: NotificationCenterViewProps) {
  const router = useRouter()
  const [items, setItems] = useState<AppNotification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState(defaultPriority ?? '')
  const [status, setStatus] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(
    async (reset = false) => {
      const nextOffset = reset ? 0 : offset
      if (reset) setLoading(true)
      else setLoadingMore(true)

      try {
        const params: Record<string, string | number | boolean> = {
          limit: 20,
          offset: nextOffset,
        }
        if (category) params.category = category
        if (search.trim()) params.search = search.trim()
        if (priority) params.priority = priority
        if (status) params.status = status

        const [inbox, statsData] = await Promise.all([
          notificationsService.getInbox(params),
          reset ? notificationsService.getStats() : Promise.resolve(null),
        ])

        const pageItems = (inbox?.items ?? []) as AppNotification[]
        setItems((prev) => (reset ? pageItems : [...prev, ...pageItems]))
        setHasMore(inbox?.hasMore ?? false)
        setOffset(nextOffset + pageItems.length)
        if (statsData) setStats(statsData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [category, offset, priority, search, status],
  )

  useEffect(() => {
    fetchPage(true)
  }, [category, priority, status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => fetchPage(true), 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loadingMore) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchPage(false)
      },
      { rootMargin: '120px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, fetchPage])

  const handleOpen = (n: AppNotification) => {
    router.push(n.actionUrl || '/admin/notifications')
  }

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, color: 'text-blue-600' },
    { label: 'Unread', value: stats?.unread ?? 0, color: 'text-red-600' },
    { label: 'Critical', value: stats?.critical ?? 0, color: 'text-orange-600' },
    { label: 'Resolved', value: stats?.resolved ?? 0, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl font-bold h-11"
          onClick={() => notificationsService.markAllRead().then(() => fetchPage(true))}
        >
          <Check className="w-4 h-4 mr-2" />
          Mark all read
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800"
          >
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm p-4 border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
            <input
              type="search"
              placeholder="Search title, message, sender, or record ID..."
              className="w-full pl-12 pr-6 h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/10 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              className="h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 font-bold text-sm min-w-[130px]"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">All priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select
              className="h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 font-bold text-sm min-w-[130px]"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All status</option>
              <option value="UNREAD">Unread</option>
              <option value="READ">Read</option>
              <option value="ARCHIVED">Archived</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {!category && stats?.categoryCounts && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((cat) => {
            const Icon = CATEGORY_ICONS[cat]
            const count = stats.categoryCounts?.[cat] ?? 0
            return (
              <span
                key={cat}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300"
              >
                <Icon className="w-3.5 h-3.5" />
                {CATEGORY_LABELS[cat]} ({count})
              </span>
            )
          })}
        </div>
      )}

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <NotificationCardSkeleton key={i} />)
          : items.map((item) => (
              <NotificationCard
                key={item.id}
                notification={item}
                onOpen={handleOpen}
                onMarkRead={async (id) => {
                  await notificationsService.markRead(id)
                  fetchPage(true)
                }}
                onMarkUnread={async (id) => {
                  await notificationsService.markUnread(id)
                  fetchPage(true)
                }}
                onArchive={async (id) => {
                  await notificationsService.archive(id)
                  fetchPage(true)
                }}
                onDelete={async (id) => {
                  if (!confirm('Delete this notification?')) return
                  await notificationsService.remove(id)
                  fetchPage(true)
                }}
              />
            ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-16 text-center">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-black text-gray-900 dark:text-white">No notifications found</h3>
          <p className="text-gray-500 text-sm mt-1">Adjust filters or check back later.</p>
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  )
}
