'use client'

import { useNotificationSocket } from '@/lib/useNotificationSocket'
import DesktopNotificationInit from '@/components/notifications/DesktopNotificationInit'
import WindowsToastStack from '@/components/notifications/WindowsToastStack'
import LiveNotificationAlert from '@/components/notifications/LiveNotificationAlert'

/** Real-time socket + Windows desktop popups for admin portal. */
export function AdminNotificationProvider({ children }: { children: React.ReactNode }) {
  useNotificationSocket()

  return (
    <>
      <DesktopNotificationInit />
      {children}
      <WindowsToastStack />
      <LiveNotificationAlert />
    </>
  )
}
