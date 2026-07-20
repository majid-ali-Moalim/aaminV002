'use client'

import { useEffect } from 'react'
import { useNotificationSocket } from '@/lib/useNotificationSocket'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { notificationsService } from '@/lib/api'
import type { AppNotification } from '@/lib/notifications/types'
import LiveNotificationAlert from '@/components/notifications/LiveNotificationAlert'
import AckNotificationModal from '@/components/notifications/AckNotificationModal'

/** Connects nurse panel to real-time notification socket + initial inbox sync. */
export function NurseNotificationProvider({ children }: { children: React.ReactNode }) {
  useNotificationSocket()
  const { setRecent, setStats } = useNotificationStore()

  useEffect(() => {
    notificationsService
      .getInbox({ limit: 30 })
      .then((data: { items?: AppNotification[] }) => {
        if (data?.items) setRecent(data.items)
        const pending = data?.items?.find(
          (n) =>
            n.status === 'UNREAD' &&
            (n.eventKey === 'MISSION_REASSIGNED' || n.requiresAckModal),
        )
        if (pending) useNotificationStore.getState().showAckModal(pending)
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
      <AckNotificationModal />
    </>
  )
}
