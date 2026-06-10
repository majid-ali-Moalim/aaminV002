'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseShiftsView from '@/components/nurse/views/NurseShiftsView'

export default function Page() {
  return (
    <NursePageLayout title="Shift & Attendance" subtitle="Clock in, availability, and duty status">
      <NurseShiftsView />
    </NursePageLayout>
  )
}
