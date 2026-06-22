'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import SectionTabs from '@/components/features/access-control/SectionTabs'
import { Loader2, FileText, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function RecordsReportsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') === 'reports' ? 'reports' : 'records'

  const setTab = (id: string) => {
    router.replace(
      `/dispatcher/patients/records-reports?tab=${id === 'reports' ? 'reports' : 'records'}`,
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto pb-12">
      <div className="rounded-3xl bg-gradient-to-br from-slate-800 via-red-700 to-red-600 p-8 text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
          Patient Documentation
        </p>
        <h1 className="text-3xl font-black tracking-tight">Records & Reports</h1>
        <p className="text-red-100/80 mt-2 max-w-2xl text-sm">
          Review patient case history and operational reports from the dispatcher console.
        </p>
      </div>

      <SectionTabs
        tabs={[
          { id: 'records', label: 'Medical Records' },
          { id: 'reports', label: 'Reports' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'records' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <FileText className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-slate-600 font-medium">
            Browse completed case records in the patient case archive.
          </p>
          <Link href="/dispatcher/patients/cases">
            <Button className="rounded-xl bg-red-600 hover:bg-red-700 font-bold">Open Patient Cases</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <BarChart2 className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-slate-600 font-medium">
            Dispatcher performance and emergency analytics live under Reports.
          </p>
          <Link href="/dispatcher/reports/emergency">
            <Button className="rounded-xl bg-red-600 hover:bg-red-700 font-bold">Emergency Reports</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

export default function DispatcherPatientRecordsReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      }
    >
      <RecordsReportsContent />
    </Suspense>
  )
}
