import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import HospitalMissionCaseView from '@/components/hospital/views/HospitalMissionCaseView'

export default function HospitalCaseDetailPage({ params }: { params: { id: string } }) {
  return (
    <HospitalPageLayout title="Mission Case" subtitle="Real-time incoming mission details">
      <HospitalMissionCaseView caseId={params.id} />
    </HospitalPageLayout>
  )
}
