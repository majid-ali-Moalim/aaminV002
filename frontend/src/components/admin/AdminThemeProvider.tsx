'use client'

import { useEffect } from 'react'
import { useAdminUiStore } from '@/lib/stores/adminUiStore'
import { applyAdminTheme } from '@/components/admin/adminTheme'

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAdminUiStore((s) => s.theme)

  useEffect(() => {
    applyAdminTheme(theme)
  }, [theme])

  return <>{children}</>
}
