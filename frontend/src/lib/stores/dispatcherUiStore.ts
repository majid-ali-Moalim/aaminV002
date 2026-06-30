'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DispatcherTheme = 'light' | 'dark'

interface DispatcherUiStore {
  theme: DispatcherTheme
  setTheme: (theme: DispatcherTheme) => void
  toggleTheme: () => void
}

export const useDispatcherUiStore = create<DispatcherUiStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    { name: 'dispatcher-ui-store', partialize: (state) => ({ theme: state.theme }) },
  ),
)
