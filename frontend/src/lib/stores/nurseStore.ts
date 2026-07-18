'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NurseTheme = 'light' | 'dark'

interface NurseStore {
  theme: NurseTheme
  setTheme: (theme: NurseTheme) => void
  toggleTheme: () => void
}

export const useNurseStore = create<NurseStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'nurse-ui-store', partialize: (s) => ({ theme: s.theme }) },
  ),
)
