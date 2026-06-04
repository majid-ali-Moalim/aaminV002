'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import PatientMedicalRecordsPage from '../medical-records/page'
import PatientReportsPage from '../reports/page'
import { Loader2 } from 'lucide-react'

function PatientRecordsReportsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') === 'reports' ? 'reports' : 'records'

  const setTab = (id: string) => {
    router.replace(`/admin/patients/records-reports?tab=${id === 'reports' ? 'reports' : 'records'}`)
  }

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6 max-w-[1600px] mx-auto">
        <SectionTabs
          tabs={[
            { id: 'records', label: 'Medical Records' },
            { id: 'reports', label: 'Reports' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'records' ? <PatientMedicalRecordsPage /> : <PatientReportsPage />}
    </div>
  )
}

export default function PatientRecordsReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <PatientRecordsReportsContent />
    </Suspense>
  )
}
