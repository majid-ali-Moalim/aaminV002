'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Bell,
  Check,
  Loader2,
  Search,
  Settings,
  Megaphone,
  AlertTriangle,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notificationsService } from '@/lib/api'
import NotificationCard, { NotificationCardSkeleton } from './NotificationCard'
import NotificationSettingsPanel from './NotificationSettingsPanel'
import type { AppNotification, NotificationStats } from '@/lib/notifications/types'

const TABS = [
  { id: 'all', label: 'All Notifications' },
  { id: 'unread', label: 'Unread Notifications' },
  { id: 'critical', label: 'Critical Alerts' },
  { id: 'broadcasts', label: 'Broadcast Messages' },
  { id: 'settings', label: 'Notification Settings' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function NotificationCenterHub() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = (searchParams.get('tab') as TabId) || 'all'

  const [items, setItems] = useState<AppNotification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const setTab = (id: TabId) => {
    router.replace(`/admin/notifications?tab=${id}`, { scroll: false })
  }

  const fetchPage = useCallback(
    async (reset = false) => {
      if (tab === 'settings') {
        setLoading(false)
        return
      }

      const nextOffset = reset ? 0 : offset
      if (reset) setLoading(true)
      else setLoadingMore(true)

      try {
        const params: Record<string, string | number | boolean> = {
          limit: 20,
          offset: nextOffset,
        }
        if (search.trim()) params.search = search.trim()
        if (tab === 'unread') params.unreadOnly = true
        if (tab === 'critical') params.criticalOnly = true
        if (tab === 'broadcasts') params.broadcastOnly = true

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
    [offset, search, tab],
  )

  useEffect(() => {
    setOffset(0)
    fetchPage(true)
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => fetchPage(true), 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loadingMore || tab === 'settings') return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchPage(false)
      },
      { rootMargin: '120px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, fetchPage, tab])

  const handleOpen = (n: AppNotification) => {
    router.push(n.redirectUrl || n.actionUrl || '/admin/notifications')
  }

  const statCards = [
    { label: 'Total', value: stats?.total ?? 0, icon: Bell },
    { label: 'Unread', value: stats?.unread ?? 0, icon: Mail },
    { label: 'Critical', value: stats?.critical ?? 0, icon: AlertTriangle },
    { label: 'Broadcasts', value: stats?.broadcasts ?? 0, icon: Megaphone },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-600" />
            Notifications
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Role-based alerts — you only see notifications relevant to your responsibilities
          </p>
        </div>
        {tab !== 'settings' && (
          <Button
            variant="outline"
            className="rounded-xl font-bold h-11"
            onClick={() => notificationsService.markAllRead().then(() => fetchPage(true))}
          >
            <Check className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-t-xl transition-colors flex items-center gap-2 ${
              tab === t.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {t.id === 'settings' && <Settings className="w-3.5 h-3.5" />}
            {t.label}
            {t.id === 'unread' && (stats?.unread ?? 0) > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {stats!.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'settings' ? (
        <NotificationSettingsPanel />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800"
              >
                <s.icon className="w-5 h-5 text-gray-400 mb-2" />
                <p className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              <input
                type="search"
                placeholder="Search notifications..."
                className="w-full pl-12 pr-6 h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/10 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <NotificationCardSkeleton key={i} />)
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
            <div className="bg-white dark:bg-gray-900 rounded-3xl border p-16 text-center">
              <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-black text-gray-900 dark:text-white">No notifications</h3>
              <p className="text-gray-500 text-sm mt-1">
                {tab === 'unread'
                  ? 'You are all caught up.'
                  : 'Notifications appear here when events affect your role.'}
              </p>
            </div>
          )}

          <div ref={sentinelRef} className="h-4" />
          {loadingMore && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
