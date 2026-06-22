'use client'

import NewEmergencyCaseForm from '@/components/features/emergency/NewEmergencyCaseForm'
import { useEmergencyPortal } from '@/lib/emergency/EmergencyPortalContext'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'

function DispatcherNewEmergencyForm() {
  const { profile } = useDispatcherAccess()
  const operatorName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : undefined

  return <NewEmergencyCaseForm context="dispatcher" operatorName={operatorName} />
}

export default function NewEmergencyRequestPage() {
  const portal = useEmergencyPortal()
  if (portal === 'dispatcher') return <DispatcherNewEmergencyForm />
  return <NewEmergencyCaseForm />
}
