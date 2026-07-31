'use client'

import { ReactNode } from 'react'
import { EmergencyPortalProvider } from '@/lib/emergency/EmergencyPortalContext'

export default function AdminEmergencyRequestsLayout({ children }: { children: ReactNode }) {
  return <EmergencyPortalProvider portal="admin">{children}</EmergencyPortalProvider>
}
