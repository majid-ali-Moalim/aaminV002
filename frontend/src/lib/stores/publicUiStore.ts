'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PublicTheme = 'light' | 'dark'

type PublicUiState = {
  theme: PublicTheme
  setTheme: (theme: PublicTheme) => void
  toggleTheme: () => void
}

export const usePublicUiStore = create<PublicUiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'public-ui-store' },
  ),
)
