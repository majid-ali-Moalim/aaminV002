'use client'

import type { PublicTheme } from '@/lib/stores/publicUiStore'

const STORAGE_KEY = 'public-ui-store'

export function applyPublicTheme(theme: PublicTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
}

export function readStoredPublicTheme(): PublicTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'light'
    const parsed = JSON.parse(raw) as { state?: { theme?: PublicTheme } }
    return parsed?.state?.theme === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
