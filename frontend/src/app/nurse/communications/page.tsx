'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseCommunicationsView from '@/components/nurse/views/NurseCommunicationsView'

export default function Page() {
  return (
    <NursePageLayout title="Communication Center" subtitle="Dispatch, patient contact, and team coordination">
      <NurseCommunicationsView />
    </NursePageLayout>
  )
}
