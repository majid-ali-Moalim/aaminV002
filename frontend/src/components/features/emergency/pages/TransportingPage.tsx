'use client'

import { Truck } from 'lucide-react'
import EmergencyFilteredPage from '@/components/features/emergency/EmergencyFilteredPage'

export default function TransportingPage() {
  return (
    <EmergencyFilteredPage
      title="Transporting to Hospital"
      description="Patients currently being transported to hospital facilities."
      icon={Truck}
      filter={(r) => r.status === 'TRANSPORTING'}
      emptyTitle="No active transports"
      emptyDescription="No patients are in transit to hospital right now."
    />
  )
}
