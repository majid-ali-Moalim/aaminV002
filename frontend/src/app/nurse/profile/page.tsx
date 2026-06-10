'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseProfileView from '@/components/nurse/views/NurseProfileView'

export default function Page() {
  return (
    <NursePageLayout title="My Profile" subtitle="Photo, credentials, contact details, and professional information">
      <NurseProfileView />
    </NursePageLayout>
  )
}
