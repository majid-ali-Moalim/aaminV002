'use client'

import { create } from 'zustand'
import type { AppNotification, NotificationStats } from '@/lib/notifications/types'

interface NotificationState {
  recent: AppNotification[]
  stats: NotificationStats | null
  connected: boolean
  setRecent: (items: AppNotification[]) => void
  prependNotification: (item: AppNotification) => void
  setStats: (stats: NotificationStats) => void
  setConnected: (connected: boolean) => void
  markLocalRead: (id: string) => void
  markAllLocalRead: () => void
  removeLocal: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  recent: [],
  stats: null,
  connected: false,

  setRecent: (items) => set({ recent: items }),

  prependNotification: (item) =>
    set((state) => ({
      recent: [item, ...state.recent.filter((n) => n.id !== item.id)].slice(0, 50),
      stats: state.stats
        ? {
            ...state.stats,
            total: state.stats.total + 1,
            unread: state.stats.unread + (item.status === 'UNREAD' ? 1 : 0),
            critical:
              state.stats.critical +
              (item.priority === 'CRITICAL' && item.status !== 'ARCHIVED' ? 1 : 0),
          }
        : state.stats,
    })),

  setStats: (stats) => set({ stats }),

  setConnected: (connected) => set({ connected }),

  markLocalRead: (id) =>
    set((state) => ({
      recent: state.recent.map((n) =>
        n.id === id ? { ...n, status: 'READ', isUnread: false } : n,
      ),
      stats: state.stats
        ? { ...state.stats, unread: Math.max(0, state.stats.unread - 1) }
        : state.stats,
    })),

  markAllLocalRead: () =>
    set((state) => ({
      recent: state.recent.map((n) => ({ ...n, status: 'READ' as const, isUnread: false })),
      stats: state.stats ? { ...state.stats, unread: 0 } : state.stats,
    })),

  removeLocal: (id) =>
    set((state) => ({
      recent: state.recent.filter((n) => n.id !== id),
    })),
}))
