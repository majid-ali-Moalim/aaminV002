'use client'

import { useEffect } from 'react'
import { useNotificationSocket } from '@/lib/useNotificationSocket'
import DesktopNotificationInit from '@/components/notifications/DesktopNotificationInit'
import WindowsToastStack from '@/components/notifications/WindowsToastStack'
import { driverNotificationsApi } from '@/lib/driverApi'
import { notificationsService } from '@/lib/api'
import { useDriverStore } from '@/lib/stores/driverStore'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import type { AppNotification } from '@/lib/notifications/types'
import LiveNotificationAlert from '@/components/notifications/LiveNotificationAlert'
import AckNotificationModal from '@/components/notifications/AckNotificationModal'

/** Real-time mission alerts for drivers (shared notification socket). */
export function DriverNotificationProvider({ children }: { children: React.ReactNode }) {
  useNotificationSocket()
  const { setUnreadCount } = useDriverStore()
  const showAckModal = useNotificationStore((s) => s.showAckModal)

  useEffect(() => {
    driverNotificationsApi
      .get(1, 1)
      .then((data) => {
        if (typeof data?.unreadCount === 'number') setUnreadCount(data.unreadCount)
      })
      .catch(() => {})
  }, [setUnreadCount])

  useEffect(() => {
    notificationsService
      .getInbox({ limit: 20, unreadOnly: true })
      .then((data) => {
        const pending = data?.items?.find(
          (n: AppNotification) =>
            n.status === 'UNREAD' &&
            (n.eventKey === 'MISSION_REASSIGNED' || n.requiresAckModal),
        )
        if (pending) showAckModal(pending)
      })
      .catch(() => {})
  }, [showAckModal])

  return (
    <>
      <DesktopNotificationInit />
      {children}
      <WindowsToastStack />
      <LiveNotificationAlert />
      <AckNotificationModal />
    </>
  )
}
