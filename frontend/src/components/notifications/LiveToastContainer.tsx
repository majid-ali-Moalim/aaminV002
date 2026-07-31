'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Activity, CheckCircle2, ExternalLink, Megaphone, X } from 'lucide-react'
import Link from 'next/link'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import type { AppNotification } from '@/lib/notifications/types'
import { hasNotificationBeenShown, markNotificationShown } from '@/lib/notifications/shownAlerts'

type ToastKind = 'critical' | 'broadcast' | 'mission'

function toastKind(n: AppNotification): ToastKind | null {
  if (n.category === 'MISSION' || n.eventKey === 'MISSION_COMPLETED') return 'mission'
  if (n.category === 'BROADCAST') return 'broadcast'
  if (n.priority === 'CRITICAL') return 'critical'
  return null
}

const KIND_STYLES: Record<
  ToastKind,
  { border: string; badge: string; badgeText: string; icon: React.ElementType; iconBg: string; iconColor: string }
> = {
  critical: {
    border: 'border-red-600',
    badge: 'text-red-600',
    badgeText: 'CRITICAL ALERT',
    icon: Activity,
    iconBg: 'bg-red-50 dark:bg-red-950/50',
    iconColor: 'text-red-600',
  },
  broadcast: {
    border: 'border-amber-500',
    badge: 'text-amber-600',
    badgeText: 'BROADCAST',
    icon: Megaphone,
    iconBg: 'bg-amber-50 dark:bg-amber-950/50',
    iconColor: 'text-amber-600',
  },
  mission: {
    border: 'border-emerald-600',
    badge: 'text-emerald-600',
    badgeText: 'MISSION UPDATE',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600',
  },
}

export default function LiveToastContainer() {
  const [mounted, setMounted] = useState(false)
  const [toasts, setToasts] = useState<AppNotification[]>([])
  const { recent } = useNotificationStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const removeToast = useCallback((id: string) => {
    markNotificationShown(id)
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    if (!mounted || !recent.length) return
    const latest = recent[0]
    const kind = toastKind(latest)
    if (!kind) return
    if (hasNotificationBeenShown(latest.id)) return

    markNotificationShown(latest.id)
    setToasts((prev) => {
      if (prev.some((t) => t.id === latest.id)) return prev
      const next = [latest, ...prev].slice(0, 3)
      setTimeout(() => removeToast(latest.id), kind === 'mission' ? 6000 : 8000)
      return next
    })
  }, [recent, removeToast, mounted])

  if (!mounted || toasts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-20 left-6 z-[100] flex flex-col gap-3 w-80 pointer-events-none">
      {toasts.map((toast) => {
        const kind = toastKind(toast) ?? 'critical'
        const styles = KIND_STYLES[kind]
        const Icon = styles.icon
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-l-4 ${styles.border} rounded-2xl shadow-2xl p-4 animate-in slide-in-from-left duration-500 flex gap-3 group relative overflow-hidden`}
          >
            <div className="absolute bottom-0 left-0 h-1 bg-slate-200/80 w-full">
              <div
                className={`h-full ${kind === 'mission' ? 'bg-emerald-600' : kind === 'broadcast' ? 'bg-amber-500' : 'bg-red-600'} animate-out slide-out-to-left ease-linear`}
                style={{ animationDuration: kind === 'mission' ? '6000ms' : '8000ms' }}
              />
            </div>

            <div className={`shrink-0 w-10 h-10 ${styles.iconBg} rounded-xl flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${styles.iconColor}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-black uppercase tracking-widest ${styles.badge}`}>
                  {styles.badgeText}
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
                href={toast.actionUrl || toast.redirectUrl || '/admin/notifications'}
                onClick={() => removeToast(toast.id)}
                className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
              >
                View in notifications <ExternalLink className="w-2 h-2" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
