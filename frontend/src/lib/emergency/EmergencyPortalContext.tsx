'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { emergencyPortalPaths, type EmergencyPortal } from '@/lib/emergency/emergencyPortalPaths'

const EmergencyPortalContext = createContext<EmergencyPortal>('admin')

export function EmergencyPortalProvider({
  portal,
  children,
}: {
  portal: EmergencyPortal
  children: ReactNode
}) {
  return (
    <EmergencyPortalContext.Provider value={portal}>{children}</EmergencyPortalContext.Provider>
  )
}

export function useEmergencyPortal(): EmergencyPortal {
  return useContext(EmergencyPortalContext)
}

export function useEmergencyPaths() {
  return emergencyPortalPaths(useEmergencyPortal())
}
