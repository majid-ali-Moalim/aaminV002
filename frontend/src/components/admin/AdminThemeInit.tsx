'use client'

import { useLayoutEffect } from 'react'
import { applyAdminTheme, readStoredAdminTheme } from '@/components/admin/adminTheme'

/** Apply saved theme before first paint to avoid flash. */
export function AdminThemeInit() {
  useLayoutEffect(() => {
    applyAdminTheme(readStoredAdminTheme())
  }, [])

  return null
}
