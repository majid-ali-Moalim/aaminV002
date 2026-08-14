'use client'

import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import type { AppNotification, NotificationStats } from '@/lib/notifications/types'
import { resolveNurseNotificationUrl } from '@/lib/nurse/nurseNotificationRoutes'
import { resolveDriverNotificationUrl } from '@/lib/driver/driverNotificationRoutes'
import { dispatchMissionAssignedEvent } from '@/lib/mission/missionAssignedEvents'
import { useDriverStore } from '@/lib/stores/driverStore'
import { hasNotificationBeenShown, markNotificationShown } from '@/lib/notifications/shownAlerts'
import {
  playNotificationSoundIfEnabled,
  showBrowserNotification,
  showMissionAssignedDesktopNotification,
  usesWindowsStyleToast,
} from '@/lib/notifications/browserNotifications'

const SOCKET_URL = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:3001'
).replace(/\/$/, '')

let globalSocket: Socket | null = null
let socketHandlersBound = false

function playAlertSound() {
  playNotificationSoundIfEnabled()
}

function resolveLiveNotificationUrl(payload: AppNotification): string {
  if (typeof window === 'undefined') return '/admin/notifications'
  const path = window.location.pathname
  if (path.startsWith('/nurse')) return resolveNurseNotificationUrl(payload)
  if (path.startsWith('/driver')) return resolveDriverNotificationUrl(payload)
  return payload.redirectUrl || payload.actionUrl || '/admin/notifications'
}

function ensureSocketListeners() {
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

  if (socketHandlersBound) return
  socketHandlersBound = true

  const { prependNotification, setStats, setConnected } = useNotificationStore.getState()

  globalSocket.on('connect', () => setConnected(true))
  globalSocket.on('disconnect', () => setConnected(false))

  globalSocket.on('notification', (payload: AppNotification) => {
    prependNotification(payload)

    const needsAckModal =
      payload.requiresAckModal === true || payload.eventKey === 'MISSION_REASSIGNED'

    if (needsAckModal) {
      if (!hasNotificationBeenShown(payload.id)) {
        markNotificationShown(payload.id)
        playAlertSound()
      }
      useNotificationStore.getState().showAckModal(payload)
      return
    }

    if (hasNotificationBeenShown(payload.id)) return

    const href = resolveLiveNotificationUrl(payload)
    showBrowserNotification(payload, href)

    const isWindowsToast = usesWindowsStyleToast(payload.eventKey) || payload.category === 'MISSION'

    if (isWindowsToast) {
      markNotificationShown(payload.id)
      if (
        payload.priority === 'CRITICAL' ||
        payload.eventKey === 'NEW_EMERGENCY_REQUEST' ||
        payload.eventKey === 'CREW_ASSIGNED' ||
        payload.eventKey === 'CASE_COMPLETED'
      ) {
        playAlertSound()
      }
      return
    }

    const toastOpts = {
      duration: payload.priority === 'CRITICAL' ? 8000 : 5000,
      onClick: () => {
        window.location.href = href
      },
    }

    const isAdmin =
      typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
    const isScreenAlert =
      payload.priority === 'CRITICAL' ||
      payload.category === 'BROADCAST' ||
      payload.category === 'MISSION' ||
      payload.eventKey === 'MISSION_COMPLETED' ||
      payload.eventKey === 'CASE_COMPLETED'

    if (isAdmin && isScreenAlert) {
      markNotificationShown(payload.id)
      if (payload.priority === 'CRITICAL' || payload.category === 'BROADCAST') {
        playAlertSound()
      } else if (
        payload.eventKey === 'NEW_EMERGENCY_REQUEST' ||
        payload.eventKey === 'CREW_ASSIGNED' ||
        payload.eventKey === 'CASE_COMPLETED'
      ) {
        playAlertSound()
      }
      return
    }

    markNotificationShown(payload.id)

    if (payload.priority === 'CRITICAL' || payload.category === 'BROADCAST') {
      playAlertSound()
      toast.error(`${payload.title}: ${payload.message}`, {
        ...toastOpts,
        icon: payload.category === 'BROADCAST' ? '📢' : '🚨',
      })
    } else if (payload.priority === 'HIGH' || payload.category === 'MISSION') {
      toast(`${payload.title}: ${payload.message}`, { ...toastOpts, icon: '🔔' })
    }
  })

  globalSocket.on('notification_stats', (stats: NotificationStats) => setStats(stats))

  globalSocket.on('mission_assigned', (mission: { id?: string; trackingCode?: string; status?: string }) => {
    if (!mission?.id) return
    dispatchMissionAssignedEvent({
      id: mission.id,
      trackingCode: mission.trackingCode,
      status: mission.status,
    })

    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    const missionUrl = path.startsWith('/driver')
      ? `/driver/mission?caseId=${mission.id}`
      : path.startsWith('/nurse')
        ? `/nurse/mission?caseId=${mission.id}`
        : `/dispatcher/emergency/active?id=${mission.id}`

    showMissionAssignedDesktopNotification(mission.trackingCode, mission.id, missionUrl)
    playNotificationSoundIfEnabled()

    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/driver')) {
      useDriverStore.getState().setActiveMission(mission as any)
    }
  })

  if (globalSocket.connected) setConnected(true)
}

export function useNotificationSocket() {
  useEffect(() => {
    ensureSocketListeners()
  }, [])
}
