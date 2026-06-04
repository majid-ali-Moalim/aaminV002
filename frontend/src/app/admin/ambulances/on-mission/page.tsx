'use client'

import AmbulanceFleetView from '@/components/features/ambulances/AmbulanceFleetView'

export default function OnMissionUnitsPage() {
  return (
    <AmbulanceFleetView
      title="On Mission Units"
      subtitle="Ambulances currently deployed on active emergency missions."
      heroBadge="Active Missions"
      presetStatuses={['ON_DUTY']}
      hideStatusFilter
      showRegisterButton={false}
      emptyTitle="No units on mission"
      emptyDescription="No ambulances are currently marked as on duty."
    />
  )
}
