import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import HospitalHandoverPortalView from '@/components/hospital/views/HospitalHandoverPortalView'

export default function HospitalHandoverPage() {
  return (
    <HospitalPageLayout title="Patient Handover Queue" subtitle="Receive patients and complete clinical handover">
      <HospitalHandoverPortalView />
    </HospitalPageLayout>
  )
}
