'use client'

import { useLayoutEffect } from 'react'
import { applyDispatcherTheme, readStoredDispatcherTheme } from '@/components/dispatcher/dispatcherTheme'

export function DispatcherThemeInit() {
  useLayoutEffect(() => {
    applyDispatcherTheme(readStoredDispatcherTheme())
  }, [])
  return null
}
