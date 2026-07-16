'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import DriverMissionHistoryPage from '../mission-history/page'
import { Loader2 } from 'lucide-react'

function DriverOperationsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') === 'history' ? 'history' : 'history'

  const setTab = () => {
    router.replace('/admin/drivers/operations?tab=history')
  }

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6 max-w-[1600px] mx-auto">
        <SectionTabs
          tabs={[{ id: 'history', label: 'Mission History' }]}
          active={tab}
          onChange={setTab}
        />
      </div>
      <DriverMissionHistoryPage />
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
