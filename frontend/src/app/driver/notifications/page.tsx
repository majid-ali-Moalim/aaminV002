'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useDriverStore } from '@/lib/stores/driverStore'
import { DriverPageLayout } from '@/components/driver/DriverPageLayout'
import DriverModuleShell from '@/components/driver/DriverModuleShell'
import { getModuleById } from '@/lib/driver/navigation'
import { driverNotificationsApi } from '@/lib/driverApi'
import { Bell, CheckSquare, Clock, AlertTriangle, Info, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  title: string
  message: string
  type: 'emergency' | 'system' | 'alert'
  status: 'UNREAD' | 'READ'
  createdAt: string
}

export default function DriverNotificationsPage() {
  const router = useRouter()
  const { isAuthenticated, unreadCount, setUnreadCount } = useDriverStore()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'New Mission Assigned', message: 'Proceed to 128 Main St. immediately. Priority: CRITICAL.', type: 'emergency', status: 'UNREAD', createdAt: '10 mins ago' },
    { id: '2', title: 'Road Blockage Alert', message: 'Main St. closed due to construction. Use 5th Ave instead.', type: 'alert', status: 'UNREAD', createdAt: '1 hour ago' },
    { id: '3', title: 'Shift Reminder', message: 'Your Morning shift starts in 30 minutes. Remember to clock in.', type: 'system', status: 'READ', createdAt: '1 day ago' },
  ])

  useEffect(() => {
    if (!isAuthenticated) router.push('/driver/login')
  }, [isAuthenticated, router])

  const handleMarkAllRead = async () => {
    try {
      await driverNotificationsApi.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (_) {
      // Fallback in case of mock/offline
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'READ' })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await driverNotificationsApi.markRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n))
      )
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (_) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n))
      )
      setUnreadCount(Math.max(0, unreadCount - 1))
    }
  }

  return (
    <DriverPageLayout title="Notifications">
      <DriverModuleShell module={getModuleById('notifications')!} description="Mission updates, shift reminders, dispatcher messages, and emergency broadcasts.">
        {/* Actions Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-500" />
            Alert Feed ({unreadCount})
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div className="space-y-2.5">
          {notifications.map((notif) => {
            const isUnread = notif.status === 'UNREAD'
            return (
              <div
                key={notif.id}
                onClick={() => isUnread && handleMarkRead(notif.id)}
                className={`border rounded-2xl p-4 flex gap-3.5 transition-all cursor-pointer ${
                  isUnread
                    ? 'bg-zinc-950 border-red-900/40 hover:border-red-800'
                    : 'bg-zinc-900/20 border-zinc-800/50 hover:border-zinc-800'
                }`}
              >
                {/* Icon */}
                <div className="shrink-0">
                  {notif.type === 'emergency' ? (
                    <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-900 flex items-center justify-center text-red-500">
                      <AlertTriangle size={16} className="animate-pulse" />
                    </div>
                  ) : notif.type === 'alert' ? (
                    <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-900 flex items-center justify-center text-amber-500">
                      <AlertTriangle size={16} />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-900 flex items-center justify-center text-blue-500">
                      <Info size={16} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-black truncate ${isUnread ? 'text-white' : 'text-zinc-400'}`}>
                      {notif.title}
                    </h4>
                    {isUnread && (
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed ${isUnread ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500 pt-1">
                    <Clock className="w-3 h-3" />
                    <span>{notif.createdAt}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </DriverModuleShell>
    </DriverPageLayout>
  )
}
