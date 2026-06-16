import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import HospitalAmbulancesView from '@/components/hospital/views/HospitalAmbulancesView'

export default function HospitalIncomingAmbulancesPage() {
  return (
    <HospitalPageLayout title="Incoming Ambulances" subtitle="Track ambulances en route to your facility">
      <HospitalAmbulancesView />
    </HospitalPageLayout>
  )
}
