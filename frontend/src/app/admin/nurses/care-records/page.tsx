'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import NursePatientCarePage from '../patient-care/page'
import NurseTreatmentRecordsPage from '../treatment-records/page'
import { Loader2 } from 'lucide-react'

function NurseCareRecordsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') === 'treatment' ? 'treatment' : 'care'

  const setTab = (id: string) => {
    router.replace(`/admin/nurses/care-records?tab=${id === 'treatment' ? 'treatment' : 'care'}`)
  }

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6 max-w-[1600px] mx-auto">
        <SectionTabs
          tabs={[
            { id: 'care', label: 'Patient Care' },
            { id: 'treatment', label: 'Treatment Records' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'care' ? <NursePatientCarePage /> : <NurseTreatmentRecordsPage />}
    </div>
  )
}

export default function NurseCareRecordsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <NurseCareRecordsContent />
    </Suspense>
  )
}
