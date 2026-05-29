'use client'
import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useDriverStore } from '@/lib/stores/driverStore'
import toast from 'react-hot-toast'

const SOCKET_URL = 'http://localhost:3001'

let globalSocket: Socket | null = null

export function useDriverSocket() {
  const { token, setActiveMission, setSocketConnected, addOfflineUpdate, offlineQueue, removeOfflineUpdate } =
    useDriverStore()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) return
    if (globalSocket?.connected) {
      setConnected(true)
      return
    }

    globalSocket = io(`${SOCKET_URL}/driver`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    globalSocket.on('connect', () => {
      setConnected(true)
      setSocketConnected(true)

      // Flush offline queue
      const queue = useDriverStore.getState().offlineQueue
      queue.forEach(async (update) => {
        try {
          globalSocket!.emit(update.type, update.payload)
          removeOfflineUpdate(update.id)
        } catch (_) {}
      })
    })

    globalSocket.on('disconnect', () => {
      setConnected(false)
      setSocketConnected(false)
    })

    globalSocket.on('active_mission', (mission) => {
      setActiveMission(mission)
    })

    globalSocket.on('new_mission', (mission) => {
      setActiveMission(mission)
      toast.success(`🚨 New mission assigned: ${mission.trackingCode}`, { duration: 8000 })
    })

    globalSocket.on('mission_updated', (mission) => {
      setActiveMission(mission)
    })

    globalSocket.on('mission_cancelled', ({ missionId }) => {
      const current = useDriverStore.getState().activeMission
      if (current?.id === missionId) {
        setActiveMission(null)
        toast.error('Mission has been cancelled by dispatcher', { duration: 6000 })
      }
    })

    return () => {
      globalSocket?.off('connect')
      globalSocket?.off('disconnect')
      globalSocket?.off('active_mission')
      globalSocket?.off('new_mission')
      globalSocket?.off('mission_updated')
      globalSocket?.off('mission_cancelled')
    }
  }, [token])

  const emitMissionStatus = (missionId: string, status: string, notes?: string) => {
    if (globalSocket?.connected) {
      globalSocket.emit('update_mission_status', { missionId, status, notes })
    } else {
      addOfflineUpdate({ type: 'mission_status', payload: { missionId, status, notes } })
      toast('Status queued — will sync when online', { icon: '📶' })
    }
  }

  return { connected, emitMissionStatus }
}
