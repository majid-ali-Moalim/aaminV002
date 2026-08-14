'use client'

import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  getBrowserNotificationPermission,
  initDesktopNotificationsOnLogin,
} from '@/lib/notifications/browserNotifications'
import { pushEnableNotificationsToast } from '@/lib/notifications/windowsToast'

export default function DesktopNotificationInit() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    const timer = window.setTimeout(async () => {
      await initDesktopNotificationsOnLogin()
      if (getBrowserNotificationPermission() === 'default') {
        pushEnableNotificationsToast()
      }
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [user])

  return null
}
