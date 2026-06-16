import { Suspense } from 'react'
import { HospitalPageLayout } from '@/components/hospital/HospitalSidebar'
import HospitalCasesView from '@/components/hospital/views/HospitalCasesView'

export default function HospitalEmergencyCasesPage() {
  return (
    <HospitalPageLayout title="Emergency Cases" subtitle="Review, accept, or reject incoming patient transfers">
      <Suspense fallback={<div className="hosp-loading">Loading cases…</div>}>
        <HospitalCasesView />
      </Suspense>
    </HospitalPageLayout>
  )
}