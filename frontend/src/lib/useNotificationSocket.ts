'use client'

import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import type { AppNotification, NotificationStats } from '@/lib/notifications/types'

const SOCKET_URL = 'http://localhost:3001'

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
      if (payload.priority === 'CRITICAL' || payload.category === 'BROADCAST') {
        playAlertSound()
        toast.error(`${payload.title}: ${payload.message}`, {
          duration: 8000,
          icon: payload.category === 'BROADCAST' ? '📢' : '🚨',
        })
      } else if (payload.priority === 'HIGH') {
        toast(payload.title, { icon: '🔔', duration: 5000 })
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
