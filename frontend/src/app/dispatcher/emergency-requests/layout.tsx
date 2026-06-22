'use client'

import { ReactNode } from 'react'
import { EmergencyPortalProvider } from '@/lib/emergency/EmergencyPortalContext'

export default function DispatcherEmergencyRequestsLayout({ children }: { children: ReactNode }) {
  return <EmergencyPortalProvider portal="dispatcher">{children}</EmergencyPortalProvider>
}
