'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseHandoverView from '@/components/nurse/views/NurseHandoverView'

export default function Page() {
  return (
    <NursePageLayout title="Patient Handover" subtitle="Hospital arrival documentation and receiving staff coordination">
      <NurseHandoverView />
    </NursePageLayout>
  )
}
