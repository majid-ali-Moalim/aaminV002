'use client'

import AmbulanceFleetView from '@/components/features/ambulances/AmbulanceFleetView'

export default function OutOfServicePage() {
  return (
    <AmbulanceFleetView
      title="Out of Service"
      subtitle="Ambulances marked unavailable for deployment."
      heroBadge="Unavailable"
      presetStatuses={['UNAVAILABLE', 'MAINTENANCE']}
      hideStatusFilter
      showRegisterButton={false}
      emptyTitle="No out-of-service units"
      emptyDescription="All ambulances are currently operational."
    />
  )
}
