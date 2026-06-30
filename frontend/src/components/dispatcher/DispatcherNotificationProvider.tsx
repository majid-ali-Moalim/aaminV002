'use client'

import { useEffect } from 'react'
import { mutate } from 'swr'
import { useNotificationSocket } from '@/lib/useNotificationSocket'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import LiveNotificationAlert from '@/components/notifications/LiveNotificationAlert'

/** Real-time alerts for dispatcher portal (shared notification socket). */
export function DispatcherNotificationProvider({ children }: { children: React.ReactNode }) {
  useNotificationSocket()

  useEffect(() => {
    dispatcherDashboardApi
      .getNotificationStats()
      .then(() => mutate('dispatcher-notification-stats'))
      .catch(() => {})
  }, [])

  return (
    <>
      {children}
      <LiveNotificationAlert />
    </>
  )
}
