'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseDashboardView from '@/components/nurse/views/NurseDashboardView'

export default function NurseDashboardPage() {
  return (
    <NursePageLayout title="Dashboard" subtitle="Central clinical operations command center">
      <NurseDashboardView />
    </NursePageLayout>
  )
}
