'use client'

import { Truck } from 'lucide-react'
import EmergencyFilteredPage from '@/components/features/emergency/EmergencyFilteredPage'

const EN_ROUTE_STATUSES = ['DISPATCHED', 'EN_ROUTE', 'ASSIGNED']

export default function EnRoutePage() {
  return (
    <EmergencyFilteredPage
      title="En Route to Scene"
      description="Units currently dispatched and traveling to the emergency location."
      icon={Truck}
      filter={(r) => EN_ROUTE_STATUSES.includes(r.status)}
      emptyTitle="No units en route"
      emptyDescription="No ambulances are currently heading to a scene."
    />
  )
}
