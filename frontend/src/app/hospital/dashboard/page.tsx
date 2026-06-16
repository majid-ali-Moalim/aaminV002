import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import HospitalDashboardView from '@/components/hospital/views/HospitalDashboardView'

export default function HospitalDashboardPage() {
  return (
    <HospitalPageLayout title="Dashboard" subtitle="Real-time emergency coordination overview">
      <HospitalDashboardView />
    </HospitalPageLayout>
  )
}
