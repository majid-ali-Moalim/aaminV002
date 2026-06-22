'use client'

import AmbulanceFleetView from '@/components/features/ambulances/AmbulanceFleetView'

export default function OnMissionUnitsPage() {
  return (
    <AmbulanceFleetView
      title="Unavailable (On Duty)"
      subtitle="Ambulances currently deployed on active emergency missions."
      heroBadge="On Duty"
      presetStatuses={['ON_DUTY']}
      hideStatusFilter
      showRegisterButton={false}
      emptyTitle="No ambulances on duty"
      emptyDescription="No ambulances are currently unavailable because of duty."
    />
  )
}
