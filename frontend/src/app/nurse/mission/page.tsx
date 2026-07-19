'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseMissionWorkspace from '@/components/nurse/mission-workflow/NurseMissionWorkspace'

function MissionContent() {
  const searchParams = useSearchParams()
  const caseId = searchParams.get('caseId')
  return <NurseMissionWorkspace selectedCaseId={caseId} />
}

export default function NurseMissionPage() {
  return (
    <NursePageLayout
      title="Active Case"
      subtitle="Patient care, medical notes, handover, and case records"
    >
      <Suspense
        fallback={
          <div className="nurse-loading">
            <Loader2 className="animate-spin" size={28} />
          </div>
        }
      >
        <MissionContent />
      </Suspense>
    </NursePageLayout>
  )
}
