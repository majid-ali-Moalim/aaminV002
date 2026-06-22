'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import PatientCaseRecordsView from '@/components/features/patients/PatientCaseRecordsView'
import { Loader2 } from 'lucide-react'

function DispatcherPatientCasesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') === 'active' ? 'active' : 'all'

  const setTab = (id: string) => {
    const patient = searchParams.get('patient')
    const patientQuery = patient ? `&patient=${encodeURIComponent(patient)}` : ''
    router.replace(
      `/dispatcher/patients/cases?tab=${id === 'active' ? 'active' : 'all'}${patientQuery}`,
    )
  }

  return (
    <div className="space-y-0">
      <div className="px-6 pt-6 max-w-[1600px] mx-auto">
        <SectionTabs
          tabs={[
            { id: 'all', label: 'All Cases' },
            { id: 'active', label: 'Active Cases' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      <PatientCaseRecordsView activeOnly={tab === 'active'} portal="dispatcher" />
    </div>
  )
}

export default function DispatcherPatientCasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <DispatcherPatientCasesContent />
    </Suspense>
  )
}
