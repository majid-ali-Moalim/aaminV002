'use client'

import AmbulanceFleetView from '@/components/features/ambulances/AmbulanceFleetView'

export default function AvailableUnitsPage() {
  return (
    <AmbulanceFleetView
      title="Available Units"
      subtitle="Ambulances ready for dispatch — standing by at base stations."
      heroBadge="Available Fleet"
      presetStatuses={['AVAILABLE']}
      hideStatusFilter
      showRegisterButton={false}
      emptyTitle="No available units"
      emptyDescription="All ambulances are currently on mission or out of service."
    />
  )
}
