'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseMissionHistoryView from '@/components/nurse/views/NurseMissionHistoryView'

export default function NurseMissionHistoryPage() {
  return (
    <NursePageLayout
      title="Case History"
      subtitle="Completed missions — read-only review"
    >
      <NurseMissionHistoryView />
    </NursePageLayout>
  )
}
