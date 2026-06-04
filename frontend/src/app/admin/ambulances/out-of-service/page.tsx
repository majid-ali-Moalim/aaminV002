'use client'

import AmbulanceFleetView from '@/components/features/ambulances/AmbulanceFleetView'

export default function OutOfServicePage() {
  return (
    <AmbulanceFleetView
      title="Out of Service"
      subtitle="Units under maintenance or temporarily unavailable for deployment."
      heroBadge="Out of Service"
      presetStatuses={['MAINTENANCE', 'UNAVAILABLE']}
      hideStatusFilter
      showRegisterButton={false}
      emptyTitle="No out-of-service units"
      emptyDescription="All ambulances are currently operational."
    />
  )
}
