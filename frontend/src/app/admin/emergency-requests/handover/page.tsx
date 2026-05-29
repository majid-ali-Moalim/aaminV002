'use client'

import { HeartHandshake } from 'lucide-react'
import EmergencyFilteredPage from '@/components/features/emergency/EmergencyFilteredPage'

const HANDOVER_STATUSES = ['PATIENT_STABILIZED', 'ARRIVED_HOSPITAL']

export default function HandoverPage() {
  return (
    <EmergencyFilteredPage
      title="Patient Handover"
      description="Cases awaiting or completing clinical handover at hospital."
      icon={HeartHandshake}
      filter={(r) => HANDOVER_STATUSES.includes(r.status)}
      emptyTitle="No handover cases"
      emptyDescription="No patient handovers are in progress."
    />
  )
}
