'use client'

import { useEffect } from 'react'
import { useDispatcherUiStore } from '@/lib/stores/dispatcherUiStore'
import { applyDispatcherTheme } from '@/components/dispatcher/dispatcherTheme'

export function DispatcherThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useDispatcherUiStore((s) => s.theme)

  useEffect(() => {
    applyDispatcherTheme(theme)
  }, [theme])

  return <>{children}</>
}
