'use client'

import { useEffect } from 'react'
import { useAdminUiStore } from '@/lib/stores/adminUiStore'

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAdminUiStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
