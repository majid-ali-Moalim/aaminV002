'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseTabbedPage from '@/components/nurse/NurseTabbedPage'
import NurseRecordsView from '@/components/nurse/views/NurseRecordsView'

const TABS = [
  { id: 'vitals', label: 'Vital Signs' },
  { id: 'notes', label: 'Clinical Notes' },
  { id: 'history', label: 'Patient History' },
]

export default function NurseMedicalRecordsPage() {
  return (
    <NursePageLayout
      title="Medical Records"
      subtitle="Vitals, clinical documentation, and patient history archive"
    >
      <NurseTabbedPage tabs={TABS} defaultTab="vitals">
        {(tab) => <NurseRecordsView variant={tab as 'vitals' | 'notes' | 'history'} />}
      </NurseTabbedPage>
    </NursePageLayout>
  )
}
