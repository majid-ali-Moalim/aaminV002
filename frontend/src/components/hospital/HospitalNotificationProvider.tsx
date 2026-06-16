'use client'

import { ReactNode, useEffect } from 'react'
import { useNotificationSocket } from '@/lib/useNotificationSocket'
import { notificationsService } from '@/lib/api'
import { useNotificationStore } from '@/lib/stores/notificationStore'

export function HospitalNotificationProvider({ children }: { children: ReactNode }) {
  useNotificationSocket()
  const { setRecent, setStats } = useNotificationStore()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [inbox, stats] = await Promise.all([
          notificationsService.getInbox({ category: 'HOSPITAL', limit: 50 }),
          notificationsService.getStats(),
        ])
        if (cancelled) return
        const items = Array.isArray(inbox?.items) ? inbox.items : Array.isArray(inbox) ? inbox : []
        setRecent(items)
        if (stats) setStats(stats)
      } catch {
        /* optional */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setRecent, setStats])

  return <>{children}</>
}
