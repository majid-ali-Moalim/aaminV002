'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Check, Loader2, Search, Wifi, WifiOff } from 'lucide-react'
import { notificationsService } from '@/lib/api'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { useNotificationSocket } from '@/lib/useNotificationSocket'
import NotificationCard from './NotificationCard'
import type { AppNotification, DrawerTabId } from '@/lib/notifications/types'
import { DRAWER_TABS } from '@/lib/notifications/types'

export default function NotificationDrawer() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DrawerTabId>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  const { recent, stats, connected, setRecent, setStats, markLocalRead, markAllLocalRead, removeLocal } =
    useNotificationStore()

  useNotificationSocket()

  const loadFeed = useCallback(
    async (reset = false) => {
      const nextOffset = reset ? 0 : offset
      if (reset) setLoading(true)
      else setLoadingMore(true)

      try {
        const params: Record<string, string | number | boolean> = {
          limit: 15,
          offset: nextOffset,
        }
        if (search.trim()) params.search = search.trim()
        if (activeTab === 'UNREAD') params.unreadOnly = true
        if (activeTab === 'CRITICAL') params.criticalOnly = true
        if (['MISSION', 'COMMUNICATION', 'ATTENDANCE'].includes(activeTab)) {
          params.category = activeTab
        }

        const [inbox, statsData] = await Promise.all([
          notificationsService.getInbox(params),
          reset ? notificationsService.getStats() : Promise.resolve(null),
        ])

        const items = (inbox?.items ?? []) as AppNotification[]
        setRecent(reset ? items : [...recent, ...items.filter((n) => !recent.some((r) => r.id === n.id))])
        setHasMore(inbox?.hasMore ?? false)
        setOffset(nextOffset + items.length)
        if (statsData) setStats(statsData)
      } catch (err) {
        console.error('Failed to load notifications:', err)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [activeTab, offset, recent, search, setRecent, setStats],
  )

  useEffect(() => {
    loadFeed(true)
    const interval = setInterval(() => {
      if (!isOpen) {
        void notificationsService.getRecent().then((items) => setRecent(items ?? [])).catch(() => {})
        void notificationsService.getStats().then(setStats).catch(() => {})
      }
    }, 30000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) loadFeed(true)
  }, [activeTab, search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleScroll = () => {
    const el = feedRef.current
    if (!el || loadingMore || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      loadFeed(false)
    }
  }

  const handleOpen = (n: AppNotification) => {
    setIsOpen(false)
    router.push(n.redirectUrl || n.actionUrl || '/admin/notifications')
  }

  const handleMarkRead = async (id: string) => {
    markLocalRead(id)
    await notificationsService.markRead(id)
  }

  const handleMarkAllRead = async () => {
    markAllLocalRead()
    await notificationsService.markAllRead()
  }

  const handleArchive = async (id: string) => {
    removeLocal(id)
    await notificationsService.archive(id)
  }

  const handleDelete = async (id: string) => {
    removeLocal(id)
    await notificationsService.remove(id)
  }

  const unread = stats?.unread ?? 0

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <Bell className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[1.25rem] h-5 px-1 bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
        <span
          className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-900 ${
            connected ? 'bg-green-500' : 'bg-gray-300'
          }`}
          title={connected ? 'Live' : 'Polling'}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[min(calc(100vw-1.5rem),28rem)] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl shadow-blue-900/10 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-gray-900 dark:text-white text-sm">Notifications</h3>
              {connected ? (
                <Wifi className="w-3.5 h-3.5 text-green-500" aria-hidden />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-gray-400" aria-hidden />
              )}
              {unread > 0 && (
                <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                  {unread} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800"
            >
              Mark all read
            </button>
          </div>

          <div className="p-3 border-b border-gray-50 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input
                type="search"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 h-10 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex overflow-x-auto border-b border-gray-50 dark:border-gray-800 scrollbar-none">
            {DRAWER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3 py-3 text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30 dark:bg-blue-950/20'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            ref={feedRef}
            onScroll={handleScroll}
            className="max-h-[min(70vh,28rem)] overflow-y-auto custom-scrollbar p-2 space-y-2"
          >
            {loading ? (
              <div className="p-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : recent.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm font-medium">No notifications</div>
            ) : (
              recent.map((item) => (
                <NotificationCard
                  key={item.id}
                  notification={item}
                  compact
                  onOpen={handleOpen}
                  onMarkRead={handleMarkRead}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))
            )}
            {loadingMore && (
              <div className="py-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          <Link
            href="/admin/notifications"
            onClick={() => setIsOpen(false)}
            className="p-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            View notification center
            <Check className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
