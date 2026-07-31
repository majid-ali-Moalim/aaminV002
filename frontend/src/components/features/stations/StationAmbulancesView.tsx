'use client'

import AmbulanceFleetView from '@/components/features/ambulances/AmbulanceFleetView'

export default function StationAmbulancesView({ embedded }: { embedded?: boolean } = {}) {
  return (
    <AmbulanceFleetView
      title={embedded ? '' : 'Station Ambulances'}
      subtitle={embedded ? '' : 'Ambulances registered to stations across the network'}
      heroBadge={embedded ? undefined : 'Stations · Fleet'}
      showRegisterButton
      emptyTitle="No ambulances"
      emptyDescription="Register ambulances and assign them to a station."
      compact={embedded}
    />
  )
}
