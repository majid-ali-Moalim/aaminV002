'use client'

import { useEffect } from 'react'
import { useNotificationSocket } from '@/lib/useNotificationSocket'
import { driverNotificationsApi } from '@/lib/driverApi'
import { useDriverStore } from '@/lib/stores/driverStore'
import LiveNotificationAlert from '@/components/notifications/LiveNotificationAlert'

/** Real-time mission alerts for drivers (shared notification socket). */
export function DriverNotificationProvider({ children }: { children: React.ReactNode }) {
  useNotificationSocket()
  const { setUnreadCount } = useDriverStore()

  useEffect(() => {
    driverNotificationsApi
      .get(1, 1)
      .then((data) => {
        if (typeof data?.unreadCount === 'number') setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
  }, [setUnreadCount])

  return (
    <>
      {children}
      <LiveNotificationAlert />
    </>
  )
}
