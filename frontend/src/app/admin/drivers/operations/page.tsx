'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import DriverAssignmentsPage from '../assignments/page'
import DriverMissionHistoryPage from '../mission-history/page'
import { Loader2 } from 'lucide-react'

function DriverOperationsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') === 'history' ? 'history' : 'assignments'

  const setTab = (id: string) => {
    router.replace(`/admin/drivers/operations?tab=${id === 'history' ? 'history' : 'assignments'}`)
  }

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6 max-w-[1600px] mx-auto">
        <SectionTabs
          tabs={[
            { id: 'assignments', label: 'Assignments' },
            { id: 'history', label: 'Mission History' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'assignments' ? <DriverAssignmentsPage /> : <DriverMissionHistoryPage />}
    </div>
  )
}

export default function DriverOperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <DriverOperationsContent />
    </Suspense>
  )
}
