'use client'

import { create } from 'zustand'

export type WindowsToastItem = {
  id: string
  appName: string
  title: string
  message: string
  actionLabel: string
  href: string
  createdAt: number
}

interface WindowsToastState {
  toasts: WindowsToastItem[]
  pushToast: (toast: Omit<WindowsToastItem, 'createdAt'>) => void
  dismissToast: (id: string) => void
}

export const useWindowsToastStore = create<WindowsToastState>((set) => ({
  toasts: [],
  pushToast: (toast) =>
    set((state) => {
      const next = [{ ...toast, createdAt: Date.now() }, ...state.toasts.filter((t) => t.id !== toast.id)]
      return { toasts: next.slice(0, 4) }
    }),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
