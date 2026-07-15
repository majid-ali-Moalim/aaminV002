'use client'

import { PublicThemeInit } from '@/components/public/PublicThemeInit'

export function PublicThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicThemeInit />
      {children}
    </>
  )
}
