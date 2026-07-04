'use client'

import { useEffect, useLayoutEffect } from 'react'
import { usePublicUiStore } from '@/lib/stores/publicUiStore'
import { applyPublicTheme, readStoredPublicTheme } from '@/components/public/publicTheme'

export function PublicThemeInit() {
  const theme = usePublicUiStore((s) => s.theme)

  useLayoutEffect(() => {
    applyPublicTheme(readStoredPublicTheme())
  }, [])

  useEffect(() => {
    applyPublicTheme(theme)
  }, [theme])

  return null
}
