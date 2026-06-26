'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AdminTheme = 'light' | 'dark'

interface AdminUiStore {
  theme: AdminTheme
  setTheme: (theme: AdminTheme) => void
  toggleTheme: () => void
}

export const useAdminUiStore = create<AdminUiStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    { name: 'admin-ui-store', partialize: (state) => ({ theme: state.theme }) },
  ),
)
