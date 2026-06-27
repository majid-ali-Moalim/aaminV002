'use client'

import { useEffect } from 'react'
import { useNotificationSocket } from '@/lib/useNotificationSocket'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { notificationsService } from '@/lib/api'
import LiveNotificationAlert from '@/components/notifications/LiveNotificationAlert'

/** Connects nurse panel to real-time notification socket + initial inbox sync. */
export function NurseNotificationProvider({ children }: { children: React.ReactNode }) {
  useNotificationSocket()
  const { setRecent, setStats } = useNotificationStore()

  useEffect(() => {
    notificationsService
      .getInbox({ limit: 30 })
      .then((data: any) => {
        if (data?.items) setRecent(data.items)
      })
      .catch(() => {})
    notificationsService
      .getStats()
      .then(setStats)
      .catch(() => {})
  }, [setRecent, setStats])

  return (
    <>
      {children}
      <LiveNotificationAlert />
    </>
  )
}
