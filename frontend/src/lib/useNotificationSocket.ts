'use client'

import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import type { AppNotification, NotificationStats } from '@/lib/notifications/types'
import { resolveNurseNotificationUrl } from '@/lib/nurse/nurseNotificationRoutes'
import { resolveDriverNotificationUrl } from '@/lib/driver/driverNotificationRoutes'

const SOCKET_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '')

let globalSocket: Socket | null = null

function playAlertSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.value = 0.08
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    /* optional */
  }
}

function resolveLiveNotificationUrl(payload: AppNotification): string {
  if (typeof window === 'undefined') return '/admin/notifications'
  const path = window.location.pathname
  if (path.startsWith('/nurse')) return resolveNurseNotificationUrl(payload)
  if (path.startsWith('/driver')) return resolveDriverNotificationUrl(payload)
  return payload.redirectUrl || payload.actionUrl || '/admin/notifications'
}

export function useNotificationSocket() {
  const { prependNotification, setStats, setConnected } = useNotificationStore()

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return

    if (!globalSocket) {
      globalSocket = io(`${SOCKET_URL}/notifications`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      })
    }

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    const onNotification = (payload: AppNotification) => {
      prependNotification(payload)
      const href = resolveLiveNotificationUrl(payload)
      const toastOpts = {
        duration: payload.priority === 'CRITICAL' ? 8000 : 5000,
        onClick: () => {
          window.location.href = href
        },
      }
      if (payload.priority === 'CRITICAL' || payload.category === 'BROADCAST') {
        playAlertSound()
        toast.error(`${payload.title}: ${payload.message}`, {
          ...toastOpts,
          icon: payload.category === 'BROADCAST' ? '📢' : '🚨',
        })
      } else if (payload.priority === 'HIGH' || payload.category === 'MISSION') {
        toast(`${payload.title}: ${payload.message}`, { ...toastOpts, icon: '🔔' })
      }
    }

    const onStats = (stats: NotificationStats) => setStats(stats)

    globalSocket.on('connect', onConnect)
    globalSocket.on('disconnect', onDisconnect)
    globalSocket.on('notification', onNotification)
    globalSocket.on('notification_stats', onStats)

    if (globalSocket.connected) setConnected(true)

    return () => {
      globalSocket?.off('connect', onConnect)
      globalSocket?.off('disconnect', onDisconnect)
      globalSocket?.off('notification', onNotification)
      globalSocket?.off('notification_stats', onStats)
    }
  }, [prependNotification, setStats, setConnected])
}
