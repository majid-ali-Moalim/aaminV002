import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import HospitalHandoverPortalView from '@/components/hospital/views/HospitalHandoverPortalView'

export default function HospitalHandoverPage() {
  return (
    <HospitalPageLayout title="Handover Patients" subtitle="Receive patients and complete clinical handover">
      <HospitalHandoverPortalView />
    </HospitalPageLayout>
  )
}
