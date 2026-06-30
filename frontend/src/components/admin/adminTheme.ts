'use client'

import type { AdminTheme } from '@/lib/stores/adminUiStore'

const STORAGE_KEY = 'admin-ui-store'

export function applyAdminTheme(theme: AdminTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function readStoredAdminTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'light'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'light'
    const parsed = JSON.parse(raw) as { state?: { theme?: AdminTheme } }
    return parsed?.state?.theme === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
