'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import type { AppNotification } from '@/lib/notifications/types'

function resolveHref(notification: AppNotification) {
  return notification.redirectUrl || notification.actionUrl || null
}

export default function LiveNotificationAlert() {
  const latest = useNotificationStore((state) => state.recent[0])
  const mountedAt = useRef(Date.now())
  const seenId = useRef<string | null>(null)
  const [visibleNotification, setVisibleNotification] = useState<AppNotification | null>(null)

  useEffect(() => {
    if (!latest || latest.id === seenId.current) return

    const createdAt = new Date(latest.createdAt).getTime()
    if (Number.isFinite(createdAt) && createdAt < mountedAt.current - 3000) {
      seenId.current = latest.id
      return
    }

    seenId.current = latest.id
    setVisibleNotification(latest)
    const timer = window.setTimeout(() => setVisibleNotification(null), 9000)
    return () => window.clearTimeout(timer)
  }, [latest])

  if (!visibleNotification) return null

  const href = resolveHref(visibleNotification)
  const priorityTone =
    visibleNotification.priority === 'CRITICAL'
      ? 'border-red-500 bg-red-950/95'
      : visibleNotification.priority === 'HIGH'
        ? 'border-orange-500 bg-zinc-950/95'
        : 'border-blue-500 bg-zinc-950/95'

  const open = () => {
    if (href) window.location.href = href
  }

  return (
    <div className="fixed right-5 top-5 z-[1000] max-w-sm">
      <div className={`rounded-2xl border-l-4 ${priorityTone} text-white shadow-2xl ring-1 ring-white/10`}>
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 rounded-xl bg-white/10 p-2">
            <Bell size={18} />
          </div>
          <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">
              {visibleNotification.priority} Alert
            </p>
            <h3 className="mt-1 text-sm font-black">{visibleNotification.title}</h3>
            <p className="mt-1 text-xs leading-5 text-white/75">{visibleNotification.message}</p>
            {href && <p className="mt-2 text-[11px] font-bold text-red-200">Tap to open</p>}
          </button>
          <button
            type="button"
            aria-label="Dismiss notification alert"
            className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white"
            onClick={() => setVisibleNotification(null)}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
