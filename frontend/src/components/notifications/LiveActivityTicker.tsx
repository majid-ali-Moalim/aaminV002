'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import { notificationsService } from '@/lib/api'
import Link from 'next/link'

export default function LiveActivityTicker() {
  const [latestAlert, setLatestAlert] = useState<any>(null)

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const recent = await notificationsService.getRecent()
        if (recent && recent.length > 0) {
          const critical = recent.find((n: any) => n.priority === 'CRITICAL' || n.type === 'EMERGENCY')
          setLatestAlert(critical || recent[0])
        }
      } catch (err) {
        console.error('Ticker fetch error:', err)
      }
    }

    fetchLatest()
    const interval = setInterval(fetchLatest, 15000)
    return () => clearInterval(interval)
  }, [])

  if (!latestAlert) {
    return (
      <div className="admin-ticker border-dashed">
        <span className="truncate text-[11px] font-medium text-admin-text-muted">
          No recent activity
        </span>
      </div>
    )
  }

  const isCritical = latestAlert.priority === 'CRITICAL'

  return (
    <div className="admin-ticker">
      <div className="relative flex h-2 w-2 shrink-0">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
            isCritical ? 'bg-red-400' : 'bg-blue-400'
          }`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            isCritical ? 'bg-red-500' : 'bg-blue-500'
          }`}
        />
      </div>

      <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-admin-text-muted">
        {latestAlert.type}
      </span>

      <Link
        href={latestAlert.actionUrl || `/admin/notifications?id=${latestAlert.id}`}
        className="min-w-0 flex-1 truncate text-[11px] font-semibold text-admin-text-secondary hover:text-red-600 dark:hover:text-red-400"
        title={`${latestAlert.title}: ${latestAlert.message}`}
      >
        {latestAlert.title}: {latestAlert.message}
      </Link>

      <TrendingUp className="h-3.5 w-3.5 shrink-0 text-admin-text-muted" />
    </div>
  )
}
