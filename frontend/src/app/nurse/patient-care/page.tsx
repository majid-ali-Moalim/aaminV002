'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseTabbedPage from '@/components/nurse/NurseTabbedPage'
import NurseMissionWorkspace from '@/components/nurse/mission-workflow/NurseMissionWorkspace'
import PatientCareAssignedView from '@/components/nurse/patient-care/PatientCareAssignedView'
import PatientCareAssessmentView from '@/components/nurse/patient-care/PatientCareAssessmentView'
import PatientCareTreatmentView from '@/components/nurse/patient-care/PatientCareTreatmentView'

const TABS = [
  { id: 'active', label: 'Active Patient' },
  { id: 'assigned', label: 'Assigned Missions' },
  { id: 'assessments', label: 'Patient Assessments' },
  { id: 'treatment', label: 'Treatment Records' },
]

function PatientCareContent() {
  const searchParams = useSearchParams()
  const caseId = searchParams.get('caseId')

  return (
    <NurseTabbedPage tabs={TABS} defaultTab="active">
      {(tab) => {
        if (tab === 'active') return <NurseMissionWorkspace selectedCaseId={caseId} />
        if (tab === 'assigned') return <PatientCareAssignedView />
        if (tab === 'assessments') return <PatientCareAssessmentView caseId={caseId} />
        return <PatientCareTreatmentView caseId={caseId} />
      }}
    </NurseTabbedPage>
  )
}

export default function NursePatientCarePage() {
  return (
    <NursePageLayout
      title="Patient Care"
      subtitle="Primary clinical workspace — active patient, missions, assessments, and treatments"
    >
      <Suspense
        fallback={
          <div className="nurse-loading">
            <Loader2 className="animate-spin" size={28} />
          </div>
        }
      >
        <PatientCareContent />
      </Suspense>
    </NursePageLayout>
  )
}
