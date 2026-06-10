'use client'

import NewEmergencyCaseForm from '@/components/features/emergency/NewEmergencyCaseForm'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'

export default function DispatcherNewEmergencyPage() {
  const { profile } = useDispatcherAccess()
  const operatorName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : undefined

  return <NewEmergencyCaseForm context="dispatcher" operatorName={operatorName} />
}
