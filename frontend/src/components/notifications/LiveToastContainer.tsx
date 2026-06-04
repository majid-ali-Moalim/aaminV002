'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Activity, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { useNotificationSocket } from '@/lib/useNotificationSocket'
import type { AppNotification } from '@/lib/notifications/types'

export default function LiveToastContainer() {
  const [mounted, setMounted] = useState(false)
  const [toasts, setToasts] = useState<AppNotification[]>([])
  const { recent } = useNotificationStore()

  useNotificationSocket()

  useEffect(() => {
    setMounted(true)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    if (!mounted || !recent.length) return
    const latest = recent[0]
    if (latest.priority !== 'CRITICAL' && latest.category !== 'BROADCAST') return

    setToasts((prev) => {
      if (prev.some((t) => t.id === latest.id)) return prev
      const next = [latest, ...prev].slice(0, 3)
      setTimeout(() => removeToast(latest.id), 8000)
      return next
    })
  }, [recent, removeToast, mounted])

  if (!mounted || toasts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-20 left-6 z-[100] flex flex-col gap-3 w-80 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-l-4 border-red-600 rounded-2xl shadow-2xl shadow-red-900/10 p-4 animate-in slide-in-from-left duration-500 flex gap-3 group relative overflow-hidden"
        >
          <div className="absolute bottom-0 left-0 h-1 bg-red-600/20 w-full">
            <div className="h-full bg-red-600 animate-out slide-out-to-left duration-[8000ms] ease-linear" />
          </div>

          <div className="shrink-0 w-10 h-10 bg-red-50 dark:bg-red-950/50 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-red-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                {toast.priority} ALERT
              </span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h4 className="text-xs font-black text-gray-900 dark:text-white truncate mb-1">{toast.title}</h4>
            <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed mb-2">{toast.message}</p>

            <Link
              href={toast.actionUrl || '/admin/notifications'}
              onClick={() => removeToast(toast.id)}
              className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
            >
              Open now <ExternalLink className="w-2 h-2" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
