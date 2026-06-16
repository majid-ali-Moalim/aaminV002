import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import HospitalCapacityView from '@/components/hospital/views/HospitalCapacityView'

export default function HospitalCapacityPage() {
  return (
    <HospitalPageLayout title="Capacity Management" subtitle="Update beds and availability for dispatch routing">
      <HospitalCapacityView />
    </HospitalPageLayout>
  )
}
