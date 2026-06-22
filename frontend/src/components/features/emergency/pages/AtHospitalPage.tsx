'use client'

import { Building2 } from 'lucide-react'
import EmergencyFilteredPage from '@/components/features/emergency/EmergencyFilteredPage'

export default function AtHospitalPage() {
  return (
    <EmergencyFilteredPage
      title="Arrived at Hospital"
      description="Missions where the ambulance has arrived at the destination hospital."
      icon={Building2}
      filter={(r) => r.status === 'ARRIVED_HOSPITAL'}
      emptyTitle="No arrivals at hospital"
      emptyDescription="No units are currently at hospital intake."
    />
  )
}
