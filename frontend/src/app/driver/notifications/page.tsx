'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { useDriverStore } from '@/lib/stores/driverStore'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import DriverModuleShell from '@/components/driver/DriverModuleShell'
import { getModuleById } from '@/lib/driver/navigation'
import { driverNotificationsApi } from '@/lib/driverApi'
import { resolveDriverNotificationUrl } from '@/lib/driver/driverNotificationRoutes'
import { Bell, CheckSquare, Clock, AlertTriangle, Info, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

type DriverNotification = {
  id: string
  title: string
  message: string
  type?: string
  category?: string
  priority?: string
  status: 'UNREAD' | 'READ'
  createdAt: string
  redirectUrl?: string | null
  actionUrl?: string | null
  entityType?: string | null
  entityId?: string | null
  eventKey?: string | null
}

export default function DriverNotificationsPage() {
  const router = useRouter()
  const { isAuthenticated, unreadCount, setUnreadCount } = useDriverStore()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<DriverNotification[]>([])

  const load = useCallback(async () => {
    try {
      const data = await driverNotificationsApi.get(1, 50)
      const list = Array.isArray(data?.notifications) ? data.notifications : []
      setNotifications(list)
      if (typeof data?.unreadCount === 'number') setUnreadCount(data.unreadCount)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [setUnreadCount])

  useEffect(() => {
    if (!isAuthenticated) router.push('/driver/login')
    else load()
  }, [isAuthenticated, router, load])

  const handleMarkAllRead = async () => {
    try {
      await driverNotificationsApi.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })))
      setUnreadCount(0)
    }
  }

  const openNotification = async (notif: DriverNotification) => {
    try {
      if (notif.status === 'UNREAD') {
        await driverNotificationsApi.markRead(notif.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, status: 'READ' } : n)),
        )
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, status: 'READ' } : n)),
      )
    }
    router.push(resolveDriverNotificationUrl(notif))
  }

  return (
    <DriverPageLayout title="Notifications">
      <DriverModuleShell
        module={getModuleById('notifications')!}
        description="Mission assignments and dispatch alerts open in your Case Workspace."
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-500" />
            Alert Feed ({unreadCount})
          </h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="driver-loading-inline">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">No notifications yet.</p>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((notif) => {
              const isUnread = notif.status === 'UNREAD'
              const isEmergency =
                notif.category === 'MISSION' ||
                notif.type === 'EMERGENCY' ||
                notif.priority === 'CRITICAL'
              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => openNotification(notif)}
                  className={`w-full text-left border rounded-2xl p-4 flex gap-3.5 transition-all ${
                    isUnread
                      ? 'bg-zinc-950 border-red-900/40 hover:border-red-800'
                      : 'bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-800'
                  }`}
                >
                  <div className="shrink-0">
                    {isEmergency ? (
                      <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-900 flex items-center justify-center text-red-500">
                        <AlertTriangle size={16} />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-900 flex items-center justify-center text-blue-500">
                        <Info size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-black truncate ${isUnread ? 'text-white' : 'text-zinc-400'}`}>
                        {notif.title}
                      </h4>
                      {isUnread && <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />}
                    </div>
                    <p className={`text-xs leading-relaxed ${isUnread ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 pt-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {notif.createdAt
                          ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </DriverModuleShell>
    </DriverPageLayout>
  )
}
