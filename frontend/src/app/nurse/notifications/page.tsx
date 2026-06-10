'use client'

import { NursePageLayout } from '@/components/nurse/NursePageLayout'
import NurseNotificationsView from '@/components/nurse/views/NurseNotificationsView'

export default function Page() {
  return (
    <NursePageLayout title="Notifications" subtitle="Mission alerts, dispatch messages, and system updates">
      <NurseNotificationsView />
    </NursePageLayout>
  )
}
