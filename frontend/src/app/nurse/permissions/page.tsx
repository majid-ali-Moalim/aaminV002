'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NursePermissionsView from '@/components/nurse/views/NursePermissionsView'

export default function Page() {
  return (
    <NursePageLayout title="My Permissions" subtitle="Built-in nurse access and administrator grants">
      <NursePermissionsView />
    </NursePageLayout>
  )
}
