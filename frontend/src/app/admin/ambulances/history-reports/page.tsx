'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import AmbulanceAssignmentHistoryPage from '../assignment-history/page'
import AmbulanceReportsPage from '../reports/page'
import { Loader2 } from 'lucide-react'

function AmbulanceHistoryReportsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') === 'reports' ? 'reports' : 'history'

  const setTab = (id: string) => {
    router.replace(`/admin/ambulances/history-reports?tab=${id === 'reports' ? 'reports' : 'history'}`)
  }

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6 max-w-[1600px] mx-auto">
        <SectionTabs
          tabs={[
            { id: 'history', label: 'Assignment History' },
            { id: 'reports', label: 'Reports' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'history' ? <AmbulanceAssignmentHistoryPage /> : <AmbulanceReportsPage />}
    </div>
  )
}

export default function AmbulanceHistoryReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <AmbulanceHistoryReportsContent />
    </Suspense>
  )
}
