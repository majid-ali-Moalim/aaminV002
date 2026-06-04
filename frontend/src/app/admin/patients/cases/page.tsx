'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import PatientEmergencyCasesPage from '../emergency-cases/page'
import PatientActiveCasesPage from '../active-cases/page'
import { Loader2 } from 'lucide-react'

function PatientCasesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') === 'active' ? 'active' : 'emergency'

  const setTab = (id: string) => {
    router.replace(`/admin/patients/cases?tab=${id === 'active' ? 'active' : 'emergency'}`)
  }

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6 max-w-[1600px] mx-auto">
        <SectionTabs
          tabs={[
            { id: 'emergency', label: 'Emergency Cases' },
            { id: 'active', label: 'Active Cases' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'emergency' ? <PatientEmergencyCasesPage /> : <PatientActiveCasesPage />}
    </div>
  )
}

export default function PatientCasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <PatientCasesContent />
    </Suspense>
  )
}
