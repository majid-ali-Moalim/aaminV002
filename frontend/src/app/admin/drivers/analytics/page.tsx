'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import DriverPerformancePage from '../performance/page'
import DriverReportsPage from '../reports/page'
import { Loader2 } from 'lucide-react'

function DriverAnalyticsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') === 'reports' ? 'reports' : 'performance'

  const setTab = (id: string) => {
    router.replace(`/admin/drivers/analytics?tab=${id === 'reports' ? 'reports' : 'performance'}`)
  }

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6 max-w-[1600px] mx-auto">
        <SectionTabs
          tabs={[
            { id: 'performance', label: 'Performance' },
            { id: 'reports', label: 'Reports' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'performance' ? <DriverPerformancePage /> : <DriverReportsPage />}
    </div>
  )
}

export default function DriverAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <DriverAnalyticsContent />
    </Suspense>
  )
}
