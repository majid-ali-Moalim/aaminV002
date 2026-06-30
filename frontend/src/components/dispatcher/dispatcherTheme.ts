'use client'

import type { DispatcherTheme } from '@/lib/stores/dispatcherUiStore'

const STORAGE_KEY = 'dispatcher-ui-store'

export function applyDispatcherTheme(theme: DispatcherTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dispatcher-dark', theme === 'dark')
}

export function readStoredDispatcherTheme(): DispatcherTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'light'
    const parsed = JSON.parse(raw) as { state?: { theme?: DispatcherTheme } }
    return parsed?.state?.theme === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
